-- drug_int_batch_65.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('capsaicin','nitrofurantoin','modérée','capsaicin × nitrofurantoin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('capsaicin','phenytoin','modérée','capsaicin × phenytoin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('capsaicin','valproate','modérée','capsaicin × valproate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('capsaicin','phenobarbital','modérée','capsaicin × phenobarbital — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('capsaicin','chloroquine','modérée','capsaicin × chloroquine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('capsaicin','metoclopramide','modérée','capsaicin × metoclopramide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clozapine','venlafaxine','majeure','clozapine × venlafaxine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('tramadol','venlafaxine','mineure','tramadol × venlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('st. john''s wort','venlafaxine','majeure','st. john''s wort × venlafaxine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('enalapril','indomethacin','mineure','enalapril × indomethacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('enalapril','spironolactone','mineure','enalapril × spironolactone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','enalapril','modérée','digoxin × enalapril — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('enalapril','hydralazine','modérée','enalapril × hydralazine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('enalapril','lithium','mineure','enalapril × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('enalapril','sirolimus','modérée','enalapril × sirolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('enalapril','everolimus','modérée','enalapril × everolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('calcium','enalapril','modérée','calcium × enalapril — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('enalapril','iron','mineure','enalapril × iron — Interaction mineure : association généralement possible, surveillance habituelle.'),
('morphine','verapamil','mineure','morphine × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('linezolid','morphine','mineure','linezolid × morphine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mirtazapine','morphine','mineure','mirtazapine × morphine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('morphine','trazodone','mineure','morphine × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('morphine','tramadol','mineure','morphine × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buprenorphine','morphine','mineure','buprenorphine × morphine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('morphine','naloxone','mineure','morphine × naloxone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','morphine','mineure','cimetidine × morphine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','morphine','majeure','alcohol × morphine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('minocycline','tetracycline','mineure','minocycline × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','minocycline','mineure','calcium × minocycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','minocycline','mineure','iron × minocycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('magnesium','minocycline','mineure','magnesium × minocycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','minocycline','mineure','antacids × minocycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','mecamylamine','mineure','alcohol × mecamylamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','guanfacine','majeure','fluconazole × guanfacine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('guanfacine','ketoconazole','majeure','guanfacine × ketoconazole — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('guanfacine','rifampin','majeure','guanfacine × rifampin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('efavirenz','guanfacine','majeure','efavirenz × guanfacine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('levodopa','risperidone','mineure','levodopa × risperidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levodopa','metoclopramide','mineure','levodopa × metoclopramide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','levodopa','mineure','iron × levodopa — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
