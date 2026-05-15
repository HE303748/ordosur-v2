-- drug_int_batch_105.sql — OpenFDA Étape 3 (11 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('efavirenz','tacrolimus','modérée','efavirenz × tacrolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('efavirenz','sirolimus','modérée','efavirenz × sirolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('efavirenz','ritonavir','mineure','efavirenz × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','efavirenz','mineure','atazanavir × efavirenz — Interaction mineure : association généralement possible, surveillance habituelle.'),
('efavirenz','tenofovir','modérée','efavirenz × tenofovir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('efavirenz','lamivudine','modérée','efavirenz × lamivudine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('abacavir','efavirenz','modérée','abacavir × efavirenz — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('efavirenz','sofosbuvir','mineure','efavirenz × sofosbuvir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','efavirenz','modérée','calcium × efavirenz — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('efavirenz','magnesium','modérée','efavirenz × magnesium — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('antacids','efavirenz','modérée','antacids × efavirenz — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
