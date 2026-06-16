// ================================================================
// admin.js — Admin panel
// ================================================================

let currentSection = 'dashboard';
let skillsList = [];
let statsList  = [];

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

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session) showDashboard();
    else         showLogin();
  });
}

function showLogin() {
  document.getElementById('loginScreen').style.display  = 'flex';
  document.getElementById('adminLayout').style.display  = 'none';
}

function showDashboard() {
  document.getElementById('loginScreen').style.display  = 'none';
  document.getElementById('adminLayout').style.display  = 'flex';
  initAdmin();
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
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('open');
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
    services: 'Storitve', projects: 'Projekti',
    messages: 'Sporočila', settings: 'Nastavitve',
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
    case 'messages':  return loadMessages();
    case 'settings':  return loadSettings();
  }
}

// ── Dashboard ─────────────────────────────────────────────────
async function loadDashboard() {
  const [projRes, msgRes, unreadRes] = await Promise.all([
    supabaseClient.from('projects').select('id', { count: 'exact', head: true }),
    supabaseClient.from('contacts').select('id', { count: 'exact', head: true }),
    supabaseClient.from('contacts').select('id', { count: 'exact', head: true }).eq('is_read', false),
  ]);

  setText('dashProjects', projRes.count ?? 0);
  setText('dashMessages', msgRes.count ?? 0);
  setText('dashUnread',   unreadRes.count ?? 0);
  setText('dashUpdated',  new Date().toLocaleDateString());
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

  skillsList = data.skills?.items ?? [];
  renderSkillTags();

  statsList = Array.isArray(data.stats) ? data.stats : [];
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
  const url = await uploadFile(file, 'about/profile');
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
  const url = await uploadFile(file, path);
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
      <td>${new Date(m.created_at).toLocaleDateString()}</td>
      <td>${escHtml(m.name)}</td>
      <td>${escHtml(m.email)}</td>
      <td>${escHtml(m.subject || '—')}</td>
      <td>
        <span class="msg-badge ${m.is_read ? 'read' : 'unread'}">${m.is_read ? 'Prebrano' : 'Novo'}</span>
      </td>
      <td>
        <div style="display:flex;gap:0.4rem">
          <button class="btn btn-sm btn-ghost" onclick="viewMessage('${m.id}')">Poglej</button>
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

// ── Settings ──────────────────────────────────────────────────
async function loadSettings() {
  const { data } = await supabaseClient.from('settings').select('*').single();
  if (!data) return;

  setVal('setSiteName',      data.site_name);
  setVal('setLogoText',      data.logo_text);
  setVal('setEmail',         data.contact_email);
  setVal('setPhone',         data.contact_phone);
  setVal('setGithub',        data.github_url);
  setVal('setLinkedin',      data.linkedin_url);
  setVal('setInstagram',     data.instagram_url);
  setVal('setMetaTitle',     data.meta_title);
  setVal('setMetaDesc',      data.meta_description);
}

document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  await updateSettings({
    site_name:        getVal('setSiteName'),
    logo_text:        getVal('setLogoText'),
    contact_email:    getVal('setEmail'),
    contact_phone:    getVal('setPhone'),
    github_url:       getVal('setGithub'),
    linkedin_url:     getVal('setLinkedin'),
    instagram_url:    getVal('setInstagram'),
    meta_title:       getVal('setMetaTitle'),
    meta_description: getVal('setMetaDesc'),
  }, e.target.querySelector('[type="submit"]'));
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

async function uploadFile(file, path) {
  const ext  = file.name.split('.').pop();
  const full = `${path}.${ext}`;

  const { error } = await supabaseClient.storage.from('portfolio').upload(full, file, { upsert: true });
  if (error) { toast('Nalaganje ni uspelo: ' + error.message, 'error'); return null; }

  const { data } = supabaseClient.storage.from('portfolio').getPublicUrl(full);
  return data.publicUrl;
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
