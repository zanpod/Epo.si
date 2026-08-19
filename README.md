# Personal Portfolio — Setup Guide

A production-ready personal portfolio website using HTML/CSS/Vanilla JS + Supabase + Netlify. No build step required.

---

## File Structure

```
/
├── index.html                    ← Public website
├── blog.html                     ← Public blog listing (Novice)
├── blog-post.html                ← Public single article page
├── admin/
│   └── index.html                ← Admin panel (protected by Supabase Auth)
├── css/
│   └── style.css                 ← All styles
├── js/
│   ├── supabase-config.js        ← ⚠️  Fill in your keys here
│   ├── main.js                   ← Public site JS
│   ├── blog.js                   ← Public blog JS (listing + article + homepage preview)
│   ├── widgets.js                ← Cookie consent + AI chat widget
│   └── admin.js                  ← Admin panel JS
├── supabase/
│   ├── schema.sql                ← Run this in Supabase SQL Editor
│   └── functions/
│       ├── send-contact-email/
│       │   └── index.ts          ← Edge Function for email notifications
│       ├── chat/
│       │   └── index.ts          ← Edge Function: AI chat (Claude API)
│       ├── generate/
│       │   └── index.ts          ← Edge Function: AI generator vsebin (Groq API)
│       └── canva/
│           └── index.ts          ← Edge Function: Canva Connect (OAuth + izvoz slike)
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

## Step 6d — (Optional) Send generated images straight to Canva

The **Objave** section can push a generated image directly into a new Canva design
(in the chosen format) via the **Canva Connect API**. The button **»Pošlji v Canvo«**
uploads the image and opens a ready-to-edit Canva design. (There is also a manual
fallback, **»Uredi v Canvi«**, that just opens Canva and copies the text — this needs
no setup.)

This requires a **one-time, free** Canva developer app:

### 1. Create a Canva integration

1. Go to [canva.com/developers](https://www.canva.com/developers/) → **Your integrations → Create an integration** (type: *Public* or *Private* for your own use).
2. Under **Scopes**, enable: `asset:write`, `design:content:write`, `design:meta:read`.
3. Under **Authentication / Redirect URLs**, add your admin URL exactly, e.g.
   `https://agencijaepo.si/admin/` (and `http://localhost:8888/admin/` for local testing).
4. Copy the **Client ID** and generate/copy the **Client Secret**.

### 2. Deploy the Edge Function & add secrets

```bash
supabase functions deploy canva
```

In Supabase Dashboard → **Edge Functions → canva → Secrets**, add:

| Key                   | Value                                   |
|-----------------------|-----------------------------------------|
| `CANVA_CLIENT_ID`     | Client ID of your Canva integration     |
| `CANVA_CLIENT_SECRET` | Client Secret of your Canva integration |

### 3. Connect once

The first time you click **»Pošlji v Canvo«** you're redirected to Canva to authorize.
After that, the token is stored locally and reused (auto-refreshed).

> **How it works:** `js/admin.js` runs the OAuth 2.0 + PKCE flow; the `canva` Edge
> Function holds the Client Secret and handles the token exchange, then (action
> `export`) downloads the generated image server-side, uploads it as a Canva asset
> (`/v1/asset-uploads`) and creates a design from it (`/v1/designs`, custom size
> matching the chosen format). The Client Secret never reaches the browser.
>
> **Cost:** creating a design from an uploaded asset works with a normal Canva
> account. (Brand-template *autofill* would require a paid Canva plan, but this
> integration does not use it.)

---

## Blog (Novice)

The site includes a full blog: a public listing page (`blog.html`), a single
article template (`blog-post.html`), a "latest posts" preview section on the
homepage, and a **Blog** section in the admin panel to write and manage posts.

Posts live in the `blog_posts` table (created by `schema.sql`) with:

- `title`, `slug`, `excerpt`, `content` (HTML from the rich-text editor)
- `cover_image_url`, `category`, `tags[]`, `author_name`
- `status` (`draft` | `published`), `is_featured`, `reading_minutes` (auto-computed)
- `seo_title` / `seo_description` (optional overrides for social/search previews)
- `published_at` — set automatically on publish; can be set in the future to
  **schedule** a post (it only appears publicly once `published_at` has passed)

### Writing a post

In the admin panel → **Blog** → **+ Nova objava**:

1. Type a title — the URL slug is generated automatically (editable).
2. Upload a cover image, write a short excerpt, pick a category and tags.
3. Write the body in the rich-text editor (headings, bold/italic, lists,
   quotes, links, and inline images — images upload straight to Supabase
   Storage, same bucket as the rest of the site).
4. Optionally set an SEO title/description (otherwise the title/excerpt are
   used), mark it as **Featured** to pin it at the top of the blog, and set
   status to **Objavljeno** (published) — or leave as **Osnutek** (draft).

Public visitors only ever see posts with `status = 'published'` and a
`published_at` in the past — RLS enforces this at the database level, same
pattern as the rest of the site (`Public can read published blog posts` /
`Authenticated can manage blog posts` policies in `schema.sql`).

### A note on rich content

The article body is stored and rendered as HTML from the admin's own
rich-text editor. Since only the authenticated admin can write to
`blog_posts` (enforced by RLS), this is safe — the same trust model already
used for `about_bio`, service descriptions, etc.

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
   - **Blog** — write, edit and publish blog posts with a rich-text (Quill) editor
   - **Messages** — view contact form submissions
   - **Objave** — generate social-media posts & a 7-day plan, save/edit/schedule them
   - **Settings** — site name, contact info, social links, SEO

---

## Demo Overview (`/demo`)

`https://your-site/demo` lists all sales demo e-menus for the **`cenik`**
product (the multi-tenant digital menu system this agency sells) and lets you
create new ones entirely from the browser — no terminal needed. It is
protected by the **same login** as `/admin` (same Supabase Auth project), so
only you can see the list of prospects; from there you create, copy/QR-share,
or delete one specific client's demo.

- **"+ Nov demo"** opens a form (name, colors, logo, table count, and a
  dynamic categories/items builder) and POSTs it to the `provision-demo` Edge
  Function in the `cenik` Supabase project, which does the actual writes with
  its service-role key — including creating a **demo admin account**
  (`<slug>@demo.agencijaepo.si` + a generated password) so the prospect can
  log into the full admin panel (tables/QR, live orders, menu editing,
  settings), not just browse the guest menu. The password is shown **once**,
  in a follow-up modal with a "copy for the client" button — Supabase doesn't
  store it recoverably.
- **"🔑 Ponastavi geslo"** on a card calls `reset-demo-password` to issue a
  new one (e.g. if you lost it, or are reusing the demo for a new prospect).
- **"🗑 Izbriši"** on a card calls `delete-demo`, which also removes that
  demo's admin account.
- All three functions live in `cenik`'s repo
  (`supabase/functions/provision-demo`, `delete-demo`,
  `reset-demo-password`) and are deployed once via the Supabase Dashboard's
  "Deploy a new function" (paste-and-deploy, no CLI) — see the comment at the
  top of each file. They authorize the caller by checking the request's
  EPO.SI session token directly against *this* project's Auth (cross-project
  check), since the two systems use separate Supabase projects.
- Reading the list itself (`js/demo.js`) connects to `cenik`'s Supabase
  project directly with its **public anon key** — the same key `cenik`
  already exposes client-side to render the menu for guests, so this adds no
  new secret. A local Node CLI (`scripts/demo/provision.js` in `cenik`) also
  still exists as an alternative for anyone who prefers a terminal.

Defaults are hard-coded in `js/demo.js`; override them without editing code
via (e.g. Netlify snippet injection):

```js
window.EPO_DEMO_SUPABASE_URL = 'https://xxxxxxxxxxxx.supabase.co';
window.EPO_DEMO_SUPABASE_ANON_KEY = 'sb_publishable_...';
window.EPO_DEMO_APP_DOMAIN = 'https://demo.agencijaepo.si'; // where /menu/<slug> actually resolves
```

> **Domain setup:** `cenik` is a separate Netlify site from this one (two
> different repos/deploys), so `agencijaepo.si` itself cannot serve
> `/menu/*` — it has no route for it. Guest-facing demo links resolve on
> **`demo.agencijaepo.si`** instead: a custom domain added to the `cenik`
> Netlify site (Domain settings → Add a domain, then a CNAME record at the
> DNS provider for `agencijaepo.si`) — see the "Netlify" section of
> `cenik`'s own README for exact steps. `js/demo.js`'s `DEMO_APP_DOMAIN`
> default already points at `demo.agencijaepo.si`; only override it if you
> pick a different subdomain.

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
