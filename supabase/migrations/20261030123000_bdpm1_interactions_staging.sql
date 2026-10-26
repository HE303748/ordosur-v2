-- BDPM-1 lot D — interactions lues en rubrique 4.5 des RCP (et associations citées en 4.3).
-- Une ligne par (item de RCP, partenaire) ; partenaire résolu en ingrédients / canonical_id ou en classe ANSM.
-- Citation exacte vérifiée mot pour mot dans le texte source avant chargement. Chargé par bdpm/scripts/charger_interactions.py.
-- STAGING : aucune table du moteur n’est touchée. Lecture authentifiée seulement.

create table public.bdpm_interactions_staging (
  ligne integer primary key,
  cis bigint not null,
  source text not null check (source in ('BDPM', 'EMA')),
  rubrique text not null check (rubrique in ('4.3', '4.5')),
  n_item integer not null,                 -- rang de l’item dans la rubrique
  composition text not null,               -- molécule : noms de base BDPM, « + » pour une association
  ingredient_ids uuid[] not null default '{}',
  canonical_ids uuid[] not null default '{}',
  voie text,
  specialite text,
  role text check (role in ('reference', 'supplementaire')),
  langue text not null default 'fr',
  format text not null check (format in ('ANSM', 'hybride', 'europeen', '4.3')),
  partenaire_rcp text not null,            -- libellé du partenaire tel qu’écrit dans le RCP
  partenaire_type text check (partenaire_type in ('substance', 'classe')),   -- null : non résolu
  partenaire_canonical_ids uuid[] not null default '{}',
  partenaire_ingredient_ids uuid[] not null default '{}',
  partenaire_classe text,                  -- classe ANSM (clé normalisée du référentiel)
  niveau text not null check (niveau in ('contre-indique', 'deconseille', 'precaution', 'a_prendre_en_compte')),
  niveau_origine text,
  mecanisme text,
  conduite text,
  condition text,                          -- dose, voie, terrain qui conditionnent le niveau
  note text,
  statut text not null check (statut in ('relu', 'auto', 'a_verifier', 'ecarte', 'non_resolu')),
  raison text,
  contexte text,
  phrase text,                             -- phrase de la citation qui porte l’interaction (format européen)
  citation text not null,                  -- texte exact du RCP
  url text not null,
  date_maj_rcp date,
  date_import date not null,
  empreinte text not null,                 -- md5(citation)
  cle_relecture text not null,
  lot_relecture integer,
  check ((partenaire_type is null) = (statut = 'non_resolu'))
);
comment on table public.bdpm_interactions_staging is 'BDPM-1 : interactions lues en rubrique 4.5 (et 4.3) des RCP, partenaire résolu, citation exacte (staging, hors moteur).';
create index bdpm_interactions_staging_composition on public.bdpm_interactions_staging (composition);
create index bdpm_interactions_staging_canonical on public.bdpm_interactions_staging using gin (canonical_ids);
create index bdpm_interactions_staging_partenaire on public.bdpm_interactions_staging using gin (partenaire_canonical_ids);

alter table public.bdpm_interactions_staging enable row level security;
create policy "bdpm_interactions_staging_lecture_authentifiee" on public.bdpm_interactions_staging for select to authenticated using (true);
revoke all on public.bdpm_interactions_staging from anon;
