import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
  Search, Plus, X, AlertTriangle,
  CheckCircle2, Pill, UserPlus, FileText, Shield, Clock,
  BarChart3, Heart, Users, Calendar, Trash2, CreditCard as Edit,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Patient, Medicament } from '../lib/supabase';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { PatientForm } from '../components/PatientForm';
import { PrescriptionFormModal } from '../components/PrescriptionFormModal';
import { PrescriptionPreviewModal } from '../components/PrescriptionPreviewModal';
import { MedicationHistoryModal } from '../components/MedicationHistoryModal';
import {
  MonthlyInteractionsChart, RiskDistributionChart,
  TopMedicationsSection, RecentActivityTimeline, AllMedicationsHistory,
} from '../components/DoctorAnalytics';
import { EmailVerificationBanner } from '../components/EmailVerificationBanner';

import { Sidebar, type ViewType } from '../components/ui/Sidebar';
import { TopBar } from '../components/ui/TopBar';
import { AIChat } from '../components/ui/AIChat';
import { PatientAvatar } from '../components/ui/PatientAvatar';
import { EmptyState } from '../components/ui/EmptyState';
import { PageTransition } from '../components/ui/PageTransition';
import { ToastManager, type ToastItem } from '../components/ui/Toast';
import { PatientTabs } from '../components/ui/PatientTabs';
import { AgendaView } from '../components/ui/AgendaView';
import { EncyclopedieView } from '../components/ui/EncyclopedieView';
import { DocumentsView } from '../components/ui/DocumentsView';

// ─── Types ──────────────────────────────────────────────────────────────────

interface InteractionResult {
  severity: 'safe' | 'attention' | 'dangerous';
  description: string;
  alternatives: string[];
  reasons: string[];
  medications: any[];
  patientPrecautions: string[];
}

interface DbInteraction {
  id: string;
  dci_1_pattern: string;
  dci_2_pattern: string;
  severite: 'contre_indication' | 'majeure' | 'moderee' | 'mineure';
  description: string;
}

interface DbContraindication {
  id: string;
  dci_pattern: string;
  condition_type: string;
  condition_valeur: string;
  severite: 'absolue' | 'relative';
  description: string;
}

interface InteractionAlert {
  type: 'drug_drug' | 'contraindication';
  severite: 'contre_indication' | 'majeure' | 'moderee' | 'mineure';
  description: string;
  involved: string[];
}

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

function getPatientAge(dateNaissance: string | null | undefined): number | null {
  if (!dateNaissance) return null;
  const today = new Date();
  const birth = new Date(dateNaissance);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getSeveriteLabel(s: InteractionAlert['severite']) {
  if (s === 'contre_indication') return '🔴 CONTRE-INDICATION';
  if (s === 'majeure') return '🟠 INTERACTION MAJEURE';
  if (s === 'moderee') return '🔵 INTERACTION MODÉRÉE';
  return '🟡 INTERACTION MINEURE';
}

// ─── Sub-views ──────────────────────────────────────────────────────────────

/* ── Skeleton helpers ────────────────────────────────────────────────────── */
function SkeletonBox({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-xl ${className || ''}`} />;
}

function SkeletonKPI() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <SkeletonBox className="w-11 h-11" />
      </div>
      <SkeletonBox className="w-16 h-8 mb-2" />
      <SkeletonBox className="w-24 h-4 mb-1.5" />
      <SkeletonBox className="w-32 h-3" />
    </div>
  );
}

function SkeletonPatientRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-3.5">
      <SkeletonBox className="w-9 h-9 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonBox className="w-40 h-4" />
        <SkeletonBox className="w-28 h-3" />
      </div>
    </div>
  );
}

interface HomeViewProps {
  stats: { totalPatients: number; ordonnances: number; evolution: number };
  patients: Patient[];
  interactionAlerts: InteractionAlert[];
  onNavigate: (v: ViewType) => void;
  onAddPatient: () => void;
  dataLoading?: boolean;
}

function HomeView({ stats, patients, interactionAlerts, onNavigate, onAddPatient, dataLoading }: HomeViewProps) {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const kpis = [
    {
      label: 'Patients totaux',
      value: stats.totalPatients,
      icon: Users,
      color: 'bg-sky-500',
      light: 'bg-sky-50',
      text: 'text-sky-600',
      sub: 'Patients enregistrés',
    },
    {
      label: 'Ordonnances',
      value: stats.ordonnances,
      icon: FileText,
      color: 'bg-violet-500',
      light: 'bg-violet-50',
      text: 'text-violet-600',
      sub: 'Créées au total',
    },
    {
      label: 'Interactions',
      value: interactionAlerts.length,
      icon: AlertTriangle,
      color: interactionAlerts.length > 0 ? 'bg-red-500' : 'bg-emerald-500',
      light: interactionAlerts.length > 0 ? 'bg-red-50' : 'bg-emerald-50',
      text: interactionAlerts.length > 0 ? 'text-red-600' : 'text-emerald-600',
      sub: 'En cours d\'analyse',
    },
    {
      label: 'Évolution patients',
      value: stats.evolution === 0
        ? '—'
        : stats.evolution > 0
        ? `+${stats.evolution}%`
        : `${stats.evolution}%`,
      icon: BarChart3,
      color: stats.evolution >= 0 ? 'bg-emerald-500' : 'bg-amber-500',
      light: stats.evolution >= 0 ? 'bg-emerald-50' : 'bg-amber-50',
      text:  stats.evolution >= 0 ? 'text-emerald-600' : 'text-amber-600',
      sub: 'Nouveaux patients ce mois vs. mois précédent',
    },
  ];

  return (
    <PageTransition>
      <div className="p-6 max-w-[1400px]">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0] tracking-tight">
            Tableau de bord 👋
          </h1>
          <p className="text-slate-500 dark:text-[#94A3B8] mt-0.5 text-sm capitalize">{today}</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          {dataLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonKPI key={i} />)
            : kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-11 h-11 ${kpi.light} rounded-xl flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${kpi.text}`} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mb-1 tabular-nums">{kpi.value}</p>
                  <p className="text-sm font-semibold text-slate-700">{kpi.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
                </div>
              );
            })
          }
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent patients — 2/3 */}
          <div className="xl:col-span-2 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm overflow-hidden dark:hover:shadow-[0_0_0_1px_rgba(56,189,248,0.1)]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
              <h2 className="text-base font-bold text-slate-900 dark:text-[#E2E8F0]">Patients récents</h2>
              <button
                onClick={() => onNavigate('patients')}
                className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 font-semibold transition-colors"
              >
                Voir tous →
              </button>
            </div>

            <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
              {dataLoading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonPatientRow key={i} />)
                : patients.slice(0, 7).map((p) => (
                <div
                  key={p.id}
                  onClick={() => onNavigate('patients')}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.04] cursor-pointer transition-colors group"
                >
                  <PatientAvatar name={`${p.prenom} ${p.nom}`} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-[#E2E8F0] text-sm group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">
                      {p.prenom} {p.nom}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-[#475569] truncate">
                      {p.pathologies?.[0] || 'Aucune pathologie renseignée'}
                      {p.date_naissance && ` • ${getPatientAge(p.date_naissance)} ans`}
                    </p>
                  </div>
                  <span className="text-xs text-slate-300 dark:text-slate-700 group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors flex-shrink-0">→</span>
                </div>
              ))
              }

              {!dataLoading && patients.length === 0 && (
                <EmptyState
                  title="Aucun patient"
                  description="Ajoutez votre premier patient pour commencer"
                  icon={Users}
                  action={
                    <button
                      onClick={onAddPatient}
                      className="mt-2 px-5 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition-colors"
                    >
                      + Ajouter un patient
                    </button>
                  }
                />
              )}
            </div>
          </div>

          {/* Quick actions — 1/3 */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm p-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-[#E2E8F0] mb-4">Actions rapides</h2>
              <div className="space-y-2">
                {[
                  { label: '+ Nouveau patient',     view: 'patients' as ViewType,    action: onAddPatient, color: 'bg-sky-500 hover:bg-sky-600 text-white' },
                  { label: '💊 Vérifier interactions', view: 'checker' as ViewType,  color: 'bg-violet-50 dark:bg-violet-500/[0.1] hover:bg-violet-100 dark:hover:bg-violet-500/[0.18] text-violet-700 dark:text-violet-400' },
                  { label: '📋 Voir ordonnances',   view: 'ordonnances' as ViewType, color: 'bg-emerald-50 dark:bg-emerald-500/[0.1] hover:bg-emerald-100 dark:hover:bg-emerald-500/[0.18] text-emerald-700 dark:text-emerald-400' },
                  { label: '📊 Statistiques',       view: 'stats' as ViewType,       color: 'bg-slate-50 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.07] text-slate-700 dark:text-[#94A3B8]' },
                ].map(({ label, view, action, color }) => (
                  <button
                    key={label}
                    onClick={action || (() => onNavigate(view))}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${color}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-sky-500 to-cyan-500 rounded-2xl p-5 text-white">
              <h3 className="font-bold text-base mb-1">🤖 Assistant IA</h3>
              <p className="text-sky-100 text-xs mb-4">Questions médicales, interactions, posologies...</p>
              <p className="text-sky-100 text-xs opacity-80">
                Cliquez sur "Assistant IA" dans la barre latérale pour accéder à l'IA médicale.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

// ─── PatientsView ────────────────────────────────────────────────────────────

interface PatientsViewProps {
  patients: Patient[];
  selectedPatient: Patient | null;
  setSelectedPatient: (p: Patient | null) => void;
  onAddPatient: () => void;
  onEditPatient: (p: Patient) => void;
  onDeletePatient: (id: string) => void;
  onNavigateToChecker: () => void;
  patientOrdonnances: any[];
  loadPatientOrdonnances: (id: string) => Promise<void>;
  showMedicationHistory: boolean;
  setShowMedicationHistory: (v: boolean) => void;
  resetAnalysis: () => void;
}

function PatientsView({
  patients, selectedPatient, setSelectedPatient,
  onAddPatient, onEditPatient, onDeletePatient, onNavigateToChecker,
  patientOrdonnances, loadPatientOrdonnances,
  showMedicationHistory, setShowMedicationHistory, resetAnalysis,
}: PatientsViewProps) {
  const [search, setSearch] = useState('');

  const filtered = search.trim().length > 0
    ? patients.filter(p =>
        `${p.prenom} ${p.nom}`.toLowerCase().includes(search.toLowerCase())
      )
    : patients;

  const selectPatient = (p: Patient) => {
    setSelectedPatient(p);
    resetAnalysis();
    loadPatientOrdonnances(p.id);
  };

  return (
    <PageTransition className="flex h-full">
      {/* ── Left: patient list ─────────────────────────────────────────── */}
      <div className="w-[320px] min-w-[320px] border-r border-slate-200 dark:border-white/[0.06] flex flex-col bg-white dark:bg-[#111827] h-full">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-white/[0.06] flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-[#E2E8F0]">Patients</h2>
            <button
              onClick={onAddPatient}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 text-white rounded-xl text-xs font-semibold hover:bg-sky-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouveau
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un patient..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm text-slate-900 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-500/40 focus:border-sky-300 dark:focus:border-sky-500/40"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <EmptyState
              title="Aucun patient trouvé"
              icon={Users}
              action={
                <button onClick={onAddPatient} className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition-colors">
                  + Ajouter
                </button>
              }
            />
          )}

          {filtered.map(p => {
            const isSelected = selectedPatient?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => selectPatient(p)}
                className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all border-l-[3px] group ${
                  isSelected
                    ? 'bg-sky-50 dark:bg-sky-500/[0.1] border-l-sky-500'
                    : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:border-l-slate-200 dark:hover:border-l-white/[0.1]'
                }`}
              >
                <PatientAvatar name={`${p.prenom} ${p.nom}`} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isSelected ? 'text-sky-700 dark:text-sky-400' : 'text-slate-900 dark:text-[#E2E8F0]'}`}>
                    {p.prenom} {p.nom}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-[#475569] truncate">
                    {p.pathologies?.[0] || (p.date_naissance ? `${getPatientAge(p.date_naissance)} ans` : 'Aucune info')}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); onEditPatient(p); }}
                    className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onDeletePatient(p.id); }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: patient detail with tabs ──────────────────────────── */}
      <div className="flex-1 overflow-hidden bg-[#F8FAFC] dark:bg-[#0A0F1E] flex flex-col">
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
          <PatientTabs
            patient={selectedPatient}
            ordonnances={patientOrdonnances}
            onEdit={() => onEditPatient(selectedPatient)}
            onNavigateToChecker={onNavigateToChecker}
          />
        )}
      </div>
    </PageTransition>
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
  selectedMeds: Array<{ id: string; nom: string; dci?: string | null }>;
  medSearchTerm: string;
  setMedSearchTerm: (v: string) => void;
  showMedDropdown: boolean;
  setShowMedDropdown: (v: boolean) => void;
  medSearchLoading: boolean;
  searchMedications: (term: string) => void;
  addMedication: (med: Medicament) => void;
  removeMedication: (id: string) => void;
  interactionAlerts: InteractionAlert[];
  result: InteractionResult | null;
  loading: boolean;
  checkInteractions: () => void;
  resetAnalysis: () => void;
  resultsRef: React.RefObject<HTMLDivElement>;
  loadPatientOrdonnances: (id: string) => Promise<void>;
  patientOrdonnances: any[];
  onAddPatient: () => void;
  setShowPrescriptionForm: (v: boolean) => void;
}

function CheckerView({
  patients, selectedPatient, setSelectedPatient,
  patientSearchTerm, setPatientSearchTerm,
  showPatientDropdown, setShowPatientDropdown,
  filteredPatientsForDropdown,
  medSearchResults, selectedMeds, medSearchTerm, setMedSearchTerm,
  showMedDropdown, setShowMedDropdown, medSearchLoading, searchMedications,
  addMedication, removeMedication,
  interactionAlerts, result, loading,
  checkInteractions, resetAnalysis, resultsRef,
  loadPatientOrdonnances, patientOrdonnances,
  onAddPatient, setShowPrescriptionForm,
}: CheckerViewProps) {
  return (
    <PageTransition>
      <div className="p-6 max-w-[1400px]">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-[#E2E8F0] tracking-tight">Vérificateur d'interactions</h2>
          <p className="text-slate-500 dark:text-[#94A3B8] text-sm mt-0.5">Analysez les interactions médicamenteuses avant de prescrire</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Patient selector ── */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm overflow-hidden dark:hover:shadow-[0_0_0_1px_rgba(56,189,248,0.12)]">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-sky-500 to-sky-600">
              <h3 className="text-white font-bold text-base">Patient</h3>
            </div>
            <div className="p-6">
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
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm text-slate-900 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-500/40 focus:border-sky-300 dark:focus:border-sky-500/40 transition-all"
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
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-sky-50 dark:hover:bg-sky-500/[0.08] transition-colors border-b border-slate-50 dark:border-white/[0.04] last:border-b-0"
                        >
                          <PatientAvatar name={`${p.prenom} ${p.nom}`} size="xs" />
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">{p.prenom} {p.nom}</p>
                            <p className="text-xs text-slate-400 dark:text-[#475569]">
                              {p.date_naissance ? `${getPatientAge(p.date_naissance)} ans` : ''}
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
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-sky-300 hover:text-sky-600 hover:bg-sky-50 transition-all font-medium"
                >
                  <UserPlus className="w-4 h-4" />
                  Nouveau patient
                </button>
              </div>

              {selectedPatient ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-sky-50 rounded-xl border border-sky-100">
                    <PatientAvatar name={`${selectedPatient.prenom} ${selectedPatient.nom}`} size="md" />
                    <div>
                      <p className="font-bold text-sky-900">{selectedPatient.prenom} {selectedPatient.nom}</p>
                      <p className="text-xs text-sky-600">
                        {selectedPatient.date_naissance ? `${getPatientAge(selectedPatient.date_naissance)} ans` : 'Âge inconnu'}
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
                            <span key={a} className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full font-medium">⚠ {a}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-500 to-violet-600">
              <h3 className="text-white font-bold text-base">Médicaments</h3>
            </div>
            <div className="p-6">
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

                  {showMedDropdown && (medSearchResults.length > 0 || medSearchLoading) && (
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
                          {/* Ligne 1 : badge pays + nom commercial + badge CNOPS */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {med.pays === 'MA' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40 flex-shrink-0">
                                🇲🇦 MAR
                              </span>
                            )}
                            <span className="font-bold text-slate-900 dark:text-[#E2E8F0] text-sm leading-tight">
                              {med.nom_commercial || med.nom}
                            </span>
                            {med.remboursement_cnops && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40 flex-shrink-0">
                                ✓ CNOPS
                              </span>
                            )}
                          </div>
                          {/* Ligne 2 : DCI + dosage + forme */}
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap pl-0.5">
                            {med.dci && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">{med.dci}</span>
                            )}
                            {med.dosage && (
                              <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">· {med.dosage}</span>
                            )}
                            {med.forme && (
                              <span className="text-xs text-slate-400 dark:text-slate-500 italic">· {med.forme}</span>
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
                        <span className="flex-1 font-semibold text-slate-900 dark:text-[#E2E8F0] text-sm truncate">{med.nom}</span>
                        <button
                          onClick={() => removeMedication(med.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
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

              {/* Real-time alerts */}
              {selectedMeds.length >= 1 && (
                <div className="mb-5">
                  {interactionAlerts.length === 0 ? (
                    <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-emerald-800 font-medium">
                        {selectedMeds.length === 1
                          ? 'Aucune contre-indication connue'
                          : 'Aucune interaction connue'}
                        {!selectedPatient && (
                          <span className="text-emerald-600 font-normal"> — sélectionnez un patient pour les contre-indications</span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {interactionAlerts
                        .sort((a, b) => {
                          const order = { contre_indication: 0, majeure: 1, moderee: 2, mineure: 3 };
                          return order[a.severite] - order[b.severite];
                        })
                        .map((alert, idx) => {
                          const cls = {
                            contre_indication: 'bg-red-50 border-red-200 text-red-900',
                            majeure: 'bg-orange-50 border-orange-200 text-orange-900',
                            moderee: 'bg-blue-50 border-blue-200 text-blue-900',
                            mineure: 'bg-yellow-50 border-yellow-200 text-yellow-900',
                          }[alert.severite];
                          const badge = {
                            contre_indication: 'bg-red-100 text-red-800',
                            majeure: 'bg-orange-100 text-orange-800',
                            moderee: 'bg-blue-100 text-blue-800',
                            mineure: 'bg-yellow-100 text-yellow-800',
                          }[alert.severite];
                          const icons = { contre_indication: '🔴', majeure: '🟠', moderee: '🔵', mineure: '🟡' };
                          return (
                            <div key={idx} className={`px-4 py-3 border rounded-xl ${cls}`}>
                              <div className="flex items-start gap-2">
                                <span className="text-base flex-shrink-0">{icons[alert.severite]}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badge}`}>
                                      {alert.severite === 'contre_indication' ? 'Contre-indication' :
                                       alert.severite === 'majeure' ? 'Majeure' :
                                       alert.severite === 'moderee' ? 'Modérée' : 'Mineure'}
                                    </span>
                                    <span className="text-xs font-semibold">{alert.involved.join(' + ')}</span>
                                  </div>
                                  <p className="text-xs leading-relaxed opacity-90">{alert.description}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={checkInteractions}
                  variant="primary"
                  size="lg"
                  loading={loading}
                  disabled={selectedMeds.length < 1}
                  className="flex-1"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Analyser
                </Button>
                <Button onClick={resetAnalysis} variant="ghost" size="lg">
                  Réinitialiser
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Result ── */}
        {result && (
          <div
            ref={resultsRef}
            className={`mt-6 bg-white dark:bg-[#111827] rounded-2xl shadow-sm overflow-hidden border-l-4 ${
              result.severity === 'safe' ? 'border-l-emerald-500' :
              result.severity === 'attention' ? 'border-l-amber-500' : 'border-l-red-500'
            }`}
          >
            <div className={`px-6 py-5 ${
              result.severity === 'safe' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
              result.severity === 'attention' ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
              'bg-gradient-to-r from-red-500 to-red-600'
            }`}>
              <div className="flex items-center gap-4">
                {result.severity === 'safe' && <CheckCircle2 className="w-10 h-10 text-white flex-shrink-0" />}
                {result.severity === 'attention' && <AlertTriangle className="w-10 h-10 text-white flex-shrink-0" />}
                {result.severity === 'dangerous' && <X className="w-10 h-10 text-white flex-shrink-0" />}
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                    {result.severity === 'safe' ? '✓ Sécuritaire' :
                     result.severity === 'attention' ? '⚠ Attention' : '⚠ Dangereux'}
                  </h3>
                  <p className="text-white/90 mt-0.5 text-sm">{result.description}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {result.reasons.length > 0 && (
                <div className="bg-slate-50 dark:bg-white/[0.04] rounded-xl p-5">
                  <h4 className="font-bold text-slate-900 dark:text-[#E2E8F0] mb-3">Analyse détaillée</h4>
                  <ul className="space-y-2.5">
                    {result.reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-700 dark:text-[#94A3B8] text-sm">
                        <span className="text-red-500 font-bold mt-0.5">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-slate-100 dark:bg-white/[0.04] rounded-xl p-4 border-l-4 border-slate-400 dark:border-slate-600">
                <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                  <strong>Avertissement :</strong> Cette analyse est indicative. Consultez le Vidal et les recommandations HAS.
                </p>
              </div>

              <div className="flex flex-col items-center gap-2 pt-2">
                {!selectedPatient && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-2">
                    ⚠️ Veuillez d'abord sélectionner un patient
                  </p>
                )}
                <Button
                  onClick={() => {
                    if (!selectedPatient) return;
                    setShowPrescriptionForm(true);
                  }}
                  variant="primary"
                  size="lg"
                  className="px-8"
                  disabled={!selectedPatient}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Créer une ordonnance
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

// ─── StatsView ───────────────────────────────────────────────────────────────

function StatsView({ userId }: { userId: string }) {
  return (
    <PageTransition>
      <div className="p-6 max-w-[1400px] space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Statistiques</h2>
          <p className="text-slate-500 text-sm mt-0.5">Analyse de votre activité médicale</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MonthlyInteractionsChart />
          </div>
          <RiskDistributionChart />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AllMedicationsHistory doctorId={userId} />
          <TopMedicationsSection doctorId={userId} />
          <RecentActivityTimeline doctorId={userId} />
        </div>
      </div>
    </PageTransition>
  );
}

// ─── OrdonnancesView ─────────────────────────────────────────────────────────

function OrdonnancesView({ onNavigate, doctorId }: { onNavigate: (v: ViewType) => void; doctorId: string }) {
  const [ords, setOrds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!doctorId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('ordonnances')
        .select('id, date, created_at, statut, patient_id, ordonnance_lignes(medicament_nom, posologie)')
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false })
        .limit(50);
      // fetch patient names
      if (data && data.length > 0) {
        const pIds = [...new Set(data.map((o: any) => o.patient_id).filter(Boolean))];
        const { data: pats } = await supabase.from('patients').select('id, prenom, nom').in('id', pIds);
        const pMap = new Map((pats || []).map((p: any) => [p.id, `${p.prenom} ${p.nom}`]));
        setOrds(data.map((o: any) => ({ ...o, patient_nom: pMap.get(o.patient_id) || 'Patient inconnu' })));
      } else {
        setOrds([]);
      }
      setLoading(false);
    })();
  }, [doctorId]);

  return (
    <PageTransition>
      <div className="p-6 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-[#E2E8F0] tracking-tight">Ordonnances</h2>
            <p className="text-slate-500 dark:text-[#94A3B8] text-sm mt-0.5">Historique de toutes vos prescriptions</p>
          </div>
          <button
            onClick={() => onNavigate('checker')}
            className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition-colors"
          >
            + Nouvelle ordonnance
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : ords.length === 0 ? (
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700 dark:text-[#94A3B8] mb-2">Aucune ordonnance</h3>
            <p className="text-slate-400 dark:text-[#475569] text-sm mb-6 max-w-sm mx-auto">
              Créez votre première ordonnance depuis le Vérificateur d'interactions.
            </p>
            <button
              onClick={() => onNavigate('checker')}
              className="px-6 py-3 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition-colors"
            >
              💊 Aller au Vérificateur
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {ords.map(ord => {
              const dateStr = ord.date || ord.created_at;
              const dateLabel = dateStr
                ? new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                : 'Date inconnue';
              const meds = ord.ordonnance_lignes || [];
              return (
                <div key={ord.id} className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-white/[0.06] shadow-sm p-5 hover:border-sky-200 dark:hover:border-sky-500/30 dark:hover:shadow-[0_0_0_1px_rgba(56,189,248,0.12)] transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-sky-50 dark:bg-sky-500/[0.12] rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-sky-500 dark:text-sky-400" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-[#E2E8F0] text-sm">{ord.patient_nom}</p>
                        <p className="text-xs text-slate-400 dark:text-[#475569] mt-0.5">{dateLabel}</p>
                      </div>
                    </div>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
                      ord.statut === 'valide' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-white/[0.07] text-slate-600 dark:text-[#94A3B8]'
                    }`}>
                      {ord.statut || 'Créée'}
                    </span>
                  </div>
                  {meds.length > 0 && (
                    <div className="mt-3 pl-13 flex flex-wrap gap-1.5 pl-[52px]">
                      {meds.slice(0, 4).map((m: any, i: number) => (
                        <span key={i} className="px-2.5 py-1 bg-violet-50 text-violet-800 text-xs rounded-full font-medium border border-violet-100">
                          {m.medicament_nom}
                        </span>
                      ))}
                      {meds.length > 4 && (
                        <span className="px-2.5 py-1 bg-slate-50 text-slate-500 text-xs rounded-full">+{meds.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

// ─── SettingsView ─────────────────────────────────────────────────────────────

function SettingsView({ navigate, user, doctorProfile }: { navigate: (path: string) => void; user: any; doctorProfile: any }) {
  const [activeSection, setActiveSection] = useState<'profil' | 'cabinet' | 'securite' | 'ia' | 'secretaire'>('profil');

  // Secrétaire state
  const [secEmail, setSecEmail]       = useState('');
  const [secPrenom, setSecPrenom]     = useState('');
  const [secNom, setSecNom]           = useState('');
  const [secInviting, setSecInviting] = useState(false);
  const [secMsg, setSecMsg]           = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [secInviteLink, setSecInviteLink] = useState<string | null>(null);
  const [secretaires, setSecretaires] = useState<{ id: string; user_id: string; active: boolean; created_at: string; prenom?: string; nom?: string }[]>([]);
  const [secLoading, setSecLoading]   = useState(false);

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
      const { data: token, error } = await supabase.rpc('invite_secretaire', {
        p_org_id: user.org_id,
        p_email: secEmail.trim(),
        p_prenom: secPrenom.trim() || null,
        p_nom: secNom.trim() || null,
      });
      if (error) throw error;
      const link = `${window.location.origin}/accept-invitation?type=secretaire&token=${token}`;
      setSecInviteLink(link);
      setSecMsg({ type: 'success', text: '✓ Invitation créée. Partagez le lien avec votre secrétaire.' });
      setSecEmail(''); setSecPrenom(''); setSecNom('');
      loadSecretaires();
    } catch (err: unknown) {
      setSecMsg({ type: 'error', text: `Erreur : ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setSecInviting(false);
    }
  };
  const [apiKey, setApiKey]         = useState(() => {
    try { return localStorage.getItem('ordosur_anthropic_key') || ''; } catch { return ''; }
  });
  const [apiKeyMsg, setApiKeyMsg]   = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [apiTesting, setApiTesting] = useState(false);

  // OpenFDA sync state
  const [syncRunning, setSyncRunning] = useState(false);
  const [syncResult, setSyncResult]   = useState<{ success: boolean; inserted?: number; skipped?: number; errors?: number; message?: string; error?: string } | null>(null);
  const [lastSync, setLastSync]       = useState<{ finished_at: string; inserted: number; skipped: number; status: string } | null>(null);
  const [medCount, setMedCount]       = useState<number | null>(null);

  const loadSyncInfo = async () => {
    const [logRes, countRes] = await Promise.all([
      supabase.from('openfda_sync_log').select('finished_at, inserted, skipped, status').eq('status', 'success').order('finished_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('medicaments').select('id', { count: 'exact', head: true }),
    ]);
    if (logRes.data) setLastSync(logRes.data as any);
    if (countRes.count != null) setMedCount(countRes.count);
  };

  const handleOpenFDASync = async () => {
    setSyncRunning(true);
    setSyncResult(null);
    try {
      const res = await fetch('https://yxzvukryngvlzjgaydqj.supabase.co/functions/v1/update-medicaments-openfda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      setSyncResult(json);
      if (json.success) {
        setMedCount(prev => prev != null ? prev + (json.inserted || 0) : null);
        loadSyncInfo();
      }
    } catch (err: unknown) {
      setSyncResult({ success: false, error: err instanceof Error ? err.message : 'Erreur réseau' });
    } finally {
      setSyncRunning(false);
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
    { id: 'ia',         label: '🤖 IA'         },
    { id: 'secretaire', label: '🗂 Secrétaire' },
  ] as const;

  // Load sync info when cabinet section becomes active
  useEffect(() => {
    if (activeSection === 'cabinet') loadSyncInfo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

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
                      ? 'bg-sky-500 text-white'
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
              <>
                <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm p-5">
                  <h3 className="font-bold text-slate-900 dark:text-[#E2E8F0] mb-4">Informations personnelles</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Prénom', value: user?.prenom || '', type: 'text' },
                      { label: 'Nom', value: user?.nom || '', type: 'text' },
                      { label: 'Email', value: user?.email || '', type: 'email', colSpan: true },
                      { label: 'Spécialité', value: doctorProfile?.specialite || '', type: 'text', colSpan: true },
                    ].map(f => (
                      <div key={f.label} className={f.colSpan ? 'col-span-2' : ''}>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">{f.label}</label>
                        <input defaultValue={f.value} type={f.type}
                          className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-500/40"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => navigate('/profile')}
                    className="mt-4 px-5 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition-colors"
                  >
                    Modifier le profil complet →
                  </button>
                </div>
              </>
            )}

            {activeSection === 'cabinet' && (
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
                    className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
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
            )}

            {/* OpenFDA sync card — separate from the logo block */}
            {activeSection === 'cabinet' && (
              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-[#E2E8F0]">Synchronisation médicaments</h3>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">Importe les nouveaux médicaments depuis la base OpenFDA (FDA américaine)</p>
                  </div>
                  {medCount != null && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">{medCount.toLocaleString('fr-FR')}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">médicaments</p>
                    </div>
                  )}
                </div>

                {lastSync && (
                  <div className="p-3 bg-slate-50 dark:bg-white/[0.04] rounded-xl border border-slate-200 dark:border-white/[0.06] text-xs text-slate-500 dark:text-slate-400">
                    ✅ Dernière sync réussie : {new Date(lastSync.finished_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {' · '}{lastSync.inserted} ajoutés, {lastSync.skipped} ignorés
                  </div>
                )}

                {syncResult && (
                  <div className={`p-3 rounded-xl border text-xs font-medium ${
                    syncResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                      : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-800 dark:text-red-300'
                  }`}>
                    {syncResult.success
                      ? `✅ Sync réussie : ${syncResult.inserted} médicaments ajoutés, ${syncResult.skipped} ignorés, ${syncResult.errors} erreurs`
                      : `❌ Erreur : ${syncResult.error}`}
                    {syncResult.message && <p className="mt-1 opacity-70">{syncResult.message}</p>}
                  </div>
                )}

                <button
                  onClick={handleOpenFDASync}
                  disabled={syncRunning}
                  className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  {syncRunning && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {syncRunning ? 'Synchronisation en cours…' : '🔄 Synchroniser avec OpenFDA'}
                </button>
                <p className="text-[10px] text-slate-400 dark:text-slate-600">
                  Ajoute jusqu'à 100 médicaments de la base FDA par exécution. La rotation hebdomadaire couvre 13 classes thérapeutiques différentes.
                </p>
              </div>
            )}

            {activeSection === 'securite' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 mb-4">Sécurité du compte</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Mot de passe actuel</label>
                    <input type="password" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Nouveau mot de passe</label>
                    <input type="password" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                  </div>
                  <button className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 transition-colors">
                    Changer le mot de passe
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'ia' && (
              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-[#E2E8F0] mb-1">Assistant IA (Claude)</h3>
                  <p className="text-sm text-slate-500 dark:text-[#94A3B8]">
                    L'Assistant IA utilise Claude d'Anthropic. Obtenez votre clé sur{' '}
                    <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer"
                      className="text-sky-600 dark:text-sky-400 underline">console.anthropic.com</a>
                  </p>
                </div>

                {apiKeyMsg && (
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
                    apiKeyMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                      : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400'
                  }`}>
                    {apiKeyMsg.text}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
                    Clé API Anthropic
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-500/40 font-mono"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      try {
                        if (apiKey.trim()) localStorage.setItem('ordosur_anthropic_key', apiKey.trim());
                        else localStorage.removeItem('ordosur_anthropic_key');
                        setApiKeyMsg({ type: 'success', text: '✓ Clé API sauvegardée dans le navigateur.' });
                        setTimeout(() => setApiKeyMsg(null), 3000);
                      } catch {
                        setApiKeyMsg({ type: 'error', text: 'Erreur lors de la sauvegarde.' });
                      }
                    }}
                    className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition-colors"
                  >
                    Sauvegarder
                  </button>
                  <button
                    disabled={!apiKey.trim() || apiTesting}
                    onClick={async () => {
                      setApiTesting(true); setApiKeyMsg(null);
                      try {
                        const res = await fetch('https://api.anthropic.com/v1/messages', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': apiKey.trim(),
                            'anthropic-version': '2023-06-01',
                            'anthropic-dangerous-allow-browser': 'true',
                          },
                          body: JSON.stringify({
                            model: 'claude-opus-4-5',
                            max_tokens: 10,
                            messages: [{ role: 'user', content: 'Test' }],
                          }),
                        });
                        if (res.ok) setApiKeyMsg({ type: 'success', text: '✅ Connexion réussie ! Clé API valide.' });
                        else { const d = await res.json().catch(() => ({})); throw new Error(d?.error?.message || `HTTP ${res.status}`); }
                      } catch (e: unknown) {
                        setApiKeyMsg({ type: 'error', text: `❌ Erreur : ${e instanceof Error ? e.message : String(e)}` });
                      } finally {
                        setApiTesting(false);
                      }
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#94A3B8] rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors disabled:opacity-50"
                  >
                    {apiTesting && <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />}
                    Tester la connexion
                  </button>
                </div>

                <div className="p-3 bg-sky-50 dark:bg-sky-500/[0.08] rounded-xl border border-sky-100 dark:border-sky-500/20 text-xs text-sky-800 dark:text-sky-400">
                  🤖 Modèle : <strong>claude-opus-4-5</strong> — Questions médicales, interactions, posologies, diagnostics différentiels
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
                        className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-500/40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">Nom</label>
                      <input
                        value={secNom}
                        onChange={e => setSecNom(e.target.value)}
                        placeholder="Benali"
                        className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-500/40"
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
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-500/40"
                    />
                  </div>
                  <button
                    onClick={handleInviteSecretaire}
                    disabled={secInviting || !secEmail.trim()}
                    className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
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
                          className="px-3 py-1.5 bg-sky-500 text-white text-xs font-semibold rounded-lg hover:bg-sky-600 transition-colors whitespace-nowrap"
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
  const { user, signOut, doctorProfile, clinicProfile } = useAuth();
  const navigate = useNavigate();

  // Navigation
  const [activeView, setActiveView] = useState<ViewType>('home');
  const [showAIChat, setShowAIChat] = useState(false);

  // Patients
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
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
  const [selectedMeds, setSelectedMeds] = useState<Array<{ id: string; nom: string; dci?: string | null }>>([]);
  const [medSearchTerm, setMedSearchTerm] = useState('');
  const [showMedDropdown, setShowMedDropdown] = useState(false);
  const [medSearchLoading, setMedSearchLoading] = useState(false);

  // Analysis
  const [result, setResult] = useState<InteractionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [allContraindications, setAllContraindications] = useState<DbContraindication[]>([]);
  const [interactionAlerts, setInteractionAlerts] = useState<InteractionAlert[]>([]);

  // Prescription
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [showPrescriptionPreview, setShowPrescriptionPreview] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState<any>(null);
  const [prescriptionOrdreNumber, setPrescriptionOrdreNumber] = useState('');
  const [showMedicationHistory, setShowMedicationHistory] = useState(false);
  const [patientOrdonnances, setPatientOrdonnances] = useState<any[]>([]);

  // Stats
  const [stats, setStats] = useState({ totalPatients: 0, ordonnances: 0, evolution: 0 });
  const [dataLoading, setDataLoading] = useState(true);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auth guard
  useEffect(() => {
    if (!user || user.role !== 'doctor') navigate('/');
    else {
      loadPatients();
      loadStats();
      loadInteractionDb();
    }
  }, [user, navigate]);

  // Scroll to result
  useEffect(() => {
    if (result && resultsRef.current) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [result]);

  // Real-time interaction check — DCI-based, pipe-pattern splitting, accent normalization
  useEffect(() => {
    if (selectedMeds.length === 0) { setInteractionAlerts([]); return; }

    // Normalize: strip accents, lowercase, remove non-alphanumeric
    const norm = (s: string) =>
      s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
       .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

    const medDCIs = selectedMeds.map(m => ({
      ...m,
      normalizedDCI:  norm(m.dci || ''),
      normalizedName: norm(m.nom),
    }));

    const runCheck = async () => {
      const alerts: InteractionAlert[] = [];
      const seen = new Set<string>();

      // ── 1. Drug-drug interactions (≥ 2 meds) ──────────────────────────────
      if (selectedMeds.length >= 2) {
        const normalizedStrings = medDCIs.map(m => `${m.normalizedDCI} ${m.normalizedName}`);
        const { data: interactions } = await supabase.rpc(
          'check_drug_interactions_for_meds',
          { p_med_strings: normalizedStrings }
        );
        if (interactions) {
          for (const interaction of interactions as DbInteraction[]) {
            const p1 = norm(interaction.dci_1_pattern);
            const p2 = norm(interaction.dci_2_pattern);
            const idx1 = normalizedStrings.findIndex(s => s.includes(p1));
            const idx2 = normalizedStrings.findIndex(s => s.includes(p2) && s !== normalizedStrings[idx1]);
            const i1 = idx1 !== -1 ? idx1 : 0;
            const i2 = idx2 !== -1 ? idx2 : (idx1 === 0 ? 1 : 0);
            const key = `dd|${[selectedMeds[i1].nom, selectedMeds[i2].nom].sort().join('+')}|${interaction.description.substring(0, 40)}`;
            if (!seen.has(key)) {
              seen.add(key);
              alerts.push({
                type: 'drug_drug',
                severite: interaction.severite,
                description: interaction.description,
                involved: [selectedMeds[i1].nom, selectedMeds[i2].nom],
              });
            }
          }
        }
      }

      // ── 2. Contraindications (runs even with 1 med, requires patient) ──────
      if (selectedPatient && allContraindications.length > 0) {
        const patientConditions = [
          ...(selectedPatient.pathologies || []),
          ...(selectedPatient.allergies_medicaments || []),
          ...(selectedPatient.allergies_alimentaires || []),
        ].map(c => norm(c));

        for (const contra of allContraindications) {
          // dci_pattern may be pipe-separated (OR): "amoxicilline|ampicilline|..."
          const dciParts = contra.dci_pattern.split('|').map(p => norm(p.trim())).filter(p => p.length > 2);
          const cv = norm(contra.condition_valeur);

          // Find which selected med matches this dci pattern
          const matchedIdx = medDCIs.findIndex(m =>
            dciParts.some(dp =>
              m.normalizedDCI.includes(dp) || m.normalizedName.includes(dp)
            )
          );
          if (matchedIdx === -1) continue;

          // Check patient has the contraindicated condition
          const condMatch = patientConditions.some(pc =>
            pc.includes(cv) || cv.includes(pc) ||
            (cv.length > 6 && pc.includes(cv.slice(0, Math.min(cv.length, 14))))
          );
          if (!condMatch) continue;

          const key = `ci|${selectedMeds[matchedIdx].nom}|${contra.condition_valeur.slice(0, 30)}`;
          if (!seen.has(key)) {
            seen.add(key);
            alerts.push({
              type: 'contraindication',
              severite: contra.severite === 'absolue' ? 'contre_indication' : 'majeure',
              description: contra.description,
              involved: [selectedMeds[matchedIdx].nom],
            });
          }
        }
      }

      // ── 3. DCI non identifiée — avertissement ─────────────────────────────
      for (const m of selectedMeds) {
        if (!m.dci || m.dci.trim() === '') {
          const key = `nodci|${m.nom}`;
          if (!seen.has(key)) {
            seen.add(key);
            alerts.push({
              type: 'contraindication',
              severite: 'mineure',
              description: `⚠ DCI non identifiée pour "${m.nom}" — vérification des contre-indications limitée.`,
              involved: [m.nom],
            });
          }
        }
      }

      setInteractionAlerts(alerts);
    };

    runCheck();
  }, [selectedMeds, selectedPatient, allContraindications]);

  // ── Data loaders ─────────────────────────────────────────────────────────

  const loadPatients = async () => {
    if (!user) return;
    setDataLoading(true);
    const { data } = await supabase
      .from('patients').select('*').eq('org_id', user.org_id)
      .order('created_at', { ascending: false });
    if (data) setPatients(data);
    setDataLoading(false);
  };

  const loadInteractionDb = async () => {
    const { data: contras } = await supabase.from('contraindications').select('*');
    if (contras) setAllContraindications(contras);
  };

  const loadStats = async () => {
    if (!user) return;
    try {
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

      const [patientsRes, ordRes, thisMonthPats, lastMonthPats] = await Promise.all([
        // Total patients for this org
        supabase.from('patients')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', user.org_id),
        // Ordonnances by this doctor — MUST use doctorProfile.id (doctors PK), NOT user.id (auth UUID)
        supabase.from('ordonnances')
          .select('id', { count: 'exact', head: true })
          .eq('doctor_id', doctorProfile?.id || user.id),
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
      ]);

      const totalPatients  = patientsRes.count  ?? 0;
      const ordonnances    = ordRes.count        ?? 0;
      const thisMonth      = thisMonthPats.count ?? 0;
      const lastMonth      = lastMonthPats.count ?? 0;

      // Evolution: % change in new patients month-over-month
      const evolution = lastMonth > 0
        ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
        : thisMonth > 0 ? 100 : 0;

      setStats({ totalPatients, ordonnances, evolution });
    } catch (err) {
      console.error('[DoctorDashboard] loadStats error:', err);
    }
  };

  const searchMedications = async (term: string) => {
    if (term.length < 2) { setMedSearchResults([]); return; }
    setMedSearchLoading(true);
    const { data } = await supabase.rpc('search_medicaments', {
      search_term: term,
      limit_count: 15,
    });
    setMedSearchResults((data as Medicament[]) || []);
    setMedSearchLoading(false);
  };

  const loadPatientOrdonnances = async (patientId: string) => {
    try {
      const { data, error } = await supabase.from('ordonnances')
        .select(`id, date, statut, doctor_id, created_at, ordonnance_lignes(id, medicament_nom, posologie, duree, instructions)`)
        .eq('patient_id', patientId).order('created_at', { ascending: false });
      if (error || !data || data.length === 0) { setPatientOrdonnances([]); return; }

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
    } catch { setPatientOrdonnances([]); }
  };

  // ── Prescription save ─────────────────────────────────────────────────────

  const handleSaveOrdonnance = async () => {
    if (!user || !selectedPatient || !prescriptionData) return;

    // BUG FIX: doctor_id must be doctors.id (PK), NOT user.id (auth UUID).
    // The ordonnances table has a FK ordonnances.doctor_id → doctors.id,
    // and the RLS INSERT policy checks doctor_id = (SELECT doctors.id FROM doctors WHERE user_id = auth.uid()).
    const doctorId = doctorProfile?.id;
    if (!doctorId) {
      showToast('Profil médecin non chargé — rechargez la page', 'error');
      return;
    }

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
        medicament_nom: m.nom,
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

      showToast('Ordonnance enregistrée avec succès', 'success');
      setShowPrescriptionPreview(false);
      setPrescriptionData(null);
      loadStats();

      // Refresh patient ordonnances if one is selected
      if (selectedPatient) loadPatientOrdonnances(selectedPatient.id);

    } catch (e: any) {
      console.error('[OrdoSur] handleSaveOrdonnance error:', e);
      showToast(e?.message || "Erreur lors de l'enregistrement de l'ordonnance", 'error');
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

  const handleDeletePatient = async (patientId: string) => {
    if (!confirm('Supprimer ce patient ?')) return;
    try {
      const { error } = await supabase.from('patients').delete().eq('id', patientId);
      if (error) throw error;
      setPatients(prev => prev.filter(p => p.id !== patientId));
      if (selectedPatient?.id === patientId) setSelectedPatient(null);
      showToast('Patient supprimé', 'info');
      loadStats();
    } catch (e: any) {
      showToast(e?.message || 'Erreur', 'error');
    }
  };

  const handleLogout = async () => { await signOut(); navigate('/'); };

  const addMedication = (med: Medicament) => {
    if (!selectedMeds.some(m => m.id === med.id))
      setSelectedMeds([...selectedMeds, { id: med.id, nom: med.nom_commercial || med.nom, dci: med.dci }]);
    setMedSearchTerm(''); setMedSearchResults([]); setShowMedDropdown(false);
  };

  const removeMedication = (medId: string) => setSelectedMeds(selectedMeds.filter(m => m.id !== medId));

  const checkInteractions = async () => {
    if (selectedMeds.length < 1) { showToast('Sélectionnez au moins 1 médicament', 'error'); return; }
    if (!selectedPatient) { showToast('Sélectionnez un patient pour analyser les contre-indications', 'error'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 200));

    let overallSeverity: 'safe' | 'attention' | 'dangerous' = 'safe';
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

    for (const alert of interactionAlerts) {
      if (alert.severite === 'contre_indication') overallSeverity = 'dangerous';
      else if (alert.severite === 'majeure' && overallSeverity !== 'dangerous') overallSeverity = 'attention';
      else if (alert.severite === 'moderee' && overallSeverity === 'safe') overallSeverity = 'attention';
      const prefix = alert.type === 'contraindication' ? `Contre-indication patient (${alert.involved[0]})` : alert.involved.join(' + ');
      reasons.push(`${getSeveriteLabel(alert.severite)} — ${prefix} : ${alert.description}`);
    }

    const nbCI  = interactionAlerts.filter(a => a.severite === 'contre_indication').length;
    const nbMaj = interactionAlerts.filter(a => a.severite === 'majeure').length;
    const description =
      overallSeverity === 'dangerous'
        ? `${nbCI} contre-indication(s) détectée(s) — Prescription à risque élevé`
        : overallSeverity === 'attention'
          ? `${nbMaj} interaction(s) signalée(s) — Précautions requises`
          : reasons.length > 0
            ? reasons[0]
            : selectedMeds.length === 1
              ? `✓ Aucune contre-indication connue pour ${selectedMeds[0].nom} avec le profil de ce patient`
              : `✓ Aucune interaction connue entre les ${selectedMeds.length} médicaments sélectionnés`;

    setResult({ severity: overallSeverity, description, alternatives: [], reasons, medications: [], patientPrecautions: [] });
    setLoading(false);
  };

  const resetAnalysis = () => {
    setSelectedMeds([]); setMedSearchTerm(''); setInteractionAlerts([]); setResult(null);
  };

  const filteredPatientsForDropdown = patientSearchTerm.length >= 1
    ? patients.filter(p => `${p.prenom} ${p.nom}`.toLowerCase().includes(patientSearchTerm.toLowerCase())).slice(0, 8)
    : [];

  const userInitials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase() || 'MD';
  const specialite = doctorProfile?.specialite || clinicProfile?.nom || 'Généraliste';

  // Navigate to checker with patient pre-selected
  const navigateToChecker = () => setActiveView('checker');

  const openAddPatient = () => {
    setEditingPatient(null);
    setShowPatientModal(true);
  };

  // ── Keyboard shortcuts (Escape only — Ctrl+K handled in TopBar) ──────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPatient(null);
        setShowAIChat(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#060D1A] overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        onAIChat={() => setShowAIChat(true)}
        onLogout={handleLogout}
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

        <main className="flex-1 overflow-auto bg-[#F8FAFC] dark:bg-[#060D1A]">
          <AnimatePresence mode="wait">
            {activeView === 'home' && (
              <HomeView
                key="home"
                stats={stats}
                patients={patients}
                interactionAlerts={interactionAlerts}
                onNavigate={setActiveView}
                onAddPatient={openAddPatient}
                dataLoading={dataLoading}
              />
            )}

            {activeView === 'patients' && (
              <PatientsView
                key="patients"
                patients={patients}
                selectedPatient={selectedPatient}
                setSelectedPatient={setSelectedPatient}
                onAddPatient={openAddPatient}
                onEditPatient={p => { setEditingPatient(p); setShowPatientModal(true); }}
                onDeletePatient={handleDeletePatient}
                onNavigateToChecker={navigateToChecker}
                patientOrdonnances={patientOrdonnances}
                loadPatientOrdonnances={loadPatientOrdonnances}
                showMedicationHistory={showMedicationHistory}
                setShowMedicationHistory={setShowMedicationHistory}
                resetAnalysis={resetAnalysis}
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
                selectedMeds={selectedMeds}
                medSearchTerm={medSearchTerm}
                setMedSearchTerm={setMedSearchTerm}
                showMedDropdown={showMedDropdown}
                setShowMedDropdown={setShowMedDropdown}
                medSearchLoading={medSearchLoading}
                searchMedications={searchMedications}
                addMedication={addMedication}
                removeMedication={removeMedication}
                interactionAlerts={interactionAlerts}
                result={result}
                loading={loading}
                checkInteractions={checkInteractions}
                resetAnalysis={resetAnalysis}
                resultsRef={resultsRef as React.RefObject<HTMLDivElement>}
                loadPatientOrdonnances={loadPatientOrdonnances}
                patientOrdonnances={patientOrdonnances}
                onAddPatient={openAddPatient}
                setShowPrescriptionForm={setShowPrescriptionForm}
              />
            )}

            {activeView === 'ordonnances' && (
              <OrdonnancesView key="ordonnances" onNavigate={setActiveView} doctorId={doctorProfile?.id || user?.id || ''} />
            )}

            {activeView === 'stats' && (
              <StatsView key="stats" userId={user?.id || ''} />
            )}

            {activeView === 'agenda' && (
              <AgendaView key="agenda" patients={patients} showToast={showToast} />
            )}

            {activeView === 'encyclopedie' && (
              <EncyclopedieView key="encyclopedie" />
            )}

            {activeView === 'documents' && (
              <DocumentsView key="documents" patients={patients} showToast={showToast} />
            )}

            {activeView === 'settings' && (
              <SettingsView key="settings" navigate={navigate} user={user} doctorProfile={doctorProfile} />
            )}
          </AnimatePresence>
        </main>
      </div>

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

      {selectedPatient && (
        <PrescriptionFormModal
          isOpen={showPrescriptionForm}
          onClose={() => setShowPrescriptionForm(false)}
          patient={selectedPatient}
          initialMedications={selectedMeds.map(m => ({ nom: (m as any).nom_commercial || m.nom || '' }))}
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
          medications={prescriptionData.medications ?? []}
          remarks={prescriptionData.remarks ?? ''}
          nextAppointment={prescriptionData.nextAppointment}
          interactionAlerts={interactionAlerts}
        />
      )}

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
