(() => {
  const root = document.documentElement;
  const splash = document.getElementById('splash');
  const host = document.getElementById('splashSignature');
  const source = document.querySelector('#home .signature');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const small = matchMedia('(max-width: 760px)');
  let finished = false;
  let revealed = false;

  function revealHero() {
    if (revealed) return;
    revealed = true;
    dispatchEvent(new Event('qqsg:reveal'));
  }

  function cleanup() {
    if (finished) return;
    finished = true;
    splash?.remove();
    root.classList.remove('js','splash-lock','js-splash');
    revealHero();
  }

  if (!splash || !host || !source || motion.matches) {
    cleanup();
    return;
  }

  root.classList.add('js-splash','splash-lock');
  if (!location.hash && 'scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
    scrollTo(0,0);
  }

  const clone = source.cloneNode(true);
  host.appendChild(clone);
  const paths = [...clone.querySelectorAll('.sig')];
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  if (!paths.length) {
    cleanup();
    return;
  }

  const target = small.matches ? 1700 : 2200;
  const lengths = paths.map(path => Math.max(1,path.getTotalLength()));
  const total = lengths.reduce((sum,value) => sum + value,0);
  let cursor = 120;
  const animations = paths.map((path,i) => {
    const tiny = lengths[i] < 10;
    const duration = tiny ? 70 : Math.max(110,target * lengths[i] / total);
    const animation = path.animate(
      [{strokeDasharray:'1',strokeDashoffset:'1'},{strokeDasharray:'1',strokeDashoffset:'0'}],
      {duration,delay:cursor,easing:'cubic-bezier(.25,.03,.16,1)',fill:'backwards'}
    );
    cursor += duration + (tiny ? 18 : 26);
    return animation;
  });

  const loaded = document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise(resolve => addEventListener('load',resolve,{once:true}));

  Promise.all([
    animations[animations.length - 1].finished.catch(() => {}),
    Promise.race([loaded,wait(6500)])
  ]).then(() => wait(260)).then(() => {
    if (finished) return;
    splash.classList.add('is-done');
    setTimeout(() => {
      if (finished) return;
      revealHero();
      splash.classList.add('is-leaving');
      setTimeout(cleanup,850);
    },430);
  });

  addEventListener('pageshow',event => { if (event.persisted) cleanup(); });
  setTimeout(cleanup,9000);
})();
