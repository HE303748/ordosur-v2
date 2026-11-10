-- BDPM-2c-bis — table de STAGING des données de l'étape 3 (hors moteur ; RLS sans politique : accès réservé au
-- propriétaire et à la fonction de chargement). Chaque enregistrement est un texte JSON EXACT produit par
-- bdpm/2cbis/scripts/gen_migrations_2cbis.py ; chaque migration de lot vérifie md5(textes du lot) = empreinte source.
create table if not exists public.bdpm2cbis_staging (
  lot   smallint not null,
  seq   integer  not null,
  kind  text     not null check (kind in ('trace', 'ajout', 'neutr', 'restr', 'maj', 'react', 'lien')),
  t     text     not null,
  primary key (lot, seq)
);
alter table public.bdpm2cbis_staging enable row level security;
