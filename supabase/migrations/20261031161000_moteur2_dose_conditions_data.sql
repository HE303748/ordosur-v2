-- MOTEUR-2 Partie 1b : conditions de dose pour les règles aspirine
-- Source unique : scripts/gen_moteur2_dose_conditions.mjs (empreinte base = source)
-- Empreintes md5(description) vérifiées avant toute modification

DO $$
BEGIN
  -- Vérification que les règles n'ont pas changé depuis la génération
  IF EXISTS (
    SELECT 1 FROM (
      VALUES
        ('glucocorticoides (sauf hydrocortisone)',                    '237080c04c2d431e10bbe5dc7c08c0b2'),
        ('anti-inflammatoires non steroidiens',                       '279da41d8c2bea59f69237305ba6d5ee'),
        ('anticoagulants oraux',                                      'f0b9f68fe6e26257192b1d3684adaa33'),
        ('antagonistes des recepteurs de l''angiotensine ii',         'd40efef7af53aa73627a6d5312ed0130'),
        ('diuretiques',                                               'a80c54338be51f4b8c766f3ee22b19d6'),
        ('heparines (doses curatives et/ou sujet age)',                '110a137943fe8f570a9c2d84ef681568'),
        ('inhibiteurs de l''enzyme de conversion',                    'd40efef7af53aa73627a6d5312ed0130'),
        ('methotrexate',                                              '30898c722b8acf362008637e702a6f9c'),
        ('pemetrexed',                                                '285afffaab6ec8a153d026a5231a6463')
    ) AS expected(entite_b, emp)
    WHERE NOT EXISTS (
      SELECT 1 FROM ansm_regles ar
      WHERE ar.entite_a = 'acide acetylsalicylique'
        AND ar.entite_b = expected.entite_b
        AND md5(ar.description) = expected.emp
    )
  ) THEN
    RAISE EXCEPTION 'Empreinte inattendue — règles aspirine ont changé depuis la génération de cette migration';
  END IF;
END $$;

-- glucocorticoides : déconseillée à doses anti-inflammatoires (≥1g), à prendre en compte à doses antalgiques (≥500mg)
UPDATE ansm_regles SET
  conditions_dose = '[{"seuil_mg":1000,"niveau":"deconseillee"},{"seuil_mg":500,"niveau":"a_prendre_en_compte"}]'::jsonb,
  dose_cible = 'entite_a'
WHERE entite_a = 'acide acetylsalicylique'
  AND entite_b = 'glucocorticoides (sauf hydrocortisone)';

-- AINS : déconseillée à doses antalgiques (≥500mg), à prendre en compte à doses antiplatelet élevées (≥50mg)
UPDATE ansm_regles SET
  conditions_dose = '[{"seuil_mg":500,"niveau":"deconseillee"},{"seuil_mg":50,"niveau":"a_prendre_en_compte"}]'::jsonb,
  dose_cible = 'entite_a'
WHERE entite_a = 'acide acetylsalicylique'
  AND entite_b = 'anti-inflammatoires non steroidiens';

-- Anticoagulants oraux : contre-indiquée (≥1g), déconseillée (≥500mg), à prendre en compte (toute dose ≥50mg)
UPDATE ansm_regles SET
  conditions_dose = '[{"seuil_mg":1000,"niveau":"contre_indiquee"},{"seuil_mg":500,"niveau":"deconseillee"},{"seuil_mg":50,"niveau":"a_prendre_en_compte"}]'::jsonb,
  dose_cible = 'entite_a'
WHERE entite_a = 'acide acetylsalicylique'
  AND entite_b = 'anticoagulants oraux';

-- ARA2 : précaution à doses anti-inflammatoires/antalgiques (≥500mg)
UPDATE ansm_regles SET
  conditions_dose = '[{"seuil_mg":500,"niveau":"precaution"}]'::jsonb,
  dose_cible = 'entite_a'
WHERE entite_a = 'acide acetylsalicylique'
  AND entite_b = 'antagonistes des recepteurs de l''angiotensine ii';

-- Diurétiques : précaution à doses anti-inflammatoires/antalgiques (≥500mg)
UPDATE ansm_regles SET
  conditions_dose = '[{"seuil_mg":500,"niveau":"precaution"}]'::jsonb,
  dose_cible = 'entite_a'
WHERE entite_a = 'acide acetylsalicylique'
  AND entite_b = 'diuretiques';

-- Héparines : déconseillée (≥500mg), à prendre en compte (antiplatelet ≥50mg)
UPDATE ansm_regles SET
  conditions_dose = '[{"seuil_mg":500,"niveau":"deconseillee"},{"seuil_mg":50,"niveau":"a_prendre_en_compte"}]'::jsonb,
  dose_cible = 'entite_a'
WHERE entite_a = 'acide acetylsalicylique'
  AND entite_b = 'heparines (doses curatives et/ou sujet age)';

-- IEC : précaution à doses anti-inflammatoires/antalgiques (≥500mg)
UPDATE ansm_regles SET
  conditions_dose = '[{"seuil_mg":500,"niveau":"precaution"}]'::jsonb,
  dose_cible = 'entite_a'
WHERE entite_a = 'acide acetylsalicylique'
  AND entite_b = 'inhibiteurs de l''enzyme de conversion';

-- Méthotrexate : contre-indiquée (ASA≥500mg), précaution (antiplatelet ≥50mg)
UPDATE ansm_regles SET
  conditions_dose = '[{"seuil_mg":500,"niveau":"contre_indiquee"},{"seuil_mg":50,"niveau":"precaution"}]'::jsonb,
  dose_cible = 'entite_a'
WHERE entite_a = 'acide acetylsalicylique'
  AND entite_b = 'methotrexate';

-- Pemetrexed : déconseillée à doses antalgiques (≥500mg)
UPDATE ansm_regles SET
  conditions_dose = '[{"seuil_mg":500,"niveau":"deconseillee"}]'::jsonb,
  dose_cible = 'entite_a'
WHERE entite_a = 'acide acetylsalicylique'
  AND entite_b = 'pemetrexed';

-- Vérification finale : 9 règles doivent avoir été mises à jour
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM ansm_regles
  WHERE entite_a = 'acide acetylsalicylique' AND conditions_dose IS NOT NULL;
  IF n <> 9 THEN
    RAISE EXCEPTION 'Attendu 9 règles mises à jour, obtenu %', n;
  END IF;
END $$;
