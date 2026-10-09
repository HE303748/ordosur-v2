// Sprint P — Cache des données de VUE entre deux navigations (stale-while-revalidate).
//
// On revient sur une page déjà vue → contenu immédiat, rafraîchi en arrière-plan.
// L'invalidation reste pilotée par le mécanisme de synchronisation existant
// (lib/dataSync : notifyDataChanged(topic) → invalidateTopic(topic)).
// Deux appels simultanés pour la même clé partagent UNE requête (plus de double appel).
//
// ⚠️ EXCEPTION SÉCURITÉ : les données qui alimentent l'analyse (traitement de fond,
// antécédents, allergies, statut grossesse, règles, contre-indications, tératogènes) ne
// passent JAMAIS par ce cache. assertCacheable refuse ces clés ; le moteur garde ses
// propres chargeurs, relancés avant chaque analyse.
//
// Module PUR (ni React ni Supabase) : testé par viewCache.test.ts.

const ENGINE_KEY_RE = /fond|traitement|antecedent|allerg|grossesse|regle|teratogen|contraindication|contre[-_ ]?indication|doublon|interaction_db|moteur/i;

/** Lève une erreur si la clé désigne une donnée du moteur de sécurité. */
export function assertCacheable(key: string): void {
  if (ENGINE_KEY_RE.test(key)) {
    throw new Error(`viewCache : « ${key} » alimente le moteur de sécurité et ne doit jamais être mis en cache`);
  }
}

export function isCacheable(key: string): boolean {
  return !ENGINE_KEY_RE.test(key);
}

interface Entry<T = unknown> { value: T; at: number; topics: string[]; stale: boolean }

export interface ViewCache {
  /** Valeur en cache (même périmée), ou undefined. */
  peek<T>(key: string): T | undefined;
  /** La valeur doit être rafraîchie (absente, invalidée ou trop ancienne). */
  isStale(key: string, maxAgeMs?: number): boolean;
  set<T>(key: string, value: T, topics?: string[]): void;
  /** Marque périmées toutes les entrées liées à ce sujet (elles restent affichables). */
  invalidateTopic(topic: string): number;
  /** Supprime les entrées dont la clé commence par ce préfixe. */
  drop(prefix: string): void;
  clear(): void;
  /**
   * Requête partagée : deux appels simultanés pour la même clé n'émettent qu'UNE requête.
   * Le résultat est mis en cache ; un échec ne remplace jamais la valeur déjà en cache.
   */
  fetch<T>(key: string, fetcher: () => Promise<T>, topics?: string[]): Promise<T>;
  /**
   * Stale-while-revalidate : `onData` reçoit tout de suite la valeur en cache (si elle
   * existe), puis la valeur fraîche si un rafraîchissement est nécessaire.
   * Résout quand la valeur à jour est connue.
   */
  swr<T>(key: string, fetcher: () => Promise<T>, onData: (value: T, fromCache: boolean) => void,
    opts?: { topics?: string[]; maxAgeMs?: number; force?: boolean }): Promise<T>;
  size(): number;
}

export function createViewCache(now: () => number = Date.now): ViewCache {
  const entries = new Map<string, Entry>();
  const inflight = new Map<string, Promise<unknown>>();

  const cache: ViewCache = {
    peek<T>(key: string) {
      return entries.get(key)?.value as T | undefined;
    },
    isStale(key, maxAgeMs = 60_000) {
      const e = entries.get(key);
      return !e || e.stale || now() - e.at > maxAgeMs;
    },
    set(key, value, topics = []) {
      assertCacheable(key);
      entries.set(key, { value, at: now(), topics, stale: false });
    },
    invalidateTopic(topic) {
      let n = 0;
      for (const e of entries.values()) {
        if (e.topics.includes(topic) && !e.stale) { e.stale = true; n++; }
      }
      return n;
    },
    drop(prefix) {
      for (const k of [...entries.keys()]) if (k.startsWith(prefix)) entries.delete(k);
    },
    clear() {
      entries.clear();
      inflight.clear();
    },
    fetch<T>(key: string, fetcher: () => Promise<T>, topics: string[] = []) {
      assertCacheable(key);
      const running = inflight.get(key) as Promise<T> | undefined;
      if (running) return running;
      const p = (async () => {
        try {
          const value = await fetcher();
          entries.set(key, { value, at: now(), topics, stale: false });
          return value;
        } finally {
          inflight.delete(key);
        }
      })();
      inflight.set(key, p);
      return p;
    },
    async swr<T>(key: string, fetcher: () => Promise<T>, onData: (value: T, fromCache: boolean) => void,
      opts: { topics?: string[]; maxAgeMs?: number; force?: boolean } = {}) {
      assertCacheable(key);
      const cached = entries.get(key);
      if (cached) onData(cached.value as T, true);
      if (cached && !opts.force && !cache.isStale(key, opts.maxAgeMs)) return cached.value as T;
      const fresh = await cache.fetch(key, fetcher, opts.topics ?? []);
      onData(fresh, false);
      return fresh;
    },
    size() {
      return entries.size;
    },
  };
  return cache;
}

/** Cache de la session (vidé à la déconnexion). */
export const viewCache = createViewCache();

// ─── Garde anti double-clic ──────────────────────────────────────────────────

export interface ActionLock {
  /**
   * Exécute `fn` sauf si une action portant la même clé est déjà en cours : le second
   * appel reçoit la promesse du premier (jamais 2 PDF ni 2 enregistrements).
   */
  run<T>(key: string, fn: () => Promise<T>): Promise<T>;
  isBusy(key?: string): boolean;
}

export function createActionLock(): ActionLock {
  const running = new Map<string, Promise<unknown>>();
  return {
    run<T>(key: string, fn: () => Promise<T>) {
      const cur = running.get(key) as Promise<T> | undefined;
      if (cur) return cur;
      const p = (async () => {
        try { return await fn(); } finally { running.delete(key); }
      })();
      running.set(key, p);
      return p;
    },
    isBusy(key) {
      return key === undefined ? running.size > 0 : running.has(key);
    },
  };
}
