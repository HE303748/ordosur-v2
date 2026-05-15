-- drug_int_batch_25.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('carbamazepine','rocuronium','mineure','carbamazepine × rocuronium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('magnesium','rocuronium','mineure','magnesium × rocuronium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nabumetone','warfarin','majeure','nabumetone × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('aspirin','nabumetone','mineure','aspirin × nabumetone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','nabumetone','mineure','furosemide × nabumetone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','nabumetone','mineure','lithium × nabumetone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methotrexate','nabumetone','mineure','methotrexate × nabumetone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','nabumetone','mineure','antacids × nabumetone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','paliperidone','mineure','lithium × paliperidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','paliperidone','mineure','carbamazepine × paliperidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paliperidone','valproate','mineure','paliperidone × valproate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paliperidone','paroxetine','mineure','paliperidone × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','paliperidone','mineure','alcohol × paliperidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','metoprolol','mineure','calcium × metoprolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin','octreotide','modérée','insulin × octreotide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cyclosporine','octreotide','modérée','cyclosporine × octreotide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('benazepril','spironolactone','modérée','benazepril × spironolactone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('benazepril','lithium','mineure','benazepril × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('benazepril','insulin','modérée','benazepril × insulin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('benazepril','sirolimus','modérée','benazepril × sirolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('benazepril','everolimus','modérée','benazepril × everolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('benazepril','iron','modérée','benazepril × iron — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('aspirin','furosemide','mineure','aspirin × furosemide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','lithium','mineure','furosemide × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','phenytoin','mineure','furosemide × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','furosemide','modérée','cyclosporine × furosemide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('furosemide','methotrexate','mineure','furosemide × methotrexate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','sucralfate','mineure','furosemide × sucralfate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('gabapentin','naproxen','mineure','gabapentin × naproxen — Interaction mineure : association généralement possible, surveillance habituelle.'),
('gabapentin','phenytoin','mineure','gabapentin × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','gabapentin','mineure','carbamazepine × gabapentin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('gabapentin','valproic acid','mineure','gabapentin × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('gabapentin','phenobarbital','mineure','gabapentin × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('gabapentin','morphine','modérée','gabapentin × morphine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('gabapentin','oxycodone','modérée','gabapentin × oxycodone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('gabapentin','hydrocodone','modérée','gabapentin × hydrocodone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('buprenorphine','gabapentin','modérée','buprenorphine × gabapentin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('gabapentin','probenecid','mineure','gabapentin × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','gabapentin','mineure','cimetidine × gabapentin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('gabapentin','magnesium','mineure','gabapentin × magnesium — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
