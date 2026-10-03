(() => {
  const home = document.getElementById('home');
  const host = home?.querySelector('.hero-canvas');
  const sourceImg = home?.querySelector('.portrait-light img');
  const canvas = document.getElementById('heroInkFx');
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

    void main() {
      v_uv = a_pos * .5 + .5;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  const FRAG = `
    precision highp float;

    uniform sampler2D u_image;
    uniform vec2 u_resolution;
    uniform vec4 u_imgRect;
    uniform vec2 u_mouse;
    uniform float u_time;
    uniform float u_active;
    uniform float u_radius;
    uniform float u_ragged;
    uniform float u_glitch;

    varying vec2 v_uv;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);

      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
      );
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = .5;
      mat2 r = mat2(.87758, .47942, -.47942, .87758);

      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = r * p * 2.0 + 100.0;
        a *= .5;
      }

      return v;
    }

    void main() {
      vec2 frag = vec2(
        gl_FragCoord.x,
        u_resolution.y - gl_FragCoord.y
      );

      vec2 imgUV = (frag - u_imgRect.xy) / u_imgRect.zw;
      float portraitAlpha = 0.0;

      if (
        imgUV.x >= 0.0 &&
        imgUV.x <= 1.0 &&
        imgUV.y >= 0.0 &&
        imgUV.y <= 1.0
      ) {
        portraitAlpha = texture2D(u_image, imgUV).a;
      }

      /*
       * The portrait itself is handled by portrait-fx.js.
       * This layer only affects everything else:
       * background, signature, labels and copy.
       */
      float outsidePortrait = 1.0 - smoothstep(.01, .08, portraitAlpha);

      /*
       * 16 x 16 block offset.
       * While the pointer is moving, each cell nudges the ink field
       * independently. As u_glitch decays the blocks collapse back.
       */
      vec2 cellSize = u_resolution / 16.0;
      vec2 cell = floor(frag / cellSize);

      vec2 cellRnd = vec2(
        hash(cell + vec2(2.7, 8.1)),
        hash(cell + vec2(9.4, 1.3))
      ) - .5;

      vec2 jitter = cellRnd * cellSize * 1.05 * u_glitch;
      vec2 warpedFrag = frag + jitter;

      float minRes = min(u_resolution.x, u_resolution.y);

      vec2 p = (warpedFrag - u_mouse) / minRes;
      float d = length(p);

      vec2 nUV = warpedFrag / minRes;

      float n1 = fbm(
        nUV * 10.0 +
        vec2(u_time * -.025, u_time * .018)
      );

      float n2 = fbm(
        nUV * 23.0 +
        vec2(-u_time * .012, u_time * .009)
      );

      float edge =
        (n1 - .5) * u_ragged +
        (n2 - .5) * u_ragged * .38;

      float radius = u_radius + edge;

      float mask =
        1.0 -
        smoothstep(
          radius - .012,
          radius + .008,
          d
        );

      mask *= u_active;
      mask *= outsidePortrait;

      if (mask < .002) {
        gl_FragColor = vec4(0.0);
        return;
      }

      /*
       * White + CSS mix-blend-mode:difference
       * flips every DOM pixel underneath it:
       * background, signature, text, lines, etc.
       */
      gl_FragColor = vec4(1.0, 1.0, 1.0, mask);
    }
  `;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('[hero-ink-fx] shader compile failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  const vs = compileShader(gl.VERTEX_SHADER, VERT);
  const fs = compileShader(gl.FRAGMENT_SHADER, FRAG);

  if (!vs || !fs) return;

  const program = gl.createProgram();

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('[hero-ink-fx] program link failed:', gl.getProgramInfoLog(program));
    return;
  }

  gl.useProgram(program);

  const pos = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, pos);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]),
    gl.STATIC_DRAW
  );

  const aPos = gl.getAttribLocation(program, 'a_pos');

  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = {};

  [
    'u_image',
    'u_resolution',
    'u_imgRect',
    'u_mouse',
    'u_time',
    'u_active',
    'u_radius',
    'u_ragged',
    'u_glitch'
  ].forEach(name => {
    U[name] = gl.getUniformLocation(program, name);
  });

  const imageTex = gl.createTexture();

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, imageTex);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  gl.uniform1i(U.u_image, 0);

  let textureReady = false;

  function loadTexture() {
    try {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imageTex);

      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        sourceImg
      );

      textureReady = true;
    } catch (error) {
      console.warn('[hero-ink-fx] portrait texture failed:', error);
    }
  }

  if (sourceImg.complete && sourceImg.naturalWidth) {
    loadTexture();
  } else {
    sourceImg.addEventListener('load', loadTexture, { once: true });
  }

  const params = {
    radius: .165,
    ragged: .095,
    decay: .915,
    follow: 7.5
  };

  const mouse = {
    targetX: -9999,
    targetY: -9999,
    x: -9999,
    y: -9999,
    prevX: 0,
    prevY: 0
  };

  let activeTarget = 0;
  let active = 0;
  let glitch = 0;
  let last = performance.now();
  let hostRect = { left: 0, top: 0, width: 1, height: 1 };
  let imgRect = { x: 0, y: 0, w: 1, h: 1 };
  let homeVisible = true;

  const observer = new IntersectionObserver(entries => {
    homeVisible = entries[0]?.isIntersecting ?? true;

    if (!homeVisible) {
      activeTarget = 0;
      cross.classList.remove('is-active');
    }
  }, {
    rootMargin: '20% 0px'
  });

  observer.observe(home);

  function syncSize() {
    hostRect = host.getBoundingClientRect();

    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(hostRect.width * dpr));
    const h = Math.max(1, Math.round(hostRect.height * dpr));

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }

    const r = sourceImg.getBoundingClientRect();

    imgRect = {
      x: r.left - hostRect.left,
      y: r.top - hostRect.top,
      w: r.width,
      h: r.height
    };
  }

  host.addEventListener('pointerenter', event => {
    syncSize();

    mouse.targetX = event.clientX - hostRect.left;
    mouse.targetY = event.clientY - hostRect.top;

    if (mouse.x < -9000) {
      mouse.x = mouse.targetX;
      mouse.y = mouse.targetY;
    }

    activeTarget = 1;
    glitch = Math.max(glitch, .72);

    cross.classList.add('is-active');
    cross.style.left = mouse.targetX + 'px';
    cross.style.top = mouse.targetY + 'px';
  });

  host.addEventListener('pointermove', event => {
    if (!homeVisible) return;

    syncSize();

    const x = event.clientX - hostRect.left;
    const y = event.clientY - hostRect.top;

    mouse.targetX = x;
    mouse.targetY = y;

    const dx = x - mouse.prevX;
    const dy = y - mouse.prevY;
    const speed = Math.hypot(dx, dy);

    glitch = Math.max(
      glitch,
      Math.min(1, speed / 42)
    );

    activeTarget = 1;

    cross.classList.add('is-active');
    cross.style.left = x + 'px';
    cross.style.top = y + 'px';

    mouse.prevX = x;
    mouse.prevY = y;
  }, { passive: true });

  host.addEventListener('pointerleave', () => {
    activeTarget = 0;
    cross.classList.remove('is-active');
    mouse.prevX = 0;
    mouse.prevY = 0;
  });

  function render(now) {
    requestAnimationFrame(render);

    const dt = Math.min(
      .05,
      Math.max(
        .001,
        (now - last) / 1000
      )
    );

    last = now;

    syncSize();

    const decay = Math.pow(params.decay, dt * 60);
    glitch *= decay;

    const follow = 1 - Math.exp(-params.follow * dt);

    if (mouse.x < -9000) {
      mouse.x = mouse.targetX;
      mouse.y = mouse.targetY;
    }

    mouse.x += (mouse.targetX - mouse.x) * follow;
    mouse.y += (mouse.targetY - mouse.y) * follow;

    active +=
      (activeTarget - active) *
      (1 - Math.exp(-10 * dt));

    gl.useProgram(program);

    const dpr =
      canvas.width /
      Math.max(1, hostRect.width);

    gl.uniform2f(
      U.u_resolution,
      canvas.width,
      canvas.height
    );

    gl.uniform4f(
      U.u_imgRect,
      imgRect.x * dpr,
      imgRect.y * dpr,
      imgRect.w * dpr,
      imgRect.h * dpr
    );

    gl.uniform2f(
      U.u_mouse,
      mouse.x * dpr,
      mouse.y * dpr
    );

    gl.uniform1f(
      U.u_time,
      now / 1000
    );

    gl.uniform1f(
      U.u_active,
      homeVisible ? active : 0
    );

    gl.uniform1f(
      U.u_radius,
      params.radius
    );

    gl.uniform1f(
      U.u_ragged,
      params.ragged
    );

    gl.uniform1f(
      U.u_glitch,
      glitch
    );

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (textureReady && homeVisible) {
      gl.drawArrays(
        gl.TRIANGLES,
        0,
        6
      );
    }
  }

  syncSize();
  requestAnimationFrame(render);

  addEventListener(
    'resize',
    syncSize,
    { passive: true }
  );
})();