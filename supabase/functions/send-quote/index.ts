// Supabase Edge Function — send-quote
// Called from the admin panel to email a generated quote (PDF) to a customer.
// Uses Resend (https://resend.com) and sends the PDF as an attachment.
//
// Deploy with:
//   supabase functions deploy send-quote
//
// Required environment variables (Supabase Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY   — your Resend API key
//   FROM_EMAIL       — verified sender address on Resend (e.g. ponudbe@vasadomena.si)
// Optional:
//   NOTIFY_EMAIL     — address that receives a BCC copy of every quote sent

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuotePayload {
  to: string;
  toName?: string;
  subject?: string;
  replyTo?: string;
  fileName?: string;
  pdfBase64: string;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  quoteNumber?: string;
  total?: string;
  validUntil?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json() as QuotePayload;
    const {
      to, toName, subject, replyTo, fileName, pdfBase64,
      companyName, companyEmail, companyPhone, quoteNumber, total, validUntil,
    } = payload;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'noreply@resend.dev';
    const NOTIFY_EMAIL   = Deno.env.get('NOTIFY_EMAIL');

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing RESEND_API_KEY env var' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!to || !pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing recipient or PDF content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const company = companyName || 'EPO.SI';
    const greeting = toName ? `Pozdravljeni, ${toName}` : 'Pozdravljeni';

    const htmlBody = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:2rem;color:#1a1a2e">
  <h2 style="color:#3b82f6;margin-bottom:1.25rem">${escHtml(company)}</h2>
  <p>${escHtml(greeting)},</p>
  <p style="line-height:1.7">
    v priponki vam pošiljamo ponudbo${quoteNumber ? ` <strong>${escHtml(quoteNumber)}</strong>` : ''}.
    ${total ? `Skupna vrednost ponudbe je <strong>${escHtml(total)}</strong>.` : ''}
    ${validUntil ? `Ponudba velja do <strong>${escHtml(validUntil)}</strong>.` : ''}
  </p>
  <p style="line-height:1.7">Za morebitna vprašanja smo vam z veseljem na voljo.</p>
  <p style="margin-top:1.5rem">Lep pozdrav,<br><strong>${escHtml(company)}</strong>
    ${companyEmail ? `<br>${escHtml(companyEmail)}` : ''}
    ${companyPhone ? `<br>${escHtml(companyPhone)}` : ''}
  </p>
</div>`.trim();

    const textBody = [
      `${greeting},`,
      '',
      `v priponki vam pošiljamo ponudbo${quoteNumber ? ` ${quoteNumber}` : ''}.`,
      total ? `Skupna vrednost ponudbe je ${total}.` : '',
      validUntil ? `Ponudba velja do ${validUntil}.` : '',
      '',
      'Za morebitna vprašanja smo vam z veseljem na voljo.',
      '',
      'Lep pozdrav,',
      company,
      companyEmail || '',
      companyPhone || '',
    ].filter(Boolean).join('\n');

    const body: Record<string, unknown> = {
      from:        FROM_EMAIL,
      to:          [to],
      subject:     subject || `Ponudba${quoteNumber ? ` ${quoteNumber}` : ''} — ${company}`,
      text:        textBody,
      html:        htmlBody,
      attachments: [{ filename: fileName || 'ponudba.pdf', content: pdfBase64 }],
    };
    if (replyTo)      body.reply_to = replyTo;
    if (NOTIFY_EMAIL) body.bcc = [NOTIFY_EMAIL];

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend error ${res.status}: ${errText}`);
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
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
