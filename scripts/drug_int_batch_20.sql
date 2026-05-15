-- drug_int_batch_20.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('carvedilol','verapamil','modérée','carvedilol × verapamil — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('carvedilol','digoxin','mineure','carvedilol × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','carvedilol','mineure','amiodarone × carvedilol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carvedilol','clonidine','majeure','carvedilol × clonidine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('carvedilol','fluconazole','mineure','carvedilol × fluconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carvedilol','rifampin','mineure','carvedilol × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carvedilol','fluoxetine','mineure','carvedilol × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carvedilol','paroxetine','mineure','carvedilol × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carvedilol','insulin','mineure','carvedilol × insulin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carvedilol','cyclosporine','mineure','carvedilol × cyclosporine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carvedilol','cimetidine','mineure','carvedilol × cimetidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','carvedilol','modérée','calcium × carvedilol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('eszopiclone','lorazepam','mineure','eszopiclone × lorazepam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('eszopiclone','paroxetine','mineure','eszopiclone × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('chlorthalidone','insulin','mineure','chlorthalidone × insulin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('trandolapril','warfarin','mineure','trandolapril × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','trandolapril','modérée','furosemide × trandolapril — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('spironolactone','trandolapril','modérée','spironolactone × trandolapril — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('digoxin','trandolapril','modérée','digoxin × trandolapril — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('sacubitril','trandolapril','modérée','sacubitril × trandolapril — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lithium','trandolapril','mineure','lithium × trandolapril — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin','trandolapril','modérée','insulin × trandolapril — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('sirolimus','trandolapril','modérée','sirolimus × trandolapril — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('everolimus','trandolapril','modérée','everolimus × trandolapril — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cimetidine','trandolapril','modérée','cimetidine × trandolapril — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('iron','trandolapril','modérée','iron × trandolapril — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('codeine','erythromycin','mineure','codeine × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('codeine','ketoconazole','mineure','codeine × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('codeine','rifampin','mineure','codeine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('codeine','linezolid','mineure','codeine × linezolid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('codeine','phenytoin','mineure','codeine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','codeine','mineure','carbamazepine × codeine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('codeine','gabapentin','mineure','codeine × gabapentin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('codeine','pregabalin','mineure','codeine × pregabalin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('codeine','fluoxetine','mineure','codeine × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('codeine','paroxetine','mineure','codeine × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','codeine','mineure','bupropion × codeine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('codeine','mirtazapine','mineure','codeine × mirtazapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('codeine','trazodone','mineure','codeine × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('codeine','tramadol','mineure','codeine × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
