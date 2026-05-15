-- drug_int_batch_40.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('ketoconazole','phenytoin','mineure','ketoconazole × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','voriconazole','mineure','phenytoin × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','posaconazole','mineure','phenytoin × posaconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','rifampin','mineure','phenytoin × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','trimethoprim','mineure','phenytoin × trimethoprim — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','sulfamethoxazole','mineure','phenytoin × sulfamethoxazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','phenytoin','mineure','carbamazepine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','valproic acid','mineure','phenytoin × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','valproate','mineure','phenytoin × valproate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenobarbital','phenytoin','mineure','phenobarbital × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('oxcarbazepine','phenytoin','mineure','oxcarbazepine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','phenytoin','mineure','clozapine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paroxetine','phenytoin','mineure','paroxetine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluvoxamine','phenytoin','mineure','fluvoxamine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methylphenidate','phenytoin','mineure','methylphenidate × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','phenytoin','mineure','cyclosporine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methotrexate','phenytoin','mineure','methotrexate × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lopinavir','phenytoin','mineure','lopinavir × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','ritonavir','mineure','phenytoin × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('efavirenz','phenytoin','mineure','efavirenz × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','phenytoin','mineure','cimetidine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','theophylline','mineure','phenytoin × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','phenytoin','mineure','calcium × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('folic acid','phenytoin','mineure','folic acid × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','phenytoin','mineure','alcohol × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','ibuprofen','mineure','digoxin × ibuprofen — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','nifedipine','mineure','digoxin × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('captopril','digoxin','mineure','captopril × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','telmisartan','mineure','digoxin × telmisartan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','spironolactone','mineure','digoxin × spironolactone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','sotalol','majeure','digoxin × sotalol — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('digoxin','dronedarone','mineure','digoxin × dronedarone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','digoxin','mineure','atorvastatin × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','ivabradine','modérée','digoxin × ivabradine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('azithromycin','digoxin','mineure','azithromycin × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','digoxin','mineure','clarithromycin × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','tetracycline','mineure','digoxin × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','gentamicin','mineure','digoxin × gentamicin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','itraconazole','mineure','digoxin × itraconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','ketoconazole','mineure','digoxin × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
