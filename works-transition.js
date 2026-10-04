(() => {
  const desktop = matchMedia('(min-width: 761px)');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const home = document.getElementById('home');
  const transition = document.getElementById('works-transition');
  const works = document.getElementById('works');
  const txStage = transition?.querySelector('.works-transition-stage');
  const txHomeCopy = transition?.querySelector('.tx-home-copy');
  const inkCanvas = document.getElementById('txInkCanvas');
  const realWorksStage = works?.querySelector('.works-stage');

  if (!home || !transition || !works || !realWorksStage || !txStage || !txHomeCopy || !inkCanvas) return;

  /*
   * Use a pixel-identical clone of the REAL Works stage for the last part of
   * the transition. This removes the final typography/layout swap entirely:
   * the handoff is now Works -> the same Works, rather than a hand-built
   * imitation -> Works.
   */
  const worksSnapshot = realWorksStage.cloneNode(true);
  worksSnapshot.classList.add('tx-works-snapshot');
  worksSnapshot.setAttribute('aria-hidden','true');
  worksSnapshot.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  worksSnapshot.querySelectorAll('a,button').forEach(el=>{
    el.tabIndex=-1;
    el.setAttribute('aria-hidden','true');
  });
  worksSnapshot.querySelectorAll('img').forEach(img=>{
    img.loading='eager';
    img.decoding='async';
  });
  txStage.appendChild(worksSnapshot);

  const sourceHero = home.querySelector('.hero');
  if (sourceHero && !txHomeCopy.childElementCount) {
    const clone = sourceHero.cloneNode(true);
    clone.removeAttribute('aria-labelledby');
    clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    clone.querySelectorAll('button').forEach(button => {
      button.disabled = true;
      button.tabIndex = -1;
    });
    while (clone.firstChild) txHomeCopy.appendChild(clone.firstChild);
  }

  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => {
    const p = clamp(value);
    return p * p * (3 - 2 * p);
  };
  const phase = (value, from, to) => smooth((value - from) / Math.max(.0001, to - from));
  const setStage = (name, value) => txStage.style.setProperty(name, value);
  const setHome = (name, value) => home.style.setProperty(name, value);

  const gl = inkCanvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance'
  });

  let inkReady = false;
  let inkProgram = null;
  let U = null;

  if (gl) {
    const VERT = `
      attribute vec2 a_pos;
      void main(){
        gl_Position = vec4(a_pos,0.0,1.0);
      }
    `;

    const FRAG = `
      precision mediump float;

      uniform vec2 u_resolution;
      uniform float u_progress;

      float hash(vec2 p){
        p = fract(p*vec2(123.34,456.21));
        p += dot(p,p+45.32);
        return fract(p.x*p.y);
      }

      float noise(vec2 p){
        vec2 i=floor(p);
        vec2 f=fract(p);
        f=f*f*(3.0-2.0*f);
        return mix(
          mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),
          mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),
          f.y
        );
      }

      /* Two octaves are enough at the deliberately low render resolution.
         The previous shader evaluated many 4-octave FBMs per pixel, which
         was the main GPU cost while scrolling. */
      float fbm2(vec2 p){
        float v=.5*noise(p);
        p=mat2(.87758,.47942,-.47942,.87758)*p*2.03+31.7;
        v+=.25*noise(p);
        return v/.75;
      }

      void main(){
        vec2 uv=gl_FragCoord.xy/u_resolution;
        float p=clamp(u_progress,0.0,1.0);

        if(p<.002){
          gl_FragColor=vec4(0.0);
          return;
        }

        float low=fbm2(vec2(uv.x*1.7,uv.y*2.35)+vec2(p*.07,-p*.03));
        float mid=fbm2(vec2(uv.x*7.0,uv.y*8.8)+vec2(-p*.10,p*.05));
        float fine=hash(floor(uv*u_resolution*.065)+vec2(p*17.0,9.0));

        float field=uv.x;
        field+=(low-.5)*.36;
        field+=(mid-.5)*.14;
        field+=(fine-.5)*.022;

        float front=1.10-p*1.22;
        float mask=smoothstep(front-.029,front+.025,field);

        float distanceToFront=abs(field-front);
        float edgeBand=1.0-smoothstep(.014,.145,distanceToFront);

        float erosion=fbm2(uv*18.0+vec2(8.0+p*.18,-3.0));
        mask*=mix(1.0,smoothstep(.27,.65,erosion),edgeBand*.64);

        float islandField=uv.x
          +(fbm2(uv*4.2+vec2(2.2,-p*.09))-.5)*.50
          +(noise(uv*12.0+vec2(-7.0,p*.16))-.5)*.12;
        float islands=smoothstep(front+.035,front+.11,islandField);
        islands*=smoothstep(.12,.42,p)*(1.0-smoothstep(.72,.93,p));
        mask=max(mask,islands*.88);

        mask=mix(mask,1.0,smoothstep(.93,1.0,p));

        if(mask<.002){
          gl_FragColor=vec4(0.0);
          return;
        }

        float grain=hash(floor(uv*u_resolution*.32)+17.0);
        vec3 paper=vec3(.925,.917,.885)+(grain-.5)*.018;

        float inkNoise=fbm2(uv*22.0+vec2(p*.22,9.0));
        float blackFleck=smoothstep(.58,.78,inkNoise)*edgeBand;
        blackFleck*=1.0-smoothstep(.76,.94,p);

        float scratch=hash(floor(vec2(uv.x*u_resolution.x*.09,uv.y*u_resolution.y*.42))+vec2(p*41.0,3.0));
        scratch=smoothstep(.91,.975,scratch)*edgeBand;
        blackFleck=max(blackFleck,scratch*.62);

        vec3 color=mix(paper,vec3(.025,.024,.021),clamp(blackFleck*.80,0.0,1.0));
        gl_FragColor=vec4(color*mask,mask);
      }
    `;

    const compile = (type,src) => {
      const shader=gl.createShader(type);
      gl.shaderSource(shader,src);
      gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
        console.warn('[works-transition] shader compile failed:',gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs=compile(gl.VERTEX_SHADER,VERT);
    const fs=compile(gl.FRAGMENT_SHADER,FRAG);

    if(vs&&fs){
      inkProgram=gl.createProgram();
      gl.attachShader(inkProgram,vs);
      gl.attachShader(inkProgram,fs);
      gl.linkProgram(inkProgram);

      if(gl.getProgramParameter(inkProgram,gl.LINK_STATUS)){
        gl.useProgram(inkProgram);

        const buffer=gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),
          gl.STATIC_DRAW
        );

        const aPos=gl.getAttribLocation(inkProgram,'a_pos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,0,0);

        U={
          resolution:gl.getUniformLocation(inkProgram,'u_resolution'),
          progress:gl.getUniformLocation(inkProgram,'u_progress')
        };

        gl.clearColor(0,0,0,0);
        inkReady=true;
      } else {
        console.warn('[works-transition] program link failed:',gl.getProgramInfoLog(inkProgram));
      }
    }
  }

  let inkW=0;
  let inkH=0;
  let lastInkProgress=-1;

  function sizeInk(){
    if(!inkReady)return;
    const rect=inkCanvas.getBoundingClientRect();

    /* The ink edge is intentionally grainy, so rendering it below CSS pixel
       resolution is visually almost free but dramatically cheaper on Retina. */
    const scale=innerWidth>=1800?.52:innerWidth>=1300?.60:.68;
    const w=Math.max(1,Math.round(rect.width*scale));
    const h=Math.max(1,Math.round(rect.height*scale));

    if(w!==inkW||h!==inkH){
      inkW=w;
      inkH=h;
      inkCanvas.width=w;
      inkCanvas.height=h;
      gl.viewport(0,0,w,h);
      lastInkProgress=-1;
    }
  }

  function drawInk(progress){
    if(!inkReady)return;
    sizeInk();

    /* At most ~500 visually distinct transition frames across the whole
       sequence. Do not redraw the full-screen shader for sub-pixel scroll
       changes that the eye cannot see. */
    const quantized=Math.round(progress*500)/500;
    if(Math.abs(quantized-lastInkProgress)<.0005)return;
    lastInkProgress=quantized;

    gl.useProgram(inkProgram);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.SCISSOR_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.resolution,inkW,inkH);
    gl.uniform1f(U.progress,quantized);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }

  let scheduled=false;

  function reset(){
    root.classList.remove('cinematic-works-ready');
    transition.classList.remove('is-active');
    root.classList.remove('ink-transition-active');
    txStage.removeAttribute('style');
    [
      '--tx-home-copy-opacity','--tx-home-copy-y',
      '--tx-portrait-x','--tx-portrait-scale','--tx-portrait-opacity'
    ].forEach(name=>home.style.removeProperty(name));
    if(inkReady){
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }

  function update(){
    scheduled=false;

    if(!desktop.matches||motion.matches){
      reset();
      return;
    }

    root.classList.add('cinematic-works-ready');

    const height=Math.max(1,innerHeight);
    const rect=transition.getBoundingClientRect();

    /* The transition now owns its full 300svh scroll range and ends BEFORE
       the real Works chapter begins. There is no overlap to manage. */
    const p=clamp(-rect.top/Math.max(1,transition.offsetHeight));
    const active=rect.top<=0&&rect.bottom>0&&p<.9995;

    transition.classList.toggle('is-active',active);
    root.classList.toggle('ink-transition-active',active);

    /*
     * The transition itself is the animation:
     * 0–18% hold
     * 18–64% organic ink/paper spread
     * 40–72% WORKS rises through the spreading texture
     * 64–100% project 01 takes over the same composition
     */
    const inkIn=phase(p,.10,.54);
    const homeCopyOut=phase(p,.13,.34);
    const portraitShift=phase(p,.13,.48);
    const worksIn=phase(p,.29,.56);
    const metaIn=phase(p,.34,.56);
    const printIn=phase(p,.44,.66);
    const featureIn=phase(p,.58,.84);
    const copyIn=phase(p,.62,.86);
    const finalSurface=phase(p,.84,.95);
    const noteOut=phase(p,.78,.92);
    const sideIn=phase(p,.80,.94);
    const snapshotIn=phase(p,.82,.955);

    if(active){
      drawInk(inkIn);
    }else if(inkReady&&lastInkProgress!==-1){
      gl.clear(gl.COLOR_BUFFER_BIT);
      lastInkProgress=-1;
    }

    setHome('--tx-home-copy-opacity',(1-homeCopyOut).toFixed(4));
    setHome('--tx-home-copy-y',`${(-30*homeCopyOut).toFixed(2)}px`);
    setHome('--tx-portrait-x',`${(7.4*portraitShift).toFixed(3)}vw`);
    setHome('--tx-portrait-scale',(1-.066*portraitShift).toFixed(4));
    setHome('--tx-portrait-opacity',(1-.62*phase(p,.40,.72)).toFixed(4));

    const printOpacity=.24*printIn*(1-featureIn)+.075*featureIn;
    setStage('--tx-paper-portrait-opacity',printOpacity.toFixed(4));
    setStage('--tx-works-opacity',worksIn.toFixed(4));
    setStage('--tx-works-y',`${(56*(1-worksIn)).toFixed(3)}vh`);
    setStage('--tx-meta-opacity',metaIn.toFixed(4));
    setStage('--tx-note-opacity',(metaIn*(1-noteOut)).toFixed(4));
    setStage('--tx-side-opacity',sideIn.toFixed(4));
    setStage('--tx-final-paper-opacity',finalSurface.toFixed(4));
    setStage('--tx-ink-opacity',(1-phase(p,.87,.96)).toFixed(4));
    setStage('--tx-snapshot-opacity',snapshotIn.toFixed(4));

    setStage('--tx-feature-opacity',featureIn.toFixed(4));
    setStage('--tx-feature-x',`${(12*(1-featureIn)).toFixed(3)}vw`);
    setStage('--tx-feature-y',`${(7*(1-featureIn)).toFixed(3)}vh`);
    setStage('--tx-feature-scale',(.76+.24*featureIn).toFixed(4));
    setStage('--tx-feature-rotate',`${(10*(1-featureIn)).toFixed(3)}deg`);
    setStage('--tx-feature-copy-x',`${(-4*(1-copyIn)).toFixed(3)}vw`);
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(update);
  }

  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  addEventListener('load',schedule,{once:true});
  desktop.addEventListener('change',schedule);
  motion.addEventListener('change',schedule);

  update();
})();
