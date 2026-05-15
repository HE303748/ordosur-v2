-- drug_int_batch_77.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('fluvoxamine','metoprolol','modérée','fluvoxamine × metoprolol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clomipramine','metoprolol','modérée','clomipramine × metoprolol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('metoprolol','ritonavir','modérée','metoprolol × ritonavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('chloroquine','metoprolol','modérée','chloroquine × metoprolol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('hydroxychloroquine','metoprolol','modérée','hydroxychloroquine × metoprolol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lithium','telmisartan','mineure','lithium × telmisartan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('maraviroc','ritonavir','mineure','maraviroc × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('efavirenz','maraviroc','mineure','efavirenz × maraviroc — Interaction mineure : association généralement possible, surveillance habituelle.'),
('maraviroc','st. john''s wort','mineure','maraviroc × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','sirolimus','mineure','diltiazem × sirolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sirolimus','verapamil','mineure','sirolimus × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','sirolimus','mineure','clarithromycin × sirolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','sirolimus','mineure','erythromycin × sirolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','sirolimus','mineure','itraconazole × sirolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','sirolimus','mineure','ketoconazole × sirolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rifampin','sirolimus','mineure','rifampin × sirolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','sirolimus','mineure','phenytoin × sirolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenobarbital','sirolimus','mineure','phenobarbital × sirolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','sirolimus','mineure','cyclosporine × sirolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ritonavir','sirolimus','mineure','ritonavir × sirolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','sirolimus','mineure','cimetidine × sirolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metoclopramide','sirolimus','mineure','metoclopramide × sirolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sirolimus','st. john''s wort','mineure','sirolimus × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('grapefruit juice','sirolimus','mineure','grapefruit juice × sirolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','epirubicin','mineure','cimetidine × epirubicin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','epirubicin','modérée','calcium × epirubicin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cilastatin','valproic acid','mineure','cilastatin × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cilastatin','probenecid','mineure','cilastatin × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cilastatin','ganciclovir','majeure','cilastatin × ganciclovir — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('amiodarone','dabigatran','mineure','amiodarone × dabigatran — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','clopidogrel','mineure','amiodarone × clopidogrel — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','azithromycin','mineure','amiodarone × azithromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','ledipasvir','majeure','amiodarone × ledipasvir — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('insulin','nadolol','mineure','insulin × nadolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','methylergonovine','mineure','clarithromycin × methylergonovine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','methylergonovine','mineure','erythromycin × methylergonovine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','methylergonovine','mineure','fluconazole × methylergonovine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','methylergonovine','mineure','itraconazole × methylergonovine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','methylergonovine','mineure','ketoconazole × methylergonovine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methylergonovine','voriconazole','mineure','methylergonovine × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
