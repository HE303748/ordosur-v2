-- drug_int_batch_98.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('alcohol','scopolamine','mineure','alcohol × scopolamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rivaroxaban','warfarin','majeure','rivaroxaban × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('enoxaparin','rivaroxaban','majeure','enoxaparin × rivaroxaban — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('clopidogrel','rivaroxaban','majeure','clopidogrel × rivaroxaban — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('aspirin','rivaroxaban','majeure','aspirin × rivaroxaban — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('clarithromycin','rivaroxaban','majeure','clarithromycin × rivaroxaban — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('erythromycin','rivaroxaban','modérée','erythromycin × rivaroxaban — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ketoconazole','rivaroxaban','modérée','ketoconazole × rivaroxaban — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('rifampin','rivaroxaban','mineure','rifampin × rivaroxaban — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ritonavir','rivaroxaban','modérée','ritonavir × rivaroxaban — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('rivaroxaban','st. john''s wort','modérée','rivaroxaban × st. john''s wort — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alprazolam','nifedipine','mineure','alprazolam × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','diltiazem','modérée','alprazolam × diltiazem — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alprazolam','amiodarone','mineure','alprazolam × amiodarone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','sertraline','mineure','alprazolam × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','paroxetine','mineure','alprazolam × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','cyclosporine','mineure','alprazolam × cyclosporine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','grapefruit juice','modérée','alprazolam × grapefruit juice — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('bicalutamide','midazolam','mineure','bicalutamide × midazolam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alvimopan','morphine','modérée','alvimopan × morphine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alcohol','sodium oxybate','contre_indication','alcohol × sodium oxybate — Contre-indication : association déconseillée (risque grave documenté).'),
('ethinyl estradiol','rosuvastatin','mineure','ethinyl estradiol × rosuvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','dipyridamole','mineure','aspirin × dipyridamole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','phenytoin','mineure','aspirin × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','valproic acid','mineure','aspirin × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','meclizine','mineure','alcohol × meclizine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ceftazidime','furosemide','mineure','ceftazidime × furosemide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','dalfampridine','mineure','cimetidine × dalfampridine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levorphanol','linezolid','majeure','levorphanol × linezolid — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('levorphanol','mirtazapine','majeure','levorphanol × mirtazapine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('levorphanol','trazodone','majeure','levorphanol × trazodone — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('levorphanol','tramadol','majeure','levorphanol × tramadol — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('levorphanol','naloxone','mineure','levorphanol × naloxone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','levorphanol','majeure','alcohol × levorphanol — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('lopinavir','rivaroxaban','modérée','lopinavir × rivaroxaban — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lopinavir','nifedipine','modérée','lopinavir × nifedipine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('felodipine','lopinavir','modérée','felodipine × lopinavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('amiodarone','lopinavir','modérée','amiodarone × lopinavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('dronedarone','lopinavir','contre_indication','dronedarone × lopinavir — Contre-indication : association déconseillée (risque grave documenté).'),
('lopinavir','simvastatin','contre_indication','lopinavir × simvastatin — Contre-indication : association déconseillée (risque grave documenté).')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
