-- BDPM-1 lot A — staging des fichiers téléchargeables de la BDPM (édition du 29/09/2026).
-- Généré par bdpm/scripts/gen_staging_fichiers.py (hors dépôt) — ne pas modifier à la main.
-- Aucune table du moteur n’est touchée. Lecture authentifiée seulement.

create table public.bdpm_import (
  fichier text primary key,
  table_cible text not null,
  url text not null,
  date_maj_bdpm date not null,
  sha256 text not null,
  nb_lignes integer not null,
  empreinte_md5 text not null,
  date_import timestamptz not null default now()
);
comment on table public.bdpm_import is 'BDPM-1 : un fichier téléchargeable BDPM chargé en staging (source : base-donnees-publique.medicaments.gouv.fr).';
alter table public.bdpm_import enable row level security;
create policy "bdpm_import_lecture_authentifiee" on public.bdpm_import for select to authenticated using (true);
revoke all on public.bdpm_import from anon;

create table public.bdpm_specialites (
  ligne integer primary key,
  cis bigint,
  denomination text,
  forme text,
  voies text,
  statut_amm text,
  procedure_amm text,
  etat_commercialisation text,
  date_amm date,
  statut_bdm text,
  num_autorisation_eu text,
  titulaires text,
  surveillance_renforcee boolean,
  date_maj date not null default date '2026-09-29'
);
comment on table public.bdpm_specialites is 'BDPM-1 staging : CIS_bdpm.txt (ligne = n° de ligne dans le fichier, date_maj = mise à jour annoncée par la BDPM).';
create unique index bdpm_specialites_cis_idx on public.bdpm_specialites (cis);
alter table public.bdpm_specialites enable row level security;
create policy "bdpm_specialites_lecture_authentifiee" on public.bdpm_specialites for select to authenticated using (true);
revoke all on public.bdpm_specialites from anon;

create table public.bdpm_presentations (
  ligne integer primary key,
  cis bigint,
  cip7 text,
  libelle text,
  statut_admin text,
  etat_commercialisation text,
  date_declaration date,
  cip13 text,
  agrement_collectivites text,
  taux_remboursement text,
  prix_medicament numeric,
  prix_public numeric,
  honoraires numeric,
  indications_remboursement text,
  date_maj date not null default date '2026-10-24'
);
comment on table public.bdpm_presentations is 'BDPM-1 staging : CIS_CIP_bdpm.txt (ligne = n° de ligne dans le fichier, date_maj = mise à jour annoncée par la BDPM).';
create index bdpm_presentations_cis_idx on public.bdpm_presentations (cis);
create unique index bdpm_presentations_cip13_idx on public.bdpm_presentations (cip13);
alter table public.bdpm_presentations enable row level security;
create policy "bdpm_presentations_lecture_authentifiee" on public.bdpm_presentations for select to authenticated using (true);
revoke all on public.bdpm_presentations from anon;

create table public.bdpm_compositions (
  ligne integer primary key,
  cis bigint,
  element text,
  code_substance bigint,
  substance text,
  dosage text,
  ref_dosage text,
  nature text,
  num_liaison bigint,
  date_maj date not null default date '2026-09-29'
);
comment on table public.bdpm_compositions is 'BDPM-1 staging : CIS_COMPO_bdpm.txt (ligne = n° de ligne dans le fichier, date_maj = mise à jour annoncée par la BDPM).';
create index bdpm_compositions_cis_idx on public.bdpm_compositions (cis);
create index bdpm_compositions_code_substance_idx on public.bdpm_compositions (code_substance);
alter table public.bdpm_compositions enable row level security;
create policy "bdpm_compositions_lecture_authentifiee" on public.bdpm_compositions for select to authenticated using (true);
revoke all on public.bdpm_compositions from anon;

create table public.bdpm_has_smr (
  ligne integer primary key,
  cis bigint,
  code_dossier_has text,
  motif text,
  date_avis date,
  valeur text,
  libelle text,
  date_maj date not null default date '2026-09-29'
);
comment on table public.bdpm_has_smr is 'BDPM-1 staging : CIS_HAS_SMR_bdpm.txt (ligne = n° de ligne dans le fichier, date_maj = mise à jour annoncée par la BDPM).';
create index bdpm_has_smr_cis_idx on public.bdpm_has_smr (cis);
create index bdpm_has_smr_code_dossier_has_idx on public.bdpm_has_smr (code_dossier_has);
alter table public.bdpm_has_smr enable row level security;
create policy "bdpm_has_smr_lecture_authentifiee" on public.bdpm_has_smr for select to authenticated using (true);
revoke all on public.bdpm_has_smr from anon;

create table public.bdpm_has_asmr (
  ligne integer primary key,
  cis bigint,
  code_dossier_has text,
  motif text,
  date_avis date,
  valeur text,
  libelle text,
  date_maj date not null default date '2026-09-29'
);
comment on table public.bdpm_has_asmr is 'BDPM-1 staging : CIS_HAS_ASMR_bdpm.txt (ligne = n° de ligne dans le fichier, date_maj = mise à jour annoncée par la BDPM).';
create index bdpm_has_asmr_cis_idx on public.bdpm_has_asmr (cis);
create index bdpm_has_asmr_code_dossier_has_idx on public.bdpm_has_asmr (code_dossier_has);
alter table public.bdpm_has_asmr enable row level security;
create policy "bdpm_has_asmr_lecture_authentifiee" on public.bdpm_has_asmr for select to authenticated using (true);
revoke all on public.bdpm_has_asmr from anon;

create table public.bdpm_has_liens_ct (
  ligne integer primary key,
  code_dossier_has text,
  lien text,
  date_maj date not null default date '2026-09-29'
);
comment on table public.bdpm_has_liens_ct is 'BDPM-1 staging : HAS_LiensPageCT_bdpm.txt (ligne = n° de ligne dans le fichier, date_maj = mise à jour annoncée par la BDPM).';
create index bdpm_has_liens_ct_code_dossier_has_idx on public.bdpm_has_liens_ct (code_dossier_has);
alter table public.bdpm_has_liens_ct enable row level security;
create policy "bdpm_has_liens_ct_lecture_authentifiee" on public.bdpm_has_liens_ct for select to authenticated using (true);
revoke all on public.bdpm_has_liens_ct from anon;

create table public.bdpm_groupes_generiques (
  ligne integer primary key,
  id_groupe bigint,
  libelle text,
  cis bigint,
  type_generique bigint,
  num_tri bigint,
  date_maj date not null default date '2026-09-29'
);
comment on table public.bdpm_groupes_generiques is 'BDPM-1 staging : CIS_GENER_bdpm.txt (ligne = n° de ligne dans le fichier, date_maj = mise à jour annoncée par la BDPM).';
create index bdpm_groupes_generiques_id_groupe_idx on public.bdpm_groupes_generiques (id_groupe);
create index bdpm_groupes_generiques_cis_idx on public.bdpm_groupes_generiques (cis);
alter table public.bdpm_groupes_generiques enable row level security;
create policy "bdpm_groupes_generiques_lecture_authentifiee" on public.bdpm_groupes_generiques for select to authenticated using (true);
revoke all on public.bdpm_groupes_generiques from anon;

create table public.bdpm_conditions_prescription (
  ligne integer primary key,
  cis bigint,
  condition text,
  date_maj date not null default date '2026-09-29'
);
comment on table public.bdpm_conditions_prescription is 'BDPM-1 staging : CIS_CPD_bdpm.txt (ligne = n° de ligne dans le fichier, date_maj = mise à jour annoncée par la BDPM).';
create index bdpm_conditions_prescription_cis_idx on public.bdpm_conditions_prescription (cis);
alter table public.bdpm_conditions_prescription enable row level security;
create policy "bdpm_conditions_prescription_lecture_authentifiee" on public.bdpm_conditions_prescription for select to authenticated using (true);
revoke all on public.bdpm_conditions_prescription from anon;

create table public.bdpm_disponibilite (
  ligne integer primary key,
  cis bigint,
  cip13 text,
  code_statut bigint,
  libelle_statut text,
  date_debut date,
  date_maj_fiche date,
  date_remise_dispo date,
  lien text,
  date_maj date not null default date '2026-10-21'
);
comment on table public.bdpm_disponibilite is 'BDPM-1 staging : CIS_CIP_Dispo_Spec.txt (ligne = n° de ligne dans le fichier, date_maj = mise à jour annoncée par la BDPM).';
create index bdpm_disponibilite_cis_idx on public.bdpm_disponibilite (cis);
create index bdpm_disponibilite_cip13_idx on public.bdpm_disponibilite (cip13);
alter table public.bdpm_disponibilite enable row level security;
create policy "bdpm_disponibilite_lecture_authentifiee" on public.bdpm_disponibilite for select to authenticated using (true);
revoke all on public.bdpm_disponibilite from anon;

create table public.bdpm_mitm (
  ligne integer primary key,
  cis bigint,
  code_atc text,
  denomination text,
  titulaire text,
  exploitant text,
  date_publication date,
  lien_bdpm text,
  date_maj date not null default date '2026-10-13'
);
comment on table public.bdpm_mitm is 'BDPM-1 staging : CIS_MITM.txt (ligne = n° de ligne dans le fichier, date_maj = mise à jour annoncée par la BDPM).';
create index bdpm_mitm_cis_idx on public.bdpm_mitm (cis);
alter table public.bdpm_mitm enable row level security;
create policy "bdpm_mitm_lecture_authentifiee" on public.bdpm_mitm for select to authenticated using (true);
revoke all on public.bdpm_mitm from anon;

create table public.bdpm_infos_importantes (
  ligne integer primary key,
  cis bigint,
  date_debut date,
  date_fin date,
  texte_html text,
  date_maj date not null default date '2026-10-25'
);
comment on table public.bdpm_infos_importantes is 'BDPM-1 staging : CIS_InfoImportantes.txt (ligne = n° de ligne dans le fichier, date_maj = mise à jour annoncée par la BDPM).';
create index bdpm_infos_importantes_cis_idx on public.bdpm_infos_importantes (cis);
alter table public.bdpm_infos_importantes enable row level security;
create policy "bdpm_infos_importantes_lecture_authentifiee" on public.bdpm_infos_importantes for select to authenticated using (true);
revoke all on public.bdpm_infos_importantes from anon;

