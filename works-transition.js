(() => {
  const desktop = matchMedia('(min-width: 761px)');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const home = document.getElementById('home');
  const transition = document.getElementById('works-transition');
  const txStage = transition?.querySelector('.works-transition-stage');
  const txHomeCopy = transition?.querySelector('.tx-home-copy');
  const inkCanvas = document.getElementById('txInkCanvas');
  const inkCtx = inkCanvas?.getContext('2d', { alpha:true });

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

  /* Deterministic splatter field: same shape on every refresh, no flicker. */
  let seed = 218834;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const blobs = Array.from({ length:88 }, () => ({
    y:rand(),
    dx:(rand() - .48) * .20,
    r:.006 + rand() * .038,
    squash:.55 + rand() * 1.35
  }));
  const holes = Array.from({ length:46 }, () => ({
    y:rand(),
    dx:.005 + rand() * .082,
    r:.004 + rand() * .024,
    squash:.55 + rand() * 1.4
  }));
  const specks = Array.from({ length:110 }, () => ({
    y:rand(),
    dx:(rand() - .62) * .19,
    r:.0008 + rand() * .0048,
    a:.16 + rand() * .45
  }));

  let inkCssW = 0;
  let inkCssH = 0;
  let inkDpr = 1;

  function sizeInkCanvas() {
    if (!inkCanvas || !inkCtx) return;
    const rect = inkCanvas.getBoundingClientRect();
    inkCssW = Math.max(1, rect.width);
    inkCssH = Math.max(1, rect.height);
    inkDpr = Math.min(devicePixelRatio || 1, 1.35);
    const width = Math.round(inkCssW * inkDpr);
    const height = Math.round(inkCssH * inkDpr);
    if (inkCanvas.width !== width || inkCanvas.height !== height) {
      inkCanvas.width = width;
      inkCanvas.height = height;
    }
  }

  function edgeAt(y, boundary, progress) {
    const t = y / Math.max(1, inkCssH);
    const amp = (22 + inkCssW * .018) * (.65 + .35 * Math.sin(progress * Math.PI));
    return boundary
      + Math.sin(t * 23.0 + 1.7) * amp
      + Math.sin(t * 57.0 + 5.2) * amp * .34
      + Math.sin(t * 113.0 + 2.4) * amp * .14;
  }

  function drawInk(progress) {
    if (!inkCanvas || !inkCtx) return;
    sizeInkCanvas();

    const ctx = inkCtx;
    const w = inkCssW;
    const h = inkCssH;

    ctx.setTransform(inkDpr,0,0,inkDpr,0,0);
    ctx.clearRect(0,0,w,h);

    if (progress <= .001) return;

    /* Right-to-left travelling front. */
    const boundary = w * (1 - progress);

    ctx.save();

    /* 1. Main paper mass with a deliberately torn / ink-eaten edge. */
    ctx.fillStyle = '#ebe9e1';
    ctx.beginPath();
    ctx.moveTo(w,0);
    ctx.lineTo(w,h);
    for (let y=h; y>=0; y-=Math.max(9,h/68)) {
      ctx.lineTo(edgeAt(y,boundary,progress),y);
    }
    ctx.closePath();
    ctx.fill();

    /* 2. Wet blobs jump ahead of the main front, like ink soaking paper. */
    blobs.forEach((blob,index) => {
      const pulse = .66 + .34 * Math.sin(index * 2.13 + progress * 4.2);
      const x = boundary + blob.dx * w * pulse;
      const y = blob.y * h;
      const r = Math.max(3,blob.r * Math.min(w,h));
      ctx.beginPath();
      ctx.ellipse(x,y,r * blob.squash,r,((index%7)-3)*.08,0,Math.PI*2);
      ctx.fill();
    });

    /* 3. Carve irregular black voids back into the advancing paper. */
    ctx.globalCompositeOperation = 'destination-out';
    holes.forEach((hole,index) => {
      const x = boundary + hole.dx * w;
      const y = hole.y * h;
      const r = Math.max(2.5,hole.r * Math.min(w,h));
      ctx.beginPath();
      ctx.ellipse(x,y,r * hole.squash,r,((index%5)-2)*.12,0,Math.PI*2);
      ctx.fill();
    });

    /* 4. Fine dark splatter sits on top, hiding any hint of a straight wipe. */
    ctx.globalCompositeOperation = 'source-over';
    specks.forEach((dot,index) => {
      const x = boundary + dot.dx * w;
      const y = dot.y * h;
      const r = Math.max(.8,dot.r * Math.min(w,h));
      ctx.globalAlpha = dot.a * (.72 + .28 * Math.sin(index + progress * 6));
      ctx.fillStyle = index % 6 === 0 ? '#11110f' : '#2e2c27';
      ctx.beginPath();
      ctx.arc(x,y,r,0,Math.PI*2);
      ctx.fill();
      if (index % 9 === 0) {
        ctx.beginPath();
        ctx.ellipse(x-r*2.2,y+r*.4,r*2.8,r*.38,index*.17,0,Math.PI*2);
        ctx.fill();
      }
    });

    /* 5. Dry-brush scratches across the edge. */
    ctx.globalAlpha = .18;
    ctx.strokeStyle = '#171713';
    ctx.lineWidth = 1;
    for (let i=0;i<26;i++) {
      const y = ((i * 37.7) % h);
      const x = edgeAt(y,boundary,progress) + ((i%5)-2) * 7;
      ctx.beginPath();
      ctx.moveTo(x-10-(i%4)*7,y);
      ctx.lineTo(x+18+(i%3)*11,y+((i%3)-1)*2.5);
      ctx.stroke();
    }

    ctx.restore();
  }

  let scheduled = false;

  function reset() {
    root.classList.remove('cinematic-works-ready');
    txStage.removeAttribute('style');
    if (inkCtx && inkCanvas) {
      inkCtx.setTransform(1,0,0,1,0,0);
      inkCtx.clearRect(0,0,inkCanvas.width,inkCanvas.height);
    }
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

    /*
     * 20-58% — actual ink/paper wipe.
     * The canvas is the visible leading edge. The regular paper layer stays
     * behind it and only catches up after the organic front has crossed.
     */
    const inkIn = phase(p, .18, .57);
    const paperIn = phase(p, .43, .64);
    const portraitShift = phase(p, .19, .58);

    /* 35-70% — portrait turns into a printed ghost; WORKS rises through it. */
    const printIn = phase(p, .37, .65);
    const worksIn = phase(p, .40, .68);
    const metaIn = phase(p, .47, .67);

    /* 62-100% — first project takes over the same frame. */
    const featureIn = phase(p, .62, .91);
    const copyIn = phase(p, .68, .93);

    drawInk(inkIn);

    set('--tx-paper-left', `${((1 - paperIn) * 100).toFixed(3)}%`);
    set('--tx-ink-opacity', (1 - phase(p,.64,.77)).toFixed(4));

    set('--tx-home-copy-opacity', (1 - homeCopyOut).toFixed(4));
    set('--tx-home-copy-y', `${(-28 * homeCopyOut).toFixed(2)}px`);

    set('--tx-portrait-x', `${(7.8 * portraitShift).toFixed(3)}vw`);
    set('--tx-portrait-scale', (1 - .068 * portraitShift).toFixed(4));
    set('--tx-portrait-opacity', (1 - .58 * phase(p, .38, .69)).toFixed(4));

    set('--tx-paper-portrait-opacity', (.31 * printIn * (1 - .46 * featureIn)).toFixed(4));

    set('--tx-works-opacity', worksIn.toFixed(4));
    set('--tx-works-y', `${(55 * (1 - worksIn)).toFixed(3)}vh`);
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

  addEventListener('scroll', schedule, { passive:true });
  addEventListener('resize', () => {
    sizeInkCanvas();
    schedule();
  }, { passive:true });
  addEventListener('load', schedule, { once:true });
  desktop.addEventListener('change', schedule);
  motion.addEventListener('change', schedule);

  update();
})();
