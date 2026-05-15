-- drug_int_batch_27.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('methylprednisolone, lidocaine, bupivacaine, povidine iodine, isopropyl alcohol','metoclopramide','mineure','methylprednisolone, lidocaine, bupivacaine, povidine iodine, isopropyl alcohol × metoclopramide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','methylprednisolone, lidocaine, bupivacaine, povidine iodine, isopropyl alcohol','mineure','cholestyramine × methylprednisolone, lidocaine, bupivacaine, povidine iodine, isopropyl alcohol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('marcaine, kenalog, povidone iodine','warfarin','mineure','marcaine, kenalog, povidone iodine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','marcaine, kenalog, povidone iodine','modérée','aspirin × marcaine, kenalog, povidone iodine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('marcaine, kenalog, povidone iodine','nitroglycerin','mineure','marcaine, kenalog, povidone iodine × nitroglycerin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','marcaine, kenalog, povidone iodine','mineure','clarithromycin × marcaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','marcaine, kenalog, povidone iodine','mineure','itraconazole × marcaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','marcaine, kenalog, povidone iodine','modérée','ketoconazole × marcaine, kenalog, povidone iodine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('marcaine, kenalog, povidone iodine','rifampin','mineure','marcaine, kenalog, povidone iodine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('marcaine, kenalog, povidone iodine','nitrofurantoin','mineure','marcaine, kenalog, povidone iodine × nitrofurantoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('marcaine, kenalog, povidone iodine','phenytoin','mineure','marcaine, kenalog, povidone iodine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','marcaine, kenalog, povidone iodine','mineure','carbamazepine × marcaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('marcaine, kenalog, povidone iodine','valproate','mineure','marcaine, kenalog, povidone iodine × valproate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('marcaine, kenalog, povidone iodine','phenobarbital','mineure','marcaine, kenalog, povidone iodine × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrocortisone','marcaine, kenalog, povidone iodine','mineure','hydrocortisone × marcaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','marcaine, kenalog, povidone iodine','mineure','cyclosporine × marcaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('marcaine, kenalog, povidone iodine','ritonavir','mineure','marcaine, kenalog, povidone iodine × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','marcaine, kenalog, povidone iodine','mineure','atazanavir × marcaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('chloroquine','marcaine, kenalog, povidone iodine','mineure','chloroquine × marcaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('marcaine, kenalog, povidone iodine','metoclopramide','mineure','marcaine, kenalog, povidone iodine × metoclopramide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','marcaine, kenalog, povidone iodine','mineure','cholestyramine × marcaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dexamethasone','warfarin','mineure','dexamethasone × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','dexamethasone','modérée','aspirin × dexamethasone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('dexamethasone','erythromycin','mineure','dexamethasone × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dexamethasone','ketoconazole','mineure','dexamethasone × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dexamethasone','rifampin','mineure','dexamethasone × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dexamethasone','phenytoin','mineure','dexamethasone × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','dexamethasone','mineure','carbamazepine × dexamethasone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dexamethasone','hydrocortisone','mineure','dexamethasone × hydrocortisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','dexamethasone','mineure','cyclosporine × dexamethasone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','dexamethasone','mineure','cholestyramine × dexamethasone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ramipril','warfarin','mineure','ramipril × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('indomethacin','ramipril','mineure','indomethacin × ramipril — Interaction mineure : association généralement possible, surveillance habituelle.'),
('propranolol','ramipril','mineure','propranolol × ramipril — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ramipril','telmisartan','majeure','ramipril × telmisartan — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('furosemide','ramipril','mineure','furosemide × ramipril — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ramipril','spironolactone','modérée','ramipril × spironolactone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('digoxin','ramipril','mineure','digoxin × ramipril — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ramipril','simvastatin','mineure','ramipril × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','ramipril','modérée','lithium × ramipril — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
