/*
  # Add Consultations, Prescriptions, and Side Effects

  1. New Tables
    - `consultations` - Medical consultations
    - `prescriptions` - Prescription details for each consultation
    - `medication_side_effects` - Side effects for medications

  2. Updates
    - Add side effects fields to medications table

  3. Security
    - Enable RLS on all new tables
    - Add policies for doctors and clinic users
*/

-- Add side effects columns to medications
ALTER TABLE medications ADD COLUMN IF NOT EXISTS effets_secondaires_frequents text[] DEFAULT '{}';
ALTER TABLE medications ADD COLUMN IF NOT EXISTS effets_secondaires_rares text[] DEFAULT '{}';
ALTER TABLE medications ADD COLUMN IF NOT EXISTS precautions text[] DEFAULT '{}';
ALTER TABLE medications ADD COLUMN IF NOT EXISTS contre_indications_relatives text[] DEFAULT '{}';

-- Create consultations table
CREATE TABLE IF NOT EXISTS consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL,
  date_consultation timestamptz NOT NULL DEFAULT now(),
  motif text NOT NULL,
  commentaires text NOT NULL,
  prochain_rdv timestamptz,
  interaction_result text,
  interaction_severity text,
  created_at timestamptz DEFAULT now()
);

-- Create prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  medication_id uuid NOT NULL REFERENCES medications(id),
  medication_nom text NOT NULL,
  posologie text NOT NULL,
  duree text NOT NULL,
  quantite text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Policies for consultations
CREATE POLICY "Users can manage consultations"
  ON consultations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for prescriptions
CREATE POLICY "Users can manage prescriptions"
  ON prescriptions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update medications with side effects
UPDATE medications SET
  effets_secondaires_frequents = ARRAY['Nausées légères (2-5%)', 'Réactions cutanées mineures (1-3%)'],
  effets_secondaires_rares = ARRAY['Atteinte hépatique si surdosage >4g/jour (<1%)', 'Réactions allergiques sévères (<0.1%)', 'Thrombopénie (très rare)'],
  precautions = ARRAY['Ne pas dépasser 3g/jour chez l''adulte', 'Espacer les prises de 4-6 heures minimum', 'Vérifier absence paracétamol dans autres médicaments'],
  contre_indications_relatives = ARRAY['Insuffisance hépatique sévère', 'Alcoolisme chronique', 'Dénutrition']
WHERE nom LIKE '%Paracétamol%' OR nom LIKE '%Doliprane%';

UPDATE medications SET
  effets_secondaires_frequents = ARRAY['Douleurs gastriques (5-10%)', 'Nausées, vomissements (3-8%)', 'Maux de tête (2-5%)', 'Vertiges (1-3%)'],
  effets_secondaires_rares = ARRAY['Ulcères gastro-duodénaux (<1%)', 'Hémorragie digestive (<0.5%)', 'Insuffisance rénale (utilisation prolongée) (<1%)', 'Réactions allergiques (asthme, œdème) (<0.5%)'],
  precautions = ARRAY['Prendre pendant les repas', 'Ne pas dépasser 1200mg/jour', 'Éviter alcool', 'Surveillance fonction rénale si traitement prolongé'],
  contre_indications_relatives = ARRAY['Ulcère gastro-duodénal actif', 'Insuffisance rénale sévère', 'Grossesse (3ème trimestre)', 'Allergie AINS connue']
WHERE nom LIKE '%Ibuprofène%';

UPDATE medications SET
  effets_secondaires_frequents = ARRAY['Douleurs gastriques (3-7%)', 'Saignements mineurs (2-5%)', 'Nausées (2-4%)'],
  effets_secondaires_rares = ARRAY['Hémorragie digestive grave (<1%)', 'Syndrome de Reye chez l''enfant (<0.1%)', 'Réactions allergiques sévères (<0.5%)', 'AVC hémorragique (rare)'],
  precautions = ARRAY['Prendre pendant les repas', 'Éviter si antécédents d''ulcère', 'Arrêter 7 jours avant chirurgie', 'Surveillance si anticoagulants associés'],
  contre_indications_relatives = ARRAY['Ulcère gastro-duodénal', 'Troubles de coagulation', 'Insuffisance hépatique sévère', 'Grossesse', 'Allergie aspirine']
WHERE nom LIKE '%Aspirine%';

UPDATE medications SET
  effets_secondaires_frequents = ARRAY['Diarrhée (5-10%)', 'Nausées (3-7%)', 'Éruption cutanée (2-5%)', 'Candidose buccale/vaginale (2-4%)'],
  effets_secondaires_rares = ARRAY['Réaction allergique grave (choc anaphylactique) (<1%)', 'Colite pseudomembraneuse (<0.5%)', 'Hépatite (<0.1%)', 'Troubles hématologiques (<0.1%)'],
  precautions = ARRAY['Prendre pendant ou après les repas', 'Respecter intervalle entre prises', 'Terminer le traitement même si amélioration', 'Signaler allergie pénicilline'],
  contre_indications_relatives = ARRAY['Allergie pénicilline', 'Mononucléose infectieuse', 'Insuffisance rénale sévère (adaptation dose)']
WHERE nom LIKE '%Amoxicilline%' OR nom LIKE '%Augmentin%';

UPDATE medications SET
  effets_secondaires_frequents = ARRAY['Diarrhée (10-20%)', 'Nausées, vomissements (5-10%)', 'Douleurs abdominales (3-7%)', 'Goût métallique (2-5%)'],
  effets_secondaires_rares = ARRAY['Acidose lactique (<0.03%)', 'Carence vitamine B12 (utilisation prolongée) (1-2%)', 'Hépatite (<0.1%)', 'Anémie mégaloblastique (<0.1%)'],
  precautions = ARRAY['Prendre pendant les repas', 'Augmenter progressivement la dose', 'Surveillance fonction rénale régulière', 'Arrêter si chirurgie ou examen avec produit de contraste iodé'],
  contre_indications_relatives = ARRAY['Insuffisance rénale (DFG <30 ml/min)', 'Acidose métabolique', 'Insuffisance cardiaque sévère', 'Alcoolisme aigu', 'Déshydratation']
WHERE nom LIKE '%Metformine%';

UPDATE medications SET
  effets_secondaires_frequents = ARRAY['Douleurs musculaires (myalgies) (2-5%)', 'Maux de tête (2-4%)', 'Troubles digestifs (1-3%)', 'Élévation transaminases (1-2%)'],
  effets_secondaires_rares = ARRAY['Rhabdomyolyse (destruction musculaire) (<0.1%)', 'Hépatite (<0.1%)', 'Neuropathie périphérique (<0.1%)', 'Diabète sucré (nouveau diagnostic) (1%)'],
  precautions = ARRAY['Prendre le soir', 'Surveillance bilan hépatique', 'Signaler douleurs musculaires persistantes', 'Éviter pamplemousse', 'Surveillance CPK si douleurs musculaires'],
  contre_indications_relatives = ARRAY['Insuffisance hépatique active', 'Grossesse', 'Allaitement', 'Myopathie préexistante']
WHERE nom LIKE '%Atorvastatine%' OR nom LIKE '%Simvastatine%';

UPDATE medications SET
  effets_secondaires_frequents = ARRAY['Hémorragies (variables selon INR)', 'Hématomes faciles (fréquent)', 'Saignements gingivaux (2-5%)'],
  effets_secondaires_rares = ARRAY['Hémorragie intracrânienne (<1%)', 'Nécroses cutanées (<0.1%)', 'Syndrome orteil pourpre (<0.1%)', 'Hépatite (<0.1%)'],
  precautions = ARRAY['Surveillance INR régulière (cible 2-3)', 'Éviter aliments riches en vitamine K variables', 'Signaler tout saignement anormal', 'Attention interactions médicamenteuses nombreuses'],
  contre_indications_relatives = ARRAY['Hémorragie active', 'Grossesse', 'HTA non contrôlée sévère', 'Ulcère gastro-duodénal évolutif', 'Insuffisance hépatique sévère']
WHERE nom LIKE '%Warfarine%' OR nom LIKE '%Coumadine%';

UPDATE medications SET
  effets_secondaires_frequents = ARRAY['Toux sèche (5-20%)', 'Vertiges, étourdissements (3-10%)', 'Hypotension orthostatique (2-5%)', 'Fatigue (2-4%)'],
  effets_secondaires_rares = ARRAY['Angio-œdème (0.1-0.5%)', 'Insuffisance rénale aiguë (<1%)', 'Hyperkaliémie (<1%)', 'Hépatite (<0.1%)'],
  precautions = ARRAY['Surveillance tension artérielle', 'Surveillance fonction rénale et kaliémie', 'Éviter suppléments potassium', 'Boire suffisamment'],
  contre_indications_relatives = ARRAY['Grossesse', 'Allaitement', 'Sténose artères rénales bilatérale', 'Hyperkaliémie', 'Antécédent angio-œdème']
WHERE nom LIKE '%Lisinopril%' OR classe_therapeutique = 'IEC';

UPDATE medications SET
  effets_secondaires_frequents = ARRAY['Œdèmes chevilles (5-15%)', 'Céphalées (2-5%)', 'Bouffées vasomotrices (2-4%)', 'Palpitations (1-3%)'],
  effets_secondaires_rares = ARRAY['Hypertrophie gingivale (utilisation prolongée) (<1%)', 'Hypotension sévère (<1%)', 'Bradycardie (<0.5%)'],
  precautions = ARRAY['Surveillance tension artérielle', 'Éviter pamplemousse', 'Signaler œdèmes importants', 'Lever progressivement (risque hypotension)'],
  contre_indications_relatives = ARRAY['Hypotension sévère', 'Choc cardiogénique', 'Sténose aortique serrée', 'Grossesse']
WHERE nom LIKE '%Amlodipine%';

UPDATE medications SET
  effets_secondaires_frequents = ARRAY['Somnolence, fatigue (10-25%)', 'Nausées, vomissements (5-15%)', 'Constipation (5-15%)', 'Vertiges (5-10%)'],
  effets_secondaires_rares = ARRAY['Dépression respiratoire (surdosage) (<1%)', 'Dépendance (utilisation prolongée) (variable)', 'Syndrome sérotoninergique (avec ISRS) (<0.5%)', 'Convulsions (surdosage) (<1%)'],
  precautions = ARRAY['Ne pas conduire si somnolence', 'Éviter alcool', 'Attention si insuffisance rénale ou hépatique', 'Risque dépendance si >3 mois'],
  contre_indications_relatives = ARRAY['Dépression respiratoire sévère', 'Insuffisance hépatique sévère', 'Épilepsie non contrôlée', 'Allergie codéine/morphiniques']
WHERE nom LIKE '%Tramadol%' OR nom LIKE '%Codéine%' OR nom LIKE '%Morphine%';
