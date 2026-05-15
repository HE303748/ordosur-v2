-- drug_int_batch_62.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('itraconazole','lidocaine, kenalog, povidone iodine','mineure','itraconazole × lidocaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','lidocaine, kenalog, povidone iodine','modérée','ketoconazole × lidocaine, kenalog, povidone iodine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lidocaine, kenalog, povidone iodine','rifampin','mineure','lidocaine, kenalog, povidone iodine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lidocaine, kenalog, povidone iodine','phenytoin','mineure','lidocaine, kenalog, povidone iodine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','lidocaine, kenalog, povidone iodine','mineure','carbamazepine × lidocaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrocortisone','lidocaine, kenalog, povidone iodine','mineure','hydrocortisone × lidocaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','lidocaine, kenalog, povidone iodine','mineure','cyclosporine × lidocaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lidocaine, kenalog, povidone iodine','ritonavir','mineure','lidocaine, kenalog, povidone iodine × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','lidocaine, kenalog, povidone iodine','mineure','atazanavir × lidocaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','lidocaine, kenalog, povidone iodine','mineure','cholestyramine × lidocaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carmustine','phenytoin','mineure','carmustine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carmustine','phenobarbital','mineure','carmustine × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carmustine','cimetidine','mineure','carmustine × cimetidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('meloxicam','warfarin','majeure','meloxicam × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('aspirin','meloxicam','majeure','aspirin × meloxicam — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('meloxicam','propranolol','mineure','meloxicam × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','meloxicam','mineure','furosemide × meloxicam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','meloxicam','mineure','lithium × meloxicam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','meloxicam','mineure','cyclosporine × meloxicam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('meloxicam','methotrexate','modérée','meloxicam × methotrexate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ibuprofen','metformin','mineure','ibuprofen × metformin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metformin','propranolol','mineure','metformin × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metformin','nifedipine','mineure','metformin × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','metformin','mineure','furosemide × metformin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metformin','vancomycin','mineure','metformin × vancomycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metformin','trimethoprim','mineure','metformin × trimethoprim — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metformin','morphine','mineure','metformin × morphine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metformin','probenecid','mineure','metformin × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metformin','ranitidine','mineure','metformin × ranitidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('linezolid','oxymorphone','mineure','linezolid × oxymorphone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('gabapentin','oxymorphone','mineure','gabapentin × oxymorphone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mirtazapine','oxymorphone','mineure','mirtazapine × oxymorphone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('oxymorphone','trazodone','mineure','oxymorphone × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('oxymorphone','tramadol','mineure','oxymorphone × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buprenorphine','oxymorphone','mineure','buprenorphine × oxymorphone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','oxymorphone','mineure','cimetidine × oxymorphone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','oxymorphone','majeure','alcohol × oxymorphone — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('albendazole','dexamethasone','mineure','albendazole × dexamethasone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('albendazole','cimetidine','mineure','albendazole × cimetidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('albendazole','theophylline','modérée','albendazole × theophylline — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
