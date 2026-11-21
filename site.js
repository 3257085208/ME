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
        const t = (y - a.top) / span;
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
    if (!items.length) return;

    let currentKey = '';
    let panelTimer = 0;
    let prevPlate = null;
    let prevTimer = 0;

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
        targetX = nx * 8;
        targetY = ny * 8;
        startPlate();
      });

      plateStack.addEventListener('pointerleave', () => {
        targetX = 0;
        targetY = 0;
        startPlate();
      });
    }
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
    const roleEl = document.getElementById('imprint-wall-role');
    const noteEl = document.getElementById('imprint-wall-note');
    if (!entries.length || !wall || !nameEl) return;

    let currentEntry = entries[0];
    let swapTimer = 0;

    const applyEntry = (entry) => {
      if (ghost) ghost.textContent = entry.dataset.wallNum || '';
      nameEl.textContent = entry.dataset.wallName || '';
      if (roleEl) roleEl.textContent = entry.dataset.wallRole || '';
      if (noteEl) noteEl.textContent = entry.dataset.wallNote || '';
    };

    const showEntry = (entry) => {
      if (!entry || entry === currentEntry) return;
      currentEntry = entry;
      if (motion.matches) {
        applyEntry(entry);
        return;
      }
      clearTimeout(swapTimer);
      wall.classList.add('is-swapping');
      swapTimer = window.setTimeout(() => {
        applyEntry(entry);
        wall.classList.remove('is-swapping');
      }, 180);
    };

    entries.forEach((entry) => {
      entry.addEventListener('mouseenter', () => showEntry(entry));
      entry.addEventListener('focus', () => showEntry(entry));
    });

    applyEntry(currentEntry);
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
      pointerX = event.clientX;
      pointerY = event.clientY;
      cursorTargetX = event.clientX;
      cursorTargetY = event.clientY;
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
     Boot
     --------------------------------------------------------- */
  measureSplitStops();
  splitCurrent = splitAtScroll(window.scrollY);
  splitTarget = splitCurrent;
  applySplit(splitCurrent);

  setupWorks();
  setupImprints();

  playHeroSignature();
  update();

  if (lenis) {
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }
})();
