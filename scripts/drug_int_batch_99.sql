-- drug_int_batch_99.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('lopinavir','pravastatin','modérée','lopinavir × pravastatin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lopinavir','lovastatin','contre_indication','lopinavir × lovastatin — Contre-indication : association déconseillée (risque grave documenté).'),
('azithromycin','lopinavir','modérée','azithromycin × lopinavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','lopinavir','modérée','clarithromycin × lopinavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('erythromycin','lopinavir','modérée','erythromycin × lopinavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lopinavir','metronidazole','mineure','lopinavir × metronidazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','lopinavir','modérée','fluconazole × lopinavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('itraconazole','lopinavir','mineure','itraconazole × lopinavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','lopinavir','mineure','ketoconazole × lopinavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lopinavir','voriconazole','mineure','lopinavir × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lopinavir','rifampin','contre_indication','lopinavir × rifampin — Contre-indication : association déconseillée (risque grave documenté).'),
('lopinavir','trimethoprim','modérée','lopinavir × trimethoprim — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lopinavir','sulfamethoxazole','modérée','lopinavir × sulfamethoxazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('carbamazepine','lopinavir','modérée','carbamazepine × lopinavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lopinavir','valproate','modérée','lopinavir × valproate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lopinavir','phenobarbital','modérée','lopinavir × phenobarbital — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lopinavir','midazolam','contre_indication','lopinavir × midazolam — Contre-indication : association déconseillée (risque grave documenté).'),
('lopinavir','quetiapine','mineure','lopinavir × quetiapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lopinavir','trazodone','mineure','lopinavir × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fentanyl','lopinavir','mineure','fentanyl × lopinavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lopinavir','prednisone','mineure','lopinavir × prednisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lopinavir','prednisolone','mineure','lopinavir × prednisolone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dexamethasone','lopinavir','mineure','dexamethasone × lopinavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lopinavir','methylprednisolone','mineure','lopinavir × methylprednisolone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colchicine','lopinavir','contre_indication','colchicine × lopinavir — Contre-indication : association déconseillée (risque grave documenté).'),
('cyclosporine','lopinavir','modérée','cyclosporine × lopinavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lopinavir','tacrolimus','modérée','lopinavir × tacrolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lopinavir','sirolimus','modérée','lopinavir × sirolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lopinavir','ritonavir','modérée','lopinavir × ritonavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('efavirenz','lopinavir','mineure','efavirenz × lopinavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lopinavir','tenofovir','modérée','lopinavir × tenofovir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lamivudine','lopinavir','modérée','lamivudine × lopinavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('abacavir','lopinavir','mineure','abacavir × lopinavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lopinavir','sofosbuvir','mineure','lopinavir × sofosbuvir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lopinavir','omeprazole','modérée','lopinavir × omeprazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lopinavir','ranitidine','modérée','lopinavir × ranitidine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lopinavir','sildenafil','contre_indication','lopinavir × sildenafil — Contre-indication : association déconseillée (risque grave documenté).'),
('lopinavir','tadalafil','contre_indication','lopinavir × tadalafil — Contre-indication : association déconseillée (risque grave documenté).'),
('calcium','lopinavir','mineure','calcium × lopinavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lopinavir','st. john''s wort','contre_indication','lopinavir × st. john''s wort — Contre-indication : association déconseillée (risque grave documenté).')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
