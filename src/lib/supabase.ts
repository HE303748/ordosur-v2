import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── V2 SCHEMA INTERFACES ────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  type: 'cabinet' | 'clinique';
  siret?: string | null;
  adresse?: string | null;
  telephone?: string | null;
  email?: string | null;
  created_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  org_id: string;
  role: 'super_admin' | 'clinic_admin' | 'doctor';
  prenom: string;
  nom: string;
  created_at: string;
}

export interface Doctor {
  id: string;
  user_id: string;
  org_id: string;
  rpps?: string | null;
  specialite?: string | null;
  ordre_number?: string | null;
  created_at: string;
}

export interface Patient {
  id: string;
  org_id: string;
  prenom: string;
  nom: string;
  date_naissance?: string | null;
  sexe?: 'M' | 'F' | null;
  telephone?: string | null;
  email?: string | null;
  adresse?: string | null;
  created_at: string;
}

export interface Consultation {
  id: string;
  patient_id: string;
  doctor_id: string;
  org_id: string;
  date: string;
  motif?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Ordonnance {
  id: string;
  consultation_id?: string | null;
  patient_id: string;
  doctor_id: string;
  org_id: string;
  date: string;
  statut?: string | null;
  created_at: string;
}

export interface OrdonnanceLigne {
  id: string;
  ordonnance_id: string;
  medicament_nom: string;
  posologie?: string | null;
  duree?: string | null;
  instructions?: string | null;
}

export interface Medicament {
  id: string;
  nom: string;
  nom_commercial?: string | null;
  dci?: string | null;
  forme?: string | null;
  dosage?: string | null;
  laboratoire?: string | null;
  voie_administration?: string | null;
}
