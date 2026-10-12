import { useMemo, useRef, useState } from 'react';
import { Send, ChevronDown, Plus, Printer, Download, Share2, Copy, X, Check, MessageSquareReply, AlertTriangle, Clock, Undo2 } from 'lucide-react';
import type { Patient } from '../../lib/supabase';
import { notifyDataChanged } from '../../lib/dataSync';
import { createActionLock } from '../../lib/viewCache';
import { formatFr, toIsoDate } from '../../lib/examRequest';
import { canSharePdf } from '../../lib/examPdf';
import type { OutputMode } from '../../lib/examUi';
import { annulerLettre, marquerEnvoyee, marquerReponseRecue, remettreNonEnvoyee, type LettreAdressage } from '../../lib/adressageApi';
import { destinataireCourt, openAdressage, outputLettre } from '../../lib/adressageUi';
import { STATUT_LETTRE, badgeSansReponse, markupToHtml, mentionUrgence, trierLettres, type LettreStatut } from '../../lib/lettreTexte';
import { usePatientLettres } from '../../hooks/useAdressages';

const STATUT_CLS: Record<LettreStatut, string> = {
  brouillon: 'bg-slate-100 text-slate-700 dark:bg-white/[0.07] dark:text-[#CBD5E1]',
  envoyee: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  reponse_recue: 'bg-[#E6F4EE] text-[#006B47] dark:bg-[#00A86B]/[0.12] dark:text-[#00A86B]',
  annulee: 'bg-slate-100 text-slate-500 line-through dark:bg-white/[0.05] dark:text-[#64748B]',
};

const btn = 'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors active:scale-[0.98] disabled:opacity-50';
const btnNeutral = `${btn} text-[#0A1628] dark:text-[#E2E8F0] bg-white dark:bg-transparent border-[#E5E5E0] dark:border-white/[0.12] hover:border-[#0A1628] dark:hover:border-white/30`;
const btnPrimary = `${btn} text-white bg-[#00A86B] border-[#00A86B] hover:bg-[#006B47]`;
const field = 'w-full px-3 py-2 text-sm bg-white dark:bg-[#0A0F1E] border border-[#E5E5E0] dark:border-white/[0.12] rounded-lg text-[#0A1628] dark:text-[#E2E8F0] focus:outline-none focus:border-[#00A86B] focus:ring-2 focus:ring-[#00A86B]/15';

type Pending = 'envoyee' | 'reponse' | 'annuler';

/**
 * Une lettre d'adressage : statut, destinataire, texte figé, suivi (envoyée → réponse reçue,
 * annulation motivée), réimpression à l'identique et duplication. `canWrite` faux (secrétaire) :
 * lecture et réimpression seulement.
 */
export function LettreCard({ lettre: l, patient, canWrite, patientLabel, collapsed = false }: {
  lettre: LettreAdressage;
  patient: Patient | null;
  canWrite: boolean;
  /** Nom du patient affiché sur la carte (listes multi-patients). */
  patientLabel?: string | null;
  collapsed?: boolean;
}) {
  const today = new Date();
  const todayIso = toIsoDate(today);
  const [expanded, setExpanded] = useState(!collapsed);
  const [showText, setShowText] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [date, setDate] = useState(todayIso);
  const [texte, setTexte] = useState('');
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<OutputMode | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const lock = useRef(createActionLock()).current;
  const shareable = useMemo(() => canSharePdf(), []);

  const retard = badgeSansReponse(l, today);
  const mention = mentionUrgence(l.urgence);
  const ouverte = l.statut === 'brouillon' || l.statut === 'envoyee';

  const run = (fn: () => Promise<unknown>, ok: string) => lock.run('write', async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      setPending(null);
      setTexte('');
      notifyDataChanged('adressages');
      setMessage({ type: 'ok', text: ok });
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Action impossible' });
    } finally {
      setBusy(false);
    }
  });

  const confirm = () => {
    if (pending === 'envoyee') void run(() => marquerEnvoyee(l.id, date), 'Lettre marquée « Envoyée »');
    else if (pending === 'reponse') void run(() => marquerReponseRecue(l.id, date, texte), 'Réponse enregistrée');
    else if (pending === 'annuler') {
      if (texte.trim().length < 3) { setMessage({ type: 'err', text: 'Motif d’annulation obligatoire.' }); return; }
      void run(() => annulerLettre(l.id, texte), 'Adressage annulé');
    }
  };

  const print = (mode: OutputMode) => lock.run('pdf', async () => {
    if (out) return;
    setOut(mode);
    setMessage(null);
    try {
      const msg = await outputLettre(l, patient, mode);
      if (mode !== 'download') setMessage({ type: 'ok', text: msg });
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Erreur lors de la génération du PDF' });
    } finally {
      setOut(null);
    }
  });

  const open = (p: Pending) => { setPending(p); setDate(todayIso); setTexte(''); setMessage(null); };

  return (
    <article className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm overflow-hidden">
      <button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
        <span className="flex-1 min-w-0">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUT_CLS[l.statut]}`}>{STATUT_LETTRE[l.statut]}</span>
            {mention && l.statut !== 'annulee' && <span className="text-[10px] font-bold uppercase tracking-wide text-[#0A1628] dark:text-[#E2E8F0]">{mention}</span>}
            {retard && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF2F2] text-[#B91C1C] ring-1 ring-inset ring-[#DC2626]/20 dark:bg-[#DC2626]/[0.12] dark:text-red-300">
                <Clock className="w-3 h-3" aria-hidden /> {retard}
              </span>
            )}
          </span>
          <span className="block mt-1.5 text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0] truncate">
            {patientLabel ? `${patientLabel} → ` : ''}{destinataireCourt(l)}
          </span>
          <span className="block text-xs text-slate-500 dark:text-[#94A3B8] truncate">
            {l.motif} · lettre du {formatFr(l.date_lettre)}
            {l.date_envoi ? ` · envoyée le ${formatFr(l.date_envoi)}` : ''}
            {l.reponse_date ? ` · réponse le ${formatFr(l.reponse_date)}` : ''}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 mt-1 text-slate-400 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-white/[0.06] pt-3">
          {l.statut === 'reponse_recue' && (
            <div className="px-3 py-2.5 rounded-xl bg-[#E6F4EE] dark:bg-[#00A86B]/[0.08] border border-[#00A86B]/20">
              <p className="text-xs font-semibold text-[#006B47] dark:text-[#00A86B]">Réponse reçue le {formatFr(l.reponse_date)}</p>
              {l.reponse_resume
                ? <p className="text-sm text-[#0A1628] dark:text-[#E2E8F0] mt-1 whitespace-pre-wrap">{l.reponse_resume}</p>
                : <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">Aucun résumé saisi.</p>}
            </div>
          )}
          {l.statut === 'annulee' && l.motif_annulation && (
            <p className="text-xs text-slate-600 dark:text-[#94A3B8]"><span className="font-semibold">Annulée :</span> {l.motif_annulation}</p>
          )}
          {l.question_posee && <p className="text-xs text-slate-600 dark:text-[#94A3B8]"><span className="font-semibold">Question posée :</span> {l.question_posee}</p>}

          <div>
            <button type="button" onClick={() => setShowText(v => !v)} aria-expanded={showText}
              className="text-xs font-semibold text-[#006B47] dark:text-[#00A86B] hover:underline underline-offset-2">
              {showText ? 'Masquer le texte' : 'Lire la lettre'}
            </button>
            {showText && (
              <div className="mt-2 px-3 py-2.5 rounded-xl bg-[#FAFAF7] dark:bg-white/[0.03] border border-[#E5E5E0] dark:border-white/[0.06] text-sm leading-relaxed text-[#0A1628] dark:text-[#E2E8F0] [&_p]:mb-2.5 [&_p:last-child]:mb-0 [&_strong]:font-bold"
                dangerouslySetInnerHTML={{ __html: markupToHtml(l.contenu_final) }} />
            )}
          </div>

          {pending && (
            <div className="px-3 py-3 rounded-xl bg-[#FAFAF7] dark:bg-white/[0.03] border border-[#E5E5E0] dark:border-white/[0.08] space-y-2.5">
              {pending !== 'annuler' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-[#94A3B8] mb-1" htmlFor={`adr-date-${l.id}`}>
                    {pending === 'envoyee' ? 'Date d’envoi' : 'Date de la réponse'}
                  </label>
                  <input id={`adr-date-${l.id}`} type="date" className={field} value={date} max={todayIso} min={pending === 'envoyee' ? l.date_lettre : (l.date_envoi ?? l.date_lettre)}
                    onChange={e => setDate(e.target.value)} />
                </div>
              )}
              {pending !== 'envoyee' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-[#94A3B8] mb-1" htmlFor={`adr-txt-${l.id}`}>
                    {pending === 'reponse' ? 'Résumé de la réponse' : 'Motif de l’annulation *'}
                  </label>
                  <textarea id={`adr-txt-${l.id}`} rows={pending === 'reponse' ? 3 : 2} autoFocus className={`${field} resize-y`} value={texte} onChange={e => setTexte(e.target.value)}
                    placeholder={pending === 'reponse' ? 'Conclusion du confrère, conduite à tenir…' : 'Patient perdu de vue, adressage devenu sans objet…'} />
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => setPending(null)} disabled={busy} className={btnNeutral}>Retour</button>
                <button type="button" onClick={confirm} disabled={busy || (pending !== 'annuler' && !date)} className={btnPrimary}>
                  {busy ? 'Enregistrement…' : pending === 'annuler' ? 'Confirmer l’annulation' : 'Confirmer'}
                </button>
              </div>
            </div>
          )}

          {message && (
            <p role={message.type === 'err' ? 'alert' : 'status'} className={`flex items-start gap-1.5 text-xs font-medium ${message.type === 'err' ? 'text-[#B91C1C] dark:text-red-300' : 'text-[#006B47] dark:text-[#00A86B]'}`}>
              {message.type === 'err' ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden /> : <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden />} {message.text}
            </p>
          )}

          {!pending && (
            <div className="flex flex-wrap gap-2">
              {canWrite && l.statut === 'brouillon' && (
                <button type="button" onClick={() => open('envoyee')} className={btnPrimary}><Send className="w-3.5 h-3.5" aria-hidden /> Marquer « Envoyée »</button>
              )}
              {canWrite && ouverte && (
                <button type="button" onClick={() => open('reponse')} className={l.statut === 'envoyee' ? btnPrimary : btnNeutral}><MessageSquareReply className="w-3.5 h-3.5" aria-hidden /> Réponse reçue</button>
              )}
              <button type="button" onClick={() => void print('print')} disabled={!!out} className={btnNeutral}><Printer className="w-3.5 h-3.5" aria-hidden /> {out === 'print' ? 'Préparation…' : 'Réimprimer'}</button>
              <button type="button" onClick={() => void print('download')} disabled={!!out} className={btnNeutral}><Download className="w-3.5 h-3.5" aria-hidden /> PDF</button>
              {shareable && <button type="button" onClick={() => void print('share')} disabled={!!out} className={btnNeutral}><Share2 className="w-3.5 h-3.5" aria-hidden /> Partager</button>}
              {canWrite && patient && (
                <button type="button" onClick={() => openAdressage({ patient, duplicateFrom: l })} className={btnNeutral}><Copy className="w-3.5 h-3.5" aria-hidden /> Dupliquer</button>
              )}
              {canWrite && l.statut === 'envoyee' && (
                <button type="button" disabled={busy} onClick={() => void run(() => remettreNonEnvoyee(l.id), 'Lettre remise « Non envoyée »')} className={btnNeutral}><Undo2 className="w-3.5 h-3.5" aria-hidden /> Non envoyée</button>
              )}
              {canWrite && ouverte && (
                <button type="button" onClick={() => open('annuler')} className={`${btn} text-[#B91C1C] dark:text-red-300 bg-white dark:bg-transparent border-[#DC2626]/30 hover:border-[#DC2626]`}><X className="w-3.5 h-3.5" aria-hidden /> Annuler</button>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * Sprint 7 — Profil patient, « Adressages » : lettres en cours (les plus en retard d'abord),
 * historique repliable. Une lettre ne quitte la liste active que sur réponse reçue ou annulation.
 */
export function AdressagesSection({ patient, canWrite }: { patient: Patient; canWrite: boolean }) {
  const { lettres, loading, error, reload } = usePatientLettres(patient.id);
  const [showHistory, setShowHistory] = useState(false);
  const sorted = useMemo(() => trierLettres(lettres, new Date()), [lettres]);
  const ouvertes = sorted.filter(l => l.statut === 'brouillon' || l.statut === 'envoyee');
  const closes = sorted.filter(l => l.statut === 'reponse_recue' || l.statut === 'annulee');
  const attente = ouvertes.filter(l => l.statut === 'envoyee').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0]">Adressages</h3>
          {!loading && (
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
              {attente === 0 ? 'Aucune réponse en attente' : `${attente} réponse${attente > 1 ? 's' : ''} en attente`}
            </p>
          )}
        </div>
        {canWrite && (
          <button type="button" onClick={() => openAdressage({ patient })}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#00A86B] hover:bg-[#006B47] active:bg-[#006B47] text-white rounded-xl text-xs font-semibold transition-colors shadow-sm shadow-[#00A86B]/20">
            <Plus className="w-3.5 h-3.5" aria-hidden /> Adresser à un confrère
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
          {[1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-white/[0.06] animate-pulse" />)}
        </div>
      ) : lettres.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-white/[0.05] rounded-2xl flex items-center justify-center mb-4">
            <Send className="w-8 h-8 text-slate-300 dark:text-slate-700" aria-hidden />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-[#94A3B8]">Aucun adressage</p>
          <p className="text-xs text-slate-400 dark:text-[#475569] mt-1 max-w-xs">
            Les lettres adressées à un confrère pour ce patient apparaîtront ici, avec leur suivi jusqu’à la réponse.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {ouvertes.map(l => <LettreCard key={l.id} lettre={l} patient={patient} canWrite={canWrite} />)}
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
                  {closes.map(l => <LettreCard key={l.id} lettre={l} patient={patient} canWrite={canWrite} collapsed />)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
