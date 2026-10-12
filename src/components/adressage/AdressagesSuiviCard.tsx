import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, ChevronRight } from 'lucide-react';
import type { Patient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDataSync } from '../../lib/dataSync';
import { viewCache } from '../../lib/viewCache';
import { formatFrShort } from '../../lib/examRequest';
import { requestPatientTab } from '../../lib/examUi';
import { loadSuiviAdressages, type SuiviAdressages } from '../../lib/adressageApi';
import { destinataireCourt } from '../../lib/adressageUi';
import { joursSansReponse } from '../../lib/lettreTexte';

const CARD = 'bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm';

/**
 * Sprint 7 — Accueil, « Adressages sans réponse » : carte sœur de « Examens à suivre ».
 * Affichée dès qu'une lettre envoyée attend une réponse depuis plus de 30 jours ; chaque ligne
 * ouvre l'onglet Adressages du patient.
 */
export function AdressagesSuiviCard({ patients, onOpenPatient }: { patients: Patient[]; onOpenPatient: (id: string) => void }) {
  const { doctorProfile } = useAuth();
  const doctorId = doctorProfile?.id ?? null;
  const cle = doctorId ? `adressages-suivi:${doctorId}` : null;
  const [data, setData] = useState<SuiviAdressages | null>(() => (cle ? viewCache.peek<SuiviAdressages>(cle) ?? null : null));
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!doctorId || !cle) return;
    const s = ++seq.current;
    try {
      await viewCache.swr<SuiviAdressages>(cle, () => loadSuiviAdressages(doctorId),
        d => { if (s === seq.current) setData(d); }, { topics: ['adressages'], maxAgeMs: 30_000 });
    } catch (e) {
      console.error('[adressages] suivi :', e);
    }
  }, [doctorId, cle]);

  useEffect(() => { void load(); }, [load]);
  useDataSync(['adressages'], () => { void load(); });

  if (!data || data.sansReponse === 0) return null;

  const byId = new Map(patients.map(p => [p.id, p]));
  const today = new Date();
  const open = (patientId: string) => {
    requestPatientTab(patientId, 'adressages');
    onOpenPatient(patientId);
  };

  return (
    <section className={`${CARD} overflow-hidden`} aria-label="Adressages sans réponse">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 lg:px-5 py-3 min-h-14 border-b border-slate-100 dark:border-white/[0.06]">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#0A1628] dark:text-[#E2E8F0]">
          <Send className="w-4 h-4 text-slate-400 dark:text-[#64748B]" aria-hidden />
          Adressages sans réponse
          <span className="text-xs font-semibold text-slate-400 dark:text-[#64748B]">{data.sansReponse}</span>
        </h2>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#B91C1C] ring-1 ring-inset ring-[#DC2626]/20 dark:bg-[#DC2626]/[0.12] dark:text-red-300">
          Plus de 30 jours
        </span>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-white/[0.05]">
        {data.rows.map(r => {
          const p = byId.get(r.patient_id);
          const n = joursSansReponse(r, today);
          return (
            <li key={r.id}>
              <button type="button" onClick={() => open(r.patient_id)}
                className="w-full flex items-center gap-3 px-4 lg:px-5 py-2.5 min-h-16 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] active:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00A86B]">
                <span aria-hidden className="w-2 h-2 rounded-full flex-shrink-0 bg-[#DC2626]/70" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0] truncate">{p ? `${p.prenom} ${p.nom}` : 'Patient'}</span>
                  <span className="block text-xs text-slate-500 dark:text-[#94A3B8] truncate">{destinataireCourt(r)} · {r.motif}</span>
                </span>
                <span className="flex-shrink-0 text-right">
                  <span className="block text-xs font-semibold text-[#0A1628] dark:text-[#E2E8F0]">Envoyée le {formatFrShort(r.date_envoi)}</span>
                  {n !== null && <span className="block text-[11px] font-semibold text-[#B91C1C] dark:text-red-300">depuis {n} jours</span>}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-[#475569] flex-shrink-0" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      {data.sansReponse > data.rows.length && (
        <p className="px-4 lg:px-5 py-3 text-xs text-slate-500 dark:text-[#94A3B8] border-t border-slate-100 dark:border-white/[0.06]">
          Et {data.sansReponse - data.rows.length} autre{data.sansReponse - data.rows.length > 1 ? 's' : ''} : les plus anciens sont affichés d’abord.
        </p>
      )}
    </section>
  );
}
