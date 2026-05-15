-- drug_int_batch_07.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('duloxetine','fluoxetine','modérée','duloxetine × fluoxetine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('duloxetine','paroxetine','mineure','duloxetine × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('duloxetine','fluvoxamine','mineure','duloxetine × fluvoxamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine','duloxetine','mineure','amphetamine × duloxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','duloxetine','modérée','cimetidine × duloxetine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('duloxetine','theophylline','mineure','duloxetine × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('caffeine','duloxetine','mineure','caffeine × duloxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('duloxetine','iron','mineure','duloxetine × iron — Interaction mineure : association généralement possible, surveillance habituelle.'),
('duloxetine','magnesium','mineure','duloxetine × magnesium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('duloxetine','st. john''s wort','majeure','duloxetine × st. john''s wort — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('alcohol','duloxetine','mineure','alcohol × duloxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','duloxetine','mineure','antacids × duloxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('prednisone','warfarin','mineure','prednisone × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','prednisone','modérée','aspirin × prednisone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ciprofloxacin','prednisone','mineure','ciprofloxacin × prednisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levofloxacin','prednisone','mineure','levofloxacin × prednisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ofloxacin','prednisone','mineure','ofloxacin × prednisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','prednisone','mineure','erythromycin × prednisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','prednisone','mineure','itraconazole × prednisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','prednisone','mineure','ketoconazole × prednisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('prednisone','rifampin','mineure','prednisone × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','prednisone','mineure','phenytoin × prednisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','prednisone','mineure','carbamazepine × prednisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('prednisone','quetiapine','mineure','prednisone × quetiapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupropion','prednisone','majeure','bupropion × prednisone — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('dexamethasone','prednisone','majeure','dexamethasone × prednisone — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('hydrocortisone','prednisone','mineure','hydrocortisone × prednisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','prednisone','mineure','cyclosporine × prednisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('prednisone','ritonavir','mineure','prednisone × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','prednisone','mineure','cholestyramine × prednisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxorubicin','prednisone','mineure','doxorubicin × prednisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','levonorgestrel and ethinyl estradiol','mineure','atorvastatin × levonorgestrel and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel and ethinyl estradiol','rosuvastatin','mineure','levonorgestrel and ethinyl estradiol × rosuvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','levonorgestrel and ethinyl estradiol','mineure','fluconazole × levonorgestrel and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','levonorgestrel and ethinyl estradiol','mineure','itraconazole × levonorgestrel and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','levonorgestrel and ethinyl estradiol','mineure','ketoconazole × levonorgestrel and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel and ethinyl estradiol','voriconazole','mineure','levonorgestrel and ethinyl estradiol × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel and ethinyl estradiol','rifampin','mineure','levonorgestrel and ethinyl estradiol × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel and ethinyl estradiol','phenytoin','mineure','levonorgestrel and ethinyl estradiol × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','levonorgestrel and ethinyl estradiol','mineure','carbamazepine × levonorgestrel and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
