// Sprint 4d-ter / 4d-quater — Dédoublonnage des résultats de recherche, À L'AFFICHAGE uniquement.
//
// Module pur (testé par medDedupe.test.ts). Rien n'est supprimé en base : la même
// spécialité 🇲🇦 existe souvent dans deux sources (« DOLIPRANE 1 G, Comprimé sécable » et
// « DOLIPRANE — COMPRIME SECABLE à 1 G 1 BOITE 10 COMPRIME »), parfois en plusieurs
// conditionnements. On n'en affiche qu'une par (marque, dosage, forme, laboratoire) :
//   1. d'abord une fiche vérifiable par le moteur (ingrédients mappés) ;
//   2. à vérifiabilité égale, la fiche au nom propre (source principale) ;
//   3. puis la plus complète.
// Si seule la fiche « sale » est vérifiable, elle est gardée — et affichée avec un libellé
// propre (medLabel). Deux formes ou deux dosages différents ne sont JAMAIS fusionnés.

import { extractDosage, isCleanFiche } from './medLabel';

export interface DedupMed {
  id: string;
  nom?: string | null;
  nom_commercial?: string | null;
  dci?: string | null;
  dci_canonique?: string | null;
  forme?: string | null;
  dosage?: string | null;
  laboratoire?: string | null;
  ppv_ma?: number | string | null;
  ean?: string | null;
  classe_therapeutique?: string | null;
}

const norm = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^a-z0-9%,./ ]/g, ' ').replace(/\s+/g, ' ').trim();

const DOSAGE_RE = /\d+(?:[.,]\d+)?\s*(?:mg|g|ml|mcg|ui|%)(?:\s*\/\s*\d*(?:[.,]\d+)?\s*(?:mg|g|ml|mcg|ui|%)?)*/;

/** « 1 G » et « 1000 MG » → même clé ; espaces et virgules ignorés. */
function normDosage(s: string): string {
  const d = norm(s).replace(/\s+/g, '').replace(/,/g, '.');
  const g = d.match(/^(\d+(?:\.\d+)?)g$/);
  return g ? `${Math.round(Number(g[1]) * 1000)}mg` : d;
}

// Famille galénique, cherchée dans TOUTE la forme (la seconde source écrit « BUVABLE à
// 100 MG 1 BOITE 12 SACHET »). Ordre significatif : le plus spécifique d'abord.
const FAMILLES: Array<[RegExp, string]> = [
  [/suppositoire|supposito/, 'suppositoire'],
  [/ovule/, 'ovule'],
  [/collyre/, 'collyre'],
  [/injectable|perfusion|ampoule inj/, 'injectable'],
  [/sachet/, 'sachet'],
  [/gelule|capsule/, 'gelule'],
  [/comprime effervescent|effervescent/, 'comprime effervescent'],
  [/orodispersible/, 'comprime orodispersible'],
  [/comprime/, 'comprime'],
  [/sirop/, 'sirop'],
  [/gouttes/, 'gouttes'],
  [/suspension|solution buvable|buvable/, 'buvable'],
  [/creme/, 'creme'],
  [/pommade/, 'pommade'],
  [/\bgel\b|emulgel/, 'gel'],
  [/patch|transdermique/, 'patch'],
  [/spray|inhal|aerosol/, 'inhalation'],
];

/** Famille de forme + libération prolongée ; à défaut, la forme normalisée sans conditionnement. */
export function formeFamille(forme: string | null | undefined, nom?: string | null): string {
  const f = norm(forme);
  const lp = /\blp\b|liberation prolongee|retard/.test(`${f} ${norm(nom)}`) ? ' lp' : '';
  for (const [re, fam] of FAMILLES) if (re.test(f)) return fam + lp;
  return f.split(/ a \d/)[0].split(' ').filter(Boolean).sort().join(' ') + lp;
}

/** Laboratoire : préfixe de prix retiré (« PH: 18.50 dhs - COOPER PHARMA »), 1er mot, alias connus. */
const LAB_ALIAS: Record<string, string> = { gsk: 'glaxo' };
function normLab(lab: string | null | undefined): string {
  const first = norm((lab ?? '').replace(/^\s*PH\s*:.*?-\s*/i, '')).split(' ')[0] ?? '';
  return LAB_ALIAS[first] ?? first;
}

/**
 * Clé de regroupement : marque | dosage | famille de forme | laboratoire.
 * Dosage de la clé : nom (avec unité), sinon nombre nu en fin de nom (« GLUCOPHAGE 1000 »),
 * sinon mention « à 250 » de la forme. Jamais la colonne `dosage` (peu fiable) : une fiche
 * sans dosage fiable n'est fusionnée avec aucune autre.
 */
export function dedupKey(m: DedupMed): string {
  const name = norm(m.nom_commercial || m.nom);
  const inName = name.match(DOSAGE_RE)?.[0] ?? '';
  let brand = (inName ? name.slice(0, name.indexOf(inName)) : name).trim();
  let dosage = normDosage(extractDosage(m) ?? '');
  const bare = !inName ? brand.match(/^(.*\D)\s(\d{2,5})$/) : null;
  if (bare) {
    brand = bare[1].trim();
    if (!dosage) dosage = `${Number(bare[2])}mg`;
  }
  if (!dosage) {
    const inForme = norm(m.forme).match(/ a (\d{2,5})(?: |$)/)?.[1];
    dosage = inForme ? `${Number(inForme)}mg` : `?${m.id}`; // inconnu → jamais fusionné
  }
  return [brand, dosage, formeFamille(m.forme, m.nom_commercial || m.nom), normLab(m.laboratoire)].join('|');
}

function completeness(m: DedupMed): number {
  return [m.dci, m.dci_canonique, m.forme, m.dosage, m.laboratoire, m.ppv_ma, m.ean, m.classe_therapeutique]
    .filter(v => v !== null && v !== undefined && String(v).trim() !== '').length;
}

/** Identifiants appartenant à un groupe de doublons (seuls ceux-là nécessitent de savoir s'ils sont mappés). */
export function duplicateIds(rows: DedupMed[]): string[] {
  const groups = new Map<string, string[]>();
  for (const r of rows) {
    const k = dedupKey(r);
    groups.set(k, [...(groups.get(k) ?? []), r.id]);
  }
  return [...groups.values()].filter(g => g.length > 1).flat();
}

/**
 * Une seule entrée par groupe. Priorité : vérifiable par le moteur (id dans `mappedIds` ;
 * sans cette information, toutes sont considérées équivalentes), puis nom propre, puis la
 * plus complète. L'ordre suit la fiche AFFICHÉE : rang de la recherche du représentant,
 * les fiches au nom propre passant avant les fiches de la seconde source.
 */
export function dedupeMedicaments<T extends DedupMed>(rows: T[], mappedIds?: Set<string>): T[] {
  const best = new Map<string, { row: T; index: number }>();
  const score = (m: T) => (mappedIds?.has(m.id) ? 1000 : 0) + (isCleanFiche(m) ? 100 : 0) + completeness(m);
  rows.forEach((r, index) => {
    const k = dedupKey(r);
    const cur = best.get(k);
    if (!cur || score(r) > score(cur.row)) best.set(k, { row: r, index });
  });
  return [...best.values()]
    .sort((a, b) => (Number(!isCleanFiche(a.row)) - Number(!isCleanFiche(b.row))) || (a.index - b.index))
    .map(x => x.row);
}
