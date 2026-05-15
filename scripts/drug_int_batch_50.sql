-- drug_int_batch_50.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('carbamazepine','warfarin','mineure','carbamazepine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','rivaroxaban','mineure','carbamazepine × rivaroxaban — Interaction mineure : association généralement possible, surveillance habituelle.'),
('apixaban','carbamazepine','mineure','apixaban × carbamazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','dabigatran','mineure','carbamazepine × dabigatran — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','edoxaban','mineure','carbamazepine × edoxaban — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','ticlopidine','mineure','carbamazepine × ticlopidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','ibuprofen','mineure','carbamazepine × ibuprofen — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','felodipine','mineure','carbamazepine × felodipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','ciprofloxacin','mineure','carbamazepine × ciprofloxacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','ofloxacin','mineure','carbamazepine × ofloxacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','clarithromycin','mineure','carbamazepine × clarithromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','doxycycline','mineure','carbamazepine × doxycycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','itraconazole','mineure','carbamazepine × itraconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','voriconazole','mineure','carbamazepine × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','rifampin','mineure','carbamazepine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','lithium','modérée','carbamazepine × lithium — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('carbamazepine','valproic acid','modérée','carbamazepine × valproic acid — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('carbamazepine','valproate','modérée','carbamazepine × valproate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('carbamazepine','phenobarbital','mineure','carbamazepine × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','oxcarbazepine','mineure','carbamazepine × oxcarbazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','midazolam','mineure','carbamazepine × midazolam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','haloperidol','mineure','carbamazepine × haloperidol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','clozapine','modérée','carbamazepine × clozapine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('carbamazepine','citalopram','modérée','carbamazepine × citalopram — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('carbamazepine','fluvoxamine','mineure','carbamazepine × fluvoxamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amitriptyline','carbamazepine','mineure','amitriptyline × carbamazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','nortriptyline','mineure','carbamazepine × nortriptyline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','prednisolone','mineure','carbamazepine × prednisolone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','cyclosporine','mineure','carbamazepine × cyclosporine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','tacrolimus','modérée','carbamazepine × tacrolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('carbamazepine','sirolimus','mineure','carbamazepine × sirolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','everolimus','mineure','carbamazepine × everolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','omeprazole','mineure','carbamazepine × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','cimetidine','mineure','carbamazepine × cimetidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','theophylline','mineure','carbamazepine × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aminophylline','carbamazepine','mineure','aminophylline × carbamazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','carbamazepine','mineure','calcium × carbamazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','grapefruit juice','mineure','carbamazepine × grapefruit juice — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','trospium','mineure','digoxin × trospium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('trospium','vancomycin','mineure','trospium × vancomycin — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
