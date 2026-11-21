(() => {
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const paths = [...document.querySelectorAll('#home .sig')];
  const replay = document.getElementById('replay');
  const reveals = [...document.querySelectorAll('.reveal')];
  const chapters = [...document.querySelectorAll('main > .chapter[data-nav]')];
  const navLinks = [...document.querySelectorAll('.site-nav a')];
  const anchorLinks = [...document.querySelectorAll('a[href^="#"]')];
  const journey = document.querySelector('.journey');
  const journeyLabel = document.querySelector('.journey-label');
  const journeyProgress = document.querySelector('.journey-line i');
  let signatureAnimations = [];
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
     Signature replay (hero only)
     --------------------------------------------------------- */
  function playSignature() {
    signatureAnimations.forEach((animation) => animation.cancel());
    signatureAnimations = [];
    if (motion.matches) return;

    let delay = 160;
    paths.forEach((path) => {
      const length = path.getTotalLength();
      const tiny = length < 10;
      const duration = tiny ? 90 : Math.max(240, Math.min(1150, length * 2.65));
      signatureAnimations.push(path.animate(
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

  /* ---------------------------------------------------------
     Kinetic split backdrop. Split value is interpolated between
     the scroll anchors of the four acts (65 -> 40 -> 58 -> 36)
     with a damped lerp driven by requestAnimationFrame.
     --------------------------------------------------------- */
  const SPLIT_DAMPING = .12;
  let splitStops = [];
  let splitTarget = 65;
  let splitCurrent = 65;
  let splitFrame = 0;

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

  function stepSplit() {
    splitFrame = 0;
    const diff = splitTarget - splitCurrent;
    if (Math.abs(diff) < 0.008) {
      splitCurrent = splitTarget;
      applySplit(splitCurrent);
      return;
    }
    splitCurrent += diff * SPLIT_DAMPING;
    applySplit(splitCurrent);
    splitFrame = requestAnimationFrame(stepSplit);
  }

  function queueSplit(currentChapter) {
    if (motion.matches) {
      const direct = currentChapter ? parseFloat(currentChapter.dataset.split) : 65;
      splitTarget = Number.isFinite(direct) ? direct : 65;
      splitCurrent = splitTarget;
      applySplit(splitCurrent);
      return;
    }
    splitTarget = splitAtScroll(window.scrollY);
    if (!splitFrame) splitFrame = requestAnimationFrame(stepSplit);
  }

  /* ---------------------------------------------------------
     Works gallery — hover / click / focus selects the active work
     --------------------------------------------------------- */
  const works = document.getElementById('works');

  function setupWorks() {
    if (!works) return;
    const items = [...works.querySelectorAll('.work-item')];
    const plates = [...works.querySelectorAll('.plate-img')];
    const fig = document.getElementById('works-fig');
    const caption = document.getElementById('plate-caption');
    const panel = document.getElementById('work-active-panel');
    const descEl = document.getElementById('work-desc');
    const visitEl = document.getElementById('work-visit');
    const sourceEl = document.getElementById('work-source');
    if (!items.length) return;

    let currentKey = '';
    let panelTimer = 0;

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
      plates.forEach((img) => {
        const active = img.dataset.work === activeItem.dataset.work;
        img.classList.toggle('is-active', active);
        img.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
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
  }

  /* ---------------------------------------------------------
     Imprints — left index drives the white coordinate wall
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
      }, 150);
    };

    entries.forEach((entry) => {
      entry.addEventListener('mouseenter', () => showEntry(entry));
      entry.addEventListener('focus', () => showEntry(entry));
    });

    applyEntry(currentEntry);
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
     Scroll state: nav, journey, header tone, split backdrop
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
    queueSplit(current);
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
  replay?.addEventListener('click', playSignature);
  motion.addEventListener('change', () => {
    if (motion.matches) lenis?.stop();
    else lenis?.start();
    revealVisibleElements();
    playSignature();
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

  playSignature();
  update();

  if (lenis) {
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }
})();
