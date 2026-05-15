-- drug_int_batch_04.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('azithromycin dihydrate','digoxin','mineure','azithromycin dihydrate × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('azithromycin dihydrate','phenytoin','mineure','azithromycin dihydrate × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('azithromycin dihydrate','colchicine','mineure','azithromycin dihydrate × colchicine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('divalproex','warfarin','mineure','divalproex × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','divalproex','modérée','aspirin × divalproex — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('divalproex','rifampin','mineure','divalproex × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('divalproex','phenytoin','mineure','divalproex × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','divalproex','mineure','carbamazepine × divalproex — Interaction mineure : association généralement possible, surveillance habituelle.'),
('divalproex','valproic acid','mineure','divalproex × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('divalproex','valproate','mineure','divalproex × valproate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('divalproex','phenobarbital','mineure','divalproex × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('divalproex','lamotrigine','mineure','divalproex × lamotrigine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('divalproex','topiramate','mineure','divalproex × topiramate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diazepam','divalproex','mineure','diazepam × divalproex — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonazepam','divalproex','majeure','clonazepam × divalproex — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('amitriptyline','divalproex','mineure','amitriptyline × divalproex — Interaction mineure : association généralement possible, surveillance habituelle.'),
('divalproex','nortriptyline','mineure','divalproex × nortriptyline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('divalproex','methotrexate','modérée','divalproex × methotrexate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('divalproex','ritonavir','mineure','divalproex × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','metoclopramide','mineure','digoxin × metoclopramide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metoclopramide','tetracycline','mineure','metoclopramide × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin','metoclopramide','mineure','insulin × metoclopramide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','metoclopramide','mineure','cyclosporine × metoclopramide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','metoclopramide','mineure','alcohol × metoclopramide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lamotrigine','rifampin','mineure','lamotrigine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lamotrigine','phenytoin','mineure','lamotrigine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','lamotrigine','mineure','carbamazepine × lamotrigine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lamotrigine','valproate','mineure','lamotrigine × valproate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lamotrigine','phenobarbital','mineure','lamotrigine × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lamotrigine','lopinavir','mineure','lamotrigine × lopinavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lamotrigine','ritonavir','mineure','lamotrigine × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','lamotrigine','mineure','atazanavir × lamotrigine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','simvastatin','mineure','amlodipine × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','cyclosporine','mineure','amlodipine × cyclosporine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','tacrolimus','mineure','amlodipine × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','sildenafil','modérée','amlodipine × sildenafil — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('fluoxetine','perphenazine','mineure','fluoxetine × perphenazine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('perphenazine','sertraline','mineure','perphenazine × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paroxetine','perphenazine','mineure','paroxetine × perphenazine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atenolol','rivastigmine','mineure','atenolol × rivastigmine — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
