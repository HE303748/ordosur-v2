-- drug_int_batch_37.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('cyclosporine','fluvastatin','mineure','cyclosporine × fluvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','carbinoxamine','mineure','alcohol × carbinoxamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','spironolactone','modérée','amlodipine × spironolactone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('amlodipine','rifampin','mineure','amlodipine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','lithium','mineure','amlodipine × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','insulin','mineure','amlodipine × insulin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','sirolimus','mineure','amlodipine × sirolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','everolimus','mineure','amlodipine × everolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','iron','modérée','amlodipine × iron — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alcohol','tiopronin','mineure','alcohol × tiopronin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclophosphamide','warfarin','mineure','cyclophosphamide × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclophosphamide','metronidazole','mineure','cyclophosphamide × metronidazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclophosphamide','cyclosporine','mineure','cyclophosphamide × cyclosporine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diclofenac','warfarin','majeure','diclofenac × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('aspirin','diclofenac','majeure','aspirin × diclofenac — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('diclofenac','meloxicam','mineure','diclofenac × meloxicam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diclofenac','propranolol','mineure','diclofenac × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diclofenac','furosemide','mineure','diclofenac × furosemide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diclofenac','digoxin','mineure','diclofenac × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diclofenac','lithium','mineure','diclofenac × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','diclofenac','mineure','cyclosporine × diclofenac — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diclofenac','methotrexate','modérée','diclofenac × methotrexate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('amiodarone','warfarin','majeure','amiodarone × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('amiodarone','diltiazem','mineure','amiodarone × diltiazem — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','verapamil','mineure','amiodarone × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','digoxin','mineure','amiodarone × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','flecainide','mineure','amiodarone × flecainide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','atorvastatin','mineure','amiodarone × atorvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','ivabradine','mineure','amiodarone × ivabradine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','clonidine','mineure','amiodarone × clonidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','lithium','majeure','amiodarone × lithium — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('amiodarone','phenytoin','mineure','amiodarone × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','fentanyl','mineure','amiodarone × fentanyl — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','cyclosporine','mineure','amiodarone × cyclosporine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','sofosbuvir','mineure','amiodarone × sofosbuvir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','cimetidine','mineure','amiodarone × cimetidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','cholestyramine','mineure','amiodarone × cholestyramine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','st. john''s wort','mineure','amiodarone × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','grapefruit juice','mineure','amiodarone × grapefruit juice — Interaction mineure : association généralement possible, surveillance habituelle.'),
('heparin','warfarin','mineure','heparin × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
