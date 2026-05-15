-- drug_int_batch_87.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('ciprofloxacin','iron','mineure','ciprofloxacin × iron — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ciprofloxacin','magnesium','mineure','ciprofloxacin × magnesium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ciprofloxacin','zinc','mineure','ciprofloxacin × zinc — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','ciprofloxacin','mineure','antacids × ciprofloxacin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','estradiol valerate and estradiol valerate/dienogest','mineure','cimetidine × estradiol valerate and estradiol valerate/dienogest — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','doxylamine','majeure','alcohol × doxylamine — Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.'),
('cosyntropin','spironolactone','mineure','cosyntropin × spironolactone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cosyntropin','iron','mineure','cosyntropin × iron — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','mometasone furoate','modérée','clarithromycin × mometasone furoate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('itraconazole','mometasone furoate','modérée','itraconazole × mometasone furoate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ketoconazole','mometasone furoate','mineure','ketoconazole × mometasone furoate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mometasone furoate','ritonavir','modérée','mometasone furoate × ritonavir — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('atazanavir','mometasone furoate','modérée','atazanavir × mometasone furoate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('dexmethylphenidate','linezolid','modérée','dexmethylphenidate × linezolid — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('calcium','dexmethylphenidate','modérée','calcium × dexmethylphenidate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('acamprosate','diazepam','mineure','acamprosate × diazepam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acamprosate','naltrexone','mineure','acamprosate × naltrexone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('acamprosate','alcohol','mineure','acamprosate × alcohol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('gepirone','linezolid','contre_indication','gepirone × linezolid — Contre-indication : association déconseillée (risque grave documenté).'),
('propafenone','warfarin','mineure','propafenone × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('metoprolol','propafenone','mineure','metoprolol × propafenone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('propafenone','propranolol','mineure','propafenone × propranolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','propafenone','mineure','digoxin × propafenone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','propafenone','mineure','amiodarone × propafenone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('erythromycin','propafenone','mineure','erythromycin × propafenone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ketoconazole','propafenone','mineure','ketoconazole × propafenone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('propafenone','rifampin','mineure','propafenone × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','propafenone','mineure','fluoxetine × propafenone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('propafenone','sertraline','mineure','propafenone × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('paroxetine','propafenone','mineure','paroxetine × propafenone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('propafenone','ritonavir','mineure','propafenone × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','propafenone','mineure','cimetidine × propafenone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('grapefruit juice','propafenone','mineure','grapefruit juice × propafenone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('primaquine','rivaroxaban','modérée','primaquine × rivaroxaban — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('aspirin','hydrochlorothiazide','mineure','aspirin × hydrochlorothiazide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('larotrectinib','st. john''s wort','mineure','larotrectinib × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('grapefruit juice','larotrectinib','mineure','grapefruit juice × larotrectinib — Interaction mineure : association généralement possible, surveillance habituelle.'),
('abiraterone','ketoconazole','mineure','abiraterone × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('abiraterone','rifampin','mineure','abiraterone × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('abiraterone','prednisone','mineure','abiraterone × prednisone — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
