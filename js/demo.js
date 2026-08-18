// ================================================================
// demo.js — /demo: pregled demo lokalov (cenik sistem)
// ----------------------------------------------------------------------------
// Zaščiteno z isto Supabase Auth prijavo kot /admin (supabaseClient iz
// supabase-config.js, epo.si projekt). Podatki o demo lokalih pa NE živijo v
// epo.si bazi, ampak v LOČENEM Supabase projektu, ki ga uporablja "cenik"
// sistem (glej repozitorij zanpod/cenik). Zato tu ustvarimo drug,
// samostojen Supabase klient z JAVNIM (anon) ključem tistega projekta — enak
// ključ, kot ga cenik sam uporablja v svojem js/supabase-config.js za
// prikaz menija gostom. RLS na tenants dovoljuje javno branje aktivnih
// lokalov, zato to ni nov varnostni izpostavljen podatek.
//
// Vrednosti lahko po potrebi preglasite (npr. Netlify snippet injection):
//   window.EPO_DEMO_SUPABASE_URL, window.EPO_DEMO_SUPABASE_ANON_KEY,
//   window.EPO_DEMO_APP_DOMAIN
// ================================================================

const DEMO_SUPABASE_URL = window.EPO_DEMO_SUPABASE_URL || 'https://mctepmjamozqlihbpmrs.supabase.co';
const DEMO_SUPABASE_ANON_KEY = window.EPO_DEMO_SUPABASE_ANON_KEY || 'sb_publishable_PQQcL8a12OPY6_Zxgk3fJg_ULsSwJvZ';
const DEMO_APP_DOMAIN = (window.EPO_DEMO_APP_DOMAIN || 'https://agencijaepo.si').replace(/\/+$/, '');

const demoClient = window.supabase.createClient(DEMO_SUPABASE_URL, DEMO_SUPABASE_ANON_KEY);

// Edge Functions (cenik projekt) — glej supabase/functions/provision-demo in
// delete-demo v repozitoriju cenik. Pišejo v bazo s service role, mimo RLS;
// avtorizirajo klicatelja proti TEJ (epo.si) prijavi prek X-Epo-Auth glave.
const PROVISION_URL = `${DEMO_SUPABASE_URL}/functions/v1/provision-demo`;
const DELETE_URL = `${DEMO_SUPABASE_URL}/functions/v1/delete-demo`;

let demoTenants = [];

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});

// ── Auth (enako kot /admin) ────────────────────────────────────
async function checkAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    showDemoPage();
  } else {
    showLogin();
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session) {
      showDemoPage();
    } else {
      showLogin();
    }
  });
}

function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('demoPage').style.display = 'none';
}

function showDemoPage() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('demoPage').style.display = 'block';
  loadDemos();
}

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  const error = document.getElementById('loginError');
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPassword').value;

  error.classList.remove('show');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Prijavljam…';

  const { error: authError } = await supabaseClient.auth.signInWithPassword({ email, password: pass });

  if (authError) {
    error.textContent = authError.message;
    error.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Prijava';
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
});

// ── Nalaganje demo lokalov ──────────────────────────────────────
async function loadDemos() {
  const loading = document.getElementById('demoLoading');
  const errorBox = document.getElementById('demoError');
  loading.style.display = 'flex';
  errorBox.classList.remove('error');
  errorBox.textContent = '';

  const { data, error } = await demoClient
    .from('tenants')
    .select('id, slug, name, logo_url, primary_color, created_at, tables(qr_code_token, table_number, label, is_active)')
    .eq('is_demo', true)
    .order('created_at', { ascending: false });

  loading.style.display = 'none';

  if (error) {
    errorBox.textContent = `Napaka pri nalaganju demo lokalov: ${error.message}`;
    errorBox.classList.add('error');
    return;
  }

  demoTenants = data || [];
  renderGrid(demoTenants);
}

document.getElementById('refreshBtn')?.addEventListener('click', loadDemos);
document.getElementById('demoSearch')?.addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  const filtered = !q
    ? demoTenants
    : demoTenants.filter((t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q));
  renderGrid(filtered);
});

// ── Izris mreže kartic ──────────────────────────────────────────
function mainTable(tenant) {
  const active = (tenant.tables || []).filter((t) => t.is_active !== false);
  const pool = active.length ? active : (tenant.tables || []);
  return pool.sort((a, b) => a.table_number - b.table_number)[0] || null;
}

function menuUrl(tenant, table) {
  return `${DEMO_APP_DOMAIN}/menu/${tenant.slug}?table=${table.qr_code_token}`;
}

function renderGrid(list) {
  const grid = document.getElementById('demoGrid');
  const empty = document.getElementById('demoEmpty');

  if (!list.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = list.map((t) => {
    const table = mainTable(t);
    const link = table ? menuUrl(t, table) : null;
    const created = new Date(t.created_at).toLocaleDateString('sl-SI', { day: 'numeric', month: 'long', year: 'numeric' });
    const logo = t.logo_url
      ? `<img class="demo-card-logo" src="${escHtml(t.logo_url)}" alt="">`
      : `<span class="demo-card-logo demo-card-logo-dot" style="background:${escHtml(t.primary_color || '#4a7fe0')}">${escHtml((t.name || '?').charAt(0).toUpperCase())}</span>`;

    return `
      <div class="demo-card glass" data-slug="${escHtml(t.slug)}">
        <div class="demo-card-head">
          ${logo}
          <div>
            <div class="demo-card-name">${escHtml(t.name)}</div>
            <div class="demo-card-slug">${escHtml(t.slug)}</div>
          </div>
        </div>
        <div class="demo-card-meta">Ustvarjen: ${created} · ${(t.tables || []).length} miz</div>
        ${link ? `
          <div class="demo-card-link" title="${escHtml(link)}">${escHtml(link)}</div>
          <div class="demo-card-actions">
            <button class="btn btn-sm btn-ghost" data-copy="${escHtml(link)}">📋 Kopiraj</button>
            <a class="btn btn-sm btn-ghost" href="${escHtml(link)}" target="_blank" rel="noopener">Odpri ↗</a>
            <button class="btn btn-sm btn-ghost" data-qr="${escHtml(t.slug)}">▦ QR</button>
            <button class="btn btn-sm btn-danger" data-delete="${escHtml(t.slug)}">🗑 Izbriši</button>
          </div>
          <div class="demo-qr-wrap hidden" id="qr-${escHtml(t.slug)}"></div>
        ` : `
          <div class="demo-card-meta" style="color:var(--error)">Ni miz.</div>
          <div class="demo-card-actions">
            <button class="btn btn-sm btn-danger" data-delete="${escHtml(t.slug)}">🗑 Izbriši</button>
          </div>`}
      </div>`;
  }).join('');

  grid.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => copyLink(btn.dataset.copy, btn));
  });
  grid.querySelectorAll('[data-qr]').forEach((btn) => {
    btn.addEventListener('click', () => toggleQr(btn.dataset.qr));
  });
  grid.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteDemo(btn.dataset.delete, btn));
  });
}

// ── Brisanje demota ──────────────────────────────────────────────
async function deleteDemo(slug, btn) {
  const tenant = demoTenants.find((t) => t.slug === slug);
  if (!confirm(`Izbrišem demo "${tenant?.name || slug}" in VSE njegove podatke (kategorije, izdelki, mize, naročila)? Tega ni mogoče razveljaviti.`)) {
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Brišem…';
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const res = await fetch(DELETE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEMO_SUPABASE_ANON_KEY}`,
        'apikey': DEMO_SUPABASE_ANON_KEY,
        'X-Epo-Auth': session?.access_token || '',
      },
      body: JSON.stringify({ slug }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `Napaka (${res.status})`);
    toast(`Demo "${result.name}" izbrisan.`, 'success');
    loadDemos();
  } catch (err) {
    toast(`Napaka pri brisanju: ${err.message}`, 'error');
    btn.disabled = false;
    btn.textContent = '🗑 Izbriši';
  }
}

async function copyLink(link, btn) {
  try {
    await navigator.clipboard.writeText(link);
    toast('Povezava kopirana.', 'success');
    const orig = btn.textContent;
    btn.textContent = '✓ Kopirano';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  } catch {
    toast('Kopiranje ni uspelo — povezavo označite ročno.', 'error');
  }
}

function toggleQr(slug) {
  const tenant = demoTenants.find((t) => t.slug === slug);
  const table = tenant && mainTable(tenant);
  const host = document.getElementById(`qr-${slug}`);
  if (!tenant || !table || !host) return;

  const isOpen = !host.classList.contains('hidden');
  if (isOpen) {
    host.classList.add('hidden');
    host.innerHTML = '';
    return;
  }

  host.innerHTML = '';
  new QRCode(host, {
    text: menuUrl(tenant, table),
    width: 180,
    height: 180,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H,
  });
  const dl = document.createElement('a');
  dl.className = 'btn btn-sm btn-ghost demo-qr-download';
  dl.textContent = '⬇ Prenesi PNG';
  dl.href = '#';
  dl.addEventListener('click', (e) => {
    e.preventDefault();
    const canvas = host.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `qr-${slug}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  });
  host.appendChild(dl);
  host.classList.remove('hidden');
}

// ── Pomožno ───────────────────────────────────────────────────
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function toast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Modal: Nov demo ──────────────────────────────────────────────
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

document.getElementById('newDemoBtn')?.addEventListener('click', () => {
  document.getElementById('demoForm').reset();
  document.getElementById('catBuilder').innerHTML = '';
  document.getElementById('demoFormError').classList.remove('show');
  addCategoryRow();
  openModal('demoModal');
});
document.getElementById('demoModalClose')?.addEventListener('click', () => closeModal('demoModal'));

// ── Obrazec: kategorije/izdelki (DOM je vir resnice) ──────────────
function addCategoryRow() {
  const wrap = document.createElement('div');
  wrap.className = 'cat-builder-row';
  wrap.innerHTML = `
    <div class="cat-builder-head">
      <input class="form-input cat-name" placeholder="Ime kategorije (npr. Tople pijače)">
      <input class="form-input cat-icon" placeholder="☕" maxlength="8">
      <button type="button" class="btn btn-sm btn-danger" data-remove-cat aria-label="Odstrani kategorijo">🗑</button>
    </div>
    <div class="item-builder-list"></div>
    <button type="button" class="btn btn-ghost btn-sm" data-add-item>＋ Dodaj izdelek</button>`;
  document.getElementById('catBuilder').appendChild(wrap);
  wrap.querySelector('[data-remove-cat]').addEventListener('click', () => wrap.remove());
  wrap.querySelector('[data-add-item]').addEventListener('click', () => addItemRow(wrap));
  addItemRow(wrap);
}

function addItemRow(catWrap) {
  const row = document.createElement('div');
  row.className = 'item-builder-row';
  row.innerHTML = `
    <input class="form-input item-name" placeholder="Ime izdelka (npr. Cappuccino)">
    <input class="form-input item-price" type="number" step="0.01" min="0" placeholder="Cena €">
    <button type="button" class="btn btn-sm btn-danger" data-remove-item aria-label="Odstrani izdelek">✕</button>`;
  catWrap.querySelector('.item-builder-list').appendChild(row);
  row.querySelector('[data-remove-item]').addEventListener('click', () => row.remove());
}

document.getElementById('addCatBtn')?.addEventListener('click', addCategoryRow);

function readFormCategories() {
  return Array.from(document.querySelectorAll('.cat-builder-row')).map((wrap) => {
    const name = wrap.querySelector('.cat-name').value.trim();
    const icon = wrap.querySelector('.cat-icon').value.trim();
    const items = Array.from(wrap.querySelectorAll('.item-builder-row'))
      .map((row) => ({
        name: row.querySelector('.item-name').value.trim(),
        price: parseFloat(row.querySelector('.item-price').value),
      }))
      .filter((it) => it.name && !isNaN(it.price));
    return { name, icon, items };
  }).filter((c) => c.name);
}

// ── Oddaja obrazca → provision-demo Edge Function ─────────────────
document.getElementById('demoForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('demoFormSubmit');
  const errBox = document.getElementById('demoFormError');
  errBox.classList.remove('show');

  const payload = {
    slug: document.getElementById('fSlug').value.trim(),
    name: document.getElementById('fName').value.trim(),
    primary_color: document.getElementById('fPrimary').value,
    secondary_color: document.getElementById('fSecondary').value,
    logo_url: document.getElementById('fLogo').value.trim(),
    tables: parseInt(document.getElementById('fTables').value, 10) || 4,
    categories: readFormCategories(),
  };

  if (!payload.slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(payload.slug)) {
    errBox.textContent = 'Slug sme vsebovati le male črke, številke in vezaje (npr. "kavarna-vahtnca").';
    errBox.classList.add('show');
    return;
  }

  const origText = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Ustvarjam…';

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const res = await fetch(PROVISION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEMO_SUPABASE_ANON_KEY}`,
        'apikey': DEMO_SUPABASE_ANON_KEY,
        'X-Epo-Auth': session?.access_token || '',
      },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `Napaka (${res.status})`);

    closeModal('demoModal');
    toast(`Demo "${payload.name}" pripravljen.`, 'success');
    loadDemos();
  } catch (err) {
    errBox.textContent = err.message;
    errBox.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.textContent = origText;
  }
});
