// Sprint 4f — Garde-fous issus du test en production. Module PUR (ni React ni Supabase),
// testé par safetyGuards.test.ts. Principe : zéro fausse réassurance.
//
//   1. traitement de fond exclu de l'analyse : toujours dit, jamais de vert sans réserve ;
//   2. identité patient : une seule source de vérité, refus si l'ordonnance ne correspond
//      pas au patient affiché ;
//   5. journalisation : toute alerte affichée est journalisée, y compris quand le canal
//      (antécédent, allergie, doublon) a été fusionné dans une carte existante.
//
// Ce module ne détecte AUCUNE alerte : il ne lit que le résultat du moteur.

// ─── 1. Traitement de fond exclu ─────────────────────────────────────────────

export interface FondLike { id: string }

/** Traitements de fond décochés (« exclus de l'analyse »), dans l'ordre de la liste. */
export function excludedFond<T extends FondLike>(traitements: T[], excluded: ReadonlySet<string>): T[] {
  return traitements.filter(t => excluded.has(t.id));
}

/** « 2 traitements de fond exclus de l'analyse : INALER, KARDEGIC » — '' si aucun. */
export function fondExclusionLabel(noms: string[]): string {
  const n = noms.length;
  if (n === 0) return '';
  return `${n} traitement${n > 1 ? 's' : ''} de fond exclu${n > 1 ? 's' : ''} de l’analyse : ${noms.join(', ')}`;
}

export type VerdictSeverity = 'safe' | 'conditional' | 'attention' | 'dangerous';

/** Un verdict n'est jamais « Sécuritaire » sans réserve tant qu'un traitement de fond est exclu. */
export function verdictWithFondExclusion(severity: VerdictSeverity, nbExclus: number): VerdictSeverity {
  return severity === 'safe' && nbExclus > 0 ? 'conditional' : severity;
}

// ─── 2. Identité patient ─────────────────────────────────────────────────────

/** Texte du champ de recherche patient : TOUJOURS celui du patient réellement sélectionné. */
export function patientFieldLabel(p: { prenom: string; nom: string } | null | undefined): string {
  return p ? `${p.prenom} ${p.nom}`.trim() : '';
}

/**
 * Garde-fou à l'enregistrement : l'ordonnance préparée (patient au moment de l'aperçu) doit
 * porter sur le patient affiché. Renvoie le message de refus, ou null si tout concorde.
 */
export function patientMismatchMessage(
  ordonnancePatientId: string | null | undefined,
  displayedPatientId: string | null | undefined,
): string | null {
  if (!displayedPatientId) return 'Aucun patient sélectionné — sélectionnez le patient puis rouvrez l’ordonnance.';
  if (!ordonnancePatientId) return 'Patient de l’ordonnance inconnu — rouvrez l’aperçu de l’ordonnance.';
  if (ordonnancePatientId !== displayedPatientId) {
    return 'Cette ordonnance a été préparée pour un autre patient que celui affiché. Rien n’a été enregistré : rouvrez l’ordonnance depuis le bon patient.';
  }
  return null;
}

// ─── 5. Journalisation (interaction_logs) ────────────────────────────────────

export type MergedChannel = 'antecedent' | 'allergie' | 'doublon';
export type LogSource = 'nouveau' | 'avec_traitement_fond' | 'antecedent' | 'allergie' | 'doublon' | 'grossesse';

export interface LoggableAlert {
  type: 'drug_drug' | 'contraindication' | 'info';
  severite: string;
  involved: string[];
  origin?: 'nouveau' | 'mixte' | 'fond';
  channel?: MergedChannel;
  /** Canaux fusionnés dans cette carte (ligne « Également : … »). */
  alsoChannels?: MergedChannel[];
  pregnancyContext?: boolean;
  pregnancyFirm?: boolean;
  preventionGrossesse?: boolean;
}

/**
 * Fusion d'un canal dans des cartes existantes : ajoute les lignes « Également : … » ET
 * mémorise le canal, pour que l'alerte fusionnée reste journalisée avec sa propre source.
 * Modifie le tableau en place (les cartes concernées sont remplacées par une copie).
 */
export function applyMergedLines<A extends { also?: string[]; alsoChannels?: MergedChannel[] }>(
  alerts: A[], alsoByIndex: Map<number, string[]>, channel: MergedChannel,
): void {
  for (const [idx, lines] of alsoByIndex) {
    const a = alerts[idx];
    if (!a) continue;
    alerts[idx] = {
      ...a,
      also: [...(a.also ?? []), ...lines],
      alsoChannels: [...new Set([...(a.alsoChannels ?? []), channel])],
    };
  }
}

export interface InteractionLogRow {
  doctor_id: string;
  patient_id: string;
  medicament_a: string;
  medicament_b: string | null;
  risk_level: 'safe' | 'attention' | 'dangerous';
  source: LogSource;
}

const RISK: Record<string, InteractionLogRow['risk_level']> = {
  contre_indication: 'dangerous', majeure: 'dangerous',
  a_evaluer: 'attention', precaution: 'attention', moderee: 'attention', mineure: 'attention',
};

/** Alerte journalisable : alerte clinique de la prescription (hors préexistantes, hors informations). */
export function isLoggable(a: LoggableAlert): boolean {
  return a.severite !== 'non_classee' && a.severite !== 'info' && a.origin !== 'fond';
}

/**
 * Sources à journaliser pour une alerte : sa source propre, puis une ligne par canal fusionné
 * dans la carte. Une alerte d'allergie absorbée par une CI de la base est donc bien tracée
 * `source = 'allergie'`.
 */
export function alertLogSources(a: LoggableAlert): LogSource[] {
  const primary: LogSource = a.channel
    ? a.channel
    : (a.pregnancyContext || a.pregnancyFirm || a.preventionGrossesse) ? 'grossesse'
      : a.origin === 'mixte' ? 'avec_traitement_fond' : 'nouveau';
  const out: LogSource[] = [primary];
  for (const c of a.alsoChannels ?? []) if (!out.includes(c)) out.push(c);
  return out;
}

/** Lignes interaction_logs d'une ordonnance enregistrée (une par alerte et par source). */
export function buildInteractionLogRows(
  alerts: LoggableAlert[],
  ids: { doctorId: string; patientId: string },
): InteractionLogRow[] {
  const rows: InteractionLogRow[] = [];
  for (const a of alerts) {
    if (!isLoggable(a)) continue;
    for (const source of alertLogSources(a)) {
      // Antécédent / allergie : alerte « médicament × patient », pas de second médicament.
      const single = source === 'antecedent' || source === 'allergie';
      rows.push({
        doctor_id: ids.doctorId,
        patient_id: ids.patientId,
        medicament_a: a.involved[0],
        // Table historique : medicament_b répété pour une CI « patient » (compatibilité).
        medicament_b: single ? null : (a.involved[1] ?? a.involved[0]),
        risk_level: RISK[a.severite] ?? 'safe',
        source,
      });
    }
  }
  return rows;
}

/** Nombre de lignes par source (contrôle et tests). */
export function countBySource(rows: Array<{ source: string }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.source] = (out[r.source] ?? 0) + 1;
  return out;
}
