// Sprint 2c — Listes de recherche stables : l'élément ajouté est TOUJOURS celui qui est affiché
// sous le pointeur ou la sélection clavier.
//
// Module PUR (testé par stableSearch.test.ts), commun à toutes les recherches : médicaments du
// Vérificateur, formulaire d'ordonnance, traitement de fond, examens, saisie rapide des bilans.
//
// Constat (Sprint 2c) : un clic sur « Glucophage 850 » a ajouté le Glucophage 500. Les listes de
// médicaments étaient relancées à chaque reprise de focus du champ (même frappe) : la liste
// repassait par « Recherche… » puis revenait, parfois dans un autre ordre, pendant que le pointeur
// visait une ligne. Deux autres listes (examens, saisie rapide) mémorisaient la sélection par INDEX.
//
// Trois règles :
//   1. une réponse ne remplace la liste affichée que si la FRAPPE a changé (needsSearch) ;
//   2. la sélection (clic, clavier) porte un IDENTIFIANT stable, jamais une position (pickById,
//      resolveActiveKey, moveActiveKey) ;
//   3. l'identifiant est porté par l'élément affiché (attribut data-*), et c'est la fiche de cet
//      identifiant qui est ajoutée.

/** Frappe normalisée : espaces et casse ignorés (« Gluco » = « gluco  »). */
export function searchKey(term: string | null | undefined): string {
  return (term ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Faut-il lancer une recherche ? Non si la liste affichée répond déjà à cette frappe : reprendre
 * le focus, rouvrir la liste ou revenir sur l'onglet ne la remplace jamais sous le curseur.
 * `shownKey` : frappe à laquelle répond la liste affichée (null = aucune liste).
 */
export function needsSearch(term: string, shownKey: string | null): boolean {
  return shownKey === null || searchKey(term) !== shownKey;
}

/** La fiche portant cet identifiant dans la liste AFFICHÉE, ou null (jamais « la ligne n° i »). */
export function pickById<T extends { id: string }>(items: readonly T[], id: string | null | undefined): T | null {
  if (!id) return null;
  return items.find(x => x.id === id) ?? null;
}

/** Sélection clavier courante : la clé mémorisée si elle est encore affichée, sinon la première. */
export function resolveActiveKey(keys: readonly string[], activeKey: string | null): string | null {
  if (keys.length === 0) return null;
  return activeKey !== null && keys.includes(activeKey) ? activeKey : keys[0];
}

/** Flèche haut / bas : clé voisine de la sélection courante (bornée, sans boucle). */
export function moveActiveKey(keys: readonly string[], activeKey: string | null, delta: 1 | -1): string | null {
  if (keys.length === 0) return null;
  const cur = keys.indexOf(resolveActiveKey(keys, activeKey)!);
  return keys[Math.min(Math.max(cur + delta, 0), keys.length - 1)];
}

/** Position d'une clé dans la liste affichée (pour le rendu uniquement), ou null. */
export function indexOfKey(keys: readonly string[], key: string | null): number | null {
  if (key === null) return null;
  const i = keys.indexOf(key);
  return i === -1 ? null : i;
}
