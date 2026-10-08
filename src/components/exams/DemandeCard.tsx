import { useState } from 'react';
import {
  Check, X, Printer, Download, Share2, RotateCcw, CalendarPlus, Undo2, AlertTriangle, FileText, Clock,
} from 'lucide-react';
import type { Patient } from '../../lib/supabase';
import { notifyDataChanged } from '../../lib/dataSync';
import {
  formatFr, formatFrShort, fullPrecision, isOpen, joursRetard, suggestedControlDate, toIsoDate,
  type DemandeExamens, type DemandeLigne,
} from '../../lib/examRequest';
import { cancelDemande, cancelLigne, markDemandeRealisee, setLigneStatut } from '../../lib/examensApi';
import { openExamRequest, outputDemande, requestPlanRdv, type OutputMode, type PrintContext } from '../../lib/examUi';
import { canSharePdf } from '../../lib/examPdf';

const STATUT_LABEL: Record<DemandeExamens['statut'], { label: string; cls: string }> = {
  en_attente: { label: 'En attente', cls: 'bg-slate-100 text-slate-700 dark:bg-white/[0.07] dark:text-[#CBD5E1]' },
  partiel: { label: 'Partiel', cls: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20' },
  realise: { label: 'Réalisée', cls: 'bg-[#E6F4EE] text-[#006B47] dark:bg-[#00A86B]/[0.12] dark:text-[#00A86B]' },
  annule: { label: 'Annulée', cls: 'bg-slate-100 text-slate-500 line-through dark:bg-white/[0.05] dark:text-[#64748B]' },
};

type Pending =
  | { kind: 'realise'; ligne: DemandeLigne | null }
  | { kind: 'annule'; ligne: DemandeLigne | null };

interface Props {
  demande: DemandeExamens;
  patient: Patient | null;
  canWrite: boolean;
  printCtx: PrintContext;
  /** Affiche le nom du patient (listes multi-patients) et un lien vers sa fiche. */
  showPatient?: boolean;
  onOpenPatient?: (patientId: string) => void;
  /** Carte repliée par défaut (historique). */
  collapsed?: boolean;
}

const btn = 'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors active:scale-[0.98] disabled:opacity-50';
const btnNeutral = `${btn} text-[#0A1628] dark:text-[#E2E8F0] bg-white dark:bg-transparent border-[#E5E5E0] dark:border-white/[0.12] hover:border-[#0A1628] dark:hover:border-white/30`;
const btnPrimary = `${btn} text-white bg-[#00A86B] border-[#00A86B] hover:bg-[#006B47]`;

/** Une demande d'examens : détail par ligne, suivi (réalisé / annulé), réimpression, renouvellement. */
export function DemandeCard({ demande: d, patient, canWrite, printCtx, showPatient = false, onOpenPatient, collapsed = false }: Props) {
  const [expanded, setExpanded] = useState(!collapsed);
  const [pending, setPending] = useState<Pending | null>(null);
  const [date, setDate] = useState(() => toIsoDate(new Date()));
  const [motif, setMotif] = useState('');
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<OutputMode | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const today = new Date();
  const todayIso = toIsoDate(today);
  const open = isOpen(d);
  const retard = joursRetard(d, today);
  const attente = d.lignes.filter(l => l.statut === 'en_attente');
  const realisees = d.lignes.filter(l => l.statut === 'realise').length;
  const st = STATUT_LABEL[d.statut];
  const shareable = canSharePdf();

  const run = async (fn: () => Promise<void>, ok: string) => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      setPending(null);
      setMotif('');
      notifyDataChanged('examens');
      setMessage({ type: 'ok', text: ok });
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Action impossible' });
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    if (!pending) return;
    if (pending.kind === 'realise') {
      const l = pending.ligne;
      void run(() => (l ? setLigneStatut(l.id, 'realise', date) : markDemandeRealisee(d.id, date)), l ? 'Examen marqué réalisé' : 'Demande marquée réalisée');
    } else {
      if (motif.trim().length < 3) { setMessage({ type: 'err', text: 'Motif d’annulation obligatoire.' }); return; }
      const l = pending.ligne;
      void run(() => (l ? cancelLigne(l, d, motif) : cancelDemande(d.id, motif)), l ? 'Examen annulé' : 'Demande annulée');
    }
  };

  const print = async (mode: OutputMode) => {
    if (out || !patient) return;
    setOut(mode);
    setMessage(null);
    try {
      const msg = await outputDemande(d, patient, printCtx, mode);
      if (mode !== 'download') setMessage({ type: 'ok', text: msg });
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Erreur lors de la génération du PDF' });
    } finally {
      setOut(null);
    }
  };

  return (
    <div className={`bg-white dark:bg-[#111827] rounded-2xl border ${retard > 0 ? 'border-[#DC2626]/25' : 'border-slate-200/80 dark:border-white/[0.06]'} overflow-hidden`}>
      <button type="button" onClick={() => setExpanded(e => !e)} aria-expanded={expanded}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00A86B]">
        <div className="flex-1 min-w-0">
          {showPatient && (
            <p className="text-sm font-bold text-[#0A1628] dark:text-[#E2E8F0] truncate">
              {patient ? `${patient.prenom} ${patient.nom}` : 'Patient inconnu'}
            </p>
          )}
          <p className={`${showPatient ? 'text-xs text-slate-500 dark:text-[#94A3B8]' : 'text-sm font-bold text-[#0A1628] dark:text-[#E2E8F0]'}`}>
            {open ? <>À réaliser avant le {formatFr(d.echeance_date)}</> : <>Demande du {formatFr(d.date_demande)}</>}
          </p>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5 truncate">
            {d.lignes.length} examen{d.lignes.length > 1 ? 's' : ''}{realisees > 0 && open ? ` · ${realisees} réalisé${realisees > 1 ? 's' : ''}` : ''}
            {open ? ` · demandé le ${formatFrShort(d.date_demande)}` : ''} · {d.numero}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {retard > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF2F2] text-[#B91C1C] ring-1 ring-inset ring-[#DC2626]/20 dark:bg-[#DC2626]/[0.12] dark:text-red-300">
                <Clock className="w-3 h-3" aria-hidden /> En retard de {retard} jour{retard > 1 ? 's' : ''}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
            {d.urgent && open && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#0A1628] text-white">Urgent</span>}
            {d.ordonnance_id && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-white/[0.07] dark:text-[#94A3B8]">
                <FileText className="w-3 h-3" aria-hidden /> avec ordonnance
              </span>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-white/[0.06]">
          {d.renseignements_cliniques && (
            <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-3"><span className="font-semibold">Renseignements cliniques : </span>{d.renseignements_cliniques}</p>
          )}
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-white/[0.05]">
            {d.lignes.map(l => {
              const prec = fullPrecision({ precision: l.precision ?? '', injection: l.injection });
              return (
                <li key={l.id} className="py-2 flex items-start gap-2.5">
                  <span aria-hidden className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${l.statut === 'realise' ? 'bg-[#00A86B]' : l.statut === 'annule' ? 'bg-slate-300 dark:bg-slate-600' : 'bg-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold break-words ${l.statut === 'annule' ? 'text-slate-400 line-through dark:text-[#64748B]' : 'text-[#0A1628] dark:text-[#E2E8F0]'}`}>
                      {l.libelle}{l.a_jeun && l.statut === 'en_attente' ? <span className="ml-1.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300 align-middle">à jeun</span> : null}
                    </p>
                    {(prec || l.question_clinique) && (
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8] break-words">{[prec, l.question_clinique ? `Question : ${l.question_clinique}` : ''].filter(Boolean).join(' · ')}</p>
                    )}
                    <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-0.5">
                      {l.statut === 'realise' ? `Réalisé le ${formatFr(l.date_realisation)} — résultat à saisir` : l.statut === 'annule' ? 'Annulé' : 'En attente de résultat'}
                    </p>
                  </div>
                  {canWrite && l.statut === 'en_attente' && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button type="button" disabled={busy} title="Marquer réalisé" aria-label={`Marquer ${l.libelle} réalisé`}
                        onClick={() => { setDate(todayIso); setPending({ kind: 'realise', ligne: l }); setMessage(null); }}
                        className="p-2 rounded-lg text-[#006B47] bg-[#E6F4EE] hover:bg-[#d7efe3] dark:bg-[#00A86B]/[0.12] dark:text-[#00A86B] transition-colors disabled:opacity-50">
                        <Check className="w-4 h-4" />
                      </button>
                      <button type="button" disabled={busy} title="Annuler cet examen" aria-label={`Annuler ${l.libelle}`}
                        onClick={() => { setMotif(''); setPending({ kind: 'annule', ligne: l }); setMessage(null); }}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-colors disabled:opacity-50">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {canWrite && l.statut === 'realise' && !l.resultat_id && (
                    <button type="button" disabled={busy} title="Remettre en attente" aria-label={`Remettre ${l.libelle} en attente`}
                      onClick={() => void run(() => setLigneStatut(l.id, 'en_attente'), 'Examen remis en attente')}
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-colors flex-shrink-0 disabled:opacity-50">
                      <Undo2 className="w-4 h-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {d.motif_annulation && (
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1"><span className="font-semibold">Motif d’annulation : </span>{d.motif_annulation}</p>
          )}

          {pending && (
            <div className="mt-3 rounded-xl border border-[#E5E5E0] dark:border-white/[0.1] bg-[#FAFAF7] dark:bg-white/[0.03] p-3">
              <p className="text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0]">
                {pending.kind === 'realise'
                  ? (pending.ligne ? `Marquer « ${pending.ligne.libelle} » réalisé` : `Marquer les ${attente.length} examen${attente.length > 1 ? 's' : ''} en attente réalisé${attente.length > 1 ? 's' : ''}`)
                  : (pending.ligne ? `Annuler « ${pending.ligne.libelle} »` : `Annuler la demande (${attente.length} examen${attente.length > 1 ? 's' : ''} en attente)`)}
              </p>
              {pending.kind === 'realise' ? (
                <label className="block mt-2 text-xs text-slate-600 dark:text-[#94A3B8]">
                  Date de réalisation
                  <input type="date" value={date} max={todayIso} min={d.date_demande} onChange={e => setDate(e.target.value)}
                    className="mt-1 block w-full sm:w-48 px-3 py-2 text-sm bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-white/[0.1] rounded-lg text-[#0A1628] dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#00A86B]/40" />
                </label>
              ) : (
                <label className="block mt-2 text-xs text-slate-600 dark:text-[#94A3B8]">
                  Motif <span className="text-[#DC2626]" aria-hidden>*</span>
                  <input type="text" autoFocus value={motif} maxLength={200} onChange={e => setMotif(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirm(); } }}
                    placeholder="Ex : examen devenu inutile, patient hospitalisé, erreur de saisie…"
                    className="mt-1 block w-full px-3 py-2 text-sm bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-white/[0.1] rounded-lg text-[#0A1628] dark:text-[#E2E8F0] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A86B]/40" />
                </label>
              )}
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={confirm} disabled={busy || (pending.kind === 'realise' && !date)} className={pending.kind === 'realise' ? btnPrimary : `${btn} text-white bg-[#0A1628] border-[#0A1628] hover:bg-[#1A2B42]`}>
                  {busy ? 'Enregistrement…' : pending.kind === 'realise' ? 'Confirmer' : 'Confirmer l’annulation'}
                </button>
                <button type="button" onClick={() => { setPending(null); setMessage(null); }} disabled={busy} className={btnNeutral}>Retour</button>
              </div>
            </div>
          )}

          {message && (
            <p role={message.type === 'err' ? 'alert' : 'status'}
              className={`mt-3 flex items-start gap-1.5 text-xs ${message.type === 'err' ? 'text-[#B91C1C]' : 'text-[#006B47] dark:text-[#00A86B]'}`}>
              {message.type === 'err' && <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden />}{message.text}
            </p>
          )}

          {!pending && (
            <div className="mt-3 flex flex-wrap gap-2">
              {canWrite && open && attente.length > 0 && (
                <button type="button" onClick={() => { setDate(todayIso); setPending({ kind: 'realise', ligne: null }); setMessage(null); }} className={btnPrimary}>
                  <Check className="w-3.5 h-3.5" aria-hidden /> {attente.length > 1 ? 'Tout marquer réalisé' : 'Marquer réalisé'}
                </button>
              )}
              {patient && d.statut !== 'annule' && (
                <>
                  <button type="button" onClick={() => void print('print')} disabled={!!out} className={btnNeutral}>
                    <Printer className="w-3.5 h-3.5" aria-hidden /> {out === 'print' ? 'Préparation…' : 'Réimprimer'}
                  </button>
                  <button type="button" onClick={() => void print('download')} disabled={!!out} className={btnNeutral}>
                    <Download className="w-3.5 h-3.5" aria-hidden /> {out === 'download' ? 'Génération…' : 'PDF'}
                  </button>
                  {shareable && (
                    <button type="button" onClick={() => void print('share')} disabled={!!out} className={btnNeutral}>
                      <Share2 className="w-3.5 h-3.5" aria-hidden /> Partager
                    </button>
                  )}
                </>
              )}
              {canWrite && patient && d.statut !== 'annule' && (
                <button type="button" onClick={() => openExamRequest({ patient, renewFrom: d })} className={btnNeutral}>
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden /> Renouveler
                </button>
              )}
              {canWrite && patient && open && (
                <button type="button" onClick={() => { const c = suggestedControlDate(d.echeance_date); requestPlanRdv({ patient, date: c < todayIso ? todayIso : c }); }} className={btnNeutral}>
                  <CalendarPlus className="w-3.5 h-3.5" aria-hidden /> Planifier un RDV de contrôle
                </button>
              )}
              {showPatient && onOpenPatient && (
                <button type="button" onClick={() => onOpenPatient(d.patient_id)} className={btnNeutral}>Ouvrir la fiche</button>
              )}
              {canWrite && open && attente.length > 0 && (
                <button type="button" onClick={() => { setMotif(''); setPending({ kind: 'annule', ligne: null }); setMessage(null); }}
                  className={`${btn} text-slate-600 dark:text-[#94A3B8] border-transparent hover:bg-slate-100 dark:hover:bg-white/[0.07] sm:ml-auto`}>
                  Annuler la demande
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
