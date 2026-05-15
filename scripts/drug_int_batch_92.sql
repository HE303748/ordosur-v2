-- drug_int_batch_92.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('atropine','phenobarbital','mineure','atropine × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','sodium fluoride','mineure','calcium × sodium fluoride — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ibrutinib','voriconazole','modérée','ibrutinib × voriconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ibrutinib','posaconazole','modérée','ibrutinib × posaconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('grapefruit juice','ibrutinib','modérée','grapefruit juice × ibrutinib — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ethosuximide','phenytoin','mineure','ethosuximide × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ethosuximide','valproic acid','mineure','ethosuximide × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lisdexamfetamine dimesylate','simvastatin','mineure','lisdexamfetamine dimesylate × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lisdexamfetamine dimesylate','midazolam','mineure','lisdexamfetamine dimesylate × midazolam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lisdexamfetamine dimesylate','venlafaxine','modérée','lisdexamfetamine dimesylate × venlafaxine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('duloxetine','lisdexamfetamine dimesylate','mineure','duloxetine × lisdexamfetamine dimesylate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine','lisdexamfetamine dimesylate','modérée','amphetamine × lisdexamfetamine dimesylate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lisdexamfetamine dimesylate','melatonin','mineure','lisdexamfetamine dimesylate × melatonin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lisdexamfetamine dimesylate','omeprazole','modérée','lisdexamfetamine dimesylate × omeprazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lansoprazole','lisdexamfetamine dimesylate','mineure','lansoprazole × lisdexamfetamine dimesylate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lisdexamfetamine dimesylate','theophylline','mineure','lisdexamfetamine dimesylate × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','magnesium','mineure','calcium × magnesium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','levonorgestrel / ethinyl estradiol and ethinyl estradiol','mineure','atorvastatin × levonorgestrel / ethinyl estradiol and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel / ethinyl estradiol and ethinyl estradiol','rosuvastatin','mineure','levonorgestrel / ethinyl estradiol and ethinyl estradiol × rosuvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','levonorgestrel / ethinyl estradiol and ethinyl estradiol','mineure','fluconazole × levonorgestrel / ethinyl estradiol and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','levonorgestrel / ethinyl estradiol and ethinyl estradiol','mineure','itraconazole × levonorgestrel / ethinyl estradiol and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','levonorgestrel / ethinyl estradiol and ethinyl estradiol','mineure','ketoconazole × levonorgestrel / ethinyl estradiol and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel / ethinyl estradiol and ethinyl estradiol','voriconazole','mineure','levonorgestrel / ethinyl estradiol and ethinyl estradiol × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel / ethinyl estradiol and ethinyl estradiol','rifampin','mineure','levonorgestrel / ethinyl estradiol and ethinyl estradiol × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel / ethinyl estradiol and ethinyl estradiol','phenytoin','mineure','levonorgestrel / ethinyl estradiol and ethinyl estradiol × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','levonorgestrel / ethinyl estradiol and ethinyl estradiol','mineure','carbamazepine × levonorgestrel / ethinyl estradiol and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lamotrigine','levonorgestrel / ethinyl estradiol and ethinyl estradiol','mineure','lamotrigine × levonorgestrel / ethinyl estradiol and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel / ethinyl estradiol and ethinyl estradiol','topiramate','mineure','levonorgestrel / ethinyl estradiol and ethinyl estradiol × topiramate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel / ethinyl estradiol and ethinyl estradiol','oxcarbazepine','mineure','levonorgestrel / ethinyl estradiol and ethinyl estradiol × oxcarbazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel / ethinyl estradiol and ethinyl estradiol','morphine','mineure','levonorgestrel / ethinyl estradiol and ethinyl estradiol × morphine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel / ethinyl estradiol and ethinyl estradiol','prednisolone','mineure','levonorgestrel / ethinyl estradiol and ethinyl estradiol × prednisolone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','levonorgestrel / ethinyl estradiol and ethinyl estradiol','mineure','cyclosporine × levonorgestrel / ethinyl estradiol and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel / ethinyl estradiol and ethinyl estradiol','lopinavir','mineure','levonorgestrel / ethinyl estradiol and ethinyl estradiol × lopinavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel / ethinyl estradiol and ethinyl estradiol','ritonavir','mineure','levonorgestrel / ethinyl estradiol and ethinyl estradiol × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','levonorgestrel / ethinyl estradiol and ethinyl estradiol','mineure','atazanavir × levonorgestrel / ethinyl estradiol and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('efavirenz','levonorgestrel / ethinyl estradiol and ethinyl estradiol','mineure','efavirenz × levonorgestrel / ethinyl estradiol and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel / ethinyl estradiol and ethinyl estradiol','theophylline','mineure','levonorgestrel / ethinyl estradiol and ethinyl estradiol × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('grapefruit juice','levonorgestrel / ethinyl estradiol and ethinyl estradiol','mineure','grapefruit juice × levonorgestrel / ethinyl estradiol and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclophosphamide','indomethacin','modérée','cyclophosphamide × indomethacin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('amiodarone','cyclophosphamide','modérée','amiodarone × cyclophosphamide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
