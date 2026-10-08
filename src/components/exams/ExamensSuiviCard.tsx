import { useCallback, useEffect, useRef, useState } from 'react';
import { FlaskConical, ChevronRight } from 'lucide-react';
import type { Patient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDataSync } from '../../lib/dataSync';
import { daysBetween, formatFrShort, toIsoDate } from '../../lib/examRequest';
import { loadSuivi, type SuiviData } from '../../lib/examensApi';

const CARD = 'bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm';

/**
 * Sprint 5B — Accueil, « Examens à suivre » : nombre de demandes en retard et à échéance
 * sous 7 jours (compteurs exacts), liste cliquable vers les profils. Trois requêtes bornées.
 * Masquée tant qu'il n'y a rien à suivre : pas de bruit sur l'Accueil.
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
  useDataSync(['examens'], () => { void load(); });

  if (!data || (data.enRetard === 0 && data.sous7j === 0)) return null;

  const byId = new Map(patients.map(p => [p.id, p]));
  const todayIso = toIsoDate(new Date());

  return (
    <section className={`${CARD} overflow-hidden`} aria-label="Examens à suivre">
      <div className="flex items-center justify-between gap-3 px-4 lg:px-5 h-14 border-b border-slate-100 dark:border-white/[0.06]">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#0A1628] dark:text-[#E2E8F0]">
          <FlaskConical className="w-4 h-4 text-slate-400 dark:text-[#64748B]" aria-hidden />
          Examens à suivre
        </h2>
        <div className="flex items-center gap-2 text-xs font-semibold">
          {data.enRetard > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#B91C1C] ring-1 ring-inset ring-[#DC2626]/20 dark:bg-[#DC2626]/[0.12] dark:text-red-300">
              {data.enRetard} en retard
            </span>
          )}
          {data.sous7j > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-white/[0.06] dark:text-[#CBD5E1]">
              {data.sous7j} sous 7 jours
            </span>
          )}
        </div>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-white/[0.05]">
        {data.rows.map(r => {
          const p = byId.get(r.patient_id);
          const late = r.echeance_date < todayIso;
          const n = Math.abs(daysBetween(r.echeance_date, todayIso));
          return (
            <li key={r.id}>
              <button type="button" onClick={() => onOpenPatient(r.patient_id)}
                className="w-full flex items-center gap-3 px-4 lg:px-5 h-14 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] active:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00A86B]">
                <span aria-hidden className={`w-2 h-2 rounded-full flex-shrink-0 ${late ? 'bg-[#DC2626]/70' : 'bg-amber-400'}`} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0] truncate">
                    {p ? `${p.prenom} ${p.nom}` : 'Patient'}
                    {r.urgent && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-[#0A1628] dark:text-[#E2E8F0]">urgent</span>}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-[#94A3B8]">
                    {late ? `En retard de ${n} jour${n > 1 ? 's' : ''} (échéance le ${formatFrShort(r.echeance_date)})`
                      : n === 0 ? 'À réaliser aujourd’hui' : `Échéance le ${formatFrShort(r.echeance_date)} — dans ${n} jour${n > 1 ? 's' : ''}`}
                    {r.statut === 'partiel' ? ' · partiel' : ''}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-[#475569] flex-shrink-0" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      {onSeeAll && data.enRetard + data.sous7j > data.rows.length && (
        <button type="button" onClick={onSeeAll}
          className="w-full px-4 lg:px-5 py-3 text-xs font-semibold text-[#006B47] dark:text-[#00A86B] hover:bg-slate-50 dark:hover:bg-white/[0.03] border-t border-slate-100 dark:border-white/[0.06] text-left">
          Voir toutes les demandes ({data.enRetard + data.sous7j})
        </button>
      )}
    </section>
  );
}
