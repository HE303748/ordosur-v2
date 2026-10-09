import { useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, ChevronDown, Download, Eye, Printer } from 'lucide-react';
import type { Patient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { notifyDataChanged } from '../../lib/dataSync';
import { formatFr, formatFrShort, toIsoDate } from '../../lib/examRequest';
import { patientLine } from '../../lib/examDocument';
import { outputPdf, type OutputMode } from '../../lib/examUi';
import { createActionLock } from '../../lib/viewCache';
import { markVus } from '../../lib/resultatsApi';
import {
  BORNES_ABSENTES, TENDANCE_SYMBOLE, buildRecap, buildSeries, categoriesOf, isNonVu, resultatLabel, resultatsARevoir, serieKey, valeurAffichee,
  type Serie, type Tendance,
} from '../../lib/resultatsLogic';
import { useExamPrintContext } from '../../hooks/useExamData';
import { useExamRefs, useLastUnits, usePatientResultats } from '../../hooks/useBilans';
import { INPUT, InterpretationBadge } from './ResultFields';
import { QuickResultInput } from './QuickResultInput';
import { SerieDetail } from './SerieDetail';

const CARD = 'bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06]';
const btn = 'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors active:scale-[0.98] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B]';
const btnNeutral = `${btn} text-[#0A1628] dark:text-[#E2E8F0] bg-white dark:bg-transparent border-[#E5E5E0] dark:border-white/[0.12] hover:border-[#0A1628] dark:hover:border-white/30`;
const TENDANCE_TEXTE: Record<Tendance, string> = { hausse: 'en hausse', baisse: 'en baisse', stable: 'stable' };

function TendanceMark({ serie }: { serie: Serie }) {
  if (!serie.tendance || !serie.precedent) return <span className="text-slate-300 dark:text-slate-600" aria-hidden>·</span>;
  return (
    <span className="font-bold text-slate-600 dark:text-[#CBD5E1]"
      title={`${TENDANCE_TEXTE[serie.tendance]} par rapport au ${formatFr(serie.precedent.date_prelevement)} (${valeurAffichee(serie.precedent, 30)})`}>
      <span aria-hidden>{TENDANCE_SYMBOLE[serie.tendance]}</span>
      <span className="sr-only">{TENDANCE_TEXTE[serie.tendance]}</span>
    </span>
  );
}

/**
 * Sprint 6A — Profil patient, onglet « Bilans » : saisie rapide, résultats à revoir, tableau
 * par examen (dernière valeur, tendance, interprétation d'après les bornes du labo), courbe
 * et historique au clic, récapitulatif PDF. Secrétaire : lecture seule.
 */
export function BilansSection({ patient, canWrite }: { patient: Patient; canWrite: boolean }) {
  const { user, doctorProfile } = useAuth();
  const doctorId = doctorProfile?.id ?? null;
  const orgId = user?.org_id ?? null;
  const { resultats, loading, error, reload } = usePatientResultats(patient.id);
  const refs = useExamRefs();
  const lastUnits = useLastUnits(canWrite);
  const printCtx = useExamPrintContext();

  const series = useMemo(() => buildSeries(resultats, refs), [resultats, refs]);
  const categories = useMemo(() => categoriesOf(series), [series]);
  const [cat, setCat] = useState<string | null>(null);
  const catActive = cat && categories.includes(cat) ? cat : null;
  const visibles = catActive ? series.filter(s => s.categorie === catActive) : series;
  const [openKey, setOpenKey] = useState<string | null>(null);

  // Résultats archivés d'examens qui n'ont plus aucun résultat actif : toujours consultables.
  const orphelins = useMemo(() => {
    const keys = new Set(series.map(s => s.key));
    return resultats.filter(r => r.archive && !keys.has(serieKey(r)));
  }, [resultats, series]);
  const [showOrphelins, setShowOrphelins] = useState(false);
  const byCode = useMemo(() => new Map(refs.map(r => [r.code, r])), [refs]);
  const labelOf = (r: { examen_code: string | null; parametre: string | null; libelle: string }) =>
    resultatLabel(r.examen_code ? byCode.get(r.examen_code) ?? null : null, r.parametre, r.libelle);

  // ── À revoir ──
  const aRevoir = useMemo(() => resultatsARevoir(resultats), [resultats]);
  const [vuComment, setVuComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const lock = useRef(createActionLock()).current;
  const marquer = (ids: string[]) => lock.run('vu', async () => {
    if (busy || !doctorId || ids.length === 0) return;
    setBusy(true);
    setMessage(null);
    try {
      await markVus(ids, doctorId, vuComment);
      setVuComment('');
      notifyDataChanged('bilans');
      setMessage({ type: 'ok', text: ids.length > 1 ? `${ids.length} résultats marqués comme vus` : 'Résultat marqué comme vu' });
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Action impossible' });
    } finally {
      setBusy(false);
    }
  });

  // ── Récapitulatif PDF ──
  const [out, setOut] = useState<OutputMode | null>(null);
  const exporter = (mode: OutputMode) => lock.run('pdf', async () => {
    if (out) return;
    setOut(mode);
    setMessage(null);
    try {
      if (!printCtx.me) throw new Error('Identité du médecin indisponible : impression impossible');
      const { buildBilanPdf, bilanFileName } = await import('../../lib/bilanPdf');
      const today = toIsoDate(new Date());
      const file = await buildBilanPdf(buildRecap(visibles), patientLine(patient), { doctor: printCtx.me.header, org: printCtx.org },
        { dateIso: today, fileName: bilanFileName(patient, today), logoUrl: printCtx.me.logoUrl });
      const msg = await outputPdf(file, mode, `Bilans — ${patient.prenom} ${patient.nom}`);
      if (mode !== 'download') setMessage({ type: 'ok', text: msg });
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Erreur lors de la génération du PDF' });
    } finally {
      setOut(null);
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0]">Bilans</h3>
          {!loading && (
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
              {series.length === 0 ? 'Aucun résultat enregistré' : `${series.length} examen${series.length > 1 ? 's' : ''} suivi${series.length > 1 ? 's' : ''}`}
              {aRevoir.length > 0 ? ` · ${aRevoir.length} à revoir` : ''}
            </p>
          )}
        </div>
        {series.length > 0 && (
          <div className="flex gap-2">
            <button type="button" onClick={() => void exporter('print')} disabled={!!out} className={btnNeutral}>
              <Printer className="w-3.5 h-3.5" aria-hidden /> {out === 'print' ? 'Préparation…' : 'Imprimer'}
            </button>
            <button type="button" onClick={() => void exporter('download')} disabled={!!out} className={btnNeutral}>
              <Download className="w-3.5 h-3.5" aria-hidden /> {out === 'download' ? 'Génération…' : 'Récapitulatif PDF'}
            </button>
          </div>
        )}
      </div>

      {canWrite && doctorId && orgId && (
        <QuickResultInput patientId={patient.id} pathologies={patient.pathologies} doctorId={doctorId} orgId={orgId}
          refs={refs} resultats={resultats} lastUnits={lastUnits} />
      )}

      {error && (
        <div role="alert" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-sm text-amber-900 dark:text-amber-200">
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => void reload()} className="font-semibold underline underline-offset-2">Réessayer</button>
        </div>
      )}
      {message && (
        <p role={message.type === 'err' ? 'alert' : 'status'}
          className={`flex items-start gap-1.5 text-xs ${message.type === 'err' ? 'text-[#B91C1C] dark:text-red-300' : 'text-[#006B47] dark:text-[#00A86B]'}`}>
          {message.type === 'err' && <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden />}{message.text}
        </p>
      )}

      {/* À revoir : Bas, Haut, Anormal ou qualitatif positif, tant qu'ils ne sont pas marqués vus. */}
      {aRevoir.length > 0 && (
        <section aria-label="Résultats à revoir" className="rounded-2xl border border-[#DC2626]/25 bg-white dark:bg-[#111827] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 dark:border-white/[0.06]">
            <h4 className="flex items-center gap-2 text-sm font-bold text-[#0A1628] dark:text-[#E2E8F0]">
              <AlertTriangle className="w-4 h-4 text-[#DC2626]" aria-hidden /> À revoir
              <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#DC2626]/[0.12] dark:text-red-300">{aRevoir.length}</span>
            </h4>
            {canWrite && aRevoir.length > 1 && (
              <button type="button" onClick={() => void marquer(aRevoir.map(r => r.id))} disabled={busy} className={btnNeutral}>
                <Eye className="w-3.5 h-3.5" aria-hidden /> Tout marquer comme vu ({aRevoir.length})
              </button>
            )}
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-white/[0.05]">
            {aRevoir.map(r => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5">
                <div className="flex-1 min-w-[11rem]">
                  <p className="text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0] break-words">
                    {labelOf(r)} <span className="font-bold tabular-nums">{valeurAffichee(r, 70)}</span>
                    <InterpretationBadge value={r.interpretation} className="ml-2 align-middle" />
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">Prélèvement du {formatFr(r.date_prelevement)}{r.laboratoire ? ` · ${r.laboratoire}` : ''}</p>
                </div>
                {canWrite && (
                  <button type="button" onClick={() => void marquer([r.id])} disabled={busy} className={btnNeutral} aria-label={`Marquer ${labelOf(r)} comme vu`}>
                    <Eye className="w-3.5 h-3.5" aria-hidden /> Marquer comme vu
                  </button>
                )}
              </li>
            ))}
          </ul>
          {canWrite && (
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-white/[0.06] bg-[#FAFAF7] dark:bg-white/[0.02]">
              <label className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-[#94A3B8]">
                Commentaire <span className="text-slate-400">(facultatif, joint au marquage)</span>
                <input type="text" value={vuComment} maxLength={500} onChange={e => setVuComment(e.target.value)} disabled={busy}
                  placeholder="Ex : contrôle dans 3 mois, patient prévenu…" className={`${INPUT} py-1.5 flex-1 min-w-[12rem]`} />
              </label>
            </div>
          )}
        </section>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-16 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-white/[0.06] animate-pulse" />)}
        </div>
      ) : series.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-white/[0.05] rounded-2xl flex items-center justify-center mb-4">
            <Activity className="w-8 h-8 text-slate-300 dark:text-slate-700" aria-hidden />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-[#94A3B8]">Aucun résultat enregistré</p>
          <p className="text-xs text-slate-400 dark:text-[#475569] mt-1 max-w-xs">
            {canWrite
              ? 'Tapez un résultat ci-dessus (ex. « hba1c 7,2 »), ou saisissez les résultats d’une demande depuis l’onglet Examens.'
              : 'Les résultats saisis par le médecin apparaîtront ici.'}
          </p>
        </div>
      ) : (
        <>
          {categories.length > 1 && (
            <div role="radiogroup" aria-label="Filtrer par catégorie" className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {[null, ...categories].map(c => (
                <button key={c ?? 'toutes'} type="button" role="radio" aria-checked={catActive === c} onClick={() => setCat(c)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B] ${catActive === c
                    ? 'bg-[#0A1628] text-white border-[#0A1628] dark:bg-[#E2E8F0] dark:text-[#0A1628]'
                    : 'bg-white text-slate-600 border-[#E5E5E0] hover:border-[#0A1628] dark:bg-transparent dark:text-[#94A3B8] dark:border-white/[0.12]'}`}>
                  {c ?? 'Toutes'}
                </button>
              ))}
            </div>
          )}

          <div className={`${CARD} overflow-hidden divide-y divide-slate-100 dark:divide-white/[0.05]`}>
            <div className="hidden sm:grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.3fr)_2rem_minmax(0,1fr)_5.5rem_1.25rem] gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#64748B]">
              <span>Examen</span><span>Dernière valeur</span><span className="text-center">Tend.</span><span>Interprétation</span><span className="text-right">Date</span><span />
            </div>
            {visibles.map(s => {
              const d = s.dernier;
              const open = openKey === s.key;
              const nonVu = s.points.some(isNonVu);
              return (
                <div key={s.key}>
                  <button type="button" onClick={() => setOpenKey(open ? null : s.key)} aria-expanded={open}
                    className="w-full text-left px-4 py-3 min-h-14 grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1.3fr)_2rem_minmax(0,1fr)_5.5rem_1.25rem] gap-x-3 gap-y-0.5 items-center hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00A86B]">
                    <span className="text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0] truncate">
                      {nonVu && <span aria-label="à revoir" title="Résultat à revoir" className="inline-block w-2 h-2 rounded-full bg-[#DC2626] mr-2 align-middle" />}
                      {s.label}
                    </span>
                    <span className="text-sm font-bold text-[#0A1628] dark:text-[#E2E8F0] tabular-nums text-right sm:text-left truncate">
                      {valeurAffichee(d, 40)}
                      <span className="sm:hidden ml-1.5"><TendanceMark serie={s} /></span>
                    </span>
                    <span className="hidden sm:block text-center"><TendanceMark serie={s} /></span>
                    <span className="text-xs">
                      {d.interpretation
                        ? <InterpretationBadge value={d.interpretation} />
                        : d.valeur_num !== null ? <span className="text-slate-400 dark:text-[#64748B]">{BORNES_ABSENTES}</span> : null}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-[#94A3B8] text-right tabular-nums">
                      {formatFrShort(d.date_prelevement)}/{d.date_prelevement.slice(2, 4)}
                      {s.points.length > 1 && <span className="sm:hidden"> · {s.points.length} résultats</span>}
                    </span>
                    <ChevronDown className={`hidden sm:block w-4 h-4 text-slate-300 dark:text-[#475569] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
                  </button>
                  {open && (
                    <SerieDetail serie={s} series={series} refs={refs} resultats={resultats} canWrite={canWrite} doctorId={doctorId} orgId={orgId} />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {orphelins.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowOrphelins(v => !v)} aria-expanded={showOrphelins}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-[#94A3B8] hover:text-[#0A1628] dark:hover:text-[#E2E8F0] rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B]">
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showOrphelins ? 'rotate-180' : ''}`} aria-hidden />
            Résultats archivés ({orphelins.length})
          </button>
          {showOrphelins && (
            <ul className="mt-2 space-y-1.5">
              {orphelins.map(r => (
                <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 text-xs text-slate-500 dark:text-[#94A3B8]">
                  <span className="tabular-nums">{formatFr(r.date_prelevement)}</span>
                  <span className="font-semibold">{labelOf(r)}</span>
                  <span className="line-through">{valeurAffichee(r, 60)}</span>
                  <span className="flex-1 min-w-[10rem] break-words">Motif : {r.archive_motif}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
