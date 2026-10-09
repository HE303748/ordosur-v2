import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, X, Layers, AlertTriangle, RotateCcw, Plus, Check, FlaskConical, ScanLine, Activity, Bookmark, Pencil, Archive,
} from 'lucide-react';
import type { Patient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  searchExams, packKey, sortPacksForPatient, isContextPack,
  type ExamRef, type ExamPack, type ExamType, type ExamSearchResult,
} from '../../lib/examSearch';
import { useAnchoredPopover } from '../../hooks/useAnchoredPopover';
import {
  ECHEANCE_CHOICES, computeEcheance, examAlerts, findRedondances, formatFr, formatFrShort, freeLine, lastRenewable,
  creatinineSuggestion, countNewLines,
  lineFromRef, linesFromPack, mergeLines, packLinesFromDraft, renewDraftFromDemande, buildRenseignements, toIsoDate,
  type DemandeExamens, type EcheanceChoice, type ExamLineDraft, type ExamRequestDraft,
} from '../../lib/examRequest';
import { createPersonalPack, renamePack, archivePack } from '../../lib/examensApi';
import { pregnancyContext } from '../../lib/pregnancyStatus';
import { getAgeEnMois } from '../../lib/ageUtils';
import type { PatientExamContext } from '../../hooks/useExamData';

const TYPE_META: Record<ExamType, { label: string; plural: string; icon: typeof FlaskConical }> = {
  biologie: { label: 'Biologie', plural: 'Biologie', icon: FlaskConical },
  imagerie: { label: 'Imagerie', plural: 'Imagerie', icon: ScanLine },
  exploration: { label: 'Exploration', plural: 'Explorations', icon: Activity },
};
const TYPE_ORDER: ExamType[] = ['biologie', 'imagerie', 'exploration'];

const inputCls = 'w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-[#0A1628] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A86B]/40 focus:border-[#00A86B] transition-colors';
const chipCls = (active: boolean, disabled = false) =>
  `px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-[0.97] ${
    disabled ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
      : active ? 'bg-[#00A86B] text-white border-[#00A86B] shadow-sm'
        : 'bg-white text-[#0A1628] border-slate-200 hover:border-[#00A86B]'}`;

interface Props {
  patient: Patient;
  draft: ExamRequestDraft;
  onChange: (d: ExamRequestDraft) => void;
  refs: ExamRef[];
  packs: ExamPack[];
  /** Sprint 5c — nombre d'utilisations de chaque pack par ce médecin. */
  packUsage?: ReadonlyMap<string, number>;
  refsLoading: boolean;
  refsFailed: boolean;
  onRetryRefs: () => void;
  onPacksChanged: () => void;
  /** Demandes déjà enregistrées du patient (anti-redondance, « Renouveler »). */
  demandes: DemandeExamens[];
  ctx: PatientExamContext;
  /** Médicaments de l'ordonnance en cours (noms + DCI) : alerte metformine. */
  extraMedicaments?: string[];
  /** Date du « prochain rendez-vous » saisie dans l'ordonnance : prime sur l'agenda. */
  rdvDateOverride?: string | null;
  autoFocusSearch?: boolean;
}

type Option =
  | { kind: 'result'; r: ExamSearchResult }
  | { kind: 'free'; type: ExamType; label: string };

export function ExamRequestEditor({
  patient, draft, onChange, refs, packs, packUsage, refsLoading, refsFailed, onRetryRefs, onPacksChanged,
  demandes, ctx, extraMedicaments = [], rdvDateOverride = null, autoFocusSearch = false,
}: Props) {
  const { doctorProfile, user } = useAuth();
  const doctorId = doctorProfile?.id ?? null;
  const orgId = user?.org_id ?? null;

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const patch = (p: Partial<ExamRequestDraft>) => onChange({ ...draftRef.current, ...p });

  // ── Recherche ────────────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const noticeTimer = useRef<number | null>(null);
  const flash = (msg: string) => {
    setNotice(msg);
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000);
  };
  useEffect(() => () => { if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current); }, []);

  const results = useMemo(
    () => searchExams(query, refs, packs, { pathologies: patient.pathologies ?? [] }),
    [query, refs, packs, patient.pathologies],
  );
  const options: Option[] = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return [];
    const out: Option[] = results.map(r => ({ kind: 'result', r }));
    TYPE_ORDER.forEach(t => out.push({ kind: 'free', type: t, label: q }));
    return out;
  }, [results, query]);
  useEffect(() => { setActive(0); }, [query]);

  const addLines = (incoming: ExamLineDraft[], packUsed?: string) => {
    const { lines, merged } = mergeLines(draftRef.current.lines, incoming);
    const next: Partial<ExamRequestDraft> = { lines };
    if (packUsed) next.packsUtilises = [...new Set([...draftRef.current.packsUtilises, packUsed])];
    patch(next);
    if (merged.length > 0) {
      flash(merged.length === 1 ? `« ${merged[0]} » figurait déjà dans la demande : fusionné.` : `${merged.length} examens figuraient déjà dans la demande : fusionnés.`);
    }
  };

  const [packPreview, setPackPreview] = useState<{ pack: ExamPack; selected: Set<number> } | null>(null);
  const openPack = (pack: ExamPack) => setPackPreview({ pack, selected: new Set(pack.lignes.map((_, i) => i)) });

  const pick = (o: Option) => {
    if (o.kind === 'free') addLines([freeLine(o.label, o.type)]);
    else if (o.r.kind === 'exam') addLines([lineFromRef(o.r.exam)]);
    else openPack(o.r.pack);
    setQuery('');
    setOpen(false);
    searchRef.current?.focus();
  };

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const visible = open && options.length > 0;
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => Math.min(a + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { if (visible) { e.preventDefault(); pick(options[Math.min(active, options.length - 1)]); } }
    else if (e.key === 'Escape' && visible) {
      // Échap ne ferme QUE la liste : l'événement ne remonte ni à la modale ni au tableau de bord.
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      setOpen(false);
      setQuery(''); // Sprint P — après Échap, le champ de recherche est vidé
    }
  };
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  // ── Renseignements cliniques : pré-remplis une fois depuis le dossier ────
  const suggested = useMemo(() => buildRenseignements({
    pathologies: patient.pathologies, pathologies_depuis: patient.pathologies_depuis,
    antecedents: ctx.antecedents, traitements: ctx.traitements,
  }), [patient.pathologies, patient.pathologies_depuis, ctx.antecedents, ctx.traitements]);
  useEffect(() => {
    const d = draftRef.current;
    if (ctx.ready && !d.renseignementsTouched && !d.renseignements.trim() && suggested) patch({ renseignements: suggested });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.ready, suggested]);

  // ── Échéance ─────────────────────────────────────────────────────────────
  const today = useMemo(() => new Date(), []);
  const todayIso = toIsoDate(today);
  const rdvDate = (rdvDateOverride && rdvDateOverride >= todayIso ? rdvDateOverride : null) ?? ctx.nextRdvDate;
  const echeance = computeEcheance(draft.echeance, today, { rdvDate, customDate: draft.echeanceDate });
  // « Avant le prochain RDV » choisi puis RDV retiré : retour au défaut (1 mois), toujours visible.
  useEffect(() => {
    if (draft.echeance === 'avant_prochain_rdv' && ctx.ready && !rdvDate) patch({ echeance: '1_mois' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.echeance, rdvDate, ctx.ready]);

  // ── Alertes informatives (ambre, jamais bloquantes) ──────────────────────
  const redondances = useMemo(() => findRedondances(draft.lines, demandes), [draft.lines, demandes]);
  const redByKey = useMemo(() => new Map(redondances.map(r => [r.key, r])), [redondances]);
  const alerts = useMemo(() => {
    const mois = getAgeEnMois(patient.date_naissance);
    return examAlerts(draft.lines, refs, {
      allergies: patient.allergies_medicaments ?? [],
      medicaments: [...extraMedicaments, ...ctx.traitementsMedicaments],
      sexe: patient.sexe ?? null,
      ageAns: mois === null ? null : Math.floor(mois / 12),
      grossesse: patient.sexe === 'F' ? pregnancyContext(patient).statut : null,
    });
  }, [draft.lines, refs, patient, extraMedicaments, ctx.traitementsMedicaments]);

  const byCode = useMemo(() => new Map(refs.map(r => [r.code, r])), [refs]);
  const setLine = (key: string, p: Partial<ExamLineDraft>) =>
    patch({ lines: draftRef.current.lines.map(l => (l.key === key ? { ...l, ...p } : l)) });
  const removeLine = (key: string) => patch({ lines: draftRef.current.lines.filter(l => l.key !== key) });

  const last = useMemo(() => lastRenewable(demandes), [demandes]);
  const renewLast = () => {
    if (!last) return;
    const renewed = renewDraftFromDemande(last, refs);
    const { lines, merged } = mergeLines(draftRef.current.lines, renewed.lines);
    patch({
      lines,
      renseignements: draftRef.current.renseignements.trim() ? draftRef.current.renseignements : renewed.renseignements,
      ald: draftRef.current.ald || renewed.ald,
    });
    flash(`Examens de la demande du ${formatFrShort(last.date_demande)} rechargés${merged.length ? ` (${merged.length} déjà présent${merged.length > 1 ? 's' : ''})` : ''}.`);
  };

  // ── Packs ────────────────────────────────────────────────────────────────
  const [showAllPacks, setShowAllPacks] = useState(false);
  // Sprint 5c — d'abord les packs qui correspondent aux pathologies du patient, puis les plus utilisés.
  const sortedPacks = useMemo(
    () => sortPacksForPatient(packs, packUsage ?? new Map(), patient.pathologies),
    [packs, packUsage, patient.pathologies],
  );
  const visiblePacks = showAllPacks ? sortedPacks : sortedPacks.slice(0, 6);
  const [savingPack, setSavingPack] = useState(false);
  const [packName, setPackName] = useState<string | null>(null); // null = formulaire fermé
  const [packError, setPackError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  const savePack = async () => {
    const nom = (packName ?? '').trim();
    if (!nom || !doctorId || !orgId) return;
    setSavingPack(true);
    setPackError(null);
    try {
      await createPersonalPack({ doctorId, orgId, nom, lignes: packLinesFromDraft(draftRef.current.lines) });
      setPackName(null);
      onPacksChanged();
      flash(`Pack « ${nom} » enregistré.`);
    } catch (e) {
      setPackError(e instanceof Error ? e.message : 'Enregistrement du pack impossible');
    } finally {
      setSavingPack(false);
    }
  };
  const doRename = async (pack: ExamPack) => {
    const nom = (renaming ?? '').trim();
    setRenaming(null);
    if (!nom || nom === pack.nom) return;
    try { await renamePack(pack.id, nom); onPacksChanged(); setPackPreview(p => (p ? { ...p, pack: { ...p.pack, nom } } : p)); }
    catch (e) { setPackError(e instanceof Error ? e.message : 'Renommage impossible'); }
  };
  const doArchive = async (pack: ExamPack) => {
    try { await archivePack(pack.id); setPackPreview(null); onPacksChanged(); flash(`Pack « ${pack.nom} » archivé.`); }
    catch (e) { setPackError(e instanceof Error ? e.message : 'Archivage impossible'); }
  };

  const packNew = packPreview ? countNewLines(draft.lines, linesFromPack(packPreview.pack, refs, packPreview.selected)) : 0;
  // Sprint 5c — examen injecté sans créatinine demandée : suggestion en 1 clic (jamais bloquante).
  const creatSug = creatinineSuggestion(draft.lines, demandes).filter(c => byCode.has(c));
  const grouped = TYPE_ORDER.map(t => ({ type: t, lines: draft.lines.filter(l => l.type === t) })).filter(g => g.lines.length > 0);
  const nbHorsBio = draft.lines.filter(l => l.type !== 'biologie').length;
  const hasChronic = (patient.pathologies?.length ?? 0) > 0;
  const showList = open && query.trim().length >= 2;
  const popStyle = useAnchoredPopover(anchorRef, showList);

  if (refsFailed && refs.length === 0) {
    return (
      <div role="alert" className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
        <span className="flex-1">Le référentiel d’examens n’a pas pu être chargé.</span>
        <button type="button" onClick={onRetryRefs} className="self-start px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-sm font-semibold hover:bg-amber-100">Réessayer</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recherche */}
      <div className="relative" ref={anchorRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden />
        <input
          ref={searchRef}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls="exam-search-list"
          aria-autocomplete="list"
          autoComplete="off"
          autoFocus={autoFocusSearch}
          data-esc-own={open && options.length > 0 ? '1' : undefined}
          value={query}
          disabled={refsLoading && refs.length === 0}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 180)}
          onKeyDown={onSearchKey}
          placeholder={refsLoading && refs.length === 0 ? 'Chargement du référentiel…' : 'Rechercher un examen ou un pack (ex : hb, echo, tdm, bilan hépatique…)'}
          className={`${inputCls} pl-9 py-2.5`}
        />
        {/* Sprint 5c — liste rendue dans un portail : jamais coupée par un cadre, ouverte vers le
            haut si la place manque, défilement interne, clavier conservé (le champ garde le focus). */}
        {showList && popStyle && createPortal(
          <div id="exam-search-list" ref={listRef} role="listbox" style={popStyle} onMouseDown={e => e.preventDefault()}
            className="z-[90] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-y-auto overscroll-contain">
            {options.map((o, i) => {
              const isActive = i === active;
              const base = `w-full px-3 py-2.5 text-left flex items-center gap-2.5 border-b border-slate-50 last:border-b-0 transition-colors ${isActive ? 'bg-[#E6F4EE]' : 'hover:bg-slate-50'}`;
              if (o.kind === 'free') {
                return (
                  <button key={`free-${o.type}`} type="button" role="option" aria-selected={isActive} data-idx={i}
                    onMouseDown={e => { e.preventDefault(); pick(o); }} onMouseEnter={() => setActive(i)} className={base}>
                    <Plus className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden />
                    <span className="text-sm text-slate-700 min-w-0 truncate">
                      Autre examen ({TYPE_META[o.type].label.toLowerCase()}) : <span className="font-semibold">« {o.label} »</span>
                    </span>
                  </button>
                );
              }
              if (o.r.kind === 'pack') {
                const p = o.r.pack;
                return (
                  <button key={`pack-${p.id}`} type="button" role="option" aria-selected={isActive} data-idx={i}
                    onMouseDown={e => { e.preventDefault(); pick(o); }} onMouseEnter={() => setActive(i)} className={base}>
                    <Layers className="w-4 h-4 text-[#00A86B] flex-shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[#0A1628] truncate">{p.nom}</span>
                      <span className="block text-[11px] text-slate-500">Pack{p.systeme ? '' : ' personnel'} · {p.lignes.length} examen{p.lignes.length > 1 ? 's' : ''}</span>
                    </span>
                  </button>
                );
              }
              const ex = o.r.exam;
              const Icon = TYPE_META[ex.type].icon;
              const already = draft.lines.some(l => l.examen_code === ex.code);
              return (
                <button key={ex.code} type="button" role="option" aria-selected={isActive} data-idx={i}
                  onMouseDown={e => { e.preventDefault(); pick(o); }} onMouseEnter={() => setActive(i)} className={base}>
                  <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#0A1628] truncate">{ex.libelle}</span>
                    <span className="block text-[11px] text-slate-500 truncate">
                      {ex.categorie}{ex.a_jeun ? ' · à jeun' : ''}{o.r.contextual ? ' · suggéré pour ce patient' : ''}
                    </span>
                  </span>
                  {already && <Check className="w-4 h-4 text-[#00A86B] flex-shrink-0" aria-label="Déjà dans la demande" />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
      </div>

      {/* Packs + Renouveler */}
      <div className="flex flex-wrap gap-2">
        {last && (
          <button type="button" onClick={renewLast} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-[#00A86B]/40 bg-[#E6F4EE] text-[#006B47] hover:bg-[#d7efe3] active:scale-[0.97] transition-all">
            <RotateCcw className="w-3.5 h-3.5" aria-hidden /> Renouveler la demande du {formatFrShort(last.date_demande)}
          </button>
        )}
        {visiblePacks.map(p => (
          <button key={p.id} type="button" onClick={() => openPack(p)}
            className={`inline-flex items-center gap-1.5 ${chipCls(packPreview?.pack.id === p.id)}`}>
            {!p.systeme && <Bookmark className="w-3 h-3" aria-hidden />}
            {isContextPack(p, patient.pathologies) && <span className="w-1.5 h-1.5 rounded-full bg-[#00A86B]" title="Suggéré d’après les pathologies du patient" aria-label="Suggéré pour ce patient" />}
            {p.nom}
          </button>
        ))}
        {sortedPacks.length > 6 && (
          <button type="button" onClick={() => setShowAllPacks(v => !v)} className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-[#0A1628] underline-offset-2 hover:underline">
            {showAllPacks ? 'Moins de packs' : `Tous les packs (${sortedPacks.length})`}
          </button>
        )}
      </div>

      {/* Aperçu d'un pack : rien n'est ajouté sans validation */}
      {packPreview && (
        <div className="rounded-xl border border-[#00A86B]/30 bg-[#F4FBF8] p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            {renaming !== null ? (
              <input autoFocus data-esc-own="1" value={renaming} onChange={e => setRenaming(e.target.value)} maxLength={80}
                onBlur={() => void doRename(packPreview.pack)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void doRename(packPreview.pack); } if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setRenaming(null); } }}
                className={`${inputCls} max-w-xs`} aria-label="Nom du pack" />
            ) : (
              <p className="text-sm font-bold text-[#0A1628] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00A86B]" aria-hidden /> {packPreview.pack.nom}
              </p>
            )}
            <div className="flex items-center gap-1 flex-shrink-0">
              {!packPreview.pack.systeme && packPreview.pack.doctor_id === doctorId && renaming === null && (
                <>
                  <button type="button" onClick={() => setRenaming(packPreview.pack.nom)} title="Renommer le pack" aria-label="Renommer le pack" className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-[#0A1628]"><Pencil className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => void doArchive(packPreview.pack)} title="Archiver le pack" aria-label="Archiver le pack" className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-[#0A1628]"><Archive className="w-3.5 h-3.5" /></button>
                </>
              )}
              <button type="button" onClick={() => { setPackPreview(null); setRenaming(null); }} aria-label="Fermer l’aperçu du pack" className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-[#0A1628]"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            {packPreview.pack.lignes.map((pl, i) => {
              const checked = packPreview.selected.has(i);
              const present = draft.lines.some(l => (pl.examen_code ? l.examen_code === pl.examen_code : false));
              return (
                <label key={i} className="flex items-center gap-2 py-1 text-sm text-[#0A1628] cursor-pointer select-none">
                  <input type="checkbox" checked={checked}
                    onChange={() => setPackPreview(p => {
                      if (!p) return p;
                      const s = new Set(p.selected);
                      if (s.has(i)) s.delete(i); else s.add(i);
                      return { ...p, selected: s };
                    })}
                    className="w-4 h-4 rounded border-slate-300 text-[#00A86B] focus:ring-[#00A86B]" />
                  <span className="min-w-0 truncate">{(pl.examen_code && byCode.get(pl.examen_code)?.libelle) || pl.libelle}</span>
                  {present && <span className="text-[10px] font-semibold text-slate-500 flex-shrink-0">déjà ajouté</span>}
                </label>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" disabled={packNew === 0}
              onClick={() => { addLines(linesFromPack(packPreview.pack, refs, packPreview.selected), packKey(packPreview.pack)); setPackPreview(null); }}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#00A86B] hover:bg-[#006B47] disabled:opacity-50 transition-colors">
              {packNew === 0 ? 'Aucun examen nouveau' : `Ajouter ${packNew} examen${packNew > 1 ? 's' : ''}`}
            </button>
            {packNew > 0 && packNew < packPreview.selected.size && (
              <span className="text-xs text-slate-500">{packPreview.selected.size - packNew} déjà dans la demande</span>
            )}
            <button type="button" onClick={() => setPackPreview(null)} className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-white">Annuler</button>
          </div>
        </div>
      )}

      {notice && <p role="status" className="text-xs text-[#006B47] bg-[#E6F4EE] border border-[#00A86B]/20 rounded-lg px-3 py-2">{notice}</p>}
      {packError && <p role="alert" className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{packError}</p>}

      {/* Examens choisis */}
      {draft.lines.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-5 border border-dashed border-slate-200 rounded-xl">
          Aucun examen pour l’instant. Recherchez un examen ou choisissez un pack.
        </p>
      ) : (
        <div className="space-y-3">
          {grouped.map(g => {
            const Icon = TYPE_META[g.type].icon;
            return (
              <div key={g.type}>
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  <Icon className="w-3.5 h-3.5" aria-hidden /> {TYPE_META[g.type].plural} · {g.lines.length}
                </p>
                <div className="space-y-1.5">
                  {g.lines.map(l => {
                    const ref = l.examen_code ? byCode.get(l.examen_code) : undefined;
                    const red = redByKey.get(l.key);
                    const rich = l.type !== 'biologie';
                    return (
                      <div key={l.key} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <p className="flex-1 min-w-0 text-sm font-semibold text-[#0A1628] break-words">
                            {l.libelle}
                            {!l.examen_code && <span className="ml-1.5 text-[10px] font-semibold text-slate-500 align-middle">saisie libre</span>}
                          </p>
                          <button type="button" role="switch" aria-checked={l.a_jeun}
                            onClick={() => setLine(l.key, { a_jeun: !l.a_jeun, delai_jeun_h: !l.a_jeun ? (ref?.delai_jeun_h ?? l.delai_jeun_h ?? null) : null })}
                            title={l.a_jeun ? 'À jeun — cliquer pour retirer' : 'Marquer « à jeun »'}
                            className={`flex-shrink-0 px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors ${l.a_jeun ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'}`}>
                            À jeun{l.a_jeun && l.delai_jeun_h ? ` ${l.delai_jeun_h} h` : ''}
                          </button>
                          <button type="button" onClick={() => removeLine(l.key)} aria-label={`Retirer ${l.libelle}`}
                            className="flex-shrink-0 p-1.5 -mr-1 rounded-lg text-slate-400 hover:text-[#0A1628] hover:bg-slate-100 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        {red && (
                          <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-amber-800">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" aria-hidden /> Déjà demandé le {formatFrShort(red.date_demande)} (en attente)
                          </p>
                        )}
                        {ref?.injection_possible && (
                          <div className="mt-2 inline-flex rounded-lg border border-slate-200 overflow-hidden" role="group" aria-label="Injection de produit de contraste">
                            {([['Sans injection', false], ['Avec injection', true]] as const).map(([label, v]) => (
                              <button key={label} type="button" aria-pressed={l.injection === v}
                                onClick={() => setLine(l.key, { injection: l.injection === v ? null : v })}
                                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${l.injection === v ? 'bg-[#0A1628] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                        {(ref?.precisions_suggerees.length ?? 0) > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {ref!.precisions_suggerees.map(s => {
                              const on = l.precision.includes(s);
                              return (
                                <button key={s} type="button" aria-pressed={on}
                                  onClick={() => setLine(l.key, {
                                    precision: on ? l.precision.split(' — ').filter(x => x !== s).join(' — ') : [l.precision.trim(), s].filter(Boolean).join(' — '),
                                  })}
                                  className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${on ? 'bg-[#E6F4EE] border-[#00A86B]/40 text-[#006B47]' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                                  {s}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <div className={`mt-2 grid gap-2 ${rich ? 'sm:grid-cols-2' : ''}`}>
                          <input value={l.precision} onChange={e => setLine(l.key, { precision: e.target.value })}
                            placeholder={rich ? 'Précision (côté, segment…)' : 'Précision (facultatif)'} aria-label={`Précision pour ${l.libelle}`}
                            className={`${inputCls} py-1.5 text-[13px]`} />
                          {rich && (
                            <input value={l.question} onChange={e => setLine(l.key, { question: e.target.value })}
                              placeholder={`Question posée — ex : ${ref?.question_exemple ?? 'Recherche de lithiase ?'}`} aria-label={`Question posée pour ${l.libelle}`}
                              className={`${inputCls} py-1.5 text-[13px]`} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {creatSug.length > 0 && (
        <div role="status" className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2.5 rounded-xl bg-[#FAFAF7] border border-[#E5E5E0] text-sm text-[#0A1628]">
          <span className="flex-1 min-w-0">Examen avec injection : une créatininémie récente (&lt; 3 mois) sera demandée au patient.</span>
          <button type="button"
            onClick={() => addLines(creatSug.map(c => lineFromRef(byCode.get(c)!)))}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#00A86B] hover:bg-[#006B47] active:scale-[0.98] transition-all whitespace-nowrap">
            <Plus className="w-3.5 h-3.5" aria-hidden /> {creatSug.length === 2 ? 'Ajouter créatinine + DFG' : 'Ajouter la créatinine'}
          </button>
        </div>
      )}

      {/* Alertes informatives */}
      {alerts.length > 0 && (
        <div className="space-y-1.5">
          {alerts.map(a => (
            <div key={a.code} role="status" className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" aria-hidden />
              <span><span className="font-semibold">{a.message}</span><span className="block text-xs text-amber-800 mt-0.5">{a.examens.join(', ')}</span></span>
            </div>
          ))}
        </div>
      )}

      {draft.lines.length > 0 && (
        <>
          {/* Renseignements cliniques */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label htmlFor="exam-renseignements" className="text-sm font-semibold text-slate-700">Renseignements cliniques</label>
              {suggested && draft.renseignements !== suggested && (
                <button type="button" onClick={() => patch({ renseignements: suggested, renseignementsTouched: false })}
                  className="text-xs font-semibold text-[#006B47] hover:underline underline-offset-2">Reprendre depuis le dossier</button>
              )}
            </div>
            <textarea id="exam-renseignements" rows={2} value={draft.renseignements}
              onChange={e => patch({ renseignements: e.target.value, renseignementsTouched: true })}
              placeholder="Contexte clinique utile au laboratoire et au radiologue"
              className={`${inputCls} resize-y leading-relaxed`} />
            {!draft.renseignements.trim() && (
              <p className="text-xs text-slate-500 mt-1">Ajouter des renseignements cliniques aide le laboratoire et le radiologue.</p>
            )}
          </div>

          {/* Échéance */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-1.5">
              À réaliser <span className="text-[#DC2626]" aria-hidden>*</span>
              {echeance && <span className="ml-2 font-normal text-slate-500">avant le <span className="font-semibold text-[#0A1628]">{formatFr(echeance.date)}</span></span>}
            </p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Échéance">
              {ECHEANCE_CHOICES.map(c => {
                const disabled = c.id === 'avant_prochain_rdv' && !rdvDate;
                return (
                  <button key={c.id} type="button" role="radio" aria-checked={draft.echeance === c.id} disabled={disabled}
                    title={disabled ? 'Aucun rendez-vous à venir pour ce patient' : c.id === 'avant_prochain_rdv' && rdvDate ? `RDV du ${formatFr(rdvDate)}` : undefined}
                    onClick={() => patch({ echeance: c.id as EcheanceChoice })} className={chipCls(draft.echeance === c.id, disabled)}>
                    {c.id === 'avant_prochain_rdv' && rdvDate ? `Avant le RDV du ${formatFrShort(rdvDate)}` : c.label}
                  </button>
                );
              })}
            </div>
            {draft.echeance === 'date_precise' && (
              <input type="date" min={todayIso} value={draft.echeanceDate} onChange={e => patch({ echeanceDate: e.target.value })}
                aria-label="Date d’échéance" aria-invalid={!echeance} className={`${inputCls} mt-2 max-w-[12rem]`} />
            )}
            {!echeance && <p role="alert" className="text-xs font-medium text-[#DC2626] mt-1">Choisissez une échéance (date du jour ou ultérieure).</p>}
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <label className="inline-flex items-center gap-2 text-sm text-[#0A1628] cursor-pointer select-none">
              <input type="checkbox" checked={draft.urgent} onChange={e => patch({ urgent: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-[#00A86B] focus:ring-[#00A86B]" />
              Urgent
            </label>
            {hasChronic && (
              <label className="inline-flex items-center gap-2 text-sm text-[#0A1628] cursor-pointer select-none">
                <input type="checkbox" checked={draft.ald} onChange={e => patch({ ald: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-[#00A86B] focus:ring-[#00A86B]" />
                En rapport avec une ALD/ALC
              </label>
            )}
            {nbHorsBio > 1 && (
              <label className="inline-flex items-center gap-2 text-sm text-[#0A1628] cursor-pointer select-none">
                <input type="checkbox" checked={draft.regrouperImageries} onChange={e => patch({ regrouperImageries: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-[#00A86B] focus:ring-[#00A86B]" />
                Regrouper les imageries sur une page
              </label>
            )}
          </div>

          {/* Enregistrer comme pack */}
          {doctorId && orgId && draft.lines.length >= 2 && (
            packName === null ? (
              <button type="button" onClick={() => { setPackName(''); setPackError(null); }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006B47] hover:underline underline-offset-2">
                <Bookmark className="w-3.5 h-3.5" aria-hidden /> Enregistrer cette sélection comme pack
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <input autoFocus data-esc-own="1" value={packName} maxLength={80} onChange={e => setPackName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void savePack(); } if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setPackName(null); } }}
                  placeholder="Nom du pack (ex : Suivi cirrhose)" aria-label="Nom du pack" className={`${inputCls} sm:max-w-xs`} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => void savePack()} disabled={savingPack || !packName.trim()}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#00A86B] hover:bg-[#006B47] disabled:opacity-50 transition-colors">
                    {savingPack ? 'Enregistrement…' : 'Enregistrer le pack'}
                  </button>
                  <button type="button" onClick={() => setPackName(null)} className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">Annuler</button>
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
