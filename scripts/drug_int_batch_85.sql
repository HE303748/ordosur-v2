-- drug_int_batch_85.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('calcium','posaconazole','mineure','calcium × posaconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','posaconazole','mineure','antacids × posaconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','warfarin','modérée','clarithromycin × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','diltiazem','modérée','clarithromycin × diltiazem — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','verapamil','modérée','clarithromycin × verapamil — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('amiodarone','clarithromycin','majeure','amiodarone × clarithromycin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('clarithromycin','sotalol','majeure','clarithromycin × sotalol — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('atorvastatin','clarithromycin','modérée','atorvastatin × clarithromycin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','erythromycin','mineure','clarithromycin × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','fluconazole','modérée','clarithromycin × fluconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','itraconazole','modérée','clarithromycin × itraconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','phenytoin','modérée','clarithromycin × phenytoin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','valproate','modérée','clarithromycin × valproate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','phenobarbital','mineure','clarithromycin × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','lorazepam','modérée','clarithromycin × lorazepam — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','midazolam','modérée','clarithromycin × midazolam — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','quetiapine','mineure','clarithromycin × quetiapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','insulin','modérée','clarithromycin × insulin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','prednisolone','mineure','clarithromycin × prednisolone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','methylprednisolone','mineure','clarithromycin × methylprednisolone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','colchicine','contre_indication','clarithromycin × colchicine — Contre-indication : association déconseillée (risque grave documenté).'),
('clarithromycin','cyclosporine','modérée','clarithromycin × cyclosporine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','ritonavir','mineure','clarithromycin × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','clarithromycin','modérée','atazanavir × clarithromycin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','efavirenz','modérée','clarithromycin × efavirenz — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','sildenafil','modérée','clarithromycin × sildenafil — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','tadalafil','modérée','clarithromycin × tadalafil — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('calcium','clarithromycin','modérée','calcium × clarithromycin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('midazolam','rifampin','mineure','midazolam × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('midazolam','phenytoin','mineure','midazolam × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('midazolam','phenobarbital','mineure','midazolam × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methylphenidate','midazolam','mineure','methylphenidate × midazolam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('midazolam','ritonavir','mineure','midazolam × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','midazolam','modérée','calcium × midazolam — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ampicillin','norethindrone and ethinyl estradiol','mineure','ampicillin × norethindrone and ethinyl estradiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norethindrone and ethinyl estradiol','tetracycline','mineure','norethindrone and ethinyl estradiol × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norethindrone and ethinyl estradiol','rifampin','majeure','norethindrone and ethinyl estradiol × rifampin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('norethindrone and ethinyl estradiol','phenytoin','mineure','norethindrone and ethinyl estradiol × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('norethindrone and ethinyl estradiol','ritonavir','mineure','norethindrone and ethinyl estradiol × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('entacapone','warfarin','majeure','entacapone × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
