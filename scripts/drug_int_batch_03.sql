-- drug_int_batch_03.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('fludrocortisone','phenytoin','mineure','fludrocortisone × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fludrocortisone','insulin','mineure','fludrocortisone × insulin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','lacosamide','modérée','calcium × lacosamide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('amphetamine','lithium','mineure','amphetamine × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine','phenytoin','mineure','amphetamine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine','phenobarbital','mineure','amphetamine × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine','haloperidol','mineure','amphetamine × haloperidol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine','fluoxetine','mineure','amphetamine × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine','paroxetine','mineure','amphetamine × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine','ritonavir','mineure','amphetamine × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('famotidine','itraconazole','mineure','famotidine × itraconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('famotidine','ketoconazole','mineure','famotidine × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','famotidine','mineure','atazanavir × famotidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('famotidine','sofosbuvir','mineure','famotidine × sofosbuvir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('famotidine','ledipasvir','mineure','famotidine × ledipasvir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('olanzapine','warfarin','mineure','olanzapine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('olanzapine','rifampin','mineure','olanzapine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','olanzapine','mineure','lithium × olanzapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','olanzapine','mineure','carbamazepine × olanzapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('olanzapine','valproate','mineure','olanzapine × valproate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diazepam','olanzapine','mineure','diazepam × olanzapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','olanzapine','mineure','fluoxetine × olanzapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluvoxamine','olanzapine','mineure','fluvoxamine × olanzapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('olanzapine','omeprazole','mineure','olanzapine × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','olanzapine','mineure','cimetidine × olanzapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('olanzapine','theophylline','mineure','olanzapine × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('magnesium','olanzapine','mineure','magnesium × olanzapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','olanzapine','mineure','alcohol × olanzapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','olanzapine','mineure','antacids × olanzapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nitisinone','warfarin','mineure','nitisinone × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('celecoxib','nitisinone','mineure','celecoxib × nitisinone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nitisinone','phenytoin','mineure','nitisinone × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methotrexate','nitisinone','mineure','methotrexate × nitisinone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ganciclovir','nitisinone','mineure','ganciclovir × nitisinone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ondansetron','rifampin','majeure','ondansetron × rifampin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('ondansetron','phenytoin','majeure','ondansetron × phenytoin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('carbamazepine','ondansetron','majeure','carbamazepine × ondansetron — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('ondansetron','tramadol','mineure','ondansetron × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methotrexate','ondansetron','mineure','methotrexate × ondansetron — Interaction mineure : association généralement possible, surveillance habituelle.'),
('azithromycin dihydrate','warfarin','modérée','azithromycin dihydrate × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
