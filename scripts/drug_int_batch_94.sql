-- drug_int_batch_94.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('captopril','cholestyramine','mineure','captopril × cholestyramine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','captopril','mineure','calcium × captopril — Interaction mineure : association généralement possible, surveillance habituelle.'),
('captopril','iron','modérée','captopril × iron — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alcohol','captopril','mineure','alcohol × captopril — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bromocriptine','erythromycin','mineure','bromocriptine × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bromocriptine','haloperidol','mineure','bromocriptine × haloperidol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bromocriptine','metoclopramide','mineure','bromocriptine × metoclopramide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','bromocriptine','mineure','alcohol × bromocriptine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ibuprofen','pemetrexed disodium hemipentahydrate','mineure','ibuprofen × pemetrexed disodium hemipentahydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atenolol','glycopyrrolate','mineure','atenolol × glycopyrrolate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','glycopyrrolate','mineure','digoxin × glycopyrrolate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glycopyrrolate','haloperidol','mineure','glycopyrrolate × haloperidol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glycopyrrolate','metformin','mineure','glycopyrrolate × metformin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','pitavastatin','majeure','erythromycin × pitavastatin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('pitavastatin','rifampin','majeure','pitavastatin × rifampin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('colchicine','pitavastatin','mineure','colchicine × pitavastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','pitavastatin','majeure','cyclosporine × pitavastatin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('mycophenolate mofetil','telmisartan','mineure','mycophenolate mofetil × telmisartan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('isavuconazole','mycophenolate mofetil','mineure','isavuconazole × mycophenolate mofetil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mycophenolate mofetil','rifampin','mineure','mycophenolate mofetil × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mycophenolate mofetil','trimethoprim','mineure','mycophenolate mofetil × trimethoprim — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mycophenolate mofetil','sulfamethoxazole','mineure','mycophenolate mofetil × sulfamethoxazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mycophenolate mofetil','probenecid','mineure','mycophenolate mofetil × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','mycophenolate mofetil','mineure','cyclosporine × mycophenolate mofetil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acyclovir','mycophenolate mofetil','mineure','acyclovir × mycophenolate mofetil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mycophenolate mofetil','valacyclovir','mineure','mycophenolate mofetil × valacyclovir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ganciclovir','mycophenolate mofetil','mineure','ganciclovir × mycophenolate mofetil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mycophenolate mofetil','pantoprazole','mineure','mycophenolate mofetil × pantoprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lansoprazole','mycophenolate mofetil','mineure','lansoprazole × mycophenolate mofetil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','mycophenolate mofetil','mineure','cholestyramine × mycophenolate mofetil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','mycophenolate mofetil','mineure','calcium × mycophenolate mofetil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('magnesium','mycophenolate mofetil','mineure','magnesium × mycophenolate mofetil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','mycophenolate mofetil','mineure','antacids × mycophenolate mofetil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sodium benzoate','valproic acid','mineure','sodium benzoate × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('probenecid','sodium benzoate','modérée','probenecid × sodium benzoate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('mirtazapine','warfarin','mineure','mirtazapine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','mirtazapine','mineure','itraconazole × mirtazapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mirtazapine','rifampin','mineure','mirtazapine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('linezolid','mirtazapine','contre_indication','linezolid × mirtazapine — Contre-indication : association déconseillée (risque grave documenté).'),
('lithium','mirtazapine','mineure','lithium × mirtazapine — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
