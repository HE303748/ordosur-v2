import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogOut, UserPlus, Search, Plus, X, AlertTriangle, Heart, Droplets, Weight, Ruler, TestTube, CheckCircle2, Pill, Users, CreditCard as Edit, Trash2, ClipboardList, FileText, Shield, TrendingUp, Clock, BarChart3, CircleUser as UserCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Patient, Medication } from '../lib/supabase';
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

interface MedicationDetail {
  id: string;
  nom: string;
  effets_secondaires_frequents?: string[];
  effets_secondaires_rares?: string[];
  precautions?: string[];
  contre_indications_relatives?: string[];
}

interface InteractionResult {
  severity: 'safe' | 'attention' | 'dangerous';
  description: string;
  alternatives: string[];
  reasons: string[];
  medications: MedicationDetail[];
  patientPrecautions: string[];
}

export function DoctorDashboard() {
  const { user, signOut, doctorProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'patients' | 'checker'>('checker');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [medications, setMedications] = useState<Medication[]>([]);
  const [selectedMeds, setSelectedMeds] = useState<Array<{ id: string; nom: string }>>([]);
  const [medSearchTerm, setMedSearchTerm] = useState('');
  const [showMedDropdown, setShowMedDropdown] = useState(false);
  const [result, setResult] = useState<InteractionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [showPrescriptionPreview, setShowPrescriptionPreview] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState<any>(null);
  const [showMedicationHistory, setShowMedicationHistory] = useState(false);
  const [patientOrdonnances, setPatientOrdonnances] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    ordonnances: 0,
    safetyRate: 0,
    evolution: 0,
  });
  const [weeklyData, setWeeklyData] = useState([
    { jour: 'Lun', consultations: 12 },
    { jour: 'Mar', consultations: 18 },
    { jour: 'Mer', consultations: 15 },
    { jour: 'Jeu', consultations: 20 },
    { jour: 'Ven', consultations: 16 },
    { jour: 'Sam', consultations: 8 },
    { jour: 'Dim', consultations: 0 },
  ]);

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || user.role !== 'doctor') {
      navigate('/');
    } else {
      loadPatients();
      loadMedications();
      loadStats();
    }
  }, [user, navigate]);

  useEffect(() => {
    if (result && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [result]);

  const loadPatients = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('doctor_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setPatients(data);
  };

  const loadMedications = async () => {
    const { data } = await supabase.from('medications').select('*').order('nom');
    if (data) setMedications(data);
  };

  const loadStats = async () => {
    if (!user) return;

    const { data: consultationsData } = await supabase
      .from('consultations')
      .select('*')
      .eq('doctor_id', user.id);

    const { data: logsData } = await supabase
      .from('interaction_logs')
      .select('*')
      .eq('doctor_id', user.id);

    const safeCount = logsData?.filter(log => log.risk_level === 'safe').length || 0;
    const totalLogs = logsData?.length || 1;

    setStats({
      totalPatients: patients.length,
      ordonnances: consultationsData?.length || 0,
      safetyRate: Math.round((safeCount / totalLogs) * 100),
      evolution: 12,
    });
  };

  const handleSavePatient = async (patientData: Omit<Patient, 'id' | 'doctor_id' | 'created_at'>) => {
    if (!user) return;
    try {
      if (editingPatient) {
        await supabase.from('patients').update(patientData).eq('id', editingPatient.id);
        setToast({ message: 'Patient mis à jour', type: 'success' });
      } else {
        await supabase.from('patients').insert({ ...patientData, doctor_id: user.id });
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
        p.nom_complet.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
        p.maladies_chroniques.some(m => m.toLowerCase().includes(patientSearchTerm.toLowerCase()))
      ).slice(0, 8)
    : [];

  const filteredMedications = medSearchTerm.length >= 2
    ? medications.filter(m => m.nom.toLowerCase().includes(medSearchTerm.toLowerCase())).slice(0, 8)
    : [];

  const addMedication = (med: Medication) => {
    if (!selectedMeds.some(m => m.id === med.id)) {
      setSelectedMeds([...selectedMeds, { id: med.id, nom: med.nom }]);
    }
    setMedSearchTerm('');
    setShowMedDropdown(false);
  };

  const removeMedication = (medId: string) => {
    setSelectedMeds(selectedMeds.filter(m => m.id !== medId));
  };

  const loadPatientOrdonnances = async (patientId: string) => {
    try {
      const { data: ordonnancesData, error } = await supabase
        .from('ordonnances')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading ordonnances:', error);
        setPatientOrdonnances([]);
        return;
      }

      if (ordonnancesData && ordonnancesData.length > 0) {
        const doctorIds = [...new Set(ordonnancesData.map((ord: any) => ord.doctor_id))];

        const { data: usersData } = await supabase
          .from('users')
          .select('id, doctor_name')
          .in('id', doctorIds);

        const { data: doctorsData } = await supabase
          .from('doctors')
          .select('id, nom, prenom, specialites');

        const doctorMap = new Map();

        if (usersData) {
          usersData.forEach((user: any) => {
            doctorMap.set(user.id, {
              name: user.doctor_name || 'Dr. Médecin',
              specialty: 'Médecine Générale'
            });
          });
        }

        if (doctorsData) {
          doctorsData.forEach((doctor: any) => {
            doctorMap.set(doctor.id, {
              name: `Dr. ${doctor.prenom} ${doctor.nom}`,
              specialty: doctor.specialites?.[0] || 'Médecine Générale'
            });
          });
        }

        const ordonnances = ordonnancesData.map((ord: any) => {
          const doctorInfo = doctorMap.get(ord.doctor_id) || {
            name: 'Dr. Médecin',
            specialty: 'Médecine Générale'
          };

          return {
            ...ord,
            doctor_name: doctorInfo.name,
            doctor_specialty: doctorInfo.specialty
          };
        });

        setPatientOrdonnances(ordonnances);
      } else {
        setPatientOrdonnances([]);
      }
    } catch (error) {
      console.error('Error loading patient ordonnances:', error);
      setPatientOrdonnances([]);
    }
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
    await new Promise(resolve => setTimeout(resolve, 600));

    const { data: medsDetails } = await supabase
      .from('medications')
      .select('id, nom, effets_secondaires_frequents, effets_secondaires_rares, precautions, contre_indications_relatives')
      .in('id', selectedMeds.map(m => m.id));

    let overallSeverity: 'safe' | 'attention' | 'dangerous' = 'safe';
    const allReasons: string[] = [];
    const allAlternatives: string[] = [];
    const patientPrecautions: string[] = [];
    let description = 'Analyse de compatibilité effectuée.';

    for (let i = 0; i < selectedMeds.length; i++) {
      for (let j = i + 1; j < selectedMeds.length; j++) {
        const medA = selectedMeds[i].nom;
        const medB = selectedMeds[j].nom;

        if (medA === medB) {
          overallSeverity = 'dangerous';
          allReasons.push(`DUPLICATION: ${medA} prescrit en double`);
          description = 'Duplication médicamenteuse - Risque de surdosage!';
          continue;
        }

        const { data: interaction } = await supabase
          .from('drug_interactions')
          .select('*')
          .or(`and(medicament_a.eq.${medA},medicament_b.eq.${medB}),and(medicament_a.eq.${medB},medicament_b.eq.${medA})`)
          .maybeSingle();

        if (interaction) {
          if (interaction.severity === 'dangerous') overallSeverity = 'dangerous';
          else if (interaction.severity === 'attention' && overallSeverity === 'safe') overallSeverity = 'attention';
          allReasons.push(`${medA} ⇄ ${medB}: ${interaction.description}`);
          allAlternatives.push(...interaction.alternatives);
        }
      }
    }

    if (selectedPatient.maladies_chroniques.some(m => m.includes('Insuffisance Rénale'))) {
      const nsaids = ['Ibuprofène', 'Naproxène', 'Kétoprofène', 'Advil'];
      if (selectedMeds.some(m => nsaids.some(n => m.nom.includes(n)))) {
        if (overallSeverity !== 'dangerous') overallSeverity = 'attention';
        allReasons.push('⚠️ Insuffisance Rénale + AINS: Surveillance renforcée');
        allAlternatives.push('Paracétamol', 'Tramadol');
        patientPrecautions.push('Réduire la dose d\'AINS de 50%');
        patientPrecautions.push('Surveillance fonction rénale recommandée');
        patientPrecautions.push('Limiter la durée du traitement (max 5 jours)');
        patientPrecautions.push('Bien hydrater le patient');
      }
      if (selectedMeds.some(m => m.nom.includes('Metformine'))) {
        overallSeverity = 'dangerous';
        allReasons.push('🔴 CONTRE-INDICATION: Metformine + Insuffisance Rénale');
        allAlternatives.push('Glimépiride', 'Insuline');
        patientPrecautions.push('ARRÊTER la Metformine immédiatement');
        patientPrecautions.push('Consulter endocrinologue pour alternatives');
      }
    }

    if (selectedPatient.maladies_chroniques.some(m => m.includes('Diabète'))) {
      if (selectedMeds.some(m => ['Ibuprofène', 'AINS'].some(n => m.nom.includes(n)))) {
        patientPrecautions.push('Surveiller la glycémie (AINS peuvent masquer hypoglycémie)');
      }
    }

    if (selectedPatient.maladies_chroniques.some(m => m.includes('Asthme'))) {
      if (selectedMeds.some(m => m.nom.includes('Aspirine'))) {
        if (overallSeverity === 'safe') overallSeverity = 'attention';
        allReasons.push('⚠️ Asthme + Aspirine: Risque de bronchospasme');
        allAlternatives.push('Paracétamol');
      }
    }

    selectedPatient.allergies.forEach(allergie => {
      selectedMeds.forEach(med => {
        if (allergie.toLowerCase().includes('pénicilline') &&
           (med.nom.toLowerCase().includes('amoxicilline') || med.nom.toLowerCase().includes('augmentin'))) {
          overallSeverity = 'dangerous';
          allReasons.push(`🔴 ALLERGIE: ${allergie} ⇄ ${med.nom}`);
          allAlternatives.push('Azithromycine');
        }
      });
    });

    if (selectedPatient.dfg && selectedPatient.dfg < 30) {
      allReasons.push(`📊 DFG: ${selectedPatient.dfg} mL/min - Fonction rénale altérée`);
      if (overallSeverity === 'safe') overallSeverity = 'attention';
    }

    if (allReasons.length === 0) {
      description = `✓ Aucune interaction détectée entre les ${selectedMeds.length} médicaments`;
    }

    setResult({
      severity: overallSeverity,
      description,
      alternatives: [...new Set(allAlternatives)],
      reasons: allReasons,
      medications: medsDetails || [],
      patientPrecautions
    });

    if (user && selectedPatient) {
      await supabase.from('interaction_logs').insert({
        doctor_id: user.id,
        patient_id: selectedPatient.id,
        medicament_a: selectedMeds[0]?.nom || '',
        medicament_b: selectedMeds[1]?.nom || '',
        risk_level: overallSeverity,
        timestamp: new Date().toISOString(),
      });
    }

    setLoading(false);
  };

  const resetAnalysis = () => {
    setSelectedMeds([]);
    setMedSearchTerm('');
    setResult(null);
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
                <p className="text-xs md:text-sm text-slate-600">{doctorProfile?.full_name || user?.full_name || 'Médecin'}</p>
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
            subtitle="Ce mois-ci"
          />
          <KPICard
            title="Taux de Succès"
            value={`${stats.safetyRate}%`}
            icon={<Shield className="w-6 h-6" />}
            color="safe"
            subtitle="Interactions vérifiées"
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
            Vérification d'Interactions
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
                    <th className="text-left px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold text-slate-700">Nom</th>
                    <th className="text-left px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold text-slate-700">Âge</th>
                    <th className="text-left px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold text-slate-700 hidden md:table-cell">Sexe</th>
                    <th className="text-left px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold text-slate-700 hidden lg:table-cell">Pathologies</th>
                    <th className="text-right px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 md:px-6 py-3 md:py-4 font-semibold text-slate-900 text-sm">{patient.nom_complet}</td>
                      <td className="px-4 md:px-6 py-3 md:py-4 text-slate-600 text-sm">{patient.age} ans</td>
                      <td className="px-4 md:px-6 py-3 md:py-4 text-slate-600 text-sm hidden md:table-cell">{patient.sexe}</td>
                      <td className="px-4 md:px-6 py-3 md:py-4 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {patient.maladies_chroniques.slice(0, 2).map((m, idx) => (
                            <span key={idx} className="px-2 py-1 bg-danger-50 text-danger-700 rounded-lg text-xs font-medium">
                              {m}
                            </span>
                          ))}
                          {patient.maladies_chroniques.length > 2 && (
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                              +{patient.maladies_chroniques.length - 2}
                            </span>
                          )}
                        </div>
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
                            setPatientSearchTerm(patient.nom_complet);
                            setShowPatientDropdown(false);
                            resetAnalysis();
                            loadPatientOrdonnances(patient.id);
                          }}
                          className="w-full px-6 py-4 text-left hover:bg-slate-50 transition-all border-b border-slate-100 last:border-b-0 group"
                        >
                          <div className="font-bold text-slate-900 text-lg group-hover:text-primary-600 transition-colors">
                            {patient.nom_complet}
                          </div>
                          <div className="text-sm text-slate-600 mt-1 flex items-center flex-wrap gap-3">
                            <span>{patient.age} ans</span>
                            <span>•</span>
                            <span>{patient.sexe}</span>
                            {patient.maladies_chroniques.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-danger-600 font-medium">
                                  {patient.maladies_chroniques.slice(0, 2).join(', ')}
                                </span>
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
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">{selectedPatient.nom_complet}</h2>
                        <div className="flex items-center space-x-4 text-slate-600">
                          <span className="text-lg font-semibold">{selectedPatient.age} ans</span>
                          <span>•</span>
                          <span className="text-lg">{selectedPatient.sexe}</span>
                        </div>
                      </div>

                      {(selectedPatient.poids || selectedPatient.taille || selectedPatient.imc) && (
                        <div className="grid grid-cols-3 gap-4">
                          {selectedPatient.poids && (
                            <div className="bg-slate-50 rounded-xl p-4">
                              <div className="text-xs text-slate-600 mb-1 flex items-center">
                                <Weight className="w-3 h-3 mr-1" /> Poids
                              </div>
                              <div className="text-xl font-bold text-slate-900">{selectedPatient.poids} kg</div>
                            </div>
                          )}
                          {selectedPatient.taille && (
                            <div className="bg-slate-50 rounded-xl p-4">
                              <div className="text-xs text-slate-600 mb-1 flex items-center">
                                <Ruler className="w-3 h-3 mr-1" /> Taille
                              </div>
                              <div className="text-xl font-bold text-slate-900">{selectedPatient.taille} cm</div>
                            </div>
                          )}
                          {selectedPatient.imc && (
                            <div className={`rounded-xl p-4 ${
                              selectedPatient.imc < 18.5 ? 'bg-caution-50' :
                              selectedPatient.imc < 25 ? 'bg-safe-50' :
                              selectedPatient.imc < 30 ? 'bg-caution-50' : 'bg-danger-50'
                            }`}>
                              <div className="text-xs text-slate-600 mb-1">IMC</div>
                              <div className={`text-xl font-bold ${
                                selectedPatient.imc < 18.5 ? 'text-caution-700' :
                                selectedPatient.imc < 25 ? 'text-safe-700' :
                                selectedPatient.imc < 30 ? 'text-caution-700' : 'text-danger-700'
                              }`}>
                                {selectedPatient.imc.toFixed(1)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {selectedPatient.dfg && (
                        <div className={`rounded-xl p-4 border-2 ${
                          selectedPatient.dfg > 60 ? 'bg-safe-50 border-safe-200' :
                          selectedPatient.dfg > 30 ? 'bg-caution-50 border-caution-200' : 'bg-danger-50 border-danger-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-slate-700 mb-1">
                                <TestTube className="w-4 h-4 inline mr-1" />
                                DFG estimé
                              </div>
                              <div className={`text-2xl font-bold ${
                                selectedPatient.dfg > 60 ? 'text-safe-700' :
                                selectedPatient.dfg > 30 ? 'text-caution-700' : 'text-danger-700'
                              }`}>
                                {selectedPatient.dfg} mL/min
                              </div>
                            </div>
                            {selectedPatient.creatinine && (
                              <div className="text-right">
                                <div className="text-xs text-slate-600">Créatinine</div>
                                <div className="text-lg font-semibold text-slate-800">{selectedPatient.creatinine} mg/dL</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedPatient.maladies_chroniques.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-danger-900 mb-3 uppercase tracking-wide">
                            PATHOLOGIES
                          </h4>
                          <div className="space-y-2">
                            {selectedPatient.maladies_chroniques.map((maladie, idx) => (
                              <div
                                key={idx}
                                className="flex items-center space-x-3 px-4 py-3 bg-danger-50 rounded-xl border-2 border-danger-200"
                              >
                                {maladie.includes('Diabète') && <Droplets className="w-5 h-5 text-danger-600" />}
                                {maladie.includes('Cardiaque') && <Heart className="w-5 h-5 text-danger-600" />}
                                {!maladie.includes('Diabète') && !maladie.includes('Cardiaque') && (
                                  <AlertTriangle className="w-5 h-5 text-danger-600" />
                                )}
                                <span className="text-sm font-semibold text-danger-900">{maladie}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedPatient.allergies.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-danger-900 mb-3 uppercase tracking-wide">
                            ⚠️ ALLERGIES
                          </h4>
                          <div className="space-y-2">
                            {selectedPatient.allergies.map((allergie, idx) => (
                              <div
                                key={idx}
                                className="px-4 py-3 bg-danger-100 rounded-xl border-2 border-danger-400 font-bold text-sm text-danger-900 flex items-center"
                              >
                                <AlertTriangle className="w-5 h-5 mr-2 text-danger-600" />
                                {allergie}
                              </div>
                            ))}
                          </div>
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
                              const date = new Date(ordonnance.created_at);
                              const formattedDate = date.toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              });

                              return (
                                <div key={ordonnance.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Clock className="w-4 h-4 text-slate-500" />
                                    <span className="text-xs font-semibold text-slate-700">{formattedDate}</span>
                                    <span className="text-xs text-slate-500">-</span>
                                    <span className="text-xs text-slate-600">
                                      {ordonnance.doctor_name}
                                      {ordonnance.doctor_specialty && (
                                        <span className="text-slate-500"> ({ordonnance.doctor_specialty})</span>
                                      )}
                                    </span>
                                  </div>
                                  <ul className="space-y-1 ml-6">
                                    {ordonnance.medications.slice(0, 3).map((med: any, idx: number) => (
                                      <li key={idx} className="text-xs text-slate-700">
                                        <span className="font-medium">{med.nom}</span>
                                        <span className="text-slate-500"> - {med.posologie} - {med.duree}</span>
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
                        onChange={(e) => { setMedSearchTerm(e.target.value); setShowMedDropdown(true); }}
                        onFocus={() => setShowMedDropdown(true)}
                        onBlur={() => setTimeout(() => setShowMedDropdown(false), 300)}
                        placeholder="Ex: Doliprane, Aspirine..."
                        className="w-full px-4 py-4 pl-10 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-secondary-100 focus:border-secondary-400 outline-none font-medium text-base touch-manipulation"
                      />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      {showMedDropdown && filteredMedications.length > 0 && (
                        <div className="absolute z-[9999] w-full mt-2 bg-white border-2 border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                          {filteredMedications.map((med) => (
                            <button
                              key={med.id}
                              onMouseDown={(e) => { e.preventDefault(); addMedication(med); }}
                              className="w-full px-4 py-3 text-left hover:bg-secondary-50 transition-colors border-b border-slate-100 last:border-b-0"
                            >
                              <div className="font-bold text-slate-900">{med.nom}</div>
                              <div className="text-xs text-slate-500">{med.classe_therapeutique}</div>
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

                  {result.alternatives.length > 0 && (
                    <div>
                      <h4 className="font-bold text-slate-900 mb-4 text-lg">Alternatives Recommandées</h4>
                      <div className="flex flex-wrap gap-3">
                        {result.alternatives.map((alt, idx) => (
                          <span key={idx} className="px-5 py-3 bg-gradient-to-r from-primary-100 to-primary-200 text-primary-800 rounded-xl font-bold text-sm border-2 border-primary-300">
                            {alt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.medications && result.medications.length > 0 && (
                    <div className="bg-yellow-50 rounded-2xl p-6 border-2 border-yellow-200">
                      <h4 className="font-bold text-slate-900 mb-4 text-lg flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
                        Effets Secondaires à Surveiller
                      </h4>
                      {result.medications.map((med, idx) => (
                        <div key={idx} className="mb-6 last:mb-0">
                          <h5 className="font-bold text-slate-800 mb-3 flex items-center">
                            <Pill className="w-4 h-4 mr-2 text-primary-600" />
                            {med.nom}
                          </h5>

                          {med.effets_secondaires_frequents && med.effets_secondaires_frequents.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-semibold text-slate-700 mb-2">Fréquents (1-10%)</p>
                              <ul className="space-y-1 ml-4">
                                {med.effets_secondaires_frequents.map((effet, i) => (
                                  <li key={i} className="text-sm text-slate-600 flex items-start">
                                    <span className="text-yellow-600 mr-2">•</span>
                                    {effet}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {med.effets_secondaires_rares && med.effets_secondaires_rares.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-semibold text-danger-700 mb-2 flex items-center">
                                <span className="text-danger-600 mr-1">🔴</span>
                                Rares mais graves (&lt;1%)
                              </p>
                              <ul className="space-y-1 ml-4">
                                {med.effets_secondaires_rares.map((effet, i) => (
                                  <li key={i} className="text-sm text-slate-600 flex items-start">
                                    <span className="text-danger-600 mr-2">•</span>
                                    {effet}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {med.precautions && med.precautions.length > 0 && (
                            <div className="bg-blue-50 rounded-lg p-3 mt-3">
                              <p className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                                <span className="mr-1">💡</span>
                                Précautions
                              </p>
                              <ul className="space-y-1 ml-4">
                                {med.precautions.map((precaution, i) => (
                                  <li key={i} className="text-sm text-blue-800">
                                    • {precaution}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {result.patientPrecautions && result.patientPrecautions.length > 0 && (
                    <div className="bg-red-50 rounded-2xl p-6 border-2 border-red-200">
                      <h4 className="font-bold text-danger-900 mb-4 text-lg flex items-center">
                        <span className="mr-2">🔴</span>
                        Précautions Spécifiques pour ce Patient
                      </h4>
                      <ul className="space-y-3">
                        {result.patientPrecautions.map((precaution, idx) => (
                          <li key={idx} className="flex items-start space-x-3">
                            <span className="text-danger-600 font-bold text-lg mt-0.5">➤</span>
                            <span className="font-medium text-danger-800">{precaution}</span>
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
            nom_complet: selectedPatient.nom_complet,
            age: selectedPatient.age
          }}
          initialMedications={selectedMeds}
          onPreview={(data) => {
            setPrescriptionData(data);
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
              if (!selectedPatient || !selectedPatient.id) {
                setToast({ message: 'Patient non sélectionné', type: 'error' });
                return;
              }

              if (!user || !user.id) {
                setToast({ message: 'Utilisateur non authentifié', type: 'error' });
                return;
              }

              if (!prescriptionData || !prescriptionData.medications || prescriptionData.medications.length === 0) {
                setToast({ message: 'Aucun médicament sélectionné', type: 'error' });
                return;
              }

              const ordonnanceData = {
                patient_id: selectedPatient.id,
                doctor_id: user.id,
                medications: prescriptionData.medications,
                remarks: prescriptionData.remarks || '',
                next_appointment: prescriptionData.nextAppointment || null,
                interaction_status: result?.message || 'Non analysé'
              };

              console.log('Saving ordonnance:', ordonnanceData);

              const { data, error } = await supabase
                .from('ordonnances')
                .insert([ordonnanceData])
                .select();

              if (error) {
                console.error('Supabase error:', error);
                throw error;
              }

              console.log('Ordonnance saved:', data);

              setToast({ message: 'Ordonnance enregistrée avec succès', type: 'success' });
              setShowPrescriptionPreview(false);
              setPrescriptionData(null);
              setResult(null);
              loadPatientOrdonnances(selectedPatient.id);
            } catch (error: any) {
              console.error('Error saving ordonnance:', error);
              setToast({ message: error.message || 'Erreur lors de la sauvegarde', type: 'error' });
            }
          }}
          doctor={{
            nom: user.nom || 'Dupont',
            prenom: user.prenom || 'Laurent',
            titre: 'Dr.',
            specialites: ['Cardiologie'],
            rpps: '10003456789',
            telephone: '+33 6 12 34 56 78',
            email: user.email || 'laurent.dupont@gmail.com'
          }}
          patient={{
            nom_complet: selectedPatient.nom_complet,
            date_naissance: '15/03/1957',
            age: selectedPatient.age
          }}
          medications={prescriptionData.medications}
          remarks={prescriptionData.remarks}
          nextAppointment={prescriptionData.nextAppointment}
          interactionStatus={result?.message}
        />
      )}

      {selectedPatient && (
        <MedicationHistoryModal
          isOpen={showMedicationHistory}
          onClose={() => setShowMedicationHistory(false)}
          patient={{
            nom_complet: selectedPatient.nom_complet
          }}
          ordonnances={patientOrdonnances}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
