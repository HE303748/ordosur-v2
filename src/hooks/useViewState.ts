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
  const read = (): T => {
    const v = new URLSearchParams(window.location.search).get('vue') as T | null;
    return (v && (validViews as readonly string[]).includes(v)) ? v : defaultView;
  };

  const [view, setRaw] = useState<T>(read);

  const setView = useCallback((v: T) => {
    if (!(validViews as readonly string[]).includes(v)) return;
    setRaw(v);
    const params = new URLSearchParams(window.location.search);
    params.set('vue', v);
    history.pushState(null, '', `${window.location.pathname}?${params.toString()}`);
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
