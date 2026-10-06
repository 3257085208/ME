(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  const paths = [...document.querySelectorAll('#home .sig')];
  let animations = [];
  function play() {
    animations.forEach(animation => animation.cancel());
    animations = [];
    if (motion.matches) return;
    let delay = 180;
    paths.forEach(path => {
      const length = path.getTotalLength(), tiny = length < 10;
      const duration = tiny ? 90 : Math.max(240, Math.min(1150, length * 2.65));
      animations.push(path.animate([{strokeDasharray:'1',strokeDashoffset:'1'}, {strokeDasharray:'1',strokeDashoffset:'0'}], {duration, delay, easing:'cubic-bezier(.25,.03,.16,1)', fill:'backwards'}));
      delay += duration + (tiny ? 40 : 68);
    });
  }
  document.getElementById('replay').addEventListener('click',play);
  if (document.documentElement.classList.contains('js-splash')) addEventListener('qqsg:reveal',play,{once:true});
  else play();

  // Reveal content in its natural flow on smaller screens.
  const reveals = [...document.querySelectorAll('.works-title,.project-copy,.imprint-copy,.closing-copy')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {threshold:.12, rootMargin:'0px 0px -40px 0px'});
    reveals.forEach(element => { element.classList.add('reveal-target'); observer.observe(element); });
    document.documentElement.classList.add('motion-ready');
  }

  const chapters = [...document.querySelectorAll('.chapter')];
  chapters.forEach((chapter,i) => chapter.style.setProperty('--chapter-order',String(i)));
  const links = [...document.querySelectorAll('.site-nav a')];
  const hero = document.querySelector('.home-stage');
  const index = document.querySelector('.journey-index');
  const label = document.querySelector('.journey-label');
  const clamp = n => Math.max(0,Math.min(1,n));
  let scheduled = false, currentNav = '';
  const smooth = n => { const p = clamp(n); return p*p*(3-2*p); };
  const phase = (p,a,b) => smooth((p-a)/(b-a));
  const propCache = new WeakMap();
  const prop = (element,name,value,unit='') => {
    if(!element)return;
    const next=`${Number(value.toFixed(4))}${unit}`;
    let cache=propCache.get(element);
    if(!cache){
      cache=new Map();
      propCache.set(element,cache);
    }
    if(cache.get(name)===next)return;
    cache.set(name,next);
    element.style.setProperty(name,next);
  };
  const tileVectors = [[-66,-76,-9],[110,-40,7],[-35,95,-6],[80,60,11]];
  const scenes = new Map([...document.querySelectorAll('[data-scene]')].map(chapter => [chapter, {
    stage:chapter.querySelector('.stage'),
    focus:chapter.querySelector('.blog-book,.sla-monitor,.node-board'),
    tiles:[...chapter.querySelectorAll('.node-tile')],
    domains:[...chapter.querySelectorAll('.domain')],
    wires:[...chapter.querySelectorAll('.network-wire')],
    endpoints:[...chapter.querySelectorAll('.network-endpoint')],
    steps:[...chapter.querySelectorAll('[data-step]')],
    counter:chapter.querySelector('.scan-counter')
  }]));
  function animateScene(chapter,rect,height) {
    const scene = scenes.get(chapter);
    let p = clamp(-rect.top / Math.max(1,rect.height-height));
    if (!mobile.matches && !motion.matches) p = clamp((-rect.top-height)/Math.max(1,rect.height-height*3));
    if (mobile.matches) {
      if (scene.focus) {
        const focus = scene.focus.getBoundingClientRect();
        p = clamp((height*.65-focus.top)/(height*.6));
      } else {
        p = clamp((height*.2-rect.top)/Math.max(1,rect.height-height*.6));
      }
    }
    if (motion.matches) p = 1;
    prop(chapter,'--scene-p',p);
    prop(chapter,'--film-word-y',-35*phase(p,0,.82),'px');
    prop(chapter,'--film-copy-opacity',.7+.3*phase(p,.02,.18));
    prop(chapter,'--film-copy-y',15*(1-phase(p,.02,.2)),'px');
    prop(chapter,'--film-monitor-scale',1.08-.08*phase(p,.06,.65));
    prop(chapter,'--film-node-split',46-16*phase(p,.02,.85),'%');
    switch(chapter.dataset.scene) {
      case 'blog': {
        const open = phase(p,.02,.76);
        prop(chapter,'--blog-open',open);
        prop(chapter,'--blog-fold',-160*open,'deg');
        prop(chapter,'--blog-line',phase(p,0,.8));
        prop(chapter,'--blog-pan',-30*phase(p,.65,1),'px');
        break;
      }
      case 'sla': {
        const read = phase(p,0,.58), signal = phase(p,.12,.75);
        prop(chapter,'--sla-read',read);
        prop(chapter,'--sla-reveal',12+read*88,'%');
        prop(chapter,'--sla-scan-opacity',1-phase(p,.58,.72));
        prop(chapter,'--sla-signal',signal);
        prop(chapter,'--sla-dot',signal*100,'%');
        prop(chapter,'--sla-word-x',-100*p,'px');
        const step = Math.min(2,Math.floor(p*3));
        scene.counter.textContent = `0${step+1} / 03`;
        break;
      }
      case 'node': {
        const join = phase(p,.03,.62), lock = phase(p,.55,.68);
        prop(chapter,'--node-join',join);
        prop(chapter,'--node-lock',lock);
        prop(chapter,'--node-out',phase(p,.62,.78));
        prop(chapter,'--node-in',phase(p,.8,.99));
        prop(chapter,'--node-split',46-join*6,'%');
        prop(chapter,'--node-grid-x',45*p,'px');
        scene.tiles.forEach((tile,i) => {
          const together = phase(p,.03+i*.07,.35+i*.09);
          const remaining = 1-together, amplitude = mobile.matches ? .32 : .8;
          prop(tile,'--tile-x',tileVectors[i][0]*remaining*amplitude,'px');
          prop(tile,'--tile-y',tileVectors[i][1]*remaining*amplitude,'px');
          prop(tile,'--tile-angle',tileVectors[i][2]*remaining,'deg');
          prop(tile,'--tile-gap',5*remaining,'px');
        });
        break;
      }
      case 'network': {
        prop(chapter,'--orbit-turn',p*270,'deg');
        prop(chapter,'--network-word-x',-120*p,'px');
        prop(chapter,'--network-grid-y',-90*p,'px');
        prop(chapter,'--network-flow',phase(p,.16,.95));
        scene.domains.forEach((domain,i) => {
          let wire = phase(p,.03+i*.13,.37+i*.13);
          let address = phase(wire,.2,1);
          if (mobile.matches) {
            const addressRect = domain.getBoundingClientRect();
            address = smooth((height*.92-addressRect.top)/(height*.36));
            wire = address;
          }
          if (motion.matches) address = wire = 1;
          prop(domain,'--address-p',address);
          prop(scene.wires[i],'--wire-p',wire);
          prop(scene.endpoints[i],'--wire-p',wire);
        });
        break;
      }
    }
    const step = Math.min(2,Math.floor(p*3));
    scene.steps.forEach(element => element.classList.toggle('is-current',Number(element.dataset.step)===step));
  }
  function update() {
    scheduled = false;
    const height = innerHeight, y = scrollY;
    const total = document.documentElement.scrollHeight - height;
    document.documentElement.style.setProperty('--journey-p', String(clamp(y / Math.max(1,total))));
    let current = chapters[0], headerChapter = chapters[0];
    chapters.forEach(chapter => {
      const rect = chapter.getBoundingClientRect();
      if (rect.top <= (mobile.matches || motion.matches ? height*.42 : -height*.5)) current = chapter;
      if (rect.top <= 70) headerChapter = chapter;
      const entrance = clamp((height - rect.top) / (height + Math.max(0,rect.height - height)));
      chapter.style.setProperty('--section-p', entrance.toFixed(4));
      chapter.classList.toggle('scene-active', rect.top < height && rect.bottom > 0);
      const stage = chapter.querySelector('.stage');
      if (!mobile.matches && !motion.matches) {
        const last = chapter === chapters[chapters.length-1];
        /* Fade a chapter in while it is entering the viewport, not only
           after its top has already passed the viewport top. The old formula
           created a full black "dead frame" at every chapter boundary. */
        const enterRaw = chapter === chapters[0] ? 1 : clamp((height - rect.top)/height);
        const exitRaw = last ? 0 : clamp((height*2-rect.bottom)/height);
        const enter = smooth(enterRaw);
        prop(stage,'--chapter-opacity',!last && rect.bottom<=height ? 0 : enter);
        prop(stage,'--chapter-copy-opacity',phase(enterRaw,.42,.86)*(1-phase(exitRaw,0,.38)));
        chapter.dataset.transition = !last && rect.bottom < height*2 ? 'retiring' : rect.top > -height*.5 && chapter !== chapters[0] ? 'waiting' : 'present';
      } else {
        prop(stage,'--chapter-opacity',1);
        prop(stage,'--chapter-copy-opacity',1);
        chapter.dataset.transition = 'present';
      }
      /* Scene internals used to update for every project on every scroll
         event, including chapters several screens away. Keep the expensive
         per-scene transforms local to a small viewport window. */
      if (chapter.dataset.scene && rect.top < height*1.35 && rect.bottom > -height*.35) {
        animateScene(chapter, rect, height);
      }
      if (chapter.id === 'works') prop(chapter,'--works-p',motion.matches ? 1 : mobile.matches ? 0 : clamp((-rect.top-height)/Math.max(1,rect.height-height*3)));

    });
    document.body.dataset.headerTone = headerChapter.classList.contains('paper') ? 'light' : 'dark';
    const home = chapters[0];
    /* The dedicated hero->Works scene owns the desktop home transition.
       Do not run the legacy 245svh hero drift against the shortened 100svh
       home chapter, otherwise --hero-p jumps to 1 almost immediately. */
    const cinematicWorks = document.documentElement.classList.contains('cinematic-works-ready');
    const homeProgress = !mobile.matches && !motion.matches && !cinematicWorks
      ? clamp(y/Math.max(1,home.offsetHeight-height*2))
      : 0;
    prop(hero,'--hero-p',homeProgress);
    const nav = current.dataset.nav;
    if (nav !== currentNav) {
      currentNav = nav;
      links.forEach(link => link.hash === `#${nav}` ? link.setAttribute('aria-current','page') : link.removeAttribute('aria-current'));
    }
    index.textContent = String(chapters.indexOf(current)+1).padStart(2,'0');
    label.textContent = current.dataset.label;
  }
  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule);
  addEventListener('load',schedule);
  mobile.addEventListener('change',schedule);
  motion.addEventListener('change',() => { animations.forEach(a=>a.cancel()); animations=[]; schedule(); });
  update();
})();
