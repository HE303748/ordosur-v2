// Sprint 2c — Saisie des pathologies normalisée.
//
// Module PUR (testé par pathologySearch.test.ts). Recherche dans pathologies_curees avec la MÊME
// normalisation que le moteur (conditionMatcher : sans accents, sans casse, mots vides ignorés,
// chiffres romains = chiffres arabes) : « Diabete type 1 », « Diabète type I » et « diabète de
// type 1 » proposent tous « Diabète de type 1 » en tête.
//
// Le texte libre reste possible. Un libellé que le moteur ne relie à aucun concept est signalé
// (« Non reconnu par le moteur ») avec la meilleure suggestion du référentiel.

import { analysePatientTerm, estDiscriminant, motsDe, normCondition, type ConditionMatcherData, type PathologieCuree } from './conditionMatcher';

interface Indexed { nom: string; nomMots: string[]; synMots: string[][] }

const indexCache = new WeakMap<readonly PathologieCuree[], Indexed[]>();
function indexOf(curees: readonly PathologieCuree[]): Indexed[] {
  let idx = indexCache.get(curees);
  if (!idx) {
    idx = curees.filter(c => !!c.nom_fr).map(c => ({
      nom: c.nom_fr,
      nomMots: motsDe(c.nom_fr),
      synMots: (c.synonymes ?? '').split(',').map(s => motsDe(s)).filter(m => m.length > 0),
    }));
    indexCache.set(curees, idx);
  }
  return idx;
}

/** Chaque mot de la frappe est un mot — ou un début de mot (« insuf ren ») — de la cible. */
function couvre(q: string[], cible: string[]): boolean {
  return q.every(w => cible.some(c => c.startsWith(w)));
}
/** La frappe est le DÉBUT de la cible, mot à mot (« diab typ » → « Diabète de type 1 »). */
function debute(q: string[], cible: string[]): boolean {
  return q.length <= cible.length && q.every((w, i) => cible[i].startsWith(w));
}

const RANG_IDENTIQUE = 0, RANG_DEBUT = 1, RANG_SYNONYME = 2;

/** Rang d'une pathologie pour une frappe : plus petit = meilleur ; null = ne correspond pas. */
function rang(q: string[], x: Indexed): number | null {
  const cle = q.join(' ');
  if (x.nomMots.join(' ') === cle) return RANG_IDENTIQUE;              // nom identique (aux accents, mots vides et chiffres près)
  if (debute(q, x.nomMots)) return RANG_DEBUT;                         // début du nom
  if (x.synMots.some(s => s.join(' ') === cle)) return RANG_SYNONYME;  // synonyme identique (« HTA », « BPCO »)
  if (couvre(q, x.nomMots)) return 3;                                  // tous les mots, dans le nom
  if (x.synMots.some(s => couvre(q, s))) return 4;                     // tous les mots, dans un synonyme
  return null;
}

/**
 * Pathologies du référentiel correspondant à la frappe, la meilleure en tête (nom identique,
 * synonyme identique, début du nom, mots contenus, synonymes), puis par longueur et ordre
 * alphabétique : l'ordre est déterministe, il ne dépend que de la frappe.
 */
export function searchPathologies(query: string, curees: readonly PathologieCuree[], max = 30): string[] {
  const q = motsDe(query);
  if (q.length === 0 || q.join('').length < 2) return [];
  const brut = normCondition(query);
  const out: Array<{ nom: string; r: number; e: number; n: number }> = [];
  for (const x of indexOf(curees)) {
    const r = rang(q, x);
    // À rang égal, l'écriture exacte passe devant sa variante (« Vertiges » avant « Vertige »).
    if (r !== null) out.push({ nom: x.nom, r, e: normCondition(x.nom) === brut ? 0 : 1, n: x.nomMots.length });
  }
  return out.sort((a, b) => a.r - b.r || a.e - b.e || a.n - b.n || a.nom.localeCompare(b.nom, 'fr')).slice(0, max).map(x => x.nom);
}

/** Le moteur relie-t-il ce libellé à un concept (ou à une famille, un stade rénal, une grossesse) ? */
export function estReconnuParLeMoteur(label: string, d: ConditionMatcherData): boolean {
  const t = analysePatientTerm(label, 'pathologie', d);
  if (t.kind === 'allergie') return true; // une « Allergie à … » saisie ici est traitée comme une allergie
  return t.concepts.length > 0 || t.familles.length > 0 || t.renal !== null || t.grossesse || t.allaitement;
}

/**
 * Meilleure suggestion du référentiel pour un libellé non reconnu : la recherche sur le libellé
 * entier ; à défaut, la plus longue suite de mots du libellé qui est EXACTEMENT un nom ou un
 * synonyme du référentiel (« crise d'asthme nocturne » → « Asthme »), si elle est unique.
 * Jamais une pathologie voisine par un seul mot commun (« cardiopathie hypertensive » ne suggère
 * pas « Cardiopathie ischémique »), jamais si un mot écarté change l'identité de la maladie
 * (« hypertension artérielle pulmonaire » ne suggère pas « Hypertension artérielle »). null sinon.
 */
export function suggestionPathologie(label: string, curees: readonly PathologieCuree[]): string | null {
  const direct = searchPathologies(label, curees, 1)[0];
  if (direct) return direct;
  const mots = motsDe(label);
  if (mots.some(estDiscriminant)) return null;
  const idx = indexOf(curees);
  for (let n = mots.length - 1; n >= 1; n--) {
    const trouves = new Set<string>();
    for (let i = 0; i + n <= mots.length; i++) {
      const q = mots.slice(i, i + n);
      if (q.join('').length < 4) continue;
      for (const x of idx) { const r = rang(q, x); if (r === RANG_IDENTIQUE || r === RANG_SYNONYME) trouves.add(x.nom); }
    }
    if (trouves.size === 1) return [...trouves][0];
    if (trouves.size > 1) return null; // ambigu : au médecin de choisir dans la liste
  }
  return null;
}

export interface PathologieNonReconnue { label: string; suggestion: string | null }

/** Libellés que le moteur ne relie à aucun concept, avec la meilleure suggestion du référentiel. */
export function pathologiesNonReconnues(labels: readonly string[], d: ConditionMatcherData, curees: readonly PathologieCuree[]): PathologieNonReconnue[] {
  return labels.filter(l => l.trim() !== '' && !estReconnuParLeMoteur(l, d)).map(label => {
    const s = suggestionPathologie(label, curees);
    return { label, suggestion: s && s !== label ? s : null };
  });
}

export const BADGE_NON_RECONNU = 'Non reconnu par le moteur — choisir dans la liste ?';
