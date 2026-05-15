-- drug_int_batch_83.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('gemfibrozil','itraconazole','mineure','gemfibrozil × itraconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('gemfibrozil','rifampin','mineure','gemfibrozil × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colchicine','gemfibrozil','mineure','colchicine × gemfibrozil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','dextromethorphan hydrobromide','mineure','alcohol × dextromethorphan hydrobromide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cisatracurium','tetracycline','mineure','cisatracurium × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cisatracurium','colistin','mineure','cisatracurium × colistin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cisatracurium','lithium','mineure','cisatracurium × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cisatracurium','phenytoin','mineure','cisatracurium × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','cisatracurium','mineure','carbamazepine × cisatracurium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cisatracurium','magnesium','mineure','cisatracurium × magnesium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('econazole','warfarin','mineure','econazole × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','phenylephrine','mineure','amiodarone × phenylephrine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonidine','phenylephrine','mineure','clonidine × phenylephrine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrocortisone','phenobarbital','mineure','hydrocortisone × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clomipramine','warfarin','mineure','clomipramine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clomipramine','digoxin','mineure','clomipramine × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clomipramine','flecainide','mineure','clomipramine × flecainide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clomipramine','clonidine','mineure','clomipramine × clonidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clomipramine','phenytoin','mineure','clomipramine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clomipramine','phenobarbital','mineure','clomipramine × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clomipramine','haloperidol','mineure','clomipramine × haloperidol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clomipramine','fluoxetine','mineure','clomipramine × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clomipramine','sertraline','mineure','clomipramine × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clomipramine','paroxetine','mineure','clomipramine × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clomipramine','methylphenidate','mineure','clomipramine × methylphenidate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','clomipramine','mineure','cimetidine × clomipramine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','metolazone','mineure','furosemide × metolazone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','metolazone','mineure','lithium × metolazone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('insulin','metolazone','modérée','insulin × metolazone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alcohol','metolazone','mineure','alcohol × metolazone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('triamcinolone acetonide','warfarin','mineure','triamcinolone acetonide × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','triamcinolone acetonide','modérée','aspirin × triamcinolone acetonide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clarithromycin','triamcinolone acetonide','mineure','clarithromycin × triamcinolone acetonide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('itraconazole','triamcinolone acetonide','mineure','itraconazole × triamcinolone acetonide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','triamcinolone acetonide','modérée','ketoconazole × triamcinolone acetonide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('rifampin','triamcinolone acetonide','mineure','rifampin × triamcinolone acetonide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','triamcinolone acetonide','mineure','phenytoin × triamcinolone acetonide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','triamcinolone acetonide','mineure','carbamazepine × triamcinolone acetonide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrocortisone','triamcinolone acetonide','mineure','hydrocortisone × triamcinolone acetonide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','triamcinolone acetonide','mineure','cyclosporine × triamcinolone acetonide — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
