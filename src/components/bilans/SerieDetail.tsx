import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Archive, ChevronDown, Eye, FileText, Pencil } from 'lucide-react';
import type { ExamRef } from '../../lib/examSearch';
import { notifyDataChanged } from '../../lib/dataSync';
import { formatFr, toIsoDate } from '../../lib/examRequest';
import { createActionLock } from '../../lib/viewCache';
import { archiveResultat, saveResultats } from '../../lib/resultatsApi';
import {
  BORNES_ABSENTES, bornesLabel, buildResultatPayload, chartSerie, deltaCheck, examMesure, fieldToDraft, findPrevious, formatNombre, isNonVu,
  matchUnite, qualitatifLabel, unitesCourbe, valeurAffichee,
  type DeltaWarning, type FieldState, type ResultatExamen, type Serie,
} from '../../lib/resultatsLogic';
import { INPUT, InterpretationBadge, ResultFields } from './ResultFields';

// Recharts : chargé à la première courbe ouverte.
const BilanChart = lazy(() => import('./BilanChart'));

interface Props {
  serie: Serie;
  series: Serie[];
  refs: ExamRef[];
  resultats: ResultatExamen[];
  canWrite: boolean;
  doctorId: string | null;
  orgId: string | null;
}

const btn = 'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors active:scale-[0.98] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B]';
const btnNeutral = `${btn} text-[#0A1628] dark:text-[#E2E8F0] bg-white dark:bg-transparent border-[#E5E5E0] dark:border-white/[0.12] hover:border-[#0A1628] dark:hover:border-white/30`;
const SELECT = `${INPUT} py-1.5 pr-8`;
/** Horodatage → date locale « JJ/MM/AAAA ». */
const tsFr = (ts: string | null) => (ts ? formatFr(toIsoDate(new Date(ts))) : '');

const fieldFrom = (r: ResultatExamen): FieldState => ({
  valeur: r.valeur_num !== null ? formatNombre(r.valeur_num, 6) : '',
  unite: r.unite_saisie,
  basse: r.borne_basse !== null ? formatNombre(r.borne_basse, 6) : '',
  haute: r.borne_haute !== null ? formatNombre(r.borne_haute, 6) : '',
  texte: r.valeur_num === null ? (r.valeur_texte ?? '') : '',
  anormal: r.interpretation === 'anormal',
});

/** Détail d'un examen : courbe (unité au choix, bornes du labo, comparaison), historique, corrections. */
export function SerieDetail({ serie, series, refs, resultats, canWrite, doctorId, orgId }: Props) {
  const byCode = useMemo(() => new Map(refs.map(r => [r.code, r])), [refs]);
  const exam = serie.examCode ? byCode.get(serie.examCode) ?? null : null;
  const mesure = useMemo(() => examMesure(exam, serie.parametre), [exam, serie.parametre]);
  const unites = useMemo(() => unitesCourbe(serie, mesure), [serie, mesure]);
  const [unite, setUnite] = useState<string | null>(null);
  const [compareKey, setCompareKey] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showArchives, setShowArchives] = useState(false);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());

  // Unité affichée : celle du dernier résultat, tant que le médecin n'en choisit pas une autre.
  const uniteDefaut = matchUnite(serie.dernier.unite_saisie, mesure)?.unite ?? serie.dernier.unite_saisie ?? unites[0] ?? null;
  const uniteActive = unite !== null && unites.includes(unite) ? unite : (unites.includes(uniteDefaut ?? '') ? uniteDefaut : unites[0] ?? null);
  const primary = useMemo(() => chartSerie(serie, mesure, uniteActive), [serie, mesure, uniteActive]);

  const comparables = useMemo(() => series.filter(s => s.key !== serie.key && s.points.some(p => p.valeur_num !== null)), [series, serie.key]);
  const other = comparables.find(s => s.key === compareKey) ?? null;
  const secondary = useMemo(() => {
    if (!other) return null;
    const m = examMesure(other.examCode ? byCode.get(other.examCode) ?? null : null, other.parametre);
    const u = matchUnite(other.dernier.unite_saisie, m)?.unite ?? other.dernier.unite_saisie ?? unitesCourbe(other, m)[0] ?? null;
    return { label: other.label, serie: chartSerie(other, m, u) };
  }, [other, byCode]);

  const selectPoint = (id: string) => {
    setSelectedId(id);
    rowRefs.current.get(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  // ── Correction / archivage ──
  const [edit, setEdit] = useState<{ id: string; mode: 'corriger' | 'archiver' } | null>(null);
  const [motif, setMotif] = useState('');
  const [field, setField] = useState<FieldState | null>(null);
  const [date, setDate] = useState('');
  const [warn, setWarn] = useState<DeltaWarning | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(createActionLock()).current;
  const todayIso = toIsoDate(new Date());
  useEffect(() => { setEdit(null); setSelectedId(null); setCompareKey(''); setUnite(null); }, [serie.key]);

  const openEdit = (r: ResultatExamen, mode: 'corriger' | 'archiver') => {
    setEdit({ id: r.id, mode }); setMotif(''); setField(fieldFrom(r)); setDate(r.date_prelevement); setWarn(null); setError(null);
  };

  const confirmEdit = (r: ResultatExamen) => lock.run('edit', async () => {
    if (!edit || busy || !doctorId || !orgId) return;
    if (motif.trim().length < 3) { setError('Motif obligatoire (3 caractères au moins).'); return; }
    setError(null);
    try {
      if (edit.mode === 'archiver') {
        setBusy(true);
        await archiveResultat(r.id, doctorId, motif);
      } else {
        const { draft, error: err } = fieldToDraft(field ?? fieldFrom(r), exam, serie.parametre, {
          libelleLibre: exam ? undefined : r.libelle, demandeLigneId: r.demande_ligne_id, ligneType: r.type,
        });
        if (err || !draft) { setError(err ?? 'Saisissez la valeur corrigée.'); return; }
        if (!date) { setError('Date de prélèvement obligatoire.'); return; }
        if (draft.nombre && !warn) {
          const w = deltaCheck({ valeur: draft.nombre.valeur, decimales: draft.nombre.decimales, unite: draft.unite }, findPrevious(resultats, serie.key, r.id), mesure);
          if (w) { setWarn(w); return; }
        }
        setBusy(true);
        const payload = buildResultatPayload(draft, { patient_id: r.patient_id, org_id: orgId, doctor_id: doctorId, date_prelevement: date, laboratoire: r.laboratoire, commentaire: r.commentaire });
        await saveResultats([payload], { archiverId: r.id, motif: motif.trim() });
      }
      notifyDataChanged('bilans');
      if (r.demande_ligne_id) notifyDataChanged('examens');
      setEdit(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible');
    } finally {
      setBusy(false);
    }
  });

  const chiffres = primary.points.length;

  return (
    <div className="px-3.5 sm:px-4 pb-4 pt-1 space-y-3">
      {chiffres > 0 && (
        <div className="rounded-xl bg-[#FAFAF7] dark:bg-white/[0.03] border border-[#E5E5E0] dark:border-white/[0.08] p-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {unites.length > 1 && (
              <div role="radiogroup" aria-label="Unité de la courbe" className="flex gap-1">
                {unites.map(u => (
                  <button key={u} type="button" role="radio" aria-checked={uniteActive === u} onClick={() => setUnite(u)}
                    className={`${btn} ${uniteActive === u ? 'bg-[#0A1628] text-white border-[#0A1628] dark:bg-[#E2E8F0] dark:text-[#0A1628]' : 'bg-white text-[#0A1628] border-[#E5E5E0] dark:bg-transparent dark:text-[#E2E8F0] dark:border-white/[0.12]'}`}>
                    {u || 'sans unité'}
                  </button>
                ))}
              </div>
            )}
            {unites.length === 1 && uniteActive && <span className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8]">{uniteActive}</span>}
            {comparables.length > 0 && (
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-[#94A3B8] sm:ml-auto">
                Comparer avec
                <select value={compareKey} onChange={e => setCompareKey(e.target.value)} className={SELECT}>
                  <option value="">—</option>
                  {comparables.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </label>
            )}
          </div>
          {chiffres >= 2 || secondary ? (
            <div className="mt-2">
              <Suspense fallback={<div className="h-56 sm:h-64 rounded-lg bg-slate-100 dark:bg-white/[0.04] animate-pulse" role="status" aria-label="Chargement de la courbe" />}>
                <BilanChart primary={{ label: serie.label, serie: primary }} secondary={secondary} selectedId={selectedId} onPoint={selectPoint} />
              </Suspense>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-500 dark:text-[#94A3B8]">
                <span><span aria-hidden className="inline-block w-4 border-t-2 border-current align-middle mr-1" />{serie.label}{uniteActive ? ` (${uniteActive})` : ''}</span>
                {secondary && <span><span aria-hidden className="inline-block w-4 border-t-2 border-dashed border-current align-middle mr-1" />{secondary.label}{secondary.serie.unite ? ` (${secondary.serie.unite})` : ''} — axe de droite</span>}
                {primary.bande
                  ? <span><span aria-hidden className="inline-block w-3 h-2 bg-[#00A86B]/20 align-middle mr-1 rounded-sm" />Bornes du labo ({formatFr(serie.points.find(p => p.borne_basse !== null || p.borne_haute !== null)?.date_prelevement)})</span>
                  : <span>{BORNES_ABSENTES}</span>}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-500 dark:text-[#94A3B8]">Un seul résultat chiffré : la courbe apparaîtra au prochain.</p>
          )}
        </div>
      )}

      <ul className="divide-y divide-slate-100 dark:divide-white/[0.05]">
        {serie.points.map(r => {
          const editing = edit?.id === r.id;
          const texte = r.valeur_num === null && !qualitatifLabel(r.valeur_texte);
          return (
            <li key={r.id} ref={el => { if (el) rowRefs.current.set(r.id, el); else rowRefs.current.delete(r.id); }}
              className={`py-2.5 px-2 -mx-2 rounded-lg scroll-mt-4 transition-colors ${selectedId === r.id ? 'bg-[#E6F4EE]/70 dark:bg-[#00A86B]/[0.08]' : ''}`}>
              <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] w-[4.75rem] flex-shrink-0 pt-0.5 tabular-nums">{formatFr(r.date_prelevement)}</span>
                <div className="flex-1 min-w-[10rem]">
                  <p className={`text-sm text-[#0A1628] dark:text-[#E2E8F0] break-words ${texte ? '' : 'font-bold tabular-nums'}`}>
                    {texte ? r.valeur_texte : valeurAffichee(r)}
                    <InterpretationBadge value={r.interpretation} className="ml-2 align-middle" />
                    {isNonVu(r) && <span className="ml-2 text-[11px] font-semibold text-[#B91C1C] dark:text-red-300 align-middle">non vu</span>}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] break-words">
                    {[
                      r.valeur_num !== null ? (bornesLabel(r) ? `Bornes du labo : ${bornesLabel(r)}${r.unite_saisie ? ` ${r.unite_saisie}` : ''}` : BORNES_ABSENTES) : null,
                      r.laboratoire,
                      r.demande_ligne_id ? 'sur demande d’examens' : null,
                    ].filter(Boolean).join(' · ')}
                  </p>
                  {r.commentaire && <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] break-words">{r.commentaire}</p>}
                  {r.vu_le && (
                    <p className="text-[11px] text-[#006B47] dark:text-[#00A86B] break-words">
                      <Eye className="inline w-3 h-3 mr-1 -mt-px" aria-hidden />Vu le {tsFr(r.vu_le)}{r.vu_commentaire ? ` — ${r.vu_commentaire}` : ''}
                    </p>
                  )}
                </div>
                {canWrite && !editing && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button type="button" onClick={() => openEdit(r, 'corriger')} className={btnNeutral} aria-label={`Corriger le résultat du ${formatFr(r.date_prelevement)}`}>
                      <Pencil className="w-3.5 h-3.5" aria-hidden /> Corriger
                    </button>
                    <button type="button" onClick={() => openEdit(r, 'archiver')} title="Archiver ce résultat" aria-label={`Archiver le résultat du ${formatFr(r.date_prelevement)}`}
                      className={`${btn} border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.07]`}>
                      <Archive className="w-3.5 h-3.5" aria-hidden />
                    </button>
                  </div>
                )}
              </div>

              {editing && edit && (
                <div className="mt-2.5 rounded-xl border border-[#E5E5E0] dark:border-white/[0.1] bg-[#FAFAF7] dark:bg-white/[0.03] p-3 space-y-2.5">
                  <p className="text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0]">
                    {edit.mode === 'corriger' ? 'Corriger ce résultat' : 'Archiver ce résultat'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
                    {edit.mode === 'corriger'
                      ? 'L’ancien résultat est archivé avec votre motif et reste visible dans l’historique ; la valeur corrigée le remplace.'
                      : 'Le résultat sort du suivi et reste visible dans l’historique. Rien n’est supprimé.'}
                  </p>
                  <label className="block text-xs text-slate-600 dark:text-[#94A3B8]">
                    Motif <span className="text-[#DC2626]" aria-hidden>*</span>
                    <input type="text" autoFocus value={motif} maxLength={200} onChange={e => { setMotif(e.target.value); setError(null); }}
                      onKeyDown={e => { if (e.key === 'Enter' && edit.mode === 'archiver') { e.preventDefault(); void confirmEdit(r); } }}
                      placeholder="Ex : erreur de saisie, erreur d’unité, mauvais patient…" className={`${INPUT} mt-1 block w-full`} />
                  </label>
                  {edit.mode === 'corriger' && field && (
                    <>
                      <ResultFields exam={exam} parametre={serie.parametre} field={field} id={`corr-${r.id}`} label={serie.label} disabled={busy}
                        onChange={f => { setField(f); setWarn(null); setError(null); }} onEnter={() => void confirmEdit(r)} />
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-[#94A3B8]">Prélèvement
                        <input type="date" value={date} max={todayIso} onChange={e => setDate(e.target.value)} disabled={busy} className={`${INPUT} py-1.5 w-[9.5rem]`} />
                      </label>
                    </>
                  )}
                  {warn && (
                    <p role="alert" className="flex items-start gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden /> {warn.message}
                    </p>
                  )}
                  {error && (
                    <p role="alert" className="flex items-start gap-1.5 text-xs text-[#B91C1C] dark:text-red-300">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden /> {error}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void confirmEdit(r)} disabled={busy}
                      className={`${btn} text-white bg-[#0A1628] border-[#0A1628] hover:bg-[#1A2B42]`}>
                      {busy ? 'Enregistrement…' : edit.mode === 'archiver' ? 'Confirmer l’archivage' : warn ? 'Confirmer la valeur corrigée' : 'Enregistrer la correction'}
                    </button>
                    <button type="button" onClick={() => setEdit(null)} disabled={busy} className={btnNeutral}>Retour</button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {serie.archives.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowArchives(v => !v)} aria-expanded={showArchives}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-[#94A3B8] hover:text-[#0A1628] dark:hover:text-[#E2E8F0] rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B]">
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showArchives ? 'rotate-180' : ''}`} aria-hidden />
            Historique des corrections ({serie.archives.length})
          </button>
          {showArchives && (
            <ul className="mt-2 space-y-1.5">
              {serie.archives.map(r => (
                <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 text-xs text-slate-500 dark:text-[#94A3B8]">
                  <span className="tabular-nums w-[4.75rem] flex-shrink-0">{formatFr(r.date_prelevement)}</span>
                  <span className="line-through">{valeurAffichee(r, 80)}</span>
                  <span className="flex-1 min-w-[10rem] break-words">
                    <FileText className="inline w-3 h-3 mr-1 -mt-px" aria-hidden />Archivé le {tsFr(r.archive_le)} — {r.archive_motif}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
