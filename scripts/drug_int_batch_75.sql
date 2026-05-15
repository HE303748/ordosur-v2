-- drug_int_batch_75.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('acetaminophen','pregabalin','majeure','acetaminophen × pregabalin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('nifedipine','phenylephrine','mineure','nifedipine × phenylephrine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrocortisone','phenylephrine','mineure','hydrocortisone × phenylephrine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','phenylephrine','mineure','calcium × phenylephrine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dopamine','metoprolol','mineure','dopamine × metoprolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dopamine','propranolol','mineure','dopamine × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dopamine','phenytoin','mineure','dopamine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dopamine','haloperidol','mineure','dopamine × haloperidol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','odevixibat','mineure','cholestyramine × odevixibat — Interaction mineure : association généralement possible, surveillance habituelle.'),
('brimonidine','clonidine','mineure','brimonidine × clonidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('brimonidine','calcium','mineure','brimonidine × calcium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','brimonidine','mineure','alcohol × brimonidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dabigatran','primaquine','mineure','dabigatran × primaquine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','primaquine','mineure','digoxin × primaquine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('duloxetine','primaquine','mineure','duloxetine × primaquine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('primaquine','theophylline','mineure','primaquine × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('abacavir','methadone','mineure','abacavir × methadone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('apixaban','warfarin','majeure','apixaban × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('apixaban','clopidogrel','majeure','apixaban × clopidogrel — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('apixaban','aspirin','majeure','apixaban × aspirin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('apixaban','clarithromycin','modérée','apixaban × clarithromycin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('apixaban','itraconazole','mineure','apixaban × itraconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('apixaban','ketoconazole','mineure','apixaban × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('apixaban','rifampin','mineure','apixaban × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('apixaban','ritonavir','mineure','apixaban × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mefloquine','propranolol','modérée','mefloquine × propranolol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ketoconazole','mefloquine','mineure','ketoconazole × mefloquine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mefloquine','rifampin','mineure','mefloquine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mefloquine','phenytoin','majeure','mefloquine × phenytoin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('carbamazepine','mefloquine','majeure','carbamazepine × mefloquine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('mefloquine','valproic acid','majeure','mefloquine × valproic acid — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('mefloquine','phenobarbital','majeure','mefloquine × phenobarbital — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('chloroquine','mefloquine','modérée','chloroquine × mefloquine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('calcium','mefloquine','mineure','calcium × mefloquine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alendronate','aspirin','modérée','alendronate × aspirin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alendronate','levothyroxine','mineure','alendronate × levothyroxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alendronate','calcium','mineure','alendronate × calcium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alendronate','antacids','mineure','alendronate × antacids — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cefazolin','theophylline','mineure','cefazolin × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('escitalopram','metoprolol','mineure','escitalopram × metoprolol — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
