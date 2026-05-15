-- drug_int_batch_104.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('dabigatran etexilate','verapamil','mineure','dabigatran etexilate × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','dabigatran etexilate','mineure','amiodarone × dabigatran etexilate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dabigatran etexilate','dronedarone','modérée','dabigatran etexilate × dronedarone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','dabigatran etexilate','mineure','clarithromycin × dabigatran etexilate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dabigatran etexilate','ketoconazole','modérée','dabigatran etexilate × ketoconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('dabigatran etexilate','rifampin','mineure','dabigatran etexilate × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carvedilol','talazoparib','mineure','carvedilol × talazoparib — Interaction mineure : association généralement possible, surveillance habituelle.'),
('talazoparib','verapamil','mineure','talazoparib × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','talazoparib','mineure','amiodarone × talazoparib — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','talazoparib','mineure','clarithromycin × talazoparib — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','talazoparib','mineure','itraconazole × talazoparib — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonidine','insulin aspart','mineure','clonidine × insulin aspart — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin aspart','lithium','mineure','insulin aspart × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin aspart','olanzapine','mineure','insulin aspart × olanzapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','insulin aspart','mineure','clozapine × insulin aspart — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','insulin aspart','modérée','fluoxetine × insulin aspart — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alcohol','insulin aspart','mineure','alcohol × insulin aspart — Interaction mineure : association généralement possible, surveillance habituelle.'),
('captopril','furosemide','mineure','captopril × furosemide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('allopurinol','captopril','mineure','allopurinol × captopril — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','somatropin','mineure','cyclosporine × somatropin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','nilotinib','mineure','antacids × nilotinib — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fentanyl','isoflurane','mineure','fentanyl × isoflurane — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','isoflurane','mineure','calcium × isoflurane — Interaction mineure : association généralement possible, surveillance habituelle.'),
('efavirenz','nifedipine','mineure','efavirenz × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','efavirenz','modérée','diltiazem × efavirenz — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('efavirenz','verapamil','mineure','efavirenz × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('efavirenz','felodipine','mineure','efavirenz × felodipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','efavirenz','mineure','atorvastatin × efavirenz — Interaction mineure : association généralement possible, surveillance habituelle.'),
('efavirenz','simvastatin','mineure','efavirenz × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('efavirenz','pravastatin','mineure','efavirenz × pravastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('azithromycin','efavirenz','modérée','azithromycin × efavirenz — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('efavirenz','fluconazole','modérée','efavirenz × fluconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('efavirenz','itraconazole','modérée','efavirenz × itraconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('efavirenz','ketoconazole','mineure','efavirenz × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','efavirenz','mineure','carbamazepine × efavirenz — Interaction mineure : association généralement possible, surveillance habituelle.'),
('efavirenz','phenobarbital','mineure','efavirenz × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('efavirenz','lorazepam','modérée','efavirenz × lorazepam — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('efavirenz','sertraline','mineure','efavirenz × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('efavirenz','paroxetine','modérée','efavirenz × paroxetine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cyclosporine','efavirenz','modérée','cyclosporine × efavirenz — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
