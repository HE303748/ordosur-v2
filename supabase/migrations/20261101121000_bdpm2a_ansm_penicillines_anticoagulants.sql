-- BDPM-2a Partie 2 — Reclassification interactions : règle pénicillines A × anticoagulants oraux
-- Sprint BDPM-2a, 2026-10-28
--
-- Contexte : check_interactions_v2 lit ansm_regles pour signaler les interactions ANSM.
-- La paire pénicillines a × anticoagulants oraux était absente d'ansm_regles alors
-- qu'elle figure dans bdpm_interactions_staging (ligne 12462, niveau a_prendre_en_compte,
-- statut auto — texte extrait du RCP AMOXICILLINE VIATRIS 500 mg).
--
-- Reclassification à la hausse : a_prendre_en_compte → precaution
-- (mapping check_interactions_v2 : precaution → severite 'moderee' = précaution d'emploi)
--
-- LEAST/GREATEST sur les libellés :
--   LEAST('anticoagulants oraux', 'penicillines a') = 'anticoagulants oraux'
--   → entite_a = 'anticoagulants oraux', entite_b = 'penicillines a'
--
-- Contrôle attendu :
--   SINTROM 4 + AUGMENTIN 1 G → 1 carte précaution d'emploi (severite=moderee, source=ANSM)
--
-- Mesure fatigue d'alerte (10 ordonnances-test AVANT migration) :
--   maximum = 4 cartes (Ord10 : Sintrom+Plavix+Pantoprazole) → < 5 → reclassification autorisée
-- Source du texte : bdpm_interactions_staging ligne 12462 (citation vérifiée dans le RCP source)

INSERT INTO ansm_regles (entite_a, entite_b, niveau, description)
VALUES (
  'anticoagulants oraux',
  'penicillines a',
  'precaution',
  'Les anticoagulants oraux sont souvent administrés de façon concomitante avec des antibiotiques de la famille des pénicillines et aucune interaction n''a été signalée. Toutefois, des cas d''augmentation de l''INR ont été rapportés dans la littérature chez des patients maintenus sous acénocoumarol ou warfarine pendant l''administration d''amoxicilline. Si une co-administration est nécessaire, le temps de Quick ou l''INR lors de l''ajout ou du retrait d''amoxicilline doit être étroitement surveillé. En outre, une adaptation posologique des anticoagulants oraux peut être nécessaire (voir rubriques 4.4 et 4.8).'
)
ON CONFLICT DO NOTHING;

-- Contrôle :
-- SELECT * FROM ansm_regles WHERE entite_a = 'anticoagulants oraux' AND entite_b = 'penicillines a';
-- SELECT r->'interactions' FROM (SELECT check_interactions_v2(ARRAY[
--   '99a86d2c-fba5-446c-83fd-212ba1d1013d'::uuid,   -- SINTROM 4
--   'f95d84d1-ad1f-4afe-a863-b131fb9571e1'::uuid    -- AUGMENTIN 1G
-- ]) AS r) x;
-- → 1 interaction, severite=moderee, source=ANSM, niveau_ansm=precaution
