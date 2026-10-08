import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
  Search, Plus, X, AlertTriangle,
  CheckCircle2, Pill, UserPlus, FileText, Shield, Clock,
  Users, Trash2, CreditCard as Edit,
  Download, ArrowLeft, ChevronRight, ChevronDown, Info, RotateCcw, History,
} from 'lucide-react';
import { generateOrdonnancePdf } from '../lib/pdfService';
import { formatAge, getAgeEnMois } from '../lib/ageUtils';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Patient, Medicament } from '../lib/supabase';
import { PUBLIC_URL } from '../lib/config';
import { fetchAllRows } from '../lib/fetchAllRows';
import {
  saveDraft, loadDraft, clearDraft, getActiveDraftPatientId,
  evaluateDraftOffer, isDraftWorthOffering, draftSummary, draftLinesForSelection, formHasContent,
  type DraftForm, type OrdonnanceDraft,
} from '../lib/ordonnanceDraft';
import { SPECIALITES } from '../lib/specialites';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { PatientForm } from '../components/PatientForm';
import { PrescriptionFormModal, type UncheckedLine } from '../components/PrescriptionFormModal';
import {
  loadTraitements, fondMedId, fondDisplayName, type TraitementChronique,
} from '../lib/traitementsChroniques';
import { computeVerification, verificationBlockMessage } from '../lib/ordonnanceVerification';
import { notifyDataChanged, useDataSync } from '../lib/dataSync';
import { PrescriptionPreviewModal } from '../components/PrescriptionPreviewModal';
import { DerogationModal } from '../components/DerogationModal';
import { posologieBlockMessage } from '../lib/posologie';
import { searchMedicamentsMA } from '../lib/medSearch';
import { medLabel, dosageManquant, ligneLabel, dosageBlockMessage } from '../lib/medLabel';
import {
  evaluateAllergies, mergeAllergyAlerts, classifyAllergies,
  type AllergieFamilleRow, type RegleAllergie, type AllergyClassification, type PatientAllergy,
} from '../lib/allergyClassEngine';
import {
  evaluateDuplicates, mergeDuplicateAlerts, duplicateDescription,
  type DoublonClasseRow, type DoublonSubstanceRow, type RegleDoublon,
} from '../lib/duplicateEngine';
import {
  derogationAlerts, ordonnanceSignature, isConfirmationValid, buildDerogationEntries, alertLabel,
  type DerogationConfirmation,
} from '../lib/derogation';
import { MedicationHistoryModal } from '../components/MedicationHistoryModal';
import { PatientImportModal } from '../components/PatientImportModal';
import {
  MonthlyInteractionsChart, RiskDistributionChart,
  TopMedicationsSection, RecentActivityTimeline, AllMedicationsHistory,
} from '../components/DoctorAnalytics';
import { EmailVerificationBanner } from '../components/EmailVerificationBanner';
import { ErrorBoundary } from '../components/ErrorBoundary';

import { Sidebar, type ViewType } from '../components/ui/Sidebar';
import { useViewState } from '../hooks/useViewState';
import { MobileBottomNav } from '../components/ui/MobileBottomNav';
import { TopBar } from '../components/ui/TopBar';
import { AIChat } from '../components/ui/AIChat';
import { PatientAvatar } from '../components/ui/PatientAvatar';
import { EmptyState } from '../components/ui/EmptyState';
import { PageTransition } from '../components/ui/PageTransition';
import { DoctorHomeView, type HomeStats, type HomeAlert, type HomeRdv } from '../components/ui/DoctorHomeView';
import { ToastManager, type ToastItem } from '../components/ui/Toast';
import { PatientTabs } from '../components/ui/PatientTabs';
import { AntecedentsResume, type PatientPatch } from '../components/ui/AntecedentsSection';
import { loadAntecedents, type Antecedent } from '../lib/antecedents';
import {
  evaluateAntecedents, mergeWithExisting, classifyAntecedent,
  type RegleAntecedent, type RegleClasse, type RegleSeverite,
} from '../lib/antecedentEngine';
import { AgendaView } from '../components/ui/AgendaView';
import { EncyclopedieView } from '../components/ui/EncyclopedieView';
import { DocumentsView } from '../components/ui/DocumentsView';

// ─── Types ──────────────────────────────────────────────────────────────────

interface InteractionResult {
  // Sprint 2 — 'conditional' = « Sécuritaire sous réserve » : seules des CI conditionnelles
  // (grossesse / allaitement / procréation) ont été trouvées.
  severity: 'safe' | 'conditional' | 'attention' | 'dangerous';
  title?: string;
  description: string;
  alternatives: string[];
  reasons: string[];
  medications: any[];
  patientPrecautions: string[];
  // Sprint 4d — instantané du run d'analyse : cartes, verdict et bouton « Créer une
  // ordonnance » proviennent TOUJOURS du même run complet (jamais d'alerte pré-analyse).
  runId?: number;
  alerts?: InteractionAlert[];
  masked?: MaskedAlert[];
  nonVerifiables?: string[];
  ageUnknown?: boolean;
}

interface DbInteraction {
  id: string;
  dci_1_pattern: string;
  dci_2_pattern: string;
  // 'non_classee' = interaction connue mais sévérité clinique non documentée à la source.
  severite: 'contre_indication' | 'majeure' | 'moderee' | 'mineure' | 'non_classee';
  description: string;
}

interface DbContraindication {
  id: string;
  dci_pattern: string;
  condition_type: string;
  condition_valeur: string;
  severite: 'absolue' | 'relative';
  description: string;
  age_max_mois?: number | null;
  age_min_mois?: number | null;
  // Sprint 2 — 'F' = femme uniquement, 'M' = homme uniquement, NULL = tous.
  sexe_applicable?: 'F' | 'M' | null;
}

// Sprint 2 — CI « femme » relevant du bloc conditionnel « Grossesse, allaitement, procréation ».
// Testé sur condition_valeur normalisée (sans accents, minuscules).
const PREGNANCY_CTX_RE = /grossesse|allait|procreer|enceinte/;

interface InteractionAlert {
  type: 'drug_drug' | 'contraindication' | 'info';
  // Sprint #3.0.7 — Distinctions sémantiques :
  //   non_classee → interaction connue, sévérité non documentée (gris, non-anxiogène)
  //   info        → avertissement qualité de données (DCI manquante) — pas une interaction clinique
  // Sprint 4bc — canal antécédents : 'a_evaluer' (ambre, verdict ≥ Attention, jamais vert)
  //             et 'precaution' (ambre). Une CI absolue d'antécédent reste 'contre_indication'.
  severite: 'contre_indication' | 'a_evaluer' | 'majeure' | 'precaution' | 'moderee' | 'mineure' | 'non_classee' | 'info';
  description: string;
  involved: string[];
  // Volet 2 — condition_valeur exacte (libellé brut, non normalisé) pour les CI pathologie.
  // Affichée à côté de l'alerte pour que le médecin contextualise (ex: "HTA sévère non
  // contrôlée (PA > 180/110 mmHg)" plutôt que juste "Hypertension").
  condition?: string;
  // Sprint 2 — CI grossesse/allaitement/procréation chez une patiente :
  //   pregnancyContext → affichée dans le bloc conditionnel replié (déclenchée sur le médicament seul)
  //   pregnancyFirm    → « Grossesse »/« Allaitement » dans les pathologies : alerte ferme, dépliée
  pregnancyContext?: boolean;
  pregnancyFirm?: boolean;
  // Sprint 3 — provenance des médicaments impliqués :
  //   nouveau → uniquement des médicaments de la prescription en cours
  //   mixte   → nouveau × traitement de fond (badge « avec traitement de fond »)
  //   fond    → traitement de fond seul (fond × fond, fond × patient) : alerte préexistante
  // Absent = 'nouveau' (rétrocompatibilité).
  origin?: 'nouveau' | 'mixte' | 'fond';
  // Sprint 4bc — alerte produite par le canal antécédents (src/lib/antecedentEngine.ts).
  channel?: 'antecedent' | 'allergie' | 'doublon';
  // Sprint 4bc — source de la règle (affichée dans les détails).
  ruleSource?: string;
  // Sprint 4bc — antécédents absorbés par cette CI existante (« Également : antécédent de … »).
  also?: string[];
}

// Sprint 4bc — sévérité d'une règle d'antécédent → sévérité d'alerte.
const ANTECEDENT_SEVERITE: Record<RegleSeverite, InteractionAlert['severite']> = {
  absolue: 'contre_indication',
  a_evaluer: 'a_evaluer',
  precaution: 'precaution',
};

// Sprint 3 — Médicament transmis au moteur (prescription en cours ou traitement de fond).
// `nom` reste l'identité transmise au moteur (inchangée). `label` = libellé affiché et porté
// sur l'ordonnance : marque + dosage + forme (Sprint 4d-quater).
type CheckerMed = {
  id: string; nom: string; dci?: string | null; dci_canonique?: string | null; manual?: boolean;
  formeHint?: string | null; label?: string | null; dosageManquant?: boolean;
};
const displayNom = (m: { nom: string; label?: string | null }) => m.label || m.nom;

// Sprint 4d-bis — résultat de recherche hors Maroc (RPC search_medicaments_hors_maroc) :
// `mappe` = au moins un ingrédient en base (sinon non vérifiable par le moteur).
type ForeignMed = Medicament & { mappe?: boolean | null };

// Sprint 2 — Alerte non applicable au patient (sexe, âge de procréation), masquée mais
// consultable via « Afficher ». Jamais journalisée.
interface MaskedAlert {
  alert: InteractionAlert;
  reason: string;
}

// Volet 2 — Racines médicales génériques mono-mot, partagées entre maladies cliniquement
// DISTINCTES (ex: "hypertension" ∈ artérielle ET pulmonaire ; "insuffisance" ∈ rénale,
// cardiaque, hépatique…). Exclues du matching word-boundary des SYNONYMES pour éviter les
// faux positifs inter-organes (un patient HTA artérielle ne doit pas déclencher une CI
// d'hypertension pulmonaire néonatale). Valeurs déjà normalisées (sans accents, minuscules).
// NE concerne PAS : les abréviations (hta, irc, avc…), les synonymes multi-mots
// ("arterial hypertension"), ni le nom de la pathologie (qui garde sa logique substring).
const GENERIC_SYNONYM_STOPLIST = new Set<string>([
  'hypertension', 'hypotension', 'tension',
  'insuffisance', 'deficit',
  'cancer', 'carcinome', 'tumeur', 'neoplasie',
  'infection', 'inflammation',
  'syndrome', 'maladie', 'trouble', 'troubles',
]);

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeDrugName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


function getSeveriteLabel(s: InteractionAlert['severite']) {
  if (s === 'contre_indication') return '🔴 CONTRE-INDICATION';
  if (s === 'a_evaluer')         return '🟠 À ÉVALUER';
  if (s === 'majeure')           return '🟠 INTERACTION MAJEURE';
  if (s === 'precaution')        return '🟡 PRÉCAUTION';
  if (s === 'moderee')           return '🔵 INTERACTION MODÉRÉE';
  if (s === 'mineure')           return '🟡 INTERACTION MINEURE';
  if (s === 'non_classee')       return 'ℹ️ SÉVÉRITÉ NON DOCUMENTÉE';
  return 'ℹ️ DONNÉES LIMITÉES'; // 'info'
}

/**
 * Sprint #3.0.8 — Fusion intelligente de 2 descriptions pour la même paire+sévérité.
 *
 * Contexte : la table drug_interactions contient ~19 000 lignes dupliquées (sources FR + ANG
 * importées en parallèle). Pour la même paire de molécules à la même sévérité, on peut avoir
 * 2 descriptions distinctes (ex: l'une dit "surveiller INR", l'autre ne le dit pas).
 *
 * Algorithme :
 *   1. Tokenize les 2 descriptions (lowercase, sans accents, mots ≥ 3 lettres).
 *   2. Si ≥ 70% des mots de la plus courte sont dans la plus longue → variantes proches :
 *      on garde la version FRANÇAISE (compteur d'accents), à défaut la plus longue.
 *   3. Sinon → fusion : "{descA}. — {descB}" en évitant les ponctuations doublées.
 *
 * Seuil 70% choisi empiriquement : permet de regrouper les traductions paraphrasées
 * (qui partagent les molécules + termes techniques) sans fusionner des notes cliniques
 * vraiment distinctes.
 */
function mergeDescriptions(a: string, b: string): string {
  if (!a) return b;
  if (!b) return a;
  if (a.trim() === b.trim()) return a;

  const tokenize = (s: string) => new Set(
    s.normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3)
  );
  const tokA = tokenize(a);
  const tokB = tokenize(b);
  const inter = [...tokA].filter(t => tokB.has(t)).length;
  const minSize = Math.min(tokA.size, tokB.size);
  const overlap = minSize > 0 ? inter / minSize : 0;

  if (overlap >= 0.7) {
    // Variantes proches : préférer la version française (plus d'accents),
    // à égalité d'accents, prendre la plus longue.
    const countAccents = (s: string) => (s.match(/[éèêëàâäîïôùûüçœ]/gi) || []).length;
    const aFr = countAccents(a);
    const bFr = countAccents(b);
    if (aFr !== bFr) return aFr > bFr ? a : b;
    return a.length >= b.length ? a : b;
  }

  // Descriptions cliniquement distinctes : fusion en évitant la ponctuation doublée.
  const cleanA = a.trim().replace(/[.\s]+$/, '');
  return `${cleanA}. — ${b.trim()}`;
}

// ─── Sub-views ──────────────────────────────────────────────────────────────

// ─── PatientsView ────────────────────────────────────────────────────────────

interface PatientsViewProps {
  patients: Patient[];
  selectedPatient: Patient | null;
  setSelectedPatient: (p: Patient | null) => void;
  onAddPatient: () => void;
  onImportPatients: () => void;
  onEditPatient: (p: Patient) => void;
  onDeletePatient: (id: string) => void;
  onNavigateToChecker: () => void;
  patientOrdonnances: any[];
  patientOrdLoading?: boolean;
  loadPatientOrdonnances: (id: string) => Promise<void>;
  showMedicationHistory: boolean;
  setShowMedicationHistory: (v: boolean) => void;
  resetAnalysis: () => void;
  // Passés pour l'onglet Consultations (RLS INSERT exige doctors.id, pas auth.uid)
  doctorId?: string | null;
  orgId?: string | null;
  // Ouverture directe d'une fiche (depuis l'accueil). Introuvable → liste, sans erreur.
  initialPatientId?: string | null;
  onInitialPatientHandled?: () => void;
  onTraitementsChanged?: (patientId: string) => void;
  onPatientPatched?: (patientId: string, patch: PatientPatch) => void;
}

function PatientsView({
  patients, selectedPatient, setSelectedPatient,
  onAddPatient, onImportPatients, onEditPatient, onDeletePatient, onNavigateToChecker,
  patientOrdonnances, patientOrdLoading = false, loadPatientOrdonnances,
  showMedicationHistory, setShowMedicationHistory, resetAnalysis,
  doctorId, orgId, initialPatientId, onInitialPatientHandled, onTraitementsChanged, onPatientPatched,
}: PatientsViewProps) {
  const [search, setSearch] = useState('');
  // 'all' = tous · 'recent' = ajoutés <30j
  const [activeChip, setActiveChip] = useState<string>('all');
  // Modale de confirmation de suppression
  const [confirmDelete, setConfirmDelete] = useState<Patient | null>(null);

  // Filtrage cumulatif : recherche texte (nom ET date de naissance JJ/MM/AAAA) ET chip actif
  const RECENT_CUTOFF = useMemo(() => Date.now() - 30 * 86_400_000, []);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients.filter(p => {
      if (q.length > 0) {
        const nameMatch = `${p.prenom} ${p.nom}`.toLowerCase().includes(q);
        const dobFormatted = p.date_naissance
          ? new Date(p.date_naissance).toLocaleDateString('fr-FR')
          : '';
        const dobMatch = dobFormatted.includes(q);
        if (!nameMatch && !dobMatch) return false;
      }
      if (activeChip === 'all') return true;
      if (activeChip === 'recent') {
        return Boolean(p.created_at && new Date(p.created_at).getTime() > RECENT_CUTOFF);
      }
      return true;
    });
  }, [patients, search, activeChip, RECENT_CUTOFF]);

  const selectPatient = (p: Patient) => {
    setSelectedPatient(p);
    resetAnalysis();
    loadPatientOrdonnances(p.id);
  };

  useEffect(() => {
    if (!initialPatientId) return;
    const p = patients.find(x => x.id === initialPatientId);
    if (p) selectPatient(p);
    else setSelectedPatient(null);
    onInitialPatientHandled?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPatientId]);

  return (
    <PageTransition className="flex h-full">
      {/* ── LEFT pane : liste — pleine largeur mobile, 320px desktop. ──────
          Sur mobile, masquée quand un patient est sélectionné (la fiche
          détail prend tout l'écran via l'overlay du RIGHT pane). */}
      <div
        className={`w-full lg:w-[320px] lg:min-w-[320px] border-r border-slate-200 dark:border-white/[0.06] flex-col bg-white dark:bg-[#111827] h-full ${
          selectedPatient ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-white/[0.06] flex-shrink-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-[#E2E8F0]">Patients</h2>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                {patients.length} fiche{patients.length > 1 ? 's' : ''} au total · {filtered.length} affichée{filtered.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={onImportPatients}
                title="Importer des patients depuis Excel"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-[#1E293B] border border-[#E5E5E0] dark:border-white/[0.1] text-[#475569] dark:text-[#94A3B8] rounded-xl text-xs font-semibold hover:border-[#00A86B] hover:text-[#00A86B] transition-colors"
              >
                <Download className="w-3.5 h-3.5 rotate-180" />
                Importer
              </button>
              {/* "Nouveau" → caché sur mobile, remplacé par le bouton "+" flottant */}
              <button
                onClick={onAddPatient}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-[#00A86B] text-white rounded-xl text-xs font-semibold hover:bg-[#006B47] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Nouveau
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nom, prénom ou date de naissance (JJ/MM/AAAA)…"
              className="w-full pl-9 pr-3 py-2.5 lg:py-2 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm text-slate-900 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 dark:focus:ring-[#00A86B]/40 focus:border-[#00A86B] dark:focus:border-[#00A86B]/40"
            />
          </div>

          {/* Filtres chips : Tous / Récents */}
          <div className="-mx-4 mt-3 px-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            <div className="flex items-center gap-1.5 pb-0.5">
              <FilterChip
                active={activeChip === 'all'}
                onClick={() => setActiveChip('all')}
                label={`Tous · ${patients.length}`}
              />
              <FilterChip
                active={activeChip === 'recent'}
                onClick={() => setActiveChip('recent')}
                label="Récents"
              />
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <EmptyState
              title={search || activeChip !== 'all' ? 'Aucun patient ne correspond' : 'Aucun patient'}
              icon={Users}
              action={
                <button onClick={onAddPatient} className="px-4 py-2 bg-[#00A86B] text-white rounded-xl text-sm font-semibold hover:bg-[#006B47] transition-colors">
                  + Ajouter
                </button>
              }
            />
          )}

          {filtered.map(p => {
            const isSelected = selectedPatient?.id === p.id;
            const age = formatAge(p.date_naissance);
            const sexeLabel = p.sexe === 'M' ? 'H' : p.sexe === 'F' ? 'F' : null;
            const meta = [age, sexeLabel].filter(Boolean).join(' · ');
            const pathosToShow = (p.pathologies ?? []).filter(x => x && x !== 'Aucune pathologie renseignée').slice(0, 2);
            const extraPathos = Math.max(0, (p.pathologies?.length ?? 0) - pathosToShow.length);
            return (
              <div
                key={p.id}
                onClick={() => selectPatient(p)}
                className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-all border-l-[3px] group active:bg-slate-100 dark:active:bg-white/[0.06] ${
                  isSelected
                    ? 'bg-[#E6F4EE] dark:bg-[#00A86B]/[0.1] border-l-[#00A86B]'
                    : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:border-l-slate-200 dark:hover:border-l-white/[0.1]'
                }`}
              >
                <PatientAvatar name={`${p.prenom} ${p.nom}`} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-[#006B47] dark:text-[#00A86B]' : 'text-slate-900 dark:text-[#E2E8F0]'}`}>
                      {p.prenom} {p.nom}
                    </p>
                    {meta && (
                      <span className="text-[11px] text-slate-400 dark:text-[#475569] flex-shrink-0">{meta}</span>
                    )}
                  </div>
                  {pathosToShow.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      {pathosToShow.map(path => (
                        <span
                          key={path}
                          className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-[#94A3B8] text-[10px] font-medium rounded-md truncate max-w-[140px]"
                        >
                          {path}
                        </span>
                      ))}
                      {extraPathos > 0 && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-600">+{extraPathos}</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-[#475569] italic mt-0.5">Aucune pathologie</p>
                  )}
                </div>
                {/* Actions desktop (Edit/Delete) — masquées sur mobile (au profit du chevron) */}
                <div className="hidden lg:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); onEditPatient(p); }}
                    className="p-1.5 text-slate-400 hover:text-[#00A86B] hover:bg-[#E6F4EE] rounded-lg transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDelete(p); }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Chevron — visible mobile uniquement */}
                <ChevronRight className="lg:hidden w-4 h-4 text-slate-300 dark:text-slate-700 mt-1 flex-shrink-0" />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT pane : détail patient ─────────────────────────────────
          Mobile + patient sélectionné  → fullscreen overlay (fixed inset-0 z-40)
                                          avec barre back en haut
          Mobile + pas de sélection     → caché
          Desktop                       → split flex-1 normal (inchangé) */}
      <div
        className={`bg-[#F8FAFC] dark:bg-[#0A0F1E] flex-col overflow-hidden
          ${selectedPatient
            ? 'fixed inset-0 z-40 flex lg:relative lg:z-auto lg:flex-1 animate-in slide-in-from-right duration-200 lg:animate-none'
            : 'hidden lg:flex lg:flex-1'}`}
      >
        {!selectedPatient ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-20 h-20 bg-slate-100 dark:bg-white/[0.05] rounded-3xl flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-700" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-[#94A3B8]">Sélectionnez un patient</h3>
            <p className="text-slate-400 dark:text-[#475569] text-sm mt-1 max-w-xs">
              Cliquez sur un patient dans la liste de gauche pour voir sa fiche détaillée
            </p>
          </div>
        ) : (
          <>
            {/* Barre back mobile — invisible sur desktop */}
            <div className="lg:hidden flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-white/[0.06] flex-shrink-0">
              <button
                onClick={() => setSelectedPatient(null)}
                className="p-2 -ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] active:bg-slate-200 transition-colors"
                aria-label="Retour à la liste"
              >
                <ArrowLeft className="w-5 h-5 text-[#0A1628] dark:text-[#E2E8F0]" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#0A1628] dark:text-[#E2E8F0] truncate">
                  Dr. {selectedPatient.prenom} {selectedPatient.nom}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] truncate">
                  Fiche patient
                </p>
              </div>
            </div>
            <PatientTabs
              patient={selectedPatient}
              ordonnances={patientOrdonnances}
              ordonnancesLoading={patientOrdLoading}
              onEdit={() => onEditPatient(selectedPatient)}
              onNavigateToChecker={onNavigateToChecker}
              doctorId={doctorId ?? null}
              orgId={orgId ?? null}
              onTraitementsChanged={onTraitementsChanged}
              onPatientPatched={onPatientPatched}
            />
          </>
        )}
      </div>

      {/* Sprint M2 — Bouton "+" flottant (mobile uniquement), au-dessus de la bottom nav.
          Caché quand la fiche détail est ouverte pour ne pas chevaucher la barre back. */}
      {!selectedPatient && (
        <button
          onClick={onAddPatient}
          aria-label="Nouveau patient"
          className="fixed bottom-24 right-4 z-40 w-14 h-14 bg-[#00A86B] hover:bg-[#006B47] text-white rounded-full shadow-lg shadow-[#00A86B]/30 flex lg:hidden items-center justify-center transition-transform active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Modale confirmation suppression patient */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-white/[0.08]">
            <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-[#DC2626]" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-[#E2E8F0] text-center mb-2">
              Supprimer {confirmDelete.prenom} {confirmDelete.nom} ?
            </h3>
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] text-center mb-6">
              Toutes ses données — ordonnances, consultations, rendez-vous — seront définitivement supprimées. Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#94A3B8] rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => { onDeletePatient(confirmDelete.id); setConfirmDelete(null); }}
                className="flex-1 px-4 py-2.5 bg-[#DC2626] hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}

// ─── M2 — Filter chip réutilisable ───────────────────────────────────────────
function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 active:scale-95 ${
        active
          ? 'bg-[#00A86B] text-white shadow-sm shadow-[#00A86B]/20'
          : 'bg-slate-100 dark:bg-white/[0.05] text-[#475569] dark:text-[#94A3B8] hover:bg-slate-200 dark:hover:bg-white/[0.08]'
      }`}
    >
      {label}
    </button>
  );
}

// ─── Vérificateur : composants d'affichage des alertes (Sprint 3) ────────────

const SEVER_ORDER = {
  contre_indication: 0, a_evaluer: 1, majeure: 2, precaution: 3, moderee: 4, mineure: 5, non_classee: 6, info: 7,
} as const;
type SeveriteKey = InteractionAlert['severite'];

/**
 * Déduplication écran des alertes cliniques (hors 'info') — source unique partagée entre
 * l'affichage (CheckerView) et le verdict (checkInteractions) pour que les compteurs
 * affichés correspondent exactement aux cartes.
 */
function dedupClinicalAlerts(alerts: InteractionAlert[]): InteractionAlert[] {
  const dedupMap = new Map<string, InteractionAlert>();
  for (const alert of alerts) {
    if (alert.severite === 'info') continue;
    const key = alert.type === 'contraindication'
      ? `ci|${alert.involved[0]}|${alert.condition ?? ''}`
      : `dd|${[...alert.involved].sort().join('|')}`;
    const prev = dedupMap.get(key);
    if (!prev || SEVER_ORDER[alert.severite] < SEVER_ORDER[prev.severite]) {
      dedupMap.set(key, alert);
    }
  }
  return [...dedupMap.values()].sort((a, b) => SEVER_ORDER[a.severite] - SEVER_ORDER[b.severite]);
}

function SeverityBadge({ s }: { s: SeveriteKey }) {
  const cfg: Record<SeveriteKey, { label: string; cls: string }> = {
    contre_indication: { label: 'Contre-indication',  cls: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30' },
    a_evaluer:         { label: 'À évaluer',          cls: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/40' },
    precaution:        { label: 'Précaution',         cls: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30' },
    majeure:           { label: 'Interaction majeure', cls: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30' },
    moderee:           { label: 'Interaction modérée', cls: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30' },
    mineure:           { label: 'Interaction mineure', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30' },
    non_classee:       { label: 'Non documentée',      cls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/[0.06] dark:text-[#94A3B8] dark:border-white/[0.08]' },
    info:              { label: 'Données limitées',    cls: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/[0.06] dark:text-[#94A3B8] dark:border-white/[0.08]' },
  };
  const { label, cls } = cfg[s];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

function AlertCard({ alert, defaultOpen = false }: { alert: InteractionAlert; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const desc = alert.description ?? '';

  // Extraction "Conduite à tenir" si présente dans la description
  const catMatch = desc.match(/conduite\s+à\s+tenir\s*[:\-]\s*/i);
  const catIdx = catMatch ? desc.indexOf(catMatch[0]) : -1;
  const shortDesc = catIdx > 0 ? desc.slice(0, catIdx).trim() : desc;
  const conduct   = catIdx > 0 ? desc.slice(catIdx + (catMatch?.[0].length ?? 0)).trim() : null;

  const borderCls: Record<SeveriteKey, string> = {
    contre_indication: 'border-l-[#DC2626]',
    a_evaluer:         'border-l-amber-500',
    majeure:           'border-l-orange-500',
    precaution:        'border-l-amber-400',
    moderee:           'border-l-amber-400',
    mineure:           'border-l-yellow-400',
    non_classee:       'border-l-slate-300 dark:border-l-slate-600',
    info:              'border-l-slate-200 dark:border-l-slate-700',
  };

  const pairLabel = alert.type === 'contraindication'
    ? `${alert.involved[0]}${alert.condition ? ` — ${alert.condition}` : ''}`
    : alert.involved.join(' × ');

  return (
    <div className={`bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] border-l-4 ${borderCls[alert.severite]} rounded-xl overflow-hidden`}>
      <div className="px-4 py-3">
        {/* Ligne 1 : badge + paire */}
        <div className="flex items-start gap-2 mb-1.5 flex-wrap">
          <SeverityBadge s={alert.severite} />
          <span className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] leading-tight">{pairLabel}</span>
          {alert.channel === 'doublon' && (
            <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wide text-[#0A1628] dark:text-slate-200 bg-[#0A1628]/[0.06] dark:bg-white/[0.08] border border-[#0A1628]/15 dark:border-white/15 rounded px-1.5 py-0.5">
              Doublon thérapeutique
            </span>
          )}
          {alert.origin === 'mixte' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#0A1628] dark:text-slate-200 bg-[#0A1628]/[0.06] dark:bg-white/[0.08] border border-[#0A1628]/15 dark:border-white/15 rounded px-1.5 py-0.5">
              <Pill className="w-3 h-3" aria-hidden /> avec traitement de fond
            </span>
          )}
        </div>
        {/* Ligne 2 : risque (description courte) */}
        <p className="text-sm text-slate-600 dark:text-[#94A3B8] leading-snug line-clamp-2">{shortDesc}</p>
        {/* Sprint 4bc — antécédents absorbés par cette CI (même thème, sévérité ≥) */}
        {alert.also && alert.also.length > 0 && (
          <p className="mt-1 text-xs font-medium text-slate-700 dark:text-[#CBD5E1]">Également : {alert.also.join(' ; ')}</p>
        )}
        {/* Ligne 3 : conduite à tenir (si extractible depuis la description) */}
        {conduct && (
          <p className="mt-1 text-sm text-slate-700 dark:text-[#CBD5E1]">
            <span className="font-semibold text-[#0A1628] dark:text-slate-300">→ </span>{conduct}
          </p>
        )}
        {/* Bouton Détails — accordéon */}
        <button
          onClick={() => setOpen(o => !o)}
          className="mt-2 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          aria-expanded={open}
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
          {open ? 'Masquer' : 'Détails'}
        </button>
        {/* Volet détails */}
        {open && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06] text-xs text-slate-600 dark:text-[#94A3B8] space-y-1.5">
            {alert.type === 'contraindication' && alert.condition && (
              <p><span className="font-semibold text-slate-700 dark:text-slate-300">Condition patient :</span> {alert.condition}</p>
            )}
            <p className="whitespace-pre-wrap leading-relaxed">{desc}</p>
            {alert.ruleSource && <p className="text-[11px] text-slate-400 dark:text-[#64748B]">Source : {alert.ruleSource}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// Sprint 2 — Bloc conditionnel « Grossesse, allaitement, procréation » (patiente).
// Replié par défaut ; fermé, il affiche la sévérité maximale et le nombre de CI.
function PregnancyContextBlock({ alerts }: { alerts: InteractionAlert[] }) {
  const [open, setOpen] = useState(false);
  const maxSev = alerts.reduce<SeveriteKey>(
    (max, a) => (SEVER_ORDER[a.severite] < SEVER_ORDER[max] ? a.severite : max),
    alerts[0].severite,
  );
  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors flex-wrap"
      >
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        <span className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">
          Si grossesse, allaitement ou projet de grossesse
        </span>
        <span className="text-xs text-slate-500 dark:text-[#94A3B8]">
          {alerts.length} contre-indication{alerts.length > 1 ? 's' : ''}
        </span>
        <span className="ml-auto"><SeverityBadge s={maxSev} /></span>
      </button>
      {open && (
        <div className="px-3 pb-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {alerts.map((alert, idx) => <AlertCard key={idx} alert={alert} />)}
        </div>
      )}
    </div>
  );
}

// Sprint 3 — Alertes préexistantes : impliquent uniquement le traitement de fond (fond × fond,
// fond × pathologie). Repliées par défaut mais JAMAIS masquées : l'en-tête reste visible avec
// le nombre et la sévérité maximale.
function PreexistingAlertsBlock({ alerts }: { alerts: InteractionAlert[] }) {
  const [open, setOpen] = useState(false);
  const maxSev = alerts.reduce<SeveriteKey>(
    (max, a) => (SEVER_ORDER[a.severite] < SEVER_ORDER[max] ? a.severite : max),
    alerts[0].severite,
  );
  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors flex-wrap"
      >
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        <History className="w-4 h-4 text-[#0A1628] dark:text-slate-300 flex-shrink-0" aria-hidden />
        <span className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">
          Alertes préexistantes ({alerts.length})
        </span>
        <span className="text-xs text-slate-500 dark:text-[#94A3B8]">
          dans le traitement de fond, hors prescription en cours
        </span>
        <span className="ml-auto"><SeverityBadge s={maxSev} /></span>
      </button>
      {open && (
        <div className="px-3 pb-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {alerts.map((alert, idx) => <AlertCard key={idx} alert={alert} />)}
        </div>
      )}
    </div>
  );
}

// Sprint 3 — Panneau « Traitement de fond (N) » du Vérificateur.
function FondPanel({
  patient, traitements, loading, error, excluded, selectedMedIds, onToggle, onRenew, onRetry,
}: {
  patient: Patient;
  traitements: TraitementChronique[];
  loading: boolean;
  error: boolean;
  excluded: Set<string>;
  selectedMedIds: Set<string>;
  onToggle: (id: string) => void;
  onRenew: (t: TraitementChronique) => void;
  onRetry: () => void;
}) {
  const legacy = patient.traitements_en_cours?.trim();
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-[#FAFAF7] dark:bg-white/[0.02] p-3.5">
      <p className="text-xs font-bold text-[#0A1628] dark:text-[#E2E8F0] uppercase tracking-widest flex items-center gap-2 mb-2">
        <Pill className="w-3.5 h-3.5 text-[#00A86B]" aria-hidden />
        Traitement de fond{!(loading && traitements.length === 0) && !(error && traitements.length === 0) ? ` (${traitements.length})` : ''}
      </p>

      {error && (
        <p className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-300 mb-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            Traitement de fond non chargé — analyse incomplète.{' '}
            <button onClick={onRetry} className="font-semibold underline underline-offset-2">Réessayer</button>
          </span>
        </p>
      )}
      {loading && traitements.length === 0 ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-11 rounded-lg bg-slate-100 dark:bg-white/[0.04] animate-pulse" />)}
        </div>
      ) : error && traitements.length === 0 ? null
      : traitements.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-[#94A3B8] italic">
          Aucun traitement de fond structuré. Ajoutez-le depuis le profil patient (onglet Résumé).
        </p>
      ) : (
        <ul className="space-y-1.5">
          {traitements.map(t => {
            const medId = fondMedId(t);
            const renewed = selectedMedIds.has(medId);
            const included = !excluded.has(t.id);
            return (
              <li key={t.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-100 dark:border-white/[0.06]">
                <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer" title="Inclure dans l'analyse">
                  <input
                    type="checkbox"
                    checked={renewed || included}
                    disabled={renewed}
                    onChange={() => onToggle(t.id)}
                    aria-label={`Inclure ${fondDisplayName(t)} dans l'analyse`}
                    className="w-4 h-4 rounded border-slate-300 text-[#00A86B] focus:ring-[#00A86B] flex-shrink-0 disabled:opacity-60"
                  />
                  <span className="min-w-0">
                    <span className={`block text-sm font-semibold truncate ${included || renewed ? 'text-[#0A1628] dark:text-[#E2E8F0]' : 'text-slate-400 line-through'}`}>
                      {fondDisplayName(t)}
                    </span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      {t.posologie && <span className="text-xs text-slate-500 dark:text-[#94A3B8] truncate">{t.posologie}</span>}
                      {!t.medicament_id && (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300">
                          Non vérifiable par le moteur
                        </span>
                      )}
                      {!included && !renewed && (
                        <span className="text-[10px] font-semibold text-slate-500">Exclu de l'analyse</span>
                      )}
                    </span>
                  </span>
                </label>
                {renewed ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-[#006B47] flex-shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Renouvelé
                  </span>
                ) : (
                  <button
                    onClick={() => onRenew(t)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#006B47] border border-[#00A86B]/30 rounded-lg hover:bg-[#E6F4EE] transition-colors flex-shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Renouveler
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {legacy && (
        <p className="mt-2.5 text-xs text-slate-600 dark:text-[#94A3B8] line-clamp-3" title={legacy}>
          <span className="font-semibold text-amber-800 dark:text-amber-300">Notes antérieures (non analysées) : </span>
          {legacy}
        </p>
      )}
    </div>
  );
}

// ─── CheckerView ─────────────────────────────────────────────────────────────

interface CheckerViewProps {
  patients: Patient[];
  selectedPatient: Patient | null;
  setSelectedPatient: (p: Patient | null) => void;
  patientSearchTerm: string;
  setPatientSearchTerm: (v: string) => void;
  showPatientDropdown: boolean;
  setShowPatientDropdown: (v: boolean) => void;
  filteredPatientsForDropdown: Patient[];
  medSearchResults: Medicament[];
  // Sprint 4d-bis — hors Maroc : null = non chargé (lien), sinon liste badgée
  medSearchForeign: ForeignMed[] | null;
  onShowForeign: () => void;
  selectedMeds: CheckerMed[];
  medSearchTerm: string;
  setMedSearchTerm: (v: string) => void;
  showMedDropdown: boolean;
  setShowMedDropdown: (v: boolean) => void;
  medSearchLoading: boolean;
  searchMedications: (term: string) => void;
  addMedication: (med: Medicament) => void;
  addManualMedication: (nom: string) => void;
  removeMedication: (id: string) => void;
  medVerifInfo: Map<string, { hasSID: boolean; source: string | null }>;
  result: InteractionResult | null;
  // Sprint 4d — analyse automatique : run en cours / en échec, relance manuelle.
  analysisRunning: boolean;
  analysisFailed: boolean;
  rerunAnalysis: () => void;
  resetAnalysis: () => void;
  resultsRef: React.RefObject<HTMLDivElement>;
  loadPatientOrdonnances: (id: string) => Promise<void>;
  patientOrdonnances: any[];
  onAddPatient: () => void;
  setShowPrescriptionForm: (v: boolean) => void;
  // Sprint 3 — traitement de fond
  fondTraitements: TraitementChronique[];
  fondLoading: boolean;
  fondError: boolean;
  fondExcluded: Set<string>;
  toggleFond: (id: string) => void;
  renewFond: (t: TraitementChronique) => void;
  reloadFond: () => void;
  analysisPending: boolean;
  // Sprint 4bc — antécédents (même liste que le moteur)
  antecedents: Antecedent[];
  antecedentsLoading: boolean;
  antecedentsError: boolean;
  antecedentRulesReady: boolean;
  // Sprint 4e-B — allergies : familles reconnues / non analysées, règles chargées
  allergyStatus: AllergyClassification[];
  allergyRulesReady: boolean;
}

function CheckerView({
  patients, selectedPatient, setSelectedPatient,
  patientSearchTerm, setPatientSearchTerm,
  showPatientDropdown, setShowPatientDropdown,
  filteredPatientsForDropdown,
  medSearchResults, selectedMeds, medSearchTerm, setMedSearchTerm,
  showMedDropdown, setShowMedDropdown, medSearchLoading, searchMedications,
  medSearchForeign, onShowForeign,
  addMedication, addManualMedication, removeMedication,
  medVerifInfo, result, analysisRunning, analysisFailed,
  rerunAnalysis, resetAnalysis, resultsRef,
  loadPatientOrdonnances, patientOrdonnances,
  onAddPatient, setShowPrescriptionForm,
  fondTraitements, fondLoading, fondError, fondExcluded, toggleFond, renewFond, reloadFond,
  analysisPending,
  antecedents, antecedentsLoading, antecedentsError, antecedentRulesReady,
  allergyStatus, allergyRulesReady,
}: CheckerViewProps) {
  const [showMasked, setShowMasked] = useState(false);
  // Sprint 4d — cartes, bandeaux et verdict proviennent du MÊME run (instantané du verdict).
  // Pas de verdict → aucune carte (jamais d'alerte partielle ou d'un run précédent).
  const interactionAlerts = result?.alerts ?? [];
  const maskedAlerts = result?.masked ?? [];
  const nonVerifiables = result?.nonVerifiables ?? [];
  const ageUnknownWarning = result?.ageUnknown ?? false;
  // Déduplication calculée une fois pour toute la vue
  const clinicalAlerts = interactionAlerts.filter(a => a.severite !== 'info');
  const infoAlerts     = interactionAlerts.filter(a => a.severite === 'info');
  const dedupAlerts = dedupClinicalAlerts(clinicalAlerts);
  if (dedupAlerts.length !== clinicalAlerts.length) {
    console.warn(`[OrdoSur] Déduplication écran : ${clinicalAlerts.length - dedupAlerts.length} alerte(s) dupliquée(s) absorbée(s)`);
  }
  // Sprint 3 — alertes impliquant au moins un nouveau médicament vs préexistantes (fond seul)
  const currentAlerts       = dedupAlerts.filter(a => a.origin !== 'fond');
  const preexistingAlerts   = dedupAlerts.filter(a => a.origin === 'fond');
  // Sprint 2 — alertes fermes (cartes) vs bloc conditionnel grossesse (replié)
  const firmAlerts          = currentAlerts.filter(a => !a.pregnancyContext);
  const pregnancyCtxAlerts  = currentAlerts.filter(a => a.pregnancyContext);
  const selectedMedIds      = new Set(selectedMeds.map(m => m.id));
  const maskedReasons = [...new Set(maskedAlerts.map(m => m.reason))].join(', ');

  return (
    <PageTransition>
      <div className="p-4 lg:p-6 max-w-[1400px]">
        <div className="mb-4 lg:mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-[#E2E8F0] tracking-tight">Vérificateur d'interactions</h2>
          <p className="text-slate-500 dark:text-[#94A3B8] text-sm mt-0.5">Analysez les interactions médicamenteuses avant de prescrire</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* ── Patient selector ── */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm overflow-hidden dark:hover:shadow-[0_0_0_1px_rgba(56,189,248,0.12)]">
            {/* Sprint M4 — fix classe Tailwind cassée : bg-gradient-to-r [#00A86B] → bg-[#00A86B] solide */}
            <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-slate-100 bg-[#00A86B]">
              <h3 className="text-white font-bold text-base">Patient</h3>
            </div>
            <div className="p-4 lg:p-6">
              <div className="mb-5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={patientSearchTerm}
                    onChange={e => { setPatientSearchTerm(e.target.value); setShowPatientDropdown(true); }}
                    onFocus={() => setShowPatientDropdown(true)}
                    onBlur={() => setTimeout(() => setShowPatientDropdown(false), 300)}
                    placeholder="Rechercher un patient..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm text-slate-900 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 dark:focus:ring-[#00A86B]/40 focus:border-[#00A86B] dark:focus:border-[#00A86B]/40 transition-all"
                  />

                  {showPatientDropdown && (patientSearchTerm.length === 0 ? patients.length > 0 : filteredPatientsForDropdown.length > 0) && (
                    <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl shadow-xl max-h-72 overflow-y-auto">
                      {(patientSearchTerm.length === 0 ? patients : filteredPatientsForDropdown).map(p => (
                        <button
                          key={p.id}
                          onMouseDown={e => {
                            e.preventDefault();
                            setSelectedPatient(p);
                            setPatientSearchTerm(`${p.prenom} ${p.nom}`);
                            setShowPatientDropdown(false);
                            resetAnalysis();
                            loadPatientOrdonnances(p.id);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#E6F4EE] dark:hover:bg-[#00A86B]/[0.08] transition-colors border-b border-slate-50 dark:border-white/[0.04] last:border-b-0"
                        >
                          <PatientAvatar name={`${p.prenom} ${p.nom}`} size="xs" />
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">{p.prenom} {p.nom}</p>
                            <p className="text-xs text-slate-400 dark:text-[#475569]">
                              {p.date_naissance ? (formatAge(p.date_naissance) ?? '') : ''}
                              {p.telephone ? ` • ${p.telephone}` : ''}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={onAddPatient}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-[#00A86B] hover:text-[#00A86B] hover:bg-[#E6F4EE] transition-all font-medium"
                >
                  <UserPlus className="w-4 h-4" />
                  Nouveau patient
                </button>
              </div>

              {selectedPatient ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-[#E6F4EE] rounded-xl border border-[#E5E5E0]">
                    <PatientAvatar name={`${selectedPatient.prenom} ${selectedPatient.nom}`} size="md" />
                    <div>
                      <p className="font-bold text-[#0A1628]">{selectedPatient.prenom} {selectedPatient.nom}</p>
                      <p className="text-xs text-[#00A86B]">
                        {selectedPatient.date_naissance ? (formatAge(selectedPatient.date_naissance) ?? 'Âge inconnu') : 'Âge inconnu'}
                        {selectedPatient.sexe ? ` • ${selectedPatient.sexe === 'M' ? 'Homme' : 'Femme'}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Medical badges */}
                  {((selectedPatient.pathologies?.length ?? 0) > 0 || (selectedPatient.allergies_medicaments?.length ?? 0) > 0) && (
                    <div className="bg-rose-50 rounded-xl p-3.5 border border-rose-100 space-y-2">
                      {(selectedPatient.pathologies?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedPatient.pathologies!.map(p => (
                            <span key={p} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">{p}</span>
                          ))}
                        </div>
                      )}
                      {(selectedPatient.allergies_medicaments?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedPatient.allergies_medicaments!.map(a => (
                            <span key={a} className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                              ⚠ {a}{selectedPatient.allergies_reactions?.[a] === 'oui' ? ' · anaphylaxie' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Sprint 4e-B — allergies croisées : ce qui est analysé par famille, ce qui ne l'est pas */}
                      {(selectedPatient.allergies_medicaments?.length ?? 0) > 0 && (() => {
                        if (!allergyRulesReady) {
                          return (
                            <p className="text-[11px] text-amber-800 flex items-start gap-1">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-px" />
                              <span>Règles d'allergies non chargées — allergies croisées non analysées, analyse incomplète.</span>
                            </p>
                          );
                        }
                        const fams = [...new Set(allergyStatus.filter(x => x.status === 'famille').flatMap(x => x.familles))];
                        const non = allergyStatus.filter(x => x.status === 'non_reconnue').map(x => x.label);
                        return (
                          <>
                            {fams.length > 0 && (
                              <p className="text-[11px] text-slate-600 flex items-start gap-1">
                                <CheckCircle2 className="w-3 h-3 flex-shrink-0 mt-px text-[#00A86B]" />
                                <span>Allergies analysées par famille : {fams.join(', ')}</span>
                              </p>
                            )}
                            {non.length > 0 && (
                              <p className="text-[11px] text-amber-800 flex items-start gap-1">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-px" />
                                <span>
                                  Allergie{non.length > 1 ? 's' : ''} non analysée{non.length > 1 ? 's' : ''} : {non.join(', ')} — hors des familles connues, seul le nom exact du médicament est contrôlé.
                                </span>
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Sprint 4bc — Antécédents : hémorragie digestive / ulcère analysés, autres = information */}
                  <AntecedentsResume
                    items={antecedents}
                    loading={antecedentsLoading}
                    error={antecedentsError}
                    pathologies={selectedPatient.pathologies}
                    engineReady={antecedentRulesReady}
                  />

                  {/* Sprint 3 — Traitement de fond : inclus dans l'analyse, renouvelable */}
                  <FondPanel
                    patient={selectedPatient}
                    traitements={fondTraitements}
                    loading={fondLoading}
                    error={fondError}
                    excluded={fondExcluded}
                    selectedMedIds={selectedMedIds}
                    onToggle={toggleFond}
                    onRenew={renewFond}
                    onRetry={reloadFond}
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Sélectionnez un patient</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Prescription builder ── */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm overflow-hidden dark:hover:shadow-[0_0_0_1px_rgba(56,189,248,0.12)]">
            <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-slate-100 bg-gradient-to-r from-violet-500 to-violet-600">
              <h3 className="text-white font-bold text-base">Médicaments</h3>
            </div>
            <div className="p-4 lg:p-6">
              {/* Med search */}
              <div className="mb-5">
                <div className="relative">
                  <Pill className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={medSearchTerm}
                    onChange={e => { const v = e.target.value; setMedSearchTerm(v); setShowMedDropdown(true); searchMedications(v); }}
                    onFocus={() => { setShowMedDropdown(true); if (medSearchTerm.length >= 2) searchMedications(medSearchTerm); }}
                    onBlur={() => setTimeout(() => setShowMedDropdown(false), 300)}
                    placeholder="Ex: Doliprane, paracétamol..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm text-slate-900 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-500/40 focus:border-violet-300 dark:focus:border-violet-500/40 transition-all"
                  />

                  {showMedDropdown && medSearchTerm.length >= 2 && (medSearchResults.length > 0 || medSearchLoading || !medSearchLoading) && (
                    <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl shadow-xl max-h-72 overflow-y-auto">
                      {medSearchLoading && (
                        <div className="px-4 py-3 text-sm text-slate-400 dark:text-[#475569] text-center">Recherche...</div>
                      )}
                      {!medSearchLoading && medSearchResults.map(med => (
                        <button
                          key={med.id}
                          onMouseDown={e => { e.preventDefault(); addMedication(med); }}
                          className="w-full px-4 py-2.5 text-left hover:bg-violet-50 dark:hover:bg-violet-500/[0.08] transition-colors border-b border-slate-50 dark:border-white/[0.04] last:border-b-0"
                        >
                          {/* Ligne 1 : nom commercial. Sprint Quick Fixes A — Bug #2 :
                              badge 🇲🇦 MAR retiré (polluait visuellement la recherche méd). */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Sprint 4d-quater — libellé propre : marque + dosage + forme */}
                            <span className="font-bold text-slate-900 dark:text-[#E2E8F0] text-sm leading-tight">
                              {medLabel(med)}
                            </span>
                            {dosageManquant(med) && (
                              <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">Dosage à préciser</span>
                            )}
                          </div>
                          {/* Ligne 2 : DCI */}
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap pl-0.5">
                            {med.dci && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">{med.dci}</span>
                            )}
                          </div>
                          {/* Ligne 3 : laboratoire */}
                          {med.laboratoire && (
                            <div className="mt-0.5 pl-0.5">
                              <span className="text-[10px] text-slate-400 dark:text-slate-600">{med.laboratoire}</span>
                            </div>
                          )}
                        </button>
                      ))}
                      {/* Sprint 4d-bis — hors Maroc : jamais mêlé aux 🇲🇦. Affiché d'office si aucun
                          résultat 🇲🇦, sinon via le lien. Badge pays + « Non vérifiable » sans ingrédients. */}
                      {!medSearchLoading && medSearchForeign === null && medSearchResults.length > 0 && medSearchTerm.trim().length >= 3 && (
                        <button
                          onMouseDown={e => { e.preventDefault(); onShowForeign(); }}
                          className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-[#94A3B8] hover:text-[#0A1628] dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors border-t border-slate-100 dark:border-white/[0.06]"
                        >
                          Afficher aussi les médicaments hors Maroc
                        </button>
                      )}
                      {!medSearchLoading && medSearchForeign !== null && medSearchForeign.length > 0 && (
                        <>
                          <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] bg-slate-50 dark:bg-white/[0.03] border-y border-slate-100 dark:border-white/[0.06]">
                            Hors Maroc{medSearchResults.length === 0 ? ' — aucune spécialité marocaine ne correspond' : ''}
                          </p>
                          {medSearchForeign.map(med => (
                            <button
                              key={med.id}
                              onMouseDown={e => { e.preventDefault(); addMedication(med); }}
                              className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors border-b border-slate-50 dark:border-white/[0.04] last:border-b-0"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-800 dark:text-[#E2E8F0] text-sm leading-tight">{medLabel(med)}</span>
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-[#94A3B8]">
                                  {med.pays === 'FR' ? 'France' : med.pays === 'US' ? 'États-Unis' : 'International'}
                                </span>
                                {med.mappe === false && (
                                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300">
                                    Non vérifiable
                                  </span>
                                )}
                              </div>
                              {med.dci && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{med.dci}</p>}
                            </button>
                          ))}
                        </>
                      )}
                      {/* Ajout manuel quand aucun résultat */}
                      {!medSearchLoading && medSearchResults.length === 0 && (
                        <button
                          onMouseDown={e => { e.preventDefault(); addManualMedication(medSearchTerm); }}
                          className="w-full px-4 py-2.5 text-left hover:bg-violet-50 dark:hover:bg-violet-500/[0.08] transition-colors flex items-center gap-2"
                        >
                          <span className="text-violet-500 text-base leading-none">✏️</span>
                          <span className="text-sm text-violet-700 dark:text-violet-400 font-medium">
                            + Ajouter manuellement : <span className="font-bold">{medSearchTerm}</span>
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected meds */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Médicaments sélectionnés ({selectedMeds.length})
                </p>
                {selectedMeds.length > 0 ? (
                  <div className="space-y-2">
                    {selectedMeds.map((med, idx) => (
                      <div key={med.id} className="flex items-center gap-3 px-4 py-3 bg-violet-50 dark:bg-violet-500/[0.08] border border-violet-100 dark:border-violet-500/20 rounded-xl">
                        <span className="w-6 h-6 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="flex-1 font-semibold text-slate-900 dark:text-[#E2E8F0] text-sm truncate" title={displayNom(med)}>{displayNom(med)}</span>
                        {med.dosageManquant && (
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 flex-shrink-0">Dosage à préciser</span>
                        )}
                        {med.manual && (
                          <span title="Saisie manuelle — pas de vérification d'interaction" className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">✏️</span>
                        )}
                        {!med.manual && medVerifInfo.get(med.id)?.hasSID && (
                          <span
                            title={medVerifInfo.get(med.id)?.source ? `Source consultée : ${medVerifInfo.get(med.id)?.source}` : 'Aucune interaction documentée dans les sources consultées'}
                            className="text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 flex-shrink-0 cursor-help dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400"
                          >
                            Vérifié
                          </span>
                        )}
                        <button
                          onClick={() => removeMedication(med.id)}
                          aria-label={`Retirer ${med.nom}`}
                          className="p-2 lg:p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-6 text-sm italic">Aucun médicament sélectionné</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                {/* Sprint 4d-ter — sans médicament il n'y a rien à relancer : bouton « Analyser » désactivé. */}
                <Button
                  onClick={() => rerunAnalysis()}
                  variant="primary"
                  size="lg"
                  loading={selectedMeds.length > 0 && (analysisRunning || analysisPending)}
                  disabled={selectedMeds.length < 1 || !selectedPatient}
                  className="flex-1 whitespace-nowrap"
                >
                  {/* Un seul pictogramme : le spinner du bouton remplace le bouclier pendant le calcul */}
                  {!(selectedMeds.length > 0 && (analysisRunning || analysisPending)) && <Shield className="w-4 h-4 mr-2 flex-shrink-0" />}
                  {selectedMeds.length < 1 ? 'Analyser' : "Relancer l'analyse"}
                </Button>
                <Button onClick={resetAnalysis} variant="ghost" size="lg">
                  Réinitialiser
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Panneau résultats — Sprint 4 : pleine largeur, tout ici */}
        {selectedMeds.length >= 1 && (
          <div ref={resultsRef} className="mt-4 lg:mt-6 space-y-3">
            {/* 0. Sprint 4d — pas de verdict : ni carte ni bouton, seulement l'état de l'analyse */}
            {!result && !selectedPatient && (
              <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-[#94A3B8] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl px-4 py-3">
                <Info className="w-4 h-4 flex-shrink-0" />
                Sélectionnez un patient pour lancer l'analyse (interactions et contre-indications).
              </p>
            )}
            {!result && selectedPatient && analysisFailed && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 dark:bg-amber-500/[0.08] dark:border-amber-500/20 dark:text-amber-300">
                <span className="flex items-center gap-2 flex-1">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Analyse impossible (erreur réseau ou serveur) — aucun résultat affiché.
                </span>
                <button onClick={rerunAnalysis} className="font-semibold underline underline-offset-2 text-left">Relancer l'analyse</button>
              </div>
            )}
            {!result && selectedPatient && !analysisFailed && (
              <div role="status" aria-live="polite" className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] p-4 lg:p-5 space-y-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0]">
                  <span className="w-4 h-4 border-2 border-slate-300 border-t-[#00A86B] rounded-full animate-spin" aria-hidden />
                  Analyse en cours…
                </p>
                <div className="h-14 rounded-xl bg-slate-100 dark:bg-white/[0.04] animate-pulse" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="h-20 rounded-xl bg-slate-100 dark:bg-white/[0.04] animate-pulse" />
                  <div className="h-20 rounded-xl bg-slate-100 dark:bg-white/[0.04] animate-pulse" />
                </div>
              </div>
            )}

            {/* 1. Bandeau verdict */}
            {result && (
              <div className={`bg-white dark:bg-[#111827] rounded-2xl shadow-sm overflow-hidden border-l-4 ${
                result.severity === 'safe'        ? 'border-l-emerald-500' :
                result.severity === 'conditional' ? 'border-l-[#0A1628] dark:border-l-slate-300' :
                result.severity === 'attention'   ? 'border-l-amber-500'   : 'border-l-[#DC2626]'
              }`}>
                <div className={`px-4 lg:px-6 py-4 lg:py-5 ${
                  result.severity === 'safe'        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                  result.severity === 'conditional' ? 'bg-[#0A1628]/[0.05] dark:bg-white/[0.04]'         :
                  result.severity === 'attention'   ? 'bg-gradient-to-r from-amber-500 to-amber-600'     :
                                                    'bg-gradient-to-r from-[#DC2626] to-red-700'
                }`}>
                  <div className="flex items-center gap-3 lg:gap-4">
                    {result.severity === 'safe'      && <CheckCircle2  className="w-8 h-8 lg:w-10 lg:h-10 text-white flex-shrink-0" />}
                    {result.severity === 'conditional' && <Shield      className="w-8 h-8 lg:w-10 lg:h-10 text-[#0A1628] dark:text-slate-200 flex-shrink-0" />}
                    {result.severity === 'attention' && <AlertTriangle className="w-8 h-8 lg:w-10 lg:h-10 text-white flex-shrink-0" />}
                    {result.severity === 'dangerous' && <X             className="w-8 h-8 lg:w-10 lg:h-10 text-white flex-shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <h3 className={`text-xl lg:text-2xl font-black uppercase tracking-tight ${result.severity === 'conditional' ? 'text-[#0A1628] dark:text-[#E2E8F0]' : 'text-white'}`}>
                        {(result.title ?? (
                          result.severity === 'safe'        ? 'Aucune interaction détectée' :
                          result.severity === 'conditional' ? 'Sécuritaire sous réserve'    :
                          result.severity === 'attention' ? 'Attention'                   : 'Prescription à risque'
                        )).replace(/^[⚠✓]\s+/, '')}
                      </h3>
                      <p className={`mt-0.5 text-xs lg:text-sm break-words ${result.severity === 'conditional' ? 'text-[#0A1628]/80 dark:text-[#94A3B8]' : 'text-white/90'}`}>{result.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Non vérifiables pour interactions méd×méd */}
            {nonVerifiables.length > 0 && (
              <p className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 dark:bg-amber-500/[0.08] dark:border-amber-500/20 dark:text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                Non vérifié pour les interactions méd×méd&nbsp;: {nonVerifiables.join(', ')}
              </p>
            )}

            {/* 3. Grille de cartes (1 col mobile, 2 col desktop) */}
            {firmAlerts.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {firmAlerts.map((alert, idx) => (
                  <AlertCard key={idx} alert={alert} defaultOpen={!!alert.pregnancyFirm} />
                ))}
              </div>
            )}

            {/* 3b. Sprint 2 — Bloc conditionnel grossesse / allaitement / procréation */}
            {pregnancyCtxAlerts.length > 0 && <PregnancyContextBlock alerts={pregnancyCtxAlerts} />}

            {/* 3b'. Sprint 3 — Alertes préexistantes (traitement de fond seul), repliées, jamais masquées */}
            {preexistingAlerts.length > 0 && <PreexistingAlertsBlock alerts={preexistingAlerts} />}

            {/* 3c. Sprint 2 — Alertes non applicables (sexe / âge), masquées mais consultables */}
            {maskedAlerts.length > 0 && (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#94A3B8]">
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  {maskedAlerts.length} alerte{maskedAlerts.length > 1 ? 's' : ''} non applicable{maskedAlerts.length > 1 ? 's' : ''} masquée{maskedAlerts.length > 1 ? 's' : ''} ({maskedReasons})
                  <button
                    onClick={() => setShowMasked(s => !s)}
                    className="ml-1 font-semibold text-[#00A86B] hover:text-[#006B47] transition-colors"
                  >
                    {showMasked ? 'Masquer' : 'Afficher'}
                  </button>
                </p>
                {showMasked && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 opacity-70">
                    {maskedAlerts.map((m, idx) => <AlertCard key={idx} alert={m.alert} />)}
                  </div>
                )}
              </div>
            )}

            {/* Aucune alerte après analyse */}
            {result && dedupAlerts.length === 0 && nonVerifiables.length < selectedMeds.length && (
              <div className="flex items-start gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl dark:bg-emerald-500/[0.08] dark:border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5 dark:text-emerald-400" />
                <span className="text-sm text-emerald-800 font-medium dark:text-emerald-300">
                  Aucune interaction ni contre-indication détectée
                  {!selectedPatient && selectedMeds.length === 1 && (
                    <span className="font-normal text-emerald-600 dark:text-emerald-400"> — sélectionnez un patient pour les contre-indications</span>
                  )}
                </span>
              </div>
            )}

            {/* Âge inconnu */}
            {ageUnknownWarning && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                Âge inconnu — contre-indications pédiatriques non vérifiées.
              </p>
            )}

            {/* DCI non mappée */}
            {infoAlerts.length > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#94A3B8]">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                DCI non mappée&nbsp;: {infoAlerts.map(a => a.origin === 'fond' ? `${a.involved[0]} (traitement de fond)` : a.involved[0]).join(', ')}
              </p>
            )}

            {/* 4. Bouton ordonnance */}
            {result && (
              <div className="flex flex-col items-center gap-2 pt-2">
                {!selectedPatient && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-2 text-center">
                    <AlertTriangle className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                    Veuillez d'abord sélectionner un patient
                  </p>
                )}
                <Button
                  onClick={() => { if (!selectedPatient) return; setShowPrescriptionForm(true); }}
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto px-8"
                  disabled={!selectedPatient}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Créer une ordonnance
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

// ─── StatsView ───────────────────────────────────────────────────────────────

function StatsView({ userId, doctorId }: { userId: string; doctorId: string }) {
  return (
    <PageTransition>
      {/* Sprint M7 (1/3) — Stats : juste paddings/gaps responsive.
          Les graphiques Recharts utilisent déjà <ResponsiveContainer width="100%"> donc
          ils s'adaptent automatiquement à la largeur mobile. Rien d'autre à changer. */}
      <div className="p-4 lg:p-6 max-w-[1400px] space-y-4 lg:space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Statistiques</h2>
          <p className="text-slate-500 text-sm mt-0.5">Analyse de votre activité médicale</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2">
            <MonthlyInteractionsChart doctorId={doctorId} />
          </div>
          <RiskDistributionChart doctorId={doctorId} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <AllMedicationsHistory doctorId={doctorId} />
          <TopMedicationsSection doctorId={doctorId} />
          <RecentActivityTimeline doctorId={doctorId} />
        </div>
      </div>
    </PageTransition>
  );
}

// ─── OrdonnancesView ─────────────────────────────────────────────────────────

interface OrdonnancesViewProps {
  onNavigate: (v: ViewType) => void;
  doctorId: string;
  doctorInfo?: { nom: string; prenom: string; specialite?: string | null; rpps?: string | null; ordre_number?: string | null } | null;
  orgInfo?: { name: string; adresse?: string | null; telephone?: string | null } | null;
  logoUrl?: string | null;
}

function OrdonnancesView({ onNavigate, doctorId, doctorInfo, orgInfo, logoUrl }: OrdonnancesViewProps) {
  const [ords, setOrds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'quarter'>('all');
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const ordsLoadedRef = useRef(false);
  // Seule la dernière requête lancée met à jour la liste (réponses hors d'ordre ignorées).
  const fetchSeqRef = useRef(0);
  // Sprint 4d-bis — pagination côté serveur : compteur exact, recherche et filtres appliqués
  // en base (toute la base, pas seulement la page affichée), « Charger plus » par 30.
  const ORD_PAGE = 30;
  const [total, setTotal] = useState<number | null>(null);      // toutes les ordonnances du médecin
  const [matchCount, setMatchCount] = useState(0);              // après recherche / filtres
  const [loadingMore, setLoadingMore] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewOrd, setViewOrd] = useState<any | null>(null);     // aperçu en lecture seule
  const ordsRef = useRef<any[]>([]);
  ordsRef.current = ords;

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  // (Re)chargement de la 1re page : ouverture de la vue, profil médecin, recherche, filtre.
  useEffect(() => {
    if (!doctorId) return;
    fetchOrdonnances(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, debouncedSearch, timeFilter]);

  // Ordonnance enregistrée ailleurs (Vérificateur, Imprimer/PDF) ou retour sur l'onglet.
  useDataSync(['ordonnances'], () => { if (doctorId) fetchOrdonnances(true); });

  const fetchOrdonnances = async (reset: boolean) => {
    const seq = ++fetchSeqRef.current;
    // Skeleton uniquement au premier chargement (rechargements ensuite silencieux).
    if (!ordsLoadedRef.current) setLoading(true);
    if (!reset) setLoadingMore(true);
    const offset = reset ? 0 : ordsRef.current.length;
    const q = debouncedSearch.replace(/[%,()*\\]/g, ' ').trim();

    // Recherche par patient : identifiants des patients correspondants (requête bornée),
    // puis filtre en base sur ces patients OU sur le numéro d'ordonnance.
    let patientIds: string[] = [];
    if (q) {
      const first = q.split(/\s+/)[0];
      const { data: pats } = await supabase
        .from('patients').select('id, prenom, nom')
        .or(`prenom.ilike.%${first}%,nom.ilike.%${first}%`)
        .limit(300);
      if (seq !== fetchSeqRef.current) return;
      const ql = q.toLowerCase();
      patientIds = ((pats as Array<{ id: string; prenom: string; nom: string }> | null) ?? [])
        .filter(pt => `${pt.prenom} ${pt.nom}`.toLowerCase().includes(ql) || `${pt.nom} ${pt.prenom}`.toLowerCase().includes(ql))
        .slice(0, 100)
        .map(pt => pt.id);
    }

    let query = supabase
      .from('ordonnances')
      .select('id, date, created_at, statut, patient_id, ordre_number, motif, remarques, prochain_rdv, ordonnance_lignes(id, medicament_nom, posologie, duree, instructions)', { count: 'exact' })
      .eq('doctor_id', doctorId);
    if (timeFilter !== 'all') {
      const now = new Date();
      const startDate = timeFilter === 'month'
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      query = query.gte('created_at', startDate.toISOString());
    }
    if (q) {
      query = patientIds.length > 0
        ? query.or(`ordre_number.ilike.%${q}%,patient_id.in.(${patientIds.join(',')})`)
        : query.ilike('ordre_number', `%${q}%`);
    }
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + ORD_PAGE - 1);
    if (seq !== fetchSeqRef.current) return;
    if (error) {
      // Liste conservée telle quelle plutôt que vidée sur une erreur passagère.
      console.error('[OrdonnancesView] fetch error:', error);
      ordsLoadedRef.current = true;
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    let rows: any[] = [];
    if (data && data.length > 0) {
      const pIds = [...new Set(data.map((o: any) => o.patient_id).filter(Boolean))];
      const { data: pats } = await supabase.from('patients').select('id, prenom, nom, date_naissance').in('id', pIds);
      if (seq !== fetchSeqRef.current) return;
      const pMap = new Map((pats || []).map((pt: any) => [pt.id, pt]));
      rows = data.map((o: any) => {
        const pt = pMap.get(o.patient_id);
        return {
          ...o,
          patient_prenom: pt?.prenom || '',
          patient_nom_only: pt?.nom || '',
          patient_date_naissance: pt?.date_naissance ?? null,
          patient_nom: pt ? `${pt.prenom} ${pt.nom}` : 'Patient inconnu',
        };
      });
    }
    setOrds(reset ? rows : [...ordsRef.current, ...rows]);
    setMatchCount(count ?? rows.length);

    // Compteur exact de TOUTES les ordonnances du médecin (head only, aucune ligne chargée).
    if (!q && timeFilter === 'all') {
      setTotal(count ?? rows.length);
    } else if (reset) {
      const { count: all } = await supabase
        .from('ordonnances').select('id', { count: 'exact', head: true }).eq('doctor_id', doctorId);
      if (seq === fetchSeqRef.current && all != null) setTotal(all);
    }
    ordsLoadedRef.current = true;
    setLoading(false);
    setLoadingMore(false);
  };

  // Recherche et filtres sont appliqués en base : la liste affichée est déjà filtrée.
  const filtered = ords;
  const isFiltering = !!debouncedSearch || timeFilter !== 'all';

  const handleDownloadPdf = async (ord: any) => {
    if (!doctorInfo || !orgInfo) return;
    setPdfLoadingId(ord.id);
    try {
      const meds = (ord.ordonnance_lignes || []).map((l: any) => ({
        nom: l.medicament_nom || '',
        posologie: l.posologie || '',
        duree: l.duree || '',
        quantite: l.instructions ? String(l.instructions).replace('Quantité: ', '') : '',
      }));
      await generateOrdonnancePdf({
        ordreNumber: ord.ordre_number || ord.id.substring(0, 8).toUpperCase(),
        logo_url: logoUrl ?? null,
        doctor: doctorInfo,
        org: orgInfo,
        patient: { prenom: ord.patient_prenom, nom: ord.patient_nom_only, date_naissance: ord.patient_date_naissance ?? null },
        medications: meds,
        date: (ord.date || ord.created_at || new Date().toISOString()).split('T')[0],
      });
    } catch (e) {
      console.error('[OrdoSur] PDF reprint error:', e);
    } finally {
      setPdfLoadingId(null);
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || '??';

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const filterLabels: Record<string, string> = { all: 'Toutes', month: 'Ce mois', quarter: 'Ce trimestre' };

  return (
    <PageTransition>
      <div className="p-4 lg:p-6 max-w-5xl">

        {/* ── Header ── */}
        <div className="mb-4 lg:mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-[#E2E8F0] tracking-tight">
              Historique des ordonnances
            </h2>
            <p className="text-slate-500 dark:text-[#94A3B8] text-sm mt-0.5">
              {loading || total === null
                ? '…'
                : `${total} ordonnance${total !== 1 ? 's' : ''} au total${isFiltering ? ` · ${matchCount} résultat${matchCount !== 1 ? 's' : ''}` : ''}`}
            </p>
          </div>
          {/* Sprint M5 — bouton header desktop ; sur mobile, remplacé par le "+" flottant en bas */}
          <button
            onClick={() => onNavigate('checker')}
            className="hidden lg:flex items-center px-4 py-2 bg-[#00A86B] text-white rounded-xl text-sm font-semibold hover:bg-[#006B47] transition-colors flex-shrink-0"
          >
            + Nouvelle ordonnance
          </button>
        </div>

        {/* ── Search + filters ── */}
        <div className="mb-5 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher par patient ou numéro d'ordonnance…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 text-slate-900 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'month', 'quarter'] as const).map(f => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  timeFilter === f
                    ? 'bg-[#00A86B] text-white shadow-sm'
                    : 'bg-white dark:bg-[#111827] text-slate-600 dark:text-[#94A3B8] border border-slate-200 dark:border-white/[0.08] hover:border-[#00A86B] dark:hover:border-[#00A86B]/30'
                }`}
              >
                {filterLabels[f]}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white dark:bg-[#111827] rounded-2xl h-40 animate-pulse border border-slate-100 dark:border-white/[0.06]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm p-8 lg:p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700 dark:text-[#94A3B8] mb-2">
              {searchTerm || timeFilter !== 'all' ? 'Aucun résultat' : 'Aucune ordonnance'}
            </h3>
            <p className="text-slate-400 dark:text-[#475569] text-sm mb-6 max-w-sm mx-auto">
              {searchTerm || timeFilter !== 'all'
                ? 'Essayez de modifier votre recherche ou vos filtres.'
                : "Créez votre première ordonnance depuis le Vérificateur d'interactions."}
            </p>
            {!searchTerm && timeFilter === 'all' && (
              <button
                onClick={() => onNavigate('checker')}
                className="px-6 py-3 bg-[#00A86B] text-white rounded-xl text-sm font-semibold hover:bg-[#006B47] transition-colors"
              >
                💊 Créer une ordonnance
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(ord => {
              const dateStr = ord.date || ord.created_at;
              const dateLabel = dateStr ? formatDate(dateStr) : 'Date inconnue';
              const meds: any[] = ord.ordonnance_lignes || [];
              const initials = getInitials(ord.patient_nom || '');
              const isLoadingPdf = pdfLoadingId === ord.id;

              return (
                <div
                  key={ord.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Ouvrir l'ordonnance de ${ord.patient_nom} du ${dateLabel}`}
                  onClick={() => setViewOrd(ord)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setViewOrd(ord); } }}
                  className="cursor-pointer bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-white/[0.06] shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-[#00A86B]/20 dark:hover:border-[#00A86B]/30 active:bg-slate-50 dark:active:bg-white/[0.04] transition-all duration-200 p-4 lg:p-5 flex flex-col gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B]"
                >
                  {/* Patient + badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#E6F4EE] dark:bg-[#00A86B]/[0.15] flex items-center justify-center text-[#006B47] dark:text-[#00A86B] font-bold text-sm flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-[#E2E8F0] text-sm truncate">{ord.patient_nom}</p>
                        <p className="text-xs text-slate-400 dark:text-[#475569] mt-0.5">{dateLabel}</p>
                      </div>
                    </div>
                    {ord.ordre_number && (
                      <span className="text-[10px] font-bold px-2 py-1 bg-[#E6F4EE] dark:bg-[#00A86B]/[0.12] text-[#006B47] dark:text-[#00A86B] border border-[#00A86B]/20 dark:border-[#00A86B]/20 rounded-lg flex-shrink-0 font-mono tracking-wide">
                        {ord.ordre_number}
                      </span>
                    )}
                  </div>

                  {/* Medication pills */}
                  <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                    {meds.length === 0 ? (
                      <span className="text-xs text-slate-400 dark:text-[#475569]">Aucun médicament enregistré</span>
                    ) : (
                      <>
                        {meds.slice(0, 3).map((m: any, i: number) => (
                          <span key={i} className="px-2.5 py-1 bg-violet-50 dark:bg-violet-500/[0.08] text-violet-800 dark:text-violet-300 text-xs rounded-full font-medium border border-violet-100 dark:border-violet-500/20">
                            {m.medicament_nom}
                          </span>
                        ))}
                        {meds.length > 3 && (
                          <span className="px-2.5 py-1 bg-slate-50 dark:bg-white/[0.04] text-slate-500 dark:text-[#94A3B8] text-xs rounded-full border border-slate-100 dark:border-white/[0.06]">
                            +{meds.length - 3}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/[0.05] mt-auto">
                    <span className="text-xs text-slate-400 dark:text-[#475569]">
                      {meds.length} médicament{meds.length !== 1 ? 's' : ''}
                    </span>
                    {doctorInfo && orgInfo && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDownloadPdf(ord); }}
                        disabled={isLoadingPdf}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#00A86B] bg-[#E6F4EE] dark:bg-[#00A86B]/[0.1] border border-[#00A86B]/20 dark:border-[#00A86B]/20 rounded-lg hover:bg-[#d4eee0] dark:hover:bg-[#00A86B]/[0.18] active:bg-[#c6e6d6] transition-colors disabled:opacity-60"
                      >
                        {isLoadingPdf
                          ? <span className="w-3 h-3 border border-[#00A86B] border-t-[#006B47] rounded-full animate-spin" />
                          : <Download className="w-3 h-3" />}
                        {/* Sprint M5 — label compact mobile / full desktop */}
                        {isLoadingPdf
                          ? 'Génération…'
                          : <><span className="lg:hidden">PDF</span><span className="hidden lg:inline">Télécharger PDF</span></>
                        }
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sprint 4d-bis — pagination : « Charger plus » (30 par page) */}
        {!loading && ords.length > 0 && (
          <div className="mt-5 flex flex-col items-center gap-2">
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              {ords.length} affichée{ords.length > 1 ? 's' : ''} sur {matchCount}
            </p>
            {ords.length < matchCount && (
              <button
                onClick={() => fetchOrdonnances(false)}
                disabled={loadingMore}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0] bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.1] hover:border-[#00A86B] transition-colors disabled:opacity-60"
              >
                {loadingMore ? 'Chargement…' : 'Charger plus'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sprint 4d-bis — aperçu en lecture seule : réimpression sans réenregistrer ni dérogation */}
      {viewOrd && doctorInfo && orgInfo && (
        <PrescriptionPreviewModal
          isOpen
          readOnly
          isSaved
          onClose={() => setViewOrd(null)}
          onBack={() => setViewOrd(null)}
          onSave={async () => true}
          date={viewOrd.date || viewOrd.created_at || null}
          ordreNumber={viewOrd.ordre_number || String(viewOrd.id).substring(0, 8).toUpperCase()}
          logo_url={logoUrl ?? null}
          doctor={doctorInfo}
          org={orgInfo}
          patient={{ prenom: viewOrd.patient_prenom, nom: viewOrd.patient_nom_only, date_naissance: viewOrd.patient_date_naissance }}
          motif={viewOrd.motif ?? undefined}
          medications={(viewOrd.ordonnance_lignes || []).map((l: any, i: number) => ({
            id: l.id ?? String(i),
            nom: l.medicament_nom || '',
            posologie: l.posologie || '',
            duree: l.duree || '',
            quantite: l.instructions ? String(l.instructions).replace('Quantité: ', '') : '',
          }))}
          remarks={viewOrd.remarques ?? ''}
          nextAppointment={viewOrd.prochain_rdv ?? undefined}
        />
      )}

      {/* Sprint M5 — bouton "+" flottant mobile (cohérent avec M2 Patients).
          Au tap → navigue vers le Vérificateur où la création se fait. */}
      <button
        onClick={() => onNavigate('checker')}
        aria-label="Nouvelle ordonnance"
        className="fixed bottom-24 right-4 z-40 w-14 h-14 bg-[#00A86B] hover:bg-[#006B47] text-white rounded-full shadow-lg shadow-[#00A86B]/30 flex lg:hidden items-center justify-center transition-transform active:scale-95"
      >
        <Plus className="w-6 h-6" />
      </button>
    </PageTransition>
  );
}

// ─── SettingsView ─────────────────────────────────────────────────────────────

type SettingsSection = 'profil' | 'cabinet' | 'securite' | 'secretaire';

function SettingsView({
  navigate, user, doctorProfile,
  activeSection, setActiveSection,
  onSaved,
}: {
  navigate: (path: string) => void;
  user: any;
  doctorProfile: any;
  activeSection: SettingsSection;
  setActiveSection: (s: SettingsSection) => void;
  onSaved: () => void;
}) {

  // ── Profil prescripteur state ──────────────────────────────────────────────
  type ProfilForm = { prenom: string; nom: string; specialite: string; rpps: string; ordre_number: string };
  const EMPTY_PROFIL: ProfilForm = { prenom: user?.prenom || '', nom: user?.nom || '', specialite: doctorProfile?.specialite || '', rpps: '', ordre_number: '' };
  const [profilForm, setProfilForm]     = useState<ProfilForm>(EMPTY_PROFIL);
  const [savedProfil, setSavedProfil]   = useState<ProfilForm>(EMPTY_PROFIL);
  const [doctorId, setDoctorId]         = useState<string | null>(null);
  const [profilSaving, setProfilSaving] = useState(false);
  const [profilMsg, setProfilMsg]       = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Cabinet state ──────────────────────────────────────────────────────────
  type CabinetForm = { org_name: string; org_adresse: string; org_telephone: string; org_email: string };
  const EMPTY_CABINET: CabinetForm = { org_name: '', org_adresse: '', org_telephone: '', org_email: '' };
  const [cabinetForm, setCabinetForm]     = useState<CabinetForm>(EMPTY_CABINET);
  const [savedCabinet, setSavedCabinet]   = useState<CabinetForm>(EMPTY_CABINET);
  const [orgId, setOrgId]                 = useState<string | null>(null);
  const [cabinetSaving, setCabinetSaving] = useState(false);
  const [cabinetMsg, setCabinetMsg]       = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sprint 4d-ter — la préférence « Afficher le nom du patient sur l'ordonnance » est
  // supprimée : le patient est toujours imprimé. (La colonne doctors.show_patient_name_on_pdf
  // reste en base, simplement plus lue.)

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: doc } = await supabase
        .from('doctors')
        .select('id, rpps, specialite, ordre_number, org_id')
        .eq('user_id', user.id)
        .maybeSingle();

      let orgData: CabinetForm = EMPTY_CABINET;
      if (doc?.org_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('name, adresse, telephone, email')
          .eq('id', doc.org_id)
          .maybeSingle();
        if (org) orgData = { org_name: org.name || '', org_adresse: org.adresse || '', org_telephone: org.telephone || '', org_email: org.email || '' };
        setOrgId(doc.org_id);
      }

      const p: ProfilForm = {
        prenom:       user?.prenom || '',
        nom:          user?.nom || '',
        specialite:   doc?.specialite || '',
        rpps:         doc?.rpps || '',
        ordre_number: doc?.ordre_number || '',
      };
      setProfilForm(p);
      setSavedProfil(p);
      setCabinetForm(orgData);
      setSavedCabinet(orgData);
      if (doc?.id) setDoctorId(doc.id);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleSaveProfil = async () => {
    if (!user) return;
    setProfilSaving(true);
    setProfilMsg(null);
    try {
      const { error: upErr } = await supabase
        .from('user_profiles')
        .update({ prenom: profilForm.prenom, nom: profilForm.nom })
        .eq('user_id', user.id);
      if (upErr) throw upErr;

      if (doctorId) {
        const { error: docErr } = await supabase
          .from('doctors')
          .update({
            specialite:   profilForm.specialite   || null,
            rpps:         profilForm.rpps         || null,
            ordre_number: profilForm.ordre_number || null,
          })
          .eq('id', doctorId);
        if (docErr) throw docErr;
      }

      setSavedProfil(profilForm);
      setProfilMsg({ type: 'success', text: '✓ Profil mis à jour.' });
      onSaved();
    } catch (err: unknown) {
      setProfilMsg({ type: 'error', text: `Erreur : ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setProfilSaving(false);
    }
  };

  const handleSaveCabinet = async () => {
    if (!orgId) return;
    setCabinetSaving(true);
    setCabinetMsg(null);
    try {
      const { data: updated, error: orgErr } = await supabase
        .from('organizations')
        .update({
          name:      cabinetForm.org_name      || savedCabinet.org_name,
          adresse:   cabinetForm.org_adresse   || null,
          telephone: cabinetForm.org_telephone || null,
          email:     cabinetForm.org_email     || null,
        })
        .eq('id', orgId)
        .select('id');

      if (orgErr) throw orgErr;

      if (!updated || updated.length === 0) {
        setCabinetMsg({ type: 'error', text: "Vous n'êtes pas autorisé à modifier les informations de cette structure — contactez l'administrateur de la clinique." });
        return;
      }

      setSavedCabinet(cabinetForm);
      setCabinetMsg({ type: 'success', text: '✓ Informations du cabinet mises à jour.' });
      onSaved();
    } catch (err: unknown) {
      setCabinetMsg({ type: 'error', text: `Erreur : ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setCabinetSaving(false);
    }
  };

  // ── Secrétaire state ───────────────────────────────────────────────────────
  const [secEmail, setSecEmail]       = useState('');
  const [secPrenom, setSecPrenom]     = useState('');
  const [secNom, setSecNom]           = useState('');
  const [secInviting, setSecInviting] = useState(false);
  const [secMsg, setSecMsg]           = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [secInviteLink, setSecInviteLink] = useState<string | null>(null);
  const [secretaires, setSecretaires] = useState<{ id: string; user_id: string; active: boolean; created_at: string; prenom?: string; nom?: string }[]>([]);
  const [secLoading, setSecLoading]   = useState(false);

  // Password change state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]         = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg]         = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSecretaires = async () => {
    if (!user?.org_id) return;
    setSecLoading(true);
    const { data } = await supabase
      .from('secretaires')
      .select('id, user_id, active, created_at')
      .eq('org_id', user.org_id)
      .order('created_at', { ascending: false });
    if (data) {
      // Enrich with prenom/nom from user_profiles
      const enriched = await Promise.all((data as { id: string; user_id: string; active: boolean; created_at: string }[]).map(async s => {
        const { data: up } = await supabase.from('user_profiles').select('prenom, nom').eq('user_id', s.user_id).maybeSingle();
        return { ...s, prenom: up?.prenom, nom: up?.nom };
      }));
      setSecretaires(enriched);
    }
    setSecLoading(false);
  };

  const handleInviteSecretaire = async () => {
    if (!secEmail.trim()) { setSecMsg({ type: 'error', text: 'Email requis.' }); return; }
    if (!user?.org_id) return;
    setSecInviting(true);
    setSecMsg(null);
    setSecInviteLink(null);
    try {
      // Capture des valeurs AVANT le reset des inputs (utilisées pour l'email Resend ci-dessous)
      const emailValue  = secEmail.trim();
      const prenomValue = secPrenom.trim() || null;
      const nomValue    = secNom.trim() || null;

      const { data: token, error } = await supabase.rpc('invite_secretaire', {
        p_org_id: user.org_id,
        p_email:  emailValue,
        p_prenom: prenomValue,
        p_nom:    nomValue,
      });
      if (error) throw error;
      const link = `${PUBLIC_URL}/accept-invitation?type=secretaire&token=${token}`;
      setSecInviteLink(link);

      // ── Sprint #3.0.11b — Envoi automatique via Resend (fetch manuel) ─────
      // Pattern identique à AIChat.tsx (getSession + Authorization Bearer).
      // supabase.functions.invoke() envoyait la anon key par défaut → la fonction
      // rejetait "Utilisateur non autorisé". Avec fetch + Bearer token, on passe
      // explicitement le JWT du médecin → l'auth fonctionne.
      // Échec d'envoi NON bloquant : le lien reste affiché en fallback manuel.
      const medecinFullName = (user?.full_name || `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim()) || 'votre médecin';
      let emailSent = false;
      let emailError: string | null = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Session expirée');

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-secretaire-invitation`,
          {
            method: 'POST',
            headers: {
              'Content-Type':  'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              email:       emailValue,
              prenom:      prenomValue,
              nom:         nomValue,
              lien:        link,
              medecin_nom: medecinFullName,
            }),
          },
        );

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result?.error || `Erreur HTTP ${response.status}`);
        }
        emailSent = true;
      } catch (e: unknown) {
        emailError = e instanceof Error ? e.message : String(e);
        console.warn('[OrdoSur] send-secretaire-invitation failed (non-blocking):', emailError);
      }

      setSecMsg({
        type: 'success',
        text: emailSent
          ? `✓ Invitation envoyée à ${emailValue}. Si elle ne le reçoit pas, partagez le lien ci-dessous.`
          : `✓ Invitation créée. Email non envoyé${emailError ? ` (${emailError})` : ''} — partagez le lien ci-dessous manuellement.`,
      });

      setSecEmail(''); setSecPrenom(''); setSecNom('');
      loadSecretaires();
    } catch (err: unknown) {
      setSecMsg({ type: 'error', text: `Erreur : ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setSecInviting(false);
    }
  };

  const handlePasswordChange = async () => {
    setPwMsg(null);
    if (!currentPw || !newPw) { setPwMsg({ type: 'error', text: 'Veuillez remplir les deux champs.' }); return; }
    if (newPw.length < 8) { setPwMsg({ type: 'error', text: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' }); return; }
    if (currentPw === newPw) { setPwMsg({ type: 'error', text: 'Le nouveau mot de passe doit être différent du mot de passe actuel.' }); return; }
    setPwLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw });
      if (signInError) { setPwMsg({ type: 'error', text: 'Mot de passe actuel incorrect.' }); return; }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPw });
      if (updateError) throw updateError;
      setPwMsg({ type: 'success', text: '✓ Mot de passe modifié avec succès.' });
      setCurrentPw('');
      setNewPw('');
    } catch (err: unknown) {
      setPwMsg({ type: 'error', text: `Erreur : ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setPwLoading(false);
    }
  };

  // Logo upload state
  const [logoUrl, setLogoUrl]           = useState<string | null>(doctorProfile?.logo_url ?? null);
  const [logoPreview, setLogoPreview]   = useState<string | null>(null);
  const [logoFile, setLogoFile]         = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoMsg, setLogoMsg]           = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setLogoMsg({ type: 'error', text: 'Fichier trop lourd. Maximum 2 Mo.' });
      return;
    }
    setLogoFile(file);
    setLogoMsg(null);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = async () => {
    if (!logoFile || !user?.id) return;
    setLogoUploading(true);
    setLogoMsg(null);
    try {
      const ext  = logoFile.name.split('.').pop()?.toLowerCase() ?? 'png';
      const path = `${user.id}/logo.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('cabinet-logos')
        .upload(path, logoFile, { upsert: true, contentType: logoFile.type });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('cabinet-logos').getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updateErr } = await supabase
        .from('doctors')
        .update({ logo_url: publicUrl })
        .eq('user_id', user.id);
      if (updateErr) throw updateErr;
      setLogoUrl(publicUrl);
      setLogoPreview(null);
      setLogoFile(null);
      setLogoMsg({ type: 'success', text: '✓ Logo sauvegardé avec succès.' });
      setTimeout(() => setLogoMsg(null), 3000);
    } catch (err: unknown) {
      setLogoMsg({ type: 'error', text: `Erreur : ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!user?.id) return;
    setLogoUploading(true);
    setLogoMsg(null);
    try {
      const { error: updateErr } = await supabase
        .from('doctors')
        .update({ logo_url: null })
        .eq('user_id', user.id);
      if (updateErr) throw updateErr;
      setLogoUrl(null);
      setLogoPreview(null);
      setLogoFile(null);
      setLogoMsg({ type: 'success', text: '✓ Logo supprimé.' });
      setTimeout(() => setLogoMsg(null), 3000);
    } catch (err: unknown) {
      setLogoMsg({ type: 'error', text: `Erreur : ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setLogoUploading(false);
    }
  };

  const sections = [
    { id: 'profil',     label: '👤 Profil'     },
    { id: 'cabinet',    label: '🏥 Cabinet'    },
    { id: 'securite',   label: '🔒 Sécurité'  },
    { id: 'secretaire', label: '🗂 Secrétaire' },
  ] as const;

  // Load secretaires when section becomes active
  useEffect(() => {
    if (activeSection === 'secretaire') loadSecretaires();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  return (
    <PageTransition>
      <div className="p-6 max-w-3xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-[#E2E8F0] tracking-tight">Paramètres</h2>
          <p className="text-slate-500 dark:text-[#94A3B8] text-sm mt-0.5">Gérez votre compte et vos préférences</p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar nav */}
          <div className="w-44 flex-shrink-0">
            <div className="space-y-1">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    activeSection === s.id
                      ? 'bg-[#00A86B] text-white'
                      : 'text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-4">
            {activeSection === 'profil' && (
              <div className="space-y-4">
                {/* Identité */}
                <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm p-5 space-y-4">
                  <h3 className="font-bold text-slate-900 dark:text-[#E2E8F0]">Identité</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {([
                      { label: 'Prénom', key: 'prenom' as const },
                      { label: 'Nom',    key: 'nom'    as const },
                    ] as { label: string; key: 'prenom' | 'nom' }[]).map(f => (
                      <div key={f.key}>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">{f.label}</label>
                        <input
                          value={profilForm[f.key]}
                          onChange={e => setProfilForm(p => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50"
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">Email</label>
                    <input
                      value={user?.email || ''}
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm bg-slate-50 dark:bg-[#1E293B] text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Profil prescripteur */}
                <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm p-5 space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-[#E2E8F0]">Profil prescripteur</h3>
                    <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-0.5">Ces informations apparaissent sur vos ordonnances.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">Spécialité</label>
                    <select
                      value={profilForm.specialite}
                      onChange={e => setProfilForm(p => ({ ...p, specialite: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50"
                    >
                      <option value="">Sélectionner une spécialité</option>
                      {SPECIALITES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">Numéro d'Ordre National des Médecins</label>
                    <input
                      value={profilForm.ordre_number}
                      onChange={e => setProfilForm(p => ({ ...p, ordre_number: e.target.value }))}
                      placeholder="Ex. : 12345"
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">Numéro INPE</label>
                    <input
                      value={profilForm.rpps}
                      onChange={e => setProfilForm(p => ({ ...p, rpps: e.target.value }))}
                      placeholder="11 chiffres"
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50"
                    />
                    <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-1">Utile pour les feuilles de soins AMO.</p>
                  </div>

                  {profilMsg && (
                    <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
                      profilMsg.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400'
                    }`}>
                      {profilMsg.text}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveProfil}
                      disabled={profilSaving}
                      className="px-5 py-2.5 bg-[#00A86B] hover:bg-[#006B47] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                    >
                      {profilSaving && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                      Enregistrer
                    </button>
                    <button
                      onClick={() => { setProfilForm(savedProfil); setProfilMsg(null); }}
                      className="px-5 py-2.5 border border-slate-200 dark:border-white/[0.1] text-slate-500 dark:text-[#94A3B8] rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'cabinet' && (
              <div className="space-y-4">
              {/* Informations du cabinet */}
              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-[#E2E8F0]">Informations du cabinet</h3>
                  <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-0.5">Ces informations apparaissent sur vos ordonnances.</p>
                </div>

                {([
                  { label: 'Nom du cabinet', key: 'org_name' as const, placeholder: '' },
                  { label: 'Adresse',        key: 'org_adresse' as const,   placeholder: 'Rue, quartier, ville' },
                  { label: 'Téléphone',      key: 'org_telephone' as const, placeholder: '' },
                  { label: 'Email du cabinet', key: 'org_email' as const,   placeholder: '' },
                ] as { label: string; key: keyof CabinetForm; placeholder: string }[]).map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">{f.label}</label>
                    <input
                      value={cabinetForm[f.key]}
                      onChange={e => setCabinetForm(c => ({ ...c, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50"
                    />
                  </div>
                ))}

                {cabinetMsg && (
                  <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
                    cabinetMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                      : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400'
                  }`}>
                    {cabinetMsg.text}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveCabinet}
                    disabled={cabinetSaving}
                    className="px-5 py-2.5 bg-[#00A86B] hover:bg-[#006B47] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                  >
                    {cabinetSaving && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    Enregistrer
                  </button>
                  <button
                    onClick={() => { setCabinetForm(savedCabinet); setCabinetMsg(null); }}
                    className="px-5 py-2.5 border border-slate-200 dark:border-white/[0.1] text-slate-500 dark:text-[#94A3B8] rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>

              {/* Logo */}
              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm p-5 space-y-5">
                <h3 className="font-bold text-slate-900 dark:text-[#E2E8F0]">Logo du cabinet</h3>

                {logoMsg && (
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
                    logoMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                      : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400'
                  }`}>
                    {logoMsg.text}
                  </div>
                )}

                {/* Aperçu du logo actuel ou préview du nouveau */}
                <div className="flex items-start gap-4">
                  <div className="w-28 h-20 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#1E293B] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {(logoPreview ?? logoUrl)
                      ? <img src={logoPreview ?? logoUrl!} alt="Logo cabinet" className="max-h-full max-w-full object-contain p-1" />
                      : <span className="text-xs text-slate-400 dark:text-slate-500 text-center px-2">Aucun logo</span>
                    }
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                      Le logo apparaîtra en haut à gauche des ordonnances générées en PDF.<br />
                      Format : PNG ou JPEG · Max 2 Mo · Hauteur affichée : 60 px
                    </p>
                    <label className="inline-block cursor-pointer px-4 py-2 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-[#E2E8F0] rounded-xl text-sm font-medium transition-colors">
                      Choisir un fichier
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={handleLogoFileChange}
                      />
                    </label>
                    {logoFile && (
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                        Sélectionné : <strong>{logoFile.name}</strong> ({(logoFile.size / 1024).toFixed(0)} Ko)
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={handleLogoUpload}
                    disabled={!logoFile || logoUploading}
                    className="px-5 py-2.5 bg-[#00A86B] hover:bg-[#006B47] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                  >
                    {logoUploading && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    {logoUploading ? 'Envoi…' : 'Sauvegarder le logo'}
                  </button>
                  {logoUrl && !logoFile && (
                    <button
                      onClick={handleLogoDelete}
                      disabled={logoUploading}
                      className="px-5 py-2.5 border border-red-200 dark:border-red-500/30 text-red-500 dark:text-red-400 rounded-xl text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      Supprimer le logo
                    </button>
                  )}
                  {logoFile && (
                    <button
                      onClick={() => { setLogoFile(null); setLogoPreview(null); setLogoMsg(null); }}
                      className="px-5 py-2.5 border border-slate-200 dark:border-white/[0.1] text-slate-500 dark:text-[#94A3B8] rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </div>
              </div>
            )}

            {activeSection === 'securite' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 mb-4">Sécurité du compte</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Mot de passe actuel</label>
                    <input
                      type="password"
                      value={currentPw}
                      onChange={e => { setCurrentPw(e.target.value); setPwMsg(null); }}
                      placeholder="••••••••"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Nouveau mot de passe</label>
                    <input
                      type="password"
                      value={newPw}
                      onChange={e => { setNewPw(e.target.value); setPwMsg(null); }}
                      placeholder="•••••••• (min. 8 caractères)"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50"
                    />
                  </div>
                  {pwMsg && (
                    <div className={`p-3 rounded-xl text-xs font-medium ${
                      pwMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      {pwMsg.text}
                    </div>
                  )}
                  <button
                    onClick={handlePasswordChange}
                    disabled={pwLoading}
                    className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 transition-colors disabled:opacity-60 flex items-center gap-2"
                  >
                    {pwLoading && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    {pwLoading ? 'Modification...' : 'Changer le mot de passe'}
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'secretaire' && (
              <div className="space-y-4">
                {/* Invite form */}
                <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm p-5 space-y-4">
                  <h3 className="font-bold text-slate-900 dark:text-[#E2E8F0] mb-1">Inviter une secrétaire</h3>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Un lien d'activation sera généré. Transmettez-le à votre secrétaire.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">Prénom</label>
                      <input
                        value={secPrenom}
                        onChange={e => setSecPrenom(e.target.value)}
                        placeholder="Fatima"
                        className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 dark:focus:ring-[#00A86B]/40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">Nom</label>
                      <input
                        value={secNom}
                        onChange={e => setSecNom(e.target.value)}
                        placeholder="Benali"
                        className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 dark:focus:ring-[#00A86B]/40"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">Email <span className="text-red-400">*</span></label>
                    <input
                      type="email"
                      value={secEmail}
                      onChange={e => setSecEmail(e.target.value)}
                      placeholder="secretaire@cabinet.ma"
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 dark:focus:ring-[#00A86B]/40"
                    />
                  </div>
                  <button
                    onClick={handleInviteSecretaire}
                    disabled={secInviting || !secEmail.trim()}
                    className="px-5 py-2.5 bg-[#00A86B] hover:bg-[#006B47] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                  >
                    {secInviting && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    Générer le lien d'invitation
                  </button>

                  {secMsg && (
                    <div className={`p-3 rounded-xl text-xs font-medium ${
                      secMsg.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20'
                        : 'bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-500/20'
                    }`}>
                      {secMsg.text}
                    </div>
                  )}

                  {secInviteLink && (
                    <div className="p-3 bg-slate-50 dark:bg-white/[0.04] rounded-xl border border-slate-200 dark:border-white/[0.08] space-y-2">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">🔗 Lien d'invitation :</p>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={secInviteLink}
                          className="flex-1 px-2.5 py-1.5 text-[11px] font-mono bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-700 dark:text-slate-300 select-all"
                        />
                        <button
                          onClick={() => { navigator.clipboard.writeText(secInviteLink); }}
                          className="px-3 py-1.5 bg-[#00A86B] text-white text-xs font-semibold rounded-lg hover:bg-[#006B47] transition-colors whitespace-nowrap"
                        >
                          Copier
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">Expire dans 7 jours. Partagez ce lien uniquement avec votre secrétaire.</p>
                    </div>
                  )}
                </div>

                {/* Current secretaires */}
                <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm p-5">
                  <h3 className="font-bold text-slate-900 dark:text-[#E2E8F0] mb-4">Secrétaires actives</h3>
                  {secLoading ? (
                    <p className="text-sm text-slate-400">Chargement…</p>
                  ) : secretaires.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">Aucune secrétaire enregistrée.</p>
                  ) : (
                    <div className="space-y-2">
                      {secretaires.map(s => (
                        <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 dark:bg-white/[0.04] rounded-xl border border-slate-200 dark:border-white/[0.06]">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {(s.prenom?.[0] || '?')}{(s.nom?.[0] || '')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {s.prenom || ''} {s.nom || ''}{(!s.prenom && !s.nom) && <span className="italic text-slate-400">Nom inconnu</span>}
                            </p>
                            <p className="text-[10px] text-slate-400">Inscrite le {new Date(s.created_at).toLocaleDateString('fr-FR')}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.active
                              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                              : 'bg-slate-100 dark:bg-white/[0.06] text-slate-500'
                          }`}>
                            {s.active ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            onClick={async () => {
                              await supabase.from('secretaires').update({ active: !s.active }).eq('id', s.id);
                              loadSecretaires();
                            }}
                            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                          >
                            {s.active ? 'Désactiver' : 'Réactiver'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DoctorDashboard() {
  const { user, signOut, doctorProfile, clinicProfile, refreshProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation — vue persistée dans ?vue= (F5 restaure la vue, boutons retour/avant fonctionnels)
  const DOCTOR_VIEWS = ['home', 'patients', 'checker', 'ordonnances', 'stats', 'agenda', 'encyclopedie', 'documents', 'settings'] as const;
  const [activeView, setActiveView] = useViewState(DOCTOR_VIEWS, 'home');
  const [showAIChat, setShowAIChat] = useState(false);
  const [profileBannerDismissed, setProfileBannerDismissed] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('profil');

  const handleLogoClick = () => {
    if (showPrescriptionForm) {
      if (!window.confirm('Une ordonnance est en cours. Quitter sans enregistrer ?')) return;
    }
    // Retour volontaire à l'accueil : le brouillon est abandonné (pas de restauration).
    draftRestoreDoneRef.current = false; // bloque l'écriture au pagehide
    if (doctorProfile?.id && selectedPatient) clearDraft(doctorProfile.id, selectedPatient.id);
    window.location.assign(window.location.pathname);
  };

  // Ouvre directement Paramètres > Profil si redirigé depuis /profile
  useEffect(() => {
    if ((location.state as any)?.openSettings) {
      setActiveView('settings');
      setSettingsSection('profil');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Patients
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showImportPatientsModal, setShowImportPatientsModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastItem['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  // Medications
  const [medSearchResults, setMedSearchResults] = useState<Medicament[]>([]);
  const [selectedMeds, setSelectedMeds] = useState<CheckerMed[]>([]);
  // Sprint 4d-quater — même sélection, vue par le formulaire et la vérification Sprint 3b :
  // le nom comparé aux lignes de l'ordonnance est le LIBELLÉ (marque + dosage + forme).
  const verifMeds = useMemo(() => selectedMeds.map(m => ({ ...m, nom: displayNom(m) })), [selectedMeds]);
  // Sprint 4d-bis — entrées hors Maroc : null = non chargées (lien « Afficher aussi… »).
  const [medSearchForeign, setMedSearchForeign] = useState<ForeignMed[] | null>(null);
  const [medSearchTerm, setMedSearchTerm] = useState('');
  const [showMedDropdown, setShowMedDropdown] = useState(false);
  const [medSearchLoading, setMedSearchLoading] = useState(false);

  // Analysis
  const [result, setResult] = useState<InteractionResult | null>(null);
  const [allContraindications, setAllContraindications] = useState<DbContraindication[]>([]);
  const [interactionAlerts, setInteractionAlerts] = useState<InteractionAlert[]>([]);
  const [ageUnknownWarning, setAgeUnknownWarning] = useState(false);
  const [maskedAlerts, setMaskedAlerts] = useState<MaskedAlert[]>([]);
  const [nonVerifiables, setNonVerifiables] = useState<string[]>([]);
  // Ingrédients vérifiés sans interaction documentée : hasSID = true si au moins
  // un ingrédient du méd porte sans_interaction_documentee = true.
  const [medVerifInfo, setMedVerifInfo] = useState<Map<string, { hasSID: boolean; source: string | null }>>(() => new Map());
  // Sprint 3 — Traitement de fond du patient sélectionné (actifs uniquement) + cases
  // « Inclure dans l'analyse » décochées (ids de traitements_chroniques). Non persisté :
  // chaque nouveau patient / rechargement repart « tout coché » (choix le plus sûr).
  const [fondTraitements, setFondTraitements] = useState<TraitementChronique[]>([]);
  const [fondLoading, setFondLoading] = useState(false);
  const [fondError, setFondError] = useState(false);
  const [fondExcluded, setFondExcluded] = useState<Set<string>>(() => new Set());
  // Rechargement du fond : numéro de requête (dernière gagnante), signature de la liste
  // affichée, patient courant (réponse d'un ancien patient ignorée).
  const fondSeqRef = useRef(0);
  const fondSigRef = useRef('');
  const selectedPatientIdRef = useRef<string | null>(null);
  // runCheck en cours : le verdict attend la fin du calcul des alertes.
  const [analysisPending, setAnalysisPending] = useState(false);
  // Sprint 4d — analyse automatique, un seul run affiché :
  //   runSeqRef      : identifiant du dernier run lancé (les runs annulés n'écrivent rien) ;
  //   alertsRunId    : run dont proviennent les alertes en mémoire ;
  //   verdictWantedRef / refreshingRef : verdict à calculer dès que le run courant est fini
  //                    et que le fond / les antécédents ont été rechargés ;
  //   rerunTick      : « Relancer l'analyse » (run complet forcé).
  const runSeqRef = useRef(0);
  // (analysisRunning : dérivé plus bas — patient + médicaments, pas encore de verdict)
  const [alertsRunId, setAlertsRunId] = useState(0);
  const verdictWantedRef = useRef(false);
  const refreshingRef = useRef(false);
  const [verdictTick, setVerdictTick] = useState(0);
  const [rerunTick, setRerunTick] = useState(0);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  // Sprint 3b — ensemble analysé au dernier clic « Analyser » (médicaments + fond inclus)
  // et confirmation explicite des lignes hors base (clé = liste des noms confirmés).
  const [analyzedKey, setAnalyzedKey] = useState<string | null>(null);
  const [horsBaseConfirmedKey, setHorsBaseConfirmedKey] = useState<string | null>(null);
  const [confirmDeletePatient, setConfirmDeletePatient] = useState<Patient | null>(null);
  const [deletePatientLoading, setDeletePatientLoading] = useState(false);
  // Volet 2 — synonymes des pathologies du patient sélectionné.
  // Clé = nom_fr de la pathologie (tel que stocké dans patients.pathologies),
  // valeur = liste de synonymes bruts. Chargé en 1 requête batch quand le patient change.
  const [pathologySynonyms, setPathologySynonyms] = useState<Map<string, string[]>>(new Map());

  // Prescription
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [showPrescriptionPreview, setShowPrescriptionPreview] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState<any>(null);
  const [prescriptionOrdreNumber, setPrescriptionOrdreNumber] = useState('');
  // Enregistrement auto à l'impression/PDF : n° d'ordre déjà enregistré (anti-doublon)
  // et enregistrement en cours (partagé entre clics rapprochés).
  const [savedOrdreNumber, setSavedOrdreNumber] = useState<string | null>(null);
  const savedOrdreNumberRef = useRef<string | null>(null);
  const savingOrdonnanceRef = useRef<Promise<boolean> | null>(null);
  // Sprint 4d — dérogation (prescription contre-indiquée) : confirmation liée à la signature
  // de l'ordonnance (toute modification l'annule) + demande en cours (modale).
  const [derogationConf, setDerogationConf] = useState<DerogationConfirmation | null>(null);
  const [derogationRequest, setDerogationRequest] = useState<{ alerts: InteractionAlert[]; signature: string } | null>(null);
  const derogationResolverRef = useRef<((c: DerogationConfirmation | null) => void) | null>(null);
  const [showMedicationHistory, setShowMedicationHistory] = useState(false);
  const [patientOrdonnances, setPatientOrdonnances] = useState<any[]>([]);
  // Sprint 4d-quater — tant que les ordonnances du patient affiché ne sont pas chargées, le
  // compteur (en-tête et onglet) affiche « … » au lieu du nombre d'un autre patient ou de 0.
  const [patientOrdLoading, setPatientOrdLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState<HomeStats>({
    totalPatients: 0, ordonnances: 0, interactions: 0,
    evolution: 0, evolutionInsufficient: false, evolutionReason: null,
    patientsThisMonth: 0, patientsLastMonth: 0,
    ordThisMonth: null, ordLastMonth: null, intThisMonth: null, intLastMonth: null,
    graves: null, gravesScope: null,
  });
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<HomeAlert[]>([]);
  const [todayRdvs, setTodayRdvs] = useState<HomeRdv[]>([]);
  const [todayRdvsRemaining, setTodayRdvsRemaining] = useState(0);
  // Navigation contextuelle depuis l'accueil
  const [pendingPatientId, setPendingPatientId] = useState<string | null>(null);
  const [agendaDate, setAgendaDate] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const patientsLoadedRef = useRef(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auth guard
  // Sprint Quick Fixes A — Bug #1 : on dépend de doctorProfile?.id pour que loadStats
  // se ré-exécute quand le profil médecin finit de charger (chargement parallèle dans
  // AuthContext). Sans ça, les KPI Ordonnances/Interactions utilisent user.id (auth UUID)
  // au lieu de doctorProfile.id (doctors PK) → 0 lignes jusqu'à un F5 manuel.
  useEffect(() => {
    if (!user || user.role !== 'doctor') navigate('/');
    else {
      loadPatients();
      loadStats();
      loadInteractionDb();
    }
    // Dépendances primitives : l'objet `user` est recréé à chaque rechargement de profil,
    // ce qui relançait tous les chargements (flash au retour de focus).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, user?.org_id, doctorProfile?.id, navigate]);

  // La date d'agenda ciblée depuis l'accueil ne vaut que pour cette ouverture.
  useEffect(() => {
    if (activeView !== 'agenda') setAgendaDate(null);
  }, [activeView]);

  // Scroll to result
  useEffect(() => {
    if (result && resultsRef.current) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [result]);

  // Volet 2 — Chargement batch des synonymes des pathologies du patient sélectionné.
  // 1 seule requête .in('nom_fr', [...]) → pas de N+1. Si le patient n'a pas de pathologie
  // ou que la requête échoue, on garde une Map vide → le moteur retombe sur le nom seul
  // (fallback gracieux, aucun crash).
  useEffect(() => {
    let cancelled = false;
    const loadSynonyms = async () => {
      const pathos = selectedPatient?.pathologies?.filter(Boolean) ?? [];
      if (pathos.length === 0) {
        setPathologySynonyms(new Map());
        return;
      }
      try {
        const { data } = await supabase
          .from('pathologies_curees')
          .select('nom_fr, synonymes')
          .in('nom_fr', pathos);
        if (cancelled) return;
        const map = new Map<string, string[]>();
        for (const row of data ?? []) {
          const syns = (row.synonymes ?? '')
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);
          if (syns.length > 0) map.set(row.nom_fr, syns);
        }
        setPathologySynonyms(map);
      } catch {
        if (!cancelled) setPathologySynonyms(new Map());
      }
    };
    loadSynonyms();
    return () => { cancelled = true; };
    // Sprint 4 — rechargé aussi quand les pathologies du MÊME patient changent (ajout depuis
    // le profil ou la fiche) : sinon la nouvelle pathologie était testée sans ses synonymes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatient?.id, (selectedPatient?.pathologies ?? []).join('|')]);

  // Sprint 3 — Traitement de fond actif du patient sélectionné.
  // Fix — la liste était chargée UNIQUEMENT au changement de patient : un traitement ajouté
  // dans le profil puis « Prescrire » (même patient) n'était pas analysé. Désormais rechargée :
  //   1. après chaque ajout / arrêt dans le profil (handleTraitementsChanged) ;
  //   2. à chaque retour sur la vue Vérificateur ;
  //   3. juste avant chaque verdict (checkInteractions).
  // Les cases décochées sont conservées pour les traitements inchangés ; les nouveaux sont
  // cochés par défaut. Liste identique → état inchangé (pas d'analyse relancée pour rien).
  selectedPatientIdRef.current = selectedPatient?.id ?? null;
  const refreshFond = useCallback(async (
    pid: string, opts: { reset?: boolean } = {},
  ): Promise<'unchanged' | 'changed' | 'error' | 'stale'> => {
    const seq = ++fondSeqRef.current;
    setFondLoading(true);
    if (opts.reset) {
      fondSigRef.current = '';
      setFondTraitements([]);
      setFondExcluded(new Set());
      setFondError(false);
    }
    try {
      const rows = await loadTraitements(pid, true);
      if (seq !== fondSeqRef.current || selectedPatientIdRef.current !== pid) return 'stale';
      setFondError(false);
      const sig = rows.map(t => `${t.id}:${t.medicament_id ?? ''}`).sort().join(',');
      if (sig === fondSigRef.current) return 'unchanged';
      fondSigRef.current = sig;
      setFondTraitements(rows);
      const ids = new Set(rows.map(r => r.id));
      setFondExcluded(prev => {
        const next = new Set([...prev].filter(id => ids.has(id)));
        return next.size === prev.size ? prev : next;
      });
      return 'changed';
    } catch (e) {
      if (seq !== fondSeqRef.current || selectedPatientIdRef.current !== pid) return 'stale';
      console.error('[OrdoSur] traitements_chroniques load error:', e);
      setFondError(true);
      return 'error';
    } finally {
      if (seq === fondSeqRef.current) setFondLoading(false);
    }
  }, []);

  // Changement de patient : liste repartie de zéro, tout coché.
  useEffect(() => {
    const pid = selectedPatient?.id;
    if (!pid) {
      fondSeqRef.current++;
      fondSigRef.current = '';
      setFondTraitements([]); setFondExcluded(new Set()); setFondError(false); setFondLoading(false);
      return;
    }
    refreshFond(pid, { reset: true });
  }, [selectedPatient?.id, refreshFond]);

  // Niveau 1 — ajout / arrêt dans le profil patient.
  const handleTraitementsChanged = useCallback((pid: string) => {
    if (pid === selectedPatientIdRef.current) refreshFond(pid);
  }, [refreshFond]);

  // ── Sprint 4bc — Antécédents du patient (canal antécédents du moteur) ─────
  // Même cycle de vie que le traitement de fond : chargés au changement de patient,
  // rechargés au retour sur le Vérificateur, après une modification dans le profil
  // (dataSync 'antecedents') et juste avant chaque verdict. Échec → jamais de vert.
  const [patientAntecedents, setPatientAntecedents] = useState<Antecedent[]>([]);
  const [antLoading, setAntLoading] = useState(false);
  const [antError, setAntError] = useState(false);
  const antSeqRef = useRef(0);
  const antSigRef = useRef('');
  const refreshAntecedents = useCallback(async (
    pid: string, opts: { reset?: boolean } = {},
  ): Promise<'unchanged' | 'changed' | 'error' | 'stale'> => {
    const seq = ++antSeqRef.current;
    setAntLoading(true);
    if (opts.reset) {
      antSigRef.current = '';
      setPatientAntecedents([]);
      setAntError(false);
    }
    try {
      const rows = await loadAntecedents(pid, false); // filtré par patient, archivés exclus
      if (seq !== antSeqRef.current || selectedPatientIdRef.current !== pid) return 'stale';
      setAntError(false);
      const sig = rows.map(a => `${a.id}:${a.updated_at}`).sort().join(',');
      if (sig === antSigRef.current) return 'unchanged';
      antSigRef.current = sig;
      setPatientAntecedents(rows);
      return 'changed';
    } catch (e) {
      if (seq !== antSeqRef.current || selectedPatientIdRef.current !== pid) return 'stale';
      console.error('[OrdoSur] antecedents load error:', e);
      setAntError(true);
      return 'error';
    } finally {
      if (seq === antSeqRef.current) setAntLoading(false);
    }
  }, []);

  useEffect(() => {
    const pid = selectedPatient?.id;
    if (!pid) {
      antSeqRef.current++;
      antSigRef.current = '';
      setPatientAntecedents([]); setAntError(false); setAntLoading(false);
      return;
    }
    refreshAntecedents(pid, { reset: true });
  }, [selectedPatient?.id, refreshAntecedents]);

  useDataSync(['antecedents'], () => {
    const pid = selectedPatientIdRef.current;
    if (pid) refreshAntecedents(pid);
  }, { onFocus: false });

  // Règles et classes : chargées une fois (fetchAllRows). Échec → antécédents digestifs
  // non analysés, signalé (bloc Vérificateur + verdict jamais vert).
  const [antRegles, setAntRegles] = useState<RegleAntecedent[]>([]);
  const [antClasses, setAntClasses] = useState<RegleClasse[]>([]);
  const [antRulesReady, setAntRulesReady] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [regles, classes] = await Promise.all([
          fetchAllRows<RegleAntecedent>(
            (from, to) => supabase.from('regles_antecedents').select('*').eq('actif', true).order('ordre').range(from, to),
            { label: 'regles_antecedents' },
          ),
          fetchAllRows<RegleClasse>(
            (from, to) => supabase.from('regles_antecedents_classes').select('classe, dci_motif').range(from, to),
            { label: 'regles_antecedents_classes' },
          ),
        ]);
        if (cancelled) return;
        if (regles.length === 0 || classes.length === 0) throw new Error('règles antécédents vides');
        setAntRegles(regles);
        setAntClasses(classes);
        setAntRulesReady(true);
      } catch (e) {
        console.error('[OrdoSur] regles_antecedents load error:', e);
        if (!cancelled) setAntRulesReady(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // ── Sprint 4e-B — Allergies croisées (canal allergies du moteur) ──────────
  // Familles et règles chargées une fois (fetchAllRows). Échec → les allergies du patient
  // ne sont pas analysées par famille : signalé, verdict jamais vert.
  const [allergyFamilles, setAllergyFamilles] = useState<AllergieFamilleRow[]>([]);
  const [allergyRegles, setAllergyRegles] = useState<RegleAllergie[]>([]);
  const [allergyRulesReady, setAllergyRulesReady] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [fams, regles] = await Promise.all([
          fetchAllRows<AllergieFamilleRow>(
            (from, to) => supabase.from('allergie_familles').select('famille, label, type, motif').range(from, to),
            { label: 'allergie_familles' },
          ),
          fetchAllRows<RegleAllergie>(
            (from, to) => supabase.from('regles_allergies').select('*').eq('actif', true).order('ordre').range(from, to),
            { label: 'regles_allergies' },
          ),
        ]);
        if (cancelled) return;
        if (fams.length === 0 || regles.length === 0) throw new Error('règles allergies vides');
        setAllergyFamilles(fams);
        setAllergyRegles(regles);
        setAllergyRulesReady(true);
      } catch (e) {
        console.error('[OrdoSur] regles_allergies load error:', e);
        if (!cancelled) setAllergyRulesReady(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Allergies médicamenteuses du patient + type de réaction (anaphylaxie) saisi dans la fiche.
  const patientAllergies = useMemo<PatientAllergy[]>(() => (selectedPatient?.allergies_medicaments ?? [])
    .filter(Boolean)
    .map(label => ({ label, anaphylaxie: selectedPatient?.allergies_reactions?.[label] ?? 'inconnu' })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPatient?.id, (selectedPatient?.allergies_medicaments ?? []).join('|'), JSON.stringify(selectedPatient?.allergies_reactions ?? {})]);
  const allergySig = patientAllergies.map(a => `${a.label}:${a.anaphylaxie}`).sort().join('|');
  // Analysée par famille / connue de la base / non reconnue (mention « non analysée »).
  const allergyStatus = useMemo(() => classifyAllergies(
    patientAllergies.map(a => a.label),
    allergyFamilles,
    allContraindications.filter(c => c.condition_type === 'allergie_med').map(c => c.condition_valeur),
  ), [patientAllergies, allergyFamilles, allContraindications]);
  // Patient allergique mais règles non chargées : allergies croisées non analysées.
  const allergiesIncomplete = patientAllergies.length > 0 && !allergyRulesReady;

  // ── Sprint 4e-A — Doublons thérapeutiques (canal doublons du moteur) ──────
  // Classes à risque, synonymes de substances et règles chargés une fois (fetchAllRows).
  // Échec → doublons non analysés : signalé, verdict jamais vert dès 2 médicaments.
  const [dupClasses, setDupClasses] = useState<DoublonClasseRow[]>([]);
  const [dupSubstances, setDupSubstances] = useState<DoublonSubstanceRow[]>([]);
  const [dupRegles, setDupRegles] = useState<RegleDoublon[]>([]);
  const [dupRulesReady, setDupRulesReady] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [cls, subs, regles] = await Promise.all([
          fetchAllRows<DoublonClasseRow>(
            (from, to) => supabase.from('doublon_classes').select('classe, label, motif').range(from, to),
            { label: 'doublon_classes' },
          ),
          fetchAllRows<DoublonSubstanceRow>(
            (from, to) => supabase.from('doublon_substances').select('substance, label, type, motif').range(from, to),
            { label: 'doublon_substances' },
          ),
          fetchAllRows<RegleDoublon>(
            (from, to) => supabase.from('regles_doublons').select('*').eq('actif', true).order('ordre').range(from, to),
            { label: 'regles_doublons' },
          ),
        ]);
        if (cancelled) return;
        if (cls.length === 0 || subs.length === 0 || regles.length === 0) throw new Error('règles doublons vides');
        setDupClasses(cls);
        setDupSubstances(subs);
        setDupRegles(regles);
        setDupRulesReady(true);
      } catch (e) {
        console.error('[OrdoSur] regles_doublons load error:', e);
        if (!cancelled) setDupRulesReady(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);
  // Au moins deux médicaments analysés (prescription + fond inclus) mais règles non chargées.
  const doublonsIncomplete = !dupRulesReady
    && (selectedMeds.length + fondTraitements.filter(t => !fondExcluded.has(t.id)).length) >= 2;

  // Antécédents digestifs présents mais non analysables (règles ou antécédents non chargés).
  const antecedentsIncomplete = antError
    || (!antRulesReady && patientAntecedents.some(a => classifyAntecedent(a) !== null));

  // Sprint 3b — Clé de l'ensemble analysé : médicaments du Vérificateur + traitements de
  // fond inclus. Tout changement (ajout/retrait, case décochée, traitement rechargé)
  // invalide le verdict : il devra être recalculé via « Analyser » (jamais de verdict périmé,
  // jamais d'ordonnance enregistrée sur une analyse qui ne correspond plus).
  const currentAnalysisKey = useMemo(() => {
    const meds = selectedMeds.map(m => m.id).sort().join(',');
    const fond = fondTraitements
      .filter(t => !fondExcluded.has(t.id))
      .map(t => fondMedId(t))
      .filter(id => !selectedMeds.some(m => m.id === id))
      .sort().join(',');
    // Sprint 4bc — antécédents analysés : toute modification invalide le verdict.
    const ant = patientAntecedents.map(a => `${a.id}:${a.updated_at}`).sort().join(',');
    // Sprint 4e-B — allergies (et type de réaction) : toute modification invalide le verdict.
    return `${meds}#${fond}#${ant}#${antRulesReady ? 1 : 0}#${allergySig}#${allergyRulesReady ? 1 : 0}#${dupRulesReady ? 1 : 0}`;
  }, [selectedMeds, fondTraitements, fondExcluded, patientAntecedents, antRulesReady, allergySig, allergyRulesReady, dupRulesReady]);
  // Sprint 4d — valide seulement si le verdict porte sur l'ensemble actuel ET sur le dernier run.
  const analysisValid = !!result && analyzedKey === currentAnalysisKey && result.runId === alertsRunId;
  useEffect(() => {
    if (result && (analyzedKey !== currentAnalysisKey || result.runId !== alertsRunId)) {
      setResult(null);
      verdictWantedRef.current = true;
    }
  }, [result, analyzedKey, currentAnalysisKey, alertsRunId]);

  // Real-time interaction check — DCI-based, pipe-pattern splitting, accent normalization
  // Sprint 3 — l'ensemble analysé = médicaments de la prescription en cours (selectedMeds)
  //            + traitements de fond actifs cochés (« Inclure dans l'analyse »).
  //            Chaque alerte porte son origine : nouveau / mixte / fond.
  useEffect(() => {
    if (selectedMeds.length === 0) { setInteractionAlerts([]); setMaskedAlerts([]); setAgeUnknownWarning(false); setMedVerifInfo(new Map()); setAnalysisPending(false); return; }

    // Normalize: strip accents, lowercase, remove non-alphanumeric
    const norm = (s: string) =>
      s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
       .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

    // ── Sprint 3 — Ensemble analysé ─────────────────────────────────────────
    // Un traitement de fond déjà présent dans selectedMeds (renouvelé) est traité comme
    // « nouveau » : il figurera sur l'ordonnance. Dédoublonnage par id.
    const newIds = new Set(selectedMeds.map(m => m.id));
    const fondMeds: CheckerMed[] = [];
    for (const t of fondTraitements) {
      if (fondExcluded.has(t.id)) continue;
      const id = fondMedId(t);
      if (newIds.has(id) || fondMeds.some(f => f.id === id)) continue;
      fondMeds.push({
        id,
        nom: fondDisplayName(t),
        dci: t.medicament?.dci ?? null,
        dci_canonique: t.medicament?.dci_canonique ?? null,
        manual: !t.medicament_id,
      });
    }
    const fondIdSet = new Set(fondMeds.map(m => m.id));
    const analysisMeds: CheckerMed[] = [...selectedMeds, ...fondMeds];
    const originOfMed = (id: string): 'nouveau' | 'fond' => (fondIdSet.has(id) ? 'fond' : 'nouveau');

    const medDCIs = analysisMeds.map(m => ({
      ...m,
      normalizedDCI:  norm(m.dci || ''),
      normalizedName: norm(m.nom),
      // Phase 2b — 3e source de matching (forme sel → INN canonique). '' si absent.
      normalizedCanonique: norm(m.dci_canonique || ''),
    }));

    let cancelled = false;
    setAnalysisPending(true);
    // Sprint 4d — nouveau run : l'ancien verdict et ses cartes disparaissent immédiatement.
    const runId = ++runSeqRef.current;
    verdictWantedRef.current = true;
    setAnalysisFailed(false);
    setResult(null);

    const runCheck = async () => {
      const alerts: InteractionAlert[] = [];
      const seen = new Set<string>();
      setNonVerifiables([]);
      // ── 1. Drug-drug interactions V2 (par UUID, ≥ 2 méds non-manuels) ────────
      // Les méds manuels sont exclus de l'appel V2 (pas d'UUID DB).
      // Ils sont explicitement listés dans le bandeau ambre, fusionnés avec les
      // medicaments_non_verifiables retournés par la RPC — jamais d'échec silencieux.
      const manualMeds = analysisMeds.filter(m => m.manual);
      const dbMeds = analysisMeds.filter(m => !m.manual);
      let rpcNonVerifiables: string[] = [];
      let medicamentsVerifiesNoms = new Set<string>();
      let interactionsForGuard: Array<{ medicament_a: string; medicament_b: string }> = [];

      // Sprint 3 — la RPC renvoie medicaments.nom (pas l'id ni le nom commercial affiché).
      // Correspondance nom base → ids pour classer chaque paire (nouveau / mixte / fond).
      // Requête filtrée par UUID, faite uniquement si un traitement de fond est analysé.
      const dbNomToIds = new Map<string, string[]>();
      const dbFondMeds = dbMeds.filter(m => fondIdSet.has(m.id));
      if (dbFondMeds.length > 0 && dbMeds.length >= 2) {
        const { data: nomRows } = await supabase
          .from('medicaments')
          .select('id, nom')
          .in('id', dbMeds.map(m => m.id));
        if (cancelled) return;
        for (const r of (nomRows as Array<{ id: string; nom: string }> | null) ?? []) {
          const list = dbNomToIds.get(r.nom) ?? [];
          list.push(r.id);
          dbNomToIds.set(r.nom, list);
        }
      }
      // Côté d'une paire : 'fond' seulement si TOUS les ids portant ce nom sont du fond.
      // Nom introuvable ou ambigu → 'nouveau' (jamais relégué à tort en « préexistant »).
      const sideOrigin = (dbNom: string): 'nouveau' | 'fond' => {
        const ids = dbNomToIds.get(dbNom);
        if (!ids || ids.length === 0) return 'nouveau';
        return ids.every(id => fondIdSet.has(id)) ? 'fond' : 'nouveau';
      };
      const pairOrigin = (a: string, b: string): InteractionAlert['origin'] => {
        if (fondIdSet.size === 0) return 'nouveau';
        const oa = sideOrigin(a), ob = sideOrigin(b);
        if (oa === 'fond' && ob === 'fond') return 'fond';
        if (oa === 'fond' || ob === 'fond') return 'mixte';
        return 'nouveau';
      };

      if (dbMeds.length >= 2) {
        try {
          const { data: v2Data } = await supabase.rpc(
            'check_interactions_v2',
            { p_med_ids: dbMeds.map(m => m.id) }
          );
          if (cancelled) return;
          if (v2Data) {
            const {
              interactions = [],
              medicaments_non_verifiables = [],
              medicaments_verifies = [],
            } = v2Data as {
              interactions: Array<{
                medicament_a: string; medicament_b: string;
                ingredient_a: string | null; ingredient_b: string | null;
                severite: string | null; description: string;
              }>;
              medicaments_verifies: string[];
              medicaments_non_verifiables: string[];
            };
            rpcNonVerifiables = medicaments_non_verifiables;
            medicamentsVerifiesNoms = new Set<string>(medicaments_verifies);
            interactionsForGuard = interactions;
            const ddDedup = new Map<string, InteractionAlert>();
            for (const inter of interactions) {
              const sev = (inter.severite as InteractionAlert['severite']) || 'non_classee';
              const pair = [inter.medicament_a, inter.medicament_b].sort().join('+');
              const key = `dd|${pair}|${sev}`;
              const molDesc = (inter.ingredient_a && inter.ingredient_b)
                ? `${inter.ingredient_a} × ${inter.ingredient_b} — ${inter.description}`
                : inter.description;
              const existing = ddDedup.get(key);
              if (!existing) {
                ddDedup.set(key, {
                  type: 'drug_drug',
                  severite: sev,
                  description: molDesc,
                  involved: [inter.medicament_a, inter.medicament_b],
                  origin: pairOrigin(inter.medicament_a, inter.medicament_b),
                });
              } else {
                existing.description = mergeDescriptions(existing.description, molDesc);
              }
            }
            for (const alert of ddDedup.values()) alerts.push(alert);
          }
        } catch (e) {
          console.error('[check_interactions_v2] error:', e);
        }
      }

      // ── 2-pre. Chargement ingrédients (tous méds DB) ─────────────────────
      // Une seule paire de requêtes filtrées par UUID — jamais de chargement de table complète.
      // Trois usages :
      //   • ingNamesByMedId   : fallback CI matching pour les méds sans DCI
      //   • medVerifInfoLocal : sans_interaction_documentee + source_verification (affichage + garde)
      //   • medIdsWithIngredients : détection non-vérifiable mono-méd (RPC non appelée)
      const ingNamesByMedId = new Map<string, string[]>();
      const medVerifInfoLocal = new Map<string, { hasSID: boolean; source: string | null }>();
      const medIdsWithIngredients = new Set<string>();
      const allDbMedIds = dbMeds.map(m => m.id);

      if (allDbMedIds.length > 0) {
        const { data: miRows } = await supabase
          .from('medicament_ingredients')
          .select('medicament_id, ingredient_id')
          .in('medicament_id', allDbMedIds);
        if (cancelled) return;

        if (miRows && (miRows as Array<{ medicament_id: string; ingredient_id: string }>).length > 0) {
          for (const mi of miRows as Array<{ medicament_id: string; ingredient_id: string }>) {
            medIdsWithIngredients.add(mi.medicament_id);
          }
          const ingIds = [...new Set((miRows as Array<{ ingredient_id: string }>).map(r => r.ingredient_id))];
          const { data: ingRows } = await supabase
            .from('ingredients')
            .select('id, name_en, sans_interaction_documentee, source_verification')
            .in('id', ingIds);
          if (cancelled) return;

          if (ingRows) {
            type IngRow = { id: string; name_en: string | null; sans_interaction_documentee: boolean | null; source_verification: string | null };
            const ingMap = new Map((ingRows as IngRow[]).map(i => [i.id, i]));

            for (const mi of miRows as Array<{ medicament_id: string; ingredient_id: string }>) {
              const ing = ingMap.get(mi.ingredient_id);
              if (!ing) continue;

              // Fallback CI matching — uniquement méds sans DCI
              const medEntry = medDCIs.find(m => m.id === mi.medicament_id);
              if (medEntry && !medEntry.manual && (!medEntry.dci || medEntry.dci.trim() === '')) {
                const nameNorm = norm(ing.name_en || '');
                if (nameNorm.length >= 3) {
                  const list = ingNamesByMedId.get(mi.medicament_id) ?? [];
                  list.push(nameNorm);
                  ingNamesByMedId.set(mi.medicament_id, list);
                }
              }

              // Verif info — sans_interaction_documentee prend priorité sur false/null
              if (ing.sans_interaction_documentee === true) {
                medVerifInfoLocal.set(mi.medicament_id, {
                  hasSID: true,
                  source: ing.source_verification ?? null,
                });
              } else if (!medVerifInfoLocal.has(mi.medicament_id)) {
                medVerifInfoLocal.set(mi.medicament_id, { hasSID: false, source: null });
              }
            }
          }
        }
      }
      // Sprint 4e-A — nom en base de chaque médicament (la RPC nomme ses paires par
      // medicaments.nom) : sert à fusionner un doublon avec l'interaction existante de la même
      // paire. Réutilise la correspondance déjà chargée ; sinon une requête filtrée par UUID.
      const dbNomById = new Map<string, string>();
      for (const [nom, ids] of dbNomToIds) for (const id of ids) dbNomById.set(id, nom);
      if (dbNomById.size === 0 && dbMeds.length >= 2 && dupRegles.length > 0) {
        const { data: nomRows } = await supabase
          .from('medicaments')
          .select('id, nom')
          .in('id', dbMeds.map(m => m.id));
        for (const r of (nomRows as Array<{ id: string; nom: string }> | null) ?? []) dbNomById.set(r.id, r.nom);
      }

      // Sprint 4d — run remplacé par un plus récent pendant les requêtes : il n'écrit rien.
      // (La suite de runCheck est synchrone : aucune annulation possible au milieu.)
      if (cancelled) return;
      setMedVerifInfo(medVerifInfoLocal);

      // ── Calcul des non-vérifiables ─────────────────────────────────────────
      // Sources cumulées sans doublon :
      //  1. RPC (multi-méd, ≥ 2)
      //  2. Mono-méd sans ingrédients (RPC non appelée)
      //  3. Garde anti-faux-vert (méd vérifié par RPC, ingrédients sans données)
      //  4. Médicaments manuels
      const nonVerifiablesList: string[] = [...rpcNonVerifiables];

      if (dbMeds.length < 2) {
        for (const med of dbMeds) {
          if (!medIdsWithIngredients.has(med.id) && !nonVerifiablesList.includes(med.nom)) {
            nonVerifiablesList.push(med.nom);
          }
        }
      }

      if (medicamentsVerifiesNoms.size > 0) {
        const medsInInteractionsNoms = new Set<string>();
        for (const inter of interactionsForGuard) {
          medsInInteractionsNoms.add(inter.medicament_a);
          medsInInteractionsNoms.add(inter.medicament_b);
        }
        for (const med of dbMeds) {
          if (!medicamentsVerifiesNoms.has(med.nom)) continue;
          if (nonVerifiablesList.includes(med.nom)) continue;
          const vi = medVerifInfoLocal.get(med.id);
          if (!vi) continue;
          if (vi.hasSID || medsInInteractionsNoms.has(med.nom)) continue;
          console.warn(
            `[guard-faux-vert] "${med.nom}" : ingrédient(s) mappé(s) sans règle ANSM/DDInter ni sans_interaction_documentee — potentiel faux vert, basculé en non vérifiable`
          );
          nonVerifiablesList.push(med.nom);
        }
      }

      for (const m of manualMeds) {
        if (!nonVerifiablesList.includes(m.nom)) nonVerifiablesList.push(m.nom);
      }
      // Sprint 3 — un traitement de fond non vérifiable est signalé comme tel.
      // (Noms de la prescription en cours inchangés : checkInteractions les compare à selectedMeds.)
      const fondOnlyNames = new Set<string>();
      for (const m of fondMeds) fondOnlyNames.add(m.nom);
      for (const [dbNom, ids] of dbNomToIds) if (ids.every(id => fondIdSet.has(id))) fondOnlyNames.add(dbNom);
      for (const m of selectedMeds) fondOnlyNames.delete(m.nom);
      setNonVerifiables(nonVerifiablesList.map(n => (fondOnlyNames.has(n) ? `${n} (traitement de fond)` : n)));

      // ── 2. Contraindications (runs even with 1 med, requires patient) ──────
      // Sprint 2 — contexte patient pour le filtrage par sexe et le bloc grossesse.
      const masked: MaskedAlert[] = [];
      const maskedSeen = new Set<string>();
      const patientSexe: 'M' | 'F' | null =
        selectedPatient?.sexe === 'M' || selectedPatient?.sexe === 'F' ? selectedPatient.sexe : null;
      const pathoNorms = (selectedPatient?.pathologies || []).map(p => norm(p));
      const hasGrossesse   = pathoNorms.some(p => p.includes('grossesse') || p.includes('enceinte'));
      const hasAllaitement = pathoNorms.some(p => p.includes('allait'));
      const pregnancyGuard = hasGrossesse || hasAllaitement;
      // 12 à 55 ans inclus ; date de naissance inconnue → bloc affiché (zéro fausse réassurance).
      const patientAgeMois = getAgeEnMois(selectedPatient?.date_naissance);
      const patientAgeAns = patientAgeMois === null ? null : Math.floor(patientAgeMois / 12);
      const childbearingAge = patientAgeAns === null || (patientAgeAns >= 12 && patientAgeAns <= 55);

      // Sprint 3 — tous les médicaments correspondant au motif (et plus seulement le premier) :
      // un même motif peut viser un nouveau médicament ET un traitement de fond.
      const matchMeds = (dciParts: string[]) => medDCIs.filter(m =>
        dciParts.some(dp =>
          m.normalizedDCI.includes(dp) ||
          m.normalizedName.includes(dp) ||
          (m.normalizedCanonique !== '' && m.normalizedCanonique.includes(dp)) ||
          (ingNamesByMedId.get(m.id)?.some(ing => ing.includes(dp)) ?? false)
        )
      );

      if (selectedPatient && allContraindications.length > 0) {
        // Volet 2 — Termes de test par condition patient.
        //   • normName : nom normalisé → matching SUBSTRING bidirectionnel (logique d'origine,
        //     inchangée → aucune régression sur les matchs existants).
        //   • synRegexes : synonymes (pathologies uniquement) normalisés, longueur ≥ 3,
        //     compilés en regex word-boundary \bsyn\b → matching ADDITIF strict.
        //     Le word-boundary neutralise "tension" ≠ "hypertension" (faux positif évité).
        //     Le synonyme étant déjà normalisé (alphanumérique + espaces), la regex est sûre.
        const buildTerm = (raw: string, synonyms: string[]) => ({
          normName: norm(raw),
          synRegexes: synonyms
            .map(s => norm(s))
            // ≥ 3 chars (garde les abréviations HTA/IRC/AVC) ET hors stop-list
            // (exclut les racines génériques mono-mot type "hypertension" / "insuffisance"
            // → anti faux-positif inter-organes).
            .filter(s => s.length >= 3 && !GENERIC_SYNONYM_STOPLIST.has(s))
            .map(s => new RegExp(`\\b${s}\\b`)),
        });

        const conditionTerms = [
          // Pathologies : nom + synonymes (via pathologySynonyms, fallback [] si absente)
          ...(selectedPatient.pathologies || []).map(p =>
            buildTerm(p, pathologySynonyms.get(p) ?? [])
          ),
          // Allergies : nom seul (pas de synonymes en base → comportement inchangé)
          ...(selectedPatient.allergies_medicaments || []).map(a => buildTerm(a, [])),
          ...(selectedPatient.allergies_alimentaires || []).map(a => buildTerm(a, [])),
        ];

        for (const contra of allContraindications) {
          // dci_pattern may be pipe-separated (OR): "amoxicilline|ampicilline|..."
          const dciParts = contra.dci_pattern.split('|').map(p => norm(p.trim())).filter(p => p.length > 2);
          const cv = norm(contra.condition_valeur);

          // Find which analysed meds match this dci pattern.
          // Phase 2b — normalizedCanonique en 3e source (résout les formes sel : Aspégic
          // "acétylsalicylate de lysine" → canonique "aspirine ..."). Additif, '' si absent.
          // Fallback ingrédients (4e source) — méds marocains avec dci null : on cherche
          // via medicament_ingredients → ingredients.name_en (chargé avant ce bloc).
          const matched = matchMeds(dciParts);
          if (matched.length === 0) continue;

          // Check patient has the contraindicated condition :
          //   nom → substring bidirectionnel + préfixe slice-14 (inchangé)
          //   synonymes → word-boundary uniquement (additif, anti faux-positif)
          const condMatch = conditionTerms.some(term => {
            const pc = term.normName;
            if (
              pc.includes(cv) || cv.includes(pc) ||
              (cv.length > 6 && pc.includes(cv.slice(0, Math.min(cv.length, 14))))
            ) return true;
            return term.synRegexes.some(re => re.test(cv));
          });

          for (const med of matched) {
            const key = `ci|${med.nom}|${contra.condition_valeur.slice(0, 30)}`;
            const alert: InteractionAlert = {
              type: 'contraindication',
              severite: contra.severite === 'absolue' ? 'contre_indication' : 'majeure',
              description: contra.description,
              involved: [med.nom],
              condition: contra.condition_valeur, // Volet 2 — libellé brut exact pour affichage
              origin: originOfMed(med.id),
            };
            const pushAlert = (a: InteractionAlert) => {
              if (seen.has(key)) return;
              seen.add(key);
              alerts.push(a);
            };
            // Masquée uniquement si la logique d'origine l'aurait affichée : on ne compte
            // que ce qui disparaît réellement de l'écran.
            const pushMasked = (reason: string) => {
              if (!condMatch || maskedSeen.has(key)) return;
              maskedSeen.add(key);
              masked.push({ alert, reason });
            };

            // ── Sprint 2 — filtrage par sexe / bloc grossesse ─────────────────
            const sexeCI = contra.sexe_applicable ?? null;

            // a. Sexe non applicable → masquée. Sexe patient inconnu → rien n'est masqué.
            //    Garde-fou : grossesse/allaitement en pathologie → jamais masquée.
            if (sexeCI && patientSexe && sexeCI !== patientSexe && !pregnancyGuard) {
              pushMasked(patientSexe === 'M' ? 'patient homme' : 'patiente femme');
              continue;
            }

            // b. Patiente + CI grossesse/allaitement/procréation : déclenchée sur le médicament seul.
            if (patientSexe === 'F' && sexeCI === 'F' && PREGNANCY_CTX_RE.test(cv)) {
              const firm =
                (hasGrossesse && /grossesse|enceinte/.test(cv)) ||
                (hasAllaitement && /allait/.test(cv));
              if (firm) pushAlert({ ...alert, pregnancyFirm: true });
              else if (childbearingAge) pushAlert({ ...alert, pregnancyContext: true });
              else pushMasked('patiente hors âge de procréation');
              continue;
            }

            // c. Logique d'origine (inchangée)
            if (!condMatch) continue;
            pushAlert(alert);
          }
        }
      }
      setMaskedAlerts(masked);

      // ── 3. DCI non identifiée — avertissement qualité de données ──────────
      // Sprint #3.0.7 — Ce n'est PAS une interaction clinique : c'est un signal
      // que le médicament marocain n'a pas de DCI mappée → on ne peut pas
      // chercher de contre-indications. Type 'info' + severite 'info' pour
      // un badge neutre non-anxiogène, distinct des vraies interactions mineures.
      for (const m of analysisMeds) {
        if (!m.dci || m.dci.trim() === '') {
          const key = `nodci|${m.nom}`;
          if (!seen.has(key)) {
            seen.add(key);
            alerts.push({
              type: 'info',
              severite: 'info',
              description: `Médicament marocain non rattaché à une DCI — vérification des contre-indications limitée pour "${m.nom}".`,
              involved: [m.nom],
              origin: originOfMed(m.id),
            });
          }
        }
      }

      // ── 2b. Contre-indications liées à l'âge ─────────────────────────────
      // Évaluées séparément du bloc condition/pathologie :
      // age_max_mois → CI si ageEnMois < seuil (ex. codéine < 144 mois = 12 ans)
      // age_min_mois → CI si ageEnMois > seuil (ex. AINS > 960 mois = 80 ans)
      // Si date_naissance absente : aucune alerte, mais avertissement discret.
      if (selectedPatient && allContraindications.length > 0) {
        const ageEnMois = getAgeEnMois(selectedPatient.date_naissance);
        let hasAgeCICandidate = false;

        for (const contra of allContraindications) {
          if (contra.age_max_mois == null && contra.age_min_mois == null) continue;

          const dciParts = contra.dci_pattern.split('|').map(p => norm(p.trim())).filter(p => p.length > 2);
          const matched = matchMeds(dciParts);
          if (matched.length === 0) continue;

          hasAgeCICandidate = true;
          if (ageEnMois === null) continue; // pas d'alerte si âge inconnu

          const triggered =
            (contra.age_max_mois != null && ageEnMois < contra.age_max_mois) ||
            (contra.age_min_mois != null && ageEnMois > contra.age_min_mois);
          if (!triggered) continue;

          const conditionLabel = (() => {
            const parts: string[] = [];
            if (contra.age_max_mois != null) {
              const ans = Math.round(contra.age_max_mois / 12);
              parts.push(`Moins de ${ans} an${ans > 1 ? 's' : ''}`);
            }
            if (contra.age_min_mois != null) {
              const ans = Math.round(contra.age_min_mois / 12);
              parts.push(`Plus de ${ans} ans`);
            }
            return parts.join(' / ');
          })();

          for (const med of matched) {
            const key = `age-ci|${med.nom}|${contra.dci_pattern}`;
            if (!seen.has(key)) {
              seen.add(key);
              alerts.push({
                type: 'contraindication',
                severite: contra.severite === 'absolue' ? 'contre_indication' : 'majeure',
                description: contra.description,
                involved: [med.nom],
                condition: conditionLabel,
                origin: originOfMed(med.id),
              });
            }
          }
        }

        setAgeUnknownWarning(hasAgeCICandidate && ageEnMois === null);
      } else {
        setAgeUnknownWarning(false);
      }

      // ── 4. Sprint 4bc — Canal antécédents (APPEL ADDITIONNEL) ────────────
      // Ne fait qu'AJOUTER des alertes : les blocs ci-dessus ne sont pas modifiés.
      // Même ensemble analysé (nouveau / renouvelé / fond) et mêmes sources de matching
      // (dci + nom + dci_canonique + ingrédients). Doublon avec une CI existante du même
      // thème et de sévérité ≥ → ligne « Également : antécédent de … » sur la carte existante.
      if (selectedPatient && patientAntecedents.length > 0 && antRegles.length > 0) {
        const antAlerts = evaluateAntecedents(
          analysisMeds.map(m => ({ id: m.id, nom: m.nom, dci: m.dci, dci_canonique: m.dci_canonique, ingredients: ingNamesByMedId.get(m.id) })),
          patientAntecedents,
          antRegles,
          antClasses,
        );
        const { standalone, alsoByIndex } = mergeWithExisting(alerts, antAlerts);
        for (const [idx, lines] of alsoByIndex) {
          alerts[idx] = { ...alerts[idx], also: [...(alerts[idx].also ?? []), ...lines] };
        }
        for (const aa of standalone) {
          const key = `ant|${aa.medId}|${aa.antecedentId}`;
          if (seen.has(key)) continue;
          seen.add(key);
          alerts.push({
            type: 'contraindication',
            severite: ANTECEDENT_SEVERITE[aa.severite],
            description: `${aa.titre}. Conduite à tenir : ${aa.conduite}`,
            involved: [aa.medNom],
            condition: `antécédent de ${aa.conditionLabel}`,
            origin: originOfMed(aa.medId),
            channel: 'antecedent',
            ruleSource: aa.source,
          });
        }
      }

      // ── 5. Sprint 4e-B — Canal allergies croisées (APPEL ADDITIONNEL) ────
      // Ne modifie aucun des blocs ci-dessus. L'allergie du patient est rattachée à une
      // famille (pénicillines, AINS…) et comparée à la famille de chaque médicament analysé.
      // Fusion avec une carte d'allergie existante du même médicament : la sévérité la plus
      // haute est toujours conservée.
      if (selectedPatient && patientAllergies.length > 0 && allergyRegles.length > 0) {
        const allergyAlerts = evaluateAllergies(
          analysisMeds.map(m => ({ id: m.id, nom: m.nom, dci: m.dci, dci_canonique: m.dci_canonique, ingredients: ingNamesByMedId.get(m.id) })),
          patientAllergies,
          allergyFamilles,
          allergyRegles,
        );
        const merged = mergeAllergyAlerts(alerts, allergyAlerts);
        for (const [idx, lines] of merged.alsoByIndex) {
          alerts[idx] = { ...alerts[idx], also: [...(alerts[idx].also ?? []), ...lines] };
        }
        // Cartes de la base absorbées par une alerte plus sévère du canal (indices décroissants).
        for (const idx of [...merged.absorbed].sort((a, b) => b - a)) alerts.splice(idx, 1);
        for (const aa of merged.standalone) {
          const key = `alg|${aa.medId}|${aa.allergie}`;
          if (seen.has(key)) continue;
          seen.add(key);
          alerts.push({
            type: 'contraindication',
            severite: ANTECEDENT_SEVERITE[aa.severite],
            description: `${aa.titre}. Conduite à tenir : ${aa.conduite}`,
            involved: [aa.medNom],
            condition: aa.conditionLabel,
            origin: originOfMed(aa.medId),
            channel: 'allergie',
            ruleSource: aa.source,
            also: aa.also,
          });
        }
      }

      // ── 6. Sprint 4e-A — Canal doublons thérapeutiques (APPEL ADDITIONNEL) ──
      // Ne modifie aucun des blocs ci-dessus ni la RPC. Même principe actif dans deux lignes
      // (associations fixes comprises) → majeure ; même classe à risque → attention.
      // Traitement de fond inclus. Fusion avec l'interaction existante de la même paire :
      // la sévérité la plus haute est toujours conservée.
      if (analysisMeds.length >= 2 && dupRegles.length > 0) {
        const dups = evaluateDuplicates(
          analysisMeds.map(m => ({
            id: m.id, nom: dbNomById.get(m.id) ?? m.nom, dci: m.dci, dci_canonique: m.dci_canonique,
            ingredients: ingNamesByMedId.get(m.id), manual: m.manual,
          })),
          dupClasses, dupSubstances, dupRegles,
        );
        const nomAffiche = new Map(analysisMeds.map(m => [m.id, m.nom]));
        const namesOf = (id: string) => [dbNomById.get(id), nomAffiche.get(id)].filter((x): x is string => !!x);
        const mergedDup = mergeDuplicateAlerts(alerts, dups, namesOf);
        for (const [idx, lines] of mergedDup.alsoByIndex) {
          alerts[idx] = { ...alerts[idx], also: [...(alerts[idx].also ?? []), ...lines] };
        }
        for (const idx of [...mergedDup.absorbed].sort((a, b) => b - a)) alerts.splice(idx, 1);
        for (const d of mergedDup.standalone) {
          const key = `dup|${[d.idA, d.idB].sort().join('|')}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const fa = fondIdSet.has(d.idA), fb = fondIdSet.has(d.idB);
          alerts.push({
            type: 'drug_drug',
            severite: d.severite === 'majeure' ? 'majeure' : 'moderee',
            description: duplicateDescription(d),
            involved: [d.nomA, d.nomB],
            origin: fa && fb ? 'fond' : (fa || fb) ? 'mixte' : 'nouveau',
            channel: 'doublon',
            ruleSource: d.source,
            also: d.also,
          });
        }
      }

      setInteractionAlerts(alerts);
      setAlertsRunId(runId);
      setAnalysisPending(false);
    };

    runCheck().catch(e => {
      console.error('[runCheck] error:', e);
      if (!cancelled) { setAnalysisPending(false); setAnalysisFailed(true); }
    });
    return () => { cancelled = true; };
  }, [selectedMeds, selectedPatient, allContraindications, pathologySynonyms, fondTraitements, fondExcluded, patientAntecedents, antRegles, antClasses, rerunTick, patientAllergies, allergyFamilles, allergyRegles, dupClasses, dupSubstances, dupRegles]);

  // ── Data loaders ─────────────────────────────────────────────────────────

  const loadPatients = async () => {
    if (!user) return;
    // Skeleton uniquement au premier chargement ; ensuite rafraîchissement silencieux.
    if (!patientsLoadedRef.current) setDataLoading(true);
    // Filtré par org_id → borné par la taille de l'organisation. fetchAllRows blinde
    // l'EXACTITUDE (plus de troncature silencieuse à 1000 pour une grosse clinique).
    //
    // DETTE TECHNIQUE PERF : charger tous les patients en mémoire reste acceptable jusqu'à
    // ~2000-3000. Au-delà, il faudra une vraie pagination/recherche côté UI (lazy-load,
    // recherche server-side) pour la performance d'affichage. On blinde l'exactitude
    // maintenant ; le refactor UI viendra quand une clinique réelle approchera ce volume.
    const data = await fetchAllRows<Patient>(
      (from, to) => supabase
        .from('patients').select('*').eq('org_id', user.org_id)
        .order('created_at', { ascending: false })
        .range(from, to),
      { label: 'loadPatients' },
    );
    setPatients(data);
    patientsLoadedRef.current = true;
    setDataLoading(false);
  };

  const loadInteractionDb = async () => {
    // Bug critique — la limite 1000 par défaut de Supabase tronquait le chargement
    // (1421 CI en base → seules 1000 chargées → ~30% des contre-indications muettes).
    // fetchAllRows pagine par .range() pour charger l'intégralité, robuste à la croissance.
    const allCI = await fetchAllRows<DbContraindication>(
      (from, to) => supabase.from('contraindications').select('*').range(from, to),
      { label: 'loadInteractionDb' },
    );
    setAllContraindications(allCI);
  };

  const loadStats = async () => {
    if (!user) return;
    // Sprint Quick Fixes A — Bug #1 : on attend doctorProfile pour éviter de filtrer
    // les requêtes ordonnances/interaction_logs sur user.id (auth UUID) au lieu de
    // doctorProfile.id (doctors PK) → résultats vides au premier render.
    // Le useEffect re-déclenche loadStats quand doctorProfile?.id change.
    if (!doctorProfile?.id) return;
    try {
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

      // Date locale (YYYY-MM-DD / HH:MM:SS) — toISOString() décalerait au fuseau UTC.
      const pad = (n: number) => String(n).padStart(2, '0');
      const todayLocal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:00`;

      // Fenêtres de lignes bornées : le total reste exact (count), les lignes servent
      // aux variations mensuelles et aux dernières alertes. Une seule requête ajoutée (RDV).
      const ORD_WINDOW = 300;
      const INT_WINDOW = 200;

      const [patientsRes, ordRes, thisMonthPats, lastMonthPats, interactionsRes, rdvRes] = await Promise.all([
        // Total patients for this org
        supabase.from('patients')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', user.org_id),
        // Ordonnances by this doctor — MUST use doctorProfile.id (doctors PK), NOT user.id (auth UUID)
        supabase.from('ordonnances')
          .select('created_at', { count: 'exact' })
          .eq('doctor_id', doctorProfile?.id || user.id)
          .order('created_at', { ascending: false })
          .limit(ORD_WINDOW),
        // Patients added this month
        supabase.from('patients')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', user.org_id)
          .gte('created_at', startOfThisMonth),
        // Patients added last month
        supabase.from('patients')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', user.org_id)
          .gte('created_at', startOfLastMonth)
          .lte('created_at', endOfLastMonth),
        // Interactions détectées (historique) + dernières lignes pour le bloc « Dernières alertes »
        supabase.from('interaction_logs')
          .select('id, patient_id, medicament_a, medicament_b, risk_level, timestamp', { count: 'exact' })
          .eq('doctor_id', doctorProfile?.id || user.id)
          // Sprint 3b — les confirmations « hors base » ne sont pas des interactions détectées
          .or('source.is.null,source.neq.hors_base_confirme')
          .order('timestamp', { ascending: false })
          .limit(INT_WINDOW),
        // Requête ajoutée : rendez-vous du jour (même périmètre org que l'Agenda)
        supabase.from('rendez_vous')
          .select('id, date, heure_debut, heure_fin, patient_nom, motif, type, statut')
          .eq('org_id', user.org_id)
          .eq('date', todayLocal)
          .order('heure_debut', { ascending: true })
          .limit(40),
      ]);

      // Comptes mensuels exacts uniquement si la fenêtre couvre tout le mois précédent.
      const lastMonthStart = new Date(startOfLastMonth).getTime();
      const thisMonthStart = new Date(startOfThisMonth).getTime();
      const monthly = (dates: string[], total: number) => {
        const times = dates.map(d => new Date(d).getTime());
        const covered = times.length >= total || (times.length > 0 && times[times.length - 1] < lastMonthStart);
        if (!covered) return { thisM: null, lastM: null, covered };
        return {
          thisM: times.filter(t => t >= thisMonthStart).length,
          lastM: times.filter(t => t >= lastMonthStart && t < thisMonthStart).length,
          covered,
        };
      };

      const ordRows = (ordRes.data ?? []) as Array<{ created_at: string }>;
      const ordM = monthly(ordRows.map(r => r.created_at), ordRes.count ?? 0);

      const intRows = (interactionsRes.data ?? []) as HomeAlert[];
      const intTotal = interactionsRes.count ?? 0;
      const intM = monthly(intRows.map(r => r.timestamp), intTotal);
      let graves: number | null = null;
      let gravesScope: HomeStats['gravesScope'] = null;
      if (intRows.length >= intTotal) {
        graves = intRows.filter(r => r.risk_level === 'dangerous').length;
        gravesScope = 'total';
      } else if (intM.covered) {
        graves = intRows.filter(r => r.risk_level === 'dangerous' && new Date(r.timestamp).getTime() >= thisMonthStart).length;
        gravesScope = 'month';
      }
      setRecentAlerts(intRows.slice(0, 5));

      const upcoming = ((rdvRes.data ?? []) as Array<HomeRdv & { statut: string | null }>)
        .filter(r => r.statut !== 'annule' && r.statut !== 'termine')
        .filter(r => (r.heure_fin ?? r.heure_debut) >= nowTime);
      setTodayRdvs(upcoming.slice(0, 5));
      setTodayRdvsRemaining(Math.max(0, upcoming.length - 5));

      const totalPatients  = patientsRes.count     ?? 0;
      const ordonnances    = ordRes.count           ?? 0;
      const thisMonth      = thisMonthPats.count    ?? 0;
      const lastMonth      = lastMonthPats.count    ?? 0;
      const interactions   = interactionsRes.count  ?? 0;

      // Evolution: % change in new patients month-over-month.
      // 9999 = sentinel meaning "new patients this month but zero last month" (no valid % baseline).
      const evolution = lastMonth > 0
        ? Math.min(999, Math.max(-100, Math.round(((thisMonth - lastMonth) / lastMonth) * 100)))
        : thisMonth > 0 ? 9999 : 0;

      // Masque l'évolution si compte < 60 jours OU masse critique insuffisante
      // (< 10 patients sur les 2 derniers mois → un -100% n'a pas de sens).
      // Sprint Quick Fixes A — Bug #3 : distinguer les 2 cas pour un libellé non-anxiogène
      // (nouveau cabinet vs. activité récente faible) au lieu de "Données insuffisantes".
      const doctorCreatedAt = doctorProfile?.created_at ? new Date(doctorProfile.created_at).getTime() : null;
      const accountAgeDays = doctorCreatedAt ? (Date.now() - doctorCreatedAt) / 86_400_000 : Infinity;
      const evolutionReason: 'new_account' | 'low_volume' | null =
        accountAgeDays < 60        ? 'new_account' :
        (thisMonth + lastMonth) < 10 ? 'low_volume' :
        null;
      const evolutionInsufficient = evolutionReason !== null;

      setStats({
        totalPatients, ordonnances, interactions,
        evolution, evolutionInsufficient, evolutionReason,
        patientsThisMonth: thisMonth, patientsLastMonth: lastMonth,
        ordThisMonth: ordM.thisM, ordLastMonth: ordM.lastM,
        intThisMonth: intM.thisM, intLastMonth: intM.lastM,
        graves, gravesScope,
      });
    } catch (err) {
      console.error('[DoctorDashboard] loadStats error:', err);
    } finally {
      setStatsLoaded(true);
    }
  };

  // Sprint 4d — seule la réponse de la DERNIÈRE frappe s'affiche (une réponse lente à « br »
  // ne remplace plus celle de « brufen »).
  const medSearchSeqRef = useRef(0);
  const searchMedications = async (term: string) => {
    const seq = ++medSearchSeqRef.current;
    setMedSearchForeign(null);
    if (term.length < 2) { setMedSearchResults([]); setMedSearchLoading(false); return; }
    setMedSearchLoading(true);
    // Sprint 4d-ter — recherche commune : équivalence mg ↔ g (SQL) + doublons masqués à l'affichage.
    const maRows = await searchMedicamentsMA(term, 15);
    if (seq !== medSearchSeqRef.current) return;
    setMedSearchResults(maRows);
    // Sprint 4d-bis — aucun résultat 🇲🇦 : les entrées hors Maroc sont proposées d'office.
    if (maRows.length === 0) await loadForeignMeds(term, seq);
    if (seq !== medSearchSeqRef.current) return;
    setMedSearchLoading(false);
  };

  /** Entrées hors Maroc (jamais mêlées aux 🇲🇦) : si aucun résultat 🇲🇦, ou à la demande. */
  const loadForeignMeds = async (term: string, seq: number = medSearchSeqRef.current) => {
    if (term.trim().length < 3) { setMedSearchForeign([]); return; }
    const { data, error } = await supabase.rpc('search_medicaments_hors_maroc', {
      search_term: term.trim(),
      limit_count: 10,
    });
    if (seq !== medSearchSeqRef.current) return;
    if (error) console.error('[OrdoSur] search_medicaments_hors_maroc error:', error);
    setMedSearchForeign((data as ForeignMed[]) || []);
  };

  const loadPatientOrdonnances = async (patientId: string) => {
    try {
      const { data, error } = await supabase.from('ordonnances')
        .select(`id, date, statut, doctor_id, created_at, ordonnance_lignes(id, medicament_nom, posologie, duree, instructions)`)
        .eq('patient_id', patientId).order('created_at', { ascending: false });
      // Patient changé entre-temps : la réponse ne le concerne plus.
      if (selectedPatientIdRef.current && selectedPatientIdRef.current !== patientId) return;
      if (error || !data || data.length === 0) { setPatientOrdonnances([]); setPatientOrdLoading(false); return; }

      const doctorIds = [...new Set(data.map((o: any) => o.doctor_id))].filter(Boolean);
      let doctorMap = new Map();
      if (doctorIds.length > 0) {
        const { data: doctorsData } = await supabase.from('doctors')
          .select('id, user_id, specialite').in('id', doctorIds);
        if (doctorsData) {
          const userIds = doctorsData.map((d: any) => d.user_id).filter(Boolean);
          const { data: profilesData } = await supabase.from('user_profiles')
            .select('user_id, prenom, nom').in('user_id', userIds);
          doctorsData.forEach((doctor: any) => {
            const profile = profilesData?.find((p: any) => p.user_id === doctor.user_id);
            doctorMap.set(doctor.id, { name: profile ? `Dr. ${profile.prenom} ${profile.nom}` : 'Dr. Médecin', specialty: doctor.specialite || '' });
          });
        }
      }

      setPatientOrdonnances(data.map((ord: any) => {
        const di = doctorMap.get(ord.doctor_id) || { name: 'Dr. Médecin', specialty: '' };
        return {
          ...ord,
          doctor_name: di.name,
          doctor_specialty: di.specialty,
          medications: (ord.ordonnance_lignes || []).map((l: any) => ({
            nom: l.medicament_nom, posologie: l.posologie || '', duree: l.duree || '', quantite: l.instructions || '',
          })),
        };
      }));
      setPatientOrdLoading(false);
    } catch { setPatientOrdonnances([]); setPatientOrdLoading(false); }
  };

  // Changement de patient (quelle que soit la vue) : la liste de l'ancien patient est vidée
  // tout de suite, puis celle du nouveau est chargée. Compteurs cohérents dès l'ouverture.
  useEffect(() => {
    const pid = selectedPatient?.id;
    setPatientOrdonnances([]);
    if (!pid) { setPatientOrdLoading(false); return; }
    setPatientOrdLoading(true);
    loadPatientOrdonnances(pid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatient?.id]);

  // ── Synchronisation entre vues (src/lib/dataSync.ts) ───────────────────────
  // Ordonnance enregistrée → compteurs/alertes de l'Accueil + ordonnances du profil patient.
  useDataSync(['ordonnances'], () => {
    loadStats();
    const pid = selectedPatientIdRef.current;
    if (pid) loadPatientOrdonnances(pid);
  }, { onFocus: false });
  // RDV créé/modifié/supprimé dans l'Agenda → « RDV du jour » de l'Accueil.
  useDataSync(['rendez_vous'], () => { loadStats(); }, { onFocus: false });

  // Retour sur l'Accueil (ou sur l'onglet du navigateur depuis l'Accueil) : compteurs et
  // RDV du jour rechargés (6 requêtes bornées). Le 1er affichage est déjà chargé au montage.
  const viewEffectMountedRef = useRef(false);
  useEffect(() => {
    if (!viewEffectMountedRef.current) { viewEffectMountedRef.current = true; return; }
    if (activeView === 'home') loadStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);
  useDataSync([], () => { if (activeView === 'home') loadStats(); });

  // ── Prescription save ─────────────────────────────────────────────────────

  /**
   * Enregistre l'ordonnance de l'aperçu. Résout `true` si elle est enregistrée (ou l'était
   * déjà : jamais de doublon), `false` sinon (un toast d'erreur a été affiché).
   * `keepPreview` : appelé par Imprimer / Télécharger PDF — l'aperçu reste ouvert.
   */
  const handleSaveOrdonnance = (opts?: { keepPreview?: boolean }): Promise<boolean> => {
    if (prescriptionOrdreNumber && savedOrdreNumberRef.current === prescriptionOrdreNumber) {
      return Promise.resolve(true);
    }
    if (savingOrdonnanceRef.current) return savingOrdonnanceRef.current;
    const p = saveOrdonnanceNow(opts?.keepPreview === true)
      .finally(() => { savingOrdonnanceRef.current = null; });
    savingOrdonnanceRef.current = p;
    return p;
  };

  const saveOrdonnanceNow = async (keepPreview: boolean): Promise<boolean> => {
    if (!user || !selectedPatient || !prescriptionData) {
      showToast("Ordonnance introuvable — rouvrez l'aperçu", 'error');
      return false;
    }

    // BUG FIX: doctor_id must be doctors.id (PK), NOT user.id (auth UUID).
    // The ordonnances table has a FK ordonnances.doctor_id → doctors.id,
    // and the RLS INSERT policy checks doctor_id = (SELECT doctors.id FROM doctors WHERE user_id = auth.uid()).
    const doctorId = doctorProfile?.id;
    if (!doctorId) {
      showToast('Profil médecin non chargé — rechargez la page', 'error');
      return false;
    }

    // Sprint 3b — Filet de sécurité : aucune ordonnance enregistrée si l'une de ses lignes
    // n'a pas été analysée sur la sélection actuelle, ou si des lignes hors base n'ont pas
    // été explicitement confirmées. Même calcul que le formulaire et l'aperçu.
    const verification = computeVerification(
      prescriptionData.medications ?? [], verifMeds, analysisValid, horsBaseConfirmedKey,
    );
    const blockMessage = verificationBlockMessage(verification);
    if (blockMessage) {
      showToast(`Enregistrement refusé — ${blockMessage}`, 'error');
      return false;
    }

    // Sprint 4d-quater — dosage absent de la fiche : à préciser avant tout enregistrement.
    const dosageBlock = dosageBlockMessage(prescriptionData.medications ?? []);
    if (dosageBlock) {
      showToast(`Enregistrement refusé — ${dosageBlock}`, 'error');
      return false;
    }

    // Sprint 4d-bis — posologie obligatoire sur chaque ligne (aucune valeur par défaut).
    const posologieBlock = posologieBlockMessage(prescriptionData.medications ?? []);
    if (posologieBlock) {
      showToast(`Enregistrement refusé — ${posologieBlock}`, 'error');
      return false;
    }

    // Sprint 4d — alerte de niveau maximal (CI absolue / interaction majeure) : le médecin
    // confirme explicitement, avec un motif (modale), pour CETTE version de l'ordonnance.
    // Alertes = celles du run d'analyse valide (garanti par le blocage ci-dessus).
    const derogAlerts = derogationAlerts((result?.alerts ?? interactionAlerts).filter(a => a.origin !== 'fond'));
    let derogation: DerogationConfirmation | null = null;
    if (derogAlerts.length > 0) {
      const signature = ordonnanceSignature(prescriptionData.medications ?? [], derogAlerts);
      derogation = isConfirmationValid(derogationConf, signature)
        ? derogationConf
        : await new Promise<DerogationConfirmation | null>(resolve => {
            derogationResolverRef.current = resolve;
            setDerogationRequest({ alerts: derogAlerts, signature });
          });
      if (!derogation) return false; // « Modifier l'ordonnance » : rien n'est enregistré ni imprimé
    }
    const derogationEntries = derogation ? buildDerogationEntries(derogAlerts, derogation) : null;

    const payload = {
      doctor_id:    doctorId,
      patient_id:   selectedPatient.id,
      org_id:       user.org_id,
      date:         new Date().toISOString(),
      statut:       'active',
      ordre_number: prescriptionOrdreNumber,
      motif:        prescriptionData.motif ?? null,
      remarques:    prescriptionData.remarks ?? null,
      prochain_rdv: prescriptionData.nextAppointment ?? null,
      // Sprint 4d — traçabilité des dérogations (jamais imprimée sur l'ordonnance).
      derogations:  derogationEntries,
    };

    console.log('[OrdoSur] Saving ordonnance payload:', payload);

    try {
      const { data: ordonnance, error: ordErr } = await supabase
        .from('ordonnances')
        .insert(payload)
        .select('id')
        .single();

      if (ordErr) {
        console.error('[OrdoSur] ordonnances insert error:', ordErr);
        throw ordErr;
      }

      console.log('[OrdoSur] Ordonnance inserted, id:', ordonnance.id);

      const lignes = (prescriptionData.medications ?? []).map((m: any) => ({
        ordonnance_id:  ordonnance.id,
        // Sprint 4d-quater — marque + dosage + forme (+ dosage précisé par le médecin)
        medicament_nom: ligneLabel(m),
        posologie:      m.posologie ?? '',
        duree:          m.duree ?? '',
        instructions:   m.quantite ? `Quantité: ${m.quantite}` : null,
      }));

      console.log('[OrdoSur] Inserting lignes:', lignes);

      if (lignes.length > 0) {
        const { error: lignesErr } = await supabase
          .from('ordonnance_lignes')
          .insert(lignes);
        if (lignesErr) {
          console.error('[OrdoSur] ordonnance_lignes insert error:', lignesErr);
          throw lignesErr;
        }
      }

      // ── Sprint #2.7 + #3.0.7 — Log detected interactions to interaction_logs
      // Inclus : interactions cliniques documentées (contre_indication, majeure,
      //          moderee, mineure réelle).
      // Exclus : 'non_classee' (sévérité non documentée à la source) et 'info'
      //          (avertissement qualité de données — DCI marocaine manquante).
      // Failure here MUST NOT invalidate the prescription, which is already
      // saved at this point — wrap in an isolated try/catch.
      try {
        // Sprint 3 — alertes préexistantes (traitement de fond seul) non journalisées :
        // elles ne concernent pas la prescription enregistrée.
        const loggableAlerts = (interactionAlerts || []).filter(
          a => a.severite !== 'non_classee' && a.severite !== 'info' && a.origin !== 'fond'
        );
        if (loggableAlerts.length > 0) {
          const severityToRisk: Record<
            InteractionAlert['severite'],
            'safe' | 'attention' | 'dangerous'
          > = {
            contre_indication: 'dangerous',
            a_evaluer:         'attention', // Sprint 4bc — antécédents
            majeure:           'dangerous',
            precaution:        'attention', // Sprint 4bc — antécédents
            moderee:           'attention',
            mineure:           'attention',
            non_classee:       'safe', // never logged (filtered above), but required for type completeness
            info:              'safe', // never logged (filtered above), but required for type completeness
          };
          const interactionRows = loggableAlerts.map(alert => ({
            doctor_id:    doctorId,
            patient_id:   selectedPatient.id,
            medicament_a: alert.involved[0],
            // Sprint 4bc — alerte d'antécédent : medicament_b = NULL (pas de 2e médicament).
            // contraindications only have 1 involved med — duplicate to satisfy NOT NULL
            medicament_b: (alert.channel === 'antecedent' || alert.channel === 'allergie')
              ? null : (alert.involved[1] ?? alert.involved[0]),
            risk_level:   severityToRisk[alert.severite],
            // Sprint 4e-B — alerte d'allergie croisée : source dédiée
            // Sprint 4e-A — doublon thérapeutique : source dédiée
            source:       alert.channel === 'doublon' ? 'doublon'
              : alert.channel === 'allergie' ? 'allergie'
              : alert.channel === 'antecedent' ? 'antecedent'
              : alert.origin === 'mixte' ? 'avec_traitement_fond' : 'nouveau',
          }));
          const { error: logErr } = await supabase
            .from('interaction_logs')
            .insert(interactionRows);
          if (logErr) {
            console.error('[OrdoSur] interaction_logs insert error (non-blocking):', logErr.message, logErr, interactionRows);
          } else {
            console.log('[OrdoSur] Logged', interactionRows.length, 'interaction(s) to interaction_logs');
          }
        }
      } catch (logErr) {
        console.error('[OrdoSur] interaction_logs logging failed (non-blocking):', logErr);
      }

      // Sprint 4d — Traçabilité des dérogations : 1 ligne interaction_logs par alerte confirmée.
      try {
        if (derogationEntries && derogationEntries.length > 0) {
          const dRows = derogAlerts.map(a => ({
            doctor_id:    doctorId,
            patient_id:   selectedPatient.id,
            medicament_a: a.involved[0],
            medicament_b: a.type === 'drug_drug' ? (a.involved[1] ?? null) : null,
            risk_level:   'dangerous',
            source:       'derogation',
          }));
          const { error: dErr } = await supabase.from('interaction_logs').insert(dRows);
          if (dErr) console.error('[OrdoSur] derogation log error (non-blocking):', dErr.message, dErr, dRows);
          else console.log('[OrdoSur] Logged', dRows.length, 'derogation(s) to interaction_logs');
        }
      } catch (dErr) {
        console.error('[OrdoSur] derogation logging failed (non-blocking):', dErr);
      }

      // Sprint 3b — Traçabilité de la confirmation « hors base » (1 ligne par médicament).
      try {
        if (verification.horsBase.length > 0) {
          const hbRows = verification.horsBase.map(l => ({
            doctor_id:    doctorId,
            patient_id:   selectedPatient.id,
            medicament_a: l.nom.trim(),
            medicament_b: null,
            risk_level:   'attention',
            source:       'hors_base_confirme',
          }));
          const { error: hbErr } = await supabase.from('interaction_logs').insert(hbRows);
          if (hbErr) {
            console.error('[OrdoSur] hors_base_confirme log error (non-blocking):', hbErr.message, hbErr, hbRows);
          } else {
            console.log('[OrdoSur] Logged', hbRows.length, 'hors_base_confirme line(s) to interaction_logs');
          }
        }
      } catch (hbErr) {
        console.error('[OrdoSur] hors_base_confirme logging failed (non-blocking):', hbErr);
      }

      savedOrdreNumberRef.current = prescriptionOrdreNumber;
      setDerogationConf(null);
      setSavedOrdreNumber(prescriptionOrdreNumber);
      showToast('Ordonnance enregistrée avec succès', 'success');
      setHorsBaseConfirmedKey(null);
      if (!keepPreview) {
        setShowPrescriptionPreview(false);
        setPrescriptionData(null);
      }
      discardOrdonnanceDraft();
      // Vues abonnées : liste Ordonnances, compteurs de l'Accueil, profil patient.
      notifyDataChanged('ordonnances');
      return true;

    } catch (e: any) {
      console.error('[OrdoSur] handleSaveOrdonnance error:', e);
      showToast(e?.message || "Erreur lors de l'enregistrement de l'ordonnance", 'error');
      return false;
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleSavePatient = async (patientData: Omit<Patient, 'id' | 'org_id' | 'created_at'>) => {
    if (!user) return;
    try {
      if (editingPatient) {
        const { error } = await supabase.from('patients').update(patientData).eq('id', editingPatient.id);
        if (error) throw error;
        // BUG 1+2 FIX: optimistic update — instantly reflect changes in list + detail panel
        const updated: Patient = { ...editingPatient, ...patientData };
        setPatients(prev => prev.map(p => p.id === editingPatient.id ? updated : p));
        if (selectedPatient?.id === editingPatient.id) setSelectedPatient(updated);
        showToast('Patient mis à jour avec succès', 'success');
      } else {
        const { data, error } = await supabase
          .from('patients').insert({ ...patientData, org_id: user.org_id }).select().single();
        if (error) throw error;
        if (data) setPatients(prev => [data, ...prev]);
        showToast('Patient ajouté', 'success');
      }
      setShowPatientModal(false);
      setEditingPatient(null);
      loadStats();
    } catch (e: any) {
      showToast(e?.message || 'Erreur lors de la sauvegarde', 'error');
    }
  };

  // Sprint 4 — mise à jour ciblée depuis le profil (dates des pathologies, ajout explicite
  // d'un antécédent actif aux pathologies chroniques). L'écriture est déjà faite en base.
  const handlePatientPatched = (patientId: string, patch: PatientPatch) => {
    setPatients(prev => prev.map(p => (p.id === patientId ? { ...p, ...patch } : p)));
    setSelectedPatient(prev => (prev && prev.id === patientId ? { ...prev, ...patch } : prev));
  };

  const handleDeletePatient = async (patientId: string) => {
    setDeletePatientLoading(true);
    try {
      const { error } = await supabase.rpc('delete_patient_complet', { p_patient_id: patientId });
      if (error) throw error;
      setPatients(prev => prev.filter(p => p.id !== patientId));
      if (selectedPatient?.id === patientId) setSelectedPatient(null);
      showToast('Patient supprimé', 'info');
      loadStats();
      setConfirmDeletePatient(null);
    } catch (e: any) {
      showToast(e?.message || 'Erreur lors de la suppression', 'error');
    } finally {
      setDeletePatientLoading(false);
    }
  };

  const handleLogout = async () => { await signOut(); navigate('/'); };

  const addMedication = (med: Medicament) => {
    if (!selectedMeds.some(m => m.id === med.id))
      // Phase 2b — transporte dci_canonique (3e source de matching). NULL pour la
      // plupart des médicaments → comportement inchangé.
      setSelectedMeds([...selectedMeds, {
        id: med.id, nom: med.nom_commercial || med.nom, dci: med.dci, dci_canonique: med.dci_canonique ?? null,
        // Sprint 4d-bis — forme galénique réelle (déduction de l'unité de prise dans l'ordonnance)
        formeHint: `${med.forme ?? ''} ${med.nom ?? ''}`.trim() || null,
        // Sprint 4d-quater — libellé de la ligne d'ordonnance : marque + dosage + forme
        label: medLabel(med) || null,
        dosageManquant: dosageManquant(med),
      }]);
    setMedSearchTerm(''); setMedSearchResults([]); setMedSearchForeign(null); setShowMedDropdown(false);
  };

  const addManualMedication = (nom: string) => {
    const trimmed = nom.trim();
    if (!trimmed) return;
    const id = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setSelectedMeds(prev => [...prev, { id, nom: trimmed, dci: null, manual: true }]);
    setMedSearchTerm(''); setMedSearchResults([]); setShowMedDropdown(false);
  };

  const removeMedication = (medId: string) => setSelectedMeds(selectedMeds.filter(m => m.id !== medId));

  // Sprint 3 — Traitement de fond dans le Vérificateur
  const toggleFond = (traitementId: string) => {
    setFondExcluded(prev => {
      const next = new Set(prev);
      if (next.has(traitementId)) next.delete(traitementId); else next.add(traitementId);
      return next;
    });
  };

  /** « Renouveler » : le traitement devient une ligne de l'ordonnance (analysé comme nouveau). */
  const renewFond = (t: TraitementChronique) => {
    const id = fondMedId(t);
    setSelectedMeds(prev => prev.some(m => m.id === id) ? prev : [
      ...prev,
      t.medicament
        ? {
            id, nom: fondDisplayName(t), dci: t.medicament.dci ?? null, dci_canonique: t.medicament.dci_canonique ?? null,
            // Sprint 4d-quater — la ligne renouvelée porte marque + dosage + forme
            label: medLabel(t.medicament) || null,
            dosageManquant: dosageManquant(t.medicament),
            formeHint: `${t.medicament.forme ?? ''} ${t.medicament.nom ?? ''}`.trim() || null,
          }
        : { id, nom: t.medicament_nom, dci: null, manual: true },
    ]);
    setResult(null);
  };

  /**
   * Sprint 3 — « Relancer la vérification » depuis le formulaire d'ordonnance : les lignes
   * ajoutées ou renommées dans le formulaire sont renvoyées au Vérificateur (saisie libre →
   * médicament manuel : CI par nom, non vérifiable méd×méd, jamais de vert plein), le
   * verdict est invalidé et le formulaire se rouvre après la nouvelle analyse.
   */
  const handleVerifyFormAdditions = (lines: UncheckedLine[], removedIds: string[] = []) => {
    const draft = formDraftRef.current;
    // Médicaments analysés retirés de l'ordonnance : retirés aussi de l'analyse.
    let nextSel = selectedMeds.filter(m => !removedIds.includes(m.id));
    const lineIdMap = new Map<string, string | null>(); // id ligne → nouvel id Vérificateur (null = doublon supprimé)
    for (const { line, replacesCheckerId } of lines) {
      const nom = line.nom.trim();
      if (!nom) continue;
      if (replacesCheckerId) nextSel = nextSel.filter(m => m.id !== replacesCheckerId);
      // Sprint 3b — ligne reliée à la base (autocomplete) : analysée comme un médicament
      // du Vérificateur (UUID → RPC interactions + CI par DCI / dci_canonique).
      const med = line.medicament;
      const existing = med
        ? nextSel.find(m => m.id === med.id)
        : nextSel.find(m => normalizeDrugName(displayNom(m)) === normalizeDrugName(nom));
      if (existing) { lineIdMap.set(line.id, null); continue; }
      if (med) {
        nextSel.push({
          id: med.id, nom: med.nom_commercial || med.nom, label: nom,
          dci: med.dci ?? null, dci_canonique: med.dci_canonique ?? null,
          formeHint: line.formeHint ?? null, dosageManquant: !!line.dosageAPreciser,
        });
        lineIdMap.set(line.id, med.id);
        continue;
      }
      // Saisie libre → médicament manuel : CI par nom, non vérifiable méd×méd.
      const id = `manual_form_${line.id.replace(/^chk-/, '')}`;
      nextSel.push({ id, nom, dci: null, manual: true });
      lineIdMap.set(line.id, id);
    }
    if (draft) {
      formDraftRef.current = {
        ...draft,
        medications: draft.medications.flatMap(m => {
          if (!lineIdMap.has(m.id)) return [m];
          const newId = lineIdMap.get(m.id);
          return newId ? [{ ...m, id: `chk-${newId}`, addedInForm: false, medicament: null, horsBase: false }] : [];
        }),
      };
    }
    setSelectedMeds(nextSel);
    setResult(null);
    reopenFormAfterCheckRef.current = true;
    setShowPrescriptionForm(false);
    setActiveView('checker');
    scheduleDraftSave();
    showToast('Médicaments ajoutés à l\'analyse — vérification relancée automatiquement', 'info');
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  };

  // ── Sprint 4d — Analyse automatique ──────────────────────────────────────
  // À chaque changement de médicaments, de cases du traitement de fond, d'antécédents ou
  // de patient (clé d'analyse), après ~400 ms : rechargement du fond et des antécédents,
  // puis verdict sur le run complet le plus récent. Aucune journalisation ici (uniquement
  // à l'enregistrement de l'ordonnance).
  useEffect(() => {
    const pid = selectedPatient?.id;
    if (!pid || selectedMeds.length === 0) return;
    setResult(null);
    verdictWantedRef.current = true;
    refreshingRef.current = true;
    const timer = window.setTimeout(async () => {
      const [fondStatus, antStatus] = await Promise.all([refreshFond(pid), refreshAntecedents(pid)]);
      if (selectedPatientIdRef.current !== pid) return;
      refreshingRef.current = false;
      if (fondStatus === 'changed') showToast('Traitement de fond mis à jour — analyse relancée', 'info');
      else if (antStatus === 'changed') showToast('Antécédents mis à jour — analyse relancée', 'info');
      // Liste modifiée → runCheck repart (nouveau run) ; le verdict l'attendra.
      setVerdictTick(t => t + 1);
    }, 400);
    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAnalysisKey, selectedPatient?.id, selectedMeds.length, rerunTick]);

  // Verdict : uniquement quand le run le plus récent est terminé et que le rechargement
  // du fond / des antécédents est fait. Calcul synchrone sur l'état de CE rendu.
  const computeVerdictRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!verdictWantedRef.current || refreshingRef.current || analysisPending || analysisFailed) return;
    if (alertsRunId !== runSeqRef.current) return;
    if (!selectedPatient || selectedMeds.length === 0) return;
    verdictWantedRef.current = false;
    computeVerdictRef.current();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verdictTick, analysisPending, alertsRunId, analysisFailed, result]);

  // Sprint 4d-bis — dérivé de analysisValid (calculé pendant le rendu) : dès que la sélection
  // change, le verdict précédent disparaît dans le MÊME rendu (plus de flash d'anciennes cartes).
  const analysisRunning = !!selectedPatient && selectedMeds.length > 0 && !analysisValid && !analysisFailed;

  /** « Relancer l'analyse » : run complet forcé (RPC + rechargements + verdict). */
  const rerunAnalysis = () => {
    if (selectedMeds.length < 1) { showToast('Sélectionnez au moins 1 médicament', 'error'); return; }
    if (!selectedPatient) { showToast('Sélectionnez un patient pour analyser les contre-indications', 'error'); return; }
    setRerunTick(t => t + 1);
  };

  computeVerdictRef.current = () => {
    // Échecs de chargement : état de ce rendu (rechargés juste avant le verdict).
    const fondFailed = fondError;
    const antIncomplete = antecedentsIncomplete;

    let overallSeverity: InteractionResult['severity'] = 'safe';
    const reasons: string[] = [];

    // Doublons — uniquement si ≥ 2 médicaments
    if (selectedMeds.length >= 2) {
      for (let i = 0; i < selectedMeds.length; i++) {
        for (let j = i + 1; j < selectedMeds.length; j++) {
          if (selectedMeds[i].nom === selectedMeds[j].nom) {
            overallSeverity = 'dangerous';
            reasons.push(`DUPLICATION : ${selectedMeds[i].nom} prescrit en double — risque de surdosage`);
          }
        }
      }
    }

    // Sprint 2 — Le bloc conditionnel (grossesse/allaitement/procréation) ne rend pas la
    // prescription « à risque » à lui seul, mais interdit tout verdict vert : seul, il donne
    // « Sécuritaire sous réserve » ; avec une alerte ferme, l'alerte ferme l'emporte.
    // Sprint 3 — Le verdict est piloté par les alertes impliquant au moins un nouveau
    // médicament (origine 'nouveau' ou 'mixte'). Les alertes préexistantes (fond seul)
    // interdisent tout vert plein : seules, elles donnent « Sécuritaire sous réserve ».
    const currentAlerts = interactionAlerts.filter(a => a.origin !== 'fond');
    const preexistingCount = dedupClinicalAlerts(interactionAlerts.filter(a => a.origin === 'fond')).length;
    const firmAlerts = currentAlerts.filter(a => !a.pregnancyContext);
    const pregnancyCtxCount = currentAlerts.length - firmAlerts.length;

    for (const alert of firmAlerts) {
      if (alert.severite === 'contre_indication') overallSeverity = 'dangerous';
      else if (alert.severite === 'majeure' && overallSeverity !== 'dangerous') overallSeverity = 'attention';
      else if (alert.severite === 'moderee' && overallSeverity === 'safe') overallSeverity = 'attention';
      // Sprint 4bc — « À évaluer » et « Précaution » (antécédents) : alertes réelles, jamais de vert.
      else if ((alert.severite === 'a_evaluer' || alert.severite === 'precaution') && overallSeverity !== 'dangerous') overallSeverity = 'attention';
      // Volet 2 — pour les CI, afficher la condition_valeur exacte entre le médicament
      // et la description (contexte médical : "HTA sévère non contrôlée" vs juste "Hypertension").
      const prefix = alert.type === 'contraindication'
        ? `${alert.channel === 'antecedent' ? 'Antécédent' : alert.channel === 'allergie' ? 'Allergie' : 'Contre-indication patient'} (${alert.involved[0]})${alert.condition ? ` — Condition : ${alert.condition}` : ''}`
        : alert.involved.join(' + ');
      reasons.push(`${getSeveriteLabel(alert.severite)} — ${prefix} : ${alert.description}`);
    }

    const nbCI = firmAlerts.filter(a => a.severite === 'contre_indication').length;
    // Sprint #3.0.8 — Compte TOUTES les vraies interactions cliniques (exclut non_classee + info)
    // pour que "X interaction(s) signalée(s)" corresponde exactement au nombre de cards affichées.
    const clinicalSeverities: InteractionAlert['severite'][] = ['contre_indication', 'a_evaluer', 'majeure', 'precaution', 'moderee', 'mineure'];
    const nbSignaled = firmAlerts.filter(a => clinicalSeverities.includes(a.severite)).length;
    const pregnancyOnly = overallSeverity === 'safe' && pregnancyCtxCount > 0 && nbSignaled === 0;
    if (pregnancyOnly) overallSeverity = 'conditional';
    // Alerte ferme mineure + bloc conditionnel : jamais de vert.
    else if (overallSeverity === 'safe' && pregnancyCtxCount > 0) overallSeverity = 'attention';
    // Sprint 3 — seules des alertes préexistantes : « Sécuritaire sous réserve », jamais vert.
    const preexistingOnly = overallSeverity === 'safe' && preexistingCount > 0;
    if (preexistingOnly) overallSeverity = 'conditional';
    // Sprint 3 — traitement de fond non chargé : vérification croisée non faite → jamais vert.
    const fondUnavailable = overallSeverity === 'safe' && fondFailed;
    if (fondUnavailable) overallSeverity = 'conditional';
    // Sprint 4bc — antécédents (ou leurs règles) non chargés : analyse incomplète → jamais vert.
    const antUnavailable = overallSeverity === 'safe' && antIncomplete;
    if (antUnavailable) overallSeverity = 'conditional';
    // Sprint 4e-B — règles d'allergies non chargées chez un patient allergique : jamais vert.
    const allergyUnavailable = overallSeverity === 'safe' && allergiesIncomplete;
    if (allergyUnavailable) overallSeverity = 'conditional';
    // Sprint 4e-A — règles de doublons non chargées avec au moins 2 médicaments : jamais vert.
    const doublonUnavailable = overallSeverity === 'safe' && doublonsIncomplete;
    if (doublonUnavailable) overallSeverity = 'conditional';

    // Source unique de vérité : même nonVerifiables que le panneau temps réel.
    // allNonVerifiable → pas de bandeau vert, severity forcée à 'attention'.
    // someNonVerifiable → bandeau vert restreint avec avertissement explicite.
    const allNonVerifiable = selectedMeds.length > 0 && selectedMeds.every(m => nonVerifiables.includes(m.nom));
    const someNonVerifiable = !allNonVerifiable && nonVerifiables.length > 0;
    if (allNonVerifiable) overallSeverity = 'attention';

    const resultTitle: string | undefined = allNonVerifiable
      ? '⚠ Vérification impossible'
      : someNonVerifiable && overallSeverity === 'safe'
        ? 'Résultat partiel — médicaments vérifiés uniquement'
        : undefined;

    const preexistingLabel = `Alertes préexistantes dans le traitement de fond (${preexistingCount})`;
    const baseDescription =
      overallSeverity === 'dangerous'
        ? `${nbCI} contre-indication(s) détectée(s) — Prescription à risque élevé`
        : allNonVerifiable
          ? `Aucun des médicaments sélectionnés ne permet la vérification automatique des interactions — vérifiez manuellement`
          : pregnancyOnly
            ? `Aucune alerte, sauf en cas de grossesse ou d'allaitement (${pregnancyCtxCount} CI)`
          : preexistingOnly
            ? preexistingLabel
          : fondUnavailable
            ? 'Traitement de fond non chargé — analyse incomplète'
          : antUnavailable
            ? 'Antécédents non chargés — analyse incomplète'
          : allergyUnavailable
            ? 'Allergies croisées non analysées — analyse incomplète'
          : doublonUnavailable
            ? 'Doublons thérapeutiques non analysés — analyse incomplète'
          : overallSeverity === 'attention'
            ? `${nbSignaled} interaction(s) signalée(s) — Précautions requises`
            : reasons.length > 0
              ? reasons[0]
              : someNonVerifiable
                ? `✓ Aucune interaction documentée entre les médicaments vérifiés · ${nonVerifiables.length} médicament${nonVerifiables.length > 1 ? 's' : ''} non vérifiable${nonVerifiables.length > 1 ? 's' : ''} non évalué${nonVerifiables.length > 1 ? 's' : ''}`
                : selectedMeds.length === 1
                  ? `✓ Aucune contre-indication documentée pour ${selectedMeds[0].nom} avec le profil de ce patient`
                  : `✓ Aucune interaction documentée entre les médicaments vérifiés`;
    // Les alertes préexistantes sont toujours mentionnées dans le bandeau, quel que soit le verdict.
    const withPreexisting = preexistingCount > 0 && !preexistingOnly
      ? `${baseDescription} · ${preexistingLabel}`
      : baseDescription;
    // Échec du rechargement du fond : toujours signalé, quel que soit le verdict.
    const withFond = fondFailed && !fondUnavailable
      ? `${withPreexisting} · Traitement de fond non chargé — analyse incomplète`
      : withPreexisting;
    // Échec du chargement des antécédents : toujours signalé, quel que soit le verdict.
    const withAnt = antIncomplete && !antUnavailable
      ? `${withFond} · Antécédents non chargés — analyse incomplète`
      : withFond;
    // Règles d'allergies non chargées : toujours signalé, quel que soit le verdict.
    const withAllergy = allergiesIncomplete && !allergyUnavailable
      ? `${withAnt} · Allergies croisées non analysées — analyse incomplète`
      : withAnt;
    // Règles de doublons non chargées : toujours signalé, quel que soit le verdict.
    const description = doublonsIncomplete && !doublonUnavailable
      ? `${withAllergy} · Doublons thérapeutiques non analysés — analyse incomplète`
      : withAllergy;

    setAnalyzedKey(currentAnalysisKey);
    setResult({
      severity: overallSeverity, title: resultTitle, description, alternatives: [], reasons, medications: [], patientPrecautions: [],
      // Instantané du run : les cartes affichées sont exactement celles du verdict.
      runId: alertsRunId, alerts: interactionAlerts, masked: maskedAlerts, nonVerifiables, ageUnknown: ageUnknownWarning,
    });
  };

  const resetAnalysis = () => {
    verdictWantedRef.current = false;
    formDraftRef.current = null;
    setSelectedMeds([]); setMedSearchTerm(''); setInteractionAlerts([]); setResult(null); setNonVerifiables([]); setMedVerifInfo(new Map());
  };

  // ── Brouillon d'ordonnance (sessionStorage, 1 clé par médecin + patient) ────
  // Persisté : patient, médicaments du Vérificateur, saisie du formulaire.
  // JAMAIS persisté : le verdict d'analyse (result) ni les alertes — recalculés.
  const formDraftRef = useRef<DraftForm | null>(null);
  const draftRestoreDoneRef = useRef(false);
  const draftTimerRef = useRef<number | null>(null);
  const prevDraftPatientIdRef = useRef<string | null>(null);
  const reopenFormAfterCheckRef = useRef(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);
  const draftStateRef = useRef({ doctorId: null as string | null, patientId: null as string | null, selectedMeds, formOpen: false });
  draftStateRef.current = {
    doctorId: doctorProfile?.id ?? null,
    patientId: selectedPatient?.id ?? null,
    selectedMeds,
    formOpen: showPrescriptionForm || showPrescriptionPreview,
  };

  const flushDraft = useCallback(() => {
    if (draftTimerRef.current !== null) { window.clearTimeout(draftTimerRef.current); draftTimerRef.current = null; }
    const st = draftStateRef.current;
    if (!draftRestoreDoneRef.current || !st.doctorId || !st.patientId) return;
    // Sprint 4d-quater — un brouillon enregistré attend la décision du médecin (Reprendre /
    // Supprimer) : l'état en cours ne l'écrase pas.
    if (pendingDraftRef.current?.patientId === st.patientId) return;
    saveDraft({
      doctorId: st.doctorId,
      patientId: st.patientId,
      selectedMeds: st.selectedMeds.map(m => ({
        id: m.id, nom: m.nom, dci: m.dci ?? null, dci_canonique: m.dci_canonique ?? null, manual: m.manual,
        label: m.label ?? null, formeHint: m.formeHint ?? null, dosageManquant: m.dosageManquant,
      })),
      form: formDraftRef.current,
      formOpen: st.formOpen,
    });
  }, []);

  const scheduleDraftSave = useCallback(() => {
    if (draftTimerRef.current !== null) window.clearTimeout(draftTimerRef.current);
    draftTimerRef.current = window.setTimeout(flushDraft, 500);
  }, [flushDraft]);

  useEffect(() => {
    scheduleDraftSave();
  }, [selectedPatient?.id, selectedMeds, showPrescriptionForm, showPrescriptionPreview, scheduleDraftSave]);

  // F5 pendant le debounce : on écrit immédiatement. Démontage (déconnexion) : on annule.
  useEffect(() => {
    window.addEventListener('pagehide', flushDraft);
    return () => {
      window.removeEventListener('pagehide', flushDraft);
      if (draftTimerRef.current !== null) window.clearTimeout(draftTimerRef.current);
    };
  }, [flushDraft]);

  // Sprint 4d-quater — Changement OU désélection de patient : la saisie en mémoire ne suit
  // jamais (c'était l'origine du « brouillon fantôme » : après une désélection, le formulaire
  // resté « ouvert » se remontait avec l'ancienne saisie). Le formulaire est fermé, et le
  // brouillon ENREGISTRÉ du nouveau patient est seulement PROPOSÉ (bandeau), jamais appliqué.
  const [pendingDraft, setPendingDraft] = useState<OrdonnanceDraft | null>(null);
  const pendingDraftRef = useRef<OrdonnanceDraft | null>(null);
  pendingDraftRef.current = pendingDraft;
  useEffect(() => {
    const next = selectedPatient?.id ?? null;
    const prev = prevDraftPatientIdRef.current;
    if (next === prev) return;
    prevDraftPatientIdRef.current = next;
    formDraftRef.current = null;
    setHorsBaseConfirmedKey(null);
    reopenFormAfterCheckRef.current = false;
    setDraftRestored(false);
    setShowPrescriptionForm(false);
    setShowPrescriptionPreview(false);
    setFormResetKey(k => k + 1);
    if (next === null || !doctorProfile?.id) return;
    const stored = loadDraft(doctorProfile.id, next);
    setPendingDraft(isDraftWorthOffering(stored) ? stored : null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatient?.id]);

  // Au chargement : le dernier brouillon est PROPOSÉ (bandeau du Vérificateur), jamais
  // restauré d'office — ni patient sélectionné, ni formulaire rouvert.
  useEffect(() => {
    if (draftRestoreDoneRef.current) return;
    const doctorId = doctorProfile?.id;
    if (!doctorId || dataLoading) return;
    draftRestoreDoneRef.current = true;
    const pid = getActiveDraftPatientId(doctorId);
    if (!pid) return;
    const draft = loadDraft(doctorId, pid);
    const patient = draft ? patients.find(p => p.id === pid) : undefined;
    if (!isDraftWorthOffering(draft) || !patient) { clearDraft(doctorId, pid); return; }
    if (!selectedPatientIdRef.current || selectedPatientIdRef.current === pid) setPendingDraft(draft);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorProfile?.id, dataLoading, patients]);

  const pendingDraftPatient = pendingDraft ? patients.find(p => p.id === pendingDraft.patientId) ?? null : null;
  // Proposition face à l'état actuel : une sélection différente n'est jamais écrasée.
  const draftOffer = evaluateDraftOffer(pendingDraft, selectedPatient?.id ?? null, selectedMeds);

  /** « Reprendre » : applique le brouillon ; l'analyse repart, le formulaire se rouvre après le verdict. */
  const resumePendingDraft = () => {
    const d = pendingDraft;
    if (!d || !pendingDraftPatient) return;
    if (evaluateDraftOffer(d, selectedPatient?.id ?? null, selectedMeds) !== 'resume') return;
    pendingDraftRef.current = null;
    setPendingDraft(null);
    prevDraftPatientIdRef.current = pendingDraftPatient.id;
    if (selectedPatient?.id !== pendingDraftPatient.id) {
      setSelectedPatient(pendingDraftPatient);
      setPatientSearchTerm(`${pendingDraftPatient.prenom} ${pendingDraftPatient.nom}`);
      loadPatientOrdonnances(pendingDraftPatient.id);
    }
    // Seules les lignes de la sélection du brouillon (et celles ajoutées à la main) reviennent.
    formDraftRef.current = d.form ? { ...d.form, medications: draftLinesForSelection(d.form, d.selectedMeds) } : null;
    setSelectedMeds(d.selectedMeds);
    setResult(null);
    setFormResetKey(k => k + 1);
    reopenFormAfterCheckRef.current = formHasContent(d.form);
    setDraftRestored(true);
    setActiveView('checker');
  };

  /** « Supprimer » : le brouillon enregistré est effacé, rien d'autre ne change. */
  const deletePendingDraft = () => {
    const d = pendingDraft;
    if (d && doctorProfile?.id) clearDraft(doctorProfile.id, d.patientId);
    pendingDraftRef.current = null;
    setPendingDraft(null);
  };

  // Formulaire ouvert au moment du F5 → rouvert seulement APRÈS une analyse relancée.
  useEffect(() => {
    if (result && reopenFormAfterCheckRef.current && selectedPatient) {
      reopenFormAfterCheckRef.current = false;
      setShowPrescriptionForm(true);
    }
  }, [result, selectedPatient]);

  /**
   * Sprint 4d-quater — « Abandonner » (formulaire) : la saisie est supprimée ; le patient,
   * la sélection du Vérificateur et l'analyse restent en place.
   */
  const abandonOrdonnanceForm = () => {
    formDraftRef.current = null;
    reopenFormAfterCheckRef.current = false;
    setHorsBaseConfirmedKey(null);
    setDraftRestored(false);
    setShowPrescriptionForm(false);
    setFormResetKey(k => k + 1);
    scheduleDraftSave(); // le brouillon enregistré ne garde que la sélection
  };

  /** Purge du brouillon courant + remise à zéro (enregistrement, annulation, « Repartir de zéro »). */
  const discardOrdonnanceDraft = () => {
    if (doctorProfile?.id && selectedPatient) clearDraft(doctorProfile.id, selectedPatient.id);
    formDraftRef.current = null;
    reopenFormAfterCheckRef.current = false;
    setHorsBaseConfirmedKey(null);
    setDraftRestored(false);
    setShowPrescriptionForm(false);
    setFormResetKey(k => k + 1);
    resetAnalysis();
  };

  const filteredPatientsForDropdown = patientSearchTerm.length >= 1
    ? patients.filter(p => `${p.prenom} ${p.nom}`.toLowerCase().includes(patientSearchTerm.toLowerCase())).slice(0, 8)
    : [];

  const userInitials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase() || 'MD';
  const specialite = doctorProfile?.specialite || clinicProfile?.nom || 'Généraliste';

  // Navigate to checker with patient pre-selected
  const navigateToChecker = () => setActiveView('checker');

  // Niveau 2 — la vue Vérificateur redevient active avec un patient déjà sélectionné.
  useEffect(() => {
    const pid = selectedPatientIdRef.current;
    if (activeView === 'checker' && pid) { refreshFond(pid); refreshAntecedents(pid); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  const openAddPatient = () => {
    setEditingPatient(null);
    setShowPatientModal(true);
  };

  // ── Keyboard shortcuts (Escape only — Ctrl+K handled in TopBar) ──────────
  // Sprint 4d-quater — Échap ne ferme que l'élément le plus haut. Il ne désélectionne le
  // patient que dans la vue Patients (fermeture du panneau de détail), jamais dans le
  // Vérificateur, et jamais quand une modale (formulaire, aperçu, dérogation…) est ouverte.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (showPrescriptionForm || showPrescriptionPreview || derogationRequest || showPatientModal) return;
      if (showAIChat) { setShowAIChat(false); return; }
      if (activeView === 'patients') setSelectedPatient(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showPrescriptionForm, showPrescriptionPreview, derogationRequest, showPatientModal, showAIChat, activeView]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#060D1A] overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        onAIChat={() => setShowAIChat(true)}
        onLogout={handleLogout}
        onHomeClick={handleLogoClick}
        userName={user?.full_name}
        userInitials={userInitials}
        specialite={specialite}
        patientCount={stats.totalPatients}
      />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          activeView={activeView}
          userInitials={userInitials}
          patients={patients}
          onNavigate={v => setActiveView(v as ViewType)}
        />
        <EmailVerificationBanner />

        {!authLoading && !profileBannerDismissed && (
          !doctorProfile?.ordre_number?.trim() || !clinicProfile?.adresse?.trim()
        ) && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-500/[0.08] border-b border-blue-100 dark:border-blue-500/20 text-sm text-blue-800 dark:text-blue-300">
            <span className="flex-1">
              <span className="font-medium">Complétez votre profil prescripteur</span>
              {' — '}votre numéro d'Ordre et l'adresse de votre cabinet apparaissent sur vos ordonnances.{' '}
              <button
                onClick={() => { setActiveView('settings'); setSettingsSection('profil'); }}
                className="underline font-medium hover:text-blue-600 dark:hover:text-blue-200 transition-colors"
              >
                Accéder aux Paramètres
              </button>
            </span>
            <button
              onClick={() => setProfileBannerDismissed(true)}
              aria-label="Fermer"
              className="flex-shrink-0 text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        <main className="flex-1 overflow-auto bg-[#F8FAFC] dark:bg-[#060D1A] pb-20 lg:pb-0">
          {activeView === 'checker' && pendingDraft && pendingDraftPatient && draftOffer !== 'none' && (
            <div
              role="status"
              className="mx-4 mt-4 lg:mx-6 lg:mt-6 flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.1] border-l-4 border-l-[#0A1628] dark:border-l-slate-300"
            >
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <Clock className="w-4 h-4 mt-0.5 text-[#0A1628] dark:text-slate-300 flex-shrink-0" aria-hidden />
                <p className="text-sm text-[#0A1628] dark:text-[#E2E8F0]">
                  <span className="font-semibold">Brouillon du {draftSummary(pendingDraft)}</span>
                  {!selectedPatient && <> — {pendingDraftPatient.prenom} {pendingDraftPatient.nom}</>}
                  {draftOffer === 'conflict' && (
                    <span className="block text-xs text-slate-600 dark:text-[#94A3B8] mt-0.5">
                      Il ne correspond pas à la sélection actuelle et ne la remplacera pas. Videz la sélection pour le reprendre, ou supprimez-le.
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {draftOffer === 'resume' && (
                  <button
                    type="button"
                    onClick={resumePendingDraft}
                    className="px-4 py-2 rounded-xl bg-[#00A86B] hover:bg-[#006B47] text-white text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B] focus-visible:ring-offset-2"
                  >
                    Reprendre
                  </button>
                )}
                <button
                  type="button"
                  onClick={deletePendingDraft}
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  Supprimer
                </button>
              </div>
            </div>
          )}
          {draftRestored && activeView === 'checker' && !result && (
            <div
              role="status"
              className="mx-4 mt-4 lg:mx-6 lg:mt-6 flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-2xl bg-[#E6F4EE] dark:bg-[#00A86B]/[0.1] border border-[#00A86B]/20"
            >
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <Clock className="w-4 h-4 mt-0.5 text-[#00A86B] flex-shrink-0" aria-hidden />
                <p className="text-sm text-[#0A1628] dark:text-[#E2E8F0]">
                  <span className="font-semibold">Brouillon restauré.</span>{' '}
                  <span className="text-slate-600 dark:text-[#94A3B8]">
                    L'analyse est relancée automatiquement ; votre ordonnance se rouvre dès le verdict.
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => rerunAnalysis()}
                  disabled={analysisRunning || selectedMeds.length === 0}
                  className="px-4 py-2 rounded-xl bg-[#00A86B] hover:bg-[#006B47] disabled:opacity-60 text-white text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B] focus-visible:ring-offset-2"
                >
                  Relancer l'analyse
                </button>
                <button
                  type="button"
                  onClick={discardOrdonnanceDraft}
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-[#006B47] dark:text-[#00A86B] hover:bg-white/60 dark:hover:bg-white/[0.05] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B]"
                >
                  Repartir de zéro
                </button>
              </div>
            </div>
          )}
          <ErrorBoundary
            fallbackTitle="Cette vue a rencontré un problème"
            resetKey={activeView}
          >
          <AnimatePresence mode="wait">
            {activeView === 'home' && (
              <DoctorHomeView
                key="home"
                doctorNom={user?.nom ?? ''}
                stats={stats}
                statsLoading={!statsLoaded}
                patients={patients}
                patientsLoading={dataLoading}
                recentAlerts={recentAlerts}
                todayRdvs={todayRdvs}
                todayRdvsRemaining={todayRdvsRemaining}
                onNavigate={setActiveView}
                onOpenPatient={id => { setPendingPatientId(id); setActiveView('patients'); }}
                onOpenAgenda={date => { setAgendaDate(date ?? null); setActiveView('agenda'); }}
                onAddPatient={openAddPatient}
                onNewPrescription={() => { resetAnalysis(); setActiveView('checker'); }}
              />
            )}

            {activeView === 'patients' && (
              <PatientsView
                key="patients"
                patients={patients}
                selectedPatient={selectedPatient}
                setSelectedPatient={setSelectedPatient}
                onAddPatient={openAddPatient}
                onImportPatients={() => setShowImportPatientsModal(true)}
                onEditPatient={p => { setEditingPatient(p); setShowPatientModal(true); }}
                onDeletePatient={(id) => {
                  const p = patients.find(x => x.id === id);
                  if (p) setConfirmDeletePatient(p);
                }}
                onNavigateToChecker={navigateToChecker}
                patientOrdonnances={patientOrdonnances}
                patientOrdLoading={patientOrdLoading}
                loadPatientOrdonnances={loadPatientOrdonnances}
                showMedicationHistory={showMedicationHistory}
                setShowMedicationHistory={setShowMedicationHistory}
                resetAnalysis={resetAnalysis}
                doctorId={doctorProfile?.id ?? null}
                orgId={user?.org_id ?? null}
                onTraitementsChanged={handleTraitementsChanged}
                onPatientPatched={handlePatientPatched}
                initialPatientId={pendingPatientId}
                onInitialPatientHandled={() => setPendingPatientId(null)}
              />
            )}

            {activeView === 'checker' && (
              <CheckerView
                key="checker"
                patients={patients}
                selectedPatient={selectedPatient}
                setSelectedPatient={setSelectedPatient}
                patientSearchTerm={patientSearchTerm}
                setPatientSearchTerm={setPatientSearchTerm}
                showPatientDropdown={showPatientDropdown}
                setShowPatientDropdown={setShowPatientDropdown}
                filteredPatientsForDropdown={filteredPatientsForDropdown}
                medSearchResults={medSearchResults}
                medSearchForeign={medSearchForeign}
                onShowForeign={() => { void loadForeignMeds(medSearchTerm); }}
                selectedMeds={selectedMeds}
                medSearchTerm={medSearchTerm}
                setMedSearchTerm={setMedSearchTerm}
                showMedDropdown={showMedDropdown}
                setShowMedDropdown={setShowMedDropdown}
                medSearchLoading={medSearchLoading}
                searchMedications={searchMedications}
                addMedication={addMedication}
                addManualMedication={addManualMedication}
                removeMedication={removeMedication}
                medVerifInfo={medVerifInfo}
                result={analysisValid ? result : null}
                analysisRunning={analysisRunning}
                analysisFailed={analysisFailed}
                rerunAnalysis={rerunAnalysis}
                resetAnalysis={resetAnalysis}
                resultsRef={resultsRef as React.RefObject<HTMLDivElement>}
                loadPatientOrdonnances={loadPatientOrdonnances}
                patientOrdonnances={patientOrdonnances}
                onAddPatient={openAddPatient}
                setShowPrescriptionForm={setShowPrescriptionForm}
                fondTraitements={fondTraitements}
                fondLoading={fondLoading}
                fondError={fondError}
                fondExcluded={fondExcluded}
                toggleFond={toggleFond}
                renewFond={renewFond}
                reloadFond={() => { if (selectedPatient) refreshFond(selectedPatient.id); }}
                analysisPending={analysisPending}
                antecedents={patientAntecedents}
                antecedentsLoading={antLoading}
                antecedentsError={antError}
                antecedentRulesReady={antRulesReady}
                allergyStatus={allergyStatus}
                allergyRulesReady={allergyRulesReady}
              />
            )}

            {activeView === 'ordonnances' && (
              <OrdonnancesView
                key="ordonnances"
                onNavigate={setActiveView}
                doctorId={doctorProfile?.id || user?.id || ''}
                doctorInfo={user ? {
                  nom: user.nom,
                  prenom: user.prenom,
                  specialite: doctorProfile?.specialite ?? null,
                  rpps: doctorProfile?.rpps ?? null,
                  ordre_number: doctorProfile?.ordre_number ?? null,
                } : null}
                orgInfo={clinicProfile ? {
                  name: clinicProfile.name ?? '',
                  adresse: clinicProfile.adresse ?? null,
                  telephone: clinicProfile.telephone ?? null,
                } : null}
                logoUrl={doctorProfile?.logo_url ?? null}
              />
            )}

            {activeView === 'stats' && (
              <StatsView key="stats" userId={user?.id || ''} doctorId={doctorProfile?.id || ''} />
            )}

            {activeView === 'agenda' && (
              <AgendaView key="agenda" patients={patients} showToast={showToast} initialDate={agendaDate} />
            )}

            {activeView === 'encyclopedie' && (
              <EncyclopedieView key="encyclopedie" />
            )}

            {activeView === 'documents' && (
              <DocumentsView
                key="documents"
                patients={patients}
                showToast={showToast}
                doctorProfile={doctorProfile}
                org={clinicProfile ? { name: clinicProfile.name ?? '', adresse: clinicProfile.adresse ?? null, telephone: clinicProfile.telephone ?? null } : null}
              />
            )}

            {activeView === 'settings' && (
              <SettingsView
                key="settings"
                navigate={navigate}
                user={user}
                doctorProfile={doctorProfile}
                activeSection={settingsSection}
                setActiveSection={setSettingsSection}
                onSaved={refreshProfile}
              />
            )}
          </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>

      {/* Sprint M0 — Mobile bottom navigation (masquée sur desktop) */}
      <MobileBottomNav
        activeView={activeView}
        onNavigate={setActiveView}
        onAIChat={() => setShowAIChat(true)}
      />

      {/* AI Chat panel */}
      <AnimatePresence>
        {showAIChat && (
          <AIChat
            key="ai-chat"
            onClose={() => setShowAIChat(false)}
            selectedPatient={selectedPatient}
            patients={patients}
          />
        )}
      </AnimatePresence>

      {/* Toasts */}
      <ToastManager toasts={toasts} onRemove={removeToast} />

      {/* Modals */}
      <Modal
        isOpen={showPatientModal}
        onClose={() => { setShowPatientModal(false); setEditingPatient(null); }}
        title={editingPatient ? 'Modifier le Patient' : 'Ajouter un Patient'}
        size="xl"
      >
        <PatientForm
          patient={editingPatient}
          onSave={handleSavePatient}
          onCancel={() => { setShowPatientModal(false); setEditingPatient(null); }}
        />
      </Modal>

      {/* Sprint #3.1.0 — Import patients depuis Excel */}
      {user?.org_id && (
        <PatientImportModal
          isOpen={showImportPatientsModal}
          onClose={() => setShowImportPatientsModal(false)}
          orgId={user.org_id}
          existingPatients={patients}
          onImported={(count) => {
            showToast(`${count} patient(s) importé(s) avec succès`, 'success');
            loadPatients();
          }}
        />
      )}

      {/* Modale de confirmation suppression patient */}
      {confirmDeletePatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-white/[0.08]">
            <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-[#DC2626]" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-[#E2E8F0] text-center mb-2">
              Supprimer {confirmDeletePatient.prenom} {confirmDeletePatient.nom} ?
            </h3>
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] text-center mb-6">
              Toutes ses données — ordonnances, consultations, rendez-vous — seront définitivement supprimées. Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeletePatient(null)}
                disabled={deletePatientLoading}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#94A3B8] rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeletePatient(confirmDeletePatient.id)}
                disabled={deletePatientLoading}
                className="flex-1 px-4 py-2.5 bg-[#DC2626] hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deletePatientLoading && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPatient && (
        <PrescriptionFormModal
          key={`${selectedPatient.id}:${formResetKey}`}
          isOpen={showPrescriptionForm}
          onClose={() => setShowPrescriptionForm(false)}
          onCancel={abandonOrdonnanceForm}
          patient={selectedPatient}
          initialMedications={selectedMeds.map(m => ({
            id: m.id,
            nom: displayNom(m) || '',
            dosageAPreciser: !!m.dosageManquant,
            // Sprint 3 — renouvellement : reprise de la posologie du traitement de fond
            posologie: fondTraitements.find(t => fondMedId(t) === m.id)?.posologie ?? null,
            formeHint: m.formeHint ?? null,
          }))}
          onVerifyUnchecked={handleVerifyFormAdditions}
          selectedMeds={verifMeds}
          analysisValid={analysisValid}
          horsBaseConfirmedKey={horsBaseConfirmedKey}
          onConfirmHorsBase={setHorsBaseConfirmedKey}
          doctorId={doctorProfile?.id ?? null}
          contraindicationAlerts={analysisValid
            ? derogationAlerts((result?.alerts ?? []).filter(a => a.origin !== 'fond')).map(alertLabel)
            : []}
          initialForm={formDraftRef.current}
          onFormChange={f => { formDraftRef.current = f; scheduleDraftSave(); }}
          restored={draftRestored}
          onDiscardDraft={discardOrdonnanceDraft}
          onPreview={(data) => {
            setPrescriptionData(data);
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
            setPrescriptionOrdreNumber(`ORD-${dateStr}-${rand}`);
            setShowPrescriptionForm(false);
            setShowPrescriptionPreview(true);
          }}
        />
      )}

      {selectedPatient && showPrescriptionPreview && prescriptionData && user && (
        <PrescriptionPreviewModal
          isOpen={showPrescriptionPreview}
          onClose={() => setShowPrescriptionPreview(false)}
          onBack={() => {
            setShowPrescriptionPreview(false);
            setShowPrescriptionForm(true);
          }}
          onSave={handleSaveOrdonnance}
          isSaved={savedOrdreNumber === prescriptionOrdreNumber}
          // Une fois enregistrée (garde-fous passés), l'analyse est réinitialisée :
          // le blocage ne s'applique plus à cette ordonnance figée.
          blockedReason={savedOrdreNumber === prescriptionOrdreNumber ? null : (verificationBlockMessage(
            computeVerification(prescriptionData.medications ?? [], verifMeds, analysisValid, horsBaseConfirmedKey),
          ) ?? dosageBlockMessage(prescriptionData.medications ?? []) ?? posologieBlockMessage(prescriptionData.medications ?? []))}
          ordreNumber={prescriptionOrdreNumber}
          logo_url={doctorProfile?.logo_url ?? null}
          doctor={{
            nom:          user.nom,
            prenom:       user.prenom,
            specialite:   doctorProfile?.specialite ?? null,
            rpps:         doctorProfile?.rpps ?? null,
            ordre_number: doctorProfile?.ordre_number ?? null,
            telephone:    null,
          }}
          org={{
            name:      clinicProfile?.name ?? '',
            adresse:   clinicProfile?.adresse ?? null,
            telephone: clinicProfile?.telephone ?? null,
          }}
          patient={selectedPatient}
          motif={prescriptionData.motif}
          medications={(prescriptionData.medications ?? []).map((m: any) => ({ ...m, nom: ligneLabel(m) }))}
          remarks={prescriptionData.remarks ?? ''}
          nextAppointment={prescriptionData.nextAppointment}
          interactionAlerts={interactionAlerts}
        />
      )}

      {/* Sprint 4d — Prescription contre-indiquée : confirmation motivée avant enregistrement / impression / PDF */}
      <DerogationModal
        open={!!derogationRequest}
        alerts={derogationRequest?.alerts ?? []}
        signature={derogationRequest?.signature ?? ''}
        onConfirm={conf => {
          setDerogationConf(conf);
          setDerogationRequest(null);
          derogationResolverRef.current?.(conf);
          derogationResolverRef.current = null;
        }}
        onModify={() => {
          setDerogationRequest(null);
          derogationResolverRef.current?.(null);
          derogationResolverRef.current = null;
          setShowPrescriptionPreview(false);
          setShowPrescriptionForm(true);
        }}
      />

      {selectedPatient && (
        <MedicationHistoryModal
          isOpen={showMedicationHistory}
          onClose={() => setShowMedicationHistory(false)}
          patient={selectedPatient}
          ordonnances={patientOrdonnances}
        />
      )}
    </div>
  );
}
