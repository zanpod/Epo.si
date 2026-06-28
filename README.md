# Personal Portfolio — Setup Guide

A production-ready personal portfolio website using HTML/CSS/Vanilla JS + Supabase + Netlify. No build step required.

---

## File Structure

```
/
├── index.html                    ← Public website
├── admin/
│   └── index.html                ← Admin panel (protected by Supabase Auth)
├── css/
│   └── style.css                 ← All styles
├── js/
│   ├── supabase-config.js        ← ⚠️  Fill in your keys here
│   ├── main.js                   ← Public site JS
│   ├── widgets.js                ← Cookie consent + AI chat widget
│   └── admin.js                  ← Admin panel JS
├── supabase/
│   ├── schema.sql                ← Run this in Supabase SQL Editor
│   └── functions/
│       ├── send-contact-email/
│       │   └── index.ts          ← Edge Function for email notifications
│       ├── chat/
│       │   └── index.ts          ← Edge Function: AI chat (Claude API)
│       └── generate/
│           └── index.ts          ← Edge Function: AI generator vsebin (Claude API)
└── README.md
```

---

## Step 1 — Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create a free account.
2. Create a new project. Note your **Project URL** and **anon public key** from:
   **Project Settings → API → Project API keys**

---

## Step 2 — Configure Supabase Keys

Open `js/supabase-config.js` and replace the placeholder values:

```js
const SUPABASE_URL      = 'https://xxxxxxxxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...your-anon-key...';
```

---

## Step 3 — Run the Database Schema

1. In Supabase Dashboard, go to **SQL Editor**.
2. Paste the entire contents of `supabase/schema.sql` and click **Run**.

This creates the `settings`, `services`, `projects`, and `contacts` tables with RLS policies and seeds default data.

---

## Step 4 — Create the Storage Bucket

1. In Supabase Dashboard, go to **Storage**.
2. Click **New bucket**, name it `portfolio`, and enable **Public bucket**.
3. Go to **Storage → Policies** and add these policies for the `portfolio` bucket:

   | Policy name                   | Operation | Expression                              |
   |-------------------------------|-----------|-----------------------------------------|
   | Public can view images        | SELECT    | `true`                                  |
   | Auth can upload images        | INSERT    | `auth.role() = 'authenticated'`         |
   | Auth can delete images        | DELETE    | `auth.role() = 'authenticated'`         |

   *(Or uncomment the storage policy block at the bottom of `schema.sql` and run it.)*

---

## Step 5 — Create Your Admin User

1. In Supabase Dashboard, go to **Authentication → Users**.
2. Click **Add user** → **Create new user**.
3. Enter your email and a strong password.

This is the account you'll use to log in at `/admin`.

---

## Step 6 — (Optional) Set Up Email Notifications via Resend

When someone submits the contact form, a Supabase Edge Function can send you a notification email using [Resend](https://resend.com).

### Deploy the Edge Function

Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and run:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy send-contact-email
```

### Add Edge Function Secrets

In Supabase Dashboard → **Edge Functions → send-contact-email → Secrets**, add:

| Key              | Value                              |
|------------------|------------------------------------|
| `RESEND_API_KEY` | Your Resend API key                |
| `NOTIFY_EMAIL`   | Email to receive notifications     |
| `FROM_EMAIL`     | Verified sender address on Resend  |

> **Note:** The contact form still saves submissions to the database even if this function isn't deployed. Email notifications are optional.

---

## Step 6b — (Optional) Enable the AI Chat Assistant

A floating chat widget on the public site answers visitor questions **only** about
EPO.SI's services and the official pricing (the three packages: EPO Start, EPO Pro,
EPO Cenik). It is powered by the **Groq API** (free tier) through a Supabase Edge
Function, so the API key stays on the server and is never exposed in the browser.

### Deploy the Edge Function

```bash
supabase functions deploy chat
```

### Add the Edge Function Secret

Get a **free** API key at [console.groq.com/keys](https://console.groq.com/keys).
Then in Supabase Dashboard → **Edge Functions → chat → Secrets**, add:

| Key            | Value                                                            |
|----------------|-----------------------------------------------------------------|
| `GROQ_API_KEY` | Your free Groq key from [console.groq.com/keys](https://console.groq.com/keys) |

> **How it works:** `js/widgets.js` calls `POST {SUPABASE_URL}/functions/v1/chat`
> with the conversation history. The function injects a fixed system prompt
> (defined in `supabase/functions/chat/index.ts`) that restricts answers to
> EPO.SI topics and the official pricing, then calls Groq (`llama-3.3-70b-versatile`).
> If the function isn't deployed, the widget gracefully points visitors to the
> contact form instead. *(The `chat` and `generate` functions share the same
> `GROQ_API_KEY`.)*

### Editing the pricing or scope

The packages, prices, services, and conversation rules live in the `SYSTEM_PROMPT`
constant in `supabase/functions/chat/index.ts`. Edit it there and re-deploy
(`supabase functions deploy chat`) — no front-end changes needed.

---

## Step 6c — (Optional) Enable the Content Generator (Objave)

The admin panel includes an **Objave** section that prepares social-media content
for EPO.SI (Instagram / Facebook): it generates a single post (hook, caption,
hashtags and a visual idea) or a 7-day content plan, then lets you save, edit,
schedule and browse posts in a list or weekly calendar. It is powered by the
**Groq API** (free tier, no credit card) through a Supabase Edge Function, so the
API key stays on the server.

### Deploy the Edge Function

```bash
supabase functions deploy generate
```

*(Or deploy via the Supabase Dashboard → Edge Functions → Deploy a new function →
name it `generate` and paste the contents of `supabase/functions/generate/index.ts`.)*

### Add the Edge Function Secret

Get a **free** API key at [console.groq.com/keys](https://console.groq.com/keys)
(no credit card required, works in the EU). Then in Supabase Dashboard →
**Edge Functions → generate → Secrets**, add:

| Key            | Value                                                            |
|----------------|-----------------------------------------------------------------|
| `GROQ_API_KEY` | Your free Groq key from [console.groq.com/keys](https://console.groq.com/keys) |

> **How it works:** `js/admin.js` calls `POST {SUPABASE_URL}/functions/v1/generate`
> with `{ mode: 'post' | 'week', pillar, topic }`. The function injects a fixed
> brand prompt (defined in `supabase/functions/generate/index.ts`) and calls Groq
> (`llama-3.3-70b-versatile`) in JSON response mode, returning structured JSON. Saved
> posts are stored in the `posts` table (created by `schema.sql`, protected by RLS —
> only the authenticated admin can read/write them).
>
> **Switching provider:** to use a different model/provider, edit `callGroq()` and
> the `MODEL` constant in `supabase/functions/generate/index.ts` and re-deploy.

### Editing the brand voice or content pillars

The brand context, content pillars and prompts live in
`supabase/functions/generate/index.ts`. The pillar list is mirrored in
`js/admin.js` (`CONTENT_PILLARS`) for the UI — keep the two in sync if you change
them. After editing the function, re-deploy with `supabase functions deploy generate`.

---

## A note on cookies (piškotki)

The site shows a small consent banner (`js/widgets.js`) on first visit. It uses
**only** a necessary cookie-equivalent (`localStorage`) to remember the visitor's
choice — no analytics or tracking cookies are set. The banner won't reappear once
a choice is made.

---

## Step 7 — Deploy to Netlify

### Option A — Drag & Drop (simplest)

1. Go to [https://app.netlify.com](https://app.netlify.com).
2. Click **Add new site → Deploy manually**.
3. Drag the entire project folder onto the upload area.
4. Done. Your site is live.

### Option B — Git Deploy (recommended for updates)

1. Push this repo to GitHub.
2. In Netlify → **Add new site → Import an existing project**.
3. Connect your GitHub repo.
4. Build settings: leave blank (no build command, publish directory = `/`).
5. Click **Deploy site**.

---

## Using the Admin Panel

1. Visit `https://your-site.netlify.app/admin`
2. Log in with the email/password you created in Step 5.
3. Use the sidebar to manage:
   - **Hero** — heading, subheading, CTA buttons
   - **About** — profile photo, bio, skills, stats
   - **Services** — add/edit/delete service cards
   - **Projects** — upload images, add/edit/delete projects
   - **Messages** — view contact form submissions
   - **Objave** — generate social-media posts & a 7-day plan, save/edit/schedule them
   - **Settings** — site name, contact info, social links, SEO

---

## Customisation Tips

| What to change | Where |
|----------------|-------|
| Colours / fonts | `css/style.css` → `:root` variables |
| Logo text | Admin → Settings → Logo Text (or directly in HTML) |
| Nav links | `index.html` — `<nav>` section |
| Default content | `supabase/schema.sql` → seed `INSERT` statements |
| Favicon | Add `favicon.ico` to project root and link in `<head>` |

---

## Security Notes

- The `admin/` folder is not protected at the filesystem level — Supabase Auth handles access control in the browser.
- All write operations in Supabase require an authenticated session (RLS policies).
- For additional security you can add a `_redirects` file on Netlify to password-protect the `/admin/*` path at the CDN level.
- Never commit your Supabase service-role key to the repository.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Failed to fetch" on public site | Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `supabase-config.js` |
| Admin login fails | Ensure the user exists in Supabase Auth → Users |
| Images not uploading | Verify the `portfolio` storage bucket exists and is public |
| Email not sending | Check Edge Function logs in Supabase Dashboard → Edge Functions |
| RLS blocking reads | Re-run `schema.sql` to recreate policies |
