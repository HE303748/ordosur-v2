-- drug_int_batch_08.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('lamotrigine','levonorgestrel and ethinyl estradiol','mineure','lamotrigine × levonorgestrel and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel and ethinyl estradiol','topiramate','mineure','levonorgestrel and ethinyl estradiol × topiramate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel and ethinyl estradiol','oxcarbazepine','mineure','levonorgestrel and ethinyl estradiol × oxcarbazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel and ethinyl estradiol','morphine','mineure','levonorgestrel and ethinyl estradiol × morphine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel and ethinyl estradiol','prednisolone','mineure','levonorgestrel and ethinyl estradiol × prednisolone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','levonorgestrel and ethinyl estradiol','mineure','cyclosporine × levonorgestrel and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel and ethinyl estradiol','lopinavir','mineure','levonorgestrel and ethinyl estradiol × lopinavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel and ethinyl estradiol','ritonavir','mineure','levonorgestrel and ethinyl estradiol × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','levonorgestrel and ethinyl estradiol','mineure','atazanavir × levonorgestrel and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('efavirenz','levonorgestrel and ethinyl estradiol','mineure','efavirenz × levonorgestrel and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levonorgestrel and ethinyl estradiol','theophylline','mineure','levonorgestrel and ethinyl estradiol × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('grapefruit juice','levonorgestrel and ethinyl estradiol','mineure','grapefruit juice × levonorgestrel and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amitriptyline','flecainide','mineure','amitriptyline × flecainide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amitriptyline','topiramate','modérée','amitriptyline × topiramate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('amitriptyline','fluoxetine','mineure','amitriptyline × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amitriptyline','sertraline','mineure','amitriptyline × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amitriptyline','paroxetine','mineure','amitriptyline × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amitriptyline','cimetidine','mineure','amitriptyline × cimetidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','amitriptyline','mineure','alcohol × amitriptyline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metoclopramide','pramipexole dihydrochloride','mineure','metoclopramide × pramipexole dihydrochloride — Interaction mineure : association généralement possible, surveillance habituelle.'),
('leflunomide','warfarin','modérée','leflunomide × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ketoprofen','leflunomide','mineure','ketoprofen × leflunomide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','leflunomide','mineure','furosemide × leflunomide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','leflunomide','modérée','atorvastatin × leflunomide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('leflunomide','simvastatin','modérée','leflunomide × simvastatin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('leflunomide','rosuvastatin','mineure','leflunomide × rosuvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('leflunomide','pravastatin','modérée','leflunomide × pravastatin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ciprofloxacin','leflunomide','mineure','ciprofloxacin × leflunomide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('leflunomide','ofloxacin','mineure','leflunomide × ofloxacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('leflunomide','rifampin','mineure','leflunomide × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('duloxetine','leflunomide','mineure','duloxetine × leflunomide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('leflunomide','methotrexate','mineure','leflunomide × methotrexate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','leflunomide','mineure','cimetidine × leflunomide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('leflunomide','theophylline','mineure','leflunomide × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','verapamil','majeure','aspirin × verapamil — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('metoprolol','verapamil','mineure','metoprolol × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atenolol','verapamil','mineure','atenolol × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('propranolol','verapamil','majeure','propranolol × verapamil — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('digoxin','verapamil','modérée','digoxin × verapamil — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('flecainide','verapamil','mineure','flecainide × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
