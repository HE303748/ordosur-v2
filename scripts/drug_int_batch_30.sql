-- drug_int_batch_30.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('phenobarbital','vigabatrin','modérée','phenobarbital × vigabatrin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clonazepam','vigabatrin','modérée','clonazepam × vigabatrin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('dapagliflozin propanediol','warfarin','mineure','dapagliflozin propanediol × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dapagliflozin propanediol','valsartan','mineure','dapagliflozin propanediol × valsartan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dapagliflozin propanediol','hydrochlorothiazide','mineure','dapagliflozin propanediol × hydrochlorothiazide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dapagliflozin propanediol','digoxin','mineure','dapagliflozin propanediol × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dapagliflozin propanediol','simvastatin','mineure','dapagliflozin propanediol × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dapagliflozin propanediol','rifampin','mineure','dapagliflozin propanediol × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dapagliflozin propanediol','lithium','mineure','dapagliflozin propanediol × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dapagliflozin propanediol','metformin','mineure','dapagliflozin propanediol × metformin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dapagliflozin propanediol','glimepiride','mineure','dapagliflozin propanediol × glimepiride — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dapagliflozin propanediol','sitagliptin','mineure','dapagliflozin propanediol × sitagliptin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dapagliflozin propanediol','insulin','mineure','dapagliflozin propanediol × insulin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('haloperidol','hyoscyamine','mineure','haloperidol × hyoscyamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','hyoscyamine','mineure','antacids × hyoscyamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metronidazole','warfarin','mineure','metronidazole × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','metronidazole','mineure','lithium × metronidazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metronidazole','phenytoin','mineure','metronidazole × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metronidazole','phenobarbital','mineure','metronidazole × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','metronidazole','mineure','cimetidine × metronidazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','metronidazole','mineure','alcohol × metronidazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sucralfate','warfarin','mineure','sucralfate × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','sucralfate','modérée','digoxin × sucralfate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ciprofloxacin','sucralfate','mineure','ciprofloxacin × sucralfate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ofloxacin','sucralfate','mineure','ofloxacin × sucralfate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sucralfate','tetracycline','modérée','sucralfate × tetracycline — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ketoconazole','sucralfate','modérée','ketoconazole × sucralfate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('phenytoin','sucralfate','modérée','phenytoin × sucralfate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ranitidine','sucralfate','modérée','ranitidine × sucralfate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cimetidine','sucralfate','modérée','cimetidine × sucralfate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('sucralfate','theophylline','modérée','sucralfate × theophylline — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('hydrochlorothiazide','topiramate','mineure','hydrochlorothiazide × topiramate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','topiramate','modérée','lithium × topiramate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('phenytoin','topiramate','modérée','phenytoin × topiramate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('carbamazepine','topiramate','modérée','carbamazepine × topiramate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('topiramate','valproic acid','mineure','topiramate × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','topiramate','mineure','alcohol × topiramate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','zolpidem','mineure','ketoconazole × zolpidem — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rifampin','zolpidem','mineure','rifampin × zolpidem — Interaction mineure : association généralement possible, surveillance habituelle.'),
('haloperidol','zolpidem','mineure','haloperidol × zolpidem — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
