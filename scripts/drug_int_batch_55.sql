-- drug_int_batch_55.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('diazepam','theophylline','mineure','diazepam × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('midazolam','theophylline','mineure','midazolam × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluvoxamine','theophylline','mineure','fluvoxamine × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('prednisone','theophylline','mineure','prednisone × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('prednisolone','theophylline','mineure','prednisolone × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrocortisone','theophylline','mineure','hydrocortisone × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methylprednisolone','theophylline','mineure','methylprednisolone × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methotrexate','theophylline','mineure','methotrexate × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ranitidine','theophylline','mineure','ranitidine × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','theophylline','mineure','cimetidine × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('caffeine','theophylline','mineure','caffeine × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('st. john''s wort','theophylline','mineure','st. john''s wort × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','theophylline','mineure','alcohol × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('febuxostat','warfarin','modérée','febuxostat × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('febuxostat','naproxen','modérée','febuxostat × naproxen — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('febuxostat','indomethacin','modérée','febuxostat × indomethacin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('febuxostat','hydrochlorothiazide','modérée','febuxostat × hydrochlorothiazide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('colchicine','febuxostat','modérée','colchicine × febuxostat — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('febuxostat','theophylline','mineure','febuxostat × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sevelamer','warfarin','modérée','sevelamer × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('metoprolol','sevelamer','modérée','metoprolol × sevelamer — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('enalapril','sevelamer','modérée','enalapril × sevelamer — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('digoxin','sevelamer','modérée','digoxin × sevelamer — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ciprofloxacin','sevelamer','modérée','ciprofloxacin × sevelamer — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ofloxacin','sevelamer','modérée','ofloxacin × sevelamer — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('levothyroxine','sevelamer','mineure','levothyroxine × sevelamer — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','sevelamer','mineure','cyclosporine × sevelamer — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sevelamer','tacrolimus','mineure','sevelamer × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mycophenolate','sevelamer','modérée','mycophenolate × sevelamer — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('iron','sevelamer','modérée','iron × sevelamer — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','estradiol','mineure','clarithromycin × estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','estradiol','mineure','erythromycin × estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('estradiol','itraconazole','mineure','estradiol × itraconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('estradiol','ketoconazole','mineure','estradiol × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('estradiol','rifampin','majeure','estradiol × rifampin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('carbamazepine','estradiol','majeure','carbamazepine × estradiol — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('estradiol','phenobarbital','majeure','estradiol × phenobarbital — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('estradiol','ritonavir','mineure','estradiol × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('estradiol','st. john''s wort','majeure','estradiol × st. john''s wort — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('estradiol','grapefruit juice','mineure','estradiol × grapefruit juice — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
