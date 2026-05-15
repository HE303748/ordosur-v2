-- drug_int_batch_68.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('ritonavir','vardenafil','mineure','ritonavir × vardenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ranitidine','vardenafil','mineure','ranitidine × vardenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','vardenafil','mineure','cimetidine × vardenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('tamsulosin','vardenafil','mineure','tamsulosin × vardenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('magnesium','vardenafil','mineure','magnesium × vardenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('grapefruit juice','vardenafil','mineure','grapefruit juice × vardenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','vardenafil','mineure','alcohol × vardenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','vardenafil','mineure','antacids × vardenafil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphetamine aspartate','antacids','mineure','amphetamine aspartate × antacids — Interaction mineure : association généralement possible, surveillance habituelle.'),
('terbinafine','warfarin','mineure','terbinafine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','terbinafine','mineure','digoxin × terbinafine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','terbinafine','mineure','amiodarone × terbinafine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('flecainide','terbinafine','mineure','flecainide × terbinafine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','terbinafine','mineure','fluconazole × terbinafine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','terbinafine','mineure','ketoconazole × terbinafine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rifampin','terbinafine','mineure','rifampin × terbinafine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('terbinafine','trimethoprim','modérée','terbinafine × trimethoprim — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('sulfamethoxazole','terbinafine','modérée','sulfamethoxazole × terbinafine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('phenytoin','terbinafine','mineure','phenytoin × terbinafine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','terbinafine','mineure','cyclosporine × terbinafine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','terbinafine','mineure','cimetidine × terbinafine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('terbinafine','theophylline','modérée','terbinafine × theophylline — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('caffeine','terbinafine','mineure','caffeine × terbinafine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','terbinafine','mineure','calcium × terbinafine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dextroamphetamine','simvastatin','mineure','dextroamphetamine × simvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dextroamphetamine','midazolam','mineure','dextroamphetamine × midazolam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dextroamphetamine','venlafaxine','modérée','dextroamphetamine × venlafaxine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('dextroamphetamine','duloxetine','mineure','dextroamphetamine × duloxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dextroamphetamine','melatonin','mineure','dextroamphetamine × melatonin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dextroamphetamine','omeprazole','modérée','dextroamphetamine × omeprazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('dextroamphetamine','lansoprazole','mineure','dextroamphetamine × lansoprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dextroamphetamine','theophylline','mineure','dextroamphetamine × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','citalopram hydrobromide','mineure','aspirin × citalopram hydrobromide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('citalopram hydrobromide','metoprolol','mineure','citalopram hydrobromide × metoprolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('citalopram hydrobromide','digoxin','mineure','citalopram hydrobromide × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('citalopram hydrobromide','ketoconazole','mineure','citalopram hydrobromide × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','citalopram hydrobromide','mineure','carbamazepine × citalopram hydrobromide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('citalopram hydrobromide','fluoxetine','mineure','citalopram hydrobromide × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('citalopram hydrobromide','sertraline','mineure','citalopram hydrobromide × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('citalopram hydrobromide','paroxetine','mineure','citalopram hydrobromide × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
