-- drug_int_batch_19.sql — OpenFDA Étape 3 (40 rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.desc
FROM (VALUES
('alcohol','doxepin','mineure','alcohol × doxepin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonazepam','fluconazole','mineure','clonazepam × fluconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonazepam','phenytoin','mineure','clonazepam × phenytoin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','clonazepam','mineure','carbamazepine × clonazepam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonazepam','phenobarbital','mineure','clonazepam × phenobarbital — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonazepam','lamotrigine','mineure','clonazepam × lamotrigine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonazepam','fluoxetine','mineure','clonazepam × fluoxetine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonazepam','sertraline','mineure','clonazepam × sertraline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clonazepam','ranitidine','mineure','clonazepam × ranitidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','clonazepam','mineure','alcohol × clonazepam — Interaction mineure : association généralement possible, surveillance habituelle.'),
('azathioprine','mesalamine','modérée','azathioprine × mesalamine — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.'),
('alcohol','diphenhydramine','mineure','alcohol × diphenhydramine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amoxicillin','ampicillin','mineure','amoxicillin × ampicillin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('amoxicillin','tetracycline','mineure','amoxicillin × tetracycline — Interaction mineure : association généralement possible, surveillance habituelle.'),
('clarithromycin','eszopiclone','mineure','clarithromycin × eszopiclone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('eszopiclone','itraconazole','mineure','eszopiclone × itraconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('eszopiclone','ketoconazole','mineure','eszopiclone × ketoconazole — Interaction mineure : association généralement possible, surveillance habituelle.'),
('eszopiclone','rifampin','mineure','eszopiclone × rifampin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('eszopiclone','olanzapine','mineure','eszopiclone × olanzapine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('eszopiclone','ritonavir','mineure','eszopiclone × ritonavir — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','eszopiclone','mineure','alcohol × eszopiclone — Interaction mineure : association généralement possible, surveillance habituelle.'),
('ticlopidine','tizanidine','contre_indication','ticlopidine × tizanidine — Contre-indication : association déconseillée (risque grave documenté).'),
('tizanidine','verapamil','contre_indication','tizanidine × verapamil — Contre-indication : association déconseillée (risque grave documenté).'),
('amiodarone','tizanidine','contre_indication','amiodarone × tizanidine — Contre-indication : association déconseillée (risque grave documenté).'),
('ciprofloxacin','tizanidine','contre_indication','ciprofloxacin × tizanidine — Contre-indication : association déconseillée (risque grave documenté).'),
('ofloxacin','tizanidine','contre_indication','ofloxacin × tizanidine — Contre-indication : association déconseillée (risque grave documenté).'),
('fluvoxamine','tizanidine','contre_indication','fluvoxamine × tizanidine — Contre-indication : association déconseillée (risque grave documenté).'),
('acyclovir','tizanidine','contre_indication','acyclovir × tizanidine — Contre-indication : association déconseillée (risque grave documenté).'),
('cimetidine','tizanidine','contre_indication','cimetidine × tizanidine — Contre-indication : association déconseillée (risque grave documenté).'),
('alcohol','tizanidine','mineure','alcohol × tizanidine — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenytoin','pregabalin','mineure','phenytoin × pregabalin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carbamazepine','pregabalin','mineure','carbamazepine × pregabalin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('pregabalin','valproic acid','mineure','pregabalin × valproic acid — Interaction mineure : association généralement possible, surveillance habituelle.'),
('phenobarbital','pregabalin','mineure','phenobarbital × pregabalin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lamotrigine','pregabalin','mineure','lamotrigine × pregabalin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('pregabalin','topiramate','mineure','pregabalin × topiramate — Interaction mineure : association généralement possible, surveillance habituelle.'),
('lorazepam','pregabalin','mineure','lorazepam × pregabalin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('oxycodone','pregabalin','mineure','oxycodone × pregabalin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('alcohol','pregabalin','mineure','alcohol × pregabalin — Interaction mineure : association généralement possible, surveillance habituelle.'),
('carvedilol','diltiazem','modérée','carvedilol × diltiazem — Interaction modérée : précaution d''emploi, surveillance clinique recommandée.')
) AS v(d1, d2, sev, desc)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE (di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2)
     OR (di.dci_1_pattern = v.d2 AND di.dci_2_pattern = v.d1)
);
