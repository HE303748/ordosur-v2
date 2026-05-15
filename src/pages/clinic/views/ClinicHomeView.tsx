import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, AlertTriangle, Activity, Calendar, ChevronRight, UserPlus, UserCheck, ShieldAlert } from 'lucide-react';
import { PageTransition } from '../../../components/ui/PageTransition';
import { supabase } from '../../../lib/supabase';
import type { Patient } from '../../../lib/supabase';
import { calculateRiskScore, type RiskResult } from '../../../lib/riskScore';

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ TYPES ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

export interface DoctorWithProfile {
  id: string;
  user_id: string;
  rpps: string | null;
  specialite: string | null;
  prenom: string;
  nom: string;
  email?: string;
}

interface RdvItem {
  id: string;
  heure_debut: string;
  heure_fin: string | null;
  patient_id: string | null;
  doctor_id: string | null;
  type: string | null;
  patient_name?: string;
  doctor_name?: string;
}

interface ClinicHomeViewProps {
  doctors: DoctorWithProfile[];
  orgId?: string;
  onNavigate?: (v: string) => void;
}

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ CONSTANTS ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

const AVATAR_COLORS = [
  '[#00A86B]',
  'from-violet-400 to-purple-500',
  'from-[#00A86B] to-[#006B47]',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  '[#00A86B]',
];

const RDV_COLORS = ['sky', 'violet', 'emerald', 'amber', 'rose', 'cyan'] as const;

const RDV_COLOR_CLASSES: Record<string, string> = {
  sky:     'bg-[#E6F4EE] text-[#006B47] dark:bg-[#00A86B]/20 dark:text-[#00A86B]',
  violet:  'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  amber:   'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  rose:    'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  cyan:    'bg-[#E6F4EE] text-[#006B47] dark:bg-[#00A86B]/20 dark:text-[#00A86B]',
};

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ KPI CARD ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub: string;
  color: 'sky' | 'teal' | 'violet' | 'emerald' | 'red';
  loading: boolean;
}) {
  const colorMap = {
    sky:     'bg-[#E6F4EE] text-[#00A86B] dark:bg-[#00A86B]/10 dark:text-[#00A86B]',
    teal:    'bg-[#E6F4EE] text-[#006B47] dark:bg-[#00A86B]/10 dark:text-[#00A86B]',
    violet:  'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    red:     'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-5 shadow-sm animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-white/[0.07]" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-24 bg-slate-200 dark:bg-white/[0.07] rounded-xl" />
            <div className="h-7 w-16 bg-slate-200 dark:bg-white/[0.07] rounded-xl" />
            <div className="h-2.5 w-20 bg-slate-200 dark:bg-white/[0.07] rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-5 shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0] mt-0.5">{value}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ MAIN COMPONENT ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

export function ClinicHomeView({ doctors, orgId, onNavigate }: ClinicHomeViewProps) {
  const [patientsCount, setPatientsCount] = useState(0);
  const [newPatientsCount, setNewPatientsCount] = useState(0);
  const [ordonnancesCount, setOrdonnancesCount] = useState(0);
  const [todayRdv, setTodayRdv] = useState<RdvItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskPatients, setRiskPatients] = useState<Array<{ patient: Patient; risk: RiskResult }>>([]);

  const todayDate = new Date();
  const todayStr = todayDate.toISOString().split('T')[0];
  const currentHour = todayDate.getHours();

  const startOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1).toISOString();

  const formattedDate = todayDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    if (orgId) loadData();
    else setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function loadData() {
    try {
      setLoading(true);

      const [patientsRes, newPatientsRes, ordonnancesRes, rdvRes] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact', head: true }).eq('org_id', orgId!),
        supabase
          .from('patients')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId!)
          .gte('created_at', startOfMonth),
        supabase
          .from('ordonnances')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId!)
          .gte('created_at', startOfMonth),
        supabase
          .from('rdv')
          .select('id, heure_debut, heure_fin, patient_id, doctor_id, type')
          .eq('org_id', orgId!)
          .eq('date', todayStr)
          .order('heure_debut'),
      ]);

      setPatientsCount(patientsRes.count ?? 0);
      setNewPatientsCount(newPatientsRes.count ?? 0);
      setOrdonnancesCount(ordonnancesRes.count ?? 0);

      const rdvItems: RdvItem[] = rdvRes.data ?? [];

      // Enrich RDV with patient and doctor names
      const patientIds = [...new Set(rdvItems.map(r => r.patient_id).filter(Boolean))] as string[];
      const doctorIds  = [...new Set(rdvItems.map(r => r.doctor_id).filter(Boolean))] as string[];

      const [patientsData, doctorsUserIds] = await Promise.all([
        patientIds.length > 0
          ? supabase.from('patients').select('id, prenom, nom').in('id', patientIds)
          : Promise.resolve({ data: [] }),
        doctorIds.length > 0
          ? supabase.from('doctors').select('id, user_id').in('id', doctorIds)
          : Promise.resolve({ data: [] }),
      ]);

      const doctorRows = doctorsUserIds.data ?? [];
      const userIds = doctorRows.map(d => d.user_id).filter(Boolean) as string[];

      const profilesRes = userIds.length > 0
        ? await supabase.from('user_profiles').select('user_id, prenom, nom').in('user_id', userIds)
        : { data: [] };

      const patientMap = new Map((patientsData.data ?? []).map(p => [p.id, `${p.prenom} ${p.nom}`]));
      const userProfileMap = new Map((profilesRes.data ?? []).map(p => [p.user_id, `${p.prenom} ${p.nom}`]));
      const doctorNameMap = new Map(
        doctorRows.map(d => [d.id, userProfileMap.get(d.user_id) ?? 'Dr. Inconnu'])
      );

      const enriched = rdvItems.map(r => ({
        ...r,
        patient_name: r.patient_id ? (patientMap.get(r.patient_id) ?? 'Patient inconnu') : 'Patient inconnu',
        doctor_name: r.doctor_id ? `Dr. ${doctorNameMap.get(r.doctor_id) ?? 'Inconnu'}` : 'MÃƒÆ’Ã‚Â©decin inconnu',
      }));

      setTodayRdv(enriched);

      // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Patients ÃƒÆ’Ã‚Â  risque ÃƒÆ’Ã‚Â©levÃƒÆ’Ã‚Â© / critique ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
      const { data: patsForRisk } = await supabase
        .from('patients')
        .select('id, prenom, nom, date_naissance, pathologies, allergies_medicaments, traitements_en_cours, org_id, sexe, telephone, email, adresse, allergies_alimentaires, groupe_sanguin, antecedents_chirurgicaux, created_at')
        .eq('org_id', orgId!)
        .limit(200);

      if (patsForRisk) {
        const scored = patsForRisk
          .map(p => ({ patient: p as Patient, risk: calculateRiskScore(p as Patient) }))
          .filter(({ risk }) => risk.category === 'high' || risk.category === 'critical')
          .sort((a, b) => b.risk.score - a.risk.score)
          .slice(0, 5);
        setRiskPatients(scored);
      }
    } catch (err) {
      console.error('[ClinicHomeView] loadData error:', err);
    } finally {
      setLoading(false);
    }
  }

  function getDoctorStatus(doctor: DoctorWithProfile): { label: string; color: string } {
    const isInConsultation = todayRdv.some(rdv => {
      if (rdv.doctor_id !== doctor.id) return false;
      const hour = parseInt(rdv.heure_debut.split(':')[0] ?? '0', 10);
      return hour === currentHour;
    });

    if (isInConsultation) {
      return { label: 'En consultation', color: 'bg-[#E6F4EE] text-[#006B47] dark:bg-[#00A86B]/20 dark:text-[#00A86B]' };
    }
    return { label: 'Disponible', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' };
  }

  const interactionsCount = 0;

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 space-y-6">

        {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Welcome header ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
        <div className="relative overflow-hidden bg-gradient-to-r [#00A86B] rounded-2xl px-6 py-5 shadow-sm">
          <div className="relative z-10">
            <h1 className="text-xl font-bold text-white">
              Bonjour ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ¢â‚¬Â¹ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Tableau de bord de la Clinique
            </h1>
            <p className="text-white/70 text-sm mt-0.5 capitalize">{formattedDate}</p>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10">
            <Activity className="w-24 h-24 text-white" />
          </div>
        </div>

        {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ KPI Cards ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            icon={Users}
            label="MÃƒÆ’Ã‚Â©decins actifs"
            value={doctors.length}
            sub={`${doctors.length} spÃƒÆ’Ã‚Â©cialiste(s)`}
            color="sky"
            loading={false}
          />
          <KpiCard
            icon={UserCheck}
            label="Total patients"
            value={patientsCount}
            sub={`+${newPatientsCount} ce mois`}
            color="teal"
            loading={loading}
          />
          <KpiCard
            icon={FileText}
            label="Ordonnances ce mois"
            value={ordonnancesCount}
            sub="Ce mois"
            color="violet"
            loading={loading}
          />
          <KpiCard
            icon={AlertTriangle}
            label="Interactions"
            value={interactionsCount}
            sub="Aucune dÃƒÆ’Ã‚Â©tectÃƒÆ’Ã‚Â©e"
            color={interactionsCount > 0 ? 'red' : 'emerald'}
            loading={false}
          />
        </div>

        {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ 3-column layout ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

          {/* Col 1: ÃƒÆ’Ã¢â‚¬Â°quipe mÃƒÆ’Ã‚Â©dicale (2/5) */}
          <div className="xl:col-span-2">
            <motion.div
              whileHover={{ y: -1 }}
              className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl shadow-sm p-5 h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">ÃƒÆ’Ã¢â‚¬Â°quipe mÃƒÆ’Ã‚Â©dicale</h2>
                <button
                  onClick={() => onNavigate?.('medecins')}
                  className="text-xs text-[#00A86B] hover:text-[#00A86B] dark:hover:text-[#00A86B] flex items-center gap-1"
                >
                  Voir tous <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {doctors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Users className="w-10 h-10 text-slate-200 dark:text-slate-700 mb-3" />
                  <p className="text-sm text-slate-400 dark:text-slate-600">Aucun mÃƒÆ’Ã‚Â©decin enregistrÃƒÆ’Ã‚Â©</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {doctors.slice(0, 5).map((doctor, idx) => {
                    const initials = `${doctor.prenom[0] ?? ''}${doctor.nom[0] ?? ''}`.toUpperCase();
                    const gradientClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                    const status = getDoctorStatus(doctor);
                    return (
                      <div key={doctor.id} className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-[#E2E8F0] truncate">
                            Dr. {doctor.prenom} {doctor.nom}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-[#94A3B8] truncate">
                            {doctor.specialite ?? 'MÃƒÆ’Ã‚Â©decin gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©raliste'}
                          </p>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          {/* Col 2: RDV du jour (2/5) */}
          <div className="xl:col-span-2">
            <motion.div
              whileHover={{ y: -1 }}
              className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl shadow-sm p-5 h-full"
            >
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">RDV du jour</h2>
                {todayRdv.length > 0 && (
                  <span className="ml-auto text-xs bg-[#E6F4EE] text-[#006B47] dark:bg-[#00A86B]/20 dark:text-[#00A86B] px-2 py-0.5 rounded-full font-medium">
                    {todayRdv.length}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-14 h-7 bg-slate-200 dark:bg-white/[0.07] rounded-xl flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-3/4 bg-slate-200 dark:bg-white/[0.07] rounded-xl" />
                        <div className="h-2.5 w-1/2 bg-slate-200 dark:bg-white/[0.07] rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : todayRdv.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Calendar className="w-10 h-10 text-slate-200 dark:text-slate-700 mb-3" />
                  <p className="text-sm text-slate-400 dark:text-slate-600">Aucun RDV aujourd'hui</p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-64">
                  {todayRdv.map((rdv, idx) => {
                    const colorKey = RDV_COLORS[idx % RDV_COLORS.length];
                    const colorClass = RDV_COLOR_CLASSES[colorKey] ?? RDV_COLOR_CLASSES['sky'];
                    return (
                      <div key={rdv.id} className="flex items-start gap-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-xl flex-shrink-0 ${colorClass}`}>
                          {rdv.heure_debut.slice(0, 5)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-[#E2E8F0] truncate">
                            {rdv.patient_name}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-[#94A3B8] truncate">
                            {rdv.doctor_name}
                            {rdv.type ? ` Ãƒâ€šÃ‚Â· ${rdv.type}` : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          {/* Col 3: Actions rapides (1/5) */}
          <div className="xl:col-span-1">
            <motion.div
              whileHover={{ y: -1 }}
              className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl shadow-sm p-5 h-full flex flex-col gap-4"
            >
              <h2 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">Actions rapides</h2>

              <button
                onClick={() => onNavigate?.('medecins')}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-[#E6F4EE] dark:bg-[#00A86B]/10 text-[#006B47] dark:text-[#00A86B] rounded-xl text-sm font-medium hover:bg-[#d4eee0] dark:hover:bg-[#00A86B]/20 transition-colors text-left"
              >
                <UserPlus className="w-4 h-4 flex-shrink-0" />
                <span>Inviter un mÃƒÆ’Ã‚Â©decin</span>
              </button>

              <button
                onClick={() => onNavigate?.('patients')}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-[#E6F4EE] dark:bg-[#00A86B]/10 text-[#006B47] dark:text-[#00A86B] rounded-md text-sm font-medium hover:bg-[#d4eee0] dark:hover:bg-[#00A86B]/20 transition-colors text-left"
              >
                <UserCheck className="w-4 h-4 flex-shrink-0" />
                <span>Ajouter un patient</span>
              </button>

              {/* Interactions alert */}
              <div
                className={`mt-auto rounded-xl p-3 ${
                  interactionsCount > 0
                    ? 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20'
                    : 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${interactionsCount > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
                  <p className={`text-xs font-semibold ${interactionsCount > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {interactionsCount > 0 ? `${interactionsCount} interaction(s)` : 'Aucune interaction'}
                  </p>
                </div>
                <p className={`text-xs mt-1 ${interactionsCount > 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                  {interactionsCount > 0 ? 'VÃƒÆ’Ã‚Â©rification requise' : 'Aucune dÃƒÆ’Ã‚Â©tectÃƒÆ’Ã‚Â©e'}
                </p>
              </div>
            </motion.div>
          </div>

        </div>

        {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Patients ÃƒÆ’Ã‚Â  risque ÃƒÆ’Ã‚Â©levÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
        {(loading || riskPatients.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl shadow-sm"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">Patients ÃƒÆ’Ã‚Â  risque ÃƒÆ’Ã‚Â©levÃƒÆ’Ã‚Â©</h2>
                {!loading && riskPatients.length > 0 && (
                  <span className="text-xs bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 px-2 py-0.5 rounded-full font-semibold">
                    {riskPatients.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => onNavigate?.('patients')}
                className="text-xs text-[#00A86B] hover:text-[#00A86B] dark:hover:text-[#00A86B] flex items-center gap-1"
              >
                Voir patients <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {loading ? (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 dark:bg-white/[0.05] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                {riskPatients.map(({ patient: p, risk }, i) => (
                  <div
                    key={p.id}
                    className={`rounded-xl border p-3 ${
                      risk.category === 'critical'
                        ? 'bg-red-50/60 border-red-200 dark:bg-red-500/[0.07] dark:border-red-500/20'
                        : 'bg-orange-50/60 border-orange-200 dark:bg-amber-500/[0.07] dark:border-amber-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                        AVATAR_COLORS[i % AVATAR_COLORS.length].includes('from-') ? `bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]}` : 'bg-red-400'
                      }`}>
                        {p.prenom[0]}{p.nom[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0] truncate">{p.prenom} {p.nom}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${risk.badgeClass}`}>
                      {risk.alertIcon && <ShieldAlert className="w-2.5 h-2.5" />}
                      {risk.label} Ãƒâ€šÃ‚Â· {risk.score}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

      </div>{/* end space-y-6 p-8 */}
    </PageTransition>
  );
}
