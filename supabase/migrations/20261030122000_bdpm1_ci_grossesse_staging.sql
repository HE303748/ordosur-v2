-- BDPM-1 lot C — contre-indications (rubrique 4.3) et grossesse / allaitement (rubrique 4.6) lues dans les RCP.
-- Une ligne par item de RCP, analysée automatiquement puis relue (12 lots de 50 compositions) ; citation exacte vérifiée
-- mot pour mot dans le texte source (bdpm_rcp_sections) avant chargement. Chargé par bdpm/scripts/charger_ci.py.
-- STAGING : aucune table du moteur n’est touchée. Lecture authentifiée seulement.

create table public.bdpm_ci_staging (
  ligne integer primary key,
  cis bigint not null,
  source text not null check (source in ('BDPM', 'EMA')),
  n_item integer not null,                 -- rang de l’item dans la rubrique 4.3
  composition text not null,               -- noms de base BDPM, « + » pour une association
  ingredient_ids uuid[] not null default '{}',
  canonical_ids uuid[] not null default '{}',
  voie text,                               -- voie MA du couple ciblé
  specialite text,
  role text check (role in ('reference', 'supplementaire')),
  langue text not null default 'fr',
  categorie text not null check (categorie in ('pathologie', 'allergie', 'association', 'renal', 'grossesse', 'allaitement',
                                               'age', 'excipient', 'voie', 'contexte')),
  concepts text[] not null default '{}',   -- concept moteur (ci_condition_concepts / pathologies_curees / famille / allergie:…) ; [proposé]
  type text not null check (type in ('absolue', 'relative')),
  seuils jsonb not null default '{}',      -- dfg_max, age_max_ans, age_min_ans, trimestres, terme_sa, dose…
  qualificatif text,                       -- condition / restriction lue dans la phrase
  note text,
  statut text not null check (statut in ('relu', 'a_verifier', 'auto', 'vers_interactions', 'ecarte')),
  raison text,
  contexte text,                           -- intitulé de liste qui précède l’item
  citation text not null,                  -- texte exact du RCP
  url text not null,
  date_maj_rcp date,
  date_import date not null,
  empreinte text not null,                 -- md5(citation)
  cle_relecture text not null,
  lot_relecture integer,
  unique (cis, source, n_item)
);
comment on table public.bdpm_ci_staging is 'BDPM-1 : contre-indications lues en rubrique 4.3 des RCP, relues, citation exacte (staging, hors moteur).';
create index bdpm_ci_staging_composition on public.bdpm_ci_staging (composition);

create table public.bdpm_grossesse_staging (
  ligne integer primary key,
  cis bigint not null,
  source text not null check (source in ('BDPM', 'EMA')),
  n_item integer not null,
  composition text not null,
  ingredient_ids uuid[] not null default '{}',
  canonical_ids uuid[] not null default '{}',
  voie text,
  specialite text,
  role text check (role in ('reference', 'supplementaire')),
  langue text not null default 'fr',
  sous_rubrique text,
  cible text not null check (cible in ('grossesse', 'allaitement', 'procreation', 'fertilite')),
  niveau text not null check (niveau in ('contre-indique', 'deconseille', 'contraception_requise', 'precaution', 'possible', 'information')),
  seuils jsonb not null default '{}',      -- trimestres, terme_sa, terme_mois_min, dose
  qualificatif text,
  note text,
  statut text not null check (statut in ('relu', 'a_verifier', 'auto')),
  raison text,
  contexte text,
  citation text not null,
  url text not null,
  date_maj_rcp date,
  date_import date not null,
  empreinte text not null,
  cle_relecture text not null,
  lot_relecture integer,
  unique (cis, source, n_item)
);
comment on table public.bdpm_grossesse_staging is 'BDPM-1 : conduites grossesse / allaitement / procréation lues en rubrique 4.6 des RCP, relues, citation exacte (staging).';
create index bdpm_grossesse_staging_composition on public.bdpm_grossesse_staging (composition);

alter table public.bdpm_ci_staging enable row level security;
create policy "bdpm_ci_staging_lecture_authentifiee" on public.bdpm_ci_staging for select to authenticated using (true);
revoke all on public.bdpm_ci_staging from anon;
alter table public.bdpm_grossesse_staging enable row level security;
create policy "bdpm_grossesse_staging_lecture_authentifiee" on public.bdpm_grossesse_staging for select to authenticated using (true);
revoke all on public.bdpm_grossesse_staging from anon;
