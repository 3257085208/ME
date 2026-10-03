(() => {
  const desktop = matchMedia('(min-width: 761px)');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const home = document.getElementById('home');
  const transition = document.getElementById('works-transition');
  const txStage = transition?.querySelector('.works-transition-stage');
  const txHomeCopy = transition?.querySelector('.tx-home-copy');
  const inkCanvas = document.getElementById('txInkCanvas');

  if (!home || !transition || !txStage || !txHomeCopy || !inkCanvas) return;

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

      float fbm(vec2 p){
        float v=0.0;
        float a=.5;
        mat2 r=mat2(.87758,.47942,-.47942,.87758);
        for(int i=0;i<4;i++){
          v += a*noise(p);
          p = r*p*2.03 + 31.7;
          a *= .5;
        }
        return v;
      }

      void main(){
        vec2 uv = gl_FragCoord.xy/u_resolution;
        float p = clamp(u_progress,0.0,1.0);

        if(p < .002){
          gl_FragColor = vec4(0.0);
          return;
        }

        /*
         * This is a dissolve FIELD, not a moving rectangle.
         * Every pixel decides independently when the paper reaches it.
         */
        float low = fbm(vec2(uv.x*1.65,uv.y*2.25)+vec2(p*.08,-p*.035));
        float mid = fbm(vec2(uv.x*6.0,uv.y*8.4)+vec2(-p*.12,p*.055));
        float dry = fbm(vec2(uv.x*15.0,uv.y*3.0)+vec2(p*.18,4.1));
        float fine = noise(uv*52.0+vec2(p*.33,-p*.17));

        float field = uv.x;
        field += (low-.5)*.34;
        field += (mid-.5)*.13;
        field += (dry-.5)*.085;
        field += (fine-.5)*.026;

        /* Starts outside the right edge and sweeps all the way left. */
        float front = 1.10 - p*1.22;
        float mask = smoothstep(front-.026,front+.025,field);

        /* Ragged holes and dry brush erosion only around the moving front. */
        float distanceToFront = abs(field-front);
        float edgeBand = 1.0-smoothstep(.015,.15,distanceToFront);
        float erosionNoise = fbm(uv*19.0+vec2(8.0+p*.25,-3.0));
        float erosion = smoothstep(.28,.66,erosionNoise);
        mask *= mix(1.0,erosion,edgeBand*.68);

        /* Separate islands ahead of the main mass make it feel splashed, not clipped. */
        float islandField = uv.x
          + (fbm(uv*3.8+vec2(2.2,-p*.11))-.5)*.48
          + (fbm(uv*11.0+vec2(-7.0,p*.19))-.5)*.12;
        float islands = smoothstep(front+.035,front+.105,islandField);
        islands *= smoothstep(.12,.42,p) * (1.0-smoothstep(.72,.93,p));
        mask = max(mask,islands*.88);

        /* Fully settle into the clean paper frame at the end of the scene. */
        mask = mix(mask,1.0,smoothstep(.93,1.0,p));

        if(mask < .002){
          gl_FragColor = vec4(0.0);
          return;
        }

        float paperGrain = noise(uv*170.0+17.0);
        vec3 paper = vec3(.925,.917,.885) + (paperGrain-.5)*.022;

        /* Dark ink granulation rides the wet edge and disappears once dry. */
        float inkNoise = fbm(uv*24.0+vec2(p*.28,9.0));
        float blackFleck = smoothstep(.57,.78,inkNoise)*edgeBand;
        blackFleck *= 1.0-smoothstep(.76,.94,p);

        float scratch = noise(vec2(uv.x*95.0,uv.y*430.0)+vec2(p*.5,0.0));
        scratch = smoothstep(.84,.94,scratch)*edgeBand;
        blackFleck = max(blackFleck,scratch*.72);

        vec3 color = mix(paper,vec3(.025,.024,.021),clamp(blackFleck*.82,0.0,1.0));

        gl_FragColor = vec4(color*mask,mask);
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
  let inkDpr=1;

  function sizeInk(){
    if(!inkReady)return;
    const rect=inkCanvas.getBoundingClientRect();
    const dpr=Math.min(devicePixelRatio||1,1.25);
    const w=Math.max(1,Math.round(rect.width*dpr));
    const h=Math.max(1,Math.round(rect.height*dpr));

    if(w!==inkW||h!==inkH){
      inkW=w;
      inkH=h;
      inkDpr=dpr;
      inkCanvas.width=w;
      inkCanvas.height=h;
      gl.viewport(0,0,w,h);
    }
  }

  function drawInk(progress){
    if(!inkReady)return;
    sizeInk();
    gl.useProgram(inkProgram);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.SCISSOR_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.resolution,inkW,inkH);
    gl.uniform1f(U.progress,progress);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }

  let scheduled=false;

  function reset(){
    root.classList.remove('cinematic-works-ready');
    transition.classList.remove('is-active');
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
    const travel=Math.max(1,transition.offsetHeight-height);
    const p=clamp(-rect.top/travel);
    const active = rect.top <= 0 && rect.bottom >= height;
    transition.classList.toggle('is-active',active);

    /*
     * The transition itself is the animation:
     * 0–18% hold
     * 18–64% organic ink/paper spread
     * 40–72% WORKS rises through the spreading texture
     * 64–100% project 01 takes over the same composition
     */
    const inkIn=phase(p,.18,.66);
    const homeCopyOut=phase(p,.20,.42);
    const portraitShift=phase(p,.20,.62);
    const worksIn=phase(p,.39,.70);
    const metaIn=phase(p,.47,.69);
    const printIn=phase(p,.61,.79);
    const featureIn=phase(p,.66,.93);
    const copyIn=phase(p,.71,.94);

    if(active){
      drawInk(inkIn);
    }else if(inkReady){
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    setHome('--tx-home-copy-opacity',(1-homeCopyOut).toFixed(4));
    setHome('--tx-home-copy-y',`${(-30*homeCopyOut).toFixed(2)}px`);
    setHome('--tx-portrait-x',`${(7.4*portraitShift).toFixed(3)}vw`);
    setHome('--tx-portrait-scale',(1-.066*portraitShift).toFixed(4));
    setHome('--tx-portrait-opacity',(1-.62*phase(p,.40,.72)).toFixed(4));

    setStage('--tx-paper-portrait-opacity',(.24*printIn*(1-.50*featureIn)).toFixed(4));
    setStage('--tx-works-opacity',worksIn.toFixed(4));
    setStage('--tx-works-y',`${(56*(1-worksIn)).toFixed(3)}vh`);
    setStage('--tx-meta-opacity',metaIn.toFixed(4));

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
