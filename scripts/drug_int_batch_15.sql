-- drug_int_batch_15.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('lansoprazole','st. john''s wort','contre_indication','lansoprazole × st. john''s wort — Contre-indication : association déconseillée (risque grave documenté).'),
('calcium','zoledronic acid','mineure','calcium × zoledronic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('esomeprazole magnesium','warfarin','mineure','esomeprazole magnesium × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clopidogrel','esomeprazole magnesium','mineure','clopidogrel × esomeprazole magnesium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','esomeprazole magnesium','mineure','digoxin × esomeprazole magnesium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amoxicillin','esomeprazole magnesium','contre_indication','amoxicillin × esomeprazole magnesium — Contre-indication : association déconseillée (risque grave documenté).'),
('clarithromycin','esomeprazole magnesium','contre_indication','clarithromycin × esomeprazole magnesium — Contre-indication : association déconseillée (risque grave documenté).'),
('esomeprazole magnesium','itraconazole','mineure','esomeprazole magnesium × itraconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('esomeprazole magnesium','ketoconazole','mineure','esomeprazole magnesium × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('esomeprazole magnesium','voriconazole','mineure','esomeprazole magnesium × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('esomeprazole magnesium','rifampin','contre_indication','esomeprazole magnesium × rifampin — Contre-indication : association déconseillée (risque grave documenté).'),
('citalopram','esomeprazole magnesium','mineure','citalopram × esomeprazole magnesium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('esomeprazole magnesium','tacrolimus','mineure','esomeprazole magnesium × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('esomeprazole magnesium','methotrexate','mineure','esomeprazole magnesium × methotrexate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('esomeprazole magnesium','mycophenolate','mineure','esomeprazole magnesium × mycophenolate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('esomeprazole magnesium','ritonavir','mineure','esomeprazole magnesium × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','esomeprazole magnesium','mineure','atazanavir × esomeprazole magnesium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('esomeprazole magnesium','iron','mineure','esomeprazole magnesium × iron — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','tetracycline','mineure','iron × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('magnesium','tetracycline','mineure','magnesium × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('tetracycline','zinc','mineure','tetracycline × zinc — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','tetracycline','mineure','antacids × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('eptifibatide','heparin','majeure','eptifibatide × heparin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('aspirin','eptifibatide','majeure','aspirin × eptifibatide — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('atorvastatin trihydrate','digoxin','modérée','atorvastatin trihydrate × digoxin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('atorvastatin trihydrate','clarithromycin','mineure','atorvastatin trihydrate × clarithromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin trihydrate','erythromycin','mineure','atorvastatin trihydrate × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin trihydrate','itraconazole','mineure','atorvastatin trihydrate × itraconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin trihydrate','ketoconazole','mineure','atorvastatin trihydrate × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin trihydrate','voriconazole','mineure','atorvastatin trihydrate × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin trihydrate','posaconazole','mineure','atorvastatin trihydrate × posaconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin trihydrate','rifampin','mineure','atorvastatin trihydrate × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin trihydrate','colchicine','mineure','atorvastatin trihydrate × colchicine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin trihydrate','cyclosporine','majeure','atorvastatin trihydrate × cyclosporine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('atorvastatin trihydrate','lopinavir','mineure','atorvastatin trihydrate × lopinavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin trihydrate','ritonavir','mineure','atorvastatin trihydrate × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin trihydrate','sofosbuvir','mineure','atorvastatin trihydrate × sofosbuvir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin trihydrate','ledipasvir','mineure','atorvastatin trihydrate × ledipasvir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin trihydrate','calcium','modérée','atorvastatin trihydrate × calcium — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('atorvastatin trihydrate','grapefruit juice','modérée','atorvastatin trihydrate × grapefruit juice — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
