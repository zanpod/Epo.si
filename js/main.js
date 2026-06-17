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

function applySettings(s) {
  // Meta
  document.title = s.meta_title || document.title;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && s.meta_description) metaDesc.content = s.meta_description;

  // Logo
  document.querySelectorAll('[data-logo]').forEach(el => el.textContent = s.logo_text || 'EPO.SI');

  // Hero
  const heroHeading = document.getElementById('heroHeading');
  const heroSub     = document.getElementById('heroSub');
  const ctaPrimary  = document.getElementById('ctaPrimary');
  const ctaSecondary = document.getElementById('ctaSecondary');
  if (heroHeading && s.hero_heading) heroHeading.textContent = s.hero_heading;
  if (heroSub && s.hero_subheading) heroSub.textContent = s.hero_subheading;
  if (ctaPrimary) {
    if (s.cta_primary_text) ctaPrimary.textContent = s.cta_primary_text;
    if (s.cta_primary_link) ctaPrimary.href = s.cta_primary_link;
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
  if (statsWrap && Array.isArray(s.stats)) {
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

  // Social links
  const socials = {
    githubLink:    s.github_url,
    linkedinLink:  s.linkedin_url,
    instagramLink: s.instagram_url,
  };
  Object.entries(socials).forEach(([id, url]) => {
    const el = document.getElementById(id);
    if (el && url) el.href = url;
  });

  // Footer
  document.querySelectorAll('[data-copyright]').forEach(el => {
    el.textContent = `© ${new Date().getFullYear()} ${s.site_name || 'EPO.SI'}. Vse pravice pridržane.`;
  });
}

// ── Services ──────────────────────────────────────────────────
function renderServices(services) {
  const grid = document.getElementById('servicesGrid');
  if (!grid) return;

  if (!services.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1">Še ni storitev.</p>';
    return;
  }

  grid.innerHTML = services.map((s, i) => `
    <div class="service-card glass reveal" style="transition-delay:${i * 80}ms">
      <span class="service-icon">${escHtml(s.icon)}</span>
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
