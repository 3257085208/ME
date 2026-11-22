(() => {
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const desktop = matchMedia('(min-width: 901px)');
  const heroPaths = [...document.querySelectorAll('#home .sig')];
  const replay = document.getElementById('replay');
  const reveals = [...document.querySelectorAll('.reveal')];
  const chapters = [...document.querySelectorAll('main > .chapter[data-nav]')];
  const acts = [...document.querySelectorAll('main > .act')];
  const navLinks = [...document.querySelectorAll('.site-nav a')];
  const anchorLinks = [...document.querySelectorAll('a[href^="#"]')];
  const journey = document.querySelector('.journey');
  const journeyLabel = document.querySelector('.journey-label');
  const journeyProgress = document.querySelector('.journey-line i');
  const hero = document.getElementById('home');
  const aboutSection = document.getElementById('about');
  const aboutSignature = aboutSection ? aboutSection.querySelector('.about-signature') : null;
  const aboutPaths = aboutSignature ? [...aboutSignature.querySelectorAll('path')] : [];
  const aboutVisual = aboutSection ? aboutSection.querySelector('.about-visual') : null;
  const aboutImage = aboutVisual ? aboutVisual.querySelector('img') : null;
  const imprintWall = document.getElementById('imprint-wall');
  const imprintGhost = document.getElementById('imprint-ghost');
  const galleryCursor = document.querySelector('.gallery-cursor');
  let heroAnimations = [];
  let aboutAnimations = [];
  let astrolabe = null;
  let scheduled = false;
  let scrollAnimation = 0;
  let currentNav = '';

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const easeOutCubic = (value) => 1 - Math.pow(1 - clamp(value), 3);
  const easeOutQuint = (value) => 1 - Math.pow(1 - clamp(value), 5);
  const lenis = window.Lenis && !motion.matches ? new window.Lenis({
    duration: 1.05,
    easing: easeOutQuint,
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: .9,
    touchMultiplier: 1,
    autoRaf: false
  }) : null;

  root.classList.add('js-ready');

  /* ---------------------------------------------------------
     Signature strokes — hero and colophon share one pen curve
     --------------------------------------------------------- */
  function drawSignature(store, strokePaths) {
    store.forEach((animation) => animation.cancel());
    store.length = 0;
    if (motion.matches) return;

    let delay = 160;
    strokePaths.forEach((path) => {
      const length = path.getTotalLength();
      const tiny = length < 10;
      const duration = tiny ? 90 : Math.max(240, Math.min(1150, length * 2.65));
      store.push(path.animate(
        [
          { strokeDasharray: '1', strokeDashoffset: '1' },
          { strokeDasharray: '1', strokeDashoffset: '0' }
        ],
        {
          duration,
          delay,
          easing: 'cubic-bezier(.22,.7,.2,1)',
          fill: 'backwards'
        }
      ));
      delay += duration + (tiny ? 40 : 68);
    });
  }

  function playHeroSignature() {
    drawSignature(heroAnimations, heroPaths);
  }

  function playAboutSignature() {
    drawSignature(aboutAnimations, aboutPaths);
  }

  if (aboutSignature) {
    aboutSignature.addEventListener('click', playAboutSignature);
    aboutSignature.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        playAboutSignature();
      }
    });
  }

  /* ---------------------------------------------------------
     Act entrance — one-shot curtain choreography
     --------------------------------------------------------- */
  function markActInView(act) {
    if (!act || act.classList.contains('is-inview')) return;
    act.classList.add('is-inview');
    if (act === aboutSection) playAboutSignature();
  }

  function revealActs() {
    const nearBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 40;
    acts.forEach((act) => {
      if (act.classList.contains('is-inview')) return;
      const rect = act.getBoundingClientRect();
      if (nearBottom || rect.top < window.innerHeight * .82) markActInView(act);
    });
  }

  if ('IntersectionObserver' in window && !motion.matches) {
    const actObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          markActInView(entry.target);
          actObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.2,
      rootMargin: '0px 0px -4% 0px'
    });
    acts.forEach((act) => actObserver.observe(act));
  } else {
    acts.forEach((act) => markActInView(act));
  }

  /* ---------------------------------------------------------
     Kinetic split backdrop — frame-rate independent damping
     --------------------------------------------------------- */
  const SPLIT_RATE = 9;
  let splitStops = [];
  let splitTarget = 65;
  let splitCurrent = 65;
  let splitFrame = 0;
  let splitLastTime = 0;

  function measureSplitStops() {
    splitStops = chapters
      .map((chapter) => ({
        top: chapter.getBoundingClientRect().top + window.scrollY,
        split: parseFloat(chapter.dataset.split)
      }))
      .filter((stop) => Number.isFinite(stop.split));
  }

  function splitAtScroll(y) {
    if (!splitStops.length) return 65;
    const first = splitStops[0];
    const last = splitStops[splitStops.length - 1];
    if (y <= first.top) return first.split;
    if (y >= last.top) return last.split;
    for (let i = 0; i < splitStops.length - 1; i += 1) {
      const a = splitStops[i];
      const b = splitStops[i + 1];
      if (y >= a.top && y <= b.top) {
        const span = Math.max(1, b.top - a.top);
        const raw = (y - a.top) / span;
        const t = raw * raw * raw * (raw * (raw * 6 - 15) + 10);
        return a.split + (b.split - a.split) * t;
      }
    }
    return last.split;
  }

  function applySplit(value) {
    root.style.setProperty('--scene-split', value.toFixed(3) + '%');
  }

  function stepSplit(now) {
    splitFrame = 0;
    const time = typeof now === 'number' ? now : performance.now();
    const dt = splitLastTime ? Math.min(.05, Math.max(0, (time - splitLastTime) / 1000)) : 1 / 60;
    splitLastTime = time;

    const diff = splitTarget - splitCurrent;
    if (Math.abs(diff) < 0.008) {
      splitCurrent = splitTarget;
      splitLastTime = 0;
      applySplit(splitCurrent);
      return;
    }

    const alpha = 1 - Math.exp(-SPLIT_RATE * dt);
    splitCurrent += diff * alpha;
    applySplit(splitCurrent);
    splitFrame = requestAnimationFrame(stepSplit);
  }

  function queueSplit(currentChapter) {
    if (motion.matches) {
      const direct = currentChapter ? parseFloat(currentChapter.dataset.split) : 65;
      splitTarget = Number.isFinite(direct) ? direct : 65;
      splitCurrent = splitTarget;
      splitLastTime = 0;
      applySplit(splitCurrent);
      return;
    }
    splitTarget = splitAtScroll(window.scrollY);
    if (!splitFrame) {
      splitLastTime = 0;
      splitFrame = requestAnimationFrame(stepSplit);
    }
  }

  /* ---------------------------------------------------------
     Works gallery — darkroom shutter, fixed index, tactile panel
     --------------------------------------------------------- */
  const works = document.getElementById('works');

  function setupWorks() {
    if (!works) return;
    const items = [...works.querySelectorAll('.work-item')];
    const plates = [...works.querySelectorAll('.plate-img')];
    const plateStack = works.querySelector('.plate-stack');
    const fig = document.getElementById('works-fig');
    const caption = document.getElementById('plate-caption');
    const panel = document.getElementById('work-active-panel');
    const descEl = document.getElementById('work-desc');
    const visitEl = document.getElementById('work-visit');
    const sourceEl = document.getElementById('work-source');
    const shutter = works.querySelector('.plate-shutter');
    if (!items.length) return;

    let currentKey = '';
    let panelTimer = 0;
    let prevPlate = null;
    let prevTimer = 0;
    let shutterTimer = 0;

    const triggerShutter = () => {
      if (!shutter || motion.matches) return;
      shutter.classList.remove('is-wiping');
      void shutter.offsetWidth;
      shutter.classList.add('is-wiping');
      clearTimeout(shutterTimer);
      shutterTimer = window.setTimeout(() => shutter.classList.remove('is-wiping'), 820);
    };

    const applyPanel = (item) => {
      if (descEl) descEl.textContent = item.dataset.desc || '';
      if (visitEl) visitEl.href = item.dataset.visit || '#';
      if (sourceEl) sourceEl.href = item.dataset.source || '#';
      if (panel) panel.classList.remove('is-swapping');
    };

    const setWork = (key, animate = true) => {
      const activeItem = items.find((item) => item.dataset.work === key) || items[0];
      if (!activeItem) return;
      if (activeItem.dataset.work === currentKey) return;
      currentKey = activeItem.dataset.work;

      items.forEach((item) => {
        const active = item === activeItem;
        item.classList.toggle('is-active', active);
        const row = item.querySelector('.work-row');
        if (row) row.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      const nextPlate = plates.find((img) => img.dataset.work === activeItem.dataset.work) || plates[0];
      const currentPlate = plates.find((img) => img.classList.contains('is-active'));
      clearTimeout(prevTimer);
      plates.forEach((img) => {
        if (img !== currentPlate && img !== nextPlate) {
          img.classList.remove('is-active', 'is-prev');
          img.setAttribute('aria-hidden', 'true');
        }
      });
      if (nextPlate) {
        nextPlate.classList.remove('is-prev');
        nextPlate.classList.add('is-active');
        nextPlate.setAttribute('aria-hidden', 'false');
      }
      if (currentPlate && currentPlate !== nextPlate) {
        currentPlate.classList.remove('is-active');
        currentPlate.classList.add('is-prev');
        currentPlate.setAttribute('aria-hidden', 'true');
        prevPlate = currentPlate;
        prevTimer = window.setTimeout(() => {
          if (prevPlate) prevPlate.classList.remove('is-prev');
          prevPlate = null;
        }, 900);
      }

      if (fig) fig.textContent = activeItem.dataset.fig || '';
      if (caption) caption.textContent = activeItem.dataset.caption || '';
      if (animate) triggerShutter();
      if (!animate || motion.matches || !panel) {
        applyPanel(activeItem);
        return;
      }
      clearTimeout(panelTimer);
      panel.classList.add('is-swapping');
      panelTimer = window.setTimeout(() => applyPanel(activeItem), 140);
    };

    items.forEach((item) => {
      const row = item.querySelector('.work-row');
      if (!row) return;
      const activate = () => setWork(item.dataset.work);
      row.addEventListener('mouseenter', activate);
      row.addEventListener('focus', activate);
      row.addEventListener('click', activate);
    });

    setWork(items[0].dataset.work, false);

    /* Hover micro-parallax — fine pointers only, ±8px, damped */
    if (plateStack) {
      let targetX = 0;
      let targetY = 0;
      let valueX = 0;
      let valueY = 0;
      let frame = 0;
      let lastTime = 0;

      const applyPlate = () => {
        const active = plateStack.querySelector('.plate-img.is-active');
        if (!active) return;
        active.style.setProperty('--plate-px', valueX.toFixed(2) + 'px');
        active.style.setProperty('--plate-py', valueY.toFixed(2) + 'px');
      };

      function plateStep(now) {
        frame = 0;
        const dt = lastTime ? Math.min(.05, (now - lastTime) / 1000) : 1 / 60;
        lastTime = now;
        const alpha = 1 - Math.exp(-12 * dt);
        valueX += (targetX - valueX) * alpha;
        valueY += (targetY - valueY) * alpha;
        applyPlate();
        if (Math.abs(targetX - valueX) > 0.05 || Math.abs(targetY - valueY) > 0.05) {
          frame = requestAnimationFrame(plateStep);
        } else {
          valueX = targetX;
          valueY = targetY;
          lastTime = 0;
          applyPlate();
        }
      }

      function startPlate() {
        if (frame) return;
        lastTime = 0;
        frame = requestAnimationFrame(plateStep);
      }

      plateStack.addEventListener('pointermove', (event) => {
        if (!finePointer.matches || motion.matches) return;
        const rect = plateStack.getBoundingClientRect();
        const nx = clamp(((event.clientX - rect.left) / rect.width - .5) * 2, -1, 1);
        const ny = clamp(((event.clientY - rect.top) / rect.height - .5) * 2, -1, 1);
        targetX = -nx * 8;
        targetY = -ny * 8;
        plateStack.style.setProperty('--tilt-x', (-ny * 2.8).toFixed(3) + 'deg');
        plateStack.style.setProperty('--tilt-y', (nx * 3.2).toFixed(3) + 'deg');
        startPlate();
      });

      plateStack.addEventListener('pointerleave', () => {
        targetX = 0;
        targetY = 0;
        plateStack.style.setProperty('--tilt-x', '0deg');
        plateStack.style.setProperty('--tilt-y', '0deg');
        startPlate();
      });
    }
  }

  /* ---------------------------------------------------------
     Magnetic editorial links — fine pointers only, ±6px
     --------------------------------------------------------- */
  function setupMagneticLinks() {
    const links = [...document.querySelectorAll('.work-links a, .about-links a')];
    links.forEach((link) => {
      link.addEventListener('pointermove', (event) => {
        if (!finePointer.matches || motion.matches) return;
        const rect = link.getBoundingClientRect();
        const nx = clamp((event.clientX - (rect.left + rect.width / 2)) / Math.max(1, rect.width / 2), -1, 1);
        const ny = clamp((event.clientY - (rect.top + rect.height / 2)) / Math.max(1, rect.height / 2), -1, 1);
        link.style.setProperty('--mag-x', (nx * 6).toFixed(2) + 'px');
        link.style.setProperty('--mag-y', (ny * 6).toFixed(2) + 'px');
      });
      link.addEventListener('pointerleave', () => {
        link.style.setProperty('--mag-x', '0px');
        link.style.setProperty('--mag-y', '0px');
      });
    });
  }

  /* ---------------------------------------------------------
     Imprints — coordinate wall + depth parallax
     --------------------------------------------------------- */
  const imprints = document.getElementById('imprints');

  function setupImprints() {
    if (!imprints) return;
    const entries = [...imprints.querySelectorAll('[data-entry]')];
    const wall = document.getElementById('imprint-wall');
    const ghost = document.getElementById('imprint-ghost');
    const nameEl = document.getElementById('imprint-wall-name');
    const noteEl = document.getElementById('imprint-wall-note');
    if (!entries.length || !wall || !nameEl) return;

    let currentEntry = entries[0];
    let swapTimer = 0;

    const applyEntry = (entry, decode = false) => {
      if (ghost) ghost.textContent = entry.dataset.wallNum || '';
      if (noteEl) noteEl.textContent = entry.dataset.wallNote || '';
      if (decode) scrambleText(nameEl, entry.dataset.wallName || '');
      else nameEl.textContent = entry.dataset.wallName || '';
    };

    const showEntry = (entry) => {
      if (!entry || entry === currentEntry) return;
      currentEntry = entry;
      astrolabe?.setEntry(entry);
      if (motion.matches) {
        applyEntry(entry);
        return;
      }
      clearTimeout(swapTimer);
      wall.classList.add('is-swapping');
      swapTimer = window.setTimeout(() => {
        applyEntry(entry, true);
        wall.classList.remove('is-swapping');
      }, 180);
    };

    entries.forEach((entry) => {
      entry.addEventListener('mouseenter', () => showEntry(entry));
      entry.addEventListener('focus', () => showEntry(entry));
    });

    applyEntry(currentEntry);
    astrolabe?.setEntry(currentEntry);
  }


  /* ---------------------------------------------------------
     Telemetry nameplate decode + 3D astrolabe (Canvas 2D)
     --------------------------------------------------------- */
  function scrambleText(element, text) {
    if (!element) return;
    if (element._scrambleFrame) cancelAnimationFrame(element._scrambleFrame);
    if (motion.matches) {
      element.textContent = text;
      element._scrambleFrame = 0;
      return;
    }
    const glyphs = '0123456789ABCDEF/.—';
    const duration = 420;
    const start = performance.now();
    const total = text.length;
    const step = (now) => {
      const elapsed = now - start;
      let shown = '';
      for (let i = 0; i < total; i += 1) {
        const settle = (i / Math.max(1, total)) * duration * .7;
        shown += elapsed >= settle ? text[i] : glyphs[(Math.random() * glyphs.length) | 0];
      }
      element.textContent = shown;
      if (elapsed < duration) element._scrambleFrame = requestAnimationFrame(step);
      else {
        element.textContent = text;
        element._scrambleFrame = 0;
      }
    };
    element._scrambleFrame = requestAnimationFrame(step);
  }

  function setupAstrolabe() {
    const section = document.getElementById('imprints');
    const wall = document.getElementById('imprint-wall');
    const canvas = document.getElementById('imprintAstrolabe');
    if (!section || !wall || !canvas) return { setEntry() {}, refresh() {}, releaseLock() {} };

    const ctx = canvas.getContext('2d');
    if (!ctx) return { setEntry() {}, refresh() {}, releaseLock() {} };

    const TAU = Math.PI * 2;
    const NODES = [
      { label: '01', az: -2.55, el: .42 },
      { label: '02', az: -1.15, el: -.52 },
      { label: '03', az: .35, el: .58 },
      { label: '04', az: 1.9, el: -.36 },
      { label: '05', az: 3.0, el: .2 }
    ];
    const nodeDirs = NODES.map((node) => {
      const ce = Math.cos(node.el);
      return { x: Math.sin(node.az) * ce, y: Math.sin(node.el), z: Math.cos(node.az) * ce };
    });
    const CORE = { x: 0, y: 0, z: 1 };
    const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

    function fibonacciSphere(count) {
      const out = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) {
        const y = 1 - (i / Math.max(1, count - 1)) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const th = GOLDEN_ANGLE * i;
        out[i * 3] = Math.cos(th) * r;
        out[i * 3 + 1] = y;
        out[i * 3 + 2] = Math.sin(th) * r;
      }
      return out;
    }

    const DOTS_WIDE = fibonacciSphere(480);
    const DOTS_NARROW = fibonacciSphere(260);
    const LIGHT = (() => {
      const v = { x: -.62, y: .48, z: .62 };
      const len = Math.hypot(v.x, v.y, v.z) || 1;
      return { x: v.x / len, y: v.y / len, z: v.z / len };
    })();
    const INK = '6, 6, 6';
    const inkCache = {};

    function ink(alpha) {
      const key = Math.max(0, Math.min(200, Math.round(alpha * 200)));
      return inkCache[key] || (inkCache[key] = 'rgba(' + INK + ', ' + (key / 200).toFixed(3) + ')');
    }

    const state = {
      active: 'core',
      yaw: 0,
      targetYaw: 0,
      pitch: 0,
      targetPitch: 0,
      tiltYaw: 0,
      targetTiltYaw: 0,
      tiltPitch: 0,
      targetTiltPitch: 0,
      lockX: 0,
      lockY: 0,
      targetLockX: 0,
      targetLockY: 0,
      lockSize: 30,
      targetLockSize: 19,
      rippleStart: -10,
      rippleX: 0,
      rippleY: 0,
      lastLockKey: 'core',
      time: 0,
      frame: 0,
      visible: false,
      lastTime: 0,
      ready: false,
      gradient: null
    };

    function sphereRadius(w, h) {
      return Math.min(w * .4, h * (w < 460 ? .36 : .39));
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!state.ready) {
        state.lockX = w * .5;
        state.lockY = h * .5;
      }
      const R = sphereRadius(w, h);
      const cx = w * .5;
      const cy = h * .5;
      const gradient = ctx.createRadialGradient(cx - R * .32, cy - R * .32, R * .05, cx, cy, R);
      gradient.addColorStop(0, 'rgba(' + INK + ', 0)');
      gradient.addColorStop(.55, 'rgba(' + INK + ', .018)');
      gradient.addColorStop(1, 'rgba(' + INK + ', .055)');
      state.gradient = gradient;
      state.ready = true;
      draw();
    }

    function slerpPoint(a, b, u) {
      const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
      const omega = Math.acos(dot);
      if (omega < 1e-5) {
        return { x: a.x, y: a.y, z: a.z };
      }
      const so = Math.sin(omega);
      const wa = Math.sin((1 - u) * omega) / so;
      const wb = Math.sin(u * omega) / so;
      return { x: a.x * wa + b.x * wb, y: a.y * wa + b.y * wb, z: a.z * wa + b.z * wb };
    }

    function draw() {
      if (!state.ready) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w < 2 || h < 2) return;
      ctx.clearRect(0, 0, w, h);

      const cx = w * .5;
      const cy = h * .5;
      const R = sphereRadius(w, h);
      const yaw = state.yaw + state.tiltYaw;
      const pitch = state.pitch + state.tiltPitch;
      const yc = Math.cos(yaw);
      const ys = Math.sin(yaw);
      const pc = Math.cos(pitch);
      const ps = Math.sin(pitch);
      const t = state.time;
      const reduced = motion.matches;
      const narrow = w < 460;
      const dots = narrow ? DOTS_NARROW : DOTS_WIDE;
      const dotCount = dots.length / 3;
      const activeIndex = state.active === 'core' ? -1 : state.active;

      // ---------- back half of the 23.5° tilted double orbit ----------
      const tilt = 23.5 * Math.PI / 180;
      const tiltSin = Math.sin(tilt);
      const tiltCos = Math.cos(tilt);

      function orbitPaths(scale) {
        const back = new Path2D();
        const front = new Path2D();
        const steps = 200;
        let prev = null;
        for (let i = 0; i <= steps; i += 1) {
          const a = (i / steps) * TAU;
          const x0 = Math.cos(a);
          const y0 = Math.sin(a) * tiltSin;
          const z0 = Math.sin(a) * tiltCos;
          const x1 = x0 * yc + z0 * ys;
          const z1 = -x0 * ys + z0 * yc;
          const y1 = y0 * pc - z1 * ps;
          const z2 = y0 * ps + z1 * pc;
          const sx = cx + x1 * R * scale;
          const sy = cy - y1 * R * scale;
          if (prev) {
            const target = (z2 + prev.z) * .5 <= 0 ? back : front;
            target.moveTo(prev.x, prev.y);
            target.lineTo(sx, sy);
          }
          prev = { x: sx, y: sy, z: z2 };
        }
        return { back, front };
      }

      const orbitOuter = orbitPaths(1.22);
      const orbitInner = orbitPaths(1.19);
      ctx.lineWidth = .8;
      ctx.strokeStyle = ink(.16);
      ctx.stroke(orbitOuter.back);
      ctx.save();
      ctx.setLineDash([2, 5]);
      ctx.lineWidth = .6;
      ctx.strokeStyle = ink(.1);
      ctx.stroke(orbitInner.back);
      ctx.restore();

      // ---------- engraved stipple sphere ----------
      if (state.gradient) {
        ctx.fillStyle = state.gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, TAU);
        ctx.fill();
      }

      // Latitude/longitude guide grid: 12 full meridians, batched by hemisphere.
      const backMeridian = new Path2D();
      const frontMeridian = new Path2D();
      for (let m = 0; m < 12; m += 1) {
        const az = m * Math.PI / 6;
        const sa = Math.sin(az);
        const ca = Math.cos(az);
        let prev = null;
        for (let s = 0; s <= 48; s += 1) {
          const el = -Math.PI / 2 + (s / 48) * Math.PI;
          const ce = Math.cos(el);
          const x0 = sa * ce;
          const y0 = Math.sin(el);
          const z0 = ca * ce;
          const x1 = x0 * yc + z0 * ys;
          const z1 = -x0 * ys + z0 * yc;
          const y1 = y0 * pc - z1 * ps;
          const z2 = y0 * ps + z1 * pc;
          const sx = cx + x1 * R;
          const sy = cy - y1 * R;
          if (prev) {
            const target = (z2 + prev.z) * .5 <= 0 ? backMeridian : frontMeridian;
            target.moveTo(prev.x, prev.y);
            target.lineTo(sx, sy);
          }
          prev = { x: sx, y: sy, z: z2 };
        }
      }
      ctx.lineWidth = .6;
      ctx.strokeStyle = ink(.025);
      ctx.stroke(backMeridian);

      // Back hemisphere stipple (faint) before front grid so depth reads.
      for (let i = 0; i < dotCount; i += 1) {
        const x0 = dots[i * 3];
        const y0 = dots[i * 3 + 1];
        const z0 = dots[i * 3 + 2];
        const x1 = x0 * yc + z0 * ys;
        const z1 = -x0 * ys + z0 * yc;
        const y1 = y0 * pc - z1 * ps;
        const z2 = y0 * ps + z1 * pc;
        if (z2 > 0) continue;
        ctx.fillStyle = ink(.035);
        ctx.beginPath();
        ctx.arc(cx + x1 * R, cy - y1 * R, .42, 0, TAU);
        ctx.fill();
      }

      ctx.strokeStyle = ink(.075);
      ctx.lineWidth = .6;
      ctx.stroke(frontMeridian);

      // Front hemisphere stipple with left-top chiaroscuro.
      for (let i = 0; i < dotCount; i += 1) {
        const x0 = dots[i * 3];
        const y0 = dots[i * 3 + 1];
        const z0 = dots[i * 3 + 2];
        const x1 = x0 * yc + z0 * ys;
        const z1 = -x0 * ys + z0 * yc;
        const y1 = y0 * pc - z1 * ps;
        const z2 = y0 * ps + z1 * pc;
        if (z2 <= 0) continue;
        const nx = cx + x1 * R;
        const ny = cy - y1 * R;
        const lit = Math.max(0, Math.min(1, (x1 * LIGHT.x + y1 * LIGHT.y + z2 * LIGHT.z + .2) / 1.15));
        const shade = Math.pow(1 - lit, 1.35);
        const spread = Math.max(0, Math.min(1, (z2 + .08) / .5));
        let alpha = .05 + .37 * shade * spread + .03 * spread;
        if (lit > .72) alpha *= .55;
        let radius = .52 + .93 * shade * spread;
        alpha = Math.max(.04, Math.min(.42, alpha));
        radius = Math.max(.42, Math.min(1.45, radius));
        ctx.fillStyle = ink(alpha);
        ctx.beginPath();
        ctx.arc(nx, ny, radius, 0, TAU);
        ctx.fill();
      }

      // Fine engraved silhouette + front half of the orbit.
      ctx.lineWidth = .6;
      ctx.strokeStyle = ink(.08);
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = .8;
      ctx.strokeStyle = ink(.16);
      ctx.stroke(orbitOuter.front);
      ctx.save();
      ctx.setLineDash([2, 5]);
      ctx.lineWidth = .6;
      ctx.strokeStyle = ink(.1);
      ctx.stroke(orbitInner.front);
      ctx.restore();

      // ---------- 3D geodesic routes from the core ----------
      function rotateDir(dir) {
        const x1 = dir.x * yc + dir.z * ys;
        const z1 = -dir.x * ys + dir.z * yc;
        return {
          x: x1,
          y: dir.y * pc - z1 * ps,
          z: dir.y * ps + z1 * pc
        };
      }
      const nodeCam = nodeDirs.map(rotateDir);
      const constellation = new Path2D();
      for (let i = 0; i < nodeCam.length; i += 1) {
        for (let j = i + 1; j < nodeCam.length; j += 1) {
          const a = nodeCam[i];
          const b = nodeCam[j];
          for (let s = 0; s <= 30; s += 1) {
            const u = s / 30;
            const p = slerpPoint(a, b, u);
            const lift = 1 + .16 * Math.sin(Math.PI * u);
            const px = cx + p.x * R * lift;
            const py = cy - p.y * R * lift;
            if (s === 0) constellation.moveTo(px, py);
            else constellation.lineTo(px, py);
          }
        }
      }
      ctx.strokeStyle = ink(.05);
      ctx.lineWidth = .5;
      ctx.stroke(constellation);

      const arcSteps = 40;
      const arcCache = nodeCam.map((target) => {
        const pts = new Array(arcSteps + 1);
        for (let s = 0; s <= arcSteps; s += 1) {
          const u = s / arcSteps;
          const p = slerpPoint(CORE, target, u);
          const lift = 1 + .16 * Math.sin(Math.PI * u);
          pts[s] = {
            x: cx + p.x * R * lift,
            y: cy - p.y * R * lift,
            z: p.z
          };
        }
        return pts;
      });

      function strokeRoute(index, active) {
        const pts = arcCache[index];
        ctx.strokeStyle = ink(active ? .3 : .08);
        ctx.lineWidth = active ? .95 : .6;
        ctx.beginPath();
        pts.forEach((pt, s) => {
          if (s === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      }

      for (let i = 0; i < nodeCam.length; i += 1) if (i !== activeIndex) strokeRoute(i, false);
      if (activeIndex >= 0) strokeRoute(activeIndex, true);

      // Ten-segment ink comet tails along each route.
      if (!reduced) {
        nodeCam.forEach((target, i) => {
          const active = i === activeIndex;
          const speed = active ? .34 : .16;
          const head = (t * speed + i * .19 + .15) % 1;
          for (let j = 0; j < 10; j += 1) {
            const u = head - j * .012;
            if (u < 0) continue;
            const p = slerpPoint(CORE, target, u);
            const lift = 1 + .16 * Math.sin(Math.PI * u);
            const px = cx + p.x * R * lift;
            const py = cy - p.y * R * lift;
            const fade = 1 - j / 10;
            ctx.fillStyle = ink(active ? .05 + .8 * fade : .03 + .07 * fade);
            ctx.beginPath();
            ctx.arc(px, py, active ? .4 + 1.4 * fade : .25 + .4 * fade, 0, TAU);
            ctx.fill();
          }
        });
      }

      // ---------- Swiss double bezel with 180 precision ticks ----------
      const ringR = R * 1.12;
      const ringR2 = R * 1.165;
      const ringAngle = -t * .032;
      ctx.lineWidth = .6;
      ctx.strokeStyle = ink(.12);
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = ink(.06);
      ctx.beginPath();
      ctx.arc(cx, cy, ringR2, 0, TAU);
      ctx.stroke();

      const majorTicks = new Path2D();
      const mediumTicks = new Path2D();
      const microTicks = new Path2D();
      for (let i = 0; i < 180; i += 1) {
        const a = ringAngle + (i / 180) * TAU;
        const ca2 = Math.cos(a);
        const sa2 = Math.sin(a);
        let len = 2.8;
        let target = microTicks;
        if (i % 15 === 0) {
          len = 10;
          target = majorTicks;
        } else if (i % 5 === 0) {
          len = 6;
          target = mediumTicks;
        }
        target.moveTo(cx + ca2 * ringR2, cy + sa2 * ringR2);
        target.lineTo(cx + ca2 * (ringR2 - len), cy + sa2 * (ringR2 - len));
      }
      ctx.lineWidth = .5;
      ctx.strokeStyle = ink(.09);
      ctx.stroke(microTicks);
      ctx.lineWidth = .65;
      ctx.strokeStyle = ink(.18);
      ctx.stroke(mediumTicks);
      ctx.lineWidth = .9;
      ctx.strokeStyle = ink(.34);
      ctx.stroke(majorTicks);

      const labelRadius = ringR2 + 6;
      ctx.font = Math.max(8, Math.min(9.5, R * .042)) + 'px "Cormorant Garamond", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ['000°', '090°', '180°', '270°'].forEach((label, i) => {
        const a = ringAngle + (i / 4) * TAU - Math.PI / 2;
        ctx.save();
        ctx.translate(cx + Math.cos(a) * labelRadius, cy + Math.sin(a) * labelRadius);
        ctx.rotate(a + Math.PI / 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(244, 243, 238, .92)';
        ctx.strokeText(label, 0, 0);
        ctx.fillStyle = ink(.46);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      });

      // ---------- nodes, leaders, reticle ----------
      const nodePoints = nodeCam.map((node) => ({
        x: cx + node.x * R,
        y: cy - node.y * R,
        z: node.z
      }));

      let targetLockX = cx;
      let targetLockY = cy;
      if (activeIndex >= 0 && nodePoints[activeIndex]) {
        targetLockX = nodePoints[activeIndex].x;
        targetLockY = nodePoints[activeIndex].y;
      }
      state.targetLockX = targetLockX;
      state.targetLockY = targetLockY;
      state.targetLockSize = activeIndex >= 0 ? 15 : 19;

      const activeKey = activeIndex < 0 ? 'core' : String(activeIndex);
      if (state.lastLockKey !== activeKey) {
        state.lastLockKey = activeKey;
        state.rippleStart = t;
        state.rippleX = targetLockX;
        state.rippleY = targetLockY;
        state.lockSize = Math.max(state.lockSize, state.targetLockSize + 14);
      }

      const boxes = [];
      const coreActive = activeIndex < 0;
      ctx.font = '8.5px -apple-system, "SF Pro Text", sans-serif';
      const coreW = ctx.measureText('AS218834').width;
      const coreBox = {
        l: cx + 27,
        r: cx + 27 + coreW,
        t: cy + 17,
        b: cy + 31
      };
      boxes.push(coreBox);

      function intersects(a, b) {
        return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
      }

      nodePoints.forEach((node, i) => {
        const active = i === activeIndex;
        const nx = node.x;
        const ny = node.y;
        const dx = nx - cx;
        const dy = ny - cy;
        const dist = Math.hypot(dx, dy);
        let ux = dist > 6 ? dx / dist : Math.cos((i / 5) * TAU);
        let uy = dist > 6 ? dy / dist : Math.sin((i / 5) * TAU);
        const label = NODES[i].label;
        let drawn = false;
        let shoulder = 10;
        for (let attempt = 0; attempt < 4 && !drawn; attempt += 1) {
          const elbowX = nx + ux * 12;
          const elbowY = ny + uy * 12;
          const sign = ux >= 0 ? 1 : -1;
          const endX = elbowX + sign * shoulder;
          const textW = ctx.measureText(label).width;
          const box = {
            l: sign > 0 ? endX + 3 : endX - 3 - textW,
            r: sign > 0 ? endX + 3 + textW : endX - 3,
            t: elbowY - 5,
            b: elbowY + 5
          };
          if (!boxes.some((other) => intersects(box, other))) {
            ctx.strokeStyle = ink(node.z > 0 ? .24 : .12);
            ctx.lineWidth = .6;
            ctx.beginPath();
            ctx.moveTo(nx, ny);
            ctx.lineTo(elbowX, elbowY);
            ctx.lineTo(endX, elbowY);
            ctx.stroke();
            ctx.fillStyle = ink(node.z > 0 ? .58 : .26);
            ctx.textAlign = sign > 0 ? 'left' : 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, endX + sign * 3, elbowY);
            boxes.push(box);
            drawn = true;
          }
          shoulder += 10;
        }
        if (!drawn) {
          ctx.fillStyle = ink(.24);
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, nx + 8, ny - 8);
        }

        ctx.strokeStyle = ink(node.z > 0 ? (active ? .62 : .34) : .14);
        ctx.lineWidth = active ? 1.05 : .8;
        ctx.beginPath();
        ctx.arc(nx, ny, active ? 3.4 : 2.4, 0, TAU);
        ctx.stroke();
        if (node.z > 0) {
          ctx.fillStyle = ink(active ? .7 : .45);
          ctx.beginPath();
          ctx.arc(nx, ny, active ? 1.5 : 1, 0, TAU);
          ctx.fill();
        }
      });

      // Core: micro cross-hair with double rings; label only while core locked.
      ctx.strokeStyle = ink(coreActive ? .6 : .32);
      ctx.lineWidth = .8;
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = ink(coreActive ? .28 : .16);
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, TAU);
      ctx.stroke();
      if (coreActive) {
        ctx.strokeStyle = ink(.28);
        ctx.lineWidth = .6;
        ctx.beginPath();
        ctx.moveTo(cx + 6, cy + 6);
        ctx.lineTo(cx + 22, cy + 20);
        ctx.stroke();
      }
      ctx.fillStyle = ink(coreActive ? .42 : .1);
      ctx.font = '7.5px -apple-system, "SF Pro Text", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('AS218834', cx + 27, cy + 24);

      // Lock ripple: single 0.65s confirmation ring.
      const rippleAge = t - state.rippleStart;
      if (!reduced && rippleAge >= 0 && rippleAge < .65) {
        const p = rippleAge / .65;
        ctx.strokeStyle = ink(.35 * (1 - p));
        ctx.lineWidth = .85;
        ctx.beginPath();
        ctx.arc(state.rippleX, state.rippleY, 6 + 22 * p, 0, TAU);
        ctx.stroke();
      }

      // Vernier reticle: two counter-rotating 70° arcs plus four cardinal pins.
      ctx.save();
      ctx.translate(state.lockX, state.lockY);
      ctx.rotate(-t * .25);
      ctx.strokeStyle = ink(.62);
      ctx.lineWidth = .85;
      ctx.beginPath();
      ctx.arc(0, 0, 10, -.61, .61);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 10, Math.PI - .61, Math.PI + .61);
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = ink(.62);
      ctx.lineWidth = .85;
      for (let k = 0; k < 4; k += 1) {
        const a = k * Math.PI / 2;
        const ca2 = Math.cos(a);
        const sa2 = Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(state.lockX + ca2 * 4.5, state.lockY + sa2 * 4.5);
        ctx.lineTo(state.lockX + ca2 * 8.5, state.lockY + sa2 * 8.5);
        ctx.stroke();
      }
    }

    function step(now) {
      state.frame = 0;
      if (!state.visible || motion.matches) return;
      const dt = state.lastTime ? Math.min(.05, (now - state.lastTime) / 1000) : 1 / 60;
      state.lastTime = now;
      state.time += dt;
      const alpha = 1 - Math.exp(-7 * dt);

      if (state.active === 'core') state.targetYaw += dt * .12;
      state.yaw += (state.targetYaw - state.yaw) * alpha;
      state.pitch += (state.targetPitch - state.pitch) * alpha;
      state.tiltYaw += (state.targetTiltYaw - state.tiltYaw) * alpha;
      state.tiltPitch += (state.targetTiltPitch - state.tiltPitch) * alpha;
      const lockAlpha = 1 - Math.exp(-9 * dt);
      state.lockX += (state.targetLockX - state.lockX) * lockAlpha;
      state.lockY += (state.targetLockY - state.lockY) * lockAlpha;
      state.lockSize += (state.targetLockSize - state.lockSize) * lockAlpha;

      draw();
      state.frame = requestAnimationFrame(step);
    }

    function start() {
      if (state.frame || motion.matches) {
        if (motion.matches) draw();
        return;
      }
      state.lastTime = 0;
      state.time = Math.max(state.time, .001);
      state.frame = requestAnimationFrame(step);
    }

    function stop() {
      if (state.frame) cancelAnimationFrame(state.frame);
      state.frame = 0;
      state.lastTime = 0;
    }

    function setEntry(entry) {
      const key = entry && entry.dataset ? entry.dataset.node : 'core';
      if (key === 'core' || !key) {
        state.active = 'core';
        state.targetPitch = 0;
        state.targetLockSize = 19;
      } else {
        const index = parseInt(key, 10) - 1;
        if (Number.isFinite(index) && NODES[index]) {
          state.active = index;
          const delta = (((-NODES[index].az - state.yaw) % TAU) + Math.PI * 3) % TAU - Math.PI;
          state.targetYaw = state.yaw + delta;
          state.targetPitch = NODES[index].el - .12;
          state.targetLockSize = 15;
        }
      }
      if (motion.matches) {
        state.yaw = state.targetYaw;
        state.pitch = state.targetPitch;
        draw();
        state.lockX = state.targetLockX;
        state.lockY = state.targetLockY;
        state.lockSize = state.targetLockSize;
        draw();
      }
    }

    function onPointerMove(event) {
      if (!finePointer.matches || motion.matches) return;
      const rect = wall.getBoundingClientRect();
      const nx = clamp(((event.clientX - rect.left) / rect.width - .5) * 2, -1, 1);
      const ny = clamp(((event.clientY - rect.top) / rect.height - .5) * 2, -1, 1);
      state.targetTiltYaw = nx * .16;
      state.targetTiltPitch = -ny * .13;
      start();
    }

    function releaseLock() {
      if (state.active !== 'core') {
        state.active = 'core';
        state.targetPitch = 0;
        state.targetLockSize = 19;
      }
    }

    wall.addEventListener('pointermove', onPointerMove, { passive: true });
    wall.addEventListener('pointerleave', () => {
      state.targetTiltYaw = 0;
      state.targetTiltPitch = 0;
    });

    const observer = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        state.visible = entry.isIntersecting;
        if (state.visible) start();
        else stop();
      });
    }, { threshold: 0.01 }) : null;

    if (observer) observer.observe(section);
    else {
      state.visible = true;
      start();
    }

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (state.visible) start();
    });

    const entryObserver = 'ResizeObserver' in window ? new ResizeObserver(() => resize()) : null;
    if (entryObserver) entryObserver.observe(canvas);
    else window.addEventListener('resize', resize);

    resize();

    return {
      setEntry(entry) {
        setEntry(entry);
      },
      refresh() {
        if (motion.matches) {
          stop();
          draw();
          return;
        }
        if (state.visible) start();
      },
      releaseLock() {
        releaseLock();
      }
    };
  }

  /* ---------------------------------------------------------
     Scroll-linked depth: about portrait + imprints ghost
     --------------------------------------------------------- */
  function updateDepthParallax() {
    if (motion.matches) return;

    if (desktop.matches && aboutSection && aboutVisual && aboutImage) {
      const aboutTop = aboutSection.getBoundingClientRect().top + window.scrollY;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const start = aboutTop - window.innerHeight;
      const t = clamp((window.scrollY - start) / Math.max(1, maxScroll - start), 0, 1);
      const shift = -12 + 24 * t;
      aboutImage.style.setProperty('--about-shift', shift.toFixed(2) + 'px');
    }

    if (desktop.matches && imprintWall && imprintGhost) {
      const rect = imprintWall.getBoundingClientRect();
      const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight * 2), 0, 1);
      const shift = 24 - 48 * progress;
      imprintGhost.style.setProperty('--ghost-shift', shift.toFixed(2) + 'px');
    }
  }

  /* ---------------------------------------------------------
     Gallery cursor — desktop precision pointer companion
     --------------------------------------------------------- */
  let cursorFrame = 0;
  let cursorLastTime = 0;
  let cursorX = -100;
  let cursorY = -100;
  let cursorTargetX = -100;
  let cursorTargetY = -100;
  let pointerX = -1;
  let pointerY = -1;

  function cursorInHero(x, y) {
    if (!hero) return false;
    const rect = hero.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function setCursorMode(target, x, y) {
    if (!galleryCursor) return;
    if (!finePointer.matches || motion.matches || cursorInHero(x, y)) {
      galleryCursor.classList.remove('is-visible', 'is-ring', 'is-plate');
      return;
    }
    const plate = target && target.closest ? target.closest('.plate-stack') : null;
    const ring = target && target.closest
      ? target.closest('.work-row, .imprint-row, .imprint-asn, .about-links a, .work-links a')
      : null;
    galleryCursor.classList.toggle('is-plate', Boolean(plate));
    galleryCursor.classList.toggle('is-ring', !plate && Boolean(ring));
    galleryCursor.classList.add('is-visible');
  }

  function cursorStep(now) {
    cursorFrame = 0;
    if (!galleryCursor) return;
    const dt = cursorLastTime ? Math.min(.05, (now - cursorLastTime) / 1000) : 1 / 60;
    cursorLastTime = now;
    const alpha = 1 - Math.exp(-16 * dt);
    cursorX += (cursorTargetX - cursorX) * alpha;
    cursorY += (cursorTargetY - cursorY) * alpha;
    galleryCursor.style.setProperty('--cursor-x', cursorX.toFixed(2) + 'px');
    galleryCursor.style.setProperty('--cursor-y', cursorY.toFixed(2) + 'px');
    if (Math.abs(cursorTargetX - cursorX) > 0.2 || Math.abs(cursorTargetY - cursorY) > 0.2) {
      cursorFrame = requestAnimationFrame(cursorStep);
    } else {
      cursorLastTime = 0;
    }
  }

  function startCursor() {
    if (cursorFrame) return;
    cursorLastTime = 0;
    cursorFrame = requestAnimationFrame(cursorStep);
  }

  if (galleryCursor) {
    window.addEventListener('pointermove', (event) => {
      if (!finePointer.matches || motion.matches) return;
      const firstMove = pointerX < 0;
      pointerX = event.clientX;
      pointerY = event.clientY;
      cursorTargetX = event.clientX;
      cursorTargetY = event.clientY;
      if (firstMove) {
        cursorX = event.clientX;
        cursorY = event.clientY;
        galleryCursor.style.setProperty('--cursor-x', cursorX.toFixed(2) + 'px');
        galleryCursor.style.setProperty('--cursor-y', cursorY.toFixed(2) + 'px');
      }
      setCursorMode(event.target, event.clientX, event.clientY);
      startCursor();
    }, { passive: true });

    const hideCursor = () => {
      pointerX = -1;
      pointerY = -1;
      galleryCursor.classList.remove('is-visible', 'is-ring', 'is-plate');
    };
    document.documentElement.addEventListener('pointerleave', hideCursor);
    window.addEventListener('blur', hideCursor);
  }

  function refreshCursor() {
    if (!galleryCursor) return;
    if (!finePointer.matches || motion.matches || pointerX < 0) {
      galleryCursor.classList.remove('is-visible', 'is-ring', 'is-plate');
      return;
    }
    const target = document.elementFromPoint(pointerX, pointerY);
    setCursorMode(target, pointerX, pointerY);
  }

  /* ---------------------------------------------------------
     Reveal motion — reliable, one-way, always ends at opacity 1
     --------------------------------------------------------- */
  function revealVisibleElements() {
    if (motion.matches) {
      reveals.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const nearBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 40;
    reveals.forEach((el) => {
      if (el.classList.contains('is-visible')) return;
      const rect = el.getBoundingClientRect();
      if (nearBottom || rect.top < window.innerHeight * .92) {
        el.classList.add('is-visible');
      }
    });
  }

  if ('IntersectionObserver' in window && !motion.matches) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -6% 0px',
      threshold: 0.05
    });
    reveals.forEach((el) => revealObserver.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------------------------------------------------------
     Scroll state: nav, journey, header tone, split, depth, cursor
     --------------------------------------------------------- */
  function update() {
    scheduled = false;
    const marker = window.innerHeight * .36;
    let current = chapters[0];

    chapters.forEach((chapter) => {
      if (chapter.getBoundingClientRect().top <= marker) current = chapter;
    });

    if (current?.dataset.nav !== currentNav) {
      currentNav = current?.dataset.nav || 'home';
      navLinks.forEach((link) => {
        if (link.hash === '#' + currentNav) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    }

    const index = Math.max(0, chapters.indexOf(current));
    if (journeyLabel) journeyLabel.textContent = current?.dataset.label || 'Introduction';
    if (journeyProgress) {
      const progress = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      journeyProgress.style.transform = 'scaleX(' + clamp(progress).toFixed(4) + ')';
    }

    document.body.dataset.headerTone = current?.dataset.tone || 'dark';
    if (journey) journey.dataset.atHome = index === 0 ? 'true' : 'false';

    revealVisibleElements();
    revealActs();
    updateDepthParallax();
    queueSplit(current);
    refreshCursor();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }

  /* ---------------------------------------------------------
     Anchor navigation with cinematic scroll
     --------------------------------------------------------- */
  function cancelAnimatedScroll() {
    if (scrollAnimation) cancelAnimationFrame(scrollAnimation);
    scrollAnimation = 0;
  }

  function animateScrollTo(targetY, duration = 900) {
    cancelAnimatedScroll();
    if (motion.matches) {
      window.scrollTo(0, targetY);
      return;
    }

    if (lenis) {
      lenis.scrollTo(targetY, {
        duration: duration / 1000,
        easing: easeOutQuint,
        lock: true
      });
      return;
    }

    const startY = window.scrollY;
    const distance = targetY - startY;
    const started = performance.now();

    function tick(now) {
      const progress = clamp((now - started) / duration);
      window.scrollTo(0, startY + distance * easeOutCubic(progress));
      if (progress < 1) scrollAnimation = requestAnimationFrame(tick);
      else scrollAnimation = 0;
    }

    scrollAnimation = requestAnimationFrame(tick);
  }

  anchorLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.querySelector(link.hash);
      if (!target) return;
      event.preventDefault();
      const targetY = target.getBoundingClientRect().top + window.scrollY;
      history.pushState(null, '', link.hash);
      animateScrollTo(targetY);
    });
  });

  window.addEventListener('wheel', cancelAnimatedScroll, { passive: true });
  window.addEventListener('touchstart', cancelAnimatedScroll, { passive: true });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => {
    measureSplitStops();
    schedule();
  });
  window.addEventListener('popstate', () => {
    const target = location.hash ? document.querySelector(location.hash) : null;
    animateScrollTo(target ? target.getBoundingClientRect().top + window.scrollY : 0);
  });
  lenis?.on('scroll', schedule);
  replay?.addEventListener('click', playHeroSignature);
  motion.addEventListener('change', () => {
    if (motion.matches) lenis?.stop();
    else lenis?.start();
    astrolabe?.refresh();
    revealVisibleElements();
    if (motion.matches) {
      acts.forEach((act) => act.classList.add('is-inview'));
      aboutAnimations.forEach((animation) => animation.cancel());
      aboutAnimations = [];
      heroAnimations.forEach((animation) => animation.cancel());
      heroAnimations = [];
    }
    playHeroSignature();
    schedule();
  });

  /* ---------------------------------------------------------
     Lenis scroll inertia — silk-like skew and lag
     --------------------------------------------------------- */
  let inertiaLast = 0;
  let inertiaSkew = 0;
  let inertiaLag = 0;

  function updateScrollInertia(now) {
    if (!lenis) return;
    if (motion.matches) {
      inertiaLast = 0;
      inertiaSkew = 0;
      inertiaLag = 0;
      root.style.setProperty('--scroll-skew', '0deg');
      root.style.setProperty('--scroll-lag', '0px');
      return;
    }
    const dt = inertiaLast ? Math.min(.05, Math.max(0, (now - inertiaLast) / 1000)) : 1 / 60;
    inertiaLast = now;
    const velocity = typeof lenis.velocity === 'number' ? lenis.velocity : 0;
    const targetSkew = clamp(velocity * .02, -1.2, 1.2);
    const targetLag = clamp(velocity * .16, -10, 10);
    const alpha = 1 - Math.exp(-10 * dt);
    inertiaSkew += (targetSkew - inertiaSkew) * alpha;
    inertiaLag += (targetLag - inertiaLag) * alpha;
    if (Math.abs(targetSkew - inertiaSkew) < .004) inertiaSkew = targetSkew;
    if (Math.abs(targetLag - inertiaLag) < .015) inertiaLag = targetLag;
    root.style.setProperty('--scroll-skew', inertiaSkew.toFixed(3) + 'deg');
    root.style.setProperty('--scroll-lag', inertiaLag.toFixed(2) + 'px');
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  measureSplitStops();
  splitCurrent = splitAtScroll(window.scrollY);
  splitTarget = splitCurrent;
  applySplit(splitCurrent);

  setupWorks();
  astrolabe = setupAstrolabe();
  setupImprints();
  setupMagneticLinks();

  playHeroSignature();
  update();

  if (lenis) {
    function raf(time) {
      lenis.raf(time);
      updateScrollInertia(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }
})();
