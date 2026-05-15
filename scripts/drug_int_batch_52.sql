-- drug_int_batch_52.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('clonazepam','darunavir','modérée','clonazepam × darunavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','zolpidem','modérée','darunavir × zolpidem — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','midazolam','contre_indication','darunavir × midazolam — Contre-indication : association déconseillée (risque grave documenté).'),
('darunavir','risperidone','mineure','darunavir × risperidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','quetiapine','mineure','darunavir × quetiapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','sertraline','mineure','darunavir × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','paroxetine','mineure','darunavir × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amitriptyline','darunavir','mineure','amitriptyline × darunavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','nortriptyline','mineure','darunavir × nortriptyline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','trazodone','mineure','darunavir × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','tramadol','mineure','darunavir × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','oxycodone','majeure','darunavir × oxycodone — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('darunavir','fentanyl','majeure','darunavir × fentanyl — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('buprenorphine','darunavir','modérée','buprenorphine × darunavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','naloxone','modérée','darunavir × naloxone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','prednisone','mineure','darunavir × prednisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','prednisolone','majeure','darunavir × prednisolone — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('darunavir','dexamethasone','mineure','darunavir × dexamethasone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','methylprednisolone','majeure','darunavir × methylprednisolone — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('colchicine','darunavir','contre_indication','colchicine × darunavir — Contre-indication : association déconseillée (risque grave documenté).'),
('cyclosporine','darunavir','modérée','cyclosporine × darunavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','tacrolimus','modérée','darunavir × tacrolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','sirolimus','modérée','darunavir × sirolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','everolimus','mineure','darunavir × everolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','lopinavir','mineure','darunavir × lopinavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','ritonavir','modérée','darunavir × ritonavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('atazanavir','darunavir','mineure','atazanavir × darunavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','efavirenz','modérée','darunavir × efavirenz — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','tenofovir','modérée','darunavir × tenofovir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','lamivudine','modérée','darunavir × lamivudine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('abacavir','darunavir','modérée','abacavir × darunavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','emtricitabine','modérée','darunavir × emtricitabine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','omeprazole','modérée','darunavir × omeprazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','ranitidine','modérée','darunavir × ranitidine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','sildenafil','mineure','darunavir × sildenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','tadalafil','mineure','darunavir × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','darunavir','modérée','calcium × darunavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','iron','modérée','darunavir × iron — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','st. john''s wort','contre_indication','darunavir × st. john''s wort — Contre-indication : association déconseillée (risque grave documenté).'),
('diltiazem','nebivolol','mineure','diltiazem × nebivolol — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
