// Supabase Edge Function — send-contact-email
// Triggered by the public contact form after a submission is saved to the DB.
// Uses Resend (https://resend.com) to deliver the notification email.
//
// Deploy with:
//   supabase functions deploy send-contact-email
//
// Required environment variables (set in Supabase Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY   — your Resend API key
//   NOTIFY_EMAIL     — address that receives contact notifications (e.g. you@example.com)
//   FROM_EMAIL       — verified sender address on Resend (e.g. noreply@yourdomain.com)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { name, email, subject, company, message } = await req.json();

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const NOTIFY_EMAIL   = Deno.env.get('NOTIFY_EMAIL');
    const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'noreply@resend.dev';

    if (!RESEND_API_KEY || !NOTIFY_EMAIL) {
      return new Response(
        JSON.stringify({ error: 'Missing RESEND_API_KEY or NOTIFY_EMAIL env vars' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const emailBody = `
New contact form submission from your portfolio.

From:    ${name} <${email}>
Company: ${company || '(not provided)'}
Subject: ${subject || '(no subject)'}

Message:
${message}

---
Sent via your portfolio contact form.
    `.trim();

    const htmlBody = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:2rem;background:#0a0a0f;color:#f0f0ff;border-radius:12px">
  <h2 style="color:#3b82f6;margin-bottom:1.5rem">New Contact Message</h2>
  <table style="width:100%;border-collapse:collapse">
    <tr>
      <td style="padding:0.5rem 0;color:#aaa;width:80px">From:</td>
      <td style="padding:0.5rem 0"><strong>${escHtml(name)}</strong> &lt;${escHtml(email)}&gt;</td>
    </tr>
    <tr>
      <td style="padding:0.5rem 0;color:#aaa">Company:</td>
      <td style="padding:0.5rem 0">${escHtml(company || '(not provided)')}</td>
    </tr>
    <tr>
      <td style="padding:0.5rem 0;color:#aaa">Subject:</td>
      <td style="padding:0.5rem 0">${escHtml(subject || '(no subject)')}</td>
    </tr>
  </table>
  <hr style="border-color:#222;margin:1.5rem 0">
  <p style="white-space:pre-wrap;line-height:1.8;color:#d0d0e0">${escHtml(message)}</p>
  <hr style="border-color:#222;margin:1.5rem 0">
  <p style="font-size:0.8rem;color:#666">Sent via your portfolio contact form.</p>
</div>
    `.trim();

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      [NOTIFY_EMAIL],
        subject: `New message: ${subject || name}`,
        text:    emailBody,
        html:    htmlBody,
        reply_to: email,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend error ${res.status}: ${body}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
