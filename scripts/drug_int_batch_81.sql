-- drug_int_batch_81.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('nitroglycerin','vardenafil trihydrate','mineure','nitroglycerin × vardenafil trihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','vardenafil trihydrate','contre_indication','clarithromycin × vardenafil trihydrate — Contre-indication : association déconseillée (risque grave documenté).'),
('erythromycin','vardenafil trihydrate','contre_indication','erythromycin × vardenafil trihydrate — Contre-indication : association déconseillée (risque grave documenté).'),
('itraconazole','vardenafil trihydrate','contre_indication','itraconazole × vardenafil trihydrate — Contre-indication : association déconseillée (risque grave documenté).'),
('ketoconazole','vardenafil trihydrate','contre_indication','ketoconazole × vardenafil trihydrate — Contre-indication : association déconseillée (risque grave documenté).'),
('insulin','vardenafil trihydrate','mineure','insulin × vardenafil trihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ritonavir','vardenafil trihydrate','contre_indication','ritonavir × vardenafil trihydrate — Contre-indication : association déconseillée (risque grave documenté).'),
('atazanavir','vardenafil trihydrate','contre_indication','atazanavir × vardenafil trihydrate — Contre-indication : association déconseillée (risque grave documenté).'),
('ranitidine','vardenafil trihydrate','mineure','ranitidine × vardenafil trihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','vardenafil trihydrate','mineure','cimetidine × vardenafil trihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('tamsulosin','vardenafil trihydrate','mineure','tamsulosin × vardenafil trihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('magnesium','vardenafil trihydrate','mineure','magnesium × vardenafil trihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('grapefruit juice','vardenafil trihydrate','contre_indication','grapefruit juice × vardenafil trihydrate — Contre-indication : association déconseillée (risque grave documenté).'),
('alcohol','vardenafil trihydrate','mineure','alcohol × vardenafil trihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','vardenafil trihydrate','mineure','antacids × vardenafil trihydrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonidine','insulin glargine','mineure','clonidine × insulin glargine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin glargine','lithium','mineure','insulin glargine × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin glargine','olanzapine','mineure','insulin glargine × olanzapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','insulin glargine','mineure','clozapine × insulin glargine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','insulin glargine','modérée','fluoxetine × insulin glargine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alcohol','insulin glargine','mineure','alcohol × insulin glargine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('heparin','rasburicase','mineure','heparin × rasburicase — Interaction mineure : association généralement possible, surveillance habituelle.'),
('prednisolone','rasburicase','mineure','prednisolone × rasburicase — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methylprednisolone','rasburicase','mineure','methylprednisolone × rasburicase — Interaction mineure : association généralement possible, surveillance habituelle.'),
('allopurinol','rasburicase','mineure','allopurinol × rasburicase — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methotrexate','rasburicase','mineure','methotrexate × rasburicase — Interaction mineure : association généralement possible, surveillance habituelle.'),
('gefitinib','warfarin','majeure','gefitinib × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('gefitinib','itraconazole','mineure','gefitinib × itraconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('gefitinib','ketoconazole','mineure','gefitinib × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('gefitinib','rifampin','mineure','gefitinib × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('gefitinib','phenytoin','mineure','gefitinib × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','gefitinib','mineure','antacids × gefitinib — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','felbamate','mineure','erythromycin × felbamate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('felbamate','phenytoin','mineure','felbamate × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','felbamate','mineure','carbamazepine × felbamate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('felbamate','valproate','mineure','felbamate × valproate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('felbamate','phenobarbital','mineure','felbamate × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','felbamate','mineure','antacids × felbamate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('everolimus','verapamil','mineure','everolimus × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('heparin','liothyronine','mineure','heparin × liothyronine — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
