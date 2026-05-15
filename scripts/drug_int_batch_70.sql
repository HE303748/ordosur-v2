-- drug_int_batch_70.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('fluoxetine','tipranavir','contre_indication','fluoxetine × tipranavir — Contre-indication : association déconseillée (risque grave documenté).'),
('sertraline','tipranavir','contre_indication','sertraline × tipranavir — Contre-indication : association déconseillée (risque grave documenté).'),
('paroxetine','tipranavir','contre_indication','paroxetine × tipranavir — Contre-indication : association déconseillée (risque grave documenté).'),
('tipranavir','trazodone','mineure','tipranavir × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('buprenorphine','tipranavir','mineure','buprenorphine × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('naloxone','tipranavir','mineure','naloxone × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glipizide','tipranavir','mineure','glipizide × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('glimepiride','tipranavir','mineure','glimepiride × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colchicine','tipranavir','contre_indication','colchicine × tipranavir — Contre-indication : association déconseillée (risque grave documenté).'),
('cyclosporine','tipranavir','mineure','cyclosporine × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('tacrolimus','tipranavir','mineure','tacrolimus × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sirolimus','tipranavir','mineure','sirolimus × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lopinavir','tipranavir','modérée','lopinavir × tipranavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ritonavir','tipranavir','mineure','ritonavir × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','tipranavir','modérée','atazanavir × tipranavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('abacavir','tipranavir','mineure','abacavir × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('omeprazole','tipranavir','mineure','omeprazole × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('caffeine','tipranavir','mineure','caffeine × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sildenafil','tipranavir','contre_indication','sildenafil × tipranavir — Contre-indication : association déconseillée (risque grave documenté).'),
('tadalafil','tipranavir','mineure','tadalafil × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','tipranavir','mineure','calcium × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','tipranavir','mineure','alcohol × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('marcaine, lidocaine, kenalog, povidone iodine','warfarin','mineure','marcaine, lidocaine, kenalog, povidone iodine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','marcaine, lidocaine, kenalog, povidone iodine','modérée','aspirin × marcaine, lidocaine, kenalog, povidone iodine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('marcaine, lidocaine, kenalog, povidone iodine','nitroglycerin','mineure','marcaine, lidocaine, kenalog, povidone iodine × nitroglycerin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','marcaine, lidocaine, kenalog, povidone iodine','mineure','clarithromycin × marcaine, lidocaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','marcaine, lidocaine, kenalog, povidone iodine','mineure','itraconazole × marcaine, lidocaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','marcaine, lidocaine, kenalog, povidone iodine','modérée','ketoconazole × marcaine, lidocaine, kenalog, povidone iodine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('marcaine, lidocaine, kenalog, povidone iodine','rifampin','mineure','marcaine, lidocaine, kenalog, povidone iodine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('marcaine, lidocaine, kenalog, povidone iodine','nitrofurantoin','mineure','marcaine, lidocaine, kenalog, povidone iodine × nitrofurantoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('marcaine, lidocaine, kenalog, povidone iodine','phenytoin','mineure','marcaine, lidocaine, kenalog, povidone iodine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','marcaine, lidocaine, kenalog, povidone iodine','mineure','carbamazepine × marcaine, lidocaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('marcaine, lidocaine, kenalog, povidone iodine','valproate','mineure','marcaine, lidocaine, kenalog, povidone iodine × valproate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('marcaine, lidocaine, kenalog, povidone iodine','phenobarbital','mineure','marcaine, lidocaine, kenalog, povidone iodine × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrocortisone','marcaine, lidocaine, kenalog, povidone iodine','mineure','hydrocortisone × marcaine, lidocaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','marcaine, lidocaine, kenalog, povidone iodine','mineure','cyclosporine × marcaine, lidocaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('marcaine, lidocaine, kenalog, povidone iodine','ritonavir','mineure','marcaine, lidocaine, kenalog, povidone iodine × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','marcaine, lidocaine, kenalog, povidone iodine','mineure','atazanavir × marcaine, lidocaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('chloroquine','marcaine, lidocaine, kenalog, povidone iodine','mineure','chloroquine × marcaine, lidocaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('marcaine, lidocaine, kenalog, povidone iodine','metoclopramide','mineure','marcaine, lidocaine, kenalog, povidone iodine × metoclopramide — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
