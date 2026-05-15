-- drug_int_batch_33.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('acetaminophen','naloxone','mineure','acetaminophen × naloxone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetaminophen','ritonavir','mineure','acetaminophen × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acetaminophen','alcohol','majeure','acetaminophen × alcohol — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('nitric oxide','nitroglycerin','modérée','nitric oxide × nitroglycerin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('hydrochlorothiazide','indomethacin','mineure','hydrochlorothiazide × indomethacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amlodipine','erythromycin','modérée','amlodipine × erythromycin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('diltiazem','erythromycin','modérée','diltiazem × erythromycin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('digoxin','erythromycin','mineure','digoxin × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atorvastatin','erythromycin','mineure','atorvastatin × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','lovastatin','mineure','erythromycin × lovastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','phenytoin','mineure','erythromycin × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','erythromycin','mineure','carbamazepine × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','valproate','mineure','erythromycin × valproate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alprazolam','erythromycin','mineure','alprazolam × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','midazolam','mineure','erythromycin × midazolam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','prednisolone','mineure','erythromycin × prednisolone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colchicine','erythromycin','mineure','colchicine × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','erythromycin','mineure','cyclosporine × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','tacrolimus','mineure','erythromycin × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','theophylline','mineure','erythromycin × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','erythromycin','mineure','calcium × erythromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rosuvastatin','warfarin','mineure','rosuvastatin × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rosuvastatin','ticagrelor','modérée','rosuvastatin × ticagrelor — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('febuxostat','rosuvastatin','mineure','febuxostat × rosuvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colchicine','rosuvastatin','mineure','colchicine × rosuvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cyclosporine','rosuvastatin','modérée','cyclosporine × rosuvastatin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lopinavir','rosuvastatin','mineure','lopinavir × rosuvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ritonavir','rosuvastatin','mineure','ritonavir × rosuvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','rosuvastatin','mineure','atazanavir × rosuvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rosuvastatin','sofosbuvir','contre_indication','rosuvastatin × sofosbuvir — Contre-indication : association déconseillée (risque grave documenté).'),
('ledipasvir','rosuvastatin','contre_indication','ledipasvir × rosuvastatin — Contre-indication : association déconseillée (risque grave documenté).'),
('magnesium','rosuvastatin','mineure','magnesium × rosuvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','rosuvastatin','mineure','antacids × rosuvastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lovastatin','warfarin','mineure','lovastatin × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lovastatin','propranolol','modérée','lovastatin × propranolol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lovastatin','spironolactone','mineure','lovastatin × spironolactone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','lovastatin','mineure','digoxin × lovastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','lovastatin','mineure','amiodarone × lovastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dronedarone','lovastatin','mineure','dronedarone × lovastatin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','lovastatin','modérée','clarithromycin × lovastatin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
