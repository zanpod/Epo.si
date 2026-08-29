-- ============================================================
-- Personal Portfolio — Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Enable UUID extension ──────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── settings (single row) ─────────────────────────────────
create table if not exists settings (
  id uuid primary key default uuid_generate_v4(),

  site_name text not null default 'DEV.NAME',
  logo_text text not null default 'DEV.NAME',

  contact_email text default 'hello@example.com',
  contact_phone text default '+1 (555) 000-0000',

  facebook_url text default 'https://facebook.com',
  linkedin_url text default 'https://linkedin.com',
  instagram_url text default 'https://instagram.com',

  meta_title text default 'DEV.NAME — Web Developer',
  meta_description text default 'Personal portfolio of a web developer',

  hero_heading text default 'Crafting Digital Experiences That Inspire',
  hero_subheading text default 'Full-stack developer specializing in modern web applications. I build things for the web that are fast, accessible, and delightful to use.',

  cta_primary_text text default 'See My Work',
  cta_primary_link text default '#projects',

  cta_secondary_text text default 'Contact Me',
  cta_secondary_link text default '#contact',

  about_bio text default 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',

  about_image_url text default '',

  -- Company / agency details (shown on quotes / ponudbe)
  company_name text default '',
  company_address text default '',
  company_tax text default '',     -- davčna / ID za DDV
  company_iban text default '',

  -- FIXED: valid JSON for the whole default value
  skills jsonb default '{
    "items": [
      "JavaScript",
      "TypeScript",
      "React",
      "Node.js",
      "PostgreSQL",
      "Supabase",
      "CSS",
      "HTML",
      "Git",
      "REST APIs"
    ]
  }'::jsonb,

  stats jsonb default '[
    {"number": "5+", "label": "Years Experience"},
    {"number": "50+", "label": "Projects Delivered"},
    {"number": "30+", "label": "Happy Clients"},
    {"number": "99%", "label": "Client Satisfaction"}
  ]'::jsonb,

  updated_at timestamptz default now()
);

-- Ensure exactly one settings row (safe to re-run: only inserts if empty)
insert into settings (id)
select uuid_generate_v4()
where not exists (select 1 from settings);

-- Upgrade existing settings tables with the company / agency columns.
alter table settings add column if not exists company_name    text default '';
alter table settings add column if not exists company_address text default '';
alter table settings add column if not exists company_tax     text default '';
alter table settings add column if not exists company_iban    text default '';

-- ── services ──────────────────────────────────────────────
create table if not exists services (
  id uuid primary key default uuid_generate_v4(),
  icon text not null default '🚀',
  title text not null default 'Service Title',
  description text not null default 'Service description goes here.',
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

-- Seed default services (safe to re-run: only seeds when the table is empty)
insert into services (icon, title, description, sort_order)
select * from (values
  ('🎨', 'UI / UX Design', 'Crafting intuitive, beautiful interfaces that users love. Pixel-perfect designs translated into responsive code.', 0),
  ('⚡', 'Web Development', 'Building fast, modern web applications with clean code and best practices. From MVPs to large-scale platforms.', 1),
  ('📱', 'Mobile-First', 'Every project is built mobile-first and tested across all screen sizes for a flawless experience on any device.', 2),
  ('🔒', 'Performance & SEO', 'Optimising Core Web Vitals, accessibility, and search rankings so your site not only looks great but ranks and converts.', 3)
) as seed(icon, title, description, sort_order)
where not exists (select 1 from services);

-- ── projects ──────────────────────────────────────────────
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null default '',
  image_url text default '',
  tags text[] default '{}',
  live_url text default '',
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

-- Seed sample projects (safe to re-run: only seeds when the table is empty)
insert into projects (title, description, tags, live_url, sort_order)
select * from (values
  (
    'SaaS Dashboard',
    'A real-time analytics dashboard built with vanilla JS and Supabase. Features live charts, user management, and export tools.',
    array['JavaScript','Supabase','CSS Grid'],
    'https://example.com',
    0
  ),
  (
    'E-Commerce Store',
    'Full-featured online store with cart, checkout, and Stripe payments. Optimised for performance and conversion.',
    array['HTML','CSS','Stripe'],
    'https://example.com',
    1
  ),
  (
    'Portfolio Generator',
    'A drag-and-drop portfolio builder that generates a static site in seconds. Exports clean HTML/CSS with zero dependencies.',
    array['JavaScript','IndexedDB','Web APIs'],
    'https://example.com',
    2
  ),
  (
    'Dev Blog Platform',
    'Markdown-powered blog with syntax highlighting, search, and RSS feed. Scores 100 on Lighthouse.',
    array['HTML','CSS','JavaScript'],
    'https://example.com',
    3
  ),
  (
    'REST API Boilerplate',
    'Production-ready Node.js + Express boilerplate with auth, rate limiting, OpenAPI docs, and Docker support.',
    array['Node.js','PostgreSQL','Docker'],
    'https://example.com',
    4
  ),
  (
    'Open Source CLI Tool',
    'Command-line tool for scaffolding projects with 2k+ GitHub stars. Written in TypeScript with zero runtime dependencies.',
    array['TypeScript','CLI','Open Source'],
    'https://example.com',
    5
  )
) as seed(title, description, tags, live_url, sort_order)
where not exists (select 1 from projects);

-- ── contacts ──────────────────────────────────────────────
create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  subject text not null default '',
  company text not null default '',   -- optional company name from the form
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz default now()
);

-- Upgrade existing contacts tables.
alter table contacts add column if not exists company text not null default '';

-- ── customers (stranke) ───────────────────────────────────
create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null default '',
  tax_number text default '',         -- davčna številka
  email text default '',
  phone text default '',
  address text default '',
  notes text default '',
  created_at timestamptz default now()
);

-- De-duplicate customers by tax number when one is provided.
create unique index if not exists customers_tax_number_key
  on customers (tax_number) where tax_number <> '';

-- ── quotes (ponudbe sent to customers) ────────────────────
create table if not exists quotes (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid references contacts(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  quote_number text not null,
  customer_name text not null default '',
  customer_email text not null default '',
  customer_tax text default '',
  customer_address text default '',
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  vat_rate numeric not null default 0,
  total numeric not null default 0,
  notes text default '',
  valid_until date,
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- Upgrade existing quotes tables.
alter table quotes add column if not exists customer_id      uuid references customers(id) on delete set null;
alter table quotes add column if not exists customer_tax     text default '';
alter table quotes add column if not exists customer_address text default '';

-- ============================================================
-- Row-Level Security
-- ============================================================

alter table settings enable row level security;
alter table services enable row level security;
alter table projects enable row level security;
alter table contacts enable row level security;
alter table customers enable row level security;
alter table quotes enable row level security;

-- settings: public read, authenticated write
drop policy if exists "Public can read settings" on settings;
create policy "Public can read settings"
  on settings for select
  using (true);

drop policy if exists "Authenticated can update settings" on settings;
create policy "Authenticated can update settings"
  on settings for update
  to authenticated
  using (auth.role() = 'authenticated');

-- services: public read, authenticated write
drop policy if exists "Public can read services" on services;
create policy "Public can read services"
  on services for select
  using (true);

drop policy if exists "Authenticated can manage services" on services;
create policy "Authenticated can manage services"
  on services for all
  to authenticated
  using (auth.role() = 'authenticated');

-- projects: public read visible ones, authenticated sees all
drop policy if exists "Public can read visible projects" on projects;
create policy "Public can read visible projects"
  on projects for select
  using (is_visible = true);

drop policy if exists "Authenticated can manage projects" on projects;
create policy "Authenticated can manage projects"
  on projects for all
  to authenticated
  using (auth.role() = 'authenticated');

-- contacts: public can insert, authenticated can read/manage
drop policy if exists "Public can submit contacts" on contacts;
create policy "Public can submit contacts"
  on contacts for insert
  with check (true);

drop policy if exists "Authenticated can manage contacts" on contacts;
create policy "Authenticated can manage contacts"
  on contacts for all
  to authenticated
  using (auth.role() = 'authenticated');

-- customers: only authenticated (admin) can read/manage
drop policy if exists "Authenticated can manage customers" on customers;
create policy "Authenticated can manage customers"
  on customers for all
  to authenticated
  using (auth.role() = 'authenticated');

-- quotes: only authenticated (admin) can read/manage
drop policy if exists "Authenticated can manage quotes" on quotes;
create policy "Authenticated can manage quotes"
  on quotes for all
  to authenticated
  using (auth.role() = 'authenticated');

-- ============================================================
-- Storage bucket for portfolio images
-- (run this separately if storage policies differ in your plan)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('portfolio', 'portfolio', true);
--
-- create policy "Public can view images"
--   on storage.objects for select using (bucket_id = 'portfolio');
--
-- create policy "Authenticated can upload images"
--   on storage.objects for insert with check (
--     bucket_id = 'portfolio' and auth.role() = 'authenticated'
--   );
--
-- create policy "Authenticated can delete images"
--   on storage.objects for delete using (
--     bucket_id = 'portfolio' and auth.role() = 'authenticated'
--   );
