-- drug_int_batch_72.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('acitretin','methotrexate','modérée','acitretin × methotrexate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('acitretin','cimetidine','modérée','acitretin × cimetidine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('acitretin','alcohol','mineure','acitretin × alcohol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nifedipine','tacrolimus','majeure','nifedipine × tacrolimus — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('diltiazem','tacrolimus','majeure','diltiazem × tacrolimus — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('tacrolimus','verapamil','majeure','tacrolimus × verapamil — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('amiodarone','tacrolimus','majeure','amiodarone × tacrolimus — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('clarithromycin','tacrolimus','majeure','clarithromycin × tacrolimus — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('itraconazole','tacrolimus','mineure','itraconazole × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','tacrolimus','mineure','ketoconazole × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('tacrolimus','voriconazole','mineure','tacrolimus × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('posaconazole','tacrolimus','mineure','posaconazole × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','tacrolimus','modérée','phenytoin × tacrolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('phenobarbital','tacrolimus','modérée','phenobarbital × tacrolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('midazolam','tacrolimus','mineure','midazolam × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('prednisone','tacrolimus','modérée','prednisone × tacrolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('prednisolone','tacrolimus','modérée','prednisolone × tacrolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('methylprednisolone','tacrolimus','modérée','methylprednisolone × tacrolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cyclosporine','tacrolimus','mineure','cyclosporine × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ritonavir','tacrolimus','mineure','ritonavir × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','tacrolimus','majeure','cimetidine × tacrolimus — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('metoclopramide','tacrolimus','majeure','metoclopramide × tacrolimus — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('magnesium','tacrolimus','majeure','magnesium × tacrolimus — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('st. john''s wort','tacrolimus','modérée','st. john''s wort × tacrolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('grapefruit juice','tacrolimus','modérée','grapefruit juice × tacrolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alcohol','tacrolimus','majeure','alcohol × tacrolimus — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('antacids','tacrolimus','majeure','antacids × tacrolimus — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('voriconazole','warfarin','majeure','voriconazole × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('ibuprofen','voriconazole','modérée','ibuprofen × voriconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('diclofenac','voriconazole','modérée','diclofenac × voriconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('eplerenone','voriconazole','contre_indication','eplerenone × voriconazole — Contre-indication : association déconseillée (risque grave documenté).'),
('ivabradine','voriconazole','contre_indication','ivabradine × voriconazole — Contre-indication : association déconseillée (risque grave documenté).'),
('rifampin','voriconazole','contre_indication','rifampin × voriconazole — Contre-indication : association déconseillée (risque grave documenté).'),
('phenobarbital','voriconazole','contre_indication','phenobarbital × voriconazole — Contre-indication : association déconseillée (risque grave documenté).'),
('alprazolam','voriconazole','modérée','alprazolam × voriconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('midazolam','voriconazole','majeure','midazolam × voriconazole — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('oxycodone','voriconazole','majeure','oxycodone × voriconazole — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('fentanyl','voriconazole','mineure','fentanyl × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('prednisolone','voriconazole','mineure','prednisolone × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','voriconazole','majeure','cyclosporine × voriconazole — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
