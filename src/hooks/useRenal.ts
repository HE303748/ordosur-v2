import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Patient } from '../lib/supabase';
import { fetchAllRows } from '../lib/fetchAllRows';
import { useDataSync } from '../lib/dataSync';
import type { ExamRef } from '../lib/examSearch';
import { toIsoDate } from '../lib/examRequest';
import { loadExamRefs } from '../lib/examensApi';
import { renalStatus, type CreatinineResult, type DfgLaboResult, type RegleRenale, type RenalClasse, type RenalStatus } from '../lib/renalEngine';

// Sprint 6B — Données du canal « fonction rénale » du moteur de sécurité.
//
// ⚠️ DONNÉES DU MOTEUR : jamais le cache de vue (lib/viewCache). Les créatinines du patient
// sont relues en base au changement de patient, à chaque saisie de résultat (sujet
// « bilans ») et juste avant chaque verdict (refresh). Échec → fonction rénale « inconnue ».

type RenalRow = CreatinineResult & { examen_code: string };

/**
 * Dernières créatinines et derniers DFG rendus par le laboratoire, NON archivés, lus en base
 * (aucun cache). Sprint 2b-2 (E) : le moteur utilise la donnée la plus récente des deux.
 */
export async function loadRenalResults(patientId: string): Promise<{ creatinines: CreatinineResult[]; dfgLabos: DfgLaboResult[] }> {
  const { data, error } = await supabase.from('resultats_examens')
    .select('id, examen_code, valeur_num, unite_saisie, date_prelevement, created_at')
    .eq('patient_id', patientId).in('examen_code', ['CREATININE', 'DFG']).eq('archive', false)
    .not('valeur_num', 'is', null)
    .order('date_prelevement', { ascending: false }).order('created_at', { ascending: false }).limit(12);
  if (error) throw new Error(error.message);
  const rows = ((data as RenalRow[] | null) ?? []).map(r => ({ ...r, valeur_num: r.valeur_num === null ? null : Number(r.valeur_num) }));
  return {
    creatinines: rows.filter(r => r.examen_code === 'CREATININE'),
    dfgLabos: rows.filter(r => r.examen_code === 'DFG').map(r => ({ id: r.id, valeur_num: r.valeur_num, date_prelevement: r.date_prelevement, created_at: r.created_at })),
  };
}

export type RefreshStatus = 'unchanged' | 'changed' | 'error' | 'stale';

export interface RenalChannel {
  status: RenalStatus;
  regles: RegleRenale[];
  classes: RenalClasse[];
  /** Règles, classes et référentiel d'unités chargés. */
  rulesReady: boolean;
  /** Relit les créatinines du patient en base (avant chaque verdict). */
  refresh: (patientId: string, opts?: { reset?: boolean }) => Promise<RefreshStatus>;
}

export function useRenalChannel(patient: Patient | null, userId: string | null | undefined): RenalChannel {
  const patientId = patient?.id ?? null;
  const [creatinines, setCreatinines] = useState<CreatinineResult[]>([]);
  const [dfgLabos, setDfgLabos] = useState<DfgLaboResult[]>([]);
  const [loadError, setLoadError] = useState(false);
  const seqRef = useRef(0);
  const sigRef = useRef('');
  const pidRef = useRef<string | null>(patientId);
  pidRef.current = patientId;

  const refresh = useCallback(async (pid: string, opts: { reset?: boolean } = {}): Promise<RefreshStatus> => {
    const seq = ++seqRef.current;
    if (opts.reset) { sigRef.current = ''; setCreatinines([]); setDfgLabos([]); setLoadError(false); }
    try {
      const { creatinines: rows, dfgLabos: labs } = await loadRenalResults(pid);
      if (seq !== seqRef.current || pidRef.current !== pid) return 'stale';
      setLoadError(false);
      const sig = [...rows.map(r => `${r.id}:${r.valeur_num}:${r.unite_saisie}:${r.date_prelevement}`), ...labs.map(r => `dfg:${r.id}:${r.valeur_num}:${r.date_prelevement}`)].join(',') || '∅';
      if (sig === sigRef.current) return 'unchanged';
      sigRef.current = sig;
      setCreatinines(rows);
      setDfgLabos(labs);
      return 'changed';
    } catch (e) {
      if (seq !== seqRef.current || pidRef.current !== pid) return 'stale';
      console.error('[OrdoSur] créatinines load error:', e);
      sigRef.current = 'erreur';
      setLoadError(true);
      return 'error';
    }
  }, []);

  useEffect(() => {
    if (!patientId) {
      seqRef.current++;
      sigRef.current = '';
      setCreatinines([]); setDfgLabos([]); setLoadError(false);
      return;
    }
    void refresh(patientId, { reset: true });
  }, [patientId, refresh]);

  // Résultat saisi, corrigé ou archivé (onglet Bilans, demande d'examens) : relecture immédiate.
  useDataSync(['bilans'], () => { if (pidRef.current) void refresh(pidRef.current); }, { onFocus: false });

  // Règles, classes et examen « créatinine » du référentiel (conversions d'unités) : une fois.
  const [regles, setRegles] = useState<RegleRenale[]>([]);
  const [classes, setClasses] = useState<RenalClasse[]>([]);
  const [creatRef, setCreatRef] = useState<ExamRef | null>(null);
  const [rulesReady, setRulesReady] = useState(false);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const [rg, cl, refs] = await Promise.all([
          fetchAllRows<RegleRenale>(
            (from, to) => supabase.from('regles_renales').select('*').eq('actif', true).order('ordre').range(from, to),
            { label: 'regles_renales' },
          ),
          fetchAllRows<RenalClasse>(
            (from, to) => supabase.from('regles_renales_classes').select('classe, dci_motif').range(from, to),
            { label: 'regles_renales_classes' },
          ),
          loadExamRefs(),
        ]);
        if (cancelled) return;
        const ref = refs.find(r => r.code === 'CREATININE') ?? null;
        if (rg.length === 0 || cl.length === 0 || !ref) throw new Error('règles rénales ou référentiel vides');
        setRegles(rg);
        setClasses(cl);
        setCreatRef(ref);
        setRulesReady(true);
      } catch (e) {
        console.error('[OrdoSur] regles_renales load error:', e);
        if (!cancelled) setRulesReady(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const todayIso = toIsoDate(new Date());
  const pathologiesSig = (patient?.pathologies ?? []).join('|');
  const status = useMemo(() => renalStatus({
    dateNaissance: patient?.date_naissance ?? null,
    sexe: patient?.sexe ?? null,
    poidsKg: patient?.poids_kg == null ? null : Number(patient.poids_kg),
    poidsDate: patient?.poids_date ?? null,
    pathologies: patient?.pathologies ?? [],
    creatinines, dfgLabos, creatRef, loadError,
    today: new Date(`${todayIso}T12:00:00`),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [patient?.id, patient?.date_naissance, patient?.sexe, patient?.poids_kg, patient?.poids_date, pathologiesSig, creatinines, dfgLabos, creatRef, loadError, todayIso]);

  return { status, regles, classes, rulesReady, refresh };
}

/** Enregistre le poids du jour (kg). La date de pesée est celle de la saisie. */
export async function savePoids(patientId: string, poidsKg: number, today: Date = new Date()): Promise<{ poids_kg: number; poids_date: string }> {
  const patch = { poids_kg: poidsKg, poids_date: toIsoDate(today) };
  const { data, error } = await supabase.from('patients').update(patch).eq('id', patientId).select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Poids non enregistré (droits insuffisants)');
  return patch;
}
