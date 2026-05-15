-- drug_int_batch_74.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('ciprofloxacin','clozapine','mineure','ciprofloxacin × clozapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','moxifloxacin','mineure','clozapine × moxifloxacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','ofloxacin','mineure','clozapine × ofloxacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','erythromycin','mineure','clozapine × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','rifampin','mineure','clozapine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','ziprasidone','mineure','clozapine × ziprasidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','sertraline','mineure','clozapine × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('citalopram','clozapine','mineure','citalopram × clozapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','escitalopram','mineure','clozapine × escitalopram — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','paroxetine','mineure','clozapine × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','fluvoxamine','mineure','clozapine × fluvoxamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','duloxetine','mineure','clozapine × duloxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','clozapine','mineure','bupropion × clozapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','tacrolimus','modérée','clozapine × tacrolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cimetidine','clozapine','mineure','cimetidine × clozapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('caffeine','clozapine','modérée','caffeine × clozapine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('erythromycin','methadone','mineure','erythromycin × methadone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','methadone','mineure','fluconazole × methadone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','methadone','mineure','ketoconazole × methadone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methadone','rifampin','mineure','methadone × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('linezolid','methadone','mineure','linezolid × methadone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methadone','phenytoin','mineure','methadone × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','methadone','mineure','carbamazepine × methadone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methadone','phenobarbital','majeure','methadone × phenobarbital — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('gabapentin','methadone','mineure','gabapentin × methadone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methadone','pregabalin','mineure','methadone × pregabalin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methadone','sertraline','mineure','methadone × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluvoxamine','methadone','mineure','fluvoxamine × methadone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methadone','mirtazapine','mineure','methadone × mirtazapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methadone','trazodone','mineure','methadone × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methadone','tramadol','mineure','methadone × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buprenorphine','methadone','mineure','buprenorphine × methadone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lopinavir','methadone','mineure','lopinavir × methadone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methadone','ritonavir','mineure','methadone × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('efavirenz','methadone','mineure','efavirenz × methadone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','methadone','mineure','calcium × methadone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','methadone','majeure','alcohol × methadone — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('cyclosporine','potassium','majeure','cyclosporine × potassium — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('potassium','tacrolimus','majeure','potassium × tacrolimus — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('acetaminophen','gabapentin','majeure','acetaminophen × gabapentin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
