-- drug_int_batch_38.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('dipyridamole','heparin','majeure','dipyridamole × heparin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('heparin','ibuprofen','majeure','heparin × ibuprofen — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('celecoxib','heparin','majeure','celecoxib × heparin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('heparin','indomethacin','majeure','heparin × indomethacin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('heparin','nitroglycerin','mineure','heparin × nitroglycerin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('heparin','tetracycline','mineure','heparin × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('chloroquine','heparin','majeure','chloroquine × heparin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('heparin','hydroxychloroquine','majeure','heparin × hydroxychloroquine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('clarithromycin','oxybutynin','mineure','clarithromycin × oxybutynin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','oxybutynin','mineure','erythromycin × oxybutynin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','oxybutynin','mineure','itraconazole × oxybutynin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','oxybutynin','mineure','ketoconazole × oxybutynin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metoclopramide','oxybutynin','mineure','metoclopramide × oxybutynin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonidine','glipizide','mineure','clonidine × glipizide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glipizide','voriconazole','mineure','glipizide × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glipizide','olanzapine','mineure','glipizide × olanzapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','glipizide','mineure','clozapine × glipizide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','glipizide','mineure','fluoxetine × glipizide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','glipizide','mineure','alcohol × glipizide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenobarbital','prednisone','mineure','phenobarbital × prednisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('pioglitazone','rifampin','mineure','pioglitazone × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('pioglitazone','topiramate','mineure','pioglitazone × topiramate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('omeprazole','warfarin','mineure','omeprazole × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clopidogrel','omeprazole','mineure','clopidogrel × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','omeprazole','mineure','digoxin × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amoxicillin','omeprazole','contre_indication','amoxicillin × omeprazole — Contre-indication : association déconseillée (risque grave documenté).'),
('clarithromycin','omeprazole','contre_indication','clarithromycin × omeprazole — Contre-indication : association déconseillée (risque grave documenté).'),
('itraconazole','omeprazole','mineure','itraconazole × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','omeprazole','mineure','ketoconazole × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('omeprazole','voriconazole','modérée','omeprazole × voriconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('omeprazole','rifampin','contre_indication','omeprazole × rifampin — Contre-indication : association déconseillée (risque grave documenté).'),
('omeprazole','phenytoin','mineure','omeprazole × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('citalopram','omeprazole','mineure','citalopram × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','omeprazole','mineure','cyclosporine × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('omeprazole','tacrolimus','mineure','omeprazole × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methotrexate','omeprazole','mineure','methotrexate × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mycophenolate','omeprazole','mineure','mycophenolate × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('omeprazole','ritonavir','mineure','omeprazole × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','omeprazole','mineure','atazanavir × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','omeprazole','mineure','iron × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
