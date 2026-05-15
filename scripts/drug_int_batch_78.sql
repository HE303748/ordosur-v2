-- drug_int_batch_78.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('methylergonovine','rifampin','mineure','methylergonovine × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluoxetine','methylergonovine','mineure','fluoxetine × methylergonovine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluvoxamine','methylergonovine','mineure','fluvoxamine × methylergonovine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('methylergonovine','ritonavir','mineure','methylergonovine × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('grapefruit juice','methylergonovine','mineure','grapefruit juice × methylergonovine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dutasteride','warfarin','mineure','dutasteride × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('atenolol','dutasteride','mineure','atenolol × dutasteride — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dutasteride','nifedipine','mineure','dutasteride × nifedipine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('diltiazem','dutasteride','mineure','diltiazem × dutasteride — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dutasteride','verapamil','mineure','dutasteride × verapamil — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dutasteride','enalapril','mineure','dutasteride × enalapril — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dutasteride','furosemide','mineure','dutasteride × furosemide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('digoxin','dutasteride','mineure','digoxin × dutasteride — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dutasteride','ketoconazole','mineure','dutasteride × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dutasteride','paroxetine','mineure','dutasteride × paroxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dutasteride','ritonavir','mineure','dutasteride × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('cimetidine','dutasteride','modérée','cimetidine × dutasteride — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('cholestyramine','dutasteride','mineure','cholestyramine × dutasteride — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dutasteride','theophylline','mineure','dutasteride × theophylline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('dutasteride','tamsulosin','mineure','dutasteride × tamsulosin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('calcium','dutasteride','mineure','calcium × dutasteride — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amiodarone','chloroquine','modérée','amiodarone × chloroquine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('ampicillin','chloroquine','mineure','ampicillin × chloroquine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('chloroquine','moxifloxacin','modérée','chloroquine × moxifloxacin — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('chloroquine','insulin','mineure','chloroquine × insulin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('chloroquine','cyclosporine','mineure','chloroquine × cyclosporine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('chloroquine','cimetidine','mineure','chloroquine × cimetidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('antacids','chloroquine','mineure','antacids × chloroquine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluticasone propionate','voriconazole','mineure','fluticasone propionate × voriconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('fluticasone propionate','lopinavir','mineure','fluticasone propionate × lopinavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mercaptopurine','warfarin','mineure','mercaptopurine × warfarin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mercaptopurine','trimethoprim','mineure','mercaptopurine × trimethoprim — Interaction mineure : association généralement possible, surveillance habituelle.'),
('mercaptopurine','sulfamethoxazole','mineure','mercaptopurine × sulfamethoxazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('allopurinol','mercaptopurine','modérée','allopurinol × mercaptopurine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('mercaptopurine','methotrexate','modérée','mercaptopurine × methotrexate — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('amiodarone','lidocaine','modérée','amiodarone × lidocaine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('lidocaine','sotalol','modérée','lidocaine × sotalol — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('phenytoin','rufinamide','mineure','phenytoin × rufinamide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','rufinamide','mineure','carbamazepine × rufinamide — Interaction mineure : association généralement possible, surveillance habituelle.'),
('rufinamide','valproate','mineure','rufinamide × valproate — Interaction mineure : association généralement possible, surveillance habituelle.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
