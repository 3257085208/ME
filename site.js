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
    const RAD = Math.PI / 180;
    const INK = '6, 6, 6';
    const inkCache = {};

    function ink(alpha) {
      const key = Math.max(0, Math.min(200, Math.round(alpha * 200)));
      return inkCache[key] || (inkCache[key] = 'rgba(' + INK + ', ' + (key / 200).toFixed(3) + ')');
    }

    const LIGHT = (() => {
      const v = { x: -.55, y: .45, z: .70 };
      const len = Math.hypot(v.x, v.y, v.z) || 1;
      return { x: v.x / len, y: v.y / len, z: v.z / len };
    })();

    const CORE = { lat: 39.90, lon: 116.40, label: 'CN · CORE' };
    const CORE_VIEW = { lat: 24, lon: 120 };
    const CITIES = [
      { lat: 31.20, lon: 121.50, label: 'CN · 01' },
      { lat: 35.70, lon: 139.70, label: 'JP · 02' },
      { lat: 50.11, lon: 8.68, label: 'DE · 03' },
      { lat: 34.05, lon: -118.24, label: 'US · 04' },
      { lat: 1.35, lon: 103.82, label: 'SG · 05' }
    ];

    function toVector(latDeg, lonDeg) {
      const lat = latDeg * RAD;
      const lon = lonDeg * RAD;
      const ce = Math.cos(lat);
      return { x: ce * Math.sin(lon), y: Math.sin(lat), z: ce * Math.cos(lon) };
    }

    const coreVec = toVector(CORE.lat, CORE.lon);
    const cityVecs = CITIES.map((city) => toVector(city.lat, city.lon));

    function decodeWorldDots(payload) {
      if (!payload || typeof payload.data !== 'string') return new Float32Array(0);
      try {
        const bin = atob(payload.data);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
        const ints = new Int16Array(bytes.buffer);
        const scale = payload.scale || 1000;
        const out = new Float32Array(ints.length);
        for (let i = 0; i < ints.length; i += 1) out[i] = ints[i] / scale;
        return out;
      } catch (error) {
        return new Float32Array(0);
      }
    }

    const worldDots = decodeWorldDots(window.__QQSG_WORLD_DOTS__);
    const totalDots = worldDots.length / 3;

    const FRONT_ALPHA = [];
    const FRONT_RADIUS = [];
    for (let b = 0; b < 7; b += 1) {
      FRONT_ALPHA.push(.55 + .40 * (b / 6));
      FRONT_RADIUS.push(1.25 + .90 * (b / 6));
    }

    const state = {
      active: 'core',
      locked: true,
      mode: 'locked',
      yaw: -CORE_VIEW.lon * RAD,
      targetYaw: -CORE_VIEW.lon * RAD,
      pitch: CORE_VIEW.lat * RAD,
      targetPitch: CORE_VIEW.lat * RAD,
      tiltYaw: 0,
      targetTiltYaw: 0,
      tiltPitch: 0,
      targetTiltPitch: 0,
      lockX: 0,
      lockY: 0,
      targetLockX: 0,
      targetLockY: 0,
      lastLockKey: 'core',
      rippleStart: -10,
      rippleX: 0,
      rippleY: 0,
      time: 0,
      frame: 0,
      visible: false,
      lastTime: 0,
      ready: false,
      gradient: null,
      dragging: false,
      dragMoved: false,
      pointerId: null,
      lastPX: 0,
      lastPY: 0,
      lastMoveAt: 0,
      spinYaw: 0,
      spinPitch: 0,
      idleSince: 0
    };

    function clampPitch(value) {
      return Math.max(-1.26, Math.min(1.26, value));
    }

    function shortestDelta(target) {
      let delta = (target - state.yaw) % TAU;
      if (delta > Math.PI) delta -= TAU;
      if (delta < -Math.PI) delta += TAU;
      return delta;
    }

    function sphereRadius(w, h) {
      return Math.min(w * .42, h * .45, (Math.min(w, h) * .5 - 22) / 1.09);
    }

    function rotateVector(x, y, z, yaw, pitch) {
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;
      const y1 = y * cp - z1 * sp;
      const z2 = y * sp + z1 * cp;
      return { x: x1, y: y1, z: z2 };
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
      gradient.addColorStop(.55, 'rgba(' + INK + ', .015)');
      gradient.addColorStop(1, 'rgba(' + INK + ', .05)');
      state.gradient = gradient;
      state.ready = true;
      draw();
    }

    function slerpPoint(a, b, u) {
      const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
      const omega = Math.acos(dot);
      if (omega < 1e-5) return { x: a.x, y: a.y, z: a.z };
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
      const narrow = w < 460;
      const stride = narrow ? 2 : 1;
      const t = state.time;
      const reduced = motion.matches;
      const activeIndex = state.active === 'core' ? -1 : state.active;

      // ---------- immersed sphere shadow + equator reference ----------
      if (state.gradient) {
        ctx.fillStyle = state.gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = ink(.07);
      ctx.lineWidth = .6;
      ctx.beginPath();
      for (let s = 0; s <= 90; s += 1) {
        const lon = (s / 90) * TAU;
        const p = rotateVector(Math.sin(lon), 0, Math.cos(lon), yaw, pitch);
        const px = cx + p.x * R;
        const py = cy - p.y * R;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // ---------- real-world stipple: one back bucket + seven front tone buckets ----------
      const buckets = [
        new Path2D(),
        new Path2D(),
        new Path2D(),
        new Path2D(),
        new Path2D(),
        new Path2D(),
        new Path2D(),
        new Path2D()
      ];
      for (let i = 0; i < totalDots; i += stride) {
        const base = i * 3;
        const x0 = worldDots[base];
        const y0 = worldDots[base + 1];
        const z0 = worldDots[base + 2];
        const p = rotateVector(x0, y0, z0, yaw, pitch);
        const sx = cx + p.x * R;
        const sy = cy - p.y * R;
        if (p.z <= 0) {
          buckets[0].moveTo(sx + .7, sy);
          buckets[0].arc(sx, sy, .7, 0, TAU);
          continue;
        }
        const lit = p.x * LIGHT.x + p.y * LIGHT.y + p.z * LIGHT.z;
        const tone = Math.max(0, Math.min(1, .5 - .5 * lit + (1 - p.z) * .20));
        const bin = Math.min(6, Math.floor(tone * 7));
        const target = buckets[1 + bin];
        const radius = FRONT_RADIUS[bin];
        target.moveTo(sx + radius, sy);
        target.arc(sx, sy, radius, 0, TAU);
      }
      ctx.fillStyle = ink(.075);
      ctx.fill(buckets[0]);
      for (let b = 0; b < 7; b += 1) {
        ctx.fillStyle = ink(FRONT_ALPHA[b]);
        ctx.fill(buckets[1 + b]);
      }

      // clean satellite outline
      ctx.strokeStyle = ink(.22);
      ctx.lineWidth = .85;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.stroke();

      // ---------- city beacons + BGP geodesic routes ----------
      const corePoint = rotateVector(coreVec.x, coreVec.y, coreVec.z, yaw, pitch);
      const coreScreen = { x: cx + corePoint.x * R, y: cy - corePoint.y * R, z: corePoint.z };
      const cityPoints = cityVecs.map((vec) => {
        const p = rotateVector(vec.x, vec.y, vec.z, yaw, pitch);
        return { x: cx + p.x * R, y: cy - p.y * R, z: p.z };
      });
      const activeRoute = state.locked && activeIndex >= 0 ? activeIndex : -1;

      const routes = cityPoints.map((point, i) => {
        const node = cityVecs[i];
        const dot = Math.max(-1, Math.min(1, coreVec.x * node.x + coreVec.y * node.y + coreVec.z * node.z));
        const angle = Math.acos(dot);
        const lift = .14 + .14 * (angle / Math.PI);
        const samples = [];
        for (let s = 0; s <= 40; s += 1) {
          const u = s / 40;
          const p = slerpPoint(coreVec, node, u);
          const alt = 1 + lift * Math.sin(Math.PI * u);
          const cam = rotateVector(p.x, p.y, p.z, yaw, pitch);
          samples.push({ x: cx + cam.x * R * alt, y: cy - cam.y * R * alt, z: cam.z, u });
        }
        return { samples, point, node, angle, lift };
      });

      function strokeRoute(route, active) {
        ctx.strokeStyle = ink(active ? .82 : .16);
        ctx.lineWidth = active ? 1.6 : .7;
        ctx.setLineDash(active ? [] : [3, 4]);
        ctx.beginPath();
        route.samples.forEach((p, s) => {
          if (s === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      routes.forEach((route, i) => {
        if (i !== activeRoute) strokeRoute(route, false);
      });
      if (activeRoute >= 0 && routes[activeRoute]) strokeRoute(routes[activeRoute], true);

      if (!reduced) {
        routes.forEach((route, i) => {
          const active = i === activeRoute;
          const speed = active ? .85 : .14;
          const head = (t * speed + i * .17 + .12) % 1;
          const tail = 14;
          for (let j = 0; j < tail; j += 1) {
            const u = head - j * .011;
            if (u < 0) continue;
            const p = slerpPoint(coreVec, cityVecs[i], u);
            const alt = 1 + route.lift * Math.sin(Math.PI * u);
            const cam = rotateVector(p.x, p.y, p.z, yaw, pitch);
            const px = cx + cam.x * R * alt;
            const py = cy - cam.y * R * alt;
            const fade = 1 - j / tail;
            ctx.fillStyle = ink(active ? .08 + .82 * fade : .03 + .14 * fade);
            ctx.beginPath();
            ctx.arc(px, py, active ? .35 + 1.75 * fade : .28 + .72 * fade, 0, TAU);
            ctx.fill();
          }
        });
      }

      // ---------- minimal Swiss bezel: 1.09R, 120 ticks, tangent cardinals ----------
      const ringR = R * 1.09;
      const ringAngle = -t * .02;
      ctx.strokeStyle = ink(.12);
      ctx.lineWidth = .6;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, TAU);
      ctx.stroke();

      const majorTicks = new Path2D();
      const microTicks = new Path2D();
      for (let i = 0; i < 120; i += 1) {
        const a = ringAngle + (i / 120) * TAU;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const major = i % 10 === 0;
        const len = major ? 8 : 3.2;
        const path = major ? majorTicks : microTicks;
        path.moveTo(cx + ca * ringR, cy + sa * ringR);
        path.lineTo(cx + ca * (ringR - len), cy + sa * (ringR - len));
      }
      ctx.lineWidth = .5;
      ctx.strokeStyle = ink(.12);
      ctx.stroke(microTicks);
      ctx.lineWidth = .85;
      ctx.strokeStyle = ink(.38);
      ctx.stroke(majorTicks);

      const labelRadius = ringR + 10;
      const occupiedBoxes = [];
      ctx.font = Math.max(8, Math.min(9.5, R * .042)) + 'px "Cormorant Garamond", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ['000°', '090°', '180°', '270°'].forEach((label, i) => {
        const a = ringAngle + (i / 4) * TAU - Math.PI / 2;
        const lx = cx + Math.cos(a) * labelRadius;
        const ly = cy + Math.sin(a) * labelRadius;
        const half = Math.max(10, ctx.measureText(label).width * .5 + 4);
        occupiedBoxes.push({ l: lx - half, r: lx + half, t: ly - half, b: ly + half });
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(a + Math.PI / 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(244, 243, 238, .92)';
        ctx.strokeText(label, 0, 0);
        ctx.fillStyle = ink(.46);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      });

      // ---------- beacons, lock reticle, short leader labels ----------
      const labelEntries = [
        { x: coreScreen.x, y: coreScreen.y, z: coreScreen.z, text: CORE.label, core: true, active: activeIndex < 0 }
      ];
      cityPoints.forEach((point, i) => {
        labelEntries.push({ x: point.x, y: point.y, z: point.z, text: CITIES[i].label, core: false, active: activeIndex === i });
      });

      labelEntries.forEach((entry) => {
        const front = entry.z > 0;
        const active = entry.active && state.locked;
        const beaconAlpha = front ? (active ? .9 : .58) : .16;
        const beaconRadius = entry.core ? (front ? 3.2 : 2.4) : (front ? 2.4 : 1.8);
        ctx.strokeStyle = ink(beaconAlpha);
        ctx.lineWidth = active ? 1 : .8;
        ctx.beginPath();
        ctx.arc(entry.x, entry.y, active ? 7.5 : 5.4, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = ink(beaconAlpha);
        ctx.beginPath();
        ctx.arc(entry.x, entry.y, beaconRadius, 0, TAU);
        ctx.fill();
      });

      function overlaps(a, b) {
        return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
      }

      const boxes = occupiedBoxes.slice();
      const labelOrder = labelEntries
        .map((entry, idx) => ({ entry, idx }))
        .sort((a, b) => {
          const rank = (item) => (state.locked && item.entry.active ? 0 : item.entry.core ? 1 : item.entry.z > 0 ? 2 : 3);
          return rank(a) - rank(b) || a.idx - b.idx;
        });
      ctx.font = '9px -apple-system, "SF Pro Text", sans-serif';
      const labelH = 10;
      labelOrder.forEach(({ entry, idx }) => {
        const front = entry.z > 0;
        const dx = entry.x - cx;
        const dy = entry.y - cy;
        const dist = Math.hypot(dx, dy);
        const ux = dist > 4 ? dx / dist : Math.cos((idx / 6) * TAU);
        const uy = dist > 4 ? dy / dist : Math.sin((idx / 6) * TAU);
        const textW = ctx.measureText(entry.text).width;
        const elbowX = entry.x + ux * 13;
        const elbowY = Math.max(9, Math.min(h - 9, entry.y + uy * 13));
        const preferred = ux >= 0 ? 1 : -1;
        let placed = false;
        for (const sign of [preferred, -preferred]) {
          for (let shoulder = 8; shoulder <= 260 && !placed; shoulder += 10) {
            const rawX = elbowX + sign * shoulder;
            const textX = sign > 0 ? rawX + 3 : rawX - 3;
            const box = sign > 0
              ? { l: textX, r: textX + textW, t: elbowY - labelH * .5, b: elbowY + labelH * .5 }
              : { l: textX - textW, r: textX, t: elbowY - labelH * .5, b: elbowY + labelH * .5 };
            if (box.l < 3 || box.r > w - 3 || box.t < 3 || box.b > h - 3) continue;
            if (boxes.some((other) => overlaps(box, other))) continue;
            ctx.strokeStyle = ink(front ? .24 : .1);
            ctx.lineWidth = .55;
            ctx.beginPath();
            ctx.moveTo(entry.x, entry.y);
            ctx.lineTo(elbowX, elbowY);
            ctx.lineTo(textX, elbowY);
            ctx.stroke();
            ctx.fillStyle = ink(front ? (state.locked && entry.active ? .82 : .62) : .22);
            ctx.textAlign = sign > 0 ? 'left' : 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(entry.text, textX, elbowY);
            boxes.push(box);
            placed = true;
          }
        }
        if (!placed) {
          const textY = 12 + (idx % 6) * 11;
          ctx.fillStyle = ink(front ? .48 : .2);
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(entry.text, 6, textY);
        }
      });

      let targetLockX = coreScreen.x;
      let targetLockY = coreScreen.y;
      if (activeIndex >= 0 && cityPoints[activeIndex]) {
        targetLockX = cityPoints[activeIndex].x;
        targetLockY = cityPoints[activeIndex].y;
      }
      state.targetLockX = targetLockX;
      state.targetLockY = targetLockY;

      const activeKey = state.locked ? (activeIndex < 0 ? 'core' : String(activeIndex)) : 'free';
      if (state.locked && state.lastLockKey !== activeKey) {
        state.lastLockKey = activeKey;
        state.rippleStart = t;
        state.rippleX = targetLockX;
        state.rippleY = targetLockY;
      } else if (!state.locked) {
        state.lastLockKey = 'free';
      }

      const rippleAge = t - state.rippleStart;
      if (state.locked && !reduced && rippleAge >= 0 && rippleAge < .65) {
        const progress = rippleAge / .65;
        ctx.strokeStyle = ink(.35 * (1 - progress));
        ctx.lineWidth = .85;
        ctx.beginPath();
        ctx.arc(state.rippleX, state.rippleY, 6 + 22 * progress, 0, TAU);
        ctx.stroke();
      }

      if (state.locked) {
        ctx.save();
        ctx.translate(state.lockX, state.lockY);
        ctx.rotate(-t * .35);
        ctx.strokeStyle = ink(.68);
        ctx.lineWidth = .9;
        ctx.beginPath();
        ctx.arc(0, 0, 12, -.61, .61);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 12, Math.PI - .61, Math.PI + .61);
        ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = ink(.68);
        ctx.lineWidth = .85;
        for (let k = 0; k < 4; k += 1) {
          const a = k * Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(state.lockX + Math.cos(a) * 6.5, state.lockY + Math.sin(a) * 6.5);
          ctx.lineTo(state.lockX + Math.cos(a) * 10.5, state.lockY + Math.sin(a) * 10.5);
          ctx.stroke();
        }
      }
    }

    function step(now) {
      state.frame = 0;
      if (!state.visible || motion.matches) return;
      const dt = state.lastTime ? Math.min(.05, Math.max(0, (now - state.lastTime) / 1000)) : 1 / 60;
      state.lastTime = now;
      state.time += dt;
      const alpha = 1 - Math.exp(-8 * dt);

      if (state.mode === 'locked') {
        state.yaw += (state.targetYaw - state.yaw) * alpha;
        state.pitch += (state.targetPitch - state.pitch) * alpha;
      } else if (state.mode === 'free') {
        const speed = Math.abs(state.spinYaw) + Math.abs(state.spinPitch);
        if (speed > .003) {
          state.yaw += state.spinYaw * dt;
          state.pitch = clampPitch(state.pitch + state.spinPitch * dt);
          state.spinYaw *= Math.exp(-3.1 * dt);
          state.spinPitch *= Math.exp(-3.1 * dt);
          state.targetYaw = state.yaw;
          state.targetPitch = state.pitch;
          state.idleSince = state.time;
        } else if (state.time - state.idleSince > 2.5) {
          state.mode = 'auto';
          state.spinYaw = 0;
          state.spinPitch = 0;
        }
      } else if (state.mode === 'auto') {
        state.yaw += .075 * dt;
        state.targetYaw = state.yaw;
        state.targetPitch = state.pitch;
      }

      state.tiltYaw += (state.targetTiltYaw - state.tiltYaw) * alpha;
      state.tiltPitch += (state.targetTiltPitch - state.tiltPitch) * alpha;
      const lockAlpha = 1 - Math.exp(-10 * dt);
      state.lockX += (state.targetLockX - state.lockX) * lockAlpha;
      state.lockY += (state.targetLockY - state.lockY) * lockAlpha;

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

    function targetFor(lat, lon) {
      return {
        yaw: state.yaw + shortestDelta(-lon * RAD),
        pitch: lat * RAD
      };
    }

    function setEntry(entry) {
      const key = entry && entry.dataset ? entry.dataset.node : 'core';
      let target;
      if (key === 'core' || !key) {
        state.active = 'core';
        target = targetFor(CORE_VIEW.lat, CORE_VIEW.lon);
      } else {
        const index = parseInt(key, 10) - 1;
        if (!Number.isFinite(index) || !CITIES[index]) return;
        state.active = index;
        target = targetFor(CITIES[index].lat, CITIES[index].lon);
      }
      state.locked = true;
      state.mode = 'locked';
      state.targetYaw = target.yaw;
      state.targetPitch = target.pitch;
      state.spinYaw = 0;
      state.spinPitch = 0;

      if (motion.matches) {
        state.yaw = state.targetYaw;
        state.pitch = state.targetPitch;
        draw();
        state.lockX = state.targetLockX;
        state.lockY = state.targetLockY;
        draw();
      } else {
        start();
      }
    }

    function onPointerDown(event) {
      if (!finePointer.matches || motion.matches || event.button !== 0) return;
      state.dragging = true;
      state.dragMoved = false;
      state.pointerId = event.pointerId;
      state.lastPX = event.clientX;
      state.lastPY = event.clientY;
      state.lastMoveAt = performance.now();
      state.spinYaw = 0;
      state.spinPitch = 0;
      state.targetTiltYaw = 0;
      state.targetTiltPitch = 0;
      try {
        wall.setPointerCapture(event.pointerId);
      } catch (error) {
        /* pointer capture is best-effort */
      }
      start();
    }

    function onPointerMove(event) {
      if (state.dragging && event.pointerId === state.pointerId) {
        const dx = event.clientX - state.lastPX;
        const dy = event.clientY - state.lastPY;
        const now = performance.now();
        const dt = Math.max(8, now - state.lastMoveAt) / 1000;
        state.lastPX = event.clientX;
        state.lastPY = event.clientY;
        state.lastMoveAt = now;
        if (!state.dragMoved && Math.hypot(dx, dy) > 1.5) {
          state.dragMoved = true;
          state.locked = false;
          state.mode = 'drag';
          wall.classList.add('is-dragging');
        }
        if (state.dragMoved) {
          state.yaw += dx * .0055;
          state.pitch = clampPitch(state.pitch + dy * .0045);
          state.targetYaw = state.yaw;
          state.targetPitch = state.pitch;
          state.spinYaw = Math.max(-8, Math.min(8, (dx * .0055) / dt));
          state.spinPitch = Math.max(-6, Math.min(6, (dy * .0045) / dt));
          start();
        }
        return;
      }
      if (!finePointer.matches || motion.matches) return;
      const rect = wall.getBoundingClientRect();
      const nx = clamp(((event.clientX - rect.left) / rect.width - .5) * 2, -1, 1);
      const ny = clamp(((event.clientY - rect.top) / rect.height - .5) * 2, -1, 1);
      state.targetTiltYaw = nx * .10;
      state.targetTiltPitch = -ny * .07;
      start();
    }

    function endDrag() {
      if (!state.dragging) return;
      state.dragging = false;
      wall.classList.remove('is-dragging');
      if (state.pointerId !== null) {
        try {
          wall.releasePointerCapture(state.pointerId);
        } catch (error) {
          /* pointer capture is best-effort */
        }
      }
      state.pointerId = null;
      if (state.dragMoved) {
        state.mode = 'free';
        state.locked = false;
        state.idleSince = state.time;
      } else {
        state.mode = 'locked';
        state.locked = true;
      }
      state.dragMoved = false;
    }

    wall.addEventListener('pointerdown', onPointerDown);
    wall.addEventListener('pointermove', onPointerMove, { passive: true });
    wall.addEventListener('pointerup', endDrag);
    wall.addEventListener('pointercancel', endDrag);
    wall.addEventListener('lostpointercapture', endDrag);
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
    if (motion.matches) draw();

    return {
      setEntry(entry) {
        setEntry(entry);
      },
      refresh() {
        if (motion.matches) {
          state.locked = true;
          state.mode = 'locked';
          state.yaw = state.targetYaw;
          state.pitch = state.targetPitch;
          stop();
          draw();
          return;
        }
        if (state.visible) start();
      },
      releaseLock() {
        state.locked = false;
        state.mode = 'free';
        state.idleSince = state.time;
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
