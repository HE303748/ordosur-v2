-- drug_int_batch_61.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('drospirenone and ethinyl estradiol','lamotrigine','mineure','drospirenone and ethinyl estradiol × lamotrigine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('drospirenone and ethinyl estradiol','topiramate','mineure','drospirenone and ethinyl estradiol × topiramate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('drospirenone and ethinyl estradiol','oxcarbazepine','mineure','drospirenone and ethinyl estradiol × oxcarbazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('drospirenone and ethinyl estradiol','midazolam','mineure','drospirenone and ethinyl estradiol × midazolam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('drospirenone and ethinyl estradiol','ritonavir','modérée','drospirenone and ethinyl estradiol × ritonavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('drospirenone and ethinyl estradiol','omeprazole','mineure','drospirenone and ethinyl estradiol × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('drospirenone and ethinyl estradiol','theophylline','modérée','drospirenone and ethinyl estradiol × theophylline — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('drospirenone and ethinyl estradiol','st. john''s wort','mineure','drospirenone and ethinyl estradiol × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('drospirenone and ethinyl estradiol','grapefruit juice','mineure','drospirenone and ethinyl estradiol × grapefruit juice — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acyclovir','probenecid','mineure','acyclovir × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bumetanide','warfarin','mineure','bumetanide × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bumetanide','indomethacin','mineure','bumetanide × indomethacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bumetanide','digoxin','mineure','bumetanide × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bumetanide','lithium','mineure','bumetanide × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bumetanide','probenecid','mineure','bumetanide × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acarbose','digoxin','modérée','acarbose × digoxin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('acarbose','phenytoin','mineure','acarbose × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acarbose','insulin','mineure','acarbose × insulin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acarbose','calcium','mineure','acarbose × calcium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','isosorbide mononitrate','mineure','calcium × isosorbide mononitrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','isosorbide mononitrate','mineure','alcohol × isosorbide mononitrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('indapamide','lithium','mineure','indapamide × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('busulfan','metronidazole','mineure','busulfan × metronidazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('busulfan','fluconazole','mineure','busulfan × fluconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('busulfan','itraconazole','mineure','busulfan × itraconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('busulfan','phenytoin','mineure','busulfan × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('busulfan','iron','mineure','busulfan × iron — Interaction mineure : association généralement possible, surveillance habituelle.'),
('escitalopram','st. john''s wort','majeure','escitalopram × st. john''s wort — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('calcium','sodium bicarbonate','mineure','calcium × sodium bicarbonate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cefixime','warfarin','majeure','cefixime × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('carbamazepine','cefixime','mineure','carbamazepine × cefixime — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonidine','insulin lispro','mineure','clonidine × insulin lispro — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin lispro','lithium','mineure','insulin lispro × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin lispro','olanzapine','mineure','insulin lispro × olanzapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','insulin lispro','mineure','clozapine × insulin lispro — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','insulin lispro','modérée','fluoxetine × insulin lispro — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alcohol','insulin lispro','mineure','alcohol × insulin lispro — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lidocaine, kenalog, povidone iodine','warfarin','mineure','lidocaine, kenalog, povidone iodine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','lidocaine, kenalog, povidone iodine','modérée','aspirin × lidocaine, kenalog, povidone iodine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','lidocaine, kenalog, povidone iodine','mineure','clarithromycin × lidocaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
