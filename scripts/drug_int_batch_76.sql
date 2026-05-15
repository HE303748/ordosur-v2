-- drug_int_batch_76.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('digoxin','escitalopram','mineure','digoxin × escitalopram — Interaction mineure : association généralement possible, surveillance habituelle.'),
('escitalopram','ketoconazole','mineure','escitalopram × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('escitalopram','fluoxetine','mineure','escitalopram × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('escitalopram','sertraline','mineure','escitalopram × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('escitalopram','paroxetine','mineure','escitalopram × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('escitalopram','fluvoxamine','mineure','escitalopram × fluvoxamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('escitalopram','ritonavir','mineure','escitalopram × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','escitalopram','mineure','cimetidine × escitalopram — Interaction mineure : association généralement possible, surveillance habituelle.'),
('escitalopram','theophylline','mineure','escitalopram × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','escitalopram','mineure','alcohol × escitalopram — Interaction mineure : association généralement possible, surveillance habituelle.'),
('flecainide','nortriptyline','mineure','flecainide × nortriptyline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','nortriptyline','mineure','fluoxetine × nortriptyline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nortriptyline','sertraline','mineure','nortriptyline × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nortriptyline','paroxetine','mineure','nortriptyline × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','nortriptyline','modérée','cimetidine × nortriptyline — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alcohol','nortriptyline','mineure','alcohol × nortriptyline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','atenolol','mineure','aspirin × atenolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atenolol','indomethacin','mineure','atenolol × indomethacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','atenolol','mineure','amiodarone × atenolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atenolol','clonidine','mineure','atenolol × clonidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atenolol','calcium','mineure','atenolol × calcium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin propylene glycol solvate','digoxin','modérée','atorvastatin propylene glycol solvate × digoxin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('atorvastatin propylene glycol solvate','clarithromycin','mineure','atorvastatin propylene glycol solvate × clarithromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin propylene glycol solvate','erythromycin','mineure','atorvastatin propylene glycol solvate × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin propylene glycol solvate','itraconazole','mineure','atorvastatin propylene glycol solvate × itraconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin propylene glycol solvate','ketoconazole','mineure','atorvastatin propylene glycol solvate × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin propylene glycol solvate','voriconazole','mineure','atorvastatin propylene glycol solvate × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin propylene glycol solvate','posaconazole','mineure','atorvastatin propylene glycol solvate × posaconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin propylene glycol solvate','rifampin','mineure','atorvastatin propylene glycol solvate × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin propylene glycol solvate','colchicine','mineure','atorvastatin propylene glycol solvate × colchicine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin propylene glycol solvate','cyclosporine','majeure','atorvastatin propylene glycol solvate × cyclosporine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('atorvastatin propylene glycol solvate','lopinavir','mineure','atorvastatin propylene glycol solvate × lopinavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin propylene glycol solvate','ritonavir','mineure','atorvastatin propylene glycol solvate × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin propylene glycol solvate','sofosbuvir','mineure','atorvastatin propylene glycol solvate × sofosbuvir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin propylene glycol solvate','ledipasvir','mineure','atorvastatin propylene glycol solvate × ledipasvir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin propylene glycol solvate','calcium','modérée','atorvastatin propylene glycol solvate × calcium — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('atorvastatin propylene glycol solvate','grapefruit juice','modérée','atorvastatin propylene glycol solvate × grapefruit juice — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('dipyridamole','metoprolol','modérée','dipyridamole × metoprolol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('hydralazine','metoprolol','mineure','hydralazine × metoprolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('haloperidol','metoprolol','modérée','haloperidol × metoprolol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
