-- BDPM-1 lot B — RCP lus (BDPM ou PDF EMA) et leurs rubriques 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.1.
-- Chargé depuis bdpm/rcp/*.json et bdpm/rcp_ema/*.json (hors dépôt, scripts/charger_rcp.py), empreinte md5 par rubrique.
-- Texte EXACT du RCP (seuls les blancs sont normalisés). Aucune table du moteur n’est touchée. Lecture authentifiée seulement.

create table public.bdpm_rcp (
  cis bigint not null,
  source text not null check (source in ('BDPM', 'EMA')),
  role text not null check (role in ('reference', 'supplementaire')),
  substances text not null,            -- composition (noms de base BDPM, « + » pour une association)
  voie text not null,                  -- voie MA du couple (ciblage)
  denomination text,
  titulaires text,
  procedure_amm text,
  langue text not null default 'fr',
  url text not null,                   -- fiche BDPM, ou PDF EMA
  url_fiche_bdpm text not null,
  date_maj_rcp date,                   -- « Mis à jour le » (BDPM) ou Last-Modified du PDF (EMA)
  date_base_bdpm date,
  rcp_retenu text,                     -- EMA : n° du RCP retenu dans l’annexe I (« 4/6 »)
  anomalies text[] not null default '{}',
  echecs_qc integer not null default 0,
  sha256_source text,                  -- empreinte de la page HTML ou du PDF lu
  date_import timestamptz not null default now(),
  primary key (cis, source)
);
comment on table public.bdpm_rcp is 'BDPM-1 : RCP lus (base-donnees-publique.medicaments.gouv.fr, ou information produit EMA pour les AMM centralisées).';

create table public.bdpm_rcp_sections (
  cis bigint not null,
  source text not null check (source in ('BDPM', 'EMA')),
  section text not null check (section in ('4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '6.1')),
  titre text,
  texte text not null,
  url text not null,
  date_maj_rcp date,
  date_import timestamptz not null default now(),
  empreinte text not null,             -- md5(texte)
  primary key (cis, source, section),
  foreign key (cis, source) references public.bdpm_rcp (cis, source)
);
comment on table public.bdpm_rcp_sections is 'BDPM-1 : texte exact des rubriques 4.1 à 4.6 et 6.1 des RCP (EMA : 4.3 à 4.6, en anglais).';

alter table public.bdpm_rcp enable row level security;
create policy "bdpm_rcp_lecture_authentifiee" on public.bdpm_rcp for select to authenticated using (true);
revoke all on public.bdpm_rcp from anon;
alter table public.bdpm_rcp_sections enable row level security;
create policy "bdpm_rcp_sections_lecture_authentifiee" on public.bdpm_rcp_sections for select to authenticated using (true);
revoke all on public.bdpm_rcp_sections from anon;
