-- drug_int_batch_59.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('ethinyl estradiol','theophylline','mineure','ethinyl estradiol × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ethinyl estradiol','st. john''s wort','mineure','ethinyl estradiol × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ethinyl estradiol','grapefruit juice','modérée','ethinyl estradiol × grapefruit juice — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('paroxetine hemihydrate','warfarin','modérée','paroxetine hemihydrate × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('heparin','paroxetine hemihydrate','mineure','heparin × paroxetine hemihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clopidogrel','paroxetine hemihydrate','mineure','clopidogrel × paroxetine hemihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','paroxetine hemihydrate','mineure','aspirin × paroxetine hemihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metoprolol','paroxetine hemihydrate','mineure','metoprolol × paroxetine hemihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nebivolol','paroxetine hemihydrate','mineure','nebivolol × paroxetine hemihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('flecainide','paroxetine hemihydrate','mineure','flecainide × paroxetine hemihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('linezolid','paroxetine hemihydrate','contre_indication','linezolid × paroxetine hemihydrate — Contre-indication : association déconseillée (risque grave documenté).'),
('lithium','paroxetine hemihydrate','mineure','lithium × paroxetine hemihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paroxetine hemihydrate','risperidone','mineure','paroxetine hemihydrate × risperidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paroxetine hemihydrate','venlafaxine','mineure','paroxetine hemihydrate × venlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine','paroxetine hemihydrate','mineure','amphetamine × paroxetine hemihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paroxetine hemihydrate','ritonavir','mineure','paroxetine hemihydrate × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','paroxetine hemihydrate','mineure','iron × paroxetine hemihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paroxetine hemihydrate','st. john''s wort','mineure','paroxetine hemihydrate × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('felodipine','indomethacin','modérée','felodipine × indomethacin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('felodipine','metoprolol','mineure','felodipine × metoprolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('felodipine','spironolactone','modérée','felodipine × spironolactone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('digoxin','felodipine','modérée','digoxin × felodipine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('erythromycin','felodipine','mineure','erythromycin × felodipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('felodipine','itraconazole','mineure','felodipine × itraconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('felodipine','ketoconazole','mineure','felodipine × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('felodipine','phenytoin','mineure','felodipine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('felodipine','phenobarbital','mineure','felodipine × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('felodipine','tacrolimus','mineure','felodipine × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','felodipine','mineure','cimetidine × felodipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('felodipine','iron','modérée','felodipine × iron — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('felodipine','grapefruit juice','mineure','felodipine × grapefruit juice — Interaction mineure : association généralement possible, surveillance habituelle.'),
('topiramate','zonisamide','modérée','topiramate × zonisamide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alcohol','zonisamide','mineure','alcohol × zonisamide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nifedipine','propranolol','mineure','nifedipine × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('pravastatin','propranolol','mineure','pravastatin × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ciprofloxacin','propranolol','mineure','ciprofloxacin × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ofloxacin','propranolol','mineure','ofloxacin × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','propranolol','mineure','fluconazole × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','propranolol','mineure','phenytoin × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenobarbital','propranolol','mineure','phenobarbital × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
