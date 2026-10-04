// Scroll-scrubbed image sequence. No dependencies.
// Markup:
//   <section class="seq" data-frames="241" data-src-lg="frames/lg/{n}.webp" data-src-sm="frames/sm/{n}.webp" style="height:400vh">
//     <div class="seq__stage"><canvas class="seq__canvas" data-media></canvas> ...overlay content... </div>
//   </section>
// {n} is the 1-based frame number, zero-padded to 3 digits (frames.sh output). Optional: data-pad="4", data-breakpoint="700".
// Emits a "seq:progress" event on the section with detail.progress (0..1) for fading overlay text.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.seq[data-frames]').forEach((section) => {
    const N = Number(section.dataset.frames);
    const pad = Number(section.dataset.pad || 3);
    const bp = Number(section.dataset.breakpoint || 700);
    const tpl = matchMedia(`(max-width: ${bp}px)`).matches && section.dataset.srcSm ? section.dataset.srcSm : section.dataset.srcLg;
    const src = (i) => tpl.replace('{n}', String(i + 1).padStart(pad, '0'));
    const canvas = section.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const images = new Array(N);
    let target = 0, current = 0, drawn = -1;

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 3);   // native density: sharp on phones and retina
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      drawn = -1;
    };
    const nearest = (i) => {
      for (let d = 0; d < N; d++) {
        for (const k of [i - d, i + d]) { const im = images[k]; if (im && im.complete && im.naturalWidth) return im; }
      }
      return null;
    };
    const draw = (i) => {
      const im = nearest(i); if (!im) return;
      const cw = canvas.width, ch = canvas.height, s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
      const w = im.naturalWidth * s, h = im.naturalHeight * s;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
    };
    const progress = () => {
      const span = section.offsetHeight - innerHeight;
      return span > 0 ? Math.min(1, Math.max(0, -section.getBoundingClientRect().top / span)) : 0;
    };
    const onScroll = () => {
      const p = progress();
      target = p * (N - 1);
      section.dispatchEvent(new CustomEvent('seq:progress', { detail: { progress: p } }));
    };
    const tick = () => {
      current += (target - current) * 0.18;
      if (Math.abs(target - current) < 0.01) current = target;
      const f = Math.round(current);
      if (f !== drawn) { draw(f); drawn = f; }
      requestAnimationFrame(tick);
    };

    // Frame 1 first, then a coarse-to-fine order so any scroll position fills in early.
    const order = [0], seen = new Set(order);
    for (let step = 2 ** Math.ceil(Math.log2(N)); step >= 1; step >>= 1)
      for (let i = 0; i < N; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
    const load = (i) => new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = im.onerror = res; im.src = src(i); images[i] = im; });
    const queue = order.slice();
    const worker = async () => { while (queue.length) { const i = queue.shift(); await load(i); if (i === 0 || i === Math.round(target)) drawn = -1; } };

    resize();
    if (reduced) { load(0).then(() => draw(0)); addEventListener('resize', () => { resize(); draw(0); }); return; }
    for (let k = 0; k < 8; k++) worker();
    onScroll();
    addEventListener('resize', () => { resize(); onScroll(); });
    addEventListener('scroll', onScroll, { passive: true });
    requestAnimationFrame(tick);
  });
})();
