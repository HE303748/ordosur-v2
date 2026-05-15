-- drug_int_batch_97.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('empagliflozin','insulin','mineure','empagliflozin × insulin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','empagliflozin','modérée','cimetidine × empagliflozin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('calcium','empagliflozin','mineure','calcium × empagliflozin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','empagliflozin','mineure','alcohol × empagliflozin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('azithromycin','desloratadine','mineure','azithromycin × desloratadine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('desloratadine','erythromycin','mineure','desloratadine × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('desloratadine','ketoconazole','mineure','desloratadine × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('desloratadine','fluoxetine','mineure','desloratadine × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','desloratadine','mineure','cimetidine × desloratadine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iodixanol','metformin','mineure','iodixanol × metformin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','iodixanol','mineure','alcohol × iodixanol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sulindac','warfarin','majeure','sulindac × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('aspirin','sulindac','mineure','aspirin × sulindac — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','sulindac','mineure','furosemide × sulindac — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','sulindac','mineure','lithium × sulindac — Interaction mineure : association généralement possible, surveillance habituelle.'),
('probenecid','sulindac','mineure','probenecid × sulindac — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','sulindac','mineure','cyclosporine × sulindac — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methotrexate','sulindac','mineure','methotrexate × sulindac — Interaction mineure : association généralement possible, surveillance habituelle.'),
('propofol','valproate','mineure','propofol × valproate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('morphine','propofol','mineure','morphine × propofol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fentanyl','propofol','mineure','fentanyl × propofol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('belumosudil','midazolam','mineure','belumosudil × midazolam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('belumosudil','caffeine','mineure','belumosudil × caffeine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alendronate','cimetidine','mineure','alendronate × cimetidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alendronate','cholestyramine','mineure','alendronate × cholestyramine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('budesonide','erythromycin','mineure','budesonide × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('budesonide','cyclosporine','mineure','budesonide × cyclosporine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('budesonide','grapefruit juice','mineure','budesonide × grapefruit juice — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clopidogrel','morphine','majeure','clopidogrel × morphine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('morphine','ticagrelor','majeure','morphine × ticagrelor — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('morphine','prasugrel','majeure','morphine × prasugrel — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('hydrocodone','morphine','modérée','hydrocodone × morphine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('eribulin','ketoconazole','mineure','eribulin × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('eribulin','rifampin','mineure','eribulin × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxycycline hyclate','minocycline','mineure','doxycycline hyclate × minocycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('azilsartan kamedoxomil','chlorthalidone','modérée','azilsartan kamedoxomil × chlorthalidone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('azilsartan kamedoxomil','lithium','modérée','azilsartan kamedoxomil × lithium — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('insulin','somatropin','mineure','insulin × somatropin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('prednisone','somatropin','mineure','prednisone × somatropin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxycycline hyclate','rifampin','mineure','doxycycline hyclate × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
