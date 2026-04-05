-- ============================================================
-- MIGRATION 2026-04-05 — Moteur d'interactions médicamenteuses
-- Tables drug_interactions + contraindications + seed data
-- ============================================================

CREATE TABLE IF NOT EXISTS drug_interactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dci_1_pattern text NOT NULL,
  dci_2_pattern text NOT NULL,
  severite    text NOT NULL CHECK (severite IN ('contre_indication','majeure','moderee','mineure')),
  description text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contraindications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dci_pattern     text NOT NULL,
  condition_type  text NOT NULL CHECK (condition_type IN ('pathologie','allergie_med','allergie_alim','autre')),
  condition_valeur text NOT NULL,
  severite        text NOT NULL CHECK (severite IN ('absolue','relative')),
  description     text NOT NULL,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE drug_interactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contraindications  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "di_select"  ON drug_interactions;
DROP POLICY IF EXISTS "ci_select"  ON contraindications;
DROP POLICY IF EXISTS "di_insert"  ON drug_interactions;
DROP POLICY IF EXISTS "ci_insert"  ON contraindications;

CREATE POLICY "di_select" ON drug_interactions  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ci_select" ON contraindications  FOR SELECT TO authenticated USING (true);
CREATE POLICY "di_insert" ON drug_interactions  FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'super_admin');
CREATE POLICY "ci_insert" ON contraindications  FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'super_admin');

-- ─── Interactions médicament-médicament ────────────────────────────────────
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description) VALUES
-- Anticoagulants
('warfarine','aspirine','contre_indication','Association à éviter : risque hémorragique majeur par potentialisation des effets anticoagulants.'),
('warfarine','ibuprofène','contre_indication','Association à éviter : les AINS augmentent la toxicité des anticoagulants coumariniques, risque hémorragique grave.'),
('warfarine','diclofénac','contre_indication','Association à éviter : les AINS augmentent la toxicité des anticoagulants coumariniques.'),
('warfarine','fluconazole','contre_indication','Association à éviter : le fluconazole inhibe le métabolisme de la warfarine via CYP2C9, risque hémorragique grave.'),
('warfarine','métronidazole','majeure','Précaution d''emploi : le métronidazole inhibe le CYP2C9, augmentation importante de l''effet anticoagulant.'),
('warfarine','ciprofloxacine','majeure','Précaution d''emploi : augmentation de l''effet anticoagulant et du risque hémorragique, surveiller INR.'),
('warfarine','rifampicine','majeure','Précaution d''emploi : la rifampicine est un inducteur enzymatique puissant, réduction de l''effet anticoagulant.'),
('warfarine','amoxicilline','moderee','Précaution d''emploi : modification possible de l''effet anticoagulant, surveiller INR.'),
-- Méthotrexate
('méthotrexate','ibuprofène','contre_indication','Contre-indication : les AINS diminuent l''élimination rénale du méthotrexate, risque de toxicité hématologique grave.'),
('méthotrexate','aspirine','contre_indication','Contre-indication : l''aspirine inhibe l''élimination rénale du méthotrexate, aplasie possible.'),
('méthotrexate','triméthoprime','contre_indication','Contre-indication absolue : risque d''aplasie médullaire sévère par synergie d''inhibition du folate.'),
('méthotrexate','diclofénac','contre_indication','Contre-indication : les AINS diminuent l''élimination rénale du méthotrexate, toxicité grave.'),
('méthotrexate','pénicilline','majeure','Précaution d''emploi : les pénicillines réduisent l''élimination rénale du méthotrexate, surveiller.'),
-- Lithium
('lithium','ibuprofène','contre_indication','Association à éviter : les AINS augmentent la lithiémie par réduction de son élimination rénale.'),
('lithium','diclofénac','contre_indication','Association à éviter : les AINS augmentent la lithiémie, risque de surdosage en lithium.'),
('lithium','hydrochlorothiazide','contre_indication','Association à éviter : les thiazidiques diminuent l''élimination rénale du lithium, risque de surdosage.'),
('lithium','furosémide','majeure','Précaution d''emploi : les diurétiques de l''anse peuvent augmenter la lithiémie, surveiller.'),
('lithium','fluoxétine','majeure','Précaution d''emploi : risque de syndrome sérotoninergique et de toxicité neurologique.'),
-- Digitaliques
('digoxine','amiodarone','contre_indication','Association à éviter : l''amiodarone inhibe la P-gp, augmentation de la digoxinémie, risque de toxicité digitale.'),
('digoxine','vérapamil','majeure','Précaution d''emploi : vérapamil augmente les taux de digoxine, potentialise le risque de bradycardie et BAV.'),
('digoxine','clarithromycine','majeure','Précaution d''emploi : clarithromycine inhibe la P-gp et augmente la digoxinémie, risque de toxicité.'),
('sotalol','amiodarone','contre_indication','Contre-indication : risque de torsade de pointe et de troubles du rythme ventriculaires graves.'),
-- Opioïdes et dépresseurs SNC
('tramadol','fluoxétine','majeure','Précaution d''emploi : risque de syndrome sérotoninergique.'),
('tramadol','paroxétine','majeure','Précaution d''emploi : risque de syndrome sérotoninergique et inhibition du métabolisme du tramadol.'),
('tramadol','sertraline','majeure','Précaution d''emploi : risque de syndrome sérotoninergique.'),
('tramadol','carbamazépine','moderee','Précaution d''emploi : la carbamazépine accélère le métabolisme du tramadol, réduction de l''efficacité analgésique.'),
('morphine','diazépam','majeure','Précaution d''emploi : risque accru de dépression respiratoire, sédation excessive et décès.'),
('morphine','lorazépam','majeure','Précaution d''emploi : risque accru de dépression respiratoire et sédation excessive.'),
('codéine','diazépam','majeure','Précaution d''emploi : risque accru de dépression respiratoire et sédation excessive.'),
-- Statines
('simvastatine','amiodarone','contre_indication','Contre-indication : risque de rhabdomyolyse sévère par inhibition du CYP3A4 par l''amiodarone.'),
('simvastatine','clarithromycine','contre_indication','Contre-indication : risque de rhabdomyolyse sévère par inhibition du CYP3A4.'),
('simvastatine','érythromycine','contre_indication','Contre-indication : risque de rhabdomyolyse sévère par inhibition du CYP3A4.'),
('simvastatine','fénofibrate','majeure','Précaution d''emploi : risque accru de myopathie et de rhabdomyolyse.'),
('atorvastatine','clarithromycine','majeure','Précaution d''emploi : risque de rhabdomyolyse par inhibition du CYP3A4.'),
-- Antiplaquettaires
('clopidogrel','ibuprofène','majeure','Précaution d''emploi : risque hémorragique digestif accru, éviter l''association.'),
('clopidogrel','oméprazole','moderee','Précaution d''emploi : l''oméprazole inhibe le CYP2C19, réduction de l''effet antiplaquettaire du clopidogrel.'),
-- Cardiovasculaires
('vérapamil','métoprolol','contre_indication','Contre-indication : risque de bloc auriculo-ventriculaire complet et d''arrêt cardiaque.'),
('vérapamil','bisoprolol','contre_indication','Contre-indication : risque de bloc auriculo-ventriculaire complet et d''arrêt cardiaque.'),
('diltiazem','métoprolol','majeure','Précaution d''emploi : risque de bradycardie et de bloc auriculo-ventriculaire.'),
('diltiazem','bisoprolol','majeure','Précaution d''emploi : risque de bradycardie et de bloc auriculo-ventriculaire.'),
('lisinopril','spironolactone','majeure','Précaution d''emploi : risque d''hyperkaliémie potentiellement grave, surveiller kaliémie.'),
('ramipril','spironolactone','majeure','Précaution d''emploi : risque d''hyperkaliémie potentiellement grave.'),
('énalapril','spironolactone','majeure','Précaution d''emploi : risque d''hyperkaliémie potentiellement grave.'),
-- Antibiotiques et interactions
('ciprofloxacine','tizanidine','contre_indication','Contre-indication : ciprofloxacine inhibe le CYP1A2, augmentation massive des taux de tizanidine, risque d''hypotension grave.'),
('colchicine','clarithromycine','contre_indication','Contre-indication : clarithromycine inhibe P-gp et CYP3A4, risque de toxicité grave de la colchicine (décès possible).'),
('rifampicine','contraceptif','majeure','Précaution d''emploi : puissant inducteur enzymatique, réduction majeure de l''efficacité des contraceptifs oraux.'),
('isoniazide','phénytoïne','majeure','Précaution d''emploi : isoniazide inhibe le métabolisme de la phénytoïne, risque de surdosage et toxicité neurologique.'),
('fluoroquinolone','prednisolone','majeure','Précaution d''emploi : risque accru de tendinopathie et de rupture tendineuse, notamment du tendon d''Achille.'),
-- Antidiabétiques
('metformine','alcool','contre_indication','Contre-indication : l''association alcool-metformine favorise l''acidose lactique, potentiellement fatale.'),
('insuline','alcool','majeure','Précaution d''emploi : l''alcool potentialise l''effet hypoglycémiant de l''insuline.'),
-- Antiépileptiques
('carbamazépine','valproate','moderee','Précaution d''emploi : le valproate inhibe le métabolisme de la carbamazépine-époxide, surveillance des taux.'),
('carbamazépine','phénytoïne','moderee','Précaution d''emploi : interactions pharmacocinétiques complexes, surveillance des taux plasmatiques nécessaire.');

-- ─── Contre-indications patient ────────────────────────────────────────────
INSERT INTO contraindications (dci_pattern, condition_type, condition_valeur, severite, description) VALUES
-- AINS / pathologies
('ibuprofène','pathologie','Ulcère gastrique','absolue','Contre-indication absolue : les AINS aggravent les ulcères gastro-duodénaux et peuvent provoquer une hémorragie digestive.'),
('diclofénac','pathologie','Ulcère gastrique','absolue','Contre-indication absolue : les AINS aggravent les ulcères gastro-duodénaux.'),
('aspirine','pathologie','Ulcère gastrique','absolue','Contre-indication : risque d''hémorragie digestive majeure.'),
('ibuprofène','pathologie','Insuffisance rénale chronique','relative','Précaution d''emploi : les AINS réduisent la filtration glomérulaire, risque d''aggravation de l''insuffisance rénale.'),
('diclofénac','pathologie','Insuffisance rénale chronique','relative','Précaution d''emploi : les AINS peuvent aggraver l''insuffisance rénale.'),
('ibuprofène','pathologie','Insuffisance cardiaque','absolue','Contre-indication : les AINS provoquent une rétention hydrosodée et aggravent l''insuffisance cardiaque.'),
('diclofénac','pathologie','Insuffisance cardiaque','absolue','Contre-indication : les AINS provoquent rétention sodée et aggravation de l''insuffisance cardiaque.'),
('ibuprofène','pathologie','Asthme','relative','Précaution d''emploi : les AINS peuvent déclencher un bronchospasme chez les asthmatiques sensibles.'),
-- Béta-bloquants / pathologies
('bisoprolol','pathologie','Asthme','absolue','Contre-indication : les béta-bloquants sont contre-indiqués dans l''asthme bronchique (bronchospasme).'),
('métoprolol','pathologie','Asthme','absolue','Contre-indication : les béta-bloquants sont contre-indiqués dans l''asthme bronchique.'),
('aténolol','pathologie','Asthme','absolue','Contre-indication : les béta-bloquants sont contre-indiqués dans l''asthme bronchique.'),
('bisoprolol','pathologie','BPCO','relative','Précaution d''emploi : utiliser avec prudence dans la BPCO sévère, risque de bronchospasme.'),
('métoprolol','pathologie','BPCO','relative','Précaution d''emploi : utiliser avec prudence dans la BPCO sévère.'),
-- Metformine
('metformine','pathologie','Insuffisance rénale chronique','absolue','Contre-indication si DFG < 30 mL/min : risque d''accumulation et d''acidose lactique potentiellement fatale.'),
('metformine','pathologie','Cirrhose hépatique','absolue','Contre-indication : risque majoré d''acidose lactique en cas d''insuffisance hépatique.'),
-- Lithium
('lithium','pathologie','Insuffisance rénale chronique','absolue','Contre-indication : accumulation du lithium liée à la réduction de l''élimination rénale, risque de toxicité grave.'),
-- Opioïdes
('morphine','pathologie','BPCO','relative','Précaution d''emploi : les opioïdes peuvent aggraver la dépression respiratoire dans la BPCO sévère.'),
('codéine','pathologie','BPCO','relative','Précaution d''emploi : les opioïdes peuvent aggraver la dépression respiratoire dans la BPCO sévère.'),
-- Antiépileptiques
('tramadol','pathologie','Épilepsie','relative','Précaution d''emploi : le tramadol peut abaisser le seuil épileptogène et déclencher des crises.'),
('ciprofloxacine','pathologie','Épilepsie','relative','Précaution d''emploi : les fluoroquinolones peuvent abaisser le seuil épileptogène.'),
-- Corticoïdes
('prednisolone','pathologie','Diabète type 2','relative','Précaution d''emploi : la prednisolone aggrave l''équilibre glycémique, renforcer la surveillance.'),
('prednisolone','pathologie','Diabète type 1','relative','Précaution d''emploi : la prednisolone aggrave l''équilibre glycémique, adapter la dose d''insuline.'),
('méthylprednisolone','pathologie','Diabète type 2','relative','Précaution d''emploi : les corticoïdes induisent une hyperglycémie.'),
-- Allergies médicamenteuses
('amoxicilline','allergie_med','Pénicillines','absolue','Contre-indication absolue : allergie aux pénicillines documentée, risque de choc anaphylactique.'),
('amoxicilline','allergie_med','Amoxicilline','absolue','Contre-indication absolue : allergie documentée à l''amoxicilline.'),
('ibuprofène','allergie_med','AINS','absolue','Contre-indication absolue : allergie aux AINS documentée.'),
('ibuprofène','allergie_med','Aspirine','absolue','Contre-indication : allergie croisée AINS-Aspirine fréquente.'),
('aspirine','allergie_med','Aspirine','absolue','Contre-indication absolue : allergie documentée à l''aspirine.'),
('sulfaméthoxazole','allergie_med','Sulfamides','absolue','Contre-indication absolue : allergie aux sulfamides documentée.'),
('codéine','allergie_med','Codéine','absolue','Contre-indication absolue : allergie documentée à la codéine.'),
('morphine','allergie_med','Morphine','absolue','Contre-indication absolue : allergie documentée à la morphine.');

DO $$ BEGIN RAISE NOTICE '✓ Tables drug_interactions et contraindications créées et alimentées'; END $$;
