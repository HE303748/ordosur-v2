-- drug_int_batch_10.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('metoprolol','rizatriptan benzoate','mineure','metoprolol × rizatriptan benzoate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('propranolol','rizatriptan benzoate','modérée','propranolol × rizatriptan benzoate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('paroxetine','rizatriptan benzoate','modérée','paroxetine × rizatriptan benzoate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('capecitabine','phenytoin','modérée','capecitabine × phenytoin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('allopurinol','capecitabine','contre_indication','allopurinol × capecitabine — Contre-indication : association déconseillée (risque grave documenté).'),
('capecitabine','methotrexate','mineure','capecitabine × methotrexate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('capecitabine','folic acid','mineure','capecitabine × folic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('capecitabine','vitamin k','modérée','capecitabine × vitamin k — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('trazodone','warfarin','modérée','trazodone × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('rivaroxaban','trazodone','mineure','rivaroxaban × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dabigatran','trazodone','mineure','dabigatran × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clopidogrel','trazodone','mineure','clopidogrel × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','trazodone','majeure','aspirin × trazodone — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('digoxin','trazodone','modérée','digoxin × trazodone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('amiodarone','trazodone','mineure','amiodarone × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sotalol','trazodone','mineure','sotalol × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','trazodone','mineure','clarithromycin × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','trazodone','mineure','itraconazole × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','trazodone','mineure','ketoconazole × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rifampin','trazodone','mineure','rifampin × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('linezolid','trazodone','contre_indication','linezolid × trazodone — Contre-indication : association déconseillée (risque grave documenté).'),
('lithium','trazodone','mineure','lithium × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','trazodone','modérée','phenytoin × trazodone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('carbamazepine','trazodone','mineure','carbamazepine × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('trazodone','ziprasidone','mineure','trazodone × ziprasidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fentanyl','trazodone','mineure','fentanyl × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ritonavir','trazodone','mineure','ritonavir × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','trazodone','mineure','iron × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('st. john''s wort','trazodone','mineure','st. john''s wort × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','trazodone','mineure','alcohol × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mirabegron','warfarin','mineure','mirabegron × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','mirabegron','modérée','digoxin × mirabegron — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ketoconazole','mirabegron','mineure','ketoconazole × mirabegron — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mirabegron','rifampin','mineure','mirabegron × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mirabegron','tamsulosin','mineure','mirabegron × tamsulosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sevelamer carbonate','warfarin','modérée','sevelamer carbonate × warfarin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('metoprolol','sevelamer carbonate','modérée','metoprolol × sevelamer carbonate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('enalapril','sevelamer carbonate','modérée','enalapril × sevelamer carbonate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('digoxin','sevelamer carbonate','modérée','digoxin × sevelamer carbonate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ciprofloxacin','sevelamer carbonate','modérée','ciprofloxacin × sevelamer carbonate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
