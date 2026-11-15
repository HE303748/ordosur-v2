-- BDPM-2d, étape D (validée le 2026-11-15) : deux statuts explicites dans bdpm_interactions_staging (table hors moteur) pour les
-- lignes de prose NON intégrées au moteur, gardées pour un lot ultérieur :
--   a_relire_prose_fr   prose française (précaution / à prendre en compte) non relue ligne à ligne — erreur mesurée ~13 %
--   a_reextraire_ema    prose anglaise des PDF EMA, découpée en lignes physiques (phrases tronquées) — erreur mesurée >= 20 %
-- Aucune ligne existante n'est modifiée. Les migrations vers interactions_rcp ne prennent que les statuts « relu » et « auto ».
alter table public.bdpm_interactions_staging drop constraint bdpm_interactions_staging_statut_check;
alter table public.bdpm_interactions_staging add constraint bdpm_interactions_staging_statut_check
  check (statut = any (array['relu'::text, 'auto'::text, 'a_verifier'::text, 'ecarte'::text, 'non_resolu'::text, 'a_relire_prose_fr'::text, 'a_reextraire_ema'::text]));
