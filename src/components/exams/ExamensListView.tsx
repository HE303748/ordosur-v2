import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, FlaskConical } from 'lucide-react';
import type { Patient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDataSync } from '../../lib/dataSync';
import type { DemandeExamens } from '../../lib/examRequest';
import { loadDemandesPage, type DemandeFilter } from '../../lib/examensApi';
import { useExamPrintContext } from '../../hooks/useExamData';
import { DemandeCard } from './DemandeCard';

const PAGE = 20;
const FILTERS: { id: DemandeFilter; label: string }[] = [
  { id: 'en_attente', label: 'En attente' },
  { id: 'en_retard', label: 'En retard' },
  { id: 'realisees', label: 'Réalisées' },
  { id: 'toutes', label: 'Toutes' },
];

/**
 * Sprint 5B — Documents › Demandes d'examens : liste paginée CÔTÉ SERVEUR (20 par page),
 * filtres appliqués en base, compteur exact. Recherche par patient (liste déjà chargée)
 * ou par numéro de demande.
 */
export function ExamensListView({ patients, onOpenPatient }: { patients: Patient[]; onOpenPatient?: (id: string) => void }) {
  const { doctorProfile } = useAuth();
  const doctorId = doctorProfile?.id ?? null;
  const printCtx = useExamPrintContext();
  const [filter, setFilter] = useState<DemandeFilter>('en_attente');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [rows, setRows] = useState<DemandeExamens[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const seq = useRef(0);
  const rowsRef = useRef<DemandeExamens[]>([]);
  rowsRef.current = rows;
  const patientsRef = useRef(patients);
  patientsRef.current = patients;

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(async (reset: boolean, silent = false) => {
    if (!doctorId) return;
    const s = ++seq.current;
    if (reset && !silent) setLoading(true);
    if (!reset) setLoadingMore(true);
    setFailed(false);
    try {
      const q = debounced.toLowerCase();
      // Recherche par patient : identifiants correspondants (bornés), sinon numéro de demande.
      const patientIds = q
        ? patientsRef.current.filter(p => `${p.prenom} ${p.nom}`.toLowerCase().includes(q) || `${p.nom} ${p.prenom}`.toLowerCase().includes(q)).slice(0, 100).map(p => p.id)
        : null;
      // Rechargement silencieux : on recharge autant de lignes que celles déjà affichées.
      const size = reset ? Math.max(PAGE, silent ? rowsRef.current.length : PAGE) : PAGE;
      const r = await loadDemandesPage({
        doctorId, filter, offset: reset ? 0 : rowsRef.current.length, pageSize: size, patientIds, numero: debounced,
      });
      if (s !== seq.current) return;
      setRows(reset ? r.rows : [...rowsRef.current, ...r.rows]);
      setCount(r.count);
    } catch (e) {
      if (s !== seq.current) return;
      console.error('[examens] liste :', e);
      setFailed(true);
    } finally {
      if (s === seq.current) { setLoading(false); setLoadingMore(false); }
    }
  }, [doctorId, filter, debounced]);

  useEffect(() => { void fetchPage(true); }, [fetchPage]);
  useDataSync(['examens'], () => { void fetchPage(true, true); });

  const byId = new Map(patients.map(p => [p.id, p]));

  return (
    <div>
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par patient ou numéro de demande…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 text-slate-900 dark:text-[#E2E8F0] placeholder-slate-400" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.id} type="button" onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === f.id
                ? 'bg-[#00A86B] text-white shadow-sm'
                : 'bg-white dark:bg-[#111827] text-slate-600 dark:text-[#94A3B8] border border-slate-200 dark:border-white/[0.08] hover:border-[#00A86B]'}`}>
              {f.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-500 dark:text-[#94A3B8]" aria-live="polite">
            {loading || count === null ? '…' : `${count} demande${count !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {failed && (
        <div role="alert" className="mb-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-sm text-amber-900 dark:text-amber-200">
          <span className="flex-1">La liste n’a pas pu être chargée.</span>
          <button type="button" onClick={() => void fetchPage(true)} className="font-semibold underline underline-offset-2">Réessayer</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-white/[0.06] animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm p-8 lg:p-12 text-center">
          <FlaskConical className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" aria-hidden />
          <h3 className="text-lg font-bold text-slate-700 dark:text-[#94A3B8] mb-2">
            {debounced ? 'Aucun résultat' : filter === 'en_retard' ? 'Aucune demande en retard' : filter === 'en_attente' ? 'Aucune demande en attente' : 'Aucune demande d’examens'}
          </h3>
          <p className="text-slate-400 dark:text-[#475569] text-sm max-w-sm mx-auto">
            Les demandes d’examens se créent depuis une ordonnance, le profil d’un patient ou le Vérificateur.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(d => (
            <DemandeCard key={d.id} demande={d} patient={byId.get(d.patient_id) ?? null} canWrite={!!doctorId}
              printCtx={printCtx} showPatient onOpenPatient={onOpenPatient} collapsed />
          ))}
        </div>
      )}

      {!loading && rows.length > 0 && count !== null && (
        <div className="mt-5 flex flex-col items-center gap-2">
          <p className="text-xs text-slate-500 dark:text-[#94A3B8]">{rows.length} affichée{rows.length > 1 ? 's' : ''} sur {count}</p>
          {rows.length < count && (
            <button type="button" onClick={() => void fetchPage(false)} disabled={loadingMore}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0] bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.1] hover:border-[#00A86B] transition-colors disabled:opacity-60">
              {loadingMore ? 'Chargement…' : 'Charger plus'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
