-- drug_int_batch_89.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('theophylline','vonoprazan and amoxicillin','mineure','theophylline × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sildenafil','vonoprazan and amoxicillin','contre_indication','sildenafil × vonoprazan and amoxicillin — Contre-indication : association déconseillée (risque grave documenté).'),
('tadalafil','vonoprazan and amoxicillin','mineure','tadalafil × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','vonoprazan and amoxicillin','mineure','calcium × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','vonoprazan and amoxicillin','mineure','iron × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('st. john''s wort','vonoprazan and amoxicillin','mineure','st. john''s wort × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dabigatran','warfarin','majeure','dabigatran × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('clopidogrel','warfarin','majeure','clopidogrel × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('prasugrel','warfarin','majeure','prasugrel × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('aspirin','warfarin','majeure','aspirin × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('dipyridamole','warfarin','majeure','dipyridamole × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('ticlopidine','warfarin','mineure','ticlopidine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketorolac','warfarin','majeure','ketorolac × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('ketoprofen','warfarin','majeure','ketoprofen × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('amlodipine','warfarin','mineure','amlodipine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','warfarin','mineure','diltiazem × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('verapamil','warfarin','mineure','verapamil × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','warfarin','mineure','atorvastatin × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','warfarin','mineure','erythromycin × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','warfarin','mineure','itraconazole × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','warfarin','mineure','ketoconazole × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('posaconazole','warfarin','mineure','posaconazole × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','warfarin','mineure','alprazolam × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('citalopram','warfarin','majeure','citalopram × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('cyclosporine','warfarin','mineure','cyclosporine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acyclovir','warfarin','mineure','acyclovir × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lopinavir','warfarin','mineure','lopinavir × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ritonavir','warfarin','mineure','ritonavir × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','warfarin','mineure','atazanavir × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('efavirenz','warfarin','mineure','efavirenz × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ranitidine','warfarin','mineure','ranitidine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('caffeine','warfarin','mineure','caffeine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('vitamin k','warfarin','mineure','vitamin k × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('grapefruit juice','warfarin','mineure','grapefruit juice × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clopidogrel','vonoprazan','mineure','clopidogrel × vonoprazan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amoxicillin','vonoprazan','contre_indication','amoxicillin × vonoprazan — Contre-indication : association déconseillée (risque grave documenté).'),
('clarithromycin','vonoprazan','contre_indication','clarithromycin × vonoprazan — Contre-indication : association déconseillée (risque grave documenté).'),
('itraconazole','vonoprazan','mineure','itraconazole × vonoprazan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','vonoprazan','mineure','ketoconazole × vonoprazan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('citalopram','vonoprazan','mineure','citalopram × vonoprazan — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
