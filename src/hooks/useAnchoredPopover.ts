import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';
import { placePopover } from '../lib/uiPlacement';

/**
 * Sprint 5c — Style d'une liste de suggestions rendue dans un portail (document.body) et
 * ancrée à un champ : jamais coupée par un cadre « overflow », ouverte vers le haut si la
 * place manque, repositionnée au défilement et au redimensionnement.
 * Renvoie null tant que la liste est fermée ou que le champ n'est pas mesurable.
 */
export function useAnchoredPopover(anchorRef: RefObject<HTMLElement>, open: boolean): CSSProperties | null {
  const [style, setStyle] = useState<CSSProperties | null>(null);

  const update = useCallback(() => {
    const el = anchorRef.current;
    if (!el) { setStyle(null); return; }
    const r = el.getBoundingClientRect();
    const vv = window.visualViewport;
    // Clavier virtuel ouvert (mobile) : la hauteur utile est celle de la fenêtre visible.
    const vh = vv ? vv.height + vv.offsetTop : window.innerHeight;
    const p = placePopover({ top: r.top, bottom: r.bottom, left: r.left, width: r.width }, vh, window.innerWidth);
    setStyle({
      position: 'fixed', left: p.left, width: p.width, maxHeight: p.maxHeight,
      ...(p.placement === 'bottom' ? { top: p.top } : { bottom: window.innerHeight - vh + (p.bottom ?? 0) }),
    });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (open) update(); else setStyle(null);
  }, [open, update]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, [open, update]);

  return open ? style : null;
}
