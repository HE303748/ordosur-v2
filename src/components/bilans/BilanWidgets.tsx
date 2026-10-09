import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronRight, ClipboardList } from 'lucide-react';
import type { Patient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDataSync } from '../../lib/dataSync';
import { formatFrShort } from '../../lib/examRequest';
import { requestPatientTab } from '../../lib/examUi';
import { viewCache } from '../../lib/viewCache';
import { loadARevoir, type ARevoirData } from '../../lib/resultatsApi';
import { buildSeries, derniersBilans, resultatLabel, resultatsARevoir, valeurAffichee } from '../../lib/resultatsLogic';
import { useExamRefs, usePatientResultats } from '../../hooks/useBilans';
import { InterpretationBadge } from './ResultFields';

/** Profil patient : « N résultat(s) à revoir » — rien s'il n'y en a pas. */
export function ARevoirBadge({ patientId, onClick, compact = false }: { patientId: string; onClick?: () => void; compact?: boolean }) {
  const { resultats } = usePatientResultats(patientId);
  const n = useMemo(() => resultatsARevoir(resultats).length, [resultats]);
  if (n === 0) return null;
  if (compact) {
    return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#DC2626]/[0.15] dark:text-red-300" aria-label={`${n} à revoir`}>{n}</span>;
  }
  const badge = (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEF2F2] text-[#B91C1C] ring-1 ring-inset ring-[#DC2626]/20 dark:bg-[#DC2626]/[0.12] dark:text-red-300">
      <AlertTriangle className="w-3 h-3" aria-hidden /> {n} résultat{n > 1 ? 's' : ''} à revoir
    </span>
  );
  return onClick ? (
    <button type="button" onClick={onClick} title="Voir les bilans" className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B]">{badge}</button>
  ) : badge;
}

/**
 * Vérificateur, sous le patient : « Derniers bilans : HbA1c 7,2 % (12/09) · Créat 12 mg/L (12/09) »
 * — 5 examens au maximum, les plus pertinents selon les pathologies. INFORMATION uniquement :
 * le moteur de sécurité ne lit pas cette ligne.
 */
export function DerniersBilansLine({ patient }: { patient: Pick<Patient, 'id' | 'pathologies'> }) {
  const { resultats } = usePatientResultats(patient.id);
  const refs = useExamRefs(resultats.length > 0);
  const items = useMemo(() => derniersBilans(buildSeries(resultats, refs), patient.pathologies), [resultats, refs, patient.pathologies]);
  if (items.length === 0) return null;
  return (
    <p className="w-full text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
      <span className="font-semibold text-[#0A1628] dark:text-[#E2E8F0]">Derniers bilans : </span>
      {items.map((i, k) => (
        <span key={i.key}>
          {k > 0 && <span aria-hidden className="text-slate-300 dark:text-slate-600"> · </span>}
          <span className="whitespace-nowrap">{i.label} <span className="font-semibold text-[#0A1628] dark:text-[#E2E8F0]">{i.valeur}</span> ({formatFrShort(i.date)})</span>
        </span>
      ))}
    </p>
  );
}

const CARD = 'bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm';

/** Accueil : « Résultats à revoir (N) », cliquable vers l'onglet Bilans du patient. Masquée si N = 0. */
export function ResultatsARevoirCard({ patients, onOpenPatient }: { patients: Patient[]; onOpenPatient: (id: string) => void }) {
  const { doctorProfile } = useAuth();
  const doctorId = doctorProfile?.id ?? null;
  const cacheKey = doctorId ? `a-revoir:${doctorId}` : null;
  const [data, setData] = useState<ARevoirData | null>(() => (cacheKey ? viewCache.peek<ARevoirData>(cacheKey) ?? null : null));
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!doctorId || !cacheKey) return;
    const s = ++seq.current;
    try {
      await viewCache.swr<ARevoirData>(cacheKey, () => loadARevoir(doctorId),
        d => { if (s === seq.current) setData(d); }, { topics: ['bilans'], maxAgeMs: 30_000 });
    } catch (e) {
      console.error('[bilans] résultats à revoir :', e);
    }
  }, [doctorId, cacheKey]);

  useEffect(() => { void load(); }, [load]);
  useDataSync(['bilans'], () => { void load(); });

  if (!data || data.total === 0) return null;
  const byId = new Map(patients.map(p => [p.id, p]));
  const open = (patientId: string) => {
    requestPatientTab(patientId, 'bilans');
    onOpenPatient(patientId);
  };

  return (
    <section className={`${CARD} overflow-hidden`} aria-label="Résultats à revoir">
      <div className="flex items-center gap-2 px-4 lg:px-5 py-3 min-h-14 border-b border-slate-100 dark:border-white/[0.06]">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#0A1628] dark:text-[#E2E8F0]">
          <ClipboardList className="w-4 h-4 text-slate-400 dark:text-[#64748B]" aria-hidden />
          Résultats à revoir
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#FEF2F2] text-[#B91C1C] ring-1 ring-inset ring-[#DC2626]/20 dark:bg-[#DC2626]/[0.12] dark:text-red-300">{data.total}</span>
        </h2>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-white/[0.05]">
        {data.rows.map(r => {
          const p = byId.get(r.patient_id);
          return (
            <li key={r.id}>
              <button type="button" onClick={() => open(r.patient_id)}
                className="w-full flex items-center gap-3 px-4 lg:px-5 py-2.5 min-h-16 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] active:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00A86B]">
                <span aria-hidden className="w-2 h-2 rounded-full flex-shrink-0 bg-[#DC2626]/70" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0] truncate">{p ? `${p.prenom} ${p.nom}` : 'Patient'}</span>
                  <span className="block text-xs text-slate-500 dark:text-[#94A3B8] truncate">
                    {resultatLabel(null, r.parametre, r.libelle)} <span className="font-semibold text-[#0A1628] dark:text-[#E2E8F0]">{valeurAffichee(r, 40)}</span>
                  </span>
                </span>
                <span className="flex-shrink-0 flex flex-col items-end gap-0.5">
                  <InterpretationBadge value={r.interpretation} />
                  <span className="text-[11px] text-slate-500 dark:text-[#94A3B8]">{formatFrShort(r.date_prelevement)}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-[#475569] flex-shrink-0" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      {data.total > data.rows.length && (
        <p className="px-4 lg:px-5 py-2.5 text-xs text-slate-500 dark:text-[#94A3B8] border-t border-slate-100 dark:border-white/[0.06]">
          + {data.total - data.rows.length} autre{data.total - data.rows.length > 1 ? 's' : ''} — ouvrez un patient pour les marquer comme vus.
        </p>
      )}
    </section>
  );
}
