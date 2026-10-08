import { useState, useEffect, useCallback } from 'react';

/**
 * Persiste la vue active dans le paramètre ?vue= de l'URL.
 * - Lecture au montage  → restaure la vue après un F5.
 * - pushState à chaque navigation → boutons retour/avant fonctionnels.
 * - Vue inconnue ou hors whitelist → defaultView (silencieux).
 */
export function useViewState<T extends string>(
  validViews: readonly T[],
  defaultView: T,
): [T, (v: T) => void] {
  const isView = (v: string | null | undefined): v is T => !!v && (validViews as readonly string[]).includes(v);

  /** Vue portée par le chemin (lien direct « /doctor/patients ») : dernier segment, s'il est valide. */
  const pathView = (): T | null => {
    const seg = window.location.pathname.split('/').filter(Boolean).pop();
    return isView(seg) ? seg : null;
  };

  const read = (): T => {
    const v = new URLSearchParams(window.location.search).get('vue');
    if (isView(v)) return v;
    return pathView() ?? defaultView;
  };

  /** Chemin sans le segment de vue éventuel. */
  const basePath = (): string => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (isView(parts[parts.length - 1])) parts.pop();
    return `/${parts.join('/')}`;
  };

  const [view, setRaw] = useState<T>(read);

  const setView = useCallback((v: T) => {
    if (!(validViews as readonly string[]).includes(v)) return;
    setRaw(v);
    const params = new URLSearchParams(window.location.search);
    params.set('vue', v);
    history.pushState(null, '', `${basePath()}?${params.toString()}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lien direct « /doctor/patients » → normalisé en « /doctor?vue=patients » (même vue, URL
  // canonique : les navigations suivantes ne laissent pas deux vues dans l'adresse).
  useEffect(() => {
    const pv = pathView();
    if (!pv) return;
    const params = new URLSearchParams(window.location.search);
    if (!isView(params.get('vue'))) params.set('vue', pv);
    history.replaceState(null, '', `${basePath()}?${params.toString()}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPop = () => setRaw(read());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [view, setView];
}
