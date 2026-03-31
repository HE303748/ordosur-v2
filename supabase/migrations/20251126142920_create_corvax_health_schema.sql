/*
  # Corvax Health Database Schema
  
  ## Overview
  This migration creates the complete database schema for the Corvax Health medical application,
  including user management, patient records, medication data, drug interactions, and activity logging.
  
  ## Tables Created
  
  ### 1. users
  Stores clinic and doctor user accounts
  - `id` (uuid, primary key) - Unique user identifier
  - `email` (text, unique) - User email for login
  - `password` (text) - Hashed password
  - `role` (text) - User role: 'clinic' or 'doctor'
  - `clinic_name` (text, nullable) - Clinic name for clinic users
  - `doctor_name` (text, nullable) - Doctor name for doctor users
  - `created_at` (timestamptz) - Account creation timestamp
  
  ### 2. patients
  Stores patient records managed by doctors
  - `id` (uuid, primary key) - Unique patient identifier
  - `doctor_id` (uuid, foreign key) - Reference to managing doctor
  - `nom_complet` (text) - Patient full name
  - `age` (integer) - Patient age
  - `sexe` (text) - Patient gender: 'Homme' or 'Femme'
  - `maladies_chroniques` (text array) - List of chronic diseases
  - `allergies` (text array) - List of known allergies
  - `created_at` (timestamptz) - Record creation timestamp
  
  ### 3. medications
  Stores medication database with therapeutic information
  - `id` (uuid, primary key) - Unique medication identifier
  - `nom` (text, unique) - Medication name in French
  - `classe_therapeutique` (text) - Therapeutic class/category
  - `contraindications` (text array) - List of contraindications
  - `created_at` (timestamptz) - Record creation timestamp
  
  ### 4. drug_interactions
  Stores known drug interaction rules
  - `id` (uuid, primary key) - Unique interaction identifier
  - `medicament_a` (text) - First medication name
  - `medicament_b` (text) - Second medication name
  - `severity` (text) - Interaction severity: 'safe', 'attention', 'dangerous'
  - `description` (text) - Detailed French description of interaction
  - `alternatives` (text array) - List of alternative medications
  - `created_at` (timestamptz) - Record creation timestamp
  
  ### 5. interaction_logs
  Logs all drug interaction checks performed
  - `id` (uuid, primary key) - Unique log identifier
  - `doctor_id` (uuid, foreign key) - Doctor who performed check
  - `patient_id` (uuid, foreign key, nullable) - Patient for whom check was performed
  - `medicament_a` (text) - First medication checked
  - `medicament_b` (text) - Second medication checked
  - `risk_level` (text) - Result: 'safe', 'attention', 'dangerous'
  - `timestamp` (timestamptz) - When check was performed
  - `created_at` (timestamptz) - Log creation timestamp
  
  ### 6. doctor_performance
  Aggregated performance metrics for doctors
  - `id` (uuid, primary key) - Unique record identifier
  - `doctor_id` (uuid, foreign key) - Doctor reference
  - `patients_served` (integer) - Total patients served
  - `interactions_resolved` (integer) - Total interactions checked
  - `safety_rate` (decimal) - Safety percentage (0-100)
  - `month` (integer) - Month (1-12)
  - `year` (integer) - Year
  - `created_at` (timestamptz) - Record creation timestamp
  
  ## Security
  
  All tables have Row Level Security (RLS) enabled with appropriate policies:
  - Users can only access their own data
  - Doctors can only access their own patients and interactions
  - Clinic users can view aggregated performance data for all doctors
  - Authentication is required for all operations
  
  ## Important Notes
  
  1. Passwords should be hashed before storage (handled by application layer)
  2. All timestamps use UTC timezone
  3. Foreign key constraints ensure data integrity
  4. Indexes are created on frequently queried columns for performance
  5. Default values are set for timestamps and arrays
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  role text NOT NULL CHECK (role IN ('clinic', 'doctor')),
  clinic_name text,
  doctor_name text,
  created_at timestamptz DEFAULT now()
);

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nom_complet text NOT NULL,
  age integer NOT NULL CHECK (age > 0 AND age < 150),
  sexe text NOT NULL CHECK (sexe IN ('Homme', 'Femme')),
  maladies_chroniques text[] DEFAULT '{}',
  allergies text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create medications table
CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text UNIQUE NOT NULL,
  classe_therapeutique text NOT NULL,
  contraindications text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create drug_interactions table
CREATE TABLE IF NOT EXISTS drug_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicament_a text NOT NULL,
  medicament_b text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('safe', 'attention', 'dangerous')),
  description text NOT NULL,
  alternatives text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create interaction_logs table
CREATE TABLE IF NOT EXISTS interaction_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  medicament_a text NOT NULL,
  medicament_b text NOT NULL,
  risk_level text NOT NULL CHECK (risk_level IN ('safe', 'attention', 'dangerous')),
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create doctor_performance table
CREATE TABLE IF NOT EXISTS doctor_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patients_served integer DEFAULT 0,
  interactions_resolved integer DEFAULT 0,
  safety_rate decimal(5,2) DEFAULT 0.00 CHECK (safety_rate >= 0 AND safety_rate <= 100),
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(doctor_id, month, year)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_patients_doctor_id ON patients(doctor_id);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_doctor_id ON interaction_logs(doctor_id);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_timestamp ON interaction_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_doctor_performance_doctor_id ON doctor_performance(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medications_nom ON medications(nom);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for patients table
CREATE POLICY "Doctors can view own patients"
  ON patients FOR SELECT
  TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Doctors can insert own patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Doctors can update own patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Doctors can delete own patients"
  ON patients FOR DELETE
  TO authenticated
  USING (doctor_id = auth.uid());

-- RLS Policies for medications table (public read for all authenticated users)
CREATE POLICY "Authenticated users can read medications"
  ON medications FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for drug_interactions table (public read for all authenticated users)
CREATE POLICY "Authenticated users can read drug interactions"
  ON drug_interactions FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for interaction_logs table
CREATE POLICY "Doctors can view own interaction logs"
  ON interaction_logs FOR SELECT
  TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Clinic users can view all interaction logs"
  ON interaction_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'clinic'
    )
  );

CREATE POLICY "Doctors can insert own interaction logs"
  ON interaction_logs FOR INSERT
  TO authenticated
  WITH CHECK (doctor_id = auth.uid());

-- RLS Policies for doctor_performance table
CREATE POLICY "Doctors can view own performance"
  ON doctor_performance FOR SELECT
  TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Clinic users can view all doctor performance"
  ON doctor_performance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'clinic'
    )
  );