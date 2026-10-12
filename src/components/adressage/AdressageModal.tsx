import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { X, Send, Printer, Download, Share2, CheckCircle2, Clock, AlertTriangle, UserPlus, RotateCcw, ChevronDown } from 'lucide-react';
import type { Patient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { notifyDataChanged } from '../../lib/dataSync';
import { createActionLock } from '../../lib/viewCache';
import { toIsoDate, formatFr } from '../../lib/examRequest';
import { canSharePdf } from '../../lib/examPdf';
import type { OutputMode } from '../../lib/examUi';
import { useExamPrintContext } from '../../hooks/useExamData';
import { useAdressageContext, useConfreres } from '../../hooks/useAdressages';
import { createLettre, marquerEnvoyee, type Confrere, type LettreAdressage } from '../../lib/adressageApi';
import {
  adressageDraftHasContent, clearAdressageDraft, emptyAdressageParams, loadAdressageDraft, outputLettre, saveAdressageDraft,
  type AdressageDraft, type AdressageParams,
} from '../../lib/adressageUi';
import {
  MOTIFS_COURANTS, SPECIALITES_ADRESSAGE, URGENCES, accepterRegeneration, destinataireLigne, estModifie, garderTexte, genererLettre,
  markupToHtml, mentionUrgence, nomConfrere, normaliserMarkup, objetLettre, patientLigne, propositionEnAttente, surRegeneration, surSaisie,
  texteInitial, validerLettre, type LettreInput, type TexteLettre,
} from '../../lib/lettreAdressage';
import { RichTextEditor } from './RichTextEditor';
import { ConfrereForm } from './ConfrereForm';

interface Props {
  patient: Patient;
  duplicateFrom?: LettreAdressage | null;
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const field = 'w-full px-3 py-2.5 text-sm bg-white border border-[#E5E5E0] rounded-xl text-[#0A1628] placeholder-slate-400 focus:outline-none focus:border-[#00A86B] focus:ring-2 focus:ring-[#00A86B]/15';
const lbl = 'block text-xs font-semibold text-slate-600 mb-1';
const seg = (on: boolean) => `flex-1 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${on
  ? 'bg-[#0A1628] text-white border-[#0A1628]' : 'bg-white text-[#0A1628] border-[#E5E5E0] hover:border-[#0A1628]'}`;
const btnGhost = 'inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#0A1628] border border-[#E5E5E0] hover:border-[#0A1628] disabled:opacity-50 transition-colors';
const btnPrimary = 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#00A86B] hover:bg-[#006B47] disabled:opacity-50 transition-colors';

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-[#E5E5E0] p-4 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-[#0A1628]">{title}</h3>
        {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Check({ checked, onChange, disabled, children, sub }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; children: ReactNode; sub?: string }) {
  return (
    <label className={`flex items-start gap-2.5 py-1.5 min-h-[2.25rem] ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <input type="checkbox" className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-[#00A86B]" checked={checked && !disabled}
        disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <span className="min-w-0 text-sm text-[#0A1628]">
        {children}
        {sub && <span className="block text-xs text-slate-500">{sub}</span>}
      </span>
    </label>
  );
}

const paramsFromLettre = (l: LettreAdressage): AdressageParams => ({
  ...emptyAdressageParams(),
  confrereId: l.confrere_id, specialite: l.specialite_destinataire, destinataireLibre: l.destinataire_libre ?? '',
  motif: l.motif, urgence: l.urgence, contexte: l.contexte_suivi ?? '', question: l.question_posee ?? '',
  mode: l.sections_incluses?.mode_traitements ?? 'classes', joindreBilans: !!l.sections_incluses?.joindre_bilans,
});

/**
 * Sprint 7 — Lettre d'adressage : paramètres à gauche, texte à droite, mis à jour en direct et
 * ENTIÈREMENT modifiable. Une modification manuelle n'est jamais écrasée par un changement de
 * paramètre sans confirmation. Bottom-sheet empilé sur mobile. Aucune IA : le texte vient du
 * modèle déterministe lib/lettreAdressage, à partir des seules données du dossier.
 */
export function AdressageModal({ patient, duplicateFrom = null, onClose, showToast }: Props) {
  const { user, doctorProfile } = useAuth();
  const doctorId = doctorProfile?.id ?? null;
  const orgId = user?.org_id ?? null;
  const printCtx = useExamPrintContext();
  const ctx = useAdressageContext(patient);
  const { confreres } = useConfreres();

  const [params, setParams] = useState<AdressageParams>(() => (duplicateFrom ? paramsFromLettre(duplicateFrom) : emptyAdressageParams()));
  const [texte, setTexte] = useState<TexteLettre>(() => texteInitial(''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<LettreAdressage | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState<OutputMode | 'envoi' | null>(null);
  const [newConfrere, setNewConfrere] = useState(false);
  const [openList, setOpenList] = useState<'antecedents' | 'bilans' | null>(null);
  const set = <K extends keyof AdressageParams>(k: K, v: AdressageParams[K]) => setParams(p => ({ ...p, [k]: v }));

  // Brouillon enregistré : PROPOSÉ (jamais repris d'office), lié à ce patient et à ce médecin.
  const [stored, setStored] = useState<{ draft: AdressageDraft; savedAt: number } | null>(() =>
    (doctorId && !duplicateFrom ? loadAdressageDraft(doctorId, patient.id) : null));

  const confrere: Confrere | null = useMemo(() => confreres.find(c => c.id === params.confrereId) ?? null, [confreres, params.confrereId]);
  const specialite = confrere?.specialite || params.specialite;
  const today = useMemo(() => new Date(), []);

  // ── Sélections ─────────────────────────────────────────────────────────────
  // Antécédents : cochés par défaut, sauf les antécédents familiaux (proposés, à cocher un à un).
  const antecedentCoche = (a: { id: string; familial: boolean }) =>
    (a.familial ? params.antecedentsFamiliauxInclus.includes(a.id) : !params.antecedentsExclus.includes(a.id));
  const antecedentsInclus = useMemo(() => ctx.antecedents.filter(antecedentCoche),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx.antecedents, params.antecedentsExclus, params.antecedentsFamiliauxInclus]);
  const dfgInclus = params.dfg && !!ctx.dfg;
  const bilansChoisis = params.bilans ?? ctx.bilansParDefaut;
  // Le DFG est cité une seule fois : la ligne « DFG » remplace le résultat brut du même examen.
  const bilansInclus = useMemo(() => ctx.bilans.filter(b => bilansChoisis.includes(b.key) && !(dfgInclus && b.examCode === 'DFG')), [ctx.bilans, bilansChoisis, dfgInclus]);
  const hasAllergies = ctx.allergiesMedicaments.length + ctx.allergiesAlimentaires.length > 0;

  const input: LettreInput = useMemo(() => ({
    today,
    confrere: confrere ? { titre: confrere.titre, civilite: confrere.civilite, nom: confrere.nom, prenom: confrere.prenom, specialite: confrere.specialite } : null,
    patient,
    pathologies: ctx.pathologies,
    traitements: ctx.traitements,
    modeTraitements: params.mode,
    contexteSuivi: params.contexte,
    antecedents: antecedentsInclus,
    allergiesMedicaments: params.allergies ? ctx.allergiesMedicaments : [],
    allergiesAlimentaires: params.allergies ? ctx.allergiesAlimentaires : [],
    bilans: bilansInclus,
    dfg: dfgInclus ? ctx.dfg : null,
    examensEnAttente: params.examensEnAttente ? ctx.examensEnAttente : [],
    grossesse: params.grossesse ? ctx.grossesse : '',
    motif: params.motif,
    question: params.question,
  }), [today, confrere, patient, ctx, params, antecedentsInclus, bilansInclus, dfgInclus]);

  const genere = useMemo(() => (ctx.ready ? genererLettre(input) : ''), [ctx.ready, input]);

  // Texte : suit les paramètres tant qu'il n'a pas été modifié à la main ; sinon la nouvelle
  // version est seulement PROPOSÉE (bandeau « Régénérer / Garder mon texte »).
  const initTexte = useRef(false);
  const pendingResume = useRef<AdressageDraft['texte'] | null>(null);
  useEffect(() => {
    if (!ctx.ready) return;
    if (!initTexte.current) {
      initTexte.current = true;
      if (duplicateFrom) { setTexte({ texte: duplicateFrom.contenu_final, base: genere, genere, ignore: genere }); return; }
      if (pendingResume.current) { const t = pendingResume.current; pendingResume.current = null; setTexte({ texte: t.texte, base: t.base, genere, ignore: null }); return; }
      setTexte(texteInitial(genere));
      return;
    }
    setTexte(s => surRegeneration(s, genere));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.ready, genere]);

  const resume = () => {
    if (!stored) return;
    setParams(stored.draft.params);
    if (initTexte.current) setTexte({ texte: stored.draft.texte.texte, base: stored.draft.texte.base, genere, ignore: null });
    else pendingResume.current = stored.draft.texte;
    setStored(null);
  };

  const draft: AdressageDraft = useMemo(() => ({ params, texte: { texte: texte.texte, base: texte.base } }), [params, texte.texte, texte.base]);
  const hasContent = adressageDraftHasContent(draft);
  const modifie = estModifie(texte);
  const proposition = propositionEnAttente(texte);

  // Sauvegarde du brouillon (debounce) — suspendue tant qu'un brouillon attend une décision.
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (!doctorId || saved || stored || !ctx.ready) return;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => saveAdressageDraft(doctorId, patient.id, draft), 500);
    return () => { if (timer.current !== null) window.clearTimeout(timer.current); };
  }, [draft, doctorId, patient.id, saved, stored, ctx.ready]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const requestClose = () => {
    if (saving) return;
    if (!saved && hasContent) setConfirmClose(true); else onClose();
  };

  // Échap : ferme l'élément le plus haut (confirmation, fiche confrère, puis modale), jamais le tableau de bord.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (confirmClose) setConfirmClose(false);
      else if (confirmReset) setConfirmReset(false);
      else if (newConfrere) setNewConfrere(false);
      else requestClose();
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmClose, confirmReset, newConfrere, hasContent, saved, saving]);

  const erreurs = useMemo(() => validerLettre({ specialite, motif: params.motif, texte: texte.texte }), [specialite, params.motif, texte.texte]);
  const ligneDestinataire = specialite ? destinataireLigne({ confrere, specialite, libre: params.destinataireLibre }) : '';

  // Double clic : une seule lettre créée, un seul PDF (verrou synchrone).
  const lock = useRef(createActionLock()).current;
  const handleSave = () => lock.run('save', async () => {
    if (saving || saved) return;
    if (!doctorId || !orgId || !printCtx.me) { setError('Profil médecin non chargé — rechargez la page.'); return; }
    if (!ctx.ready) return;
    if (erreurs.length > 0) { setError(erreurs[0]); return; }
    setSaving(true);
    setError(null);
    try {
      const now = new Date();
      const joindre = params.joindreBilans && ctx.recap.length > 0;
      const row = await createLettre({
        patient_id: patient.id, org_id: orgId, doctor_id: doctorId,
        confrere_id: confrere?.id ?? null,
        specialite_destinataire: specialite, destinataire_libre: confrere ? null : params.destinataireLibre,
        destinataire_ligne: ligneDestinataire,
        patient_ligne: patientLigne(patient, now),
        motif: params.motif.trim(), contexte_suivi: params.contexte, question_posee: params.question, urgence: params.urgence,
        contenu_final: normaliserMarkup(texte.texte),
        sections_incluses: {
          mode_traitements: params.mode, antecedents: antecedentsInclus.length, allergies: params.allergies && hasAllergies,
          bilans: bilansInclus.map(b => b.label), dfg: dfgInclus, examens_en_attente: params.examensEnAttente && ctx.examensEnAttente.length > 0,
          grossesse: params.grossesse && !!ctx.grossesse, joindre_bilans: joindre,
        },
        entete: { doctor: printCtx.me.header, org: printCtx.org, logoUrl: printCtx.me.logoUrl },
        annexe_bilans: joindre ? ctx.recap : null,
        date_lettre: toIsoDate(now),
      });
      clearAdressageDraft(doctorId, patient.id);
      setSaved(row);
      notifyDataChanged('adressages');
      showToast?.('Lettre d’adressage enregistrée', 'success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La lettre n’a pas pu être enregistrée. Rien n’a été créé.');
    } finally {
      setSaving(false);
    }
  });

  const output = (mode: OutputMode) => lock.run('pdf', async () => {
    if (!saved || busy) return;
    setBusy(mode);
    setError(null);
    try {
      showToast?.(await outputLettre(saved, patient, mode), 'info');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la génération du PDF');
    } finally {
      setBusy(null);
    }
  });

  const envoyer = () => lock.run('envoi', async () => {
    if (!saved || busy || saved.statut !== 'brouillon') return;
    setBusy('envoi');
    setError(null);
    try {
      setSaved(await marquerEnvoyee(saved.id, toIsoDate(new Date())));
      notifyDataChanged('adressages');
      showToast?.('Lettre marquée « Envoyée »', 'success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Le statut n’a pas pu être modifié.');
    } finally {
      setBusy(null);
    }
  });

  const shareable = useMemo(() => canSharePdf(), []);
  const storedDate = stored ? new Date(stored.savedAt) : null;
  const mention = mentionUrgence(saved ? saved.urgence : params.urgence);
  const specialitesListe = SPECIALITES_ADRESSAGE.map(s => s.label);

  const toggleBilan = (key: string, on: boolean) => {
    const cur = new Set(bilansChoisis);
    if (on) cur.add(key); else cur.delete(key);
    set('bilans', [...cur]);
  };
  const toggleAntecedent = (a: { id: string; familial: boolean }, on: boolean) => {
    const k = a.familial ? 'antecedentsFamiliauxInclus' : 'antecedentsExclus';
    const inclure = a.familial ? on : !on; // familial : liste des cochés ; autres : liste des décochés
    set(k, inclure ? [...new Set([...params[k], a.id])] : params[k].filter(x => x !== a.id));
  };

  // ── Colonne « paramètres » ────────────────────────────────────────────────
  const parametres = (
    <div className="space-y-4">
      {stored && (
        <div role="status" className="flex flex-col gap-2 px-4 py-3 rounded-xl bg-white border border-slate-200 border-l-4 border-l-[#0A1628]">
          <p className="flex items-center gap-2 text-sm text-[#0A1628]">
            <Clock className="w-4 h-4 flex-shrink-0" aria-hidden />
            <span><span className="font-semibold">Brouillon du {storedDate!.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} {storedDate!.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span> pour {patient.prenom} {patient.nom}</span>
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={resume} className="px-3 py-1.5 rounded-lg bg-[#00A86B] hover:bg-[#006B47] text-white text-sm font-semibold transition-colors">Reprendre</button>
            <button type="button" onClick={() => { if (doctorId) clearAdressageDraft(doctorId, patient.id); setStored(null); }} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Supprimer</button>
          </div>
        </div>
      )}

      <Card title="Destinataire" hint="Un confrère de votre carnet, ou une spécialité.">
        {newConfrere ? (
          <ConfrereForm defaultSpecialite={params.specialite} onCancel={() => setNewConfrere(false)}
            onSaved={c => { setNewConfrere(false); setParams(p => ({ ...p, confrereId: c.id, specialite: c.specialite })); }} />
        ) : (
          <>
            <div>
              <label className={lbl} htmlFor="adr-confrere">Confrère</label>
              <div className="flex gap-2">
                <select id="adr-confrere" className={field} value={params.confrereId ?? ''}
                  onChange={e => { const c = confreres.find(x => x.id === e.target.value) ?? null; setParams(p => ({ ...p, confrereId: c?.id ?? null, specialite: c?.specialite ?? p.specialite })); }}>
                  <option value="">Aucun — spécialité seule</option>
                  {confreres.map(c => <option key={c.id} value={c.id}>{nomConfrere(c)} — {c.specialite}</option>)}
                </select>
                <button type="button" onClick={() => setNewConfrere(true)} className={`${btnGhost} flex-shrink-0`} aria-label="Ajouter un confrère au carnet">
                  <UserPlus className="w-4 h-4" aria-hidden /> <span className="hidden sm:inline">Nouveau</span>
                </button>
              </div>
              {confrere && (confrere.etablissement || confrere.ville || confrere.telephone) && (
                <p className="text-xs text-slate-500 mt-1.5">{[confrere.etablissement, confrere.ville, confrere.telephone].filter(Boolean).join(' · ')}</p>
              )}
            </div>
            {!confrere && (
              <>
                <div>
                  <label className={lbl} htmlFor="adr-spe">Spécialité destinataire *</label>
                  <select id="adr-spe" className={field} value={params.specialite} onChange={e => set('specialite', e.target.value)}>
                    <option value="">Choisir…</option>
                    {specialitesListe.map(s => <option key={s} value={s}>{s}</option>)}
                    {params.specialite && !specialitesListe.includes(params.specialite) && <option value={params.specialite}>{params.specialite}</option>}
                  </select>
                </div>
                <div>
                  <label className={lbl} htmlFor="adr-libre">Destinataire précis (facultatif)</label>
                  <input id="adr-libre" className={field} value={params.destinataireLibre} onChange={e => set('destinataireLibre', e.target.value)}
                    placeholder="Service de cardiologie, CHU Ibn Rochd" autoComplete="off" />
                </div>
              </>
            )}
          </>
        )}
      </Card>

      <Card title="Motif de l’adressage">
        <div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {MOTIFS_COURANTS.map(m => (
              <button key={m} type="button" onClick={() => set('motif', m)} aria-pressed={params.motif === m}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${params.motif === m
                  ? 'bg-[#E6F4EE] text-[#006B47] border-[#00A86B]/40' : 'bg-white text-[#0A1628] border-[#E5E5E0] hover:border-[#00A86B]'}`}>{m}</button>
            ))}
          </div>
          <label className={lbl} htmlFor="adr-motif">Motif *</label>
          <input id="adr-motif" className={field} value={params.motif} onChange={e => set('motif', e.target.value)}
            placeholder="Complément de prise en charge, avis spécialisé…" autoComplete="off" />
        </div>
        <div>
          <label className={lbl} htmlFor="adr-question">Question posée</label>
          <textarea id="adr-question" rows={2} className={`${field} resize-y`} value={params.question} onChange={e => set('question', e.target.value)}
            placeholder="Une ponction-biopsie hépatique est-elle indiquée ?" />
        </div>
        <div>
          <span className={lbl}>Urgence</span>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Urgence">
            {URGENCES.map(u => (
              <button key={u.id} type="button" role="radio" aria-checked={params.urgence === u.id} onClick={() => set('urgence', u.id)} className={seg(params.urgence === u.id)}>{u.label}</button>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Contexte du suivi" hint="Repris tel quel après les pathologies du patient.">
        <textarea rows={2} className={`${field} resize-y`} value={params.contexte} onChange={e => set('contexte', e.target.value)} aria-label="Contexte du suivi"
          placeholder="suivi dans notre formation pour prise en charge d’une stéatose hépatique" />
      </Card>

      <Card title="Traitement de fond" hint={!ctx.ready ? 'Lecture du dossier…' : ctx.traitements.length === 0 ? 'Aucun traitement de fond actif : rien ne sera écrit.' : `${ctx.traitements.length} traitement${ctx.traitements.length > 1 ? 's' : ''} actif${ctx.traitements.length > 1 ? 's' : ''}.`}>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Présentation des traitements">
          <button type="button" role="radio" aria-checked={params.mode === 'classes'} onClick={() => set('mode', 'classes')} className={seg(params.mode === 'classes')}>Résumé par classe</button>
          <button type="button" role="radio" aria-checked={params.mode === 'detaille'} onClick={() => set('mode', 'detaille')} className={seg(params.mode === 'detaille')}>Détaillé</button>
        </div>
        <p className="text-xs text-slate-500">{params.mode === 'classes'
          ? '« sous antidiabétiques oraux », « sous monothérapie antihypertensive »… Classe inconnue : nom du médicament.'
          : 'Noms et posologies du traitement de fond.'}</p>
      </Card>

      <Card title="Sections à inclure" hint="Une section sans donnée n’est jamais écrite.">
        {!ctx.ready ? <div className="h-24 rounded-xl bg-slate-100 animate-pulse" /> : (
          <div className="divide-y divide-[#E5E5E0]">
            <div className="py-1">
              <button type="button" disabled={ctx.antecedents.length === 0} onClick={() => setOpenList(o => (o === 'antecedents' ? null : 'antecedents'))} aria-expanded={openList === 'antecedents'}
                className="w-full flex items-center justify-between gap-2 py-1.5 text-sm text-[#0A1628] disabled:opacity-50">
                <span>Antécédents <span className="text-xs text-slate-500">{ctx.antecedents.length === 0 ? 'aucune donnée' : `${antecedentsInclus.length} sur ${ctx.antecedents.length}`}</span></span>
                {ctx.antecedents.length > 0 && <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openList === 'antecedents' ? 'rotate-180' : ''}`} aria-hidden />}
              </button>
              {openList === 'antecedents' && (
                <div className="pl-1 pb-1">
                  {ctx.antecedents.map(a => (
                    <Check key={a.id} checked={antecedentCoche(a)} onChange={v => toggleAntecedent(a, v)} sub={a.familial ? 'Antécédent familial' : a.categorie === 'toxique' ? 'Habitudes et toxiques' : undefined}>{a.libelle}</Check>
                  ))}
                </div>
              )}
            </div>
            <Check checked={params.allergies} disabled={!hasAllergies} onChange={v => set('allergies', v)} sub={hasAllergies ? [...ctx.allergiesMedicaments, ...ctx.allergiesAlimentaires].join(', ') : 'aucune donnée'}>Allergies</Check>
            <div className="py-1">
              <button type="button" disabled={ctx.bilans.length === 0 && !ctx.dfg} onClick={() => setOpenList(o => (o === 'bilans' ? null : 'bilans'))} aria-expanded={openList === 'bilans'}
                className="w-full flex items-center justify-between gap-2 py-1.5 text-sm text-[#0A1628] disabled:opacity-50">
                <span>Derniers bilans <span className="text-xs text-slate-500">{ctx.bilans.length === 0 && !ctx.dfg ? 'aucune donnée' : `${bilansInclus.length + (dfgInclus ? 1 : 0)} résultat${bilansInclus.length + (dfgInclus ? 1 : 0) > 1 ? 's' : ''} cité${bilansInclus.length + (dfgInclus ? 1 : 0) > 1 ? 's' : ''}`}</span></span>
                {(ctx.bilans.length > 0 || ctx.dfg) && <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openList === 'bilans' ? 'rotate-180' : ''}`} aria-hidden />}
              </button>
              {openList === 'bilans' && (
                <div className="pl-1 pb-1">
                  {ctx.dfg && <Check checked={params.dfg} onChange={v => set('dfg', v)} sub={ctx.dfg}>DFG</Check>}
                  {ctx.bilans.filter(b => !(dfgInclus && b.examCode === 'DFG')).map(b => (
                    <Check key={b.key} checked={bilansChoisis.includes(b.key)} onChange={v => toggleBilan(b.key, v)} sub={`${b.valeur} · ${formatFr(b.date)}`}>{b.label}</Check>
                  ))}
                </div>
              )}
            </div>
            <Check checked={params.examensEnAttente} disabled={ctx.examensEnAttente.length === 0} onChange={v => set('examensEnAttente', v)}
              sub={ctx.examensEnAttente.length === 0 ? 'aucune donnée' : ctx.examensEnAttente.map(e => e.libelle).join(', ')}>Examens en attente</Check>
            {ctx.grossesse && <Check checked={params.grossesse} onChange={v => set('grossesse', v)} sub={ctx.grossesse}>Statut grossesse</Check>}
            <Check checked={params.joindreBilans} disabled={ctx.recap.length === 0} onChange={v => set('joindreBilans', v)}
              sub={ctx.recap.length === 0 ? 'aucun résultat enregistré' : 'Tableau des derniers résultats, ajouté à la suite de la lettre (PDF).'}>Joindre le récapitulatif des bilans</Check>
          </div>
        )}
        {ctx.errors.length > 0 && (
          <p role="alert" className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden /> Lecture impossible : {ctx.errors.join(', ')}. Ces données ne figurent pas dans la lettre.
          </p>
        )}
      </Card>
    </div>
  );

  // ── Colonne « lettre » ────────────────────────────────────────────────────
  const enTeteLettre = (ligne: string, motif: string) => (
    <div className="mb-3 px-4 py-3 rounded-xl bg-white border border-[#E5E5E0]">
      <p className="text-xs text-slate-500">Patient : {patientLigne(patient, today)}</p>
      <p className="text-sm font-bold text-[#0A1628] mt-1">{ligne || 'Destinataire à choisir'}</p>
      <p className="text-sm text-slate-600">{motif.trim() ? objetLettre(motif) : 'Objet : Adressage — motif à préciser'}</p>
      {mention && <p className={`inline-block mt-1.5 text-xs font-bold text-[#0A1628] ${mention === 'URGENT' ? 'px-2 py-0.5 rounded border border-[#0A1628]' : ''}`}>{mention}</p>}
    </div>
  );

  const lettre = saved ? (
    <div>
      {enTeteLettre(saved.destinataire_ligne, saved.motif)}
      <div className="px-4 py-3 rounded-xl bg-white border border-[#E5E5E0] text-[15px] leading-relaxed text-[#0A1628] [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-bold"
        dangerouslySetInnerHTML={{ __html: markupToHtml(saved.contenu_final) }} />
      <p className="text-xs text-slate-500 mt-2">Signature et cachet à apposer sur le document imprimé.{saved.annexe_bilans ? ' Récapitulatif des bilans joint à la suite.' : ''}</p>
    </div>
  ) : (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 id="adr-lettre-titre" className="text-sm font-bold text-[#0A1628]">Texte de la lettre <span className="font-normal text-slate-500">— entièrement modifiable</span></h3>
        {modifie && !proposition && !confirmReset && (
          <button type="button" onClick={() => setConfirmReset(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0A1628]">
            <RotateCcw className="w-3.5 h-3.5" aria-hidden /> Texte généré
          </button>
        )}
      </div>
      {enTeteLettre(ligneDestinataire, params.motif)}
      {(proposition || confirmReset) && (
        <div role="alert" className="mb-3 px-4 py-3 rounded-xl bg-white border border-slate-200 border-l-4 border-l-[#0A1628]">
          <p className="text-sm text-[#0A1628]">
            <span className="font-semibold">Vous avez modifié le texte à la main.</span>{' '}
            {proposition ? 'Les paramètres ont changé : votre texte est conservé tel quel.' : 'Revenir au texte généré efface vos modifications.'}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <button type="button" onClick={() => { setTexte(garderTexte); setConfirmReset(false); }} className="px-3 py-1.5 rounded-lg bg-[#00A86B] hover:bg-[#006B47] text-white text-sm font-semibold transition-colors">Garder mon texte</button>
            <button type="button" onClick={() => { setTexte(accepterRegeneration); setConfirmReset(false); }} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-[#DC2626] border border-[#DC2626]/40 hover:bg-[#DC2626]/[0.06] transition-colors">Régénérer (remplace mon texte)</button>
          </div>
        </div>
      )}
      {!ctx.ready ? <div className="h-72 rounded-xl bg-white border border-[#E5E5E0] animate-pulse" aria-busy="true" aria-label="Lecture du dossier" /> : (
        <RichTextEditor value={texte.texte} onChange={t => setTexte(s => surSaisie(s, t))} labelledBy="adr-lettre-titre" />
      )}
      <p className="text-xs text-slate-500 mt-2">Sur le document : en-tête du cabinet, date, « Signature et cachet ». Le nom du patient y figure toujours.</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="adr-modal-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={requestClose} />
      <div className="relative w-full sm:max-w-6xl bg-[#FAFAF7] rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[94vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex justify-center pt-2.5 sm:hidden"><div className="w-10 h-1 rounded-full bg-slate-300" /></div>
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-[#E5E5E0] bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#E6F4EE] flex items-center justify-center flex-shrink-0">
              <Send className="w-4 h-4 text-[#00A86B]" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 id="adr-modal-title" className="text-base font-bold text-[#0A1628]">{saved ? 'Lettre enregistrée' : 'Adresser à un confrère'}</h2>
              <p className="text-xs text-slate-500 truncate">{patient.prenom} {patient.nom}{duplicateFrom && !saved ? ` · copie de la lettre du ${formatFr(duplicateFrom.date_lettre)}` : ''}</p>
            </div>
          </div>
          <button type="button" onClick={requestClose} aria-label="Fermer" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain lg:overflow-hidden lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="px-4 sm:px-6 py-4 lg:overflow-y-auto lg:overscroll-contain lg:border-r lg:border-[#E5E5E0]">
            {saved ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#E6F4EE] border border-[#00A86B]/20">
                  <CheckCircle2 className="w-5 h-5 text-[#00A86B] flex-shrink-0 mt-0.5" aria-hidden />
                  <p className="text-sm text-[#0A1628]">
                    <span className="font-semibold">La lettre est enregistrée et figée.</span>{' '}
                    Elle se réimprime à l’identique depuis l’onglet « Adressages » du patient. Pour la modifier, dupliquez-la.
                  </p>
                </div>
                <Card title="Suivi" hint="Au-delà de 30 jours sans réponse, l’adressage est signalé sur l’Accueil.">
                  {saved.statut === 'brouillon' ? (
                    <button type="button" onClick={() => void envoyer()} disabled={!!busy} className={`${btnGhost} w-full`}>
                      <Send className="w-4 h-4" aria-hidden /> {busy === 'envoi' ? 'Enregistrement…' : 'Marquer « Envoyée » aujourd’hui'}
                    </button>
                  ) : (
                    <p className="flex items-center gap-2 text-sm font-semibold text-[#006B47]"><CheckCircle2 className="w-4 h-4" aria-hidden /> Envoyée le {formatFr(saved.date_envoi)}</p>
                  )}
                </Card>
              </div>
            ) : parametres}
          </div>
          <div className="px-4 sm:px-6 py-4 lg:overflow-y-auto lg:overscroll-contain border-t border-[#E5E5E0] lg:border-t-0">
            {lettre}
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3 border-t border-[#E5E5E0] bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {error && (
            <p role="alert" className="flex items-start gap-2 mb-2 px-3 py-2 rounded-lg bg-[#FEF2F2] border border-[#DC2626]/30 text-sm text-[#0A1628]">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#DC2626]" aria-hidden /> {error}
            </p>
          )}
          {!saved ? (
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
              {erreurs.length > 0 && ctx.ready && <p className="text-xs text-amber-800 sm:mr-auto">{erreurs[0]}</p>}
              <button type="button" onClick={requestClose} disabled={saving} className={btnGhost}>Annuler</button>
              <button type="button" onClick={() => void handleSave()} disabled={saving || !ctx.ready || erreurs.length > 0} className={btnPrimary}>
                {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {saving ? 'Enregistrement…' : 'Valider et enregistrer'}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button type="button" onClick={onClose} className={`${btnGhost} flex-1 sm:flex-none sm:mr-auto`}>Fermer</button>
              {shareable && (
                <button type="button" onClick={() => void output('share')} disabled={!!busy} className={`${btnGhost} flex-1 sm:flex-none`}>
                  <Share2 className="w-4 h-4" aria-hidden /> {busy === 'share' ? 'Préparation…' : 'Partager'}
                </button>
              )}
              <button type="button" onClick={() => void output('download')} disabled={!!busy} className={`${btnGhost} flex-1 sm:flex-none`}>
                <Download className="w-4 h-4" aria-hidden /> {busy === 'download' ? 'Génération…' : 'PDF'}
              </button>
              <button type="button" onClick={() => void output('print')} disabled={!!busy} className={`${btnPrimary} flex-1 sm:flex-none`}>
                <Printer className="w-4 h-4" aria-hidden /> {busy === 'print' ? 'Préparation…' : 'Imprimer'}
              </button>
            </div>
          )}
        </div>

        {confirmClose && (
          <div className="absolute inset-0 z-10 flex items-end sm:items-center justify-center sm:p-4" role="alertdialog" aria-modal="true" aria-labelledby="adr-abandon-title">
            <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmClose(false)} />
            <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-5">
              <h3 id="adr-abandon-title" className="text-base font-bold text-[#0A1628]">Abandonner cette lettre ?</h3>
              <p className="text-sm text-slate-600 mt-1.5">La lettre en cours n’est pas enregistrée.</p>
              <div className="mt-4 flex flex-col gap-2">
                <button type="button" autoFocus onClick={() => setConfirmClose(false)} className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#00A86B] hover:bg-[#006B47] transition-colors">Continuer la lettre</button>
                <button type="button" onClick={() => { if (doctorId) saveAdressageDraft(doctorId, patient.id, draft); onClose(); }} className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-[#0A1628] border border-slate-200 hover:bg-slate-50 transition-colors">Fermer et garder le brouillon</button>
                <button type="button" onClick={() => { if (doctorId) clearAdressageDraft(doctorId, patient.id); onClose(); }} className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-[#DC2626] border border-[#DC2626]/40 hover:bg-[#DC2626]/[0.06] transition-colors">Abandonner</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
