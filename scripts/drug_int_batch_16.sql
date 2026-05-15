-- drug_int_batch_16.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('heparin','valsartan','mineure','heparin × valsartan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('spironolactone','valsartan','mineure','spironolactone × valsartan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','valsartan','mineure','lithium × valsartan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','valsartan','mineure','iron × valsartan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrochlorothiazide','propranolol','mineure','hydrochlorothiazide × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrochlorothiazide','lisinopril','mineure','hydrochlorothiazide × lisinopril — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrochlorothiazide','losartan','mineure','hydrochlorothiazide × losartan — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrochlorothiazide','spironolactone','mineure','hydrochlorothiazide × spironolactone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('eplerenone','hydrochlorothiazide','mineure','eplerenone × hydrochlorothiazide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','hydrochlorothiazide','modérée','digoxin × hydrochlorothiazide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('hydrochlorothiazide','lithium','mineure','hydrochlorothiazide × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrochlorothiazide','insulin','mineure','hydrochlorothiazide × insulin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrochlorothiazide','sirolimus','modérée','hydrochlorothiazide × sirolimus — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('everolimus','hydrochlorothiazide','modérée','everolimus × hydrochlorothiazide — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cholestyramine','hydrochlorothiazide','mineure','cholestyramine × hydrochlorothiazide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('hydrochlorothiazide','iron','mineure','hydrochlorothiazide × iron — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','hydrochlorothiazide','mineure','alcohol × hydrochlorothiazide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxycycline hyclate','tetracycline','mineure','doxycycline hyclate × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxycycline hyclate','phenytoin','mineure','doxycycline hyclate × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','doxycycline hyclate','mineure','carbamazepine × doxycycline hyclate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','doxycycline hyclate','mineure','calcium × doxycycline hyclate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxycycline hyclate','iron','mineure','doxycycline hyclate × iron — Interaction mineure : association généralement possible, surveillance habituelle.'),
('doxycycline hyclate','magnesium','mineure','doxycycline hyclate × magnesium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','doxycycline hyclate','mineure','antacids × doxycycline hyclate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dexmethylphenidate','risperidone','modérée','dexmethylphenidate × risperidone — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('naloxone','tramadol','mineure','naloxone × tramadol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','trimethobenzamide','contre_indication','alcohol × trimethobenzamide — Contre-indication : association déconseillée (risque grave documenté).'),
('ciprofloxacin','ropinirole','mineure','ciprofloxacin × ropinirole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ofloxacin','ropinirole','mineure','ofloxacin × ropinirole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metoclopramide','ropinirole','mineure','metoclopramide × ropinirole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('colchicine','fenofibrate','modérée','colchicine × fenofibrate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cyclosporine','fenofibrate','mineure','cyclosporine × fenofibrate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fenofibrate','tacrolimus','mineure','fenofibrate × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('guanfacine','phenytoin','mineure','guanfacine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('guanfacine','phenobarbital','mineure','guanfacine × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('guanfacine','insulin','mineure','guanfacine × insulin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','lactulose','mineure','antacids × lactulose — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cholestyramine','ursodiol','mineure','cholestyramine × ursodiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','ursodiol','mineure','antacids × ursodiol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('docetaxel','ketoconazole','mineure','docetaxel × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
