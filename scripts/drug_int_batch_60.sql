-- drug_int_batch_60.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('diazepam','propranolol','mineure','diazepam × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','propranolol','mineure','alprazolam × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lorazepam','propranolol','mineure','lorazepam × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','propranolol','mineure','fluoxetine × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paroxetine','propranolol','mineure','paroxetine × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluvoxamine','propranolol','mineure','fluvoxamine × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('propranolol','ritonavir','mineure','propranolol × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lansoprazole','propranolol','mineure','lansoprazole × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('propranolol','ranitidine','mineure','propranolol × ranitidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','propranolol','mineure','cimetidine × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metoclopramide','propranolol','mineure','metoclopramide × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxazosin','sildenafil','mineure','doxazosin × sildenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phentermine','topiramate','mineure','phentermine × topiramate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('letrozole','warfarin','modérée','letrozole × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cimetidine','letrozole','modérée','cimetidine × letrozole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('nicardipine','warfarin','mineure','nicardipine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dipyridamole','nicardipine','mineure','dipyridamole × nicardipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('naproxen','nicardipine','mineure','naproxen × nicardipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nicardipine','propranolol','mineure','nicardipine × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','nicardipine','mineure','furosemide × nicardipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','nicardipine','mineure','digoxin × nicardipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fentanyl','nicardipine','majeure','fentanyl × nicardipine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('cyclosporine','nicardipine','mineure','cyclosporine × nicardipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nicardipine','tacrolimus','mineure','nicardipine × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','nicardipine','mineure','cimetidine × nicardipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','nicardipine','mineure','calcium × nicardipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','drospirenone and ethinyl estradiol','mineure','diltiazem × drospirenone and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('drospirenone and ethinyl estradiol','verapamil','mineure','drospirenone and ethinyl estradiol × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('drospirenone and ethinyl estradiol','enalapril','mineure','drospirenone and ethinyl estradiol × enalapril — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','drospirenone and ethinyl estradiol','mineure','atorvastatin × drospirenone and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('drospirenone and ethinyl estradiol','simvastatin','mineure','drospirenone and ethinyl estradiol × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','drospirenone and ethinyl estradiol','mineure','clarithromycin × drospirenone and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('drospirenone and ethinyl estradiol','erythromycin','mineure','drospirenone and ethinyl estradiol × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('drospirenone and ethinyl estradiol','fluconazole','mineure','drospirenone and ethinyl estradiol × fluconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('drospirenone and ethinyl estradiol','itraconazole','mineure','drospirenone and ethinyl estradiol × itraconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('drospirenone and ethinyl estradiol','ketoconazole','mineure','drospirenone and ethinyl estradiol × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('drospirenone and ethinyl estradiol','voriconazole','mineure','drospirenone and ethinyl estradiol × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('drospirenone and ethinyl estradiol','rifampin','mineure','drospirenone and ethinyl estradiol × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('drospirenone and ethinyl estradiol','phenytoin','mineure','drospirenone and ethinyl estradiol × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','drospirenone and ethinyl estradiol','mineure','carbamazepine × drospirenone and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
