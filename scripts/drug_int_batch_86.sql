-- drug_int_batch_86.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('diltiazem','ponesimod','mineure','diltiazem × ponesimod — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ponesimod','verapamil','mineure','ponesimod × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','ponesimod','modérée','digoxin × ponesimod — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('amiodarone','ponesimod','majeure','amiodarone × ponesimod — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('ponesimod','sotalol','majeure','ponesimod × sotalol — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('calcium','ponesimod','mineure','calcium × ponesimod — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','fentanyl','mineure','erythromycin × fentanyl — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fentanyl','ketoconazole','mineure','fentanyl × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fentanyl','rifampin','mineure','fentanyl × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fentanyl','linezolid','mineure','fentanyl × linezolid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fentanyl','phenytoin','mineure','fentanyl × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','fentanyl','mineure','carbamazepine × fentanyl — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diazepam','fentanyl','mineure','diazepam × fentanyl — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fentanyl','mirtazapine','mineure','fentanyl × mirtazapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fentanyl','tramadol','mineure','fentanyl × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buprenorphine','fentanyl','mineure','buprenorphine × fentanyl — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fentanyl','ritonavir','mineure','fentanyl × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fentanyl','grapefruit juice','mineure','fentanyl × grapefruit juice — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','fentanyl','mineure','alcohol × fentanyl — Interaction mineure : association généralement possible, surveillance habituelle.'),
('felodipine','paclitaxel','mineure','felodipine × paclitaxel — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paclitaxel','simvastatin','mineure','paclitaxel × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lovastatin','paclitaxel','mineure','lovastatin × paclitaxel — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','paclitaxel','mineure','clarithromycin × paclitaxel — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','paclitaxel','mineure','itraconazole × paclitaxel — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','paclitaxel','mineure','ketoconazole × paclitaxel — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paclitaxel','rifampin','mineure','paclitaxel × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','paclitaxel','mineure','carbamazepine × paclitaxel — Interaction mineure : association généralement possible, surveillance habituelle.'),
('midazolam','paclitaxel','mineure','midazolam × paclitaxel — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paclitaxel','ritonavir','mineure','paclitaxel × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','paclitaxel','mineure','atazanavir × paclitaxel — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paclitaxel','sildenafil','mineure','paclitaxel × sildenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','paclitaxel','mineure','iron × paclitaxel — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrochlorothiazide','ramipril','mineure','hydrochlorothiazide × ramipril — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrochlorothiazide','telmisartan','mineure','hydrochlorothiazide × telmisartan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ciprofloxacin','phenytoin','majeure','ciprofloxacin × phenytoin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('ciprofloxacin','zolpidem','mineure','ciprofloxacin × zolpidem — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ciprofloxacin','glimepiride','majeure','ciprofloxacin × glimepiride — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('ciprofloxacin','probenecid','modérée','ciprofloxacin × probenecid — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ciprofloxacin','methotrexate','modérée','ciprofloxacin × methotrexate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ciprofloxacin','sildenafil','modérée','ciprofloxacin × sildenafil — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
