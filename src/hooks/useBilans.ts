import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDataSync } from '../lib/dataSync';
import { viewCache } from '../lib/viewCache';
import type { ExamRef } from '../lib/examSearch';
import { loadExamRefs } from '../lib/examensApi';
import { loadDoctorLastUnits, loadPatientResultats } from '../lib/resultatsApi';
import type { ResultatExamen } from '../lib/resultatsLogic';

/**
 * Résultats d'examens d'un patient, rechargés à chaque changement publié (« bilans »).
 * Cache de VUE (Sprint P) : affichage uniquement. Le moteur de sécurité ne lit jamais ce
 * cache — s'il doit un jour utiliser un résultat, il aura son propre chargeur.
 */
export function usePatientResultats(patientId: string | null | undefined) {
  const key = patientId ? `bilans:${patientId}` : null;
  const [resultats, setResultats] = useState<ResultatExamen[]>(() => (key ? viewCache.peek<ResultatExamen[]>(key) ?? [] : []));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const reload = useCallback(async (force = false) => {
    if (!patientId || !key) { setResultats([]); return; }
    const s = ++seq.current;
    try {
      await viewCache.swr<ResultatExamen[]>(
        key, () => loadPatientResultats(patientId),
        rows => { if (s === seq.current) { setResultats(rows); setError(null); setLoading(false); } },
        { topics: ['bilans'], maxAgeMs: 30_000, force },
      );
    } catch (e) {
      if (s !== seq.current) return;
      console.error('[bilans] chargement des résultats :', e);
      setError('Résultats indisponibles');
    } finally {
      if (s === seq.current) setLoading(false);
    }
  }, [patientId, key]);

  useEffect(() => {
    const cached = key ? viewCache.peek<ResultatExamen[]>(key) : undefined;
    setResultats(cached ?? []);
    setError(null);
    if (!patientId) { setLoading(false); return; }
    setLoading(!cached);
    void reload();
  }, [patientId, key, reload]);

  useDataSync(['bilans'], () => { void reload(); });

  return { resultats, loading, error, reload: () => reload(true) };
}

/** Référentiel des examens seul (mis en cache par session par loadExamRefs). */
export function useExamRefs(enabled = true): ExamRef[] {
  const [refs, setRefs] = useState<ExamRef[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadExamRefs().then(r => { if (!cancelled) setRefs(r); }).catch(e => console.error('[bilans] référentiel :', e));
    return () => { cancelled = true; };
  }, [enabled]);
  return refs;
}

/** Dernière unité saisie par le médecin connecté, par examen (unité proposée par défaut). */
export function useLastUnits(enabled = true): Record<string, string> {
  const { doctorProfile } = useAuth();
  const doctorId = doctorProfile?.id ?? null;
  const key = doctorId ? `unites-saisie:${doctorId}` : null;
  const [units, setUnits] = useState<Record<string, string>>(() => (key ? viewCache.peek<Record<string, string>>(key) ?? {} : {}));
  const load = useCallback(() => {
    if (!enabled || !doctorId || !key) return;
    void viewCache.swr<Record<string, string>>(key, () => loadDoctorLastUnits(doctorId), setUnits, { topics: ['bilans'], maxAgeMs: 60_000 })
      .catch(() => { /* confort : l'unité de référence sera proposée */ });
  }, [enabled, doctorId, key]);
  useEffect(() => { load(); }, [load]);
  useDataSync(['bilans'], load, { onFocus: false });
  return units;
}
