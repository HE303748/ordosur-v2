-- Sprint 4d — Prescription contre-indiquée : dérogation explicite et tracée.
-- Liste des alertes confirmées par le médecin : [{ medicament, alerte, severite, motif,
-- commentaire, horodatage }]. NULL = aucune dérogation. Jamais imprimée sur l'ordonnance.
alter table public.ordonnances
  add column if not exists derogations jsonb null;

alter table public.ordonnances drop constraint if exists ordonnances_derogations_array;
alter table public.ordonnances add constraint ordonnances_derogations_array
  check (derogations is null or jsonb_typeof(derogations) = 'array');

comment on column public.ordonnances.derogations is
  'Sprint 4d — alertes de niveau maximal confirmées par le médecin (motif, commentaire, horodatage). Non imprimé.';
