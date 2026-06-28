// Supabase Edge Function — generate
// Generator vsebin za družbena omrežja znamke EPO.SI. Ustvari posamezno objavo
// (kljuka + besedilo + hashtagi + ideja za vizual) ali 7-dnevni načrt vsebin.
// Kliče Claude API; ključ ostane na strežniku in ni izpostavljen v brskalniku.
//
// Deploy:
//   supabase functions deploy generate
//
// Zahtevane skrivnosti (Supabase Dashboard → Edge Functions → generate → Secrets):
//   ANTHROPIC_API_KEY — vaš API ključ za Claude (platform.claude.com)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MODEL = 'claude-sonnet-4-6';

// --- Kontekst znamke (vgrajen v vsak prompt) ---------------------------------
const BRAND = `Si pomočnik za ustvarjanje vsebin za družbena omrežja za znamko EPO.SI.

EPO.SI je slovensko enoosebno podjetje, ki gradi spletne aplikacije in sisteme po meri
(digitalni ceniki / e-meniji, rezervacijski sistemi, admin paneli, CRM) za male in srednje
slovenske firme — predvsem za gostinstvo.

Ton: jasen, direkten, brez marketinškega blebetanja, strokoven a človeški.
Publika: lastniki lokalov, obrtniki, mali podjetniki v Sloveniji.
Vsa vsebina je v slovenščini. Brez pretiravanja, brez praznih fraz, brez klišejev.`;

// Dovoljeni tipi vsebine (vsebinski stebri).
const PILLARS = [
  'Pred / po preobrazba',
  'Mini-nasvet za podjetnike',
  'Problem → rešitev',
  'Funkcija izdelka',
  'Mit / pogosta napaka',
  'Zakulisje EPO.SI',
  'Rezultat / dokaz',
];

// --- Pomožne funkcije --------------------------------------------------------

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// Robustno izlušči JSON iz modelovega odgovora (odstrani morebitne ograje).
function parseModelJson(text: string): any {
  let t = (text || '').trim();

  // Odstrani ```json ... ``` ali ``` ... ``` ograje.
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) t = fence[1].trim();

  // Če je okoli JSON-a še kakšno besedilo, poberi prvi { ... } ali [ ... ] blok.
  if (t[0] !== '{' && t[0] !== '[') {
    const start = t.search(/[{[]/);
    if (start !== -1) {
      const open = t[start];
      const close = open === '{' ? '}' : ']';
      const end = t.lastIndexOf(close);
      if (end > start) t = t.slice(start, end + 1);
    }
  }

  return JSON.parse(t);
}

// Pokliči Anthropic Messages API.
async function callAnthropic(apiKey: string, system: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${detail}`);
  }

  const data = await res.json();
  return (data.content || [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('');
}

// --- Prompti za posamezne načine --------------------------------------------

function postPrompt(pillar: string, topic: string): string {
  const temaVrstica = topic && topic.trim()
    ? `Konkretna tema: "${topic.trim()}".`
    : 'Konkretne teme ni — izberi smiselno temo, ki ustreza tipu vsebine in znamki.';

  return `Ustvari ENO objavo za družbena omrežja (Instagram / Facebook).

Tip vsebine: "${pillar}".
${temaVrstica}

Zahteve:
- "hook": kratka, udarna kljuka (prva vrstica objave), ki ustavi drsenje. Brez emojijev na začetku.
- "caption": celotno besedilo objave, 4–7 vrstic, ločenih z znaki \\n. Naj se konča s konkretnim pozivom k akciji (CTA).
- "hashtags": 5–10 relevantnih hashtagov BREZ znaka # (samo besede), primernih za slovensko gostinsko/podjetniško publiko.
- "imageBrief": kratek opis ideje za vizual (kaj naj bo na sliki/posnetku), 1–2 stavka.

Odgovori IZKLJUČNO z veljavnim JSON v točno tej obliki, brez dodatnega besedila in brez ograj:
{"hook":"...","caption":"...","hashtags":["...","..."],"imageBrief":"..."}`;
}

function weekPrompt(): string {
  return `Ustvari 7-dnevni načrt vsebin (po ena ideja na dan, vsak dan DRUG tip vsebine).

Na voljo so ti tipi vsebine (stebri): ${PILLARS.map((p) => `"${p}"`).join(', ')}.

Zahteve:
- Točno 7 elementov.
- Vsak element ima "pillar" (eden od zgornjih tipov) in "idea" (konkretna ideja za objavo v enem stavku, v slovenščini).
- Ideje naj bodo raznolike in praktične, primerne za EPO.SI.

Odgovori IZKLJUČNO z veljavnim JSON v točno tej obliki, brez dodatnega besedila in brez ograj:
{"days":[{"pillar":"...","idea":"..."}]}`;
}

// --- Handler -----------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Uporabi metodo POST.' }, 405);
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return json({ error: 'Strežnik ni nastavljen: manjka ANTHROPIC_API_KEY.' }, 500);
  }

  const payload = await req.json().catch(() => null);
  if (!payload) {
    return json({ error: 'Neveljaven JSON v zahtevi.' }, 400);
  }

  const { mode, pillar, topic } = payload as { mode?: string; pillar?: string; topic?: string };

  try {
    if (mode === 'week') {
      const text = await callAnthropic(apiKey, BRAND, weekPrompt());
      const parsed = parseModelJson(text);
      if (!parsed || !Array.isArray(parsed.days)) {
        throw new Error('Model ni vrnil pričakovane oblike (days).');
      }
      return json({ days: parsed.days.slice(0, 7) });
    }

    if (mode === 'post') {
      if (!pillar || !PILLARS.includes(pillar)) {
        return json({ error: 'Neveljaven ali manjkajoč tip vsebine (pillar).' }, 400);
      }
      const text = await callAnthropic(apiKey, BRAND, postPrompt(pillar, topic || ''));
      const parsed = parseModelJson(text);
      if (!parsed || typeof parsed.hook !== 'string' || typeof parsed.caption !== 'string') {
        throw new Error('Model ni vrnil pričakovane oblike (hook/caption).');
      }
      return json({
        hook: parsed.hook,
        caption: parsed.caption,
        hashtags: Array.isArray(parsed.hashtags)
          ? parsed.hashtags.map((h: unknown) => String(h).replace(/^#/, '').trim()).filter(Boolean)
          : [],
        imageBrief: typeof parsed.imageBrief === 'string' ? parsed.imageBrief : '',
      });
    }

    return json({ error: 'Neznan način (mode). Uporabi "post" ali "week".' }, 400);
  } catch (err) {
    console.error('generate function error:', err);
    return json({ error: 'Generiranje ni uspelo. Poskusi znova.' }, 502);
  }
});
