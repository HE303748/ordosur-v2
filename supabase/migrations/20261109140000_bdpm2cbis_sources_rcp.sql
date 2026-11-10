-- BDPM-2c-bis, étape 2 — SOURCES STRUCTURÉES des contre-indications (validée le 2026-11-09 après ⛔ STOP).
-- Problème : contraindications.bdpm_ref porte un index UNIQUE ; BDPM-2c a donc renoncé à y écrire la référence RCP
-- (une même citation vaut pour plusieurs lignes) et n'a posé qu'une étiquette « BDPM-RCP » sans CIS, URL, date ni citation.
-- Solution : table de liens ci → (molécule, CIS, URL, date, rubrique, citation exacte), sans unicité sur la citation.
-- bdpm_ref reste l'identifiant unique des lignes GÉNÉRÉES (G3, 2c-bis) : il n'est pas détourné en référence de source.
-- Règle (CONTRAT §2) : une ligne active ne porte « BDPM-RCP » que si elle a au moins un lien nature 'source' (ou
-- 'autorise' pour une neutralisation) complet, pour SA molécule. Contrôle : requête de preuve (b) + garde ci-dessous.

create table if not exists public.ci_sources_rcp (
  id           bigserial primary key,
  ci_id        uuid not null references public.contraindications(id) on delete cascade,
  molecule     text not null check (length(trim(molecule)) > 0),
  cis          text not null check (cis ~ '^[0-9]{8}$'),
  url          text not null check (url ~ '^https://'),
  date_rcp     date not null,
  rubrique     text not null check (rubrique in ('4.3', '4.4', '4.6')),
  citation     text not null check (length(trim(citation)) > 0),
  -- source   : la citation fonde la ligne (concept identique, item relu du RCP de SA composition mono-molécule)
  -- indice   : phrase du RCP rapprochée par mot-clé, NON validée — n'autorise pas l'étiquette BDPM-RCP
  -- autorise : le RCP autorise l'usage (justifie une neutralisation)
  nature       text not null check (nature in ('source', 'indice', 'autorise')),
  staging_ligne integer,
  sprint       text not null default 'BDPM-2c-bis',
  created_at   timestamptz not null default now()
);
create index if not exists ci_sources_rcp_ci on public.ci_sources_rcp (ci_id);
-- Pas d'unicité sur la citation seule (une citation vaut pour plusieurs lignes) ; doublon exact interdit.
create unique index if not exists ci_sources_rcp_lien
  on public.ci_sources_rcp (ci_id, molecule, cis, rubrique, nature, md5(citation));

alter table public.ci_sources_rcp enable row level security;
drop policy if exists ci_sources_rcp_select on public.ci_sources_rcp;
create policy ci_sources_rcp_select on public.ci_sources_rcp for select to authenticated using (true);
-- Aucune politique d'écriture : seules les migrations (rôle propriétaire) écrivent.

comment on table public.ci_sources_rcp is
  'BDPM-2c-bis — source RCP de chaque ligne de contraindications (CIS, URL, date, citation exacte de SA molécule). '
  'Étiquette « BDPM-RCP » interdite sans lien source/autorise complet. Écriture : migrations uniquement.';
