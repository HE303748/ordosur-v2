-- drug_int_batch_35.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('acetaminophen','probenecid','mineure','acetaminophen × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aripiprazole','warfarin','mineure','aripiprazole × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aripiprazole','clarithromycin','mineure','aripiprazole × clarithromycin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aripiprazole','itraconazole','mineure','aripiprazole × itraconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aripiprazole','rifampin','mineure','aripiprazole × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aripiprazole','lithium','mineure','aripiprazole × lithium — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aripiprazole','carbamazepine','mineure','aripiprazole × carbamazepine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aripiprazole','valproate','mineure','aripiprazole × valproate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aripiprazole','lamotrigine','mineure','aripiprazole × lamotrigine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aripiprazole','lorazepam','mineure','aripiprazole × lorazepam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aripiprazole','fluoxetine','mineure','aripiprazole × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aripiprazole','sertraline','mineure','aripiprazole × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aripiprazole','citalopram','mineure','aripiprazole × citalopram — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aripiprazole','escitalopram','mineure','aripiprazole × escitalopram — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aripiprazole','paroxetine','mineure','aripiprazole × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aripiprazole','venlafaxine','mineure','aripiprazole × venlafaxine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('aripiprazole','omeprazole','mineure','aripiprazole × omeprazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupivacaine','nitroglycerin','mineure','bupivacaine × nitroglycerin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupivacaine','nitrofurantoin','mineure','bupivacaine × nitrofurantoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupivacaine','phenytoin','mineure','bupivacaine × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupivacaine','valproate','mineure','bupivacaine × valproate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupivacaine','phenobarbital','mineure','bupivacaine × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupivacaine','chloroquine','mineure','bupivacaine × chloroquine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('bupivacaine','metoclopramide','mineure','bupivacaine × metoclopramide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cefepime','furosemide','mineure','cefepime × furosemide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphotericin b','fluconazole','mineure','amphotericin b × fluconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amphotericin b','ketoconazole','mineure','amphotericin b × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','dasatinib','mineure','antacids × dasatinib — Interaction mineure : association généralement possible, surveillance habituelle.'),
('quetiapine','st. john''s wort','mineure','quetiapine × st. john''s wort — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cephalexin','metformin','mineure','cephalexin × metformin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cephalexin','probenecid','mineure','cephalexin × probenecid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cinacalcet','metoprolol','mineure','cinacalcet × metoprolol — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carvedilol','cinacalcet','mineure','carvedilol × cinacalcet — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cinacalcet','flecainide','mineure','cinacalcet × flecainide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cinacalcet','itraconazole','mineure','cinacalcet × itraconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cinacalcet','ketoconazole','mineure','cinacalcet × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','cinacalcet','modérée','calcium × cinacalcet — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('insulin','phentermine','mineure','insulin × phentermine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','phentermine','mineure','alcohol × phentermine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('flecainide','imipramine','mineure','flecainide × imipramine — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
