-- drug_int_batch_79.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('phenobarbital','rufinamide','mineure','phenobarbital × rufinamide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lamotrigine','rufinamide','mineure','lamotrigine × rufinamide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rufinamide','topiramate','mineure','rufinamide × topiramate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dulaglutide','warfarin','mineure','dulaglutide × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dulaglutide','insulin','mineure','dulaglutide × insulin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','tacrolimus','mineure','calcium × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ampicillin trihydrate','erythromycin','mineure','ampicillin trihydrate × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ampicillin trihydrate','tetracycline','mineure','ampicillin trihydrate × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('allopurinol','ampicillin trihydrate','mineure','allopurinol × ampicillin trihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ampicillin trihydrate','probenecid','mineure','ampicillin trihydrate × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fosinopril','warfarin','mineure','fosinopril × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','fosinopril','mineure','aspirin × fosinopril — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fosinopril','propranolol','mineure','fosinopril × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fosinopril','nifedipine','mineure','fosinopril × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fosinopril','hydrochlorothiazide','mineure','fosinopril × hydrochlorothiazide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('chlorthalidone','fosinopril','mineure','chlorthalidone × fosinopril — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','fosinopril','mineure','digoxin × fosinopril — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fosinopril','lithium','mineure','fosinopril × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fosinopril','sirolimus','modérée','fosinopril × sirolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cimetidine','fosinopril','mineure','cimetidine × fosinopril — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fosinopril','metoclopramide','mineure','fosinopril × metoclopramide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fosinopril','magnesium','mineure','fosinopril × magnesium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','fosinopril','mineure','antacids × fosinopril — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluvoxamine','warfarin','mineure','fluvoxamine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','fluvoxamine','mineure','aspirin × fluvoxamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atenolol','fluvoxamine','mineure','atenolol × fluvoxamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','fluvoxamine','mineure','diltiazem × fluvoxamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','fluvoxamine','mineure','digoxin × fluvoxamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluvoxamine','ketoconazole','mineure','fluvoxamine × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluvoxamine','lithium','modérée','fluvoxamine × lithium — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('fluvoxamine','lorazepam','mineure','fluvoxamine × lorazepam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','fluvoxamine','mineure','fluoxetine × fluvoxamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluvoxamine','paroxetine','mineure','fluvoxamine × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amitriptyline','fluvoxamine','majeure','amitriptyline × fluvoxamine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('clomipramine','fluvoxamine','majeure','clomipramine × fluvoxamine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('fluvoxamine','omeprazole','mineure','fluvoxamine × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','fluvoxamine','mineure','alcohol × fluvoxamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','ticagrelor','mineure','digoxin × ticagrelor — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','paroxetine','mineure','digoxin × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','paroxetine','mineure','ketoconazole × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
