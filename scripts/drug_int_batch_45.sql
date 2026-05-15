-- drug_int_batch_45.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('carbamazepine','doxepin','modérée','carbamazepine × doxepin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('digoxin','risperidone','mineure','digoxin × risperidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','risperidone','modérée','erythromycin × risperidone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lithium','risperidone','modérée','lithium × risperidone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('carbamazepine','risperidone','mineure','carbamazepine × risperidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('risperidone','valproate','mineure','risperidone × valproate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','risperidone','mineure','clozapine × risperidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','risperidone','mineure','fluoxetine × risperidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paroxetine','risperidone','mineure','paroxetine × risperidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amitriptyline','risperidone','modérée','amitriptyline × risperidone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('methylphenidate','risperidone','modérée','methylphenidate × risperidone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ranitidine','risperidone','modérée','ranitidine × risperidone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cimetidine','risperidone','modérée','cimetidine × risperidone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alcohol','risperidone','modérée','alcohol × risperidone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('chlorpheniramine','erythromycin','mineure','chlorpheniramine × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('chlorpheniramine','ketoconazole','mineure','chlorpheniramine × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('chlorpheniramine','rifampin','mineure','chlorpheniramine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('chlorpheniramine','phenytoin','contre_indication','chlorpheniramine × phenytoin — Contre-indication : association déconseillée (risque grave documenté).'),
('carbamazepine','chlorpheniramine','mineure','carbamazepine × chlorpheniramine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('chlorpheniramine','hydrocodone','mineure','chlorpheniramine × hydrocodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('chlorpheniramine','ritonavir','mineure','chlorpheniramine × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','chlorpheniramine','majeure','alcohol × chlorpheniramine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('glipizide','ibuprofen','mineure','glipizide × ibuprofen — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glipizide','propranolol','mineure','glipizide × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glipizide','nifedipine','mineure','glipizide × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','glipizide','mineure','furosemide × glipizide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glipizide','topiramate','mineure','glipizide × topiramate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glipizide','metformin','mineure','glipizide × metformin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','glipizide','modérée','cimetidine × glipizide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('atovaquone','tetracycline','modérée','atovaquone × tetracycline — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('atovaquone','rifampin','mineure','atovaquone × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atovaquone','metoclopramide','mineure','atovaquone × metoclopramide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norgestimate and ethinyl estradiol','st. john''s wort','mineure','norgestimate and ethinyl estradiol × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sertraline','st. john''s wort','mineure','sertraline × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','pravastatin','mineure','cholestyramine × pravastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','cyproheptadine','mineure','alcohol × cyproheptadine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','magnesium heptahydrate','modérée','amlodipine × magnesium heptahydrate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('magnesium heptahydrate','nifedipine','modérée','magnesium heptahydrate × nifedipine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('diltiazem','magnesium heptahydrate','mineure','diltiazem × magnesium heptahydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('magnesium heptahydrate','verapamil','mineure','magnesium heptahydrate × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
