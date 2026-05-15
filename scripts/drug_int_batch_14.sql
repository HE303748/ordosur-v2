-- drug_int_batch_14.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('grapefruit juice','ranolazine','modérée','grapefruit juice × ranolazine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('metformin','phenytoin','mineure','metformin × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metformin','topiramate','mineure','metformin × topiramate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin','metformin','mineure','insulin × metformin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','metformin','mineure','cimetidine × metformin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','metformin','mineure','calcium × metformin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','metformin','mineure','alcohol × metformin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','warfarin','mineure','cholestyramine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','propranolol','mineure','cholestyramine × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','tetracycline','mineure','cholestyramine × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','phenobarbital','mineure','cholestyramine × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine aspartate','lovastatin','majeure','amphetamine aspartate × lovastatin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('amphetamine aspartate','linezolid','mineure','amphetamine aspartate × linezolid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine aspartate','lithium','mineure','amphetamine aspartate × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine aspartate','phenytoin','mineure','amphetamine aspartate × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine aspartate','phenobarbital','mineure','amphetamine aspartate × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine aspartate','haloperidol','mineure','amphetamine aspartate × haloperidol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine aspartate','fluoxetine','mineure','amphetamine aspartate × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine aspartate','paroxetine','mineure','amphetamine aspartate × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine aspartate','tramadol','mineure','amphetamine aspartate × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine aspartate','fentanyl','mineure','amphetamine aspartate × fentanyl — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine aspartate','ritonavir','mineure','amphetamine aspartate × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine aspartate','omeprazole','mineure','amphetamine aspartate × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine aspartate','iron','mineure','amphetamine aspartate × iron — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lansoprazole','warfarin','mineure','lansoprazole × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','lansoprazole','modérée','digoxin × lansoprazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('amoxicillin','lansoprazole','contre_indication','amoxicillin × lansoprazole — Contre-indication : association déconseillée (risque grave documenté).'),
('clarithromycin','lansoprazole','contre_indication','clarithromycin × lansoprazole — Contre-indication : association déconseillée (risque grave documenté).'),
('itraconazole','lansoprazole','mineure','itraconazole × lansoprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','lansoprazole','mineure','ketoconazole × lansoprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lansoprazole','voriconazole','mineure','lansoprazole × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lansoprazole','rifampin','contre_indication','lansoprazole × rifampin — Contre-indication : association déconseillée (risque grave documenté).'),
('lansoprazole','tacrolimus','mineure','lansoprazole × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lansoprazole','methotrexate','mineure','lansoprazole × methotrexate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lansoprazole','mycophenolate','mineure','lansoprazole × mycophenolate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lansoprazole','ritonavir','mineure','lansoprazole × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','lansoprazole','mineure','atazanavir × lansoprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lansoprazole','sucralfate','mineure','lansoprazole × sucralfate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lansoprazole','theophylline','mineure','lansoprazole × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','lansoprazole','mineure','iron × lansoprazole — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
