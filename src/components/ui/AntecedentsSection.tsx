import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ClipboardList, Plus, Search, AlertTriangle, CheckCircle2, ChevronDown, History,
  FileText, Archive, Pencil, Info, Leaf, Cigarette, Wine, Stethoscope, Scissors, Users, Baby, Heart,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { resolveDoctorNames, formatDateFrShort } from '../../lib/traitementsChroniques';
import {
  loadAntecedents, searchPathologiesCurees, findCureeByNom, deriveEnCours, formatPeriode, formatDetails,
  formatDepuis, isActiveMedicalNotInPathologies, cleanPathologiesDepuis, parseYear, currentYear,
  CATEGORIES, QUICK_CHIPS, CANCER_LOCALISATIONS, TABAC_STATUTS, ALCOOL_STATUTS, CANCER_STATUTS,
  type Antecedent, type AntecedentCategorie, type AntecedentDetails, type DetailsType, type QuickChip,
  type TabacStatut, type AlcoolStatut, type CancerStatut, type PathologiesDepuis,
} from '../../lib/antecedents';
import { Sheet, FormError } from './TraitementFondSection';

// Sprint 4 — Section « Antécédents » du profil patient + dates des pathologies actives.
//  • INFORMATION : ni les antécédents ni les dates ne sont lus par le moteur de sécurité.
//  • Garde-fou F : antécédent médical EN COURS absent de patients.pathologies → bandeau
//    « non analysé par le moteur » + bouton explicite « Ajouter aux pathologies chroniques ».
//  • Jamais de suppression : une erreur de saisie s'archive (motif + médecin tracés).
//  • L'ancien texte libre antecedents_chirurgicaux est affiché en lecture seule, JAMAIS parsé.
//  • Écriture réservée aux médecins (doctorId présent) ; RLS en garde-fou côté base.

export interface PatientPatch {
  pathologies?: string[] | null;
  pathologies_depuis?: PathologiesDepuis | null;
}

interface PatientLike {
  id: string;
  prenom: string;
  nom: string;
  pathologies?: string[] | null;
  pathologies_depuis?: PathologiesDepuis | null;
  antecedents_chirurgicaux?: string | null;
}

const inputCls =
  'w-full px-3.5 py-2.5 text-sm bg-[#FAFAF7] dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl text-slate-900 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00A86B]/40 focus:border-[#00A86B] dark:focus:border-[#00A86B]/50 transition-all';
const labelCls = 'block text-xs font-semibold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wide mb-1.5';

function segCls(active: boolean): string {
  return `px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
    active
      ? 'bg-[#00A86B] border-[#00A86B] text-white'
      : 'bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#94A3B8] hover:border-[#00A86B]/50'
  }`;
}

const CATEGORY_ICON: Record<AntecedentCategorie, React.ComponentType<{ className?: string }>> = {
  medical: Stethoscope,
  chirurgical: Scissors,
  toxique: Cigarette,
  gyneco_obstetrical: Baby,
  familial: Users,
};

function itemIcon(a: Antecedent): React.ComponentType<{ className?: string }> {
  if (a.details?.type === 'phyto') return Leaf;
  if (a.details?.type === 'alcool') return Wine;
  return CATEGORY_ICON[a.categorie];
}

// ─── Pathologies actives + « depuis » ────────────────────────────────────────

/**
 * Badges des pathologies chroniques (patients.pathologies, source du moteur — inchangée)
 * avec l'année de diagnostic facultative (patients.pathologies_depuis, affichage seul).
 */
export function PathologiesActivesBlock({ patient, canWrite, onPatientPatched }: {
  patient: PatientLike;
  canWrite: boolean;
  onPatientPatched?: (patientId: string, patch: PatientPatch) => void;
}) {
  const pathologies = (patient.pathologies ?? []).filter(Boolean);
  const depuis = patient.pathologies_depuis ?? {};
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (pathologies.length === 0) return null;

  const startEdit = () => {
    const d: Record<string, string> = {};
    for (const p of pathologies) d[p] = depuis[p] ? String(depuis[p]) : '';
    setDraft(d); setError(null); setEditing(true);
  };

  const save = async () => {
    const next: PathologiesDepuis = {};
    for (const p of pathologies) {
      const raw = (draft[p] ?? '').trim();
      if (!raw) continue;
      const y = parseYear(raw);
      if (y === null) { setError(`Année invalide pour « ${p} » (1900–${currentYear()}).`); return; }
      next[p] = y;
    }
    const cleaned = cleanPathologiesDepuis(pathologies, next);
    setSaving(true); setError(null);
    try {
      const { error: e } = await supabase.from('patients').update({ pathologies_depuis: cleaned }).eq('id', patient.id);
      if (e) throw e;
      onPatientPatched?.(patient.id, { pathologies_depuis: cleaned });
      setEditing(false);
    } catch (e: unknown) {
      console.error('[PathologiesDepuis] update error:', e);
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Pathologies chroniques <span className="text-slate-400 dark:text-[#475569]">· analysées par le moteur</span></p>
        {canWrite && !editing && (
          <button onClick={startEdit} className="text-[11px] font-semibold text-[#006B47] dark:text-[#00A86B] hover:underline flex items-center gap-1 flex-shrink-0">
            <Pencil className="w-3 h-3" /> Dates
          </button>
        )}
      </div>
      {!editing ? (
        <div className="flex flex-wrap gap-1.5">
          {pathologies.map(p => {
            const d = formatDepuis(depuis[p]);
            return (
              <span key={p} className="px-2.5 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 text-xs rounded-full font-medium border border-blue-200 dark:border-blue-500/30 break-words">
                {p}{d && <span className="font-normal text-blue-600/80 dark:text-blue-300/70"> · {d}</span>}
              </span>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {error && <FormError message={error} />}
          {pathologies.map(p => (
            <div key={p} className="flex items-center gap-2 min-w-0">
              <span className="flex-1 min-w-0 px-2.5 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 text-xs rounded-full font-medium border border-blue-200 dark:border-blue-500/30 truncate">{p}</span>
              <label className="text-[11px] text-slate-500 dark:text-[#94A3B8] flex-shrink-0">depuis</label>
              <input
                inputMode="numeric" maxLength={4} placeholder="année"
                value={draft[p] ?? ''}
                onChange={e => setDraft(prev => ({ ...prev, [p]: e.target.value.replace(/\D/g, '') }))}
                className="w-20 flex-shrink-0 px-2.5 py-1.5 text-sm bg-[#FAFAF7] dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-lg text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#00A86B]/40 focus:border-[#00A86B]"
                disabled={saving}
                aria-label={`Année de diagnostic — ${p}`}
              />
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={() => setEditing(false)} disabled={saving}
              className="px-3 py-1.5 border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#94A3B8] rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.05] disabled:opacity-40">
              Annuler
            </button>
            <button onClick={save} disabled={saving}
              className="px-3 py-1.5 bg-[#00A86B] hover:bg-[#006B47] disabled:opacity-60 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5">
              {saving ? 'Enregistrement…' : <><CheckCircle2 className="w-3.5 h-3.5" /> Enregistrer</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section Antécédents ─────────────────────────────────────────────────────

interface Props {
  patient: PatientLike;
  doctorId: string | null;
  orgId: string | null;
  onPatientPatched?: (patientId: string, patch: PatientPatch) => void;
}

type EnCoursChoice = 'oui' | 'non' | 'nsp';

export function AntecedentsSection({ patient, doctorId, orgId, onPatientPatched }: Props) {
  const canWrite = !!doctorId && !!orgId;
  const [items, setItems] = useState<Antecedent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [doctorNames, setDoctorNames] = useState<Map<string, string>>(new Map());

  // Éditeur (ajout / modification)
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categorie, setCategorie] = useState<AntecedentCategorie>('medical');
  const [detailsType, setDetailsType] = useState<DetailsType | null>(null);
  const [libelle, setLibelle] = useState('');
  const [curee, setCuree] = useState<{ id: string; nom_fr: string } | null>(null);
  const [cureeResults, setCureeResults] = useState<{ id: string; nom_fr: string }[]>([]);
  const [showCureeResults, setShowCureeResults] = useState(false);
  const [anneeDebut, setAnneeDebut] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [anneeFin, setAnneeFin] = useState('');
  const [enCours, setEnCours] = useState<EnCoursChoice>('nsp');
  const [notes, setNotes] = useState('');
  const [tabacStatut, setTabacStatut] = useState<TabacStatut | null>(null);
  const [paquetsAnnees, setPaquetsAnnees] = useState('');
  const [anneeSevrage, setAnneeSevrage] = useState('');
  const [alcoolStatut, setAlcoolStatut] = useState<AlcoolStatut | null>(null);
  const [consommation, setConsommation] = useState('');
  const [plantes, setPlantes] = useState('');
  const [cancerLoc, setCancerLoc] = useState<string | null>(null);
  const [cancerStatut, setCancerStatut] = useState<CancerStatut | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const searchSeq = useRef(0);
  const cureeSeq = useRef(0);

  // Archivage
  const [archiveTarget, setArchiveTarget] = useState<Antecedent | null>(null);
  const [archiveMotif, setArchiveMotif] = useState('Erreur de saisie');
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  // Garde-fou F
  const [addingPathoId, setAddingPathoId] = useState<string | null>(null);
  const [pathoError, setPathoError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const rows = await loadAntecedents(patient.id);
      setItems(rows);
      const archivers = rows.map(r => r.archive_par_doctor_id).filter((x): x is string => !!x);
      if (archivers.length > 0) setDoctorNames(await resolveDoctorNames(archivers));
    } catch (e) {
      console.error('[Antecedents] load error:', e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [patient.id]);

  useEffect(() => { reload(); }, [reload]);

  // Autocomplete référentiel (médical / familial / gynéco, hors types structurés)
  const libelleSearchable = !detailsType && categorie !== 'chirurgical' && categorie !== 'toxique';
  useEffect(() => {
    if (!editorOpen || !libelleSearchable || !showCureeResults) return;
    const q = libelle.trim();
    if (q.length < 2) { setCureeResults([]); return; }
    const seq = ++searchSeq.current;
    const t = window.setTimeout(async () => {
      const rows = await searchPathologiesCurees(q);
      if (seq !== searchSeq.current) return;
      setCureeResults(rows);
    }, 250);
    return () => window.clearTimeout(t);
  }, [libelle, editorOpen, libelleSearchable, showCureeResults]);

  const active = items.filter(i => !i.archive);
  const archived = items.filter(i => i.archive)
    .sort((a, b) => (b.archive_le ?? '').localeCompare(a.archive_le ?? ''));

  const resolveCuree = async (nom: string | null | undefined) => {
    const seq = ++cureeSeq.current;
    if (!nom) { setCuree(null); return; }
    const row = await findCureeByNom(nom);
    if (seq === cureeSeq.current) setCuree(row);
  };

  const resetEditor = () => {
    setEditingId(null); setCategorie('medical'); setDetailsType(null); setLibelle(''); setCuree(null);
    setCureeResults([]); setShowCureeResults(false);
    setAnneeDebut(''); setDateDebut(''); setAnneeFin(''); setEnCours('nsp'); setNotes('');
    setTabacStatut(null); setPaquetsAnnees(''); setAnneeSevrage('');
    setAlcoolStatut(null); setConsommation(''); setPlantes('');
    setCancerLoc(null); setCancerStatut(null);
    setFormError(null);
    cureeSeq.current++;
  };

  const openNew = (chip?: QuickChip) => {
    resetEditor();
    if (chip) {
      setCategorie(chip.categorie);
      setLibelle(chip.libelle);
      setDetailsType(chip.detailsType ?? null);
      if (chip.detailsType === 'phyto') setEnCours('oui');
      void resolveCuree(chip.cureeNom);
    }
    setEditorOpen(true);
  };

  const openEdit = (a: Antecedent) => {
    resetEditor();
    setEditingId(a.id);
    setCategorie(a.categorie);
    setLibelle(a.libelle);
    setCuree(a.pathologie ?? null);
    const d = a.details ?? {};
    setDetailsType(d.type ?? null);
    setAnneeDebut(a.date_debut_annee ? String(a.date_debut_annee) : '');
    setDateDebut(a.date_debut ?? '');
    setAnneeFin(a.date_fin_annee ? String(a.date_fin_annee) : '');
    setEnCours(a.en_cours === true ? 'oui' : a.en_cours === false ? 'non' : 'nsp');
    setNotes(a.notes ?? '');
    if (d.type === 'tabac') {
      setTabacStatut(d.statut ?? null);
      setPaquetsAnnees(typeof d.paquets_annees === 'number' ? String(d.paquets_annees) : '');
      setAnneeSevrage(d.annee_sevrage ? String(d.annee_sevrage) : '');
    } else if (d.type === 'alcool') {
      setAlcoolStatut(d.statut ?? null); setConsommation(d.consommation ?? '');
    } else if (d.type === 'phyto') {
      setPlantes(d.plantes ?? '');
    } else if (d.type === 'cancer') {
      setCancerLoc(d.localisation ?? null); setCancerStatut(d.statut ?? null);
    }
    setEditorOpen(true);
  };

  const pickCancerLoc = (label: string) => {
    const loc = CANCER_LOCALISATIONS.find(l => l.label === label);
    setCancerLoc(label);
    if (loc) {
      setLibelle(loc.libelle);
      void resolveCuree(loc.cureeNom);
    }
  };

  const buildDetails = (): AntecedentDetails => {
    switch (detailsType) {
      case 'tabac': {
        const pa = tabacStatut !== 'jamais' && paquetsAnnees.trim() ? Number(paquetsAnnees.replace(',', '.')) : null;
        return {
          type: 'tabac',
          ...(tabacStatut ? { statut: tabacStatut } : {}),
          paquets_annees: pa !== null && Number.isFinite(pa) ? pa : null,
          annee_sevrage: tabacStatut === 'sevre' ? parseYear(anneeSevrage) : null,
        };
      }
      case 'alcool':
        return { type: 'alcool', ...(alcoolStatut ? { statut: alcoolStatut } : {}), consommation: consommation.trim() || null };
      case 'phyto':
        return { type: 'phyto', plantes: plantes.trim() || null };
      case 'cancer':
        return { type: 'cancer', localisation: cancerLoc, ...(cancerStatut ? { statut: cancerStatut } : {}) };
      default:
        return {};
    }
  };

  const handleSave = async () => {
    if (!doctorId || !orgId) { setFormError('Profil médecin non chargé — rechargez la page.'); return; }
    const lib = libelle.trim();
    if (!lib) { setFormError('Indiquez le libellé de l’antécédent.'); return; }

    // Dates
    let debut: number | null = null;
    if (detailsType === 'tabac' && tabacStatut === 'jamais') {
      debut = null;
    } else if (dateDebut) {
      debut = parseYear(dateDebut.slice(0, 4));
      if (debut === null) { setFormError('Date de début invalide.'); return; }
    } else if (anneeDebut.trim()) {
      debut = parseYear(anneeDebut);
      if (debut === null) { setFormError(`Année de début invalide (1900–${currentYear()}).`); return; }
    }
    if (detailsType === 'tabac') {
      if (paquetsAnnees.trim()) {
        const pa = Number(paquetsAnnees.replace(',', '.'));
        if (!Number.isFinite(pa) || pa < 0 || pa > 300) { setFormError('Paquets-années invalide.'); return; }
      }
      if (tabacStatut === 'sevre' && anneeSevrage.trim() && parseYear(anneeSevrage) === null) {
        setFormError(`Année de sevrage invalide (1900–${currentYear()}).`); return;
      }
    }
    const details = buildDetails();
    const derived = deriveEnCours(details);
    const en_cours = derived ?? (enCours === 'oui' ? true : enCours === 'non' ? false : null);

    let fin: number | null = null;
    if (en_cours !== true) {
      if (details.type === 'tabac' && details.statut === 'sevre') fin = details.annee_sevrage ?? null;
      else if (anneeFin.trim()) {
        fin = parseYear(anneeFin);
        if (fin === null) { setFormError(`Année de fin invalide (1900–${currentYear()}).`); return; }
      }
    }
    if (debut !== null && fin !== null && fin < debut) { setFormError('L’année de fin précède l’année de début.'); return; }

    const payload = {
      categorie,
      libelle: lib,
      pathologie_curee_id: curee?.id ?? null,
      date_debut_annee: debut,
      date_debut: debut !== null && dateDebut ? dateDebut : null,
      date_fin_annee: fin,
      en_cours,
      details,
      notes: notes.trim() || null,
    };

    setFormError(null);
    setSaving(true);
    try {
      const { error } = editingId
        ? await supabase.from('antecedents').update(payload).eq('id', editingId)
        : await supabase.from('antecedents').insert({
            ...payload,
            patient_id: patient.id,
            org_id: orgId,
            doctor_id: doctorId, // doctors.id (PK), pas auth.uid()
          });
      if (error) throw error;
      setEditorOpen(false);
      await reload();
    } catch (e: unknown) {
      console.error('[Antecedents] save error:', e);
      setFormError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const openArchive = (a: Antecedent) => {
    setArchiveTarget(a); setArchiveMotif('Erreur de saisie'); setArchiveError(null);
  };

  const handleArchive = async () => {
    if (!archiveTarget || !doctorId) return;
    setArchiving(true);
    setArchiveError(null);
    try {
      const { error } = await supabase
        .from('antecedents')
        .update({ archive: true, archive_par_doctor_id: doctorId, archive_motif: archiveMotif.trim() || null })
        .eq('id', archiveTarget.id);
      if (error) throw error;
      setArchiveTarget(null);
      await reload();
    } catch (e: unknown) {
      console.error('[Antecedents] archive error:', e);
      setArchiveError(e instanceof Error ? e.message : "Erreur lors de l'archivage.");
    } finally {
      setArchiving(false);
    }
  };

  // Garde-fou F — ajout explicite aux pathologies chroniques (source du moteur).
  const addToPathologies = async (a: Antecedent) => {
    const nom = a.pathologie?.nom_fr;
    if (!nom) return;
    setAddingPathoId(a.id);
    setPathoError(null);
    try {
      // Relecture fraîche : ne jamais écraser une modification concurrente.
      const { data, error: readErr } = await supabase
        .from('patients').select('pathologies, pathologies_depuis').eq('id', patient.id).single();
      if (readErr) throw readErr;
      const current: string[] = (data?.pathologies as string[] | null) ?? [];
      const nextPathos = current.includes(nom) ? current : [...current, nom];
      const nextDepuis: PathologiesDepuis = { ...((data?.pathologies_depuis as PathologiesDepuis | null) ?? {}) };
      if (a.date_debut_annee && !nextDepuis[nom]) nextDepuis[nom] = a.date_debut_annee;
      const cleaned = cleanPathologiesDepuis(nextPathos, nextDepuis);
      const { error } = await supabase
        .from('patients').update({ pathologies: nextPathos, pathologies_depuis: cleaned }).eq('id', patient.id);
      if (error) throw error;
      onPatientPatched?.(patient.id, { pathologies: nextPathos, pathologies_depuis: cleaned });
    } catch (e: unknown) {
      console.error('[Antecedents] add pathology error:', e);
      setPathoError(e instanceof Error ? e.message : "Erreur lors de l'ajout aux pathologies.");
    } finally {
      setAddingPathoId(null);
    }
  };

  const legacy = patient.antecedents_chirurgicaux?.trim();
  const derivedEnCours = deriveEnCours(buildDetails());
  const showEnCoursControl = !detailsType || detailsType === 'phyto';
  const effectiveEnCours: boolean | null =
    derivedEnCours ?? (enCours === 'oui' ? true : enCours === 'non' ? false : null);

  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 lg:p-5 border border-slate-100 dark:border-white/[0.06]">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-[#0A1628] dark:text-[#E2E8F0] uppercase tracking-widest flex items-center gap-2">
            <ClipboardList className="w-3.5 h-3.5 text-[#00A86B]" /> Antécédents
            {!loading && active.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E6F4EE] text-[#006B47] normal-case tracking-normal">
                {active.length}
              </span>
            )}
          </h4>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 flex items-center gap-1">
            <Info className="w-3 h-3 flex-shrink-0" /> Information — non analysés par le moteur.
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => openNew()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#00A86B] hover:bg-[#006B47] active:bg-[#006B47] text-white rounded-xl text-xs font-semibold transition-colors shadow-sm shadow-[#00A86B]/20 flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        )}
      </div>

      {/* Saisie rapide */}
      {canWrite && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {QUICK_CHIPS.map(c => (
            <button
              key={c.key}
              onClick={() => openNew(c)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border border-dashed border-slate-300 dark:border-white/[0.15] text-slate-600 dark:text-[#CBD5E1] hover:border-[#00A86B] hover:text-[#006B47] hover:bg-[#E6F4EE] dark:hover:bg-[#00A86B]/10 dark:hover:text-[#00A86B] transition-colors"
            >
              <Plus className="w-3 h-3" /> {c.label}
            </button>
          ))}
        </div>
      )}

      {pathoError && <div className="mb-3"><FormError message={pathoError} /></div>}

      {/* Liste groupée */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-white/[0.04] animate-pulse" />)}
        </div>
      ) : loadError ? (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            Antécédents indisponibles (erreur de chargement).{' '}
            <button onClick={reload} className="font-semibold underline underline-offset-2">Réessayer</button>
          </span>
        </div>
      ) : active.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-[#475569] italic py-2">Aucun antécédent structuré enregistré.</p>
      ) : (
        <div className="space-y-4">
          {CATEGORIES.map(cat => {
            const rows = active.filter(a => a.categorie === cat.id);
            if (rows.length === 0) return null;
            return (
              <div key={cat.id}>
                <p className="text-[11px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wider mb-1.5">{cat.label}</p>
                <ul className="space-y-2">
                  {rows.map(a => {
                    const Icon = itemIcon(a);
                    const periode = formatPeriode(a);
                    const det = formatDetails(a.details ?? {});
                    const notAnalysed = isActiveMedicalNotInPathologies(a, patient.pathologies);
                    return (
                      <li key={a.id} className="px-3.5 py-3 rounded-xl bg-[#FAFAF7] dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#E6F4EE] dark:bg-[#00A86B]/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-[#00A86B]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0] break-words">{a.libelle}</span>
                              {a.en_cours === true && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-[#94A3B8]">En cours</span>
                              )}
                            </div>
                            {(periode || det) && (
                              <p className="text-xs text-slate-600 dark:text-[#CBD5E1] mt-0.5 break-words">
                                {[det, periode].filter(Boolean).join(' · ')}
                              </p>
                            )}
                            {a.details?.type === 'phyto' && (
                              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                                Aucune base d’interactions plantes–médicaments : interactions non vérifiées.
                              </p>
                            )}
                            {a.notes && <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5 whitespace-pre-wrap break-words">{a.notes}</p>}
                          </div>
                          {canWrite && (
                            <div className="flex flex-col sm:flex-row gap-1 flex-shrink-0">
                              <button
                                onClick={() => openEdit(a)} aria-label={`Modifier ${a.libelle}`}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#0A1628] dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openArchive(a)} aria-label={`Archiver ${a.libelle}`}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#0A1628] dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Garde-fou F */}
                        {notAnalysed && (
                          <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20">
                            <p className="flex-1 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                              <span>
                                Pathologie active non analysée par le moteur
                                {a.pathologie
                                  ? ' tant qu’elle ne figure pas dans les pathologies chroniques.'
                                  : ' : absente du référentiel du moteur, aucune contre-indication ne peut être recherchée.'}
                              </span>
                            </p>
                            {a.pathologie && canWrite && (
                              <button
                                onClick={() => addToPathologies(a)}
                                disabled={addingPathoId === a.id}
                                className="flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#0A1628] hover:bg-[#0A1628]/90 disabled:opacity-60 text-white rounded-lg text-xs font-semibold transition-colors"
                              >
                                {addingPathoId === a.id
                                  ? 'Ajout…'
                                  : <><Heart className="w-3.5 h-3.5" /> Ajouter aux pathologies chroniques</>}
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Archivés */}
      {!loading && archived.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowArchived(s => !s)}
            aria-expanded={showArchived}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-[#94A3B8] hover:text-[#0A1628] dark:hover:text-slate-200 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showArchived ? 'rotate-180' : ''}`} />
            <History className="w-3.5 h-3.5" />
            Antécédents archivés ({archived.length})
          </button>
          {showArchived && (
            <ul className="mt-2 space-y-1.5">
              {archived.map(a => (
                <li key={a.id} className="px-3.5 py-2.5 rounded-xl border border-dashed border-slate-200 dark:border-white/[0.08]">
                  <p className="text-sm text-slate-500 dark:text-[#94A3B8] line-through decoration-slate-300 break-words">{a.libelle}</p>
                  <p className="text-xs text-slate-400 dark:text-[#475569] mt-0.5 break-words">
                    Archivé{a.archive_le ? ` le ${formatDateFrShort(a.archive_le)}` : ''}
                    {a.archive_par_doctor_id && ` par ${doctorNames.get(a.archive_par_doctor_id) ?? 'un médecin de la structure'}`}
                    {a.archive_motif && ` · ${a.archive_motif}`}
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
            Notes antérieures — antécédents chirurgicaux (texte libre, non analysé)
          </p>
          <p className="text-sm text-slate-700 dark:text-[#CBD5E1] mt-1 whitespace-pre-wrap break-words">{legacy}</p>
        </div>
      )}

      {/* ── Ajout / modification ── */}
      <Sheet
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        busy={saving}
        icon={<ClipboardList className="w-4 h-4 text-[#00A86B]" />}
        title={editingId ? 'Modifier l’antécédent' : 'Ajouter un antécédent'}
        subtitle={`${patient.prenom} ${patient.nom}`}
        footer={
          <>
            <button
              onClick={() => setEditorOpen(false)} disabled={saving}
              className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#94A3B8] rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors disabled:opacity-40"
            >
              Annuler
            </button>
            <button
              onClick={handleSave} disabled={saving || !libelle.trim()}
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

        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] text-xs text-slate-600 dark:text-[#94A3B8]">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>Les antécédents sont une information : ils ne sont pas analysés par le moteur de sécurité.</span>
        </div>

        {/* Catégorie (fixée pour les types structurés) */}
        {!detailsType && (
          <div>
            <label className={labelCls}>Catégorie</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c.id} type="button" onClick={() => { setCategorie(c.id); if (c.id === 'chirurgical' || c.id === 'toxique') setCuree(null); }}
                  className={segCls(categorie === c.id)} disabled={saving}>
                  {c.short}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Libellé (fixe pour tabac / alcool / phytothérapie) */}
        {detailsType !== 'tabac' && detailsType !== 'alcool' && detailsType !== 'phyto' && (
          <div>
            <label className={labelCls}>Libellé</label>
            <div className="relative">
              {libelleSearchable && <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />}
              <input
                value={libelle}
                onChange={e => { setLibelle(e.target.value); setCuree(null); setShowCureeResults(true); }}
                onFocus={() => setShowCureeResults(true)}
                onBlur={() => window.setTimeout(() => setShowCureeResults(false), 200)}
                placeholder={categorie === 'chirurgical' ? 'Ex : Cholécystectomie, appendicectomie…' : 'Ex : Diabète, AVC, thrombose…'}
                className={`${inputCls} ${libelleSearchable ? 'pl-9' : ''}`}
                maxLength={200}
                disabled={saving}
              />
              {libelleSearchable && showCureeResults && cureeResults.length > 0 && !curee && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl shadow-lg max-h-56 overflow-y-auto">
                  {cureeResults.map(r => (
                    <button
                      key={r.id} type="button"
                      onMouseDown={e => { e.preventDefault(); setLibelle(r.nom_fr); setCuree(r); setShowCureeResults(false); }}
                      className="w-full px-4 py-2.5 text-left text-sm text-slate-800 dark:text-[#E2E8F0] hover:bg-[#E6F4EE] dark:hover:bg-[#00A86B]/[0.08] border-b border-slate-50 dark:border-white/[0.04] last:border-b-0"
                    >
                      {r.nom_fr}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {curee && (
              <p className="text-[11px] text-[#006B47] dark:text-[#00A86B] mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Relié au référentiel : {curee.nom_fr}
              </p>
            )}
          </div>
        )}

        {/* ── Détails : tabac ── */}
        {detailsType === 'tabac' && (
          <>
            <div>
              <label className={labelCls}>Statut</label>
              <div className="flex flex-wrap gap-1.5">
                {TABAC_STATUTS.map(s => (
                  <button key={s.id} type="button" onClick={() => setTabacStatut(s.id)} className={segCls(tabacStatut === s.id)} disabled={saving}>{s.label}</button>
                ))}
              </div>
            </div>
            {tabacStatut !== 'jamais' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Paquets-années</label>
                  <input inputMode="decimal" value={paquetsAnnees} onChange={e => setPaquetsAnnees(e.target.value.replace(/[^\d.,]/g, ''))}
                    placeholder="Ex : 20" className={inputCls} maxLength={5} disabled={saving} />
                </div>
                {tabacStatut === 'sevre' && (
                  <div>
                    <label className={labelCls}>Année de sevrage</label>
                    <input inputMode="numeric" value={anneeSevrage} onChange={e => setAnneeSevrage(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ex : 2020" className={inputCls} maxLength={4} disabled={saving} />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Détails : alcool ── */}
        {detailsType === 'alcool' && (
          <>
            <div>
              <label className={labelCls}>Statut</label>
              <div className="flex flex-wrap gap-1.5">
                {ALCOOL_STATUTS.map(s => (
                  <button key={s.id} type="button" onClick={() => setAlcoolStatut(s.id)} className={segCls(alcoolStatut === s.id)} disabled={saving}>{s.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Consommation</label>
              <input value={consommation} onChange={e => setConsommation(e.target.value)}
                placeholder="Ex : 2 verres/jour, week-end…" className={inputCls} maxLength={200} disabled={saving} />
            </div>
          </>
        )}

        {/* ── Détails : phytothérapie ── */}
        {detailsType === 'phyto' && (
          <>
            <div>
              <label className={labelCls}>Plantes</label>
              <textarea value={plantes} onChange={e => setPlantes(e.target.value)} rows={2} maxLength={500}
                placeholder="Ex : Nigelle, thym, armoise…" className={`${inputCls} resize-none`} disabled={saving} />
            </div>
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>Aucune base d’interactions plantes–médicaments : les interactions ne seront pas vérifiées.</span>
            </div>
          </>
        )}

        {/* ── Détails : cancer ── */}
        {detailsType === 'cancer' && (
          <>
            <div>
              <label className={labelCls}>Localisation</label>
              <div className="flex flex-wrap gap-1.5">
                {CANCER_LOCALISATIONS.map(l => (
                  <button key={l.label} type="button" onClick={() => pickCancerLoc(l.label)} className={segCls(cancerLoc === l.label)} disabled={saving}>{l.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Statut</label>
              <div className="flex flex-wrap gap-1.5">
                {CANCER_STATUTS.map(s => (
                  <button key={s.id} type="button" onClick={() => setCancerStatut(s.id)} className={segCls(cancerStatut === s.id)} disabled={saving}>{s.label}</button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Dates ── */}
        {!(detailsType === 'tabac' && tabacStatut === 'jamais') && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{detailsType === 'cancer' ? 'Année du diagnostic' : 'Année de début'}</label>
              <input inputMode="numeric" value={dateDebut ? dateDebut.slice(0, 4) : anneeDebut}
                onChange={e => { setDateDebut(''); setAnneeDebut(e.target.value.replace(/\D/g, '')); }}
                placeholder="Ex : 2019" className={inputCls} maxLength={4} disabled={saving} />
            </div>
            <div>
              <label className={labelCls}>Date précise</label>
              <input type="date" value={dateDebut} max={new Date().toISOString().slice(0, 10)}
                onChange={e => { setDateDebut(e.target.value); if (e.target.value) setAnneeDebut(e.target.value.slice(0, 4)); }}
                className={inputCls} disabled={saving} aria-label="Date précise (facultatif)" />
            </div>
          </div>
        )}

        {showEnCoursControl && (
          <div>
            <label className={labelCls}>En cours</label>
            <div className="flex flex-wrap gap-1.5">
              {([['oui', 'Oui'], ['non', 'Non (résolu)'], ['nsp', 'Non précisé']] as const).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setEnCours(id)} className={segCls(enCours === id)} disabled={saving}>{label}</button>
              ))}
            </div>
          </div>
        )}

        {showEnCoursControl && effectiveEnCours !== true && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Année de fin</label>
              <input inputMode="numeric" value={anneeFin} onChange={e => setAnneeFin(e.target.value.replace(/\D/g, ''))}
                placeholder="Facultatif" className={inputCls} maxLength={4} disabled={saving} />
            </div>
          </div>
        )}

        {categorie === 'medical' && effectiveEnCours === true && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>Une pathologie active n’est analysée par le moteur que si elle figure dans les pathologies chroniques.</span>
          </div>
        )}

        <div>
          <label className={labelCls}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={500}
            placeholder="Facultatif" className={`${inputCls} resize-none`} disabled={saving} />
        </div>
      </Sheet>

      {/* ── Archivage ── */}
      <Sheet
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        busy={archiving}
        icon={<Archive className="w-4 h-4 text-[#00A86B]" />}
        title="Archiver l’antécédent"
        subtitle={archiveTarget?.libelle ?? ''}
        footer={
          <>
            <button
              onClick={() => setArchiveTarget(null)} disabled={archiving}
              className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#94A3B8] rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors disabled:opacity-40"
            >
              Annuler
            </button>
            <button
              onClick={handleArchive} disabled={archiving}
              className="flex-1 px-4 py-2.5 bg-[#0A1628] hover:bg-[#0A1628]/90 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {archiving
                ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Archivage…</>
                : 'Confirmer l’archivage'}
            </button>
          </>
        }
      >
        <FormError message={archiveError} />
        <p className="text-sm text-slate-600 dark:text-[#CBD5E1]">
          L’antécédent sera retiré de la fiche et conservé dans l’historique. Il ne sera pas supprimé ni modifiable.
        </p>
        <div>
          <label className={labelCls}>Motif</label>
          <input value={archiveMotif} onChange={e => setArchiveMotif(e.target.value)} className={inputCls} maxLength={200} disabled={archiving} />
        </div>
      </Sheet>
    </div>
  );
}

// ─── Vérificateur : résumé compact ───────────────────────────────────────────

/**
 * Résumé des antécédents sous le patient, dans le Vérificateur. TOUT le bloc porte la
 * mention « non analysés par le moteur » (zéro fausse réassurance) ; la phytothérapie
 * a une mention renforcée (aucune base d'interactions plantes–médicaments).
 */
export function AntecedentsResume({ patientId, pathologies }: { patientId: string; pathologies?: string[] | null }) {
  const [items, setItems] = useState<Antecedent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    loadAntecedents(patientId, false)
      .then(rows => { if (!cancelled) setItems(rows); })
      .catch(e => { console.error('[AntecedentsResume] load error:', e); if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [patientId]);

  if (loading) return null;
  if (error) {
    return (
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>Antécédents indisponibles (erreur de chargement).</span>
      </div>
    );
  }
  // Tabac « jamais » : information non pertinente dans le résumé.
  const shown = items.filter(a => !(a.details?.type === 'tabac' && a.details.statut === 'jamais'));
  if (shown.length === 0) return null;

  const ordered = CATEGORIES.flatMap(c => shown.filter(a => a.categorie === c.id));
  const hasPhyto = shown.some(a => a.details?.type === 'phyto');
  const activeNotAnalysed = shown.filter(a => isActiveMedicalNotInPathologies(a, pathologies));

  return (
    <div className="bg-[#FAFAF7] rounded-xl p-3.5 border border-[#E5E5E0] space-y-2">
      <p className="text-[11px] font-bold text-[#0A1628] uppercase tracking-wider flex items-center gap-1.5">
        <ClipboardList className="w-3.5 h-3.5 text-slate-500" /> Antécédents
      </p>
      <p className="text-[11px] text-slate-500 flex items-start gap-1">
        <Info className="w-3 h-3 flex-shrink-0 mt-px" />
        <span>Information — non analysés par le moteur.</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {ordered.map(a => {
          const det = formatDetails(a.details ?? {});
          const periode = a.date_debut_annee ? (a.en_cours === true ? `depuis ${a.date_debut_annee}` : String(a.date_debut_annee)) : '';
          const extra = [det, periode].filter(Boolean).join(' · ');
          const phyto = a.details?.type === 'phyto';
          return (
            <span
              key={a.id}
              className={`px-2 py-0.5 text-xs rounded-full font-medium border break-words max-w-full ${
                phyto ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              {a.libelle}{extra && <span className="font-normal text-slate-500"> · {extra}</span>}
            </span>
          );
        })}
      </div>
      {hasPhyto && (
        <p className="text-[11px] text-amber-800 flex items-start gap-1">
          <Leaf className="w-3 h-3 flex-shrink-0 mt-px" />
          <span>Phytothérapie : aucune base d’interactions plantes–médicaments — interactions non vérifiées.</span>
        </p>
      )}
      {activeNotAnalysed.length > 0 && (
        <p className="text-[11px] text-amber-800 flex items-start gap-1">
          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-px" />
          <span>
            Pathologie active hors pathologies chroniques, non analysée : {activeNotAnalysed.map(a => a.libelle).join(', ')}.
          </span>
        </p>
      )}
    </div>
  );
}
