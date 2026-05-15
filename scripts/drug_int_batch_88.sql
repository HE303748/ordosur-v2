-- drug_int_batch_88.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('fentanyl','venlafaxine','majeure','fentanyl × venlafaxine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('amiodarone','rifampin','mineure','amiodarone × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','methotrexate','mineure','amiodarone × methotrexate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','calcium','mineure','amiodarone × calcium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nifedipine','ranitidine','mineure','nifedipine × ranitidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clopidogrel','vonoprazan and amoxicillin','mineure','clopidogrel × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','vonoprazan and amoxicillin','mineure','amlodipine × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nifedipine','vonoprazan and amoxicillin','mineure','nifedipine × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','vonoprazan and amoxicillin','mineure','diltiazem × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('verapamil','vonoprazan and amoxicillin','modérée','verapamil × vonoprazan and amoxicillin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('digoxin','vonoprazan and amoxicillin','mineure','digoxin × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','vonoprazan and amoxicillin','contre_indication','amiodarone × vonoprazan and amoxicillin — Contre-indication : association déconseillée (risque grave documenté).'),
('sotalol','vonoprazan and amoxicillin','mineure','sotalol × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','vonoprazan and amoxicillin','modérée','atorvastatin × vonoprazan and amoxicillin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('simvastatin','vonoprazan and amoxicillin','modérée','simvastatin × vonoprazan and amoxicillin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('pravastatin','vonoprazan and amoxicillin','mineure','pravastatin × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lovastatin','vonoprazan and amoxicillin','modérée','lovastatin × vonoprazan and amoxicillin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ampicillin','vonoprazan and amoxicillin','mineure','ampicillin × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','vonoprazan and amoxicillin','mineure','clarithromycin × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','vonoprazan and amoxicillin','mineure','itraconazole × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','vonoprazan and amoxicillin','mineure','ketoconazole × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','vonoprazan and amoxicillin','mineure','phenytoin × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('valproate','vonoprazan and amoxicillin','mineure','valproate × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenobarbital','vonoprazan and amoxicillin','mineure','phenobarbital × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','vonoprazan and amoxicillin','mineure','alprazolam × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('midazolam','vonoprazan and amoxicillin','modérée','midazolam × vonoprazan and amoxicillin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('quetiapine','vonoprazan and amoxicillin','mineure','quetiapine × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('citalopram','vonoprazan and amoxicillin','mineure','citalopram × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin','vonoprazan and amoxicillin','mineure','insulin × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('prednisolone','vonoprazan and amoxicillin','mineure','prednisolone × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methylprednisolone','vonoprazan and amoxicillin','mineure','methylprednisolone × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('allopurinol','vonoprazan and amoxicillin','mineure','allopurinol × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colchicine','vonoprazan and amoxicillin','mineure','colchicine × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('probenecid','vonoprazan and amoxicillin','mineure','probenecid × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','vonoprazan and amoxicillin','mineure','cyclosporine × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('tacrolimus','vonoprazan and amoxicillin','mineure','tacrolimus × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mycophenolate','vonoprazan and amoxicillin','mineure','mycophenolate × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ritonavir','vonoprazan and amoxicillin','mineure','ritonavir × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','vonoprazan and amoxicillin','contre_indication','atazanavir × vonoprazan and amoxicillin — Contre-indication : association déconseillée (risque grave documenté).'),
('omeprazole','vonoprazan and amoxicillin','mineure','omeprazole × vonoprazan and amoxicillin — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
