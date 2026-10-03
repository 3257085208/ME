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

  /*
   * PERF NOTES
   * - render at max 1.25 DPR (the old code could render two full-screen canvases at 2x DPR)
   * - only measure layout after resize/scroll, never on every pointer event/frame
   * - coalesce pointer work to one update per animation frame
   * - upload the 16x16 displacement texture with texSubImage2D (no reallocation)
   * - draw only a scissored box around the ink blob
   * - 3-octave edge noise + 1 detail noise instead of two 5-octave FBMs
   */
  const MAX_DPR = 1.25;

  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
    desynchronized: true
  });
  if (!gl) return;

  const VERT = `
    attribute vec2 a_pos;
    void main(){
      gl_Position = vec4(a_pos,0.0,1.0);
    }
  `;

  const FRAG = `
    precision mediump float;

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

    float fbm3(vec2 p){
      float v=0.0;
      float a=.5;
      mat2 r=mat2(.87758,.47942,-.47942,.87758);
      for(int i=0;i<3;i++){
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

      vec2 heroUV = frag/u_resolution;
      vec2 dv = texture2D(u_disp,heroUV).rg*2.0-1.0;
      float minRes = min(u_resolution.x,u_resolution.y);
      vec2 warpedFrag = frag-dv*u_dispStrength*minRes;

      vec2 shifted = clamp(imgUV-dv*u_dispStrength,.002,.998);
      vec4 src = texture2D(u_image,shifted);

      vec2 p = (warpedFrag-u_mouse)/minRes;
      float d = length(p);
      vec2 nUV = warpedFrag/minRes;

      float n1 = fbm3(nUV*10.0+vec2(u_time*-.025,u_time*.018));
      float n2 = noise(nUV*25.0+vec2(-u_time*.012,u_time*.009));
      float edge = (n1-.5)*u_ragged+(n2-.5)*u_ragged*.32;
      float radius = u_radius+edge;
      float mask = (1.0-smoothstep(radius-.012,radius+.008,d))*u_active;

      if(mask<.002){
        gl_FragColor=vec4(0.0);
        return;
      }

      float gray = dot(src.rgb,vec3(.299,.587,.114));
      gray = clamp((gray-.5)*1.22+.5,0.0,1.0);
      float grain = (hash(frag+u_time*37.0)-.5)*.022;
      vec3 positive = clamp(vec3(gray)+grain,0.0,1.0);

      gl_FragColor=vec4(positive*mask,mask);
    }
  `;

  function compileShader(type,src){
    const shader=gl.createShader(type);
    gl.shaderSource(shader,src);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
      console.warn('[portrait-fx] shader compile failed:',gl.getShaderInfoLog(shader));
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
    console.warn('[portrait-fx] program link failed:',gl.getProgramInfoLog(program));
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
  ['u_image','u_disp','u_resolution','u_imgRect','u_mouse','u_time','u_active','u_radius','u_ragged','u_dispStrength']
    .forEach(name=>U[name]=gl.getUniformLocation(program,name));

  const imageTex=gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D,imageTex);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.uniform1i(U.u_image,0);

  const N=16;
  const field=new Float32Array(N*N*2);
  const dispBytes=new Uint8Array(N*N*4);
  const dispTex=gl.createTexture();

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D,dispTex);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,N,N,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.uniform1i(U.u_disp,1);

  function encodeAndUploadField(){
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
    gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,N,N,gl.RGBA,gl.UNSIGNED_BYTE,dispBytes);
  }
  encodeAndUploadField();

  let textureReady=false;
  function loadTexture(){
    try{
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D,imageTex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,sourceImg);
      textureReady=true;
    }catch(err){
      console.warn('[portrait-fx] portrait texture failed:',err);
    }
  }
  if(sourceImg.complete&&sourceImg.naturalWidth)loadTexture();
  else sourceImg.addEventListener('load',loadTexture,{once:true});

  const params={
    radius:.165,
    ragged:.095,
    disp:.090,
    decay:.915,
    follow:7.5
  };

  const mouse={
    targetX:-9999,
    targetY:-9999,
    x:-9999,
    y:-9999,
    prevX:0,
    prevY:0
  };

  let activeTarget=0;
  let active=0;
  let last=performance.now();
  let imgRect={x:0,y:0,w:1,h:1};
  let hostRect={left:0,top:0,width:1,height:1};
  let homeVisible=true;
  let layoutDirty=true;
  let layoutVersion=0;
  let pendingPointer=null;

  const shared=window.__NKX_HERO_FX__={
    N,
    field,
    dispBytes,
    params,
    mouse,
    active:0,
    time:0,
    dpr:1,
    renderW:1,
    renderH:1,
    layoutVersion:0,
    scissor:{x:0,y:0,w:1,h:1},
    homeVisible:true,
    ready:true
  };

  function markLayoutDirty(){layoutDirty=true;}

  const observer=new IntersectionObserver(entries=>{
    homeVisible=entries[0]?.isIntersecting??true;
    shared.homeVisible=homeVisible;
    if(!homeVisible){
      activeTarget=0;
      cross.classList.remove('is-active');
    }
  },{rootMargin:'20% 0px'});
  observer.observe(home);

  const resizeObserver=new ResizeObserver(markLayoutDirty);
  resizeObserver.observe(host);
  resizeObserver.observe(sourceImg);

  addEventListener('resize',markLayoutDirty,{passive:true});
  addEventListener('scroll',markLayoutDirty,{passive:true});

  function measure(){
    if(!layoutDirty)return;

    hostRect=host.getBoundingClientRect();
    const dpr=Math.min(devicePixelRatio||1,MAX_DPR);
    const w=Math.max(1,Math.round(hostRect.width*dpr));
    const h=Math.max(1,Math.round(hostRect.height*dpr));

    if(canvas.width!==w||canvas.height!==h){
      canvas.width=w;
      canvas.height=h;
      gl.viewport(0,0,w,h);
    }

    const r=sourceImg.getBoundingClientRect();
    imgRect={
      x:r.left-hostRect.left,
      y:r.top-hostRect.top,
      w:r.width,
      h:r.height
    };

    layoutDirty=false;
    layoutVersion++;

    shared.dpr=dpr;
    shared.renderW=w;
    shared.renderH=h;
    shared.layoutVersion=layoutVersion;
  }

  function inject(uvx,uvy,vx,vy){
    const gx=uvx*N-.5;
    const gy=(1-uvy)*N-.5;
    const rad=N/4;

    const minX=Math.max(0,Math.floor(gx-rad));
    const maxX=Math.min(N-1,Math.ceil(gx+rad));
    const minY=Math.max(0,Math.floor(gy-rad));
    const maxY=Math.min(N-1,Math.ceil(gy+rad));

    for(let y=minY;y<=maxY;y++){
      for(let x=minX;x<=maxX;x++){
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

  function queuePointer(event){
    if(!homeVisible)return;
    if(layoutDirty)measure();

    const x=event.clientX-hostRect.left;
    const y=event.clientY-hostRect.top;
    pendingPointer={x,y};

    activeTarget=1;
    cross.classList.add('is-active');
    cross.style.setProperty('--fx-x',x+'px');
    cross.style.setProperty('--fx-y',y+'px');
  }

  function processPointer(){
    if(!pendingPointer)return;
    const {x,y}=pendingPointer;
    pendingPointer=null;

    mouse.targetX=x;
    mouse.targetY=y;

    if(mouse.prevX!==0||mouse.prevY!==0){
      const uvx=x/Math.max(1,hostRect.width);
      const uvy=y/Math.max(1,hostRect.height);
      const vx=(x-mouse.prevX)/Math.max(1,hostRect.width);
      const vy=(y-mouse.prevY)/Math.max(1,hostRect.height);
      inject(uvx,uvy,vx,vy);
    }

    mouse.prevX=x;
    mouse.prevY=y;
  }

  host.addEventListener('pointerenter',event=>{
    mouse.prevX=0;
    mouse.prevY=0;
    queuePointer(event);
  },{passive:true});

  host.addEventListener('pointermove',queuePointer,{passive:true});

  host.addEventListener('pointerleave',()=>{
    pendingPointer=null;
    activeTarget=0;
    cross.classList.remove('is-active');
    mouse.prevX=0;
    mouse.prevY=0;
  },{passive:true});

  function updateScissor(){
    const minRes=Math.min(canvas.width,canvas.height);
    const half=Math.ceil(minRes*(params.radius+params.ragged*.75+params.disp+.025));
    const cx=Math.round(mouse.x*shared.dpr);
    const cy=Math.round((hostRect.height-mouse.y)*shared.dpr);

    const x=Math.max(0,cx-half);
    const y=Math.max(0,cy-half);
    const x2=Math.min(canvas.width,cx+half);
    const y2=Math.min(canvas.height,cy+half);

    shared.scissor.x=x;
    shared.scissor.y=y;
    shared.scissor.w=Math.max(1,x2-x);
    shared.scissor.h=Math.max(1,y2-y);
  }

  function render(now){
    requestAnimationFrame(render);

    const dt=Math.min(.05,Math.max(.001,(now-last)/1000));
    last=now;

    if(!homeVisible)return;

    measure();
    processPointer();

    const decay=Math.pow(params.decay,dt*60);
    let fieldEnergy=0;
    for(let i=0;i<field.length;i++){
      field[i]*=decay;
      fieldEnergy+=Math.abs(field[i]);
    }

    const follow=1-Math.exp(-params.follow*dt);
    if(mouse.x<-9000){
      mouse.x=mouse.targetX;
      mouse.y=mouse.targetY;
    }
    mouse.x+=(mouse.targetX-mouse.x)*follow;
    mouse.y+=(mouse.targetY-mouse.y)*follow;
    active+=(activeTarget-active)*(1-Math.exp(-10*dt));

    shared.active=active;
    shared.time=now/1000;

    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if(active<.0015&&!activeTarget&&fieldEnergy<.003)return;

    encodeAndUploadField();
    updateScissor();

    gl.useProgram(program);
    gl.uniform2f(U.u_resolution,canvas.width,canvas.height);
    gl.uniform4f(
      U.u_imgRect,
      imgRect.x*shared.dpr,
      imgRect.y*shared.dpr,
      imgRect.w*shared.dpr,
      imgRect.h*shared.dpr
    );
    gl.uniform2f(U.u_mouse,mouse.x*shared.dpr,mouse.y*shared.dpr);
    gl.uniform1f(U.u_time,shared.time);
    gl.uniform1f(U.u_active,active);
    gl.uniform1f(U.u_radius,params.radius);
    gl.uniform1f(U.u_ragged,params.ragged);
    gl.uniform1f(U.u_dispStrength,params.disp);

    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(
      shared.scissor.x,
      shared.scissor.y,
      shared.scissor.w,
      shared.scissor.h
    );

    if(textureReady)gl.drawArrays(gl.TRIANGLES,0,6);
    gl.disable(gl.SCISSOR_TEST);
  }

  measure();
  requestAnimationFrame(render);
})();