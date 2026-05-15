-- drug_int_batch_58.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('clarithromycin','dexamethasone','modérée','clarithromycin × dexamethasone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('dexamethasone','itraconazole','modérée','dexamethasone × itraconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('dexamethasone','ritonavir','modérée','dexamethasone × ritonavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('levofloxacin','warfarin','mineure','levofloxacin × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','levofloxacin','mineure','digoxin × levofloxacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levofloxacin','probenecid','mineure','levofloxacin × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','levofloxacin','mineure','cyclosporine × levofloxacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','levofloxacin','mineure','cimetidine × levofloxacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levofloxacin','sucralfate','mineure','levofloxacin × sucralfate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levofloxacin','theophylline','mineure','levofloxacin × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','levofloxacin','mineure','iron × levofloxacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levofloxacin','magnesium','mineure','levofloxacin × magnesium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levofloxacin','zinc','mineure','levofloxacin × zinc — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','levofloxacin','mineure','antacids × levofloxacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methylprednisolone','warfarin','mineure','methylprednisolone × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','methylprednisolone','mineure','erythromycin × methylprednisolone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','methylprednisolone','mineure','carbamazepine × methylprednisolone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrocortisone','methylprednisolone','mineure','hydrocortisone × methylprednisolone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','methylprednisolone','mineure','cyclosporine × methylprednisolone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','methylprednisolone','mineure','cholestyramine × methylprednisolone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','ethinyl estradiol','mineure','atorvastatin × ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amoxicillin','ethinyl estradiol','mineure','amoxicillin × ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxycycline','ethinyl estradiol','mineure','doxycycline × ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ethinyl estradiol','fluconazole','modérée','ethinyl estradiol × fluconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ethinyl estradiol','itraconazole','modérée','ethinyl estradiol × itraconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ethinyl estradiol','ketoconazole','modérée','ethinyl estradiol × ketoconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ethinyl estradiol','voriconazole','modérée','ethinyl estradiol × voriconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ethinyl estradiol','rifampin','mineure','ethinyl estradiol × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ethinyl estradiol','phenytoin','mineure','ethinyl estradiol × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','ethinyl estradiol','mineure','carbamazepine × ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ethinyl estradiol','lamotrigine','mineure','ethinyl estradiol × lamotrigine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ethinyl estradiol','topiramate','mineure','ethinyl estradiol × topiramate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ethinyl estradiol','oxcarbazepine','mineure','ethinyl estradiol × oxcarbazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ethinyl estradiol','morphine','mineure','ethinyl estradiol × morphine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ethinyl estradiol','prednisolone','mineure','ethinyl estradiol × prednisolone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','ethinyl estradiol','mineure','cyclosporine × ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ethinyl estradiol','lopinavir','mineure','ethinyl estradiol × lopinavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ethinyl estradiol','ritonavir','mineure','ethinyl estradiol × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','ethinyl estradiol','mineure','atazanavir × ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('efavirenz','ethinyl estradiol','mineure','efavirenz × ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
