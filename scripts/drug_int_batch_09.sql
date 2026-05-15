-- drug_int_batch_09.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('atorvastatin','verapamil','mineure','atorvastatin × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('simvastatin','verapamil','mineure','simvastatin × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lovastatin','verapamil','mineure','lovastatin × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonidine','verapamil','mineure','clonidine × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','verapamil','mineure','erythromycin × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rifampin','verapamil','mineure','rifampin × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','verapamil','mineure','lithium × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','verapamil','mineure','carbamazepine × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenobarbital','verapamil','mineure','phenobarbital × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','verapamil','mineure','cyclosporine × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ritonavir','verapamil','mineure','ritonavir × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','verapamil','mineure','cimetidine × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('theophylline','verapamil','mineure','theophylline × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','verapamil','mineure','calcium × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('grapefruit juice','verapamil','mineure','grapefruit juice × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','verapamil','mineure','alcohol × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ampicillin','probenecid','mineure','ampicillin × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('propranolol','ziprasidone','modérée','propranolol × ziprasidone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ketoconazole','ziprasidone','mineure','ketoconazole × ziprasidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','ziprasidone','majeure','lithium × ziprasidone — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('carbamazepine','ziprasidone','mineure','carbamazepine × ziprasidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('valproate','ziprasidone','mineure','valproate × ziprasidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lorazepam','ziprasidone','modérée','lorazepam × ziprasidone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('amphetamine','ziprasidone','majeure','amphetamine × ziprasidone — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('cimetidine','ziprasidone','mineure','cimetidine × ziprasidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','ziprasidone','majeure','iron × ziprasidone — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('antacids','ziprasidone','mineure','antacids × ziprasidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','glipizide','mineure','fluconazole × glipizide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glipizide','phenytoin','mineure','glipizide × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glipizide','probenecid','mineure','glipizide × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','glipizide','mineure','calcium × glipizide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clopidogrel bisulfate','warfarin','majeure','clopidogrel bisulfate × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('clopidogrel bisulfate','rifampin','majeure','clopidogrel bisulfate × rifampin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('clopidogrel bisulfate','morphine','mineure','clopidogrel bisulfate × morphine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clopidogrel bisulfate','omeprazole','contre_indication','clopidogrel bisulfate × omeprazole — Contre-indication : association déconseillée (risque grave documenté).'),
('clopidogrel bisulfate','pantoprazole','modérée','clopidogrel bisulfate × pantoprazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clopidogrel bisulfate','esomeprazole','contre_indication','clopidogrel bisulfate × esomeprazole — Contre-indication : association déconseillée (risque grave documenté).'),
('clopidogrel bisulfate','lansoprazole','modérée','clopidogrel bisulfate × lansoprazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('entecavir','tenofovir','mineure','entecavir × tenofovir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('entecavir','lamivudine','mineure','entecavir × lamivudine — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
