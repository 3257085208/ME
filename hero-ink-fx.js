(() => {
  const home=document.getElementById('home');
  const host=home?.querySelector('.hero-canvas');
  const canvas=document.getElementById('heroInkFx');
  const shared=window.__NKX_HERO_FX__;

  if(!home||!host||!canvas||!shared?.ready)return;

  if(matchMedia('(hover:none),(pointer:coarse),(max-width:760px),(prefers-reduced-motion:reduce)').matches){
    return;
  }

  const gl=canvas.getContext('webgl',{
    alpha:true,
    antialias:false,
    premultipliedAlpha:true,
    preserveDrawingBuffer:false,
    powerPreference:'high-performance',
    desynchronized:true
  });
  if(!gl)return;

  const VERT=`
    attribute vec2 a_pos;
    void main(){
      gl_Position=vec4(a_pos,0.0,1.0);
    }
  `;

  const FRAG=`
    precision mediump float;

    uniform sampler2D u_disp;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_time;
    uniform float u_active;
    uniform float u_radius;
    uniform float u_ragged;
    uniform float u_dispStrength;

    float hash(vec2 p){
      p=fract(p*vec2(123.34,456.21));
      p+=dot(p,p+45.32);
      return fract(p.x*p.y);
    }

    float noise(vec2 p){
      vec2 i=floor(p),f=fract(p);
      f=f*f*(3.0-2.0*f);
      return mix(
        mix(hash(i),hash(i+vec2(1.,0.)),f.x),
        mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),
        f.y
      );
    }

    float fbm3(vec2 p){
      float v=0.0;
      float a=.5;
      mat2 r=mat2(.87758,.47942,-.47942,.87758);
      for(int i=0;i<3;i++){
        v+=a*noise(p);
        p=r*p*2.0+100.0;
        a*=.5;
      }
      return v;
    }

    void main(){
      vec2 frag=vec2(gl_FragCoord.x,u_resolution.y-gl_FragCoord.y);
      vec2 heroUV=frag/u_resolution;
      vec2 dv=texture2D(u_disp,heroUV).rg*2.0-1.0;
      float minRes=min(u_resolution.x,u_resolution.y);
      vec2 warpedFrag=frag-dv*u_dispStrength*minRes;

      vec2 p=(warpedFrag-u_mouse)/minRes;
      float d=length(p);
      vec2 nUV=warpedFrag/minRes;

      float n1=fbm3(nUV*10.0+vec2(u_time*-.025,u_time*.018));
      float n2=noise(nUV*25.0+vec2(-u_time*.012,u_time*.009));
      float edge=(n1-.5)*u_ragged+(n2-.5)*u_ragged*.32;
      float radius=u_radius+edge;
      float mask=(1.0-smoothstep(radius-.012,radius+.008,d))*u_active;

      if(mask<.002){
        gl_FragColor=vec4(0.0);
        return;
      }

      gl_FragColor=vec4(vec3(mask),mask);
    }
  `;

  function compileShader(type,src){
    const shader=gl.createShader(type);
    gl.shaderSource(shader,src);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
      console.warn('[hero-ink-fx] shader compile failed:',gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vs=compileShader(gl.VERTEX_SHADER,VERT);
  const fs=compileShader(gl.FRAGMENT_SHADER,FRAG);
  if(!vs||!fs)return;

  const program=gl.createProgram();
  gl.attachShader(program,vs);
  gl.attachShader(program,fs);
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
    console.warn('[hero-ink-fx] program link failed:',gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);

  const pos=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,pos);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),
    gl.STATIC_DRAW
  );

  const aPos=gl.getAttribLocation(program,'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,0,0);

  const U={};
  ['u_disp','u_resolution','u_mouse','u_time','u_active','u_radius','u_ragged','u_dispStrength']
    .forEach(name=>U[name]=gl.getUniformLocation(program,name));

  const N=shared.N;
  const dispTex=gl.createTexture();

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D,dispTex);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,N,N,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.uniform1i(U.u_disp,0);

  let seenLayoutVersion=-1;
  let hadPixels=false;

  function syncCanvas(){
    if(seenLayoutVersion===shared.layoutVersion)return;
    seenLayoutVersion=shared.layoutVersion;

    if(canvas.width!==shared.renderW||canvas.height!==shared.renderH){
      canvas.width=shared.renderW;
      canvas.height=shared.renderH;
      gl.viewport(0,0,canvas.width,canvas.height);
    }
  }

  function clear(){
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  function render(){
    requestAnimationFrame(render);

    if(!shared.homeVisible){
      if(hadPixels){
        clear();
        hadPixels=false;
      }
      return;
    }

    syncCanvas();

    if(shared.active<.0015){
      if(hadPixels){
        clear();
        hadPixels=false;
      }
      return;
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,dispTex);
    gl.texSubImage2D(
      gl.TEXTURE_2D,0,0,0,N,N,
      gl.RGBA,gl.UNSIGNED_BYTE,shared.dispBytes
    );

    clear();

    gl.useProgram(program);
    gl.uniform2f(U.u_resolution,canvas.width,canvas.height);
    gl.uniform2f(U.u_mouse,shared.mouse.x*shared.dpr,shared.mouse.y*shared.dpr);
    gl.uniform1f(U.u_time,shared.time);
    gl.uniform1f(U.u_active,shared.active);
    gl.uniform1f(U.u_radius,shared.params.radius);
    gl.uniform1f(U.u_ragged,shared.params.ragged);
    gl.uniform1f(U.u_dispStrength,shared.params.disp);

    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(
      shared.scissor.x,
      shared.scissor.y,
      shared.scissor.w,
      shared.scissor.h
    );
    gl.drawArrays(gl.TRIANGLES,0,6);
    gl.disable(gl.SCISSOR_TEST);

    hadPixels=true;
  }

  requestAnimationFrame(render);
})();