import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogOut, UserPlus, Search, Plus, X, AlertTriangle, Phone, Mail, MapPin, CheckCircle2, Pill, Users, CreditCard as Edit, Trash2, ClipboardList, FileText, Shield, TrendingUp, Clock, BarChart3, CircleUser as UserCircle, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Patient, Medicament } from '../lib/supabase';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { PatientForm } from '../components/PatientForm';
import { Toast } from '../components/Toast';
import { KPICard } from '../components/KPICard';
import { PrescriptionFormModal } from '../components/PrescriptionFormModal';
import { PrescriptionPreviewModal } from '../components/PrescriptionPreviewModal';
import { MedicationHistoryModal } from '../components/MedicationHistoryModal';
import { MonthlyInteractionsChart, RiskDistributionChart, TopMedicationsSection, RecentActivityTimeline, AllMedicationsHistory } from '../components/DoctorAnalytics';
import { EmailVerificationBanner } from '../components/EmailVerificationBanner';

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

export function DoctorDashboard() {
  const { user, signOut, doctorProfile, clinicProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'patients' | 'checker'>('checker');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [medSearchResults, setMedSearchResults] = useState<Medicament[]>([]);
  const [selectedMeds, setSelectedMeds] = useState<Array<{ id: string; nom: string; dci?: string | null }>>([]);
  const [medSearchTerm, setMedSearchTerm] = useState('');
  const [showMedDropdown, setShowMedDropdown] = useState(false);
  const [medSearchLoading, setMedSearchLoading] = useState(false);
  const [result, setResult] = useState<InteractionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [allInteractions, setAllInteractions] = useState<DbInteraction[]>([]);
  const [allContraindications, setAllContraindications] = useState<DbContraindication[]>([]);
  const [interactionAlerts, setInteractionAlerts] = useState<InteractionAlert[]>([]);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [showPrescriptionPreview, setShowPrescriptionPreview] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState<any>(null);
  const [showMedicationHistory, setShowMedicationHistory] = useState(false);
  const [patientOrdonnances, setPatientOrdonnances] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    ordonnances: 0,
    safetyRate: 100,
    evolution: 0,
  });

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || user.role !== 'doctor') {
      navigate('/');
    } else {
      loadPatients();
      loadStats();
      loadInteractionDb();
    }
  }, [user, navigate]);

  useEffect(() => {
    if (result && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [result]);

  // Real-time interaction checking
  useEffect(() => {
    if (selectedMeds.length === 0) {
      setInteractionAlerts([]);
      return;
    }

    // CORRECTION BUG : on cherche dans DCI + nom commercial pour couvrir
    // les cas où la DCI BDPM diffère du nom courant (ex: "ACIDE ACÉTYLSALICYLIQUE" ≠ "aspirine")
    const matchStrings = selectedMeds.map(m =>
      ((m.dci || '') + ' ' + m.nom).toLowerCase()
    );

    const alerts: InteractionAlert[] = [];

    // ── Drug-drug interactions (nécessite 2+ médicaments) ─────────────────
    if (selectedMeds.length >= 2 && allInteractions.length > 0) {
      for (const interaction of allInteractions) {
        const p1 = interaction.dci_1_pattern.toLowerCase();
        const p2 = interaction.dci_2_pattern.toLowerCase();
        const idx1 = matchStrings.findIndex(s => s.includes(p1));
        const idx2 = matchStrings.findIndex(s => s.includes(p2));
        if (idx1 !== -1 && idx2 !== -1 && idx1 !== idx2) {
          alerts.push({
            type: 'drug_drug',
            severite: interaction.severite,
            description: interaction.description,
            involved: [selectedMeds[idx1].nom, selectedMeds[idx2].nom],
          });
        }
      }
    }

    // ── Contre-indications patient (dès 1 médicament si patient sélectionné) ─
    if (selectedPatient && allContraindications.length > 0) {
      const conditions = [
        ...(selectedPatient.pathologies || []),
        ...(selectedPatient.allergies_medicaments || []),
      ].map(c => c.toLowerCase());

      for (const contra of allContraindications) {
        const dp = contra.dci_pattern.toLowerCase();
        const cv = contra.condition_valeur.toLowerCase();
        const matchedIdx = matchStrings.findIndex(s => s.includes(dp));
        const condMatch = conditions.some(c => c.includes(cv) || cv.includes(c));
        if (matchedIdx !== -1 && condMatch) {
          alerts.push({
            type: 'contraindication',
            severite: contra.severite === 'absolue' ? 'contre_indication' : 'majeure',
            description: contra.description,
            involved: [selectedMeds[matchedIdx].nom],
          });
        }
      }
    }

    // Déduplification
    const seen = new Set<string>();
    const unique = alerts.filter(a => {
      const key = `${a.type}|${[...a.involved].sort().join('+')}|${a.description.substring(0, 40)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    setInteractionAlerts(unique);
  }, [selectedMeds, selectedPatient, allInteractions, allContraindications]);

  const loadPatients = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('org_id', user.org_id)
      .order('created_at', { ascending: false });
    if (data) setPatients(data);
  };

  const loadInteractionDb = async () => {
    const [{ data: interactions }, { data: contras }] = await Promise.all([
      supabase.from('drug_interactions').select('*'),
      supabase.from('contraindications').select('*'),
    ]);
    if (interactions) setAllInteractions(interactions);
    if (contras) setAllContraindications(contras);
  };

  const searchMedications = async (term: string) => {
    if (term.length < 2) { setMedSearchResults([]); return; }
    setMedSearchLoading(true);
    const { data } = await supabase
      .from('medicaments')
      .select('id, nom, nom_commercial, dci, forme, dosage, laboratoire')
      .or(`nom_commercial.ilike.%${term}%,dci.ilike.%${term}%`)
      .order('nom_commercial')
      .limit(10);
    setMedSearchResults(data || []);
    setMedSearchLoading(false);
  };

  const loadStats = async () => {
    if (!user) return;

    const { count: patientCount } = await supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', user.org_id);

    const { count: ordCount } = await supabase
      .from('ordonnances')
      .select('id', { count: 'exact', head: true })
      .eq('doctor_id', doctorProfile?.id || user.id);

    setStats({
      totalPatients: patientCount || 0,
      ordonnances: ordCount || 0,
      safetyRate: 100,
      evolution: 0,
    });
  };

  const handleSavePatient = async (patientData: Omit<Patient, 'id' | 'org_id' | 'created_at'>) => {
    if (!user) return;
    try {
      if (editingPatient) {
        await supabase.from('patients').update(patientData).eq('id', editingPatient.id);
        setToast({ message: 'Patient mis à jour', type: 'success' });
      } else {
        await supabase.from('patients').insert({ ...patientData, org_id: user.org_id });
        setToast({ message: 'Patient ajouté', type: 'success' });
      }
      setShowPatientModal(false);
      setEditingPatient(null);
      loadPatients();
    } catch (error) {
      setToast({ message: 'Erreur', type: 'error' });
    }
  };

  const handleDeletePatient = async (patientId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce patient?')) return;
    try {
      await supabase.from('patients').delete().eq('id', patientId);
      setToast({ message: 'Patient supprimé', type: 'success' });
      loadPatients();
    } catch (error) {
      setToast({ message: 'Erreur lors de la suppression', type: 'error' });
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const filteredPatientsForDropdown = patientSearchTerm.length >= 1
    ? patients.filter(p =>
        `${p.prenom} ${p.nom}`.toLowerCase().includes(patientSearchTerm.toLowerCase())
      ).slice(0, 8)
    : [];

  const addMedication = (med: Medicament) => {
    if (!selectedMeds.some(m => m.id === med.id)) {
      setSelectedMeds([...selectedMeds, { id: med.id, nom: med.nom_commercial || med.nom, dci: med.dci }]);
    }
    setMedSearchTerm('');
    setMedSearchResults([]);
    setShowMedDropdown(false);
  };

  const removeMedication = (medId: string) => {
    setSelectedMeds(selectedMeds.filter(m => m.id !== medId));
  };

  const loadPatientOrdonnances = async (patientId: string) => {
    try {
      const { data, error } = await supabase
        .from('ordonnances')
        .select(`
          id, date, statut, doctor_id, created_at,
          ordonnance_lignes(id, medicament_nom, posologie, duree, instructions)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        setPatientOrdonnances([]);
        return;
      }

      const doctorIds = [...new Set(data.map((ord: any) => ord.doctor_id))].filter(Boolean);

      let doctorMap = new Map();
      if (doctorIds.length > 0) {
        const { data: doctorsData } = await supabase
          .from('doctors')
          .select('id, user_id, specialite')
          .in('id', doctorIds);

        if (doctorsData) {
          const userIds = doctorsData.map((d: any) => d.user_id).filter(Boolean);
          const { data: profilesData } = await supabase
            .from('user_profiles')
            .select('user_id, prenom, nom')
            .in('user_id', userIds);

          doctorsData.forEach((doctor: any) => {
            const profile = profilesData?.find((p: any) => p.user_id === doctor.user_id);
            doctorMap.set(doctor.id, {
              name: profile ? `Dr. ${profile.prenom} ${profile.nom}` : 'Dr. Médecin',
              specialty: doctor.specialite || ''
            });
          });
        }
      }

      const ordonnances = data.map((ord: any) => {
        const doctorInfo = doctorMap.get(ord.doctor_id) || { name: 'Dr. Médecin', specialty: '' };
        const lignes = ord.ordonnance_lignes || [];
        return {
          ...ord,
          doctor_name: doctorInfo.name,
          doctor_specialty: doctorInfo.specialty,
          medications: lignes.map((l: any) => ({
            nom: l.medicament_nom,
            posologie: l.posologie || '',
            duree: l.duree || '',
            quantite: l.instructions || ''
          }))
        };
      });

      setPatientOrdonnances(ordonnances);
    } catch (error) {
      console.error('Error loading patient ordonnances:', error);
      setPatientOrdonnances([]);
    }
  };

  const getSeveriteLabel = (s: InteractionAlert['severite']) => {
    if (s === 'contre_indication') return '🔴 CONTRE-INDICATION';
    if (s === 'majeure') return '🟠 INTERACTION MAJEURE';
    if (s === 'moderee') return '🔵 INTERACTION MODÉRÉE';
    return '🟡 INTERACTION MINEURE';
  };

  const checkInteractions = async () => {
    if (selectedMeds.length < 2) {
      setToast({ message: 'Sélectionnez au moins 2 médicaments', type: 'error' });
      return;
    }
    if (!selectedPatient) {
      setToast({ message: 'Sélectionnez un patient', type: 'error' });
      return;
    }

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 200));

    let overallSeverity: 'safe' | 'attention' | 'dangerous' = 'safe';
    const reasons: string[] = [];

    // Duplicates
    for (let i = 0; i < selectedMeds.length; i++) {
      for (let j = i + 1; j < selectedMeds.length; j++) {
        if (selectedMeds[i].nom === selectedMeds[j].nom) {
          overallSeverity = 'dangerous';
          reasons.push(`DUPLICATION : ${selectedMeds[i].nom} prescrit en double — risque de surdosage`);
        }
      }
    }

    // DB alerts
    for (const alert of interactionAlerts) {
      if (alert.severite === 'contre_indication') overallSeverity = 'dangerous';
      else if (alert.severite === 'majeure' && overallSeverity !== 'dangerous') overallSeverity = 'attention';
      else if (alert.severite === 'moderee' && overallSeverity === 'safe') overallSeverity = 'attention';
      const prefix = alert.type === 'contraindication' ? `Contre-indication patient (${alert.involved[0]})` : alert.involved.join(' + ');
      reasons.push(`${getSeveriteLabel(alert.severite)} — ${prefix} : ${alert.description}`);
    }

    const nbCI = interactionAlerts.filter(a => a.severite === 'contre_indication').length;
    const nbMaj = interactionAlerts.filter(a => a.severite === 'majeure').length;
    const description = overallSeverity === 'dangerous'
      ? `${nbCI} contre-indication(s) détectée(s) — Prescription à risque élevé`
      : overallSeverity === 'attention'
      ? `${nbMaj} interaction(s) majeure(s) — Précautions requises`
      : reasons.length > 0 ? reasons[0]
      : `✓ Aucune interaction connue entre les ${selectedMeds.length} médicaments sélectionnés`;

    setResult({ severity: overallSeverity, description, alternatives: [], reasons, medications: [], patientPrecautions: [] });
    setLoading(false);
  };

  const resetAnalysis = () => {
    setSelectedMeds([]);
    setMedSearchTerm('');
    setInteractionAlerts([]);
    setResult(null);
  };

  const getPatientAge = (dateNaissance: string | null | undefined): number | null => {
    if (!dateNaissance) return null;
    const today = new Date();
    const birth = new Date(dateNaissance);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="p-2 md:p-2.5 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-xl shadow-lg">
                <Activity className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-slate-900">OrdoSur</h1>
                <p className="text-xs md:text-sm text-slate-600">{user?.full_name || 'Médecin'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/profile')} className="text-xs md:text-sm">
                <UserCircle className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Mon Profil</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs md:text-sm">
                <LogOut className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Déconnexion</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <EmailVerificationBanner />

      <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Mes Patients Totaux"
            value={stats.totalPatients}
            icon={<ClipboardList className="w-6 h-6" />}
            color="primary"
            subtitle="Patients actifs"
          />
          <KPICard
            title="Ordonnances Créées"
            value={stats.ordonnances}
            icon={<FileText className="w-6 h-6" />}
            color="secondary"
            subtitle="Total"
          />
          <KPICard
            title="Taux de Sécurité"
            value={`${stats.safetyRate}%`}
            icon={<Shield className="w-6 h-6" />}
            color="safe"
            subtitle="Prescriptions vérifiées"
          />
          <KPICard
            title="Évolution"
            value={`+${stats.evolution}%`}
            icon={<TrendingUp className="w-6 h-6" />}
            color="primary"
            subtitle="vs mois dernier"
            trend={{ value: stats.evolution, isPositive: true }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <MonthlyInteractionsChart />
          </div>
          <div>
            <RiskDistributionChart />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <AllMedicationsHistory doctorId={user?.id || ''} />
          <TopMedicationsSection doctorId={user?.id || ''} />
          <RecentActivityTimeline doctorId={user?.id || ''} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 inline-flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mb-6 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('patients')}
            className={`px-4 md:px-6 py-4 md:py-3 rounded-xl font-semibold transition-all flex items-center justify-center text-sm md:text-base ${
              activeTab === 'patients'
                ? 'bg-primary-500 text-white shadow-lg'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="w-5 h-5 mr-2" />
            Gestion des Patients
          </button>
          <button
            onClick={() => setActiveTab('checker')}
            className={`px-4 md:px-6 py-4 md:py-3 rounded-xl font-semibold transition-all flex items-center justify-center text-sm md:text-base ${
              activeTab === 'checker'
                ? 'bg-primary-500 text-white shadow-lg'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Pill className="w-5 h-5 mr-2" />
            Vérification &amp; Prescription
          </button>
        </div>

        {activeTab === 'patients' ? (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">Mes Patients</h2>
              <Button onClick={() => { setEditingPatient(null); setShowPatientModal(true); }} variant="primary" className="w-full md:w-auto py-3 md:py-2 text-base">
                <UserPlus className="w-5 h-5 mr-2" />
                Nouveau Patient
              </Button>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold text-slate-700">Prénom</th>
                    <th className="text-left px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold text-slate-700">Nom</th>
                    <th className="text-left px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold text-slate-700 hidden md:table-cell">Sexe</th>
                    <th className="text-left px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold text-slate-700 hidden lg:table-cell">Téléphone</th>
                    <th className="text-right px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 md:px-6 py-3 md:py-4 font-semibold text-slate-900 text-sm">{patient.prenom}</td>
                      <td className="px-4 md:px-6 py-3 md:py-4 text-slate-700 text-sm">{patient.nom}</td>
                      <td className="px-4 md:px-6 py-3 md:py-4 text-slate-600 text-sm hidden md:table-cell">
                        {patient.sexe === 'M' ? 'Homme' : patient.sexe === 'F' ? 'Femme' : '-'}
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 text-slate-600 text-sm hidden lg:table-cell">
                        {patient.telephone || '-'}
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                        <button
                          onClick={() => { setEditingPatient(patient); setShowPatientModal(true); }}
                          className="p-2.5 md:p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors inline-flex touch-manipulation"
                        >
                          <Edit className="w-5 h-5 md:w-4 md:h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePatient(patient.id)}
                          className="p-2.5 md:p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors inline-flex ml-2 touch-manipulation"
                        >
                          <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {patients.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        Aucun patient enregistré
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <label className="block text-sm md:text-base font-bold text-slate-900 mb-2">Sélectionner un Patient</label>
              <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={patientSearchTerm}
                    onChange={(e) => { setPatientSearchTerm(e.target.value); setShowPatientDropdown(true); }}
                    onFocus={() => setShowPatientDropdown(true)}
                    onBlur={() => setTimeout(() => setShowPatientDropdown(false), 300)}
                    placeholder="Rechercher un patient..."
                    className="w-full px-6 py-4 md:py-4 pl-12 text-base md:text-lg bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-100 focus:border-primary-400 outline-none shadow-sm transition-all touch-manipulation"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 text-slate-400" />
                  {showPatientDropdown && (patientSearchTerm.length === 0 ? patients.length > 0 : filteredPatientsForDropdown.length > 0) && (
                    <div className="absolute z-[9999] w-full mt-2 bg-white border-2 border-slate-200 rounded-2xl shadow-2xl max-h-96 overflow-y-auto">
                      {(patientSearchTerm.length === 0 ? patients : filteredPatientsForDropdown).map((patient) => (
                        <button
                          key={patient.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedPatient(patient);
                            setPatientSearchTerm(`${patient.prenom} ${patient.nom}`);
                            setShowPatientDropdown(false);
                            resetAnalysis();
                            loadPatientOrdonnances(patient.id);
                          }}
                          className="w-full px-6 py-4 text-left hover:bg-slate-50 transition-all border-b border-slate-100 last:border-b-0 group"
                        >
                          <div className="font-bold text-slate-900 text-lg group-hover:text-primary-600 transition-colors">
                            {patient.prenom} {patient.nom}
                          </div>
                          <div className="text-sm text-slate-600 mt-1 flex items-center flex-wrap gap-3">
                            {patient.sexe && <span>{patient.sexe === 'M' ? 'Homme' : 'Femme'}</span>}
                            {patient.date_naissance && (
                              <>
                                <span>•</span>
                                <span>{getPatientAge(patient.date_naissance)} ans</span>
                              </>
                            )}
                            {patient.telephone && (
                              <>
                                <span>•</span>
                                <span>{patient.telephone}</span>
                              </>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button onClick={() => { setEditingPatient(null); setShowPatientModal(true); }} variant="primary" size="lg" className="w-full md:w-auto py-4">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Nouveau Patient
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              <div className="bg-white rounded-3xl shadow-xl border-2 border-slate-100 overflow-hidden">
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 md:px-8 py-4 md:py-5">
                  <h3 className="text-lg md:text-xl font-bold text-white">PROFIL PATIENT</h3>
                </div>

                <div className="p-6 md:p-8">
                  {selectedPatient ? (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">
                          {selectedPatient.prenom} {selectedPatient.nom}
                        </h2>
                        <div className="flex items-center space-x-4 text-slate-600">
                          {selectedPatient.sexe && (
                            <span className="text-lg font-semibold">
                              {selectedPatient.sexe === 'M' ? 'Homme' : 'Femme'}
                            </span>
                          )}
                          {selectedPatient.date_naissance && (
                            <>
                              <span>•</span>
                              <span className="text-lg">
                                {getPatientAge(selectedPatient.date_naissance)} ans
                              </span>
                            </>
                          )}
                        </div>
                        {selectedPatient.date_naissance && (
                          <p className="text-sm text-slate-500 mt-1">
                            Né(e) le {new Date(selectedPatient.date_naissance).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>

                      {(selectedPatient.telephone || selectedPatient.email || selectedPatient.adresse) && (
                        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                          {selectedPatient.telephone && (
                            <div className="flex items-center space-x-2 text-sm text-slate-700">
                              <Phone className="w-4 h-4 text-slate-500" />
                              <span>{selectedPatient.telephone}</span>
                            </div>
                          )}
                          {selectedPatient.email && (
                            <div className="flex items-center space-x-2 text-sm text-slate-700">
                              <Mail className="w-4 h-4 text-slate-500" />
                              <span>{selectedPatient.email}</span>
                            </div>
                          )}
                          {selectedPatient.adresse && (
                            <div className="flex items-center space-x-2 text-sm text-slate-700">
                              <MapPin className="w-4 h-4 text-slate-500" />
                              <span>{selectedPatient.adresse}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Informations médicales */}
                      {(selectedPatient.groupe_sanguin || (selectedPatient.pathologies?.length ?? 0) > 0 || (selectedPatient.allergies_medicaments?.length ?? 0) > 0 || (selectedPatient.allergies_alimentaires?.length ?? 0) > 0 || selectedPatient.traitements_en_cours || selectedPatient.antecedents_chirurgicaux) && (
                        <div className="bg-rose-50 rounded-xl p-4 space-y-3 border border-rose-100">
                          <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide flex items-center gap-1.5">
                            <Heart className="w-3.5 h-3.5 text-rose-500" />
                            Informations médicales
                          </h4>

                          {selectedPatient.groupe_sanguin && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 w-28 flex-shrink-0">Groupe sanguin</span>
                              <span className="px-2.5 py-0.5 bg-rose-500 text-white text-xs font-bold rounded-full">
                                {selectedPatient.groupe_sanguin}
                              </span>
                            </div>
                          )}

                          {(selectedPatient.pathologies?.length ?? 0) > 0 && (
                            <div className="flex items-start gap-2">
                              <span className="text-xs text-slate-500 w-28 flex-shrink-0 mt-0.5">Pathologies</span>
                              <div className="flex flex-wrap gap-1">
                                {selectedPatient.pathologies!.map(p => (
                                  <span key={p} className="px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-200 text-xs rounded-full font-medium">{p}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {(selectedPatient.allergies_medicaments?.length ?? 0) > 0 && (
                            <div className="flex items-start gap-2">
                              <span className="text-xs text-slate-500 w-28 flex-shrink-0 mt-0.5">Allergies méd.</span>
                              <div className="flex flex-wrap gap-1">
                                {selectedPatient.allergies_medicaments!.map(a => (
                                  <span key={a} className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-200 text-xs rounded-full font-medium">⚠ {a}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {(selectedPatient.allergies_alimentaires?.length ?? 0) > 0 && (
                            <div className="flex items-start gap-2">
                              <span className="text-xs text-slate-500 w-28 flex-shrink-0 mt-0.5">Allergies alim.</span>
                              <div className="flex flex-wrap gap-1">
                                {selectedPatient.allergies_alimentaires!.map(a => (
                                  <span key={a} className="px-2 py-0.5 bg-orange-100 text-orange-800 border border-orange-200 text-xs rounded-full font-medium">{a}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedPatient.antecedents_chirurgicaux && (
                            <div className="flex items-start gap-2">
                              <span className="text-xs text-slate-500 w-28 flex-shrink-0 mt-0.5">Antéc. chir.</span>
                              <span className="text-xs text-slate-700">{selectedPatient.antecedents_chirurgicaux}</span>
                            </div>
                          )}

                          {selectedPatient.traitements_en_cours && (
                            <div className="flex items-start gap-2">
                              <span className="text-xs text-slate-500 w-28 flex-shrink-0 mt-0.5">Traitements</span>
                              <span className="text-xs text-slate-700">{selectedPatient.traitements_en_cours}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="border-t-2 border-slate-200 pt-6">
                        <h4 className="text-sm font-bold text-primary-900 mb-4 uppercase tracking-wide flex items-center">
                          <BarChart3 className="w-4 h-4 mr-2" />
                          HISTORIQUE MÉDICAMENTS
                        </h4>

                        {patientOrdonnances.length > 0 ? (
                          <div className="space-y-3">
                            {patientOrdonnances.slice(0, 3).map((ordonnance) => {
                              const dateStr = ordonnance.date || ordonnance.created_at;
                              const formattedDate = dateStr
                                ? new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                : 'Date inconnue';

                              return (
                                <div key={ordonnance.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Clock className="w-4 h-4 text-slate-500" />
                                    <span className="text-xs font-semibold text-slate-700">{formattedDate}</span>
                                    {ordonnance.doctor_name && (
                                      <>
                                        <span className="text-xs text-slate-500">-</span>
                                        <span className="text-xs text-slate-600">
                                          {ordonnance.doctor_name}
                                          {ordonnance.doctor_specialty && (
                                            <span className="text-slate-500"> ({ordonnance.doctor_specialty})</span>
                                          )}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  <ul className="space-y-1 ml-6">
                                    {ordonnance.medications.slice(0, 3).map((med: any, idx: number) => (
                                      <li key={idx} className="text-xs text-slate-700">
                                        <span className="font-medium">{med.nom}</span>
                                        {med.posologie && <span className="text-slate-500"> - {med.posologie}</span>}
                                        {med.duree && <span className="text-slate-500"> - {med.duree}</span>}
                                      </li>
                                    ))}
                                    {ordonnance.medications.length > 3 && (
                                      <li className="text-xs text-slate-500 italic">
                                        +{ordonnance.medications.length - 3} autre(s) médicament(s)
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              );
                            })}

                            <button
                              onClick={() => setShowMedicationHistory(true)}
                              className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-2 hover:bg-primary-50 rounded-lg transition-colors"
                            >
                              Voir tout l'historique →
                            </button>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-slate-500">
                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-xs">Aucun historique disponible</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <Search className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 text-lg font-medium">Sélectionnez un patient</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-xl border-2 border-slate-100 overflow-hidden">
                <div className="bg-gradient-to-r from-secondary-500 to-secondary-600 px-6 md:px-8 py-4 md:py-5">
                  <h3 className="text-lg md:text-xl font-bold text-white">PRESCRIPTION</h3>
                </div>

                <div className="p-6 md:p-8">
                  <div className="mb-6">
                    <label className="block text-sm md:text-base font-semibold text-slate-700 mb-2">Rechercher un médicament</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={medSearchTerm}
                        onChange={(e) => { const v = e.target.value; setMedSearchTerm(v); setShowMedDropdown(true); searchMedications(v); }}
                        onFocus={() => { setShowMedDropdown(true); if (medSearchTerm.length >= 2) searchMedications(medSearchTerm); }}
                        onBlur={() => setTimeout(() => setShowMedDropdown(false), 300)}
                        placeholder="Ex: Doliprane, paracétamol..."
                        className="w-full px-4 py-4 pl-10 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-secondary-100 focus:border-secondary-400 outline-none font-medium text-base touch-manipulation"
                      />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      {showMedDropdown && (medSearchResults.length > 0 || medSearchLoading) && (
                        <div className="absolute z-[9999] w-full mt-2 bg-white border-2 border-slate-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
                          {medSearchLoading && (
                            <div className="px-4 py-3 text-sm text-slate-400 text-center">Recherche...</div>
                          )}
                          {!medSearchLoading && medSearchResults.map((med) => (
                            <button
                              key={med.id}
                              onMouseDown={(e) => { e.preventDefault(); addMedication(med); }}
                              className="w-full px-4 py-3 text-left hover:bg-secondary-50 transition-colors border-b border-slate-100 last:border-b-0"
                            >
                              <div className="font-bold text-slate-900">{med.nom_commercial || med.nom}</div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {med.dci && <span className="text-xs text-slate-500">{med.dci}</span>}
                                {med.dosage && <span className="text-xs text-secondary-600 font-medium">{med.dosage}</span>}
                                {med.forme && <span className="text-xs text-slate-400 italic">{med.forme}</span>}
                              </div>
                              {med.laboratoire && <div className="text-xs text-slate-300 mt-0.5">{med.laboratoire}</div>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-3">Médicaments sélectionnés:</label>
                    {selectedMeds.length > 0 ? (
                      <div className="space-y-2">
                        {selectedMeds.map((med, idx) => (
                          <div key={med.id} className="flex items-center justify-between px-4 py-3 bg-primary-50 border-2 border-primary-200 rounded-xl">
                            <div className="flex items-center space-x-3">
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-600 text-white text-sm font-bold">
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-slate-900">{med.nom}</span>
                            </div>
                            <button
                              onClick={() => removeMedication(med.id)}
                              className="p-1.5 text-danger-600 hover:bg-danger-100 rounded-lg transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-center py-8 italic">Aucun médicament sélectionné</p>
                    )}
                  </div>

                  {/* Alertes temps réel */}
                  {selectedMeds.length >= 1 && (
                    <div className="mb-6">
                      {interactionAlerts.length === 0 ? (
                        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className="text-sm text-green-800 font-medium">
                            🟢 {selectedMeds.length === 1
                              ? 'Aucune contre-indication connue pour ce médicament'
                              : 'Aucune interaction connue entre les médicaments sélectionnés'}
                            {!selectedPatient && <span className="text-green-600 font-normal"> — sélectionnez un patient pour vérifier les contre-indications</span>}
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
                              const colors = {
                                contre_indication: 'bg-red-50 border-red-300 text-red-900',
                                majeure: 'bg-orange-50 border-orange-300 text-orange-900',
                                moderee: 'bg-blue-50 border-blue-300 text-blue-900',
                                mineure: 'bg-yellow-50 border-yellow-300 text-yellow-900',
                              };
                              const badges = {
                                contre_indication: 'bg-red-100 text-red-800',
                                majeure: 'bg-orange-100 text-orange-800',
                                moderee: 'bg-blue-100 text-blue-800',
                                mineure: 'bg-yellow-100 text-yellow-800',
                              };
                              const icons = {
                                contre_indication: '🔴',
                                majeure: '🟠',
                                moderee: '🔵',
                                mineure: '🟡',
                              };
                              return (
                                <div key={idx} className={`px-4 py-3 border rounded-xl ${colors[alert.severite]}`}>
                                  <div className="flex items-start gap-2">
                                    <span className="text-base flex-shrink-0 mt-0.5">{icons[alert.severite]}</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badges[alert.severite]}`}>
                                          {alert.severite === 'contre_indication' ? 'Contre-indication' :
                                           alert.severite === 'majeure' ? 'Interaction majeure' :
                                           alert.severite === 'moderee' ? 'Interaction modérée' : 'Interaction mineure'}
                                        </span>
                                        <span className="text-xs font-semibold">{alert.involved.join(' + ')}</span>
                                        {alert.type === 'contraindication' && (
                                          <span className="text-xs opacity-70">(patient)</span>
                                        )}
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

                  <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3">
                    <Button
                      onClick={checkInteractions}
                      variant="primary"
                      size="lg"
                      loading={loading}
                      disabled={!selectedPatient || selectedMeds.length < 2}
                      className="flex-1 text-base md:text-lg py-4 touch-manipulation"
                    >
                      <Pill className="w-5 h-5 mr-2" />
                      Analyser Interactions
                    </Button>
                    <Button onClick={resetAnalysis} variant="ghost" size="lg" className="py-4 touch-manipulation">
                      Réinitialiser
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {result && (
              <div ref={resultsRef} className={`mt-6 md:mt-8 bg-white rounded-3xl shadow-2xl overflow-hidden border-l-8 ${
                result.severity === 'safe' ? 'border-safe-500' :
                result.severity === 'attention' ? 'border-caution-500' : 'border-danger-500'
              }`}>
                <div className={`px-6 md:px-8 py-5 md:py-6 ${
                  result.severity === 'safe' ? 'bg-gradient-to-r from-safe-500 to-safe-600' :
                  result.severity === 'attention' ? 'bg-gradient-to-r from-caution-500 to-caution-600' :
                  'bg-gradient-to-r from-danger-500 to-danger-600'
                }`}>
                  <div className="flex items-center space-x-3 md:space-x-4">
                    {result.severity === 'safe' && <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-white flex-shrink-0" />}
                    {result.severity === 'attention' && <AlertTriangle className="w-10 h-10 md:w-12 md:h-12 text-white flex-shrink-0" />}
                    {result.severity === 'dangerous' && <X className="w-10 h-10 md:w-12 md:h-12 text-white flex-shrink-0" />}
                    <div>
                      <h3 className="text-xl md:text-3xl font-black text-white uppercase tracking-tight">
                        {result.severity === 'safe' ? '✓ SÉCURITAIRE' :
                         result.severity === 'attention' ? '⚠️ ATTENTION' : '⚠️ DANGEREUX'}
                      </h3>
                      <p className="text-white/90 text-sm md:text-lg mt-1">{result.description}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                  {result.reasons.length > 0 && (
                    <div className="bg-slate-50 rounded-2xl p-6">
                      <h4 className="font-bold text-slate-900 mb-4 text-lg">Analyse Détaillée</h4>
                      <ul className="space-y-3">
                        {result.reasons.map((reason, idx) => (
                          <li key={idx} className="flex items-start space-x-3 text-slate-800">
                            <span className="text-danger-500 font-bold text-lg mt-0.5">•</span>
                            <span className="font-medium">{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-slate-100 rounded-xl p-5 border-l-4 border-slate-400">
                    <p className="text-xs text-slate-700 leading-relaxed">
                      <strong>Avertissement:</strong> Cette analyse est indicative. Consultez le Vidal et les recommandations HAS.
                    </p>
                  </div>

                  <div className="flex justify-center pt-6">
                    <Button
                      onClick={() => setShowPrescriptionForm(true)}
                      variant="primary"
                      className="w-full md:w-auto px-8 py-4 md:py-3 text-base md:text-lg touch-manipulation"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      Créer une Ordonnance
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
          patient={{
            prenom: selectedPatient.prenom,
            nom: selectedPatient.nom,
          }}
          initialMedications={selectedMeds}
          onPreview={(data) => {
            // Générer numéro d'ordonnance unique
            const now = new Date();
            const datePart = now.toISOString().split('T')[0].replace(/-/g, '');
            const randPart = String(Math.floor(1000 + Math.random() * 9000));
            setPrescriptionData({ ...data, ordreNumber: `ORD-${datePart}-${randPart}` });
            setShowPrescriptionForm(false);
            setShowPrescriptionPreview(true);
          }}
        />
      )}

      {selectedPatient && user && prescriptionData && (
        <PrescriptionPreviewModal
          isOpen={showPrescriptionPreview}
          onClose={() => {
            setShowPrescriptionPreview(false);
            setPrescriptionData(null);
          }}
          onBack={() => {
            setShowPrescriptionPreview(false);
            setShowPrescriptionForm(true);
          }}
          onSave={async () => {
            try {
              if (!selectedPatient?.id) {
                setToast({ message: 'Patient non sélectionné', type: 'error' });
                return;
              }
              if (!user?.id) {
                setToast({ message: 'Utilisateur non authentifié', type: 'error' });
                return;
              }
              if (!prescriptionData?.medications?.length) {
                setToast({ message: 'Aucun médicament sélectionné', type: 'error' });
                return;
              }

              const today = new Date().toISOString().split('T')[0];

              // Créer la consultation
              const { data: consultData, error: consultError } = await supabase
                .from('consultations')
                .insert({
                  patient_id: selectedPatient.id,
                  doctor_id: doctorProfile?.id || user.id,
                  org_id: user.org_id,
                  date: today,
                  motif: prescriptionData.motif || null,
                  notes: prescriptionData.remarks || null,
                })
                .select('id')
                .single();

              if (consultError) throw consultError;

              // Créer l'ordonnance liée à la consultation
              const { data: ordData, error: ordError } = await supabase
                .from('ordonnances')
                .insert({
                  consultation_id: consultData.id,
                  patient_id: selectedPatient.id,
                  doctor_id: doctorProfile?.id || user.id,
                  org_id: user.org_id,
                  date: today,
                  statut: 'active',
                  ordre_number: prescriptionData.ordreNumber || null,
                })
                .select('id')
                .single();

              if (ordError) throw ordError;

              const lignes = prescriptionData.medications.map((med: any) => ({
                ordonnance_id: ordData.id,
                medicament_nom: med.nom,
                posologie: med.posologie || null,
                duree: med.duree || null,
                instructions: med.quantite || null,
              }));

              const { error: lignesError } = await supabase
                .from('ordonnance_lignes')
                .insert(lignes);

              if (lignesError) throw lignesError;

              setToast({ message: 'Ordonnance enregistrée avec succès', type: 'success' });
              setShowPrescriptionPreview(false);
              setPrescriptionData(null);
              setResult(null);
              loadPatientOrdonnances(selectedPatient.id);
              loadStats();
            } catch (error: any) {
              console.error('Error saving ordonnance:', error);
              setToast({ message: error.message || 'Erreur lors de la sauvegarde', type: 'error' });
            }
          }}
          ordreNumber={prescriptionData.ordreNumber || ''}
          doctor={{
            nom: user.nom,
            prenom: user.prenom,
            specialite: doctorProfile?.specialite || null,
            rpps: doctorProfile?.rpps || null,
            ordre_number: doctorProfile?.ordre_number || null,
            telephone: null,
          }}
          org={{
            name: clinicProfile?.name || '',
            adresse: clinicProfile?.adresse || null,
            telephone: clinicProfile?.telephone || null,
          }}
          patient={{
            prenom: selectedPatient.prenom,
            nom: selectedPatient.nom,
            date_naissance: selectedPatient.date_naissance,
            pathologies: selectedPatient.pathologies || null,
            allergies_medicaments: selectedPatient.allergies_medicaments || null,
          }}
          motif={prescriptionData.motif}
          medications={prescriptionData.medications}
          remarks={prescriptionData.remarks}
          nextAppointment={prescriptionData.nextAppointment}
          interactionAlerts={interactionAlerts}
        />
      )}

      {selectedPatient && (
        <MedicationHistoryModal
          isOpen={showMedicationHistory}
          onClose={() => setShowMedicationHistory(false)}
          patient={{
            prenom: selectedPatient.prenom,
            nom: selectedPatient.nom,
          }}
          ordonnances={patientOrdonnances}
        />
      )}
    </div>
  );
}
