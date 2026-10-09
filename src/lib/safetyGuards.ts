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

// ─── Sprint 4g — Titre du verdict cohérent avec ce qui est affiché ───────────
// « Aucune interaction détectée » n'est permis que si la liste affichée est réellement vide.

const KNOWN_SEVERITIES = ['contre_indication', 'a_evaluer', 'majeure', 'precaution', 'moderee', 'mineure', 'info'];

/** Interaction connue dont la sévérité n'est pas documentée (« non classée ») ou est inconnue. */
export function isUndocumentedSeverity(severite: string | null | undefined): boolean {
  return !severite || severite === 'non_classee' || !KNOWN_SEVERITIES.includes(severite);
}

/** Ce que le médecin a sous les yeux, sous le bandeau du verdict. */
export interface DisplayedState {
  /** Cartes d'alerte affichées (toutes sévérités, hors information). */
  cartes: number;
  /** Dont : interactions de sévérité non documentée ou inconnue. */
  nonDocumentees: number;
  /** Dont : interactions mineures. */
  mineures: number;
  /** Lignes d'information (médicament sans DCI rattachée). */
  infos: number;
}

export function undocumentedLabel(n: number): string {
  return `${n} interaction${n > 1 ? 's' : ''} de sévérité non documentée — à évaluer`;
}

/**
 * Un verdict « safe » alors que des cartes sont affichées devient « Sécuritaire sous réserve »,
 * avec la raison. Un verdict plus sévère n'est jamais atténué. `note` : texte à afficher
 * (remplace la description d'un verdict qui était vert ; s'y ajoute sinon), ou null.
 */
export function reconcileVerdictWithDisplay(
  severity: VerdictSeverity, shown: DisplayedState,
): { severity: VerdictSeverity; lowered: boolean; note: string | null } {
  const reason =
    shown.nonDocumentees > 0 ? undocumentedLabel(shown.nonDocumentees)
      : shown.mineures > 0 ? `${shown.mineures} interaction${shown.mineures > 1 ? 's' : ''} mineure${shown.mineures > 1 ? 's' : ''} signalée${shown.mineures > 1 ? 's' : ''}`
        : shown.cartes > 0 ? `${shown.cartes} alerte${shown.cartes > 1 ? 's' : ''} affichée${shown.cartes > 1 ? 's' : ''} — à évaluer`
          : shown.infos > 0 ? `${shown.infos} médicament${shown.infos > 1 ? 's' : ''} sans DCI rattachée — vérification limitée`
            : null;
  if (severity === 'safe' && reason) return { severity: 'conditional', lowered: true, note: reason };
  // Verdict déjà réservé ou sévère : seule la sévérité non documentée est rappelée en plus.
  return { severity, lowered: false, note: shown.nonDocumentees > 0 ? undocumentedLabel(shown.nonDocumentees) : null };
}

export const VERDICT_TITLES: Record<VerdictSeverity, string> = {
  safe: 'Aucune interaction détectée',
  conditional: 'Sécuritaire sous réserve',
  attention: 'Attention',
  dangerous: 'Prescription à risque',
};

/** Titre du bandeau (un titre particulier, ex. « Vérification impossible », prime). */
export function verdictTitle(severity: VerdictSeverity, custom?: string | null): string {
  return (custom ?? VERDICT_TITLES[severity]).replace(/^[⚠✓]\s+/, '');
}

/**
 * Ligne verte « Aucune interaction ni contre-indication détectée » : seulement si le verdict
 * est vert ET qu'il n'y a ni carte, ni bandeau d'exclusion, ni réserve (alerte préexistante,
 * médicament non vérifiable, information).
 */
export function greenLineAllowed(s: { severity: VerdictSeverity; cartes: number; fondExclus: number; reserves: number }): boolean {
  return s.severity === 'safe' && s.cartes === 0 && s.fondExclus === 0 && s.reserves === 0;
}
