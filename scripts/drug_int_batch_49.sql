-- drug_int_batch_49.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('isoproterenol','levothyroxine','mineure','isoproterenol × levothyroxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bictegravir','gentamicin','modérée','bictegravir × gentamicin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('bictegravir','rifampin','mineure','bictegravir × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bictegravir','phenytoin','mineure','bictegravir × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bictegravir','carbamazepine','mineure','bictegravir × carbamazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bictegravir','phenobarbital','mineure','bictegravir × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bictegravir','oxcarbazepine','mineure','bictegravir × oxcarbazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bictegravir','midazolam','modérée','bictegravir × midazolam — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('bictegravir','sertraline','modérée','bictegravir × sertraline — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('bictegravir','metformin','mineure','bictegravir × metformin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acyclovir','bictegravir','mineure','acyclovir × bictegravir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bictegravir','valacyclovir','mineure','bictegravir × valacyclovir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bictegravir','ganciclovir','mineure','bictegravir × ganciclovir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bictegravir','tenofovir','modérée','bictegravir × tenofovir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('bictegravir','sofosbuvir','modérée','bictegravir × sofosbuvir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('bictegravir','ledipasvir','modérée','bictegravir × ledipasvir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('bictegravir','sucralfate','mineure','bictegravir × sucralfate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bictegravir','calcium','mineure','bictegravir × calcium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bictegravir','iron','mineure','bictegravir × iron — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bictegravir','st. john''s wort','mineure','bictegravir × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','bictegravir','mineure','antacids × bictegravir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('medroxyprogesterone','st. john''s wort','mineure','medroxyprogesterone × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin ethylsuccinate','verapamil','mineure','erythromycin ethylsuccinate × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','erythromycin ethylsuccinate','mineure','digoxin × erythromycin ethylsuccinate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin ethylsuccinate','simvastatin','mineure','erythromycin ethylsuccinate × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin ethylsuccinate','lovastatin','mineure','erythromycin ethylsuccinate × lovastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin ethylsuccinate','phenytoin','mineure','erythromycin ethylsuccinate × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','erythromycin ethylsuccinate','mineure','carbamazepine × erythromycin ethylsuccinate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin ethylsuccinate','valproate','mineure','erythromycin ethylsuccinate × valproate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','erythromycin ethylsuccinate','mineure','alprazolam × erythromycin ethylsuccinate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin ethylsuccinate','midazolam','mineure','erythromycin ethylsuccinate × midazolam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin ethylsuccinate','prednisolone','mineure','erythromycin ethylsuccinate × prednisolone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin ethylsuccinate','methylprednisolone','mineure','erythromycin ethylsuccinate × methylprednisolone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colchicine','erythromycin ethylsuccinate','mineure','colchicine × erythromycin ethylsuccinate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','erythromycin ethylsuccinate','mineure','cyclosporine × erythromycin ethylsuccinate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin ethylsuccinate','tacrolimus','mineure','erythromycin ethylsuccinate × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin ethylsuccinate','theophylline','mineure','erythromycin ethylsuccinate × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin ethylsuccinate','sildenafil','mineure','erythromycin ethylsuccinate × sildenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','erythromycin ethylsuccinate','mineure','calcium × erythromycin ethylsuccinate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','promethazine','mineure','alcohol × promethazine — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
