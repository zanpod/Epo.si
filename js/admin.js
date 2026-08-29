// ================================================================
// admin.js — Admin panel
// ================================================================

let currentSection = 'dashboard';
let skillsList = [];
let statsList  = [];
let adminInitialized = false;

// Ujema se s statičnim privzetkom v index.html (#skillsWrap / #statsWrap),
// ki se prikaže na javni strani, dokler polji "skills"/"stats" v bazi nista
// nastavljeni. Če ju admin editor ob praznem stanju pusti prazna, izgleda,
// kot da vsebine sploh ni mogoče urejati — zato ju tu predizpolnimo z enako
// vsebino, da urednik vidi in lahko spremeni to, kar je dejansko objavljeno.
const DEFAULT_SKILLS = ['Hitro nalaganje', 'Varno gostovanje (SSL)', 'Prilagojeno mobilnim napravam', 'Enostavno urejanje vsebine', 'Slovenska podpora', 'Brez skritih stroškov', 'Redne posodobitve', 'SEO prijazno'];
const DEFAULT_STATS = [
  { number: '5+',  label: 'Let izkušenj' },
  { number: '50+', label: 'Zaključenih projektov' },
  { number: '30+', label: 'Zadovoljnih strank' },
  { number: '99%', label: 'Zadovoljstvo strank' },
];

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});

// ── Auth ──────────────────────────────────────────────────────
async function checkAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    showDashboard();
  } else {
    showLogin();
  }

  // Supabase sproži ta dogodek tudi ob vsakem osvežitvi žetona (npr. ko
  // zavihek spet postane viden), ne le ob dejanski prijavi/odjavi — zato
  // adminInitialized poskrbi, da se postavitev ne ponastavi vsakič znova.
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session) {
      showDashboard();
    } else {
      adminInitialized = false;
      showLogin();
    }
  });
}

function showLogin() {
  document.getElementById('loginScreen').style.display  = 'flex';
  document.getElementById('adminLayout').style.display  = 'none';
}

function showDashboard() {
  document.getElementById('loginScreen').style.display  = 'none';
  document.getElementById('adminLayout').style.display  = 'flex';
  if (!adminInitialized) {
    adminInitialized = true;
    initAdmin();
  }
}

// ── Login ─────────────────────────────────────────────────────
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn   = e.target.querySelector('[type="submit"]');
  const error = document.getElementById('loginError');
  const email = document.getElementById('loginEmail').value;
  const pass  = document.getElementById('loginPassword').value;

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

// ── Admin init ────────────────────────────────────────────────
function initAdmin() {
  initSidebar();
  initSidebarToggle();
  navigateTo('dashboard');
  // Če smo se vrnili z OAuth prijave v Canvo (?code=...), dokončaj povezavo.
  handleCanvaRedirect();
}

// ── Sidebar ───────────────────────────────────────────────────
function initSidebar() {
  document.querySelectorAll('[data-section]').forEach(link => {
    link.addEventListener('click', () => {
      const section = link.dataset.section;
      if (section === 'logout') { doLogout(); return; }
      navigateTo(section);
      document.getElementById('sidebar')?.classList.remove('open');
    });
  });
}

function initSidebarToggle() {
  const sidebar = document.getElementById('sidebar');
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
  });
  document.getElementById('sidebarClose')?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
  });
  // Zapri meni tudi ob kliku izven njega (mobilni/tablični pogled).
  document.addEventListener('click', (e) => {
    if (!sidebar?.classList.contains('open')) return;
    const toggle = document.getElementById('sidebarToggle');
    if (sidebar.contains(e.target) || toggle?.contains(e.target)) return;
    sidebar.classList.remove('open');
  });
}

function navigateTo(section) {
  currentSection = section;

  document.querySelectorAll('.sidebar-link').forEach(l =>
    l.classList.toggle('active', l.dataset.section === section)
  );

  document.querySelectorAll('.admin-section').forEach(s =>
    s.classList.toggle('active', s.id === `section-${section}`)
  );

  const title = document.getElementById('topbarTitle');
  const labels = {
    dashboard: 'Nadzorna plošča', hero: 'Naslovna stran', about: 'O nas',
    services: 'Storitve', projects: 'Projekti', blog: 'Blog', customers: 'Stranke',
    messages: 'Sporočila', content: 'Objave', settings: 'Nastavitve',
  };
  if (title) title.textContent = labels[section] || section;

  loadSection(section);
}

async function doLogout() {
  await supabaseClient.auth.signOut();
}

// ── Load section data ─────────────────────────────────────────
async function loadSection(section) {
  switch (section) {
    case 'dashboard': return loadDashboard();
    case 'hero':      return loadHero();
    case 'about':     return loadAbout();
    case 'services':  return loadServices();
    case 'projects':  return loadProjects();
    case 'blog':      return loadBlogPosts();
    case 'customers': return loadCustomers();
    case 'messages':  return loadMessages();
    case 'content':   return loadContent();
    case 'settings':  return loadSettings();
  }
}

// ── Dashboard / analitika ─────────────────────────────────────
async function loadDashboard() {
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();

  const [msgTotal, unreadRes, viewsRes, quotesRes] = await Promise.all([
    supabaseClient.from('contacts').select('id', { count: 'exact', head: true }),
    supabaseClient.from('contacts').select('id', { count: 'exact', head: true }).eq('is_read', false),
    supabaseClient.from('page_views').select('created_at, referrer_host, visitor_id').gte('created_at', since30),
    supabaseClient.from('quotes').select('total, status'),
  ]);

  const views  = viewsRes.data || [];
  const quotes = quotesRes.data || [];

  // Obiski
  const visits30  = views.length;
  const uniques30 = new Set(views.map(v => v.visitor_id).filter(Boolean)).size;

  // Povpraševanja
  const inquiries = msgTotal.count ?? 0;

  // Ponudbe
  const quotesTotal   = quotes.length;
  const realized      = quotes.filter(q => q.status === 'realized');
  const realizedCount = realized.length;
  const realizedValue = realized.reduce((s, q) => s + Number(q.total || 0), 0);

  // Konverzija
  const conv1 = inquiries   ? Math.round((quotesTotal   / inquiries)   * 100) : 0; // povpraševanje → ponudba
  const conv2 = quotesTotal ? Math.round((realizedCount / quotesTotal) * 100) : 0; // ponudba → realizirana

  setText('dashViews30',        visits30);
  setText('dashUniques30',      uniques30);
  setText('dashInquiries',      inquiries);
  setText('dashUnread',         unreadRes.count ?? 0);
  setText('dashQuotesSent',     quotesTotal);
  setText('dashQuotesRealized', realizedCount);
  setText('dashRealizedValue',  eur(realizedValue));
  setText('dashConvReal',       conv2 + '%');

  // Lijak
  setText('funnelInquiries', inquiries);
  setText('funnelQuotes',    quotesTotal);
  setText('funnelRealized',  realizedCount);
  setText('funnelConv1',     `→ ${conv1}% →`);
  setText('funnelConv2',     `→ ${conv2}% →`);

  renderVisitsChart(views);
  renderSources(views);
}

function renderVisitsChart(views) {
  const el = document.getElementById('dashChart');
  if (!el) return;

  const DAYS = 30;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const map = {};
  views.forEach(v => {
    const d = new Date(v.created_at); d.setHours(0, 0, 0, 0);
    const k = d.toISOString().slice(0, 10);
    map[k] = (map[k] || 0) + 1;
  });

  const bars = [];
  let max = 1;
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    const c = map[k] || 0;
    if (c > max) max = c;
    bars.push({ d, c });
  }

  el.innerHTML = bars.map(({ d, c }) => {
    const h = Math.round((c / max) * 100);
    const title = `${d.toLocaleDateString('sl-SI')}: ${c} ${c === 1 ? 'obisk' : 'obiskov'}`;
    return `<div class="chart-bar-wrap" title="${title}">
      <div class="chart-bar" style="height:${Math.max(h, 2)}%"></div>
    </div>`;
  }).join('');
}

function renderSources(views) {
  const el = document.getElementById('dashSources');
  if (!el) return;

  if (!views.length) {
    el.innerHTML = '<p style="color:var(--text-muted)">Še ni podatkov o obiskih. (Po objavi sheme se obiski začnejo beležiti ob nalaganju strani.)</p>';
    return;
  }

  const counts = {};
  views.forEach(v => {
    const k = v.referrer_host || 'direct';
    counts[k] = (counts[k] || 0) + 1;
  });

  const names = { direct: 'Neposredno', 'google.com': 'Google', 'instagram.com': 'Instagram', 'facebook.com': 'Facebook', 'l.facebook.com': 'Facebook', 'linkedin.com': 'LinkedIn' };
  const total = views.length;
  const rows  = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  el.innerHTML = rows.map(([host, n]) => {
    const pct = Math.round((n / total) * 100);
    return `<div class="source-row">
      <span class="source-name">${escHtml(names[host] || host)}</span>
      <span class="source-track"><span class="source-bar" style="width:${pct}%"></span></span>
      <span class="source-count">${n} · ${pct}%</span>
    </div>`;
  }).join('');
}

// ── Hero ──────────────────────────────────────────────────────
async function loadHero() {
  const { data } = await supabaseClient.from('settings').select('*').single();
  if (!data) return;

  setVal('heroHeadingInput',   data.hero_heading);
  setVal('heroSubInput',       data.hero_subheading);
  setVal('ctaPrimaryText',     data.cta_primary_text);
  setVal('ctaPrimaryLink',     data.cta_primary_link);
  setVal('ctaSecondaryText',   data.cta_secondary_text);
  setVal('ctaSecondaryLink',   data.cta_secondary_link);
}

document.getElementById('heroForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  await updateSettings({
    hero_heading:       getVal('heroHeadingInput'),
    hero_subheading:    getVal('heroSubInput'),
    cta_primary_text:   getVal('ctaPrimaryText'),
    cta_primary_link:   getVal('ctaPrimaryLink'),
    cta_secondary_text: getVal('ctaSecondaryText'),
    cta_secondary_link: getVal('ctaSecondaryLink'),
  }, e.target.querySelector('[type="submit"]'));
});

// ── About ─────────────────────────────────────────────────────
async function loadAbout() {
  const { data } = await supabaseClient.from('settings').select('*').single();
  if (!data) return;

  setVal('aboutBioInput', data.about_bio);

  skillsList = data.skills?.items?.length ? data.skills.items.slice() : DEFAULT_SKILLS.slice();
  renderSkillTags();

  statsList = Array.isArray(data.stats) && data.stats.length ? data.stats.slice() : DEFAULT_STATS.slice();
  renderStatRows();

  if (data.about_image_url) {
    const preview = document.getElementById('aboutImagePreview');
    if (preview) {
      preview.src = data.about_image_url;
      preview.style.display = 'block';
    }
  }
}

document.getElementById('aboutForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  await updateSettings({
    about_bio: getVal('aboutBioInput'),
    skills:    { items: skillsList },
    stats:     statsList,
  }, e.target.querySelector('[type="submit"]'));
});

// Skills tag input
document.getElementById('skillInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const val = e.target.value.trim();
    if (val && !skillsList.includes(val)) {
      skillsList.push(val);
      renderSkillTags();
      e.target.value = '';
    }
  }
});

function renderSkillTags() {
  const wrap  = document.getElementById('skillTagsWrap');
  const input = document.getElementById('skillInput');
  if (!wrap || !input) return;

  // Remove existing tags but keep the input element (and its listeners) intact
  wrap.querySelectorAll('.tag-item').forEach(el => el.remove());

  const html = skillsList.map((s, i) => `
    <span class="tag-item">
      ${escHtml(s)}
      <button class="tag-remove" onclick="removeSkill(${i})" type="button">×</button>
    </span>
  `).join('');

  input.insertAdjacentHTML('beforebegin', html);
}

function removeSkill(i) {
  skillsList.splice(i, 1);
  renderSkillTags();
}

// Stats rows
function renderStatRows() {
  const wrap = document.getElementById('statsRowsWrap');
  if (!wrap) return;
  wrap.innerHTML = statsList.map((s, i) => `
    <div class="stats-row-item">
      <input class="form-input" value="${escAttr(s.number)}" placeholder="50+"
        oninput="statsList[${i}].number = this.value">
      <input class="form-input" value="${escAttr(s.label)}" placeholder="Zaključenih projektov"
        oninput="statsList[${i}].label = this.value">
      <button class="btn btn-sm btn-danger" onclick="removeStat(${i})" type="button">✕</button>
    </div>
  `).join('');
}

function removeStat(i) {
  statsList.splice(i, 1);
  renderStatRows();
}

document.getElementById('addStatBtn')?.addEventListener('click', () => {
  statsList.push({ number: '', label: '' });
  renderStatRows();
});

// About image upload
document.getElementById('aboutImageFile')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = await uploadFile(file, 'about/profile', { resize: {} });
  if (url) {
    await updateSettings({ about_image_url: url });
    const preview = document.getElementById('aboutImagePreview');
    if (preview) { preview.src = url; preview.style.display = 'block'; }
    toast('Profilna slika posodobljena', 'success');
  }
});

// ── Services ──────────────────────────────────────────────────
async function loadServices() {
  const { data } = await supabaseClient.from('services').select('*').order('sort_order');
  const list = document.getElementById('servicesList');
  if (!list) return;

  if (!data?.length) {
    list.innerHTML = '<p style="color:var(--text-muted)">Še ni storitev. Dodajte spodaj.</p>';
    return;
  }

  list.innerHTML = data.map(s => `
    <div class="admin-list-item" data-id="${s.id}">
      <div class="admin-list-item-icon">${escHtml(s.icon)}</div>
      <div class="admin-list-item-body">
        <div class="admin-list-item-title">${escHtml(s.title)}</div>
        <div class="admin-list-item-desc">${escHtml(s.description)}</div>
      </div>
      <div class="admin-list-item-actions">
        <button class="btn btn-sm btn-ghost" onclick="editService('${s.id}')">Uredi</button>
        <button class="btn btn-sm btn-danger" onclick="deleteService('${s.id}')">Izbriši</button>
      </div>
    </div>
  `).join('');
}

document.getElementById('addServiceBtn')?.addEventListener('click', () => {
  openServiceModal(null);
});

async function editService(id) {
  const { data } = await supabaseClient.from('services').select('*').eq('id', id).single();
  if (data) openServiceModal(data);
}

function openServiceModal(service) {
  setVal('svcId',   service?.id ?? '');
  setVal('svcIcon', service?.icon ?? '');
  setVal('svcTitle', service?.title ?? '');
  setVal('svcDesc',  service?.description ?? '');
  setVal('svcOrder', service?.sort_order ?? 0);
  document.getElementById('serviceModalTitle').textContent = service ? 'Uredi storitev' : 'Dodaj storitev';
  openModal('serviceModal');
}

document.getElementById('serviceForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn  = e.target.querySelector('[type="submit"]');
  const id   = getVal('svcId');
  const payload = {
    icon:        getVal('svcIcon') || '🚀',
    title:       getVal('svcTitle'),
    description: getVal('svcDesc'),
    sort_order:  parseInt(getVal('svcOrder')) || 0,
  };

  setLoading(btn, true);
  let error;
  if (id) {
    ({ error } = await supabaseClient.from('services').update(payload).eq('id', id));
  } else {
    ({ error } = await supabaseClient.from('services').insert([payload]));
  }
  setLoading(btn, false);

  if (error) { toast('Napaka pri shranjevanju storitve', 'error'); return; }
  toast('Storitev shranjena', 'success');
  closeModal('serviceModal');
  loadServices();
});

async function deleteService(id) {
  if (!confirm('Izbrišete to storitev?')) return;
  const { error } = await supabaseClient.from('services').delete().eq('id', id);
  if (error) { toast('Napaka pri brisanju storitve', 'error'); return; }
  toast('Storitev izbrisana', 'success');
  loadServices();
}

// ── Projects ──────────────────────────────────────────────────
async function loadProjects() {
  const { data } = await supabaseClient.from('projects').select('*').order('sort_order');
  const grid = document.getElementById('adminProjectsGrid');
  if (!grid) return;

  if (!data?.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1">Še ni projektov.</p>';
    return;
  }

  grid.innerHTML = data.map(p => `
    <div class="admin-project-card">
      ${p.image_url
        ? `<img src="${p.image_url}" alt="${escAttr(p.title)}" class="admin-project-thumb">`
        : `<div class="admin-project-thumb-placeholder">${escHtml(p.title[0])}</div>`}
      <div class="admin-project-body">
        <div class="admin-project-title">${escHtml(p.title)}</div>
        <div class="admin-project-meta">
          <span class="badge-visible ${p.is_visible ? 'on' : 'off'}">${p.is_visible ? 'Vidno' : 'Skrito'}</span>
          <div style="display:flex;gap:0.4rem">
            <button class="btn btn-sm btn-ghost" onclick="editProject('${p.id}')">Uredi</button>
            <button class="btn btn-sm btn-danger" onclick="deleteProject('${p.id}')">✕</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

document.getElementById('addProjectBtn')?.addEventListener('click', () => {
  openProjectModal(null);
});

async function editProject(id) {
  const { data } = await supabaseClient.from('projects').select('*').eq('id', id).single();
  if (data) openProjectModal(data);
}

function openProjectModal(project) {
  setVal('projId',    project?.id ?? '');
  setVal('projTitle', project?.title ?? '');
  setVal('projDesc',  project?.description ?? '');
  setVal('projTags',  (project?.tags ?? []).join(', '));
  setVal('projUrl',   project?.live_url ?? '');
  setVal('projOrder', project?.sort_order ?? 0);

  const toggle = document.getElementById('projVisible');
  if (toggle) toggle.checked = project ? project.is_visible : true;

  const preview = document.getElementById('projImagePreview');
  if (preview) {
    if (project?.image_url) { preview.src = project.image_url; preview.style.display = 'block'; }
    else preview.style.display = 'none';
  }

  document.getElementById('projectModalTitle').textContent = project ? 'Uredi projekt' : 'Dodaj projekt';
  openModal('projectModal');
}

document.getElementById('projectForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  const id  = getVal('projId');
  const tagsRaw = getVal('projTags');
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  const payload = {
    title:      getVal('projTitle'),
    description: getVal('projDesc'),
    tags,
    live_url:   getVal('projUrl'),
    sort_order: parseInt(getVal('projOrder')) || 0,
    is_visible: document.getElementById('projVisible')?.checked ?? true,
  };

  setLoading(btn, true);
  let error;
  if (id) {
    ({ error } = await supabaseClient.from('projects').update(payload).eq('id', id));
  } else {
    ({ error } = await supabaseClient.from('projects').insert([payload]));
  }
  setLoading(btn, false);

  if (error) { toast('Napaka pri shranjevanju projekta', 'error'); return; }
  toast('Projekt shranjen', 'success');
  closeModal('projectModal');
  loadProjects();
});

document.getElementById('projImageFile')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const id = getVal('projId');
  const path = `projects/${Date.now()}-${file.name}`;
  const url = await uploadFile(file, path, { resize: {} });
  if (!url) return;

  const preview = document.getElementById('projImagePreview');
  if (preview) { preview.src = url; preview.style.display = 'block'; }

  if (id) {
    await supabaseClient.from('projects').update({ image_url: url }).eq('id', id);
    toast('Slika posodobljena', 'success');
    loadProjects();
  } else {
    setVal('projImageUrl', url);
  }
});

async function deleteProject(id) {
  if (!confirm('Trajno izbrišete ta projekt?')) return;
  const { error } = await supabaseClient.from('projects').delete().eq('id', id);
  if (error) { toast('Napaka pri brisanju projekta', 'error'); return; }
  toast('Projekt izbrisan', 'success');
  loadProjects();
}

// ── Blog ──────────────────────────────────────────────────────
let blogPostsList = [];
let blogTagsList = [];
let blogStatusFilter = 'all';
let blogSlugManuallyEdited = false;
let quillEditor = null;

function ensureQuill() {
  if (quillEditor) return quillEditor;
  const container = document.getElementById('blogQuillEditor');
  if (!container || typeof Quill === 'undefined') return null;
  quillEditor = new Quill(container, {
    theme: 'snow',
    placeholder: 'Napišite vsebino novice…',
    modules: {
      toolbar: {
        container: [
          [{ header: [2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          ['blockquote', 'code-block'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image'],
          ['clean'],
        ],
        handlers: { image: quillImageHandler },
      },
    },
  });
  return quillEditor;
}

function quillImageHandler() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    const url = await uploadFile(file, `blog/content-${Date.now()}-${file.name}`, { resize: {} });
    if (!url) return;
    const range = quillEditor.getSelection(true);
    quillEditor.insertEmbed(range.index, 'image', url, 'user');
    quillEditor.setSelection(range.index + 1);
  };
  input.click();
}

async function loadBlogPosts() {
  ensureQuill();
  const { data } = await supabaseClient.from('blog_posts').select('*').order('created_at', { ascending: false });
  blogPostsList = data || [];
  renderBlogCategoryOptions();
  renderBlogAdminList();
}

function renderBlogCategoryOptions() {
  const list = document.getElementById('blogCategoryList');
  if (!list) return;
  const categories = [...new Set(blogPostsList.map(p => p.category).filter(Boolean))];
  list.innerHTML = categories.map(c => `<option value="${escAttr(c)}"></option>`).join('');
}

document.querySelectorAll('#blogAdminFilters [data-status-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    blogStatusFilter = btn.dataset.statusFilter;
    document.querySelectorAll('#blogAdminFilters .content-pill').forEach(b => b.classList.toggle('active', b === btn));
    renderBlogAdminList();
  });
});

function renderBlogAdminList() {
  const wrap = document.getElementById('adminBlogList');
  if (!wrap) return;

  const filtered = blogStatusFilter === 'all'
    ? blogPostsList
    : blogPostsList.filter(p => p.status === blogStatusFilter);

  if (!filtered.length) {
    wrap.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:1.5rem">Še ni objav.</p>';
    return;
  }

  wrap.innerHTML = filtered.map(p => `
    <div class="admin-blog-item">
      ${p.cover_image_url
        ? `<img src="${p.cover_image_url}" alt="${escAttr(p.title)}" class="admin-blog-thumb">`
        : `<div class="admin-blog-thumb-placeholder">📝</div>`}
      <div class="admin-blog-body">
        <div class="admin-blog-title">${escHtml(p.title || '(brez naslova)')}</div>
        <div class="admin-blog-meta">
          <span class="badge-status ${p.status}">${p.status === 'published' ? 'Objavljeno' : 'Osnutek'}</span>
          ${p.is_featured ? '<span class="badge-featured">★ Izpostavljeno</span>' : ''}
          ${p.category ? `<span>${escHtml(p.category)}</span>` : ''}
          <span>${p.published_at ? new Date(p.published_at).toLocaleDateString('sl-SI') : '—'}</span>
        </div>
      </div>
      <div class="admin-blog-actions">
        ${p.status === 'published' ? `<a class="btn btn-sm btn-ghost" href="/blog-post.html?slug=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">Poglej</a>` : ''}
        <button class="btn btn-sm btn-ghost" onclick="editBlogPost('${p.id}')">Uredi</button>
        <button class="btn btn-sm btn-danger" onclick="deleteBlogPost('${p.id}')">✕</button>
      </div>
    </div>
  `).join('');
}

document.getElementById('addBlogBtn')?.addEventListener('click', () => openBlogModal(null));

async function editBlogPost(id) {
  const post = blogPostsList.find(p => p.id === id);
  if (post) openBlogModal(post);
}

function openBlogModal(post) {
  blogSlugManuallyEdited = !!post;

  setVal('blogId', post?.id ?? '');
  setVal('blogTitle', post?.title ?? '');
  setVal('blogSlug', post?.slug ?? '');
  setVal('blogExcerpt', post?.excerpt ?? '');
  setVal('blogCategory', post?.category ?? '');
  setVal('blogAuthor', post?.author_name ?? 'EPO.SI');
  setVal('blogSeoTitle', post?.seo_title ?? '');
  setVal('blogSeoDesc', post?.seo_description ?? '');
  setVal('blogCoverUrl', post?.cover_image_url ?? '');

  updateExcerptCounter();

  const statusSel = document.getElementById('blogStatus');
  if (statusSel) statusSel.value = post?.status ?? 'draft';

  const featuredToggle = document.getElementById('blogFeatured');
  if (featuredToggle) featuredToggle.checked = post?.is_featured ?? false;

  setVal('blogPublishedAt', toDatetimeLocal(post?.published_at));

  const preview = document.getElementById('blogCoverPreview');
  if (preview) {
    if (post?.cover_image_url) { preview.src = post.cover_image_url; preview.style.display = 'block'; }
    else preview.style.display = 'none';
  }

  blogTagsList = post?.tags ? [...post.tags] : [];
  renderBlogTagChips();

  const quill = ensureQuill();
  if (quill) quill.root.innerHTML = post?.content ?? '';

  document.getElementById('blogModalTitle').textContent = post ? 'Uredi objavo' : 'Nova objava';
  openModal('blogModal');
}

function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Naslov -> samodejni slug (dokler uporabnik ročno ne uredi polja slug)
document.getElementById('blogTitle')?.addEventListener('input', (e) => {
  if (blogSlugManuallyEdited) return;
  setVal('blogSlug', slugify(e.target.value));
});
document.getElementById('blogSlug')?.addEventListener('input', () => { blogSlugManuallyEdited = true; });

document.getElementById('blogExcerpt')?.addEventListener('input', updateExcerptCounter);
function updateExcerptCounter() {
  const el = document.getElementById('blogExcerpt');
  const counter = document.getElementById('blogExcerptCounter');
  if (!el || !counter) return;
  const len = el.value.length;
  counter.textContent = `${len} / 220`;
  counter.classList.toggle('warn', len > 200);
}

// Oznake (tags)
document.getElementById('blogTagInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const val = e.target.value.trim();
    if (val && !blogTagsList.includes(val)) {
      blogTagsList.push(val);
      renderBlogTagChips();
      e.target.value = '';
    }
  }
});

function renderBlogTagChips() {
  const wrap  = document.getElementById('blogTagsWrap');
  const input = document.getElementById('blogTagInput');
  if (!wrap || !input) return;

  wrap.querySelectorAll('.tag-item').forEach(el => el.remove());

  const html = blogTagsList.map((t, i) => `
    <span class="tag-item">
      ${escHtml(t)}
      <button class="tag-remove" onclick="removeBlogTag(${i})" type="button">×</button>
    </span>
  `).join('');

  input.insertAdjacentHTML('beforebegin', html);
}

function removeBlogTag(i) {
  blogTagsList.splice(i, 1);
  renderBlogTagChips();
}

// Naslovna slika
document.getElementById('blogCoverFile')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = await uploadFile(file, `blog/${Date.now()}-${file.name}`, { resize: {} });
  if (!url) return;
  setVal('blogCoverUrl', url);
  const preview = document.getElementById('blogCoverPreview');
  if (preview) { preview.src = url; preview.style.display = 'block'; }
});

document.getElementById('blogForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  const id = getVal('blogId');
  const quill = ensureQuill();
  const content = quill ? quill.root.innerHTML : '';
  const plainText = quill ? quill.getText() : '';

  const title = getVal('blogTitle').trim();
  if (!title) { toast('Vnesite naslov', 'error'); return; }

  let slug = slugify(getVal('blogSlug') || title);
  if (!slug) { toast('Neveljavna povezava (slug)', 'error'); return; }

  const status = document.getElementById('blogStatus')?.value || 'draft';
  const publishedAtRaw = getVal('blogPublishedAt');
  let publishedAt = publishedAtRaw ? new Date(publishedAtRaw).toISOString() : null;
  if (status === 'published' && !publishedAt) publishedAt = new Date().toISOString();

  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.round(wordCount / 200));

  setLoading(btn, true);
  slug = await ensureUniqueSlug(slug, id);

  const payload = {
    title,
    slug,
    excerpt:         getVal('blogExcerpt'),
    content,
    cover_image_url: getVal('blogCoverUrl'),
    category:        getVal('blogCategory').trim(),
    tags:            blogTagsList,
    author_name:     getVal('blogAuthor').trim() || 'EPO.SI',
    status,
    is_featured:     document.getElementById('blogFeatured')?.checked ?? false,
    reading_minutes: readingMinutes,
    seo_title:       getVal('blogSeoTitle'),
    seo_description: getVal('blogSeoDesc'),
    published_at:    publishedAt,
    updated_at:      new Date().toISOString(),
  };

  let error;
  if (id) {
    ({ error } = await supabaseClient.from('blog_posts').update(payload).eq('id', id));
  } else {
    ({ error } = await supabaseClient.from('blog_posts').insert([payload]));
  }
  setLoading(btn, false);

  if (error) { toast('Napaka pri shranjevanju objave: ' + error.message, 'error'); return; }
  toast('Objava shranjena', 'success');
  closeModal('blogModal');
  loadBlogPosts();
});

async function ensureUniqueSlug(slug, excludeId) {
  let candidate = slug;
  let n = 2;
  for (;;) {
    let query = supabaseClient.from('blog_posts').select('id').eq('slug', candidate);
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query;
    if (!data || !data.length) return candidate;
    candidate = `${slug}-${n++}`;
  }
}

async function deleteBlogPost(id) {
  if (!confirm('Trajno izbrišete to objavo?')) return;
  const { error } = await supabaseClient.from('blog_posts').delete().eq('id', id);
  if (error) { toast('Napaka pri brisanju objave', 'error'); return; }
  toast('Objava izbrisana', 'success');
  loadBlogPosts();
}

function slugify(str) {
  const map = { č: 'c', ć: 'c', š: 's', ž: 'z', đ: 'd', Č: 'c', Ć: 'c', Š: 's', Ž: 'z', Đ: 'd' };
  return String(str || '')
    .split('').map(ch => map[ch] ?? ch).join('')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// ── Messages ──────────────────────────────────────────────────
async function loadMessages() {
  const { data } = await supabaseClient.from('contacts').select('*').order('created_at', { ascending: false });
  const tbody = document.getElementById('messagesBody');
  if (!tbody) return;

  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem">Še ni sporočil.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(m => `
    <tr class="${m.is_read ? '' : 'unread'}">
      <td data-label="Datum">${new Date(m.created_at).toLocaleDateString()}</td>
      <td data-label="Ime">${escHtml(m.name)}</td>
      <td data-label="E-pošta">${escHtml(m.email)}</td>
      <td data-label="Zadeva">${escHtml(m.subject || '—')}</td>
      <td data-label="Stanje">
        <span class="msg-badge ${m.is_read ? 'read' : 'unread'}">${m.is_read ? 'Prebrano' : 'Novo'}</span>
      </td>
      <td data-label="Dejanja">
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;justify-content:flex-end">
          <button class="btn btn-sm btn-ghost" onclick="viewMessage('${m.id}')">Poglej</button>
          <button class="btn btn-sm btn-primary" onclick="createQuote('${m.id}')">Ponudba</button>
          <button class="btn btn-sm btn-danger" onclick="deleteMessage('${m.id}')">✕</button>
        </div>
      </td>
    </tr>
  `).join('');

  const unread = data.filter(m => !m.is_read).length;
  const badge = document.getElementById('msgBadge');
  if (badge) {
    badge.textContent = unread;
    badge.style.display = unread > 0 ? 'flex' : 'none';
  }
}

async function viewMessage(id) {
  const { data } = await supabaseClient.from('contacts').select('*').eq('id', id).single();
  if (!data) return;

  document.getElementById('msgViewFrom').textContent    = `${data.name} <${data.email}>`;
  document.getElementById('msgViewSubject').textContent = data.subject || '(Brez zadeve)';
  document.getElementById('msgViewDate').textContent    = new Date(data.created_at).toLocaleString();
  document.getElementById('msgViewBody').textContent    = data.message;
  openModal('messageModal');

  if (!data.is_read) {
    await supabaseClient.from('contacts').update({ is_read: true }).eq('id', id);
    loadMessages();
  }
}

async function deleteMessage(id) {
  if (!confirm('Izbrišete to sporočilo?')) return;
  const { error } = await supabaseClient.from('contacts').delete().eq('id', id);
  if (error) { toast('Napaka pri brisanju sporočila', 'error'); return; }
  toast('Sporočilo izbrisano', 'success');
  loadMessages();
}

// ── Quotes (ponudbe) ──────────────────────────────────────────
let quoteItems = [];
let agencyInfo = {};

// Open the quote builder, prefilled from a contact message.
async function createQuote(contactId) {
  const { data: contact } = await supabaseClient.from('contacts').select('*').eq('id', contactId).single();
  await loadAgencyInfo();
  openQuoteModal({
    contactId: contact?.id ?? '',
    name:      contact?.company || contact?.name || '',
    email:     contact?.email ?? '',
    items:     [{ description: contact?.subject ? `Izdelava: ${contact.subject}` : '', qty: 1, price: 0 }],
  });
}

// Open the quote builder for an existing customer.
async function createQuoteForCustomer(customerId) {
  const { data: c } = await supabaseClient.from('customers').select('*').eq('id', customerId).single();
  await loadAgencyInfo();
  openQuoteModal({
    customerId: c?.id ?? '',
    name:       c?.company_name ?? '',
    email:      c?.email ?? '',
    tax:        c?.tax_number ?? '',
    address:    c?.address ?? '',
    items:      [{ description: '', qty: 1, price: 0 }],
  });
}

function openQuoteModal(p = {}) {
  setVal('quoteContactId',      p.contactId ?? '');
  setVal('quoteCustomerId',     p.customerId ?? '');
  setVal('quoteCustomerName',   p.name ?? '');
  setVal('quoteCustomerEmail',  p.email ?? '');
  setVal('quoteCustomerTax',    p.tax ?? '');
  setVal('quoteCustomerAddress', p.address ?? '');
  setVal('quoteNumber',         genQuoteNumber());
  setVal('quoteNotes',          'Veljavnost ponudbe je 14 dni. Plačilo v roku 8 dni po izstavitvi računa.');

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 14);
  setVal('quoteValidUntil', validUntil.toISOString().slice(0, 10));

  quoteItems = (p.items && p.items.length) ? p.items : [{ description: '', qty: 1, price: 0 }];
  renderQuoteItems();
  openModal('quoteModal');
}

async function loadAgencyInfo() {
  if (agencyInfo._loaded) return;
  const { data } = await supabaseClient.from('settings').select('*').single();
  agencyInfo = { ...(data || {}), _loaded: true };
}

function genQuoteNumber() {
  const n = new Date();
  const p = x => String(x).padStart(2, '0');
  const rand = Math.floor(Math.random() * 900 + 100);
  return `PON-${n.getFullYear()}${p(n.getMonth() + 1)}${p(n.getDate())}-${rand}`;
}

function renderQuoteItems() {
  const wrap = document.getElementById('quoteItemsWrap');
  if (!wrap) return;
  wrap.innerHTML = quoteItems.map((it, i) => `
    <div style="display:grid;grid-template-columns:1fr 64px 110px 34px;gap:0.5rem;margin-bottom:0.5rem;align-items:center">
      <input class="form-input" placeholder="Opis postavke" value="${escAttr(it.description)}"
        oninput="quoteItems[${i}].description = this.value">
      <input class="form-input" type="number" min="0" step="1" value="${escAttr(it.qty)}" title="Količina"
        oninput="quoteItems[${i}].qty = parseFloat(this.value) || 0; updateQuoteTotals()">
      <input class="form-input" type="number" min="0" step="0.01" value="${escAttr(it.price)}" title="Cena na enoto (€)"
        oninput="quoteItems[${i}].price = parseFloat(this.value) || 0; updateQuoteTotals()">
      <button class="btn btn-sm btn-danger" onclick="removeQuoteItem(${i})" type="button">✕</button>
    </div>
  `).join('');
  updateQuoteTotals();
}

function removeQuoteItem(i) {
  quoteItems.splice(i, 1);
  renderQuoteItems();
}

document.getElementById('addQuoteItemBtn')?.addEventListener('click', () => {
  quoteItems.push({ description: '', qty: 1, price: 0 });
  renderQuoteItems();
});

document.getElementById('quoteVat')?.addEventListener('input', updateQuoteTotals);
document.getElementById('quoteVatEnabled')?.addEventListener('change', updateQuoteTotals);

function computeQuoteTotals() {
  const subtotal   = quoteItems.reduce((s, it) => s + (it.qty * it.price), 0);
  const vatEnabled = document.getElementById('quoteVatEnabled')?.checked;
  const vatRate    = vatEnabled ? (parseFloat(getVal('quoteVat')) || 0) : 0;
  const vat        = subtotal * vatRate / 100;
  return { subtotal, vatRate, vat, total: subtotal + vat };
}

function updateQuoteTotals() {
  const t = computeQuoteTotals();
  const el = document.getElementById('quoteTotals');
  if (!el) return;
  el.innerHTML = `
    <div>Skupaj brez DDV: <strong>${eur(t.subtotal)}</strong></div>
    ${t.vatRate ? `<div>DDV (${t.vatRate}%): <strong>${eur(t.vat)}</strong></div>` : ''}
    <div style="font-size:1.1rem;margin-top:0.25rem">Za plačilo: <strong>${eur(t.total)}</strong></div>
  `;
}

function eur(n) {
  return new Intl.NumberFormat('sl-SI', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

// Pure totals helper (works on any items + vat rate).
function totalsFor(items, vatRate) {
  const subtotal = (items || []).reduce((s, it) => s + ((it.qty || 0) * (it.price || 0)), 0);
  const rate = vatRate || 0;
  const vat  = subtotal * rate / 100;
  return { subtotal, vatRate: rate, vat, total: subtotal + vat };
}

// Read the current quote form into a plain data object.
function currentQuoteData() {
  return {
    number:          getVal('quoteNumber'),
    validUntil:      getVal('quoteValidUntil'),
    customerName:    getVal('quoteCustomerName'),
    customerEmail:   getVal('quoteCustomerEmail'),
    customerTax:     getVal('quoteCustomerTax'),
    customerAddress: getVal('quoteCustomerAddress'),
    notes:           getVal('quoteNotes'),
    vatRate:         document.getElementById('quoteVatEnabled')?.checked ? (parseFloat(getVal('quoteVat')) || 0) : 0,
    items:           quoteItems.map(it => ({ description: it.description, qty: it.qty, price: it.price })),
  };
}

// Build the printable quote HTML (light theme, A4 width) for PDF rendering.
function buildQuoteHtml(q) {
  const t = totalsFor(q.items, q.vatRate);
  const a = agencyInfo;
  const company  = a.company_name || a.site_name || a.logo_text || 'EPO.SI';
  const number   = q.number;
  const today    = new Date().toLocaleDateString('sl-SI');
  const validUntil = q.validUntil ? new Date(q.validUntil).toLocaleDateString('sl-SI') : '';

  const rows = (q.items || [])
    .filter(it => it.description || it.price)
    .map((it, idx) => `
      <tr>
        <td style="padding:9px 8px;border-bottom:1px solid #eee;color:#888">${idx + 1}</td>
        <td style="padding:9px 8px;border-bottom:1px solid #eee">${escHtml(it.description)}</td>
        <td style="padding:9px 8px;border-bottom:1px solid #eee;text-align:center">${it.qty}</td>
        <td style="padding:9px 8px;border-bottom:1px solid #eee;text-align:right">${eur(it.price)}</td>
        <td style="padding:9px 8px;border-bottom:1px solid #eee;text-align:right">${eur(it.qty * it.price)}</td>
      </tr>`).join('');

  const agencyLines = [
    a.company_address ? escHtml(a.company_address) : '',
    a.company_tax     ? `Davčna št.: ${escHtml(a.company_tax)}` : '',
    a.company_iban    ? `IBAN: ${escHtml(a.company_iban)}` : '',
    a.contact_email   ? escHtml(a.contact_email) : '',
    a.contact_phone   ? escHtml(a.contact_phone) : '',
  ].filter(Boolean).join('<br>');

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;background:#fff;width:794px;box-sizing:border-box;padding:56px 48px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #4a7fe0;padding-bottom:20px;margin-bottom:28px">
      <div>
        <div style="font-size:26px;font-weight:800;color:#4a7fe0;letter-spacing:0.5px">${escHtml(company)}</div>
        <div style="font-size:12px;color:#555;margin-top:8px;line-height:1.7">${agencyLines}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:22px;font-weight:700">PONUDBA</div>
        <div style="font-size:13px;color:#555;margin-top:6px">Št.: <strong>${escHtml(number)}</strong></div>
        <div style="font-size:13px;color:#555">Datum: ${today}</div>
        ${validUntil ? `<div style="font-size:13px;color:#555">Velja do: ${validUntil}</div>` : ''}
      </div>
    </div>

    <div style="margin-bottom:26px">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:6px">Naslovnik</div>
      <div style="font-size:15px;font-weight:600">${escHtml(q.customerName)}</div>
      ${q.customerAddress ? `<div style="font-size:13px;color:#555">${escHtml(q.customerAddress)}</div>` : ''}
      ${q.customerTax ? `<div style="font-size:13px;color:#555">Davčna št.: ${escHtml(q.customerTax)}</div>` : ''}
      <div style="font-size:13px;color:#555">${escHtml(q.customerEmail)}</div>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#f4f6fb">
          <th style="padding:10px 8px;text-align:left;color:#555;font-weight:600;width:32px">#</th>
          <th style="padding:10px 8px;text-align:left;color:#555;font-weight:600">Opis</th>
          <th style="padding:10px 8px;text-align:center;color:#555;font-weight:600;width:60px">Kol.</th>
          <th style="padding:10px 8px;text-align:right;color:#555;font-weight:600;width:110px">Cena/enoto</th>
          <th style="padding:10px 8px;text-align:right;color:#555;font-weight:600;width:110px">Skupaj</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="5" style="padding:14px 8px;color:#999">Brez postavk</td></tr>'}</tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-top:18px">
      <table style="font-size:14px">
        <tr><td style="padding:4px 14px;color:#555;text-align:right">Skupaj brez DDV:</td><td style="padding:4px 0;text-align:right;font-weight:600">${eur(t.subtotal)}</td></tr>
        ${t.vatRate ? `<tr><td style="padding:4px 14px;color:#555;text-align:right">DDV (${t.vatRate}%):</td><td style="padding:4px 0;text-align:right;font-weight:600">${eur(t.vat)}</td></tr>` : ''}
        <tr><td style="padding:8px 14px;text-align:right;font-size:16px;font-weight:700;border-top:2px solid #1a1a2e">Za plačilo:</td><td style="padding:8px 0;text-align:right;font-size:16px;font-weight:700;border-top:2px solid #1a1a2e">${eur(t.total)}</td></tr>
      </table>
    </div>

    ${q.notes ? `
    <div style="margin-top:34px;padding-top:18px;border-top:1px solid #eee">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:6px">Opombe</div>
      <div style="font-size:13px;color:#555;line-height:1.7;white-space:pre-wrap">${escHtml(q.notes)}</div>
    </div>` : ''}

    <div style="margin-top:42px;text-align:center;font-size:11px;color:#aaa">
      Ponudbo izdal ${escHtml(company)}. Hvala za vaše zaupanje.
    </div>
  </div>`;
}

// Render the quote HTML to a jsPDF document via html2canvas.
async function generateQuotePdf(q) {
  if (!window.jspdf || !window.html2canvas) {
    throw new Error('Knjižnice za PDF se niso naložile');
  }
  const tpl = document.getElementById('quotePdfTemplate');
  tpl.innerHTML = buildQuoteHtml(q);
  const node = tpl.firstElementChild;

  try {
    const canvas = await window.html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW  = pageW;
    const imgH  = canvas.height * imgW / canvas.width;
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
      heightLeft -= pageH;
    }
    return pdf;
  } finally {
    tpl.innerHTML = '';
  }
}

// Create or update the quote record (idempotent per quote number),
// creating/linking the customer. Returns the stored quote id.
async function persistQuote(q, { markSent = false } = {}) {
  const t = totalsFor(q.items, q.vatRate);

  let customerId = null;
  try { customerId = await findOrCreateCustomer(q); } catch (_) { /* customers table optional */ }

  const record = {
    contact_id:       getVal('quoteContactId') || null,
    customer_id:      customerId,
    quote_number:     q.number,
    customer_name:    q.customerName,
    customer_email:   q.customerEmail,
    customer_tax:     q.customerTax || '',
    customer_address: q.customerAddress || '',
    items:            q.items,
    subtotal:         t.subtotal,
    vat_rate:         t.vatRate,
    total:            t.total,
    notes:            q.notes,
    valid_until:      q.validUntil || null,
  };
  if (markSent) record.sent_at = new Date().toISOString();

  const { data: existing } = await supabaseClient.from('quotes')
    .select('id').eq('quote_number', q.number).limit(1).maybeSingle();

  if (existing) {
    await supabaseClient.from('quotes').update(record).eq('id', existing.id);
    return existing.id;
  }
  const { data: created } = await supabaseClient.from('quotes').insert([record]).select('id').single();
  return created?.id ?? null;
}

document.getElementById('quoteSaveBtn')?.addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const q   = currentQuoteData();
  if (!q.customerName) { toast('Vnesite naziv stranke', 'error'); return; }
  setLoading(btn, true);
  try {
    await persistQuote(q);
    toast('Ponudba shranjena', 'success');
    if (currentSection === 'customers') loadCustomers();
  } catch (err) {
    toast('Shranjevanje ponudbe ni uspelo: ' + (err.message || err), 'error');
  } finally {
    setLoading(btn, false);
  }
});

document.getElementById('quoteDownloadBtn')?.addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  setLoading(btn, true);
  try {
    const q = currentQuoteData();
    const pdf = await generateQuotePdf(q);
    pdf.save(`${q.number || 'ponudba'}.pdf`);
    // Auto-save so the quote is reviewable later
    try {
      await persistQuote(q);
      if (currentSection === 'customers') loadCustomers();
    } catch (_) { /* non-blocking */ }
  } catch (err) {
    toast('Izdelava PDF ni uspela: ' + (err.message || err), 'error');
  } finally {
    setLoading(btn, false);
  }
});

// Find an existing customer (by tax number, then name, then email) or create one.
async function findOrCreateCustomer(q) {
  const explicitId = getVal('quoteCustomerId');
  const record = {
    company_name: q.customerName,
    tax_number:   q.customerTax || '',
    email:        q.customerEmail || '',
    address:      q.customerAddress || '',
  };

  // Quote opened directly from an existing customer → update & reuse it.
  if (explicitId) {
    await supabaseClient.from('customers').update(record).eq('id', explicitId);
    return explicitId;
  }

  let match = null;
  if (q.customerTax) {
    ({ data: match } = await supabaseClient.from('customers').select('id')
      .eq('tax_number', q.customerTax).limit(1).maybeSingle());
  }
  if (!match && q.customerName) {
    ({ data: match } = await supabaseClient.from('customers').select('id')
      .ilike('company_name', q.customerName).limit(1).maybeSingle());
  }
  if (!match && q.customerEmail) {
    ({ data: match } = await supabaseClient.from('customers').select('id')
      .ilike('email', q.customerEmail).limit(1).maybeSingle());
  }

  if (match) {
    await supabaseClient.from('customers').update(record).eq('id', match.id);
    return match.id;
  }

  const { data: created } = await supabaseClient.from('customers').insert([record]).select('id').single();
  return created?.id ?? null;
}

document.getElementById('quoteForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  const q   = currentQuoteData();
  if (!q.customerEmail) { toast('Vnesite e-pošto stranke', 'error'); return; }

  setLoading(btn, true);
  try {
    const pdf = await generateQuotePdf(q);
    const pdfBase64 = pdf.output('datauristring').split(',')[1];

    const t       = totalsFor(q.items, q.vatRate);
    const company = agencyInfo.company_name || agencyInfo.site_name || 'EPO.SI';
    const validUntilStr = q.validUntil ? new Date(q.validUntil).toLocaleDateString('sl-SI') : '';

    const { error } = await supabaseClient.functions.invoke('send-quote', {
      body: {
        to:           q.customerEmail,
        toName:       q.customerName,
        subject:      `Ponudba ${q.number} — ${company}`,
        replyTo:      agencyInfo.contact_email || undefined,
        fileName:     `${q.number || 'ponudba'}.pdf`,
        pdfBase64,
        companyName:  company,
        companyEmail: agencyInfo.contact_email || '',
        companyPhone: agencyInfo.contact_phone || '',
        quoteNumber:  q.number,
        total:        eur(t.total),
        validUntil:   validUntilStr,
      },
    });
    if (error) throw error;

    // Record the quote under its customer (best-effort), marked as sent.
    try {
      await persistQuote(q, { markSent: true });
    } catch (_) { /* customers/quotes tables optional */ }

    toast('Ponudba poslana stranki', 'success');
    closeModal('quoteModal');
    if (currentSection === 'customers') loadCustomers();
  } catch (err) {
    toast('Pošiljanje ponudbe ni uspelo: ' + (err.message || err), 'error');
  } finally {
    setLoading(btn, false);
  }
});

// ── Customers (stranke) ───────────────────────────────────────
async function loadCustomers() {
  await loadAgencyInfo();
  const [{ data: customers }, { data: quotes }] = await Promise.all([
    supabaseClient.from('customers').select('*').order('company_name'),
    supabaseClient.from('quotes').select('*').order('created_at', { ascending: false }),
  ]);

  const list = document.getElementById('customersList');
  if (!list) return;

  if (!customers?.length) {
    list.innerHTML = '<p style="color:var(--text-muted)">Še ni strank. Stranka se ustvari samodejno ob pošiljanju ponudbe ali jo dodate ročno.</p>';
    return;
  }

  const byCustomer = {};
  (quotes || []).forEach(q => {
    const k = q.customer_id || '_none';
    (byCustomer[k] = byCustomer[k] || []).push(q);
  });

  list.innerHTML = customers.map(c => {
    const cq = byCustomer[c.id] || [];
    const quotesHtml = cq.length ? cq.map(q => {
      const st   = quoteStatusInfo(q.status);
      const date = q.sent_at ? new Date(q.sent_at).toLocaleDateString('sl-SI') : new Date(q.created_at).toLocaleDateString('sl-SI');
      return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;padding:0.5rem 0;border-top:1px solid var(--border);flex-wrap:wrap">
        <div style="font-size:0.85rem;display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">
          <strong>${escHtml(q.quote_number)}</strong>
          <span class="quote-status ${st.cls}">${st.label}</span>
          <span style="color:var(--text-muted)">· ${date}</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap">
          <span style="font-weight:600">${eur(q.total)}</span>
          ${q.status !== 'realized' ? `<button class="btn btn-sm btn-success" onclick="setQuoteStatus('${q.id}','realized')">✓ Realizirana</button>` : ''}
          ${q.status !== 'rejected' ? `<button class="btn btn-sm btn-ghost" onclick="setQuoteStatus('${q.id}','rejected')">Zavrnjena</button>` : ''}
          ${q.status !== 'sent' ? `<button class="btn btn-sm btn-ghost" onclick="setQuoteStatus('${q.id}','sent')" title="Ponastavi na Poslano" aria-label="Ponastavi na Poslano">↺</button>` : ''}
          <button class="btn btn-sm btn-ghost" onclick="downloadStoredQuote('${q.id}')">PDF</button>
          <button class="btn btn-sm btn-danger" onclick="deleteQuote('${q.id}')" aria-label="Izbriši ponudbo">✕</button>
        </div>
      </div>`;
    }).join('') : '<div style="font-size:0.85rem;color:var(--text-muted);padding-top:0.45rem;border-top:1px solid var(--border)">Še ni ponudb.</div>';

    return `
      <div class="admin-list-item" data-id="${c.id}" style="flex-direction:column;align-items:stretch;gap:0.6rem">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.75rem">
          <div class="admin-list-item-body">
            <div class="admin-list-item-title">${escHtml(c.company_name || '(brez naziva)')}</div>
            <div class="admin-list-item-desc">
              ${c.tax_number ? `Davčna: ${escHtml(c.tax_number)} · ` : ''}${escHtml(c.email || '')}${c.phone ? ` · ${escHtml(c.phone)}` : ''}
            </div>
          </div>
          <div class="admin-list-item-actions" style="display:flex;gap:0.4rem;flex-wrap:wrap;justify-content:flex-end">
            <button class="btn btn-sm btn-primary" onclick="createQuoteForCustomer('${c.id}')">+ Ponudba</button>
            <button class="btn btn-sm btn-ghost" onclick="editCustomer('${c.id}')">Uredi</button>
            <button class="btn btn-sm btn-danger" onclick="deleteCustomer('${c.id}')">Izbriši</button>
          </div>
        </div>
        <div>${quotesHtml}</div>
      </div>`;
  }).join('');
}

document.getElementById('addCustomerBtn')?.addEventListener('click', () => openCustomerModal(null));

async function editCustomer(id) {
  const { data } = await supabaseClient.from('customers').select('*').eq('id', id).single();
  if (data) openCustomerModal(data);
}

function openCustomerModal(c) {
  setVal('custId',          c?.id ?? '');
  setVal('custCompanyName', c?.company_name ?? '');
  setVal('custTax',         c?.tax_number ?? '');
  setVal('custEmail',       c?.email ?? '');
  setVal('custPhone',       c?.phone ?? '');
  setVal('custAddress',     c?.address ?? '');
  setVal('custNotes',       c?.notes ?? '');
  document.getElementById('customerModalTitle').textContent = c ? 'Uredi stranko' : 'Dodaj stranko';
  openModal('customerModal');
}

document.getElementById('customerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  const id  = getVal('custId');
  const payload = {
    company_name: getVal('custCompanyName'),
    tax_number:   getVal('custTax'),
    email:        getVal('custEmail'),
    phone:        getVal('custPhone'),
    address:      getVal('custAddress'),
    notes:        getVal('custNotes'),
  };

  setLoading(btn, true);
  let error;
  if (id) {
    ({ error } = await supabaseClient.from('customers').update(payload).eq('id', id));
  } else {
    ({ error } = await supabaseClient.from('customers').insert([payload]));
  }
  setLoading(btn, false);

  if (error) { toast('Napaka pri shranjevanju stranke', 'error'); return; }
  toast('Stranka shranjena', 'success');
  closeModal('customerModal');
  loadCustomers();
});

async function deleteCustomer(id) {
  if (!confirm('Izbrišete to stranko? Povezane ponudbe ostanejo shranjene, a brez povezave na stranko.')) return;
  const { error } = await supabaseClient.from('customers').delete().eq('id', id);
  if (error) { toast('Napaka pri brisanju stranke', 'error'); return; }
  toast('Stranka izbrisana', 'success');
  loadCustomers();
}

async function deleteQuote(id) {
  if (!confirm('Trajno izbrišete to ponudbo? Tega dejanja ni mogoče razveljaviti.')) return;
  const { error } = await supabaseClient.from('quotes').delete().eq('id', id);
  if (error) { toast('Napaka pri brisanju ponudbe', 'error'); return; }
  toast('Ponudba izbrisana', 'success');
  loadCustomers();
}

function quoteStatusInfo(status) {
  switch (status) {
    case 'realized': return { cls: 'realized', label: 'Realizirana' };
    case 'rejected': return { cls: 'rejected', label: 'Zavrnjena' };
    default:         return { cls: 'sent',     label: 'Poslana' };
  }
}

async function setQuoteStatus(id, status) {
  const { error } = await supabaseClient.from('quotes')
    .update({ status, status_changed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { toast('Napaka pri spremembi statusa ponudbe', 'error'); return; }
  const msg = status === 'realized' ? 'Ponudba označena kot realizirana 🎉'
            : status === 'rejected' ? 'Ponudba označena kot zavrnjena'
            : 'Status ponastavljen na Poslano';
  toast(msg, 'success');
  loadCustomers();
}

// Regenerate and download a previously stored quote as PDF.
async function downloadStoredQuote(id) {
  await loadAgencyInfo();
  const { data: row } = await supabaseClient.from('quotes').select('*').eq('id', id).single();
  if (!row) { toast('Ponudbe ni mogoče najti', 'error'); return; }
  const q = {
    number:          row.quote_number,
    validUntil:      row.valid_until,
    customerName:    row.customer_name,
    customerEmail:   row.customer_email,
    customerTax:     row.customer_tax,
    customerAddress: row.customer_address,
    notes:           row.notes,
    vatRate:         Number(row.vat_rate) || 0,
    items:           Array.isArray(row.items) ? row.items : [],
  };
  try {
    const pdf = await generateQuotePdf(q);
    pdf.save(`${q.number || 'ponudba'}.pdf`);
  } catch (err) {
    toast('Izdelava PDF ni uspela: ' + (err.message || err), 'error');
  }
}

// ── Settings ──────────────────────────────────────────────────
async function loadSettings() {
  const { data } = await supabaseClient.from('settings').select('*').single();
  if (!data) return;

  setVal('setSiteName',      data.site_name);
  setVal('setLogoText',      data.logo_text);
  setVal('setEmail',         data.contact_email);
  setVal('setPhone',         data.contact_phone);
  setVal('setFacebook',      data.facebook_url);
  setVal('setLinkedin',      data.linkedin_url);
  setVal('setInstagram',     data.instagram_url);
  setVal('setMetaTitle',     data.meta_title);
  setVal('setMetaDesc',      data.meta_description);
  setVal('setCompanyName',    data.company_name);
  setVal('setCompanyAddress', data.company_address);
  setVal('setCompanyTax',     data.company_tax);
  setVal('setCompanyIban',    data.company_iban);

  const logoPreview = document.getElementById('logoImagePreview');
  const removeLogoBtn = document.getElementById('removeLogoBtn');
  if (logoPreview) {
    if (data.logo_image_url) {
      logoPreview.src = data.logo_image_url;
      logoPreview.style.display = 'block';
      if (removeLogoBtn) removeLogoBtn.style.display = 'inline-flex';
    } else {
      logoPreview.style.display = 'none';
      if (removeLogoBtn) removeLogoBtn.style.display = 'none';
    }
  }
}

document.getElementById('logoImageFile')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = await uploadFile(file, 'branding/logo');
  if (!url) return;

  await updateSettings({ logo_image_url: url });

  const preview = document.getElementById('logoImagePreview');
  if (preview) { preview.src = url; preview.style.display = 'block'; }
  const removeLogoBtn = document.getElementById('removeLogoBtn');
  if (removeLogoBtn) removeLogoBtn.style.display = 'inline-flex';
});

document.getElementById('removeLogoBtn')?.addEventListener('click', async () => {
  if (!confirm('Odstranite logotip in uporabite besedilni naslov?')) return;
  await updateSettings({ logo_image_url: '' });

  const preview = document.getElementById('logoImagePreview');
  if (preview) preview.style.display = 'none';
  const removeLogoBtn = document.getElementById('removeLogoBtn');
  if (removeLogoBtn) removeLogoBtn.style.display = 'none';
});

document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  await updateSettings({
    site_name:        getVal('setSiteName'),
    logo_text:        getVal('setLogoText'),
    contact_email:    getVal('setEmail'),
    contact_phone:    getVal('setPhone'),
    facebook_url:     getVal('setFacebook'),
    linkedin_url:     getVal('setLinkedin'),
    instagram_url:    getVal('setInstagram'),
    meta_title:       getVal('setMetaTitle'),
    meta_description: getVal('setMetaDesc'),
    company_name:     getVal('setCompanyName'),
    company_address:  getVal('setCompanyAddress'),
    company_tax:      getVal('setCompanyTax'),
    company_iban:     getVal('setCompanyIban'),
  }, e.target.querySelector('[type="submit"]'));
  agencyInfo = {}; // force reload of agency details on next quote
});

// ── Shared helpers ────────────────────────────────────────────
async function updateSettings(payload, btn = null) {
  if (btn) setLoading(btn, true);

  const { error } = await supabaseClient
    .from('settings')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // update the only row

  if (btn) setLoading(btn, false);

  if (error) {
    toast('Shranjevanje ni uspelo: ' + error.message, 'error');
  } else {
    toast('Shranjeno', 'success');
  }
}

// Zmanjša in ponovno stisne fotografijo pred nalaganjem (Canvas, brez
// dodatnih knjižnic) — večina naloženih fotografij je naravnost s telefona
// (več MB, tisoče px), končni prikaz na strani pa je vedno majhna kartica
// ali profilna slika. SVG/GIF (animacije) in že dovolj majhne datoteke
// pustimo pri miru; ob kakršni koli napaki vrnemo prvotno datoteko.
function resizeImageFile(file, { maxDimension = 1600, quality = 0.82 } = {}) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
      resolve(file);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      if (scale >= 1 && file.size < 400 * 1024) {
        resolve(file); // že dovolj majhna — ne ponovno stiskaj po nepotrebnem
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) { resolve(file); return; }
        resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

async function uploadFile(file, path, { resize } = {}) {
  if (resize) file = await resizeImageFile(file, resize);

  const ext  = file.name.split('.').pop();
  const full = `${path}.${ext}`;

  // Najprej odstrani morebitno obstoječo datoteko na isti poti (npr. profilna
  // slika ima vedno pot "about/profile.*"). Brez tega bi "upsert" ob ponovnem
  // nalaganju poskusil UPDATE obstoječe vrstice v storage.objects, kar pade na
  // "new row violates row-level security policy", če projekt nima ločenega
  // UPDATE pravila (le INSERT/DELETE).
  await supabaseClient.storage.from('portfolio').remove([full]);

  const { error } = await supabaseClient.storage.from('portfolio').upload(full, file, { upsert: true });
  if (error) { toast('Nalaganje ni uspelo: ' + error.message, 'error'); return null; }

  const { data } = supabaseClient.storage.from('portfolio').getPublicUrl(full);
  // Pot v storage (npr. "branding/logo.png") je pri logotipu/profilni sliki
  // vedno enaka, zato brskalnik/CDN po ponovnem nalaganju še vedno postreže
  // staro, predpomnjeno sliko na isti URL. Dodamo "?v=timestamp", da je URL
  // ob vsakem nalaganju unikaten in se slika vedno znova naloži.
  return `${data.publicUrl}?v=${Date.now()}`;
}

// ── Modal helpers ─────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

// close on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// ── Toast ─────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Loading spinner ───────────────────────────────────────────
function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.orig = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Shranjujem…';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.orig || 'Shrani';
    btn.disabled = false;
  }
}

// ── Form value helpers ────────────────────────────────────────
function getVal(id)       { return document.getElementById(id)?.value ?? ''; }
function setVal(id, val)  { const el = document.getElementById(id); if (el) el.value = val ?? ''; }
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function escAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ================================================================
// Objave — priprava vsebin za družbena omrežja (AI generator)
// ================================================================

const CONTENT_PILLARS = [
  'Pred / po preobrazba',
  'Mini-nasvet za podjetnike',
  'Problem → rešitev',
  'Funkcija izdelka',
  'Mit / pogosta napaka',
  'Zakulisje EPO.SI',
  'Rezultat / dokaz',
];

const CONTENT_STATUS_LABELS = { idea: 'Ideja', scheduled: 'Načrtovano', posted: 'Objavljeno' };
const CONTENT_DAY_NAMES = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob', 'Ned'];

// Formati slik + ustrezne povezave za odpiranje v Canvi (pravi format).
const CONTENT_FORMATS = [
  { key: 'ig_post', label: 'IG objava (1:1)',  w: 1080, h: 1080, canva: 'https://www.canva.com/instagram-posts/templates/' },
  { key: 'story',   label: 'Zgodba (9:16)',    w: 1080, h: 1920, canva: 'https://www.canva.com/instagram-stories/templates/' },
  { key: 'fb_post', label: 'FB objava (1.91:1)', w: 1200, h: 630, canva: 'https://www.canva.com/facebook-posts/templates/' },
];
function getContentFormat() {
  return CONTENT_FORMATS.find(f => f.key === contentFormat) || CONTENT_FORMATS[0];
}

// Endpoint Edge funkcije za generiranje (API ključ ostane na strežniku).
const GENERATE_ENDPOINT =
  (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL)
    ? `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/generate`
    : '';

// Canva (Connect API) — endpoint Edge funkcije + nastavitve OAuth.
const CANVA_ENDPOINT =
  (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL)
    ? `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/canva`
    : '';
const CANVA_TOKEN_KEY = 'epo_canva_tokens';
const CANVA_SCOPES = 'asset:write design:content:write design:meta:read';

// Stanje razdelka
let contentInited     = false;
let contentPillar     = null;
let contentFormat     = 'ig_post';
let contentResult     = null;   // { hook, caption, hashtags, imageBrief }
let contentPosts      = [];
let contentFilter     = 'all';
let contentView       = 'list';
let contentWeekStart  = contentStartOfWeek(new Date());

// ── Vstop v razdelek ───────────────────────────────────────────
function loadContent() {
  if (!contentInited) {
    initContent();
    contentInited = true;
  }
  loadPosts();
}

function initContent() {
  // Pilule za tip vsebine
  const pillarsEl = document.getElementById('contentPillars');
  if (pillarsEl) {
    pillarsEl.innerHTML = CONTENT_PILLARS
      .map(p => `<button type="button" class="content-pill" data-pillar="${escAttr(p)}">${escHtml(p)}</button>`)
      .join('');
    pillarsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.content-pill');
      if (!btn) return;
      contentPillar = btn.dataset.pillar;
      pillarsEl.querySelectorAll('.content-pill')
        .forEach(p => p.classList.toggle('active', p === btn));
    });
  }

  // Formati slik
  const formatsEl = document.getElementById('contentFormats');
  if (formatsEl) {
    formatsEl.innerHTML = CONTENT_FORMATS
      .map(f => `<button type="button" class="content-pill${f.key === contentFormat ? ' active' : ''}" data-format="${f.key}">${escHtml(f.label)}</button>`)
      .join('');
    formatsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.content-pill');
      if (!btn) return;
      contentFormat = btn.dataset.format;
      formatsEl.querySelectorAll('.content-pill').forEach(p => p.classList.toggle('active', p === btn));
      // Če rezultat že obstaja, osveži sliko v novem formatu.
      if (contentResult) { contentResult.imageSeed = contentResult.imageSeed || Math.floor(Math.random() * 1e6); loadContentImage(); }
    });
  }

  document.getElementById('contentGenerateBtn')?.addEventListener('click', runContentGenerate);
  document.getElementById('contentAnotherBtn')?.addEventListener('click', runContentGenerate);
  document.getElementById('contentWeekBtn')?.addEventListener('click', runContentWeek);

  // Filtri knjižnice
  const filtersEl = document.getElementById('contentFilters');
  filtersEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('.content-pill');
    if (!btn) return;
    contentFilter = btn.dataset.filter;
    filtersEl.querySelectorAll('.content-pill').forEach(p => p.classList.toggle('active', p === btn));
    renderContentLibrary();
  });

  // Preklop pogleda
  document.getElementById('contentViewList')?.addEventListener('click', () => switchContentView('list'));
  document.getElementById('contentViewCal')?.addEventListener('click', () => switchContentView('cal'));

  // Navigacija koledarja
  document.getElementById('contentCalPrev')?.addEventListener('click', () => {
    contentWeekStart = contentAddDays(contentWeekStart, -7);
    renderContentCalendar();
  });
  document.getElementById('contentCalNext')?.addEventListener('click', () => {
    contentWeekStart = contentAddDays(contentWeekStart, 7);
    renderContentCalendar();
  });

  // Obrazca v modalih
  document.getElementById('postSaveForm')?.addEventListener('submit', submitPostSave);
  document.getElementById('postEditForm')?.addEventListener('submit', submitPostEdit);
}

// ── Klic Edge funkcije ─────────────────────────────────────────
async function callGenerate(payload) {
  if (!GENERATE_ENDPOINT) throw new Error('Generator ni nastavljen (manjka SUPABASE_URL).');
  const res = await fetch(GENERATE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY
        ? { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
        : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Napaka pri generiranju.');
  return data;
}

// ── Generiranje ene objave ─────────────────────────────────────
async function runContentGenerate() {
  const errEl = document.getElementById('contentGenError');
  if (!contentPillar) { showContentError(errEl, 'Najprej izberi tip vsebine.'); return; }
  errEl.style.display = 'none';

  const genBtn = document.getElementById('contentGenerateBtn');
  const anotherBtn = document.getElementById('contentAnotherBtn');
  setContentLoading(genBtn, true, 'Generiram…');
  if (anotherBtn) anotherBtn.disabled = true;

  try {
    const topic = document.getElementById('contentTopic').value.trim();
    const data = await callGenerate({ mode: 'post', pillar: contentPillar, topic });
    contentResult = data;
    renderContentResult(data);
    if (anotherBtn) anotherBtn.style.display = 'inline-flex';
  } catch (err) {
    showContentError(errEl, err.message);
  } finally {
    setContentLoading(genBtn, false, 'Generiraj');
    if (anotherBtn) anotherBtn.disabled = false;
  }
}

function renderContentResult(d) {
  const el = document.getElementById('contentResult');
  if (!el) return;
  const tags = (d.hashtags || []).map(h => `<span class="content-tag">#${escHtml(h)}</span>`).join('');
  el.innerHTML = `
    <div class="content-result-block">
      <div class="content-result-label">Kljuka</div>
      <div class="content-result-text">${escHtml(d.hook)}</div>
    </div>
    <div class="content-result-block">
      <div class="content-result-label">Besedilo</div>
      <div class="content-result-text">${escHtml(d.caption)}</div>
    </div>
    <div class="content-result-block">
      <div class="content-result-label">Hashtagi</div>
      <div class="content-tags">${tags || '<span style="color:var(--text-muted)">—</span>'}</div>
    </div>
    <div class="content-result-block">
      <div class="content-result-label">Ideja za vizual</div>
      <div class="content-result-text">${escHtml(d.imageBrief)}</div>
    </div>
    <div class="content-result-block">
      <div class="content-result-label" style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem">
        <span>Slika · <span id="contentImgFormat"></span></span>
        <span style="display:flex;gap:0.4rem">
          <button class="btn btn-sm btn-ghost" id="contentImgRegen" type="button">Druga slika</button>
          <button class="btn btn-sm btn-ghost" id="contentImgDownload" type="button">Prenesi sliko</button>
        </span>
      </div>
      <div id="contentImgWrap" class="content-img-wrap"></div>
    </div>
    <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:1rem">
      <button class="btn btn-primary" id="contentSaveBtn" type="button">Shrani objavo</button>
      <button class="btn btn-ghost" id="contentCanvaExportBtn" type="button">Pošlji v Canvo</button>
      <button class="btn btn-ghost" id="contentCanvaBtn" type="button">Uredi v Canvi (ročno)</button>
      <button class="btn btn-ghost" id="contentCopyAllBtn" type="button">Kopiraj besedilo</button>
    </div>`;
  el.style.display = 'block';

  document.getElementById('contentSaveBtn')?.addEventListener('click', openPostSaveModal);
  document.getElementById('contentCopyAllBtn')?.addEventListener('click', (e) =>
    contentCopy(contentFullText(contentResult), e.currentTarget));
  document.getElementById('contentCanvaExportBtn')?.addEventListener('click', (e) => exportToCanva(e.currentTarget));
  document.getElementById('contentCanvaBtn')?.addEventListener('click', editInCanva);
  document.getElementById('contentImgRegen')?.addEventListener('click', () => {
    contentResult.imageSeed = Math.floor(Math.random() * 1e6);
    loadContentImage();
  });
  document.getElementById('contentImgDownload')?.addEventListener('click', (e) =>
    downloadContentImage(contentResult.imageUrl, e.currentTarget));

  // Samodejno ustvari sliko ob izrisu rezultata.
  loadContentImage();
}

// Sestavi seznam možnih URL-jev za brezplačno generiranje slike
// (Pollinations.ai — brez ključa). Poskušamo po vrsti, dokler ena ne uspe.
function buildImageCandidates(prompt, seed, fmt) {
  const styled = `${prompt}. Professional social media visual, modern, high quality, no text`;
  const enc = encodeURIComponent(styled.slice(0, 300));
  const base = `https://image.pollinations.ai/prompt/${enc}`;
  const dims = `width=${fmt.w}&height=${fmt.h}`;
  return [
    `${base}?${dims}&seed=${seed}&model=flux`,
    `${base}?${dims}&seed=${seed}`,
    `${base}?${dims}&seed=${seed}&model=turbo`,
  ];
}

function loadContentImage() {
  const wrap = document.getElementById('contentImgWrap');
  if (!wrap || !contentResult) return;
  const fmt = getContentFormat();
  const fmtLabel = document.getElementById('contentImgFormat');
  if (fmtLabel) fmtLabel.textContent = `${fmt.label} (${fmt.w}×${fmt.h})`;
  const topic = document.getElementById('contentTopic')?.value || '';
  const prompt = (contentResult.imagePrompt || contentResult.imageBrief ||
    `${contentResult.hook || ''} ${topic}`).trim();
  if (!contentResult.imageSeed) contentResult.imageSeed = Math.floor(Math.random() * 1e6);

  const candidates = buildImageCandidates(prompt, contentResult.imageSeed, fmt);
  contentResult.imageUrl = candidates[0];

  wrap.innerHTML = `<div class="content-img-loading"><span class="spinner"></span> Ustvarjam sliko… (lahko traja 10–20 s)</div>`;

  let i = 0;
  const tryNext = () => {
    if (i >= candidates.length) {
      wrap.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem">Slike trenutno ni bilo mogoče ustvariti (storitev je morda zasedena). Poskusi znova z »Druga slika«.</div>';
      return;
    }
    const url = candidates[i++];
    const img = new Image();
    img.onload = () => {
      contentResult.imageUrl = url;
      wrap.innerHTML = '';
      img.className = 'content-img';
      wrap.appendChild(img);
    };
    img.onerror = tryNext;
    img.src = url;
  };
  tryNext();
}

async function downloadContentImage(url, btn) {
  if (!url) return;
  const prev = btn ? btn.textContent : '';
  if (btn) { btn.textContent = 'Prenašam…'; btn.disabled = true; }
  try {
    const r = await fetch(url);
    const b = await r.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'epo-objava.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  } catch (_) {
    window.open(url, '_blank');
  } finally {
    if (btn) { btn.textContent = prev; btn.disabled = false; }
  }
}

// ── Canva (Connect API) ────────────────────────────────────────
async function callCanva(payload) {
  if (!CANVA_ENDPOINT) throw new Error('Canva ni nastavljena (manjka SUPABASE_URL).');
  const res = await fetch(CANVA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY
        ? { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
        : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Napaka pri komunikaciji s Canvo.');
  return data;
}

// PKCE pripomočki
function canvaB64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function canvaRandom(len) {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => ('0' + b.toString(16)).slice(-2)).join('').slice(0, len);
}
async function canvaSha256(str) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
}
function canvaRedirectUri() {
  return `${location.origin}${location.pathname}`;
}

function getCanvaTokens() {
  try { return JSON.parse(localStorage.getItem(CANVA_TOKEN_KEY) || 'null'); } catch (_) { return null; }
}
function storeCanvaTokens(data) {
  const prev = getCanvaTokens() || {};
  const tokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || prev.refresh_token,
    expires_at: Date.now() + ((Number(data.expires_in) || 3600) * 1000) - 60000,
  };
  localStorage.setItem(CANVA_TOKEN_KEY, JSON.stringify(tokens));
}
function isCanvaConnected() {
  const t = getCanvaTokens();
  return !!(t && t.refresh_token);
}

// Začni OAuth povezavo s Canvo (preusmeritev na Canva avtorizacijo).
async function connectCanva() {
  const cfg = await callCanva({ action: 'config' });
  if (!cfg.clientId) throw new Error('Manjka Canva Client ID na strežniku.');
  const verifier = canvaRandom(96);
  const challenge = canvaB64url(await canvaSha256(verifier));
  const state = canvaRandom(24);
  const redirect = canvaRedirectUri();
  sessionStorage.setItem('canva_pkce', JSON.stringify({ verifier, state, redirect }));

  const url = new URL('https://www.canva.com/api/oauth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('scope', CANVA_SCOPES);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('state', state);
  url.searchParams.set('redirect_uri', redirect);
  window.location.href = url.toString();
}

// Ob vrnitvi s Canve (?code=...) zamenjaj kodo za žetone.
async function handleCanvaRedirect() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  const state = params.get('state');
  if (!code) return;

  const saved = (() => {
    try { return JSON.parse(sessionStorage.getItem('canva_pkce') || 'null'); } catch (_) { return null; }
  })();
  history.replaceState({}, '', location.pathname); // počisti URL

  if (!saved || saved.state !== state) {
    toast('Canva: neveljavna prijavna seja, poskusi znova.', 'error');
    return;
  }
  try {
    const data = await callCanva({
      action: 'token', code, code_verifier: saved.verifier, redirect_uri: saved.redirect,
    });
    storeCanvaTokens(data);
    sessionStorage.removeItem('canva_pkce');
    toast('Canva je povezana ✓', 'success');
    navigateTo('content');
  } catch (e) {
    toast('Canva prijava ni uspela: ' + e.message, 'error');
  }
}

// Vrni veljaven dostopni žeton (po potrebi ga osveži). null = ni povezave.
async function ensureCanvaToken() {
  const t = getCanvaTokens();
  if (!t || !t.refresh_token) return null;
  if (t.access_token && Date.now() < t.expires_at) return t.access_token;
  const data = await callCanva({ action: 'refresh', refresh_token: t.refresh_token });
  storeCanvaTokens(data);
  return getCanvaTokens().access_token;
}

// Samodejno pošlji generirano sliko v Canvo (ustvari nov osnutek).
async function exportToCanva(btn) {
  if (!contentResult || !contentResult.imageUrl) {
    toast('Najprej generiraj objavo s sliko.', 'error');
    return;
  }
  if (!isCanvaConnected()) {
    toast('Najprej poveži Canvo — preusmerjam na prijavo …', 'success');
    try { await connectCanva(); } catch (e) { toast('Canva: ' + e.message, 'error'); }
    return;
  }
  const fmt = getContentFormat();
  // Odpri zavihek takoj (znotraj geste), da ga brskalnik ne blokira.
  const win = window.open('about:blank', '_blank');
  setContentLoading(btn, true, 'Pošiljam v Canvo…');
  try {
    const token = await ensureCanvaToken();
    if (!token) { win && win.close(); toast('Canva ni povezana.', 'error'); return; }
    const data = await callCanva({
      action: 'export', access_token: token, image_url: contentResult.imageUrl, width: fmt.w, height: fmt.h,
    });
    if (data.edit_url) {
      if (win) win.location.href = data.edit_url; else window.open(data.edit_url, '_blank', 'noopener');
      toast('Osnutek s sliko je ustvarjen v Canvi ✓', 'success');
    } else {
      win && win.close();
      toast('Canva ni vrnila povezave do osnutka.', 'error');
    }
  } catch (e) {
    win && win.close();
    toast('Prenos v Canvo ni uspel: ' + e.message, 'error');
  } finally {
    setContentLoading(btn, false, 'Pošlji v Canvo');
  }
}

// Odpri Canvo v pravem formatu + samodejno kopiraj besedilo in prenesi sliko.
function editInCanva() {
  if (!contentResult) return;
  const fmt = getContentFormat();
  // Najprej odpri zavihek (znotraj uporabnikove geste), da ga brskalnik ne blokira.
  window.open(fmt.canva, '_blank', 'noopener');
  contentCopy(contentFullText(contentResult), null);
  if (contentResult.imageUrl) downloadContentImage(contentResult.imageUrl, null);
  toast('Besedilo kopirano in slika prenesena — v Canvi prilepi besedilo in naloži sliko.', 'success');
}

// ── Shranjevanje generirane objave ─────────────────────────────
function openPostSaveModal() {
  setVal('postSaveStatus', 'idea');
  setVal('postSaveDate', '');
  openModal('postSaveModal');
}

async function submitPostSave(e) {
  e.preventDefault();
  if (!contentResult) return;
  const btn = e.target.querySelector('[type="submit"]');
  const status = getVal('postSaveStatus');
  const row = {
    pillar: contentPillar,
    topic: document.getElementById('contentTopic').value.trim() || '',
    hook: contentResult.hook,
    caption: contentResult.caption,
    hashtags: contentResult.hashtags || [],
    image_brief: contentResult.imageBrief || '',
    image_url: contentResult.imageUrl || '',
    status,
    scheduled_for: getVal('postSaveDate') || null,
    posted_at: status === 'posted' ? new Date().toISOString() : null,
  };

  setLoading(btn, true);
  const { error } = await supabaseClient.from('posts').insert([row]);
  setLoading(btn, false);

  if (error) { toast('Napaka pri shranjevanju objave', 'error'); return; }
  toast('Objava shranjena', 'success');
  closeModal('postSaveModal');
  loadPosts();
}

// ── 7-dnevni načrt ─────────────────────────────────────────────
async function runContentWeek() {
  const errEl = document.getElementById('contentWeekError');
  errEl.style.display = 'none';
  const btn = document.getElementById('contentWeekBtn');
  setContentLoading(btn, true, 'Ustvarjam…');
  try {
    const data = await callGenerate({ mode: 'week' });
    renderContentWeek(data.days || []);
  } catch (err) {
    showContentError(errEl, err.message);
  } finally {
    setContentLoading(btn, false, 'Ustvari načrt');
  }
}

function renderContentWeek(days) {
  const grid = document.getElementById('contentWeekGrid');
  if (!grid) return;
  grid.innerHTML = days.map((d, i) => `
    <div class="content-day-card">
      <div class="content-day-name">${CONTENT_DAY_NAMES[i % 7]}</div>
      <div class="content-day-pillar">${escHtml(d.pillar)}</div>
      <div class="content-day-idea">${escHtml(d.idea)}</div>
      <button class="btn btn-sm btn-ghost" data-dev="${escAttr(JSON.stringify(d))}" type="button">Razvij v objavo →</button>
    </div>`).join('');

  grid.querySelectorAll('[data-dev]').forEach(btn => {
    btn.addEventListener('click', () => developContentIdea(JSON.parse(btn.dataset.dev)));
  });
}

function developContentIdea(d) {
  const pillarsEl = document.getElementById('contentPillars');
  if (CONTENT_PILLARS.includes(d.pillar)) {
    contentPillar = d.pillar;
    pillarsEl?.querySelectorAll('.content-pill')
      .forEach(p => p.classList.toggle('active', p.dataset.pillar === d.pillar));
  }
  setVal('contentTopic', d.idea || '');
  document.querySelector('.admin-content')?.scrollTo({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  runContentGenerate();
}

// ── Knjižnica: nalaganje in izris ──────────────────────────────
async function loadPosts() {
  const errEl = document.getElementById('contentLibError');
  const { data, error } = await supabaseClient
    .from('posts').select('*').order('created_at', { ascending: false });
  if (error) {
    if (errEl) { errEl.textContent = 'Napaka pri nalaganju: ' + error.message; errEl.style.display = 'block'; }
    return;
  }
  if (errEl) errEl.style.display = 'none';
  contentPosts = data || [];
  renderContentLibrary();
}

function switchContentView(v) {
  contentView = v;
  const list = v === 'list';
  document.getElementById('contentViewList')?.classList.toggle('btn-primary', list);
  document.getElementById('contentViewList')?.classList.toggle('btn-ghost', !list);
  document.getElementById('contentViewCal')?.classList.toggle('btn-primary', !list);
  document.getElementById('contentViewCal')?.classList.toggle('btn-ghost', list);
  document.getElementById('contentListView').style.display = list ? 'block' : 'none';
  document.getElementById('contentFilters').style.display = list ? 'flex' : 'none';
  document.getElementById('contentCalView').style.display = list ? 'none' : 'block';
  renderContentLibrary();
}

function renderContentLibrary() {
  if (contentView === 'cal') { renderContentCalendar(); return; }
  const listEl = document.getElementById('contentListView');
  const emptyEl = document.getElementById('contentEmpty');
  const filtered = contentFilter === 'all'
    ? contentPosts
    : contentPosts.filter(p => p.status === contentFilter);

  if (emptyEl) emptyEl.style.display = filtered.length ? 'none' : 'block';
  if (!listEl) return;

  listEl.innerHTML = filtered.map(renderContentPost).join('');
  filtered.forEach(p => {
    const item = listEl.querySelector(`.content-post[data-id="${p.id}"]`);
    if (!item) return;
    item.querySelectorAll('[data-act]').forEach(btn => {
      btn.addEventListener('click', () => handleContentAction(btn.dataset.act, p, btn));
    });
  });
}

function renderContentPost(p) {
  const tags = (p.hashtags || []).map(h => `#${escHtml(h)}`).join(' ');
  const dateLine = p.scheduled_for ? ` · ${contentFormatDate(p.scheduled_for)}` : '';
  return `
    <div class="content-post" data-id="${p.id}">
      <div class="content-post-meta">
        <span class="content-post-pillar">${escHtml(p.pillar)}</span>
        <span class="content-badge ${escAttr(p.status)}">${escHtml(CONTENT_STATUS_LABELS[p.status] || p.status)}</span>
        <span style="color:var(--text-muted);font-size:0.82rem">${dateLine}</span>
      </div>
      ${p.image_url ? `<img src="${escAttr(p.image_url)}" alt="Vizual objave" class="content-post-img" loading="lazy">` : ''}
      <div class="content-post-hook">${escHtml(p.hook)}</div>
      <div class="content-post-caption">${escHtml(p.caption)}</div>
      ${tags ? `<div style="color:var(--text-muted);font-size:0.82rem;margin-top:0.5rem">${tags}</div>` : ''}
      <div class="content-post-actions">
        <button class="btn btn-sm btn-ghost" data-act="copy">Kopiraj besedilo</button>
        ${p.image_url ? `<button class="btn btn-sm btn-ghost" data-act="image">Prenesi sliko</button>` : ''}
        <button class="btn btn-sm btn-ghost" data-act="edit">Uredi</button>
        ${p.status !== 'posted' ? `<button class="btn btn-sm btn-ghost" data-act="posted">Označi objavljeno</button>` : ''}
        <button class="btn btn-sm btn-danger" data-act="delete">Izbriši</button>
      </div>
    </div>`;
}

async function handleContentAction(act, p, btn) {
  if (act === 'copy') {
    contentCopy(contentFullText({ hook: p.hook, caption: p.caption, hashtags: p.hashtags }), btn);
  } else if (act === 'image') {
    downloadContentImage(p.image_url, btn);
  } else if (act === 'edit') {
    openPostEditModal(p);
  } else if (act === 'posted') {
    const { error } = await supabaseClient.from('posts')
      .update({ status: 'posted', posted_at: new Date().toISOString() }).eq('id', p.id);
    if (error) { toast('Napaka pri posodabljanju', 'error'); return; }
    toast('Označeno kot objavljeno', 'success');
    loadPosts();
  } else if (act === 'delete') {
    if (!confirm('Res izbrišem to objavo?')) return;
    const { error } = await supabaseClient.from('posts').delete().eq('id', p.id);
    if (error) { toast('Napaka pri brisanju', 'error'); return; }
    toast('Objava izbrisana', 'success');
    loadPosts();
  }
}

// ── Urejanje objave ────────────────────────────────────────────
function openPostEditModal(p) {
  setVal('postEditId', p.id);
  setVal('postEditHook', p.hook || '');
  setVal('postEditCaption', p.caption || '');
  setVal('postEditHashtags', (p.hashtags || []).join(', '));
  setVal('postEditImageBrief', p.image_brief || '');
  setVal('postEditStatus', p.status || 'idea');
  setVal('postEditDate', p.scheduled_for || '');
  document.getElementById('postEditForm').dataset.postedAt = p.posted_at || '';
  openModal('postEditModal');
}

async function submitPostEdit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  const id = getVal('postEditId');
  const status = getVal('postEditStatus');
  const patch = {
    hook: getVal('postEditHook'),
    caption: getVal('postEditCaption'),
    hashtags: getVal('postEditHashtags').split(',').map(h => h.replace(/^#/, '').trim()).filter(Boolean),
    image_brief: getVal('postEditImageBrief'),
    status,
    scheduled_for: getVal('postEditDate') || null,
  };
  if (status === 'posted' && !e.target.dataset.postedAt) {
    patch.posted_at = new Date().toISOString();
  }

  setLoading(btn, true);
  const { error } = await supabaseClient.from('posts').update(patch).eq('id', id);
  setLoading(btn, false);

  if (error) { toast('Napaka pri shranjevanju', 'error'); return; }
  toast('Objava posodobljena', 'success');
  closeModal('postEditModal');
  loadPosts();
}

// ── Koledar ────────────────────────────────────────────────────
function renderContentCalendar() {
  const label = document.getElementById('contentCalLabel');
  const cal = document.getElementById('contentCalendar');
  if (!cal) return;
  const end = contentAddDays(contentWeekStart, 6);
  if (label) label.textContent = `${contentFormatDate(contentWeekStart)} – ${contentFormatDate(end)}`;

  const todayIso = contentIsoDate(new Date());
  let html = '';
  for (let i = 0; i < 7; i++) {
    const day = contentAddDays(contentWeekStart, i);
    const iso = contentIsoDate(day);
    const dayPosts = contentPosts.filter(p => p.scheduled_for === iso);
    const chips = dayPosts.map(p =>
      `<div class="content-cal-chip ${p.status === 'posted' ? 'posted' : ''}" data-id="${p.id}" title="${escAttr(p.hook)}">${escHtml((p.hook || '').slice(0, 40))}</div>`
    ).join('');
    html += `
      <div class="content-cal-day ${iso === todayIso ? 'today' : ''}">
        <div class="content-cal-date">${CONTENT_DAY_NAMES[i]} ${day.getDate()}.${day.getMonth() + 1}.</div>
        ${chips}
      </div>`;
  }
  cal.innerHTML = html;

  cal.querySelectorAll('.content-cal-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const p = contentPosts.find(x => String(x.id) === String(chip.dataset.id));
      if (p) openPostEditModal(p);
    });
  });
}

// ── Pripomočki ─────────────────────────────────────────────────
function contentFullText({ hook, caption, hashtags }) {
  const tags = (hashtags || []).map(h => `#${h}`).join(' ');
  return [hook, '', caption, '', tags].join('\n').trim();
}

async function contentCopy(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (_) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
  }
  if (btn) {
    const prev = btn.textContent;
    btn.textContent = 'Kopirano ✓';
    setTimeout(() => { btn.textContent = prev; }, 1400);
  }
}

function setContentLoading(btn, loading, label) {
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading ? `<span class="spinner"></span> ${label}` : label;
}

function showContentError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function contentFormatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString('sl-SI', { day: 'numeric', month: 'short', year: 'numeric' });
}

function contentIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function contentStartOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // ponedeljek = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function contentAddDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
