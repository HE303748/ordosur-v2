import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createViewCache, createActionLock, assertCacheable, isCacheable } from './viewCache';

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

describe('cache de vue : servi puis rafraîchi (stale-while-revalidate)', () => {
  it('1re visite : rien en cache, la requête part, la valeur arrive', async () => {
    const cache = createViewCache();
    const seen: Array<[string, boolean]> = [];
    const fetcher = vi.fn(async () => 'v1');
    await cache.swr('ordonnances:doc:p1', fetcher, (v, fromCache) => seen.push([v, fromCache]), { topics: ['ordonnances'] });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([['v1', false]]);
  });

  it('retour sur la page, donnée récente : contenu immédiat, aucune requête', async () => {
    const cache = createViewCache();
    await cache.swr('agenda:2026-10-05', async () => 'v1', () => {});
    const fetcher = vi.fn(async () => 'v2');
    const seen: Array<[string, boolean]> = [];
    await cache.swr('agenda:2026-10-05', fetcher, (v, c) => seen.push([v, c]));
    expect(fetcher).not.toHaveBeenCalled();
    expect(seen).toEqual([['v1', true]]);
  });

  it('retour sur la page, donnée ancienne : servie tout de suite PUIS rafraîchie', async () => {
    let t = 0;
    const cache = createViewCache(() => t);
    await cache.swr('agenda:w', async () => 'v1', () => {});
    t = 120_000; // 2 minutes plus tard
    const d = deferred<string>();
    const seen: Array<[string, boolean]> = [];
    const p = cache.swr('agenda:w', () => d.promise, (v, c) => seen.push([v, c]), { maxAgeMs: 60_000 });
    expect(seen).toEqual([['v1', true]]); // immédiat, avant la réponse réseau
    d.resolve('v2');
    await p;
    expect(seen).toEqual([['v1', true], ['v2', false]]);
    expect(cache.peek('agenda:w')).toBe('v2');
  });

  it('un échec du rafraîchissement ne remplace jamais la valeur affichée', async () => {
    const cache = createViewCache();
    await cache.swr('suivi:doc', async () => 'v1', () => {}, { topics: ['examens'] });
    cache.invalidateTopic('examens');
    await expect(cache.swr('suivi:doc', async () => { throw new Error('réseau'); }, () => {})).rejects.toThrow('réseau');
    expect(cache.peek('suivi:doc')).toBe('v1');
    expect(cache.isStale('suivi:doc')).toBe(true);
  });
});

describe('invalidation après mutation (sujets de lib/dataSync)', () => {
  it('une mutation publiée périme les entrées du sujet, qui restent affichables', async () => {
    const cache = createViewCache();
    await cache.swr('demandes:p1', async () => ['d1'], () => {}, { topics: ['examens'] });
    await cache.swr('ordonnances:doc', async () => ['o1'], () => {}, { topics: ['ordonnances', 'examens'] });
    await cache.swr('agenda:w', async () => ['r1'], () => {}, { topics: ['rendez_vous'] });
    expect(cache.invalidateTopic('examens')).toBe(2);
    expect(cache.isStale('demandes:p1')).toBe(true);
    expect(cache.isStale('ordonnances:doc')).toBe(true);
    expect(cache.isStale('agenda:w')).toBe(false);
    expect(cache.peek('demandes:p1')).toEqual(['d1']);
  });
  it('après invalidation, la visite suivante refait la requête et affiche la valeur à jour', async () => {
    const cache = createViewCache();
    await cache.swr('demandes:p1', async () => ['en_attente'], () => {}, { topics: ['examens'] });
    cache.invalidateTopic('examens'); // « Marquer réalisé »
    const seen: Array<[string[], boolean]> = [];
    const fetcher = vi.fn(async () => ['realise']);
    await cache.swr('demandes:p1', fetcher, (v, c) => seen.push([v, c]), { topics: ['examens'] });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([[['en_attente'], true], [['realise'], false]]);
    expect(cache.isStale('demandes:p1')).toBe(false);
  });
  it('drop / clear (déconnexion)', async () => {
    const cache = createViewCache();
    cache.set('demandes:p1', 1);
    cache.set('demandes:p2', 2);
    cache.set('agenda:w', 3);
    cache.drop('demandes:');
    expect(cache.size()).toBe(1);
    cache.clear();
    expect(cache.size()).toBe(0);
  });
});

describe('plus de double appel réseau', () => {
  it('trois composants demandent la même donnée en même temps : UNE seule requête', async () => {
    const cache = createViewCache();
    const d = deferred<string[]>();
    const fetcher = vi.fn(() => d.promise);
    const a = cache.fetch('demandes:p1', fetcher, ['examens']);
    const b = cache.fetch('demandes:p1', fetcher, ['examens']);
    const c = cache.swr('demandes:p1', fetcher, () => {}, { topics: ['examens'] });
    d.resolve(['d1']);
    expect(await a).toEqual(['d1']);
    expect(await b).toEqual(['d1']);
    expect(await c).toEqual(['d1']);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('après « réalisé » : les abonnés qui rechargent ensemble ne font qu’un appel', async () => {
    const cache = createViewCache();
    await cache.fetch('demandes:p1', async () => ['en_attente'], ['examens']);
    cache.invalidateTopic('examens');
    const fetcher = vi.fn(async () => ['realise']);
    await Promise.all([1, 2, 3].map(() => cache.swr('demandes:p1', fetcher, () => {}, { topics: ['examens'], force: true })));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('des clés différentes ne se bloquent pas', async () => {
    const cache = createViewCache();
    const f = vi.fn(async () => 1);
    await Promise.all([cache.fetch('demandes:p1', f), cache.fetch('demandes:p2', f)]);
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe('garde anti double-clic', () => {
  it('double clic sur « Télécharger PDF » : un seul PDF généré', async () => {
    const lock = createActionLock();
    const d = deferred<string>();
    const generate = vi.fn(() => d.promise);
    const first = lock.run('pdf', generate);
    const second = lock.run('pdf', generate);
    expect(lock.isBusy('pdf')).toBe(true);
    expect(lock.isBusy()).toBe(true);
    d.resolve('ordonnance.pdf');
    expect(await first).toBe('ordonnance.pdf');
    expect(await second).toBe('ordonnance.pdf');
    expect(generate).toHaveBeenCalledTimes(1);
    expect(lock.isBusy('pdf')).toBe(false);
  });
  it('double clic sur « Enregistrer » : un seul enregistrement, même en cas d’échec ; puis nouvel essai possible', async () => {
    const lock = createActionLock();
    const save = vi.fn(async () => { throw new Error('réseau'); });
    const r = await Promise.allSettled([lock.run('save', save), lock.run('save', save)]);
    expect(save).toHaveBeenCalledTimes(1);
    expect(r.every(x => x.status === 'rejected')).toBe(true);
    const retry = vi.fn(async () => 'ok');
    expect(await lock.run('save', retry)).toBe('ok');
    expect(retry).toHaveBeenCalledTimes(1);
  });
  it('des actions différentes restent indépendantes', async () => {
    const lock = createActionLock();
    const f = vi.fn(async () => 1);
    await Promise.all([lock.run('print', f), lock.run('share', f)]);
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe('les données du moteur de sécurité ne viennent JAMAIS du cache', () => {
  const ENGINE_KEYS = [
    'fond:p1', 'traitements_chroniques:p1', 'antecedents:p1', 'allergies:p1', 'grossesse:p1',
    'regles_antecedents', 'regles_allergies', 'regles_doublons', 'doublon_classes', 'teratogenes_majeurs',
    'contraindications', 'contre-indications', 'moteur:rules', 'interaction_db',
  ];
  it('le cache refuse ces clés, quelle que soit la méthode', async () => {
    const cache = createViewCache();
    for (const k of ENGINE_KEYS) {
      expect(isCacheable(k)).toBe(false);
      expect(() => assertCacheable(k)).toThrow(/moteur de sécurité/);
      expect(() => cache.set(k, 1)).toThrow();
      expect(() => cache.fetch(k, async () => 1)).toThrow();
      await expect(cache.swr(k, async () => 1, () => {})).rejects.toThrow();
    }
    expect(cache.size()).toBe(0);
  });
  it('les clés de vue sont acceptées', () => {
    for (const k of ['ordonnances:doc:', 'demandes:p1', 'agenda:2026-10-05', 'suivi:doc', 'patient_ordonnances:p1', 'noms_medecins']) {
      expect(isCacheable(k)).toBe(true);
    }
  });
  it('les chargeurs et modules du moteur n’importent pas le cache', () => {
    const files = [
      'src/lib/traitementsChroniques.ts', 'src/lib/antecedents.ts', 'src/lib/antecedentEngine.ts',
      'src/lib/allergyClassEngine.ts', 'src/lib/duplicateEngine.ts', 'src/lib/pregnancyStatus.ts',
      'src/lib/derogation.ts', 'src/lib/ordonnanceVerification.ts', 'src/lib/safetyGuards.ts', 'src/lib/fetchAllRows.ts',
    ];
    for (const f of files) expect(readFileSync(f, 'utf8')).not.toMatch(/viewCache/);
  });
  it('dans le tableau de bord, le rechargement du fond, des antécédents, des règles et l’analyse n’utilisent pas le cache', () => {
    const src = readFileSync('src/pages/DoctorDashboard.tsx', 'utf8');
    const start = src.indexOf('const refreshFond = useCallback');
    const end = src.indexOf('// ── Data loaders');
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const engine = src.slice(start, end);
    // Le bloc contient bien les chargeurs du moteur et l'analyse…
    for (const needle of ['loadTraitements(pid, true)', 'loadAntecedents(', 'regles_antecedents', 'regles_allergies', 'regles_doublons', 'teratogenes_majeurs', 'const runCheck = async']) {
      expect(engine).toContain(needle);
    }
    // … et aucune référence au cache de vue.
    expect(engine).not.toMatch(/viewCache|cachedFetch|\.swr\(/);
  });
});
