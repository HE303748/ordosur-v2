-- Sprint 6A — Résultats d'examens : saisie et suivi en boucle fermée.
--
--   resultats_examens   un résultat = un examen (ou un paramètre), une date de prélèvement
--
-- • Jamais de suppression physique (aucune policy DELETE). Une erreur de saisie s'ARCHIVE
--   avec un motif ; la correction est une nouvelle ligne. Pas de désarchivage.
-- • Les valeurs sont figées après l'insertion : seuls « vu » et « archivé » évoluent.
-- • interpretation : calculée ICI, uniquement à partir des bornes du laboratoire saisies avec
--   le résultat (même règle que resultatsLogic.interpret). Sans bornes → NULL.
--   AUCUNE valeur normale n'est stockée ni codée en dur.
-- • a_revoir : résultat Bas / Haut / Anormal, ou qualitatif « positif ».
-- • Boucle fermée : un résultat lié à une ligne de demande passe la ligne à « réalisé » ;
--   le statut de la demande (partiel / réalisé) en découle par le trigger du Sprint 5.
-- • RLS identique à antecedents / demandes_examens : lecture par l'org (secrétaire comprise),
--   écriture réservée aux médecins de l'org, doctor_id = doctors.id.

create table if not exists public.resultats_examens (
  id                     uuid primary key default gen_random_uuid(),
  patient_id             uuid not null references public.patients(id) on delete cascade,
  org_id                 uuid not null references public.organizations(id),
  doctor_id              uuid not null references public.doctors(id),
  -- Examen du référentiel, ou NULL pour une saisie libre (le libellé fait alors foi).
  examen_code            text null references public.examens_reference(code) on update cascade,
  libelle                text not null check (length(trim(libelle)) between 1 and 160),
  -- Paramètre d'un examen composite (ex. « hémoglobine » de la NFS).
  parametre              text null check (parametre is null or length(parametre) <= 80),
  type                   text not null default 'biologie' check (type in ('biologie','imagerie','exploration')),
  categorie              text null,
  demande_ligne_id       uuid null references public.demande_examen_lignes(id) on delete set null,
  date_prelevement       date not null,
  valeur_num             numeric null,
  valeur_texte           text null check (valeur_texte is null or length(valeur_texte) <= 2000),
  unite_saisie           text null check (unite_saisie is null or length(unite_saisie) <= 30),
  -- Valeur convertie dans l'unité de référence de l'examen (examens_reference.unites).
  valeur_ref             numeric null,
  unite_ref              text null,
  -- Bornes FOURNIES PAR LE LABORATOIRE, dans l'unité de saisie.
  borne_basse            numeric null,
  borne_haute            numeric null,
  interpretation         text null check (interpretation in ('normal','bas','haut','anormal')),
  a_revoir               boolean not null default false,
  laboratoire            text null check (laboratoire is null or length(laboratoire) <= 120),
  commentaire            text null check (commentaire is null or length(commentaire) <= 1000),
  vu_le                  timestamptz null,
  vu_par_doctor_id       uuid null references public.doctors(id),
  vu_commentaire         text null check (vu_commentaire is null or length(vu_commentaire) <= 500),
  archive                boolean not null default false,
  archive_motif          text null,
  archive_par_doctor_id  uuid null references public.doctors(id),
  archive_le             timestamptz null,
  created_at             timestamptz not null default now(),
  constraint resultats_examens_valeur_presente check (
    valeur_num is not null or length(trim(coalesce(valeur_texte, ''))) > 0
  ),
  constraint resultats_examens_bornes_coherentes check (
    (borne_basse is null and borne_haute is null)
    or (valeur_num is not null and (borne_basse is null or borne_haute is null or borne_basse <= borne_haute))
  ),
  constraint resultats_examens_ref_coherente check (
    (valeur_ref is null) = (unite_ref is null) and (valeur_ref is null or valeur_num is not null)
  ),
  constraint resultats_examens_vu_coherent check ((vu_le is null) = (vu_par_doctor_id is null)),
  constraint resultats_examens_archive_coherent check (
    not archive or (archive_par_doctor_id is not null and length(trim(coalesce(archive_motif, ''))) >= 3)
  )
);

create index if not exists resultats_examens_patient_idx
  on public.resultats_examens (patient_id, date_prelevement desc);
create index if not exists resultats_examens_a_revoir_idx
  on public.resultats_examens (doctor_id, date_prelevement desc)
  where a_revoir and vu_le is null and not archive;
create index if not exists resultats_examens_ligne_idx
  on public.resultats_examens (demande_ligne_id) where demande_ligne_id is not null;
create index if not exists resultats_examens_doctor_idx
  on public.resultats_examens (doctor_id, created_at desc);

-- La ligne de demande pointe vers son résultat (colonne prévue au Sprint 5).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'demande_examen_lignes_resultat_fk') then
    alter table public.demande_examen_lignes
      add constraint demande_examen_lignes_resultat_fk
      foreign key (resultat_id) references public.resultats_examens(id) on delete set null;
  end if;
end $$;

alter table public.resultats_examens enable row level security;
revoke all on public.resultats_examens from anon;
revoke delete, truncate on public.resultats_examens from authenticated;

drop policy if exists resultats_examens_select on public.resultats_examens;
create policy resultats_examens_select on public.resultats_examens
  for select to authenticated
  using (get_my_role() = 'super_admin' or org_id = get_my_org_id());

-- Création : médecin de l'org, doctor_id = SA ligne doctors, ni vu ni archivé d'avance.
drop policy if exists resultats_examens_insert on public.resultats_examens;
create policy resultats_examens_insert on public.resultats_examens
  for insert to authenticated
  with check (
    org_id = get_my_org_id()
    and coalesce(get_my_role(), '') <> 'secretaire'
    and doctor_id in (
      select d.id from public.doctors d
      where d.user_id = (select auth.uid()) and d.org_id = resultats_examens.org_id
    )
    and exists (select 1 from public.patients p where p.id = resultats_examens.patient_id and p.org_id = resultats_examens.org_id)
    and archive = false
    and vu_le is null
  );

-- Mise à jour (marquer vu, archiver) : tout médecin de l'org. Les valeurs sont figées par le trigger.
drop policy if exists resultats_examens_update on public.resultats_examens;
create policy resultats_examens_update on public.resultats_examens
  for update to authenticated
  using (
    org_id = get_my_org_id()
    and coalesce(get_my_role(), '') <> 'secretaire'
    and exists (
      select 1 from public.doctors d
      where d.user_id = (select auth.uid()) and d.org_id = resultats_examens.org_id
    )
  )
  with check (
    org_id = get_my_org_id()
    and coalesce(get_my_role(), '') <> 'secretaire'
    and exists (
      select 1 from public.doctors d
      where d.user_id = (select auth.uid()) and d.org_id = resultats_examens.org_id
    )
  );
-- Aucune policy DELETE.

-- ── Insertion : interprétation et « à revoir » calculés ici ; cohérence de la boucle ──
create or replace function public.resultats_examens_before_insert()
returns trigger language plpgsql set search_path = public as $$
declare
  v_patient uuid; v_statut text; v_res uuid;
begin
  if new.date_prelevement > current_date + 1 then
    raise exception 'Date de prélèvement dans le futur';
  end if;
  new.created_at := now();
  new.vu_le := null; new.vu_par_doctor_id := null; new.vu_commentaire := null;
  new.archive := false; new.archive_motif := null; new.archive_par_doctor_id := null; new.archive_le := null;
  new.valeur_texte := nullif(trim(coalesce(new.valeur_texte, '')), '');
  new.unite_saisie := nullif(trim(coalesce(new.unite_saisie, '')), '');

  if new.valeur_num is not null then
    -- Uniquement d'après les bornes du laboratoire. Sans bornes : non calculable.
    new.interpretation := case
      when new.borne_basse is null and new.borne_haute is null then null
      when new.borne_basse is not null and new.valeur_num < new.borne_basse then 'bas'
      when new.borne_haute is not null and new.valeur_num > new.borne_haute then 'haut'
      else 'normal'
    end;
  else
    -- Qualitatif / compte rendu : seul le médecin dit « anormal » (case cochée).
    if new.interpretation is not null and new.interpretation not in ('normal', 'anormal') then
      new.interpretation := null;
    end if;
  end if;
  new.a_revoir := coalesce(new.interpretation in ('bas', 'haut', 'anormal'), false)
    or (new.valeur_num is null and lower(coalesce(new.valeur_texte, '')) = 'positif');

  if new.demande_ligne_id is not null then
    select de.patient_id, l.statut, l.resultat_id into v_patient, v_statut, v_res
      from demande_examen_lignes l join demandes_examens de on de.id = l.demande_id
      where l.id = new.demande_ligne_id;
    if not found or v_patient <> new.patient_id then
      raise exception 'resultats_examens : cet examen demandé appartient à un autre patient';
    end if;
    if v_statut = 'annule' then
      raise exception 'resultats_examens : examen annulé, résultat impossible';
    end if;
    if v_res is not null and exists (select 1 from resultats_examens r where r.id = v_res and not r.archive) then
      raise exception 'Un résultat est déjà saisi pour cet examen : corrigez-le depuis l''onglet Bilans';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists resultats_examens_before_insert on public.resultats_examens;
create trigger resultats_examens_before_insert before insert on public.resultats_examens
  for each row execute function public.resultats_examens_before_insert();

-- Fermeture de la boucle : la ligne passe à « réalisé » (date = prélèvement) et pointe vers
-- le résultat ; le trigger demande_examen_lignes_sync recalcule le statut de la demande.
create or replace function public.resultats_examens_after_insert()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.demande_ligne_id is not null then
    update demande_examen_lignes
       set statut = 'realise', date_realisation = new.date_prelevement, resultat_id = new.id
     where id = new.demande_ligne_id;
    if not found then
      raise exception 'resultats_examens : examen demandé introuvable ou non modifiable';
    end if;
  end if;
  return null;
end;
$$;
drop trigger if exists resultats_examens_after_insert on public.resultats_examens;
create trigger resultats_examens_after_insert after insert on public.resultats_examens
  for each row execute function public.resultats_examens_after_insert();

-- ── Mise à jour : valeurs figées ; « vu » une seule fois ; archivage avec motif, définitif ──
create or replace function public.resultats_examens_guard_update()
returns trigger language plpgsql set search_path = public as $$
declare v_my_doctor uuid;
begin
  if old.archive then
    raise exception 'resultats_examens : un résultat archivé ne peut plus être modifié';
  end if;
  if new.doctor_id <> old.doctor_id or new.patient_id <> old.patient_id or new.org_id <> old.org_id then
    raise exception 'resultats_examens : auteur, patient et organisation non modifiables';
  end if;
  if new.examen_code is distinct from old.examen_code or new.libelle <> old.libelle
     or new.parametre is distinct from old.parametre or new.type <> old.type
     or new.categorie is distinct from old.categorie
     or new.date_prelevement <> old.date_prelevement
     or new.valeur_num is distinct from old.valeur_num or new.valeur_texte is distinct from old.valeur_texte
     or new.unite_saisie is distinct from old.unite_saisie
     or new.valeur_ref is distinct from old.valeur_ref or new.unite_ref is distinct from old.unite_ref
     or new.borne_basse is distinct from old.borne_basse or new.borne_haute is distinct from old.borne_haute
     or new.interpretation is distinct from old.interpretation or new.a_revoir <> old.a_revoir
     or new.laboratoire is distinct from old.laboratoire or new.commentaire is distinct from old.commentaire
     or new.created_at <> old.created_at
     or (new.demande_ligne_id is distinct from old.demande_ligne_id and new.demande_ligne_id is not null) then
    raise exception 'resultats_examens : un résultat ne se modifie pas — archivez-le avec un motif puis ressaisissez-le';
  end if;

  if auth.uid() is not null then
    select d.id into v_my_doctor from doctors d
      where d.user_id = auth.uid() and d.org_id = new.org_id limit 1;
  end if;

  if new.vu_le is distinct from old.vu_le or new.vu_par_doctor_id is distinct from old.vu_par_doctor_id
     or new.vu_commentaire is distinct from old.vu_commentaire then
    if old.vu_le is not null then
      raise exception 'resultats_examens : résultat déjà marqué comme vu';
    end if;
    if new.vu_par_doctor_id is null or (auth.uid() is not null and new.vu_par_doctor_id is distinct from v_my_doctor) then
      raise exception 'resultats_examens : vu_par_doctor_id doit être le médecin connecté';
    end if;
    new.vu_le := now();
    new.vu_commentaire := nullif(trim(coalesce(new.vu_commentaire, '')), '');
  end if;

  if new.archive then
    if length(trim(coalesce(new.archive_motif, ''))) < 3 then
      raise exception 'Motif d''archivage obligatoire';
    end if;
    if new.archive_par_doctor_id is null or (auth.uid() is not null and new.archive_par_doctor_id is distinct from v_my_doctor) then
      raise exception 'resultats_examens : archive_par_doctor_id doit être le médecin connecté';
    end if;
    new.archive_motif := trim(new.archive_motif);
    new.archive_le := now();
  elsif new.archive_motif is distinct from old.archive_motif
     or new.archive_par_doctor_id is distinct from old.archive_par_doctor_id
     or new.archive_le is distinct from old.archive_le then
    raise exception 'resultats_examens : motif et auteur d''archivage réservés à l''archivage';
  end if;
  return new;
end;
$$;
drop trigger if exists resultats_examens_guard on public.resultats_examens;
create trigger resultats_examens_guard before update on public.resultats_examens
  for each row execute function public.resultats_examens_guard_update();

-- Résultat archivé : la ligne de demande reste « réalisé » mais n'a plus de résultat
-- (il peut être ressaisi, ou la ligne remise en attente).
create or replace function public.resultats_examens_after_archive()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.archive and not old.archive then
    update demande_examen_lignes set resultat_id = null where resultat_id = old.id;
  end if;
  return null;
end;
$$;
drop trigger if exists resultats_examens_after_archive on public.resultats_examens;
create trigger resultats_examens_after_archive after update of archive on public.resultats_examens
  for each row execute function public.resultats_examens_after_archive();

-- ── Enregistrement atomique ─────────────────────────────────────────────────
-- Un lot de résultats (formulaire d'une demande) et, pour une correction, l'archivage de
-- l'ancien résultat, dans UNE transaction. SECURITY INVOKER : la RLS s'applique à tout.
create or replace function public.enregistrer_resultats_examens(
  p_resultats jsonb, p_archiver_id uuid default null, p_motif text default null
) returns uuid[] language plpgsql security invoker set search_path = public as $$
declare
  v_ids uuid[];
begin
  if p_resultats is null or jsonb_typeof(p_resultats) <> 'array' then
    raise exception 'Résultats invalides';
  end if;
  if jsonb_array_length(p_resultats) = 0 and p_archiver_id is null then
    raise exception 'Aucun résultat à enregistrer';
  end if;
  if jsonb_array_length(p_resultats) > 80 then
    raise exception 'Trop de résultats (80 au maximum par enregistrement)';
  end if;

  if p_archiver_id is not null then
    update resultats_examens r
       set archive = true,
           archive_motif = p_motif,
           archive_par_doctor_id = (select d.id from doctors d where d.user_id = auth.uid() and d.org_id = r.org_id limit 1)
     where r.id = p_archiver_id and not r.archive;
    if not found then
      raise exception 'Résultat introuvable ou déjà archivé';
    end if;
  end if;

  with ins as (
    insert into resultats_examens (
      patient_id, org_id, doctor_id, examen_code, libelle, parametre, type, categorie, demande_ligne_id,
      date_prelevement, valeur_num, valeur_texte, unite_saisie, valeur_ref, unite_ref,
      borne_basse, borne_haute, interpretation, laboratoire, commentaire
    )
    select (r->>'patient_id')::uuid,
           (r->>'org_id')::uuid,
           (r->>'doctor_id')::uuid,
           nullif(r->>'examen_code', ''),
           r->>'libelle',
           nullif(trim(coalesce(r->>'parametre', '')), ''),
           coalesce(nullif(r->>'type', ''), 'biologie'),
           nullif(r->>'categorie', ''),
           nullif(r->>'demande_ligne_id', '')::uuid,
           (r->>'date_prelevement')::date,
           nullif(r->>'valeur_num', '')::numeric,
           r->>'valeur_texte',
           r->>'unite_saisie',
           nullif(r->>'valeur_ref', '')::numeric,
           nullif(r->>'unite_ref', ''),
           nullif(r->>'borne_basse', '')::numeric,
           nullif(r->>'borne_haute', '')::numeric,
           nullif(r->>'interpretation', ''),
           nullif(trim(coalesce(r->>'laboratoire', '')), ''),
           nullif(trim(coalesce(r->>'commentaire', '')), '')
    from jsonb_array_elements(p_resultats) as t(r)
    returning id
  )
  select coalesce(array_agg(id), '{}') into v_ids from ins;
  return v_ids;
end;
$$;

revoke all on function public.enregistrer_resultats_examens(jsonb, uuid, text) from public, anon;
grant execute on function public.enregistrer_resultats_examens(jsonb, uuid, text) to authenticated;
