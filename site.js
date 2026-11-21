(() => {
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const paths = [...document.querySelectorAll('#home .sig')];
  const replay = document.getElementById('replay');
  const reveals = [...document.querySelectorAll('.reveal')];
  const artifactImages = [...document.querySelectorAll('.plate-frame img')];
  const portraitImages = [...document.querySelectorAll('.about-matte img')];
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

  /* Reliable one-way editorial reveal — never traps bottom elements at partial opacity */
  function revealVisibleElements() {
    if (motion.matches) {
      reveals.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const nearBottom = scrollY + innerHeight >= document.documentElement.scrollHeight - 40;
    reveals.forEach((el) => {
      if (el.classList.contains('is-visible')) return;
      const rect = el.getBoundingClientRect();
      if (nearBottom || rect.top < innerHeight * .92) {
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

  function updateParallax() {
    if (motion.matches) {
      artifactImages.forEach((image) => image.style.setProperty('--artifact-shift', '0px'));
      portraitImages.forEach((image) => image.style.setProperty('--portrait-shift', '0px'));
      return;
    }

    artifactImages.forEach((image) => {
      const rect = image.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) return;
      const center = (rect.top + rect.height * .5 - innerHeight * .5) / innerHeight;
      image.style.setProperty('--artifact-shift', `${clamp(-center * 10, -10, 10).toFixed(2)}px`);
    });

    portraitImages.forEach((image) => {
      const rect = image.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) return;
      const center = (rect.top + rect.height * .5 - innerHeight * .5) / innerHeight;
      image.style.setProperty('--portrait-shift', `${clamp(-center * 14, -14, 14).toFixed(2)}px`);
    });
  }

  function update() {
    scheduled = false;
    const marker = innerHeight * .36;
    let current = chapters[0];

    chapters.forEach((chapter) => {
      if (chapter.getBoundingClientRect().top <= marker) current = chapter;
    });

    if (current?.dataset.nav !== currentNav) {
      currentNav = current?.dataset.nav || 'home';
      navLinks.forEach((link) => {
        if (link.hash === `#${currentNav}`) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    }

    const index = Math.max(0, chapters.indexOf(current));
    if (journeyLabel) journeyLabel.textContent = current?.dataset.label || 'Introduction';
    if (journeyProgress) {
      const progress = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight);
      journeyProgress.style.transform = `scaleX(${clamp(progress).toFixed(4)})`;
    }

    document.body.dataset.headerTone = current?.dataset.tone || 'dark';
    if (journey) journey.dataset.atHome = index === 0 ? 'true' : 'false';
    revealVisibleElements();
    updateParallax();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }

  function cancelAnimatedScroll() {
    if (scrollAnimation) cancelAnimationFrame(scrollAnimation);
    scrollAnimation = 0;
  }

  function animateScrollTo(targetY, duration = 900) {
    cancelAnimatedScroll();
    if (motion.matches) {
      scrollTo(0, targetY);
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

    const startY = scrollY;
    const distance = targetY - startY;
    const started = performance.now();

    function tick(now) {
      const progress = clamp((now - started) / duration);
      scrollTo(0, startY + distance * easeOutCubic(progress));
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
      const targetY = target.getBoundingClientRect().top + scrollY;
      history.pushState(null, '', link.hash);
      animateScrollTo(targetY);
    });
  });

  addEventListener('wheel', cancelAnimatedScroll, { passive: true });
  addEventListener('touchstart', cancelAnimatedScroll, { passive: true });
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  addEventListener('popstate', () => {
    const target = location.hash ? document.querySelector(location.hash) : null;
    animateScrollTo(target ? target.getBoundingClientRect().top + scrollY : 0);
  });
  lenis?.on('scroll', schedule);
  replay?.addEventListener('click', playSignature);
  motion.addEventListener('change', () => {
    if (motion.matches) lenis?.stop();
    else lenis?.start();
    revealVisibleElements();
    updateParallax();
    playSignature();
    schedule();
  });

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
