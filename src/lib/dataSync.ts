// Synchronisation légère entre vues : une vue qui modifie une donnée publie un sujet,
// les vues qui l'affichent rechargent (requête filtrée habituelle). Aucun cache global :
// chaque vue garde ses propres requêtes, on ne fait que dire « c'est périmé ».

import { useEffect, useRef } from 'react';

export type SyncTopic = 'ordonnances' | 'rendez_vous' | 'antecedents' | 'examens';

const bus = new EventTarget();

/** À appeler après une écriture réussie en base. */
export function notifyDataChanged(topic: SyncTopic): void {
  bus.dispatchEvent(new Event(topic));
}

/** Délai minimal entre deux rechargements déclenchés par le retour sur l'onglet. */
const FOCUS_THROTTLE_MS = 30_000;

/**
 * Appelle `onChange` à chaque publication d'un des sujets et, si `onFocus` (défaut),
 * quand l'onglet du navigateur redevient visible (au plus une fois toutes les 30 s).
 * `onChange` peut changer à chaque rendu : la dernière version est toujours utilisée.
 */
export function useDataSync(
  topics: SyncTopic[],
  onChange: () => void,
  opts: { onFocus?: boolean } = {},
): void {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;
  const onFocus = opts.onFocus !== false;
  const topicsKey = topics.join(',');

  useEffect(() => {
    const handler = () => cbRef.current();
    const list = topicsKey ? topicsKey.split(',') : [];
    list.forEach(t => bus.addEventListener(t, handler));

    let lastFocus = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastFocus < FOCUS_THROTTLE_MS) return;
      lastFocus = Date.now();
      cbRef.current();
    };
    if (onFocus) document.addEventListener('visibilitychange', onVisible);

    return () => {
      list.forEach(t => bus.removeEventListener(t, handler));
      if (onFocus) document.removeEventListener('visibilitychange', onVisible);
    };
  }, [topicsKey, onFocus]);
}
