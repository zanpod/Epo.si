// ================================================================
// main.js — Public site
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  loadSiteData();
  initScrollReveal();
  initContactForm();
  trackPageView();
});

// ── Analitika obiskov (anonimno, lastno v Supabase) ───────────
async function trackPageView() {
  if (typeof supabaseClient === 'undefined') return;
  try {
    // Anonimni prvoosebni ID za približno štetje unikatnih obiskovalcev
    let vid = localStorage.getItem('epo_visitor_id');
    if (!vid) {
      vid = (window.crypto?.randomUUID?.() ||
             (Date.now().toString(36) + Math.random().toString(16).slice(2)));
      localStorage.setItem('epo_visitor_id', vid);
    }

    // Vir obiska (referrer host) ali 'direct'
    let host = 'direct';
    if (document.referrer) {
      try {
        const r = new URL(document.referrer).hostname.replace(/^www\./, '');
        if (r && r !== location.hostname.replace(/^www\./, '')) host = r;
      } catch (_) { /* neveljaven referrer */ }
    }

    await supabaseClient.from('page_views').insert([{
      path:          location.pathname || '/',
      referrer_host: host,
      visitor_id:    vid,
    }]);
  } catch (_) { /* tiho — analitika ne sme motiti strani */ }
}

// ── Navigation ────────────────────────────────────────────────
function initNav() {
  const navbar    = document.getElementById('navbar');
  const toggle    = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('navMobile');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
    updateActiveLink();
  }, { passive: true });

  toggle?.addEventListener('click', () => {
    const open = toggle.classList.toggle('open');
    mobileMenu.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  document.querySelectorAll('[data-nav]').forEach(link => {
    link.addEventListener('click', () => {
      toggle?.classList.remove('open');
      mobileMenu?.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

function updateActiveLink() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');
  let current = '';

  sections.forEach(s => {
    if (window.scrollY >= s.offsetTop - 120) current = s.id;
  });

  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
  });
}

// ── Scroll reveal ─────────────────────────────────────────────
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ── Load site data from Supabase ──────────────────────────────
async function loadSiteData() {
  try {
    const [settingsRes, servicesRes, projectsRes] = await Promise.all([
      supabaseClient.from('settings').select('*').single(),
      supabaseClient.from('services').select('*').order('sort_order'),
      supabaseClient.from('projects').select('*').eq('is_visible', true).order('sort_order'),
    ]);

    if (settingsRes.data) applySettings(settingsRes.data);
    if (servicesRes.data) renderServices(servicesRes.data);
    if (projectsRes.data) renderProjects(projectsRes.data);
  } catch (err) {
    console.warn('Could not load data from Supabase:', err.message);
  }
}

// Razdeli logotip na akcentni znak + enobarven pripon (npr. "EPO" + ".SI").
// Če besedilo ne vsebuje pike, ga izriše enobarvno brez uganjevanja.
function logoTextHtml(text) {
  const dot = text.lastIndexOf('.');
  if (dot <= 0) return `<span class="logo-suffix">${escHtml(text)}</span>`;
  return `<span class="logo-mark">${escHtml(text.slice(0, dot))}</span><span class="logo-suffix">${escHtml(text.slice(dot))}</span>`;
}

function applySettings(s) {
  // Logo
  document.querySelectorAll('[data-logo]').forEach(el => {
    if (s.logo_image_url) {
      el.innerHTML = `<img src="${s.logo_image_url}" alt="${escHtml(s.logo_text || s.site_name || 'EPO.SI')}" loading="lazy">`;
    } else {
      el.innerHTML = logoTextHtml(s.logo_text || 'EPO.SI');
    }
  });

  // Hero
  const heroHeading = document.getElementById('heroHeading');
  const heroSub     = document.getElementById('heroSub');
  const ctaPrimary  = document.getElementById('ctaPrimary');
  const ctaSecondary = document.getElementById('ctaSecondary');

  // Meta — samo na naslovnici; ostale strani (npr. blog) imajo lasten naslov/opis.
  if (heroHeading) {
    document.title = s.meta_title || document.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && s.meta_description) metaDesc.content = s.meta_description;
  }

  if (heroHeading && s.hero_heading) heroHeading.textContent = s.hero_heading;
  if (heroSub && s.hero_subheading) heroSub.textContent = s.hero_subheading;
  if (ctaPrimary) {
    if (s.cta_primary_text) ctaPrimary.textContent = s.cta_primary_text;
    if (s.cta_primary_link) {
      // Sekcija s projekti je zaenkrat skrita — preusmeri na storitve.
      ctaPrimary.href = s.cta_primary_link === '#projects' ? '#services' : s.cta_primary_link;
    }
  }
  if (ctaSecondary) {
    if (s.cta_secondary_text) ctaSecondary.textContent = s.cta_secondary_text;
    if (s.cta_secondary_link) ctaSecondary.href = s.cta_secondary_link;
  }

  // About
  const aboutBio = document.getElementById('aboutBio');
  if (aboutBio && s.about_bio) aboutBio.textContent = s.about_bio;

  const aboutImg = document.getElementById('aboutImage');
  if (aboutImg) {
    if (s.about_image_url) {
      aboutImg.innerHTML = `<img src="${s.about_image_url}" alt="Profilna slika" class="about-image">`;
    }
  }

  // Skills
  const skillsWrap = document.getElementById('skillsWrap');
  if (skillsWrap && s.skills?.items?.length) {
    skillsWrap.innerHTML = s.skills.items.map(skill =>
      `<span class="skill-tag">${escHtml(skill)}</span>`
    ).join('');
  }

  // Stats
  const statsWrap = document.getElementById('statsWrap');
  if (statsWrap && Array.isArray(s.stats) && s.stats.length) {
    statsWrap.innerHTML = s.stats.map(stat => `
      <div class="stat-card glass reveal">
        <div class="stat-number">${escHtml(stat.number)}</div>
        <div class="stat-label">${escHtml(stat.label)}</div>
      </div>
    `).join('');
    initScrollReveal();
  }

  // Contact info
  const contactEmail = document.getElementById('contactEmail');
  const contactPhone = document.getElementById('contactPhone');
  if (contactEmail && s.contact_email) {
    contactEmail.textContent = s.contact_email;
    contactEmail.href = `mailto:${s.contact_email}`;
  }
  if (contactPhone && s.contact_phone) {
    contactPhone.textContent = s.contact_phone;
    contactPhone.href = `tel:${s.contact_phone.replace(/\s/g, '')}`;
  }

  // Social links (kontakt + noga)
  const socials = {
    facebook:  s.facebook_url,
    linkedin:  s.linkedin_url,
    instagram: s.instagram_url,
  };
  Object.entries(socials).forEach(([key, url]) => {
    if (!url) return;
    document.querySelectorAll(`[data-social="${key}"]`).forEach(el => { el.href = url; });
  });

  // Footer — podatki o podjetju (prikaži samo, kar je izpolnjeno)
  const setCompany = (sel, val) => {
    document.querySelectorAll(sel).forEach(el => {
      if (val) { el.textContent = val; el.hidden = false; }
      else { el.hidden = true; }
    });
  };
  setCompany('[data-company-name]', s.company_name || s.site_name || 'EPO.SI');
  setCompany('[data-company-address]', s.company_address);
  setCompany('[data-company-tax]', s.company_tax ? `Davčna št.: ${s.company_tax}` : '');
  if (s.contact_email) {
    document.querySelectorAll('[data-company-email]').forEach(el => {
      el.textContent = s.contact_email;
      el.href = `mailto:${s.contact_email}`;
    });
  }

  // Footer copyright
  document.querySelectorAll('[data-copyright]').forEach(el => {
    el.textContent = `© ${new Date().getFullYear()} ${s.site_name || 'EPO.SI'}. Vse pravice pridržane.`;
  });

  applyStructuredData(s);
}

// Structured data (JSON-LD) za Google — izpolni samo s podatki, ki niso
// še vedno neizpolnjeni privzetki iz sheme (npr. placeholder telefon/email).
const PLACEHOLDER_VALUES = new Set([
  'hello@example.com',
  '+1 (555) 000-0000',
  'https://facebook.com',
  'https://linkedin.com',
  'https://instagram.com',
]);

function applyStructuredData(s) {
  const ld = document.getElementById('ldJson');
  if (!ld) return;

  const real = (v) => v && !PLACEHOLDER_VALUES.has(v) ? v : undefined;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: s.company_name || s.site_name || 'EPO.SI',
    url: 'https://agencijaepo.si/',
    logo: real(s.logo_image_url) || 'https://agencijaepo.si/favicon.svg',
    description: s.meta_description || undefined,
    email: real(s.contact_email),
    telephone: real(s.contact_phone),
  };

  const sameAs = [real(s.facebook_url), real(s.linkedin_url), real(s.instagram_url)].filter(Boolean);
  if (sameAs.length) data.sameAs = sameAs;

  Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
  ld.textContent = JSON.stringify(data);
}

// ── Services ──────────────────────────────────────────────────
// Storitve so admin-urejene (Supabase) — polje `icon` administrator
// vnese kot poljuben emoji. Da javna stran nikoli ne prikaže surovega
// emojija, vsak znani emoji preslikamo v isto SVG line-ikono, ki jo
// uporabljamo povsod drugod (24×24, stroke 1.5, currentColor).
const SERVICE_ICON_MAP = {
  '🌐': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  '📱': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>',
  '📅': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  '👥': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  '⚙️': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  '🚀': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
  '🔍': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  '📈': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  '🎨': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  '⚡': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  '🔒': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  '📧': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2 7 12 13 22 7"/></svg>',
  '💻': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
};
// Generičen nadomestek za kateri koli emoji, ki ga zgornja tabela ne pozna
const SERVICE_ICON_FALLBACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>';

function serviceIconSvg(icon) {
  const key = (icon || '').trim();
  return SERVICE_ICON_MAP[key] || SERVICE_ICON_FALLBACK;
}

function renderServices(services) {
  const grid = document.getElementById('servicesGrid');
  if (!grid) return;

  if (!services.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1">Še ni storitev.</p>';
    return;
  }

  grid.innerHTML = services.map((s, i) => `
    <div class="service-card glass reveal" style="transition-delay:${i * 80}ms">
      <span class="service-icon" aria-hidden="true">${serviceIconSvg(s.icon)}</span>
      <h3 class="service-title">${escHtml(s.title)}</h3>
      <p class="service-desc">${escHtml(s.description)}</p>
    </div>
  `).join('');

  initScrollReveal();
}

// ── Projects ──────────────────────────────────────────────────
const PAGE_SIZE = 6;
let allProjects = [];
let projectsShown = PAGE_SIZE;

function renderProjects(projects) {
  allProjects = projects;
  showProjects();

  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      projectsShown += PAGE_SIZE;
      showProjects();
    });
  }
}

function showProjects() {
  const grid = document.getElementById('projectsGrid');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (!grid) return;

  const visible = allProjects.slice(0, projectsShown);

  if (!visible.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1">Še ni projektov.</p>';
    return;
  }

  grid.innerHTML = visible.map((p, i) => `
    <div class="project-card glass reveal" style="transition-delay:${(i % PAGE_SIZE) * 80}ms">
      ${p.image_url
        ? `<img src="${p.image_url}" alt="${escHtml(p.title)}" class="project-image" loading="lazy">`
        : `<div class="project-image-placeholder">${escHtml(p.title[0])}</div>`}
      <div class="project-body">
        <h3 class="project-title">${escHtml(p.title)}</h3>
        <p class="project-desc">${escHtml(p.description)}</p>
        <div class="project-tags">
          ${(p.tags || []).map(t => `<span class="project-tag">${escHtml(t)}</span>`).join('')}
        </div>
      </div>
      ${p.live_url ? `
        <div class="project-footer">
          <a href="${p.live_url}" target="_blank" rel="noopener" class="project-link">
            Poglej projekt <span>→</span>
          </a>
        </div>` : ''}
    </div>
  `).join('');

  if (loadMoreBtn) {
    loadMoreBtn.style.display = projectsShown >= allProjects.length ? 'none' : 'inline-flex';
  }

  initScrollReveal();
}

// ── Contact form ──────────────────────────────────────────────
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn    = form.querySelector('[type="submit"]');
    const status = document.getElementById('formStatus');
    const data   = Object.fromEntries(new FormData(form));

    setLoading(btn, true);
    status.className = 'form-status';
    status.textContent = '';

    try {
      const { error } = await supabaseClient.from('contacts').insert([{
        name:    data.name.trim(),
        email:   data.email.trim(),
        subject: data.subject.trim(),
        company: (data.company || '').trim(),
        message: data.message.trim(),
      }]);

      if (error) throw error;

      // Attempt to call Edge Function for email notification (non-blocking)
      supabaseClient.functions.invoke('send-contact-email', {
        body: { name: data.name, email: data.email, subject: data.subject, company: data.company, message: data.message },
      }).catch(() => {}); // ignore if function not deployed

      form.reset();
      status.className = 'form-status success';
      status.textContent = '✓ Sporočilo poslano! Kmalu se oglasim.';
    } catch (err) {
      status.className = 'form-status error';
      status.textContent = '✗ Prišlo je do napake. Prosim poskusite znova.';
    } finally {
      setLoading(btn, false);
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Pošiljam…';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalText || 'Pošljite sporočilo';
    btn.disabled = false;
  }
}
