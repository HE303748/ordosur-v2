-- drug_int_batch_02.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('ketoconazole','tamsulosin','mineure','ketoconazole × tamsulosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paroxetine','tamsulosin','modérée','paroxetine × tamsulosin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cimetidine','tamsulosin','modérée','cimetidine × tamsulosin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('tamsulosin','theophylline','mineure','tamsulosin × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','ciprofloxacin','mineure','calcium × ciprofloxacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','ofloxacin','mineure','calcium × ofloxacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','tetracycline','mineure','calcium × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sacubitril','valsartan','mineure','sacubitril × valsartan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sacubitril','spironolactone','modérée','sacubitril × spironolactone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lithium','sacubitril','modérée','lithium × sacubitril — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('iron','sacubitril','modérée','iron × sacubitril — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('etodolac','warfarin','majeure','etodolac × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('aspirin','etodolac','mineure','aspirin × etodolac — Interaction mineure : association généralement possible, surveillance habituelle.'),
('etodolac','furosemide','mineure','etodolac × furosemide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('etodolac','hydrochlorothiazide','mineure','etodolac × hydrochlorothiazide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','etodolac','mineure','digoxin × etodolac — Interaction mineure : association généralement possible, surveillance habituelle.'),
('etodolac','lithium','mineure','etodolac × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('etodolac','phenytoin','mineure','etodolac × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','etodolac','mineure','cyclosporine × etodolac — Interaction mineure : association généralement possible, surveillance habituelle.'),
('etodolac','methotrexate','mineure','etodolac × methotrexate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','etodolac','mineure','antacids × etodolac — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sertraline','warfarin','mineure','sertraline × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','sertraline','mineure','aspirin × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atenolol','sertraline','mineure','atenolol × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','sertraline','mineure','digoxin × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('flecainide','sertraline','majeure','flecainide × sertraline — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('lithium','sertraline','modérée','lithium × sertraline — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('phenytoin','sertraline','mineure','phenytoin × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','sertraline','mineure','carbamazepine × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sertraline','valproate','mineure','sertraline × valproate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diazepam','sertraline','mineure','diazepam × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','sertraline','mineure','fluoxetine × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('citalopram','sertraline','mineure','citalopram × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paroxetine','sertraline','mineure','paroxetine × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluvoxamine','sertraline','mineure','fluvoxamine × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','sertraline','mineure','cimetidine × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','sertraline','mineure','alcohol × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','fludrocortisone','mineure','aspirin × fludrocortisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fludrocortisone','furosemide','mineure','fludrocortisone × furosemide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fludrocortisone','rifampin','mineure','fludrocortisone × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
