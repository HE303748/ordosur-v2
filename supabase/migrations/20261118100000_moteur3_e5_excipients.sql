-- Sprint MOTEUR-3, étape 5 — excipients à effet notoire (aspartam, amidon de blé, huile d'arachide, soja, lactose).
-- GÉNÉRÉ par bdpm/moteur3/scripts/gen_e5_excipients.py — ne pas modifier à la main.
-- Source : project/scripts/data/moteur3_e5_excipients.json (216 lignes, 172 fiches MA), chargée dans bdpm2d_staging lot 44.
-- Empreintes : staging b0581a9b725e2ff9adfb36b7578009b0 · table b221e4e27ccf5402de361c108d2c312b
--
-- Une ligne = une fiche MA × un excipient × une phrase EXACTE des rubriques 4.3 / 4.4 du RCP français de la MÊME spécialité
-- (même marque, même famille de forme, même dosage), excipient présent en rubrique 6.1, terrains du patient visés par la phrase.
-- Rubrique 4.3 → « absolue » (contre-indication) ; 4.4 → « a_evaluer ». Lu par le client (src/lib/excipientEngine.ts),
-- filtré par UUID des médicaments analysés. Par extension : « Intolérance au lactose » dans allergies_reference (décision D9).
-- Répartition : lactose 146, gluten 42, aspartam 16, soja 12 ·
--   a_evaluer 181, absolue 35.

create table public.medicament_excipients (
  id            bigint generated always as identity primary key,
  medicament_id uuid not null references public.medicaments(id),
  excipient     text not null check (excipient in ('aspartam', 'gluten', 'arachide', 'soja', 'lactose')),
  terrains      text[] not null check (cardinality(terrains) > 0
                  and terrains <@ array['phenylcetonurie', 'coeliaque', 'allergie_ble', 'allergie_arachide', 'allergie_soja', 'intolerance_lactose']),
  severite      text not null check (severite in ('absolue', 'a_evaluer')),
  rubrique      text not null check (rubrique in ('4.3', '4.4')),
  cis           text not null check (cis ~ '^[0-9]{8}$'),
  url           text not null check (url ~ '^https://'),
  date_rcp      date not null,
  citation      text not null check (length(trim(citation)) > 0),
  specialite_fr text not null,
  lien          text not null default 'meme_specialite' check (lien = 'meme_specialite'),
  sprint        text not null default 'MOTEUR-3',
  created_at    timestamptz not null default now()
);
create unique index medicament_excipients_unique on public.medicament_excipients (medicament_id, excipient, rubrique, md5(citation));
create index medicament_excipients_med on public.medicament_excipients (medicament_id);
alter table public.medicament_excipients enable row level security;
create policy medicament_excipients_read on public.medicament_excipients for select to authenticated using (true);
comment on table public.medicament_excipients is
  'MOTEUR-3 — excipient à effet notoire d''une fiche MA, lu dans le RCP français de la même spécialité (marque, forme, dosage) : phrase exacte de la rubrique 4.3 / 4.4, terrains du patient visés.';

do $$
declare n int; e text;
begin
  select count(*), md5(string_agg(t, chr(10) order by seq)) into n, e from bdpm2d_staging where lot = 44;
  if n <> 216 or e is distinct from 'b0581a9b725e2ff9adfb36b7578009b0' then raise exception 'MOTEUR-3 E5 : staging ≠ fichier source (%, %)', n, e; end if;

  insert into medicament_excipients (medicament_id, excipient, terrains, severite, rubrique, cis, url, date_rcp, citation, specialite_fr)
  select v.medicament_id, v.excipient, v.terrains, v.severite, v.rubrique, v.cis, v.url, v.date_rcp, v.citation, v.specialite_fr
  from bdpm2d_staging g cross join lateral jsonb_to_record(g.t::jsonb)
    as v(medicament_id uuid, excipient text, terrains text[], severite text, rubrique text, cis text, url text, date_rcp date, citation text, specialite_fr text)
  where g.lot = 44 order by g.seq;
  get diagnostics n = row_count;
  if n <> 216 then raise exception 'MOTEUR-3 E5 : % lignes écrites (attendu 216)', n; end if;
  if exists (select 1 from medicament_excipients x join medicaments m on m.id = x.medicament_id where m.pays <> 'MA' or m.masque) then
    raise exception 'MOTEUR-3 E5 : une ligne vise une fiche non marocaine ou masquée';
  end if;

  select md5(string_agg(medicament_id::text || '|' || excipient || '|' || array_to_string(array(select x from unnest(terrains) x order by x collate "C"), ',') || '|' || severite || '|'
           || rubrique || '|' || cis || '|' || url || '|' || date_rcp::text || '|' || md5(citation) || '|' || specialite_fr, '#'
           order by medicament_id::text collate "C", excipient collate "C", rubrique collate "C", md5(citation) collate "C")) into e from medicament_excipients;
  if e is distinct from 'b221e4e27ccf5402de361c108d2c312b' then raise exception 'MOTEUR-3 E5 : table ≠ source (%)', e; end if;

  if not exists (select 1 from allergies_reference where nom_fr = 'Intolérance au lactose') then
    insert into allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
    values ('Intolérance au lactose', 'Lactose intolerance', 'alimentaire', array['Lactose'],
            'Intolérance au lactose (déficit en lactase), au galactose ou malabsorption du glucose-galactose : excipient à effet notoire (rubrique 4.4 du RCP).');
  end if;
end $$;
