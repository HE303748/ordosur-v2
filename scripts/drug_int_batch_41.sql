-- drug_int_batch_41.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('digoxin','rifampin','mineure','digoxin × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','trimethoprim','mineure','digoxin × trimethoprim — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','metformin','mineure','digoxin × metformin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','digoxin','mineure','cyclosporine × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','ritonavir','mineure','digoxin × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','esomeprazole','mineure','digoxin × esomeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','rabeprazole','mineure','digoxin × rabeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','digoxin','mineure','cholestyramine × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','iron','mineure','digoxin × iron — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','st. john''s wort','mineure','digoxin × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','digoxin','mineure','antacids × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcitonin salmon','lithium','mineure','calcitonin salmon × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rifampin','warfarin','contre_indication','rifampin × warfarin — Contre-indication : association déconseillée (risque grave documenté).'),
('clopidogrel','rifampin','contre_indication','clopidogrel × rifampin — Contre-indication : association déconseillée (risque grave documenté).'),
('rifampin','ticagrelor','contre_indication','rifampin × ticagrelor — Contre-indication : association déconseillée (risque grave documenté).'),
('metoprolol','rifampin','mineure','metoprolol × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('propranolol','rifampin','mineure','propranolol × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nifedipine','rifampin','mineure','nifedipine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('enalapril','rifampin','mineure','enalapril × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('losartan','rifampin','mineure','losartan × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rifampin','simvastatin','mineure','rifampin × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('moxifloxacin','rifampin','mineure','moxifloxacin × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','rifampin','mineure','clarithromycin × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxycycline','rifampin','mineure','doxycycline × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','rifampin','contre_indication','itraconazole × rifampin — Contre-indication : association déconseillée (risque grave documenté).'),
('ketoconazole','rifampin','contre_indication','ketoconazole × rifampin — Contre-indication : association déconseillée (risque grave documenté).'),
('diazepam','rifampin','mineure','diazepam × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('haloperidol','rifampin','contre_indication','haloperidol × rifampin — Contre-indication : association déconseillée (risque grave documenté).'),
('nortriptyline','rifampin','mineure','nortriptyline × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('morphine','rifampin','mineure','morphine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glipizide','rifampin','modérée','glipizide × rifampin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('prednisolone','rifampin','mineure','prednisolone × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('probenecid','rifampin','modérée','probenecid × rifampin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cyclosporine','rifampin','modérée','cyclosporine × rifampin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('rifampin','tacrolimus','modérée','rifampin × tacrolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('rifampin','ritonavir','majeure','rifampin × ritonavir — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('atazanavir','rifampin','contre_indication','atazanavir × rifampin — Contre-indication : association déconseillée (risque grave documenté).'),
('efavirenz','rifampin','contre_indication','efavirenz × rifampin — Contre-indication : association déconseillée (risque grave documenté).'),
('rifampin','sofosbuvir','contre_indication','rifampin × sofosbuvir — Contre-indication : association déconseillée (risque grave documenté).'),
('rifampin','theophylline','contre_indication','rifampin × theophylline — Contre-indication : association déconseillée (risque grave documenté).')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
