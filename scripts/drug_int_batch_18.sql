-- drug_int_batch_18.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('lamotrigine','norgestimate and ethinyl estradiol','mineure','lamotrigine × norgestimate and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norgestimate and ethinyl estradiol','topiramate','mineure','norgestimate and ethinyl estradiol × topiramate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norgestimate and ethinyl estradiol','oxcarbazepine','mineure','norgestimate and ethinyl estradiol × oxcarbazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('morphine','norgestimate and ethinyl estradiol','mineure','morphine × norgestimate and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norgestimate and ethinyl estradiol','prednisolone','mineure','norgestimate and ethinyl estradiol × prednisolone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','norgestimate and ethinyl estradiol','mineure','cyclosporine × norgestimate and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lopinavir','norgestimate and ethinyl estradiol','mineure','lopinavir × norgestimate and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norgestimate and ethinyl estradiol','ritonavir','mineure','norgestimate and ethinyl estradiol × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','norgestimate and ethinyl estradiol','mineure','atazanavir × norgestimate and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norgestimate and ethinyl estradiol','theophylline','mineure','norgestimate and ethinyl estradiol × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('grapefruit juice','norgestimate and ethinyl estradiol','mineure','grapefruit juice × norgestimate and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','metoprolol','modérée','diltiazem × metoprolol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clonidine','metoprolol','modérée','clonidine × metoprolol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('fluoxetine','metoprolol','mineure','fluoxetine × metoprolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metoprolol','paroxetine','mineure','metoprolol × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('celecoxib','warfarin','majeure','celecoxib × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('aspirin','celecoxib','majeure','aspirin × celecoxib — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('celecoxib','diclofenac','mineure','celecoxib × diclofenac — Interaction mineure : association généralement possible, surveillance habituelle.'),
('celecoxib','indomethacin','mineure','celecoxib × indomethacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('celecoxib','meloxicam','mineure','celecoxib × meloxicam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('celecoxib','propranolol','mineure','celecoxib × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('celecoxib','furosemide','mineure','celecoxib × furosemide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('celecoxib','digoxin','mineure','celecoxib × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('celecoxib','fluconazole','mineure','celecoxib × fluconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('celecoxib','rifampin','mineure','celecoxib × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('celecoxib','lithium','mineure','celecoxib × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('celecoxib','cyclosporine','mineure','celecoxib × cyclosporine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('celecoxib','methotrexate','modérée','celecoxib × methotrexate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('finasteride','warfarin','mineure','finasteride × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','finasteride','modérée','aspirin × finasteride — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('finasteride','propranolol','mineure','finasteride × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','finasteride','mineure','digoxin × finasteride — Interaction mineure : association généralement possible, surveillance habituelle.'),
('finasteride','theophylline','mineure','finasteride × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','finasteride','modérée','calcium × finasteride — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('erythromycin','sildenafil','mineure','erythromycin × sildenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','sildenafil','mineure','itraconazole × sildenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','sildenafil','mineure','ketoconazole × sildenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ritonavir','sildenafil','mineure','ritonavir × sildenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','sildenafil','mineure','alcohol × sildenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','doxepin','mineure','cimetidine × doxepin — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
