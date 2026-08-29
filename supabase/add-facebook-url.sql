-- Zamenjava GitHub -> Facebook v socialnih povezavah.
-- Poženi enkrat v Supabase SQL editorju na obstoječi (živi) bazi.

-- Dodaj nov stolpec za Facebook (ohrani morebitno prejšnjo vrednost github_url kot izhodišče).
alter table settings add column if not exists facebook_url text default 'https://facebook.com';

-- Poskrbi, da nobstoječa vrstica ni NULL.
update settings set facebook_url = coalesce(facebook_url, 'https://facebook.com');

-- Neobvezno: odstrani star stolpec, ko potrdiš, da vse deluje.
-- alter table settings drop column if exists github_url;
