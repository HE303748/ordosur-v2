-- drug_int_batch_47.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('lithium','torsemide','mineure','lithium × torsemide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','torsemide','modérée','phenytoin × torsemide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('probenecid','torsemide','mineure','probenecid × torsemide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','torsemide','mineure','cholestyramine × torsemide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dapagliflozin','lithium','mineure','dapagliflozin × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dapagliflozin','insulin','mineure','dapagliflozin × insulin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('azathioprine','warfarin','mineure','azathioprine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('azathioprine','febuxostat','mineure','azathioprine × febuxostat — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','hydroxychloroquine','mineure','digoxin × hydroxychloroquine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ampicillin','hydroxychloroquine','mineure','ampicillin × hydroxychloroquine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydroxychloroquine','rifampin','mineure','hydroxychloroquine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydroxychloroquine','insulin','modérée','hydroxychloroquine × insulin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cyclosporine','hydroxychloroquine','mineure','cyclosporine × hydroxychloroquine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydroxychloroquine','methotrexate','mineure','hydroxychloroquine × methotrexate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','hydroxychloroquine','mineure','cimetidine × hydroxychloroquine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','hydroxychloroquine','mineure','antacids × hydroxychloroquine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('heparin','rivaroxaban','mineure','heparin × rivaroxaban — Interaction mineure : association généralement possible, surveillance habituelle.'),
('apixaban','heparin','mineure','apixaban × heparin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','heparin','majeure','aspirin × heparin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('aspirin','nitroglycerin','mineure','aspirin × nitroglycerin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nitroglycerin','sildenafil','mineure','nitroglycerin × sildenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nitroglycerin','tadalafil','mineure','nitroglycerin × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mepivacaine','nitroglycerin','modérée','mepivacaine × nitroglycerin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('mepivacaine','nitrofurantoin','modérée','mepivacaine × nitrofurantoin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('mepivacaine','phenytoin','modérée','mepivacaine × phenytoin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('mepivacaine','valproate','modérée','mepivacaine × valproate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('mepivacaine','phenobarbital','modérée','mepivacaine × phenobarbital — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('chloroquine','mepivacaine','modérée','chloroquine × mepivacaine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('mepivacaine','metoclopramide','modérée','mepivacaine × metoclopramide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('aspirin','methazolamide','majeure','aspirin × methazolamide — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('diclofenac, capsaicin','warfarin','majeure','diclofenac, capsaicin × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('aspirin','diclofenac, capsaicin','majeure','aspirin × diclofenac, capsaicin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('diclofenac, capsaicin','indomethacin','mineure','diclofenac, capsaicin × indomethacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diclofenac, capsaicin','meloxicam','mineure','diclofenac, capsaicin × meloxicam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diclofenac, capsaicin','propranolol','mineure','diclofenac, capsaicin × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diclofenac, capsaicin','furosemide','mineure','diclofenac, capsaicin × furosemide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diclofenac, capsaicin','digoxin','mineure','diclofenac, capsaicin × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diclofenac, capsaicin','lithium','mineure','diclofenac, capsaicin × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','diclofenac, capsaicin','mineure','cyclosporine × diclofenac, capsaicin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diclofenac, capsaicin','methotrexate','modérée','diclofenac, capsaicin × methotrexate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
