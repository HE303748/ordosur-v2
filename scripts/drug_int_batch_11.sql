-- drug_int_batch_11.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('ofloxacin','sevelamer carbonate','modérée','ofloxacin × sevelamer carbonate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('levothyroxine','sevelamer carbonate','mineure','levothyroxine × sevelamer carbonate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','sevelamer carbonate','mineure','cyclosporine × sevelamer carbonate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sevelamer carbonate','tacrolimus','mineure','sevelamer carbonate × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mycophenolate','sevelamer carbonate','modérée','mycophenolate × sevelamer carbonate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('iron','sevelamer carbonate','modérée','iron × sevelamer carbonate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('aspirin','ibuprofen','mineure','aspirin × ibuprofen — Interaction mineure : association généralement possible, surveillance habituelle.'),
('simvastatin','warfarin','majeure','simvastatin × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('diltiazem','simvastatin','mineure','diltiazem × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','simvastatin','modérée','digoxin × simvastatin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('amiodarone','simvastatin','mineure','amiodarone × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dronedarone','simvastatin','mineure','dronedarone × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','simvastatin','mineure','clarithromycin × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','simvastatin','mineure','erythromycin × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','simvastatin','mineure','itraconazole × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','simvastatin','mineure','ketoconazole × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('simvastatin','voriconazole','mineure','simvastatin × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('posaconazole','simvastatin','mineure','posaconazole × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('daptomycin','simvastatin','mineure','daptomycin × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colchicine','simvastatin','mineure','colchicine × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','simvastatin','mineure','cyclosporine × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ritonavir','simvastatin','mineure','ritonavir × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','simvastatin','mineure','calcium × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('grapefruit juice','simvastatin','modérée','grapefruit juice × simvastatin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('diltiazem','propranolol','mineure','diltiazem × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','diltiazem','mineure','digoxin × diltiazem — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','pravastatin','mineure','diltiazem × pravastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','lovastatin','mineure','diltiazem × lovastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','ivabradine','mineure','diltiazem × ivabradine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonidine','diltiazem','mineure','clonidine × diltiazem — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','rifampin','mineure','diltiazem × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','diltiazem','mineure','carbamazepine × diltiazem — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','midazolam','mineure','diltiazem × midazolam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','diltiazem','mineure','cyclosporine × diltiazem — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','ranitidine','mineure','diltiazem × ranitidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','diltiazem','mineure','cimetidine × diltiazem — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','diltiazem','mineure','calcium × diltiazem — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','iron','majeure','diltiazem × iron — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('alcohol','diltiazem','mineure','alcohol × diltiazem — Interaction mineure : association généralement possible, surveillance habituelle.'),
('heparin','levothyroxine','mineure','heparin × levothyroxine — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
