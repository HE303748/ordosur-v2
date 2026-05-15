-- drug_int_batch_29.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('fluconazole','prednisone','mineure','fluconazole × prednisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','fluconazole','mineure','cyclosporine × fluconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','tacrolimus','mineure','fluconazole × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','sirolimus','mineure','fluconazole × sirolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','fluconazole','mineure','cimetidine × fluconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','theophylline','mineure','fluconazole × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aminophylline','fluconazole','mineure','aminophylline × fluconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','fluconazole','mineure','calcium × fluconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','fluconazole','mineure','antacids × fluconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','ramelteon','modérée','fluconazole × ramelteon — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ketoconazole','ramelteon','modérée','ketoconazole × ramelteon — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ramelteon','rifampin','mineure','ramelteon × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluvoxamine','ramelteon','mineure','fluvoxamine × ramelteon — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine','ramelteon','mineure','amphetamine × ramelteon — Interaction mineure : association généralement possible, surveillance habituelle.'),
('donepezil','ramelteon','modérée','donepezil × ramelteon — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alcohol','ramelteon','mineure','alcohol × ramelteon — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','olodaterol','mineure','ketoconazole × olodaterol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('medroxyprogesterone','rifampin','mineure','medroxyprogesterone × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('medroxyprogesterone','phenytoin','mineure','medroxyprogesterone × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','medroxyprogesterone','mineure','carbamazepine × medroxyprogesterone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('medroxyprogesterone','topiramate','mineure','medroxyprogesterone × topiramate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('medroxyprogesterone','oxcarbazepine','mineure','medroxyprogesterone × oxcarbazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('abacavir','lamivudine','modérée','abacavir × lamivudine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alcohol','brompheniramine','mineure','alcohol × brompheniramine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','methylprednisolone','mineure','aspirin × methylprednisolone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','methylprednisolone','mineure','ketoconazole × methylprednisolone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methylprednisolone','rifampin','mineure','methylprednisolone × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methylprednisolone','phenytoin','mineure','methylprednisolone × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methylprednisolone','phenobarbital','mineure','methylprednisolone × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diazepam','ketoconazole','mineure','diazepam × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diazepam','phenytoin','mineure','diazepam × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diazepam','fluoxetine','mineure','diazepam × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diazepam','fluvoxamine','mineure','diazepam × fluvoxamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diazepam','omeprazole','mineure','diazepam × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','diazepam','mineure','cimetidine × diazepam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','diazepam','mineure','alcohol × diazepam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','diazepam','mineure','antacids × diazepam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','vigabatrin','mineure','phenytoin × vigabatrin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','vigabatrin','mineure','carbamazepine × vigabatrin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('valproate','vigabatrin','modérée','valproate × vigabatrin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
