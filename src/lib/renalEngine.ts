// Sprint 6B — Canal « fonction rénale » du moteur de sécurité.
//
// Module PUR (ni React ni Supabase) : testé par renalEngine.test.ts.
// Il ne fait qu'AJOUTER des alertes, en appel additionnel après le matching existant
// (contre-indications par pathologies / allergies, conditionTerms) qui reste inchangé.
//
//   • DFG estimé : CKD-EPI 2021 (sans coefficient ethnique), adulte uniquement.
//   • Clairance de Cockcroft-Gault si le poids est connu (anticoagulants oraux directs).
//   • La créatinine est convertie en mg/dL UNIQUEMENT via le référentiel d'examens
//     (examens_reference.unites) : une unité hors référentiel → fonction rénale inconnue.
//   • Les seuils viennent des DONNÉES : libellé des contre-indications déjà en base
//     (« DFG < 30 », « stade 4 »…) et table regles_renales. Aucun seuil clinique par
//     médicament dans ce fichier.
//   • Les comparaisons portent sur la valeur ARRONDIE affichée au médecin : ce qu'il lit
//     est exactement ce qui a décidé.

import type { ExamRef } from './examSearch';
import { formatFr, formatFrShort, parseIsoDate, toIsoDate } from './examRequest';
import { convertir, examMesure, formatNombre } from './resultatsLogic';
import { existingRank, normEngine, type EngineMed, type ExistingAlertLike } from './antecedentEngine';

// ─── Formules ────────────────────────────────────────────────────────────────

export type Sexe = 'M' | 'F';

/**
 * DFG estimé CKD-EPI 2021 (créatinine, sans coefficient ethnique), en mL/min/1,73 m².
 * 142 × min(Scr/κ, 1)^α × max(Scr/κ, 1)^−1,200 × 0,9938^âge × 1,012 (femme)
 * κ = 0,7 (F) / 0,9 (H) ; α = −0,241 (F) / −0,302 (H) ; Scr en mg/dL.
 */
export function ckdEpi2021(scrMgDl: number, ageAns: number, sexe: Sexe): number {
  const k = sexe === 'F' ? 0.7 : 0.9;
  const alpha = sexe === 'F' ? -0.241 : -0.302;
  const r = scrMgDl / k;
  return 142 * Math.min(r, 1) ** alpha * Math.max(r, 1) ** -1.2 * 0.9938 ** ageAns * (sexe === 'F' ? 1.012 : 1);
}

/** Clairance de Cockcroft-Gault (mL/min) : (140 − âge) × poids / (72 × Scr mg/dL), × 0,85 chez la femme. */
export function cockcroftGault(scrMgDl: number, ageAns: number, poidsKg: number, sexe: Sexe): number {
  return ((140 - ageAns) * poidsKg) / (72 * scrMgDl) * (sexe === 'F' ? 0.85 : 1);
}

export type RenalStade = '>=60' | '45-59' | '30-44' | '15-29' | '<15';

export function renalStade(dfg: number): RenalStade {
  if (dfg >= 60) return '>=60';
  if (dfg >= 45) return '45-59';
  if (dfg >= 30) return '30-44';
  if (dfg >= 15) return '15-29';
  return '<15';
}

export const STADE_LABEL: Record<RenalStade, string> = {
  '>=60': '≥ 60', '45-59': '45-59', '30-44': '30-44', '15-29': '15-29', '<15': '< 15',
};

// ─── Dates ───────────────────────────────────────────────────────────────────

function addMonths(d: Date, n: number): Date {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), last));
}
const dayOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function ageAns(dateNaissance: string | null | undefined, today: Date): number | null {
  const d = parseIsoDate(dateNaissance);
  if (!d || dayOf(d) > dayOf(today)) return null;
  let a = today.getFullYear() - d.getFullYear();
  if (today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())) a -= 1;
  return a;
}

export type Fraicheur = 'fiable' | 'ancienne' | 'inconnue';

/**
 * Fraîcheur de la créatinine : moins de 3 mois → fiable ; de 3 mois à 12 mois inclus →
 * utilisée avec la mention « ancienne » ; plus de 12 mois → fonction rénale inconnue.
 */
export function fraicheurCreatinine(datePrelevement: string, today: Date): Fraicheur {
  const d = parseIsoDate(datePrelevement);
  if (!d) return 'inconnue';
  const t = dayOf(today);
  if (t < dayOf(addMonths(d, 3))) return 'fiable';
  return t <= dayOf(addMonths(d, 12)) ? 'ancienne' : 'inconnue';
}

/** Poids mesuré il y a plus de 12 mois : utilisé, avec la mention « poids ancien ». */
export function poidsAncien(poidsDate: string | null | undefined, today: Date): boolean {
  const d = parseIsoDate(poidsDate);
  return !!d && dayOf(today) > dayOf(addMonths(d, 12));
}

export const POIDS_MIN = 2;
export const POIDS_MAX = 400;

/** « 72 », « 72,5 » → kg (2 à 400, une décimale), sinon null. */
export function parsePoids(raw: string | null | undefined): number | null {
  const s = (raw ?? '').trim().replace(',', '.').replace(/\s*kg$/i, '');
  if (!/^\d{1,3}(\.\d)?$/.test(s)) return null;
  const n = Number(s);
  return n >= POIDS_MIN && n <= POIDS_MAX ? n : null;
}

// ─── Statut rénal du patient ─────────────────────────────────────────────────

export interface CreatinineResult {
  id: string;
  valeur_num: number | null;
  unite_saisie: string | null;
  date_prelevement: string;
  created_at?: string;
}

export interface RenalInput {
  dateNaissance: string | null | undefined;
  sexe: string | null | undefined;
  poidsKg: number | null | undefined;
  poidsDate: string | null | undefined;
  pathologies: string[] | null | undefined;
  /** Résultats de créatinine NON archivés du patient. */
  creatinines: CreatinineResult[];
  /** Examen CREATININE du référentiel (porte les conversions d'unités). */
  creatRef: ExamRef | null;
  today: Date;
  /** Le chargement des résultats a échoué. */
  loadError?: boolean;
}

export type RenalInconnuRaison =
  | 'chargement' | 'referentiel' | 'aucune_creatinine' | 'creatinine_perimee' | 'unite_inconnue'
  | 'valeur_invalide' | 'age_inconnu' | 'mineur' | 'sexe_inconnu';

export interface RenalStatus {
  /** Le DFG est connu et utilisable par le moteur. */
  connu: boolean;
  raison: RenalInconnuRaison | null;
  /** DFG CKD-EPI 2021 arrondi à l'unité (mL/min/1,73 m²). */
  dfg: number | null;
  stade: RenalStade | null;
  /** Clairance de Cockcroft-Gault arrondie (mL/min), si le poids est connu. */
  cockcroft: number | null;
  creat: { id: string; valeur: number; unite: string | null; date: string; mgDl: number | null } | null;
  fraicheur: Fraicheur | null;
  poidsKg: number | null;
  poidsDate: string | null;
  poidsAncien: boolean;
  /** Dialyse mentionnée dans les pathologies du patient. */
  dialyse: boolean;
  age: number | null;
  /** Empreinte : tout changement invalide l'analyse. */
  sig: string;
}

export const AGE_ADULTE = 18;
const DIALYSE_RE = /\bdialys|hemodialys/;

export function hasDialyse(pathologies: string[] | null | undefined): boolean {
  return (pathologies ?? []).some(p => DIALYSE_RE.test(normEngine(p)));
}

/** Créatinine la plus récente (date de prélèvement, puis saisie la plus récente). */
export function latestCreatinine(rows: CreatinineResult[]): CreatinineResult | null {
  return [...rows].sort((a, b) => b.date_prelevement.localeCompare(a.date_prelevement)
    || (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0] ?? null;
}

/**
 * Fonction rénale du patient d'après sa DERNIÈRE créatinine. Jamais de repli sur un résultat
 * plus ancien : si le dernier est inutilisable (unité hors référentiel, plus de 12 mois), la
 * fonction rénale est « inconnue », et cela se dit.
 */
export function renalStatus(input: RenalInput): RenalStatus {
  const age = ageAns(input.dateNaissance, input.today);
  const sexe: Sexe | null = input.sexe === 'M' || input.sexe === 'F' ? input.sexe : null;
  const poids = typeof input.poidsKg === 'number' && input.poidsKg >= POIDS_MIN && input.poidsKg <= POIDS_MAX ? input.poidsKg : null;
  const base: RenalStatus = {
    connu: false, raison: null, dfg: null, stade: null, cockcroft: null, creat: null, fraicheur: null,
    poidsKg: poids, poidsDate: poids !== null ? (input.poidsDate ?? null) : null,
    poidsAncien: poids !== null && poidsAncien(input.poidsDate, input.today),
    dialyse: hasDialyse(input.pathologies), age, sig: '',
  };
  const done = (s: RenalStatus): RenalStatus => ({
    ...s,
    sig: [s.creat?.id ?? '', s.dfg ?? '', s.cockcroft ?? '', s.raison ?? '', s.fraicheur ?? '', s.poidsKg ?? '', s.poidsDate ?? '', s.poidsAncien ? 1 : 0, s.dialyse ? 1 : 0].join(':'),
  });
  const inconnu = (raison: RenalInconnuRaison, extra: Partial<RenalStatus> = {}) => done({ ...base, ...extra, raison });

  if (input.loadError) return inconnu('chargement');
  const last = latestCreatinine(input.creatinines);
  if (!last) return inconnu('aucune_creatinine');
  if (last.valeur_num === null || !Number.isFinite(last.valeur_num) || last.valeur_num <= 0) return inconnu('valeur_invalide');
  const creat = { id: last.id, valeur: last.valeur_num, unite: last.unite_saisie, date: last.date_prelevement, mgDl: null as number | null };
  const fraicheur = fraicheurCreatinine(last.date_prelevement, input.today);
  if (fraicheur === 'inconnue') return inconnu('creatinine_perimee', { creat, fraicheur });
  if (!input.creatRef) return inconnu('referentiel', { creat, fraicheur });
  const mgDl = convertir(last.valeur_num, last.unite_saisie, 'mg/dL', examMesure(input.creatRef));
  if (mgDl === null || mgDl <= 0) return inconnu('unite_inconnue', { creat, fraicheur });
  creat.mgDl = mgDl;
  if (age === null) return inconnu('age_inconnu', { creat, fraicheur });
  if (age < AGE_ADULTE) return inconnu('mineur', { creat, fraicheur });
  if (!sexe) return inconnu('sexe_inconnu', { creat, fraicheur });

  const dfg = Math.round(ckdEpi2021(mgDl, age, sexe));
  return done({
    ...base, connu: true, creat, fraicheur, dfg, stade: renalStade(dfg),
    cockcroft: poids !== null ? Math.round(cockcroftGault(mgDl, age, poids, sexe)) : null,
  });
}

// ─── Libellés ────────────────────────────────────────────────────────────────

const RAISON_LABEL: Record<RenalInconnuRaison, string> = {
  chargement: 'Fonction rénale inconnue — résultats non chargés',
  referentiel: 'Fonction rénale inconnue — référentiel des unités non chargé',
  aucune_creatinine: 'Fonction rénale inconnue — aucune créatinine enregistrée',
  creatinine_perimee: 'Fonction rénale inconnue — créatinine de plus de 12 mois',
  unite_inconnue: 'Fonction rénale inconnue — unité de la créatinine hors référentiel',
  valeur_invalide: 'Fonction rénale inconnue — valeur de créatinine invalide',
  age_inconnu: 'DFG non calculable — date de naissance manquante',
  mineur: 'DFG non calculable (< 18 ans)',
  sexe_inconnu: 'DFG non calculable — sexe non renseigné',
};

const creatDate = (s: RenalStatus) => (s.creat ? `créat du ${formatFrShort(s.creat.date)}` : '');

/** « DFG 42 mL/min/1,73 m² (CKD-EPI, créat du 12/09) » ou la raison pour laquelle il est inconnu. */
export function dfgLine(s: RenalStatus): string {
  if (!s.connu || s.dfg === null) {
    const r = RAISON_LABEL[s.raison ?? 'aucune_creatinine'];
    return s.raison === 'creatinine_perimee' && s.creat ? `${r} (${formatFr(s.creat.date)})`
      : s.raison === 'unite_inconnue' && s.creat ? `${r} (${formatNombre(s.creat.valeur, 6)} ${s.creat.unite ?? 'sans unité'})` : r;
  }
  return `DFG ${s.dfg} mL/min/1,73 m² (CKD-EPI, ${creatDate(s)}${s.fraicheur === 'ancienne' ? ', ancienne' : ''})`;
}

/** « Cl. Cockcroft 38 mL/min » (+ « poids ancien »), ou null si elle n'est pas calculable. */
export function cockcroftLine(s: RenalStatus): string | null {
  if (!s.connu || s.cockcroft === null) return null;
  return `Cl. Cockcroft ${s.cockcroft} mL/min${s.poidsAncien ? ' (poids ancien)' : ''}`;
}

/** Ligne « Également : DFG 24 mL/min » d'une carte existante. */
function valeurCourte(s: RenalStatus, mesure: Mesure): string {
  return mesure === 'cockcroft' && s.cockcroft !== null ? `Cl. Cockcroft ${s.cockcroft} mL/min` : `DFG ${s.dfg} mL/min`;
}

/** « DFG actuel 72 mL/min (créat du 12/09) » — ajoutée aux CI rénales déclenchées par les pathologies. */
export function dfgActuelLine(s: RenalStatus): string | null {
  if (!s.connu || s.dfg === null) return null;
  return `DFG actuel ${s.dfg} mL/min (${creatDate(s)}${s.fraicheur === 'ancienne' ? ', ancienne' : ''})`;
}

// ─── Lecture des contre-indications rénales DÉJÀ en base ─────────────────────

export interface RenalCondition {
  /** La CI s'applique si le DFG est strictement inférieur à ce seuil. */
  seuil: number;
  /** Seuil écrit dans le libellé (« DFG < 30 ») plutôt que déduit du stade. */
  explicite: boolean;
  dialyse: boolean;
}

// Faux amis : glande surrénale, artère rénale, rein du fœtus, atteinte AIGUË (indépendante du DFG chronique).
const EXCLUSION_RE = /surrenal|stenose|foetal|fetal|grossesse|aigu/;
const RENAL_RE = /insuffisance renale|dialyse|maladie renale chronique/;

/**
 * Seuil de DFG d'une contre-indication de la base, par motif STRICT sur son libellé :
 *   seuil explicite (« DFG < 30 », « clairance < 45 ») → ce seuil, prioritaire ;
 *   stade 3 / 3-5 → < 60 · stade 3b → < 45 · stade 4 / 4-5 / « sévère » → < 30 ·
 *   stade 5 / « terminale » / dialyse → < 15.
 * Tout autre libellé (surrénale, sténose de l'artère rénale, rein fœtal, insuffisance rénale
 * aiguë, formulation sans stade) → null : le canal rénal ne s'en mêle pas.
 */
export function parseRenalCondition(conditionValeur: string | null | undefined): RenalCondition | null {
  const raw = (conditionValeur ?? '').toLowerCase().replace(/œ/g, 'oe');
  const n = normEngine(raw);
  if (!n || EXCLUSION_RE.test(n) || !RENAL_RE.test(n)) return null;
  const dialyse = /dialyse/.test(n);
  const m = raw.match(/(?:dfg|clairance|clcr)[^0-9<≤>]{0,30}<\s*(\d{1,3})/);
  if (m) return { seuil: Number(m[1]), explicite: true, dialyse };
  const st = n.match(/stade (\d)(b)?/);
  if (st) {
    const seuil = st[1] === '3' ? (st[2] ? 45 : 60) : st[1] === '4' ? 30 : st[1] === '5' ? 15 : null;
    return seuil === null ? null : { seuil, explicite: false, dialyse };
  }
  if (/severe/.test(n)) return { seuil: 30, explicite: false, dialyse };
  if (/terminale/.test(n) || dialyse) return { seuil: 15, explicite: false, dialyse };
  return null;
}

// ─── Règles (données : tables regles_renales / regles_renales_classes) ───────

export type Mesure = 'dfg' | 'cockcroft';
export type RegleRenaleSeverite = 'absolue' | 'a_evaluer';

export interface RegleRenale {
  code: string;
  ordre: number;
  classe: string;
  mesure: Mesure;
  /** La règle s'applique si la valeur est strictement inférieure à `seuil`… */
  seuil: number;
  /** …et supérieure ou égale à `seuil_min` (null = pas de borne basse). */
  seuil_min: number | null;
  /** S'applique aussi à un patient dialysé, même si la clairance n'est pas calculable. */
  inclut_dialyse: boolean;
  severite: RegleRenaleSeverite;
  titre: string;
  conduite: string;
  source: string;
  actif: boolean;
}

export interface RenalClasse { classe: string; dci_motif: string }

export interface BaseCI {
  id: string;
  dci_pattern: string;
  condition_type: string;
  condition_valeur: string;
  severite: 'absolue' | 'relative';
  description: string;
}

const hayOf = (med: EngineMed) => [
  normEngine(med.dci ?? ''), normEngine(med.nom), normEngine(med.dci_canonique ?? ''), ...(med.ingredients ?? []).map(normEngine),
].filter(Boolean);

/** Classes rénales d'un médicament : motif ⊆ norm(dci + nom + dci_canonique [+ ingrédients]). */
export function renalClasses(med: EngineMed, classes: RenalClasse[]): Set<string> {
  const hay = hayOf(med);
  const out = new Set<string>();
  for (const c of classes) {
    const motif = normEngine(c.dci_motif);
    if (motif.length >= 3 && hay.some(h => h.includes(motif))) out.add(c.classe);
  }
  return out;
}

/** Même règle que le moteur existant : un des motifs (séparés par « | », > 2 caractères) ⊆ médicament. */
export function medMatchesPattern(med: EngineMed, dciPattern: string): boolean {
  const hay = hayOf(med);
  return dciPattern.split('|').map(p => normEngine(p.trim())).filter(p => p.length > 2).some(p => hay.some(h => h.includes(p)));
}

export type RenalAlertSeverite = 'contre_indication' | 'a_evaluer' | 'majeure';

export interface RenalAlert {
  medId: string;
  medNom: string;
  severite: RenalAlertSeverite;
  /** Condition affichée sur la carte. */
  condition: string;
  description: string;
  source: string;
  origine: 'regle' | 'base';
  /** « DFG 24 mL/min » — ligne « Également » en cas de fusion avec une carte existante. */
  ligne: string;
  regleCode: string | null;
}

export interface RenalReserve {
  medId: string;
  medNom: string;
  /** 'fonction' : DFG inconnu · 'cockcroft' : poids manquant. */
  motif: 'fonction' | 'cockcroft';
}

const RANK: Record<RenalAlertSeverite, number> = { contre_indication: 3, a_evaluer: 2, majeure: 1.5 };
const REGLE_SEVERITE: Record<RegleRenaleSeverite, RenalAlertSeverite> = { absolue: 'contre_indication', a_evaluer: 'a_evaluer' };
export const SOURCE_BASE = 'Contre-indication de la base — seuil lu dans son libellé';

const applies = (r: RegleRenale, v: number) => v < r.seuil && (r.seuil_min === null || v >= r.seuil_min);

/**
 * Alertes et réserves du canal rénal.
 *   • Une alerte au plus par médicament : la plus sévère (à égalité, une règle prime sur une
 *     CI de la base, puis l'ordre des règles).
 *   • Fonction rénale inconnue (ou clairance de Cockcroft non calculable faute de poids) :
 *     aucune alerte, mais une RÉSERVE pour chaque médicament concerné par une règle de niveau
 *     contre-indication. Les autres médicaments ne sont pas touchés (pas de bruit).
 *   • Patient dialysé : les règles `inclut_dialyse` s'appliquent même sans clairance.
 */
export function evaluateRenal(
  meds: EngineMed[], status: RenalStatus, cis: BaseCI[], regles: RegleRenale[], classes: RenalClasse[],
): { alerts: RenalAlert[]; reserves: RenalReserve[] } {
  const active = regles.filter(r => r.actif).sort((a, b) => a.ordre - b.ordre);
  const renalCis = cis
    .filter(c => c.condition_type === 'pathologie')
    .map(c => ({ ci: c, cond: parseRenalCondition(c.condition_valeur) }))
    .filter((x): x is { ci: BaseCI; cond: RenalCondition } => x.cond !== null);
  const anc = status.fraicheur === 'ancienne' ? ', ancienne' : '';
  const dfgLong = status.connu ? `DFG ${status.dfg} mL/min/1,73 m² (${creatDate(status)}${anc})` : '';

  const alerts: RenalAlert[] = [];
  const reserves: RenalReserve[] = [];
  for (const med of meds) {
    const mc = renalClasses(med, classes);
    const candidates: Array<RenalAlert & { rang: number; ordre: number }> = [];
    let reserve: RenalReserve['motif'] | null = null;

    for (const r of active) {
      if (!mc.has(r.classe)) continue;
      const v = !status.connu ? null : r.mesure === 'dfg' ? status.dfg : status.cockcroft;
      const parValeur = v !== null && applies(r, v);
      const parDialyse = !parValeur && r.inclut_dialyse && status.dialyse;
      if (!parValeur && !parDialyse) {
        // Valeur non disponible : réserve seulement pour une règle de niveau contre-indication.
        if (v === null && r.severite === 'absolue') reserve ??= status.connu ? 'cockcroft' : 'fonction';
        continue;
      }
      const mesureLong = parDialyse ? 'dialyse'
        : r.mesure === 'dfg' ? dfgLong
          : `clairance de Cockcroft ${status.cockcroft} mL/min${status.poidsAncien ? ' (poids ancien)' : ''} — ${creatDate(status)}${anc}`;
      candidates.push({
        medId: med.id, medNom: med.nom, severite: REGLE_SEVERITE[r.severite],
        condition: `fonction rénale — ${mesureLong}`,
        description: `${r.titre}. Conduite à tenir : ${r.conduite}`,
        source: r.source, origine: 'regle', regleCode: r.code,
        ligne: parDialyse ? 'dialyse' : valeurCourte(status, r.mesure),
        rang: RANK[REGLE_SEVERITE[r.severite]] + 0.01, ordre: r.ordre,
      });
    }

    if (status.connu && status.dfg !== null) {
      for (const { ci, cond } of renalCis) {
        if (status.dfg >= cond.seuil || !medMatchesPattern(med, ci.dci_pattern)) continue;
        const sev: RenalAlertSeverite = ci.severite === 'absolue' ? 'contre_indication' : 'majeure';
        candidates.push({
          medId: med.id, medNom: med.nom, severite: sev,
          condition: `${ci.condition_valeur} — ${dfgLong}`,
          description: ci.description, source: SOURCE_BASE, origine: 'base', regleCode: null,
          ligne: valeurCourte(status, 'dfg'),
          // À sévérité égale : le seuil le plus bas d'abord (la formulation la plus précise).
          rang: RANK[sev], ordre: 10_000 + cond.seuil,
        });
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.rang - a.rang || a.ordre - b.ordre);
      const { rang: _r, ordre: _o, ...best } = candidates[0];
      alerts.push(best);
    } else if (reserve) {
      reserves.push({ medId: med.id, medNom: med.nom, motif: reserve });
    }
  }
  return { alerts, reserves };
}

/** « fonction rénale non disponible (Glucophage) · clairance de Cockcroft non calculable — poids manquant (Xarelto) » */
export function reservesLabel(reserves: RenalReserve[], status: RenalStatus): string {
  const noms = (m: RenalReserve['motif']) => [...new Set(reserves.filter(r => r.motif === m).map(r => r.medNom))];
  const parts: string[] = [];
  const f = noms('fonction'), c = noms('cockcroft');
  if (f.length > 0) parts.push(`fonction rénale non disponible (${f.join(', ')})${status.raison === 'mineur' ? ' — DFG non calculable (< 18 ans)' : ''}`);
  if (c.length > 0) parts.push(`clairance de Cockcroft non calculable — poids manquant (${c.join(', ')})`);
  return parts.join(' · ');
}

// ─── Fusion avec les contre-indications existantes ───────────────────────────

export interface RenalExisting extends ExistingAlertLike { channel?: string }

/** Carte existante du matching par pathologies portant sur la fonction rénale. */
export function isRenalCard(e: RenalExisting): boolean {
  return e.type === 'contraindication' && !e.channel && parseRenalCondition(e.condition) !== null;
}

/**
 * Jamais de carte en double pour un même médicament :
 *   • une carte existante (CI rénale déclenchée par les pathologies) de sévérité ≥ reçoit
 *     « Également : DFG 24 mL/min » ;
 *   • sinon l'alerte rénale devient la carte, et absorbe les cartes rénales existantes moins
 *     sévères de ce médicament (leur condition figure dans ses lignes « Également »).
 * Rien n'est masqué : toute autre carte rénale existante — y compris quand le DFG est ≥ 60 —
 * reçoit seulement la ligne d'information « DFG actuel 72 mL/min (créat du JJ/MM) ».
 */
export function mergeRenalWithExisting<E extends RenalExisting>(
  existing: E[], renalAlerts: RenalAlert[], status: RenalStatus,
): { standalone: Array<RenalAlert & { also: string[] }>; alsoByIndex: Map<number, string[]>; infoByIndex: Map<number, string[]>; absorbed: number[] } {
  const standalone: Array<RenalAlert & { also: string[] }> = [];
  const alsoByIndex = new Map<number, string[]>();
  const absorbed = new Set<number>();
  const touched = new Set<number>();

  for (const ra of renalAlerts) {
    const cands = existing
      .map((e, i) => ({ e, i, rank: existingRank(e.severite) }))
      .filter(x => isRenalCard(x.e) && x.e.involved[0] === ra.medNom)
      .sort((a, b) => b.rank - a.rank);
    const top = cands[0];
    if (top && top.rank >= RANK[ra.severite]) {
      alsoByIndex.set(top.i, [...(alsoByIndex.get(top.i) ?? []), ra.ligne]);
      touched.add(top.i);
      continue;
    }
    const also: string[] = [];
    for (const c of cands) {
      absorbed.add(c.i);
      if (c.e.condition && !ra.condition.startsWith(c.e.condition) && !also.includes(c.e.condition)) also.push(c.e.condition);
    }
    standalone.push({ ...ra, also });
  }

  const infoByIndex = new Map<number, string[]>();
  const info = dfgActuelLine(status);
  if (info) {
    existing.forEach((e, i) => {
      if (isRenalCard(e) && !touched.has(i) && !absorbed.has(i)) infoByIndex.set(i, [info]);
    });
  }
  return { standalone, alsoByIndex, infoByIndex, absorbed: [...absorbed] };
}

/** Ajoute les lignes d'information aux cartes (copie des cartes concernées, tableau modifié en place). */
export function applyInfoLines<A extends { also?: string[] }>(alerts: A[], infoByIndex: Map<number, string[]>): void {
  for (const [idx, lines] of infoByIndex) {
    const a = alerts[idx];
    if (a) alerts[idx] = { ...a, also: [...(a.also ?? []), ...lines.filter(l => !(a.also ?? []).includes(l))] };
  }
}

/** Date du jour au format ISO (jour civil local). */
export const todayIso = (d: Date = new Date()) => toIsoDate(d);
