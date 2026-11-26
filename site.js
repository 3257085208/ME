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
  const preloader = document.getElementById('preloader');
  const preloaderCount = document.getElementById('preloaderCount');
  const preloaderBar = document.getElementById('preloaderBar');
  const navAccent = document.querySelector('.nav-accent');
  const splitBackdrop = document.querySelector('.split-backdrop');
  const splitLight = document.querySelector('.split-backdrop-light');
  const manifestoLines = [...document.querySelectorAll('[data-manifesto-line]')];
  const manifestoProgress = document.querySelector('[data-manifesto-progress]');
  const manifestoNeedle = document.getElementById('manifestoNeedle');
  const manifestoContent = document.querySelector('.manifesto-content');
  const manifestoCapabilities = [...document.querySelectorAll('.manifesto-capabilities .capability')];
  const manifestoRulerTicks = [...document.querySelectorAll('.manifesto-ruler-tick')];
  const topoEntries = [...document.querySelectorAll('[data-topo]')].map((el) => ({
    el,
    key: el.dataset.topoTarget || el.dataset.topo,
    lastTransform: ''
  }));
  const workCards = [...document.querySelectorAll('.work-card')];
  const workVeils = [...document.querySelectorAll('.work-card-veil')];
  const aboutClock = document.getElementById('about-clock');
  const orbitCoords = document.getElementById('orbitCoords');
  const orbitDragHint = document.getElementById('orbitDragHint');
  const inertiaElements = [...document.querySelectorAll('.act-imprints .imprint-groups, .act-about .about-copy')];
  let heroAnimations = [];
  let aboutAnimations = [];
  let astrolabe = null;
  let scheduled = false;
  let scrollAnimation = 0;
  let anchorScrollUntil = 0;
  let currentNav = '';

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const easeOutCubic = (value) => 1 - Math.pow(1 - clamp(value), 3);
  const easeOutQuint = (value) => 1 - Math.pow(1 - clamp(value), 5);
  const smoothstep = (value) => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  const seg = (value, start, end) => smoothstep((value - start) / Math.max(1e-6, end - start));
  const lenis = window.Lenis && !motion.matches && finePointer.matches && desktop.matches ? new window.Lenis({
    lerp: .078,
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 1,
    touchMultiplier: 1,
    autoRaf: false
  }) : null;

  const layout = {
    innerHeight: 0,
    scrollHeight: 0,
    maxScroll: 1,
    heroHeight: 0,
    heroTop: 0,
    heroBottom: 0,
    aboutTop: 0,
    imprintTop: 0,
    imprintWallTop: 0,
    imprintWallLeft: 0,
    imprintWallWidth: 1,
    imprintWallHeight: 1,
    chapters: [],
    byNav: {},
    workSlots: [],
    manifestoRulerTravel: 0,
    acts: [],
    reveals: []
  };
  let lastManifestoPercent = '';
  let lastManifestoP = null;
  let lastRulerState = '';
  let manifestoY = [24, 24, 24];
  let manifestoOpacities = [.16, .16, .16];
  let manifestoSkew = 0;
  let manifestoSkewApplied = 0;
  let manifestoSkewLast = 0;
  let lastWorkValues = [];
  let lastSplitAlpha = -1;
  let clockTimer = 0;
  let measureTimer = 0;
  let lastJourneyLabel = '';
  let lastJourneyProgress = -1;
  let lastHeaderTone = '';
  let lastJourneyAtHome = '';
  let lastNavAccent = '';
  let lastAboutShift = null;
  let lastGhostShift = null;

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

  function setupPreloader() {
    if (!preloader) return false;
    let seen = false;
    let last = 0;
    try {
      seen = sessionStorage.getItem('qqsg-preloader-seen') === '1';
      last = Number(sessionStorage.getItem('qqsg-preloader-at') || 0);
      sessionStorage.setItem('qqsg-preloader-seen', '1');
      sessionStorage.setItem('qqsg-preloader-at', String(Date.now()));
    } catch (error) {}
    const quickRefresh = last > 0 && Date.now() - last < 2500;
    if (motion.matches || seen || quickRefresh) {
      preloader.style.display = 'none';
      preloader.setAttribute('aria-hidden', 'true');
      return false;
    }

    document.documentElement.classList.add('preloader-running');
    preloader.classList.add('is-playing');
    lenis?.stop();
    preloader.setAttribute('aria-hidden', 'false');
    let lifted = false;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (!lifted) {
        lifted = true;
        playHeroSignature();
      }
      preloader.classList.remove('is-playing');
      preloader.style.display = 'none';
      preloader.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('preloader-running');
      lenis?.start();
    };
    const lift = () => {
      if (lifted) return;
      lifted = true;
      playHeroSignature();
      preloader.classList.add('is-lifting');
      window.setTimeout(finish, 730);
    };
    window.setTimeout(lift, 740);
    window.setTimeout(finish, 1800);

    if (preloaderCount) preloaderCount.textContent = '000';
    if (preloaderBar) preloaderBar.style.transform = 'scaleX(0)';
    const started = performance.now();
    const duration = 650;
    const counter = (now) => {
      const progress = clamp((now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      if (preloaderCount) preloaderCount.textContent = String(Math.round(eased * 100)).padStart(3, '0');
      if (preloaderBar) preloaderBar.style.transform = 'scaleX(' + eased.toFixed(4) + ')';
      if (progress < 1) requestAnimationFrame(counter);
    };
    requestAnimationFrame(counter);
    return true;
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

  function measureLayout() {
    const scrollY = window.scrollY;
    layout.innerHeight = window.innerHeight;
    layout.scrollHeight = document.documentElement.scrollHeight;
    layout.maxScroll = Math.max(1, layout.scrollHeight - layout.innerHeight);

    const heroRect = hero ? hero.getBoundingClientRect() : null;
    layout.heroHeight = heroRect ? heroRect.height : layout.innerHeight;
    layout.heroTop = heroRect ? heroRect.top + scrollY : 0;
    layout.heroBottom = heroRect ? layout.heroTop + heroRect.height : layout.innerHeight;

    layout.chapters = chapters.map((chapter) => {
      const rect = chapter.getBoundingClientRect();
      return {
        el: chapter,
        top: rect.top + scrollY,
        height: rect.height,
        split: parseFloat(chapter.dataset.split),
        nav: chapter.dataset.nav || '',
        tone: chapter.dataset.tone || 'dark',
        label: chapter.dataset.label || 'Introduction'
      };
    });

    layout.byNav = {};
    layout.chapters.forEach((chapter) => {
      layout.byNav[chapter.nav] = chapter;
    });

    layout.navRects = navLinks.map((link) => {
      const rect = link.getBoundingClientRect();
      return { left: rect.left, top: rect.bottom, width: rect.width };
    });

    const worksChapter = layout.byNav.works;
    if (worksChapter && workCards.length) {
      const cardHeight = layout.innerHeight - 130;
      const worksTop = worksChapter.top;
      layout.workSlots = workCards.map((card, index) => ({
        top: worksTop + 76 + index * (cardHeight + 160),
        height: cardHeight
      }));
    } else {
      layout.workSlots = [];
    }

    layout.acts = acts.map((act) => {
      const rect = act.getBoundingClientRect();
      return { el: act, top: rect.top + scrollY, height: rect.height };
    });

    layout.reveals = reveals.map((el) => {
      const rect = el.getBoundingClientRect();
      return { el, top: rect.top + scrollY, height: rect.height };
    });

    const imprintSection = document.getElementById('imprints');
    layout.imprintTop = imprintSection ? imprintSection.getBoundingClientRect().top + scrollY : 0;
    if (imprintWall) {
      const wallRect = imprintWall.getBoundingClientRect();
      layout.imprintWallTop = wallRect.top + scrollY;
      layout.imprintWallLeft = wallRect.left;
      layout.imprintWallWidth = wallRect.width;
      layout.imprintWallHeight = wallRect.height;
    } else {
      layout.imprintWallTop = layout.imprintTop;
    }
    layout.aboutTop = aboutSection ? aboutSection.getBoundingClientRect().top + scrollY : 0;

    splitStops = layout.chapters
      .map((chapter) => ({ top: chapter.top, split: chapter.split }))
      .filter((stop) => Number.isFinite(stop.split));

    const rulerRail = manifestoNeedle ? manifestoNeedle.parentElement : null;
    layout.manifestoRulerTravel = rulerRail ? Math.max(0, rulerRail.getBoundingClientRect().height) : 0;
    lastManifestoP = null;
    lastRulerState = '';
    lastWorkValues = [];
    lastNavAccent = '';

    updateNavAccent();
  }

  function scheduleMeasure() {
    if (measureTimer) clearTimeout(measureTimer);
    measureTimer = setTimeout(() => {
      measureTimer = 0;
      measureLayout();
      if (lenis) updateScrollInertia(performance.now());
      schedule();
    }, 120);
  }

  function revealActs(scrollY) {
    const y = typeof scrollY === 'number' ? scrollY : window.scrollY;
    const nearBottom = y + layout.innerHeight >= layout.scrollHeight - 40;
    layout.acts.forEach((act) => {
      if (act.el.classList.contains('is-inview')) return;
      if (nearBottom || act.top - y < layout.innerHeight * .82) markActInView(act.el);
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
    if (splitLight) splitLight.style.transform = 'translate3d(' + value.toFixed(3) + '%, 0, 0)';
  }

  function advanceSplit(now) {
    const time = typeof now === 'number' ? now : performance.now();
    const dt = splitLastTime ? Math.min(.05, Math.max(0, (time - splitLastTime) / 1000)) : 1 / 60;
    splitLastTime = time;

    const diff = splitTarget - splitCurrent;
    if (Math.abs(diff) < 0.008) {
      if (splitCurrent !== splitTarget) {
        splitCurrent = splitTarget;
        applySplit(splitCurrent);
      }
      splitLastTime = 0;
      return;
    }

    const alpha = 1 - Math.exp(-SPLIT_RATE * dt);
    splitCurrent += diff * alpha;
    applySplit(splitCurrent);
  }

  function stepSplitFrame(now) {
    splitFrame = 0;
    advanceSplit(now);
    if (Math.abs(splitTarget - splitCurrent) >= .008) {
      splitFrame = requestAnimationFrame(stepSplitFrame);
    }
  }

  function queueSplit(currentChapter, scrollY) {
    if (motion.matches) {
      if (splitFrame) cancelAnimationFrame(splitFrame);
      splitFrame = 0;
      const direct = currentChapter ? currentChapter.split : 65;
      splitTarget = Number.isFinite(direct) ? direct : 65;
      splitCurrent = splitTarget;
      splitLastTime = 0;
      applySplit(splitCurrent);
      return;
    }
    splitTarget = splitAtScroll(typeof scrollY === 'number' ? scrollY : window.scrollY);
    if (!lenis && !splitFrame) {
      splitLastTime = 0;
      splitFrame = requestAnimationFrame(stepSplitFrame);
    }
  }

  /* ---------------------------------------------------------
     Works gallery — darkroom shutter, fixed index, tactile panel
     --------------------------------------------------------- */
  const works = document.getElementById('works');

  function setupWorks() {
    // Sticky work cards are scrubbed from cached slot geometry in updateScrollScrub().
  }

  /* ---------------------------------------------------------
     Magnetic editorial links — fine pointers only, ±6px
     --------------------------------------------------------- */
  function setupMagneticLinks() {
    const links = [...document.querySelectorAll('.work-card-actions a, .work-card-actions button, .about-links a')];
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
     Interactive card demos — event-driven, no scroll rAF/BCR
     --------------------------------------------------------- */
  function setupReplicaModal() {
    const modal = document.getElementById('replicaModal');
    const stage = document.getElementById('replicaStage');
    const loading = document.getElementById('replicaLoading');
    const domainEl = document.getElementById('replicaDomain');
    const openSite = document.getElementById('replicaOpenSite');
    const closeButton = document.getElementById('replicaClose');
    const tabs = [...document.querySelectorAll('[data-replica-tab]')];
    const openers = [...document.querySelectorAll('[data-replica-open]')];
    if (!modal || !stage || !domainEl || !openSite || !closeButton) return;

    const replicas = {
      lowendcloud: {
        domain: 'LOWEND.CLOUD · LIVE PREVIEW',
        src: 'https://lowend.cloud',
        live: 'https://lowend.cloud',
        title: 'LowEndCloud live site preview'
      },
      '1kbpage': {
        domain: '1KB.PAGE · LIVE PREVIEW',
        src: 'https://1kb.page',
        live: 'https://1kb.page',
        title: '1Kb.Page live site preview'
      },
      blog: {
        domain: 'NIEKAIXIANG.COM · LIVE PREVIEW',
        src: 'https://www.niekaixiang.com',
        live: 'https://www.niekaixiang.com',
        title: '聶.NET live site preview'
      },
      sla: {
        domain: 'SLA.NIEKAIXIANG.COM · LIVE PREVIEW',
        src: 'https://sla.niekaixiang.com',
        live: 'https://sla.niekaixiang.com',
        title: 'NIE-SLA live site preview'
      }
    };
    let activeReplica = '';
    let frame = null;
    let lastFocus = null;
    let inertTargets = [];
    let loadingTimer = 0;

    function clearLoadingTimer() {
      if (!loadingTimer) return;
      clearTimeout(loadingTimer);
      loadingTimer = 0;
    }

    function showLoading() {
      if (!loading) return;
      clearLoadingTimer();
      loading.classList.remove('is-hidden');
      loadingTimer = window.setTimeout(() => {
        loadingTimer = 0;
        loading.classList.add('is-hidden');
      }, 4500);
    }

    function syncChrome(id) {
      const item = replicas[id];
      if (!item) return;
      tabs.forEach((tab) => {
        const active = tab.dataset.replicaTab === id;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      domainEl.textContent = item.domain;
      openSite.href = item.live;
      openSite.setAttribute('aria-label', '打开 ' + item.live + ' 原站');
      modal.setAttribute('aria-label', item.domain);
    }

    function loadReplica(id) {
      const item = replicas[id];
      if (!item) return;
      activeReplica = id;
      syncChrome(id);
      showLoading();
      if (!frame) {
        frame = document.createElement('iframe');
        frame.className = 'replica-frame';
        frame.setAttribute('title', item.title);
        frame.setAttribute('loading', 'eager');
        frame.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
        frame.setAttribute('allow', 'fullscreen; clipboard-write');
        frame.addEventListener('load', () => {
          clearLoadingTimer();
          if (loading) loading.classList.add('is-hidden');
          try {
            const doc = frame.contentDocument;
            if (doc) {
              doc.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') closeReplica();
              });
            }
          } catch (error) {}
        });
        frame.src = item.src;
        stage.appendChild(frame);
      } else {
        frame.setAttribute('title', item.title);
        frame.src = item.src;
      }
    }

    function openReplica(id) {
      if (!replicas[id]) return;
      if (!modal.classList.contains('is-open')) {
        lastFocus = document.activeElement;
        inertTargets = [document.querySelector('main'), document.querySelector('.site-header'), document.querySelector('.journey')].filter(Boolean);
        inertTargets.forEach((el) => { el.inert = true; });
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.add('replica-open');
        clearCursor();
        lenis?.stop();
        closeButton.focus({ preventScroll: true });
      }
      loadReplica(id);
    }

    function closeReplica() {
      if (!modal.classList.contains('is-open')) return;
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('replica-open');
      inertTargets.forEach((el) => { el.inert = false; });
      inertTargets = [];
      clearLoadingTimer();
      if (frame) {
        frame.src = 'about:blank';
        frame.remove();
        frame = null;
      }
      if (loading) loading.classList.remove('is-hidden');
      activeReplica = '';
      lenis?.start();
      if (lastFocus && typeof lastFocus.focus === 'function') {
        lastFocus.focus({ preventScroll: true });
      }
      lastFocus = null;
      if (pointerX >= 0 && finePointer.matches && !motion.matches) {
        const nextTarget = document.elementFromPoint(pointerX, pointerY);
        setCursorMode(nextTarget, pointerX, pointerY);
        startCursor();
      }
    }

    openers.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        openReplica(button.dataset.replicaOpen);
      });
    });

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        if (activeReplica === tab.dataset.replicaTab) return;
        loadReplica(tab.dataset.replicaTab);
      });
    });

    closeButton.addEventListener('click', closeReplica);
    modal.addEventListener('click', (event) => {
      if (event.target === modal || (event.target.closest && event.target.closest('[data-replica-close]'))) closeReplica();
    });

    document.addEventListener('keydown', (event) => {
      if (!modal.classList.contains('is-open')) return;
      if (event.key === 'Escape') {
        closeReplica();
        return;
      }
      if (event.key === 'Tab') {
        const focusable = [...modal.querySelectorAll('button:not([disabled]), a[href]')].filter((el) => el.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  }


  /* ---------------------------------------------------------
     Selected Archive — filterable ledger + hover preview only
     --------------------------------------------------------- */
  function setupArchive() {
    const archive = document.getElementById('work-archive');
    if (!archive) return;
    const rows = [...archive.querySelectorAll('.archive-row')];
    const filters = [...archive.querySelectorAll('.archive-filter')];
    const preview = document.getElementById('archivePreview');
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const sources = [...new Set(rows.map((row) => row.dataset.preview).filter(Boolean))];
    const previewImages = new Map();
    let previewMounted = false;
    let previewFrame = 0;
    let previewVisible = false;
    let activeRow = null;
    let shownScrollY = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    function mountPreviewImages() {
      if (previewMounted || !preview) return;
      previewMounted = true;
      sources.forEach((src) => {
        const img = document.createElement('img');
        img.decoding = 'async';
        img.alt = '';
        img.dataset.previewSrc = src;
        img.src = src;
        preview.appendChild(img);
        previewImages.set(src, img);
        if (typeof img.decode === 'function') img.decode().catch(() => {});
      });
    }

    if ('IntersectionObserver' in window && preview) {
      const archiveObserver = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        mountPreviewImages();
        archiveObserver.disconnect();
      }, { rootMargin: '600px 0px' });
      archiveObserver.observe(archive);
    } else {
      mountPreviewImages();
    }

    function hidePreview() {
      previewVisible = false;
      activeRow = null;
      if (previewFrame) cancelAnimationFrame(previewFrame);
      previewFrame = 0;
      if (preview) {
        preview.classList.remove('is-visible');
        preview.setAttribute('aria-hidden', 'true');
      }
    }

    function pointFor(event) {
      let x = event.clientX + 20;
      let y = event.clientY - 90;
      if (x + 260 > innerWidth - 12) x = event.clientX - 280;
      x = Math.max(12, Math.min(x, innerWidth - 272));
      y = Math.max(12, Math.min(y, innerHeight - 186));
      return { x, y };
    }

    function previewStep() {
      previewFrame = 0;
      if (!previewVisible || !preview) return;
      currentX += (targetX - currentX) * .22;
      currentY += (targetY - currentY) * .22;
      preview.style.transform = 'translate3d(' + currentX.toFixed(2) + 'px, ' + currentY.toFixed(2) + 'px, 0)';
      if (previewVisible) previewFrame = requestAnimationFrame(previewStep);
    }

    function showPreview(row, event) {
      if (!preview || !fine.matches || motion.matches || !row.dataset.preview) return;
      mountPreviewImages();
      const src = row.dataset.preview;
      previewImages.forEach((img, key) => {
        img.classList.toggle('is-active', key === src);
      });
      const point = pointFor(event);
      activeRow = row;
      shownScrollY = window.scrollY;
      if (!previewVisible) {
        currentX = point.x;
        currentY = point.y;
        preview.style.transform = 'translate3d(' + currentX.toFixed(2) + 'px, ' + currentY.toFixed(2) + 'px, 0)';
      }
      targetX = point.x;
      targetY = point.y;
      previewVisible = true;
      preview.classList.add('is-visible');
      preview.setAttribute('aria-hidden', 'false');
      if (!previewFrame) previewFrame = requestAnimationFrame(previewStep);
    }

    function applyFilter(value) {
      filters.forEach((button) => {
        const active = button.dataset.filter === value;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      rows.forEach((row) => {
        row.hidden = value !== 'all' && row.dataset.category !== value;
      });
      hidePreview();
      measureLayout();
      update(window.scrollY);
    }

    filters.forEach((button) => {
      button.addEventListener('click', () => applyFilter(button.dataset.filter || 'all'));
    });

    rows.forEach((row) => {
      row.addEventListener('pointerenter', (event) => {
        if (!fine.matches || motion.matches || row.hidden) return;
        showPreview(row, event);
      }, { passive: true });
    });

    archive.addEventListener('pointermove', (event) => {
      if (!fine.matches || motion.matches) return;
      const row = event.target.closest ? event.target.closest('.archive-row') : null;
      if (!row || row.hidden || !row.dataset.preview) {
        if (previewVisible) hidePreview();
        return;
      }
      if (row !== activeRow || !previewVisible) showPreview(row, event);
      const point = pointFor(event);
      targetX = point.x;
      targetY = point.y;
    }, { passive: true });

    archive.addEventListener('pointerleave', hidePreview);
    window.addEventListener('scroll', () => {
      if (!previewVisible) return;
      if (Math.abs(window.scrollY - shownScrollY) > 20) hidePreview();
    }, { passive: true });
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
    let activeGroup = 'apac';
    const groupData = {
      apac: { name: 'Asia-Pacific', ghost: 'AP', note: '05 LOCATIONS — ASIA-PACIFIC · BGP IPv4 / IPv6', lat: 18, lon: 112 },
      eu: { name: 'Europe', ghost: 'EU', note: '04 LOCATIONS — EUROPE · BGP IPv4 / IPv6', lat: 50, lon: 11 },
      na: { name: 'North America', ghost: 'NA', note: '06 LOCATIONS — NORTH AMERICA · BGP IPv4 / IPv6', lat: 42, lon: -100 }
    };
    const groupTabs = [...imprints.querySelectorAll('[data-continent-tab]')];
    const groupSections = [...imprints.querySelectorAll('.imprint-group')];
    const cityButtons = [...imprints.querySelectorAll('[data-city-node]')];

    const syncLocked = (node) => {
      entries.forEach((entry) => {
        entry.classList.toggle('is-locked', Boolean(node) && entry.dataset.node === node);
      });
      groupTabs.forEach((tab) => {
        const active = tab.dataset.continentTab === activeGroup;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      cityButtons.forEach((button) => {
        const active = Boolean(node) && button.dataset.cityNode === node;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    };

    const syncGroupSections = () => {
      groupSections.forEach((group) => {
        const active = group.dataset.continent === activeGroup;
        group.hidden = !active;
        group.classList.toggle('is-active', active);
      });
    };

    const applyEntry = (entry, decode = false) => {
      if (ghost) ghost.textContent = entry.dataset.wallNum || '';
      if (noteEl) noteEl.textContent = entry.dataset.wallNote || '';
      if (decode) scrambleText(nameEl, entry.dataset.wallName || '');
      else nameEl.textContent = entry.dataset.wallName || '';
    };

    const showGroup = (key, drive = false) => {
      const group = groupData[key];
      if (!group) return;
      activeGroup = key;
      currentEntry = null;
      syncGroupSections();
      syncLocked('');
      if (!drive) return;
      astrolabe?.setView(group.lat, group.lon);
      if (ghost) ghost.textContent = group.ghost;
      if (noteEl) noteEl.textContent = group.note;
      if (nameEl) nameEl.textContent = group.name;
    };

    const showEntry = (entry, force = false) => {
      if (!entry) return;
      if (!force && entry === currentEntry) return;
      currentEntry = entry;
      const group = entry.closest ? entry.closest('.imprint-group') : null;
      if (group && group.dataset.continent) {
        activeGroup = group.dataset.continent;
        syncGroupSections();
      }
      syncLocked(entry.dataset.node);
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

    syncGroupSections();
    syncLocked('core');
    window.addEventListener('nkx:astrolabe-lock', (event) => {
      syncLocked(event.detail ? event.detail.node : '');
    });

    groupTabs.forEach((tab) => {
      tab.addEventListener('click', () => showGroup(tab.dataset.continentTab, true));
    });

    entries.forEach((entry) => {
      entry.addEventListener('mouseenter', () => showEntry(entry, entry.dataset.node === 'core'));
      entry.addEventListener('focus', () => showEntry(entry, entry.dataset.node === 'core'));
      entry.addEventListener('click', () => showEntry(entry, true));
    });

    cityButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const entry = entries.find((item) => item.dataset.node === button.dataset.cityNode);
        if (entry) showEntry(entry, true);
      });
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
    if (!section || !wall || !canvas) return { setEntry() {}, refresh() {}, releaseLock() {}, setView() {} };

    const ctx = canvas.getContext('2d');
    if (!ctx) return { setEntry() {}, refresh() {}, releaseLock() {}, setView() {} };

    const TAU = Math.PI * 2;
    const RAD = Math.PI / 180;
    const INK = '11, 11, 10';
    const inkCache = {};
    const ink = (alpha) => {
      const key = Math.max(0, Math.min(100, Math.round(alpha * 100)));
      return inkCache[key] || (inkCache[key] = 'rgba(' + INK + ', ' + (alpha).toFixed(3) + ')');
    };

    const CORE = { lat: 39.90, lon: 116.40, label: 'AS218834' };
    const CORE_VIEW = { lat: 24, lon: 120 };
    const CITIES = [
      { lat: 39.90, lon: 116.40, label: 'PEK · BEIJING', code: 'PEK' },
      { lat: 31.23, lon: 121.47, label: 'SHA · SHANGHAI', code: 'SHA' },
      { lat: 22.32, lon: 114.17, label: 'HKG · HONG KONG', code: 'HKG' },
      { lat: 35.68, lon: 139.65, label: 'TYO · TOKYO', code: 'TYO' },
      { lat: 1.35, lon: 103.82, label: 'SIN · SINGAPORE', code: 'SIN' },
      { lat: 50.11, lon: 8.68, label: 'FRA · FRANKFURT', code: 'FRA' },
      { lat: 50.69, lon: 3.17, label: 'RBX · ROUBAIX', code: 'RBX' },
      { lat: 50.99, lon: 2.13, label: 'GRA · GRAVELINES', code: 'GRA' },
      { lat: 45.07, lon: 7.69, label: 'TRN · TURIN', code: 'TRN' },
      { lat: 34.05, lon: -118.24, label: 'LAX · LOS ANGELES', code: 'LAX' },
      { lat: 37.55, lon: -121.99, label: 'FMT · FREMONT', code: 'FMT' },
      { lat: 45.59, lon: -121.18, label: 'PDX · OREGON', code: 'PDX' },
      { lat: 33.45, lon: -112.07, label: 'PHX · PHOENIX', code: 'PHX' },
      { lat: 40.71, lon: -74.01, label: 'NYC · NEW YORK', code: 'NYC' },
      { lat: 45.32, lon: -73.87, label: 'BHS · BEAUHARNOIS', code: 'BHS' }
    ];
    const DEGREE_LABELS = ['000°', '090°', '180°', '270°'];
    const CITY_FONT = '9.5px "JetBrains Mono", ui-monospace, monospace';
    const ARC_STEPS = 40;

    function toVector(latDeg, lonDeg) {
      const lat = latDeg * RAD;
      const lon = lonDeg * RAD;
      const ce = Math.cos(lat);
      return { x: ce * Math.sin(lon), y: Math.sin(lat), z: ce * Math.cos(lon) };
    }

    const coreVec = toVector(CORE.lat, CORE.lon);
    const cityVecs = CITIES.map((city) => toVector(city.lat, city.lon));
    const pairAngles = CITIES.map(() => new Float32Array(15));
    const meshArcs = CITIES.map(() => new Array(15));
    for (let a = 0; a < 15; a += 1) {
      for (let b = 0; b < 15; b += 1) {
        const dot = Math.max(-1, Math.min(1, cityVecs[a].x * cityVecs[b].x + cityVecs[a].y * cityVecs[b].y + cityVecs[a].z * cityVecs[b].z));
        const omega = Math.acos(dot);
        pairAngles[a][b] = omega;
        const arc = new Float32Array(ARC_STEPS * 3);
        const so = Math.sin(omega) || 1e-6;
        for (let s = 0; s < ARC_STEPS; s += 1) {
          const u = s / (ARC_STEPS - 1);
          const wa = omega < 1e-5 ? 1 - u : Math.sin((1 - u) * omega) / so;
          const wb = omega < 1e-5 ? u : Math.sin(u * omega) / so;
          const alt = 1.012 + .042 * Math.sin(Math.PI * u);
          arc[s * 3] = (cityVecs[a].x * wa + cityVecs[b].x * wb) * alt;
          arc[s * 3 + 1] = (cityVecs[a].y * wa + cityVecs[b].y * wb) * alt;
          arc[s * 3 + 2] = (cityVecs[a].z * wa + cityVecs[b].z * wb) * alt;
        }
        meshArcs[a][b] = arc;
      }
    }

    const gridLines = [];
    const pushGrid = (points, primary) => {
      const flat = new Float32Array(points.length * 3);
      for (let i = 0; i < points.length; i += 1) {
        const v = toVector(points[i][1], points[i][0]);
        flat[i * 3] = v.x;
        flat[i * 3 + 1] = v.y;
        flat[i * 3 + 2] = v.z;
      }
      gridLines.push({ pts: flat, count: points.length, primary });
    };
    [-60, -30, 0, 30, 60].forEach((lat) => {
      const line = [];
      for (let lon = -180; lon <= 180; lon += 4) line.push([lon, lat]);
      pushGrid(line, lat === 0);
    });
    for (let lon = -180; lon < 180; lon += 30) {
      const line = [];
      for (let lat = -90; lat <= 90; lat += 4) line.push([lon, lat]);
      pushGrid(line, lon === 0);
    }

    function decodeCoastlines(payload) {
      if (!payload || !Array.isArray(payload.lines)) return [];
      const q = payload.q || 100;
      const out = [];
      payload.lines.forEach((flat) => {
        const count = flat.length >> 1;
        if (count < 2) return;
        const arr = new Float32Array(count * 3);
        for (let i = 0; i < count; i += 1) {
          const v = toVector(flat[i * 2 + 1] / q, flat[i * 2] / q);
          arr[i * 3] = v.x;
          arr[i * 3 + 1] = v.y;
          arr[i * 3 + 2] = v.z;
        }
        out.push({ pts: arr, count });
      });
      return out;
    }

    const coastlines = decodeCoastlines(window.__QQSG_COASTLINES__);
    const FLOW_COUNT = 18;
    const flows = Array.from({ length: FLOW_COUNT }, () => ({
      phase: 2,
      src: 0,
      dst: 1,
      start: 0,
      duration: 1,
      fadeAt: 0,
      screen: new Float32Array(ARC_STEPS * 2),
      depth: new Float32Array(ARC_STEPS)
    }));
    const pulses = Array.from({ length: 30 }, () => ({ active: false, city: 0, start: 0, focus: false }));
    const staticFlow = {
      src: 2,
      dst: 5,
      screen: new Float32Array(ARC_STEPS * 2),
      depth: new Float32Array(ARC_STEPS)
    };
    const staticPairs = [[2, 5], [5, 13], [9, 3], [0, 4], [7, 14]];
    let pulseCursor = 0;
    let emitCursor = 0;
    const emitNext = new Float32Array(15);
    for (let i = 0; i < 15; i += 1) emitNext[i] = .08 + Math.random() * .88;
    const emittedOnce = new Uint8Array(15);
    const meshStats = { emits: new Uint16Array(15), total: 0, active: 0, focus: 0 };
    window.__QQSG_MESH_STATS__ = meshStats;

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
      sphereGradient: null,
      width: 0,
      height: 0,
      radius: 0,
      dpr: 1,
      labelWidths: [],
      degreeWidths: [],
      labelFont: CITY_FONT,
      degreeFont: '',
      dragging: false,
      dragMoved: false,
      pointerId: null,
      startPX: 0,
      startPY: 0,
      lastPX: 0,
      lastPY: 0,
      lastMoveAt: 0,
      spinYaw: 0,
      spinPitch: 0,
      idleSince: 0,
      cyaw: 1,
      syaw: 0,
      cp: 1,
      sp: 0
    };

    function cityFocus() {
      return state.locked && typeof state.active === 'number' ? state.active : -1;
    }

    function randomOther(src) {
      const value = Math.floor(Math.random() * 14);
      return value >= src ? value + 1 : value;
    }

    function addPulse(city, now, focus) {
      const pulse = pulses[pulseCursor % pulses.length];
      pulseCursor += 1;
      pulse.active = true;
      pulse.city = city;
      pulse.start = now;
      pulse.focus = focus;
    }

    function spawnFlow(flow, src, dst, now) {
      if (!flow || src === dst) return;
      const focus = cityFocus();
      flow.phase = 0;
      flow.src = src;
      flow.dst = dst;
      flow.start = now;
      flow.duration = 1.35 + (pairAngles[src][dst] / Math.PI) * 1.55 + Math.random() * .25;
      flow.fadeAt = 0;
      meshStats.emits[src] += 1;
      meshStats.total += 1;
      addPulse(src, now, focus >= 0 && (src === focus || dst === focus));
    }

    function findIdleFlow() {
      for (let i = 0; i < flows.length; i += 1) if (flows[i].phase === 2) return flows[i];
      return null;
    }

    function countFocusFlows(focus) {
      if (focus < 0) return 0;
      let count = 0;
      for (let i = 0; i < flows.length; i += 1) {
        const flow = flows[i];
        if (flow.phase !== 2 && (flow.src === focus || flow.dst === focus)) count += 1;
      }
      return count;
    }

    function activateFocusFlows(now) {
      const focus = cityFocus();
      if (focus < 0) return;
      let count = countFocusFlows(focus);
      while (count < 3) {
        let flow = findIdleFlow();
        if (!flow) {
          for (let i = 0; i < flows.length; i += 1) {
            const candidate = flows[i];
            if (candidate.phase !== 2 && candidate.src !== focus && candidate.dst !== focus) {
              candidate.phase = 2;
              flow = candidate;
              break;
            }
          }
        }
        if (!flow) break;
        const other = randomOther(focus);
        const fromFocus = count % 2 === 0;
        spawnFlow(flow, fromFocus ? focus : other, fromFocus ? other : focus, now);
        count += 1;
      }
    }

    function updateMesh(now) {
      const focus = cityFocus();
      const limit = desktop.matches ? 18 : 11;
      let activeCount = 0;
      for (let i = 0; i < flows.length; i += 1) {
        const flow = flows[i];
        if (flow.phase === 1 && now - flow.fadeAt > .45) {
          flow.phase = 2;
          continue;
        }
        if (flow.phase === 0) {
          const elapsed = (now - flow.start) / flow.duration;
          if (elapsed >= 1) {
            flow.phase = 1;
            flow.fadeAt = now;
            addPulse(flow.dst, now, focus >= 0 && (flow.src === focus || flow.dst === focus));
          }
        }
        if (flow.phase !== 2) activeCount += 1;
      }

      activateFocusFlows(now);
      let focusCount = countFocusFlows(focus);
      activeCount = flows.reduce((count, flow) => count + (flow.phase !== 2 ? 1 : 0), 0);

      for (let pass = 0; pass < 2; pass += 1) {
        for (let step = 0; step < 15; step += 1) {
          const i = (emitCursor + step) % 15;
          if (now < emitNext[i]) continue;
          if (pass === 0 ? emittedOnce[i] !== 0 : emittedOnce[i] === 0) continue;
          if (activeCount >= limit) continue;
          if (i === focus && focusCount >= 3) continue;
          const flow = findIdleFlow();
          if (!flow) continue;
          let dst = randomOther(i);
          if (focus >= 0 && dst === focus && focusCount >= 4) {
            dst = randomOther(focus);
            if (dst === i) dst = (dst + 1) % 15;
          }
          spawnFlow(flow, i, dst, now);
          emittedOnce[i] = 1;
          emitNext[i] = now + .75 + Math.random() * .9;
          emitCursor = (i + 1) % 15;
          activeCount += 1;
          if (focus >= 0 && (i === focus || dst === focus)) focusCount += 1;
        }
      }

      meshStats.active = activeCount;
      meshStats.focus = countFocusFlows(focus);
    }

    function updateOrbitHud(activeIndex) {
      if (!orbitCoords) return;
      let lat;
      let lon;
      if (state.locked) {
        if (activeIndex >= 0) {
          lat = CITIES[activeIndex].lat;
          lon = CITIES[activeIndex].lon;
        } else {
          lat = CORE.lat;
          lon = CORE.lon;
        }
      } else {
        lat = (state.pitch + state.tiltPitch) / RAD;
        lon = -(state.yaw + state.tiltYaw) / RAD;
        lon = ((lon + 540) % 360) - 180;
      }
      const ns = lat >= 0 ? 'N' : 'S';
      const ew = lon >= 0 ? 'E' : 'W';
      const text = Math.abs(lat).toFixed(2) + '°' + ns + ' · ' + Math.abs(lon).toFixed(2) + '°' + ew;
      if (orbitCoords.textContent !== text) orbitCoords.textContent = text;
    }

    function emitOrbitLock() {
      const node = state.locked ? (state.active === 'core' ? 'core' : String(state.active + 1)) : '';
      if (lastOrbitLock === node) return;
      lastOrbitLock = node;
      window.dispatchEvent(new CustomEvent('nkx:astrolabe-lock', { detail: { node } }));
    }

    function cacheTextMetrics(R) {
      ctx.font = CITY_FONT;
      state.labelFont = CITY_FONT;
      state.labelWidths = [CORE.label, ...CITIES.map((city) => city.label)].map((text) => ctx.measureText(text).width);
      const degreeFont = Math.max(8, Math.min(10, R * .042)) + 'px "JetBrains Mono", ui-monospace, monospace';
      ctx.font = degreeFont;
      state.degreeFont = degreeFont;
      state.degreeWidths = DEGREE_LABELS.map((label) => ctx.measureText(label).width);
    }

    function sphereRadius(w, h) {
      return Math.min(w * .42, h * .45, (Math.min(w, h) * .5 - 22) / 1.09);
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const R = sphereRadius(w, h);
      const cx = w * .5;
      const cy = h * .5;
      state.width = w;
      state.height = h;
      state.radius = R;
      state.dpr = dpr;
      const sphereGradient = ctx.createRadialGradient(cx - R * .12, cy - R * .15, R * .04, cx, cy, R * 1.02);
      sphereGradient.addColorStop(0, 'rgba(255, 255, 255, .35)');
      sphereGradient.addColorStop(.6, 'rgba(255, 255, 255, .12)');
      sphereGradient.addColorStop(1, 'rgba(11, 11, 10, .045)');
      state.sphereGradient = sphereGradient;
      cacheTextMetrics(R);
      state.ready = true;
      draw();
    }

    function paintArc(flow, head, fade, focus, comet, now) {
      const arc = meshArcs[flow.src] ? meshArcs[flow.src][flow.dst] : null;
      if (!arc) return;
      const count = Math.max(2, Math.min(ARC_STEPS, Math.ceil(head * (ARC_STEPS - 1)) + 1));
      for (let s = 0; s < count; s += 1) {
        const b = s * 3;
        const vx = arc[b];
        const vy = arc[b + 1];
        const vz = arc[b + 2];
        const x1 = vx * state.cyaw + vz * state.syaw;
        const z1 = -vx * state.syaw + vz * state.cyaw;
        const y1 = vy * state.cp - z1 * state.sp;
        const z2 = vy * state.sp + z1 * state.cp;
        flow.screen[s * 2] = state.width * .5 + x1 * state.radius;
        flow.screen[s * 2 + 1] = state.height * .5 - y1 * state.radius;
        flow.depth[s] = z2;
      }
      ctx.globalAlpha = fade;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let pen = false;
      for (let s = 0; s < count - 1; s += 1) {
        if ((flow.depth[s] + flow.depth[s + 1]) * .5 >= 0) {
          pen = false;
          continue;
        }
        if (!pen) ctx.moveTo(flow.screen[s * 2], flow.screen[s * 2 + 1]);
        ctx.lineTo(flow.screen[(s + 1) * 2], flow.screen[(s + 1) * 2 + 1]);
        pen = true;
      }
      ctx.strokeStyle = focus ? 'rgba(134, 186, 0, .14)' : 'rgba(11, 11, 10, .10)';
      ctx.lineWidth = .55;
      ctx.stroke();
      ctx.beginPath();
      pen = false;
      for (let s = 0; s < count - 1; s += 1) {
        if ((flow.depth[s] + flow.depth[s + 1]) * .5 < 0) {
          pen = false;
          continue;
        }
        if (!pen) ctx.moveTo(flow.screen[s * 2], flow.screen[s * 2 + 1]);
        ctx.lineTo(flow.screen[(s + 1) * 2], flow.screen[(s + 1) * 2 + 1]);
        pen = true;
      }
      if (focus) {
        ctx.strokeStyle = 'rgba(11, 11, 10, .48)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(134, 186, 0, .88)';
        ctx.lineWidth = .75;
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(11, 11, 10, .30)';
        ctx.lineWidth = .85;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      if (comet) {
        const focusCity = cityFocus();
        const isFocus = focusCity >= 0 && (flow.src === focusCity || flow.dst === focusCity);
        for (let j = 12; j >= 0; j -= 1) {
          const u = head - j * .024;
          if (u < 0) continue;
          const f = Math.min(ARC_STEPS - 1, u * (ARC_STEPS - 1));
          const si = Math.min(ARC_STEPS - 2, Math.floor(f));
          const fr = f - si;
          const ax = arc[si * 3] + (arc[(si + 1) * 3] - arc[si * 3]) * fr;
          const ay = arc[si * 3 + 1] + (arc[(si + 1) * 3 + 1] - arc[si * 3 + 1]) * fr;
          const az = arc[si * 3 + 2] + (arc[(si + 1) * 3 + 2] - arc[si * 3 + 2]) * fr;
          const x1 = ax * state.cyaw + az * state.syaw;
          const z1 = -ax * state.syaw + az * state.cyaw;
          const y1 = ay * state.cp - z1 * state.sp;
          const z2 = ay * state.sp + z1 * state.cp;
          const px = state.width * .5 + x1 * state.radius;
          const py = state.height * .5 - y1 * state.radius;
          const detached = z2 < 0;
          const fade = Math.pow(1 - j / 13, 1.55);
          const alpha = detached ? fade * .22 : fade;
          if (j === 0) {
            if (isFocus) {
              ctx.fillStyle = isFocus ? '#0b0b0a' : ink(.95);
              ctx.beginPath();
              ctx.arc(px, py, detached ? 2.1 : 3.2, 0, TAU);
              ctx.fill();
              ctx.fillStyle = detached ? 'rgba(200, 255, 0, .26)' : '#c8ff00';
              ctx.beginPath();
              ctx.arc(px, py, detached ? 1.1 : 2, 0, TAU);
              ctx.fill();
            } else {
              ctx.fillStyle = ink(detached ? .22 : .95);
              ctx.beginPath();
              ctx.arc(px, py, detached ? 1.3 : 2.3, 0, TAU);
              ctx.fill();
              ctx.fillStyle = detached ? 'rgba(200, 255, 0, .26)' : '#c8ff00';
              ctx.beginPath();
              ctx.arc(px, py, detached ? .55 : 1.05, 0, TAU);
              ctx.fill();
            }
          } else {
            ctx.fillStyle = isFocus
              ? 'rgba(134, 186, 0, ' + (alpha * .78).toFixed(3) + ')'
              : ink(detached ? alpha * .16 : alpha * .52);
            ctx.beginPath();
            ctx.arc(px, py, Math.max(.45, (isFocus ? 1.15 : 1.3) * fade), 0, TAU);
            ctx.fill();
          }
        }
      }
    }

    function draw() {
      if (!state.ready) return;
      const w = state.width;
      const h = state.height;
      if (w < 2 || h < 2) return;
      ctx.clearRect(0, 0, w, h);
      const cx = w * .5;
      const cy = h * .5;
      const R = state.radius;
      const yaw = state.yaw + state.tiltYaw;
      const pitch = state.pitch + state.tiltPitch;
      const cyaw = Math.cos(yaw);
      const syaw = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      state.cyaw = cyaw;
      state.syaw = syaw;
      state.cp = cp;
      state.sp = sp;
      const t = state.time;
      const reduced = motion.matches;
      const activeIndex = state.active === 'core' ? -1 : state.active;
      updateOrbitHud(activeIndex);
      emitOrbitLock();

      if (state.sphereGradient) {
        ctx.fillStyle = state.sphereGradient;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, TAU);
        ctx.fill();
      }

      const gridBack = new Path2D();
      const gridFront = new Path2D();
      const gridBackPrime = new Path2D();
      const gridFrontPrime = new Path2D();
      gridLines.forEach((line) => {
        let penBack = false;
        let penFront = false;
        for (let i = 0; i < line.count; i += 1) {
          const b = i * 3;
          const vx = line.pts[b];
          const vy = line.pts[b + 1];
          const vz = line.pts[b + 2];
          const x1 = vx * cyaw + vz * syaw;
          const z1 = -vx * syaw + vz * cyaw;
          const y1 = vy * cp - z1 * sp;
          const z2 = vy * sp + z1 * cp;
          const px = cx + x1 * R;
          const py = cy - y1 * R;
          if (z2 < 0) {
            const path = line.primary ? gridBackPrime : gridBack;
            if (!penBack) path.moveTo(px, py);
            else path.lineTo(px, py);
            penBack = true;
            penFront = false;
          } else {
            const path = line.primary ? gridFrontPrime : gridFront;
            if (!penFront) path.moveTo(px, py);
            else path.lineTo(px, py);
            penFront = true;
            penBack = false;
          }
        }
      });
      const coastBack = new Path2D();
      const coastFront = new Path2D();
      coastlines.forEach((line) => {
        let penBack = false;
        let penFront = false;
        for (let i = 0; i < line.count; i += 1) {
          const b = i * 3;
          const vx = line.pts[b];
          const vy = line.pts[b + 1];
          const vz = line.pts[b + 2];
          const x1 = vx * cyaw + vz * syaw;
          const z1 = -vx * syaw + vz * cyaw;
          const y1 = vy * cp - z1 * sp;
          const z2 = vy * sp + z1 * cp;
          const px = cx + x1 * R;
          const py = cy - y1 * R;
          if (z2 < 0) {
            if (!penBack) coastBack.moveTo(px, py);
            else coastBack.lineTo(px, py);
            penBack = true;
            penFront = false;
          } else {
            if (!penFront) coastFront.moveTo(px, py);
            else coastFront.lineTo(px, py);
            penFront = true;
            penBack = false;
          }
        }
      });

      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = ink(.06);
      ctx.lineWidth = .55;
      ctx.stroke(gridBack);
      ctx.strokeStyle = ink(.095);
      ctx.lineWidth = .6;
      ctx.stroke(coastBack);
      ctx.strokeStyle = ink(.08);
      ctx.lineWidth = .55;
      ctx.stroke(gridBackPrime);
      ctx.strokeStyle = ink(.16);
      ctx.lineWidth = .65;
      ctx.stroke(gridFront);
      ctx.strokeStyle = ink(.34);
      ctx.lineWidth = .85;
      ctx.stroke(gridFrontPrime);
      ctx.strokeStyle = ink(.62);
      ctx.lineWidth = 1;
      ctx.stroke(coastFront);
      ctx.strokeStyle = ink(.52);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.stroke();

      if (reduced) {
        staticPairs.forEach((pair) => {
          staticFlow.src = pair[0];
          staticFlow.dst = pair[1];
          const focus = activeIndex >= 0 && (pair[0] === activeIndex || pair[1] === activeIndex);
          paintArc(staticFlow, 1, 1, focus, false, t);
        });
      } else {
        for (let i = 0; i < flows.length; i += 1) {
          const flow = flows[i];
          if (flow.phase === 2) continue;
          const progress = flow.phase === 1 ? 1 : Math.min(1, (t - flow.start) / flow.duration);
          const fade = flow.phase === 1 ? Math.max(0, 1 - (t - flow.fadeAt) / .45) : 1;
          const focus = activeIndex >= 0 && (flow.src === activeIndex || flow.dst === activeIndex);
          paintArc(flow, progress, fade, focus, flow.phase === 0, t);
        }
      }

      const cityScreen = cityVecs.map((vec) => {
        const x1 = vec.x * cyaw + vec.z * syaw;
        const z1 = -vec.x * syaw + vec.z * cyaw;
        const y1 = vec.y * cp - z1 * sp;
        const z2 = vec.y * sp + z1 * cp;
        return { x: cx + x1 * R, y: cy - y1 * R, z: z2 };
      });

      for (let i = 0; i < pulses.length; i += 1) {
        const pulse = pulses[i];
        if (!pulse.active) continue;
        const age = t - pulse.start;
        if (age < 0 || age > .55) {
          pulse.active = false;
          continue;
        }
        const point = cityScreen[pulse.city];
        const p = age / .55;
        const radius = 3 + 10 * p;
        const alpha = (1 - p) * (point.z < 0 ? .2 : 1);
        if (pulse.focus) {
          ctx.strokeStyle = 'rgba(11, 11, 10, ' + (alpha * .7).toFixed(3) + ')';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(point.x, point.y, radius, 0, TAU);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(200, 255, 0, ' + (alpha * .9).toFixed(3) + ')';
          ctx.lineWidth = .8;
          ctx.beginPath();
          ctx.arc(point.x, point.y, radius * .72, 0, TAU);
          ctx.stroke();
        } else {
          ctx.strokeStyle = ink(alpha * .55);
          ctx.lineWidth = .75;
          ctx.beginPath();
          ctx.arc(point.x, point.y, radius, 0, TAU);
          ctx.stroke();
        }
      }

      cityScreen.forEach((point, i) => {
        const front = point.z > 0;
        const active = state.locked && activeIndex === i;
        if (active) {
          const breathe = (Math.sin(t * 2.15) + 1) * .5;
          ctx.strokeStyle = 'rgba(200, 255, 0, .24)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 8.5 + breathe * 2.2, 0, TAU);
          ctx.stroke();
          ctx.strokeStyle = '#0b0b0a';
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 5.2, 0, TAU);
          ctx.stroke();
          ctx.fillStyle = '#c8ff00';
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2.4, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#0b0b0a';
          ctx.beginPath();
          ctx.arc(point.x, point.y, .8, 0, TAU);
          ctx.fill();
        } else if (front) {
          ctx.strokeStyle = 'rgba(11, 11, 10, .26)';
          ctx.lineWidth = .65;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 4.5, 0, TAU);
          ctx.stroke();
          ctx.fillStyle = '#0b0b0a';
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2.1, 0, TAU);
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(11, 11, 10, .14)';
          ctx.beginPath();
          ctx.arc(point.x, point.y, 1.3, 0, TAU);
          ctx.fill();
        }
      });

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

      const boxes = [];
      const labelRadius = ringR + 10;
      ctx.font = state.degreeFont;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      DEGREE_LABELS.forEach((label, i) => {
        const a = ringAngle + (i / 4) * TAU - Math.PI / 2;
        const lx = cx + Math.cos(a) * labelRadius;
        const ly = cy + Math.sin(a) * labelRadius;
        const half = Math.max(10, state.degreeWidths[i] * .5 + 4);
        boxes.push({ l: lx - half, r: lx + half, t: ly - half, b: ly + half });
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(a + Math.PI / 2);
        ctx.lineWidth = 2.6;
        ctx.strokeStyle = 'rgba(242, 241, 234, .92)';
        ctx.strokeText(label, 0, 0);
        ctx.fillStyle = ink(.5);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      });

      const focusIndex = state.locked && activeIndex >= 0 ? activeIndex : -1;
      const coreHubs = [0, 2, 5, 9, 13];
      const candidateIndices = focusIndex >= 0
        ? [focusIndex, ...coreHubs.filter((index) => index !== focusIndex).slice(0, 4)]
        : coreHubs.slice(0, 5);
      const labelEntries = [];
      candidateIndices.forEach((index) => {
        const point = cityScreen[index];
        if (!point) return;
        const active = state.locked && index === focusIndex;
        if (point.z <= 0 && !active) return;
        labelEntries.push({ point, index, active });
      });
      labelEntries.forEach((entry) => {
        if (!entry.active) {
          boxes.push({
            l: entry.point.x - 9,
            r: entry.point.x + 9,
            t: entry.point.y - 9,
            b: entry.point.y + 9
          });
        }
      });
      cityScreen.forEach((point) => {
        if (point.z > 0) boxes.push({ l: point.x - 9, r: point.x + 9, t: point.y - 9, b: point.y + 9 });
      });

      const labelOrder = labelEntries.sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0) || b.point.z - a.point.z || a.index - b.index);
      const placedAnchors = [];
      const labelH = 14;
      function capsulePath(x, y, cw, ch, radius) {
        const r = Math.min(radius, ch * .5, cw * .5);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + cw - r, y);
        ctx.quadraticCurveTo(x + cw, y, x + cw, y + r);
        ctx.lineTo(x + cw, y + ch - r);
        ctx.quadraticCurveTo(x + cw, y + ch, x + cw - r, y + ch);
        ctx.lineTo(x + r, y + ch);
        ctx.quadraticCurveTo(x, y + ch, x, y + ch - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      }
      labelOrder.forEach((entry) => {
        if (!entry.active && placedAnchors.some((anchor) => Math.hypot(entry.point.x - anchor.x, entry.point.y - anchor.y) < 36)) return;
        const dx = entry.point.x - cx;
        const dy = entry.point.y - cy;
        const dist = Math.hypot(dx, dy);
        const ux = dist > 4 ? dx / dist : 1;
        const uy = dist > 4 ? dy / dist : 0;
        const text = CITIES[entry.index].label;
        const textW = state.labelWidths[entry.index + 1];
        const elbowX = entry.point.x + ux * 13;
        const elbowY = Math.max(9, Math.min(h - 9, entry.point.y + uy * 13));
        const preferred = ux >= 0 ? 1 : -1;
        let placed = false;
        for (const sign of [preferred, -preferred]) {
          for (let shoulder = 8; shoulder <= 280 && !placed; shoulder += 10) {
            const rawX = elbowX + sign * shoulder;
            const textX = sign > 0 ? rawX + 3 : rawX - 3;
            const box = sign > 0
              ? { l: textX - 5, r: textX + textW + 5, t: elbowY - 7, b: elbowY + 7 }
              : { l: textX - textW - 5, r: textX + 5, t: elbowY - 7, b: elbowY + 7 };
            if (box.l < 3 || box.r > w - 3 || box.t < 3 || box.b > h - 3) continue;
            if (boxes.some((other) => box.l < other.r && box.r > other.l && box.t < other.b && box.b > other.t)) continue;
            const lineEndX = sign > 0 ? box.l : box.r;
            ctx.strokeStyle = entry.active ? 'rgba(200, 255, 0, .75)' : 'rgba(11, 11, 10, .3)';
            ctx.lineWidth = entry.active ? 1 : .65;
            ctx.beginPath();
            ctx.moveTo(entry.point.x, entry.point.y);
            ctx.lineTo(elbowX, elbowY);
            ctx.lineTo(lineEndX, elbowY);
            ctx.stroke();
            ctx.textAlign = sign > 0 ? 'left' : 'right';
            ctx.textBaseline = 'middle';
            ctx.font = state.labelFont;
            capsulePath(box.l, box.t, box.r - box.l, labelH, 3);
            ctx.fillStyle = entry.active ? '#0e0e0d' : 'rgba(242, 241, 234, .90)';
            ctx.fill();
            ctx.strokeStyle = entry.active ? 'rgba(200, 255, 0, .65)' : 'rgba(11, 11, 10, .24)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = entry.active ? '#c8ff00' : '#0b0b0a';
            ctx.fillText(text, textX, elbowY);
            boxes.push(box);
            placedAnchors.push({ x: entry.point.x, y: entry.point.y });
            placed = true;
          }
        }
      });

      if (state.locked && activeIndex >= 0) {
        const point = cityScreen[activeIndex];
        state.lockX = state.lockX || point.x;
        state.lockY = state.lockY || point.y;
        const targetX = point.x;
        const targetY = point.y;
        state.targetLockX = targetX;
        state.targetLockY = targetY;
        const lock = 1 - Math.exp(-12 * .016);
        state.lockX += (targetX - state.lockX) * lock;
        state.lockY += (targetY - state.lockY) * lock;
        const rippleAge = t - state.rippleStart;
        if (rippleAge < .65) {
          const p = Math.max(0, rippleAge / .65);
          ctx.strokeStyle = 'rgba(200, 255, 0, ' + (.9 * (1 - p)).toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(targetX, targetY, 4 + 14 * p, 0, TAU);
          ctx.stroke();
        }
        ctx.save();
        ctx.translate(state.lockX, state.lockY);
        ctx.rotate(-t * .42);
        ctx.strokeStyle = '#0b0b0a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 12.5, -.62, .62);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 12.5, Math.PI - .62, Math.PI + .62);
        ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = '#c8ff00';
        ctx.lineWidth = 1;
        for (let k = 0; k < 4; k += 1) {
          const a = k * Math.PI / 2 + t * .42;
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
          state.pitch = Math.max(-1.26, Math.min(1.26, state.pitch + state.spinPitch * dt));
          state.spinYaw *= Math.exp(-2.2 * dt);
          state.spinPitch *= Math.exp(-2.2 * dt);
          state.targetYaw = state.yaw;
          state.targetPitch = state.pitch;
        }
        if (state.time - state.idleSince > 2.5) {
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
      updateMesh(state.time);
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
      let delta = (-lon * RAD - state.yaw) % TAU;
      if (delta > Math.PI) delta -= TAU;
      if (delta < -Math.PI) delta += TAU;
      return { yaw: state.yaw + delta, pitch: lat * RAD };
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
      state.rippleStart = state.time;
      if (motion.matches) {
        state.yaw = state.targetYaw;
        state.pitch = state.targetPitch;
        draw();
      } else {
        start();
      }
    }

    function setView(lat, lon) {
      state.active = 'core';
      state.locked = false;
      state.mode = 'locked';
      state.targetYaw = targetFor(lat, lon).yaw;
      state.targetPitch = Math.max(-1.26, Math.min(1.26, lat * RAD));
      state.spinYaw = 0;
      state.spinPitch = 0;
      if (motion.matches) {
        state.yaw = state.targetYaw;
        state.pitch = state.targetPitch;
        draw();
      } else {
        start();
      }
    }

    function onPointerDown(event) {
      if (motion.matches || event.button !== 0) return;
      if (!finePointer.matches && event.pointerType !== 'touch') return;
      if (event.target.closest && event.target.closest('.imprint-cities, .imprint-node, .imprint-links, .imprint-asn, .orbit-hud')) return;
      if (event.pointerType !== 'touch') event.preventDefault();
      state.dragging = true;
      state.dragMoved = false;
      state.pointerId = event.pointerId;
      state.startPX = event.clientX;
      state.startPY = event.clientY;
      state.lastPX = event.clientX;
      state.lastPY = event.clientY;
      state.lastMoveAt = performance.now();
      state.spinYaw = 0;
      state.spinPitch = 0;
      state.targetTiltYaw = 0;
      state.targetTiltPitch = 0;
      if (event.pointerType !== 'touch') {
        try { wall.setPointerCapture(event.pointerId); } catch (error) {}
      }
      start();
    }

    function onPointerMove(event) {
      if (state.dragging && event.pointerId === state.pointerId) {
        const dx = event.clientX - state.lastPX;
        const dy = event.clientY - state.lastPY;
        const totalX = event.clientX - state.startPX;
        const totalY = event.clientY - state.startPY;
        const now = performance.now();
        const dt = Math.max(8, now - state.lastMoveAt) / 1000;
        const isTouch = event.pointerType === 'touch';
        if (!state.dragMoved && isTouch) {
          if (Math.abs(totalY) > Math.abs(totalX) && Math.abs(totalY) > 5) {
            state.dragging = false;
            state.pointerId = null;
            return;
          }
          if (Math.abs(totalX) < 4 || Math.abs(totalX) <= Math.abs(totalY)) return;
        }
        if (!state.dragMoved) {
          const threshold = isTouch ? 4 : 2;
          if (Math.hypot(totalX, totalY) < threshold) return;
          state.dragMoved = true;
          state.locked = false;
          state.mode = 'drag';
          wall.classList.add('is-dragging');
          if (orbitDragHint) orbitDragHint.textContent = 'ORBITING';
          if (isTouch) {
            try { wall.setPointerCapture(event.pointerId); } catch (error) {}
          }
        }
        state.lastPX = event.clientX;
        state.lastPY = event.clientY;
        state.lastMoveAt = now;
        if (state.dragMoved) {
          state.yaw += dx * .0085;
          state.pitch = Math.max(-1.26, Math.min(1.26, state.pitch + dy * .0075));
          state.targetYaw = state.yaw;
          state.targetPitch = state.pitch;
          state.spinYaw = Math.max(-11, Math.min(11, (dx * .0085) / dt));
          state.spinPitch = Math.max(-8, Math.min(8, (dy * .0075) / dt));
          start();
        }
        return;
      }
      if (!finePointer.matches || motion.matches) return;
      const wallTop = layout.imprintWallTop - window.scrollY;
      const nx = clamp(((event.clientX - layout.imprintWallLeft) / layout.imprintWallWidth - .5) * 2, -1, 1);
      const ny = clamp(((event.clientY - wallTop) / layout.imprintWallHeight - .5) * 2, -1, 1);
      state.targetTiltYaw = nx * .08;
      state.targetTiltPitch = -ny * .06;
      start();
    }

    function endDrag() {
      if (!state.dragging) return;
      state.dragging = false;
      wall.classList.remove('is-dragging');
      if (state.pointerId !== null) {
        try { wall.releasePointerCapture(state.pointerId); } catch (error) {}
      }
      state.pointerId = null;
      if (orbitDragHint) orbitDragHint.textContent = '[ ⊹ DRAG TO ORBIT ]';
      if (state.dragMoved) {
        state.mode = 'free';
        state.locked = false;
        state.idleSince = state.time;
      } else {
        state.mode = 'locked';
        state.locked = true;
      }
      state.dragMoved = false;
      start();
    }

    let lastOrbitLock = '';
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
        if (state.visible) start(); else stop();
      });
    }, { threshold: 0.01 }) : null;
    if (observer) observer.observe(section);
    else { state.visible = true; start(); }

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
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        cacheTextMetrics(state.radius);
        if (state.visible) draw();
      });
    }

    return {
      setEntry(entry) { setEntry(entry); },
      setView(lat, lon) { setView(lat, lon); },
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
  function updateDepthParallax(scrollY) {
    if (motion.matches) return;
    const y = typeof scrollY === 'number' ? scrollY : window.scrollY;

    if (desktop.matches && aboutSection && aboutVisual && aboutImage) {
      const start = layout.aboutTop - layout.innerHeight;
      const t = clamp((y - start) / Math.max(1, layout.maxScroll - start), 0, 1);
      const shift = -12 + 24 * t;
      if (lastAboutShift === null || Math.abs(shift - lastAboutShift) > .005) {
        aboutImage.style.setProperty('--about-shift', shift.toFixed(2) + 'px');
        lastAboutShift = shift;
      }
    }

    if (desktop.matches && imprintWall && imprintGhost) {
      const progress = clamp((layout.innerHeight - (layout.imprintWallTop - y)) / (layout.innerHeight * 2), 0, 1);
      const shift = 24 - 48 * progress;
      if (lastGhostShift === null || Math.abs(shift - lastGhostShift) > .005) {
        imprintGhost.style.setProperty('--ghost-shift', shift.toFixed(2) + 'px');
        lastGhostShift = shift;
      }
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
    const scrollY = window.scrollY;
    return y >= layout.heroTop - scrollY && y <= layout.heroBottom - scrollY;
  }

  function clearCursor() {
    if (!galleryCursor) return;
    galleryCursor.classList.remove('is-visible', 'is-link', 'is-launch', 'is-orbit', 'is-on-dark', 'is-pressed');
    const label = galleryCursor.querySelector('.gallery-cursor-label');
    if (label) label.textContent = '';
    document.documentElement.classList.remove('cursor-active');
  }

  function setCursorMode(target, x, y) {
    if (!galleryCursor) return;
    if (!finePointer.matches || motion.matches || cursorInHero(x, y) || document.documentElement.classList.contains('replica-open')) {
      clearCursor();
      return;
    }
    const plate = target && target.closest ? target.closest('[data-cursor="launch"], .work-plate') : null;
    const orbit = target && target.closest ? target.closest('[data-cursor="orbit"], .imprint-orbit') : null;
    const link = !plate && !orbit && target && target.closest
      ? target.closest('a, button, [data-cursor="link"], .archive-row')
      : null;
    const label = galleryCursor.querySelector('.gallery-cursor-label');
    galleryCursor.classList.toggle('is-launch', Boolean(plate));
    galleryCursor.classList.toggle('is-orbit', !plate && Boolean(orbit));
    galleryCursor.classList.toggle('is-link', !plate && !orbit && Boolean(link));
    galleryCursor.classList.toggle('is-on-dark', Boolean(plate && plate.closest('.work-card--ink')));
    galleryCursor.classList.add('is-visible');
    document.documentElement.classList.add('cursor-active');
    if (label) label.textContent = plate ? 'LAUNCH' : (orbit ? 'ORBIT' : '');
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
      clearCursor();
    };
    document.documentElement.addEventListener('pointerleave', hideCursor);
    window.addEventListener('blur', hideCursor);
    window.addEventListener('pointerdown', () => galleryCursor.classList.add('is-pressed'), { passive: true });
    window.addEventListener('pointerup', () => galleryCursor.classList.remove('is-pressed'), { passive: true });
    window.addEventListener('pointercancel', () => galleryCursor.classList.remove('is-pressed'), { passive: true });
  }

  function refreshCursor(scrollY) {
    if (!galleryCursor) return;
    if (!finePointer.matches || motion.matches || pointerX < 0 || document.documentElement.classList.contains('replica-open')) {
      clearCursor();
      return;
    }
    const y = typeof scrollY === 'number' ? scrollY : window.scrollY;
    if (pointerY < layout.heroBottom - y) {
      clearCursor();
      return;
    }
    if (currentNav !== 'imprints') galleryCursor.classList.remove('is-orbit');
    if (currentNav !== 'works') galleryCursor.classList.remove('is-launch');
    if (!galleryCursor.classList.contains('is-visible')) {
      galleryCursor.classList.add('is-visible');
      document.documentElement.classList.add('cursor-active');
    }
  }

  /* ---------------------------------------------------------
     Reveal motion — reliable, one-way, always ends at opacity 1
     --------------------------------------------------------- */
  function revealVisibleElements(scrollY) {
    if (motion.matches) {
      reveals.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const y = typeof scrollY === 'number' ? scrollY : window.scrollY;
    const nearBottom = y + layout.innerHeight >= layout.scrollHeight - 40;
    layout.reveals.forEach((reveal) => {
      if (reveal.el.classList.contains('is-visible')) return;
      if (nearBottom || reveal.top - y < layout.innerHeight * .92) {
        reveal.el.classList.add('is-visible');
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
     Scroll-scrub choreography — manifesto, topo, sticky works
     --------------------------------------------------------- */
  const shanghaiClock = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  function tickClock() {
    if (!aboutClock) return;
    const value = shanghaiClock.format(new Date());
    if (aboutClock.textContent !== value) {
      aboutClock.textContent = value;
      aboutClock.setAttribute('datetime', value);
    }
  }

  function updateAboutClock(scrollY) {
    if (!aboutClock) return;
    const chapter = layout.byNav.about;
    if (!chapter) return;
    const visible = scrollY + layout.innerHeight > chapter.top && scrollY < chapter.top + chapter.height;
    if (visible && !clockTimer) {
      tickClock();
      clockTimer = window.setInterval(tickClock, 1000);
    } else if (!visible && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = 0;
    }
  }

  if (aboutSection && 'IntersectionObserver' in window) {
    const clockObserver = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      if (visible) {
        tickClock();
        if (!clockTimer) clockTimer = window.setInterval(tickClock, 1000);
      } else if (clockTimer) {
        clearInterval(clockTimer);
        clockTimer = 0;
      }
    }, { threshold: .04 });
    clockObserver.observe(aboutSection);
  }

  function applyManifestoTransforms(writeOpacity) {
    manifestoLines.forEach((line, index) => {
      line.style.transform = 'translate3d(0, ' + manifestoY[index].toFixed(2) + 'px, 0) skewX(' + manifestoSkew.toFixed(3) + 'deg)';
      if (writeOpacity) line.style.opacity = manifestoOpacities[index].toFixed(3);
    });
    manifestoSkewApplied = manifestoSkew;
  }

  function updateManifestoSkew(now) {
    if (!desktop.matches || motion.matches) {
      if (manifestoSkew !== 0) {
        manifestoSkew = 0;
        applyManifestoTransforms(false);
      }
      manifestoSkewLast = 0;
      return;
    }
    const chapter = layout.byNav.manifesto;
    if (!chapter) return;
    const y = window.scrollY;
    const active = y + layout.innerHeight > chapter.top && y < chapter.top + chapter.height;
    if (!active) {
      if (manifestoSkew !== 0) {
        manifestoSkew = 0;
        applyManifestoTransforms(false);
      }
      manifestoSkewApplied = 0;
      manifestoSkewLast = 0;
      return;
    }
    const time = typeof now === 'number' ? now : performance.now();
    const dt = manifestoSkewLast ? Math.min(.05, Math.max(0, (time - manifestoSkewLast) / 1000)) : 1 / 60;
    manifestoSkewLast = time;
    const velocity = lenis && typeof lenis.velocity === 'number' ? lenis.velocity : 0;
    const target = clamp(velocity * .06, -3, 3);
    const alpha = 1 - Math.exp(-9 * dt);
    manifestoSkew += (target - manifestoSkew) * alpha;
    if (Math.abs(target) < .01 && Math.abs(manifestoSkew) < .018) manifestoSkew = 0;
    if (Math.abs(manifestoSkew - manifestoSkewApplied) > .015) {
      applyManifestoTransforms(false);
    }
  }

  function updateManifesto(scrollY) {
    const chapter = layout.byNav.manifesto;
    if (!chapter) return;
    const raw = clamp((scrollY - chapter.top) / Math.max(1, chapter.height - layout.innerHeight));

    if (!motion.matches && desktop.matches) {
      if (lastManifestoP !== null && Math.abs(raw - lastManifestoP) < 1e-5) return;
      lastManifestoP = raw;

      const starts = [0, .21, .44];
      const ends = [.18, .40, .64];
      manifestoY = starts.map((startValue, index) => {
        const focus = seg(raw, startValue, ends[index]);
        return 18 * (1 - focus) + 2;
      });
      manifestoOpacities = starts.map((startValue, index) => .16 + .84 * seg(raw, startValue, ends[index]));
      manifestoLines.forEach((line, index) => {
        const focus = seg(raw, starts[index], ends[index]);
        line.classList.toggle('is-focus', focus > .48);
      });
      applyManifestoTransforms(true);

      manifestoCapabilities.forEach((capability, index) => {
        capability.classList.toggle('is-lit', raw >= .46 + index * .1);
      });

      if (manifestoNeedle && layout.manifestoRulerTravel) {
        manifestoNeedle.style.transform = 'translate3d(0, ' + (raw * layout.manifestoRulerTravel).toFixed(2) + 'px, 0)';
      }

      const lastIndex = manifestoRulerTicks.length - 1;
      const currentTick = Math.min(lastIndex, Math.max(0, Math.round(raw * lastIndex)));
      const rulerState = manifestoRulerTicks.map((tick, index) => {
        return (index < currentTick ? '1' : '0') + (index === currentTick ? '1' : '0');
      }).join('');
      if (rulerState !== lastRulerState) {
        lastRulerState = rulerState;
        manifestoRulerTicks.forEach((tick, index) => {
          tick.classList.toggle('is-passed', index < currentTick);
          tick.classList.toggle('is-current', index === currentTick);
        });
      }
    }

    if (manifestoProgress) {
      const percent = String(Math.round(raw * 100)).padStart(2, '0') + '%';
      if (percent !== lastManifestoPercent) {
        manifestoProgress.textContent = percent;
        lastManifestoPercent = percent;
      }
    }
  }

  function topoProgress(key, scrollY) {
    const chapter = layout.byNav[key];
    if (!chapter) return 0;
    if (key === 'imprints') {
      return clamp((scrollY - (chapter.top - layout.innerHeight)) / Math.max(1, chapter.height + layout.innerHeight));
    }
    return clamp((scrollY - chapter.top) / Math.max(1, chapter.height - layout.innerHeight));
  }

  function updateTopography(scrollY) {
    if (motion.matches || !desktop.matches) return;
    topoEntries.forEach((entry) => {
      const p = topoProgress(entry.key, scrollY);
      let transform;
      if (entry.key === 'manifesto') {
        transform = 'translate3d(0, ' + (p * 84 - 42).toFixed(2) + 'px, 0) scale(' + (1 + .06 * p).toFixed(4) + ')';
      } else {
        transform = 'translate3d(0, ' + (p * 56 - 28).toFixed(2) + 'px, 0)';
      }
      if (transform !== entry.lastTransform) {
        entry.el.style.transform = transform;
        entry.lastTransform = transform;
      }
    });
  }

  function updateWorkStack(scrollY) {
    if (!desktop.matches || motion.matches || !layout.workSlots.length) return;
    const slots = layout.workSlots;
    const slotTravel = Math.max(1, layout.innerHeight - 68);
    for (let i = 0; i < workCards.length; i += 1) {
      const slot = slots[i];
      const card = workCards[i];
      if (!slot || !card) continue;
      let transform = '';
      let veil = '0';
      if (i < slots.length - 1 && slots[i + 1]) {
        const nextTop = slots[i + 1].top - scrollY;
        const push = easeOutCubic((layout.innerHeight - nextTop) / slotTravel);
        transform = 'translate3d(0, ' + (-18 * push).toFixed(2) + 'px, 0) scale(' + (1 - .065 * push).toFixed(4) + ')';
        veil = (.38 * push).toFixed(3);
      }
      const key = transform + '|' + veil;
      if (lastWorkValues[i] === key) continue;
      lastWorkValues[i] = key;
      if (card.style.transform !== transform) card.style.transform = transform;
      if (workVeils[i] && workVeils[i].style.opacity !== veil) workVeils[i].style.opacity = veil;
    }
  }

  function updateSplitBackdrop() {
    return;
  }

  function updateNavAccent() {
    if (!navAccent || !layout.navRects || !layout.navRects.length) return;
    const active = navLinks.find((link) => link.getAttribute('aria-current') === 'page');
    const index = active ? navLinks.indexOf(active) : -1;
    const rect = index >= 0 ? layout.navRects[index] : null;
    const key = rect ? rect.left + ':' + rect.top + ':' + rect.width : 'none';
    if (key === lastNavAccent) return;
    lastNavAccent = key;
    if (!rect) {
      navAccent.style.opacity = '0';
      return;
    }
    navAccent.style.transform = 'translate3d(' + rect.left.toFixed(2) + 'px, ' + rect.top.toFixed(2) + 'px, 0) scaleX(' + rect.width.toFixed(2) + ')';
    navAccent.style.opacity = '1';
  }

  function updateScrollScrub(scrollY) {
    updateManifesto(scrollY);
    updateTopography(scrollY);
    updateWorkStack(scrollY);
    updateSplitBackdrop(scrollY);
    updateAboutClock(scrollY);
  }

  /* ---------------------------------------------------------
     Scroll state: nav, journey, header tone, split, depth, cursor
     --------------------------------------------------------- */
  function update(scrollYParam) {
    scheduled = false;
    const scrollY = typeof scrollYParam === 'number' ? scrollYParam : window.scrollY;
    const marker = layout.innerHeight * .36;
    let current = layout.chapters[0];

    layout.chapters.forEach((chapter) => {
      if (chapter.top - scrollY <= marker) current = chapter;
    });

    if (current && current.nav !== currentNav) {
      currentNav = current.nav;
      navLinks.forEach((link) => {
        if (link.hash === '#' + currentNav) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
      updateNavAccent();
    }

    if (location.hash && !scrollAnimation && performance.now() > anchorScrollUntil && current && location.hash.slice(1) !== current.nav) {
      history.replaceState(null, '', location.pathname + location.search);
    }

    const index = current ? Math.max(0, layout.chapters.indexOf(current)) : 0;
    const label = current ? current.label : 'Introduction';
    if (journeyLabel && lastJourneyLabel !== label) {
      journeyLabel.textContent = label;
      lastJourneyLabel = label;
    }
    if (journeyProgress) {
      const progress = clamp(scrollY / layout.maxScroll);
      if (Math.abs(progress - lastJourneyProgress) > .0004) {
        journeyProgress.style.transform = 'scaleX(' + progress.toFixed(4) + ')';
        lastJourneyProgress = progress;
      }
    }

    const tone = current ? current.tone : 'dark';
    if (lastHeaderTone !== tone) {
      document.body.dataset.headerTone = tone;
      lastHeaderTone = tone;
    }
    const atHome = index === 0 ? 'true' : 'false';
    if (journey && lastJourneyAtHome !== atHome) {
      journey.dataset.atHome = atHome;
      lastJourneyAtHome = atHome;
    }

    revealVisibleElements(scrollY);
    revealActs(scrollY);
    updateDepthParallax(scrollY);
    updateScrollScrub(scrollY);
    refreshCursor(scrollY);
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
    anchorScrollUntil = performance.now() + duration + 220;
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
  if (lenis) {
    lenis.on('scroll', (payload) => {
      update(payload.scroll);
      updateScrollInertia(performance.now());
    });
  } else {
    window.addEventListener('scroll', schedule, { passive: true });
  }
  window.addEventListener('resize', scheduleMeasure, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = 0;
    } else if (!document.hidden) {
      updateAboutClock(window.scrollY);
    }
  });
  window.addEventListener('load', () => {
    measureLayout();
    update();
  }, { once: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      measureLayout();
      update();
    });
  }
  window.addEventListener('popstate', () => {
    const target = location.hash ? document.querySelector(location.hash) : null;
    animateScrollTo(target ? target.getBoundingClientRect().top + window.scrollY : 0);
  });
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
  let inertiaActive = false;
  let inertiaLastTransform = '';

  function setInertiaTransform(skew, lag) {
    if (!inertiaElements.length) return;
    const active = skew !== 0 || lag !== 0;
    if (!active) {
      if (!inertiaActive) return;
      inertiaActive = false;
      inertiaLastTransform = '';
      inertiaElements.forEach((el) => {
        el.style.transform = '';
        el.style.willChange = '';
      });
      return;
    }
    const transform = 'translate3d(0,' + lag.toFixed(2) + 'px,0) skewY(' + skew.toFixed(3) + 'deg)';
    if (transform === inertiaLastTransform) return;
    inertiaLastTransform = transform;
    if (!inertiaActive) {
      inertiaActive = true;
      inertiaElements.forEach((el) => {
        el.style.willChange = 'transform';
      });
    }
    inertiaElements.forEach((el) => {
      el.style.transform = transform;
    });
  }

  function updateScrollInertia(now, velocityOverride) {
    if (!lenis) return;
    if (motion.matches) {
      if (inertiaActive || inertiaSkew !== 0 || inertiaLag !== 0) {
        inertiaLast = 0;
        inertiaSkew = 0;
        inertiaLag = 0;
        setInertiaTransform(0, 0);
      }
      return;
    }
    const time = typeof now === 'number' ? now : performance.now();
    if (inertiaLast && time - inertiaLast < 4) return;
    const velocity = typeof velocityOverride === 'number'
      ? velocityOverride
      : (typeof lenis.velocity === 'number' ? lenis.velocity : 0);

    if (inertiaSkew === 0 && inertiaLag === 0 && velocity === 0) {
      if (inertiaActive) setInertiaTransform(0, 0);
      inertiaLast = 0;
      return;
    }

    const dt = inertiaLast ? Math.min(.05, Math.max(0, (time - inertiaLast) / 1000)) : 1 / 60;
    inertiaLast = time;
    const targetSkew = clamp(velocity * .02, -1.2, 1.2);
    const targetLag = clamp(velocity * .16, -10, 10);
    const alpha = 1 - Math.exp(-10 * dt);
    inertiaSkew += (targetSkew - inertiaSkew) * alpha;
    inertiaLag += (targetLag - inertiaLag) * alpha;
    if (Math.abs(targetSkew - inertiaSkew) < .004) inertiaSkew = targetSkew;
    if (Math.abs(targetLag - inertiaLag) < .015) inertiaLag = targetLag;
    if (inertiaSkew === 0 && inertiaLag === 0 && velocity === 0) {
      setInertiaTransform(0, 0);
      inertiaLast = 0;
      return;
    }
    setInertiaTransform(inertiaSkew, inertiaLag);
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  measureLayout();
  splitCurrent = splitAtScroll(window.scrollY);
  splitTarget = splitCurrent;
  applySplit(splitCurrent);

  setupWorks();
  astrolabe = setupAstrolabe();
  setupImprints();
  setupMagneticLinks();
  setupArchive();
  setupReplicaModal();

  const preloaderPending = setupPreloader();
  if (!preloaderPending) playHeroSignature();
  update();

  if (lenis) {
    function raf(time) {
      lenis.raf(time);
      if (inertiaActive || inertiaSkew !== 0 || inertiaLag !== 0) updateScrollInertia(time);
      advanceSplit(time);
      updateManifestoSkew(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }
})();
