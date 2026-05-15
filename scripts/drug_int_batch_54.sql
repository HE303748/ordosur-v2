-- drug_int_batch_54.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('enalapril','vasopressin','mineure','enalapril × vasopressin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','vasopressin','mineure','lithium × vasopressin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('haloperidol','vasopressin','mineure','haloperidol × vasopressin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clozapine','vasopressin','mineure','clozapine × vasopressin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rabeprazole','warfarin','mineure','rabeprazole × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amoxicillin','rabeprazole','contre_indication','amoxicillin × rabeprazole — Contre-indication : association déconseillée (risque grave documenté).'),
('clarithromycin','rabeprazole','contre_indication','clarithromycin × rabeprazole — Contre-indication : association déconseillée (risque grave documenté).'),
('itraconazole','rabeprazole','mineure','itraconazole × rabeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','rabeprazole','mineure','ketoconazole × rabeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rabeprazole','tacrolimus','mineure','rabeprazole × tacrolimus — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methotrexate','rabeprazole','mineure','methotrexate × rabeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mycophenolate','rabeprazole','mineure','mycophenolate × rabeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atazanavir','rabeprazole','mineure','atazanavir × rabeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','rabeprazole','mineure','iron × rabeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('heparin','olmesartan medoxomil','mineure','heparin × olmesartan medoxomil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('olmesartan medoxomil','spironolactone','mineure','olmesartan medoxomil × spironolactone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','olmesartan medoxomil','mineure','lithium × olmesartan medoxomil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('iron','olmesartan medoxomil','mineure','iron × olmesartan medoxomil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','tretinoin','modérée','alcohol × tretinoin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('diethylpropion','insulin','mineure','diethylpropion × insulin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('theophylline','ticlopidine','mineure','theophylline × ticlopidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metoprolol','theophylline','mineure','metoprolol × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atenolol','theophylline','mineure','atenolol × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('propranolol','theophylline','mineure','propranolol × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('nifedipine','theophylline','mineure','nifedipine × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','theophylline','mineure','diltiazem × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('felodipine','theophylline','mineure','felodipine × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amoxicillin','theophylline','mineure','amoxicillin × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ampicillin','theophylline','mineure','ampicillin × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ciprofloxacin','theophylline','mineure','ciprofloxacin × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ofloxacin','theophylline','mineure','ofloxacin × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('azithromycin','theophylline','mineure','azithromycin × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','theophylline','mineure','clarithromycin × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('tetracycline','theophylline','mineure','tetracycline × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metronidazole','theophylline','mineure','metronidazole × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','theophylline','mineure','ketoconazole × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('theophylline','trimethoprim','mineure','theophylline × trimethoprim — Interaction mineure : association généralement possible, surveillance habituelle.'),
('sulfamethoxazole','theophylline','mineure','sulfamethoxazole × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lithium','theophylline','mineure','lithium × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenobarbital','theophylline','mineure','phenobarbital × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
