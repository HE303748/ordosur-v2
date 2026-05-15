-- drug_int_batch_56.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('carbamazepine','ketoconazole','mineure','carbamazepine × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('articaine','nitroglycerin','modérée','articaine × nitroglycerin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('articaine','nitrofurantoin','majeure','articaine × nitrofurantoin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('articaine','phenytoin','majeure','articaine × phenytoin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('articaine','valproate','majeure','articaine × valproate — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('articaine','phenobarbital','majeure','articaine × phenobarbital — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('articaine','chloroquine','majeure','articaine × chloroquine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('articaine','metoclopramide','majeure','articaine × metoclopramide — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('piperacillin','vancomycin','mineure','piperacillin × vancomycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nafcillin','warfarin','mineure','nafcillin × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nafcillin','tetracycline','mineure','nafcillin × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','nafcillin','mineure','cyclosporine × nafcillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ramipril','sirolimus','modérée','ramipril × sirolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alcohol','secnidazole','mineure','alcohol × secnidazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('tolterodine','warfarin','mineure','tolterodine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','tolterodine','mineure','furosemide × tolterodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrochlorothiazide','tolterodine','mineure','hydrochlorothiazide × tolterodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','tolterodine','mineure','clarithromycin × tolterodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','tolterodine','mineure','itraconazole × tolterodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','tolterodine','mineure','ketoconazole × tolterodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','tolterodine','mineure','fluoxetine × tolterodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ritonavir','tolterodine','mineure','ritonavir × tolterodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('omeprazole','tolterodine','mineure','omeprazole × tolterodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('caffeine','tolterodine','mineure','caffeine × tolterodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('naloxone','oxycodone','mineure','naloxone × oxycodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','terazosin','mineure','aspirin × terazosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ibuprofen','terazosin','mineure','ibuprofen × terazosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('indomethacin','terazosin','mineure','indomethacin × terazosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atenolol','terazosin','mineure','atenolol × terazosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('propranolol','terazosin','mineure','propranolol × terazosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrochlorothiazide','terazosin','mineure','hydrochlorothiazide × terazosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','terazosin','mineure','erythromycin × terazosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('terazosin','trimethoprim','mineure','terazosin × trimethoprim — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sulfamethoxazole','terazosin','mineure','sulfamethoxazole × terazosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diazepam','terazosin','mineure','diazepam × terazosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('codeine','terazosin','mineure','codeine × terazosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('allopurinol','terazosin','mineure','allopurinol × terazosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','terazosin','mineure','antacids × terazosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetaminophen','buprenorphine','mineure','acetaminophen × buprenorphine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levoleucovorin','trimethoprim','modérée','levoleucovorin × trimethoprim — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
