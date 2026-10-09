import { useCallback, useEffect, useRef, useState } from 'react';
import { FlaskConical, ChevronRight } from 'lucide-react';
import type { Patient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDataSync } from '../../lib/dataSync';
import { echeanceRelative, formatFrShort, pendingExamsLabel, suiviVisible } from '../../lib/examRequest';
import { loadSuivi, type SuiviData } from '../../lib/examensApi';
import { requestPatientTab } from '../../lib/examUi';

const CARD = 'bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm';

/**
 * Accueil, « Examens à suivre ». Sprint 5c — la carte s'affiche dès qu'il existe AU MOINS
 * une demande en attente (elle était masquée tant qu'aucune n'était en retard ou à moins de
 * 7 jours). Compteurs exacts « En retard » et « Échéance sous 7 jours », puis les prochaines
 * échéances (patient, examens, date), cliquables vers l'onglet Examens du profil.
 */
export function ExamensSuiviCard({ patients, onOpenPatient, onSeeAll }: {
  patients: Patient[];
  onOpenPatient: (id: string) => void;
  onSeeAll?: () => void;
}) {
  const { doctorProfile } = useAuth();
  const doctorId = doctorProfile?.id ?? null;
  const [data, setData] = useState<SuiviData | null>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!doctorId) return;
    const s = ++seq.current;
    try {
      const d = await loadSuivi(doctorId);
      if (s === seq.current) setData(d);
    } catch (e) {
      console.error('[examens] suivi :', e);
    }
  }, [doctorId]);

  useEffect(() => { void load(); }, [load]);
  // Demande créée, réalisée ou annulée ailleurs — et retour sur l'onglet du navigateur.
  useDataSync(['examens'], () => { void load(); });

  if (!suiviVisible(data) || !data) return null;

  const byId = new Map(patients.map(p => [p.id, p]));
  const today = new Date();
  const open = (patientId: string) => {
    requestPatientTab(patientId, 'examens');
    onOpenPatient(patientId);
  };

  return (
    <section className={`${CARD} overflow-hidden`} aria-label="Examens à suivre">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 lg:px-5 py-3 min-h-14 border-b border-slate-100 dark:border-white/[0.06]">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#0A1628] dark:text-[#E2E8F0]">
          <FlaskConical className="w-4 h-4 text-slate-400 dark:text-[#64748B]" aria-hidden />
          Examens à suivre
          <span className="text-xs font-semibold text-slate-400 dark:text-[#64748B]">{data.enAttente}</span>
        </h2>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className={`px-2 py-0.5 rounded-full ${data.enRetard > 0
            ? 'bg-[#FEF2F2] text-[#B91C1C] ring-1 ring-inset ring-[#DC2626]/20 dark:bg-[#DC2626]/[0.12] dark:text-red-300'
            : 'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-[#94A3B8]'}`}>
            En retard : {data.enRetard}
          </span>
          <span className={`px-2 py-0.5 rounded-full ${data.sous7j > 0
            ? 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20'
            : 'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-[#94A3B8]'}`}>
            Échéance sous 7 jours : {data.sous7j}
          </span>
        </div>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-white/[0.05]">
        {data.rows.map(r => {
          const p = byId.get(r.patient_id);
          const rel = echeanceRelative(r.echeance_date, today);
          const exams = pendingExamsLabel(r.lignes);
          return (
            <li key={r.id}>
              <button type="button" onClick={() => open(r.patient_id)}
                className="w-full flex items-center gap-3 px-4 lg:px-5 py-2.5 min-h-16 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] active:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00A86B]">
                <span aria-hidden className={`w-2 h-2 rounded-full flex-shrink-0 ${rel.late ? 'bg-[#DC2626]/70' : 'bg-amber-400'}`} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0] truncate">
                    {p ? `${p.prenom} ${p.nom}` : 'Patient'}
                    {r.urgent && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide">urgent</span>}
                    {r.statut === 'partiel' && <span className="ml-2 text-[10px] font-semibold text-slate-500 dark:text-[#94A3B8]">partiel</span>}
                  </span>
                  {exams && <span className="block text-xs text-slate-500 dark:text-[#94A3B8] truncate">{exams}</span>}
                </span>
                <span className="flex-shrink-0 text-right">
                  <span className="block text-xs font-semibold text-[#0A1628] dark:text-[#E2E8F0]">{formatFrShort(r.echeance_date)}</span>
                  <span className={`block text-[11px] ${rel.late ? 'text-[#B91C1C] dark:text-red-300 font-semibold' : 'text-slate-500 dark:text-[#94A3B8]'}`}>{rel.label}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-[#475569] flex-shrink-0" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      {onSeeAll && data.enAttente > data.rows.length && (
        <button type="button" onClick={onSeeAll}
          className="w-full px-4 lg:px-5 py-3 text-xs font-semibold text-[#006B47] dark:text-[#00A86B] hover:bg-slate-50 dark:hover:bg-white/[0.03] border-t border-slate-100 dark:border-white/[0.06] text-left">
          Voir les {data.enAttente} demandes en attente
        </button>
      )}
    </section>
  );
}
