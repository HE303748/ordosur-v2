-- drug_int_batch_96.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('acetaminophen','warfarin','mineure','acetaminophen × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colchicine','diltiazem','mineure','colchicine × diltiazem — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colchicine','verapamil','mineure','colchicine × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colchicine','digoxin','mineure','colchicine × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('azithromycin','colchicine','mineure','azithromycin × colchicine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colchicine','ketoconazole','mineure','colchicine × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colchicine','cyclosporine','mineure','colchicine × cyclosporine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colchicine','ritonavir','mineure','colchicine × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colchicine','theophylline','mineure','colchicine × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colchicine','grapefruit juice','mineure','colchicine × grapefruit juice — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amantadine','hydrochlorothiazide','mineure','amantadine × hydrochlorothiazide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('raloxifene','warfarin','modérée','raloxifene × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('digoxin','raloxifene','mineure','digoxin × raloxifene — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amoxicillin','raloxifene','mineure','amoxicillin × raloxifene — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ampicillin','raloxifene','mineure','ampicillin × raloxifene — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diazepam','raloxifene','mineure','diazepam × raloxifene — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','raloxifene','mineure','cholestyramine × raloxifene — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','raloxifene','mineure','antacids × raloxifene — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','paricalcitol','mineure','clarithromycin × paricalcitol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','paricalcitol','mineure','itraconazole × paricalcitol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','paricalcitol','mineure','ketoconazole × paricalcitol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paricalcitol','voriconazole','mineure','paricalcitol × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paricalcitol','posaconazole','mineure','paricalcitol × posaconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lopinavir','paricalcitol','mineure','lopinavir × paricalcitol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paricalcitol','ritonavir','mineure','paricalcitol × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','paricalcitol','mineure','cholestyramine × paricalcitol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','paricalcitol','modérée','calcium × paricalcitol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('grapefruit juice','paricalcitol','mineure','grapefruit juice × paricalcitol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','sotalol','mineure','diltiazem × sotalol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sotalol','verapamil','mineure','sotalol × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','sotalol','modérée','amiodarone × sotalol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clonidine','sotalol','modérée','clonidine × sotalol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('insulin','sotalol','mineure','insulin × sotalol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','sotalol','modérée','calcium × sotalol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('magnesium','sotalol','mineure','magnesium × sotalol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','sotalol','mineure','antacids × sotalol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('empagliflozin','lithium','mineure','empagliflozin × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('empagliflozin','phenytoin','mineure','empagliflozin × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('empagliflozin','topiramate','mineure','empagliflozin × topiramate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('empagliflozin','metformin','mineure','empagliflozin × metformin — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
