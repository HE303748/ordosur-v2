-- drug_int_batch_21.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('codeine','morphine','majeure','codeine × morphine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('codeine','oxycodone','modérée','codeine × oxycodone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('codeine','hydrocodone','modérée','codeine × hydrocodone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('buprenorphine','codeine','modérée','buprenorphine × codeine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('codeine','ritonavir','mineure','codeine × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','codeine','majeure','alcohol × codeine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('citalopram hydrobromide','warfarin','modérée','citalopram hydrobromide × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('citalopram hydrobromide','linezolid','contre_indication','citalopram hydrobromide × linezolid — Contre-indication : association déconseillée (risque grave documenté).'),
('citalopram hydrobromide','lithium','mineure','citalopram hydrobromide × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine','citalopram hydrobromide','mineure','amphetamine × citalopram hydrobromide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('citalopram hydrobromide','iron','mineure','citalopram hydrobromide × iron — Interaction mineure : association généralement possible, surveillance habituelle.'),
('citalopram hydrobromide','st. john''s wort','majeure','citalopram hydrobromide × st. john''s wort — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('ketoconazole','solifenacin','majeure','ketoconazole × solifenacin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('isotretinoin','tetracycline','contre_indication','isotretinoin × tetracycline — Contre-indication : association déconseillée (risque grave documenté).'),
('isotretinoin','phenytoin','mineure','isotretinoin × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('isotretinoin','st. john''s wort','mineure','isotretinoin × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','lurasidone','mineure','diltiazem × lurasidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lurasidone','verapamil','mineure','lurasidone × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','lurasidone','modérée','clarithromycin × lurasidone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('erythromycin','lurasidone','mineure','erythromycin × lurasidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','lurasidone','mineure','fluconazole × lurasidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','lurasidone','modérée','ketoconazole × lurasidone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lurasidone','voriconazole','modérée','lurasidone × voriconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lurasidone','rifampin','mineure','lurasidone × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','lurasidone','mineure','lithium × lurasidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lurasidone','phenytoin','modérée','lurasidone × phenytoin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('carbamazepine','lurasidone','modérée','carbamazepine × lurasidone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lurasidone','valproate','mineure','lurasidone × valproate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lurasidone','ritonavir','modérée','lurasidone × ritonavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('atazanavir','lurasidone','mineure','atazanavir × lurasidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('efavirenz','lurasidone','mineure','efavirenz × lurasidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','quetiapine','mineure','itraconazole × quetiapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','quetiapine','mineure','ketoconazole × quetiapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('quetiapine','rifampin','mineure','quetiapine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','quetiapine','mineure','phenytoin × quetiapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','quetiapine','mineure','carbamazepine × quetiapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('quetiapine','ritonavir','mineure','quetiapine × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','quetiapine','mineure','alcohol × quetiapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colesevelam','warfarin','mineure','colesevelam × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colesevelam','phenytoin','mineure','colesevelam × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
