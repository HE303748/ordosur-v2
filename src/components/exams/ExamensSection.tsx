import { useMemo, useState } from 'react';
import { FlaskConical, ChevronDown, Plus } from 'lucide-react';
import type { Patient } from '../../lib/supabase';
import { isOpen, sortDemandes } from '../../lib/examRequest';
import { openExamRequest } from '../../lib/examUi';
import { useExamPrintContext, usePatientDemandes } from '../../hooks/useExamData';
import { DemandeCard } from './DemandeCard';

/**
 * Sprint 5B — Profil patient, « Examens demandés » : demandes en attente triées par
 * échéance (retards en tête), détail et actions par ligne, historique repliable.
 * Une demande ne quitte cette liste que réalisée ou annulée par le médecin.
 */
export function ExamensSection({ patient, canWrite }: { patient: Patient; canWrite: boolean }) {
  const { demandes, loading, error, reload } = usePatientDemandes(patient.id);
  const printCtx = useExamPrintContext();
  const [showHistory, setShowHistory] = useState(false);

  const sorted = useMemo(() => sortDemandes(demandes), [demandes]);
  const ouvertes = sorted.filter(isOpen);
  const closes = sorted.filter(d => !isOpen(d));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0]">Examens demandés</h3>
          {!loading && (
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
              {ouvertes.length === 0 ? 'Aucun examen en attente' : `${ouvertes.length} demande${ouvertes.length > 1 ? 's' : ''} en attente`}
            </p>
          )}
        </div>
        {canWrite && (
          <button type="button" onClick={() => openExamRequest({ patient })}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#00A86B] hover:bg-[#006B47] active:bg-[#006B47] text-white rounded-xl text-xs font-semibold transition-colors shadow-sm shadow-[#00A86B]/20">
            <Plus className="w-3.5 h-3.5" aria-hidden /> Demande d’examens
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-sm text-amber-900 dark:text-amber-200">
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => void reload()} className="font-semibold underline underline-offset-2">Réessayer</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-white/[0.06] animate-pulse" />)}
        </div>
      ) : demandes.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-white/[0.05] rounded-2xl flex items-center justify-center mb-4">
            <FlaskConical className="w-8 h-8 text-slate-300 dark:text-slate-700" aria-hidden />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-[#94A3B8]">Aucun examen demandé</p>
          <p className="text-xs text-slate-400 dark:text-[#475569] mt-1 max-w-xs">
            Bilans biologiques, imageries et explorations demandés pour ce patient apparaîtront ici, avec leur échéance.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {ouvertes.map(d => <DemandeCard key={d.id} demande={d} patient={patient} canWrite={canWrite} printCtx={printCtx} />)}
          </div>
          {closes.length > 0 && (
            <div>
              <button type="button" onClick={() => setShowHistory(v => !v)} aria-expanded={showHistory}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-[#94A3B8] hover:text-[#0A1628] dark:hover:text-[#E2E8F0] transition-colors">
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showHistory ? 'rotate-180' : ''}`} aria-hidden />
                Historique ({closes.length})
              </button>
              {showHistory && (
                <div className="space-y-3 mt-3">
                  {closes.map(d => <DemandeCard key={d.id} demande={d} patient={patient} canWrite={canWrite} printCtx={printCtx} collapsed />)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
