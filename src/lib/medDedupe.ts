// Sprint 4d-ter — Dédoublonnage des résultats de recherche, À L'AFFICHAGE uniquement.
//
// Module pur (testé par medDedupe.test.ts). Rien n'est supprimé en base : la même
// spécialité 🇲🇦 existe parfois dans deux sources (« DOLIPRANE 1 G, Comprimé sécable » et
// « DOLIPRANE COMPRIME SECABLE à 1 G 1 BOITE 10 COMPRIME »). On n'en affiche qu'une :
// d'abord celle que le moteur peut vérifier (ingrédients mappés), puis la plus complète.
//
// Clé volontairement prudente (nom de marque + dosage + forme + laboratoire) : deux formes
// différentes (comprimé / effervescent / suppositoire) ne sont JAMAIS fusionnées.

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

const DOSAGE_RE = /\d+(?:[.,]\d+)?\s*(?:mg|g|ml|mcg|µg|ui|%)(?:\s*\/\s*\d*(?:[.,]\d+)?\s*(?:mg|g|ml|mcg|ui|%)?)*/;

function normDosage(s: string): string {
  return s.replace(/\s+/g, '').replace(/,/g, '.');
}

/** Clé de regroupement : marque | dosage | forme | laboratoire. */
export function dedupKey(m: DedupMed): string {
  const name = norm(m.nom_commercial || m.nom);
  const inName = name.match(DOSAGE_RE)?.[0] ?? '';
  const brand = (inName ? name.slice(0, name.indexOf(inName)) : name).trim();
  const dosage = normDosage(norm(m.dosage) || inName);
  // Forme : la seconde source ajoute « à 1 G 1 BOITE 10 COMPRIME » → coupé au 1er « à <nombre> ».
  const forme = norm(m.forme).split(/ a \d/)[0].split(' ').filter(Boolean).sort().join(' ');
  const lab = norm(m.laboratoire).split(' ')[0] ?? '';
  return [brand, dosage, forme, lab].join('|');
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
 * Une seule entrée par groupe, à la position de la première occurrence (l'ordre de la
 * recherche est conservé). Priorité : vérifiable par le moteur (id dans `mappedIds`), puis
 * la plus complète, puis la première renvoyée.
 */
export function dedupeMedicaments<T extends DedupMed>(rows: T[], mappedIds?: Set<string>): T[] {
  const best = new Map<string, T>();
  const order: string[] = [];
  const score = (m: T) => (mappedIds?.has(m.id) ? 100 : 0) + completeness(m);
  for (const r of rows) {
    const k = dedupKey(r);
    const cur = best.get(k);
    if (!cur) { best.set(k, r); order.push(k); continue; }
    if (score(r) > score(cur)) best.set(k, r);
  }
  return order.map(k => best.get(k)!);
}
