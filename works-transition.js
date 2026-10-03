(() => {
  const desktop = matchMedia('(min-width: 761px)');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const home = document.getElementById('home');
  const works = document.getElementById('works');

  if (!home || !works) return;

  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => {
    const p = clamp(value);
    return p * p * (3 - 2 * p);
  };
  const phase = (value, from, to) => smooth((value - from) / Math.max(.0001, to - from));
  const set = (element, name, value) => element.style.setProperty(name, value);

  let scheduled = false;

  function reset() {
    root.classList.remove('cinematic-works-ready');
    [
      '--bridge-flood-left',
      '--bridge-hero-opacity',
      '--bridge-hero-y',
      '--bridge-portrait-opacity',
      '--bridge-portrait-x',
      '--bridge-portrait-scale',
      '--bridge-ghost-opacity',
      '--bridge-word-opacity',
      '--bridge-word-y',
      '--bridge-meta-opacity'
    ].forEach(name => home.style.removeProperty(name));

    [
      '--works-title-opacity',
      '--works-title-y',
      '--works-feature-opacity',
      '--works-feature-x',
      '--works-feature-y',
      '--works-feature-scale',
      '--works-feature-rotate',
      '--works-copy-x',
      '--works-side-opacity',
      '--works-ghost-opacity',
      '--works-texture-opacity'
    ].forEach(name => works.style.removeProperty(name));
  }

  function update() {
    scheduled = false;

    if (!desktop.matches || motion.matches) {
      reset();
      return;
    }

    root.classList.add('cinematic-works-ready');

    const height = Math.max(1, innerHeight);
    const homeRect = home.getBoundingClientRect();
    const worksRect = works.getBoundingClientRect();

    /*
     * HOME -> WORKS
     * The hero remains intact at first. Then the paper field grows in from
     * the right, the original portrait recedes, and WORKS takes the frame.
     */
    const homeTravel = Math.max(height, home.offsetHeight - height);
    const hp = clamp(-homeRect.top / homeTravel);

    const heroOut = phase(hp, .16, .50);
    const flood = phase(hp, .24, .69);
    const portraitMove = phase(hp, .20, .72);
    const ghostIn = phase(hp, .34, .68);
    const wordIn = phase(hp, .43, .75);
    const metaIn = phase(hp, .49, .72);

    set(home, '--bridge-flood-left', `${((1 - flood) * 100).toFixed(3)}%`);
    set(home, '--bridge-hero-opacity', (1 - heroOut).toFixed(4));
    set(home, '--bridge-hero-y', `${(-34 * heroOut).toFixed(2)}px`);
    set(home, '--bridge-portrait-opacity', (1 - .22 * phase(hp, .36, .82)).toFixed(4));
    set(home, '--bridge-portrait-x', `${(6.5 * portraitMove).toFixed(3)}vw`);
    set(home, '--bridge-portrait-scale', (1 - .052 * portraitMove).toFixed(4));
    set(home, '--bridge-ghost-opacity', (.23 * ghostIn).toFixed(4));
    set(home, '--bridge-word-opacity', wordIn.toFixed(4));
    set(home, '--bridge-word-y', `${(118 * (1 - wordIn)).toFixed(2)}px`);
    set(home, '--bridge-meta-opacity', metaIn.toFixed(4));

    /*
     * WORKS
     * The first project already lives inside the second frame. The preview
     * settles into almost the same position as the blog book in the next
     * chapter, so the next transition can read as one continuous object.
     */
    const enter = clamp(-worksRect.top / height);
    const titleIn = phase(enter, .30, .58);
    const featureIn = phase(enter, .43, .78);
    const copyIn = phase(enter, .50, .80);
    const sideIn = phase(enter, .67, .91);

    set(works, '--works-title-opacity', titleIn.toFixed(4));
    set(works, '--works-title-y', `${(92 * (1 - titleIn) - 18 * phase(enter, .82, 1)).toFixed(2)}px`);
    set(works, '--works-feature-opacity', featureIn.toFixed(4));
    set(works, '--works-feature-x', `${(120 * (1 - featureIn)).toFixed(2)}px`);
    set(works, '--works-feature-y', `${(46 * (1 - featureIn)).toFixed(2)}px`);
    set(works, '--works-feature-scale', (.80 + .20 * featureIn).toFixed(4));
    set(works, '--works-feature-rotate', `${(8 * (1 - featureIn)).toFixed(3)}deg`);
    set(works, '--works-copy-x', `${(-42 * (1 - copyIn)).toFixed(2)}px`);
    set(works, '--works-side-opacity', sideIn.toFixed(4));
    set(works, '--works-ghost-opacity', (.15 - .07 * phase(enter, .55, .95)).toFixed(4));
    set(works, '--works-texture-opacity', (.18 - .07 * featureIn).toFixed(4));
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
