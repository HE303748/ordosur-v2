import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pill, Plus, X, Search, AlertTriangle, AlertCircle, CheckCircle2, ChevronDown,
  CircleSlash, History, FileText,
} from 'lucide-react';
import { supabase, type Medicament } from '../../lib/supabase';
import { searchMedicamentsMA } from '../../lib/medSearch';
import { medLabel } from '../../lib/medLabel';
import {
  loadTraitements, resolveDoctorNames, fondDisplayName, formatDateFrShort, todayIsoDate,
  type TraitementChronique,
} from '../../lib/traitementsChroniques';

// Sprint 3 — Section « Traitement de fond » du profil patient.
//  • Ajout via search_medicaments (🇲🇦 d'abord) ; saisie hors base possible, badgée
//    « Non vérifiable par le moteur ».
//  • « Arrêter » = actif false + date_arret + arrete_par_doctor_id. Jamais de suppression.
//  • L'ancien texte libre traitements_en_cours est affiché en lecture seule, JAMAIS parsé.
//  • Écriture réservée aux médecins (doctorId présent) ; RLS en garde-fou côté base.

interface Props {
  patient: { id: string; prenom: string; nom: string; traitements_en_cours?: string | null };
  doctorId: string | null;
  orgId: string | null;
  /** Appelé après chaque ajout ou arrêt réussi (synchronise le Vérificateur). */
  onChanged?: (patientId: string) => void;
}

const inputCls =
  'w-full px-3.5 py-2.5 text-sm bg-[#FAFAF7] dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl text-slate-900 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00A86B]/40 focus:border-[#00A86B] dark:focus:border-[#00A86B]/50 transition-all';
const labelCls = 'block text-xs font-semibold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wide mb-1.5';

function NonVerifiableBadge() {
  return (
    <span
      title="Médicament saisi hors base : le moteur ne peut pas l'analyser"
      className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300 whitespace-nowrap"
    >
      <AlertTriangle className="w-3 h-3" /> Non vérifiable par le moteur
    </span>
  );
}

/** Bottom-sheet mobile / modale desktop — même pattern que ConsultationsTab. */
export function Sheet({ open, onClose, busy, icon, title, subtitle, children, footer }: {
  open: boolean; onClose: () => void; busy: boolean;
  icon: React.ReactNode; title: string; subtitle: string;
  children: React.ReactNode; footer: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !busy && onClose()}
          />
          <motion.div
            role="dialog" aria-modal="true" aria-label={title}
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="relative w-full sm:max-w-lg bg-white dark:bg-[#111827] rounded-t-3xl sm:rounded-2xl shadow-2xl border-t border-slate-200 sm:border dark:border-white/[0.06] max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-white/[0.1]" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#E6F4EE] dark:bg-[#00A86B]/10 flex items-center justify-center flex-shrink-0">
                  {icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0]">{title}</h3>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate">{subtitle}</p>
                </div>
              </div>
              <button
                onClick={onClose} disabled={busy} aria-label="Fermer"
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-colors disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">{children}</div>
            <div className="flex gap-3 px-5 py-4 border-t border-slate-100 dark:border-white/[0.06] bg-[#FAFAF7] dark:bg-[#0D1424]/50 rounded-b-3xl sm:rounded-b-2xl">
              {footer}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-700 dark:text-red-400">
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

export function TraitementFondSection({ patient, doctorId, orgId, onChanged }: Props) {
  const canWrite = !!doctorId && !!orgId;
  const [items, setItems] = useState<TraitementChronique[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [doctorNames, setDoctorNames] = useState<Map<string, string>>(new Map());
  const [showHistory, setShowHistory] = useState(false);

  // Ajout
  const [addOpen, setAddOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Medicament[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Medicament | null>(null);
  const [manualName, setManualName] = useState<string | null>(null);
  const [posologie, setPosologie] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const searchSeq = useRef(0);

  // Arrêt
  const [stopTarget, setStopTarget] = useState<TraitementChronique | null>(null);
  const [stopDate, setStopDate] = useState(todayIsoDate());
  const [stopping, setStopping] = useState(false);
  const [stopError, setStopError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const rows = await loadTraitements(patient.id);
      setItems(rows);
      const stoppers = rows.map(r => r.arrete_par_doctor_id).filter((x): x is string => !!x);
      if (stoppers.length > 0) setDoctorNames(await resolveDoctorNames(stoppers));
    } catch (e) {
      console.error('[TraitementFond] load error:', e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [patient.id]);

  useEffect(() => { reload(); }, [reload]);

  // Recherche médicament (debounce 250 ms, dernière requête gagnante)
  useEffect(() => {
    if (!addOpen || picked || manualName !== null) return;
    const q = term.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    const seq = ++searchSeq.current;
    setSearching(true);
    const t = window.setTimeout(async () => {
      const rows = await searchMedicamentsMA(q, 12);
      if (seq !== searchSeq.current) return;
      setResults(rows);
      setSearching(false);
    }, 250);
    return () => window.clearTimeout(t);
  }, [term, addOpen, picked, manualName]);

  const active = items.filter(i => i.actif);
  const stopped = items.filter(i => !i.actif)
    .sort((a, b) => (b.date_arret ?? '').localeCompare(a.date_arret ?? ''));

  const openAdd = () => {
    setTerm(''); setResults([]); setPicked(null); setManualName(null);
    setPosologie(''); setDateDebut(''); setNotes(''); setFormError(null);
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (!doctorId || !orgId) { setFormError('Profil médecin non chargé — rechargez la page.'); return; }
    const nom = picked ? (medLabel(picked) || picked.nom) : (manualName ?? '').trim();
    if (!nom) { setFormError('Sélectionnez un médicament ou saisissez son nom.'); return; }
    if (picked && active.some(a => a.medicament_id === picked.id)) {
      setFormError(`${nom} figure déjà dans le traitement de fond actif.`);
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const { error } = await supabase.from('traitements_chroniques').insert({
        patient_id:     patient.id,
        org_id:         orgId,
        doctor_id:      doctorId, // doctors.id (PK), pas auth.uid()
        medicament_id:  picked?.id ?? null,
        medicament_nom: nom,
        posologie:      posologie.trim() || null,
        date_debut:     dateDebut || null,
        notes:          notes.trim() || null,
      });
      if (error) throw error;
      setAddOpen(false);
      onChanged?.(patient.id);
      await reload();
    } catch (e: unknown) {
      console.error('[TraitementFond] insert error:', e);
      setFormError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const openStop = (t: TraitementChronique) => {
    setStopTarget(t); setStopDate(todayIsoDate()); setStopError(null);
  };

  const handleStop = async () => {
    if (!stopTarget || !doctorId) return;
    if (!stopDate) { setStopError("Indiquez la date d'arrêt."); return; }
    setStopping(true);
    setStopError(null);
    try {
      const { error } = await supabase
        .from('traitements_chroniques')
        .update({ actif: false, date_arret: stopDate, arrete_par_doctor_id: doctorId })
        .eq('id', stopTarget.id);
      if (error) throw error;
      setStopTarget(null);
      onChanged?.(patient.id);
      await reload();
    } catch (e: unknown) {
      console.error('[TraitementFond] stop error:', e);
      setStopError(e instanceof Error ? e.message : "Erreur lors de l'arrêt.");
    } finally {
      setStopping(false);
    }
  };

  const legacy = patient.traitements_en_cours?.trim();

  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 lg:p-5 border border-slate-100 dark:border-white/[0.06]">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-[#0A1628] dark:text-[#E2E8F0] uppercase tracking-widest flex items-center gap-2">
            <Pill className="w-3.5 h-3.5 text-[#00A86B]" /> Traitement de fond
            {!loading && active.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E6F4EE] text-[#006B47] normal-case tracking-normal">
                {active.length}
              </span>
            )}
          </h4>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
            Analysé par le moteur à chaque prescription.
          </p>
        </div>
        {canWrite && (
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#00A86B] hover:bg-[#006B47] active:bg-[#006B47] text-white rounded-xl text-xs font-semibold transition-colors shadow-sm shadow-[#00A86B]/20 flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        )}
      </div>

      {/* Liste active */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-white/[0.04] animate-pulse" />)}
        </div>
      ) : loadError ? (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            Traitement de fond indisponible (erreur de chargement).{' '}
            <button onClick={reload} className="font-semibold underline underline-offset-2">Réessayer</button>
          </span>
        </div>
      ) : active.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-[#475569] italic py-2">
          Aucun traitement de fond enregistré.
        </p>
      ) : (
        <ul className="space-y-2">
          {active.map(t => (
            <li
              key={t.id}
              className="flex items-start gap-3 px-3.5 py-3 rounded-xl bg-[#FAFAF7] dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]"
            >
              <div className="w-8 h-8 rounded-lg bg-[#E6F4EE] dark:bg-[#00A86B]/10 flex items-center justify-center flex-shrink-0">
                <Pill className="w-4 h-4 text-[#00A86B]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0] break-words">{fondDisplayName(t)}</span>
                  {!t.medicament_id && <NonVerifiableBadge />}
                </div>
                {t.medicament?.dci && (
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate">{t.medicament.dci}</p>
                )}
                <p className="text-xs text-slate-600 dark:text-[#CBD5E1] mt-0.5">
                  {t.posologie || <span className="italic text-slate-400">Posologie non précisée</span>}
                  {t.date_debut && <span className="text-slate-400"> · depuis le {formatDateFrShort(t.date_debut)}</span>}
                </p>
                {t.notes && <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5 whitespace-pre-wrap">{t.notes}</p>}
              </div>
              {canWrite && (
                <button
                  onClick={() => openStop(t)}
                  className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-[#94A3B8] border border-slate-200 dark:border-white/[0.1] rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                >
                  <CircleSlash className="w-3.5 h-3.5" /> Arrêter
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Historique des traitements arrêtés */}
      {!loading && stopped.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowHistory(s => !s)}
            aria-expanded={showHistory}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-[#94A3B8] hover:text-[#0A1628] dark:hover:text-slate-200 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            <History className="w-3.5 h-3.5" />
            Traitements arrêtés ({stopped.length})
          </button>
          {showHistory && (
            <ul className="mt-2 space-y-1.5">
              {stopped.map(t => (
                <li key={t.id} className="px-3.5 py-2.5 rounded-xl border border-dashed border-slate-200 dark:border-white/[0.08]">
                  <p className="text-sm text-slate-500 dark:text-[#94A3B8] line-through decoration-slate-300">{fondDisplayName(t)}</p>
                  <p className="text-xs text-slate-400 dark:text-[#475569] mt-0.5">
                    {t.posologie ? `${t.posologie} · ` : ''}
                    Arrêté le {formatDateFrShort(t.date_arret)}
                    {t.arrete_par_doctor_id && ` par ${doctorNames.get(t.arrete_par_doctor_id) ?? 'un médecin de la structure'}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Notes antérieures (texte libre) — lecture seule, jamais analysées */}
      {legacy && (
        <div className="mt-4 px-3.5 py-3 rounded-xl bg-amber-50/60 border border-amber-200 dark:bg-amber-500/[0.06] dark:border-amber-500/20">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Notes antérieures — non analysées par le moteur, à ressaisir
          </p>
          <p className="text-sm text-slate-700 dark:text-[#CBD5E1] mt-1 whitespace-pre-wrap break-words">{legacy}</p>
        </div>
      )}

      {/* ── Ajout ── */}
      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        busy={saving}
        icon={<Pill className="w-4 h-4 text-[#00A86B]" />}
        title="Ajouter au traitement de fond"
        subtitle={`${patient.prenom} ${patient.nom}`}
        footer={
          <>
            <button
              onClick={() => setAddOpen(false)} disabled={saving}
              className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#94A3B8] rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors disabled:opacity-40"
            >
              Annuler
            </button>
            <button
              onClick={handleAdd} disabled={saving || (!picked && !(manualName ?? '').trim())}
              className="flex-1 px-4 py-2.5 bg-[#00A86B] hover:bg-[#006B47] disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm shadow-[#00A86B]/20"
            >
              {saving
                ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Enregistrement…</>
                : <><CheckCircle2 className="w-3.5 h-3.5" /> Enregistrer</>}
            </button>
          </>
        }
      >
        <FormError message={formError} />

        <div>
          <label className={labelCls}>Médicament</label>
          {picked || manualName !== null ? (
            <div className="flex items-start gap-3 px-3.5 py-3 rounded-xl bg-[#E6F4EE] dark:bg-[#00A86B]/10 border border-[#00A86B]/20">
              <div className="flex-1 min-w-0">
                {picked ? (
                  <>
                    <p className="text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0]">
                      {picked.pays === 'MA' && <span className="mr-1" aria-label="Maroc">🇲🇦</span>}
                      {medLabel(picked) || picked.nom}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
                      {[picked.dci, picked.dosage, picked.forme].filter(Boolean).join(' · ')}
                    </p>
                  </>
                ) : (
                  <>
                    <input
                      value={manualName ?? ''}
                      onChange={e => setManualName(e.target.value)}
                      className={inputCls}
                      placeholder="Nom du médicament"
                      maxLength={160}
                      autoFocus
                    />
                    <div className="mt-2"><NonVerifiableBadge /></div>
                  </>
                )}
              </div>
              <button
                onClick={() => { setPicked(null); setManualName(null); }}
                className="text-xs font-semibold text-[#006B47] hover:underline flex-shrink-0"
              >
                Changer
              </button>
            </div>
          ) : (
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  value={term}
                  onChange={e => setTerm(e.target.value)}
                  placeholder="Ex : Sintrom, Glucophage, Kardegic…"
                  className={`${inputCls} pl-9`}
                  autoFocus
                />
              </div>
              {term.trim().length >= 2 && (
                <div className="mt-2 border border-slate-200 dark:border-white/[0.1] rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  {searching && <p className="px-4 py-3 text-sm text-slate-400 text-center">Recherche…</p>}
                  {!searching && results.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setPicked(m)}
                      className="w-full px-4 py-2.5 text-left hover:bg-[#E6F4EE] dark:hover:bg-[#00A86B]/[0.08] border-b border-slate-50 dark:border-white/[0.04] last:border-b-0 transition-colors"
                    >
                      <p className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">
                        {m.pays === 'MA' && <span className="mr-1" aria-label="Maroc">🇲🇦</span>}
                        {medLabel(m) || m.nom}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                        {[m.dci, m.dosage, m.forme].filter(Boolean).join(' · ')}
                      </p>
                    </button>
                  ))}
                  {!searching && (
                    <button
                      onClick={() => setManualName(term.trim())}
                      className="w-full px-4 py-2.5 text-left hover:bg-amber-50 dark:hover:bg-amber-500/[0.08] transition-colors"
                    >
                      <span className="text-sm text-slate-700 dark:text-[#CBD5E1]">
                        {results.length === 0 ? 'Introuvable — ' : ''}Saisir hors base : <span className="font-semibold">{term.trim()}</span>
                      </span>
                      <span className="block text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">Ne sera pas analysé par le moteur</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>Posologie</label>
          <input
            value={posologie} onChange={e => setPosologie(e.target.value)}
            placeholder="Ex : 1 cp matin et soir" className={inputCls} maxLength={200} disabled={saving}
          />
        </div>
        <div>
          <label className={labelCls}>Date de début</label>
          <input
            type="date" value={dateDebut} max={todayIsoDate()} onChange={e => setDateDebut(e.target.value)}
            className={inputCls} disabled={saving}
          />
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={500}
            placeholder="Facultatif" className={`${inputCls} resize-none`} disabled={saving}
          />
        </div>
      </Sheet>

      {/* ── Arrêt ── */}
      <Sheet
        open={!!stopTarget}
        onClose={() => setStopTarget(null)}
        busy={stopping}
        icon={<CircleSlash className="w-4 h-4 text-[#00A86B]" />}
        title="Arrêter le traitement"
        subtitle={stopTarget ? fondDisplayName(stopTarget) : ''}
        footer={
          <>
            <button
              onClick={() => setStopTarget(null)} disabled={stopping}
              className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#94A3B8] rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors disabled:opacity-40"
            >
              Annuler
            </button>
            <button
              onClick={handleStop} disabled={stopping}
              className="flex-1 px-4 py-2.5 bg-[#0A1628] hover:bg-[#0A1628]/90 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {stopping
                ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Enregistrement…</>
                : 'Confirmer l’arrêt'}
            </button>
          </>
        }
      >
        <FormError message={stopError} />
        <p className="text-sm text-slate-600 dark:text-[#CBD5E1]">
          Le traitement sera retiré de l'analyse et conservé dans l'historique. Il ne sera pas supprimé.
        </p>
        <div>
          <label className={labelCls}>Date d'arrêt</label>
          <input
            type="date" value={stopDate} max={todayIsoDate()} onChange={e => setStopDate(e.target.value)}
            className={inputCls} disabled={stopping}
          />
        </div>
      </Sheet>
    </div>
  );
}
