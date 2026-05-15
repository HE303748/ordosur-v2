-- drug_int_batch_101.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('antacids','cefuroxime axetil','mineure','antacids × cefuroxime axetil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('disopyramide','propranolol','mineure','disopyramide × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('disopyramide','verapamil','mineure','disopyramide × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','disopyramide','mineure','digoxin × disopyramide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','disopyramide','majeure','clarithromycin × disopyramide — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('disopyramide','erythromycin','mineure','disopyramide × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('disopyramide','ketoconazole','mineure','disopyramide × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('disopyramide','phenytoin','mineure','disopyramide × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diazepam','disopyramide','mineure','diazepam × disopyramide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('brivaracetam','rifampin','mineure','brivaracetam × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('brivaracetam','phenytoin','modérée','brivaracetam × phenytoin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('brivaracetam','carbamazepine','mineure','brivaracetam × carbamazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('brivaracetam','levetiracetam','mineure','brivaracetam × levetiracetam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin','lanreotide','mineure','insulin × lanreotide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','lanreotide','mineure','cyclosporine × lanreotide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sapropterin dihydrochloride','trimethoprim','mineure','sapropterin dihydrochloride × trimethoprim — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sapropterin dihydrochloride','valproic acid','mineure','sapropterin dihydrochloride × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenobarbital','sapropterin dihydrochloride','mineure','phenobarbital × sapropterin dihydrochloride — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methotrexate','sapropterin dihydrochloride','mineure','methotrexate × sapropterin dihydrochloride — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sapropterin dihydrochloride','sildenafil','mineure','sapropterin dihydrochloride × sildenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sapropterin dihydrochloride','tadalafil','mineure','sapropterin dihydrochloride × tadalafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','ritonavir','modérée','diltiazem × ritonavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('amiodarone','ritonavir','contre_indication','amiodarone × ritonavir — Contre-indication : association déconseillée (risque grave documenté).'),
('flecainide','ritonavir','contre_indication','flecainide × ritonavir — Contre-indication : association déconseillée (risque grave documenté).'),
('dronedarone','ritonavir','contre_indication','dronedarone × ritonavir — Contre-indication : association déconseillée (risque grave documenté).'),
('lovastatin','ritonavir','contre_indication','lovastatin × ritonavir — Contre-indication : association déconseillée (risque grave documenté).'),
('metronidazole','ritonavir','mineure','metronidazole × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','ritonavir','mineure','itraconazole × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','ritonavir','mineure','ketoconazole × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','ritonavir','modérée','carbamazepine × ritonavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('diazepam','ritonavir','mineure','diazepam × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonazepam','ritonavir','modérée','clonazepam × ritonavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ritonavir','zolpidem','mineure','ritonavir × zolpidem — Interaction mineure : association généralement possible, surveillance habituelle.'),
('risperidone','ritonavir','mineure','risperidone × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','ritonavir','mineure','fluoxetine × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amitriptyline','ritonavir','mineure','amitriptyline × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nortriptyline','ritonavir','mineure','nortriptyline × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('prednisolone','ritonavir','majeure','prednisolone × ritonavir — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('methylprednisolone','ritonavir','majeure','methylprednisolone × ritonavir — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('cyclosporine','ritonavir','modérée','cyclosporine × ritonavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
