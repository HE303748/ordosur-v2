// Sprint 2b-1 — Matching des CONDITIONS du patient (pathologies, allergies) avec les
// contre-indications de la base : par concepts, stades et qualificatifs.
//
// Module PUR (ni React ni Supabase) : testé par conditionMatcher.test.ts.
// Il remplace l'ancien bloc buildTerm → conditionTerms → condMatch de runCheck, qui comparait
// des sous-chaînes (et un préfixe de 14 caractères) : « Insuffisance respiratoire » y déclenchait
// les CI d'insuffisance rénale, « Ulcère gastrique » n'y déclenchait pas « Ulcère gastro-duodénal ».
//
//   1. Aucune comparaison de sous-chaîne ni de préfixe.
//   2. Normalisation identique des deux côtés : sans accents, sans casse, mots entiers.
//   3. Le concept d'une contre-indication est LU dans la table ci_condition_concepts
//      (scripts/gen_ci_condition_concepts.mjs) — jamais cherché dans son texte.
//   4. Familles : une CI portant sur la famille vaut pour ses membres.
//   5. Qualificatif absent chez le patient : état de contrôle → « À évaluer » ;
//      gravité / forme → sévérité de la CI conservée, « à préciser ».
//   6. Qualificatif discriminant présent du seul côté de la CI → pas de correspondance.
//   7. Fonction rénale : comparaison de STADES (libellé du patient ou DFG du canal rénal).
//   8. Allergies : par famille ou molécule, jamais croisées avec les pathologies.
//
// Sprint 2b-2 :
//   • une pathologie LISTÉE est active par définition (l'historique est dans les antécédents) :
//     « actif / évolutif / en poussée » est satisfait, la sévérité de la CI est conservée ;
//   • CI « Dialyse » : patient dialysé (pathologie ou antécédent) ou DFG < 15, rien d'autre ;
//   • famille « infection » : toute infection précisée déclenche les CI génériques « Infection ».
//
// Sprint 2c :
//   • chiffres romains = chiffres arabes après « type / stade / grade / classe / degré » (« type I ») ;
//   • infections bénignes ou localisées : CI génériques « Infection » en « À évaluer »
//     (« Si infection évolutive ou sévère ») ; les infections systémiques gardent la sévérité ;
//   • incohérence IRC déclarée / DFG calculé ≥ 60 : information (incoherenceIrcDfg).

import { allergyFamilles, type AllergieFamilleRow } from './allergyClassEngine';
import { parseRenalCondition } from './renalEngine';

// ─── Données ─────────────────────────────────────────────────────────────────

export type CiTraitement =
  | 'concept' | 'renal' | 'dialyse' | 'grossesse' | 'allaitement' | 'procreation' | 'age' | 'allergie' | 'contexte' | 'sans_concept';

/** Ligne de la table ci_condition_concepts. */
export interface CiConceptRow {
  condition_norm: string;
  condition_valeur: string;
  ordre: number;
  /** Texte de l'alternative (« A / B » → une ligne par alternative). */
  libelle: string;
  traitement: CiTraitement;
  /** pathologies_curees.nom_fr */
  concept: string | null;
  famille: string | null;
  qualificatif: string | null;
  qualificatif_type: 'etat' | 'gravite' | null;
  /** Stade rénal minimal : 3 · 3.5 (= 3b) · 4 · 5. Renvoyé en texte par PostgREST (numeric). */
  stade: number | string | null;
  note?: string | null;
}

export interface PathologieCuree { nom_fr: string; synonymes: string | null }

/**
 * Familles (décision 4) : une CI portant sur la famille vaut pour chacun de ses membres.
 * `libelles` : écritures génériques du patient sans concept propre (« Diabète »).
 */
export const FAMILLES: Record<string, { membres: string[]; libelles?: string[]; benignes?: string[] }> = {
  diabete: {
    membres: ['Diabète de type 1', 'Diabète de type 2', 'Diabète décompensé', 'Diabète gestationnel'],
    libelles: ['Diabète', 'Diabète sucré'],
  },
  ulcere_gastroduodenal: { membres: ['Ulcère gastro-duodénal', 'Ulcère gastrique', 'Ulcère duodénal'] },
  hta: { membres: ['Hypertension artérielle', 'Hypertension artérielle non contrôlée', 'Hypertension artérielle secondaire'] },
  hepatite_virale: { membres: ['Hépatite virale B', 'Hépatite virale C'], libelles: ['Hépatite virale'] },
  migraine: { membres: ['Migraine', 'Migraine avec aura'] },
  depression: { membres: ['Trouble dépressif', 'Trouble dépressif récurrent'] },
  asthme: { membres: ['Asthme', 'Asthme du nourrisson'] },
  varicelle: { membres: ['Varicelle', "Varicelle de l'enfant"] },
  infection_urinaire: { membres: ['Infection urinaire', 'Cystite', 'Pyélonéphrite'] },
  trouble_rythme: { membres: ['Trouble du rythme cardiaque', 'Fibrillation auriculaire'] },
  coronaropathie: { membres: ['Cardiopathie ischémique', 'Angine de poitrine', 'Infarctus du myocarde'] },
  dyslipidemie: { membres: ['Dyslipidémie', 'Hypercholestérolémie', 'Hypertriglycéridémie'] },
  hyperthyroidie: { membres: ['Hyperthyroïdie', 'Maladie de Basedow'] },
  psychose: { membres: ['Psychose', 'Schizophrénie'] },
  neuropathie: { membres: ['Neuropathie périphérique', 'Neuropathie diabétique'] },
  retrecissement_aortique: { membres: ['Rétrécissement aortique', 'Rétrécissement aortique serré'] },
  mtev: { membres: ['Thrombose veineuse profonde', 'Embolie pulmonaire'] },
  // Sprint 2b-2 — toute infection précisée ⊂ CI génériques « Infection ».
  infection: {
    membres: [
      'Abcès cutané', 'Angine', 'Bronchiolite', 'Bronchiolite du nourrisson', 'Bronchite aiguë', 'Brucellose', 'Candidose cutanée',
      'Cellulite infectieuse', 'Coqueluche', 'COVID-19', 'Cystite', 'Dengue', 'Endocardite', 'Érysipèle', 'Fièvre typhoïde', 'Folliculite',
      'Gastro-entérite', "Gastro-entérite de l'enfant", 'Grippe', 'Hépatite virale B', 'Hépatite virale C', 'Herpès', 'Hydatidose',
      'Impétigo', "Impétigo de l'enfant", 'Infection à Helicobacter pylori', 'Infection à papillomavirus', 'Infection à VIH',
      'Infection urinaire', 'Infection vaginale', 'Laryngite', 'Leishmaniose', 'Méningite', 'Mononucléose infectieuse', 'Mycose cutanée',
      'Mycose vaginale', 'Onychomycose', 'Oreillons', "Otite de l'enfant", 'Otite externe', 'Otite moyenne aiguë', 'Paludisme',
      'Pharyngite', 'Pneumonie', 'Pneumopathie infectieuse', 'Prostatite', 'Pyélonéphrite', 'Rhinopharyngite',
      "Rhinopharyngite de l'enfant", 'Rougeole', 'Rubéole', 'Salpingite', 'Septicémie', 'Sinusite aiguë', 'Syndrome grippal', 'Teigne',
      'Toxoplasmose', 'Tuberculose pulmonaire', 'Vaginose bactérienne', 'Varicelle', "Varicelle de l'enfant", 'Zona',
    ],
    libelles: ['Infection'],
    // Sprint 2c — bénignes ou localisées : la CI générique « Infection » devient « À évaluer ».
    // Tout le reste (systémique, sévère, virale à risque de réactivation) garde la sévérité de la CI.
    benignes: [
      'Abcès cutané', 'Angine', 'Bronchiolite', 'Bronchiolite du nourrisson', 'Bronchite aiguë', 'Candidose cutanée', 'Cystite', 'Folliculite',
      'Gastro-entérite', "Gastro-entérite de l'enfant", 'Impétigo', "Impétigo de l'enfant", 'Infection à Helicobacter pylori',
      'Infection à papillomavirus', 'Infection vaginale', 'Laryngite', 'Mycose cutanée', 'Mycose vaginale', 'Onychomycose',
      "Otite de l'enfant", 'Otite externe', 'Otite moyenne aiguë', 'Pharyngite', 'Rhinopharyngite', "Rhinopharyngite de l'enfant",
      'Sinusite aiguë', 'Syndrome grippal', 'Teigne', 'Vaginose bactérienne',
    ],
  },
};

/**
 * Sprint 2b-2 — écritures courantes absentes de pathologies_curees, rattachées à la main.
 * Elles valent un NOM de pathologie : en tête d'un libellé, elles admettent une précision
 * (« Cirrhose alcoolique », « Cirrhose biliaire primitive »).
 */
export const NOMS_COMPLEMENTAIRES: Record<string, string[]> = {
  'Cirrhose du foie': ['Cirrhose'],
  'Hypotension artérielle': ['Hypotension orthostatique'],
  'Lupus érythémateux systémique': ['Lupus érythémateux disséminé', 'Lupus érythémateux'],
};

const IRC = 'Insuffisance rénale chronique';
export const TITRE_INFECTION_BENIGNE = 'Si infection évolutive ou sévère';

// ─── Normalisation (décision 2) ──────────────────────────────────────────────

/** Sans accents ni casse ; « œ » → « oe » ; ponctuation → espace. */
export function normCondition(s: string | null | undefined): string {
  return (s ?? '').replace(/œ/gi, 'oe').replace(/æ/gi, 'ae')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

const STOP = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'a', 'au', 'aux', 'en', 'et', 'ou', 'par', 'avec', 'sur',
  'un', 'une', 'dans', 'chez', 'the', 'of', 'si']);

/** Racine d'un mot : pluriel, féminin et « -ive » ramenés à une même forme (« contrôlées » = « contrôlé »). */
export function racine(w: string): string {
  if (/^\d/.test(w)) return w;
  let r = w;
  if (r.length > 4 && r.endsWith('s') && !r.endsWith('ss')) r = r.slice(0, -1);
  r = r.replace(/ive$/, 'if');
  if (r.length > 4) r = r.replace(/(ee|e)$/, '');
  // « évolutif » et « actif » disent la même chose d'une maladie.
  return r === 'evolutif' ? 'actif' : r;
}

const ROMAINS: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4', v: '5' };
/**
 * Sprint 2c — chiffres romains = chiffres arabes après « type / stade / grade / classe / degré »
 * (« diabète type I » = « diabète de type 1 », « IRC stade IV » = « stade 4 »). Texte déjà normalisé.
 */
export function chiffresArabes(norm: string): string {
  return norm.replace(/\b(types?|stades?|grades?|classes?|degres?) (i{1,3}|iv|v)\b/g, (_m, mot: string, r: string) => `${mot} ${ROMAINS[r]}`);
}

/** Mots entiers significatifs, en racines. */
export function motsDe(s: string | null | undefined): string[] {
  return chiffresArabes(normCondition(s)).split(' ').filter(w => w && !STOP.has(w)).map(racine);
}

const sansParentheses = (s: string) => s.replace(/\([^)]*\)/g, ' ');
const R = (...mots: string[]) => new Set(mots.map(racine));

// Racines génériques partagées par des maladies distinctes : jamais un concept à elles seules dans un libellé plus long.
const GENERIQUES = R('hypertension', 'hypotension', 'tension', 'insuffisance', 'deficit', 'cancer', 'carcinome', 'tumeur',
  'neoplasie', 'infection', 'inflammation', 'syndrome', 'maladie', 'trouble', 'troubles');

// Décision 6 — qualificatifs qui changent l'IDENTITÉ de la maladie (début de racine).
const DISCRIMINANTS = ['pulmonair', 'neonat', 'gravidiqu', 'foetal', 'fetal', 'portal', 'intracran', 'surrenal', 'respiratoir', 'aigu'];
const discriminantDe = (w: string) => DISCRIMINANTS.find(d => w.startsWith(d)) ?? null;
export const estDiscriminant = (w: string) => discriminantDe(w) !== null;

// Le libellé du patient écarte lui-même la maladie (« pas de… », « ATCD familial de… », « suspicion de… »).
const NEGATIONS = R('pas', 'aucun', 'aucune', 'absence', 'familial', 'familiale', 'familiaux', 'suspicion', 'depistage', 'risque');

// Mots qui précisent un libellé du patient sans changer la maladie : seuls admis autour d'un concept d'un seul mot.
const PRECISIONS = R('actif', 'evolutif', 'chronique', 'severe', 'modere', 'leger', 'grave', 'controle', 'non', 'mal', 'equilibre',
  'desequilibre', 'decompense', 'compense', 'stable', 'instable', 'traite', 'ancien', 'recent', 'atcd', 'antecedent', 'cicatrise',
  'gueri', 'remission', 'allergique', 'stade', 'type', 'debutant', 'persistant', 'intermittent', 'recidivant', 'connu', 'essentiel',
  'idiopathique', 'primaire', 'bilateral', 'droit', 'gauche');

// Une pathologie listée est active : ces mots d'un qualificatif de CI sont satisfaits d'office.
const ACTIVITE = R('actif', 'evolutif', 'poussee');
// États du patient incompatibles avec un qualificatif d'état de la CI (actif, non contrôlé, décompensé…).
const INACTIFS = R('cicatrise', 'gueri', 'ancien', 'antecedent', 'atcd', 'remission');
const MAITRISES = R('controle', 'equilibre', 'stable', 'stabilise', 'traite', 'substitue', 'compense');
const NEGATEURS = R('non', 'mal', 'pas', 'insuffisamment');
// Formes exclusives : présentes des deux côtés avec des valeurs différentes → pas de correspondance.
const EXCLUSIFS: Array<[Set<string>, Set<string>]> = [
  [R('ischemique'), R('hemorragique')],
  [R('ouvert'), R('ferme')],
  [R('ancien'), R('recent')],
  [R('leger', 'modere'), R('severe', 'grave', 'morbide')],
];

// ─── Dictionnaire des concepts (pathologies_curees) ──────────────────────────

interface Phrase { mots: string[]; concept: string; nom: boolean }

export interface ConditionMatcherData {
  rowsByNorm: Map<string, CiConceptRow[]>;
  exact: Map<string, Phrase[]>;
  phrases: Phrase[];
  nomMots: Map<string, string[]>;
  famillesDe: Map<string, string[]>;
  familleLibelles: Map<string, string>;
  allergieFamilles: AllergieFamilleRow[];
  /** Noms de famille du canal allergies (alias + libellé), en racines → famille. */
  allergieNomsFamille: Map<string, Set<string>>;
}

export function buildConditionMatcher(
  rows: CiConceptRow[],
  curees: PathologieCuree[],
  allergieFamilles: AllergieFamilleRow[] = [],
): ConditionMatcherData {
  const rowsByNorm = new Map<string, CiConceptRow[]>();
  for (const r of [...rows].sort((a, b) => a.ordre - b.ordre)) {
    const k = normCondition(r.condition_valeur) || r.condition_norm;
    rowsByNorm.set(k, [...(rowsByNorm.get(k) ?? []), r]);
  }
  const exact = new Map<string, Phrase[]>();
  const phrases: Phrase[] = [];
  const nomMots = new Map<string, string[]>();
  const add = (texte: string, concept: string, nom: boolean) => {
    const mots = motsDe(texte);
    if (mots.length === 0 || mots.join('').length < 2) return;
    const p = { mots, concept, nom };
    phrases.push(p);
    const k = mots.join(' ');
    exact.set(k, [...(exact.get(k) ?? []), p]);
  };
  for (const c of curees) {
    nomMots.set(c.nom_fr, motsDe(c.nom_fr));
    add(c.nom_fr, c.nom_fr, true);
    for (const s of (c.synonymes ?? '').split(',').map(x => x.trim()).filter(Boolean)) add(s, c.nom_fr, false);
    for (const s of NOMS_COMPLEMENTAIRES[c.nom_fr] ?? []) add(s, c.nom_fr, true);
  }
  const famillesDe = new Map<string, string[]>();
  const familleLibelles = new Map<string, string>();
  for (const [f, def] of Object.entries(FAMILLES)) {
    for (const m of def.membres) famillesDe.set(m, [...(famillesDe.get(m) ?? []), f]);
    for (const l of def.libelles ?? []) familleLibelles.set(motsDe(l).join(' '), f);
  }
  const allergieNomsFamille = new Map<string, Set<string>>();
  for (const f of allergieFamilles) {
    for (const nom of f.type === 'alias' ? [f.motif, f.label] : [f.label]) {
      const k = motsDe(sansParentheses(nom)).join(' ');
      if (k) allergieNomsFamille.set(k, new Set([...(allergieNomsFamille.get(k) ?? []), f.famille]));
    }
  }
  return { rowsByNorm, exact, phrases, nomMots, famillesDe, familleLibelles, allergieFamilles, allergieNomsFamille };
}

// ─── Lecture d'une condition du patient ──────────────────────────────────────

export interface PatientTerm {
  label: string;
  kind: 'pathologie' | 'allergie';
  norm: string;
  mots: string[];
  concepts: string[];
  familles: string[];
  /** Insuffisance rénale CHRONIQUE (ou dialyse) et son stade lu dans le libellé (null = non précisé). */
  renal: { stade: number | null; precis: boolean } | null;
  grossesse: boolean;
  allaitement: boolean;
}

const contient = (w: string[], p: string[]) => {
  for (let i = 0; i + p.length <= w.length; i++) if (p.every((x, k) => w[i + k] === x)) return i;
  return -1;
};

function conceptsDuLibelle(mots: string[], d: ConditionMatcherData): { concepts: string[]; familles: string[] } {
  const cle = mots.join(' ');
  const fam = d.familleLibelles.get(cle);
  if (fam) return { concepts: [], familles: [fam] };
  const garde = (ps: Phrase[]) => [...new Set((ps.some(p => p.nom) ? ps.filter(p => p.nom) : ps).map(p => p.concept))];
  const ex = d.exact.get(cle);
  if (ex) return { concepts: garde(ex), familles: [] };

  // Libellé plus long que le concept : le concept doit y figurer en MOTS ENTIERS contigus.
  let best: Array<{ p: Phrase; reste: string[] }> = [];
  let taille = 0;
  for (const p of d.phrases) {
    if (p.mots.length < taille || p.mots.length >= mots.length) continue;
    const seul = p.mots.length === 1;
    if (seul && (p.mots[0].length < 4 || GENERIQUES.has(p.mots[0]) || /^\d/.test(p.mots[0]))) continue;
    const i = contient(mots, p.mots);
    if (i < 0) continue;
    const reste = [...mots.slice(0, i), ...mots.slice(i + p.mots.length)];
    if (reste.some(w => NEGATIONS.has(w) || estDiscriminant(w))) continue;
    // Concept d'un seul mot : admis en TÊTE du libellé s'il s'agit du nom de la pathologie (« Glaucome à angle
    // fermé ») ; sinon seuls des mots de précision peuvent l'entourer (« asthme allergique », « tabagisme actif »).
    if (seul && !(p.nom && i === 0) && !reste.every(w => PRECISIONS.has(w) || /^\d/.test(w))) continue;
    if (p.mots.length > taille) { taille = p.mots.length; best = []; }
    best.push({ p, reste });
  }
  if (best.length > 0) return { concepts: garde(best.map(b => b.p)), familles: [] };
  // Famille générique précisée (« Diabète déséquilibré ») ; en tête du libellé, toute précision est admise
  // (« Infection ostéo-articulaire », « Diabète MODY ») sauf une négation.
  for (const [k, f] of d.familleLibelles) {
    const p = k.split(' ');
    const i = p.length < mots.length ? contient(mots, p) : -1;
    if (i < 0) continue;
    const reste = [...mots.slice(0, i), ...mots.slice(i + p.length)];
    if (i === 0 ? !reste.some(w => NEGATIONS.has(w)) : reste.every(w => PRECISIONS.has(w) || /^\d/.test(w))) return { concepts: [], familles: [f] };
  }
  return { concepts: [], familles: [] };
}

/** Stade rénal écrit dans un libellé du patient. */
function stadeDuLibelle(n: string): { stade: number | null; precis: boolean } {
  if (/dialys/.test(n)) return { stade: 5, precis: true };
  const m = n.match(/stade (\d)\s?([ab])?\b/);
  if (m) return { stade: Number(m[1]) + (m[2] === 'b' ? 0.5 : 0), precis: m[1] !== '3' || !!m[2] };
  if (/terminal/.test(n)) return { stade: 5, precis: true };
  if (/severe/.test(n)) return { stade: 4, precis: true };
  if (/moderee?\b/.test(n)) return { stade: 3, precis: false }; // décision 7 : « modérée » = stade 3 (3a ou 3b)
  if (/legere?\b|debutante?\b/.test(n)) return { stade: 2, precis: true };
  return { stade: null, precis: false };
}

/** « Dialyse », « Hémodialyse », « Dialyse péritonéale » — pas une « péritonite de dialyse », pas « non dialysé ». */
const estDialyse = (n: string) => /dialys/.test(n) && !/peritonite/.test(n) && !/\b(pas|sans|non)\b/.test(n);

const ALLERGIE_RE = /^(allergie|allergies|intolerance|hypersensibilite)\b/;

export function analysePatientTerm(label: string, kind: 'pathologie' | 'allergie', d: ConditionMatcherData): PatientTerm {
  const norm = chiffresArabes(normCondition(label));
  const mots = motsDe(label);
  // Une « Allergie aux … » saisie parmi les pathologies reste une allergie.
  if (kind === 'allergie' || ALLERGIE_RE.test(norm)) {
    return { label, kind: 'allergie', norm, mots, concepts: [], familles: [], renal: null, grossesse: false, allaitement: false };
  }
  const { concepts, familles: directes } = conceptsDuLibelle(mots, d);
  const familles = [...new Set([...directes, ...concepts.flatMap(c => d.famillesDe.get(c) ?? [])])];
  const chronique = concepts.includes(IRC) || estDialyse(norm);
  return {
    label, kind: 'pathologie', norm, mots, concepts, familles,
    renal: chronique ? stadeDuLibelle(norm) : null,
    grossesse: /grossesse|enceinte/.test(norm),
    allaitement: /allait/.test(norm),
  };
}

export interface PatientConditions {
  termes: PatientTerm[];
  /** DFG du canal rénal, s'il est connu. */
  dfg: number | null;
  /** Patient dialysé : pathologie listée ou antécédent. */
  dialyse: boolean;
}

export function preparePatient(
  p: {
    pathologies?: string[] | null; allergiesMedicaments?: string[] | null; allergiesAlimentaires?: string[] | null; dfg?: number | null;
    /** Libellés des antécédents non archivés : seule la dialyse y est lue. */
    antecedents?: string[] | null;
  },
  d: ConditionMatcherData,
): PatientConditions {
  const termes: PatientTerm[] = [];
  const vus = new Set<string>();
  const push = (label: string, kind: 'pathologie' | 'allergie') => {
    const t = analysePatientTerm(label, kind, d);
    const k = `${t.kind}|${t.norm}`;
    if (!t.norm || vus.has(k)) return;
    vus.add(k);
    termes.push(t);
  };
  for (const x of p.pathologies ?? []) if (x) push(x, 'pathologie');
  for (const x of p.allergiesMedicaments ?? []) if (x) push(x, 'allergie');
  for (const x of p.allergiesAlimentaires ?? []) if (x) push(x, 'allergie');
  const dialyse = [...(p.pathologies ?? []), ...(p.antecedents ?? [])].some(x => estDialyse(normCondition(x)));
  return { termes, dfg: typeof p.dfg === 'number' && Number.isFinite(p.dfg) ? p.dfg : null, dialyse };
}

// ─── Verdict ─────────────────────────────────────────────────────────────────

/**
 *   oui        → la CI s'applique : carte inchangée.
 *   preciser   → gravité / forme non précisée chez le patient : sévérité de la CI CONSERVÉE.
 *   a_evaluer  → état de contrôle ou stade non précisé : carte « À évaluer ».
 *   non        → pas de correspondance.
 */
export type ConditionVerdict = 'oui' | 'preciser' | 'a_evaluer' | 'non';

export interface ConditionMatch {
  verdict: ConditionVerdict;
  /** « Si non contrôlée », « Si sévère — préciser », « Préciser le stade ou saisir une créatinine ». */
  titre: string | null;
  /** Condition du patient qui a déclenché. */
  par: string | null;
  raison: string;
}

const RANG: Record<ConditionVerdict, number> = { oui: 3, preciser: 2, a_evaluer: 1, non: 0 };
const NON = (raison: string): ConditionMatch => ({ verdict: 'non', titre: null, par: null, raison });
export const TITRE_STADE = 'Préciser le stade ou saisir une créatinine';

/** Stade correspondant à un DFG : ≥ 60 → 2 · 45-59 → 3 (3a) · 30-44 → 3.5 (3b) · 15-29 → 4 · < 15 → 5. */
export function stadeDuDfg(dfg: number): number {
  return dfg >= 60 ? 2 : dfg >= 45 ? 3 : dfg >= 30 ? 3.5 : dfg >= 15 ? 4 : 5;
}
const stadeDuSeuil = (seuil: number) => (seuil >= 60 ? 3 : seuil >= 45 ? 3.5 : seuil >= 30 ? 4 : 5);

function matchRenal(t: PatientTerm, stadeCi: number, dfg: number | null): ConditionMatch {
  if (t.kind !== 'pathologie' || !t.renal) return NON('la pathologie du patient n’est pas une insuffisance rénale chronique');
  const sd = dfg === null ? null : stadeDuDfg(dfg);
  if (t.renal.stade === null && sd === null) {
    return { verdict: 'a_evaluer', titre: TITRE_STADE, par: t.label, raison: 'stade non précisé, DFG inconnu' };
  }
  // « Stade 3 » sans précision face à une CI « 3b » : seul le DFG tranche.
  if (stadeCi === 3.5 && t.renal.stade === 3 && !t.renal.precis && sd === null) {
    return { verdict: 'a_evaluer', titre: TITRE_STADE, par: t.label, raison: 'stade 3 sans précision (3a ou 3b) face à une CI « 3b »' };
  }
  const stade = Math.max(t.renal.stade ?? 0, sd ?? 0);
  return stade >= stadeCi
    ? { verdict: 'oui', titre: null, par: t.label, raison: `stade patient ${stade} ≥ stade CI ${stadeCi}` }
    : NON(`stade patient ${stade} < stade CI ${stadeCi}`);
}

/** Qualificatif sans ses mots d'activité, pour le titre (« active non traitée » → « non traitée »). */
function sansActivite(q: string): string {
  const out = q.replace(/en poussée,?\s*/gi, '').split(/\s+/).filter(w => !ACTIVITE.has(racine(normCondition(w)))).join(' ').trim();
  return out || q;
}

function matchConcept(t: PatientTerm, row: CiConceptRow, d: ConditionMatcherData): ConditionMatch {
  if (t.kind !== 'pathologie') return NON('type croisé (allergie × pathologie)');
  const parConcept = !!row.concept && t.concepts.includes(row.concept);
  const parFamille = !!row.famille && t.familles.includes(row.famille);
  if (!parConcept && !parFamille) return NON('autre concept');
  const lien = parConcept ? `concept « ${row.concept} »` : `famille « ${row.famille} »`;

  const q = (row.qualificatif ? motsDe(sansParentheses(row.qualificatif)) : []).filter(w => !ACTIVITE.has(w));
  // Mots connus du côté du patient : son libellé + le nom du (des) concept(s) qui ont correspondu.
  const membres = row.famille ? FAMILLES[row.famille]?.membres ?? [] : [];
  const cote = new Set([
    ...t.mots,
    ...t.concepts.filter(c => c === row.concept || membres.includes(c)).flatMap(c => d.nomMots.get(c) ?? []),
  ]);

  // Décision 6 — discriminant présent du seul côté de la CI (hors qualificatif déclaré dans la table).
  const discPatient = new Set([...cote].map(discriminantDe));
  const disc = motsDe(sansParentheses(row.libelle)).filter(w => estDiscriminant(w) && !q.includes(w) && !discPatient.has(discriminantDe(w)));
  if (disc.length > 0) return NON(`qualificatif discriminant du seul côté de la CI : ${disc.join(', ')}`);

  // Sprint 2c — infection bénigne ou localisée face à une CI GÉNÉRIQUE « Infection » : « À évaluer ».
  if (row.famille === 'infection' && !parConcept) {
    const benignes = FAMILLES.infection.benignes ?? [];
    const duPatient = t.concepts.filter(c => membres.includes(c));
    if (duPatient.length > 0 && duPatient.every(c => benignes.includes(c))) {
      return { verdict: 'a_evaluer', titre: TITRE_INFECTION_BENIGNE, par: t.label, raison: `${lien} — infection bénigne ou localisée` };
    }
  }
  const qBrut = row.qualificatif ? motsDe(sansParentheses(row.qualificatif)) : [];
  if (qBrut.length === 0) return { verdict: 'oui', titre: null, par: t.label, raison: lien };
  // Sprint 2b-2 — une pathologie listée est ACTIVE par définition : « actif / évolutif / en poussée » est
  // satisfait (sévérité conservée), sauf si le libellé du patient dit lui-même le contraire.
  if (qBrut.some(w => ACTIVITE.has(w))) {
    if (t.mots.some(w => INACTIFS.has(w))) return NON(`${lien} — état opposé chez le patient`);
    if (q.length === 0) return { verdict: 'oui', titre: null, par: t.label, raison: `${lien} — pathologie listée, donc active` };
  }
  const libelleQ = sansActivite(row.qualificatif ?? '');
  for (const [a, b] of EXCLUSIFS) {
    const qa = q.some(w => a.has(w)), qb = q.some(w => b.has(w));
    const pa = t.mots.some(w => a.has(w)), pb = t.mots.some(w => b.has(w));
    if ((qa && pb && !pa) || (qb && pa && !pb)) return NON(`${lien} — forme opposée chez le patient`);
  }
  // Numéro différent des deux côtés (« type 2 » face à « type 1 », « stade 2 » face à « stade 3-4 »).
  const nq = q.filter(w => /^\d/.test(w)), np = t.mots.filter(w => /^\d/.test(w));
  if (nq.length > 0 && np.length > 0 && !np.some(w => nq.includes(w))) return NON(`${lien} — numéro différent chez le patient`);
  if (q.every(w => cote.has(w))) return { verdict: 'oui', titre: null, par: t.label, raison: `${lien} — précision présente chez le patient` };
  if (row.qualificatif_type === 'etat') {
    const maitrise = t.mots.some((w, i) => MAITRISES.has(w) && !NEGATEURS.has(t.mots[i - 1] ?? ''));
    if (maitrise || t.mots.some(w => INACTIFS.has(w))) return NON(`${lien} — état opposé chez le patient`);
    return { verdict: 'a_evaluer', titre: `Si ${libelleQ}`, par: t.label, raison: `${lien} — état « ${libelleQ} » non renseigné` };
  }
  return { verdict: 'preciser', titre: `Si ${libelleQ} — préciser`, par: t.label, raison: `${lien} — « ${libelleQ} » non renseigné, sévérité conservée` };
}

// ── Allergies (décision 8) ──
const MOTS_ALLERGIE = R('allergie', 'allergies', 'intolerance', 'hypersensibilite', 'produit', 'produits', 'prise');
const nomAllergie = (s: string) => motsDe(s).filter(w => !MOTS_ALLERGIE.has(w));
const alternatives = (s: string) => sansParentheses(s).split(/\s\/\s|\/|\sou\s/).map(x => x.trim()).filter(Boolean);
const entreParentheses = (s: string) => [...s.matchAll(/\(([^)]*)\)/g)].flatMap(m => m[1].split(','));
const inclus = (a: string[], b: string[]) => a.length > 0 && a.every(x => b.includes(x));

function matchAllergie(t: PatientTerm, conditionValeur: string, d: ConditionMatcherData): ConditionMatch {
  if (t.kind !== 'allergie') return NON('type croisé (allergie × pathologie)');
  const noms = alternatives(t.label).map(nomAllergie).filter(a => a.length > 0);
  if (noms.length === 0) return NON('allergie sans nom');
  const cibles = [...alternatives(conditionValeur), ...entreParentheses(conditionValeur)].map(nomAllergie).filter(c => c.length > 0);
  if (noms.some(a => cibles.some(c => inclus(a, c) || inclus(c, a)))) {
    return { verdict: 'oui', titre: null, par: t.label, raison: 'même famille ou molécule (mots entiers)' };
  }
  // Molécule du patient ∈ famille nommée par la CI (« Amoxicilline » → « Allergie aux Pénicillines »).
  if (d.allergieFamilles.length > 0) {
    const famPatient = allergyFamilles(t.label, d.allergieFamilles);
    const famCi = alternatives(conditionValeur).flatMap(a => [...(d.allergieNomsFamille.get(nomAllergie(a).join(' ')) ?? [])]);
    const f = famCi.find(x => famPatient.has(x));
    if (f) return { verdict: 'oui', titre: null, par: t.label, raison: `molécule de la famille « ${f} »` };
  }
  return NON('autre famille / molécule');
}

/** Traitement d'une formulation absente de la table : déduit de sa forme, jamais d'une recherche de concept. */
function lignesParDefaut(conditionType: string, conditionValeur: string, cv: string): CiConceptRow[] {
  const base = { condition_norm: cv, condition_valeur: conditionValeur, ordre: 1, libelle: conditionValeur, concept: null, famille: null, qualificatif: null, qualificatif_type: null, stade: null } as const;
  if (conditionType.startsWith('allergie') || ALLERGIE_RE.test(cv)) return [{ ...base, traitement: 'allergie' }];
  if (/allait/.test(cv)) return [{ ...base, traitement: 'allaitement' }];
  if (/grossesse|enceinte/.test(cv)) return [{ ...base, traitement: 'grossesse' }];
  if (/procreer/.test(cv)) return [{ ...base, traitement: 'procreation' }];
  const renal = parseRenalCondition(conditionValeur);
  if (renal) return [{ ...base, traitement: 'renal', concept: IRC, stade: stadeDuSeuil(renal.seuil) }];
  return [{ ...base, traitement: 'sans_concept' }];
}

/**
 * Une contre-indication de la base s'applique-t-elle à ce patient ?
 * Meilleur verdict parmi les conditions du patient et les alternatives de la formulation.
 */
export function matchCondition(
  d: ConditionMatcherData, patient: PatientConditions, conditionType: string, conditionValeur: string,
): ConditionMatch {
  const cv = normCondition(conditionValeur);
  if (!cv) return NON('condition vide');
  const allergieCi = conditionType.startsWith('allergie');
  const rows = allergieCi ? lignesParDefaut(conditionType, conditionValeur, cv)
    : d.rowsByNorm.get(cv) ?? lignesParDefaut(conditionType, conditionValeur, cv);

  // Sprint 2b-2 — CI « Dialyse » : jamais « À évaluer ». Le patient est dialysé (pathologie ou antécédent),
  // ou son DFG est < 15, ou la CI ne le concerne pas.
  if (rows.some(r => r.traitement === 'dialyse')) {
    if (patient.dialyse) return { verdict: 'oui', titre: null, par: 'dialyse', raison: 'patient dialysé (pathologie ou antécédent)' };
    if (patient.dfg !== null && patient.dfg < 15) return { verdict: 'oui', titre: null, par: `DFG ${patient.dfg} mL/min`, raison: 'DFG < 15' };
    return NON('CI de dialyse : patient non dialysé, DFG ≥ 15 ou inconnu');
  }
  let best = NON('aucune condition du patient ne correspond');
  const garder = (m: ConditionMatch) => { if (RANG[m.verdict] > RANG[best.verdict] || best.par === null && m.verdict === 'non') best = m; };
  for (const t of patient.termes) {
    for (const row of rows) {
      switch (row.traitement) {
        case 'allergie': garder(matchAllergie(t, conditionValeur, d)); break;
        case 'age': garder(NON('CI d’âge : traitée par le bloc âge (date de naissance)')); break;
        case 'procreation': garder(NON('CI de procréation : traitée par le bloc grossesse')); break;
        case 'grossesse':
          garder(t.kind === 'pathologie' && t.grossesse ? { verdict: 'oui', titre: null, par: t.label, raison: 'grossesse déclarée en pathologie' }
            : NON('CI de grossesse : la pathologie du patient n’en parle pas'));
          break;
        case 'allaitement':
          garder(t.kind === 'pathologie' && t.allaitement ? { verdict: 'oui', titre: null, par: t.label, raison: 'allaitement déclaré en pathologie' }
            : NON('CI d’allaitement : la pathologie du patient n’en parle pas'));
          break;
        case 'renal': garder(matchRenal(t, Number(row.stade), patient.dfg)); break;
        case 'dialyse': break; // décidée plus haut, indépendamment des libellés
        case 'concept': garder(matchConcept(t, row, d)); break;
        default:
          // contexte / sans_concept : libellé strictement identique (après normalisation) uniquement.
          garder(t.kind === 'pathologie' && t.norm === cv ? { verdict: 'oui', titre: null, par: t.label, raison: 'libellé identique' }
            : NON('formulation sans concept : libellé identique requis'));
      }
    }
  }
  return best;
}

/** Texte placé en tête de la description d'une carte « à préciser » ou « À évaluer ». */
export function conditionTitre(m: ConditionMatch): string | null {
  if (!m.titre || m.verdict === 'oui' || m.verdict === 'non') return null;
  return m.par ? `${m.titre} (patient : « ${m.par.trim()} »)` : m.titre;
}

/**
 * Sprint 2c — incohérence « IRC déclarée / DFG normal » : une insuffisance rénale chronique figure
 * dans les pathologies (sans stade, ou à un stade ≥ 3) alors que le DFG CALCULÉ d'après une
 * créatinine de moins de 12 mois est ≥ 60. Information non bloquante ; null sinon (pas d'IRC
 * déclarée, stade 1 ou 2 — cohérent avec un DFG ≥ 60 —, patient dialysé, DFG inconnu ou < 60).
 */
export function incoherenceIrcDfg(patient: PatientConditions, dfgCalcule: number | null | undefined): string | null {
  if (dfgCalcule === null || dfgCalcule === undefined || dfgCalcule < 60 || patient.dialyse) return null;
  const irc = patient.termes.filter(t => t.kind === 'pathologie' && t.renal !== null);
  if (irc.length === 0 || irc.every(t => t.renal!.stade !== null && t.renal!.stade < 3)) return null;
  return `IRC déclarée mais DFG ${dfgCalcule} : préciser le stade ou vérifier`;
}
