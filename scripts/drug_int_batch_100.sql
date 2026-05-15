-- drug_int_batch_100.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('alcohol','lopinavir','mineure','alcohol × lopinavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lorazepam','olanzapine','mineure','lorazepam × olanzapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('histamine','propranolol','majeure','histamine × propranolol — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('histamine','theophylline','mineure','histamine × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('adalimumab-adbm','warfarin','mineure','adalimumab-adbm × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('adalimumab-adbm','cyclosporine','modérée','adalimumab-adbm × cyclosporine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('adalimumab-adbm','methotrexate','mineure','adalimumab-adbm × methotrexate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('adalimumab-adbm','rituximab','majeure','adalimumab-adbm × rituximab — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('abatacept','adalimumab-adbm','majeure','abatacept × adalimumab-adbm — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('adalimumab-adbm','theophylline','modérée','adalimumab-adbm × theophylline — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('pazopanib','simvastatin','modérée','pazopanib × simvastatin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('omeprazole','pazopanib','mineure','omeprazole × pazopanib — Interaction mineure : association généralement possible, surveillance habituelle.'),
('esomeprazole','pazopanib','mineure','esomeprazole × pazopanib — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','pazopanib','mineure','antacids × pazopanib — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dantrolene','verapamil','mineure','dantrolene × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','dantrolene','mineure','calcium × dantrolene — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','norethindrone and ethinyl estradiol','mineure','atorvastatin × norethindrone and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norethindrone and ethinyl estradiol','rosuvastatin','mineure','norethindrone and ethinyl estradiol × rosuvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','norethindrone and ethinyl estradiol','mineure','fluconazole × norethindrone and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','norethindrone and ethinyl estradiol','mineure','itraconazole × norethindrone and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','norethindrone and ethinyl estradiol','mineure','ketoconazole × norethindrone and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norethindrone and ethinyl estradiol','voriconazole','mineure','norethindrone and ethinyl estradiol × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','norethindrone and ethinyl estradiol','mineure','carbamazepine × norethindrone and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lamotrigine','norethindrone and ethinyl estradiol','mineure','lamotrigine × norethindrone and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norethindrone and ethinyl estradiol','topiramate','mineure','norethindrone and ethinyl estradiol × topiramate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norethindrone and ethinyl estradiol','oxcarbazepine','mineure','norethindrone and ethinyl estradiol × oxcarbazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('morphine','norethindrone and ethinyl estradiol','mineure','morphine × norethindrone and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norethindrone and ethinyl estradiol','prednisolone','mineure','norethindrone and ethinyl estradiol × prednisolone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','norethindrone and ethinyl estradiol','mineure','cyclosporine × norethindrone and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lopinavir','norethindrone and ethinyl estradiol','mineure','lopinavir × norethindrone and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','norethindrone and ethinyl estradiol','mineure','atazanavir × norethindrone and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norethindrone and ethinyl estradiol','theophylline','mineure','norethindrone and ethinyl estradiol × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norethindrone and ethinyl estradiol','st. john''s wort','mineure','norethindrone and ethinyl estradiol × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('grapefruit juice','norethindrone and ethinyl estradiol','mineure','grapefruit juice × norethindrone and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glycerol phenylbutyrate','valproic acid','modérée','glycerol phenylbutyrate × valproic acid — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('glycerol phenylbutyrate','midazolam','modérée','glycerol phenylbutyrate × midazolam — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('glycerol phenylbutyrate','haloperidol','modérée','glycerol phenylbutyrate × haloperidol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('glycerol phenylbutyrate','probenecid','modérée','glycerol phenylbutyrate × probenecid — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cyclosporine','glycerol phenylbutyrate','modérée','cyclosporine × glycerol phenylbutyrate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cefuroxime axetil','probenecid','mineure','cefuroxime axetil × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
