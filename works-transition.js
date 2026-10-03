(() => {
  const desktop = matchMedia('(min-width: 761px)');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const home = document.getElementById('home');
  const transition = document.getElementById('works-transition');
  const txStage = transition?.querySelector('.works-transition-stage');
  const txHomeCopy = transition?.querySelector('.tx-home-copy');

  if (!home || !transition || !txStage || !txHomeCopy) return;

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
  const set = (name, value) => txStage.style.setProperty(name, value);

  let scheduled = false;

  function reset() {
    root.classList.remove('cinematic-works-ready');
    txStage.removeAttribute('style');
  }

  function update() {
    scheduled = false;

    if (!desktop.matches || motion.matches) {
      reset();
      return;
    }

    root.classList.add('cinematic-works-ready');

    const height = Math.max(1, innerHeight);
    const rect = transition.getBoundingClientRect();
    const travel = Math.max(1, transition.offsetHeight - height);
    const p = clamp(-rect.top / travel);

    /* 00-20% — exact hero hold. */
    const homeCopyOut = phase(p, .18, .38);

    /* 20-48% — the white/paper field physically takes the frame. */
    const paperIn = phase(p, .20, .50);
    const portraitShift = phase(p, .19, .55);

    /* 35-68% — portrait becomes a printed ghost and WORKS rises through it. */
    const printIn = phase(p, .34, .62);
    const worksIn = phase(p, .39, .66);
    const metaIn = phase(p, .46, .65);

    /* 62-100% — first project takes over the same frame. */
    const featureIn = phase(p, .61, .90);
    const copyIn = phase(p, .67, .92);

    set('--tx-paper-left', `${((1 - paperIn) * 100).toFixed(3)}%`);
    set('--tx-home-copy-opacity', (1 - homeCopyOut).toFixed(4));
    set('--tx-home-copy-y', `${(-28 * homeCopyOut).toFixed(2)}px`);

    set('--tx-portrait-x', `${(7.4 * portraitShift).toFixed(3)}vw`);
    set('--tx-portrait-scale', (1 - .065 * portraitShift).toFixed(4));
    set('--tx-portrait-opacity', (1 - .52 * phase(p, .38, .67)).toFixed(4));

    set('--tx-paper-portrait-opacity', (.28 * printIn * (1 - .42 * featureIn)).toFixed(4));

    set('--tx-works-opacity', worksIn.toFixed(4));
    set('--tx-works-y', `${(54 * (1 - worksIn)).toFixed(3)}vh`);
    set('--tx-meta-opacity', metaIn.toFixed(4));

    set('--tx-feature-opacity', featureIn.toFixed(4));
    set('--tx-feature-x', `${(12 * (1 - featureIn)).toFixed(3)}vw`);
    set('--tx-feature-y', `${(7 * (1 - featureIn)).toFixed(3)}vh`);
    set('--tx-feature-scale', (.76 + .24 * featureIn).toFixed(4));
    set('--tx-feature-rotate', `${(10 * (1 - featureIn)).toFixed(3)}deg`);
    set('--tx-feature-copy-x', `${(-4 * (1 - copyIn)).toFixed(3)}vw`);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('load', schedule, { once: true });
  desktop.addEventListener('change', schedule);
  motion.addEventListener('change', schedule);

  update();
})();
