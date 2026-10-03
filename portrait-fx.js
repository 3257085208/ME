(() => {
  const home = document.getElementById('home');
  const host = home?.querySelector('.hero-canvas');
  const sourceImg = home?.querySelector('.portrait-light img');
  const canvas = document.getElementById('portraitFx');
  const cross = document.getElementById('portraitFxCross');

  if (!home || !host || !sourceImg || !canvas || !cross) return;

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
    uniform sampler2D u_image;
    uniform sampler2D u_disp;
    uniform vec2 u_resolution;
    uniform vec4 u_imgRect;
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
      vec2 imgUV = (frag-u_imgRect.xy)/u_imgRect.zw;

      if(imgUV.x<0.0||imgUV.x>1.0||imgUV.y<0.0||imgUV.y>1.0){
        gl_FragColor=vec4(0.0);
        return;
      }

      /* One shared 16x16 field across the whole hero, not a separate portrait field. */
      vec2 heroUV = frag/u_resolution;
      vec2 dv = texture2D(u_disp, heroUV).rg*2.0-1.0;

      /* Keep the orientation from the working test. */
      vec2 shifted = clamp(imgUV - dv*u_dispStrength, .002, .998);
      vec4 src = texture2D(u_image, shifted);

      /* Same organic mask math used by the page-wide layer. */
      float minRes = min(u_resolution.x,u_resolution.y);
      vec2 p = (frag-u_mouse)/minRes;
      float d = length(p);
      vec2 nUV = frag/minRes;
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

      float gray = dot(src.rgb,vec3(.299,.587,.114));
      gray = clamp((gray-.5)*1.22+.5,0.0,1.0);
      /*
       * This layer stays positive. The page-wide white difference layer
       * above it performs the single shared inversion for portrait + text +
       * background. That keeps the whole cursor effect visually continuous.
       */
      vec3 positive = vec3(gray);
      float grain = (hash(frag+u_time*37.0)-.5)*.025;
      positive = clamp(positive+grain,0.0,1.0);

      gl_FragColor = vec4(positive, mask);
    }
  `;

  function compileShader(type, src){
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
      console.warn('[portrait-fx] shader compile failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vs = compileShader(gl.VERTEX_SHADER, VERT);
  const fs = compileShader(gl.FRAGMENT_SHADER, FRAG);
  if(!vs || !fs) return;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
    console.warn('[portrait-fx] program link failed:', gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);

  const pos = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pos);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),
    gl.STATIC_DRAW
  );

  const aPos = gl.getAttribLocation(program,'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,0,0);

  const U = {};
  ['u_image','u_disp','u_resolution','u_imgRect','u_mouse','u_time','u_active','u_radius','u_ragged','u_dispStrength']
    .forEach(name => U[name] = gl.getUniformLocation(program,name));

  const imageTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D,imageTex);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.uniform1i(U.u_image,0);

  const N = 16;
  const field = new Float32Array(N*N*2);
  const dispBytes = new Uint8Array(N*N*4);
  const dispTex = gl.createTexture();

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D,dispTex);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.uniform1i(U.u_disp,1);

  function uploadField(){
    for(let i=0;i<N*N;i++){
      const fx=Math.max(-1,Math.min(1,field[i*2]));
      const fy=Math.max(-1,Math.min(1,field[i*2+1]));
      dispBytes[i*4]=Math.round((fx*.5+.5)*255);
      dispBytes[i*4+1]=Math.round((fy*.5+.5)*255);
      dispBytes[i*4+2]=128;
      dispBytes[i*4+3]=255;
    }

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D,dispTex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,N,N,0,gl.RGBA,gl.UNSIGNED_BYTE,dispBytes);
  }
  uploadField();

  let textureReady = false;
  function loadTexture(){
    try{
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D,imageTex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,sourceImg);
      textureReady = true;
    }catch(err){
      console.warn('[portrait-fx] portrait texture failed:', err);
    }
  }

  if(sourceImg.complete && sourceImg.naturalWidth) loadTexture();
  else sourceImg.addEventListener('load',loadTexture,{once:true});

  const params = {
    radius: .165,
    ragged: .095,
    disp: .090,
    decay: .915,
    follow: 7.5
  };

  const mouse = {
    targetX:-9999,
    targetY:-9999,
    x:-9999,
    y:-9999,
    prevX:0,
    prevY:0
  };

  let activeTarget = 0;
  let active = 0;
  let last = performance.now();
  let imgRect = {x:0,y:0,w:1,h:1};
  let hostRect = {left:0,top:0,width:1,height:1};
  let homeVisible = true;

  const shared = window.__NKX_HERO_FX__ = {
    N,
    field,
    params,
    mouse,
    active:0,
    time:0,
    dpr:1,
    imgRect,
    hostRect,
    homeVisible:true,
    ready:true
  };

  const observer = new IntersectionObserver(entries => {
    homeVisible = entries[0]?.isIntersecting ?? true;
    shared.homeVisible = homeVisible;

    if(!homeVisible){
      activeTarget = 0;
      cross.classList.remove('is-active');
    }
  },{rootMargin:'20% 0px'});
  observer.observe(home);

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

    const r = sourceImg.getBoundingClientRect();
    imgRect={
      x:r.left-hostRect.left,
      y:r.top-hostRect.top,
      w:r.width,
      h:r.height
    };

    shared.hostRect = hostRect;
    shared.imgRect = imgRect;
    shared.dpr = dpr;
  }

  function inject(uvx,uvy,vx,vy){
    const gx=uvx*N-.5;
    const gy=(1-uvy)*N-.5;
    const rad=N/4;

    for(let y=0;y<N;y++){
      for(let x=0;x<N;x++){
        const dx=gx-x;
        const dy=gy-y;
        const dist2=dx*dx+dy*dy;

        if(dist2<rad*rad){
          const dist=Math.max(.35,Math.sqrt(dist2));
          const fall=Math.min(10,rad/dist);
          const i=(x+y*N)*2;
          field[i]+=vx*fall*4.2;
          field[i+1]-=vy*fall*4.2;
        }
      }
    }
  }

  function updatePointer(event){
    if(!homeVisible) return;

    syncSize();

    const x=event.clientX-hostRect.left;
    const y=event.clientY-hostRect.top;

    mouse.targetX=x;
    mouse.targetY=y;
    activeTarget=1;

    cross.classList.add('is-active');
    cross.style.left=x+'px';
    cross.style.top=y+'px';

    if(mouse.prevX!==0 || mouse.prevY!==0){
      const uvx=x/Math.max(1,hostRect.width);
      const uvy=y/Math.max(1,hostRect.height);
      const vx=(x-mouse.prevX)/Math.max(1,hostRect.width);
      const vy=(y-mouse.prevY)/Math.max(1,hostRect.height);
      inject(uvx,uvy,vx,vy);
    }

    mouse.prevX=x;
    mouse.prevY=y;
  }

  host.addEventListener('pointerenter', event => {
    mouse.prevX=0;
    mouse.prevY=0;
    updatePointer(event);
  },{passive:true});

  host.addEventListener('pointermove', updatePointer,{passive:true});

  host.addEventListener('pointerleave',()=>{
    activeTarget=0;
    cross.classList.remove('is-active');
    mouse.prevX=0;
    mouse.prevY=0;
  });

  function render(now){
    requestAnimationFrame(render);

    const dt=Math.min(.05,Math.max(.001,(now-last)/1000));
    last=now;

    if(!homeVisible) return;

    syncSize();

    const decay=Math.pow(params.decay,dt*60);
    for(let i=0;i<field.length;i++) field[i]*=decay;
    uploadField();

    const follow=1-Math.exp(-params.follow*dt);

    if(mouse.x < -9000){
      mouse.x=mouse.targetX;
      mouse.y=mouse.targetY;
    }

    mouse.x+=(mouse.targetX-mouse.x)*follow;
    mouse.y+=(mouse.targetY-mouse.y)*follow;
    active+=(activeTarget-active)*(1-Math.exp(-10*dt));

    shared.active = active;
    shared.time = now/1000;
    shared.homeVisible = homeVisible;

    gl.useProgram(program);

    const dpr=canvas.width/Math.max(1,hostRect.width);

    gl.uniform2f(U.u_resolution,canvas.width,canvas.height);
    gl.uniform4f(U.u_imgRect,imgRect.x*dpr,imgRect.y*dpr,imgRect.w*dpr,imgRect.h*dpr);
    gl.uniform2f(U.u_mouse,mouse.x*dpr,mouse.y*dpr);
    gl.uniform1f(U.u_time,now/1000);
    gl.uniform1f(U.u_active,active);
    gl.uniform1f(U.u_radius,params.radius);
    gl.uniform1f(U.u_ragged,params.ragged);
    gl.uniform1f(U.u_dispStrength,params.disp);

    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if(textureReady) gl.drawArrays(gl.TRIANGLES,0,6);
  }

  syncSize();
  requestAnimationFrame(render);
  addEventListener('resize',syncSize,{passive:true});
})();