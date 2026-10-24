// Tarification Ordosur — SOURCE UNIQUE de tous les prix et durées affichés.
// Offre unique, tout inclus, par médecin. Montants hors taxes (HT).
// Côté base, admin_billing_summary reprend ces montants (migration 20261027120000_offre_unique_349).

export const PRICE_MONTHLY_HT = 349;
export const PRICE_YEARLY_HT = 3490;
export const TVA_RATE = 0.2;
export const TRIAL_DAYS = 30;

/** Mois offerts par l'abonnement annuel par rapport à 12 mensualités (12 × 349 − 3 490 = 698 = 2 × 349). */
export const YEARLY_FREE_MONTHS = Math.round((12 * PRICE_MONTHLY_HT - PRICE_YEARLY_HT) / PRICE_MONTHLY_HT);

export type BillingPlan = 'mensuel' | 'annuel';

export const PLAN_LABEL: Record<BillingPlan, string> = {
  mensuel: 'Mensuel',
  annuel: 'Annuel',
};

/** Montant HT ramené au mois — sert au MRR. */
export const PLAN_MONTHLY_HT: Record<BillingPlan, number> = {
  mensuel: PRICE_MONTHLY_HT,
  annuel: PRICE_YEARLY_HT / 12,
};

const NBSP = String.fromCharCode(0xa0);
const NNBSP = String.fromCharCode(0x202f);

/** 3490 → « 3 490 » (espace insécable fine comme séparateur des milliers, convention française). */
export function formatAmount(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  const [int, dec] = rounded.toFixed(rounded % 1 === 0 ? 0 : 2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
  return dec ? `${grouped},${dec}` : grouped;
}

/** 349 → « 349 DH HT » */
export function formatDhHt(n: number): string {
  return `${formatAmount(n)}${NBSP}DH HT`;
}

/** « 349 DH HT / mois » */
export const MONTHLY_LABEL = `${formatDhHt(PRICE_MONTHLY_HT)} / mois`;
/** « 3 490 DH HT / an » */
export const YEARLY_LABEL = `${formatDhHt(PRICE_YEARLY_HT)} / an`;

/** Montant TTC correspondant (information). */
export function ttc(ht: number): number {
  return Math.round(ht * (1 + TVA_RATE) * 100) / 100;
}

/** « Essai gratuit 30 jours » */
export const TRIAL_LABEL = `Essai gratuit ${TRIAL_DAYS}${NBSP}jours`;

/** « 2 mois offerts » */
export const YEARLY_DISCOUNT_LABEL = `${YEARLY_FREE_MONTHS}${NBSP}mois offerts`;
