-- drug_int_batch_69.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('citalopram hydrobromide','fluvoxamine','mineure','citalopram hydrobromide × fluvoxamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','citalopram hydrobromide','mineure','cimetidine × citalopram hydrobromide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('citalopram hydrobromide','theophylline','mineure','citalopram hydrobromide × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','citalopram hydrobromide','mineure','alcohol × citalopram hydrobromide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('heparin','spironolactone','mineure','heparin × spironolactone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','spironolactone','mineure','aspirin × spironolactone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('spironolactone','trimethoprim','mineure','spironolactone × trimethoprim — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','spironolactone','modérée','lithium × spironolactone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cholestyramine','spironolactone','mineure','cholestyramine × spironolactone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cefaclor','warfarin','majeure','cefaclor × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('cefaclor','probenecid','mineure','cefaclor × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cefaclor','magnesium','mineure','cefaclor × magnesium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','cefaclor','mineure','antacids × cefaclor — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atropa belladonna','linezolid','mineure','atropa belladonna × linezolid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atropa belladonna','mirtazapine','mineure','atropa belladonna × mirtazapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atropa belladonna','trazodone','mineure','atropa belladonna × trazodone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atropa belladonna','tramadol','mineure','atropa belladonna × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atropa belladonna','buprenorphine','mineure','atropa belladonna × buprenorphine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','atropa belladonna','majeure','alcohol × atropa belladonna — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('metronidazole','neostigmine methylsulfate','mineure','metronidazole × neostigmine methylsulfate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('tipranavir','warfarin','mineure','tipranavir × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','tipranavir','mineure','diltiazem × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('tipranavir','verapamil','mineure','tipranavir × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('felodipine','tipranavir','mineure','felodipine × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','tipranavir','mineure','digoxin × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','tipranavir','mineure','atorvastatin × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rosuvastatin','tipranavir','mineure','rosuvastatin × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','tipranavir','modérée','clarithromycin × tipranavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('metronidazole','tipranavir','mineure','metronidazole × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluconazole','tipranavir','modérée','fluconazole × tipranavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('itraconazole','tipranavir','modérée','itraconazole × tipranavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ketoconazole','tipranavir','modérée','ketoconazole × tipranavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('tipranavir','voriconazole','modérée','tipranavir × voriconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('rifampin','tipranavir','mineure','rifampin × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','tipranavir','modérée','phenytoin × tipranavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('carbamazepine','tipranavir','modérée','carbamazepine × tipranavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('tipranavir','valproic acid','modérée','tipranavir × valproic acid — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('phenobarbital','tipranavir','modérée','phenobarbital × tipranavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('midazolam','tipranavir','mineure','midazolam × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('quetiapine','tipranavir','mineure','quetiapine × tipranavir — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
