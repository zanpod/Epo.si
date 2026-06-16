// ── Supabase Configuration ──────────────────────────────────────────────────
// Fill in your project URL and anon key from:
// Supabase Dashboard → Project Settings → API
const SUPABASE_URL = 'https://ebcwiesqpnthzgowjsjq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BnjJvUIniOhD8hDpfqdaog_XlS02_4s';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
