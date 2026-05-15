-- drug_int_batch_95.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('mirtazapine','phenytoin','mineure','mirtazapine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diazepam','mirtazapine','modérée','diazepam × mirtazapine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alprazolam','mirtazapine','modérée','alprazolam × mirtazapine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('amphetamine','mirtazapine','mineure','amphetamine × mirtazapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mirtazapine','ritonavir','mineure','mirtazapine × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','mirtazapine','mineure','cimetidine × mirtazapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','mirtazapine','mineure','iron × mirtazapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','mirtazapine','mineure','alcohol × mirtazapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','st. john''s wort','mineure','amlodipine × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sertraline','tramadol','mineure','sertraline × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fentanyl','sertraline','mineure','fentanyl × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('candesartan cilexetil','lithium','mineure','candesartan cilexetil × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('desvenlafaxine','warfarin','modérée','desvenlafaxine × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('aspirin','desvenlafaxine','modérée','aspirin × desvenlafaxine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('desvenlafaxine','metoprolol','mineure','desvenlafaxine × metoprolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('desvenlafaxine','nebivolol','mineure','desvenlafaxine × nebivolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('desvenlafaxine','linezolid','mineure','desvenlafaxine × linezolid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('desvenlafaxine','lithium','mineure','desvenlafaxine × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('desvenlafaxine','midazolam','mineure','desvenlafaxine × midazolam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aripiprazole','desvenlafaxine','mineure','aripiprazole × desvenlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine','desvenlafaxine','mineure','amphetamine × desvenlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('desvenlafaxine','iron','mineure','desvenlafaxine × iron — Interaction mineure : association généralement possible, surveillance habituelle.'),
('desvenlafaxine','st. john''s wort','majeure','desvenlafaxine × st. john''s wort — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('alcohol','desvenlafaxine','mineure','alcohol × desvenlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('divalproex','lithium','mineure','divalproex × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('divalproex','lorazepam','mineure','divalproex × lorazepam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('divalproex','haloperidol','mineure','divalproex × haloperidol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('divalproex','olanzapine','modérée','divalproex × olanzapine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clozapine','divalproex','mineure','clozapine × divalproex — Interaction mineure : association généralement possible, surveillance habituelle.'),
('divalproex','ranitidine','mineure','divalproex × ranitidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','divalproex','mineure','cimetidine × divalproex — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','divalproex','mineure','antacids × divalproex — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','fingolimod','mineure','diltiazem × fingolimod — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fingolimod','verapamil','mineure','fingolimod × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','fingolimod','mineure','digoxin × fingolimod — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','fingolimod','modérée','erythromycin × fingolimod — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('fingolimod','ketoconazole','modérée','fingolimod × ketoconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('fingolimod','haloperidol','modérée','fingolimod × haloperidol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('citalopram','fingolimod','modérée','citalopram × fingolimod — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('calcium','fingolimod','mineure','calcium × fingolimod — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
