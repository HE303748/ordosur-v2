import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, CornerDownLeft, Link2, Zap } from 'lucide-react';
import { searchExams, type ExamRef } from '../../lib/examSearch';
import { notifyDataChanged } from '../../lib/dataSync';
import { formatFr, formatFrShort, toIsoDate } from '../../lib/examRequest';
import { saveResultats } from '../../lib/resultatsApi';
import {
  ajouteLabel, buildResultatPayload, defaultParametre, defaultUnite, deltaCheck, examMesure, fieldToDraft, findLigneARattacher, findPrevious,
  formatNombre, matchUnite, parseSaisieLibre, quickEntryState, resultKind, resultatLabel, restoreTextOnFailure, serieKey, shortLabel, valeurAffichee,
  type Candidat, type DeltaWarning, type FieldState, type ResultatExamen,
} from '../../lib/resultatsLogic';
import { usePatientDemandes } from '../../hooks/useExamData';
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
const AJOUTE_MS = 4000;

/**
 * Sprint 6A — Saisie rapide : UN champ qui comprend « hba1c 7,2 », « créat 12 »,
 * « hb 13,5 g/dl », « tsh 2.1 ». L'examen, la valeur et l'unité compris sont affichés AVANT
 * l'ajout ; une ambiguïté (« hb ») impose un choix explicite.
 *
 * Sprint 6A-bis — fiabilité :
 *   • AUCUNE frappe perdue : à l'Entrée, le champ est vidé et garde le focus de façon
 *     SYNCHRONE ; l'enregistrement part ensuite en arrière-plan. Le champ n'est jamais
 *     désactivé ni réinitialisé après un `await`.
 *   • Un nom non reconnu ne crée jamais un examen libre tout seul (confirmation explicite).
 *   • Le message « Ajouté : … » est construit à partir de la ligne enregistrée.
 *   • Si une demande en attente contient cet examen : « Rattacher à la demande du JJ/MM »
 *     (oui par défaut, décochable en un clic).
 */
export function QuickResultInput({ patientId, pathologies, doctorId, orgId, refs, resultats, lastUnits }: Props) {
  const [text, setText] = useState('');
  const [choice, setChoice] = useState<number | null>(null);
  const [forced, setForced] = useState<Candidat | null>(null);
  const [libreConfirme, setLibreConfirme] = useState(false);
  const [picker, setPicker] = useState<string | null>(null); // texte de recherche de la liste, null = fermée
  const [extra, setExtra] = useState<Extra>(NO_EXTRA);
  const todayIso = toIsoDate(new Date());
  const [date, setDate] = useState(todayIso);
  const [labo, setLabo] = useState('');
  const [warn, setWarn] = useState<DeltaWarning | null>(null);
  const [rattacher, setRattacher] = useState(true);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const mainRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  // Enregistrements en arrière-plan : exécutés un par un, dans l'ordre de saisie.
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  // Lignes de demande déjà utilisées par un enregistrement en cours (jamais proposées deux fois).
  const lignesPrises = useRef(new Set<string>());
  const addedTimer = useRef<number | null>(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; if (addedTimer.current !== null) window.clearTimeout(addedTimer.current); }, []);

  const { demandes } = usePatientDemandes(patientId);
  const parsed = useMemo(() => parseSaisieLibre(text, refs, { pathologies }), [text, refs, pathologies]);
  const state = quickEntryState(parsed, { choice, forced, libreConfirme });
  const candidat = state.candidat;
  const libre = state.libre;
  const exam = candidat?.exam ?? null;
  const parametre = candidat?.parametre ?? null;
  const active = state.etat === 'pret';
  const libelleLibre = libre ? capitalise(parsed.nom.trim()) : undefined;
  const mesure = useMemo(() => examMesure(exam, parametre), [exam, parametre]);
  const kind = resultKind(exam, parametre);
  const key = active ? serieKey({ examen_code: exam?.code ?? null, parametre: mesure.parametre, libelle: exam?.libelle ?? libelleLibre ?? '' }) : '';
  const label = exam ? resultatLabel(exam, mesure.parametre) : (libelleLibre ?? '');

  // Changement d'examen : les compléments (unité choisie, bornes) repartent de zéro.
  useEffect(() => { setExtra(NO_EXTRA); setWarn(null); setRattacher(true); }, [key]);
  // Changement de nom : tout choix explicite (ambiguïté, liste, examen libre) est à refaire.
  useEffect(() => { setChoice(null); setForced(null); setLibreConfirme(false); setPicker(null); }, [parsed.nom]);
  useEffect(() => { if (warn) confirmRef.current?.focus(); }, [warn]);
  useEffect(() => { if (picker !== null) pickerRef.current?.focus(); }, [picker !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const typedUnit = parsed.unite ? (matchUnite(parsed.unite, mesure)?.unite ?? parsed.unite) : null;
  const field: FieldState = {
    valeur: parsed.nombre ? parsed.nombre.valeur.toFixed(parsed.nombre.decimales) : extra.valeur,
    unite: extra.unite !== undefined ? extra.unite : (typedUnit ?? defaultUnite(mesure, lastUnits[key])),
    basse: extra.basse, haute: extra.haute,
    texte: extra.texte || parsed.qualitatif || '',
    anormal: extra.anormal,
  };
  const previous = active ? findPrevious(resultats, key) : null;
  // Examen demandé qui attend ce résultat (demande non annulée, ligne sans résultat).
  const ligne = active ? findLigneARattacher(demandes, { examCode: exam?.code ?? null, libelle: libelleLibre ?? exam?.libelle ?? '' }, lignesPrises.current) : null;
  const pickerResults = useMemo(() => (picker !== null && picker.trim().length >= 2
    ? searchExams(picker, refs, [], { pathologies, limit: 8 }).flatMap(h => (h.kind === 'exam' ? [h.exam] : []))
    : []), [picker, refs, pathologies]);

  const showAdded = (msg: string) => {
    setAdded(msg); // remplace le précédent
    if (addedTimer.current !== null) window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => { if (mounted.current) setAdded(null); }, AJOUTE_MS);
  };

  const submit = (confirmed = false) => {
    if (state.etat === 'vide') return;
    if (state.etat === 'ambigu') { setHint('Choisissez l’examen ci-dessous (↑ ↓ puis Entrée, ou un clic).'); return; }
    if (state.etat === 'non_reconnu') { setHint('Examen non reconnu : choisissez-le dans la liste, ou confirmez la création d’un examen libre.'); return; }
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

    // ── Tout ce qui suit est SYNCHRONE jusqu'au vidage du champ : la ligne à enregistrer est
    // figée ici, puis le champ est vidé et reprend le focus AVANT tout appel réseau.
    const ligneId = ligne && rattacher ? ligne.ligneId : null;
    const payload = buildResultatPayload({ ...draft, demandeLigneId: ligneId },
      { patient_id: patientId, org_id: orgId, doctor_id: doctorId, date_prelevement: date, laboratoire: labo });
    const message = ajouteLabel(payload, exam);
    const typed = text;
    if (ligneId) lignesPrises.current.add(ligneId);
    setText(''); setChoice(null); setForced(null); setLibreConfirme(false); setPicker(null);
    setExtra(NO_EXTRA); setWarn(null); setError(null); setHint(null);
    mainRef.current?.focus({ preventScroll: true });
    setPending(n => n + 1);

    // ── Enregistrement en arrière-plan. Rien ici ne touche au champ, sauf un échec — et
    // seulement si le médecin n'a rien tapé depuis (restoreTextOnFailure).
    queueRef.current = queueRef.current.then(async () => {
      try {
        await saveResultats([payload]);
        notifyDataChanged('bilans');
        if (ligneId) notifyDataChanged('examens');
        if (mounted.current) showAdded(ligneId && ligne ? `${message} — rattaché à la demande du ${formatFrShort(ligne.dateDemande)}` : message);
      } catch (e) {
        if (ligneId) lignesPrises.current.delete(ligneId);
        if (!mounted.current) return;
        setError(`« ${message} » n’a pas été enregistré : ${e instanceof Error ? e.message : 'erreur inconnue'}`);
        setText(cur => restoreTextOnFailure(cur, typed));
      } finally {
        if (mounted.current) setPending(n => Math.max(0, n - 1));
      }
    });
  };

  const onMainKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (parsed.ambigu && !forced && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const n = parsed.candidats.length;
      setChoice(c => (c === null ? (e.key === 'ArrowDown' ? 0 : n - 1) : (c + (e.key === 'ArrowDown' ? 1 : n - 1)) % n));
      setHint(null);
      return;
    }
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
    if (e.key === 'Escape' && text) { e.preventDefault(); setText(''); setWarn(null); setError(null); setHint(null); }
  };

  const pick = (e: ExamRef) => {
    const p = defaultParametre(e);
    setForced({ exam: e, parametre: p, label: p ? `${capitalise(p)} (${shortLabel(e.libelle)})` : shortLabel(e.libelle) });
    setPicker(null); setHint(null);
    mainRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.06] p-3 sm:p-4">
      <label htmlFor="bilan-saisie-rapide" className="flex items-center gap-1.5 text-xs font-bold text-[#0A1628] dark:text-[#E2E8F0]">
        <Zap className="w-3.5 h-3.5 text-[#00A86B]" aria-hidden /> Saisie rapide d’un résultat
        {pending > 0 && <span className="font-normal text-slate-400 dark:text-[#64748B]" role="status">· enregistrement…</span>}
      </label>
      <div className="mt-2 flex gap-2">
        {/* Jamais désactivé : on peut taper le résultat suivant pendant l'enregistrement du précédent. */}
        <input ref={mainRef} id="bilan-saisie-rapide" type="text" value={text} autoComplete="off" autoCapitalize="off" spellCheck={false} enterKeyHint="done"
          onChange={e => { setText(e.target.value); setWarn(null); setError(null); setHint(null); setAdded(null); }} onKeyDown={onMainKey}
          aria-describedby="bilan-saisie-aide" placeholder="hba1c 7,2   ·   créat 12   ·   hb 13,5 g/dl"
          className={`${INPUT} flex-1 min-w-0 py-2.5`} />
        <button type="button" onClick={() => submit()} disabled={text.trim().length < 2}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#00A86B] hover:bg-[#006B47] active:scale-[0.98] transition-all disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00A86B]">
          <CornerDownLeft className="w-3.5 h-3.5" aria-hidden /> Ajouter
        </button>
      </div>
      <p id="bilan-saisie-aide" className="sr-only">Tapez le nom de l’examen puis la valeur, avec ou sans unité. Entrée pour ajouter.</p>

      {/* Ambiguïté : choix explicite, jamais décidé à la place du médecin. */}
      {parsed.ambigu && !forced && (
        <div className="mt-2.5">
          <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
            {parsed.candidats.length > 1 ? `Plusieurs examens correspondent à « ${parsed.nom} » — lequel ?` : `« ${parsed.nom} » est trop court pour être sûr — confirmez l’examen :`}
          </p>
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

      {/* Nom non reconnu : RIEN n'est créé sans un choix explicite. */}
      {state.etat === 'non_reconnu' && (
        <div className="mt-2.5 rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3" role="group" aria-label="Examen non reconnu">
          <p className="flex items-start gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden /> Examen non reconnu : « {parsed.nom} »
          </p>
          <p className="mt-1 ml-6 text-xs text-amber-900/80 dark:text-amber-200/80">Vérifiez la saisie, ou choisissez :</p>
          <div className="mt-2 ml-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => setPicker(parsed.nom)}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-[#0A1628] hover:bg-[#1A2B42] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0A1628]">
              Choisir dans la liste
            </button>
            <button type="button" onClick={() => { setLibreConfirme(true); setPicker(null); setHint(null); mainRef.current?.focus({ preventScroll: true }); }}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-[#0A1628] dark:text-[#E2E8F0] bg-white dark:bg-transparent border border-[#E5E5E0] dark:border-white/[0.12] hover:border-[#0A1628] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B]">
              Créer un examen libre « {capitalise(parsed.nom.trim())} »
            </button>
          </div>
          {picker !== null && (
            <div className="mt-2.5 ml-6">
              <input ref={pickerRef} type="text" value={picker} onChange={e => setPicker(e.target.value)} autoComplete="off" spellCheck={false}
                onKeyDown={e => { if (e.key === 'Enter' && pickerResults[0]) { e.preventDefault(); pick(pickerResults[0]); } if (e.key === 'Escape') { e.preventDefault(); setPicker(null); mainRef.current?.focus(); } }}
                aria-label="Rechercher un examen dans le référentiel" placeholder="Nom de l’examen" className={`${INPUT} w-full sm:w-72 py-1.5`} />
              {pickerResults.length > 0 ? (
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {pickerResults.map(e => (
                    <li key={e.code}>
                      <button type="button" onClick={() => pick(e)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-[#0A1628] border border-[#E5E5E0] hover:border-[#0A1628] dark:bg-transparent dark:text-[#E2E8F0] dark:border-white/[0.12] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B]">
                        {shortLabel(e.libelle)}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-xs text-amber-900/80 dark:text-amber-200/80">{picker.trim().length < 2 ? 'Tapez au moins 2 lettres.' : 'Aucun examen du référentiel ne correspond.'}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirmation visuelle : ce qui sera enregistré. */}
      {active && (
        <div className="mt-2.5 rounded-xl bg-[#FAFAF7] dark:bg-white/[0.03] border border-[#E5E5E0] dark:border-white/[0.08] p-3" aria-live="polite">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-sm font-bold text-[#0A1628] dark:text-[#E2E8F0]">{label}</p>
            {libre && <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">examen libre (hors référentiel)</span>}
            {previous && (
              <span className="text-[11px] text-slate-500 dark:text-[#94A3B8]">Précédent : {valeurAffichee(previous, 30)} le {formatFr(previous.date_prelevement)}</span>
            )}
          </div>
          <div className="mt-2">
            <ResultFields exam={exam} parametre={parametre} field={field} id="bilan-rapide" label={label} inputRef={valueRef}
              lockedValue={parsed.nombre ? formatNombre(parsed.nombre.valeur, parsed.nombre.decimales) : null}
              onEnter={() => submit()}
              onChange={f => { setExtra({ unite: f.unite, basse: f.basse, haute: f.haute, texte: f.texte, anormal: f.anormal, valeur: f.valeur }); setWarn(null); setError(null); setHint(null); }} />
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600 dark:text-[#94A3B8]">
            <label className="inline-flex items-center gap-1.5">Prélèvement
              <input type="date" value={date} max={todayIso} onChange={e => setDate(e.target.value)} className={`${INPUT} py-1.5 w-[9.5rem]`} />
            </label>
            <label className="inline-flex items-center gap-1.5 flex-1 min-w-[10rem]">Laboratoire
              <input type="text" value={labo} maxLength={120} onChange={e => setLabo(e.target.value)} placeholder="facultatif"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }} className={`${INPUT} py-1.5 flex-1 min-w-0`} />
            </label>
          </div>
          {/* Demande en attente pour cet examen : rattachement proposé, oui par défaut. */}
          {ligne && (
            <label className="mt-2.5 flex items-start gap-2 text-xs font-medium text-[#0A1628] dark:text-[#E2E8F0] cursor-pointer">
              <input type="checkbox" checked={rattacher} onChange={e => setRattacher(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#00A86B] focus:ring-[#00A86B]" />
              <span>
                <Link2 className="inline w-3.5 h-3.5 mr-1 -mt-px text-[#00A86B]" aria-hidden />
                Rattacher à la demande du {formatFrShort(ligne.dateDemande)}
                <span className="block font-normal text-slate-500 dark:text-[#94A3B8]">
                  {rattacher ? 'L’examen demandé passera à « réalisé », avec ce résultat.' : 'L’examen demandé restera tel quel, sans résultat.'}
                </span>
              </span>
            </label>
          )}
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
            <button ref={confirmRef} type="button" onClick={() => submit(true)}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-[#0A1628] dark:text-[#E2E8F0] bg-white dark:bg-transparent border border-[#E5E5E0] dark:border-white/[0.12] hover:border-[#0A1628] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B]">
              Confirmer la valeur
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
      {added && (
        <p role="status" className="mt-2 flex items-start gap-1.5 text-xs text-[#006B47] dark:text-[#00A86B]">
          <Check className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden /> Ajouté : {added}
        </p>
      )}
    </div>
  );
}
