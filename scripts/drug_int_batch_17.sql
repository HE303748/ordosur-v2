-- drug_int_batch_17.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('docetaxel','ritonavir','mineure','docetaxel × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonidine','haloperidol','mineure','clonidine × haloperidol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amitriptyline','clonidine','mineure','amitriptyline × clonidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','clonidine','mineure','calcium × clonidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','clonidine','mineure','alcohol × clonidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('tadalafil','warfarin','mineure','tadalafil × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','tadalafil','majeure','aspirin × tadalafil — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('metoprolol','tadalafil','mineure','metoprolol × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','tadalafil','mineure','amlodipine × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('enalapril','tadalafil','mineure','enalapril × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','tadalafil','mineure','digoxin × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lovastatin','tadalafil','mineure','lovastatin × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxazosin','tadalafil','mineure','doxazosin × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','tadalafil','mineure','erythromycin × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','tadalafil','mineure','itraconazole × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','tadalafil','mineure','ketoconazole × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rifampin','tadalafil','mineure','rifampin × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','tadalafil','mineure','phenytoin × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','tadalafil','mineure','carbamazepine × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenobarbital','tadalafil','mineure','phenobarbital × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('midazolam','tadalafil','mineure','midazolam × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ritonavir','tadalafil','mineure','ritonavir × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('tadalafil','theophylline','mineure','tadalafil × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('tadalafil','tamsulosin','mineure','tadalafil × tamsulosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('magnesium','tadalafil','mineure','magnesium × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('grapefruit juice','tadalafil','mineure','grapefruit juice × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','tadalafil','mineure','alcohol × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','tadalafil','mineure','antacids × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amoxicillin','probenecid','mineure','amoxicillin × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('baclofen','morphine','mineure','baclofen × morphine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cefazolin','probenecid','mineure','cefazolin × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','norgestimate and ethinyl estradiol','mineure','atorvastatin × norgestimate and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norgestimate and ethinyl estradiol','rosuvastatin','mineure','norgestimate and ethinyl estradiol × rosuvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','norgestimate and ethinyl estradiol','mineure','fluconazole × norgestimate and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','norgestimate and ethinyl estradiol','mineure','itraconazole × norgestimate and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','norgestimate and ethinyl estradiol','mineure','ketoconazole × norgestimate and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norgestimate and ethinyl estradiol','voriconazole','mineure','norgestimate and ethinyl estradiol × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norgestimate and ethinyl estradiol','rifampin','mineure','norgestimate and ethinyl estradiol × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norgestimate and ethinyl estradiol','phenytoin','mineure','norgestimate and ethinyl estradiol × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','norgestimate and ethinyl estradiol','mineure','carbamazepine × norgestimate and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
