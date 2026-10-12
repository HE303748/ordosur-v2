-- Sprint 7 — Lettre d'adressage auto-remplie, carnet de confrères, suivi en boucle fermée.
--
--   confreres           carnet du médecin (correspondants) — archivage, jamais de suppression
--   lettres_adressage   une lettre = un patient, un destinataire, un texte VALIDÉ et figé
--
-- Jamais de suppression physique (aucune policy DELETE) : annulation = statut 'annulee' + motif.
-- RLS identique à demandes_examens : lecture par l'org (secrétaire comprise, pour réimprimer),
-- écriture réservée aux médecins de l'org, doctor_id = doctors.id.
-- La lettre enregistrée se réimprime À L'IDENTIQUE : texte, destinataire, ligne patient, en-tête
-- du médecin et annexe des bilans sont figés à l'enregistrement (trigger).

-- ═══ 1. Carnet de confrères ═════════════════════════════════════════════════
create table if not exists public.confreres (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id),
  doctor_id     uuid not null references public.doctors(id),
  titre         text not null default 'Dr' check (titre in ('Dr', 'Pr')),
  -- Civilité saisie : seule source de l'accord « Cher confrère » / « Chère consœur ».
  civilite      text null check (civilite in ('M', 'Mme')),
  nom           text not null check (length(trim(nom)) > 0),
  prenom        text null,
  specialite    text not null check (length(trim(specialite)) > 0),
  etablissement text null,
  ville         text null,
  telephone     text null,
  email         text null,
  notes         text null,
  archive       boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists confreres_doctor_idx on public.confreres (doctor_id, nom) where archive = false;
create index if not exists confreres_org_idx on public.confreres (org_id);

alter table public.confreres enable row level security;

drop policy if exists confreres_select on public.confreres;
create policy confreres_select on public.confreres
  for select to authenticated
  using (get_my_role() = 'super_admin' or org_id = get_my_org_id());

drop policy if exists confreres_insert on public.confreres;
create policy confreres_insert on public.confreres
  for insert to authenticated
  with check (
    org_id = get_my_org_id()
    and coalesce(get_my_role(), '') <> 'secretaire'
    and doctor_id in (
      select d.id from public.doctors d
      where d.user_id = (select auth.uid()) and d.org_id = confreres.org_id
    )
  );

-- Le carnet est personnel : seul son médecin le modifie ou l'archive.
drop policy if exists confreres_update on public.confreres;
create policy confreres_update on public.confreres
  for update to authenticated
  using (
    org_id = get_my_org_id()
    and coalesce(get_my_role(), '') <> 'secretaire'
    and doctor_id in (select d.id from public.doctors d where d.user_id = (select auth.uid()))
  )
  with check (
    org_id = get_my_org_id()
    and coalesce(get_my_role(), '') <> 'secretaire'
    and doctor_id in (select d.id from public.doctors d where d.user_id = (select auth.uid()))
  );
-- Aucune policy DELETE.

create or replace function public.confreres_guard_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.doctor_id <> old.doctor_id or new.org_id <> old.org_id then
    raise exception 'confreres : médecin et organisation non modifiables';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists confreres_guard on public.confreres;
create trigger confreres_guard before update on public.confreres
  for each row execute function public.confreres_guard_update();

-- ═══ 2. Lettres d'adressage ═════════════════════════════════════════════════
create table if not exists public.lettres_adressage (
  id                      uuid primary key default gen_random_uuid(),
  patient_id              uuid not null references public.patients(id) on delete cascade,
  org_id                  uuid not null references public.organizations(id),
  doctor_id               uuid not null references public.doctors(id),
  confrere_id             uuid null references public.confreres(id),
  specialite_destinataire text not null check (length(trim(specialite_destinataire)) > 0),
  destinataire_libre      text null,
  -- « À l'attention du Dr Bennani, cardiologie » : ligne imprimée, figée.
  destinataire_ligne      text not null check (length(trim(destinataire_ligne)) > 0),
  -- « M. Karim Alaoui — 27 ans » : le patient figure TOUJOURS sur la lettre (âge à la date de la lettre).
  patient_ligne           text not null check (length(trim(patient_ligne)) > 0),
  motif                   text not null check (length(trim(motif)) > 0),
  contexte_suivi          text null,
  question_posee          text null,
  urgence                 text not null default 'programme' check (urgence in ('urgent', 'rapide', 'programme')),
  -- Texte validé par le médecin (paragraphes séparés par une ligne vide, **gras**).
  contenu_final           text not null check (length(trim(contenu_final)) > 0),
  sections_incluses       jsonb not null default '{}'::jsonb,
  -- En-tête du médecin auteur et du cabinet au jour de la lettre (réimpression à l'identique).
  entete                  jsonb not null,
  -- Récapitulatif des bilans joint (instantané), ou NULL si non joint.
  annexe_bilans           jsonb null,
  statut                  text not null default 'brouillon' check (statut in ('brouillon', 'envoyee', 'reponse_recue', 'annulee')),
  date_lettre             date not null default current_date,
  date_envoi              date null,
  reponse_date            date null,
  reponse_resume          text null,
  motif_annulation        text null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint lettres_adressage_reponse_coherente check (reponse_date is null or date_envoi is null or reponse_date >= date_envoi)
);
create index if not exists lettres_adressage_patient_idx on public.lettres_adressage (patient_id, created_at desc);
create index if not exists lettres_adressage_org_idx on public.lettres_adressage (org_id, created_at desc);
create index if not exists lettres_adressage_suivi_idx on public.lettres_adressage (doctor_id, date_envoi) where statut = 'envoyee';
create index if not exists lettres_adressage_confrere_idx on public.lettres_adressage (confrere_id) where confrere_id is not null;

alter table public.lettres_adressage enable row level security;

drop policy if exists lettres_adressage_select on public.lettres_adressage;
create policy lettres_adressage_select on public.lettres_adressage
  for select to authenticated
  using (get_my_role() = 'super_admin' or org_id = get_my_org_id());

drop policy if exists lettres_adressage_insert on public.lettres_adressage;
create policy lettres_adressage_insert on public.lettres_adressage
  for insert to authenticated
  with check (
    org_id = get_my_org_id()
    and coalesce(get_my_role(), '') <> 'secretaire'
    and doctor_id in (
      select d.id from public.doctors d
      where d.user_id = (select auth.uid()) and d.org_id = lettres_adressage.org_id
    )
    and statut = 'brouillon'
  );

drop policy if exists lettres_adressage_update on public.lettres_adressage;
create policy lettres_adressage_update on public.lettres_adressage
  for update to authenticated
  using (
    org_id = get_my_org_id()
    and coalesce(get_my_role(), '') <> 'secretaire'
    and exists (
      select 1 from public.doctors d
      where d.user_id = (select auth.uid()) and d.org_id = lettres_adressage.org_id
    )
  )
  with check (
    org_id = get_my_org_id()
    and coalesce(get_my_role(), '') <> 'secretaire'
    and exists (
      select 1 from public.doctors d
      where d.user_id = (select auth.uid()) and d.org_id = lettres_adressage.org_id
    )
  );
-- Aucune policy DELETE.

-- ── Garde-fous ──────────────────────────────────────────────────────────────
-- Auteur, patient, org et tout le contenu imprimé sont figés. Seul le SUIVI évolue :
--   brouillon → envoyee | reponse_recue | annulee      envoyee → reponse_recue | annulee | brouillon
--   reponse_recue : date et résumé de la réponse corrigeables      annulee : définitif
create or replace function public.lettres_adressage_guard_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.doctor_id <> old.doctor_id or new.patient_id <> old.patient_id or new.org_id <> old.org_id then
    raise exception 'lettres_adressage : auteur, patient et organisation non modifiables';
  end if;
  if new.contenu_final <> old.contenu_final
     or new.destinataire_ligne <> old.destinataire_ligne
     or new.patient_ligne <> old.patient_ligne
     or new.specialite_destinataire <> old.specialite_destinataire
     or new.destinataire_libre is distinct from old.destinataire_libre
     or new.confrere_id is distinct from old.confrere_id
     or new.motif <> old.motif
     or new.contexte_suivi is distinct from old.contexte_suivi
     or new.question_posee is distinct from old.question_posee
     or new.urgence <> old.urgence
     or new.sections_incluses <> old.sections_incluses
     or new.entete <> old.entete
     or new.annexe_bilans is distinct from old.annexe_bilans
     or new.date_lettre <> old.date_lettre
     or new.created_at <> old.created_at then
    raise exception 'lettres_adressage : la lettre enregistrée est figée (dupliquez-la pour la modifier)';
  end if;

  if old.statut = 'annulee' then
    raise exception 'lettres_adressage : une lettre annulée n''est plus modifiable';
  end if;
  if new.statut <> old.statut and not (
       (old.statut = 'brouillon' and new.statut in ('envoyee', 'reponse_recue', 'annulee'))
    or (old.statut = 'envoyee'   and new.statut in ('reponse_recue', 'annulee', 'brouillon'))
  ) then
    raise exception 'lettres_adressage : changement de statut impossible (% → %)', old.statut, new.statut;
  end if;

  if new.statut = 'brouillon' then
    new.date_envoi := null; new.reponse_date := null; new.reponse_resume := null; new.motif_annulation := null;
  elsif new.statut = 'envoyee' then
    new.date_envoi := coalesce(new.date_envoi, current_date);
    new.reponse_date := null; new.reponse_resume := null; new.motif_annulation := null;
  elsif new.statut = 'reponse_recue' then
    new.reponse_date := coalesce(new.reponse_date, current_date);
    new.date_envoi := coalesce(new.date_envoi, new.reponse_date);
    new.reponse_resume := nullif(trim(coalesce(new.reponse_resume, '')), '');
    new.motif_annulation := null;
  elsif new.statut = 'annulee' then
    if new.motif_annulation is null or length(trim(new.motif_annulation)) < 3 then
      raise exception 'lettres_adressage : motif d''annulation obligatoire';
    end if;
    new.motif_annulation := trim(new.motif_annulation);
    new.date_envoi := old.date_envoi; new.reponse_date := old.reponse_date; new.reponse_resume := old.reponse_resume;
  end if;
  if new.date_envoi is not null and new.date_envoi < new.date_lettre then
    raise exception 'lettres_adressage : envoi antérieur à la date de la lettre';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists lettres_adressage_guard on public.lettres_adressage;
create trigger lettres_adressage_guard before update on public.lettres_adressage
  for each row execute function public.lettres_adressage_guard_update();
