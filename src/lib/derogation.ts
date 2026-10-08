// Sprint 4d — Prescription contre-indiquée : décision du médecin, explicite et tracée.
//
// Module pur (testé par derogation.test.ts). Le médecin garde la décision : une ordonnance
// portant une alerte de niveau maximal n'est enregistrée / imprimée / téléchargée qu'après
// une confirmation motivée, enregistrée dans ordonnances.derogations et interaction_logs
// (source = 'derogation'). Rien de tout cela n'apparaît sur l'ordonnance du patient.

/** Champs d'une alerte utiles à la dérogation (sous-ensemble d'InteractionAlert). */
export interface DerogationAlertLike {
  type: 'drug_drug' | 'contraindication' | 'info';
  severite: string;
  description: string;
  involved: string[];
  condition?: string;
  origin?: 'nouveau' | 'mixte' | 'fond';
  pregnancyContext?: boolean;
}

export const DEROGATION_MOTIFS = [
  { id: 'benefice_risque', label: 'Bénéfice/risque évalué favorable' },
  { id: 'deja_tolere', label: 'Traitement déjà toléré par ce patient' },
  { id: 'avis_specialise', label: 'Sur avis spécialisé' },
  { id: 'autre', label: 'Autre' },
] as const;
export type DerogationMotifId = typeof DEROGATION_MOTIFS[number]['id'];

/** Ligne tracée dans ordonnances.derogations (une par alerte confirmée). */
export interface DerogationEntry {
  medicament: string;
  alerte: string;
  severite: string;
  motif: string;
  commentaire: string | null;
  horodatage: string;
}

export interface DerogationConfirmation {
  /** Signature de l'ordonnance au moment de la confirmation (voir ordonnanceSignature). */
  signature: string;
  motif: DerogationMotifId;
  motifAutre: string | null;
  commentaire: string | null;
  confirmedAt: string;
}

/**
 * Alerte de niveau maximal → dérogation requise :
 *   • contre-indication absolue (CI patient, antécédent ou interaction 'contre_indication') ;
 *   • interaction médicamenteuse majeure.
 * Jamais pour « À évaluer », « Précaution », CI relative, interactions modérées / mineures
 * (fatigue d'alerte), ni pour les alertes préexistantes (traitement de fond seul) ou le
 * bloc conditionnel grossesse (non ferme).
 */
export function requiresDerogation(a: DerogationAlertLike): boolean {
  if (a.origin === 'fond' || a.pregnancyContext) return false;
  if (a.severite === 'contre_indication') return true;
  return a.type === 'drug_drug' && a.severite === 'majeure';
}

export function alertKey(a: DerogationAlertLike): string {
  return `${a.type}|${[...a.involved].sort().join('+')}|${a.condition ?? ''}|${a.severite}`;
}

/** Alertes à confirmer, dédoublonnées. */
export function derogationAlerts<A extends DerogationAlertLike>(alerts: A[]): A[] {
  const seen = new Set<string>();
  const out: A[] = [];
  for (const a of alerts) {
    if (!requiresDerogation(a)) continue;
    const k = alertKey(a);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
  }
  return out;
}

/** Libellé court d'une alerte (rappel dans le formulaire et la modale). */
export function alertLabel(a: DerogationAlertLike): string {
  if (a.type === 'drug_drug') return `${a.involved.join(' + ')} — interaction ${a.severite === 'majeure' ? 'majeure' : 'contre-indiquée'}`;
  return `${a.involved[0]}${a.condition ? ` — ${a.condition}` : ''}`;
}

export interface SignatureLine {
  nom: string;
  posologie?: string | null;
  duree?: string | null;
  quantite?: string | null;
}

/**
 * Signature de l'ordonnance : lignes (nom, posologie, durée, quantité) + alertes confirmées.
 * Toute modification de l'ordonnance après la confirmation change la signature et annule
 * donc la confirmation.
 */
export function ordonnanceSignature(lines: SignatureLine[], alerts: DerogationAlertLike[]): string {
  const norm = (s: string | null | undefined) => (s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  const l = lines.map(x => [x.nom, x.posologie, x.duree, x.quantite].map(norm).join('~')).join('||');
  const a = alerts.map(alertKey).sort().join('||');
  return `${l}##${a}`;
}

export function isConfirmationValid(conf: DerogationConfirmation | null | undefined, signature: string): boolean {
  return !!conf && conf.signature === signature;
}

/** Contrôle de la modale : motif obligatoire, texte obligatoire si « Autre », case cochée. */
export function validateDerogationForm(f: { motif: DerogationMotifId | null; motifAutre: string; confirmed: boolean }): string | null {
  if (!f.motif) return 'Choisissez un motif.';
  if (f.motif === 'autre' && !f.motifAutre.trim()) return 'Précisez le motif.';
  if (!f.confirmed) return 'Cochez la case de confirmation.';
  return null;
}

export function motifLabel(conf: Pick<DerogationConfirmation, 'motif' | 'motifAutre'>): string {
  if (conf.motif === 'autre') return `Autre : ${(conf.motifAutre ?? '').trim()}`;
  return DEROGATION_MOTIFS.find(m => m.id === conf.motif)?.label ?? conf.motif;
}

export function buildDerogationEntries(alerts: DerogationAlertLike[], conf: DerogationConfirmation): DerogationEntry[] {
  return alerts.map(a => ({
    medicament: a.involved.join(' + '),
    alerte: alertLabel(a),
    severite: a.severite,
    motif: motifLabel(conf),
    commentaire: conf.commentaire?.trim() || null,
    horodatage: conf.confirmedAt,
  }));
}
