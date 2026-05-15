-- drug_int_batch_64.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('midazolam','ranitidine','modérée','midazolam × ranitidine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cimetidine','midazolam','modérée','cimetidine × midazolam — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('sorafenib','warfarin','majeure','sorafenib × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('rifampin','sorafenib','mineure','rifampin × sorafenib — Interaction mineure : association généralement possible, surveillance habituelle.'),
('emtricitabine','gentamicin','modérée','emtricitabine × gentamicin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('emtricitabine','itraconazole','modérée','emtricitabine × itraconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('emtricitabine','ketoconazole','modérée','emtricitabine × ketoconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('emtricitabine','rifampin','mineure','emtricitabine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('emtricitabine','phenytoin','mineure','emtricitabine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','emtricitabine','mineure','carbamazepine × emtricitabine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('emtricitabine','phenobarbital','mineure','emtricitabine × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('emtricitabine','oxcarbazepine','mineure','emtricitabine × oxcarbazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('emtricitabine','lorazepam','modérée','emtricitabine × lorazepam — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('emtricitabine','midazolam','modérée','emtricitabine × midazolam — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('emtricitabine','sertraline','modérée','emtricitabine × sertraline — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('buprenorphine','emtricitabine','modérée','buprenorphine × emtricitabine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('emtricitabine','naloxone','modérée','emtricitabine × naloxone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('acyclovir','emtricitabine','mineure','acyclovir × emtricitabine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('emtricitabine','valacyclovir','mineure','emtricitabine × valacyclovir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('emtricitabine','ganciclovir','mineure','emtricitabine × ganciclovir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('emtricitabine','lopinavir','modérée','emtricitabine × lopinavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('emtricitabine','ritonavir','mineure','emtricitabine × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','emtricitabine','mineure','atazanavir × emtricitabine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('efavirenz','emtricitabine','modérée','efavirenz × emtricitabine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('emtricitabine','tenofovir','modérée','emtricitabine × tenofovir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('emtricitabine','sofosbuvir','modérée','emtricitabine × sofosbuvir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('emtricitabine','ledipasvir','modérée','emtricitabine × ledipasvir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('emtricitabine','st. john''s wort','mineure','emtricitabine × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cefdinir','probenecid','mineure','cefdinir × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cefdinir','iron','mineure','cefdinir × iron — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cefdinir','magnesium','mineure','cefdinir × magnesium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','cefdinir','mineure','antacids × cefdinir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('labetalol','verapamil','mineure','labetalol × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('labetalol','nitroglycerin','mineure','labetalol × nitroglycerin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','labetalol','mineure','cimetidine × labetalol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','labetalol','mineure','calcium × labetalol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('arformoterol','theophylline','modérée','arformoterol × theophylline — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('aminophylline','arformoterol','modérée','aminophylline × arformoterol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ivabradine','verapamil','mineure','ivabradine × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('capsaicin','nitroglycerin','modérée','capsaicin × nitroglycerin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
