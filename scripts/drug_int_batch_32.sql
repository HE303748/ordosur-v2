-- drug_int_batch_32.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('buprenorphine','mirtazapine','mineure','buprenorphine × mirtazapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buprenorphine','trazodone','mineure','buprenorphine × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buprenorphine','lopinavir','mineure','buprenorphine × lopinavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buprenorphine','ritonavir','mineure','buprenorphine × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','buprenorphine','mineure','atazanavir × buprenorphine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buprenorphine','efavirenz','mineure','buprenorphine × efavirenz — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','buprenorphine','majeure','alcohol × buprenorphine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('ezetimibe','warfarin','mineure','ezetimibe × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','ezetimibe','contre_indication','amlodipine × ezetimibe — Contre-indication : association déconseillée (risque grave documenté).'),
('diltiazem','ezetimibe','contre_indication','diltiazem × ezetimibe — Contre-indication : association déconseillée (risque grave documenté).'),
('ezetimibe','verapamil','contre_indication','ezetimibe × verapamil — Contre-indication : association déconseillée (risque grave documenté).'),
('digoxin','ezetimibe','mineure','digoxin × ezetimibe — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','ezetimibe','contre_indication','amiodarone × ezetimibe — Contre-indication : association déconseillée (risque grave documenté).'),
('dronedarone','ezetimibe','contre_indication','dronedarone × ezetimibe — Contre-indication : association déconseillée (risque grave documenté).'),
('ezetimibe','simvastatin','modérée','ezetimibe × simvastatin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','ezetimibe','contre_indication','clarithromycin × ezetimibe — Contre-indication : association déconseillée (risque grave documenté).'),
('erythromycin','ezetimibe','contre_indication','erythromycin × ezetimibe — Contre-indication : association déconseillée (risque grave documenté).'),
('ezetimibe','itraconazole','contre_indication','ezetimibe × itraconazole — Contre-indication : association déconseillée (risque grave documenté).'),
('ezetimibe','ketoconazole','contre_indication','ezetimibe × ketoconazole — Contre-indication : association déconseillée (risque grave documenté).'),
('ezetimibe','voriconazole','contre_indication','ezetimibe × voriconazole — Contre-indication : association déconseillée (risque grave documenté).'),
('ezetimibe','posaconazole','contre_indication','ezetimibe × posaconazole — Contre-indication : association déconseillée (risque grave documenté).'),
('daptomycin','ezetimibe','contre_indication','daptomycin × ezetimibe — Contre-indication : association déconseillée (risque grave documenté).'),
('colchicine','ezetimibe','modérée','colchicine × ezetimibe — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cyclosporine','ezetimibe','contre_indication','cyclosporine × ezetimibe — Contre-indication : association déconseillée (risque grave documenté).'),
('cholestyramine','ezetimibe','mineure','cholestyramine × ezetimibe — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','ezetimibe','mineure','calcium × ezetimibe — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ezetimibe','grapefruit juice','contre_indication','ezetimibe × grapefruit juice — Contre-indication : association déconseillée (risque grave documenté).'),
('fluoxetine','iron','mineure','fluoxetine × iron — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','st. john''s wort','majeure','fluoxetine × st. john''s wort — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('heparin','phytonadione','mineure','heparin × phytonadione — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetaminophen','erythromycin','mineure','acetaminophen × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetaminophen','ketoconazole','mineure','acetaminophen × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetaminophen','rifampin','mineure','acetaminophen × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetaminophen','linezolid','majeure','acetaminophen × linezolid — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('acetaminophen','phenytoin','mineure','acetaminophen × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetaminophen','carbamazepine','mineure','acetaminophen × carbamazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetaminophen','mirtazapine','mineure','acetaminophen × mirtazapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetaminophen','trazodone','mineure','acetaminophen × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetaminophen','tramadol','mineure','acetaminophen × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetaminophen','hydrocodone','mineure','acetaminophen × hydrocodone — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
