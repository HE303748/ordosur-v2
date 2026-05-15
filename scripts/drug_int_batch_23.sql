-- drug_int_batch_23.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('iron','pantoprazole','mineure','iron × pantoprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('chenodiol','cholestyramine','mineure','chenodiol × cholestyramine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','chenodiol','contre_indication','antacids × chenodiol — Contre-indication : association déconseillée (risque grave documenté).'),
('carbidopa hydrate','phenytoin','mineure','carbidopa hydrate × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbidopa hydrate','risperidone','mineure','carbidopa hydrate × risperidone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbidopa hydrate','metoclopramide','modérée','carbidopa hydrate × metoclopramide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('carbidopa hydrate','iron','modérée','carbidopa hydrate × iron — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('fulvestrant','ketoconazole','mineure','fulvestrant × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fulvestrant','rifampin','mineure','fulvestrant × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('benztropine','haloperidol','mineure','benztropine × haloperidol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ciprofloxacin','pomalidomide','mineure','ciprofloxacin × pomalidomide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ofloxacin','pomalidomide','mineure','ofloxacin × pomalidomide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluvoxamine','pomalidomide','mineure','fluvoxamine × pomalidomide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('betamethasone','warfarin','mineure','betamethasone × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aspirin','betamethasone','modérée','aspirin × betamethasone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('betamethasone','ketoconazole','modérée','betamethasone × ketoconazole — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('betamethasone','rifampin','mineure','betamethasone × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('betamethasone','phenytoin','mineure','betamethasone × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('betamethasone','carbamazepine','mineure','betamethasone × carbamazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('betamethasone','hydrocortisone','mineure','betamethasone × hydrocortisone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('betamethasone','cyclosporine','mineure','betamethasone × cyclosporine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('betamethasone','cholestyramine','mineure','betamethasone × cholestyramine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('esmolol','verapamil','majeure','esmolol × verapamil — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('digoxin','esmolol','modérée','digoxin × esmolol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('clonidine','esmolol','mineure','clonidine × esmolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','esmolol','mineure','calcium × esmolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ibuprofen','warfarin','mineure','ibuprofen × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('furosemide','ibuprofen','mineure','furosemide × ibuprofen — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ibuprofen','lithium','mineure','ibuprofen × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ibuprofen','methotrexate','mineure','ibuprofen × methotrexate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ibuprofen','ranitidine','mineure','ibuprofen × ranitidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','ibuprofen','mineure','cimetidine × ibuprofen — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','digoxin','modérée','calcium × digoxin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('calcium','lithium','contre_indication','calcium × lithium — Contre-indication : association déconseillée (risque grave documenté).'),
('epinephrine','propranolol','mineure','epinephrine × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonidine','epinephrine','mineure','clonidine × epinephrine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('epinephrine','levothyroxine','mineure','epinephrine × levothyroxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('epinephrine','theophylline','mineure','epinephrine × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonazepam','diazepam','modérée','clonazepam × diazepam — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('venlafaxine','warfarin','mineure','venlafaxine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
