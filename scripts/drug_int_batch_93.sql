-- drug_int_batch_93.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('azathioprine','cyclophosphamide','modérée','azathioprine × cyclophosphamide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cyclophosphamide','etanercept','mineure','cyclophosphamide × etanercept — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','itraconazole','mineure','atorvastatin × itraconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','ketoconazole','mineure','atorvastatin × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','voriconazole','mineure','atorvastatin × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','posaconazole','mineure','atorvastatin × posaconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','rifampin','mineure','atorvastatin × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','colchicine','mineure','atorvastatin × colchicine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','cyclosporine','majeure','atorvastatin × cyclosporine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('atorvastatin','lopinavir','mineure','atorvastatin × lopinavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','ritonavir','mineure','atorvastatin × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','sofosbuvir','mineure','atorvastatin × sofosbuvir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','ledipasvir','mineure','atorvastatin × ledipasvir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','calcium','modérée','atorvastatin × calcium — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('atorvastatin','grapefruit juice','mineure','atorvastatin × grapefruit juice — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ambrisentan','cyclosporine','mineure','ambrisentan × cyclosporine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','isosorbide dinitrate','mineure','alcohol × isosorbide dinitrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','insulin','mineure','aspirin × insulin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','probenecid','mineure','aspirin × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','caffeine','majeure','aspirin × caffeine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('alcohol','aspirin','mineure','alcohol × aspirin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxycycline','tetracycline','mineure','doxycycline × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxycycline','minocycline','mineure','doxycycline × minocycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','doxycycline','mineure','calcium × doxycycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxycycline','iron','mineure','doxycycline × iron — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxycycline','magnesium','mineure','doxycycline × magnesium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','doxycycline','mineure','antacids × doxycycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('linezolid','norepinephrine bitartrate','majeure','linezolid × norepinephrine bitartrate — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('amitriptyline','norepinephrine bitartrate','majeure','amitriptyline × norepinephrine bitartrate — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('norepinephrine bitartrate','nortriptyline','majeure','norepinephrine bitartrate × nortriptyline — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('clomipramine','norepinephrine bitartrate','majeure','clomipramine × norepinephrine bitartrate — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('insulin','norepinephrine bitartrate','mineure','insulin × norepinephrine bitartrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','captopril','mineure','aspirin × captopril — Interaction mineure : association généralement possible, surveillance habituelle.'),
('captopril','indomethacin','mineure','captopril × indomethacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('captopril','hydrochlorothiazide','mineure','captopril × hydrochlorothiazide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('captopril','spironolactone','modérée','captopril × spironolactone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('captopril','nitroglycerin','mineure','captopril × nitroglycerin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('captopril','lithium','mineure','captopril × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('captopril','insulin','mineure','captopril × insulin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('captopril','probenecid','mineure','captopril × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
