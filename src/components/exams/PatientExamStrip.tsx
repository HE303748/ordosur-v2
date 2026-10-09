import { useMemo } from 'react';
import { FlaskConical, CalendarClock, AlertTriangle } from 'lucide-react';
import type { Patient } from '../../lib/supabase';
import { prochainBilan } from '../../lib/examRequest';
import { openExamRequest } from '../../lib/examUi';
import { usePatientDemandes } from '../../hooks/useExamData';
import { DerniersBilansLine } from '../bilans/BilanWidgets';

/** « Prochain bilan prévu le JJ/MM » / « Bilan en retard depuis le JJ/MM » — pastille seule. */
export function ProchainBilanBadge({ patientId, className = '', onClick }: { patientId: string; className?: string; onClick?: () => void }) {
  const { demandes } = usePatientDemandes(patientId);
  const pb = useMemo(() => prochainBilan(demandes, new Date()), [demandes]);
  if (!pb) return null;
  const badge = pb.kind === 'retard' ? (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEF2F2] text-[#B91C1C] ring-1 ring-inset ring-[#DC2626]/20 ${className}`}>
      <AlertTriangle className="w-3 h-3" aria-hidden /> {pb.label}
    </span>
  ) : (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E6F4EE] text-[#006B47] ring-1 ring-inset ring-[#00A86B]/20 ${className}`}>
      <CalendarClock className="w-3 h-3" aria-hidden /> {pb.label}
    </span>
  );
  // Rien à afficher → aucun élément (jamais de bouton vide dans l'ordre de tabulation).
  return onClick ? (
    <button type="button" onClick={onClick} title="Voir les examens demandés"
      className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B]">
      {badge}
    </button>
  ) : badge;
}

/**
 * Sprint 5 — Sous le patient, dans le Vérificateur : prochain bilan + bouton « Demande
 * d'examens » (document autonome, sans médicament, hors blocage 3b).
 */
export function PatientExamStrip({ patient, canWrite }: { patient: Patient; canWrite: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-3.5 py-2.5 min-h-[56px] rounded-xl bg-white dark:bg-white/[0.03] border border-[#E5E5E0] dark:border-white/[0.08]">
      <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
        <ProchainBilanBadge patientId={patient.id} />
      </div>
      {canWrite && (
        <button
          type="button"
          onClick={() => openExamRequest({ patient })}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#0A1628] dark:text-[#E2E8F0] bg-white dark:bg-transparent border border-[#E5E5E0] dark:border-white/[0.12] hover:border-[#00A86B] active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B]"
        >
          <FlaskConical className="w-3.5 h-3.5 text-[#00A86B]" aria-hidden />
          Demande d’examens
        </button>
      )}
      {/* Sprint 6A — derniers résultats (information ; le moteur ne les lit pas) */}
      <DerniersBilansLine patient={patient} />
    </div>
  );
}
