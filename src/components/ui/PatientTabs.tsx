import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, FileText, Syringe, FolderOpen, Activity,
  Phone, Mail, MapPin, Plus, AlertTriangle, User,
  Droplets, Pill, Scissors, Edit,
} from 'lucide-react';
import { PatientAvatar } from './PatientAvatar';

interface Patient {
  id: string;
  prenom: string;
  nom: string;
  date_naissance?: string | null;
  sexe?: string | null;
  telephone?: string | null;
  email?: string | null;
  adresse?: string | null;
  groupe_sanguin?: string | null;
  pathologies?: string[];
  allergies_medicaments?: string[];
  allergies_alimentaires?: string[];
  antecedents_chirurgicaux?: string | null;
  traitements_en_cours?: string | null;
}

type TabId = 'resume' | 'ordonnances' | 'consultations' | 'documents' | 'vaccination';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'resume',       label: 'Résumé',       icon: User       },
  { id: 'ordonnances',  label: 'Ordonnances',  icon: FileText   },
  { id: 'consultations',label: 'Consultations',icon: Activity   },
  { id: 'documents',    label: 'Documents',    icon: FolderOpen },
  { id: 'vaccination',  label: 'Vaccination',  icon: Syringe    },
];

function getPatientAge(dateNaissance: string | null | undefined): number | null {
  if (!dateNaissance) return null;
  const today = new Date();
  const birth = new Date(dateNaissance);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/* ── Resume Tab ─────────────────────────────────────────────────── */
function ResumeTab({ patient }: { patient: Patient }) {
  const hasInfo =
    (patient.pathologies?.length ?? 0) > 0 ||
    (patient.allergies_medicaments?.length ?? 0) > 0 ||
    (patient.allergies_alimentaires?.length ?? 0) > 0 ||
    patient.groupe_sanguin || patient.traitements_en_cours || patient.antecedents_chirurgicaux;

  return (
    <div className="space-y-4">
      {/* Identity card */}
      <div className="bg-slate-50 dark:bg-white/[0.04] rounded-2xl p-4 lg:p-5 border border-slate-100 dark:border-white/[0.06]">
        <h4 className="text-xs font-bold text-slate-500 dark:text-[#475569] uppercase tracking-widest mb-3 flex items-center gap-2">
          <User className="w-3.5 h-3.5" /> Identité
        </h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {patient.date_naissance && (
            <div>
              <p className="text-xs text-slate-400 dark:text-[#475569]">Date de naissance</p>
              <p className="font-semibold text-slate-800 dark:text-[#E2E8F0] mt-0.5">
                {new Date(patient.date_naissance).toLocaleDateString('fr-FR')}
                <span className="text-slate-400 dark:text-[#475569] font-normal ml-1.5">
                  ({getPatientAge(patient.date_naissance)} ans)
                </span>
              </p>
            </div>
          )}
          {patient.sexe && (
            <div>
              <p className="text-xs text-slate-400 dark:text-[#475569]">Sexe</p>
              <p className="font-semibold text-slate-800 dark:text-[#E2E8F0] mt-0.5">
                {patient.sexe === 'M' ? '♂ Homme' : '♀ Femme'}
              </p>
            </div>
          )}
          {patient.telephone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-[#475569]" />
              <div>
                <p className="text-xs text-slate-400 dark:text-[#475569]">Téléphone</p>
                <p className="font-semibold text-slate-800 dark:text-[#E2E8F0] mt-0.5 text-sm">{patient.telephone}</p>
              </div>
            </div>
          )}
          {patient.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-[#475569]" />
              <div>
                <p className="text-xs text-slate-400 dark:text-[#475569]">Email</p>
                <p className="font-semibold text-slate-800 dark:text-[#E2E8F0] mt-0.5 text-sm truncate">{patient.email}</p>
              </div>
            </div>
          )}
          {patient.adresse && (
            <div className="flex items-center gap-2 col-span-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-[#475569] flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 dark:text-[#475569]">Adresse</p>
                <p className="font-semibold text-slate-800 dark:text-[#E2E8F0] mt-0.5 text-sm">{patient.adresse}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Medical info */}
      {hasInfo && (
        <div className="bg-slate-50 dark:bg-white/[0.04] rounded-2xl p-4 lg:p-5 border border-slate-100 dark:border-white/[0.06]">
          <h4 className="text-xs font-bold text-slate-500 dark:text-[#475569] uppercase tracking-widest mb-3 flex items-center gap-2">
            <Heart className="w-3.5 h-3.5 text-rose-500" /> Informations médicales
          </h4>
          <div className="space-y-3">
            {patient.groupe_sanguin && (
              <div className="flex items-center gap-3">
                <Droplets className="w-4 h-4 text-rose-400" />
                <span className="text-xs text-slate-500 dark:text-[#94A3B8]">Groupe sanguin</span>
                <span className="px-2.5 py-0.5 bg-rose-500 text-white text-xs font-bold rounded-full">
                  {patient.groupe_sanguin}
                </span>
              </div>
            )}
            {(patient.pathologies?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] mb-1.5">Pathologies</p>
                <div className="flex flex-wrap gap-1.5">
                  {patient.pathologies!.map(p => (
                    <span key={p} className="px-2.5 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 text-xs rounded-full font-medium border border-blue-200 dark:border-blue-500/30">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(patient.allergies_medicaments?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-red-500" /> Allergies médicamenteuses
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {patient.allergies_medicaments!.map(a => (
                    <span key={a} className="px-2.5 py-1 bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300 text-xs rounded-full font-medium border border-red-200 dark:border-red-500/30">
                      ⚠ {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(patient.allergies_alimentaires?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] mb-1.5">Allergies alimentaires</p>
                <div className="flex flex-wrap gap-1.5">
                  {patient.allergies_alimentaires!.map(a => (
                    <span key={a} className="px-2.5 py-1 bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300 text-xs rounded-full font-medium border border-orange-200 dark:border-orange-500/30">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {patient.antecedents_chirurgicaux && (
              <div className="flex items-start gap-2">
                <Scissors className="w-4 h-4 text-slate-400 dark:text-[#475569] mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Antécédents chirurgicaux</p>
                  <p className="text-sm text-slate-700 dark:text-[#E2E8F0] mt-0.5">{patient.antecedents_chirurgicaux}</p>
                </div>
              </div>
            )}
            {patient.traitements_en_cours && (
              <div className="flex items-start gap-2">
                <Pill className="w-4 h-4 text-violet-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Traitements en cours</p>
                  <p className="text-sm text-slate-700 dark:text-[#E2E8F0] mt-0.5">{patient.traitements_en_cours}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!hasInfo && (
        <div className="text-center py-10">
          <Heart className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
          <p className="text-sm text-slate-400 dark:text-[#475569]">Aucune information médicale renseignée</p>
        </div>
      )}
    </div>
  );
}

/* ── Ordonnances Tab ────────────────────────────────────────────── */
function OrdonnancesTab({ ordonnances }: { ordonnances: any[] }) {
  if (ordonnances.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
        <p className="text-sm font-medium text-slate-400 dark:text-[#475569]">Aucune ordonnance</p>
        <p className="text-xs text-slate-300 dark:text-slate-700 mt-1">
          Les ordonnances créées depuis le Vérificateur apparaîtront ici
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {ordonnances.map(ord => {
        const dateStr = ord.date || ord.created_at;
        const dateLabel = dateStr
          ? new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
          : 'Date inconnue';
        return (
          <div
            key={ord.id}
            className="bg-slate-50 dark:bg-white/[0.04] rounded-xl p-3 lg:p-4
              border border-slate-100 dark:border-white/[0.06]
              hover:border-[#00A86B]/30 dark:hover:border-[#00A86B]/30
              dark:hover:shadow-[0_0_0_1px_rgba(0,168,107,0.12)]
              transition-all"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-[#E6F4EE] dark:bg-[#00A86B]/20 rounded-md flex items-center justify-center">
                <FileText className="w-4 h-4 text-[#00A86B]" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-[#E2E8F0]">{dateLabel}</p>
                {ord.doctor_name && <p className="text-[11px] text-slate-400 dark:text-[#475569]">{ord.doctor_name}</p>}
              </div>
              <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                ord.statut === 'valide'
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-white/[0.07] text-slate-600 dark:text-[#94A3B8]'
              }`}>
                {ord.statut || 'Créée'}
              </span>
            </div>
            <div className="space-y-1.5 pl-8 lg:pl-10">
              {(ord.medications || []).map((med: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00A86B] flex-shrink-0" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0]">{med.nom}</span>
                  {med.posologie && <span className="text-xs text-slate-400 dark:text-[#475569]">– {med.posologie}</span>}
                  {med.duree && <span className="text-xs text-slate-400 dark:text-[#475569]">/ {med.duree}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Placeholder Tab ────────────────────────────────────────────── */
function PlaceholderTab({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-slate-100 dark:bg-white/[0.05] rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-slate-300 dark:text-slate-700" />
      </div>
      <p className="text-sm font-semibold text-slate-500 dark:text-[#94A3B8]">{title}</p>
      <p className="text-xs text-slate-400 dark:text-[#475569] mt-1 max-w-xs mx-auto">{desc}</p>
      <button className="mt-4 px-4 py-2 bg-[#E6F4EE] dark:bg-[#00A86B]/[0.1] text-[#00A86B] rounded-md text-xs font-semibold hover:bg-[#d4eee0] dark:hover:bg-[#00A86B]/[0.18] transition-colors flex items-center gap-1.5 mx-auto">
        <Plus className="w-3.5 h-3.5" /> Ajouter
      </button>
    </div>
  );
}

/* ── Main PatientTabs ────────────────────────────────────────────── */
interface PatientTabsProps {
  patient: Patient;
  ordonnances: any[];
  onEdit: () => void;
  onNavigateToChecker: () => void;
}

export function PatientTabs({ patient, ordonnances, onEdit, onNavigateToChecker }: PatientTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('resume');

  return (
    <div className="flex flex-col h-full">
      {/* Patient header — reflow vertical mobile / horizontal desktop */}
      <div className="bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-white/[0.06] px-4 lg:px-6 pt-4 lg:pt-5 pb-0 flex-shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-4 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
          {/* Avatar + nom + méta + counters — bloc unique qui prend toute la largeur en flex-col mobile */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <PatientAvatar name={`${patient.prenom} ${patient.nom}`} size="lg" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg lg:text-xl font-bold text-slate-900 dark:text-[#E2E8F0] truncate">{patient.prenom} {patient.nom}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-slate-500 dark:text-[#94A3B8]">
                {patient.sexe && <span>{patient.sexe === 'M' ? '♂ Homme' : '♀ Femme'}</span>}
                {patient.date_naissance && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span>{getPatientAge(patient.date_naissance)} ans</span>
                  </>
                )}
                {patient.groupe_sanguin && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="px-2 py-0.5 bg-rose-500 text-white text-xs font-bold rounded-full">
                      {patient.groupe_sanguin}
                    </span>
                  </>
                )}
                {patient.telephone && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <a href={`tel:${patient.telephone}`} className="hover:text-[#00A86B] transition-colors">{patient.telephone}</a>
                    </span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                <span className="text-xs text-slate-400 dark:text-[#475569]">
                  <span className="font-bold text-slate-700 dark:text-[#94A3B8]">{ordonnances.length}</span> ordonnances
                </span>
                {(patient.allergies_medicaments?.length ?? 0) > 0 && (
                  <span className="text-xs text-red-500 font-semibold">
                    ⚠ {patient.allergies_medicaments!.length} allergie(s)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Boutons — full-width row mobile / compact à droite desktop */}
          <div className="flex gap-2 w-full lg:w-auto flex-shrink-0">
            <button
              onClick={onEdit}
              className="p-2.5 lg:p-2 bg-slate-100 dark:bg-white/[0.07] hover:bg-slate-200 dark:hover:bg-white/[0.12] active:bg-slate-300 text-slate-600 dark:text-[#94A3B8] rounded-xl transition-colors flex-shrink-0"
              title="Modifier"
              aria-label="Modifier"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onNavigateToChecker}
              className="flex-1 lg:flex-none px-3 py-2.5 lg:py-2 bg-[#00A86B] hover:bg-[#006B47] active:bg-[#006B47] text-white rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              💊 Prescrire
            </button>
          </div>
        </div>

        {/* Tabs — scrollables horizontalement sur mobile (5 tabs débordent < 400px) */}
        <div className="flex gap-0 -mb-px mt-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 lg:px-4 py-2.5 lg:py-3 text-xs font-semibold transition-colors flex-shrink-0 whitespace-nowrap active:bg-slate-50 dark:active:bg-white/[0.04] ${
                  isActive
                    ? 'text-[#00A86B] border-b-2 border-[#00A86B]'
                    : 'text-[#94A3B8] dark:text-[#475569] hover:text-[#475569] dark:hover:text-[#94A3B8] border-b-2 border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.id === 'ordonnances' && ordonnances.length > 0 && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-[#E6F4EE] text-[#006B47]'
                      : 'bg-slate-100 dark:bg-white/[0.07] text-slate-500 dark:text-[#475569]'
                  }`}>
                    {ordonnances.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#F8FAFC] dark:bg-[#0A0F1E]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'resume'        && <ResumeTab patient={patient} />}
            {activeTab === 'ordonnances'   && <OrdonnancesTab ordonnances={ordonnances} />}
            {activeTab === 'consultations' && (
              <PlaceholderTab icon={Activity}   title="Consultations" desc="L'historique des consultations sera disponible prochainement" />
            )}
            {activeTab === 'documents' && (
              <PlaceholderTab icon={FolderOpen}  title="Documents" desc="Résultats d'analyses, ordonnances scannées, comptes-rendus..." />
            )}
            {activeTab === 'vaccination' && (
              <PlaceholderTab icon={Syringe}     title="Carnet de vaccination" desc="Suivi des vaccinations et rappels automatiques" />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
