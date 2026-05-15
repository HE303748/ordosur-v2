-- drug_int_batch_67.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('sulfamethoxazole','valganciclovir','mineure','sulfamethoxazole × valganciclovir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('probenecid','valganciclovir','mineure','probenecid × valganciclovir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','valganciclovir','modérée','cyclosporine × valganciclovir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('tacrolimus','valganciclovir','mineure','tacrolimus × valganciclovir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mycophenolate','valganciclovir','modérée','mycophenolate × valganciclovir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ciprofloxacin','pirfenidone','mineure','ciprofloxacin × pirfenidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ofloxacin','pirfenidone','mineure','ofloxacin × pirfenidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluvoxamine','pirfenidone','mineure','fluvoxamine × pirfenidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clindamycin palmitate','rifampin','modérée','clindamycin palmitate × rifampin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('aspirin','prazosin','mineure','aspirin × prazosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('indomethacin','prazosin','mineure','indomethacin × prazosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('prazosin','propranolol','mineure','prazosin × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','prazosin','mineure','digoxin × prazosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenobarbital','prazosin','mineure','phenobarbital × prazosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diazepam','prazosin','mineure','diazepam × prazosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin','prazosin','mineure','insulin × prazosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('allopurinol','prazosin','mineure','allopurinol × prazosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colchicine','prazosin','mineure','colchicine × prazosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('prazosin','probenecid','mineure','prazosin × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','temazepam','mineure','cimetidine × temazepam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paroxetine','warfarin','modérée','paroxetine × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('heparin','paroxetine','mineure','heparin × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clopidogrel','paroxetine','mineure','clopidogrel × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','paroxetine','mineure','aspirin × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('flecainide','paroxetine','mineure','flecainide × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('linezolid','paroxetine','contre_indication','linezolid × paroxetine — Contre-indication : association déconseillée (risque grave documenté).'),
('lithium','paroxetine','mineure','lithium × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paroxetine','venlafaxine','mineure','paroxetine × venlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paroxetine','ritonavir','mineure','paroxetine × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','paroxetine','mineure','iron × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lurasidone','st. john''s wort','modérée','lurasidone × st. john''s wort — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('vardenafil','warfarin','mineure','vardenafil × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dabigatran','vardenafil','mineure','dabigatran × vardenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','vardenafil','majeure','aspirin × vardenafil — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('nifedipine','vardenafil','mineure','nifedipine × vardenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','vardenafil','mineure','digoxin × vardenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nitroglycerin','vardenafil','mineure','nitroglycerin × vardenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','vardenafil','modérée','erythromycin × vardenafil — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ketoconazole','vardenafil','mineure','ketoconazole × vardenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin','vardenafil','mineure','insulin × vardenafil — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
