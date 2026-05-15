-- drug_int_batch_63.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('albendazole','aminophylline','mineure','albendazole × aminophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','furosemide, benzalkonium','mineure','aspirin × furosemide, benzalkonium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide, benzalkonium','indomethacin','mineure','furosemide, benzalkonium × indomethacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide, benzalkonium','lithium','mineure','furosemide, benzalkonium × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide, benzalkonium','phenytoin','mineure','furosemide, benzalkonium × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','furosemide, benzalkonium','modérée','cyclosporine × furosemide, benzalkonium — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('furosemide, benzalkonium','methotrexate','mineure','furosemide, benzalkonium × methotrexate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide, benzalkonium','sucralfate','mineure','furosemide, benzalkonium × sucralfate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sevoflurane','verapamil','mineure','sevoflurane × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','sevoflurane','mineure','calcium × sevoflurane — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','pilocarpine','mineure','aspirin × pilocarpine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ibuprofen','pilocarpine','mineure','ibuprofen × pilocarpine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('naproxen','pilocarpine','mineure','naproxen × pilocarpine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levothyroxine','pilocarpine','mineure','levothyroxine × pilocarpine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('pilocarpine','prednisone','mineure','pilocarpine × prednisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methotrexate','pilocarpine','mineure','methotrexate × pilocarpine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('chloroquine','pilocarpine','mineure','chloroquine × pilocarpine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydroxychloroquine','pilocarpine','mineure','hydroxychloroquine × pilocarpine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('omeprazole','pilocarpine','mineure','omeprazole × pilocarpine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','pilocarpine','mineure','calcium × pilocarpine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','warfarin','mineure','cimetidine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','nifedipine','mineure','cimetidine × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','ketoconazole','mineure','cimetidine × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('meropenem','valproic acid','mineure','meropenem × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('meropenem','probenecid','mineure','meropenem × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin','somatrogon','mineure','insulin × somatrogon — Interaction mineure : association généralement possible, surveillance habituelle.'),
('prednisone','somatrogon','modérée','prednisone × somatrogon — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('doxepin','flecainide','mineure','doxepin × flecainide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxepin','fluoxetine','mineure','doxepin × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxepin','sertraline','mineure','doxepin × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('citalopram','doxepin','mineure','citalopram × doxepin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxepin','escitalopram','mineure','doxepin × escitalopram — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxepin','paroxetine','mineure','doxepin × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('midazolam','nifedipine','mineure','midazolam × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('midazolam','verapamil','modérée','midazolam × verapamil — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('itraconazole','midazolam','modérée','itraconazole × midazolam — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ketoconazole','midazolam','modérée','ketoconazole × midazolam — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('diazepam','midazolam','mineure','diazepam × midazolam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('midazolam','morphine','mineure','midazolam × morphine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fentanyl','midazolam','mineure','fentanyl × midazolam — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
