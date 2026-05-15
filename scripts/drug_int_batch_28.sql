-- drug_int_batch_28.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('cimetidine','ramipril','mineure','cimetidine × ramipril — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','ramipril','mineure','calcium × ramipril — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','ramipril','modérée','iron × ramipril — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('antacids','ramipril','mineure','antacids × ramipril — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','oxycodone','mineure','erythromycin × oxycodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','oxycodone','mineure','ketoconazole × oxycodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('oxycodone','rifampin','majeure','oxycodone × rifampin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('linezolid','oxycodone','mineure','linezolid × oxycodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('oxycodone','phenytoin','majeure','oxycodone × phenytoin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('carbamazepine','oxycodone','majeure','carbamazepine × oxycodone — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('mirtazapine','oxycodone','mineure','mirtazapine × oxycodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('oxycodone','trazodone','mineure','oxycodone × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('oxycodone','tramadol','mineure','oxycodone × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('morphine','oxycodone','mineure','morphine × oxycodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buprenorphine','oxycodone','contre_indication','buprenorphine × oxycodone — Contre-indication : association déconseillée (risque grave documenté).'),
('oxycodone','ritonavir','mineure','oxycodone × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','oxycodone','majeure','alcohol × oxycodone — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('fluconazole','warfarin','mineure','fluconazole × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','ibuprofen','mineure','fluconazole × ibuprofen — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','naproxen','mineure','fluconazole × naproxen — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diclofenac','fluconazole','mineure','diclofenac × fluconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','meloxicam','mineure','fluconazole × meloxicam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','fluconazole','mineure','amlodipine × fluconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','nifedipine','mineure','fluconazole × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','verapamil','mineure','fluconazole × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('felodipine','fluconazole','mineure','felodipine × fluconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','losartan','mineure','fluconazole × losartan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','hydrochlorothiazide','mineure','fluconazole × hydrochlorothiazide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','fluconazole','mineure','amiodarone × fluconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','fluconazole','mineure','atorvastatin × fluconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','simvastatin','mineure','fluconazole × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('azithromycin','fluconazole','mineure','azithromycin × fluconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','voriconazole','mineure','fluconazole × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','rifampin','mineure','fluconazole × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','phenytoin','mineure','fluconazole × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','fluconazole','mineure','carbamazepine × fluconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','midazolam','mineure','fluconazole × midazolam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amitriptyline','fluconazole','mineure','amitriptyline × fluconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','nortriptyline','mineure','fluconazole × nortriptyline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fentanyl','fluconazole','majeure','fentanyl × fluconazole — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
