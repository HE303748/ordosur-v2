-- drug_int_batch_103.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('lithium','valproic acid','mineure','lithium × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('valproate','valproic acid','mineure','valproate × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lamotrigine','valproic acid','mineure','lamotrigine × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diazepam','valproic acid','mineure','diazepam × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lorazepam','valproic acid','mineure','lorazepam × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonazepam','valproic acid','majeure','clonazepam × valproic acid — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('haloperidol','valproic acid','mineure','haloperidol × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('olanzapine','valproic acid','modérée','olanzapine × valproic acid — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clozapine','valproic acid','mineure','clozapine × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amitriptyline','valproic acid','mineure','amitriptyline × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nortriptyline','valproic acid','mineure','nortriptyline × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ritonavir','valproic acid','mineure','ritonavir × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ranitidine','valproic acid','mineure','ranitidine × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','valproic acid','mineure','cimetidine × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','valproic acid','mineure','cholestyramine × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','valproic acid','mineure','antacids × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','sodium polystyrene sulfonate','mineure','digoxin × sodium polystyrene sulfonate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('magnesium','sodium polystyrene sulfonate','mineure','magnesium × sodium polystyrene sulfonate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','salmeterol xinafoate','mineure','clarithromycin × salmeterol xinafoate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','salmeterol xinafoate','mineure','itraconazole × salmeterol xinafoate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','salmeterol xinafoate','mineure','ketoconazole × salmeterol xinafoate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ritonavir','salmeterol xinafoate','mineure','ritonavir × salmeterol xinafoate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','salmeterol xinafoate','mineure','atazanavir × salmeterol xinafoate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetaminophen','digoxin','mineure','acetaminophen × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetaminophen','fluoxetine','mineure','acetaminophen × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetaminophen','paroxetine','mineure','acetaminophen × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetaminophen','bupropion','mineure','acetaminophen × bupropion — Interaction mineure : association généralement possible, surveillance habituelle.'),
('adalimumab-ryvk','warfarin','mineure','adalimumab-ryvk × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('adalimumab-ryvk','cyclosporine','modérée','adalimumab-ryvk × cyclosporine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('adalimumab-ryvk','methotrexate','mineure','adalimumab-ryvk × methotrexate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('adalimumab-ryvk','rituximab','majeure','adalimumab-ryvk × rituximab — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('abatacept','adalimumab-ryvk','majeure','abatacept × adalimumab-ryvk — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('adalimumab-ryvk','theophylline','modérée','adalimumab-ryvk × theophylline — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('dapsone','rifampin','mineure','dapsone × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dapsone','trimethoprim','mineure','dapsone × trimethoprim — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dapsone','folic acid','mineure','dapsone × folic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('terazosin','verapamil','mineure','terazosin × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('captopril','terazosin','mineure','captopril × terazosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methadone','st. john''s wort','majeure','methadone × st. john''s wort — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('dabigatran etexilate','ticagrelor','mineure','dabigatran etexilate × ticagrelor — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
