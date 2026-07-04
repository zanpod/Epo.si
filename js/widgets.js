// ================================================================
// widgets.js — Piškotki (cookie consent) + AI chat
// ================================================================

// Kam pošljemo klepet. Polni se iz supabase-config.js, če je na voljo.
const CHAT_ENDPOINT =
  (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL)
    ? `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/chat`
    : '';

document.addEventListener('DOMContentLoaded', () => {
  initCookieConsent();
  initChat();
});

// ── Piškotki ──────────────────────────────────────────────────
function initCookieConsent() {
  const KEY = 'epo_cookie_consent';
  if (localStorage.getItem(KEY)) return;

  const banner = document.createElement('div');
  banner.className = 'cookie-banner glass';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-live', 'polite');
  banner.setAttribute('aria-label', 'Obvestilo o piškotkih');
  banner.innerHTML = `
    <div class="cookie-title">🍪 Piškotki</div>
    <p class="cookie-text">
      Ta stran uporablja samo nujne piškotke za delovanje (shranjevanje vaše izbire) in
      anonimno štetje obiskov za lastno statistiko. Brez sledilnikov in deljenja s tretjimi.
      Več v <a href="politika-zasebnosti.html">Politiki zasebnosti</a>.
    </p>
    <div class="cookie-actions">
      <button class="btn btn-primary" data-cookie="accept">Sprejmem</button>
      <button class="btn btn-ghost" data-cookie="decline">Samo nujni</button>
    </div>
  `;
  document.body.appendChild(banner);
  requestAnimationFrame(() => banner.classList.add('show'));

  const close = (choice) => {
    try { localStorage.setItem(KEY, choice); } catch (_) {}
    banner.classList.remove('show');
    setTimeout(() => banner.remove(), 450);
  };

  banner.querySelector('[data-cookie="accept"]').addEventListener('click', () => close('accepted'));
  banner.querySelector('[data-cookie="decline"]').addEventListener('click', () => close('necessary'));
}

// ── AI chat ───────────────────────────────────────────────────
function initChat() {
  // Plavajoči gumb
  const fab = document.createElement('button');
  fab.className = 'chat-fab';
  fab.setAttribute('aria-label', 'Odpri klepet');
  fab.setAttribute('aria-expanded', 'false');
  fab.innerHTML = `
    <svg class="icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
    <svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  `;

  // Pogovorno okno
  const panel = document.createElement('div');
  panel.className = 'chat-panel glass';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Klepet z EPO.SI');
  panel.innerHTML = `
    <div class="chat-header">
      <div class="chat-header-avatar">🤖</div>
      <div class="chat-header-info">
        <div class="chat-header-name">EPO.SI pomočnik</div>
        <div class="chat-header-status">Na voljo</div>
      </div>
    </div>
    <div class="chat-body" id="chatBody"></div>
    <div class="chat-suggestions" id="chatSuggestions">
      <button class="chat-chip">Katere pakete ponujate?</button>
      <button class="chat-chip">Koliko stane e-cenik za gostince?</button>
      <button class="chat-chip">Kaj vse izdelate?</button>
    </div>
    <div class="chat-input-wrap">
      <textarea class="chat-input" id="chatInput" rows="1" placeholder="Napišite sporočilo…" aria-label="Sporočilo"></textarea>
      <button class="chat-send" id="chatSend" aria-label="Pošlji">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
    <div class="chat-disclaimer">Odgovori so informativni. Za zavezujočo ponudbo nas kontaktirajte.</div>
  `;

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  const body        = panel.querySelector('#chatBody');
  const input       = panel.querySelector('#chatInput');
  const sendBtn     = panel.querySelector('#chatSend');
  const suggestions = panel.querySelector('#chatSuggestions');

  // Zgodovina pogovora (brez sistemskega poziva — tega doda strežnik)
  const history = [];
  let busy = false;
  let greeted = false;

  const toggle = () => {
    const open = panel.classList.toggle('open');
    fab.classList.toggle('open', open);
    fab.setAttribute('aria-expanded', String(open));
    fab.setAttribute('aria-label', open ? 'Zapri klepet' : 'Odpri klepet');
    if (open) {
      if (!greeted) {
        greeted = true;
        addMessage('bot', 'Pozdravljeni! 👋 Sem virtualni pomočnik EPO.SI. Z veseljem odgovorim na vprašanja o naših storitvah in paketih. Kako vam lahko pomagam?');
      }
      setTimeout(() => input.focus(), 300);
    }
  };

  fab.addEventListener('click', toggle);

  // Samodejna rast vnosnega polja
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 96) + 'px';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  sendBtn.addEventListener('click', send);

  suggestions.addEventListener('click', (e) => {
    const chip = e.target.closest('.chat-chip');
    if (!chip) return;
    input.value = chip.textContent;
    send();
  });

  function addMessage(role, text) {
    const el = document.createElement('div');
    el.className = role === 'user' ? 'chat-msg chat-msg-user'
                : role === 'error' ? 'chat-msg chat-msg-error'
                : 'chat-msg chat-msg-bot';
    el.textContent = text;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'chat-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }

  async function send() {
    const text = input.value.trim();
    if (!text || busy) return;

    if (suggestions) suggestions.style.display = 'none';

    addMessage('user', text);
    history.push({ role: 'user', content: text });
    input.value = '';
    input.style.height = 'auto';

    busy = true;
    sendBtn.disabled = true;
    const typing = showTyping();

    try {
      if (!CHAT_ENDPOINT) throw new Error('chat-not-configured');

      const res = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY
            ? { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
            : {}),
        },
        body: JSON.stringify({ messages: history.slice(-12) }),
      });

      if (!res.ok) throw new Error(`status-${res.status}`);

      const data = await res.json();
      const reply = (data && data.reply ? String(data.reply) : '').trim();
      typing.remove();

      if (reply) {
        addMessage('bot', reply);
        history.push({ role: 'assistant', content: reply });
      } else {
        addMessage('error', 'Oprostite, odgovora trenutno ne morem pripraviti. Poskusite znova ali nas kontaktirajte prek obrazca.');
      }
    } catch (err) {
      typing.remove();
      addMessage('error', 'Klepet trenutno ni na voljo. Prosimo, uporabite kontaktni obrazec spodaj, pa se oglasimo v najkrajšem času.');
    } finally {
      busy = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }
}
