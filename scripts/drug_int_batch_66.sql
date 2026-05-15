-- drug_int_batch_66.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('atomoxetine','warfarin','mineure','atomoxetine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','atomoxetine','mineure','aspirin × atomoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atomoxetine','phenytoin','mineure','atomoxetine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atomoxetine','diazepam','mineure','atomoxetine × diazepam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atomoxetine','midazolam','mineure','atomoxetine × midazolam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atomoxetine','fluoxetine','mineure','atomoxetine × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atomoxetine','paroxetine','mineure','atomoxetine × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atomoxetine','methylphenidate','mineure','atomoxetine × methylphenidate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atomoxetine','omeprazole','mineure','atomoxetine × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atomoxetine','magnesium','mineure','atomoxetine × magnesium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','atomoxetine','mineure','alcohol × atomoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('brincidofovir','clarithromycin','mineure','brincidofovir × clarithromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('brincidofovir','erythromycin','mineure','brincidofovir × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('brincidofovir','rifampin','mineure','brincidofovir × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('brincidofovir','cyclosporine','mineure','brincidofovir × cyclosporine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sulfamethoxazole','warfarin','mineure','sulfamethoxazole × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('indomethacin','sulfamethoxazole','mineure','indomethacin × sulfamethoxazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','sulfamethoxazole','mineure','digoxin × sulfamethoxazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sulfamethoxazole','trimethoprim','mineure','sulfamethoxazole × trimethoprim — Interaction mineure : association généralement possible, surveillance habituelle.'),
('memantine','sulfamethoxazole','mineure','memantine × sulfamethoxazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metformin','sulfamethoxazole','mineure','metformin × sulfamethoxazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glipizide','sulfamethoxazole','mineure','glipizide × sulfamethoxazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','sulfamethoxazole','mineure','cyclosporine × sulfamethoxazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methotrexate','sulfamethoxazole','mineure','methotrexate × sulfamethoxazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dihydroergotamine','propranolol','mineure','dihydroergotamine × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dihydroergotamine','fluoxetine','mineure','dihydroergotamine × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dihydroergotamine','sertraline','mineure','dihydroergotamine × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dihydroergotamine','paroxetine','mineure','dihydroergotamine × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dihydroergotamine','fluvoxamine','mineure','dihydroergotamine × fluvoxamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('disulfiram','phenytoin','modérée','disulfiram × phenytoin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ofloxacin','warfarin','mineure','ofloxacin × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','ofloxacin','mineure','cyclosporine × ofloxacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('caffeine','ofloxacin','mineure','caffeine × ofloxacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine aspartate','st. john''s wort','mineure','amphetamine aspartate × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clobazam','ticlopidine','modérée','clobazam × ticlopidine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clobazam','fluconazole','modérée','clobazam × fluconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clobazam','fluvoxamine','modérée','clobazam × fluvoxamine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clobazam','omeprazole','mineure','clobazam × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','clobazam','mineure','alcohol × clobazam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('trimethoprim','valganciclovir','mineure','trimethoprim × valganciclovir — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
