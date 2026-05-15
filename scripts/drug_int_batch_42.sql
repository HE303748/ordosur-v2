-- drug_int_batch_42.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('calcium','rifampin','mineure','calcium × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','rifampin','contre_indication','antacids × rifampin — Contre-indication : association déconseillée (risque grave documenté).'),
('famotidine','ibuprofen','modérée','famotidine × ibuprofen — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('piroxicam','warfarin','majeure','piroxicam × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('aspirin','piroxicam','majeure','aspirin × piroxicam — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('diclofenac','piroxicam','mineure','diclofenac × piroxicam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('indomethacin','piroxicam','mineure','indomethacin × piroxicam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('meloxicam','piroxicam','mineure','meloxicam × piroxicam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('piroxicam','propranolol','mineure','piroxicam × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','piroxicam','mineure','furosemide × piroxicam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','piroxicam','mineure','digoxin × piroxicam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','piroxicam','mineure','lithium × piroxicam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','piroxicam','mineure','cyclosporine × piroxicam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methotrexate','piroxicam','modérée','methotrexate × piroxicam — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('vilazodone','warfarin','modérée','vilazodone × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('digoxin','vilazodone','mineure','digoxin × vilazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','vilazodone','mineure','clarithromycin × vilazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','vilazodone','mineure','itraconazole × vilazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('vilazodone','voriconazole','mineure','vilazodone × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rifampin','vilazodone','mineure','rifampin × vilazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('linezolid','vilazodone','contre_indication','linezolid × vilazodone — Contre-indication : association déconseillée (risque grave documenté).'),
('phenytoin','vilazodone','mineure','phenytoin × vilazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','vilazodone','mineure','carbamazepine × vilazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenobarbital','warfarin','mineure','phenobarbital × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxycycline','phenobarbital','mineure','doxycycline × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenobarbital','valproic acid','mineure','phenobarbital × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenobarbital','valproate','mineure','phenobarbital × valproate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','phenobarbital','mineure','alcohol × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buprenorphine','pregabalin','mineure','buprenorphine × pregabalin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','rilpivirine','modérée','digoxin × rilpivirine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('atorvastatin','rilpivirine','mineure','atorvastatin × rilpivirine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('azithromycin','rilpivirine','majeure','azithromycin × rilpivirine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('clarithromycin','rilpivirine','majeure','clarithromycin × rilpivirine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('erythromycin','rilpivirine','majeure','erythromycin × rilpivirine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('fluconazole','rilpivirine','mineure','fluconazole × rilpivirine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','rilpivirine','mineure','itraconazole × rilpivirine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','rilpivirine','mineure','ketoconazole × rilpivirine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rilpivirine','voriconazole','mineure','rilpivirine × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('posaconazole','rilpivirine','mineure','posaconazole × rilpivirine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rifampin','rilpivirine','contre_indication','rifampin × rilpivirine — Contre-indication : association déconseillée (risque grave documenté).')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
