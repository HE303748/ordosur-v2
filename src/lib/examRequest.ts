// Sprint 5 — Demande d'examens : logique pure (ni React ni Supabase), testée par
// examRequest.test.ts. Échéance, fusion des doublons, anti-redondance, alertes
// informatives, statuts (partiel, réalisé, annulé, en retard), renouvellement.
//
// Les alertes de ce module sont INFORMATIVES (bandeau ambre, jamais bloquantes) et
// indépendantes du moteur de sécurité des médicaments, qu'elles ne modifient pas.

import { normExam, type ExamRef, type ExamPack, type ExamType, type PackLine } from './examSearch';

// ─── Brouillon de demande (formulaire) ───────────────────────────────────────

export interface ExamLineDraft {
  key: string;
  examen_code: string | null;
  libelle: string;
  type: ExamType;
  categorie: string | null;
  precision: string;
  question: string;
  a_jeun: boolean;
  delai_jeun_h: number | null;
  /** true = avec injection, false = sans injection, null = non précisé / sans objet. */
  injection: boolean | null;
}

export type EcheanceChoice =
  | 'avant_prochain_rdv' | '1_semaine' | '15_jours' | '1_mois' | '3_mois' | '6_mois' | '1_an' | 'date_precise';

export const ECHEANCE_CHOICES: { id: EcheanceChoice; label: string }[] = [
  { id: 'avant_prochain_rdv', label: 'Avant le prochain RDV' },
  { id: '1_semaine', label: '1 semaine' },
  { id: '15_jours', label: '15 jours' },
  { id: '1_mois', label: '1 mois' },
  { id: '3_mois', label: '3 mois' },
  { id: '6_mois', label: '6 mois' },
  { id: '1_an', label: '1 an' },
  { id: 'date_precise', label: 'Date précise' },
];

export interface ExamRequestDraft {
  lines: ExamLineDraft[];
  renseignements: string;
  /** Le médecin a modifié le texte : il n'est plus pré-rempli automatiquement. */
  renseignementsTouched: boolean;
  echeance: EcheanceChoice;
  echeanceDate: string; // utilisé pour « Date précise » (AAAA-MM-JJ)
  urgent: boolean;
  ald: boolean;
  regrouperImageries: boolean;
  packsUtilises: string[];
}

export function emptyExamDraft(): ExamRequestDraft {
  return {
    lines: [], renseignements: '', renseignementsTouched: false,
    echeance: '1_mois', echeanceDate: '', urgent: false, ald: false,
    regrouperImageries: false, packsUtilises: [],
  };
}

export function examDraftHasContent(d: ExamRequestDraft | null | undefined): boolean {
  return !!d && d.lines.length > 0;
}

// ─── Dates (jours civils locaux, jamais de décalage de fuseau) ───────────────

const pad = (n: number) => String(n).padStart(2, '0');
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function parseIsoDate(iso: string | null | undefined): Date | null {
  const m = (iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}
/** « 12/09/2026 » */
export function formatFr(iso: string | null | undefined): string {
  const m = (iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}
/** « 12/09 » */
export function formatFrShort(iso: string | null | undefined): string {
  const m = (iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}` : '';
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
/** Ajout de mois avec butée en fin de mois (31/01 + 1 mois → 28 ou 29/02). */
function addMonths(d: Date, n: number): Date {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), last));
}
export function daysBetween(fromIso: string, toIso: string): number {
  const a = parseIsoDate(fromIso), b = parseIsoDate(toIso);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

// ─── Échéance ────────────────────────────────────────────────────────────────

export interface EcheanceResult { date: string; libelle: EcheanceChoice }

/**
 * Date d'échéance pour un raccourci. `null` quand le choix n'est pas calculable :
 * « Avant le prochain RDV » sans RDV à venir, « Date précise » vide ou passée.
 */
export function computeEcheance(
  choice: EcheanceChoice,
  today: Date,
  opts: { rdvDate?: string | null; customDate?: string | null } = {},
): EcheanceResult | null {
  const todayIso = toIsoDate(today);
  const out = (d: Date): EcheanceResult => ({ date: toIsoDate(d), libelle: choice });
  switch (choice) {
    case 'avant_prochain_rdv': {
      const rdv = parseIsoDate(opts.rdvDate);
      if (!rdv || toIsoDate(rdv) < todayIso) return null;
      return out(rdv);
    }
    case '1_semaine': return out(addDays(today, 7));
    case '15_jours':  return out(addDays(today, 15));
    case '1_mois':    return out(addMonths(today, 1));
    case '3_mois':    return out(addMonths(today, 3));
    case '6_mois':    return out(addMonths(today, 6));
    case '1_an':      return out(addMonths(today, 12));
    case 'date_precise': {
      const d = parseIsoDate(opts.customDate);
      if (!d || toIsoDate(d) < todayIso) return null;
      return out(d);
    }
  }
}

/** Phrase imprimée sous le titre du document. */
export function echeancePhrase(e: { date: string; libelle: string; urgent?: boolean }): string {
  if (e.urgent) return 'Merci de réaliser les examens suivants EN URGENCE';
  if (e.libelle === 'avant_prochain_rdv') {
    return `Merci de réaliser les examens suivants avant votre prochain rendez-vous du ${formatFr(e.date)}`;
  }
  return `Merci de réaliser les examens suivants avant le ${formatFr(e.date)}`;
}

/** Date suggérée pour le RDV de contrôle : échéance + 7 jours. */
export function suggestedControlDate(echeanceIso: string): string {
  const d = parseIsoDate(echeanceIso);
  return d ? toIsoDate(addDays(d, 7)) : echeanceIso;
}

// ─── Lignes : ajout, fusion des doublons, packs ──────────────────────────────

let keySeq = 0;
const newKey = () => `ex-${Date.now().toString(36)}-${(keySeq++).toString(36)}`;

export function lineFromRef(e: ExamRef, precision = ''): ExamLineDraft {
  return {
    key: newKey(), examen_code: e.code, libelle: e.libelle, type: e.type, categorie: e.categorie,
    precision, question: '', a_jeun: e.a_jeun, delai_jeun_h: e.a_jeun ? e.delai_jeun_h : null, injection: null,
  };
}

export function freeLine(libelle: string, type: ExamType): ExamLineDraft {
  return {
    key: newKey(), examen_code: null, libelle: libelle.trim(), type, categorie: null,
    precision: '', question: '', a_jeun: false, delai_jeun_h: null, injection: null,
  };
}

/** Identité d'un examen : son code, sinon son libellé normalisé (saisie libre). */
export function lineIdentity(l: { examen_code: string | null; libelle: string }): string {
  return l.examen_code ? `c:${l.examen_code}` : `l:${normExam(l.libelle)}`;
}

/**
 * Ajoute des lignes en fusionnant les examens identiques : un examen déjà présent n'est
 * jamais ajouté deux fois (la ligne existante est conservée avec sa saisie).
 */
export function mergeLines(existing: ExamLineDraft[], incoming: ExamLineDraft[]): { lines: ExamLineDraft[]; merged: string[] } {
  const seen = new Set(existing.map(lineIdentity));
  const lines = [...existing];
  const merged: string[] = [];
  for (const l of incoming) {
    if (!l.libelle.trim()) continue;
    const id = lineIdentity(l);
    if (seen.has(id)) { merged.push(l.libelle); continue; }
    seen.add(id);
    lines.push(l);
  }
  return { lines, merged };
}

/** Lignes d'un pack (toutes, ou seulement les indices cochés dans l'aperçu). */
export function linesFromPack(pack: Pick<ExamPack, 'lignes'>, refs: ExamRef[], selected?: Set<number>): ExamLineDraft[] {
  const byCode = new Map(refs.map(r => [r.code, r]));
  const out: ExamLineDraft[] = [];
  pack.lignes.forEach((pl, i) => {
    if (selected && !selected.has(i)) return;
    const ref = pl.examen_code ? byCode.get(pl.examen_code) : undefined;
    if (ref) out.push(lineFromRef(ref, pl.precision ?? ''));
    else if (pl.libelle?.trim()) out.push({ ...freeLine(pl.libelle, pl.type), precision: pl.precision ?? '' });
  });
  return out;
}

/** « Enregistrer cette sélection comme pack » : lignes du pack personnel. */
export function packLinesFromDraft(lines: ExamLineDraft[]): PackLine[] {
  return lines.map(l => ({ examen_code: l.examen_code, libelle: l.libelle, type: l.type, precision: l.precision.trim() || null }));
}

/** Précision imprimée : injection (si précisée) + précision libre. */
export function fullPrecision(l: Pick<ExamLineDraft, 'precision' | 'injection'>): string {
  const inj = l.injection === true ? 'avec injection' : l.injection === false ? 'sans injection' : '';
  return [inj, (l.precision ?? '').trim()].filter(Boolean).join(' — ');
}

// ─── À jeun ──────────────────────────────────────────────────────────────────

export interface FastingInfo { required: boolean; hours: number | null }

/** Jeûne exigé par au moins un examen ; durée = la plus longue demandée. */
export function fastingInfo(lines: Array<{ a_jeun: boolean; delai_jeun_h?: number | null }>): FastingInfo {
  const fasting = lines.filter(l => l.a_jeun);
  if (fasting.length === 0) return { required: false, hours: null };
  const hours = fasting.map(l => l.delai_jeun_h ?? 0).reduce((a, b) => Math.max(a, b), 0);
  return { required: true, hours: hours > 0 ? hours : null };
}

// ─── Demandes enregistrées ───────────────────────────────────────────────────

export type LigneStatut = 'en_attente' | 'realise' | 'annule';
export type DemandeStatut = 'en_attente' | 'partiel' | 'realise' | 'annule';

export interface DemandeLigne {
  id: string;
  demande_id: string;
  examen_code: string | null;
  libelle: string;
  type: ExamType;
  categorie: string | null;
  precision: string | null;
  question_clinique: string | null;
  a_jeun: boolean;
  delai_jeun_h: number | null;
  injection: boolean | null;
  statut: LigneStatut;
  date_realisation: string | null;
  resultat_id: string | null;
  ordre: number;
}

export interface DemandeExamens {
  id: string;
  numero: string;
  patient_id: string;
  org_id: string;
  doctor_id: string;
  ordonnance_id: string | null;
  date_demande: string;
  echeance_date: string;
  echeance_libelle: EcheanceChoice;
  renseignements_cliniques: string | null;
  urgent: boolean;
  ald: boolean;
  regrouper_imageries: boolean;
  packs_utilises: string[];
  statut: DemandeStatut;
  motif_annulation: string | null;
  notes: string | null;
  created_at: string;
  lignes: DemandeLigne[];
}

/** Même règle que le trigger demande_examen_lignes_sync_statut. */
export function deriveDemandeStatut(lignes: Array<{ statut: LigneStatut }>): DemandeStatut {
  const attente = lignes.filter(l => l.statut === 'en_attente').length;
  const realise = lignes.filter(l => l.statut === 'realise').length;
  if (lignes.length === 0) return 'en_attente';
  if (attente === 0 && realise === 0) return 'annule';
  if (realise === 0) return 'en_attente';
  return attente > 0 ? 'partiel' : 'realise';
}

export const isOpen = (d: Pick<DemandeExamens, 'statut'>) => d.statut === 'en_attente' || d.statut === 'partiel';

/** Nombre de jours de retard (0 si la demande est close ou si l'échéance n'est pas dépassée). */
export function joursRetard(d: Pick<DemandeExamens, 'statut' | 'echeance_date'>, today: Date): number {
  if (!isOpen(d)) return 0;
  return Math.max(0, daysBetween(d.echeance_date, toIsoDate(today)));
}
export const isEnRetard = (d: Pick<DemandeExamens, 'statut' | 'echeance_date'>, today: Date) => joursRetard(d, today) > 0;

/** Demandes ouvertes triées par échéance, puis demandes closes (les plus récentes d'abord). */
export function sortDemandes<T extends Pick<DemandeExamens, 'statut' | 'echeance_date' | 'created_at'>>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const oa = isOpen(a), ob = isOpen(b);
    if (oa !== ob) return oa ? -1 : 1;
    if (oa) return a.echeance_date.localeCompare(b.echeance_date);
    return b.created_at.localeCompare(a.created_at);
  });
}

export type ProchainBilan =
  | { kind: 'retard'; date: string; label: string }
  | { kind: 'prevu'; date: string; label: string };

/**
 * « Prochain bilan prévu le JJ/MM » : échéance la plus proche parmi les demandes ouvertes.
 * Si une demande est en retard : « Bilan en retard depuis le JJ/MM » (la plus ancienne).
 */
export function prochainBilan(demandes: Array<Pick<DemandeExamens, 'statut' | 'echeance_date'>>, today: Date): ProchainBilan | null {
  const open = demandes.filter(isOpen).map(d => d.echeance_date).sort();
  if (open.length === 0) return null;
  const todayIso = toIsoDate(today);
  const late = open.filter(d => d < todayIso);
  if (late.length > 0) return { kind: 'retard', date: late[0], label: `Bilan en retard depuis le ${formatFrShort(late[0])}` };
  return { kind: 'prevu', date: open[0], label: `Prochain bilan prévu le ${formatFrShort(open[0])}` };
}

// ─── Anti-redondance ─────────────────────────────────────────────────────────

export interface Redondance { key: string; libelle: string; date_demande: string; numero: string }

/** Examens du brouillon déjà demandés et encore en attente pour ce patient. */
export function findRedondances(
  lines: ExamLineDraft[],
  demandes: Array<Pick<DemandeExamens, 'statut' | 'date_demande' | 'numero' | 'lignes'>>,
): Redondance[] {
  const pending = new Map<string, { date: string; numero: string }>();
  for (const d of demandes) {
    if (!isOpen(d)) continue;
    for (const l of d.lignes) {
      if (l.statut !== 'en_attente') continue;
      const id = lineIdentity(l);
      const prev = pending.get(id);
      if (!prev || d.date_demande > prev.date) pending.set(id, { date: d.date_demande, numero: d.numero });
    }
  }
  const out: Redondance[] = [];
  for (const l of lines) {
    const hit = pending.get(lineIdentity(l));
    if (hit) out.push({ key: l.key, libelle: l.libelle, date_demande: hit.date, numero: hit.numero });
  }
  return out;
}

// ─── Renouvellement ──────────────────────────────────────────────────────────

/** Dernière demande du patient (hors demandes entièrement annulées). */
export function lastRenewable<T extends Pick<DemandeExamens, 'statut' | 'created_at'>>(demandes: T[]): T | null {
  const list = demandes.filter(d => d.statut !== 'annule').sort((a, b) => b.created_at.localeCompare(a.created_at));
  return list[0] ?? null;
}

/**
 * « Renouveler » : recharge les examens d'une demande (hors lignes annulées), modifiables.
 * Le jeûne suit le référentiel actuel ; les renseignements cliniques sont repris.
 */
export function renewDraftFromDemande(d: DemandeExamens, refs: ExamRef[]): ExamRequestDraft {
  const byCode = new Map(refs.map(r => [r.code, r]));
  const lines: ExamLineDraft[] = d.lignes
    .filter(l => l.statut !== 'annule')
    .sort((a, b) => a.ordre - b.ordre)
    .map(l => {
      const ref = l.examen_code ? byCode.get(l.examen_code) : undefined;
      const base = ref ? lineFromRef(ref) : freeLine(l.libelle, l.type);
      return {
        ...base,
        precision: l.precision ?? '',
        question: l.question_clinique ?? '',
        injection: l.injection,
        a_jeun: ref ? ref.a_jeun : l.a_jeun,
        delai_jeun_h: ref ? (ref.a_jeun ? ref.delai_jeun_h : null) : l.delai_jeun_h,
      };
    });
  return {
    ...emptyExamDraft(),
    lines: mergeLines([], lines).lines,
    renseignements: d.renseignements_cliniques ?? '',
    renseignementsTouched: !!d.renseignements_cliniques,
    ald: d.ald,
    regrouperImageries: d.regrouper_imageries,
  };
}

// ─── Renseignements cliniques pré-remplis ────────────────────────────────────

export interface RenseignementsInput {
  pathologies?: string[] | null;
  pathologies_depuis?: Record<string, number> | null;
  antecedents?: Array<{ libelle: string; annee?: number | null }>;
  traitements?: string[];
}

/** Texte concis : pathologies (depuis AAAA), antécédents, traitement de fond. */
export function buildRenseignements(p: RenseignementsInput): string {
  const parts: string[] = [];
  const pathos = (p.pathologies ?? []).filter(x => x && x.trim());
  if (pathos.length > 0) {
    parts.push(pathos.map(x => {
      const y = p.pathologies_depuis?.[x];
      return y ? `${x} (depuis ${y})` : x;
    }).join(', ') + '.');
  }
  const atcd = (p.antecedents ?? []).filter(a => a.libelle?.trim()).slice(0, 6);
  if (atcd.length > 0) {
    parts.push(`Antécédents : ${atcd.map(a => (a.annee ? `${a.libelle.trim()} (${a.annee})` : a.libelle.trim())).join(', ')}.`);
  }
  const tt = [...new Set((p.traitements ?? []).map(t => t.trim()).filter(Boolean))].slice(0, 8);
  if (tt.length > 0) parts.push(`Traitement en cours : ${tt.join(', ')}.`);
  return parts.join(' ');
}

// ─── Alertes informatives ────────────────────────────────────────────────────

export type ExamAlertCode = 'iode_allergie' | 'iode_metformine' | 'irradiant_grossesse_inconnue' | 'irradiant_enceinte' | 'consentement';
export interface ExamAlert { code: ExamAlertCode; message: string; examens: string[] }

export interface ExamAlertContext {
  allergies?: string[] | null;
  /** Noms et DCI des médicaments de l'ordonnance en cours et du traitement de fond. */
  medicaments?: string[];
  sexe?: string | null;
  ageAns?: number | null;
  /** Statut grossesse EFFECTIF : 'inconnu' couvre aussi « expiré » et « à confirmer ». */
  grossesse?: 'enceinte' | 'non_enceinte' | 'inconnu' | null;
}

const METFORMINE_RE = /\b(metformin\w*|glucophage|stagid|glucovance|janumet|eucreas|galvumet|velmetia|komboglyze|jentadueto|synjardy|xigduo|competact|diaformin\w*|metforal|glycomet|formit)\b/;
const IODE_ALLERGIE_RE = /produits? de contraste|contraste iode|\biode\b|\biodes?\b|iobitridol|iopromide|iohexol|iomeprol|ioversol|iodixanol/;
const IODE_EXAM_LIBRE_RE = /\b(tdm|scanner|scan|uroscanner|angioscanner|coroscanner|urographie|arteriographie|coronarographie|phlebographie)\b/;

/** L'examen sera réalisé avec injection d'un produit de contraste iodé. */
export function isIodineInjection(l: ExamLineDraft, byCode: Map<string, ExamRef>): boolean {
  const ref = l.examen_code ? byCode.get(l.examen_code) : undefined;
  const precNorm = normExam(l.precision);
  const saysWith = /\b(avec|apres) injection\b|\binjecte/.test(precNorm) && !/sans injection/.test(precNorm);
  if (ref) {
    if (ref.produit_contraste !== 'iode') return false;
    return l.injection === true || (l.injection === null && saysWith);
  }
  // Saisie libre : scanner (ou examen iodé) explicitement « avec injection ».
  const text = normExam(`${l.libelle} ${l.precision}`);
  const withInj = l.injection === true || (/\b(avec|apres) injection\b|\binjecte/.test(text) && !/sans injection/.test(text));
  return withInj && IODE_EXAM_LIBRE_RE.test(text);
}

export function isIrradiant(l: ExamLineDraft, byCode: Map<string, ExamRef>): boolean {
  const ref = l.examen_code ? byCode.get(l.examen_code) : undefined;
  if (ref) return ref.irradiant;
  return /\b(tdm|scanner|radio|radiographie|rx|mammographie|scintigraphie|urographie|arteriographie|coronarographie|osteodensitometrie|tep)\b/.test(normExam(l.libelle));
}

/**
 * Alertes informatives de la demande (jamais bloquantes) :
 *   • injection iodée + allergie aux produits de contraste iodés ;
 *   • injection iodée + metformine (ordonnance en cours ou traitement de fond) ;
 *   • examen irradiant + patiente de 12 à 55 ans : statut grossesse inconnu / enceinte ;
 *   • examen exigeant le consentement du patient (VIH).
 */
export function examAlerts(lines: ExamLineDraft[], refs: ExamRef[], ctx: ExamAlertContext): ExamAlert[] {
  const byCode = new Map(refs.map(r => [r.code, r]));
  const out: ExamAlert[] = [];

  const iodes = lines.filter(l => isIodineInjection(l, byCode));
  if (iodes.length > 0) {
    const allergie = (ctx.allergies ?? []).some(a => IODE_ALLERGIE_RE.test(normExam(a)));
    if (allergie) {
      out.push({
        code: 'iode_allergie',
        message: 'Allergie aux produits de contraste iodés déclarée — prémédication ou alternative à discuter',
        examens: iodes.map(l => l.libelle),
      });
    }
    const metformine = (ctx.medicaments ?? []).some(m => METFORMINE_RE.test(normExam(m)));
    if (metformine) {
      out.push({
        code: 'iode_metformine',
        message: 'Patient sous metformine — conduite à tenir selon la fonction rénale',
        examens: iodes.map(l => l.libelle),
      });
    }
  }

  const irradiants = lines.filter(l => isIrradiant(l, byCode));
  const sexe = (ctx.sexe ?? '').trim().toUpperCase();
  const age = ctx.ageAns;
  if (irradiants.length > 0 && sexe === 'F' && age !== null && age !== undefined && age >= 12 && age <= 55) {
    if (ctx.grossesse === 'enceinte') {
      out.push({
        code: 'irradiant_enceinte',
        message: 'Patiente enceinte — examen irradiant : bénéfice/risque à évaluer',
        examens: irradiants.map(l => l.libelle),
      });
    } else if (ctx.grossesse !== 'non_enceinte') {
      out.push({
        code: 'irradiant_grossesse_inconnue',
        message: 'Examen irradiant — statut grossesse à vérifier',
        examens: irradiants.map(l => l.libelle),
      });
    }
  }

  const consent = lines.filter(l => l.examen_code && byCode.get(l.examen_code)?.consentement_requis);
  if (consent.length > 0) {
    out.push({ code: 'consentement', message: 'Consentement du patient requis', examens: consent.map(l => l.libelle) });
  }
  return out;
}

// ─── Validation et enregistrement ────────────────────────────────────────────

export interface DraftValidation {
  ok: boolean;
  errors: string[];
  /** Rappels discrets, jamais bloquants. */
  warnings: string[];
  echeance: EcheanceResult | null;
}

export function validateExamDraft(d: ExamRequestDraft, today: Date, rdvDate?: string | null): DraftValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (d.lines.length === 0) errors.push('Ajoutez au moins un examen.');
  if (d.lines.some(l => !l.libelle.trim())) errors.push('Un examen n’a pas de libellé.');
  const echeance = computeEcheance(d.echeance, today, { rdvDate, customDate: d.echeanceDate });
  if (!echeance) {
    errors.push(d.echeance === 'avant_prochain_rdv'
      ? 'Aucun rendez-vous à venir : choisissez une autre échéance.'
      : 'Choisissez une échéance (date du jour ou ultérieure).');
  }
  if (!d.renseignements.trim()) {
    warnings.push('Ajouter des renseignements cliniques aide le laboratoire et le radiologue');
  }
  return { ok: errors.length === 0, errors, warnings, echeance };
}

/** « DEM-AAAAMMJJ-XXXX » */
export function newDemandeNumero(today: Date = new Date(), rand: () => number = Math.random): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += alphabet[Math.floor(rand() * alphabet.length) % alphabet.length];
  return `DEM-${toIsoDate(today).replace(/-/g, '')}-${s}`;
}

export interface DemandePayload {
  demande: Record<string, unknown>;
  lignes: Array<Record<string, unknown>>;
}

/** Charge utile de la RPC creer_demande_examens (lignes ordonnées : biologie, imagerie, explorations). */
export function buildDemandePayload(
  d: ExamRequestDraft,
  ids: { numero: string; patient_id: string; org_id: string; doctor_id: string; ordonnance_id?: string | null },
  echeance: EcheanceResult,
  today: Date,
): DemandePayload {
  const rank: Record<ExamType, number> = { biologie: 0, imagerie: 1, exploration: 2 };
  const ordered = d.lines.map((l, i) => ({ l, i })).sort((a, b) => rank[a.l.type] - rank[b.l.type] || a.i - b.i).map(x => x.l);
  return {
    demande: {
      numero: ids.numero,
      patient_id: ids.patient_id,
      org_id: ids.org_id,
      doctor_id: ids.doctor_id,
      ordonnance_id: ids.ordonnance_id ?? null,
      date_demande: toIsoDate(today),
      echeance_date: echeance.date,
      echeance_libelle: echeance.libelle,
      renseignements_cliniques: d.renseignements.trim() || null,
      urgent: d.urgent,
      ald: d.ald,
      regrouper_imageries: d.regrouperImageries,
      packs_utilises: [...new Set(d.packsUtilises)],
    },
    lignes: ordered.map(l => ({
      examen_code: l.examen_code,
      libelle: l.libelle.trim(),
      type: l.type,
      categorie: l.categorie,
      precision: l.precision.trim() || null,
      question_clinique: l.type === 'biologie' ? null : (l.question.trim() || null),
      a_jeun: l.a_jeun,
      delai_jeun_h: l.a_jeun ? l.delai_jeun_h : null,
      injection: l.injection,
    })),
  };
}
