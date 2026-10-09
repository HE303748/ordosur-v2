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
  /** Canal d'origine (antécédent, allergie, doublon thérapeutique). */
  channel?: string;
  /** Sprint 4f — tératogène majeur : exigence de contraception (programme de prévention de la grossesse). */
  preventionGrossesse?: boolean;
}

/** Sprint 4f — motif propre au programme de prévention de la grossesse (tératogènes majeurs). */
export const MOTIF_PREVENTION_GROSSESSE = {
  id: 'prevention_grossesse', label: 'Programme de prévention de la grossesse respecté (contraception efficace)',
} as const;

export const DEROGATION_MOTIFS = [
  { id: 'benefice_risque', label: 'Bénéfice/risque évalué favorable' },
  { id: 'deja_tolere', label: 'Traitement déjà toléré par ce patient' },
  { id: 'avis_specialise', label: 'Sur avis spécialisé' },
  { id: 'autre', label: 'Autre' },
] as const;
export type DerogationMotifId = typeof DEROGATION_MOTIFS[number]['id'] | typeof MOTIF_PREVENTION_GROSSESSE['id'];

/** Motifs proposés pour ces alertes : le motif « prévention de la grossesse » n'apparaît que s'il s'applique. */
export function derogationMotifsFor(alerts: DerogationAlertLike[]): ReadonlyArray<{ id: DerogationMotifId; label: string }> {
  return alerts.some(a => derogationKind(a) === 'prevention_grossesse')
    ? [MOTIF_PREVENTION_GROSSESSE, ...DEROGATION_MOTIFS]
    : DEROGATION_MOTIFS;
}

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
  return derogationKind(a) !== null;
}

// ─── Sprint 4f — Source unique : dérogation ET niveau du verdict ─────────────
// derogationKind décide si une alerte exige la dérogation ; alertVerdictLevel en découle.
// Une alerte qui exige la dérogation impose TOUJOURS le niveau maximal du verdict
// (« Prescription à risque ») : les deux ne peuvent plus diverger.

export type DerogationKind = 'contre_indication' | 'interaction_majeure' | 'doublon' | 'prevention_grossesse';

/** Nature de l'alerte exigeant la dérogation, ou null si elle n'en exige pas. */
export function derogationKind(a: DerogationAlertLike): DerogationKind | null {
  if (a.origin === 'fond' || a.pregnancyContext) return null;
  if (a.preventionGrossesse) return 'prevention_grossesse';
  const max = a.severite === 'contre_indication' || (a.type === 'drug_drug' && a.severite === 'majeure');
  if (!max) return null;
  if (a.type === 'drug_drug' && a.channel === 'doublon') return 'doublon';
  if (a.severite === 'contre_indication') return 'contre_indication';
  return 'interaction_majeure';
}

export type VerdictLevel = 'dangerous' | 'attention' | 'none';

/**
 * Niveau qu'une alerte FERME impose au verdict :
 *   dérogation requise → 'dangerous' (« Prescription à risque ») ;
 *   CI relative, « À évaluer », « Précaution », interaction modérée → 'attention' ;
 *   mineure, non classée, information → aucun effet.
 */
export function alertVerdictLevel(a: DerogationAlertLike): VerdictLevel {
  if (derogationKind(a) !== null) return 'dangerous';
  if (['contre_indication', 'majeure', 'moderee', 'a_evaluer', 'precaution'].includes(a.severite)) return 'attention';
  return 'none';
}

const KIND_LABEL: Record<DerogationKind, [string, string]> = {
  contre_indication: ['contre-indication', 'contre-indications'],
  interaction_majeure: ['interaction majeure', 'interactions majeures'],
  doublon: ['doublon thérapeutique', 'doublons thérapeutiques'],
  prevention_grossesse: ['exigence de contraception (tératogène majeur)', 'exigences de contraception (tératogènes majeurs)'],
};
const KIND_ORDER: DerogationKind[] = ['contre_indication', 'prevention_grossesse', 'interaction_majeure', 'doublon'];

/** « 1 contre-indication et 1 doublon thérapeutique » — vide si aucune alerte n'exige la dérogation. */
export function derogationSummary(alerts: DerogationAlertLike[]): string {
  const counts = new Map<DerogationKind, number>();
  for (const a of derogationAlerts(alerts)) {
    const k = derogationKind(a)!;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const parts = KIND_ORDER.filter(k => counts.has(k)).map(k => {
    const n = counts.get(k)!;
    return `${n} ${KIND_LABEL[k][n > 1 ? 1 : 0]}`;
  });
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`;
}

/** Titre de la modale, adapté au type d'alerte (plusieurs types → « Prescription à risque »). */
export function derogationTitle(alerts: DerogationAlertLike[]): string {
  const kinds = new Set(derogationAlerts(alerts).map(a => derogationKind(a)!));
  if (kinds.size !== 1) return 'Prescription à risque';
  const k = [...kinds][0];
  return k === 'contre_indication' ? 'Prescription contre-indiquée'
    : k === 'interaction_majeure' ? 'Interaction majeure'
      : k === 'doublon' ? 'Doublon thérapeutique'
        : 'Tératogène majeur — contraception exigée';
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
  if (a.type === 'drug_drug' && a.channel === 'doublon') return `${a.involved.join(' + ')} — doublon thérapeutique`;
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
  if (conf.motif === MOTIF_PREVENTION_GROSSESSE.id) return MOTIF_PREVENTION_GROSSESSE.label;
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
