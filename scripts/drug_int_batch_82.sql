-- drug_int_batch_82.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('liothyronine','propranolol','mineure','liothyronine × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','liothyronine','mineure','furosemide × liothyronine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','liothyronine','mineure','amiodarone × liothyronine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('liothyronine','rifampin','mineure','liothyronine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('liothyronine','phenytoin','mineure','liothyronine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','liothyronine','mineure','carbamazepine × liothyronine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('liothyronine','phenobarbital','mineure','liothyronine × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('liothyronine','sertraline','mineure','liothyronine × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amitriptyline','liothyronine','mineure','amitriptyline × liothyronine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin','liothyronine','mineure','insulin × liothyronine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levothyroxine','liothyronine','mineure','levothyroxine × liothyronine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dexamethasone','liothyronine','mineure','dexamethasone × liothyronine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','liothyronine','mineure','cholestyramine × liothyronine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('folic acid','tetracycline','mineure','folic acid × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('folic acid','nitrofurantoin','mineure','folic acid × nitrofurantoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','folic acid','mineure','alcohol × folic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clopidogrel','nifedipine','modérée','clopidogrel × nifedipine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('diltiazem','nifedipine','mineure','diltiazem × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nifedipine','verapamil','mineure','nifedipine × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('irbesartan','nifedipine','mineure','irbesartan × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('candesartan','nifedipine','mineure','candesartan × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('flecainide','nifedipine','mineure','flecainide × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxazosin','nifedipine','mineure','doxazosin × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('azithromycin','nifedipine','mineure','azithromycin × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','nifedipine','mineure','clarithromycin × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','nifedipine','mineure','erythromycin × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','nifedipine','mineure','itraconazole × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','nifedipine','mineure','ketoconazole × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','nifedipine','mineure','carbamazepine × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nifedipine','phenobarbital','mineure','nifedipine × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','nifedipine','mineure','fluoxetine × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nifedipine','ritonavir','mineure','nifedipine × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','nifedipine','mineure','calcium × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('grapefruit juice','nifedipine','mineure','grapefruit juice × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('gemfibrozil','warfarin','modérée','gemfibrozil × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('gemfibrozil','valsartan','mineure','gemfibrozil × valsartan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','gemfibrozil','mineure','atorvastatin × gemfibrozil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('gemfibrozil','simvastatin','contre_indication','gemfibrozil × simvastatin — Contre-indication : association déconseillée (risque grave documenté).'),
('gemfibrozil','rosuvastatin','contre_indication','gemfibrozil × rosuvastatin — Contre-indication : association déconseillée (risque grave documenté).'),
('gemfibrozil','pravastatin','mineure','gemfibrozil × pravastatin — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
