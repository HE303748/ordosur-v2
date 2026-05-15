-- drug_int_batch_31.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('fluoxetine','zolpidem','mineure','fluoxetine × zolpidem — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sertraline','zolpidem','mineure','sertraline × zolpidem — Interaction mineure : association généralement possible, surveillance habituelle.'),
('st. john''s wort','zolpidem','mineure','st. john''s wort × zolpidem — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','zolpidem','mineure','alcohol × zolpidem — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbidopa','phenytoin','mineure','carbidopa × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbidopa','risperidone','mineure','carbidopa × risperidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbidopa','metoclopramide','modérée','carbidopa × metoclopramide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('carbidopa','iron','modérée','carbidopa × iron — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lisinopril','losartan','mineure','lisinopril × losartan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lisinopril','spironolactone','modérée','lisinopril × spironolactone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lisinopril','lithium','mineure','lisinopril × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin','lisinopril','modérée','insulin × lisinopril — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lisinopril','sirolimus','modérée','lisinopril × sirolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('everolimus','lisinopril','modérée','everolimus × lisinopril — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('iron','lisinopril','modérée','iron × lisinopril — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lithium','losartan','mineure','lithium × losartan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','azelastine','modérée','alcohol × azelastine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('fluoxetine','warfarin','majeure','fluoxetine × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('aspirin','fluoxetine','majeure','aspirin × fluoxetine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('amiodarone','fluoxetine','mineure','amiodarone × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('flecainide','fluoxetine','modérée','flecainide × fluoxetine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('fluoxetine','sotalol','mineure','fluoxetine × sotalol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','moxifloxacin','mineure','fluoxetine × moxifloxacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','fluoxetine','mineure','erythromycin × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','ketoconazole','mineure','fluoxetine × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','lithium','mineure','fluoxetine × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','phenytoin','mineure','fluoxetine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','fluoxetine','mineure','carbamazepine × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','fluoxetine','mineure','alprazolam × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','midazolam','mineure','fluoxetine × midazolam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','haloperidol','mineure','fluoxetine × haloperidol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','fluoxetine','mineure','clozapine × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','ziprasidone','mineure','fluoxetine × ziprasidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','tacrolimus','mineure','fluoxetine × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buprenorphine','erythromycin','mineure','buprenorphine × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buprenorphine','ketoconazole','mineure','buprenorphine × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buprenorphine','rifampin','mineure','buprenorphine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buprenorphine','linezolid','mineure','buprenorphine × linezolid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buprenorphine','phenytoin','mineure','buprenorphine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buprenorphine','carbamazepine','mineure','buprenorphine × carbamazepine — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
