import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ClipboardCheck, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { notifyDataChanged } from '../../lib/dataSync';
import { formatFr, toIsoDate, type DemandeExamens, type DemandeLigne } from '../../lib/examRequest';
import { createActionLock } from '../../lib/viewCache';
import { saveResultats } from '../../lib/resultatsApi';
import {
  buildResultatPayload, defaultParametre, defaultUnite, deltaCheck, emptyField, examMesure, fieldToDraft, findPrevious, lignesASaisir,
  resultatLabel, serieKey, valeurAffichee,
  type DeltaWarning, type FieldState, type ResultatDraft,
} from '../../lib/resultatsLogic';
import { useExamRefs, useLastUnits, usePatientResultats } from '../../hooks/useBilans';
import { INPUT, ResultFields } from './ResultFields';

interface Props {
  demande: DemandeExamens;
  patientName: string;
  onClose: () => void;
  onSaved: (count: number) => void;
}

/**
 * Sprint 6A — « Saisir les résultats » d'une demande : date de prélèvement et laboratoire
 * communs, une ligne par examen demandé. Chaque résultat enregistré passe son examen à
 * « réalisé » ; la demande devient « partielle » ou « réalisée » (boucle fermée).
 * Tout le lot est enregistré dans une seule transaction. Bottom-sheet sur mobile.
 */
export function ResultatsDemandeForm({ demande, patientName, onClose, onSaved }: Props) {
  const { user, doctorProfile } = useAuth();
  const doctorId = doctorProfile?.id ?? null;
  const orgId = user?.org_id ?? null;
  const refs = useExamRefs();
  const lastUnits = useLastUnits();
  const { resultats } = usePatientResultats(demande.patient_id);
  const byCode = useMemo(() => new Map(refs.map(r => [r.code, r])), [refs]);

  const todayIso = toIsoDate(new Date());
  const [date, setDate] = useState(todayIso);
  const [labo, setLabo] = useState('');
  const [fields, setFields] = useState<Record<string, FieldState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Array<{ ligne: DemandeLigne; warn: DeltaWarning }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const saveRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const lock = useRef(createActionLock()).current;

  const rows = useMemo(() => lignesASaisir(demande.lignes).map(l => {
    const exam = l.examen_code ? byCode.get(l.examen_code) ?? null : null;
    const parametre = defaultParametre(exam);
    const mesure = examMesure(exam, parametre);
    const key = serieKey({ examen_code: exam?.code ?? null, parametre: mesure.parametre, libelle: exam?.libelle ?? l.libelle });
    return { ligne: l, exam, parametre, mesure, key, label: exam ? resultatLabel(exam, mesure.parametre) : l.libelle };
  }), [demande.lignes, byCode]);

  const fieldOf = (r: (typeof rows)[number]): FieldState => fields[r.ligne.id] ?? emptyField(defaultUnite(r.mesure, lastUnits[r.key]));
  const filled = rows.filter(r => { const f = fieldOf(r); return f.valeur.trim() || f.texte.trim(); }).length;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);
  // Le référentiel est en cache de session : le premier champ est prêt dès l'ouverture.
  const focused = useRef(false);
  useEffect(() => {
    if (focused.current || refs.length === 0) return;
    focused.current = true;
    inputs.current[0]?.focus({ preventScroll: true });
  }, [refs.length]);
  useEffect(() => { if (warnings.length > 0) confirmRef.current?.focus(); }, [warnings]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const save = (confirmed = false) => lock.run('save', async () => {
    if (saving || !doctorId || !orgId) return;
    setError(null);
    if (!date) { setError('Date de prélèvement obligatoire.'); return; }
    const errs: Record<string, string> = {};
    const drafts: Array<{ row: (typeof rows)[number]; draft: ResultatDraft }> = [];
    for (const r of rows) {
      const { draft, error: e } = fieldToDraft(fieldOf(r), r.exam, r.parametre, { demandeLigneId: r.ligne.id, ligneLibelle: r.ligne.libelle, ligneType: r.ligne.type });
      if (e) errs[r.ligne.id] = e;
      else if (draft) drafts.push({ row: r, draft });
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) { setError('Corrigez les valeurs signalées.'); return; }
    if (drafts.length === 0) { setError('Saisissez au moins un résultat.'); inputs.current[0]?.focus(); return; }
    if (!confirmed) {
      const ws = drafts.flatMap(({ row, draft }) => {
        if (!draft.nombre) return [];
        const w = deltaCheck({ valeur: draft.nombre.valeur, decimales: draft.nombre.decimales, unite: draft.unite }, findPrevious(resultats, row.key), row.mesure);
        return w ? [{ ligne: row.ligne, warn: w }] : [];
      });
      if (ws.length > 0) { setWarnings(ws); return; }
    }
    setSaving(true);
    try {
      const commun = { patient_id: demande.patient_id, org_id: orgId, doctor_id: doctorId, date_prelevement: date, laboratoire: labo };
      await saveResultats(drafts.map(d => buildResultatPayload(d.draft, commun)));
      notifyDataChanged('bilans');
      notifyDataChanged('examens');
      onSaved(drafts.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Les résultats n’ont pas pu être enregistrés');
      setWarnings([]);
    } finally {
      setSaving(false);
    }
  });

  const next = (i: number) => {
    for (let j = i + 1; j < rows.length; j++) if (inputs.current[j]) { inputs.current[j]!.focus(); return; }
    saveRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="resultats-demande-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (!saving) onClose(); }} />
      <div className="relative w-full sm:max-w-2xl bg-[#FAFAF7] dark:bg-[#0F172A] rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex justify-center pt-2.5 sm:hidden"><div className="w-10 h-1 rounded-full bg-slate-300" /></div>
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-[#E5E5E0] dark:border-white/[0.08] bg-white dark:bg-[#111827]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#E6F4EE] dark:bg-[#00A86B]/[0.12] flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="w-[18px] h-[18px] text-[#00A86B]" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 id="resultats-demande-title" className="text-base font-bold text-[#0A1628] dark:text-[#E2E8F0] truncate">Saisir les résultats</h2>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate">{patientName} · demande du {formatFr(demande.date_demande)}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Fermer"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1]">Date de prélèvement
              <input type="date" value={date} max={todayIso} onChange={e => setDate(e.target.value)} disabled={saving} className={`${INPUT} mt-1 block w-full`} />
            </label>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1]">Laboratoire <span className="font-normal text-slate-400">(facultatif)</span>
              <input type="text" value={labo} maxLength={120} onChange={e => setLabo(e.target.value)} disabled={saving} className={`${INPUT} mt-1 block w-full`} />
            </label>
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] py-6 text-center">Tous les examens de cette demande ont déjà un résultat.</p>
          ) : (
            <ul className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.06] divide-y divide-slate-100 dark:divide-white/[0.05]">
              {rows.map((r, i) => {
                const prev = findPrevious(resultats, r.key);
                const err = errors[r.ligne.id];
                return (
                  <li key={r.ligne.id} className="px-3.5 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0] break-words">{r.label}</p>
                      {prev && <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">Précédent : {valeurAffichee(prev, 30)} le {formatFr(prev.date_prelevement)}</p>}
                    </div>
                    {r.label !== r.ligne.libelle && r.exam && r.mesure.parametre && (
                      <p className="text-[11px] text-slate-400 dark:text-[#64748B]">{r.ligne.libelle}</p>
                    )}
                    <div className="mt-2">
                      <ResultFields exam={r.exam} parametre={r.parametre} field={fieldOf(r)} id={`res-${r.ligne.id}`} label={r.label} disabled={saving}
                        inputRef={el => { inputs.current[i] = el; }} onEnter={() => next(i)}
                        onChange={f => { setFields(s => ({ ...s, [r.ligne.id]: f })); setWarnings([]); if (err) setErrors(({ [r.ligne.id]: _, ...rest }) => rest); }} />
                    </div>
                    {err && <p role="alert" className="mt-1.5 text-xs text-[#B91C1C] dark:text-red-300">{err}</p>}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-[11px] text-slate-400 dark:text-[#64748B]">
            Les examens laissés vides restent en attente. L’interprétation (bas / haut) n’est calculée qu’à partir des bornes du laboratoire que vous saisissez.
          </p>

          {warnings.length > 0 && (
            <div role="alertdialog" aria-label="Valeurs à vérifier" className="rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3">
              <ul className="space-y-1.5">
                {warnings.map(w => (
                  <li key={w.ligne.id} className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
                    <span><span className="font-semibold">{w.ligne.libelle} : </span>{w.warn.message}
                      {w.warn.uniteProbable && <span className="block text-xs opacity-80">Cette valeur correspond au résultat précédent exprimé en {w.warn.uniteProbable}.</span>}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-2.5 ml-6 flex flex-wrap gap-2">
                <button type="button" onClick={() => { const i = rows.findIndex(r => r.ligne.id === warnings[0].ligne.id); setWarnings([]); inputs.current[i]?.focus(); inputs.current[i]?.select?.(); }}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-[#0A1628] hover:bg-[#1A2B42] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0A1628]">
                  Corriger
                </button>
                <button ref={confirmRef} type="button" onClick={() => void save(true)} disabled={saving}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-[#0A1628] dark:text-[#E2E8F0] bg-white dark:bg-transparent border border-[#E5E5E0] dark:border-white/[0.12] hover:border-[#0A1628] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B] disabled:opacity-50">
                  {saving ? 'Enregistrement…' : 'Confirmer et enregistrer'}
                </button>
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="flex items-start gap-1.5 text-sm text-[#B91C1C] dark:text-red-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden /> {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-[#E5E5E0] dark:border-white/[0.08] bg-white dark:bg-[#111827] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="text-xs text-slate-500 dark:text-[#94A3B8]">{filled} / {rows.length} renseigné{filled > 1 ? 's' : ''}</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={saving}
              className="px-3.5 py-2.5 rounded-lg text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0] border border-[#E5E5E0] dark:border-white/[0.12] hover:border-[#0A1628] disabled:opacity-50">
              Annuler
            </button>
            <button ref={saveRef} type="button" onClick={() => void save()} disabled={saving || filled === 0 || !doctorId || warnings.length > 0}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#00A86B] hover:bg-[#006B47] active:scale-[0.98] transition-all disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00A86B]">
              {saving ? 'Enregistrement…' : `Enregistrer${filled > 0 ? ` (${filled})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
