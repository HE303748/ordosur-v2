-- Sprint 2 — Filtrage des contre-indications par sexe.
-- sexe_applicable : 'F' = femme uniquement, 'M' = homme uniquement, NULL = tous (défaut sûr).
-- Remplissage par égalité stricte sur la liste validée (diagnostic 2026-09-27) : 541 F, 6 M.
-- Cas ambigus laissés à NULL : « Rétention urinaire / HBP symptomatique »,
-- « Femme ou homme en âge de procréer sans contraception », « Cancer du sein… », « Ostéoporose… ».

ALTER TABLE contraindications
  ADD COLUMN IF NOT EXISTS sexe_applicable char(1) NULL
  CHECK (sexe_applicable IN ('F', 'M'));

UPDATE contraindications SET sexe_applicable = 'F'
WHERE condition_valeur IN (
  'Grossesse',
  'Allaitement',
  'Grossesse — 1er trimestre',
  'Grossesse — 3ème trimestre',
  'Grossesse (1er trimestre)',
  'Grossesse — 2ème et 3ème trimestre',
  'Grossesse (3e trimestre)',
  'Grossesse — 3ème trimestre (après 24 SA)',
  'Grossesse — hypertension artérielle gravidique',
  'Grossesse — insuffisance rénale fœtale (> 20 SA)',
  'Grossesse (2e trimestre)',
  'Grossesse (toute période)',
  'Grossesse — hypertension pulmonaire néonatale persistante',
  'Grossesse — syndrome de floppy infant (terme)',
  'Grossesse dans le mois suivant l''arrêt (isotrétinoïne)',
  'Allaitement (6 premières semaines)',
  'Femme en âge de procréer sans contraception efficace',
  'Femme en âge de procréer sans contraception',
  'Femme en âge de procréer (HTA chronique)',
  'Tabagisme actif > 15 cigarettes/j chez femme > 35 ans',
  'Déficit en acide folique (grossesse planifiée)'
);

UPDATE contraindications SET sexe_applicable = 'M'
WHERE condition_valeur IN (
  'Hypertrophie bénigne de la prostate',
  'Cancer de la prostate'
);
