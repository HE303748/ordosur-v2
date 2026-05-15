-- drug_int_batch_12.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('levothyroxine','propranolol','mineure','levothyroxine × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','levothyroxine','mineure','furosemide × levothyroxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','levothyroxine','mineure','amiodarone × levothyroxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levothyroxine','rifampin','mineure','levothyroxine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levothyroxine','phenytoin','mineure','levothyroxine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','levothyroxine','mineure','carbamazepine × levothyroxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levothyroxine','phenobarbital','mineure','levothyroxine × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levothyroxine','sertraline','mineure','levothyroxine × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amitriptyline','levothyroxine','mineure','amitriptyline × levothyroxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin','levothyroxine','mineure','insulin × levothyroxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dexamethasone','levothyroxine','mineure','dexamethasone × levothyroxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levothyroxine','sucralfate','mineure','levothyroxine × sucralfate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','levothyroxine','mineure','cholestyramine × levothyroxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','levothyroxine','mineure','calcium × levothyroxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levothyroxine','magnesium','mineure','levothyroxine × magnesium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('grapefruit juice','levothyroxine','mineure','grapefruit juice × levothyroxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','levothyroxine','mineure','antacids × levothyroxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('indomethacin','warfarin','majeure','indomethacin × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('aspirin','indomethacin','majeure','aspirin × indomethacin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('diclofenac','indomethacin','mineure','diclofenac × indomethacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('indomethacin','meloxicam','mineure','indomethacin × meloxicam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('indomethacin','propranolol','mineure','indomethacin × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','indomethacin','mineure','furosemide × indomethacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','indomethacin','mineure','digoxin × indomethacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('indomethacin','lithium','mineure','indomethacin × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dexamethasone','indomethacin','mineure','dexamethasone × indomethacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('indomethacin','probenecid','mineure','indomethacin × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','indomethacin','mineure','cyclosporine × indomethacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('indomethacin','methotrexate','modérée','indomethacin × methotrexate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('hydrocortisone','warfarin','mineure','hydrocortisone × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','hydrocortisone','modérée','aspirin × hydrocortisone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('hydrocortisone','ketoconazole','modérée','hydrocortisone × ketoconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('hydrocortisone','rifampin','mineure','hydrocortisone × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrocortisone','phenytoin','mineure','hydrocortisone × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','hydrocortisone','mineure','carbamazepine × hydrocortisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','hydrocortisone','mineure','cyclosporine × hydrocortisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','hydrocortisone','mineure','cholestyramine × hydrocortisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colistin','vancomycin','modérée','colistin × vancomycin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lorazepam','valproate','mineure','lorazepam × valproate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','lorazepam','mineure','clozapine × lorazepam — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
