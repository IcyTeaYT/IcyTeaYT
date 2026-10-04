import { buildPhone, setPhoneColor, createViewer, COLORS } from './phone.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const gsap = window.gsap;
if (gsap && window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
const isPhone = () => matchMedia('(max-width: 734px)').matches;

/* ---------- Mobile menu ---------- */
const menuBtn = document.querySelector('.gnav__menu');
const menu = document.getElementById('mmenu');
menuBtn.addEventListener('click', () => {
  const open = menuBtn.getAttribute('aria-expanded') !== 'true';
  menuBtn.setAttribute('aria-expanded', String(open));
  menu.hidden = !open;
});

/* ---------- 3D: hero ---------- */
let heroPhone, viewPhone, viewPhone2, hero, view;
try {
  hero = createViewer(document.getElementById('heroCanvas'), { fov: 24, distance: 52, env: 0.32, keyLight: 1.5 });
  heroPhone = buildPhone('ember');
  hero.scene.add(heroPhone);

  // Pose: front, slightly turned, then turn to show the camera plateau as you scroll.
  const start = { ry: -0.32, rx: 0.08, y: 0.9, s: 0.66 };
  const end = { ry: Math.PI + 0.62, rx: 0.1, y: 1.4, s: 0.8 };
  const apply = (p) => {
    heroPhone.rotation.set(p.rx, p.ry, 0);
    heroPhone.position.y = p.y + (isPhone() ? 1.2 : 0);
    heroPhone.scale.setScalar(p.s * (isPhone() ? 0.78 : 1));
    hero.invalidate();
  };
  const pose = { ...start };
  apply(pose);
  addEventListener('resize', () => apply(pose));

  if (gsap && !reduced) {
    gsap.to(pose, {
      ...end, ease: 'none', onUpdate: () => apply(pose),
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: 0.6 },
    });
    // Beam fades as the phone turns away from it.
    gsap.to('.hero__beam', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: '40% top', scrub: true } });
  }
} catch (err) {
  console.warn('3D hero unavailable:', err);
}

/* ---------- 3D: product viewer ---------- */
const VIEWS = {
  colors: { ry: Math.PI + 0.55, rx: 0.06, x: 0, y: 0, s: 1, two: false, note: (c) => `Three finishes in anodised aluminium. ${COLORS[c].name} shown.` },
  sizes:  { ry: -0.18, rx: 0.04, x: 4.6, y: 0, s: 0.96, two: true, note: () => 'Nova 18 Pro has a 6.3" display. Nova 18 Pro Max has a 6.9" display. Same cameras on both.' },
  camera: { ry: Math.PI, rx: 0.1, x: 0, y: -5.4, s: 1.75, two: false, note: () => 'A full-width camera plateau, machined from the same piece of aluminium as the body.' },
  button: { ry: -Math.PI / 2 + 0.28, rx: 0.04, x: 0, y: 0, s: 1.05, two: false, note: () => 'Camera Control on the side: press to open, slide to zoom, light press to lock focus.' },
};
let currentColor = 'ember', currentView = 'colors';
try {
  view = createViewer(document.getElementById('viewCanvas'), { fov: 24, distance: 50 });
  viewPhone = buildPhone('ember');
  viewPhone2 = buildPhone('ember');
  viewPhone2.visible = false;
  view.scene.add(viewPhone, viewPhone2);

  const st = { ...VIEWS.colors, drag: 0 };
  const apply = () => {
    const k = isPhone() ? 0.82 : 1;
    viewPhone.rotation.set(st.rx, st.ry + st.drag, 0);
    viewPhone.position.set(st.two ? -st.x * k : 0, st.y, 0);
    viewPhone.scale.setScalar(st.s * k);
    viewPhone2.visible = st.two;
    viewPhone2.rotation.set(st.rx, st.ry + st.drag, 0);
    viewPhone2.position.set(st.x * k, -0.55, 0);
    viewPhone2.scale.setScalar(st.s * 0.91 * k);
    view.invalidate();
  };
  apply();
  addEventListener('resize', apply);

  const pills = [...document.querySelectorAll('.pill')];
  const note = document.getElementById('viewNote');
  const swatches = document.getElementById('swatches');
  const setView = (name) => {
    currentView = name;
    pills.forEach((p) => { const on = p.dataset.view === name; p.classList.toggle('is-on', on); p.setAttribute('aria-selected', String(on)); });
    note.textContent = VIEWS[name].note(currentColor);
    swatches.hidden = name !== 'colors';
    const target = { ...VIEWS[name], drag: 0 };
    st.two = target.two;
    if (gsap && !reduced) gsap.to(st, { ry: target.ry, rx: target.rx, x: target.x, y: target.y, s: target.s, drag: 0, duration: 0.9, ease: 'power3.inOut', onUpdate: apply });
    else { Object.assign(st, target); apply(); }
  };
  pills.forEach((p) => p.addEventListener('click', () => setView(p.dataset.view)));

  // Drag to turn the phone.
  const cv = document.getElementById('viewCanvas');
  let dragging = false, lastX = 0;
  cv.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; });
  cv.addEventListener('pointermove', (e) => { if (!dragging) return; st.drag += (e.clientX - lastX) * 0.01; lastX = e.clientX; apply(); });
  const stop = () => { dragging = false; cv.style.cursor = ''; };
  cv.addEventListener('pointerup', stop); cv.addEventListener('pointercancel', stop);

  // Finishes
  const sw = [...swatches.querySelectorAll('button')];
  sw.forEach((b) => b.addEventListener('click', () => {
    currentColor = b.dataset.color;
    sw.forEach((o) => o.setAttribute('aria-checked', String(o === b)));
    [viewPhone, viewPhone2, heroPhone].forEach((ph) => ph && setPhoneColor(ph, currentColor));
    note.textContent = VIEWS[currentView].note(currentColor);
    view.invalidate(); hero && hero.invalidate();
  }));
} catch (err) {
  console.warn('3D viewer unavailable:', err);
}

// Redraw the lock-screen wallpaper once Inter has loaded.
document.fonts.ready.then(() => { [heroPhone, viewPhone, viewPhone2].forEach((p) => p && setPhoneColor(p, currentColor)); hero && hero.invalidate(); view && view.invalidate(); });

/* ---------- Highlights carousel ---------- */
(() => {
  const track = document.getElementById('hlTrack');
  const cards = [...track.children];
  const dots = [...document.querySelectorAll('.hl__dots button')];
  const playBtn = document.getElementById('hlPlay');
  const root = document.getElementById('hl');
  let i = 0, timer, paused = reduced, hovering = false;

  const show = (n) => {
    i = (n + cards.length) % cards.length;
    const step = cards[1].offsetLeft - cards[0].offsetLeft;
    track.style.transform = `translateX(${-step * i}px)`;
    dots.forEach((d, k) => d.setAttribute('aria-selected', String(k === i)));
    cards.forEach((c, k) => c.setAttribute('aria-hidden', String(k !== i)));
  };
  const stop = () => { clearInterval(timer); timer = undefined; };
  const start = () => { stop(); if (!paused && !hovering && !document.hidden) timer = setInterval(() => show(i + 1), 5000); };
  const setPaused = (p) => {
    paused = p;
    playBtn.classList.toggle('is-paused', p);
    playBtn.setAttribute('aria-label', p ? 'Play highlights' : 'Pause highlights');
    start();
  };

  dots.forEach((d, k) => d.addEventListener('click', () => { show(k); start(); }));
  playBtn.addEventListener('click', () => setPaused(!paused));
  root.addEventListener('pointerenter', () => { hovering = true; stop(); });
  root.addEventListener('pointerleave', () => { hovering = false; start(); });
  root.addEventListener('focusin', stop);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  addEventListener('resize', () => show(i));

  // Swipe
  let x0 = null;
  track.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  track.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) { show(i + (dx < 0 ? 1 : -1)); start(); }
  });

  show(0);
  setPaused(paused);
})();

/* ---------- Most wanted: compare ---------- */
(() => {
  const DATA = {
    15: { hours: '14 more hours', cpu: '2.1x faster', light: '3x more' },
    16: { hours: '9 more hours', cpu: '40% faster', light: '2x more' },
    17: { hours: '6 more hours', cpu: '18% faster', light: '1.5x more' },
  };
  const sel = document.getElementById('cmpSelect');
  const nums = [...document.querySelectorAll('#cmpStats .stats__n')];
  sel.addEventListener('change', () => {
    nums.forEach((n) => { n.style.opacity = 0; });
    setTimeout(() => {
      nums.forEach((n) => { n.textContent = DATA[sel.value][n.dataset.k]; n.style.opacity = 1; });
    }, reduced ? 0 : 200);
  });
})();

/* ---------- Variable aperture ---------- */
(() => {
  const STOPS = {
    '1.4': { blur: '9px', clear: '34%', exp: 1.1, cap: '<strong>ƒ/1.4 Maximum light.</strong> The background melts away and your subject stands out.' },
    '2.8': { blur: '5px', clear: '46%', exp: 1.0, cap: '<strong>ƒ/2.8 Portrait.</strong> Soft background, with enough depth to keep the whole face sharp.' },
    '5.6': { blur: '2px', clear: '62%', exp: 0.94, cap: '<strong>ƒ/5.6 Street.</strong> Subject and surroundings both in focus.' },
    '8':   { blur: '0px', clear: '80%', exp: 0.88, cap: '<strong>ƒ/8 Landscape.</strong> Sharp from the nearest stone to the far wall.' },
  };
  const frame = document.getElementById('aperture');
  const cap = document.getElementById('fcap');
  const btns = [...document.querySelectorAll('.fstops button')];
  btns.forEach((b) => b.addEventListener('click', () => {
    const s = STOPS[b.dataset.f];
    frame.style.setProperty('--blur', s.blur);
    frame.style.setProperty('--clear', s.clear);
    frame.style.setProperty('--exp', s.exp);
    cap.innerHTML = s.cap;
    btns.forEach((o) => o.setAttribute('aria-checked', String(o === b)));
  }));
})();

/* ---------- Gallery arrows ---------- */
(() => {
  const track = document.getElementById('galTrack');
  const prev = document.getElementById('galPrev');
  const next = document.getElementById('galNext');
  const step = () => track.querySelector('figure').offsetWidth + 20;
  const sync = () => {
    prev.disabled = track.scrollLeft < 8;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
  };
  prev.addEventListener('click', () => track.scrollBy({ left: -step() }));
  next.addEventListener('click', () => track.scrollBy({ left: step() }));
  track.addEventListener('scroll', sync, { passive: true });
  addEventListener('resize', sync);
  sync();
})();
