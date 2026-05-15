-- drug_int_batch_71.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('cholestyramine','marcaine, lidocaine, kenalog, povidone iodine','mineure','cholestyramine × marcaine, lidocaine, kenalog, povidone iodine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('gentamicin','tenofovir disoproxil','modérée','gentamicin × tenofovir disoproxil — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('acyclovir','tenofovir disoproxil','mineure','acyclovir × tenofovir disoproxil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('tenofovir disoproxil','valacyclovir','mineure','tenofovir disoproxil × valacyclovir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ganciclovir','tenofovir disoproxil','mineure','ganciclovir × tenofovir disoproxil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lopinavir','tenofovir disoproxil','mineure','lopinavir × tenofovir disoproxil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ritonavir','tenofovir disoproxil','mineure','ritonavir × tenofovir disoproxil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','tenofovir disoproxil','mineure','atazanavir × tenofovir disoproxil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sofosbuvir','tenofovir disoproxil','modérée','sofosbuvir × tenofovir disoproxil — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ledipasvir','tenofovir disoproxil','modérée','ledipasvir × tenofovir disoproxil — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('phenytoin','rivaroxaban','mineure','phenytoin × rivaroxaban — Interaction mineure : association généralement possible, surveillance habituelle.'),
('apixaban','phenytoin','mineure','apixaban × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dabigatran','phenytoin','mineure','dabigatran × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('edoxaban','phenytoin','mineure','edoxaban × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','ticagrelor','mineure','phenytoin × ticagrelor — Interaction mineure : association généralement possible, surveillance habituelle.'),
('magnesium','phenytoin','mineure','magnesium × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','st. john''s wort','mineure','phenytoin × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','phenytoin','modérée','antacids × phenytoin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('diclofenac epolamine','warfarin','majeure','diclofenac epolamine × warfarin — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('aspirin','diclofenac epolamine','majeure','aspirin × diclofenac epolamine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('diclofenac epolamine','indomethacin','mineure','diclofenac epolamine × indomethacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diclofenac epolamine','meloxicam','mineure','diclofenac epolamine × meloxicam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diclofenac epolamine','propranolol','mineure','diclofenac epolamine × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diclofenac epolamine','furosemide','mineure','diclofenac epolamine × furosemide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diclofenac epolamine','digoxin','mineure','diclofenac epolamine × digoxin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diclofenac epolamine','lithium','mineure','diclofenac epolamine × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','diclofenac epolamine','mineure','cyclosporine × diclofenac epolamine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diclofenac epolamine','methotrexate','modérée','diclofenac epolamine × methotrexate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('digoxin','famciclovir','mineure','digoxin × famciclovir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('allopurinol','famciclovir','modérée','allopurinol × famciclovir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('famciclovir','probenecid','mineure','famciclovir × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('emtricitabine','famciclovir','modérée','emtricitabine × famciclovir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cimetidine','famciclovir','modérée','cimetidine × famciclovir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('famciclovir','theophylline','modérée','famciclovir × theophylline — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('famciclovir','magnesium','modérée','famciclovir × magnesium — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('antacids','famciclovir','modérée','antacids × famciclovir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('acitretin','warfarin','mineure','acitretin × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acitretin','digoxin','modérée','acitretin × digoxin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('acitretin','tetracycline','contre_indication','acitretin × tetracycline — Contre-indication : association déconseillée (risque grave documenté).'),
('acitretin','phenytoin','mineure','acitretin × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
