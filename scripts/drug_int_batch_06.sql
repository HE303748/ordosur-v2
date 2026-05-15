-- drug_int_batch_06.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('lorlatinib','rifampin','majeure','lorlatinib × rifampin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('allopurinol','warfarin','mineure','allopurinol × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('allopurinol','amoxicillin','majeure','allopurinol × amoxicillin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('allopurinol','ampicillin','majeure','allopurinol × ampicillin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('allopurinol','cyclosporine','modérée','allopurinol × cyclosporine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('allopurinol','azathioprine','modérée','allopurinol × azathioprine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('allopurinol','theophylline','mineure','allopurinol × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lidocaine','nitroglycerin','modérée','lidocaine × nitroglycerin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lidocaine','nitrofurantoin','modérée','lidocaine × nitrofurantoin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lidocaine','phenytoin','modérée','lidocaine × phenytoin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lidocaine','valproate','modérée','lidocaine × valproate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lidocaine','phenobarbital','modérée','lidocaine × phenobarbital — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('chloroquine','lidocaine','modérée','chloroquine × lidocaine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lidocaine','metoclopramide','modérée','lidocaine × metoclopramide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('tocilizumab','warfarin','mineure','tocilizumab × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','tocilizumab','mineure','atorvastatin × tocilizumab — Interaction mineure : association généralement possible, surveillance habituelle.'),
('simvastatin','tocilizumab','mineure','simvastatin × tocilizumab — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lovastatin','tocilizumab','mineure','lovastatin × tocilizumab — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','tocilizumab','modérée','cyclosporine × tocilizumab — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('methotrexate','tocilizumab','mineure','methotrexate × tocilizumab — Interaction mineure : association généralement possible, surveillance habituelle.'),
('omeprazole','tocilizumab','mineure','omeprazole × tocilizumab — Interaction mineure : association généralement possible, surveillance habituelle.'),
('theophylline','tocilizumab','modérée','theophylline × tocilizumab — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('oseltamivir','warfarin','modérée','oseltamivir × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('aspirin','oseltamivir','modérée','aspirin × oseltamivir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('amoxicillin','oseltamivir','modérée','amoxicillin × oseltamivir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cimetidine','oseltamivir','modérée','cimetidine × oseltamivir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('calcium','oseltamivir','modérée','calcium × oseltamivir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('magnesium','oseltamivir','modérée','magnesium × oseltamivir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('antacids','oseltamivir','modérée','antacids × oseltamivir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ganciclovir','lamivudine','mineure','ganciclovir × lamivudine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atropine','metoclopramide','mineure','atropine × metoclopramide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('potassium','spironolactone','mineure','potassium × spironolactone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('eplerenone','potassium','mineure','eplerenone × potassium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','potassium','mineure','iron × potassium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('duloxetine','warfarin','mineure','duloxetine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','duloxetine','mineure','aspirin × duloxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ciprofloxacin','duloxetine','modérée','ciprofloxacin × duloxetine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('duloxetine','ofloxacin','modérée','duloxetine × ofloxacin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('duloxetine','lithium','mineure','duloxetine × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('duloxetine','lorazepam','mineure','duloxetine × lorazepam — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
