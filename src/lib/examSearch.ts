// Sprint 5 — Recherche intelligente d'examens et de packs.
//
// Module PUR (ni React ni Supabase) : testé par examSearch.test.ts.
// Correspondance sur le libellé, les abréviations et les synonymes, sans accents ni casse.
// Classement contextuel : « hb » propose l'hémogramme ET l'HbA1c ; chez un patient
// diabétique, l'HbA1c passe en premier.

export type ExamType = 'biologie' | 'imagerie' | 'exploration';

export interface ExamUnite {
  unite: string;
  facteur?: number;
  diviseur?: number;
  formule?: string;
  a?: number;
  b?: number;
  parametre?: string;
  unite_defaut?: string;
}

export interface ExamRef {
  code: string;
  libelle: string;
  type: ExamType;
  categorie: string;
  abreviations: string[];
  synonymes: string[];
  a_jeun: boolean;
  delai_jeun_h: number | null;
  irradiant: boolean;
  injection_possible: boolean;
  produit_contraste: 'iode' | 'gadolinium' | null;
  consentement_requis: boolean;
  precisions_suggerees: string[];
  question_exemple: string | null;
  unite_defaut: string | null;
  unites: ExamUnite[];
  code_loinc: string | null;
  ordre: number;
  actif: boolean;
}

export interface PackLine {
  examen_code: string | null;
  libelle: string;
  type: ExamType;
  precision?: string | null;
}

export interface ExamPack {
  /** uuid en base ; pour un pack système, la clé stable est `code`. */
  id: string;
  systeme: boolean;
  code: string | null;
  doctor_id: string | null;
  nom: string;
  mots_cles: string[];
  lignes: PackLine[];
  archive: boolean;
  ordre: number;
}

/** Clé stable d'un pack (statistiques d'usage) : code système, sinon uuid. */
export function packKey(p: Pick<ExamPack, 'id' | 'code' | 'systeme'>): string {
  return p.systeme && p.code ? p.code : p.id;
}

/** Minuscules, sans accents, ponctuation → espace, espaces compactés. */
export function normExam(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// ── Contexte patient : examens mis en avant selon les pathologies ───────────
interface ContextRule { test: (norm: string) => boolean; codes: string[] }
const CONTEXT_RULES: ContextRule[] = [
  {
    test: p => (/\bdiabet/.test(p) && !/insipide/.test(p)) || /\b(dt1|dt2|dnid|did)\b/.test(p),
    codes: ['HBA1C', 'GLYCEMIE_JEUN', 'ALBU_CREAT_U'],
  },
  { test: p => /thyroid|basedow|hashimoto/.test(p), codes: ['TSH', 'T4L', 'ECHO_THYROIDIENNE'] },
  { test: p => /hepati|cirrhos|hepatopath|steatos/.test(p), codes: ['ECHO_HEPATIQUE_DOPPLER', 'AFP', 'FIBROSCAN', 'CHARGE_VIRALE_VHB', 'ARN_VHC'] },
  { test: p => /insuffisance renale|nephropath|maladie renale/.test(p), codes: ['CREATININE', 'DFG', 'IONOGRAMME'] },
];

/** Le patient a un diabète déclaré (hors diabète insipide). */
export function hasDiabete(pathologies: string[] | null | undefined): boolean {
  return (pathologies ?? []).some(p => CONTEXT_RULES[0].test(normExam(p)));
}

/** Codes d'examens à faire remonter pour ce patient. */
export function contextCodes(pathologies: string[] | null | undefined): Set<string> {
  const out = new Set<string>();
  for (const raw of pathologies ?? []) {
    const p = normExam(raw);
    for (const r of CONTEXT_RULES) if (r.test(p)) r.codes.forEach(c => out.add(c));
  }
  return out;
}

export type ExamSearchResult =
  | { kind: 'exam'; exam: ExamRef; score: number; contextual: boolean }
  | { kind: 'pack'; pack: ExamPack; score: number };

const wordStarts = (hay: string, q: string) => hay === q || hay.startsWith(`${q} `) || hay.startsWith(q) || hay.includes(` ${q}`);

/** Score d'un texte face à la requête normalisée (0 = pas de correspondance). */
function scoreText(hayNorm: string, q: string, allowInfix: boolean): number {
  if (!hayNorm) return 0;
  if (hayNorm === q) return 100;
  if (hayNorm.startsWith(q)) return 80;
  if (hayNorm.includes(` ${q}`)) return 65;
  if (allowInfix && hayNorm.includes(q)) return 35;
  return 0;
}

function scoreExam(e: ExamRef, q: string, tokens: string[]): number {
  const infix = q.length >= 4;
  let best = 0;
  for (const a of e.abreviations) best = Math.max(best, scoreText(normExam(a), q, false));
  // Une abréviation exacte prime sur tout le reste ; le libellé vient ensuite.
  const libNorm = normExam(e.libelle);
  // Saisie de 2 lettres : abréviations et début du libellé uniquement (sinon trop de bruit).
  if (q.length <= 2) return Math.max(best, libNorm.startsWith(q) ? 75 : 0);
  const lib = scoreText(libNorm, q, infix);
  best = Math.max(best, lib > 0 ? lib - 5 : 0);
  for (const s of e.synonymes) {
    const sc = scoreText(normExam(s), q, infix);
    best = Math.max(best, sc > 0 ? sc - 15 : 0);
  }
  if (best > 0) return best;
  // Requête en plusieurs mots (« echo hepatique », « tdm abdo ») : chaque mot doit se retrouver.
  if (tokens.length > 1) {
    const hay = normExam([e.libelle, ...e.abreviations, ...e.synonymes, e.categorie].join(' '));
    if (tokens.every(t => wordStarts(hay, t))) return 50;
  }
  return 0;
}

function scorePack(p: ExamPack, q: string, tokens: string[]): number {
  const nom = normExam(p.nom);
  let best = scoreText(nom, q, q.length >= 4);
  for (const m of p.mots_cles) {
    const sc = scoreText(normExam(m), q, false);
    best = Math.max(best, sc > 0 ? sc - 10 : 0);
  }
  if (best === 0 && tokens.length > 1) {
    const hay = normExam([p.nom, ...p.mots_cles].join(' '));
    if (tokens.every(t => wordStarts(hay, t))) best = 50;
  }
  return best;
}

export interface ExamSearchOptions {
  pathologies?: string[] | null;
  limit?: number;
  /** Nombre maximal de packs dans les résultats. */
  maxPacks?: number;
}

/**
 * Examens et packs correspondant à la saisie. Requête de moins de 2 caractères → aucun
 * résultat. Les packs figurent dans les mêmes résultats (en tête quand leur nom correspond).
 */
export function searchExams(
  query: string,
  exams: ExamRef[],
  packs: ExamPack[] = [],
  opts: ExamSearchOptions = {},
): ExamSearchResult[] {
  const q = normExam(query);
  if (q.length < 2) return [];
  const tokens = q.split(' ').filter(Boolean);
  const ctx = contextCodes(opts.pathologies);
  const limit = opts.limit ?? 12;

  const examHits: Extract<ExamSearchResult, { kind: 'exam' }>[] = [];
  for (const e of exams) {
    if (!e.actif) continue;
    const base = scoreExam(e, q, tokens);
    if (base === 0) continue;
    const contextual = ctx.has(e.code);
    examHits.push({ kind: 'exam', exam: e, score: base + (contextual ? 30 : 0), contextual });
  }
  examHits.sort((a, b) => b.score - a.score || a.exam.ordre - b.exam.ordre);

  const packHits: Extract<ExamSearchResult, { kind: 'pack' }>[] = [];
  for (const p of packs) {
    if (p.archive) continue;
    const sc = scorePack(p, q, tokens);
    if (sc > 0) packHits.push({ kind: 'pack', pack: p, score: sc });
  }
  // Packs personnels avant les packs système à score égal.
  packHits.sort((a, b) => b.score - a.score || Number(a.pack.systeme) - Number(b.pack.systeme) || a.pack.ordre - b.pack.ordre);
  const topPacks = packHits.slice(0, opts.maxPacks ?? 3);

  return [...topPacks, ...examHits.slice(0, Math.max(0, limit - topPacks.length))];
}
