import type { Patient } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskCategory = 'low' | 'moderate' | 'high' | 'critical';

export interface RiskResult {
  score:      number;
  category:   RiskCategory;
  label:      string;
  badgeClass: string;
  alertIcon:  boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Conditions pathologiques dangereuses (partiel, insensible à la casse) */
const DANGEROUS_CONDITIONS = [
  'diabète', 'diabetes', 'diabète de type',
  'insuffisance rénale', 'insuffisance cardiaque', 'insuffisance hépatique',
  'renal failure', 'cardiac failure', 'heart failure',
  'cirrhose', 'irc', 'ins. cardiaque', 'ins. rénale',
];

// ─── Main function ─────────────────────────────────────────────────────────────

/**
 * Calcule un score de risque patient sur 100.
 *
 * Algorithme :
 * - Âge > 65 ans :                 +20 pts
 * - Âge > 50 ans :                 +10 pts
 * - Pathologies chroniques × 8 :   max 32 pts
 * - Pathologie critique détectée :  +15 pts
 * - Allergies médicamenteuses × 5 : max 20 pts
 * - Traitements en cours :          +8 pts
 *
 * Catégories :
 *  0–25   → Faible risque  (vert)
 * 26–50   → Risque modéré  (orange)
 * 51–75   → Risque élevé   (rouge)
 * 76–100  → Risque critique (rouge foncé + alerte)
 */
export function calculateRiskScore(patient: Patient): RiskResult {
  let score = 0;

  // ── Âge ────────────────────────────────────────────────────────────────────
  if (patient.date_naissance) {
    const ageMs = Date.now() - new Date(patient.date_naissance).getTime();
    const age   = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25));
    if (age > 65)       score += 20;
    else if (age > 50)  score += 10;
  }

  // ── Pathologies chroniques ──────────────────────────────────────────────────
  const pathologies = patient.pathologies ?? [];
  score += Math.min(pathologies.length * 8, 32);

  // ── Pathologie critique ─────────────────────────────────────────────────────
  const pathLower = pathologies.map(p => p.toLowerCase());
  const hasDangerous = DANGEROUS_CONDITIONS.some(c =>
    pathLower.some(p => p.includes(c))
  );
  if (hasDangerous) score += 15;

  // ── Allergies médicamenteuses ───────────────────────────────────────────────
  const allergies = patient.allergies_medicaments ?? [];
  score += Math.min(allergies.length * 5, 20);

  // ── Traitements en cours ────────────────────────────────────────────────────
  if (patient.traitements_en_cours) score += 8;

  score = Math.min(score, 100);

  // ── Catégorie ───────────────────────────────────────────────────────────────
  if (score <= 25) {
    return {
      score, category: 'low', alertIcon: false,
      label: 'Faible risque',
      badgeClass:
        'bg-emerald-50 text-emerald-700 border border-emerald-100 ' +
        'dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    };
  }
  if (score <= 50) {
    return {
      score, category: 'moderate', alertIcon: false,
      label: 'Risque modéré',
      badgeClass:
        'bg-amber-50 text-amber-700 border border-amber-100 ' +
        'dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    };
  }
  if (score <= 75) {
    return {
      score, category: 'high', alertIcon: false,
      label: 'Risque élevé',
      badgeClass:
        'bg-red-50 text-red-600 border border-red-100 ' +
        'dark:bg-red-500/10 dark:text-red-400 dark:border-red-100/20',
    };
  }
  return {
    score, category: 'critical', alertIcon: true,
    label: 'Risque critique',
    badgeClass:
      'bg-red-100 text-red-800 border border-red-200 ' +
      'dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30',
  };
}
