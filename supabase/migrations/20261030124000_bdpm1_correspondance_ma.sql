-- BDPM-1 lot E — correspondance des fiches medicaments (MA) avec les spécialités BDPM (CIS), et propositions de
-- correction du catalogue (voie, forme normalisée, anomalies de liaison aux ingrédients, gravité des contradictions).
-- Chargé par bdpm/scripts/charger_correspondance.py. STAGING : aucune table du moteur n’est touchée.

create table public.bdpm_correspondance_ma (
  ligne integer primary key,
  medicament_id uuid not null,             -- fiche medicaments (non contraint : la table moteur n’est pas référencée)
  composition text not null,               -- noms de base BDPM de la composition commune
  voie_ma text,
  dosage_ma text,
  forme_ma text,
  cis bigint not null,
  niveau text not null check (niveau in ('exact', 'meme_molecule_voie', 'molecule_seule')),
  denomination text,                       -- dénomination BDPM de la spécialité
  voie_bdpm text,
  dosage_bdpm text,
  forme_bdpm text,
  princeps boolean not null default false,
  url text not null,
  date_import date not null,
  unique (medicament_id, cis)
);
comment on table public.bdpm_correspondance_ma is 'BDPM-1 : fiche MA ↔ spécialité BDPM (CIS) de même composition, niveau de correspondance (staging).';
create index bdpm_correspondance_ma_cis on public.bdpm_correspondance_ma (cis);
create index bdpm_correspondance_ma_med on public.bdpm_correspondance_ma (medicament_id);

create table public.bdpm_propositions_catalogue (
  ligne integer primary key,
  medicament_id uuid not null,
  nom text,
  champ text not null,                     -- voie_administration, forme_normalisee, anomalie_mapping:<type>
  actuel text,
  propose text,
  source text,
  statut text not null,                    -- proposition | a_verifier[ : motif]
  gravite text check (gravite in ('critique', 'moderee', 'faible')),
  risque text,
  date_import date not null
);
comment on table public.bdpm_propositions_catalogue is 'BDPM-1 : propositions de correction du catalogue MA (non appliquées), contradictions de marque classées par gravité.';
create index bdpm_propositions_catalogue_med on public.bdpm_propositions_catalogue (medicament_id);

alter table public.bdpm_correspondance_ma enable row level security;
create policy "bdpm_correspondance_ma_lecture_authentifiee" on public.bdpm_correspondance_ma for select to authenticated using (true);
revoke all on public.bdpm_correspondance_ma from anon;
alter table public.bdpm_propositions_catalogue enable row level security;
create policy "bdpm_propositions_catalogue_lecture_authentifiee" on public.bdpm_propositions_catalogue for select to authenticated using (true);
revoke all on public.bdpm_propositions_catalogue from anon;
