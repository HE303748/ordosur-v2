-- drug_int_batch_91.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('cyclosporine','lidocaine, triamcinolone acetonide, povidone-iodine','mineure','cyclosporine × lidocaine, triamcinolone acetonide, povidone-iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lidocaine, triamcinolone acetonide, povidone-iodine','ritonavir','mineure','lidocaine, triamcinolone acetonide, povidone-iodine × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','lidocaine, triamcinolone acetonide, povidone-iodine','mineure','atazanavir × lidocaine, triamcinolone acetonide, povidone-iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','lidocaine, triamcinolone acetonide, povidone-iodine','mineure','cholestyramine × lidocaine, triamcinolone acetonide, povidone-iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','norethindrone','modérée','fluconazole × norethindrone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('itraconazole','norethindrone','modérée','itraconazole × norethindrone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ketoconazole','norethindrone','modérée','ketoconazole × norethindrone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('norethindrone','voriconazole','modérée','norethindrone × voriconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('norethindrone','rifampin','mineure','norethindrone × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norethindrone','phenytoin','mineure','norethindrone × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','norethindrone','mineure','carbamazepine × norethindrone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norethindrone','oxcarbazepine','mineure','norethindrone × oxcarbazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','norethindrone','mineure','cyclosporine × norethindrone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lopinavir','norethindrone','mineure','lopinavir × norethindrone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norethindrone','ritonavir','mineure','norethindrone × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','norethindrone','mineure','atazanavir × norethindrone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('efavirenz','norethindrone','mineure','efavirenz × norethindrone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('grapefruit juice','norethindrone','modérée','grapefruit juice × norethindrone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('carbamazepine','desmopressin','modérée','carbamazepine × desmopressin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('desmopressin','lamotrigine','modérée','desmopressin × lamotrigine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('azelastine','ketoconazole','modérée','azelastine × ketoconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('azelastine','ritonavir','mineure','azelastine × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diclofenac','magnesium','mineure','diclofenac × magnesium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','diclofenac','mineure','antacids × diclofenac — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin','testosterone','mineure','insulin × testosterone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetazolamide','aspirin','mineure','acetazolamide × aspirin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetazolamide','lithium','mineure','acetazolamide × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetazolamide','phenytoin','mineure','acetazolamide × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetazolamide','amphetamine','mineure','acetazolamide × amphetamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetazolamide','cyclosporine','mineure','acetazolamide × cyclosporine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetazolamide','folic acid','mineure','acetazolamide × folic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','mannitol','modérée','digoxin × mannitol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lithium','mannitol','modérée','lithium × mannitol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cyclosporine','mannitol','modérée','cyclosporine × mannitol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('hydrochlorothiazide','irbesartan','mineure','hydrochlorothiazide × irbesartan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrochlorothiazide','pindolol','mineure','hydrochlorothiazide × pindolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydralazine','pindolol','mineure','hydralazine × pindolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('efavirenz','valoctocogene roxaparvovec','mineure','efavirenz × valoctocogene roxaparvovec — Interaction mineure : association généralement possible, surveillance habituelle.'),
('tenofovir','valoctocogene roxaparvovec','mineure','tenofovir × valoctocogene roxaparvovec — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lamivudine','valoctocogene roxaparvovec','mineure','lamivudine × valoctocogene roxaparvovec — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
