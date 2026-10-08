// Sprint 4e-C — Saisie rapide du statut grossesse / allaitement (profil et Vérificateur).
// Écrit directement dans patients (RLS en garde-fou), puis prévient le parent : le statut
// fait partie de la clé d'analyse, toute modification invalide donc le verdict.
import { useEffect, useState } from 'react';
import { AlertTriangle, Baby } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  pregnancyContext, pregnancySummary, saToDdr, ddrToSa,
  type GrossesseStatut, type PregnancyFields,
} from '../lib/pregnancyStatus';

interface PatientLike extends PregnancyFields {
  id: string;
  sexe?: string | null;
  date_naissance?: string | null;
}

interface Props {
  patient: PatientLike;
  canWrite: boolean;
  onPatched?: (patientId: string, patch: PregnancyFields) => void;
}

const ageAns = (dn: string | null | undefined): number | null => {
  if (!dn) return null;
  const d = new Date(dn);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--;
  return a;
};

/** Affichée pour une patiente en âge de procréer (12–55 ans, ou âge inconnu) ou déjà renseignée. */
export function showsPregnancyStatus(p: PatientLike): boolean {
  if (p.sexe !== 'F') return false;
  if (p.grossesse_statut === 'enceinte' || p.grossesse_statut === 'non_enceinte' || p.allaitement != null) return true;
  const a = ageAns(p.date_naissance);
  return a === null || (a >= 12 && a <= 55);
}

const segBase = 'px-2.5 py-1 text-xs font-semibold border transition-colors disabled:opacity-50 first:rounded-l-lg last:rounded-r-lg -ml-px first:ml-0';
const segOn = 'bg-[#0A1628] text-white border-[#0A1628] z-10 relative';
const segOff = 'bg-white dark:bg-[#1E293B] text-slate-600 dark:text-[#94A3B8] border-slate-200 dark:border-white/[0.1] hover:bg-slate-50 dark:hover:bg-white/[0.05]';

export function PregnancyStatusEditor({ patient, canWrite, onPatched }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctx = pregnancyContext(patient);
  // Une déclaration expirée ou à confirmer est affichée « Inconnu » : une nouvelle saisie
  // ne peut jamais la prolonger sans choix explicite du médecin.
  const statut: GrossesseStatut = ctx.statut;
  const ddr = statut === 'enceinte' ? (patient.grossesse_ddr ?? '').slice(0, 10) : '';
  const [saInput, setSaInput] = useState('');
  useEffect(() => { setSaInput(ctx.sa !== null ? String(ctx.sa) : ''); }, [patient.id, ctx.sa]);

  if (!showsPregnancyStatus(patient)) return null;

  const save = async (next: { statut?: GrossesseStatut; ddr?: string | null; allaitement?: boolean | null }) => {
    if (!canWrite || saving) return;
    const nextStatut = next.statut ?? statut;
    const patch: PregnancyFields = {
      grossesse_statut: nextStatut,
      grossesse_ddr: nextStatut === 'enceinte' ? (next.ddr !== undefined ? next.ddr : (ddr || null)) : null,
      allaitement: next.allaitement !== undefined ? next.allaitement : ctx.allaitement,
      grossesse_maj_le: new Date().toISOString(),
    };
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('patients').update(patch).eq('id', patient.id);
    setSaving(false);
    if (err) {
      console.error('[OrdoSur] statut grossesse update error:', err);
      setError('Statut non enregistré — réessayez.');
      return;
    }
    onPatched?.(patient.id, patch);
  };

  const commitSa = () => {
    const v = saInput.trim();
    if (v === '') { if (ctx.sa !== null) save({ ddr: null }); return; }
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > 43) { setError('Terme attendu entre 0 et 43 SA.'); setSaInput(ctx.sa !== null ? String(ctx.sa) : ''); return; }
    if (n !== ctx.sa) save({ ddr: saToDdr(n) });
  };
  const commitDdr = (value: string) => {
    if (!value) { save({ ddr: null }); return; }
    const sa = ddrToSa(value);
    if (sa === null || sa > 43) { setError('DDR invraisemblable (future ou terme dépassé).'); return; }
    save({ ddr: value });
  };

  const disabled = !canWrite || saving;
  const staleHint = ctx.aConfirmer
    ? 'Statut « enceinte » ancien ou terme dépassé — à confirmer.'
    : ctx.expire ? '« Non enceinte » déclaré il y a plus de 3 mois — à confirmer.' : null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#111827] p-3 space-y-2.5">
      <div className="flex items-start gap-2">
        <Baby className="w-4 h-4 text-[#0A1628] dark:text-slate-300 flex-shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#0A1628] dark:text-[#E2E8F0]">Grossesse / allaitement</p>
          <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">{pregnancySummary(ctx)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] w-[72px]">Grossesse</span>
        <div className="inline-flex" role="group" aria-label="Statut grossesse">
          {([['enceinte', 'Enceinte'], ['non_enceinte', 'Non enceinte'], ['inconnu', 'Inconnu']] as const).map(([v, label]) => (
            <button key={v} type="button" disabled={disabled} aria-pressed={statut === v}
              onClick={() => { if (statut !== v || staleHint) save({ statut: v }); }}
              className={`${segBase} ${statut === v ? segOn : segOff}`}>{label}</button>
          ))}
        </div>
      </div>

      {statut === 'enceinte' && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] w-[72px]">Terme</span>
          <input
            type="number" inputMode="numeric" min={0} max={43} value={saInput} disabled={disabled}
            onChange={e => setSaInput(e.target.value)} onBlur={commitSa}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            aria-label="Terme en semaines d'aménorrhée" placeholder="—"
            className="w-16 px-2 py-1 text-xs bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-lg text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#00A86B]/40"
          />
          <span className="text-[11px] text-slate-500 dark:text-[#94A3B8]">SA · ou DDR</span>
          <input
            type="date" value={ddr} disabled={disabled} onChange={e => commitDdr(e.target.value)}
            aria-label="Date des dernières règles"
            className="px-2 py-1 text-xs bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-lg text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#00A86B]/40"
          />
          {ctx.sa === null && (
            <span className="text-[11px] text-amber-700 dark:text-amber-300">Terme non renseigné : toutes les CI grossesse sont fermes.</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] w-[72px]">Allaitement</span>
        <div className="inline-flex" role="group" aria-label="Allaitement">
          {([[true, 'Oui'], [false, 'Non'], [null, 'Inconnu']] as const).map(([v, label]) => (
            <button key={label} type="button" disabled={disabled} aria-pressed={ctx.allaitement === v}
              onClick={() => { if (ctx.allaitement !== v) save({ allaitement: v }); }}
              className={`${segBase} ${ctx.allaitement === v ? segOn : segOff}`}>{label}</button>
          ))}
        </div>
      </div>

      {(staleHint || error) && (
        <p className={`text-[11px] flex items-start gap-1 ${error ? 'text-[#DC2626]' : 'text-amber-700 dark:text-amber-300'}`}>
          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-px" aria-hidden />
          <span>{error ?? staleHint}</span>
        </p>
      )}
    </div>
  );
}
