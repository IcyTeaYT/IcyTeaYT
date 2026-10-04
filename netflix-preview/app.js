// Reelhouse preview: a fictional catalogue. Images are stock photos from picsum.photos.
const TITLES = [
  { slug: 'long-coast', title: 'The Long Coast', year: 2025, rating: '16+', genre: 'Drama', desc: 'Two sisters inherit a failing seaside hotel and one very strange guest.' },
  { slug: 'paper-kings', title: 'Paper Kings', year: 2024, rating: '13+', genre: 'Comedy', desc: 'A school newspaper accidentally breaks the biggest story in town.' },
  { slug: 'night-shift', title: 'Night Shift', year: 2025, rating: '18+', genre: 'Thriller', desc: 'A hospital porter notices patients going missing between midnight and 4 a.m.' },
  { slug: 'saltwater', title: 'Saltwater', year: 2023, rating: '16+', genre: 'Mystery', desc: 'A diver finds a car at the bottom of the harbour with the engine still warm.' },
  { slug: 'atlas-road', title: 'Atlas Road', year: 2025, rating: '13+', genre: 'Adventure', desc: 'Four friends, one van, and a map that keeps changing.' },
  { slug: 'glass-harbor', title: 'Glass Harbor', year: 2024, rating: '16+', genre: 'Crime', desc: 'A detective returns to the town she swore she would never see again.' },
  { slug: 'ember', title: 'Ember', year: 2025, rating: '7+', genre: 'Family', desc: 'A young dragon is afraid of fire. Her village is afraid of the cold.' },
  { slug: 'north-of-nowhere', title: 'North of Nowhere', year: 2023, rating: '13+', genre: 'Documentary', desc: 'A year inside the most remote school on the planet.' },
  { slug: 'quiet-year', title: 'The Quiet Year', year: 2024, rating: '16+', genre: 'Sci-Fi', desc: 'The day every phone on Earth stopped working, and the year that followed.' },
  { slug: 'low-tide', title: 'Low Tide', year: 2025, rating: '18+', genre: 'Horror', desc: 'When the sea goes out and does not come back, something else does.' },
];

const FAQ = [
  ['What is Reelhouse?', ['Reelhouse is a streaming service that offers a wide variety of series, films, anime, documentaries, and more on thousands of internet-connected devices.', 'You can watch as much as you want, whenever you want without a single commercial, all for one low monthly price.']],
  ['How much does Reelhouse cost?', ['Watch Reelhouse on your smartphone, tablet, smart TV, laptop, or streaming device, all for one fixed monthly fee. Plans range from $7.99 to $24.99 a month. No extra costs, no contracts.']],
  ['Where can I watch?', ['Watch anywhere, anytime. Sign in with your account on the web or on any internet-connected device that offers the Reelhouse app.', 'You can also download your favorite shows with the iOS or Android app and watch on the go.']],
  ['How do I cancel?', ['Reelhouse is flexible. There are no annoying contracts and no commitments. You can cancel your account online in two clicks. No cancellation fees.']],
  ['What can I watch on Reelhouse?', ['Reelhouse has an extensive library of feature films, documentaries, series, anime, award-winning originals, and more.']],
  ['Is Reelhouse good for kids?', ['The Kids experience is included in your membership to give parents control while kids enjoy family-friendly series and films in their own space.', 'Kids profiles come with PIN-protected parental controls.']],
];

const img = (seed, w, h) => `https://picsum.photos/seed/reelhouse-${seed}/${w}/${h}`;

// Hero poster wall
const wall = document.getElementById('wall');
const wallFrag = document.createDocumentFragment();
for (let i = 0; i < 84; i++) {
  const el = document.createElement('img');
  el.src = img(`wall${i}`, 220, 330);
  el.alt = '';
  el.loading = i < 42 ? 'eager' : 'lazy';
  wallFrag.append(el);
}
wall.append(wallFrag);

// Trending row
const list = document.getElementById('trending');
TITLES.forEach((t, i) => {
  const li = document.createElement('li');
  li.className = 'trending__item';
  li.innerHTML = `
    <button class="poster" type="button" aria-label="${t.title}, ranked ${i + 1}">
      <img src="${img(t.slug, 360, 500)}" alt="" loading="lazy">
      <span class="poster__badge" aria-hidden="true">R</span>
      <span class="poster__title" aria-hidden="true">${t.title}</span>
    </button>
    <span class="rank" aria-hidden="true">${i + 1}</span>`;
  li.querySelector('.poster').addEventListener('click', () => openTitle(t));
  list.append(li);
});

const prev = document.querySelector('.trending__nav--prev');
const next = document.querySelector('.trending__nav--next');
const page = () => list.clientWidth - 40;
prev.addEventListener('click', () => list.scrollBy({ left: -page() }));
next.addEventListener('click', () => list.scrollBy({ left: page() }));
const syncNav = () => {
  prev.hidden = list.scrollLeft < 8;
  next.hidden = list.scrollLeft + list.clientWidth >= list.scrollWidth - 8;
};
list.addEventListener('scroll', syncNav, { passive: true });
window.addEventListener('resize', syncNav);
syncNav();

// Title modal
const modal = document.getElementById('modal');
function openTitle(t) {
  modal.querySelector('.modal__img').src = img(t.slug, 726, 408);
  modal.querySelector('.modal__title').textContent = t.title;
  modal.querySelector('.modal__meta').textContent = `${t.year} · ${t.rating} · ${t.genre}`;
  modal.querySelector('.modal__desc').textContent = t.desc;
  modal.showModal();
}
modal.querySelector('.modal__close').addEventListener('click', () => modal.close());
modal.querySelector('.modal__cta').addEventListener('click', () => { modal.close(); document.getElementById('email1').focus(); });
modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });

// FAQ accordion: one open at a time
const faq = document.getElementById('faq');
FAQ.forEach(([q, answers], i) => {
  const li = document.createElement('li');
  li.className = 'faq__item';
  li.innerHTML = `
    <button class="faq__q" type="button" aria-expanded="false" aria-controls="faq-a${i}" id="faq-q${i}">
      <h3>${q}</h3>
      <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true"><path fill="currentColor" d="M17 17V3h2v14h14v2H19v14h-2V19H3v-2h14Z"/></svg>
    </button>
    <div class="faq__a" id="faq-a${i}" role="region" aria-labelledby="faq-q${i}"><div>${answers.map(a => `<p>${a}</p>`).join('')}</div></div>`;
  li.querySelector('.faq__q').addEventListener('click', () => {
    const open = li.classList.contains('is-open');
    faq.querySelectorAll('.faq__item.is-open').forEach(o => { o.classList.remove('is-open'); o.querySelector('.faq__q').setAttribute('aria-expanded', 'false'); });
    if (!open) { li.classList.add('is-open'); li.querySelector('.faq__q').setAttribute('aria-expanded', 'true'); }
  });
  faq.append(li);
});

// Email forms
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
document.querySelectorAll('form.signup').forEach(form => {
  const field = form.querySelector('.field');
  const input = form.querySelector('input');
  const error = form.querySelector('.field__error');
  const btn = form.querySelector('button[type=submit]');
  const check = () => {
    const v = input.value.trim();
    const msg = !v ? 'Email is required.' : !EMAIL.test(v) ? 'Please enter a valid email address.' : '';
    field.classList.toggle('is-invalid', !!msg);
    error.textContent = msg;
    return !msg;
  };
  input.addEventListener('input', () => { if (field.classList.contains('is-invalid')) check(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!check()) { input.focus(); return; }
    btn.firstChild.textContent = 'Check your inbox ';
    btn.disabled = true;
  });
});

// Language toggle (hero copy only, to show the control works)
const STRINGS = {
  en: { h1: 'Unlimited films, series, and more', sub: 'Starts at $7.99. Cancel anytime.', ready: 'Ready to watch? Enter your email to create or restart your membership.', email: 'Email address', start: 'Get Started' },
  es: { h1: 'Películas y series ilimitadas y mucho más', sub: 'A partir de $7.99. Cancela cuando quieras.', ready: '¿Quieres ver algo ya? Ingresa tu email para crear una membresía o reiniciar la tuya.', email: 'Email', start: 'Comenzar' },
};
const selects = document.querySelectorAll('.lang-select');
selects.forEach(sel => sel.addEventListener('change', (e) => {
  const lang = e.target.value, s = STRINGS[lang];
  selects.forEach(o => { o.value = lang; });
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = s[el.dataset.i18n]; });
}));
