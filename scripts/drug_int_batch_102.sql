-- drug_int_batch_102.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('atazanavir','ritonavir','mineure','atazanavir × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ritonavir','theophylline','modérée','ritonavir × theophylline — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('calcium','ritonavir','modérée','calcium × ritonavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('iron','ritonavir','mineure','iron × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ritonavir','st. john''s wort','contre_indication','ritonavir × st. john''s wort — Contre-indication : association déconseillée (risque grave documenté).'),
('alcohol','ritonavir','mineure','alcohol × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','midostaurin','mineure','diltiazem × midostaurin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','midostaurin','mineure','clarithromycin × midostaurin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','midostaurin','mineure','itraconazole × midostaurin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','midostaurin','mineure','ketoconazole × midostaurin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('midostaurin','voriconazole','mineure','midostaurin × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('midostaurin','posaconazole','mineure','midostaurin × posaconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('midostaurin','rifampin','mineure','midostaurin × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('midostaurin','phenytoin','mineure','midostaurin × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','midostaurin','mineure','carbamazepine × midostaurin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lopinavir','midostaurin','mineure','lopinavir × midostaurin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('midostaurin','ritonavir','mineure','midostaurin × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('grapefruit juice','midostaurin','mineure','grapefruit juice × midostaurin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','rosuvastatin','modérée','calcium × rosuvastatin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('midazolam','spironolactone','mineure','midazolam × spironolactone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('spironolactone','tacrolimus','mineure','spironolactone × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sirolimus','spironolactone','mineure','sirolimus × spironolactone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('simvastatin','ticagrelor','modérée','simvastatin × ticagrelor — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lovastatin','ticagrelor','modérée','lovastatin × ticagrelor — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','ticagrelor','mineure','clarithromycin × ticagrelor — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','ticagrelor','mineure','itraconazole × ticagrelor — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','ticagrelor','mineure','ketoconazole × ticagrelor — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ticagrelor','voriconazole','mineure','ticagrelor × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','ticagrelor','mineure','carbamazepine × ticagrelor — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenobarbital','ticagrelor','mineure','phenobarbital × ticagrelor — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ritonavir','ticagrelor','mineure','ritonavir × ticagrelor — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','ticagrelor','mineure','atazanavir × ticagrelor — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','sodium','mineure','lithium × sodium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ertapenem','valproic acid','mineure','ertapenem × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ertapenem','probenecid','mineure','ertapenem × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','potassium, dibasic','majeure','digoxin × potassium, dibasic — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('cyclosporine','potassium, dibasic','majeure','cyclosporine × potassium, dibasic — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('potassium, dibasic','tacrolimus','majeure','potassium, dibasic × tacrolimus — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('valproic acid','warfarin','mineure','valproic acid × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rifampin','valproic acid','mineure','rifampin × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
