-- drug_int_batch_51.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('morphine','trospium','mineure','morphine × trospium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metformin','trospium','mineure','metformin × trospium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('tenofovir','trospium','mineure','tenofovir × trospium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('droxidopa','linezolid','mineure','droxidopa × linezolid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','warfarin','mineure','darunavir × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','rivaroxaban','majeure','darunavir × rivaroxaban — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('apixaban','darunavir','majeure','apixaban × darunavir — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('dabigatran','darunavir','mineure','dabigatran × darunavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','edoxaban','mineure','darunavir × edoxaban — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clopidogrel','darunavir','mineure','clopidogrel × darunavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','ticagrelor','mineure','darunavir × ticagrelor — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','prasugrel','modérée','darunavir × prasugrel — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','metoprolol','modérée','darunavir × metoprolol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('carvedilol','darunavir','modérée','carvedilol × darunavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('amlodipine','darunavir','modérée','amlodipine × darunavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','nifedipine','modérée','darunavir × nifedipine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','diltiazem','modérée','darunavir × diltiazem — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','verapamil','modérée','darunavir × verapamil — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','felodipine','modérée','darunavir × felodipine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','digoxin','mineure','darunavir × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','darunavir','modérée','amiodarone × darunavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','flecainide','modérée','darunavir × flecainide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','dronedarone','contre_indication','darunavir × dronedarone — Contre-indication : association déconseillée (risque grave documenté).'),
('atorvastatin','darunavir','mineure','atorvastatin × darunavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','simvastatin','contre_indication','darunavir × simvastatin — Contre-indication : association déconseillée (risque grave documenté).'),
('darunavir','rosuvastatin','mineure','darunavir × rosuvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','pravastatin','mineure','darunavir × pravastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','lovastatin','contre_indication','darunavir × lovastatin — Contre-indication : association déconseillée (risque grave documenté).'),
('darunavir','ivabradine','contre_indication','darunavir × ivabradine — Contre-indication : association déconseillée (risque grave documenté).'),
('clarithromycin','darunavir','modérée','clarithromycin × darunavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','itraconazole','modérée','darunavir × itraconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','ketoconazole','modérée','darunavir × ketoconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','voriconazole','mineure','darunavir × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('darunavir','posaconazole','modérée','darunavir × posaconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','isavuconazole','modérée','darunavir × isavuconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','rifampin','contre_indication','darunavir × rifampin — Contre-indication : association déconseillée (risque grave documenté).'),
('darunavir','phenytoin','modérée','darunavir × phenytoin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('carbamazepine','darunavir','modérée','carbamazepine × darunavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','phenobarbital','modérée','darunavir × phenobarbital — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('darunavir','diazepam','modérée','darunavir × diazepam — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
