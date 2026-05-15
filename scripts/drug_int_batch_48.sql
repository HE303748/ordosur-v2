-- drug_int_batch_48.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('linezolid','venlafaxine','contre_indication','linezolid × venlafaxine — Contre-indication : association déconseillée (risque grave documenté).'),
('amphetamine','venlafaxine','mineure','amphetamine × venlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','venlafaxine','mineure','iron × venlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','ropivacaine','modérée','amiodarone × ropivacaine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('nitroglycerin','ropivacaine','modérée','nitroglycerin × ropivacaine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ketoconazole','ropivacaine','mineure','ketoconazole × ropivacaine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nitrofurantoin','ropivacaine','modérée','nitrofurantoin × ropivacaine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('phenytoin','ropivacaine','modérée','phenytoin × ropivacaine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ropivacaine','valproate','modérée','ropivacaine × valproate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('phenobarbital','ropivacaine','modérée','phenobarbital × ropivacaine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('fluvoxamine','ropivacaine','mineure','fluvoxamine × ropivacaine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('chloroquine','ropivacaine','modérée','chloroquine × ropivacaine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('metoclopramide','ropivacaine','modérée','metoclopramide × ropivacaine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ropivacaine','theophylline','mineure','ropivacaine × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','digoxin','modérée','amlodipine × digoxin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('amlodipine','atorvastatin','mineure','amlodipine × atorvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','clarithromycin','mineure','amlodipine × clarithromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','itraconazole','mineure','amlodipine × itraconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','ketoconazole','mineure','amlodipine × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','voriconazole','mineure','amlodipine × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','posaconazole','mineure','amlodipine × posaconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','colchicine','mineure','amlodipine × colchicine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','lopinavir','mineure','amlodipine × lopinavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','ritonavir','mineure','amlodipine × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','sofosbuvir','mineure','amlodipine × sofosbuvir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','ledipasvir','mineure','amlodipine × ledipasvir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','grapefruit juice','modérée','amlodipine × grapefruit juice — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('insulin','liraglutide','mineure','insulin × liraglutide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('tetracycline','tretinoin','modérée','tetracycline × tretinoin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('calcium','potassium, monobasic','mineure','calcium × potassium, monobasic — Interaction mineure : association généralement possible, surveillance habituelle.'),
('magnesium','potassium, monobasic','mineure','magnesium × potassium, monobasic — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','potassium, monobasic','mineure','antacids × potassium, monobasic — Interaction mineure : association généralement possible, surveillance habituelle.'),
('escitalopram','warfarin','mineure','escitalopram × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','escitalopram','mineure','aspirin × escitalopram — Interaction mineure : association généralement possible, surveillance habituelle.'),
('escitalopram','linezolid','contre_indication','escitalopram × linezolid — Contre-indication : association déconseillée (risque grave documenté).'),
('escitalopram','lithium','mineure','escitalopram × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','escitalopram','mineure','carbamazepine × escitalopram — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine','escitalopram','mineure','amphetamine × escitalopram — Interaction mineure : association généralement possible, surveillance habituelle.'),
('escitalopram','iron','mineure','escitalopram × iron — Interaction mineure : association généralement possible, surveillance habituelle.'),
('isoproterenol','propranolol','mineure','isoproterenol × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
