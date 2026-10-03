(() => {
  const home = document.getElementById('home');
  const host = home?.querySelector('.hero-canvas');
  const canvas = document.getElementById('heroInkFx');
  const shared = window.__NKX_HERO_FX__;

  if (!home || !host || !canvas || !shared?.ready) return;

  if (matchMedia('(hover:none),(pointer:coarse),(max-width:760px),(prefers-reduced-motion:reduce)').matches) {
    return;
  }

  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false
  });
  if (!gl) return;

  const VERT = `
    attribute vec2 a_pos;
    varying vec2 v_uv;
    void main(){
      v_uv = a_pos * .5 + .5;
      gl_Position = vec4(a_pos,0.0,1.0);
    }
  `;

  const FRAG = `
    precision highp float;

    varying vec2 v_uv;
    uniform sampler2D u_disp;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_time;
    uniform float u_active;
    uniform float u_radius;
    uniform float u_ragged;
    uniform float u_dispStrength;

    float hash(vec2 p){
      p = fract(p*vec2(123.34,456.21));
      p += dot(p,p+45.32);
      return fract(p.x*p.y);
    }

    float noise(vec2 p){
      vec2 i=floor(p), f=fract(p);
      f=f*f*(3.0-2.0*f);
      return mix(
        mix(hash(i),hash(i+vec2(1.,0.)),f.x),
        mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),
        f.y
      );
    }

    float fbm(vec2 p){
      float v=0.0,a=.5;
      mat2 r=mat2(.87758,.47942,-.47942,.87758);
      for(int i=0;i<5;i++){
        v += a*noise(p);
        p = r*p*2.0 + 100.0;
        a *= .5;
      }
      return v;
    }

    void main(){
      vec2 frag = vec2(gl_FragCoord.x, u_resolution.y-gl_FragCoord.y);
      vec2 heroUV = frag/u_resolution;

      /*
       * Same 16x16 velocity field as the portrait layer.
       * This makes the block breakup cross the photo/text/background border
       * as one continuous motion instead of restarting on each side.
       */
      vec2 dv = texture2D(u_disp, heroUV).rg*2.0-1.0;
      float minRes = min(u_resolution.x,u_resolution.y);
      vec2 warpedFrag = frag - dv*u_dispStrength*minRes;

      vec2 p = (warpedFrag-u_mouse)/minRes;
      float d = length(p);

      vec2 nUV = warpedFrag/minRes;
      float n1 = fbm(nUV*10.0 + vec2(u_time*-.025,u_time*.018));
      float n2 = fbm(nUV*23.0 + vec2(-u_time*.012,u_time*.009));
      float edge = (n1-.5)*u_ragged + (n2-.5)*u_ragged*.38;
      float radius = u_radius + edge;

      float mask = 1.0-smoothstep(radius-.012,radius+.008,d);
      mask *= u_active;

      if(mask < .002){
        gl_FragColor=vec4(0.0);
        return;
      }

      /*
       * One single inversion layer over the whole hero.
       * Because this canvas uses mix-blend-mode:difference, white flips:
       * image, signature, labels, navigation-over-hero, lines and background.
       */
      gl_FragColor = vec4(1.0,1.0,1.0,mask);
    }
  `;

  function compileShader(type, src){
    const shader = gl.createShader(type);
    gl.shaderSource(shader,src);
    gl.compileShader(shader);

    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
      console.warn('[hero-ink-fx] shader compile failed:',gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  const vs = compileShader(gl.VERTEX_SHADER,VERT);
  const fs = compileShader(gl.FRAGMENT_SHADER,FRAG);
  if(!vs || !fs) return;

  const program = gl.createProgram();
  gl.attachShader(program,vs);
  gl.attachShader(program,fs);
  gl.linkProgram(program);

  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
    console.warn('[hero-ink-fx] program link failed:',gl.getProgramInfoLog(program));
    return;
  }

  gl.useProgram(program);

  const pos = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,pos);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),
    gl.STATIC_DRAW
  );

  const aPos = gl.getAttribLocation(program,'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,0,0);

  const U = {};
  ['u_disp','u_resolution','u_mouse','u_time','u_active','u_radius','u_ragged','u_dispStrength']
    .forEach(name => U[name] = gl.getUniformLocation(program,name));

  const N = shared.N;
  const dispBytes = new Uint8Array(N*N*4);
  const dispTex = gl.createTexture();

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D,dispTex);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.uniform1i(U.u_disp,0);

  function uploadSharedField(){
    const field = shared.field;

    for(let i=0;i<N*N;i++){
      const fx=Math.max(-1,Math.min(1,field[i*2]));
      const fy=Math.max(-1,Math.min(1,field[i*2+1]));
      dispBytes[i*4]=Math.round((fx*.5+.5)*255);
      dispBytes[i*4+1]=Math.round((fy*.5+.5)*255);
      dispBytes[i*4+2]=128;
      dispBytes[i*4+3]=255;
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,dispTex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,N,N,0,gl.RGBA,gl.UNSIGNED_BYTE,dispBytes);
  }

  let hostRect = {width:1,height:1};

  function syncSize(){
    hostRect = host.getBoundingClientRect();

    const dpr = Math.min(devicePixelRatio||1,2);
    const w = Math.max(1,Math.round(hostRect.width*dpr));
    const h = Math.max(1,Math.round(hostRect.height*dpr));

    if(canvas.width!==w || canvas.height!==h){
      canvas.width=w;
      canvas.height=h;
      gl.viewport(0,0,w,h);
    }
  }

  function render(){
    requestAnimationFrame(render);

    if(!shared.homeVisible) return;

    syncSize();
    uploadSharedField();

    const dpr = canvas.width/Math.max(1,hostRect.width);

    gl.useProgram(program);
    gl.uniform2f(U.u_resolution,canvas.width,canvas.height);
    gl.uniform2f(U.u_mouse,shared.mouse.x*dpr,shared.mouse.y*dpr);
    gl.uniform1f(U.u_time,shared.time);
    gl.uniform1f(U.u_active,shared.active);
    gl.uniform1f(U.u_radius,shared.params.radius);
    gl.uniform1f(U.u_ragged,shared.params.ragged);
    gl.uniform1f(U.u_dispStrength,shared.params.disp);

    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }

  syncSize();
  requestAnimationFrame(render);
  addEventListener('resize',syncSize,{passive:true});
})();