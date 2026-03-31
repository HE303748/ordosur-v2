import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/*
 * SECURITY NOTE: Ensure "Leaked Password Protection" is enabled in
 * Supabase Dashboard > Authentication > Settings > Password Security
 *
 * This enables HaveIBeenPwned checks to prevent users from using
 * compromised passwords that have appeared in data breaches.
 *
 * EMAIL DELIVERY: To fix emails going to spam, configure custom SMTP in
 * Supabase Dashboard > Authentication > Email Settings.
 * Recommended providers: Resend.com or SendGrid with a verified custom domain.
 * This ensures better deliverability and prevents emails from being marked as spam.
 */

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface User {
  id: string;
  email: string;
  role: 'clinic' | 'doctor';
  clinic_name?: string;
  doctor_name?: string;
}

export interface Patient {
  id: string;
  doctor_id: string;
  nom_complet: string;
  age: number;
  sexe: 'Homme' | 'Femme';
  poids?: number;
  taille?: number;
  creatinine?: number;
  imc?: number;
  dfg?: number;
  maladies_chroniques: string[];
  allergies: string[];
  created_at: string;
}

export interface Medication {
  id: string;
  nom: string;
  classe_therapeutique: string;
  contraindications: string[];
}

export interface DrugInteraction {
  id: string;
  medicament_a: string;
  medicament_b: string;
  severity: 'safe' | 'attention' | 'dangerous';
  description: string;
  alternatives: string[];
}

export interface InteractionLog {
  id: string;
  doctor_id: string;
  patient_id?: string;
  medicament_a: string;
  medicament_b: string;
  risk_level: 'safe' | 'attention' | 'dangerous';
  timestamp: string;
}

export interface DoctorPerformance {
  id: string;
  doctor_id: string;
  patients_served: number;
  interactions_resolved: number;
  safety_rate: number;
  month: number;
  year: number;
}
