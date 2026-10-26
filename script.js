(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';
  const hasST = hasGsap && typeof window.ScrollTrigger !== 'undefined';
  // Each feature runs on its own, so one failure never breaks the rest of the page.
  const safe = (name, fn) => { try { fn(); } catch (err) { console.warn('[portfolio]', name, err); } };

  let lenis = null;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------- Band: duplicate the words so the loop has no gap ----------
  const bandTrack = $('.band__track');
  if (bandTrack) bandTrack.innerHTML += bandTrack.innerHTML;

  // ---------- Menu (phones and small tablets) ----------
  const nav = $('.nav');
  const toggle = $('.nav__toggle');
  const menu = $('#menu');
  let menuOpen = false;

  const setMenu = open => {
    if (!menu || !toggle) return;
    menuOpen = open;
    menu.classList.toggle('is-open', open);
    root.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Menu';
    if (lenis) { open ? lenis.stop() : lenis.start(); }
  };
  if (toggle) toggle.addEventListener('click', () => setMenu(!menuOpen));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) setMenu(false); });

  // ---------- Anchor links ----------
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = id === '#top' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      setMenu(false);
      if (lenis) lenis.scrollTo(target, { duration: 1.4 });
      else if (target === 0) window.scrollTo({ top: 0, behavior: 'smooth' });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // ---------- Nav: glass after the top, hides while scrolling down ----------
  safe('nav', () => {
    if (!nav) return;
    let lastY = window.scrollY;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      nav.classList.toggle('is-scrolled', y > 24);
      nav.classList.toggle('is-hidden', y > lastY && y > 260 && !menuOpen);
      lastY = y;
    }, { passive: true });
  });

  // ---------- Highlighter marks sweep in when they come into view ----------
  safe('marks', () => {
    if (reduce || !('IntersectionObserver' in window)) return;
    root.classList.add('mark-ready');
    $$('mark').forEach((m, i) => m.style.setProperty('--d', (i * 0.25) + 's'));
    // On touch screens there is no hover, so the big goal words and certificate titles sweep on scroll instead.
    const targets = $$('mark').concat(fine ? [] : $$('.sweep'));
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('on'); io.unobserve(en.target); }
      });
    }, { threshold: 0.6, rootMargin: '0px 0px -8% 0px' });
    targets.forEach(t => io.observe(t));
  });

  // ---------- Without motion (no GSAP, or the visitor prefers less motion) ----------
  const removeOpening = () => {
    const l = $('.loader'), c = $('.curtain');
    if (l) l.remove();
    if (c) c.remove();
    root.classList.remove('is-loading');
  };
  if (!hasGsap || reduce) {
    removeOpening();
    return;
  }

  // =========================================================
  // Motion
  // =========================================================
  if (hasST) gsap.registerPlugin(ScrollTrigger);

  safe('lenis', () => {
    if (typeof window.Lenis === 'undefined' || !hasST) return;
    lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  });

  // ---------- Opening: greetings, then the page slides up, then the hero lands ----------
  safe('intro', () => {
    root.classList.add('is-loading');
    if (lenis) lenis.stop();

    const greetings = ['Halo', 'Hola', 'Bonjour', 'Ciao', 'Hallo', 'Hello'];
    const step = 0.32;
    const greet = $('#greet');

    gsap.set('.hero__title .line > span', { yPercent: 115 });
    gsap.set('.hrv', { opacity: 0, y: 24 });
    gsap.set('.polaroid', { y: -220, opacity: 0 });
    gsap.set('.polaroid .tape', { scale: 0 });

    const tl = gsap.timeline();
    greetings.forEach((g, i) => tl.call(() => { greet.textContent = g; }, null, i * step));
    tl.to('.loader__bar i', { scaleX: 1, duration: greetings.length * step, ease: 'power1.inOut' }, 0)
      .to('.loader', { yPercent: -100, duration: 1, ease: 'expo.inOut' }, greetings.length * step + 0.25)
      .to('.curtain', { yPercent: -100, duration: 1, ease: 'expo.inOut' }, '<0.12')
      .add(() => { root.classList.remove('is-loading'); if (lenis) lenis.start(); }, '-=0.55')
      .to('.hero__title .line > span', { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.12 }, '-=0.5')
      .to('.polaroid', { y: 0, opacity: 1, duration: 1.3, ease: 'back.out(1.25)' }, '<0.15')
      .to('.polaroid .tape', { scale: 1, duration: 0.5, ease: 'back.out(2.4)' }, '-=0.35')
      .to('.hrv', { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.12 }, '-=0.9')
      .from('.nav > *', { y: -20, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08 }, '-=1.1')
      .add(removeOpening);
  });

  // ---------- Band: keeps running, speeds up with scroll ----------
  safe('band', () => {
    const band = $('.band');
    const track = $('.band__track');
    if (!band || !track) return;
    band.classList.add('is-driven');
    let x = 0, half = 0, vel = 0, lastY = window.scrollY;
    const measure = () => { half = track.scrollWidth / 2; };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    gsap.ticker.add((time, delta) => {
      const dt = delta / 1000;
      const y = window.scrollY;
      const v = Math.min(Math.abs(y - lastY) / Math.max(dt, 0.001), 3000);
      lastY = y;
      vel += (v - vel) * 0.08;
      x -= (70 + vel * 0.25) * dt;
      if (half && x <= -half) x += half;
      gsap.set(track, { x });
    });
  });

  // ---------- Sheets: the one underneath settles back a little ----------
  safe('sheets', () => {
    if (!hasST) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px) and (min-height: 641px)', () => {
      const sheets = $$('.sheet');
      sheets.forEach((sheet, i) => {
        const next = sheets[i + 1];
        if (!next) return;
        gsap.to(sheet, {
          scale: 0.95, ease: 'none',
          scrollTrigger: { trigger: next, start: 'top 88%', end: 'top 22%', scrub: true }
        });
      });
    });
  });

  // ---------- Photo follows the pointer a little ----------
  if (fine) safe('tilt', () => {
    const polaroid = $('.polaroid');
    const hero = $('.hero');
    if (!polaroid || !hero) return;
    const rx = gsap.quickTo(polaroid, 'rotationX', { duration: 0.9, ease: 'power3' });
    const ry = gsap.quickTo(polaroid, 'rotationY', { duration: 0.9, ease: 'power3' });
    hero.addEventListener('mousemove', e => {
      const r = hero.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      ry(nx * 12);
      rx(-ny * 9);
    });
    hero.addEventListener('mouseleave', () => { rx(0); ry(0); });
  });

  // ---------- "Open" label that follows the pointer over certificates ----------
  if (fine) safe('follow', () => {
    const f = $('.follow');
    if (!f) return;
    const fx = gsap.quickTo(f, 'x', { duration: 0.35, ease: 'power3' });
    const fy = gsap.quickTo(f, 'y', { duration: 0.35, ease: 'power3' });
    window.addEventListener('mousemove', e => { fx(e.clientX); fy(e.clientY); }, { passive: true });
    const label = $('span', f);
    $$('[data-follow]').forEach(el => {
      el.addEventListener('mouseenter', () => { label.textContent = el.dataset.follow; f.classList.add('on'); });
      el.addEventListener('mouseleave', () => f.classList.remove('on'));
    });
  });

  // ---------- Keep scroll positions correct once fonts and images are in ----------
  if (hasST) {
    window.addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
})();