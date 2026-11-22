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
    if (!section || !wall || !canvas) return { setEntry() {}, refresh() {} };

    const ctx = canvas.getContext('2d');
    if (!ctx) return { setEntry() {}, refresh() {} };

    const NODES = [
      { label: '01', az: -0.9, el: 0.36 },
      { label: '02', az: 1.55, el: -0.12 },
      { label: '03', az: 3.05, el: 0.5 },
      { label: '04', az: -2.15, el: -0.4 },
      { label: '05', az: 0.65, el: -0.55 }
    ];
    const INK = '6, 6, 6';
    const TAU = Math.PI * 2;

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
      targetLockSize: 18,
      time: 0,
      frame: 0,
      visible: false,
      lastTime: 0,
      ready: false
    };

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
        state.lockY = h * .46;
      }
      state.ready = true;
      draw();
    }

    function rotatePoint(az, el, yaw, pitch) {
      const ce = Math.cos(el);
      const se = Math.sin(el);
      const x = Math.sin(az) * ce;
      const y = se;
      const z = Math.cos(az) * ce;
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      let xr = x * cy + z * sy;
      let zr = -x * sy + z * cy;
      const yr = y;
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const yp = yr * cp - zr * sp;
      const zp = yr * sp + zr * cp;
      return { x: xr, y: yp, z: zp };
    }

    function draw() {
      if (!state.ready) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w < 2 || h < 2) return;
      ctx.clearRect(0, 0, w, h);

      const cx = w * .5;
      const cy = h * .5;
      const R = Math.min(w * .4, h * .4);
      const yaw = state.yaw + state.tiltYaw;
      const pitch = state.pitch + state.tiltPitch;
      const reduced = motion.matches;
      const t = state.time;

      ctx.lineWidth = .75;
      ctx.lineCap = 'round';

      // --- sphere globe: 6 meridians, 5 parallels ---
      for (let m = 0; m < 6; m += 1) {
        const az = m * Math.PI / 6;
        let prev = null;
        for (let s = 0; s <= 38; s += 1) {
          const el = -Math.PI / 2 + (s / 38) * Math.PI;
          const p = rotatePoint(az, el, yaw, pitch);
          const depth = p.z;
          const alpha = depth > 0 ? .16 : .06;
          const pt = { x: cx + p.x * R, y: cy - p.y * R, z: depth };
          if (prev) {
            ctx.strokeStyle = 'rgba(' + INK + ', ' + alpha + ')';
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(pt.x, pt.y);
            ctx.stroke();
          }
          prev = pt;
        }
      }
      for (let p = 0; p < 5; p += 1) {
        const el = (-60 + p * 30) * Math.PI / 180;
        let prev = null;
        for (let s = 0; s <= 72; s += 1) {
          const az = (s / 72) * TAU;
          const pt3 = rotatePoint(az, el, yaw, pitch);
          const alpha = pt3.z > 0 ? .15 : .055;
          const pt = { x: cx + pt3.x * R, y: cy - pt3.y * R };
          if (prev) {
            ctx.strokeStyle = 'rgba(' + INK + ', ' + alpha + ')';
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(pt.x, pt.y);
            ctx.stroke();
          }
          prev = pt;
        }
      }

      // sphere silhouette
      ctx.strokeStyle = 'rgba(' + INK + ', .1)';
      ctx.lineWidth = .75;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.stroke();

      // --- astrolabe bezel: 72 ticks, slow opposite rotation ---
      const ringR = R * 1.1;
      const ringAngle = -t * .032;
      ctx.strokeStyle = 'rgba(' + INK + ', .1)';
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 72; i += 1) {
        const a = ringAngle + (i / 72) * TAU;
        const major = i % 6 === 0;
        const inner = ringR - (major ? 9 : 4);
        ctx.strokeStyle = 'rgba(' + INK + ', ' + (major ? .22 : .1) + ')';
        ctx.lineWidth = major ? .85 : .6;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * ringR, cy + Math.sin(a) * ringR);
        ctx.lineTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.stroke();
      }
      ctx.lineWidth = .75;
      ctx.fillStyle = 'rgba(' + INK + ', .38)';
      ctx.font = Math.max(6.5, Math.min(10, R * .05)) + 'px "Cormorant Garamond", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const labelGap = h < 240 ? 6 : 12;
      ['00', '90', '180', '270'].forEach((label, i) => {
        const a = ringAngle + (i / 4) * TAU - Math.PI / 2;
        ctx.fillText(label, cx + Math.cos(a) * (ringR + labelGap), cy + Math.sin(a) * (ringR + labelGap));
      });

      // --- core + routing nodes ---
      const core = { x: cx, y: cy, z: 1 };
      const nodePoints = NODES.map((node) => {
        const p = rotatePoint(node.az, node.el, yaw, pitch);
        return {
          label: node.label,
          x: cx + p.x * R,
          y: cy - p.y * R,
          z: p.z
        };
      });

      const activeIndex = state.active === 'core' ? -1 : state.active;
      nodePoints.forEach((node, i) => {
        const active = i === activeIndex;
        const midX = (core.x + node.x) * .5;
        const midY = (core.y + node.y) * .5;
        const dx = node.x - core.x;
        const dy = node.y - core.y;
        const len = Math.max(1, Math.hypot(dx, dy));
        const ctrlX = midX + (-dy / len) * R * .26;
        const ctrlY = midY + (dx / len) * R * .26;

        ctx.strokeStyle = 'rgba(' + INK + ', ' + (active ? .42 : .1) + ')';
        ctx.lineWidth = active ? 1.15 : .75;
        ctx.beginPath();
        ctx.moveTo(core.x, core.y);
        ctx.quadraticCurveTo(ctrlX, ctrlY, node.x, node.y);
        ctx.stroke();

        if (!reduced) {
          const speed = active ? .34 : .17;
          const pulseT = ((t * speed) + i * .17) % 1;
          const one = 1 - pulseT;
          const px = one * one * core.x + 2 * one * pulseT * ctrlX + pulseT * pulseT * node.x;
          const py = one * one * core.y + 2 * one * pulseT * ctrlY + pulseT * pulseT * node.y;
          ctx.fillStyle = 'rgba(' + INK + ', ' + (active ? .72 : .32) + ')';
          ctx.beginPath();
          ctx.arc(px, py, active ? 1.9 : 1.25, 0, TAU);
          ctx.fill();
        }

        ctx.strokeStyle = 'rgba(' + INK + ', ' + (node.z > 0 ? (active ? .62 : .34) : .16) + ')';
        ctx.lineWidth = active ? 1.1 : .8;
        ctx.beginPath();
        ctx.arc(node.x, node.y, active ? 3.4 : 2.4, 0, TAU);
        ctx.stroke();

        ctx.fillStyle = 'rgba(' + INK + ', ' + (node.z > 0 ? .62 : .22) + ')';
        if (node.z > 0) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, active ? 1.6 : 1.1, 0, TAU);
          ctx.fill();
        }
        ctx.font = Math.max(7, Math.min(9.5, R * .048)) + 'px -apple-system, "SF Pro Text", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(node.label, node.x + 6, node.y - 5);
      });

      // core mark
      ctx.fillStyle = 'rgba(' + INK + ', .62)';
      ctx.beginPath();
      ctx.arc(core.x, core.y, 2.2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(' + INK + ', .22)';
      ctx.lineWidth = .75;
      ctx.beginPath();
      ctx.arc(core.x, core.y, 7, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = 'rgba(' + INK + ', .42)';
      ctx.font = Math.max(6.5, Math.min(8.5, R * .038)) + 'px -apple-system, "SF Pro Text", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AS218834', core.x, core.y + 18);

      // --- mechanical lock brackets ---
      let targetX = core.x;
      let targetY = core.y;
      if (activeIndex >= 0 && nodePoints[activeIndex]) {
        targetX = nodePoints[activeIndex].x;
        targetY = nodePoints[activeIndex].y;
      }
      state.targetLockX = targetX;
      state.targetLockY = targetY;
      state.targetLockSize = activeIndex >= 0 ? 15 : 19;
      const s = state.lockSize;
      ctx.strokeStyle = 'rgba(' + INK + ', .58)';
      ctx.lineWidth = .85;
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      corners.forEach(([sx, sy]) => {
        const x = state.lockX + sx * s;
        const y = state.lockY + sy * s;
        ctx.beginPath();
        ctx.moveTo(x + sx * -s * .46, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + sy * -s * .46);
        ctx.stroke();
      });
      ctx.strokeStyle = 'rgba(' + INK + ', .32)';
      ctx.lineWidth = .7;
      ctx.beginPath();
      ctx.moveTo(state.lockX - 2.5, state.lockY);
      ctx.lineTo(state.lockX + 2.5, state.lockY);
      ctx.moveTo(state.lockX, state.lockY - 2.5);
      ctx.lineTo(state.lockX, state.lockY + 2.5);
      ctx.stroke();
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
          state.targetYaw = -NODES[index].az;
          state.targetPitch = NODES[index].el - .12;
          state.targetLockSize = 15;
        }
      }
      state.lockSize = Math.max(state.lockSize, state.targetLockSize + 14);
      if (motion.matches) {
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
      releaseLock();
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
