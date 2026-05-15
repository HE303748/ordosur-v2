-- drug_int_batch_36.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('imipramine','phenytoin','mineure','imipramine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','imipramine','mineure','fluoxetine × imipramine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('imipramine','sertraline','mineure','imipramine × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('imipramine','paroxetine','mineure','imipramine × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','imipramine','mineure','cimetidine × imipramine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','imipramine','mineure','alcohol × imipramine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('moxifloxacin','warfarin','mineure','moxifloxacin × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('moxifloxacin','sotalol','mineure','moxifloxacin × sotalol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('moxifloxacin','sucralfate','mineure','moxifloxacin × sucralfate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','moxifloxacin','mineure','iron × moxifloxacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('magnesium','moxifloxacin','mineure','magnesium × moxifloxacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('moxifloxacin','zinc','mineure','moxifloxacin × zinc — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','moxifloxacin','mineure','antacids × moxifloxacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('linezolid','metaxalone','mineure','linezolid × metaxalone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metaxalone','mirtazapine','mineure','metaxalone × mirtazapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metaxalone','trazodone','mineure','metaxalone × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metaxalone','tramadol','mineure','metaxalone × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fentanyl','metaxalone','mineure','fentanyl × metaxalone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','metaxalone','mineure','alcohol × metaxalone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','estradiol valerate and estradiol valerate/dienogest','modérée','diltiazem × estradiol valerate and estradiol valerate/dienogest — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('estradiol valerate and estradiol valerate/dienogest','verapamil','modérée','estradiol valerate and estradiol valerate/dienogest × verapamil — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','estradiol valerate and estradiol valerate/dienogest','modérée','clarithromycin × estradiol valerate and estradiol valerate/dienogest — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('erythromycin','estradiol valerate and estradiol valerate/dienogest','modérée','erythromycin × estradiol valerate and estradiol valerate/dienogest — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('estradiol valerate and estradiol valerate/dienogest','fluconazole','modérée','estradiol valerate and estradiol valerate/dienogest × fluconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('estradiol valerate and estradiol valerate/dienogest','itraconazole','modérée','estradiol valerate and estradiol valerate/dienogest × itraconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('estradiol valerate and estradiol valerate/dienogest','ketoconazole','modérée','estradiol valerate and estradiol valerate/dienogest × ketoconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('estradiol valerate and estradiol valerate/dienogest','voriconazole','modérée','estradiol valerate and estradiol valerate/dienogest × voriconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('estradiol valerate and estradiol valerate/dienogest','rifampin','mineure','estradiol valerate and estradiol valerate/dienogest × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('estradiol valerate and estradiol valerate/dienogest','phenytoin','mineure','estradiol valerate and estradiol valerate/dienogest × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','estradiol valerate and estradiol valerate/dienogest','mineure','carbamazepine × estradiol valerate and estradiol valerate/dienogest — Interaction mineure : association généralement possible, surveillance habituelle.'),
('estradiol valerate and estradiol valerate/dienogest','lamotrigine','mineure','estradiol valerate and estradiol valerate/dienogest × lamotrigine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('estradiol valerate and estradiol valerate/dienogest','topiramate','mineure','estradiol valerate and estradiol valerate/dienogest × topiramate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('estradiol valerate and estradiol valerate/dienogest','oxcarbazepine','mineure','estradiol valerate and estradiol valerate/dienogest × oxcarbazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('estradiol valerate and estradiol valerate/dienogest','grapefruit juice','modérée','estradiol valerate and estradiol valerate/dienogest × grapefruit juice — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clonidine','dorzolamide','mineure','clonidine × dorzolamide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','dorzolamide','mineure','calcium × dorzolamide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluvastatin','warfarin','modérée','fluvastatin × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('fluconazole','fluvastatin','mineure','fluconazole × fluvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluvastatin','phenytoin','modérée','fluvastatin × phenytoin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('colchicine','fluvastatin','modérée','colchicine × fluvastatin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
