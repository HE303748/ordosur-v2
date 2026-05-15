-- drug_int_batch_46.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('felodipine','magnesium heptahydrate','modérée','felodipine × magnesium heptahydrate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cyclosporine','magnesium heptahydrate','mineure','cyclosporine × magnesium heptahydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','magnesium heptahydrate','mineure','calcium × magnesium heptahydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','magnesium heptahydrate','mineure','alcohol × magnesium heptahydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dipyridamole','regadenoson','mineure','dipyridamole × regadenoson — Interaction mineure : association généralement possible, surveillance habituelle.'),
('regadenoson','theophylline','mineure','regadenoson × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aminophylline','regadenoson','mineure','aminophylline × regadenoson — Interaction mineure : association généralement possible, surveillance habituelle.'),
('caffeine','regadenoson','mineure','caffeine × regadenoson — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','regadenoson','mineure','calcium × regadenoson — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','warfarin','mineure','buspirone × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','buspirone','mineure','aspirin × buspirone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','ibuprofen','mineure','buspirone × ibuprofen — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','propranolol','mineure','buspirone × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','diltiazem','mineure','buspirone × diltiazem — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','verapamil','mineure','buspirone × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','digoxin','mineure','buspirone × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','erythromycin','mineure','buspirone × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','itraconazole','mineure','buspirone × itraconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','ketoconazole','mineure','buspirone × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','rifampin','mineure','buspirone × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','linezolid','contre_indication','buspirone × linezolid — Contre-indication : association déconseillée (risque grave documenté).'),
('buspirone','phenytoin','mineure','buspirone × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','carbamazepine','mineure','buspirone × carbamazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','phenobarbital','mineure','buspirone × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','diazepam','mineure','buspirone × diazepam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','haloperidol','mineure','buspirone × haloperidol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amitriptyline','buspirone','mineure','amitriptyline × buspirone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','nortriptyline','mineure','buspirone × nortriptyline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','trazodone','mineure','buspirone × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','levothyroxine','mineure','buspirone × levothyroxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','dexamethasone','mineure','buspirone × dexamethasone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','ritonavir','mineure','buspirone × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','cimetidine','mineure','buspirone × cimetidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buspirone','grapefruit juice','mineure','buspirone × grapefruit juice — Interaction mineure : association généralement possible, surveillance habituelle.'),
('torsemide','warfarin','modérée','torsemide × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('celecoxib','torsemide','modérée','celecoxib × torsemide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('indomethacin','torsemide','mineure','indomethacin × torsemide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','torsemide','mineure','amiodarone × torsemide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','torsemide','mineure','fluconazole × torsemide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rifampin','torsemide','mineure','rifampin × torsemide — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
