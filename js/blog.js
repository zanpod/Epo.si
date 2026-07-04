// ================================================================
// blog.js — Blog javne strani (naslovnica, seznam, članek)
// ================================================================

const BLOG_PAGE_SIZE = 9;

// ── Podatki ─────────────────────────────────────────────────────
async function fetchPublishedPosts() {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabaseClient
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .lte('published_at', nowIso)
    .order('published_at', { ascending: false });

  if (error) { console.warn('Napaka pri nalaganju bloga:', error.message); return []; }
  return data || [];
}

async function fetchPostBySlug(slug) {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabaseClient
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .eq('slug', slug)
    .lte('published_at', nowIso)
    .maybeSingle();

  if (error) { console.warn('Napaka pri nalaganju članka:', error.message); return null; }
  return data;
}

// ── Izris ─────────────────────────────────────────────────────
function blogCardHtml(p, i = 0) {
  const img = p.cover_image_url
    ? `<img src="${p.cover_image_url}" alt="${blogEscAttr(p.title)}" class="blog-card-image" loading="lazy">`
    : `<div class="blog-card-image-placeholder">📝</div>`;

  return `
    <a href="blog-post.html?slug=${encodeURIComponent(p.slug)}" class="blog-card glass reveal" style="transition-delay:${(i % BLOG_PAGE_SIZE) * 70}ms">
      <div class="blog-card-image-wrap">
        ${img}
        ${p.category ? `<span class="blog-card-category">${blogEscHtml(p.category)}</span>` : ''}
      </div>
      <div class="blog-card-body">
        <div class="blog-card-meta">
          <span>${blogFormatDate(p.published_at)}</span>
          <span class="dot"></span>
          <span>${p.reading_minutes || 1} min branja</span>
        </div>
        <h3 class="blog-card-title">${blogEscHtml(p.title)}</h3>
        <p class="blog-card-excerpt">${blogEscHtml(p.excerpt)}</p>
        <span class="blog-card-link">Preberi več <span>→</span></span>
      </div>
    </a>
  `;
}

function blogFeaturedHtml(p) {
  const img = p.cover_image_url
    ? `<img src="${p.cover_image_url}" alt="${blogEscAttr(p.title)}" class="blog-featured-image">`
    : `<div class="blog-featured-image-placeholder">📝</div>`;

  return `
    <a href="blog-post.html?slug=${encodeURIComponent(p.slug)}" class="blog-featured glass reveal">
      <div class="blog-featured-image-wrap">${img}</div>
      <div class="blog-featured-body">
        <div class="blog-featured-badge">★ Izpostavljeno</div>
        <h2 class="blog-featured-title">${blogEscHtml(p.title)}</h2>
        <p class="blog-featured-excerpt">${blogEscHtml(p.excerpt)}</p>
        <div class="blog-card-meta">
          <span>${blogFormatDate(p.published_at)}</span>
          <span class="dot"></span>
          <span>${p.reading_minutes || 1} min branja</span>
        </div>
      </div>
    </a>
  `;
}

function blogFormatDate(iso) {
  if (!iso) return '';
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec'];
  const d = new Date(iso);
  return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function blogEscHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function blogEscAttr(str) { return blogEscHtml(str); }

// ── Naslovnica: predogled zadnjih novic ──────────────────────
async function initBlogPreview() {
  const grid = document.getElementById('blogPreviewGrid');
  if (!grid) return;

  const posts = await fetchPublishedPosts();
  const latest = posts.slice(0, 3);

  const section = document.getElementById('blog-preview');
  if (!latest.length) return;
  if (section) section.hidden = false;

  grid.innerHTML = latest.map((p, i) => blogCardHtml(p, i)).join('');
  if (typeof initScrollReveal === 'function') initScrollReveal();
}

// ── Seznam novic (blog.html) ──────────────────────────────────
let blogAllPosts = [];
let blogActiveCategory = 'all';
let blogShown = BLOG_PAGE_SIZE;

async function initBlogListing() {
  const grid = document.getElementById('blogListGrid');
  if (!grid) return;

  blogAllPosts = await fetchPublishedPosts();

  renderBlogFilters();
  renderBlogFeatured();
  renderBlogList();

  document.getElementById('blogLoadMoreBtn')?.addEventListener('click', () => {
    blogShown += BLOG_PAGE_SIZE;
    renderBlogList();
  });
}

function renderBlogFilters() {
  const wrap = document.getElementById('blogFilters');
  if (!wrap) return;

  const categories = [...new Set(blogAllPosts.map(p => p.category).filter(Boolean))];
  if (!categories.length) { wrap.innerHTML = ''; return; }

  const pills = ['all', ...categories];
  wrap.innerHTML = pills.map(c => `
    <button class="blog-filter-pill ${c === blogActiveCategory ? 'active' : ''}" data-cat="${blogEscAttr(c)}" type="button">
      ${c === 'all' ? 'Vse novice' : blogEscHtml(c)}
    </button>
  `).join('');

  wrap.querySelectorAll('[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      blogActiveCategory = btn.dataset.cat;
      blogShown = BLOG_PAGE_SIZE;
      wrap.querySelectorAll('.blog-filter-pill').forEach(b => b.classList.toggle('active', b === btn));
      renderBlogList();
    });
  });
}

function renderBlogFeatured() {
  const wrap = document.getElementById('blogFeaturedWrap');
  if (!wrap) return;
  const featured = blogAllPosts.find(p => p.is_featured) || blogAllPosts[0];
  if (!featured) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = blogFeaturedHtml(featured);
  if (typeof initScrollReveal === 'function') initScrollReveal();
}

function renderBlogList() {
  const grid = document.getElementById('blogListGrid');
  const loadMoreBtn = document.getElementById('blogLoadMoreBtn');
  if (!grid) return;

  const filtered = blogActiveCategory === 'all'
    ? blogAllPosts
    : blogAllPosts.filter(p => p.category === blogActiveCategory);

  const visible = filtered.slice(0, blogShown);

  if (!visible.length) {
    grid.innerHTML = '<p class="blog-empty">Trenutno ni najdenih novic.</p>';
  } else {
    grid.innerHTML = visible.map((p, i) => blogCardHtml(p, i)).join('');
  }

  if (loadMoreBtn) {
    loadMoreBtn.style.display = blogShown >= filtered.length ? 'none' : 'inline-flex';
  }

  if (typeof initScrollReveal === 'function') initScrollReveal();
}

// ── Članek (blog-post.html) ───────────────────────────────────
async function initBlogArticle() {
  const container = document.getElementById('articleContainer');
  if (!container) return;

  const slug = new URLSearchParams(location.search).get('slug');
  const post = slug ? await fetchPostBySlug(slug) : null;

  if (!post) { renderArticleNotFound(container); return; }

  renderArticle(container, post);
  updateArticleSeo(post);
  loadRelatedPosts(post);
  trackArticleView(post);
}

function renderArticleNotFound(container) {
  container.innerHTML = `
    <div class="article-notfound">
      <h1>Novica ni najdena</h1>
      <p>Morda je bila odstranjena ali pa povezava ni pravilna.</p>
      <a href="blog.html" class="btn btn-primary">← Nazaj na blog</a>
    </div>
  `;
}

function renderArticle(container, p) {
  document.title = `${p.title} — EPO.SI Blog`;

  container.innerHTML = `
    <a href="blog.html" class="article-back">← Nazaj na blog</a>
    ${p.category ? `<span class="article-category">${blogEscHtml(p.category)}</span>` : ''}
    <h1 class="article-title">${blogEscHtml(p.title)}</h1>
    <div class="article-meta">
      <span>${blogEscHtml(p.author_name || 'EPO.SI')}</span>
      <span class="dot"></span>
      <span>${blogFormatDate(p.published_at)}</span>
      <span class="dot"></span>
      <span>${p.reading_minutes || 1} min branja</span>
    </div>
    ${p.cover_image_url ? `<img src="${p.cover_image_url}" alt="${blogEscAttr(p.title)}" class="article-cover">` : ''}
    <div class="article-content">${p.content || ''}</div>
    ${(p.tags || []).length ? `
      <div class="article-tags">
        ${p.tags.map(t => `<span class="article-tag">#${blogEscHtml(t)}</span>`).join('')}
      </div>` : ''}
    <div class="article-share">
      <span class="article-share-label">Deli:</span>
      <button class="share-btn" id="shareCopyBtn" type="button" title="Kopiraj povezavo" aria-label="Kopiraj povezavo">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>
      <a class="share-btn" id="shareTwitterBtn" target="_blank" rel="noopener" title="Deli na X" aria-label="Deli na X">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      </a>
      <a class="share-btn" id="shareLinkedinBtn" target="_blank" rel="noopener" title="Deli na LinkedIn" aria-label="Deli na LinkedIn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      </a>
      <a class="share-btn" id="shareFacebookBtn" target="_blank" rel="noopener" title="Deli na Facebook" aria-label="Deli na Facebook">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      </a>
    </div>
    <div class="article-cta">
      <h3>Potrebujete spletno stran ali sistem po meri?</h3>
      <p>Pri EPO.SI gradimo digitalna orodja, ki poganjajo vaš posel.</p>
      <a href="index.html#contact" class="btn btn-primary">Naročite brezplačen posvet</a>
    </div>
  `;

  initArticleShare(p);
}

function initArticleShare(p) {
  const url = location.href;
  document.getElementById('shareCopyBtn')?.addEventListener('click', async (e) => {
    try {
      await navigator.clipboard.writeText(url);
      const btn = e.currentTarget;
      const orig = btn.innerHTML;
      btn.innerHTML = '✓';
      setTimeout(() => { btn.innerHTML = orig; }, 1800);
    } catch (_) { /* clipboard API ni na voljo */ }
  });

  const twitter = document.getElementById('shareTwitterBtn');
  if (twitter) twitter.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(p.title)}`;

  const linkedin = document.getElementById('shareLinkedinBtn');
  if (linkedin) linkedin.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  const facebook = document.getElementById('shareFacebookBtn');
  if (facebook) facebook.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

function updateArticleSeo(p) {
  const title = p.seo_title || p.title;
  const desc  = p.seo_description || p.excerpt;

  document.title = `${title} — EPO.SI Blog`;
  setMeta('meta[name="description"]', desc);
  setMeta('meta[property="og:title"]', title);
  setMeta('meta[property="og:description"]', desc);
  setMeta('meta[property="og:url"]', location.href);
  if (p.cover_image_url) setMeta('meta[property="og:image"]', p.cover_image_url);
  setMeta('meta[name="twitter:title"]', title);
  setMeta('meta[name="twitter:description"]', desc);
  if (p.cover_image_url) setMeta('meta[name="twitter:image"]', p.cover_image_url);

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = location.href;
}

function setMeta(selector, value) {
  if (!value) return;
  const el = document.querySelector(selector);
  if (el) el.setAttribute('content', value);
}

async function loadRelatedPosts(current) {
  const wrap = document.getElementById('articleRelated');
  const grid = document.getElementById('articleRelatedGrid');
  if (!wrap || !grid) return;

  const posts = blogAllPosts.length ? blogAllPosts : await fetchPublishedPosts();
  const sameCategory = posts.filter(p => p.id !== current.id && p.category === current.category);
  const rest = posts.filter(p => p.id !== current.id && p.category !== current.category);
  const related = [...sameCategory, ...rest].slice(0, 3);

  if (!related.length) { wrap.hidden = true; return; }

  wrap.hidden = false;
  grid.innerHTML = related.map((p, i) => blogCardHtml(p, i)).join('');
  if (typeof initScrollReveal === 'function') initScrollReveal();
}

async function trackArticleView(post) {
  if (typeof supabaseClient === 'undefined') return;
  try {
    let vid = localStorage.getItem('epo_visitor_id');
    if (!vid) {
      vid = (window.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(16).slice(2)));
      localStorage.setItem('epo_visitor_id', vid);
    }
    await supabaseClient.from('page_views').insert([{
      path: `/blog/${post.slug}`, referrer_host: document.referrer ? new URL(document.referrer).hostname : 'direct', visitor_id: vid,
    }]);
  } catch (_) { /* tiho */ }
}

document.addEventListener('DOMContentLoaded', () => {
  initBlogPreview();
  initBlogListing();
  initBlogArticle();
});
