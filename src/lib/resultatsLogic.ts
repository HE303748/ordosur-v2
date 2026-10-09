// Sprint 6A — Résultats d'examens : règles de calcul.
//
// Module PUR (ni React ni Supabase) : testé par resultatsLogic.test.ts.
//
// Trois principes non négociables :
//   1. Conversion d'unités UNIQUEMENT via examens_reference.unites (Sprint 5). Une unité que
//      le référentiel ne connaît pas n'est jamais convertie (valeur_ref reste vide).
//   2. Interprétation UNIQUEMENT à partir des bornes du laboratoire saisies avec le résultat.
//      Sans bornes : null (« bornes non renseignées »). Aucune valeur normale dans ce fichier.
//   3. Le contrôle de cohérence (delta check) compare au dernier résultat du même examen chez
//      ce patient ; il avertit, il ne bloque pas.

import { searchExams, normExam, contextCodes, type ExamRef, type ExamType, type ExamUnite } from './examSearch';
import { formatFrShort, type DemandeLigne, type LigneStatut } from './examRequest';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Interpretation = 'normal' | 'bas' | 'haut' | 'anormal';
export type Qualitatif = 'positif' | 'negatif' | 'indetermine';

export interface ResultatExamen {
  id: string;
  patient_id: string;
  org_id: string;
  doctor_id: string;
  examen_code: string | null;
  libelle: string;
  parametre: string | null;
  type: ExamType;
  categorie: string | null;
  demande_ligne_id: string | null;
  date_prelevement: string;
  valeur_num: number | null;
  valeur_texte: string | null;
  unite_saisie: string | null;
  valeur_ref: number | null;
  unite_ref: string | null;
  borne_basse: number | null;
  borne_haute: number | null;
  interpretation: Interpretation | null;
  a_revoir: boolean;
  laboratoire: string | null;
  commentaire: string | null;
  vu_le: string | null;
  vu_par_doctor_id: string | null;
  vu_commentaire: string | null;
  archive: boolean;
  archive_motif: string | null;
  archive_par_doctor_id: string | null;
  archive_le: string | null;
  created_at: string;
}

// ─── Nombres (formats français) ──────────────────────────────────────────────

export interface NombreSaisi { valeur: number; decimales: number }

/** « 7,2 », « 7.2 », « 1 250 », « 1 250,5 » → nombre + décimales tapées. Sinon null. */
export function parseNombre(raw: string | null | undefined): NombreSaisi | null {
  let s = (raw ?? '').trim().replace(/[  ]/g, ' ');
  if (/^\d{1,3}( \d{3})+([.,]\d+)?$/.test(s)) s = s.replace(/ /g, '');
  if (!/^\d+([.,]\d+)?$/.test(s)) return null;
  const [, dec = ''] = s.split(/[.,]/);
  const valeur = Number(s.replace(',', '.'));
  return Number.isFinite(valeur) ? { valeur, decimales: dec.length } : null;
}

/** Affichage français : virgule décimale, zéros de fin retirés. */
export function formatNombre(n: number | null | undefined, decimales?: number): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '';
  const a = Math.abs(n);
  const d = decimales ?? (a >= 100 ? 1 : a >= 10 ? 2 : 3);
  return String(Number(n.toFixed(d))).replace('.', ',');
}

const arrondi = (v: number) => Number(v.toPrecision(8));
const arrondiA = (v: number, dec: number) => Number(v.toFixed(Math.min(Math.max(dec, 0), 6)));

// ─── Unités et conversions (référentiel uniquement) ──────────────────────────

export interface UniteDef {
  unite: string;
  reference: boolean;
  toRef: (v: number) => number;
  fromRef: (v: number) => number;
}

export interface ExamMesure {
  parametre: string | null;
  /** Unité de référence de l'examen (unite_defaut), ou null si l'examen n'en a pas. */
  uniteRef: string | null;
  /** Unité de référence en tête, puis les unités convertibles du référentiel. */
  unites: UniteDef[];
}

const identite = (v: number) => v;

/** Conversion décrite par une entrée de examens_reference.unites, ou null si elle est illisible. */
function uniteDepuisRef(u: ExamUnite): UniteDef | null {
  if (!u.unite) return null;
  if (typeof u.facteur === 'number' && u.facteur > 0) {
    const f = u.facteur;
    return { unite: u.unite, reference: false, fromRef: v => v * f, toRef: v => v / f };
  }
  if (typeof u.diviseur === 'number' && u.diviseur > 0) {
    const d = u.diviseur;
    return { unite: u.unite, reference: false, fromRef: v => v / d, toRef: v => v * d };
  }
  // HbA1c : IFCC (mmol/mol) = a × (NGSP % + b).
  if (u.formule === 'ifcc' && typeof u.a === 'number' && u.a !== 0 && typeof u.b === 'number') {
    const a = u.a, b = u.b;
    return { unite: u.unite, reference: false, fromRef: v => a * (v + b), toRef: v => v / a - b };
  }
  return null; // formule inconnue : jamais de conversion inventée
}

/** Paramètres mesurables d'un examen composite (ex. NFS → « hémoglobine »). */
export function examParametres(exam: ExamRef | null | undefined): string[] {
  const out: string[] = [];
  for (const u of exam?.unites ?? []) if (u.parametre && !out.includes(u.parametre)) out.push(u.parametre);
  return out;
}

/** Paramètre retenu par défaut : le premier d'un examen composite sans unité propre. */
export function defaultParametre(exam: ExamRef | null | undefined): string | null {
  if (!exam || exam.unite_defaut) return null;
  return examParametres(exam)[0] ?? null;
}

export function examMesure(exam: ExamRef | null | undefined, parametre?: string | null): ExamMesure {
  if (!exam) return { parametre: null, uniteRef: null, unites: [] };
  const p = parametre ?? defaultParametre(exam);
  const entries = (exam.unites ?? []).filter(u => (u.parametre ?? null) === (p ?? null));
  const uniteRef = p ? (entries.find(u => u.unite_defaut)?.unite_defaut ?? null) : exam.unite_defaut;
  if (!uniteRef) return { parametre: p ?? null, uniteRef: null, unites: [] };
  const unites: UniteDef[] = [{ unite: uniteRef, reference: true, toRef: identite, fromRef: identite }];
  for (const e of entries) {
    const d = uniteDepuisRef(e);
    if (d && !unites.some(x => normUnite(x.unite) === normUnite(d.unite))) unites.push(d);
  }
  return { parametre: p ?? null, uniteRef, unites };
}

/** Comparaison d'unités insensible à la casse, aux espaces et aux variantes de « µ ». */
export function normUnite(u: string | null | undefined): string {
  return (u ?? '').toLowerCase().replace(/[μµ]/g, 'µ').replace(/\s+/g, '').replace(/^u(mol|g)/, 'µ$1');
}

/** Unité du référentiel correspondant à la saisie (« g/dl » → « g/dL », « mmol » → « mmol/L »). */
export function matchUnite(saisie: string | null | undefined, mesure: ExamMesure): UniteDef | null {
  const n = normUnite(saisie);
  if (!n) return null;
  const exact = mesure.unites.find(u => normUnite(u.unite) === n);
  if (exact) return exact;
  const debut = mesure.unites.filter(u => normUnite(u.unite).startsWith(n));
  return debut.length === 1 ? debut[0] : null;
}

/** Valeur dans l'unité de référence, ou null si l'unité n'est pas connue du référentiel. */
export function toRef(valeur: number, unite: string | null | undefined, mesure: ExamMesure): { valeur_ref: number; unite_ref: string } | null {
  const u = matchUnite(unite, mesure);
  if (!u || !mesure.uniteRef) return null;
  return { valeur_ref: arrondi(u.toRef(valeur)), unite_ref: mesure.uniteRef };
}

/** Conversion entre deux unités du référentiel (null si l'une des deux est inconnue). */
export function convertir(valeur: number, de: string | null | undefined, vers: string | null | undefined, mesure: ExamMesure): number | null {
  const a = matchUnite(de, mesure), b = matchUnite(vers, mesure);
  if (!a || !b) return null;
  if (a === b) return valeur;
  return arrondi(b.fromRef(a.toRef(valeur)));
}

// ─── Nature du résultat attendu ──────────────────────────────────────────────

export type ResultKind = 'numerique' | 'qualitatif' | 'texte' | 'libre';

/** Examens dont le résultat se lit positif / négatif / indéterminé. */
const QUALITATIFS = new Set([
  'RAI', 'AG_HBS', 'AC_ANTI_HBS', 'AC_ANTI_HBC', 'AC_ANTI_VHC', 'VIH', 'SYPHILIS', 'TOXOPLASMOSE', 'RUBEOLE',
  'HP_TEST_RESPIRATOIRE', 'HP_SEROLOGIE', 'HP_ANTIGENE_FECAL', 'SANG_OCCULTE',
]);

export const QUALITATIF_CHOIX: { id: Qualitatif; label: string }[] = [
  { id: 'negatif', label: 'Négatif' },
  { id: 'positif', label: 'Positif' },
  { id: 'indetermine', label: 'Indéterminé' },
];

/**
 * numerique : valeur + unité du référentiel · qualitatif : positif / négatif / indéterminé ·
 * texte : compte rendu libre + case « Anormal » (imagerie, explorations, biologie sans unité) ·
 * libre : examen hors référentiel (valeur chiffrée avec unité libre, ou texte).
 */
export function resultKind(exam: ExamRef | null | undefined, parametre?: string | null): ResultKind {
  if (!exam) return 'libre';
  if (exam.type !== 'biologie') return 'texte';
  if (examMesure(exam, parametre).uniteRef) return 'numerique';
  return QUALITATIFS.has(exam.code) ? 'qualitatif' : 'texte';
}

const QUALI_MOTS: Record<string, Qualitatif> = {
  positif: 'positif', positive: 'positif', pos: 'positif', '+': 'positif',
  negatif: 'negatif', negative: 'negatif', neg: 'negatif', '-': 'negatif',
  indetermine: 'indetermine', indeterminee: 'indetermine', douteux: 'indetermine', limite: 'indetermine',
};

export function parseQualitatif(raw: string | null | undefined): Qualitatif | null {
  const t = (raw ?? '').trim();
  if (t === '+' || t === '-') return QUALI_MOTS[t];
  return QUALI_MOTS[normExam(t)] ?? null;
}

export function qualitatifLabel(v: string | null | undefined): string | null {
  return QUALITATIF_CHOIX.find(c => c.id === v)?.label ?? null;
}

// ─── Interprétation (bornes du laboratoire uniquement) ───────────────────────

/**
 * Bas / Haut / Normal d'après les bornes saisies avec le résultat (même unité que la valeur).
 * Aucune borne → null : l'interprétation n'est pas calculable. Même règle que le trigger SQL.
 */
export function interpret(valeur: number | null | undefined, borneBasse: number | null | undefined, borneHaute: number | null | undefined): Interpretation | null {
  if (valeur === null || valeur === undefined || !Number.isFinite(valeur)) return null;
  const lo = borneBasse ?? null, hi = borneHaute ?? null;
  if (lo === null && hi === null) return null;
  if (lo !== null && valeur < lo) return 'bas';
  if (hi !== null && valeur > hi) return 'haut';
  return 'normal';
}

export const INTERPRETATION_LABEL: Record<Interpretation, string> = { normal: 'Normal', bas: 'Bas', haut: 'Haut', anormal: 'Anormal' };
export const BORNES_ABSENTES = 'bornes non renseignées';

/** Bornes incohérentes (basse > haute) : la saisie doit être corrigée. */
export function bornesValides(basse: number | null, haute: number | null): boolean {
  return basse === null || haute === null || basse <= haute;
}

/** « 4,0 – 6,0 », « ≥ 0,4 », « ≤ 1,1 » ou chaîne vide. */
export function bornesLabel(r: Pick<ResultatExamen, 'borne_basse' | 'borne_haute'>): string {
  const lo = r.borne_basse, hi = r.borne_haute;
  if (lo !== null && hi !== null) return `${formatNombre(lo)} – ${formatNombre(hi)}`;
  if (lo !== null) return `≥ ${formatNombre(lo)}`;
  if (hi !== null) return `≤ ${formatNombre(hi)}`;
  return '';
}

// ─── « À revoir » ────────────────────────────────────────────────────────────

/** Résultat Bas, Haut ou Anormal, ou qualitatif positif (même règle que la colonne a_revoir). */
export function needsReview(r: Pick<ResultatExamen, 'interpretation' | 'valeur_num' | 'valeur_texte'>): boolean {
  if (r.interpretation === 'bas' || r.interpretation === 'haut' || r.interpretation === 'anormal') return true;
  return r.valeur_num === null && (r.valeur_texte ?? '').trim().toLowerCase() === 'positif';
}

/** « Non vu » : à revoir, pas encore marqué comme vu, non archivé. */
export function isNonVu(r: Pick<ResultatExamen, 'interpretation' | 'valeur_num' | 'valeur_texte' | 'vu_le' | 'archive'>): boolean {
  return !r.archive && !r.vu_le && needsReview(r);
}

export function resultatsARevoir<T extends Pick<ResultatExamen, 'interpretation' | 'valeur_num' | 'valeur_texte' | 'vu_le' | 'archive' | 'date_prelevement'>>(list: T[]): T[] {
  return list.filter(isNonVu).sort((a, b) => b.date_prelevement.localeCompare(a.date_prelevement));
}

// ─── Séries (un examen ou un paramètre = une série) ──────────────────────────

export function serieKey(r: Pick<ResultatExamen, 'examen_code' | 'parametre' | 'libelle'>): string {
  return r.examen_code
    ? `${r.examen_code}|${normExam(r.parametre)}`
    : `LIBRE|${normExam(r.libelle)}`;
}

/** Libellé court : « HbA1c (hémoglobine glyquée) » → « HbA1c ». */
export function shortLabel(libelle: string): string {
  return libelle.replace(/\s*\([^)]*\)\s*$/, '').trim() || libelle;
}

const capitalise = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Libellé d'un résultat : le paramètre s'il y en a un (« Hémoglobine »), sinon l'examen. */
export function resultatLabel(exam: ExamRef | null | undefined, parametre: string | null | undefined, libelle?: string | null): string {
  if (parametre) return capitalise(parametre);
  return shortLabel(exam?.libelle ?? libelle ?? '');
}

const parDateDesc = (a: Pick<ResultatExamen, 'date_prelevement' | 'created_at'>, b: Pick<ResultatExamen, 'date_prelevement' | 'created_at'>) =>
  b.date_prelevement.localeCompare(a.date_prelevement) || b.created_at.localeCompare(a.created_at);

export type Tendance = 'hausse' | 'baisse' | 'stable';

/**
 * Deux résultats chiffrés sont comparables s'ils ont une valeur dans l'unité de référence,
 * ou s'ils ont été saisis dans la même unité. Renvoie les deux valeurs à comparer.
 */
export function comparables(a: Pick<ResultatExamen, 'valeur_num' | 'valeur_ref' | 'unite_saisie'>, b: Pick<ResultatExamen, 'valeur_num' | 'valeur_ref' | 'unite_saisie'>): [number, number] | null {
  if (a.valeur_ref !== null && b.valeur_ref !== null) return [a.valeur_ref, b.valeur_ref];
  if (a.valeur_num !== null && b.valeur_num !== null && normUnite(a.unite_saisie) === normUnite(b.unite_saisie)) return [a.valeur_num, b.valeur_num];
  return null;
}

/** ↑ ↓ → par rapport au résultat précédent (null si non comparable). */
export function tendance(dernier: ResultatExamen | null | undefined, precedent: ResultatExamen | null | undefined): Tendance | null {
  if (!dernier || !precedent) return null;
  const c = comparables(dernier, precedent);
  if (!c) return null;
  const [x, y] = c;
  // Stable = identiques à 3 chiffres significatifs (12 mg/L et 106 µmol/L sont le même résultat).
  if (Number(x.toPrecision(3)) === Number(y.toPrecision(3))) return 'stable';
  return x > y ? 'hausse' : 'baisse';
}

export const TENDANCE_SYMBOLE: Record<Tendance, string> = { hausse: '↑', baisse: '↓', stable: '→' };

export interface Serie {
  key: string;
  examCode: string | null;
  parametre: string | null;
  label: string;
  type: ExamType;
  categorie: string;
  ordre: number;
  /** Résultats non archivés, du plus récent au plus ancien. */
  points: ResultatExamen[];
  dernier: ResultatExamen;
  precedent: ResultatExamen | null;
  tendance: Tendance | null;
  /** Résultats archivés (historique des corrections). */
  archives: ResultatExamen[];
}

export const CATEGORIE_AUTRES = 'Autres';

export function buildSeries(resultats: ResultatExamen[], refs: ExamRef[]): Serie[] {
  const byCode = new Map(refs.map(r => [r.code, r]));
  const groups = new Map<string, ResultatExamen[]>();
  for (const r of resultats) {
    const k = serieKey(r);
    const g = groups.get(k);
    if (g) g.push(r); else groups.set(k, [r]);
  }
  const out: Serie[] = [];
  for (const [key, all] of groups) {
    const points = all.filter(r => !r.archive).sort(parDateDesc);
    if (points.length === 0) continue;
    const dernier = points[0];
    const exam = dernier.examen_code ? byCode.get(dernier.examen_code) ?? null : null;
    out.push({
      key,
      examCode: dernier.examen_code,
      parametre: dernier.parametre,
      label: resultatLabel(exam, dernier.parametre, dernier.libelle),
      type: exam?.type ?? dernier.type,
      categorie: exam?.categorie ?? dernier.categorie ?? CATEGORIE_AUTRES,
      ordre: exam?.ordre ?? 100_000,
      points,
      dernier,
      precedent: points[1] ?? null,
      tendance: tendance(dernier, points[1]),
      archives: all.filter(r => r.archive).sort(parDateDesc),
    });
  }
  return out.sort((a, b) => a.ordre - b.ordre || a.label.localeCompare(b.label, 'fr'));
}

/** Catégories présentes, dans l'ordre du référentiel (filtres de l'onglet Bilans). */
export function categoriesOf(series: Serie[]): string[] {
  const out: string[] = [];
  for (const s of series) if (!out.includes(s.categorie)) out.push(s.categorie);
  return out;
}

/** « 7,2 % », « Positif », ou le début du compte rendu. */
export function valeurAffichee(r: Pick<ResultatExamen, 'valeur_num' | 'valeur_texte' | 'unite_saisie'>, maxTexte = 60): string {
  if (r.valeur_num !== null) return [formatNombre(r.valeur_num, 6), r.unite_saisie].filter(Boolean).join(' ');
  const t = (r.valeur_texte ?? '').trim();
  const q = qualitatifLabel(t);
  if (q) return q;
  return t.length > maxTexte ? `${t.slice(0, maxTexte - 1).trimEnd()}…` : t;
}

/** Dernier résultat non archivé de la même série (référence du delta check). */
export function findPrevious(resultats: ResultatExamen[], key: string, exceptId?: string | null): ResultatExamen | null {
  return resultats.filter(r => !r.archive && r.id !== exceptId && serieKey(r) === key).sort(parDateDesc)[0] ?? null;
}

// ─── Contrôle de cohérence (delta check) ─────────────────────────────────────

export interface DeltaWarning {
  kind: 'ecart' | 'unite';
  message: string;
  /** Unité dans laquelle la valeur tapée coïncide avec le résultat précédent. */
  uniteProbable: string | null;
}

export const DELTA_RATIO = 3;

/**
 * Avertissement (non bloquant) si la valeur saisie diffère d'un facteur > 3 (ou < 1/3) du
 * dernier résultat, comparés dans la même unité de référence — ou si le nombre tapé est
 * exactement le précédent exprimé dans une AUTRE unité (erreur d'unité probable).
 * Non comparable (unité hors référentiel et différente de la précédente) → null.
 */
export function deltaCheck(
  saisie: { valeur: number; decimales: number; unite: string | null },
  precedent: Pick<ResultatExamen, 'valeur_num' | 'unite_saisie' | 'valeur_ref' | 'date_prelevement'> | null | undefined,
  mesure: ExamMesure,
): DeltaWarning | null {
  if (!precedent || precedent.valeur_num === null) return null;
  const message = `Valeur très différente du précédent (${[formatNombre(precedent.valeur_num, 6), precedent.unite_saisie].filter(Boolean).join(' ')} le ${formatFrShort(precedent.date_prelevement)}) — vérifier la valeur et l'unité`;

  const cur = matchUnite(saisie.unite, mesure);
  // 1. Le nombre tapé = le précédent converti dans une autre unité du référentiel.
  if (cur && precedent.valeur_ref !== null) {
    const precDansUnite = cur.fromRef(precedent.valeur_ref);
    if (arrondiA(precDansUnite, saisie.decimales) !== arrondiA(saisie.valeur, saisie.decimales)) {
      for (const u of mesure.unites) {
        if (u === cur) continue;
        if (arrondiA(u.fromRef(precedent.valeur_ref), saisie.decimales) === arrondiA(saisie.valeur, saisie.decimales)) {
          return { kind: 'unite', message, uniteProbable: u.unite };
        }
      }
    }
  }
  // 2. Rapport > ×3 ou < ÷3, dans la même unité.
  let a: number | null = null, b: number | null = null;
  if (cur && precedent.valeur_ref !== null) { a = cur.toRef(saisie.valeur); b = precedent.valeur_ref; }
  else if (normUnite(saisie.unite) === normUnite(precedent.unite_saisie)) { a = saisie.valeur; b = precedent.valeur_num; }
  if (a === null || b === null || a <= 0 || b <= 0) return null;
  const ratio = a / b;
  return ratio > DELTA_RATIO || ratio < 1 / DELTA_RATIO ? { kind: 'ecart', message, uniteProbable: null } : null;
}

// ─── Saisie libre : « hba1c 7,2 », « créat 12 », « hb 13,5 g/dl », « tsh 2.1 » ───

export interface Candidat {
  exam: ExamRef;
  parametre: string | null;
  label: string;
}

export interface ParsedSaisie {
  raw: string;
  /** Partie de la saisie comprise comme le nom de l'examen. */
  nom: string;
  /** Examens possibles, le plus probable en premier (HbA1c d'abord chez un diabétique). */
  candidats: Candidat[];
  /** Plusieurs examens plausibles, ou nom trop court pour être sûr : le médecin choisit explicitement. */
  ambigu: boolean;
  nombre: NombreSaisi | null;
  qualitatif: Qualitatif | null;
  /** Unité telle que tapée (null si absente). */
  unite: string | null;
}

const uniteLike = (s: string) => s.length <= 20 && /^[a-zA-Zµμ%°]/.test(s);

/**
 * Sprint 6A-bis — deux garde-fous contre un nom tronqué par une frappe perdue :
 *   • une valeur CHIFFRÉE ne peut viser qu'un examen de biologie (« ét 106 » ne devient pas
 *     une échocardiographie) ;
 *   • un nom de 1 ou 2 lettres qui n'est pas une abréviation exacte (« cr », « re ») est
 *     `incertain` : les examens trouvés sont proposés, jamais retenus sans choix explicite.
 */
function chercheCandidats(nom: string, refs: ExamRef[], pathologies: string[] | null | undefined, chiffre = false): { candidats: Candidat[]; exact: boolean; incertain: boolean } {
  const rien = { candidats: [], exact: false, incertain: false };
  const hits = searchExams(nom, refs, [], { pathologies, limit: 8 })
    .flatMap(h => (h.kind === 'exam' && (!chiffre || h.exam.type === 'biologie') ? [{ exam: h.exam, score: h.score, base: h.score - (h.contextual ? 30 : 0) }] : []));
  if (hits.length === 0) return rien;
  const top = Math.max(...hits.map(h => h.base));
  if (top < 50) return rien;
  const kept = hits.filter(h => h.base >= top - 10).slice(0, 4);
  return {
    exact: top >= 100,
    incertain: normExam(nom).length <= 2 && top < 100,
    candidats: kept.map(h => {
      const parametre = defaultParametre(h.exam);
      return { exam: h.exam, parametre, label: parametre ? `${capitalise(parametre)} (${shortLabel(h.exam.libelle)})` : shortLabel(h.exam.libelle) };
    }),
  };
}

/**
 * Comprend une ligne de saisie rapide. Ne décide jamais seul en cas d'ambiguïté (« hb » →
 * HbA1c ou Hémoglobine) : `ambigu` impose un choix explicite. Rien n'est enregistré ici.
 */
export function parseSaisieLibre(input: string, refs: ExamRef[], opts: { pathologies?: string[] | null } = {}): ParsedSaisie {
  const raw = input.trim().replace(/[  ]/g, ' ').replace(/\s*[:=]\s*/g, ' ').replace(/\s+/g, ' ');
  const vide: ParsedSaisie = { raw, nom: raw, candidats: [], ambigu: false, nombre: null, qualitatif: null, unite: null };
  if (raw.length < 2) return vide;
  const done = (nom: string, c: Candidat[], rest: Partial<ParsedSaisie>, incertain = false): ParsedSaisie =>
    ({ ...vide, nom, candidats: c, ambigu: c.length > 1 || (incertain && c.length > 0), ...rest });

  const tokens = raw.split(' ');
  // Qualitatif en fin de saisie : « vih négatif », « ag hbs + ».
  if (tokens.length >= 2) {
    const q = parseQualitatif(tokens[tokens.length - 1]);
    if (q) {
      const nom = tokens.slice(0, -1).join(' ');
      const c = chercheCandidats(nom, refs, opts.pathologies);
      if (c.candidats.length > 0) return done(nom, c.candidats, { qualitatif: q }, c.incertain);
    }
  }

  // Le texte entier est le nom exact d'un examen (« ca 125 », « ca 19-9 ») : pas de valeur.
  const entier = chercheCandidats(raw, refs, opts.pathologies);
  if (entier.exact) return done(raw, entier.candidats, {}, entier.incertain);

  // Valeur chiffrée : on essaie chaque nombre comme frontière nom | valeur | unité.
  let repli: ParsedSaisie | null = null;
  for (let i = 1; i < tokens.length; i++) {
    const m = tokens[i].match(/^(\d+(?:[.,]\d+)?)(\D.*)?$/);
    if (!m) continue;
    const nombre = parseNombre(m[1]);
    const reste = [m[2] ?? '', ...tokens.slice(i + 1)].join(' ').trim();
    if (!nombre || (reste && !uniteLike(reste))) continue;
    const nom = tokens.slice(0, i).join(' ');
    const c = chercheCandidats(nom, refs, opts.pathologies, true);
    const parsed = done(nom, c.candidats, { nombre, unite: reste || null }, c.incertain);
    if (c.candidats.length > 0) return parsed;
    repli ??= parsed;
  }
  if (repli) return repli;
  return done(raw, entier.candidats, {}, entier.incertain);
}

/** Unité proposée : celle de la dernière saisie du médecin pour cet examen, sinon l'unité de référence. */
export function defaultUnite(mesure: ExamMesure, derniereUnite: string | null | undefined): string | null {
  const last = matchUnite(derniereUnite, mesure);
  return last?.unite ?? mesure.uniteRef;
}

/** Dernière unité utilisée par série, d'après les saisies du médecin (les plus récentes d'abord). */
export function lastUnitsBySerie(rows: Array<Pick<ResultatExamen, 'examen_code' | 'parametre' | 'libelle' | 'unite_saisie'>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (!r.unite_saisie) continue;
    const k = serieKey(r);
    if (!(k in out)) out[k] = r.unite_saisie;
  }
  return out;
}

// ─── Construction d'un résultat à enregistrer ────────────────────────────────

export interface ResultatDraft {
  exam: ExamRef | null;
  parametre: string | null;
  /** Libellé pour une saisie hors référentiel. */
  libelleLibre?: string;
  nombre: NombreSaisi | null;
  texte: string;
  unite: string | null;
  borneBasse: number | null;
  borneHaute: number | null;
  /** Case « Anormal » (compte rendu, examen hors référentiel sans valeur chiffrée). */
  anormal: boolean;
  demandeLigneId?: string | null;
  /** Libellé de la ligne de demande (examen demandé hors référentiel). */
  ligneLibelle?: string;
  ligneType?: ExamType;
}

export interface ResultatPayload {
  patient_id: string; org_id: string; doctor_id: string;
  examen_code: string | null; libelle: string; parametre: string | null; type: ExamType; categorie: string | null;
  demande_ligne_id: string | null; date_prelevement: string;
  valeur_num: number | null; valeur_texte: string | null; unite_saisie: string | null;
  valeur_ref: number | null; unite_ref: string | null;
  borne_basse: number | null; borne_haute: number | null;
  interpretation: Interpretation | null; laboratoire: string | null; commentaire: string | null;
}

export interface Commun { patient_id: string; org_id: string; doctor_id: string; date_prelevement: string; laboratoire?: string | null; commentaire?: string | null }

/** Un brouillon est enregistrable s'il porte une valeur (chiffre, qualitatif ou texte). */
export function draftHasValue(d: ResultatDraft): boolean {
  return d.nombre !== null || d.texte.trim().length > 0;
}

export function draftError(d: ResultatDraft): string | null {
  if (!draftHasValue(d)) return 'Valeur manquante';
  if (d.nombre !== null && !bornesValides(d.borneBasse, d.borneHaute)) return 'Borne basse supérieure à la borne haute';
  if (!d.exam && !(d.libelleLibre ?? d.ligneLibelle ?? '').trim()) return 'Nom de l’examen manquant';
  return null;
}

/**
 * Ligne prête pour la RPC enregistrer_resultats_examens. Un texte purement numérique est
 * enregistré comme valeur chiffrée ; un qualitatif est stocké sous sa forme canonique.
 * L'interprétation chiffrée est recalculée par la base (même règle).
 */
export function buildResultatPayload(d: ResultatDraft, c: Commun): ResultatPayload {
  const mesure = examMesure(d.exam, d.parametre);
  const kind = resultKind(d.exam, d.parametre);
  let nombre = d.nombre;
  let texte: string | null = d.texte.trim() || null;
  if (!nombre && texte && kind !== 'qualitatif') {
    const n = parseNombre(texte);
    if (n) { nombre = n; texte = null; }
  }
  if (nombre) texte = null;
  if (texte) texte = parseQualitatif(texte) && (kind === 'qualitatif' || kind === 'libre') ? parseQualitatif(texte) : texte;

  const unite = nombre ? (matchUnite(d.unite, mesure)?.unite ?? (d.unite?.trim() || null)) : null;
  const ref = nombre ? toRef(nombre.valeur, unite, mesure) : null;
  const lo = nombre ? d.borneBasse : null, hi = nombre ? d.borneHaute : null;
  return {
    patient_id: c.patient_id, org_id: c.org_id, doctor_id: c.doctor_id,
    examen_code: d.exam?.code ?? null,
    libelle: (d.exam ? d.exam.libelle : (d.libelleLibre ?? d.ligneLibelle ?? '')).trim(),
    parametre: mesure.parametre,
    type: d.exam?.type ?? d.ligneType ?? 'biologie',
    categorie: d.exam?.categorie ?? null,
    demande_ligne_id: d.demandeLigneId ?? null,
    date_prelevement: c.date_prelevement,
    valeur_num: nombre?.valeur ?? null,
    valeur_texte: texte,
    unite_saisie: unite,
    valeur_ref: ref?.valeur_ref ?? null,
    unite_ref: ref?.unite_ref ?? null,
    borne_basse: lo, borne_haute: hi,
    interpretation: nombre ? interpret(nombre.valeur, lo, hi) : (d.anormal ? 'anormal' : null),
    laboratoire: c.laboratoire?.trim() || null,
    commentaire: c.commentaire?.trim() || null,
  };
}

// ─── Fermeture de la boucle (miroir des triggers SQL) ────────────────────────

/** Lignes d'une demande pour lesquelles un résultat peut encore être saisi. */
export function lignesASaisir<T extends Pick<DemandeLigne, 'statut' | 'resultat_id'>>(lignes: T[]): T[] {
  return lignes.filter(l => l.statut !== 'annule' && !l.resultat_id);
}

/**
 * État des lignes après l'enregistrement de résultats : chaque ligne renseignée passe à
 * « réalisé » à la date du prélèvement. Le statut de la demande s'en déduit avec
 * deriveDemandeStatut (partiel s'il reste une ligne en attente, réalisé sinon).
 */
export function lignesApresResultats<T extends { id: string; statut: LigneStatut; date_realisation: string | null; resultat_id: string | null }>(
  lignes: T[], resultats: Array<{ ligneId: string; resultatId: string }>, datePrelevement: string,
): T[] {
  const byLigne = new Map(resultats.map(r => [r.ligneId, r.resultatId]));
  return lignes.map(l => {
    const rid = byLigne.get(l.id);
    if (!rid || l.statut === 'annule') return l;
    return { ...l, statut: 'realise' as LigneStatut, date_realisation: datePrelevement, resultat_id: rid };
  });
}

// ─── Vérificateur : « Derniers bilans : … » ──────────────────────────────────

export interface DernierBilan { key: string; label: string; valeur: string; date: string; interpretation: Interpretation | null }

/**
 * Jusqu'à `max` derniers résultats, les plus pertinents d'abord : examens liés aux
 * pathologies du patient (diabète → HbA1c, glycémie…), puis les plus récents.
 * Les comptes rendus (texte long) n'y figurent pas.
 */
export function derniersBilans(series: Serie[], pathologies: string[] | null | undefined, max = 5): DernierBilan[] {
  const ctx = [...contextCodes(pathologies)];
  const rang = (s: Serie) => { const i = s.examCode ? ctx.indexOf(s.examCode) : -1; return i === -1 ? Number.MAX_SAFE_INTEGER : i; };
  return series
    .filter(s => s.dernier.valeur_num !== null || qualitatifLabel(s.dernier.valeur_texte) !== null)
    .sort((a, b) => rang(a) - rang(b) || b.dernier.date_prelevement.localeCompare(a.dernier.date_prelevement) || a.ordre - b.ordre)
    .slice(0, max)
    .map(s => ({ key: s.key, label: s.label, valeur: valeurAffichee(s.dernier), date: s.dernier.date_prelevement, interpretation: s.dernier.interpretation }));
}

export function derniersBilansLine(items: DernierBilan[]): string {
  return items.map(i => `${i.label} ${i.valeur} (${formatFrShort(i.date)})`).join(' · ');
}

// ─── Courbe ──────────────────────────────────────────────────────────────────

export interface ChartPoint {
  id: string;
  /** Position sur l'axe du temps : jour du prélèvement + rang de saisie dans la journée. */
  t: number;
  date: string;
  valeur: number;
  laboratoire: string | null;
}
export interface ChartSerie { unite: string | null; points: ChartPoint[]; bande: { basse: number | null; haute: number | null } | null }

/** Unités dans lesquelles la série peut être tracée (référentiel, sinon unités saisies). */
export function unitesCourbe(serie: Serie, mesure: ExamMesure): string[] {
  if (mesure.unites.length > 0 && serie.points.some(p => p.valeur_ref !== null)) return mesure.unites.map(u => u.unite);
  const out: string[] = [];
  for (const p of serie.points) {
    if (p.valeur_num === null) continue;
    const u = p.unite_saisie ?? '';
    if (!out.includes(u)) out.push(u);
  }
  return out;
}

const tsOf = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return Date.UTC(y, (m || 1) - 1, d || 1); };

/**
 * Points de la courbe dans l'unité choisie (ordre chronologique). Un résultat saisi dans une
 * unité hors référentiel n'est tracé que si c'est l'unité affichée. La bande reprend les
 * bornes du laboratoire du résultat le plus récent qui en porte, converties dans cette unité.
 */
export function chartSerie(serie: Serie, mesure: ExamMesure, unite: string | null): ChartSerie {
  const cible = matchUnite(unite, mesure);
  const dans = (v: number, de: string | null): number | null => {
    if (normUnite(de) === normUnite(unite)) return v;
    const src = matchUnite(de, mesure);
    return src && cible ? arrondi(cible.fromRef(src.toRef(v))) : null;
  };
  // Sprint 6A-bis — UN point par résultat, jamais de regroupement par jour : deux valeurs du
  // même jour sont deux points, placés dans l'ordre de saisie (horodatage) à l'intérieur du jour.
  const chrono = [...serie.points]
    .filter(p => p.valeur_num !== null)
    .sort((a, b) => a.date_prelevement.localeCompare(b.date_prelevement) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const parJour = new Map<string, number>();
  for (const p of chrono) parJour.set(p.date_prelevement, (parJour.get(p.date_prelevement) ?? 0) + 1);
  const rang = new Map<string, number>();
  const points: ChartPoint[] = [];
  for (const p of chrono) {
    const k = rang.get(p.date_prelevement) ?? 0;
    rang.set(p.date_prelevement, k + 1);
    const v = dans(p.valeur_num!, p.unite_saisie);
    if (v === null) continue;
    // Les points d'un même jour se répartissent sur la journée (pas d'empilement).
    const pas = Math.min(3_600_000, Math.floor(86_400_000 / (parJour.get(p.date_prelevement)! + 1)));
    points.push({ id: p.id, t: tsOf(p.date_prelevement) + k * pas, date: p.date_prelevement, valeur: v, laboratoire: p.laboratoire });
  }
  let bande: ChartSerie['bande'] = null;
  const src = serie.points.find(p => p.valeur_num !== null && (p.borne_basse !== null || p.borne_haute !== null));
  if (src) {
    const basse = src.borne_basse !== null ? dans(src.borne_basse, src.unite_saisie) : null;
    const haute = src.borne_haute !== null ? dans(src.borne_haute, src.unite_saisie) : null;
    if (basse !== null || haute !== null) bande = { basse, haute };
  }
  return { unite, points, bande };
}

// ─── Récapitulatif (PDF) ─────────────────────────────────────────────────────

export interface RecapRow { examen: string; valeur: string; bornes: string; interpretation: string; date: string; precedent: string }
export interface RecapGroup { categorie: string; rows: RecapRow[] }

/** Tableau récapitulatif : dernier résultat de chaque examen, regroupé par catégorie. */
export function buildRecap(series: Serie[]): RecapGroup[] {
  const groups: RecapGroup[] = [];
  for (const s of series) {
    let g = groups.find(x => x.categorie === s.categorie);
    if (!g) { g = { categorie: s.categorie, rows: [] }; groups.push(g); }
    const d = s.dernier, p = s.precedent;
    g.rows.push({
      examen: s.label,
      valeur: valeurAffichee(d, 90),
      bornes: d.valeur_num !== null ? (bornesLabel(d) || '—') : '',
      interpretation: d.interpretation ? INTERPRETATION_LABEL[d.interpretation] : '',
      date: d.date_prelevement,
      precedent: p ? `${valeurAffichee(p, 30)} (${formatFrShort(p.date_prelevement)})` : '',
    });
  }
  return groups;
}

// ─── Champ de saisie (formulaires) ───────────────────────────────────────────

export interface FieldState {
  /** Valeur chiffrée telle que tapée. */
  valeur: string;
  unite: string | null;
  basse: string;
  haute: string;
  /** Qualitatif (identifiant canonique) ou compte rendu. */
  texte: string;
  anormal: boolean;
}

export function emptyField(unite: string | null = null): FieldState {
  return { valeur: '', unite, basse: '', haute: '', texte: '', anormal: false };
}

export function fieldHasValue(f: FieldState): boolean {
  return f.valeur.trim().length > 0 || f.texte.trim().length > 0;
}

/**
 * Champ → brouillon de résultat. Une valeur ou une borne illisible est une ERREUR (jamais
 * ignorée en silence) ; un champ vide donne `draft: null` sans erreur (ligne non renseignée).
 */
export function fieldToDraft(
  f: FieldState, exam: ExamRef | null, parametre: string | null,
  extra: Pick<ResultatDraft, 'libelleLibre' | 'demandeLigneId' | 'ligneLibelle' | 'ligneType'> = {},
): { draft: ResultatDraft | null; error: string | null } {
  if (!fieldHasValue(f)) return { draft: null, error: null };
  const kind = resultKind(exam, parametre);
  const chiffre = kind === 'numerique' || (kind === 'libre' && f.valeur.trim().length > 0);
  let nombre: NombreSaisi | null = null;
  let basse: number | null = null, haute: number | null = null;
  if (chiffre) {
    nombre = parseNombre(f.valeur);
    if (!nombre) return { draft: null, error: 'Valeur illisible (ex. 7,2)' };
    for (const [raw, set] of [[f.basse, (n: number) => { basse = n; }], [f.haute, (n: number) => { haute = n; }]] as const) {
      if (!raw.trim()) continue;
      const b = parseNombre(raw);
      if (!b) return { draft: null, error: 'Borne illisible (ex. 4,0)' };
      set(b.valeur);
    }
  }
  const draft: ResultatDraft = {
    exam, parametre, nombre, texte: chiffre ? '' : f.texte, unite: chiffre ? f.unite : null,
    borneBasse: basse, borneHaute: haute, anormal: !chiffre && kind !== 'qualitatif' && f.anormal, ...extra,
  };
  return { draft, error: draftError(draft) };
}

// ─── Sprint 6A-bis — Saisie rapide : état et garde-fous ──────────────────────

export type QuickEntryEtat = 'vide' | 'ambigu' | 'non_reconnu' | 'pret';

export interface QuickEntrySelection {
  /** Candidat choisi explicitement parmi une ambiguïté (index dans parsed.candidats). */
  choice?: number | null;
  /** Examen choisi dans la liste après un « Examen non reconnu ». */
  forced?: Candidat | null;
  /** « Créer un examen libre » confirmé explicitement pour CE nom. */
  libreConfirme?: boolean;
}

export interface QuickEntryState {
  etat: QuickEntryEtat;
  candidat: Candidat | null;
  /** Examen hors référentiel, confirmé par le médecin. */
  libre: boolean;
}

/**
 * Ce que la saisie rapide a le droit de faire. Un nom d'examen NON RECONNU ne devient jamais
 * un examen libre tout seul : il faut soit choisir un examen dans la liste, soit confirmer
 * explicitement « Créer un examen libre ». (Un nom tronqué — « éat 106 » pour « créat 106 » —
 * ne peut donc plus créer un faux examen, ni priver le moteur rénal d'une créatinine.)
 */
export function quickEntryState(parsed: ParsedSaisie, sel: QuickEntrySelection = {}): QuickEntryState {
  if (parsed.raw.length < 2) return { etat: 'vide', candidat: null, libre: false };
  if (sel.forced) return { etat: 'pret', candidat: sel.forced, libre: false };
  if (parsed.candidats.length === 0) {
    return sel.libreConfirme && parsed.nom.trim().length >= 2
      ? { etat: 'pret', candidat: null, libre: true }
      : { etat: 'non_reconnu', candidat: null, libre: false };
  }
  if (parsed.ambigu) {
    const c = sel.choice !== null && sel.choice !== undefined ? parsed.candidats[sel.choice] ?? null : null;
    return c ? { etat: 'pret', candidat: c, libre: false } : { etat: 'ambigu', candidat: null, libre: false };
  }
  return { etat: 'pret', candidat: parsed.candidats[0], libre: false };
}

/**
 * Message « Ajouté : … » — construit à partir de la LIGNE ENREGISTRÉE, jamais d'un état
 * d'écran : le message et l'enregistrement portent exactement la même chaîne.
 */
export function ajouteLabel(payload: Pick<ResultatPayload, 'libelle' | 'parametre' | 'valeur_num' | 'valeur_texte' | 'unite_saisie'>, exam: ExamRef | null): string {
  return `${resultatLabel(exam, payload.parametre, payload.libelle)} ${valeurAffichee(payload)}`.trim();
}

/**
 * Échec d'un enregistrement lancé en arrière-plan : le texte n'est rendu au champ que si le
 * médecin n'a rien tapé depuis. Ce qu'il est en train de taper n'est JAMAIS écrasé.
 */
export function restoreTextOnFailure(currentText: string, failedText: string): string {
  return currentText.trim() === '' ? failedText : currentText;
}

// ─── Sprint 6A-bis — Rattachement d'un résultat à une demande en attente ─────

export interface LigneARattacher { demandeId: string; dateDemande: string; numero: string; ligneId: string; statut: LigneStatut }

interface DemandeLike {
  id: string; numero: string; date_demande: string; statut: string;
  lignes: Array<Pick<DemandeLigne, 'id' | 'examen_code' | 'libelle' | 'statut' | 'resultat_id'>>;
}

/**
 * Examen demandé qui attend ce résultat : même examen, ligne non annulée et sans résultat,
 * dans une demande non annulée. Les lignes « en attente » passent avant celles déjà marquées
 * réalisées à la main ; à égalité, la demande la plus ancienne d'abord. `exclure` : lignes
 * déjà utilisées par un enregistrement en cours.
 */
export function findLigneARattacher(
  demandes: DemandeLike[], cible: { examCode: string | null; libelle: string }, exclure: ReadonlySet<string> = new Set(),
): LigneARattacher | null {
  const out: LigneARattacher[] = [];
  for (const d of demandes) {
    if (d.statut === 'annule') continue;
    for (const l of d.lignes) {
      if (l.statut === 'annule' || l.resultat_id || exclure.has(l.id)) continue;
      const meme = cible.examCode ? l.examen_code === cible.examCode : (!l.examen_code && normExam(l.libelle) === normExam(cible.libelle));
      if (meme) out.push({ demandeId: d.id, dateDemande: d.date_demande, numero: d.numero, ligneId: l.id, statut: l.statut });
    }
  }
  out.sort((a, b) => Number(a.statut !== 'en_attente') - Number(b.statut !== 'en_attente') || a.dateDemande.localeCompare(b.dateDemande));
  return out[0] ?? null;
}

/**
 * Libellé de suivi d'une ligne de demande. « résultat à saisir » n'apparaît QUE pour une ligne
 * marquée réalisée à la main, sans résultat rattaché.
 */
export function ligneSuiviLabel(l: Pick<DemandeLigne, 'statut' | 'date_realisation' | 'resultat_id'>): string {
  if (l.statut === 'annule') return 'Annulé';
  if (l.statut === 'en_attente') return 'En attente de résultat';
  const d = l.date_realisation ? `Réalisé le ${l.date_realisation.slice(8, 10)}/${l.date_realisation.slice(5, 7)}/${l.date_realisation.slice(0, 4)}` : 'Réalisé';
  return l.resultat_id ? `${d} — résultat saisi` : `${d} — résultat à saisir`;
}

/**
 * Miroir du trigger resultats_examens_after_archive : un résultat archivé SANS remplacement
 * rend sa ligne de demande à « en attente » (elle n'avait été réalisée que par ce résultat).
 */
export function lignesApresArchivage<T extends { id: string; statut: LigneStatut; date_realisation: string | null; resultat_id: string | null }>(lignes: T[], resultatId: string): T[] {
  return lignes.map(l => (l.resultat_id === resultatId ? { ...l, statut: 'en_attente' as LigneStatut, date_realisation: null, resultat_id: null } : l));
}

/** Une ligne du graphique = UN résultat d'une des deux séries (a : principale, b : comparée). */
export interface ChartRow { key: string; id: string; t: number; date: string; serie: 'a' | 'b'; a?: number; b?: number; laboratoire: string | null }

/** Lignes du graphique : un résultat = une ligne (jamais fusionnées par date), triées sur l'axe du temps. */
export function chartRows(primary: ChartSerie, secondary?: ChartSerie | null): ChartRow[] {
  const rows: ChartRow[] = [
    ...primary.points.map(p => ({ key: `a-${p.id}`, id: p.id, t: p.t, date: p.date, serie: 'a' as const, a: p.valeur, laboratoire: p.laboratoire })),
    ...(secondary?.points ?? []).map(p => ({ key: `b-${p.id}`, id: p.id, t: p.t, date: p.date, serie: 'b' as const, b: p.valeur, laboratoire: p.laboratoire })),
  ];
  return rows.sort((x, y) => x.t - y.t || x.serie.localeCompare(y.serie));
}
