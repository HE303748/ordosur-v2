-- drug_int_batch_73.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('sirolimus','voriconazole','contre_indication','sirolimus × voriconazole — Contre-indication : association déconseillée (risque grave documenté).'),
('everolimus','voriconazole','mineure','everolimus × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ritonavir','voriconazole','contre_indication','ritonavir × voriconazole — Contre-indication : association déconseillée (risque grave documenté).'),
('efavirenz','voriconazole','contre_indication','efavirenz × voriconazole — Contre-indication : association déconseillée (risque grave documenté).'),
('calcium','voriconazole','modérée','calcium × voriconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('st. john''s wort','voriconazole','contre_indication','st. john''s wort × voriconazole — Contre-indication : association déconseillée (risque grave documenté).'),
('adalimumab-aacf','warfarin','mineure','adalimumab-aacf × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('adalimumab-aacf','cyclosporine','modérée','adalimumab-aacf × cyclosporine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('adalimumab-aacf','methotrexate','mineure','adalimumab-aacf × methotrexate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('adalimumab-aacf','rituximab','majeure','adalimumab-aacf × rituximab — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('abatacept','adalimumab-aacf','majeure','abatacept × adalimumab-aacf — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('adalimumab-aacf','theophylline','modérée','adalimumab-aacf × theophylline — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('antacids','ethambutol','mineure','antacids × ethambutol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levetiracetam','warfarin','mineure','levetiracetam × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','levetiracetam','mineure','digoxin × levetiracetam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levetiracetam','phenytoin','mineure','levetiracetam × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','levetiracetam','mineure','carbamazepine × levetiracetam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levetiracetam','valproic acid','mineure','levetiracetam × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levetiracetam','valproate','mineure','levetiracetam × valproate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levetiracetam','phenobarbital','mineure','levetiracetam × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('gabapentin','levetiracetam','mineure','gabapentin × levetiracetam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lamotrigine','levetiracetam','mineure','lamotrigine × levetiracetam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levetiracetam','topiramate','mineure','levetiracetam × topiramate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('levetiracetam','probenecid','mineure','levetiracetam × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dopamine','linezolid','mineure','dopamine × linezolid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amitriptyline','dopamine','mineure','amitriptyline × dopamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dopamine','nortriptyline','mineure','dopamine × nortriptyline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonidine','ephedrine','mineure','clonidine × ephedrine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ephedrine','theophylline','mineure','ephedrine × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin','testosterone cypionate','mineure','insulin × testosterone cypionate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('caspofungin','rifampin','mineure','caspofungin × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('caspofungin','phenytoin','mineure','caspofungin × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','caspofungin','mineure','carbamazepine × caspofungin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('caspofungin','dexamethasone','mineure','caspofungin × dexamethasone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('caspofungin','cyclosporine','mineure','caspofungin × cyclosporine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('caspofungin','tacrolimus','modérée','caspofungin × tacrolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('caspofungin','efavirenz','mineure','caspofungin × efavirenz — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','clozapine','mineure','amiodarone × clozapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','flecainide','mineure','clozapine × flecainide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','sotalol','mineure','clozapine × sotalol — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
