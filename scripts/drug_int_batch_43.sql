-- drug_int_batch_43.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('phenytoin','rilpivirine','contre_indication','phenytoin × rilpivirine — Contre-indication : association déconseillée (risque grave documenté).'),
('carbamazepine','rilpivirine','contre_indication','carbamazepine × rilpivirine — Contre-indication : association déconseillée (risque grave documenté).'),
('phenobarbital','rilpivirine','contre_indication','phenobarbital × rilpivirine — Contre-indication : association déconseillée (risque grave documenté).'),
('oxcarbazepine','rilpivirine','contre_indication','oxcarbazepine × rilpivirine — Contre-indication : association déconseillée (risque grave documenté).'),
('metformin','rilpivirine','modérée','metformin × rilpivirine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('dexamethasone','rilpivirine','contre_indication','dexamethasone × rilpivirine — Contre-indication : association déconseillée (risque grave documenté).'),
('lopinavir','rilpivirine','mineure','lopinavir × rilpivirine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rilpivirine','ritonavir','mineure','rilpivirine × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','rilpivirine','mineure','atazanavir × rilpivirine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('efavirenz','rilpivirine','modérée','efavirenz × rilpivirine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('rilpivirine','tenofovir','mineure','rilpivirine × tenofovir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lamivudine','rilpivirine','mineure','lamivudine × rilpivirine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('abacavir','rilpivirine','mineure','abacavir × rilpivirine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('emtricitabine','rilpivirine','mineure','emtricitabine × rilpivirine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('omeprazole','rilpivirine','contre_indication','omeprazole × rilpivirine — Contre-indication : association déconseillée (risque grave documenté).'),
('pantoprazole','rilpivirine','contre_indication','pantoprazole × rilpivirine — Contre-indication : association déconseillée (risque grave documenté).'),
('esomeprazole','rilpivirine','contre_indication','esomeprazole × rilpivirine — Contre-indication : association déconseillée (risque grave documenté).'),
('lansoprazole','rilpivirine','contre_indication','lansoprazole × rilpivirine — Contre-indication : association déconseillée (risque grave documenté).'),
('rabeprazole','rilpivirine','contre_indication','rabeprazole × rilpivirine — Contre-indication : association déconseillée (risque grave documenté).'),
('ranitidine','rilpivirine','modérée','ranitidine × rilpivirine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cimetidine','rilpivirine','modérée','cimetidine × rilpivirine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('rilpivirine','sildenafil','mineure','rilpivirine × sildenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','rilpivirine','modérée','calcium × rilpivirine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('magnesium','rilpivirine','modérée','magnesium × rilpivirine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('rilpivirine','st. john''s wort','contre_indication','rilpivirine × st. john''s wort — Contre-indication : association déconseillée (risque grave documenté).'),
('antacids','rilpivirine','mineure','antacids × rilpivirine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','fluticasone propionate','mineure','clarithromycin × fluticasone propionate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluticasone propionate','itraconazole','mineure','fluticasone propionate × itraconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluticasone propionate','ketoconazole','modérée','fluticasone propionate × ketoconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('fluticasone propionate','ritonavir','modérée','fluticasone propionate × ritonavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('atazanavir','fluticasone propionate','mineure','atazanavir × fluticasone propionate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ixazomib','rifampin','mineure','ixazomib × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ixazomib','phenytoin','mineure','ixazomib × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','ixazomib','mineure','carbamazepine × ixazomib — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ixazomib','st. john''s wort','mineure','ixazomib × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('celecoxib','lithium carbonate','mineure','celecoxib × lithium carbonate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('indomethacin','lithium carbonate','mineure','indomethacin × lithium carbonate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium carbonate','piroxicam','mineure','lithium carbonate × piroxicam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','lithium carbonate','mineure','fluoxetine × lithium carbonate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','sodium polystyrene sulfonate','mineure','lithium × sodium polystyrene sulfonate — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
