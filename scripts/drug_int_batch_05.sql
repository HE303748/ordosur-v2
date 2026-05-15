-- drug_int_batch_05.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('metoclopramide','rivastigmine','mineure','metoclopramide × rivastigmine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','clopidogrel','mineure','bupropion × clopidogrel — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','ticlopidine','mineure','bupropion × ticlopidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','metoprolol','mineure','bupropion × metoprolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','flecainide','mineure','bupropion × flecainide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','phenytoin','mineure','bupropion × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','carbamazepine','mineure','bupropion × carbamazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','phenobarbital','mineure','bupropion × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','haloperidol','mineure','bupropion × haloperidol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','risperidone','mineure','bupropion × risperidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','fluoxetine','mineure','bupropion × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','sertraline','mineure','bupropion × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','paroxetine','mineure','bupropion × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','venlafaxine','mineure','bupropion × venlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','nortriptyline','mineure','bupropion × nortriptyline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine','bupropion','mineure','amphetamine × bupropion — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','lopinavir','mineure','bupropion × lopinavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','ritonavir','mineure','bupropion × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','efavirenz','mineure','bupropion × efavirenz — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','theophylline','mineure','bupropion × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','bupropion','mineure','alcohol × bupropion — Interaction mineure : association généralement possible, surveillance habituelle.'),
('tramadol','warfarin','mineure','tramadol × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','tramadol','mineure','digoxin × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','tramadol','mineure','erythromycin × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','tramadol','mineure','ketoconazole × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rifampin','tramadol','majeure','rifampin × tramadol — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('linezolid','tramadol','mineure','linezolid × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','tramadol','majeure','phenytoin × tramadol — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('carbamazepine','tramadol','mineure','carbamazepine × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('gabapentin','tramadol','mineure','gabapentin × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('pregabalin','tramadol','mineure','pregabalin × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','tramadol','mineure','fluoxetine × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paroxetine','tramadol','mineure','paroxetine × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','tramadol','mineure','bupropion × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mirtazapine','tramadol','mineure','mirtazapine × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('tramadol','trazodone','mineure','tramadol × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buprenorphine','tramadol','mineure','buprenorphine × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ritonavir','tramadol','mineure','ritonavir × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','tramadol','majeure','alcohol × tramadol — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('fluconazole','lorlatinib','contre_indication','fluconazole × lorlatinib — Contre-indication : association déconseillée (risque grave documenté).')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
