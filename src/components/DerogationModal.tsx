import { useEffect, useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import {
  DEROGATION_MOTIFS, alertLabel, validateDerogationForm,
  type DerogationAlertLike, type DerogationMotifId, type DerogationConfirmation,
} from '../lib/derogation';

// Sprint 4d — « Prescription contre-indiquée » : le médecin garde la décision, explicite
// et tracée (motif obligatoire + case de confirmation). Au-dessus de l'aperçu (z-[60]).

interface DerogationModalProps {
  open: boolean;
  alerts: DerogationAlertLike[];
  signature: string;
  onConfirm: (conf: DerogationConfirmation) => void;
  /** « Modifier l'ordonnance » (ou fermeture) : rien n'est enregistré ni imprimé. */
  onModify: () => void;
}

export function DerogationModal({ open, alerts, signature, onConfirm, onModify }: DerogationModalProps) {
  const [motif, setMotif] = useState<DerogationMotifId | null>(null);
  const [motifAutre, setMotifAutre] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chaque ouverture repart de zéro : une confirmation ne se réutilise jamais implicitement.
  useEffect(() => {
    if (!open) return;
    setMotif(null); setMotifAutre(''); setCommentaire(''); setConfirmed(false); setError(null);
  }, [open, signature]);

  if (!open) return null;

  const submit = () => {
    const err = validateDerogationForm({ motif, motifAutre, confirmed });
    if (err) { setError(err); return; }
    onConfirm({
      signature,
      motif: motif!,
      motifAutre: motif === 'autre' ? motifAutre.trim() : null,
      commentaire: commentaire.trim() || null,
      confirmedAt: new Date().toISOString(),
    });
  };

  const n = alerts.length;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="derogation-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onModify} />
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-[#111827] rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-[#DC2626]" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="derogation-title" className="text-base font-bold text-[#0A1628] dark:text-[#E2E8F0]">Prescription contre-indiquée</h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
              {n} alerte{n > 1 ? 's' : ''} de niveau maximal — votre décision sera tracée (non imprimée sur l’ordonnance).
            </p>
          </div>
          <button onClick={onModify} aria-label="Fermer" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          <ul className="space-y-2">
            {alerts.map((a, i) => (
              <li key={i} className="px-3 py-2.5 rounded-xl border border-red-200 bg-red-50/70 dark:bg-red-500/[0.08] dark:border-red-500/30">
                <p className="text-sm font-semibold text-red-900 dark:text-red-200 break-words">{alertLabel(a)}</p>
                <p className="text-xs text-red-800/90 dark:text-red-300/90 mt-0.5 line-clamp-3">{a.description}</p>
              </li>
            ))}
          </ul>

          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wide mb-1.5">Motif <span className="text-[#DC2626]">*</span></p>
            <div className="space-y-1.5">
              {DEROGATION_MOTIFS.map(m => (
                <label key={m.id} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                  motif === m.id ? 'border-[#0A1628] bg-[#0A1628]/[0.04] dark:border-slate-300 dark:bg-white/[0.04]' : 'border-slate-200 dark:border-white/[0.1]'
                }`}>
                  <input type="radio" name="derogation-motif" checked={motif === m.id} onChange={() => { setMotif(m.id); setError(null); }}
                    className="w-4 h-4 text-[#0A1628] focus:ring-[#0A1628]" />
                  <span className="text-sm text-slate-800 dark:text-[#E2E8F0]">{m.label}</span>
                </label>
              ))}
            </div>
            {motif === 'autre' && (
              <input value={motifAutre} onChange={e => { setMotifAutre(e.target.value); setError(null); }} maxLength={300} autoFocus
                placeholder="Précisez le motif (obligatoire)"
                className="mt-2 w-full px-3.5 py-2.5 text-sm bg-[#FAFAF7] dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A1628]/30" />
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wide mb-1.5">Commentaire (facultatif)</p>
            <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} rows={2} maxLength={500}
              className="w-full px-3.5 py-2.5 text-sm bg-[#FAFAF7] dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#0A1628]/30" />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={e => { setConfirmed(e.target.checked); setError(null); }}
              className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#DC2626] focus:ring-[#DC2626] flex-shrink-0" />
            <span className="text-sm font-medium text-slate-800 dark:text-[#E2E8F0]">Je confirme cette prescription en connaissance de cause</span>
          </label>

          {error && <p role="alert" className="text-sm text-[#DC2626]">{error}</p>}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 px-5 py-4 border-t border-slate-100 dark:border-white/[0.06]">
          <button onClick={onModify}
            className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-[#CBD5E1] rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.05]">
            Modifier l’ordonnance
          </button>
          <button onClick={submit}
            className="flex-1 px-4 py-2.5 bg-[#0A1628] hover:bg-[#0A1628]/90 text-white rounded-xl text-sm font-semibold">
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
