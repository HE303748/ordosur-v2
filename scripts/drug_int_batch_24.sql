-- drug_int_batch_24.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('aspirin','venlafaxine','mineure','aspirin × venlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metoprolol','venlafaxine','mineure','metoprolol × venlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','venlafaxine','mineure','ketoconazole × venlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','venlafaxine','mineure','lithium × venlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diazepam','venlafaxine','mineure','diazepam × venlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','venlafaxine','mineure','alprazolam × venlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('haloperidol','venlafaxine','mineure','haloperidol × venlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('risperidone','venlafaxine','mineure','risperidone × venlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','venlafaxine','mineure','fluoxetine × venlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','venlafaxine','mineure','cimetidine × venlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('caffeine','venlafaxine','mineure','caffeine × venlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','venlafaxine','mineure','alcohol × venlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','succinylcholine','mineure','lithium × succinylcholine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('chloroquine','succinylcholine','mineure','chloroquine × succinylcholine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metoclopramide','succinylcholine','mineure','metoclopramide × succinylcholine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('magnesium','succinylcholine','mineure','magnesium × succinylcholine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('linezolid','naloxone','majeure','linezolid × naloxone — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('mirtazapine','naloxone','mineure','mirtazapine × naloxone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('naloxone','trazodone','mineure','naloxone × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buprenorphine','naloxone','modérée','buprenorphine × naloxone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alcohol','naloxone','majeure','alcohol × naloxone — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('heparin','sertraline','mineure','heparin × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clopidogrel','sertraline','mineure','clopidogrel × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metoprolol','sertraline','mineure','metoprolol × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nebivolol','sertraline','mineure','nebivolol × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','sertraline','mineure','amiodarone × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sertraline','sotalol','mineure','sertraline × sotalol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('moxifloxacin','sertraline','mineure','moxifloxacin × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','sertraline','mineure','erythromycin × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('linezolid','sertraline','contre_indication','linezolid × sertraline — Contre-indication : association déconseillée (risque grave documenté).'),
('sertraline','ziprasidone','mineure','sertraline × ziprasidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sertraline','venlafaxine','mineure','sertraline × venlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine','sertraline','mineure','amphetamine × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sertraline','tacrolimus','mineure','sertraline × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','sertraline','mineure','iron × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rocuronium','tetracycline','mineure','rocuronium × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rocuronium','vancomycin','mineure','rocuronium × vancomycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colistin','rocuronium','mineure','colistin × rocuronium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','rocuronium','mineure','lithium × rocuronium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','rocuronium','mineure','phenytoin × rocuronium — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
