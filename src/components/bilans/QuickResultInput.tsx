import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, CornerDownLeft, Zap } from 'lucide-react';
import type { ExamRef } from '../../lib/examSearch';
import { notifyDataChanged } from '../../lib/dataSync';
import { formatFr, toIsoDate } from '../../lib/examRequest';
import { createActionLock } from '../../lib/viewCache';
import { saveResultats } from '../../lib/resultatsApi';
import {
  buildResultatPayload, defaultUnite, deltaCheck, examMesure, fieldToDraft, findPrevious, formatNombre, matchUnite,
  parseSaisieLibre, resultKind, resultatLabel, serieKey, valeurAffichee,
  type DeltaWarning, type FieldState, type ResultatExamen,
} from '../../lib/resultatsLogic';
import { INPUT, ResultFields } from './ResultFields';

interface Props {
  patientId: string;
  pathologies: string[] | null | undefined;
  doctorId: string;
  orgId: string;
  refs: ExamRef[];
  resultats: ResultatExamen[];
  lastUnits: Record<string, string>;
}

type Extra = Pick<FieldState, 'basse' | 'haute' | 'texte' | 'anormal' | 'valeur'> & { unite: string | null | undefined };
const NO_EXTRA: Extra = { basse: '', haute: '', texte: '', anormal: false, valeur: '', unite: undefined };
const capitalise = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * Sprint 6A — Saisie rapide : UN champ qui comprend « hba1c 7,2 », « créat 12 »,
 * « hb 13,5 g/dl », « tsh 2.1 ». L'examen, la valeur et l'unité compris sont affichés AVANT
 * l'ajout ; une ambiguïté (« hb ») impose un choix explicite. Tout se fait au clavier
 * (Entrée pour ajouter) et le focus revient dans le champ pour enchaîner.
 */
export function QuickResultInput({ patientId, pathologies, doctorId, orgId, refs, resultats, lastUnits }: Props) {
  const [text, setText] = useState('');
  const [choice, setChoice] = useState<number | null>(null);
  const [extra, setExtra] = useState<Extra>(NO_EXTRA);
  const todayIso = toIsoDate(new Date());
  const [date, setDate] = useState(todayIso);
  const [labo, setLabo] = useState('');
  const [warn, setWarn] = useState<DeltaWarning | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const mainRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const lock = useRef(createActionLock()).current;

  const parsed = useMemo(() => parseSaisieLibre(text, refs, { pathologies }), [text, refs, pathologies]);
  const candidat = parsed.ambigu ? (choice !== null ? parsed.candidats[choice] ?? null : null) : parsed.candidats[0] ?? null;
  // Aucun examen du référentiel mais un nom + une valeur : saisie libre (hors référentiel).
  const libre = parsed.candidats.length === 0 && parsed.nombre !== null && parsed.nom.trim().length >= 2;
  const exam = candidat?.exam ?? null;
  const parametre = candidat?.parametre ?? null;
  const active = !!candidat || libre;
  const libelleLibre = libre ? capitalise(parsed.nom.trim()) : undefined;
  const mesure = useMemo(() => examMesure(exam, parametre), [exam, parametre]);
  const kind = resultKind(exam, parametre);
  const key = active ? serieKey({ examen_code: exam?.code ?? null, parametre: mesure.parametre, libelle: exam?.libelle ?? libelleLibre ?? '' }) : '';
  const label = exam ? resultatLabel(exam, mesure.parametre) : (libelleLibre ?? '');

  // Changement d'examen : les compléments (unité choisie, bornes) repartent de zéro.
  useEffect(() => { setExtra(NO_EXTRA); setWarn(null); setError(null); }, [key]);
  useEffect(() => { setChoice(null); setHint(null); }, [parsed.nom]);
  useEffect(() => { if (warn) confirmRef.current?.focus(); }, [warn]);

  const typedUnit = parsed.unite ? (matchUnite(parsed.unite, mesure)?.unite ?? parsed.unite) : null;
  const field: FieldState = {
    valeur: parsed.nombre ? parsed.nombre.valeur.toFixed(parsed.nombre.decimales) : extra.valeur,
    unite: extra.unite !== undefined ? extra.unite : (typedUnit ?? defaultUnite(mesure, lastUnits[key])),
    basse: extra.basse, haute: extra.haute,
    texte: extra.texte || parsed.qualitatif || '',
    anormal: extra.anormal,
  };
  const previous = active ? findPrevious(resultats, key) : null;

  const reset = () => {
    setText(''); setChoice(null); setExtra(NO_EXTRA); setWarn(null); setError(null); setHint(null);
    // Le focus revient dans le champ pour enchaîner (aucun saut de page).
    window.requestAnimationFrame(() => mainRef.current?.focus({ preventScroll: true }));
  };

  const submit = (confirmed = false) => lock.run('save', async () => {
    if (saving) return;
    if (!active) {
      if (parsed.ambigu) setHint('Choisissez l’examen ci-dessous (↑ ↓ puis Entrée, ou un clic).');
      else if (text.trim().length >= 2) setHint('Examen non reconnu. Ajoutez une valeur pour l’enregistrer hors référentiel (ex. « zincémie 12 µmol/L »).');
      return;
    }
    const { draft, error: err } = fieldToDraft(field, exam, parametre, { libelleLibre });
    if (!draft) {
      if (err) { setError(err); return; }
      // Examen compris, valeur manquante : le focus passe sur la valeur.
      setHint('Saisissez la valeur.');
      valueRef.current?.focus();
      return;
    }
    if (err) { setError(err); return; }
    if (!date) { setError('Date de prélèvement obligatoire'); return; }
    if (draft.nombre && !confirmed) {
      const w = deltaCheck({ valeur: draft.nombre.valeur, decimales: draft.nombre.decimales, unite: draft.unite }, previous, mesure);
      if (w) { setWarn(w); return; }
    }
    setSaving(true);
    setError(null);
    try {
      const payload = buildResultatPayload(draft, { patient_id: patientId, org_id: orgId, doctor_id: doctorId, date_prelevement: date, laboratoire: labo });
      await saveResultats([payload]);
      notifyDataChanged('bilans');
      setAdded(a => [`${label} ${valeurAffichee(payload)}`, ...a].slice(0, 4));
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Le résultat n’a pas pu être enregistré');
    } finally {
      setSaving(false);
    }
  });

  const onMainKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (parsed.ambigu && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const n = parsed.candidats.length;
      setChoice(c => (c === null ? (e.key === 'ArrowDown' ? 0 : n - 1) : (c + (e.key === 'ArrowDown' ? 1 : n - 1)) % n));
      setHint(null);
      return;
    }
    if (e.key === 'Enter') { e.preventDefault(); void submit(); }
    if (e.key === 'Escape' && text) { e.preventDefault(); reset(); }
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.06] p-3 sm:p-4">
      <label htmlFor="bilan-saisie-rapide" className="flex items-center gap-1.5 text-xs font-bold text-[#0A1628] dark:text-[#E2E8F0]">
        <Zap className="w-3.5 h-3.5 text-[#00A86B]" aria-hidden /> Saisie rapide d’un résultat
      </label>
      <div className="mt-2 flex gap-2">
        <input ref={mainRef} id="bilan-saisie-rapide" type="text" value={text} autoComplete="off" autoCapitalize="off" spellCheck={false} enterKeyHint="done"
          onChange={e => { setText(e.target.value); setWarn(null); setError(null); setHint(null); }} onKeyDown={onMainKey} disabled={saving}
          aria-describedby="bilan-saisie-aide" placeholder="hba1c 7,2   ·   créat 12   ·   hb 13,5 g/dl"
          className={`${INPUT} flex-1 min-w-0 py-2.5`} />
        <button type="button" onClick={() => void submit()} disabled={saving || text.trim().length < 2}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#00A86B] hover:bg-[#006B47] active:scale-[0.98] transition-all disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00A86B]">
          <CornerDownLeft className="w-3.5 h-3.5" aria-hidden /> {saving ? 'Ajout…' : 'Ajouter'}
        </button>
      </div>
      <p id="bilan-saisie-aide" className="sr-only">Tapez le nom de l’examen puis la valeur, avec ou sans unité. Entrée pour ajouter.</p>

      {/* Ambiguïté : choix explicite, jamais décidé à la place du médecin. */}
      {parsed.ambigu && (
        <div className="mt-2.5">
          <p className="text-xs text-slate-600 dark:text-[#94A3B8]">Plusieurs examens correspondent à « {parsed.nom} » — lequel ?</p>
          <div role="radiogroup" aria-label="Examen concerné" className="mt-1.5 flex flex-wrap gap-1.5">
            {parsed.candidats.map((c, i) => (
              <button key={c.exam.code} type="button" role="radio" aria-checked={choice === i}
                onClick={() => { setChoice(i); setHint(null); mainRef.current?.focus({ preventScroll: true }); }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B] ${choice === i
                  ? 'bg-[#0A1628] text-white border-[#0A1628] dark:bg-[#E2E8F0] dark:text-[#0A1628]'
                  : 'bg-white text-[#0A1628] border-[#E5E5E0] hover:border-[#0A1628] dark:bg-transparent dark:text-[#E2E8F0] dark:border-white/[0.12]'}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation visuelle : ce qui sera enregistré. */}
      {active && (
        <div className="mt-2.5 rounded-xl bg-[#FAFAF7] dark:bg-white/[0.03] border border-[#E5E5E0] dark:border-white/[0.08] p-3" aria-live="polite">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-sm font-bold text-[#0A1628] dark:text-[#E2E8F0]">{label}</p>
            {libre && <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">hors référentiel</span>}
            {previous && (
              <span className="text-[11px] text-slate-500 dark:text-[#94A3B8]">Précédent : {valeurAffichee(previous, 30)} le {formatFr(previous.date_prelevement)}</span>
            )}
          </div>
          <div className="mt-2">
            <ResultFields exam={exam} parametre={parametre} field={field} id="bilan-rapide" label={label} inputRef={valueRef}
              lockedValue={parsed.nombre ? formatNombre(parsed.nombre.valeur, parsed.nombre.decimales) : null}
              onEnter={() => void submit()} disabled={saving}
              onChange={f => { setExtra({ unite: f.unite, basse: f.basse, haute: f.haute, texte: f.texte, anormal: f.anormal, valeur: f.valeur }); setWarn(null); setError(null); setHint(null); }} />
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600 dark:text-[#94A3B8]">
            <label className="inline-flex items-center gap-1.5">Prélèvement
              <input type="date" value={date} max={todayIso} onChange={e => setDate(e.target.value)} disabled={saving} className={`${INPUT} py-1.5 w-[9.5rem]`} />
            </label>
            <label className="inline-flex items-center gap-1.5 flex-1 min-w-[10rem]">Laboratoire
              <input type="text" value={labo} maxLength={120} onChange={e => setLabo(e.target.value)} disabled={saving} placeholder="facultatif"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void submit(); } }} className={`${INPUT} py-1.5 flex-1 min-w-0`} />
            </label>
          </div>
          {kind === 'numerique' && !warn && (
            <p className="mt-2 text-[11px] text-slate-400 dark:text-[#64748B]">Entrée pour ajouter · l’unité se change en un clic.</p>
          )}
        </div>
      )}

      {/* Contrôle de cohérence : avertissement, jamais un blocage. */}
      {warn && (
        <div role="alertdialog" aria-label="Valeur à vérifier" className="mt-2.5 rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3">
          <p className="flex items-start gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden /> {warn.message}
          </p>
          {warn.uniteProbable && (
            <p className="mt-1 ml-6 text-xs text-amber-900/80 dark:text-amber-200/80">Cette valeur correspond au résultat précédent exprimé en {warn.uniteProbable}.</p>
          )}
          <div className="mt-2.5 ml-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => { setWarn(null); mainRef.current?.focus(); mainRef.current?.select(); }}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-[#0A1628] hover:bg-[#1A2B42] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0A1628]">
              Corriger
            </button>
            <button ref={confirmRef} type="button" onClick={() => void submit(true)} disabled={saving}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-[#0A1628] dark:text-[#E2E8F0] bg-white dark:bg-transparent border border-[#E5E5E0] dark:border-white/[0.12] hover:border-[#0A1628] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B] disabled:opacity-50">
              {saving ? 'Enregistrement…' : 'Confirmer la valeur'}
            </button>
          </div>
        </div>
      )}

      {hint && <p role="status" className="mt-2 text-xs text-slate-600 dark:text-[#94A3B8]">{hint}</p>}
      {error && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-[#B91C1C] dark:text-red-300">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden /> {error}
        </p>
      )}
      {added.length > 0 && (
        <p role="status" className="mt-2 flex items-start gap-1.5 text-xs text-[#006B47] dark:text-[#00A86B]">
          <Check className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden /> Ajouté : {added.join(' · ')}
        </p>
      )}
    </div>
  );
}
