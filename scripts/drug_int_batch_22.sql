-- drug_int_batch_22.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('colesevelam','metformin','mineure','colesevelam × metformin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colesevelam','glipizide','mineure','colesevelam × glipizide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colesevelam','glimepiride','mineure','colesevelam × glimepiride — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colesevelam','levothyroxine','mineure','colesevelam × levothyroxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colesevelam','cyclosporine','mineure','colesevelam × cyclosporine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('penicillin g benzathine','tetracycline','mineure','penicillin g benzathine × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('penicillin g benzathine','probenecid','mineure','penicillin g benzathine × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('modafinil','warfarin','modérée','modafinil × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('modafinil','propranolol','mineure','modafinil × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('modafinil','phenytoin','mineure','modafinil × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diazepam','modafinil','mineure','diazepam × modafinil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('midazolam','modafinil','mineure','midazolam × modafinil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clomipramine','modafinil','mineure','clomipramine × modafinil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','modafinil','mineure','cyclosporine × modafinil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('modafinil','omeprazole','mineure','modafinil × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('propranolol','warfarin','mineure','propranolol × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','propranolol','mineure','amiodarone × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonidine','propranolol','mineure','clonidine × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxazosin','propranolol','mineure','doxazosin × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('haloperidol','propranolol','majeure','haloperidol × propranolol — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('calcium','propranolol','mineure','calcium × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','propranolol','mineure','alcohol × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dicyclomine','digoxin','modérée','dicyclomine × digoxin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('dicyclomine','metoclopramide','mineure','dicyclomine × metoclopramide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','dicyclomine','modérée','antacids × dicyclomine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('aspirin','enoxaparin','mineure','aspirin × enoxaparin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dipyridamole','enoxaparin','mineure','dipyridamole × enoxaparin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('enoxaparin','ketorolac','mineure','enoxaparin × ketorolac — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclobenzaprine','verapamil','majeure','cyclobenzaprine × verapamil — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('bupropion','cyclobenzaprine','majeure','bupropion × cyclobenzaprine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('cyclobenzaprine','tramadol','majeure','cyclobenzaprine × tramadol — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('alcohol','cyclobenzaprine','mineure','alcohol × cyclobenzaprine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ivermectin','warfarin','mineure','ivermectin × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('pantoprazole','warfarin','mineure','pantoprazole × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clopidogrel','pantoprazole','mineure','clopidogrel × pantoprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','pantoprazole','mineure','itraconazole × pantoprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','pantoprazole','mineure','ketoconazole × pantoprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methotrexate','pantoprazole','mineure','methotrexate × pantoprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mycophenolate','pantoprazole','mineure','mycophenolate × pantoprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','pantoprazole','mineure','atazanavir × pantoprazole — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
