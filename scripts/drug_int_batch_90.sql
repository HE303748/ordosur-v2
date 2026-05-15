-- drug_int_batch_90.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('mycophenolate','vonoprazan','mineure','mycophenolate × vonoprazan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','vonoprazan','contre_indication','atazanavir × vonoprazan — Contre-indication : association déconseillée (risque grave documenté).'),
('iron','vonoprazan','mineure','iron × vonoprazan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','diazepam','mineure','carbamazepine × diazepam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','lorazepam','mineure','carbamazepine × lorazepam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','clomipramine','mineure','carbamazepine × clomipramine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','mirtazapine','mineure','carbamazepine × mirtazapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','chloroquine','mineure','carbamazepine × chloroquine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','iron','modérée','carbamazepine × iron — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alcohol','carbamazepine','mineure','alcohol × carbamazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','nateglinide','mineure','amiodarone × nateglinide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonidine','nateglinide','modérée','clonidine × nateglinide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('fluconazole','nateglinide','mineure','fluconazole × nateglinide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nateglinide','voriconazole','mineure','nateglinide × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nateglinide','rifampin','mineure','nateglinide × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nateglinide','phenytoin','mineure','nateglinide × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nateglinide','st. john''s wort','mineure','nateglinide × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','nateglinide','mineure','alcohol × nateglinide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diclofenac','rifampin','mineure','diclofenac × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('argatroban','warfarin','mineure','argatroban × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('argatroban','heparin','mineure','argatroban × heparin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('argatroban','aspirin','mineure','argatroban × aspirin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('budesonide','clarithromycin','modérée','budesonide × clarithromycin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('budesonide','itraconazole','modérée','budesonide × itraconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('budesonide','ketoconazole','mineure','budesonide × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('budesonide','ritonavir','modérée','budesonide × ritonavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('atazanavir','budesonide','modérée','atazanavir × budesonide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('digoxin','ibutilide','mineure','digoxin × ibutilide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','ibutilide','mineure','calcium × ibutilide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','lovotibeglogene autotemcel','mineure','iron × lovotibeglogene autotemcel — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dexmedetomidine','midazolam','mineure','dexmedetomidine × midazolam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lidocaine, triamcinolone acetonide, povidone-iodine','warfarin','mineure','lidocaine, triamcinolone acetonide, povidone-iodine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','lidocaine, triamcinolone acetonide, povidone-iodine','modérée','aspirin × lidocaine, triamcinolone acetonide, povidone-iodine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','lidocaine, triamcinolone acetonide, povidone-iodine','mineure','clarithromycin × lidocaine, triamcinolone acetonide, povidone-iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','lidocaine, triamcinolone acetonide, povidone-iodine','mineure','itraconazole × lidocaine, triamcinolone acetonide, povidone-iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','lidocaine, triamcinolone acetonide, povidone-iodine','modérée','ketoconazole × lidocaine, triamcinolone acetonide, povidone-iodine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lidocaine, triamcinolone acetonide, povidone-iodine','rifampin','mineure','lidocaine, triamcinolone acetonide, povidone-iodine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lidocaine, triamcinolone acetonide, povidone-iodine','phenytoin','mineure','lidocaine, triamcinolone acetonide, povidone-iodine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','lidocaine, triamcinolone acetonide, povidone-iodine','mineure','carbamazepine × lidocaine, triamcinolone acetonide, povidone-iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrocortisone','lidocaine, triamcinolone acetonide, povidone-iodine','mineure','hydrocortisone × lidocaine, triamcinolone acetonide, povidone-iodine — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
