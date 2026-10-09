-- Sprint 5 — Demande d'examens (biologie, imagerie, explorations) en boucle fermée.
-- FICHIER GÉNÉRÉ par scripts/gen_examens.mjs — ne pas modifier à la main.
--
--   examens_reference       référentiel (lecture seule) — 109 examens
--   packs_examens           packs système (13) + packs personnels du médecin
--   demandes_examens        une demande = un patient, une échéance, un statut dérivé des lignes
--   demande_examen_lignes   un examen prescrit = un emplacement « en attente de résultat »
--
-- Jamais de suppression physique (aucune policy DELETE) : annulation = statut 'annule'.
-- RLS identique à traitements_chroniques : lecture par l'org (secrétaire comprise),
-- écriture réservée aux médecins de l'org, doctor_id = doctors.id.
-- Empreinte de la source : examens 86950639dc35155c0ae105b9fb06a114 · packs 8dbf768a7743051f2155c678699019f8

-- ═══ 1. Référentiel ═════════════════════════════════════════════════════════
create table if not exists public.examens_reference (
  code                 text primary key check (code = upper(code) and length(code) >= 2),
  libelle              text not null check (length(trim(libelle)) > 0),
  type                 text not null check (type in ('biologie','imagerie','exploration')),
  categorie            text not null,
  abreviations         text[] not null default '{}',
  synonymes            text[] not null default '{}',
  a_jeun               boolean not null default false,
  delai_jeun_h         smallint null check (delai_jeun_h between 1 and 24),
  irradiant            boolean not null default false,
  injection_possible   boolean not null default false,
  produit_contraste    text null check (produit_contraste in ('iode','gadolinium')),
  consentement_requis  boolean not null default false,
  precisions_suggerees text[] not null default '{}',
  question_exemple     text null,
  unite_defaut         text null,
  unites               jsonb not null default '[]'::jsonb,
  code_loinc           text null,
  ordre                integer not null default 0,
  actif                boolean not null default true,
  created_at           timestamptz not null default now()
);

alter table public.examens_reference enable row level security;
drop policy if exists examens_reference_read on public.examens_reference;
create policy examens_reference_read on public.examens_reference for select to authenticated using (true);
revoke insert, update, delete on public.examens_reference from anon, authenticated;

-- ═══ 2. Packs ═══════════════════════════════════════════════════════════════
create table if not exists public.packs_examens (
  id          uuid primary key default gen_random_uuid(),
  systeme     boolean not null default false,
  code        text null,
  org_id      uuid null references public.organizations(id),
  doctor_id   uuid null references public.doctors(id),
  nom         text not null check (length(trim(nom)) > 0 and length(nom) <= 80),
  mots_cles   text[] not null default '{}',
  -- [{ examen_code | null, libelle, type, precision? }]
  lignes      jsonb not null default '[]'::jsonb check (jsonb_typeof(lignes) = 'array'),
  archive     boolean not null default false,
  ordre       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint packs_examens_proprietaire check (
    (systeme and org_id is null and doctor_id is null and code is not null)
    or (not systeme and org_id is not null and doctor_id is not null)
  )
);
create unique index if not exists packs_examens_code_systeme_uidx on public.packs_examens (code) where systeme;
create index if not exists packs_examens_doctor_idx on public.packs_examens (doctor_id) where not systeme;

alter table public.packs_examens enable row level security;
drop policy if exists packs_examens_select on public.packs_examens;
create policy packs_examens_select on public.packs_examens
  for select to authenticated
  using (systeme or get_my_role() = 'super_admin' or org_id = get_my_org_id());

drop policy if exists packs_examens_insert on public.packs_examens;
create policy packs_examens_insert on public.packs_examens
  for insert to authenticated
  with check (
    not systeme
    and org_id = get_my_org_id()
    and coalesce(get_my_role(), '') <> 'secretaire'
    and doctor_id in (
      select d.id from public.doctors d
      where d.user_id = (select auth.uid()) and d.org_id = packs_examens.org_id
    )
  );

-- Renommer / archiver : uniquement SES packs personnels.
drop policy if exists packs_examens_update on public.packs_examens;
create policy packs_examens_update on public.packs_examens
  for update to authenticated
  using (
    not systeme
    and org_id = get_my_org_id()
    and coalesce(get_my_role(), '') <> 'secretaire'
    and doctor_id in (select d.id from public.doctors d where d.user_id = (select auth.uid()))
  )
  with check (
    not systeme
    and org_id = get_my_org_id()
    and doctor_id in (select d.id from public.doctors d where d.user_id = (select auth.uid()))
  );
-- Aucune policy DELETE : un pack personnel s'archive.

create or replace function public.packs_examens_guard_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.systeme <> old.systeme or new.doctor_id is distinct from old.doctor_id
     or new.org_id is distinct from old.org_id or new.code is distinct from old.code then
    raise exception 'packs_examens : propriétaire et nature du pack non modifiables';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists packs_examens_guard on public.packs_examens;
create trigger packs_examens_guard before update on public.packs_examens
  for each row execute function public.packs_examens_guard_update();

-- ═══ 3. Demandes ════════════════════════════════════════════════════════════
create table if not exists public.demandes_examens (
  id                        uuid primary key default gen_random_uuid(),
  numero                    text not null unique check (numero ~ '^DEM-[0-9]{8}-[A-Z0-9]{4}$'),
  patient_id                uuid not null references public.patients(id) on delete cascade,
  org_id                    uuid not null references public.organizations(id),
  doctor_id                 uuid not null references public.doctors(id),
  ordonnance_id             uuid null references public.ordonnances(id) on delete set null,
  date_demande              date not null default current_date,
  echeance_date             date not null,
  echeance_libelle          text not null default 'date_precise' check (echeance_libelle in
    ('avant_prochain_rdv','1_semaine','15_jours','1_mois','3_mois','6_mois','1_an','date_precise')),
  renseignements_cliniques  text null,
  urgent                    boolean not null default false,
  ald                       boolean not null default false,
  regrouper_imageries       boolean not null default false,
  packs_utilises            text[] not null default '{}',
  statut                    text not null default 'en_attente' check (statut in ('en_attente','partiel','realise','annule')),
  motif_annulation          text null,
  notes                     text null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint demandes_examens_echeance_coherente check (echeance_date >= date_demande)
);

create index if not exists demandes_examens_patient_idx on public.demandes_examens (patient_id, echeance_date);
create index if not exists demandes_examens_doctor_idx on public.demandes_examens (doctor_id, created_at desc);
create index if not exists demandes_examens_suivi_idx on public.demandes_examens (org_id, echeance_date)
  where statut in ('en_attente','partiel');
create index if not exists demandes_examens_ordonnance_idx on public.demandes_examens (ordonnance_id)
  where ordonnance_id is not null;

create table if not exists public.demande_examen_lignes (
  id                uuid primary key default gen_random_uuid(),
  demande_id        uuid not null references public.demandes_examens(id) on delete cascade,
  examen_code       text null references public.examens_reference(code) on update cascade,
  libelle           text not null check (length(trim(libelle)) > 0),
  type              text not null check (type in ('biologie','imagerie','exploration')),
  categorie         text null,
  precision         text null,
  question_clinique text null,
  a_jeun            boolean not null default false,
  delai_jeun_h      smallint null check (delai_jeun_h between 1 and 24),
  injection         boolean null,
  statut            text not null default 'en_attente' check (statut in ('en_attente','realise','annule')),
  date_realisation  date null,
  -- Emplacement « en attente de résultat » : renseigné au Sprint 6.
  resultat_id       uuid null,
  ordre             integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists demande_examen_lignes_demande_idx on public.demande_examen_lignes (demande_id, ordre);

alter table public.demandes_examens enable row level security;
alter table public.demande_examen_lignes enable row level security;

drop policy if exists demandes_examens_select on public.demandes_examens;
create policy demandes_examens_select on public.demandes_examens
  for select to authenticated
  using (get_my_role() = 'super_admin' or org_id = get_my_org_id());

drop policy if exists demandes_examens_insert on public.demandes_examens;
create policy demandes_examens_insert on public.demandes_examens
  for insert to authenticated
  with check (
    org_id = get_my_org_id()
    and coalesce(get_my_role(), '') <> 'secretaire'
    and doctor_id in (
      select d.id from public.doctors d
      where d.user_id = (select auth.uid()) and d.org_id = demandes_examens.org_id
    )
    and statut = 'en_attente'
  );

drop policy if exists demandes_examens_update on public.demandes_examens;
create policy demandes_examens_update on public.demandes_examens
  for update to authenticated
  using (
    org_id = get_my_org_id()
    and coalesce(get_my_role(), '') <> 'secretaire'
    and exists (
      select 1 from public.doctors d
      where d.user_id = (select auth.uid()) and d.org_id = demandes_examens.org_id
    )
  )
  with check (
    org_id = get_my_org_id()
    and coalesce(get_my_role(), '') <> 'secretaire'
    and exists (
      select 1 from public.doctors d
      where d.user_id = (select auth.uid()) and d.org_id = demandes_examens.org_id
    )
  );

drop policy if exists demande_examen_lignes_select on public.demande_examen_lignes;
create policy demande_examen_lignes_select on public.demande_examen_lignes
  for select to authenticated
  using (exists (
    select 1 from public.demandes_examens de
    where de.id = demande_examen_lignes.demande_id
      and (get_my_role() = 'super_admin' or de.org_id = get_my_org_id())
  ));

drop policy if exists demande_examen_lignes_insert on public.demande_examen_lignes;
create policy demande_examen_lignes_insert on public.demande_examen_lignes
  for insert to authenticated
  with check (
    coalesce(get_my_role(), '') <> 'secretaire'
    and statut = 'en_attente'
    and exists (
      select 1 from public.demandes_examens de
      join public.doctors d on d.id = de.doctor_id
      where de.id = demande_examen_lignes.demande_id
        and de.org_id = get_my_org_id()
        and d.user_id = (select auth.uid())
    )
  );

drop policy if exists demande_examen_lignes_update on public.demande_examen_lignes;
create policy demande_examen_lignes_update on public.demande_examen_lignes
  for update to authenticated
  using (
    coalesce(get_my_role(), '') <> 'secretaire'
    and exists (
      select 1 from public.demandes_examens de
      where de.id = demande_examen_lignes.demande_id
        and de.org_id = get_my_org_id()
        and exists (select 1 from public.doctors d where d.user_id = (select auth.uid()) and d.org_id = de.org_id)
    )
  )
  with check (
    coalesce(get_my_role(), '') <> 'secretaire'
    and exists (
      select 1 from public.demandes_examens de
      where de.id = demande_examen_lignes.demande_id and de.org_id = get_my_org_id()
    )
  );
-- Aucune policy DELETE sur les deux tables.

-- ── Garde-fous ──────────────────────────────────────────────────────────────
-- Demande : auteur, patient, org, numéro et date figés ; le statut est DÉRIVÉ des lignes
-- (jamais modifié directement) ; l'ordonnance ne se rattache qu'une fois.
create or replace function public.demandes_examens_guard_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.doctor_id <> old.doctor_id or new.patient_id <> old.patient_id or new.org_id <> old.org_id
     or new.numero <> old.numero or new.date_demande <> old.date_demande then
    raise exception 'demandes_examens : auteur, patient, organisation, numéro et date non modifiables';
  end if;
  if new.statut <> old.statut and pg_trigger_depth() < 2 then
    raise exception 'demandes_examens : le statut découle des examens de la demande';
  end if;
  if old.ordonnance_id is not null and new.ordonnance_id is distinct from old.ordonnance_id then
    raise exception 'demandes_examens : ordonnance déjà rattachée';
  end if;
  if new.echeance_date < new.date_demande then
    raise exception 'demandes_examens : échéance antérieure à la demande';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists demandes_examens_guard on public.demandes_examens;
create trigger demandes_examens_guard before update on public.demandes_examens
  for each row execute function public.demandes_examens_guard_update();

-- Ligne : rattachement et nature figés ; une ligne annulée ne revient jamais en attente ;
-- la date de réalisation suit le statut.
create or replace function public.demande_examen_lignes_guard_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.demande_id <> old.demande_id or new.libelle <> old.libelle or new.type <> old.type
     or new.examen_code is distinct from old.examen_code then
    raise exception 'demande_examen_lignes : examen et demande non modifiables';
  end if;
  if old.statut = 'annule' and new.statut <> 'annule' then
    raise exception 'demande_examen_lignes : un examen annulé ne peut pas être rétabli';
  end if;
  if new.statut = 'realise' then
    new.date_realisation := coalesce(new.date_realisation, current_date);
  else
    new.date_realisation := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists demande_examen_lignes_guard on public.demande_examen_lignes;
create trigger demande_examen_lignes_guard before update on public.demande_examen_lignes
  for each row execute function public.demande_examen_lignes_guard_update();

-- Statut de la demande, dérivé des lignes :
--   toutes annulées → annule ; aucune réalisée → en_attente ;
--   reste au moins une ligne en attente et au moins une réalisée → partiel ; sinon → realise.
create or replace function public.demande_examen_lignes_sync_statut()
returns trigger language plpgsql set search_path = public as $$
declare
  v_attente int; v_realise int; v_total int; v_statut text;
begin
  select count(*) filter (where statut = 'en_attente'),
         count(*) filter (where statut = 'realise'),
         count(*)
    into v_attente, v_realise, v_total
    from demande_examen_lignes where demande_id = new.demande_id;
  v_statut := case
    when v_total = 0 then 'en_attente'
    when v_attente = 0 and v_realise = 0 then 'annule'
    when v_realise = 0 then 'en_attente'
    when v_attente > 0 then 'partiel'
    else 'realise'
  end;
  update demandes_examens set statut = v_statut where id = new.demande_id and statut <> v_statut;
  return null;
end;
$$;
drop trigger if exists demande_examen_lignes_sync on public.demande_examen_lignes;
create trigger demande_examen_lignes_sync after insert or update of statut on public.demande_examen_lignes
  for each row execute function public.demande_examen_lignes_sync_statut();

-- ── Création atomique (demande + lignes dans la même transaction) ───────────
-- SECURITY INVOKER : la RLS s'applique à chaque INSERT. Une erreur annule tout.
create or replace function public.creer_demande_examens(p_demande jsonb, p_lignes jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
begin
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' or jsonb_array_length(p_lignes) = 0 then
    raise exception 'Demande d''examens vide : ajoutez au moins un examen';
  end if;
  if jsonb_array_length(p_lignes) > 80 then
    raise exception 'Demande d''examens trop longue (80 examens au maximum)';
  end if;

  insert into demandes_examens (
    numero, patient_id, org_id, doctor_id, ordonnance_id, date_demande, echeance_date,
    echeance_libelle, renseignements_cliniques, urgent, ald, regrouper_imageries, packs_utilises, notes
  ) values (
    p_demande->>'numero',
    (p_demande->>'patient_id')::uuid,
    (p_demande->>'org_id')::uuid,
    (p_demande->>'doctor_id')::uuid,
    nullif(p_demande->>'ordonnance_id', '')::uuid,
    coalesce(nullif(p_demande->>'date_demande', '')::date, current_date),
    (p_demande->>'echeance_date')::date,
    coalesce(nullif(p_demande->>'echeance_libelle', ''), 'date_precise'),
    nullif(trim(coalesce(p_demande->>'renseignements_cliniques', '')), ''),
    coalesce((p_demande->>'urgent')::boolean, false),
    coalesce((p_demande->>'ald')::boolean, false),
    coalesce((p_demande->>'regrouper_imageries')::boolean, false),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_demande->'packs_utilises', '[]'::jsonb)) x), '{}'),
    nullif(trim(coalesce(p_demande->>'notes', '')), '')
  ) returning id into v_id;

  insert into demande_examen_lignes (
    demande_id, examen_code, libelle, type, categorie, precision, question_clinique,
    a_jeun, delai_jeun_h, injection, ordre
  )
  select v_id,
         nullif(l->>'examen_code', ''),
         l->>'libelle',
         l->>'type',
         nullif(l->>'categorie', ''),
         nullif(trim(coalesce(l->>'precision', '')), ''),
         nullif(trim(coalesce(l->>'question_clinique', '')), ''),
         coalesce((l->>'a_jeun')::boolean, false),
         nullif(l->>'delai_jeun_h', '')::smallint,
         nullif(l->>'injection', '')::boolean,
         (ord - 1)::int
  from jsonb_array_elements(p_lignes) with ordinality as t(l, ord);

  return v_id;
end;
$$;

-- Annulation d'une demande : motif obligatoire, les examens encore en attente sont annulés
-- (les examens déjà réalisés restent réalisés). Le statut de la demande en découle.
create or replace function public.annuler_demande_examens(p_demande_id uuid, p_motif text)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if p_motif is null or length(trim(p_motif)) < 3 then
    raise exception 'Motif d''annulation obligatoire';
  end if;
  update demandes_examens set motif_annulation = trim(p_motif) where id = p_demande_id;
  if not found then
    raise exception 'Demande introuvable ou non modifiable';
  end if;
  update demande_examen_lignes set statut = 'annule'
    where demande_id = p_demande_id and statut = 'en_attente';
end;
$$;

revoke all on function public.creer_demande_examens(jsonb, jsonb) from public, anon;
revoke all on function public.annuler_demande_examens(uuid, text) from public, anon;
grant execute on function public.creer_demande_examens(jsonb, jsonb) to authenticated;
grant execute on function public.annuler_demande_examens(uuid, text) to authenticated;

-- ═══ 4. Données ═════════════════════════════════════════════════════════════
insert into public.examens_reference (code, libelle, type, categorie, abreviations, synonymes, a_jeun, delai_jeun_h, irradiant, injection_possible, produit_contraste, consentement_requis, precisions_suggerees, question_exemple, unite_defaut, unites, ordre) values
  ('NFS', 'NFS (hémogramme)', 'biologie', 'Hématologie', array['nfs','hb','hemogramme','fns','numeration']::text[], array['numération formule sanguine','hémoglobine','globules blancs','leucocytes','hématocrite','vgm']::text[], false, null, false, false, null, false, '{}'::text[], null, null, '[{"parametre":"hémoglobine","unite_defaut":"g/dL","unite":"g/L","facteur":10}]'::jsonb, 10),
  ('PLAQUETTES', 'Plaquettes', 'biologie', 'Hématologie', array['plq','plaquettes']::text[], array['numération plaquettaire','thrombocytes']::text[], false, null, false, false, null, false, '{}'::text[], null, 'G/L', '[]'::jsonb, 20),
  ('VS', 'Vitesse de sédimentation (VS)', 'biologie', 'Hématologie', array['vs']::text[], array['vitesse de sédimentation']::text[], false, null, false, false, null, false, '{}'::text[], null, 'mm/h', '[]'::jsonb, 30),
  ('RETICULOCYTES', 'Réticulocytes', 'biologie', 'Hématologie', array['retic','reticulocytes']::text[], '{}'::text[], false, null, false, false, null, false, '{}'::text[], null, 'G/L', '[]'::jsonb, 40),
  ('GROUPE_ABO_RH', 'Groupe sanguin ABO-Rhésus', 'biologie', 'Hématologie', array['groupe','gs','abo','groupage']::text[], array['groupe sanguin','rhésus','groupage sanguin']::text[], false, null, false, false, null, false, '{}'::text[], null, null, '[]'::jsonb, 50),
  ('RAI', 'RAI (recherche d''agglutinines irrégulières)', 'biologie', 'Hématologie', array['rai']::text[], array['agglutinines irrégulières']::text[], false, null, false, false, null, false, '{}'::text[], null, null, '[]'::jsonb, 60),
  ('TP_INR', 'TP / INR', 'biologie', 'Hémostase', array['tp','inr','tp inr']::text[], array['taux de prothrombine','temps de quick']::text[], false, null, false, false, null, false, '{}'::text[], null, null, '[]'::jsonb, 70),
  ('TCA', 'TCA', 'biologie', 'Hémostase', array['tca','tck']::text[], array['temps de céphaline activée']::text[], false, null, false, false, null, false, '{}'::text[], null, null, '[]'::jsonb, 80),
  ('FIBRINOGENE', 'Fibrinogène', 'biologie', 'Hémostase', array['fib','fibrinogene']::text[], '{}'::text[], false, null, false, false, null, false, '{}'::text[], null, 'g/L', '[]'::jsonb, 90),
  ('D_DIMERES', 'D-dimères', 'biologie', 'Hémostase', array['ddi','d dimeres','ddimeres']::text[], '{}'::text[], false, null, false, false, null, false, '{}'::text[], null, 'ng/mL', '[]'::jsonb, 100),
  ('GLYCEMIE_JEUN', 'Glycémie à jeun', 'biologie', 'Glycémie', array['gaj','gly','glycemie']::text[], array['glucose','sucre']::text[], true, 8, false, false, null, false, '{}'::text[], null, 'g/L', '[{"unite":"mmol/L","facteur":5.551},{"unite":"mg/dL","facteur":100}]'::jsonb, 110),
  ('GLYCEMIE_PP', 'Glycémie post-prandiale', 'biologie', 'Glycémie', array['gpp','gly pp','glycemie pp']::text[], array['glycémie 2 h après le repas']::text[], false, null, false, false, null, false, '{}'::text[], null, 'g/L', '[{"unite":"mmol/L","facteur":5.551},{"unite":"mg/dL","facteur":100}]'::jsonb, 120),
  ('HBA1C', 'HbA1c (hémoglobine glyquée)', 'biologie', 'Glycémie', array['hba1c','hb a1c','hb','a1c','glyquee']::text[], array['hémoglobine glyquée','hémoglobine glycosylée','hémoglobine glyquee']::text[], false, null, false, false, null, false, '{}'::text[], null, '%', '[{"unite":"mmol/mol","formule":"ifcc","a":10.929,"b":-2.15}]'::jsonb, 130),
  ('HGPO', 'HGPO 75 g (hyperglycémie provoquée par voie orale)', 'biologie', 'Glycémie', array['hgpo']::text[], array['hyperglycémie provoquée','test o''sullivan']::text[], true, 8, false, false, null, false, '{}'::text[], null, 'g/L', '[{"unite":"mmol/L","facteur":5.551},{"unite":"mg/dL","facteur":100}]'::jsonb, 140),
  ('UREE', 'Urée', 'biologie', 'Bilan rénal', array['uree']::text[], array['urée sanguine','azotémie']::text[], false, null, false, false, null, false, '{}'::text[], null, 'g/L', '[{"unite":"mmol/L","facteur":16.65}]'::jsonb, 150),
  ('CREATININE', 'Créatinine', 'biologie', 'Bilan rénal', array['creat','creatinine']::text[], array['créatininémie','fonction rénale']::text[], false, null, false, false, null, false, '{}'::text[], null, 'mg/L', '[{"unite":"µmol/L","facteur":8.84},{"unite":"mg/dL","diviseur":10}]'::jsonb, 160),
  ('DFG', 'DFG estimé (CKD-EPI)', 'biologie', 'Bilan rénal', array['dfg','clairance','ckd','mdrd']::text[], array['débit de filtration glomérulaire','clairance de la créatinine']::text[], false, null, false, false, null, false, '{}'::text[], null, 'mL/min/1,73 m²', '[]'::jsonb, 170),
  ('IONOGRAMME', 'Ionogramme sanguin (Na, K, Cl)', 'biologie', 'Bilan rénal', array['iono','ionogramme','nak','na k','kaliemie','natremie']::text[], array['sodium','potassium','chlore','kaliémie','natrémie']::text[], false, null, false, false, null, false, '{}'::text[], null, 'mmol/L', '[]'::jsonb, 180),
  ('PROTEINURIE_24H', 'Protéinurie des 24 heures', 'biologie', 'Bilan rénal', array['pu 24','proteinurie','pu24']::text[], array['protéines urinaires']::text[], false, null, false, false, null, false, array['Recueil des urines de 24 h']::text[], null, 'g/24 h', '[]'::jsonb, 190),
  ('ALBU_CREAT_U', 'Rapport albuminurie / créatininurie', 'biologie', 'Bilan rénal', array['rac','microalb','microalbuminurie','albuminurie']::text[], array['micro-albuminurie','rapport albumine créatinine urinaire']::text[], false, null, false, false, null, false, array['Sur échantillon d''urines du matin']::text[], null, 'mg/g', '[]'::jsonb, 200),
  ('ECBU', 'ECBU', 'biologie', 'Bilan rénal', array['ecbu']::text[], array['examen cytobactériologique des urines','analyse d''urines','infection urinaire']::text[], false, null, false, false, null, false, array['Avec antibiogramme']::text[], null, null, '[]'::jsonb, 210),
  ('ASAT', 'ASAT (TGO)', 'biologie', 'Bilan hépatique', array['asat','tgo','sgot','transaminases']::text[], array['aspartate aminotransférase']::text[], false, null, false, false, null, false, '{}'::text[], null, 'UI/L', '[]'::jsonb, 220),
  ('ALAT', 'ALAT (TGP)', 'biologie', 'Bilan hépatique', array['alat','tgp','sgpt','transaminases']::text[], array['alanine aminotransférase']::text[], false, null, false, false, null, false, '{}'::text[], null, 'UI/L', '[]'::jsonb, 230),
  ('GGT', 'Gamma-GT (GGT)', 'biologie', 'Bilan hépatique', array['ggt','gamma gt']::text[], array['gamma glutamyl transférase']::text[], false, null, false, false, null, false, '{}'::text[], null, 'UI/L', '[]'::jsonb, 240),
  ('PAL', 'Phosphatases alcalines (PAL)', 'biologie', 'Bilan hépatique', array['pal']::text[], array['phosphatases alcalines']::text[], false, null, false, false, null, false, '{}'::text[], null, 'UI/L', '[]'::jsonb, 250),
  ('BILIRUBINE', 'Bilirubine totale et conjuguée', 'biologie', 'Bilan hépatique', array['bili','bilirubine','bt','bc']::text[], array['bilirubine directe','bilirubine libre']::text[], false, null, false, false, null, false, '{}'::text[], null, 'mg/L', '[{"unite":"µmol/L","facteur":1.71}]'::jsonb, 260),
  ('ALBUMINE', 'Albumine', 'biologie', 'Bilan hépatique', array['alb','albumine','albuminemie']::text[], array['albuminémie']::text[], false, null, false, false, null, false, '{}'::text[], null, 'g/L', '[]'::jsonb, 270),
  ('EPP', 'Électrophorèse des protéines sériques', 'biologie', 'Bilan hépatique', array['epp','eps','electrophorese']::text[], array['protidogramme','protides totaux']::text[], false, null, false, false, null, false, '{}'::text[], null, null, '[]'::jsonb, 280),
  ('CHOLESTEROL_TOTAL', 'Cholestérol total', 'biologie', 'Bilan lipidique', array['ct','chol','cholesterol']::text[], '{}'::text[], true, 12, false, false, null, false, '{}'::text[], null, 'g/L', '[{"unite":"mmol/L","facteur":2.586}]'::jsonb, 290),
  ('HDL', 'HDL-cholestérol', 'biologie', 'Bilan lipidique', array['hdl']::text[], array['bon cholestérol']::text[], true, 12, false, false, null, false, '{}'::text[], null, 'g/L', '[{"unite":"mmol/L","facteur":2.586}]'::jsonb, 300),
  ('LDL', 'LDL-cholestérol', 'biologie', 'Bilan lipidique', array['ldl']::text[], array['mauvais cholestérol']::text[], true, 12, false, false, null, false, '{}'::text[], null, 'g/L', '[{"unite":"mmol/L","facteur":2.586}]'::jsonb, 310),
  ('TRIGLYCERIDES', 'Triglycérides', 'biologie', 'Bilan lipidique', array['tg','trigly','triglycerides']::text[], '{}'::text[], true, 12, false, false, null, false, '{}'::text[], null, 'g/L', '[{"unite":"mmol/L","facteur":1.129}]'::jsonb, 320),
  ('CRP', 'CRP', 'biologie', 'Inflammation', array['crp']::text[], array['protéine c réactive']::text[], false, null, false, false, null, false, '{}'::text[], null, 'mg/L', '[]'::jsonb, 330),
  ('PROCALCITONINE', 'Procalcitonine', 'biologie', 'Inflammation', array['pct','procalcitonine']::text[], '{}'::text[], false, null, false, false, null, false, '{}'::text[], null, 'ng/mL', '[]'::jsonb, 340),
  ('FERRITINE', 'Ferritine', 'biologie', 'Bilan martial', array['ferritine','ferr']::text[], array['ferritinémie','réserves en fer']::text[], false, null, false, false, null, false, '{}'::text[], null, 'ng/mL', '[]'::jsonb, 350),
  ('FER_SERIQUE', 'Fer sérique', 'biologie', 'Bilan martial', array['fer','fer serique']::text[], array['sidérémie']::text[], true, 8, false, false, null, false, '{}'::text[], null, 'µg/dL', '[]'::jsonb, 360),
  ('CST', 'Coefficient de saturation de la transferrine (CST)', 'biologie', 'Bilan martial', array['cst','transferrine']::text[], array['saturation de la transferrine','capacité totale de fixation']::text[], true, 8, false, false, null, false, '{}'::text[], null, '%', '[]'::jsonb, 370),
  ('TSH', 'TSH ultrasensible', 'biologie', 'Thyroïde', array['tsh','tshus']::text[], array['thyréostimuline','thyroïde']::text[], false, null, false, false, null, false, '{}'::text[], null, 'mUI/L', '[]'::jsonb, 380),
  ('T4L', 'T4 libre', 'biologie', 'Thyroïde', array['t4','t4l','ft4']::text[], array['thyroxine libre']::text[], false, null, false, false, null, false, '{}'::text[], null, 'pmol/L', '[]'::jsonb, 390),
  ('T3L', 'T3 libre', 'biologie', 'Thyroïde', array['t3','t3l','ft3']::text[], array['triiodothyronine libre']::text[], false, null, false, false, null, false, '{}'::text[], null, 'pmol/L', '[]'::jsonb, 400),
  ('LIPASE', 'Lipase', 'biologie', 'Pancréas', array['lipase','lipasemie']::text[], array['lipasémie']::text[], false, null, false, false, null, false, '{}'::text[], null, 'UI/L', '[]'::jsonb, 410),
  ('AMYLASE', 'Amylase', 'biologie', 'Pancréas', array['amylase','amylasemie']::text[], array['amylasémie']::text[], false, null, false, false, null, false, '{}'::text[], null, 'UI/L', '[]'::jsonb, 420),
  ('VITAMINE_D', 'Vitamine D (25-OH)', 'biologie', 'Vitamines et minéraux', array['vit d','vitd','25oh','vitamine d']::text[], array['25 hydroxy vitamine d','calcidiol']::text[], false, null, false, false, null, false, '{}'::text[], null, 'ng/mL', '[]'::jsonb, 430),
  ('VITAMINE_B12', 'Vitamine B12', 'biologie', 'Vitamines et minéraux', array['b12','vit b12','vitamine b12']::text[], array['cobalamine']::text[], false, null, false, false, null, false, '{}'::text[], null, 'pg/mL', '[]'::jsonb, 440),
  ('FOLATES', 'Folates (vitamine B9)', 'biologie', 'Vitamines et minéraux', array['b9','folates','vit b9']::text[], array['acide folique']::text[], false, null, false, false, null, false, '{}'::text[], null, 'ng/mL', '[]'::jsonb, 450),
  ('CALCIUM', 'Calcium', 'biologie', 'Vitamines et minéraux', array['ca','calcemie','calcium']::text[], array['calcémie']::text[], false, null, false, false, null, false, '{}'::text[], null, 'mg/L', '[{"unite":"mmol/L","diviseur":40.08}]'::jsonb, 460),
  ('PHOSPHORE', 'Phosphore', 'biologie', 'Vitamines et minéraux', array['phos','phosphore','phosphoremie']::text[], array['phosphorémie','phosphates']::text[], false, null, false, false, null, false, '{}'::text[], null, 'mg/L', '[]'::jsonb, 470),
  ('MAGNESIUM', 'Magnésium', 'biologie', 'Vitamines et minéraux', array['mg','magnesium','magnesemie']::text[], array['magnésémie']::text[], false, null, false, false, null, false, '{}'::text[], null, 'mg/L', '[]'::jsonb, 480),
  ('ACIDE_URIQUE', 'Acide urique', 'biologie', 'Vitamines et minéraux', array['au','uricemie','acide urique']::text[], array['uricémie','goutte']::text[], false, null, false, false, null, false, '{}'::text[], null, 'mg/L', '[{"unite":"µmol/L","facteur":5.95}]'::jsonb, 490),
  ('CPK', 'CPK', 'biologie', 'Vitamines et minéraux', array['cpk','ck']::text[], array['créatine phosphokinase','créatine kinase']::text[], false, null, false, false, null, false, '{}'::text[], null, 'UI/L', '[]'::jsonb, 500),
  ('BETA_HCG', 'Bêta-hCG plasmatique', 'biologie', 'Hormonologie', array['bhcg','hcg','beta hcg','b hcg']::text[], array['test de grossesse sanguin','grossesse']::text[], false, null, false, false, null, false, '{}'::text[], null, 'mUI/mL', '[]'::jsonb, 510),
  ('PSA', 'PSA total et libre', 'biologie', 'Hormonologie', array['psa']::text[], array['antigène prostatique spécifique','prostate']::text[], false, null, false, false, null, false, '{}'::text[], null, 'ng/mL', '[]'::jsonb, 520),
  ('AG_HBS', 'Antigène HBs', 'biologie', 'Sérologies', array['aghbs','ag hbs','hbs','hepatite b','vhb']::text[], array['hépatite b']::text[], false, null, false, false, null, false, '{}'::text[], null, null, '[]'::jsonb, 530),
  ('AC_ANTI_HBS', 'Anticorps anti-HBs', 'biologie', 'Sérologies', array['ac hbs','anti hbs','achbs','hepatite b','vhb']::text[], array['hépatite b','immunité vaccinale']::text[], false, null, false, false, null, false, '{}'::text[], null, null, '[]'::jsonb, 540),
  ('AC_ANTI_HBC', 'Anticorps anti-HBc', 'biologie', 'Sérologies', array['ac hbc','anti hbc','achbc','hepatite b','vhb']::text[], array['hépatite b']::text[], false, null, false, false, null, false, '{}'::text[], null, null, '[]'::jsonb, 550),
  ('CHARGE_VIRALE_VHB', 'Charge virale VHB (ADN VHB)', 'biologie', 'Sérologies', array['adn vhb','cv vhb','pcr vhb','vhb']::text[], array['hépatite b','adn viral b']::text[], false, null, false, false, null, false, '{}'::text[], null, 'UI/mL', '[]'::jsonb, 560),
  ('AC_ANTI_VHC', 'Anticorps anti-VHC', 'biologie', 'Sérologies', array['ac vhc','anti vhc','vhc','hcv','hepatite c']::text[], array['hépatite c','sérologie hépatite c']::text[], false, null, false, false, null, false, '{}'::text[], null, null, '[]'::jsonb, 570),
  ('ARN_VHC', 'ARN VHC (charge virale)', 'biologie', 'Sérologies', array['arn vhc','cv vhc','pcr vhc','vhc']::text[], array['hépatite c','arn viral c']::text[], false, null, false, false, null, false, '{}'::text[], null, 'UI/mL', '[]'::jsonb, 580),
  ('VIH', 'Sérologie VIH 1 et 2', 'biologie', 'Sérologies', array['vih','hiv','sida']::text[], array['sérologie hiv']::text[], false, null, false, false, null, true, '{}'::text[], null, null, '[]'::jsonb, 590),
  ('SYPHILIS', 'Sérologie syphilis (TPHA-VDRL)', 'biologie', 'Sérologies', array['tpha','vdrl','syphilis','bw']::text[], array['tréponème']::text[], false, null, false, false, null, false, '{}'::text[], null, null, '[]'::jsonb, 600)
on conflict (code) do update set
  libelle = excluded.libelle, type = excluded.type, categorie = excluded.categorie,
  abreviations = excluded.abreviations, synonymes = excluded.synonymes, a_jeun = excluded.a_jeun,
  delai_jeun_h = excluded.delai_jeun_h, irradiant = excluded.irradiant,
  injection_possible = excluded.injection_possible, produit_contraste = excluded.produit_contraste,
  consentement_requis = excluded.consentement_requis, precisions_suggerees = excluded.precisions_suggerees,
  question_exemple = excluded.question_exemple, unite_defaut = excluded.unite_defaut,
  unites = excluded.unites, ordre = excluded.ordre;

insert into public.examens_reference (code, libelle, type, categorie, abreviations, synonymes, a_jeun, delai_jeun_h, irradiant, injection_possible, produit_contraste, consentement_requis, precisions_suggerees, question_exemple, unite_defaut, unites, ordre) values
  ('TOXOPLASMOSE', 'Sérologie toxoplasmose (IgG, IgM)', 'biologie', 'Sérologies', array['toxo','toxoplasmose']::text[], '{}'::text[], false, null, false, false, null, false, '{}'::text[], null, null, '[]'::jsonb, 610),
  ('RUBEOLE', 'Sérologie rubéole (IgG)', 'biologie', 'Sérologies', array['rubeole','rub']::text[], '{}'::text[], false, null, false, false, null, false, '{}'::text[], null, null, '[]'::jsonb, 620),
  ('AFP', 'Alpha-fœtoprotéine (AFP)', 'biologie', 'Marqueurs tumoraux', array['afp','alpha foeto']::text[], array['alpha foetoprotéine','alphafoetoprotéine']::text[], false, null, false, false, null, false, '{}'::text[], null, 'ng/mL', '[]'::jsonb, 630),
  ('ACE', 'ACE', 'biologie', 'Marqueurs tumoraux', array['ace']::text[], array['antigène carcino-embryonnaire']::text[], false, null, false, false, null, false, '{}'::text[], null, 'ng/mL', '[]'::jsonb, 640),
  ('CA_19_9', 'CA 19-9', 'biologie', 'Marqueurs tumoraux', array['ca199','ca 19 9','ca19']::text[], '{}'::text[], false, null, false, false, null, false, '{}'::text[], null, 'U/mL', '[]'::jsonb, 650),
  ('CA_125', 'CA 125', 'biologie', 'Marqueurs tumoraux', array['ca125','ca 125']::text[], '{}'::text[], false, null, false, false, null, false, '{}'::text[], null, 'U/mL', '[]'::jsonb, 660),
  ('CA_15_3', 'CA 15-3', 'biologie', 'Marqueurs tumoraux', array['ca153','ca 15 3','ca15']::text[], '{}'::text[], false, null, false, false, null, false, '{}'::text[], null, 'U/mL', '[]'::jsonb, 670),
  ('CALPROTECTINE', 'Calprotectine fécale', 'biologie', 'Examens digestifs', array['calpro','calprotectine']::text[], array['mici','inflammation intestinale']::text[], false, null, false, false, null, false, '{}'::text[], null, 'µg/g', '[]'::jsonb, 680),
  ('HP_TEST_RESPIRATOIRE', 'Helicobacter pylori — test respiratoire à l''urée marquée', 'biologie', 'Examens digestifs', array['pyl','h pylori','hp','tru','helicobacter']::text[], array['breath test','test à l''urée']::text[], true, 6, false, false, null, false, array['Arrêt des IPP depuis 2 semaines','Arrêt des antibiotiques depuis 4 semaines']::text[], null, null, '[]'::jsonb, 690),
  ('HP_SEROLOGIE', 'Helicobacter pylori — sérologie', 'biologie', 'Examens digestifs', array['pyl','h pylori','hp','helicobacter']::text[], '{}'::text[], false, null, false, false, null, false, '{}'::text[], null, null, '[]'::jsonb, 700),
  ('HP_ANTIGENE_FECAL', 'Helicobacter pylori — antigène fécal', 'biologie', 'Examens digestifs', array['pyl','h pylori','hp','helicobacter']::text[], array['antigène dans les selles']::text[], false, null, false, false, null, false, '{}'::text[], null, null, '[]'::jsonb, 710),
  ('COPROCULTURE', 'Coproculture', 'biologie', 'Examens digestifs', array['copro','coproculture']::text[], array['culture des selles','diarrhée']::text[], false, null, false, false, null, false, '{}'::text[], null, null, '[]'::jsonb, 720),
  ('EPS', 'Examen parasitologique des selles', 'biologie', 'Examens digestifs', array['kop','parasito','eps selles','kaop']::text[], array['parasitologie des selles','kystes œufs parasites']::text[], false, null, false, false, null, false, array['3 prélèvements à quelques jours d''intervalle']::text[], null, null, '[]'::jsonb, 730),
  ('SANG_OCCULTE', 'Recherche de sang occulte dans les selles', 'biologie', 'Examens digestifs', array['hemoccult','fit','sang occulte','rso']::text[], array['test immunologique fécal','dépistage colorectal']::text[], false, null, false, false, null, false, '{}'::text[], null, null, '[]'::jsonb, 740),
  ('ECHO_ABDOMINALE', 'Échographie abdominale', 'imagerie', 'Échographie', array['echo','echographie','us']::text[], '{}'::text[], true, 6, false, false, null, false, '{}'::text[], 'Recherche de lithiase vésiculaire ?', null, '[]'::jsonb, 750),
  ('ECHO_ABDOMINO_PELVIENNE', 'Échographie abdomino-pelvienne', 'imagerie', 'Échographie', array['echo','echographie','us']::text[], '{}'::text[], true, 6, false, false, null, false, array['Vessie pleine']::text[], 'Recherche d''une cause à des douleurs abdominales ?', null, '[]'::jsonb, 760),
  ('ECHO_HEPATIQUE_DOPPLER', 'Échographie hépatique avec doppler', 'imagerie', 'Échographie', array['echo','echographie','us','doppler']::text[], array['écho-doppler hépatique','foie','tronc porte']::text[], true, 6, false, false, null, false, '{}'::text[], 'Signes d''hypertension portale ? Nodule hépatique ?', null, '[]'::jsonb, 770),
  ('ECHO_RENALE_VESICALE', 'Échographie rénale et vésicale', 'imagerie', 'Échographie', array['echo','echographie','us']::text[], array['arbre urinaire','reins','vessie','prostate']::text[], false, null, false, false, null, false, array['Vessie pleine','Avec mesure du résidu post-mictionnel']::text[], 'Dilatation des cavités ? Lithiase ?', null, '[]'::jsonb, 780),
  ('ECHO_THYROIDIENNE', 'Échographie thyroïdienne', 'imagerie', 'Échographie', array['echo','echographie','us']::text[], array['cervicale','thyroïde']::text[], false, null, false, false, null, false, '{}'::text[], 'Nodule thyroïdien : classification EU-TIRADS ?', null, '[]'::jsonb, 790),
  ('ECHO_PELVIENNE', 'Échographie pelvienne', 'imagerie', 'Échographie', array['echo','echographie','us']::text[], array['utérus','ovaires']::text[], false, null, false, false, null, false, array['Voie sus-pubienne','Voie endovaginale','Vessie pleine']::text[], 'Recherche d''une pathologie utéro-annexielle ?', null, '[]'::jsonb, 800),
  ('ECHO_OBSTETRICALE', 'Échographie obstétricale', 'imagerie', 'Échographie', array['echo','echographie','us']::text[], array['grossesse','datation','morphologique']::text[], false, null, false, false, null, false, array['1er trimestre (datation)','2e trimestre (morphologie)','3e trimestre (croissance)']::text[], 'Datation et vitalité ?', null, '[]'::jsonb, 810),
  ('ECHO_MAMMAIRE', 'Échographie mammaire', 'imagerie', 'Échographie', array['echo','echographie','us']::text[], array['sein']::text[], false, null, false, false, null, false, array['Bilatérale','Sein droit','Sein gauche']::text[], 'Caractérisation d''un nodule ?', null, '[]'::jsonb, 820),
  ('ECHO_PARTIES_MOLLES', 'Échographie des parties molles', 'imagerie', 'Échographie', array['echo','echographie','us']::text[], array['tuméfaction','paroi']::text[], false, null, false, false, null, false, array['Localisation à préciser']::text[], 'Nature d''une tuméfaction ?', null, '[]'::jsonb, 830),
  ('RX_THORAX', 'Radiographie thoracique (face)', 'imagerie', 'Radiographie', array['rx','radio','radiographie','rp','thorax']::text[], array['radio pulmonaire','radiographie pulmonaire','poumons']::text[], false, null, true, false, null, false, array['Face','Face et profil']::text[], 'Foyer infectieux ? Épanchement ?', null, '[]'::jsonb, 840),
  ('RX_ASP', 'ASP (abdomen sans préparation)', 'imagerie', 'Radiographie', array['rx','radio','radiographie','asp']::text[], array['abdomen sans préparation']::text[], false, null, true, false, null, false, '{}'::text[], 'Niveaux hydro-aériques ? Pneumopéritoine ?', null, '[]'::jsonb, 850),
  ('RX_RACHIS', 'Radiographie du rachis', 'imagerie', 'Radiographie', array['rx','radio','radiographie','rachis']::text[], array['colonne vertébrale','lombaire','cervical','dorsal']::text[], false, null, true, false, null, false, array['Cervical','Dorsal','Lombaire','Face et profil']::text[], 'Lésion osseuse ? Trouble de la statique ?', null, '[]'::jsonb, 860),
  ('RX_MEMBRES', 'Radiographie d''un membre', 'imagerie', 'Radiographie', array['rx','radio','radiographie','membre']::text[], array['os','articulation','genou','épaule','main','pied','cheville','hanche','bassin','poignet']::text[], false, null, true, false, null, false, array['Côté droit','Côté gauche','Face et profil','Segment à préciser']::text[], 'Fracture ? Arthrose ?', null, '[]'::jsonb, 870),
  ('TDM_CEREBRALE', 'TDM cérébrale', 'imagerie', 'TDM (scanner)', array['tdm','scanner','scan','ct']::text[], array['scanner cérébral','crâne']::text[], false, null, true, true, 'iode', false, '{}'::text[], 'Lésion ischémique ou hémorragique ?', null, '[]'::jsonb, 880),
  ('TDM_THORACIQUE', 'TDM thoracique', 'imagerie', 'TDM (scanner)', array['tdm','scanner','scan','ct']::text[], array['scanner thoracique','angioscanner']::text[], false, null, true, true, 'iode', false, '{}'::text[], 'Embolie pulmonaire ? Nodule ?', null, '[]'::jsonb, 890),
  ('TDM_ABDOMINO_PELVIENNE', 'TDM abdomino-pelvienne', 'imagerie', 'TDM (scanner)', array['tdm','scanner','scan','ct','tap']::text[], array['scanner abdominal','scanner abdomino-pelvien','uroscanner']::text[], false, null, true, true, 'iode', false, '{}'::text[], 'Bilan d''extension ? Caractérisation d''une lésion ?', null, '[]'::jsonb, 900),
  ('IRM_CEREBRALE', 'IRM cérébrale', 'imagerie', 'IRM', array['irm','mri']::text[], '{}'::text[], false, null, false, true, 'gadolinium', false, '{}'::text[], 'Lésion démyélinisante ? Processus expansif ?', null, '[]'::jsonb, 910),
  ('IRM_HEPATIQUE', 'IRM hépatique', 'imagerie', 'IRM', array['irm','mri']::text[], array['foie']::text[], true, 4, false, true, 'gadolinium', false, '{}'::text[], 'Caractérisation d''un nodule hépatique ?', null, '[]'::jsonb, 920),
  ('BILI_IRM', 'Bili-IRM (cholangio-IRM)', 'imagerie', 'IRM', array['irm','mri','bili irm','cholangio']::text[], array['cholangio-irm','cprm','voies biliaires']::text[], true, 6, false, false, null, false, '{}'::text[], 'Obstacle sur la voie biliaire principale ?', null, '[]'::jsonb, 930),
  ('ENTERO_IRM', 'Entéro-IRM', 'imagerie', 'IRM', array['irm','mri','entero irm']::text[], array['grêle','crohn']::text[], true, 6, false, true, 'gadolinium', false, '{}'::text[], 'Activité et étendue d''une maladie de Crohn ?', null, '[]'::jsonb, 940),
  ('IRM_RACHIS', 'IRM du rachis', 'imagerie', 'IRM', array['irm','mri','rachis']::text[], array['hernie discale','médullaire','lombaire','cervical']::text[], false, null, false, true, 'gadolinium', false, array['Cervical','Dorsal','Lombaire']::text[], 'Conflit disco-radiculaire ?', null, '[]'::jsonb, 950),
  ('MAMMOGRAPHIE', 'Mammographie', 'imagerie', 'Autres imageries', array['mammo','mammographie']::text[], array['sein','dépistage']::text[], false, null, true, false, null, false, array['Bilatérale','Avec échographie complémentaire']::text[], 'Dépistage ? Caractérisation d''une anomalie ?', null, '[]'::jsonb, 960),
  ('OSTEODENSITOMETRIE', 'Ostéodensitométrie (DMO)', 'imagerie', 'Autres imageries', array['dmo','osteo','dexa','osteodensitometrie']::text[], array['densité minérale osseuse','ostéoporose']::text[], false, null, true, false, null, false, '{}'::text[], 'Ostéoporose ?', null, '[]'::jsonb, 970),
  ('FIBROSCAN', 'Fibroscan (élastométrie hépatique)', 'imagerie', 'Autres imageries', array['fibroscan','elasto','elastometrie']::text[], array['élastographie','fibrose hépatique']::text[], true, 3, false, false, null, false, '{}'::text[], 'Évaluation de la fibrose hépatique ?', null, '[]'::jsonb, 980),
  ('ECG', 'ECG', 'exploration', 'Cardiologie', array['ecg']::text[], array['électrocardiogramme']::text[], false, null, false, false, null, false, '{}'::text[], 'Trouble du rythme ou de la conduction ?', null, '[]'::jsonb, 990),
  ('ECHOCARDIOGRAPHIE', 'Échocardiographie transthoracique', 'exploration', 'Cardiologie', array['ett','echo coeur','echocardio','echo']::text[], array['échographie cardiaque','écho-doppler cardiaque']::text[], false, null, false, false, null, false, '{}'::text[], 'Fonction ventriculaire gauche ? Valvulopathie ?', null, '[]'::jsonb, 1000),
  ('HOLTER_ECG', 'Holter ECG des 24 heures', 'exploration', 'Cardiologie', array['holter','holter ecg']::text[], array['holter rythmique']::text[], false, null, false, false, null, false, '{}'::text[], 'Trouble du rythme paroxystique ?', null, '[]'::jsonb, 1010),
  ('MAPA', 'MAPA (mesure ambulatoire de la pression artérielle)', 'exploration', 'Cardiologie', array['mapa','holter tensionnel']::text[], array['holter tensionnel']::text[], false, null, false, false, null, false, '{}'::text[], 'Confirmation d''une HTA ? Contrôle tensionnel ?', null, '[]'::jsonb, 1020),
  ('EPREUVE_EFFORT', 'Épreuve d''effort', 'exploration', 'Cardiologie', array['ee','epreuve effort','test effort']::text[], array['test d''effort']::text[], false, null, false, false, null, false, '{}'::text[], 'Ischémie myocardique d''effort ?', null, '[]'::jsonb, 1030),
  ('FOGD', 'FOGD (fibroscopie œso-gastro-duodénale)', 'exploration', 'Endoscopie digestive', array['fogd','gastroscopie','fibro','endoscopie haute','fibroscopie']::text[], array['endoscopie digestive haute','fibroscopie gastrique']::text[], true, 6, false, false, null, false, array['Avec biopsies','Sous sédation']::text[], 'Recherche d''une lésion ulcéreuse ? Helicobacter pylori ?', null, '[]'::jsonb, 1040),
  ('COLOSCOPIE', 'Coloscopie totale', 'exploration', 'Endoscopie digestive', array['colo','coloscopie']::text[], array['endoscopie digestive basse']::text[], true, 6, false, false, null, false, array['Après préparation colique','Sous sédation','Avec biopsies']::text[], 'Dépistage ? Bilan de rectorragies ?', null, '[]'::jsonb, 1050),
  ('RECTOSIGMOIDOSCOPIE', 'Rectosigmoïdoscopie', 'exploration', 'Endoscopie digestive', array['rss','recto','rectosigmoidoscopie']::text[], '{}'::text[], false, null, false, false, null, false, array['Après lavement évacuateur']::text[], 'Bilan de rectorragies ?', null, '[]'::jsonb, 1060),
  ('ECHO_ENDOSCOPIE', 'Écho-endoscopie', 'exploration', 'Endoscopie digestive', array['ee digestive','echoendoscopie','echo endoscopie','echo']::text[], '{}'::text[], true, 6, false, false, null, false, array['Haute (bilio-pancréatique)','Basse (rectale)','Sous sédation']::text[], 'Lithiase de la voie biliaire ? Lésion pancréatique ?', null, '[]'::jsonb, 1070),
  ('EFR', 'EFR (exploration fonctionnelle respiratoire)', 'exploration', 'Pneumologie', array['efr','spiro','spirometrie']::text[], array['spirométrie','souffle']::text[], false, null, false, false, null, false, array['Avec test de réversibilité']::text[], 'Trouble ventilatoire obstructif ?', null, '[]'::jsonb, 1080),
  ('FCV', 'Frottis cervico-vaginal', 'exploration', 'Gynécologie', array['fcv','frottis']::text[], array['frottis du col','dépistage col utérin','test hpv']::text[], false, null, false, false, null, false, '{}'::text[], 'Dépistage ?', null, '[]'::jsonb, 1090)
on conflict (code) do update set
  libelle = excluded.libelle, type = excluded.type, categorie = excluded.categorie,
  abreviations = excluded.abreviations, synonymes = excluded.synonymes, a_jeun = excluded.a_jeun,
  delai_jeun_h = excluded.delai_jeun_h, irradiant = excluded.irradiant,
  injection_possible = excluded.injection_possible, produit_contraste = excluded.produit_contraste,
  consentement_requis = excluded.consentement_requis, precisions_suggerees = excluded.precisions_suggerees,
  question_exemple = excluded.question_exemple, unite_defaut = excluded.unite_defaut,
  unites = excluded.unites, ordre = excluded.ordre;

insert into public.packs_examens (systeme, code, nom, mots_cles, lignes, ordre) values
  (true, 'BILAN_HEPATIQUE', 'Bilan hépatique', array['hepatique','foie','bh','transaminases']::text[], '[{"examen_code":"ASAT","libelle":"ASAT (TGO)","type":"biologie"},{"examen_code":"ALAT","libelle":"ALAT (TGP)","type":"biologie"},{"examen_code":"GGT","libelle":"Gamma-GT (GGT)","type":"biologie"},{"examen_code":"PAL","libelle":"Phosphatases alcalines (PAL)","type":"biologie"},{"examen_code":"BILIRUBINE","libelle":"Bilirubine totale et conjuguée","type":"biologie"},{"examen_code":"ALBUMINE","libelle":"Albumine","type":"biologie"},{"examen_code":"TP_INR","libelle":"TP / INR","type":"biologie"}]'::jsonb, 10),
  (true, 'BILAN_RENAL', 'Bilan rénal', array['renal','rein','fonction renale']::text[], '[{"examen_code":"UREE","libelle":"Urée","type":"biologie"},{"examen_code":"CREATININE","libelle":"Créatinine","type":"biologie"},{"examen_code":"DFG","libelle":"DFG estimé (CKD-EPI)","type":"biologie"},{"examen_code":"IONOGRAMME","libelle":"Ionogramme sanguin (Na, K, Cl)","type":"biologie"}]'::jsonb, 20),
  (true, 'BILAN_GLYCEMIQUE', 'Bilan glycémique', array['glycemique','diabete','sucre']::text[], '[{"examen_code":"GLYCEMIE_JEUN","libelle":"Glycémie à jeun","type":"biologie"},{"examen_code":"HBA1C","libelle":"HbA1c (hémoglobine glyquée)","type":"biologie"}]'::jsonb, 30),
  (true, 'BILAN_LIPIDIQUE', 'Bilan lipidique', array['lipidique','eal','cholesterol','lipides']::text[], '[{"examen_code":"CHOLESTEROL_TOTAL","libelle":"Cholestérol total","type":"biologie"},{"examen_code":"HDL","libelle":"HDL-cholestérol","type":"biologie"},{"examen_code":"LDL","libelle":"LDL-cholestérol","type":"biologie"},{"examen_code":"TRIGLYCERIDES","libelle":"Triglycérides","type":"biologie"}]'::jsonb, 40),
  (true, 'BILAN_MARTIAL', 'Bilan martial', array['martial','fer','anemie','carence']::text[], '[{"examen_code":"NFS","libelle":"NFS (hémogramme)","type":"biologie"},{"examen_code":"FERRITINE","libelle":"Ferritine","type":"biologie"},{"examen_code":"FER_SERIQUE","libelle":"Fer sérique","type":"biologie"},{"examen_code":"CST","libelle":"Coefficient de saturation de la transferrine (CST)","type":"biologie"}]'::jsonb, 50),
  (true, 'BILAN_THYROIDIEN', 'Bilan thyroïdien', array['thyroidien','thyroide']::text[], '[{"examen_code":"TSH","libelle":"TSH ultrasensible","type":"biologie"},{"examen_code":"T4L","libelle":"T4 libre","type":"biologie"},{"examen_code":"T3L","libelle":"T3 libre","type":"biologie"}]'::jsonb, 60),
  (true, 'SEROLOGIES_HEPATITES', 'Sérologies hépatites B et C', array['hepatite','vhb','vhc','serologies']::text[], '[{"examen_code":"AG_HBS","libelle":"Antigène HBs","type":"biologie"},{"examen_code":"AC_ANTI_HBS","libelle":"Anticorps anti-HBs","type":"biologie"},{"examen_code":"AC_ANTI_HBC","libelle":"Anticorps anti-HBc","type":"biologie"},{"examen_code":"AC_ANTI_VHC","libelle":"Anticorps anti-VHC","type":"biologie"}]'::jsonb, 70),
  (true, 'HEPATOPATHIE_CHRONIQUE', 'Bilan d''hépatopathie chronique', array['hepatopathie','cirrhose','foie','fibrose']::text[], '[{"examen_code":"NFS","libelle":"NFS (hémogramme)","type":"biologie"},{"examen_code":"TP_INR","libelle":"TP / INR","type":"biologie"},{"examen_code":"ALBUMINE","libelle":"Albumine","type":"biologie"},{"examen_code":"ASAT","libelle":"ASAT (TGO)","type":"biologie"},{"examen_code":"ALAT","libelle":"ALAT (TGP)","type":"biologie"},{"examen_code":"GGT","libelle":"Gamma-GT (GGT)","type":"biologie"},{"examen_code":"PAL","libelle":"Phosphatases alcalines (PAL)","type":"biologie"},{"examen_code":"BILIRUBINE","libelle":"Bilirubine totale et conjuguée","type":"biologie"},{"examen_code":"AFP","libelle":"Alpha-fœtoprotéine (AFP)","type":"biologie"},{"examen_code":"ECHO_HEPATIQUE_DOPPLER","libelle":"Échographie hépatique avec doppler","type":"imagerie"},{"examen_code":"FIBROSCAN","libelle":"Fibroscan (élastométrie hépatique)","type":"imagerie"}]'::jsonb, 80),
  (true, 'SUIVI_DIABETE', 'Suivi du diabète', array['diabete','suivi','dt2','dt1']::text[], '[{"examen_code":"GLYCEMIE_JEUN","libelle":"Glycémie à jeun","type":"biologie"},{"examen_code":"HBA1C","libelle":"HbA1c (hémoglobine glyquée)","type":"biologie"},{"examen_code":"CREATININE","libelle":"Créatinine","type":"biologie"},{"examen_code":"DFG","libelle":"DFG estimé (CKD-EPI)","type":"biologie"},{"examen_code":"ALBU_CREAT_U","libelle":"Rapport albuminurie / créatininurie","type":"biologie"},{"examen_code":"CHOLESTEROL_TOTAL","libelle":"Cholestérol total","type":"biologie"},{"examen_code":"HDL","libelle":"HDL-cholestérol","type":"biologie"},{"examen_code":"LDL","libelle":"LDL-cholestérol","type":"biologie"},{"examen_code":"TRIGLYCERIDES","libelle":"Triglycérides","type":"biologie"}]'::jsonb, 90),
  (true, 'SUIVI_HTA', 'Suivi HTA', array['hta','hypertension','tension','suivi']::text[], '[{"examen_code":"CREATININE","libelle":"Créatinine","type":"biologie"},{"examen_code":"DFG","libelle":"DFG estimé (CKD-EPI)","type":"biologie"},{"examen_code":"IONOGRAMME","libelle":"Ionogramme sanguin (Na, K, Cl)","type":"biologie"},{"examen_code":"CHOLESTEROL_TOTAL","libelle":"Cholestérol total","type":"biologie"},{"examen_code":"HDL","libelle":"HDL-cholestérol","type":"biologie"},{"examen_code":"LDL","libelle":"LDL-cholestérol","type":"biologie"},{"examen_code":"TRIGLYCERIDES","libelle":"Triglycérides","type":"biologie"},{"examen_code":"GLYCEMIE_JEUN","libelle":"Glycémie à jeun","type":"biologie"},{"examen_code":"ECG","libelle":"ECG","type":"exploration"}]'::jsonb, 100),
  (true, 'PRE_OPERATOIRE', 'Bilan pré-opératoire', array['preoperatoire','pre operatoire','preop','chirurgie','anesthesie']::text[], '[{"examen_code":"NFS","libelle":"NFS (hémogramme)","type":"biologie"},{"examen_code":"TP_INR","libelle":"TP / INR","type":"biologie"},{"examen_code":"TCA","libelle":"TCA","type":"biologie"},{"examen_code":"GROUPE_ABO_RH","libelle":"Groupe sanguin ABO-Rhésus","type":"biologie"},{"examen_code":"RAI","libelle":"RAI (recherche d''agglutinines irrégulières)","type":"biologie"},{"examen_code":"IONOGRAMME","libelle":"Ionogramme sanguin (Na, K, Cl)","type":"biologie"},{"examen_code":"CREATININE","libelle":"Créatinine","type":"biologie"},{"examen_code":"GLYCEMIE_JEUN","libelle":"Glycémie à jeun","type":"biologie"}]'::jsonb, 110),
  (true, 'BILAN_INFLAMMATOIRE', 'Bilan inflammatoire', array['inflammatoire','inflammation','infection']::text[], '[{"examen_code":"NFS","libelle":"NFS (hémogramme)","type":"biologie"},{"examen_code":"VS","libelle":"Vitesse de sédimentation (VS)","type":"biologie"},{"examen_code":"CRP","libelle":"CRP","type":"biologie"}]'::jsonb, 120),
  (true, 'PRENATAL_T1', 'Bilan prénatal du 1er trimestre', array['prenatal','grossesse','enceinte','trimestre','obstetrique']::text[], '[{"examen_code":"GROUPE_ABO_RH","libelle":"Groupe sanguin ABO-Rhésus","type":"biologie"},{"examen_code":"RAI","libelle":"RAI (recherche d''agglutinines irrégulières)","type":"biologie"},{"examen_code":"NFS","libelle":"NFS (hémogramme)","type":"biologie"},{"examen_code":"GLYCEMIE_JEUN","libelle":"Glycémie à jeun","type":"biologie"},{"examen_code":"TOXOPLASMOSE","libelle":"Sérologie toxoplasmose (IgG, IgM)","type":"biologie"},{"examen_code":"RUBEOLE","libelle":"Sérologie rubéole (IgG)","type":"biologie"},{"examen_code":"SYPHILIS","libelle":"Sérologie syphilis (TPHA-VDRL)","type":"biologie"},{"examen_code":"VIH","libelle":"Sérologie VIH 1 et 2","type":"biologie"},{"examen_code":"AG_HBS","libelle":"Antigène HBs","type":"biologie"},{"examen_code":"ECBU","libelle":"ECBU","type":"biologie"},{"examen_code":"ECHO_OBSTETRICALE","libelle":"Échographie obstétricale","type":"imagerie"}]'::jsonb, 130)
on conflict (code) where systeme do update set
  nom = excluded.nom, mots_cles = excluded.mots_cles, lignes = excluded.lignes, ordre = excluded.ordre;

-- Empreinte base = source (à comparer aux valeurs de l'en-tête) :
--   select md5(string_agg(concat_ws('|', code, libelle, type, categorie, a_jeun::text, coalesce(delai_jeun_h::text, ''),
--     irradiant::text, injection_possible::text, coalesce(produit_contraste, ''), consentement_requis::text,
--     array_to_string(abreviations, ','), array_to_string(synonymes, ','), array_to_string(precisions_suggerees, ','),
--     coalesce(question_exemple, ''), coalesce(unite_defaut, ''),
--     coalesce((select string_agg(concat(u->>'parametre', ':', u->>'unite_defaut', ':', u->>'unite', ':', u->>'facteur', ':',
--       u->>'diviseur', ':', u->>'formule', ':', u->>'a', ':', u->>'b'), ',' order by o)
--       from jsonb_array_elements(unites) with ordinality t(u, o)), ''),
--     ordre::text), E'\n' order by code collate "C")) from examens_reference;
--   select md5(string_agg(concat_ws('|', code, nom,
--     (select string_agg(l->>'examen_code', ',' order by o) from jsonb_array_elements(lignes) with ordinality t(l, o))),
--     E'\n' order by code collate "C")) from packs_examens where systeme;
