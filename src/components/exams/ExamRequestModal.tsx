import { useEffect, useMemo, useRef, useState } from 'react';
import { X, FlaskConical, Printer, Download, Share2, CalendarPlus, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import type { Patient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { notifyDataChanged } from '../../lib/dataSync';
import {
  emptyExamDraft, examDraftHasContent, renewDraftFromDemande, validateExamDraft, formatFr, suggestedControlDate, toIsoDate,
  type DemandeExamens, type ExamRequestDraft, type EcheanceResult,
} from '../../lib/examRequest';
import { buildExamPages, examFileName } from '../../lib/examDocument';
import { buildExamPdf, canSharePdf } from '../../lib/examPdf';
import { createDemande } from '../../lib/examensApi';
import { clearExamDraft, docInputFromDraft, loadExamDraft, outputPdf, saveExamDraft, type OutputMode } from '../../lib/examUi';
import { useExamPrintContext, useExamReferentiel, usePatientDemandes, usePatientExamContext } from '../../hooks/useExamData';
import { ExamRequestEditor } from './ExamRequestEditor';
import { ExamPagesPreview } from './ExamPagesPreview';

interface Props {
  patient: Patient;
  renewFrom?: DemandeExamens | null;
  /** Médicaments en cours de prescription dans le Vérificateur (noms + DCI). */
  currentMedicaments?: string[];
  onClose: () => void;
  onPlanRdv?: (patient: Patient, dateIso: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

interface Saved { numero: string; echeance: EcheanceResult; draft: ExamRequestDraft; dateIso: string }

/**
 * Sprint 5 — Document autonome « Demande d'examens » : sans médicament, donc HORS du
 * blocage 3b (qui ne concerne que les lignes de médicaments). Bottom-sheet sur mobile.
 */
export function ExamRequestModal({ patient, renewFrom = null, currentMedicaments = [], onClose, onPlanRdv, showToast }: Props) {
  const { user, doctorProfile } = useAuth();
  const doctorId = doctorProfile?.id ?? null;
  const orgId = user?.org_id ?? null;
  const { refs, packs, loading: refsLoading, failed: refsFailed, reload, reloadPacks } = useExamReferentiel(true);
  const { demandes } = usePatientDemandes(patient.id);
  const ctx = usePatientExamContext(patient.id, true);
  const printCtx = useExamPrintContext();

  const [draft, setDraft] = useState<ExamRequestDraft>(emptyExamDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [busy, setBusy] = useState<OutputMode | null>(null);

  // Brouillon enregistré : PROPOSÉ (jamais repris d'office).
  const [stored, setStored] = useState<{ draft: ExamRequestDraft; savedAt: number } | null>(() =>
    (doctorId && !renewFrom ? loadExamDraft(doctorId, patient.id) : null));

  // « Renouveler » : les examens sont rechargés dès que le référentiel est disponible.
  const renewedRef = useRef(false);
  useEffect(() => {
    if (!renewFrom || renewedRef.current || refs.length === 0) return;
    renewedRef.current = true;
    setDraft(renewDraftFromDemande(renewFrom, refs));
  }, [renewFrom, refs]);

  // Sauvegarde du brouillon (debounce) — suspendue tant qu'un brouillon attend une décision.
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (!doctorId || saved || stored) return;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => saveExamDraft(doctorId, patient.id, draft), 500);
    return () => { if (timer.current !== null) window.clearTimeout(timer.current); };
  }, [draft, doctorId, patient.id, saved, stored]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const validation = useMemo(() => validateExamDraft(draft, new Date(), ctx.nextRdvDate), [draft, ctx.nextRdvDate]);
  const hasContent = examDraftHasContent(draft);

  const requestClose = () => {
    if (saving) return;
    if (!saved && hasContent) setConfirmClose(true); else onClose();
  };
  const abandon = () => {
    if (doctorId) clearExamDraft(doctorId, patient.id);
    onClose();
  };

  // Échap : ferme l'élément le plus haut (confirmation, puis modale), jamais le tableau de bord.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Capture : le tableau de bord (désélection du patient) ignore un événement déjà traité.
      e.preventDefault();
      // Un champ qui gère lui-même Échap (liste de recherche ouverte, nom de pack) garde la main.
      if ((e.target as HTMLElement | null)?.closest?.('[data-esc-own]')) return;
      e.stopImmediatePropagation();
      if (confirmClose) setConfirmClose(false); else requestClose();
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmClose, hasContent, saved, saving]);

  const handleSave = async () => {
    if (saving || saved) return;
    if (!doctorId || !orgId) { setError('Profil médecin non chargé — rechargez la page.'); return; }
    if (!validation.ok || !validation.echeance) { setError(validation.errors[0] ?? 'Demande incomplète.'); return; }
    setSaving(true);
    setError(null);
    try {
      const today = new Date();
      const r = await createDemande(draft, { patientId: patient.id, orgId, doctorId }, validation.echeance, today);
      clearExamDraft(doctorId, patient.id);
      setSaved({ numero: r.numero, echeance: validation.echeance, draft, dateIso: toIsoDate(today) });
      notifyDataChanged('examens');
      showToast?.('Demande d’examens enregistrée', 'success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La demande n’a pas pu être enregistrée. Rien n’a été créé.');
    } finally {
      setSaving(false);
    }
  };

  const pages = useMemo(() => (saved
    ? buildExamPages(docInputFromDraft(saved.draft, { numero: saved.numero, dateIso: saved.dateIso, echeance: saved.echeance, patient }))
    : []), [saved, patient]);

  const output = async (mode: OutputMode) => {
    if (!saved || busy || !printCtx.me) return;
    setBusy(mode);
    setError(null);
    try {
      const file = await buildExamPdf(pages, { doctor: printCtx.me.header, org: printCtx.org }, {
        logoUrl: printCtx.me.logoUrl, fileName: examFileName(patient, saved.numero),
      });
      const msg = await outputPdf(file, mode, `Examens à réaliser — ${patient.prenom} ${patient.nom}`);
      showToast?.(msg, 'info');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la génération du PDF');
    } finally {
      setBusy(null);
    }
  };

  const shareable = useMemo(() => canSharePdf(), []);
  const storedDate = stored ? new Date(stored.savedAt) : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="exam-modal-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={requestClose} />
      <div className="relative w-full sm:max-w-3xl bg-[#FAFAF7] rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex justify-center pt-2.5 sm:hidden"><div className="w-10 h-1 rounded-full bg-slate-300" /></div>
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-[#E5E5E0] bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#E6F4EE] flex items-center justify-center flex-shrink-0">
              <FlaskConical className="w-4.5 h-4.5 text-[#00A86B]" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 id="exam-modal-title" className="text-base font-bold text-[#0A1628]">{saved ? 'Demande enregistrée' : 'Demande d’examens'}</h2>
              <p className="text-xs text-slate-500 truncate">{patient.prenom} {patient.nom}{saved ? ` · N° ${saved.numero}` : ''}</p>
            </div>
          </div>
          <button type="button" onClick={requestClose} aria-label="Fermer" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-4">
          {!saved && stored && (
            <div role="status" className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 rounded-xl bg-white border border-slate-200 border-l-4 border-l-[#0A1628]">
              <p className="flex items-center gap-2 text-sm text-[#0A1628] flex-1 min-w-0">
                <Clock className="w-4 h-4 flex-shrink-0" aria-hidden />
                <span><span className="font-semibold">Brouillon du {storedDate!.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} {storedDate!.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span> ({stored.draft.lines.length} examen{stored.draft.lines.length > 1 ? 's' : ''})</span>
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setDraft(stored.draft); setStored(null); }} className="px-3 py-1.5 rounded-lg bg-[#00A86B] hover:bg-[#006B47] text-white text-sm font-semibold transition-colors">Reprendre</button>
                <button type="button" onClick={() => { if (doctorId) clearExamDraft(doctorId, patient.id); setStored(null); }} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Supprimer</button>
              </div>
            </div>
          )}

          {!saved ? (
            <ExamRequestEditor
              patient={patient} draft={draft} onChange={setDraft}
              refs={refs} packs={packs} refsLoading={refsLoading} refsFailed={refsFailed}
              onRetryRefs={() => void reload()} onPacksChanged={() => void reloadPacks()}
              demandes={demandes} ctx={ctx} extraMedicaments={currentMedicaments} autoFocusSearch
            />
          ) : (
            <>
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#E6F4EE] border border-[#00A86B]/20">
                <CheckCircle2 className="w-5 h-5 text-[#00A86B] flex-shrink-0 mt-0.5" aria-hidden />
                <p className="text-sm text-[#0A1628]">
                  <span className="font-semibold">{saved.draft.lines.length} examen{saved.draft.lines.length > 1 ? 's' : ''} en attente de résultat.</span>{' '}
                  À réaliser avant le <span className="font-semibold">{formatFr(saved.echeance.date)}</span>. La demande reste suivie jusqu’à sa réalisation ou son annulation.
                </p>
              </div>
              <ExamPagesPreview pages={pages} />
            </>
          )}

          {error && (
            <div role="alert" className="flex items-start gap-2 px-4 py-3 rounded-xl bg-[#FEF2F2] border border-[#DC2626]/30 text-sm text-[#0A1628]">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#DC2626]" aria-hidden /> {error}
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-3 border-t border-[#E5E5E0] bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {!saved ? (
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
              {hasContent && !validation.ok && <p className="text-xs text-amber-800 sm:mr-auto">{validation.errors[0]}</p>}
              <button type="button" onClick={requestClose} disabled={saving} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#0A1628] border border-[#E5E5E0] hover:border-[#0A1628] transition-colors disabled:opacity-50">Annuler</button>
              <button type="button" onClick={() => void handleSave()} disabled={saving || !validation.ok}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#00A86B] hover:bg-[#006B47] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {saving ? 'Enregistrement…' : `Enregistrer la demande${draft.lines.length ? ` (${draft.lines.length})` : ''}`}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {onPlanRdv && (
                <button type="button" onClick={() => { onPlanRdv(patient, suggestedControlDate(saved.echeance.date)); onClose(); }}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#0A1628] border border-[#E5E5E0] hover:border-[#0A1628] transition-colors sm:mr-auto">
                  <CalendarPlus className="w-4 h-4" aria-hidden /> Planifier un RDV de contrôle
                </button>
              )}
              {shareable && (
                <button type="button" onClick={() => void output('share')} disabled={!!busy}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#0A1628] border border-[#E5E5E0] hover:border-[#0A1628] disabled:opacity-50 transition-colors">
                  <Share2 className="w-4 h-4" aria-hidden /> {busy === 'share' ? 'Préparation…' : 'Partager'}
                </button>
              )}
              <button type="button" onClick={() => void output('download')} disabled={!!busy}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#0A1628] border border-[#E5E5E0] hover:border-[#0A1628] disabled:opacity-50 transition-colors">
                <Download className="w-4 h-4" aria-hidden /> {busy === 'download' ? 'Génération…' : 'PDF'}
              </button>
              <button type="button" onClick={() => void output('print')} disabled={!!busy}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#00A86B] hover:bg-[#006B47] disabled:opacity-50 transition-colors">
                <Printer className="w-4 h-4" aria-hidden /> {busy === 'print' ? 'Préparation…' : 'Imprimer'}
              </button>
            </div>
          )}
        </div>

        {confirmClose && (
          <div className="absolute inset-0 z-10 flex items-end sm:items-center justify-center sm:p-4" role="alertdialog" aria-modal="true" aria-labelledby="exam-abandon-title">
            <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmClose(false)} />
            <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-5">
              <h3 id="exam-abandon-title" className="text-base font-bold text-[#0A1628]">Abandonner cette demande d’examens ?</h3>
              <p className="text-sm text-slate-600 mt-1.5">La saisie en cours ({draft.lines.length} examen{draft.lines.length > 1 ? 's' : ''}) n’est pas enregistrée.</p>
              <div className="mt-4 flex flex-col gap-2">
                <button type="button" autoFocus onClick={() => setConfirmClose(false)} className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#00A86B] hover:bg-[#006B47] transition-colors">Continuer la saisie</button>
                <button type="button" onClick={() => { if (doctorId) saveExamDraft(doctorId, patient.id, draft); onClose(); }} className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-[#0A1628] border border-slate-200 hover:bg-slate-50 transition-colors">Fermer et garder le brouillon</button>
                <button type="button" onClick={abandon} className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-[#DC2626] border border-[#DC2626]/40 hover:bg-[#DC2626]/[0.06] transition-colors">Abandonner</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
