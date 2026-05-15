-- drug_int_batch_44.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('antacids','sodium polystyrene sulfonate','modérée','antacids × sodium polystyrene sulfonate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('omeprazole','propranolol','mineure','omeprazole × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ampicillin','omeprazole','mineure','ampicillin × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('omeprazole','theophylline','mineure','omeprazole × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('omeprazole','st. john''s wort','mineure','omeprazole × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','omeprazole','mineure','antacids × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('romidepsin','warfarin','modérée','romidepsin × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('rifampin','romidepsin','mineure','rifampin × romidepsin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('flecainide','midodrine','mineure','flecainide × midodrine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxazosin','midodrine','mineure','doxazosin × midodrine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('linezolid','midodrine','mineure','linezolid × midodrine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metformin','midodrine','mineure','metformin × midodrine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fludrocortisone','midodrine','mineure','fludrocortisone × midodrine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('midodrine','ranitidine','mineure','midodrine × ranitidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','midodrine','mineure','cimetidine × midodrine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('isoniazid','ketoconazole','mineure','isoniazid × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('isoniazid','rifampin','mineure','isoniazid × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('isoniazid','phenytoin','mineure','isoniazid × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','isoniazid','mineure','carbamazepine × isoniazid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('isoniazid','valproate','mineure','isoniazid × valproate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('isoniazid','theophylline','mineure','isoniazid × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','carisoprodol','mineure','aspirin × carisoprodol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carisoprodol','rifampin','mineure','carisoprodol × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carisoprodol','fluvoxamine','mineure','carisoprodol × fluvoxamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carisoprodol','omeprazole','mineure','carisoprodol × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','carisoprodol','mineure','alcohol × carisoprodol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','loperamide','mineure','itraconazole × loperamide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('loperamide','ritonavir','mineure','loperamide × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colestipol','warfarin','mineure','colestipol × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','colestipol','mineure','aspirin × colestipol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colestipol','propranolol','mineure','colestipol × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colestipol','furosemide','mineure','colestipol × furosemide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colestipol','hydrochlorothiazide','mineure','colestipol × hydrochlorothiazide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colestipol','digoxin','modérée','colestipol × digoxin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('colestipol','tetracycline','mineure','colestipol × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colestipol','phenytoin','mineure','colestipol × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colestipol','hydrocortisone','mineure','colestipol × hydrocortisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colestipol','mycophenolate','mineure','colestipol × mycophenolate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','colestipol','mineure','cholestyramine × colestipol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxepin','linezolid','contre_indication','doxepin × linezolid — Contre-indication : association déconseillée (risque grave documenté).')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
