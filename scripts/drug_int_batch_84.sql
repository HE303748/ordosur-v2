-- drug_int_batch_84.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('ritonavir','triamcinolone acetonide','mineure','ritonavir × triamcinolone acetonide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','triamcinolone acetonide','mineure','atazanavir × triamcinolone acetonide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','triamcinolone acetonide','mineure','cholestyramine × triamcinolone acetonide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nefazodone','warfarin','majeure','nefazodone × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('nefazodone','propranolol','mineure','nefazodone × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','nefazodone','mineure','digoxin × nefazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','nefazodone','mineure','atorvastatin × nefazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nefazodone','simvastatin','mineure','nefazodone × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nefazodone','pravastatin','modérée','nefazodone × pravastatin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lovastatin','nefazodone','mineure','lovastatin × nefazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','nefazodone','mineure','lithium × nefazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nefazodone','phenytoin','mineure','nefazodone × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','nefazodone','mineure','carbamazepine × nefazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','nefazodone','mineure','alprazolam × nefazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lorazepam','nefazodone','mineure','lorazepam × nefazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('haloperidol','nefazodone','mineure','haloperidol × nefazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','nefazodone','mineure','fluoxetine × nefazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','nefazodone','mineure','cyclosporine × nefazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nefazodone','tacrolimus','mineure','nefazodone × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','nefazodone','mineure','cimetidine × nefazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nefazodone','theophylline','mineure','nefazodone × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','nefazodone','mineure','iron × nefazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','nefazodone','mineure','alcohol × nefazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nifedipine','posaconazole','mineure','nifedipine × posaconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','posaconazole','mineure','diltiazem × posaconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('posaconazole','verapamil','mineure','posaconazole × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('felodipine','posaconazole','mineure','felodipine × posaconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','posaconazole','modérée','digoxin × posaconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alprazolam','posaconazole','mineure','alprazolam × posaconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('midazolam','posaconazole','mineure','midazolam × posaconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glipizide','posaconazole','modérée','glipizide × posaconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cyclosporine','posaconazole','mineure','cyclosporine × posaconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('posaconazole','sirolimus','mineure','posaconazole × sirolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('posaconazole','ritonavir','mineure','posaconazole × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','posaconazole','mineure','atazanavir × posaconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('efavirenz','posaconazole','mineure','efavirenz × posaconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('omeprazole','posaconazole','mineure','omeprazole × posaconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('esomeprazole','posaconazole','mineure','esomeprazole × posaconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','posaconazole','mineure','cimetidine × posaconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metoclopramide','posaconazole','modérée','metoclopramide × posaconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
