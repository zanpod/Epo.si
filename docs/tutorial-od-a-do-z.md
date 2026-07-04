# Od A do Ž: kako zgraditi predstavitveno spletno stran za svoj biznis

*Vodič za udeležence tečaja — brez potrebnega predznanja programiranja.*

---

## Kazalo

1. [Uvod — kaj bomo naredili](#1-uvod--kaj-bomo-naredili)
2. [Kaj potrebujete, preden začnete](#2-kaj-potrebujete-preden-začnete)
3. [Kako je stran sestavljena (v treh stavkih)](#3-kako-je-stran-sestavljena-v-treh-stavkih)
4. [Korak 1 — Pridobite kopijo predloge (GitHub)](#4-korak-1--pridobite-kopijo-predloge-github)
5. [Korak 2 — Registracija na Supabase in nov projekt](#5-korak-2--registracija-na-supabase-in-nov-projekt)
6. [Korak 3 — Povežite ključe s stranjo](#6-korak-3--povežite-ključe-s-stranjo)
7. [Korak 4 — Zaženite bazo podatkov (schema.sql)](#7-korak-4--zaženite-bazo-podatkov-schemasql)
8. [Korak 5 — Ustvarite shrambo za slike (Storage)](#8-korak-5--ustvarite-shrambo-za-slike-storage)
9. [Korak 6 — Ustvarite svoj administratorski uporabniški račun](#9-korak-6--ustvarite-svoj-administratorski-uporabniški-račun)
10. [Korak 7 — Registracija na Netlify in objava strani v živo](#10-korak-7--registracija-na-netlify-in-objava-strani-v-živo)
11. [Korak 8 — Prva prijava v admin panel in urejanje vsebine](#11-korak-8--prva-prijava-v-admin-panel-in-urejanje-vsebine)
12. [Korak 9 — Lastna domena (npr. vasepodjetje.si)](#12-korak-9--lastna-domena-npr-vasepodjetjesi)
13. [Neobvezno: dodatne funkcije (e-pošta, AI klepet, Canva)](#13-neobvezno-dodatne-funkcije-e-pošta-ai-klepet-canva)
14. [Piškotki in zasebnost (GDPR)](#14-piškotki-in-zasebnost-gdpr)
15. [Varnostni nasveti](#15-varnostni-nasveti)
16. [Pogosta vprašanja in odpravljanje težav](#16-pogosta-vprašanja-in-odpravljanje-težav)
17. [Redno vzdrževanje strani](#17-redno-vzdrževanje-strani)
18. [Slovarček pojmov od A do Ž](#18-slovarček-pojmov-od-a-do-ž)
19. [Kontrolni seznam pred zagonom v živo](#19-kontrolni-seznam-pred-zagonom-v-živo)

---

## 1. Uvod — kaj bomo naredili

Do konca tega vodiča bo vaše podjetje imelo svojo **profesionalno predstavitveno spletno stran**, ki:

- teče na svoji domeni (npr. `www.vasepodjetje.si`),
- ima urejevalni **admin panel** (brez pisanja kode), kjer sami urejate besedila, slike, storitve, cenik in sporočila strank,
- shranjuje vse podatke varno v oblaku (Supabase),
- je gostovana zastonj na Netlify z avtomatskim HTTPS (ključavnica v naslovni vrstici),
- vključuje kontaktni obrazec, ki sporočila shrani in vas lahko o njih obvesti po e-pošti.

Predloga, ki jo uporabljamo, je zgrajena iz **čistega HTML/CSS/JavaScript** — ni potrebno nič "buildati" ali nameščati zapletenih orodij. Vse spremembe vsebine (besedilo, slike, cene) kasneje urejate skozi admin panel v brskalniku, ne v kodi.

> 💡 **Nasvet za tečaj:** prvi krog (koraki 1–10) traja približno 60–90 minut, tudi če ste popolni začetnik.

---

## 2. Kaj potrebujete, preden začnete

| Kaj | Zakaj |
|---|---|
| Računalnik s spletnim brskalnikom | Za vso postavitev — telefon ne bo dovolj |
| Veljaven e-poštni naslov | Za registracijo na GitHub, Supabase in Netlify |
| ~60–90 minut časa | Za prvo postavitev |
| (Neobvezno) Svoja domena | Če že imate `.si` ali `.com` domeno, jo boste v koraku 9 povezali |

Ustvariti si boste morali **tri brezplačne račune**:

1. **GitHub** — [github.com](https://github.com) — tu je shranjena koda vaše strani.
2. **Supabase** — [supabase.com](https://supabase.com) — tu se shranjujejo vaši podatki (besedila, slike, sporočila).
3. **Netlify** — [netlify.com](https://netlify.com) — tu je vaša stran objavljena v živo (hosting).

Vsi trije imajo brezplačen paket, ki za predstavitveno stran popolnoma zadostuje.

---

## 3. Kako je stran sestavljena (v treh stavkih)

- **Netlify** gosti "vitrino" — datoteke, ki jih vidijo obiskovalci (`index.html`, `css/`, `js/`).
- **Supabase** je "zaledje" — baza podatkov, prijava administratorja in shramba za slike.
- Ko v admin panelu nekaj spremenite (npr. cena storitve), se to takoj shrani v Supabase, javna stran pa to prikaže naslednjič, ko se naloži.

Zapomniti si morate samo eno stvar: **Netlify = izgled strani, Supabase = vsebina in podatki.**

---

## 4. Korak 1 — Pridobite kopijo predloge (GitHub)

1. Pojdite na repozitorij predloge na GitHubu (povezavo dobite od predavatelja tečaja).
2. Kliknite zeleni gumb **"Use this template"** (ali **"Fork"**), da nastane vaša lastna kopija pod vašim GitHub računom.
   - Če nimate GitHub računa, se najprej brezplačno registrirajte na [github.com/signup](https://github.com/signup).
3. Poimenujte svoj repozitorij (npr. `moje-podjetje-splet`) in kliknite **Create repository**.

> Na koncu tega koraka imate v svojem GitHub računu svojo kopijo vseh datotek strani (`index.html`, `css/`, `js/`, `supabase/` …).

---

## 5. Korak 2 — Registracija na Supabase in nov projekt

1. Pojdite na [supabase.com](https://supabase.com) in kliknite **Start your project**.
2. Registrirajte se (najlažje z GitHub računom — en klik).
3. Kliknite **New project**:
   - **Name**: ime vašega podjetja (npr. `moje-podjetje`)
   - **Database Password**: ustvarite močno geslo in si ga **shranite** (npr. v upravitelja gesel) — ga boste redko potrebovali, a je pomembno.
   - **Region**: izberite regijo blizu vas (npr. `Central EU (Frankfurt)`)
4. Kliknite **Create new project** in počakajte 1–2 minuti, da se projekt pripravi.
5. Ko je projekt pripravljen, pojdite v **Project Settings → API**. Tu vidite dvoje, kar boste potrebovali v naslednjem koraku:
   - **Project URL** (izgleda kot `https://xxxxxxxxxxxx.supabase.co`)
   - **anon public key** (dolg niz znakov, začne se npr. z `eyJ...` ali `sb_publishable_...`)

> ⚠️ Nikoli ne delite ali objavljajte ključa **service_role** (drugačen od "anon public") — ta ima poln dostop do baze. Za to stran ga ne potrebujete.

---

## 6. Korak 3 — Povežite ključe s stranjo

1. V svojem GitHub repozitoriju odprite datoteko `js/supabase-config.js` (gumb svinčnika za urejanje neposredno na GitHubu, ali si repozitorij prenesite na računalnik).
2. Zamenjajte vrednosti s svojimi:

```js
const SUPABASE_URL = 'https://xxxxxxxxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'vaš-anon-public-ključ';
```

3. Shranite spremembo (na GitHubu: **Commit changes**).

---

## 7. Korak 4 — Zaženite bazo podatkov (schema.sql)

Ta korak pripravi vse "predale" (tabele) za vsebino vaše strani: nastavitve, storitve, projekte, sporočila.

1. V Supabase pojdite na **SQL Editor** (ikona v levem meniju).
2. Kliknite **New query**.
3. Odprite datoteko `supabase/schema.sql` v svojem repozitoriju, skopirajte **celotno vsebino**.
4. Prilepite v SQL Editor in kliknite **Run** (ali `Ctrl/Cmd + Enter`).
5. Ob uspehu se izpiše potrditev — v levem meniju pod **Table Editor** boste videli nove tabele: `settings`, `services`, `projects`, `contacts`, `posts`.

> To morate narediti samo **enkrat**, ob prvi postavitvi.

---

## 8. Korak 5 — Ustvarite shrambo za slike (Storage)

1. V Supabase pojdite na **Storage**.
2. Kliknite **New bucket**, ime: `portfolio`, vklopite **Public bucket** → **Save**.
3. Pojdite na **Storage → Policies** (za bucket `portfolio`) in dodajte tri pravila:

| Ime pravila | Operacija | Pogoj |
|---|---|---|
| Public can view images | SELECT | `true` |
| Auth can upload images | INSERT | `auth.role() = 'authenticated'` |
| Auth can delete images | DELETE | `auth.role() = 'authenticated'` |

> Namesto ročnega dodajanja lahko v `schema.sql` odkomentirate spodnji razdelek s "storage policy" in ga poženete v SQL Editorju — naredi isto stvar samodejno.

---

## 9. Korak 6 — Ustvarite svoj administratorski uporabniški račun

1. V Supabase pojdite na **Authentication → Users**.
2. Kliknite **Add user → Create new user**.
3. Vnesite svoj e-poštni naslov in močno geslo.
4. Shranite — to bosta vaša podatka za prijavo na `/admin` strani.

---

## 10. Korak 7 — Registracija na Netlify in objava strani v živo

1. Pojdite na [netlify.com](https://netlify.com) in se registrirajte (najlažje z GitHub računom).
2. Kliknite **Add new site → Import an existing project**.
3. Izberite **GitHub** in poiščite svoj repozitorij (npr. `moje-podjetje-splet`).
4. Nastavitve gradnje pustite **prazne** (ni build ukaza, publish directory = `/`).
5. Kliknite **Deploy site**.
6. Po ~30 sekundah je stran objavljena na naslovu tipa `https://naključno-ime-1234.netlify.app` — to je vaša **prava, delujoča spletna stran**.

> 🔁 Vsakič, ko kasneje spremenite kodo v GitHub repozitoriju (npr. barve v `css/style.css`), Netlify samodejno znova objavi stran v minuti ali dveh.

---

## 11. Korak 8 — Prva prijava v admin panel in urejanje vsebine

1. Odprite `https://vaša-stran.netlify.app/admin`.
2. Prijavite se z e-pošto/geslom iz koraka 6.
3. V levem meniju admin panela uredite:
   - **Hero** — glavni naslov, podnaslov, gumbi za akcijo (CTA)
   - **O meni / About** — fotografija, opis, veščine, statistika
   - **Storitve** — dodajte/uredite/izbrišite kartice storitev
   - **Projekti** — naložite slike, dodajte/uredite/izbrišite reference
   - **Sporočila** — tu vidite vsa sporočila, poslana preko kontaktnega obrazca
   - **Objave** — priprava vsebin za Instagram/Facebook (neobvezno, glej razdelek 13)
   - **Nastavitve** — ime strani, kontaktni podatki, povezave do družbenih omrežij, SEO opis

> Vsaka sprememba se shrani takoj po kliku na **Shrani** — osvežite javno stran, da vidite rezultat.

---

## 12. Korak 9 — Lastna domena (npr. vasepodjetje.si)

Če imate ali kupite domeno (npr. pri Arnesu, WebHostFace, GoDaddy, Namecheap …):

1. V Netlify pojdite na **Site settings → Domain management → Add a domain**.
2. Vnesite svojo domeno (npr. `vasepodjetje.si`).
3. Netlify pokaže DNS nastavitve (bodisi spremembo **nameserverjev** bodisi **A/CNAME zapisov**) — te vnesete pri svojem registratorju domene (kjer ste domeno kupili).
4. Počakajte 10 minut do 24 ur, da se DNS razširi. Netlify samodejno priskrbi tudi brezplačno HTTPS potrdilo (ključavnica).

> Do takrat lahko stran mirno uporabljate na začasnem `netlify.app` naslovu.

---

## 13. Neobvezno: dodatne funkcije (e-pošta, AI klepet, Canva)

Te funkcije niso obvezne za osnovno delovanje strani — dodate jih lahko kasneje, ko se z osnovami spoznate.

### a) E-poštna obvestila o novih sporočilih (Resend)

Ko obiskovalec odda kontaktni obrazec, lahko dobite e-poštno obvestilo.

1. Namestite [Supabase CLI](https://supabase.com/docs/guides/cli) na svoj računalnik.
2. V terminalu, znotraj mape projekta:
   ```bash
   supabase login
   supabase link --project-ref VAŠ-PROJECT-REF
   supabase functions deploy send-contact-email
   ```
3. V Supabase → **Edge Functions → send-contact-email → Secrets** dodajte:

   | Ključ | Vrednost |
   |---|---|
   | `RESEND_API_KEY` | Vaš API ključ iz [resend.com](https://resend.com) |
   | `NOTIFY_EMAIL` | E-naslov, na katerega želite prejemati obvestila |
   | `FROM_EMAIL` | Potrjen pošiljateljski naslov na Resend |

   > Sporočila se v bazo shranijo tudi brez tega koraka — e-poštna obvestila so le dodatna udobnost.

### b) AI klepet za obiskovalce (Groq)

Plavajoče klepetalno okno, ki odgovarja samo na vprašanja o vaših storitvah in ceniku.

1. Ustvarite brezplačen ključ na [console.groq.com/keys](https://console.groq.com/keys).
2. `supabase functions deploy chat`
3. V **Edge Functions → chat → Secrets** dodajte `GROQ_API_KEY`.
4. Besedilo/pravila klepeta uredite v `supabase/functions/chat/index.ts` (`SYSTEM_PROMPT`).

### c) Generator objav za družbena omrežja (Groq)

Admin razdelek **Objave** pripravi objave (hook, opis, hashtagi) ali 7-dnevni načrt vsebin.

1. `supabase functions deploy generate`
2. V **Edge Functions → generate → Secrets** dodajte `GROQ_API_KEY` (lahko isti kot zgoraj).

### d) Pošiljanje slik direktno v Canvo

1. Na [canva.com/developers](https://www.canva.com/developers/) ustvarite integracijo, omogočite scope-e `asset:write`, `design:content:write`, `design:meta:read`, dodajte redirect URL vašega admin naslova (npr. `https://vasa-stran.si/admin/`).
2. `supabase functions deploy canva`
3. V **Edge Functions → canva → Secrets** dodajte `CANVA_CLIENT_ID` in `CANVA_CLIENT_SECRET`.
4. Ob prvem kliku na **"Pošlji v Canvo"** se enkrat prijavite — nato se povezava zapomni.

---

## 14. Piškotki in zasebnost (GDPR)

Predloga že vsebuje:

- pasico za soglasje ob prvem obisku (`js/widgets.js`), ki uporablja samo nujno potreben `localStorage` (ne prava sledilna piškotka),
- stran **Zasebnost** (`zasebnost.html`), ki jo prilagodite podatkom svojega podjetja (naziv, naslov, kontakt, kaj se shranjuje).

> Priporočljivo: preden stran objavite javno, preberite in dopolnite `zasebnost.html` s svojimi resničnimi podatki (naziv podjetja, matična številka, kontaktni e-naslov).

---

## 15. Varnostni nasveti

- Mapa `admin/` ni zaščitena na nivoju datotek — dostop nadzoruje Supabase Auth (prijava z e-pošto/geslom) v brskalniku.
- Vse operacije pisanja v bazo zahtevajo prijavljenega uporabnika (t. i. **RLS politike**, ki so že pripravljene v `schema.sql`).
- Za dodatno zaščito lahko na Netlify z datoteko `_redirects` zaščitite pot `/admin/*` še na nivoju CDN (dodatno geslo).
- **Nikoli** ne objavite ali delite ključa **service_role** — v tem projektu ga sploh ne potrebujete.
- Uporabite močno, edinstveno geslo za svoj admin račun.

---

## 16. Pogosta vprašanja in odpravljanje težav

| Težava | Rešitev |
|---|---|
| Na javni strani piše "Failed to fetch" | Preverite `SUPABASE_URL` in `SUPABASE_ANON_KEY` v `js/supabase-config.js` |
| Prijava v admin ne deluje | Preverite, da uporabnik obstaja v Supabase → Authentication → Users |
| Slike se ne naložijo | Preverite, da bucket `portfolio` obstaja in je nastavljen kot public |
| E-pošta se ne pošilja | Preverite dnevnike (logs) v Supabase → Edge Functions |
| Baza "blokira" branje/pisanje (RLS napaka) | Znova poženite `schema.sql`, da se politike ponovno ustvarijo |
| Sprememba kode se ne pozna na strani | Preverite, ali je Netlify uspešno zaključil nov "deploy" (zavihek Deploys) |
| Domena po 24 urah še ne dela | Preverite DNS zapise pri registratorju domene — morajo se ujemati z navodili iz Netlify |

---

## 17. Redno vzdrževanje strani

- Vsebino (besedila, cene, projekte) urejate sproti kar v admin panelu — ni potrebno spreminjati kode.
- Sporočila strank redno preverjajte v razdelku **Sporočila**.
- Če dodate novo funkcijo v kodi (GitHub), Netlify jo samodejno objavi — ni ročnega koraka.
- Priporočamo, da si geslo za Supabase in Netlify shranite v upravitelja gesel in omogočite dvostopenjsko preverjanje (2FA), če je na voljo.

---

## 18. Slovarček pojmov od A do Ž

- **Admin panel** — zaščiten del strani (`/admin`), kjer urejate vsebino brez pisanja kode.
- **API ključ** — "geslo" s katerim se stran predstavi Supabase bazi (javni `anon` ključ je varen za uporabo v brskalniku).
- **Bucket (Storage)** — prostor za shranjevanje datotek (slik) v Supabase.
- **CDN** — mreža strežnikov, ki vašo stran prikaže obiskovalcem hitro, ne glede na to, od kod prihajajo.
- **Deploy (objava)** — postopek, ko Netlify vzame vašo kodo in jo objavi na spletu.
- **DNS** — sistem, ki ime domene (npr. `vasepodjetje.si`) poveže s pravim strežnikom.
- **Domena** — spletni naslov vašega podjetja (npr. `vasepodjetje.si`).
- **Edge Function** — majhen program, ki teče na strežniku Supabase (npr. pošiljanje e-pošte, klic AI-ja) — skrbi, da občutljivi ključi ostanejo skriti.
- **GitHub** — spletna storitev za shranjevanje in različičenje kode (repozitorij = mapa s kodo in zgodovino sprememb).
- **Hosting (gostovanje)** — strežnik, kjer "živi" vaša spletna stran (v tem primeru Netlify).
- **HTTPS** — šifrirana povezava do vaše strani (ključavnica v brskalniku) — Netlify jo priskrbi samodejno in brezplačno.
- **RLS (Row Level Security)** — pravila v bazi, ki določajo, kdo lahko bere/piše posamezne podatke (npr. samo prijavljen administrator).
- **Repozitorij** — mapa s kodo vaše strani, shranjena na GitHubu.
- **Schema (schema.sql)** — datoteka, ki v bazi ustvari vse potrebne tabele.
- **Supabase** — storitev, ki gosti bazo podatkov, prijavo uporabnikov in shrambo datotek za vašo stran.
- **Tabela** — "predal" v bazi podatkov (npr. tabela `services` hrani vaše storitve).

---

## 19. Kontrolni seznam pred zagonom v živo

- [ ] Ustvarjen GitHub, Supabase in Netlify račun
- [ ] `js/supabase-config.js` vsebuje prave ključe
- [ ] `schema.sql` uspešno pognan (tabele vidne v Table Editorju)
- [ ] Storage bucket `portfolio` ustvarjen in javen, s tremi pravili
- [ ] Ustvarjen admin uporabnik in prijava v `/admin` deluje
- [ ] Stran objavljena na Netlify in dostopna na `netlify.app` naslovu
- [ ] Vsebina urejena: Hero, O meni, Storitve, Projekti, Nastavitve
- [ ] `zasebnost.html` dopolnjena z resničnimi podatki podjetja
- [ ] (Neobvezno) Lastna domena povezana in HTTPS deluje
- [ ] (Neobvezno) E-poštna obvestila, AI klepet ali Canva povezava nastavljeni

---

*Ta dokument je pripravljen kot gradivo za tečaj "Kako zgraditi predstavitveno spletno stran za svoj biznis". Za vprašanja med tečajem se obrnite na predavatelja.*
