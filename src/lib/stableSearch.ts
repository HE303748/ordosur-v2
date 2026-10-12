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

// ─── Sprint 2d — Clic sûr : la liste ne doit pas avoir bougé juste avant le clic ─────────────
//
// Constat : un bandeau situé au-dessus du champ a changé de hauteur pendant que le pointeur visait
// « Glucophage 850 » ; la page s'est décalée et le clic a ajouté le Glucophage 500. L'identifiant
// porté par la ligne (règle 3) garantit que la ligne CLIQUÉE est ajoutée — pas que c'était la ligne
// VISÉE. Garde-fou : un clic n'est pris en compte que si la liste est immobile depuis ~300 ms ;
// sinon il est ignoré et la ligne est surlignée (le médecin confirme d'un second clic).

/** Durée d'immobilité exigée avant un clic. */
export const CLICK_STABLE_MS = 300;

export interface PositionGuard {
  /** Enregistre l'état observé (position à l'écran + contenu) ; renvoie true s'il a changé. */
  observe(signature: string, now: number): boolean;
  /** Dernier changement observé (null : jamais observé). */
  lastChange(): number | null;
  /** La liste est immobile depuis au moins `windowMs` — un clic peut être pris en compte. */
  isStable(now: number, windowMs?: number): boolean;
  reset(): void;
}

/**
 * Suivi de la position d'une liste. `observe` est appelé à chaque image tant que la liste est
 * ouverte (et juste avant de traiter un clic) : un décalage survenu pendant le geste est donc vu.
 * La PREMIÈRE observation compte comme un changement : une liste qui vient d'apparaître sous le
 * pointeur n'est pas cliquable avant 300 ms.
 */
export function createPositionGuard(): PositionGuard {
  let last: string | null = null;
  let changedAt: number | null = null;
  return {
    observe(signature, now) {
      if (signature === last) return false;
      last = signature;
      changedAt = now;
      return true;
    },
    lastChange: () => changedAt,
    isStable(now, windowMs = CLICK_STABLE_MS) {
      return changedAt !== null && now - changedAt >= windowMs;
    },
    reset() { last = null; changedAt = null; },
  };
}

/** Signature d'une liste : position à l'écran (au pixel près) + identifiants affichés, dans l'ordre. */
export function listSignature(top: number, left: number, ids: readonly string[]): string {
  return `${Math.round(top)}:${Math.round(left)}:${ids.join(',')}`;
}

export type ClickDecision = 'accept' | 'hold';

/**
 * Décision pour un clic sur une ligne. La position est d'abord ré-observée (`signature` = état à
 * l'instant du clic) : un décalage survenu depuis la dernière image est pris en compte.
 */
export function decideClick(guard: PositionGuard, signature: string, now: number, windowMs = CLICK_STABLE_MS): ClickDecision {
  guard.observe(signature, now);
  return guard.isStable(now, windowMs) ? 'accept' : 'hold';
}

/**
 * Décalage de défilement qui garde un élément à la même place à l'écran quand le contenu situé
 * AU-DESSUS de lui change de hauteur (bloc asynchrone qui se charge). 0 si l'élément n'a pas bougé
 * ou si c'est l'utilisateur qui a fait défiler (`scrolledSince`).
 */
export function anchorCompensation(previousTop: number | null, currentTop: number, scrolledSince: boolean): number {
  if (previousTop === null || scrolledSince) return 0;
  const delta = Math.round(currentTop - previousTop);
  return Math.abs(delta) >= 1 ? delta : 0;
}
