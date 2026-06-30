# Opis projekta — EPO.SI

Celovit pregled, kaj projekt vsebuje in kako deluje. Ta dokument je
namenjen hitri orientaciji — za navodila za namestitev glej `README.md`.

---

## Kaj je EPO.SI

EPO.SI je **spletna stran z lastnim skrbniškim sistemom (admin panel)** za
ponudnika spletnih rešitev po meri (digitalni ceniki, rezervacijski sistemi,
admin paneli, CRM). Stran predstavlja storitve in pakete, zbira povpraševanja
in vključuje orodja za poslovanje: bazo strank, izdelavo in pošiljanje ponudb,
pripravo vsebin za družbena omrežja in osnovno analitiko obiska.

Tehnično je narejena kot **statična stran (HTML / CSS / čisti JavaScript) brez
build koraka**, povezana s **Supabase** (baza, avtentikacija, shramba slik,
Edge Functions). Gostuje se lahko na Netlify (drag & drop ali Git deploy).

**Sklop tehnologij:** HTML + CSS + Vanilla JS · Supabase (PostgreSQL, Auth,
Storage, Edge Functions v Denu/TypeScript) · Resend (e-pošta) · Groq API
(AI besedila) · Canva Connect API (izvoz slik).

---

## Struktura datotek

```
/
├── index.html              ← Javna spletna stran (predstavitev + obrazec)
├── zasebnost.html          ← Stran s politiko zasebnosti
├── favicon.svg             ← Ikona strani
├── og-image.png            ← Slika za predogled pri deljenju (Open Graph)
├── admin/
│   └── index.html          ← Skrbniški panel (zaščiten s Supabase Auth)
├── css/
│   └── style.css           ← Vsi slogi (barve/fonti v :root spremenljivkah)
├── js/
│   ├── supabase-config.js  ← Ključi Supabase (URL + anon ključ)
│   ├── main.js             ← Logika javne strani
│   ├── widgets.js          ← Piškotno soglasje + AI klepetalni gradnik
│   └── admin.js            ← Logika skrbniškega panela
├── supabase/
│   ├── schema.sql          ← Shema baze (tabele, RLS pravila, začetni podatki)
│   └── functions/          ← Strežniške Edge Functions (Deno/TypeScript)
│       ├── chat/           ← AI klepet za obiskovalce (Groq)
│       ├── generate/       ← AI generator vsebin za objave (Groq)
│       ├── canva/          ← Izvoz slike v Canvo (OAuth + Connect API)
│       ├── send-contact-email/  ← E-poštno obvestilo ob povpraševanju (Resend)
│       └── send-quote/     ← Pošiljanje ponudbe (PDF) stranki (Resend)
└── README.md               ← Navodila za namestitev in nastavitve
```

---

## Javna spletna stran (`index.html`)

Enostranska predstavitvena stran z razdelki:

- **Home / Hero** — naslov, podnaslov in gumba s pozivom k dejanju (urejljivo
  iz admina).
- **About** — predstavitev, slika, veščine in statistike.
- **Services** — kartice storitev (ikona, naslov, opis).
- **Pricing** — trije paketi z javnimi cenami:
  - **EPO Start** — 290 € postavitev + 25 €/mesec
  - **EPO Pro** — 490 € postavitev + 39 €/mesec
  - **EPO Cenik** — 290 € postavitev + 29 €/mesec
  - Cene »na ključ« (postavitev + vzdrževanje: gostovanje, domena, posodobitve,
    podpora); za posebne rešitve individualna ponudba.
- **FAQ** — pogosta vprašanja.
- **Projects** — galerija referenc/projektov (slike, opisi, oznake, povezave).
- **Contact** — kontaktni obrazec za povpraševanja.

**Logika javne strani (`js/main.js`):** naloži nastavitve, storitve in projekte
iz Supabase in jih izriše; obravnava oddajo kontaktnega obrazca; beleži ogled
strani (anonimno) za analitiko; animacije ob drsenju; aktivna navigacija.

**Gradniki (`js/widgets.js`):**
- **Piškotno soglasje** — majhna pasica ob prvem obisku; uporablja samo nujni
  `localStorage` za zapomnitev izbire (brez sledilnih/analitičnih piškotkov).
- **AI klepet** — plavajoči gradnik, ki obiskovalcem odgovarja **izključno** o
  storitvah EPO.SI in uradnem ceniku (preko Edge Function `chat`). Če funkcija
  ni nameščena, klepet preusmeri na kontaktni obrazec.

---

## Skrbniški panel (`admin/index.html`, `js/admin.js`)

Dostopen na `/admin`, zaščiten s **Supabase Auth** (prijava z e-pošto/geslom).
Vsi zapisi v bazo zahtevajo prijavljeno sejo (RLS pravila). Razdelki:

- **Dashboard (Nadzorna plošča)** — pregled in analitika obiska (ogledi strani,
  viri obiska).
- **Hero** — urejanje naslova, podnaslova in gumbov.
- **About** — profilna slika, biografija, veščine, statistike.
- **Services (Storitve)** — dodajanje/urejanje/brisanje kartic storitev.
- **Projects (Projekti)** — nalaganje slik in urejanje referenc.
- **Messages (Sporočila)** — pregled prejetih povpraševanj iz obrazca.
- **Customers (Stranke)** — baza strank (naziv, davčna, kontakt, naslov, opombe).
- **Quotes / Ponudbe** — izdelava ponudb (postavke, DDV, skupaj, veljavnost),
  generiranje PDF in pošiljanje stranki po e-pošti; sledenje statusu
  (poslana / realizirana / zavrnjena).
- **Objave (Content)** — priprava vsebin za Instagram/Facebook: AI generira eno
  objavo (kljuka, besedilo, hashtagi, ideja za vizual) ali 7-dnevni načrt;
  objave se shranijo, uredijo, načrtujejo in pregledujejo v seznamu ali tedenskem
  koledarju. Možen izvoz slike naravnost v **Canvo**.
- **Settings (Nastavitve)** — ime strani, logo, kontaktni podatki, družbena
  omrežja, SEO (meta naslov/opis) in podatki podjetja za ponudbe (naziv, naslov,
  davčna, IBAN).
- **Logout** — odjava.

---

## Podatkovni model (Supabase / `schema.sql`)

PostgreSQL tabele z vklopljenim **Row-Level Security**:

| Tabela        | Namen | Dostop |
|---------------|-------|--------|
| `settings`    | Enovrstična konfiguracija strani (hero, about, kontakt, SEO, podatki podjetja) | Javno branje, skrbnik piše |
| `services`    | Kartice storitev | Javno branje, skrbnik upravlja |
| `projects`    | Reference/projekti (z `is_visible`) | Javno branje vidnih, skrbnik vse |
| `contacts`    | Povpraševanja iz obrazca | Javnost vstavlja, skrbnik bere/upravlja |
| `customers`   | Baza strank (stranke) | Samo skrbnik |
| `quotes`      | Ponudbe (postavke, zneski, status, veljavnost) | Samo skrbnik |
| `posts`       | Pripravljene objave za družbena omrežja | Samo skrbnik |
| `page_views`  | Anonimna analitika obiskov | Javnost vstavlja, skrbnik bere |

Shema vsebuje tudi začetne (seed) podatke za storitve in projekte ter `alter
table` nadgradnje za obstoječe baze. Slike se hranijo v javnem Storage vedru
`portfolio`.

---

## Strežniške funkcije (Supabase Edge Functions, Deno/TypeScript)

Vse skrivnosti (API ključi) ostanejo na strežniku — nikoli v brskalniku.

| Funkcija             | Namen | Zunanja storitev |
|----------------------|-------|------------------|
| `chat`               | AI klepet za obiskovalce, omejen na storitve/cenik EPO.SI | Groq (`llama-3.3-70b-versatile`) |
| `generate`           | Generiranje objav in 7-dnevnega načrta vsebin | Groq |
| `canva`              | OAuth 2.0 + PKCE in izvoz slike v novo Canva oblikovanje | Canva Connect API |
| `send-contact-email` | E-poštno obvestilo ob novem povpraševanju | Resend |
| `send-quote`         | Pošiljanje ponudbe (PDF priponka) stranki | Resend |

Vse funkcije so neobvezne — stran deluje tudi brez njih (npr. obrazec še vedno
shrani povpraševanje v bazo, klepet preusmeri na kontakt).

---

## Pomembne lastnosti

- **Brez build koraka** — čisti HTML/CSS/JS, enostavno gostovanje (Netlify).
- **Varnost** — dostop do admina in vsi zapisi zaščiteni s Supabase Auth + RLS;
  skrivnosti samo v Edge Functions; service-role ključ se ne shranjuje v repo.
- **Zasebnost** — brez sledilnih piškotkov; samo nujni `localStorage` za soglasje;
  lastna anonimna analitika (`page_views`) namesto zunanjih sledilcev.
- **Prilagodljivost** — barve/fonti v `:root` spremenljivkah CSS; vsebina
  urejljiva iz admina; cenik in obseg AI klepeta urejljiva v `chat/index.ts`.
- **Lokalizacija** — vmesnik in vsebina v slovenščini.
