-- drug_int_batch_80.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('paroxetine','phenobarbital','mineure','paroxetine × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diazepam','paroxetine','mineure','diazepam × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','paroxetine','mineure','fluoxetine × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fentanyl','paroxetine','majeure','fentanyl × paroxetine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('cyclosporine','paroxetine','mineure','cyclosporine × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','paroxetine','mineure','cimetidine × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paroxetine','theophylline','mineure','paroxetine × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','paroxetine','mineure','alcohol × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('flutamide','warfarin','mineure','flutamide × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('benzoyl peroxide','erythromycin','mineure','benzoyl peroxide × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','tobramycin','mineure','furosemide × tobramycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ivacaftor','warfarin','modérée','ivacaftor × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('digoxin','ivacaftor','mineure','digoxin × ivacaftor — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ciprofloxacin','ivacaftor','mineure','ciprofloxacin × ivacaftor — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ivacaftor','ofloxacin','mineure','ivacaftor × ofloxacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','ivacaftor','mineure','clarithromycin × ivacaftor — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','ivacaftor','modérée','erythromycin × ivacaftor — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('fluconazole','ivacaftor','mineure','fluconazole × ivacaftor — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','ivacaftor','mineure','itraconazole × ivacaftor — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ivacaftor','ketoconazole','modérée','ivacaftor × ketoconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ivacaftor','voriconazole','mineure','ivacaftor × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ivacaftor','posaconazole','mineure','ivacaftor × posaconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ivacaftor','rifampin','mineure','ivacaftor × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ivacaftor','phenytoin','mineure','ivacaftor × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','ivacaftor','mineure','carbamazepine × ivacaftor — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ivacaftor','phenobarbital','mineure','ivacaftor × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ivacaftor','midazolam','mineure','ivacaftor × midazolam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glipizide','ivacaftor','modérée','glipizide × ivacaftor — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('glimepiride','ivacaftor','modérée','glimepiride × ivacaftor — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cyclosporine','ivacaftor','modérée','cyclosporine × ivacaftor — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ivacaftor','tacrolimus','modérée','ivacaftor × tacrolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ivacaftor','st. john''s wort','modérée','ivacaftor × st. john''s wort — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('grapefruit juice','ivacaftor','mineure','grapefruit juice × ivacaftor — Interaction mineure : association généralement possible, surveillance habituelle.'),
('oxcarbazepine','rifampin','mineure','oxcarbazepine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('oxcarbazepine','phenobarbital','mineure','oxcarbazepine × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('vardenafil trihydrate','warfarin','mineure','vardenafil trihydrate × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dabigatran','vardenafil trihydrate','mineure','dabigatran × vardenafil trihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','vardenafil trihydrate','majeure','aspirin × vardenafil trihydrate — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('nifedipine','vardenafil trihydrate','mineure','nifedipine × vardenafil trihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','vardenafil trihydrate','mineure','digoxin × vardenafil trihydrate — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
