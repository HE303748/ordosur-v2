// Sprint 5c — Fluidité : placement des listes de suggestions et position de défilement.
// Module PUR (testé par examFlow.test.ts) ; les hooks React qui l'utilisent sont dans
// src/hooks/useAnchoredPopover.ts et DoctorDashboard.

export interface AnchorRect { top: number; bottom: number; left: number; width: number }

export interface PopoverPlacement {
  placement: 'bottom' | 'top';
  left: number;
  width: number;
  maxHeight: number;
  /** Renseigné si placement = 'bottom' (distance au haut de la fenêtre). */
  top?: number;
  /** Renseigné si placement = 'top' (distance au bas de la fenêtre). */
  bottom?: number;
}

/** Hauteur d'une ligne de suggestion (≈ 48 px) : 8 lignes souhaitées, 6 au minimum. */
export const POPOVER_DESIRED = 400;
export const POPOVER_MIN = 300;

/**
 * Où ouvrir une liste de suggestions ancrée à un champ, sans jamais la couper :
 *   • sous le champ s'il reste la place d'au moins 6 résultats ;
 *   • sinon au-dessus si la place y est plus grande ;
 *   • la hauteur est bornée par la place disponible (défilement interne au-delà).
 */
export function placePopover(
  anchor: AnchorRect, viewportHeight: number, viewportWidth: number,
  opts: { desired?: number; min?: number; gap?: number; margin?: number } = {},
): PopoverPlacement {
  const desired = opts.desired ?? POPOVER_DESIRED;
  const min = opts.min ?? POPOVER_MIN;
  const gap = opts.gap ?? 4;
  const margin = opts.margin ?? 8;
  const below = viewportHeight - anchor.bottom - gap - margin;
  const above = anchor.top - gap - margin;
  const width = Math.min(anchor.width, viewportWidth - 2 * margin);
  const left = Math.max(margin, Math.min(anchor.left, viewportWidth - margin - width));
  const clamp = (space: number) => Math.max(120, Math.min(desired, space));
  if (below >= min || below >= above) {
    return { placement: 'bottom', left, width, top: anchor.bottom + gap, maxHeight: clamp(below) };
  }
  return { placement: 'top', left, width, bottom: viewportHeight - anchor.top + gap, maxHeight: clamp(above) };
}

/**
 * Position de défilement à l'ouverture d'une vue : en haut de page pour une navigation
 * normale ; la position mémorisée quand on revient par le bouton « Précédent » du navigateur.
 */
export function scrollTargetOnViewChange(viaHistory: boolean, saved: number | undefined): number {
  return viaHistory && typeof saved === 'number' && saved > 0 ? saved : 0;
}
