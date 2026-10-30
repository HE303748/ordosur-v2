-- BDPM-2a Partie 2 — Annulation de la règle ansm_regles pénicillines A × anticoagulants oraux
-- Sprint BDPM-2a, 2026-10-29
--
-- La migration 20261101121000 a inséré à tort une règle de niveau 'precaution' dans ansm_regles
-- pour la paire anticoagulants oraux × pénicillines a.
-- Source réelle : RCP AMOXICILLINE VIATRIS (bdpm_interactions_staging ligne 12462),
-- niveau a_prendre_en_compte. Le texte appartient au canal RCP, pas au canal ANSM.
-- L'interaction correcte sera chargée dans interactions_rcp (migration suivante).
--
-- Contrôle attendu :
--   SELECT count(*) FROM ansm_regles
--   WHERE entite_a = 'anticoagulants oraux' AND entite_b = 'penicillines a';
--   → 0

DELETE FROM ansm_regles
WHERE entite_a = 'anticoagulants oraux'
  AND entite_b = 'penicillines a'
  AND niveau = 'precaution';
