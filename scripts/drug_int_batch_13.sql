-- drug_int_batch_13.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('lorazepam','probenecid','mineure','lorazepam × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lorazepam','theophylline','mineure','lorazepam × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aminophylline','lorazepam','mineure','aminophylline × lorazepam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','lorazepam','mineure','alcohol × lorazepam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('esomeprazole magnesium dihydrate','warfarin','mineure','esomeprazole magnesium dihydrate × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clopidogrel','esomeprazole magnesium dihydrate','mineure','clopidogrel × esomeprazole magnesium dihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','esomeprazole magnesium dihydrate','mineure','digoxin × esomeprazole magnesium dihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amoxicillin','esomeprazole magnesium dihydrate','contre_indication','amoxicillin × esomeprazole magnesium dihydrate — Contre-indication : association déconseillée (risque grave documenté).'),
('clarithromycin','esomeprazole magnesium dihydrate','contre_indication','clarithromycin × esomeprazole magnesium dihydrate — Contre-indication : association déconseillée (risque grave documenté).'),
('esomeprazole magnesium dihydrate','itraconazole','mineure','esomeprazole magnesium dihydrate × itraconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('esomeprazole magnesium dihydrate','ketoconazole','mineure','esomeprazole magnesium dihydrate × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('esomeprazole magnesium dihydrate','voriconazole','mineure','esomeprazole magnesium dihydrate × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('esomeprazole magnesium dihydrate','rifampin','contre_indication','esomeprazole magnesium dihydrate × rifampin — Contre-indication : association déconseillée (risque grave documenté).'),
('citalopram','esomeprazole magnesium dihydrate','mineure','citalopram × esomeprazole magnesium dihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('esomeprazole magnesium dihydrate','tacrolimus','mineure','esomeprazole magnesium dihydrate × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('esomeprazole magnesium dihydrate','methotrexate','mineure','esomeprazole magnesium dihydrate × methotrexate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('esomeprazole magnesium dihydrate','mycophenolate','mineure','esomeprazole magnesium dihydrate × mycophenolate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('esomeprazole magnesium dihydrate','ritonavir','mineure','esomeprazole magnesium dihydrate × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','esomeprazole magnesium dihydrate','mineure','atazanavir × esomeprazole magnesium dihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('esomeprazole magnesium dihydrate','iron','mineure','esomeprazole magnesium dihydrate × iron — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','ranolazine','mineure','diltiazem × ranolazine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ranolazine','verapamil','mineure','ranolazine × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','ranolazine','mineure','digoxin × ranolazine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ranolazine','simvastatin','mineure','ranolazine × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lovastatin','ranolazine','mineure','lovastatin × ranolazine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','ranolazine','contre_indication','clarithromycin × ranolazine — Contre-indication : association déconseillée (risque grave documenté).'),
('erythromycin','ranolazine','mineure','erythromycin × ranolazine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','ranolazine','modérée','fluconazole × ranolazine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('itraconazole','ranolazine','contre_indication','itraconazole × ranolazine — Contre-indication : association déconseillée (risque grave documenté).'),
('ketoconazole','ranolazine','contre_indication','ketoconazole × ranolazine — Contre-indication : association déconseillée (risque grave documenté).'),
('ranolazine','rifampin','contre_indication','ranolazine × rifampin — Contre-indication : association déconseillée (risque grave documenté).'),
('phenytoin','ranolazine','contre_indication','phenytoin × ranolazine — Contre-indication : association déconseillée (risque grave documenté).'),
('carbamazepine','ranolazine','contre_indication','carbamazepine × ranolazine — Contre-indication : association déconseillée (risque grave documenté).'),
('phenobarbital','ranolazine','contre_indication','phenobarbital × ranolazine — Contre-indication : association déconseillée (risque grave documenté).'),
('metformin','ranolazine','mineure','metformin × ranolazine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','ranolazine','mineure','cyclosporine × ranolazine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ranolazine','tacrolimus','mineure','ranolazine × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ranolazine','sirolimus','mineure','ranolazine × sirolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ranolazine','ritonavir','contre_indication','ranolazine × ritonavir — Contre-indication : association déconseillée (risque grave documenté).'),
('ranolazine','st. john''s wort','contre_indication','ranolazine × st. john''s wort — Contre-indication : association déconseillée (risque grave documenté).')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
