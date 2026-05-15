-- drug_int_batch_34.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('itraconazole','lovastatin','modérée','itraconazole × lovastatin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ketoconazole','lovastatin','modérée','ketoconazole × lovastatin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lovastatin','voriconazole','modérée','lovastatin × voriconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lovastatin','posaconazole','modérée','lovastatin × posaconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('glipizide','lovastatin','mineure','glipizide × lovastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin','lovastatin','mineure','insulin × lovastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colchicine','lovastatin','mineure','colchicine × lovastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','lovastatin','mineure','cyclosporine × lovastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','lovastatin','mineure','cimetidine × lovastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','lovastatin','mineure','iron × lovastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('grapefruit juice','lovastatin','modérée','grapefruit juice × lovastatin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('haloperidol','metyrosine','modérée','haloperidol × metyrosine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alcohol','metyrosine','modérée','alcohol × metyrosine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alprazolam','digoxin','modérée','alprazolam × digoxin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alprazolam','clarithromycin','modérée','alprazolam × clarithromycin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alprazolam','itraconazole','modérée','alprazolam × itraconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alprazolam','ketoconazole','modérée','alprazolam × ketoconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alprazolam','phenytoin','mineure','alprazolam × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','carbamazepine','mineure','alprazolam × carbamazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','fluvoxamine','mineure','alprazolam × fluvoxamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','tramadol','mineure','alprazolam × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','morphine','mineure','alprazolam × morphine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','oxycodone','mineure','alprazolam × oxycodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','fentanyl','mineure','alprazolam × fentanyl — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','codeine','mineure','alprazolam × codeine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','buprenorphine','mineure','alprazolam × buprenorphine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','ritonavir','modérée','alprazolam × ritonavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alprazolam','cimetidine','mineure','alprazolam × cimetidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','alprazolam','mineure','alcohol × alprazolam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('imatinib','warfarin','mineure','imatinib × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('heparin','imatinib','mineure','heparin × imatinib — Interaction mineure : association généralement possible, surveillance habituelle.'),
('imatinib','methotrexate','mineure','imatinib × methotrexate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','imatinib','mineure','calcium × imatinib — Interaction mineure : association généralement possible, surveillance habituelle.'),
('grapefruit juice','imatinib','mineure','grapefruit juice × imatinib — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rucaparib camsylate','warfarin','modérée','rucaparib camsylate × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('azathioprine','balsalazide disodium','modérée','azathioprine × balsalazide disodium — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('irbesartan','lithium','mineure','irbesartan × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetaminophen','propranolol','mineure','acetaminophen × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetaminophen','lamotrigine','mineure','acetaminophen × lamotrigine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetaminophen','oxycodone','mineure','acetaminophen × oxycodone — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
