-- drug_int_batch_57.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('levoleucovorin','sulfamethoxazole','modérée','levoleucovorin × sulfamethoxazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('levoleucovorin','phenytoin','majeure','levoleucovorin × phenytoin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('levoleucovorin','phenobarbital','majeure','levoleucovorin × phenobarbital — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('folic acid','levoleucovorin','majeure','folic acid × levoleucovorin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('cimetidine','zolmitriptan','mineure','cimetidine × zolmitriptan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clindamycin','rifampin','modérée','clindamycin × rifampin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('methimazole','warfarin','modérée','methimazole × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('methimazole','theophylline','modérée','methimazole × theophylline — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('methimazole','vitamin k','mineure','methimazole × vitamin k — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levothyroxine','lovastatin','mineure','levothyroxine × lovastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levothyroxine','lithium','mineure','levothyroxine × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diazepam','levothyroxine','mineure','diazepam × levothyroxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levothyroxine','propylthiouracil','mineure','levothyroxine × propylthiouracil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levothyroxine','methimazole','mineure','levothyroxine × methimazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrocortisone','levothyroxine','modérée','hydrocortisone × levothyroxine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('levothyroxine','metoclopramide','mineure','levothyroxine × metoclopramide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levothyroxine','theophylline','mineure','levothyroxine × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levothyroxine','vitamin k','mineure','levothyroxine × vitamin k — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levocarnitine','warfarin','mineure','levocarnitine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('eltrombopag olamine','valsartan','mineure','eltrombopag olamine × valsartan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','eltrombopag olamine','mineure','atorvastatin × eltrombopag olamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('eltrombopag olamine','simvastatin','mineure','eltrombopag olamine × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('eltrombopag olamine','rosuvastatin','mineure','eltrombopag olamine × rosuvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('eltrombopag olamine','pravastatin','mineure','eltrombopag olamine × pravastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('eltrombopag olamine','rifampin','mineure','eltrombopag olamine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('eltrombopag olamine','methotrexate','mineure','eltrombopag olamine × methotrexate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('eltrombopag olamine','lopinavir','modérée','eltrombopag olamine × lopinavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('eltrombopag olamine','ritonavir','modérée','eltrombopag olamine × ritonavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('calcium','eltrombopag olamine','mineure','calcium × eltrombopag olamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('eltrombopag olamine','iron','mineure','eltrombopag olamine × iron — Interaction mineure : association généralement possible, surveillance habituelle.'),
('eltrombopag olamine','magnesium','mineure','eltrombopag olamine × magnesium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('eltrombopag olamine','zinc','mineure','eltrombopag olamine × zinc — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','eltrombopag olamine','mineure','antacids × eltrombopag olamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ciprofloxacin','warfarin','mineure','ciprofloxacin × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ciprofloxacin','cyclosporine','mineure','ciprofloxacin × cyclosporine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('caffeine','ciprofloxacin','mineure','caffeine × ciprofloxacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('heparin','hydrochlorothiazide','mineure','heparin × hydrochlorothiazide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrochlorothiazide','valsartan','mineure','hydrochlorothiazide × valsartan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','hydrochlorothiazide','mineure','carbamazepine × hydrochlorothiazide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','hydrochlorothiazide','modérée','cyclosporine × hydrochlorothiazide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
