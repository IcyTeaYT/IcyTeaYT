// Scroll-scrubbed footage: frame N of the night clip is drawn to a canvas
// based on how far the user has scrolled through #flight.
(() => {
  const FRAMES = 241;
  const section = document.getElementById('flight');
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const copy = document.getElementById('copy');
  const foot = document.getElementById('foot');
  const captions = [...document.querySelectorAll('#captions li')];
  const load = document.getElementById('load');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const set = matchMedia('(max-width: 700px)').matches ? 'sm' : 'lg';
  const src = (i) => `frames/${set}/${String(i + 1).padStart(3, '0')}.webp`;

  const images = new Array(FRAMES);
  let loaded = 0;
  let target = 0;   // frame the scroll position asks for
  let current = 0;  // frame actually drawn (eased toward target)
  let drawn = -1;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    drawn = -1;
  }

  // Nearest frame that has finished loading, so scrubbing never shows a blank.
  function nearestLoaded(i) {
    for (let d = 0; d < FRAMES; d++) {
      if (images[i - d]?.complete && images[i - d].naturalWidth) return images[i - d];
      if (images[i + d]?.complete && images[i + d].naturalWidth) return images[i + d];
    }
    return null;
  }

  function draw(i) {
    const img = nearestLoaded(i);
    if (!img) return;
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight); // cover
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  function progress() {
    const r = section.getBoundingClientRect();
    const span = section.offsetHeight - window.innerHeight;
    return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
  }

  function onScroll() {
    const p = progress();
    target = p * (FRAMES - 1);
    // Title and footer fade out over the first 15% of the flight.
    const fade = Math.max(0, 1 - p / 0.15);
    copy.style.opacity = fade;
    copy.style.transform = `translateY(${(1 - fade) * -24}px)`;
    foot.style.opacity = fade;
    foot.style.pointerEvents = fade > 0.1 ? '' : 'none';
    // One caption at a time, from its data-at point until the next one.
    captions.forEach((li, k) => {
      const at = +li.dataset.at, next = captions[k + 1] ? +captions[k + 1].dataset.at : 1.01;
      li.classList.toggle('is-on', p >= at && p < next);
    });
  }

  function tick() {
    current += (target - current) * 0.18;
    if (Math.abs(target - current) < 0.01) current = target;
    const f = Math.round(current);
    if (f !== drawn) { draw(f); drawn = f; }
    requestAnimationFrame(tick);
  }

  if (reduced) return; // keep the static first frame (<img>) and no scrubbing

  // Load frame 1 first, then spread the rest so any scroll position fills in early.
  const order = [0];
  const seen = new Set(order);
  for (let step = 128; step >= 1; step = Math.floor(step / 2)) {
    for (let i = 0; i < FRAMES; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
  }
  const queue = order.slice();
  const CONCURRENCY = 8;
  function next() {
    const i = queue.shift();
    if (i === undefined) return;
    const img = new Image();
    img.decoding = 'async';
    img.onload = img.onerror = () => {
      loaded++;
      load.firstElementChild.style.width = `${(loaded / FRAMES) * 100}%`;
      if (loaded === FRAMES) load.classList.add('is-done');
      if (i === 0) { section.classList.add('is-ready'); drawn = -1; }
      next();
    };
    img.src = src(i);
    images[i] = img;
  }
  for (let k = 0; k < CONCURRENCY; k++) next();

  resize();
  onScroll();
  window.addEventListener('resize', () => { resize(); onScroll(); });
  window.addEventListener('scroll', onScroll, { passive: true });
  requestAnimationFrame(tick);
})();
