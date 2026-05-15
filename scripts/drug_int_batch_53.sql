-- drug_int_batch_53.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('nebivolol','verapamil','mineure','nebivolol × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonidine','nebivolol','mineure','clonidine × nebivolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','nebivolol','modérée','fluoxetine × nebivolol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('nebivolol','paroxetine','modérée','nebivolol × paroxetine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('calcium','nebivolol','mineure','calcium × nebivolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','methotrexate','mineure','aspirin × methotrexate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methotrexate','tetracycline','mineure','methotrexate × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methotrexate','probenecid','majeure','methotrexate × probenecid — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('folic acid','methotrexate','mineure','folic acid × methotrexate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bortezomib','prednisone','modérée','bortezomib × prednisone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('bortezomib','dexamethasone','modérée','bortezomib × dexamethasone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('bortezomib','omeprazole','modérée','bortezomib × omeprazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('apraclonidine','insulin','mineure','apraclonidine × insulin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','apraclonidine','mineure','alcohol × apraclonidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nitrofurantoin','probenecid','mineure','nitrofurantoin × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('magnesium','nitrofurantoin','mineure','magnesium × nitrofurantoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','nitrofurantoin','mineure','antacids × nitrofurantoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('montelukast','warfarin','modérée','montelukast × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('digoxin','montelukast','modérée','digoxin × montelukast — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('itraconazole','montelukast','modérée','itraconazole × montelukast — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('montelukast','prednisone','modérée','montelukast × prednisone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('montelukast','prednisolone','modérée','montelukast × prednisolone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('montelukast','theophylline','modérée','montelukast × theophylline — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('albuterol','digoxin','mineure','albuterol × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketorolac tromethamine','warfarin','mineure','ketorolac tromethamine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('heparin','ketorolac tromethamine','mineure','heparin × ketorolac tromethamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','ketorolac tromethamine','mineure','aspirin × ketorolac tromethamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ibuprofen','ketorolac tromethamine','mineure','ibuprofen × ketorolac tromethamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketorolac tromethamine','naproxen','mineure','ketorolac tromethamine × naproxen — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketorolac tromethamine','piroxicam','mineure','ketorolac tromethamine × piroxicam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','ketorolac tromethamine','mineure','furosemide × ketorolac tromethamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','ketorolac tromethamine','mineure','digoxin × ketorolac tromethamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketorolac tromethamine','lithium','mineure','ketorolac tromethamine × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketorolac tromethamine','phenytoin','mineure','ketorolac tromethamine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','ketorolac tromethamine','majeure','carbamazepine × ketorolac tromethamine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('alprazolam','ketorolac tromethamine','mineure','alprazolam × ketorolac tromethamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','ketorolac tromethamine','mineure','fluoxetine × ketorolac tromethamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketorolac tromethamine','probenecid','mineure','ketorolac tromethamine × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketorolac tromethamine','methotrexate','mineure','ketorolac tromethamine × methotrexate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('indomethacin','vasopressin','mineure','indomethacin × vasopressin — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
