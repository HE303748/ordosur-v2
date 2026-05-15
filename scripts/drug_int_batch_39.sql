-- drug_int_batch_39.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('bupropion','digoxin','mineure','bupropion × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetaminophen','caffeine','mineure','acetaminophen × caffeine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('linezolid','methylphenidate','modérée','linezolid × methylphenidate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('calcium','methylphenidate','mineure','calcium × methylphenidate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','ticagrelor','mineure','deferasirox × ticagrelor — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','felodipine','mineure','deferasirox × felodipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','eplerenone','mineure','deferasirox × eplerenone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','dronedarone','mineure','deferasirox × dronedarone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','simvastatin','mineure','deferasirox × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','lovastatin','mineure','deferasirox × lovastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','rifampin','mineure','deferasirox × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','phenytoin','mineure','deferasirox × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','phenobarbital','mineure','deferasirox × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','midazolam','mineure','deferasirox × midazolam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','quetiapine','mineure','deferasirox × quetiapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','duloxetine','mineure','deferasirox × duloxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','fentanyl','mineure','deferasirox × fentanyl — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','melatonin','mineure','deferasirox × melatonin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','deferasirox','mineure','cyclosporine × deferasirox — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','tacrolimus','mineure','deferasirox × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','sirolimus','mineure','deferasirox × sirolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','everolimus','mineure','deferasirox × everolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','lopinavir','mineure','deferasirox × lopinavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','ritonavir','mineure','deferasirox × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','deferasirox','mineure','cholestyramine × deferasirox — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','theophylline','mineure','deferasirox × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('caffeine','deferasirox','mineure','caffeine × deferasirox — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','sildenafil','mineure','deferasirox × sildenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('deferasirox','iron','contre_indication','deferasirox × iron — Contre-indication : association déconseillée (risque grave documenté).'),
('antacids','deferasirox','contre_indication','antacids × deferasirox — Contre-indication : association déconseillée (risque grave documenté).'),
('anastrozole','warfarin','mineure','anastrozole × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','warfarin','mineure','phenytoin × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','ticlopidine','mineure','phenytoin × ticlopidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nifedipine','phenytoin','mineure','nifedipine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','verapamil','mineure','phenytoin × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','phenytoin','mineure','digoxin × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','phenytoin','mineure','atorvastatin × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','simvastatin','mineure','phenytoin × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxycycline','phenytoin','mineure','doxycycline × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','phenytoin','mineure','itraconazole × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
