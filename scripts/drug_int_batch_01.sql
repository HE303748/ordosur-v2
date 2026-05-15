-- drug_int_batch_01.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('naproxen','warfarin','majeure','naproxen × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('aspirin','naproxen','majeure','aspirin × naproxen — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('diclofenac','naproxen','mineure','diclofenac × naproxen — Interaction mineure : association généralement possible, surveillance habituelle.'),
('indomethacin','naproxen','mineure','indomethacin × naproxen — Interaction mineure : association généralement possible, surveillance habituelle.'),
('meloxicam','naproxen','mineure','meloxicam × naproxen — Interaction mineure : association généralement possible, surveillance habituelle.'),
('naproxen','propranolol','mineure','naproxen × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','naproxen','mineure','furosemide × naproxen — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','naproxen','mineure','digoxin × naproxen — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','naproxen','mineure','lithium × naproxen — Interaction mineure : association généralement possible, surveillance habituelle.'),
('naproxen','probenecid','mineure','naproxen × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','naproxen','mineure','cyclosporine × naproxen — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methotrexate','naproxen','modérée','methotrexate × naproxen — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('naproxen','sucralfate','mineure','naproxen × sucralfate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','naproxen','mineure','cholestyramine × naproxen — Interaction mineure : association généralement possible, surveillance habituelle.'),
('magnesium','naproxen','mineure','magnesium × naproxen — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','naproxen','mineure','antacids × naproxen — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonidine','glimepiride','mineure','clonidine × glimepiride — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','glimepiride','mineure','clarithromycin × glimepiride — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glimepiride','tetracycline','mineure','glimepiride × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','glimepiride','mineure','fluconazole × glimepiride — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glimepiride','rifampin','mineure','glimepiride × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glimepiride','phenytoin','mineure','glimepiride × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glimepiride','olanzapine','mineure','glimepiride × olanzapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','glimepiride','mineure','clozapine × glimepiride — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','glimepiride','mineure','fluoxetine × glimepiride — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glimepiride','insulin','mineure','glimepiride × insulin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glimepiride','probenecid','mineure','glimepiride × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','glimepiride','mineure','alcohol × glimepiride — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','methocarbamol','modérée','alcohol × methocarbamol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('varenicline','warfarin','modérée','varenicline × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('bupropion','varenicline','mineure','bupropion × varenicline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin','varenicline','modérée','insulin × varenicline — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('theophylline','varenicline','modérée','theophylline × varenicline — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('tamsulosin','warfarin','mineure','tamsulosin × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atenolol','tamsulosin','mineure','atenolol × tamsulosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nifedipine','tamsulosin','mineure','nifedipine × tamsulosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('enalapril','tamsulosin','mineure','enalapril × tamsulosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','tamsulosin','mineure','furosemide × tamsulosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','tamsulosin','mineure','digoxin × tamsulosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','tamsulosin','mineure','erythromycin × tamsulosin — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
