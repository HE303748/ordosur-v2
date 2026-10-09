import { useEffect, useRef, useState } from 'react';
import { Scale } from 'lucide-react';
import { formatFr } from '../../lib/examRequest';
import { formatNombre } from '../../lib/resultatsLogic';
import { cockcroftLine, dfgLine, parsePoids, poidsAncien, POIDS_MAX, POIDS_MIN, type RenalStatus } from '../../lib/renalEngine';
import { savePoids } from '../../hooks/useRenal';

interface PoidsPatient { id: string; poids_kg?: number | null; poids_date?: string | null }
export interface PoidsPatch { poids_kg: number; poids_date: string }

/**
 * Sprint 6B — Saisie rapide du poids (profil et Vérificateur). Le poids sert à la clairance
 * de Cockcroft-Gault : le modifier relance l'analyse. Plus de 12 mois → « poids ancien ».
 */
export function PoidsEditor({ patient, canWrite, onPatched, className = '' }: {
  patient: PoidsPatient;
  canWrite: boolean;
  onPatched?: (patientId: string, patch: PoidsPatch) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setEditing(false); setError(null); }, [patient.id]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const poids = typeof patient.poids_kg === 'number' ? patient.poids_kg : (patient.poids_kg != null ? Number(patient.poids_kg) : null);
  const ancien = poids !== null && poidsAncien(patient.poids_date, new Date());

  const save = async () => {
    if (saving) return;
    const kg = parsePoids(value);
    if (kg === null) { setError(`Poids attendu entre ${POIDS_MIN} et ${POIDS_MAX} kg (ex. 72,5).`); return; }
    setSaving(true);
    setError(null);
    try {
      const patch = await savePoids(patient.id, kg);
      onPatched?.(patient.id, patch);
      setEditing(false);
    } catch (e) {
      console.error('[OrdoSur] poids update error:', e);
      setError('Poids non enregistré — réessayez.');
    } finally {
      setSaving(false);
    }
  };

  if (!canWrite && poids === null) return null;

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${className}`}>
      <Scale className="w-3.5 h-3.5 text-slate-400 dark:text-[#64748B]" aria-hidden />
      {editing ? (
        <>
          <label className="inline-flex items-center gap-1.5 text-slate-600 dark:text-[#94A3B8]">
            Poids
            <input ref={inputRef} type="text" inputMode="decimal" autoComplete="off" value={value} disabled={saving} maxLength={6}
              onChange={e => { setValue(e.target.value); setError(null); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void save(); } if (e.key === 'Escape') { e.preventDefault(); setEditing(false); setError(null); } }}
              aria-invalid={!!error} placeholder="kg"
              className="w-16 px-2 py-1 text-sm bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-white/[0.1] rounded-lg text-[#0A1628] dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#00A86B]/40 focus:border-[#00A86B]" />
            kg
          </label>
          <button type="button" onClick={() => void save()} disabled={saving}
            className="px-2.5 py-1 rounded-lg font-semibold text-white bg-[#00A86B] hover:bg-[#006B47] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#00A86B]">
            {saving ? '…' : 'OK'}
          </button>
          <button type="button" onClick={() => { setEditing(false); setError(null); }} disabled={saving}
            className="px-2 py-1 rounded-lg font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B]">
            Annuler
          </button>
        </>
      ) : (
        <>
          <span className="text-slate-600 dark:text-[#94A3B8]">
            {poids !== null ? (
              <>Poids <span className="font-semibold text-[#0A1628] dark:text-[#E2E8F0]">{formatNombre(poids, 1)} kg</span>
                {patient.poids_date ? ` (${formatFr(patient.poids_date)})` : ''}</>
            ) : 'Poids non renseigné'}
          </span>
          {ancien && <span className="px-1.5 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">poids ancien</span>}
          {canWrite && (
            <button type="button" onClick={() => { setValue(''); setEditing(true); }}
              className="font-semibold text-[#006B47] dark:text-[#00A86B] underline underline-offset-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B]">
              {poids !== null ? 'Mettre à jour' : 'Ajouter'}
            </button>
          )}
        </>
      )}
      {error && <span role="alert" className="w-full text-[#B91C1C] dark:text-red-300">{error}</span>}
    </span>
  );
}

/**
 * Sprint 6B — Sous le patient, dans le Vérificateur : « DFG 42 mL/min/1,73 m² (CKD-EPI, créat
 * du 12/09) », « Cl. Cockcroft 38 mL/min » si le poids est connu, et la saisie du poids.
 * La valeur affichée est exactement celle que le moteur utilise (même objet `status`).
 */
export function RenalStrip({ patient, status, canWrite, onPatched }: {
  patient: PoidsPatient;
  status: RenalStatus;
  canWrite: boolean;
  onPatched?: (patientId: string, patch: PoidsPatch) => void;
}) {
  const cg = cockcroftLine(status);
  const bas = status.connu && status.dfg !== null && status.dfg < 60;
  return (
    <div className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-[#E5E5E0] dark:border-white/[0.08] space-y-1.5">
      <p className="text-xs leading-relaxed">
        <span className={`font-semibold ${status.connu ? (bas ? 'text-amber-800 dark:text-amber-300' : 'text-[#0A1628] dark:text-[#E2E8F0]') : 'text-slate-500 dark:text-[#94A3B8]'}`}>
          {dfgLine(status)}
        </span>
        {cg && <span className="text-slate-600 dark:text-[#94A3B8]"> · <span className="font-semibold text-[#0A1628] dark:text-[#E2E8F0]">{cg}</span></span>}
        {status.connu && !cg && <span className="text-slate-500 dark:text-[#94A3B8]"> · Cl. Cockcroft non calculable (poids manquant)</span>}
        {status.dialyse && <span className="text-slate-600 dark:text-[#94A3B8]"> · dialyse déclarée</span>}
      </p>
      <PoidsEditor patient={patient} canWrite={canWrite} onPatched={onPatched} />
    </div>
  );
}
