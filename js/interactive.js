// ================================================================
// interactive.js — Živ demo e-cenika, kalkulator prihrankov,
// prej/potem primerjava, magnetni gumb in cursor-glow v hero sekciji.
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
  initHeroDemo();
  initSavingsCalculator();
  initCompareSlider();
  initMagneticButton();
  initHeroCursorGlow();
});

function formatEUR(amount) {
  return amount.toLocaleString('sl-SI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function bumpElement(el) {
  el.classList.remove('bump');
  void el.offsetWidth; // ponovno sproži animacijo
  el.classList.add('bump');
}

// ── Naloga 1: živ interaktiven e-cenik ─────────────────────────
const HERO_DEMO_ITEMS = [
  { name: 'Kava',        price: 1.20 },
  { name: 'Cappuccino',  price: 1.80 },
  { name: 'Burek',       price: 2.50 },
  { name: 'Sok',         price: 2.00 },
];

function initHeroDemo() {
  const itemsWrap = document.getElementById('heroDemoItems');
  const totalEl   = document.getElementById('heroDemoTotal');
  if (!itemsWrap || !totalEl) return;

  const qty = HERO_DEMO_ITEMS.map(() => 0);

  itemsWrap.innerHTML = HERO_DEMO_ITEMS.map((item, i) => `
    <div class="hero-demo-item">
      <div class="hero-demo-item-info">
        <span class="hero-demo-item-name">${item.name}</span>
        <span class="hero-demo-item-price">${formatEUR(item.price)}</span>
      </div>
      <div class="hero-demo-qty">
        <button type="button" class="hero-demo-qty-btn" data-index="${i}" data-action="dec" aria-label="Zmanjšaj količino — ${item.name}">−</button>
        <span class="hero-demo-qty-value" id="heroDemoQty${i}" aria-live="polite">0</span>
        <button type="button" class="hero-demo-qty-btn" data-index="${i}" data-action="inc" aria-label="Povečaj količino — ${item.name}">+</button>
      </div>
    </div>
  `).join('');

  itemsWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.hero-demo-qty-btn');
    if (!btn) return;

    const i = Number(btn.dataset.index);
    if (btn.dataset.action === 'inc') {
      qty[i] = Math.min(qty[i] + 1, 99);
    } else {
      qty[i] = Math.max(qty[i] - 1, 0);
    }

    document.getElementById(`heroDemoQty${i}`).textContent = qty[i];
    updateHeroDemoTotal(qty, totalEl);
  });

  updateHeroDemoTotal(qty, totalEl);
}

function updateHeroDemoTotal(qty, totalEl) {
  const total = HERO_DEMO_ITEMS.reduce((sum, item, i) => sum + item.price * qty[i], 0);
  totalEl.textContent = formatEUR(total);
  bumpElement(totalEl);
}

// ── Naloga 2: kalkulator prihrankov ────────────────────────────
function initSavingsCalculator() {
  const printCount    = document.getElementById('savingsPrintCount');
  const printCountNum = document.getElementById('savingsPrintCountNum');
  const copies        = document.getElementById('savingsCopies');
  const copiesNum     = document.getElementById('savingsCopiesNum');
  const cost          = document.getElementById('savingsCost');
  const costNum       = document.getElementById('savingsCostNum');
  const amountEl      = document.getElementById('savingsAmount');
  if (!printCount || !amountEl) return;

  const pairs = [
    [printCount, printCountNum],
    [copies, copiesNum],
    [cost, costNum],
  ];

  pairs.forEach(([range, num]) => {
    range.addEventListener('input', () => {
      num.value = range.value;
      update();
    });
    num.addEventListener('input', () => {
      const v = parseFloat(num.value);
      if (Number.isNaN(v)) return;
      range.value = Math.min(Math.max(v, Number(range.min)), Number(range.max));
      update();
    });
  });

  function update() {
    const total = Number(printCount.value) * Number(copies.value) * Number(cost.value);
    amountEl.textContent = formatEUR(total);
    bumpElement(amountEl);
  }

  update();
}

// ── Bonus: prej/potem primerjava (papir proti QR e-ceniku) ──────
// Preprost, deterministični vzorec, ki je videti kot QR koda — ni
// dejansko berljiva koda, gre le za vizualni prikaz.
const QR_FAKE_PATTERN = [
  1,1,1,1,1,0,1,0,1,1,1,1,1,
  1,0,0,0,1,0,0,0,0,0,1,0,1,
  1,0,1,0,1,0,1,1,0,1,1,0,1,
  1,0,1,0,1,0,0,0,1,0,0,0,1,
  1,0,0,0,1,0,1,0,0,1,1,0,1,
  0,0,0,0,0,0,0,1,1,0,0,0,0,
  1,1,0,1,1,1,0,0,1,1,0,1,1,
  0,0,0,0,0,0,1,0,0,0,1,0,0,
  1,0,1,1,0,1,0,1,1,0,1,1,1,
  1,0,0,0,1,0,1,0,0,0,0,0,1,
  1,1,1,0,1,1,0,1,1,0,1,0,1,
  1,0,0,0,0,0,1,0,0,0,1,0,0,
  1,1,1,1,1,0,1,1,0,1,1,1,1,
];

function initCompareSlider() {
  const widget    = document.getElementById('compareWidget');
  const beforePane = document.getElementById('compareBeforePane');
  const divider   = document.getElementById('compareDivider');
  const range     = document.getElementById('compareRange');
  const qrSvg     = widget?.querySelector('.compare-qr');
  if (!widget || !beforePane || !divider || !range) return;

  if (qrSvg) {
    const size = 13;
    qrSvg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    qrSvg.innerHTML = QR_FAKE_PATTERN
      .map((on, i) => on ? `<rect x="${i % size}" y="${Math.floor(i / size)}" width="1" height="1" fill="currentColor"/>` : '')
      .join('');
  }

  // "Prej" (papir) je zgornja plast — obrezana od desne, tako ostane
  // vidna na levi glede na položaj drsnika; "Potem" je spodnja plast
  // na celotni širini, vidna povsod, kjer je papir ne prekriva.
  const update = () => {
    const val = Number(range.value);
    beforePane.style.clipPath = `inset(0 ${100 - val}% 0 0)`;
    divider.style.left = `${val}%`;
  };

  range.addEventListener('input', update);
  update();
}

// ── Naloga 3: magnetni gumb ─────────────────────────────────────
function initMagneticButton() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const wrap = document.getElementById('magneticWrap');
  const btn  = wrap?.querySelector('.btn');
  if (!wrap || !btn) return;

  const PULL = 0.22;

  wrap.addEventListener('mousemove', (e) => {
    const rect = wrap.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * PULL}px, ${y * PULL}px)`;
  });

  wrap.addEventListener('mouseleave', () => {
    btn.style.transform = 'translate(0, 0)';
  });
}

// ── Naloga 3: cursor-glow ozadje v hero sekciji ─────────────────
function initHeroCursorGlow() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const hero = document.querySelector('.hero');
  const glow = document.getElementById('heroCursorGlow');
  if (!hero || !glow) return;

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    glow.style.left = `${e.clientX - rect.left}px`;
    glow.style.top  = `${e.clientY - rect.top}px`;
    glow.classList.add('active');
  });

  hero.addEventListener('mouseleave', () => {
    glow.classList.remove('active');
  });
}
