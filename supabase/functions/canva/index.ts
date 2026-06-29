// Supabase Edge Function — canva
// Povezava admin panela EPO.SI s Canvo (Canva Connect API). Skrbi za:
//   - 'config'  : vrne javni Client ID (za sestavo OAuth povezave v brskalniku)
//   - 'token'   : zamenja avtorizacijsko kodo za žetone (OAuth, PKCE)
//   - 'refresh' : osveži dostopni žeton
//   - 'export'  : naloži sliko v Canvo (asset) in ustvari nov osnutek z njo
//
// Client Secret NIKOLI ne pride v brskalnik — uporablja se samo tukaj.
//
// Deploy:
//   supabase functions deploy canva
//
// Zahtevane skrivnosti (Supabase Dashboard → Edge Functions → canva → Secrets):
//   CANVA_CLIENT_ID     — Client ID Canva aplikacije (canva.com/developers)
//   CANVA_CLIENT_SECRET — Client Secret iste aplikacije

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CANVA_API = 'https://api.canva.com/rest/v1';
const TOKEN_URL = `${CANVA_API}/oauth/token`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function basicAuth(id: string, secret: string): string {
  return 'Basic ' + btoa(`${id}:${secret}`);
}

// Zamenjaj kodo / osveži žeton prek Canva OAuth token endpointa.
async function tokenRequest(id: string, secret: string, form: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      authorization: basicAuth(id, secret),
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(form).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Canva OAuth ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Naloži sliko (z URL-ja) kot Canva asset in vrni njen ID.
async function uploadAsset(accessToken: string, imageUrl: string): Promise<string> {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Slike ni bilo mogoče prenesti (${imgRes.status}).`);
  const bytes = new Uint8Array(await imgRes.arrayBuffer());

  const nameB64 = btoa('epo-objava');
  const createRes = await fetch(`${CANVA_API}/asset-uploads`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/octet-stream',
      'Asset-Upload-Metadata': JSON.stringify({ name_base64: nameB64 }),
    },
    body: bytes,
  });
  const createData = await createRes.json().catch(() => ({}));
  if (!createRes.ok) throw new Error(`Canva nalaganje ${createRes.status}: ${JSON.stringify(createData)}`);

  let job = createData.job;
  // Po potrebi počakaj, da se nalaganje zaključi.
  for (let i = 0; i < 12 && job && job.status === 'in_progress'; i++) {
    await sleep(1000);
    const pollRes = await fetch(`${CANVA_API}/asset-uploads/${job.id}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const pollData = await pollRes.json().catch(() => ({}));
    if (!pollRes.ok) throw new Error(`Canva status ${pollRes.status}: ${JSON.stringify(pollData)}`);
    job = pollData.job;
  }

  const assetId = job?.asset?.id;
  if (!assetId) throw new Error('Canva ni vrnila ID-ja slike.');
  return assetId;
}

// Ustvari nov osnutek (custom dimenzije) z že vstavljeno sliko.
async function createDesign(accessToken: string, assetId: string, width: number, height: number) {
  const res = await fetch(`${CANVA_API}/designs`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      design_type: { type: 'custom', width, height },
      asset_id: assetId,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Canva osnutek ${res.status}: ${JSON.stringify(data)}`);
  return data.design;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Uporabi metodo POST.' }, 405);

  const clientId = Deno.env.get('CANVA_CLIENT_ID');
  const clientSecret = Deno.env.get('CANVA_CLIENT_SECRET');

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload.action !== 'string') {
    return json({ error: 'Manjka polje action.' }, 400);
  }
  const action = payload.action;

  try {
    if (action === 'config') {
      if (!clientId) return json({ error: 'Manjka CANVA_CLIENT_ID.' }, 500);
      return json({ clientId });
    }

    if (!clientId || !clientSecret) {
      return json({ error: 'Strežnik ni nastavljen: manjka CANVA_CLIENT_ID ali CANVA_CLIENT_SECRET.' }, 500);
    }

    if (action === 'token') {
      const { code, code_verifier, redirect_uri } = payload;
      if (!code || !code_verifier || !redirect_uri) {
        return json({ error: 'Manjkajo parametri za izmenjavo žetona.' }, 400);
      }
      const data = await tokenRequest(clientId, clientSecret, {
        grant_type: 'authorization_code',
        code,
        code_verifier,
        redirect_uri,
      });
      return json(data);
    }

    if (action === 'refresh') {
      const { refresh_token } = payload;
      if (!refresh_token) return json({ error: 'Manjka refresh_token.' }, 400);
      const data = await tokenRequest(clientId, clientSecret, {
        grant_type: 'refresh_token',
        refresh_token,
      });
      return json(data);
    }

    if (action === 'export') {
      const { access_token, image_url, width, height } = payload;
      if (!access_token || !image_url) {
        return json({ error: 'Manjka access_token ali image_url.' }, 400);
      }
      const w = Number(width) || 1080;
      const h = Number(height) || 1080;
      const assetId = await uploadAsset(access_token, image_url);
      const design = await createDesign(access_token, assetId, w, h);
      return json({
        edit_url: design?.urls?.edit_url || '',
        view_url: design?.urls?.view_url || '',
        design_id: design?.id || '',
      });
    }

    return json({ error: 'Neznana akcija.' }, 400);
  } catch (err) {
    console.error('canva function error:', err);
    const detail = err instanceof Error ? err.message : String(err);
    return json({ error: detail.slice(0, 500) }, 502);
  }
});
