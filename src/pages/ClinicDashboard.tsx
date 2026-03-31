import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Activity, UserCheck, Shield, LogOut, Calendar, Clock, UserPlus, Stethoscope, Mail, Phone, BarChart3, ClipboardList, Eye } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { KPICard } from '../components/KPICard';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { DoctorForm, DoctorData } from '../components/DoctorForm';
import { PatientForm } from '../components/PatientForm';
import { Toast } from '../components/Toast';
import { PatientDetailsModal } from '../components/PatientDetailsModal';
import { EmailVerificationBanner } from '../components/EmailVerificationBanner';
import { MedicationHistoryModal } from '../components/MedicationHistoryModal';

interface DoctorStat {
  id: string;
  nom: string;
  patients_served: number;
  interactions_resolved: number;
  safety_rate: number;
}

interface InteractionLog {
  id: string;
  doctor_name: string;
  patient_id: string;
  medicament_a: string;
  medicament_b: string;
  risk_level: string;
  timestamp: string;
}

interface DoctorRecord extends DoctorData {
  id: string;
  patients_served?: number;
  interactions_resolved?: number;
  safety_rate?: number;
}

export function ClinicDashboard() {
  const { user, signOut, clinicProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'doctors' | 'patients'>('dashboard');
  const [stats, setStats] = useState({
    totalPatients: 0,
    interactionsToday: 0,
    activeDoctors: 0,
    safetyRate: 0,
  });
  const [patientStats, setPatientStats] = useState({
    totalPatients: 0,
    newThisMonth: 0,
    totalConsultations: 0,
    activePatients: 0,
  });
  const [doctorStats, setDoctorStats] = useState<DoctorStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<InteractionLog[]>([]);
  const [sortField, setSortField] = useState<keyof DoctorStat>('interactions_resolved');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorRecord | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientDetailsModal, setShowPatientDetailsModal] = useState(false);
  const [selectedPatientDetails, setSelectedPatientDetails] = useState<any>(null);
  const [showPatientEditModal, setShowPatientEditModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [showMedicationHistoryModal, setShowMedicationHistoryModal] = useState(false);
  const [patientOrdonnances, setPatientOrdonnances] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', speciality: '' });
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'clinic') {
      navigate('/');
    } else {
      loadDashboardData();
      loadDoctors();
      loadAllPatients();
    }
  }, [user, navigate]);

  const loadDashboardData = async () => {
    const { data: doctors } = await supabase
      .from('users')
      .select('id, doctor_name')
      .eq('role', 'doctor');

    if (doctors) {
      const { data: patients } = await supabase.from('patients').select('id');

      const { data: logs } = await supabase
        .from('interaction_logs')
        .select('*, users!inner(doctor_name)');

      const today = new Date().toISOString().split('T')[0];
      const logsToday = logs?.filter(log =>
        log.timestamp.startsWith(today)
      ) || [];

      const safeCount = logs?.filter(log => log.risk_level === 'safe').length || 0;
      const totalLogs = logs?.length || 1;

      setStats({
        totalPatients: patients?.length || 0,
        interactionsToday: logsToday.length,
        activeDoctors: doctors.length,
        safetyRate: Math.round((safeCount / totalLogs) * 100),
      });

      const doctorData = await Promise.all(
        doctors.map(async (doc) => {
          const { data: docPatients } = await supabase
            .from('patients')
            .select('id')
            .eq('doctor_id', doc.id);

          const { data: docLogs } = await supabase
            .from('interaction_logs')
            .select('risk_level')
            .eq('doctor_id', doc.id);

          const docSafeCount = docLogs?.filter(log => log.risk_level === 'safe').length || 0;
          const docTotalLogs = docLogs?.length || 1;

          return {
            id: doc.id,
            nom: doc.doctor_name || 'Dr. Inconnu',
            patients_served: docPatients?.length || 0,
            interactions_resolved: docLogs?.length || 0,
            safety_rate: Math.round((docSafeCount / docTotalLogs) * 100),
          };
        })
      );

      setDoctorStats(doctorData);

      if (logs) {
        const recent = logs
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10)
          .map(log => ({
            id: log.id,
            doctor_name: (log.users as any).doctor_name || 'Dr. Inconnu',
            patient_id: log.patient_id || 'N/A',
            medicament_a: log.medicament_a,
            medicament_b: log.medicament_b,
            risk_level: log.risk_level,
            timestamp: log.timestamp,
          }));

        setRecentActivity(recent);
      }
    }
  };

  const loadDoctors = async () => {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setDoctors(data as DoctorRecord[]);
    }
  };

  const handleSaveDoctor = async (doctorData: DoctorData) => {
    try {
      // Filter out fields that don't exist in the doctors table
      const {
        horaire_debut,
        horaire_fin,
        jours_consultation,
        service,
        telephone_mobile,
        role,
        notes,
        ...validDoctorData
      } = doctorData;

      if (editingDoctor) {
        const { error } = await supabase
          .from('doctors')
          .update(validDoctorData)
          .eq('id', editingDoctor.id);

        if (error) throw error;
        setToast({ message: 'Médecin mis à jour avec succès', type: 'success' });
      } else {
        const { error } = await supabase
          .from('doctors')
          .insert([validDoctorData]);

        if (error) throw error;
        setToast({ message: 'Médecin ajouté avec succès', type: 'success' });
      }

      setShowDoctorModal(false);
      setEditingDoctor(null);
      loadDoctors();
    } catch (error: any) {
      setToast({ message: error.message || 'Erreur lors de l\'enregistrement', type: 'error' });
    }
  };

  const handleDeleteDoctor = async (doctorId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce médecin?')) return;

    try {
      const { error } = await supabase
        .from('doctors')
        .delete()
        .eq('id', doctorId);

      if (error) throw error;
      setToast({ message: 'Médecin supprimé avec succès', type: 'success' });
      loadDoctors();
    } catch (error: any) {
      setToast({ message: error.message || 'Erreur lors de la suppression', type: 'error' });
    }
  };

  const loadAllPatients = async () => {
    const { data: patientsData } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (patientsData) {
      setAllPatients(patientsData);

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const newThisMonth = patientsData.filter(
        (p: any) => new Date(p.created_at) >= firstDayOfMonth
      ).length;

      setPatientStats({
        totalPatients: patientsData.length,
        newThisMonth,
        totalConsultations: 1234,
        activePatients: patientsData.length,
      });
    }
  };

  const handleSavePatient = async (patientData: any) => {
    try {
      if (editingPatient) {
        const { error } = await supabase
          .from('patients')
          .update({
            nom_complet: patientData.nom_complet,
            age: patientData.age,
            sexe: patientData.sexe,
            poids: patientData.poids,
            taille: patientData.taille,
            imc: patientData.imc,
            dfg: patientData.dfg,
            maladies_chroniques: patientData.maladies_chroniques,
            allergies: patientData.allergies,
          })
          .eq('id', editingPatient.id);

        if (error) throw error;
        setToast({ message: 'Patient modifié avec succès', type: 'success' });
      } else {
        const { error } = await supabase
          .from('patients')
          .insert([{
            nom_complet: patientData.nom_complet,
            age: patientData.age,
            sexe: patientData.sexe,
            poids: patientData.poids,
            taille: patientData.taille,
            imc: patientData.imc,
            dfg: patientData.dfg,
            maladies_chroniques: patientData.maladies_chroniques,
            allergies: patientData.allergies,
          }]);

        if (error) throw error;
        setToast({ message: 'Patient ajouté avec succès', type: 'success' });
      }

      setShowPatientEditModal(false);
      setEditingPatient(null);
      loadAllPatients();
    } catch (error: any) {
      setToast({ message: error.message || 'Erreur lors de la sauvegarde', type: 'error' });
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        setToast({
          message: 'Session expirée. Veuillez vous reconnecter.',
          type: 'error'
        });
        setInviteLoading(false);
        return;
      }

      const { data: clinicProfile } = await supabase
        .from('clinic_profiles')
        .select('id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      let clinicId = clinicProfile?.id;

      if (!clinicId) {
        const { data: clinic } = await supabase
          .from('clinics')
          .select('id')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        clinicId = clinic?.id;
      }

      if (!clinicId) {
        setToast({
          message: 'Votre compte n\'est pas encore lié à une clinique. Contactez le support.',
          type: 'error'
        });
        setInviteLoading(false);
        return;
      }

      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('email', inviteForm.email)
        .maybeSingle();

      if (existingUser) {
        setToast({ message: 'Ce médecin a déjà un compte OrdoSur. Contactez le support.', type: 'error' });
        setInviteLoading(false);
        return;
      }

      const { data: existingInvite } = await supabase
        .from('clinic_invitations')
        .select('id, status')
        .eq('clinic_id', clinicId)
        .eq('email', inviteForm.email)
        .maybeSingle();

      if (existingInvite?.status === 'pending') {
        setToast({ message: 'Une invitation est déjà en attente pour cet email.', type: 'error' });
        setInviteLoading(false);
        return;
      }

      const { error: inviteError } = await supabase
        .from('clinic_invitations')
        .insert({
          clinic_id: clinicId,
          email: inviteForm.email,
          role: 'doctor',
          speciality: inviteForm.speciality,
          invited_by: currentUser.id,
        });

      if (inviteError) throw inviteError;

      setToast({ message: `Invitation envoyée avec succès à ${inviteForm.email}`, type: 'success' });
      setInviteForm({ email: '', speciality: '' });
      setShowInviteModal(false);
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      setToast({ message: error.message || 'Erreur lors de l\'envoi de l\'invitation', type: 'error' });
    } finally {
      setInviteLoading(false);
    }
  };

  const SPECIALITIES = [
    'Médecin généraliste',
    'Cardiologue',
    'Pédiatre',
    'Chirurgien',
    'Pharmacien',
    'Dermatologue',
    'Ophtalmologue',
    'Gynécologue',
    'Psychiatre',
    'Radiologue',
    'Autre'
  ];

  const monthlyData = [
    { mois: 'Jan', interactions: 245 },
    { mois: 'Fév', interactions: 312 },
    { mois: 'Mar', interactions: 389 },
    { mois: 'Avr', interactions: 421 },
    { mois: 'Mai', interactions: 467 },
    { mois: 'Jun', interactions: 523 },
    { mois: 'Jul', interactions: 589 },
    { mois: 'Aoû', interactions: 634 },
    { mois: 'Sep', interactions: 678 },
    { mois: 'Oct', interactions: 721 },
    { mois: 'Nov', interactions: 798 },
    { mois: 'Déc', interactions: 856 },
  ];

  const medicationData = [
    { nom: 'Doliprane', count: 423 },
    { nom: 'Ibuprofène', count: 387 },
    { nom: 'Paracétamol', count: 356 },
    { nom: 'Aspirine', count: 298 },
    { nom: 'Amoxicilline', count: 267 },
    { nom: 'Metformine', count: 234 },
    { nom: 'Oméprazole', count: 198 },
    { nom: 'Atorvastatine', count: 176 },
  ];

  const riskData = [
    { name: 'Sécuritaire', value: stats.safetyRate, color: '#22c55e' },
    { name: 'Attention', value: Math.round((100 - stats.safetyRate) * 0.6), color: '#f97316' },
    { name: 'Dangereux', value: Math.round((100 - stats.safetyRate) * 0.4), color: '#ef4444' },
  ];

  const handleSort = (field: keyof DoctorStat) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedDoctors = [...doctorStats].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDirection === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
  });

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <Modal
        isOpen={showDoctorModal}
        onClose={() => {
          setShowDoctorModal(false);
          setEditingDoctor(null);
        }}
        title={editingDoctor ? 'Modifier un Médecin' : 'Ajouter un Médecin'}
      >
        <DoctorForm
          doctor={editingDoctor}
          onSave={handleSaveDoctor}
          onCancel={() => {
            setShowDoctorModal(false);
            setEditingDoctor(null);
          }}
        />
      </Modal>

      <header className="glass-effect border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-primary-100 rounded-xl">
                <Activity className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">OrdoSur</h1>
                <p className="text-sm text-gray-600">{clinicProfile?.clinic_name || user?.full_name || 'Clinique'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{currentTime.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{currentTime.toLocaleTimeString('fr-FR')}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      <EmailVerificationBanner />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 inline-flex space-x-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center ${
              activeTab === 'dashboard'
                ? 'bg-primary-500 text-white shadow-lg'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-5 h-5 mr-2" />
            Tableau de Bord
          </button>
          <button
            onClick={() => setActiveTab('doctors')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center ${
              activeTab === 'doctors'
                ? 'bg-primary-500 text-white shadow-lg'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Stethoscope className="w-5 h-5 mr-2" />
            Gestion des Médecins
          </button>
          <button
            onClick={() => setActiveTab('patients')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center ${
              activeTab === 'patients'
                ? 'bg-primary-500 text-white shadow-lg'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ClipboardList className="w-5 h-5 mr-2" />
            Patients
          </button>
        </div>

        {activeTab === 'dashboard' ? (
          <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Patients Totaux"
            value={stats.totalPatients}
            icon={<Users className="w-6 h-6" />}
            color="primary"
            trend={{ value: 12, isPositive: true }}
          />
          <KPICard
            title="Interactions Résolues Aujourd'hui"
            value={stats.interactionsToday}
            icon={<Activity className="w-6 h-6" />}
            color="secondary"
            trend={{ value: 8, isPositive: true }}
          />
          <KPICard
            title="Médecins Actifs"
            value={stats.activeDoctors}
            icon={<UserCheck className="w-6 h-6" />}
            color="safe"
          />
          <KPICard
            title="Taux de Succès"
            value={`${stats.safetyRate}%`}
            icon={<Shield className="w-6 h-6" />}
            color="caution"
            trend={{ value: 5, isPositive: true }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-effect rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Interactions par Mois</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mois" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="interactions" stroke="#0066CC" strokeWidth={3} dot={{ fill: '#0066CC', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-effect rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Médicaments les Plus Vérifiés</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={medicationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="nom" stroke="#6b7280" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="#00A8A8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-effect rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition des Risques</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-effect rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activité Récente</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="p-3 bg-gray-50 rounded-lg border-l-4 hover:bg-gray-100 transition-colors"
                  style={{
                    borderLeftColor:
                      activity.risk_level === 'safe' ? '#22c55e' :
                      activity.risk_level === 'attention' ? '#f97316' : '#ef4444'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.doctor_name}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {activity.medicament_a} + {activity.medicament_b}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      activity.risk_level === 'safe' ? 'bg-safe-100 text-safe-700' :
                      activity.risk_level === 'attention' ? 'bg-caution-100 text-caution-700' :
                      'bg-danger-100 text-danger-700'
                    }`}>
                      {activity.risk_level === 'safe' ? 'Sécuritaire' :
                       activity.risk_level === 'attention' ? 'Attention' : 'Dangereux'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(activity.timestamp).toLocaleString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance des Médecins</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('nom')}
                  >
                    Nom du Médecin {sortField === 'nom' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('patients_served')}
                  >
                    Patients Servis {sortField === 'patients_served' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('interactions_resolved')}
                  >
                    Interactions Résolues {sortField === 'interactions_resolved' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('safety_rate')}
                  >
                    Taux de Succès {sortField === 'safety_rate' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedDoctors.map((doctor) => (
                  <tr key={doctor.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{doctor.nom}</td>
                    <td className="px-4 py-4 text-sm text-gray-700">{doctor.patients_served}</td>
                    <td className="px-4 py-4 text-sm text-gray-700">{doctor.interactions_resolved}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                          <div
                            className={`h-2 rounded-full ${
                              doctor.safety_rate >= 80 ? 'bg-safe-500' :
                              doctor.safety_rate >= 60 ? 'bg-caution-500' : 'bg-danger-500'
                            }`}
                            style={{ width: `${doctor.safety_rate}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{doctor.safety_rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
          </div>
        ) : activeTab === 'doctors' ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Gestion des Médecins</h2>
              <Button
                onClick={() => setShowInviteModal(true)}
                variant="primary"
              >
                <Mail className="w-4 h-4 mr-2" />
                Inviter un médecin
              </Button>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Médecin</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Spécialité(s)</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Contact</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">RPPS</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Statut</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doctor) => (
                    <tr key={doctor.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-sm">
                            {doctor.prenom[0]}{doctor.nom[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {doctor.titre} {doctor.prenom} {doctor.nom}
                            </div>
                            <div className="text-xs text-slate-500">
                              Entrée: {new Date(doctor.date_entree).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {doctor.specialites.slice(0, 2).map((spec, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary-100 text-secondary-700">
                              {spec}
                            </span>
                          ))}
                          {doctor.specialites.length > 2 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              +{doctor.specialites.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center text-xs text-slate-600">
                            <Mail className="w-3 h-3 mr-1" />
                            {doctor.email}
                          </div>
                          <div className="flex items-center text-xs text-slate-600">
                            <Phone className="w-3 h-3 mr-1" />
                            {doctor.telephone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-slate-700">{doctor.rpps}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          doctor.statut === 'actif' ? 'bg-safe-100 text-safe-700' :
                          doctor.statut === 'conge' ? 'bg-caution-100 text-caution-700' :
                          'bg-danger-100 text-danger-700'
                        }`}>
                          {doctor.statut === 'actif' && '🟢 '}
                          {doctor.statut === 'conge' && '🟡 '}
                          {doctor.statut === 'inactif' && '🔴 '}
                          {doctor.statut === 'actif' ? 'Actif' : doctor.statut === 'conge' ? 'En congé' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingDoctor(doctor);
                              setShowDoctorModal(true);
                            }}
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteDoctor(doctor.id)}
                            className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {doctors.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        <Stethoscope className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-lg font-medium mb-1">Aucun médecin</p>
                        <p className="text-sm">Cliquez sur "Ajouter un Médecin" pour commencer</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'patients' ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <KPICard
                title="Patients Totaux"
                value={patientStats.totalPatients}
                icon={<Users className="w-6 h-6" />}
                color="primary"
                subtitle="Tous les patients"
              />
              <KPICard
                title="Nouveaux ce mois"
                value={patientStats.newThisMonth}
                icon={<UserPlus className="w-6 h-6" />}
                color="secondary"
                subtitle="Nouveaux patients"
              />
              <KPICard
                title="Consultations"
                value={patientStats.totalConsultations}
                icon={<Activity className="w-6 h-6" />}
                color="safe"
                subtitle="Total consultations"
              />
              <KPICard
                title="Actifs"
                value={patientStats.activePatients}
                icon={<UserCheck className="w-6 h-6" />}
                color="caution"
                subtitle="Patients actifs"
              />
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">Liste des Patients</h2>
                  <input
                    type="text"
                    placeholder="Rechercher un patient..."
                    value={patientSearchTerm}
                    onChange={(e) => setPatientSearchTerm(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none w-80"
                  />
                </div>
              </div>
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Nom</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Âge</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Sexe</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Pathologies</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Date d'ajout</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allPatients
                    .filter((p) =>
                      p.nom_complet.toLowerCase().includes(patientSearchTerm.toLowerCase())
                    )
                    .map((patient) => (
                      <tr key={patient.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{patient.nom_complet}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-700">{patient.age} ans</td>
                        <td className="px-6 py-4 text-slate-700">{patient.sexe}</td>
                        <td className="px-6 py-4">
                          {patient.maladies_chroniques && patient.maladies_chroniques.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {patient.maladies_chroniques.slice(0, 2).map((maladie: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-danger-100 text-danger-700"
                                >
                                  {maladie}
                                </span>
                              ))}
                              {patient.maladies_chroniques.length > 2 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                  +{patient.maladies_chroniques.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">Aucune</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-sm">
                          {new Date(patient.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              setSelectedPatientDetails(patient);
                              setShowPatientDetailsModal(true);
                            }}
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  {allPatients.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-lg font-medium mb-1">Aucun patient</p>
                        <p className="text-sm">Les patients ajoutés apparaîtront ici</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </main>

      <PatientDetailsModal
        isOpen={showPatientDetailsModal}
        onClose={() => {
          setShowPatientDetailsModal(false);
          setSelectedPatientDetails(null);
        }}
        patient={selectedPatientDetails}
        doctorName="Dr. Laurent Dupont"
        onViewHistory={async () => {
          if (selectedPatientDetails) {
            try {
              const { data: ordonnancesData, error } = await supabase
                .from('ordonnances')
                .select('*')
                .eq('patient_id', selectedPatientDetails.id)
                .order('created_at', { ascending: false });

              if (!error && ordonnancesData) {
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

                const ordonnancesWithDoctors = ordonnancesData.map((ord: any) => {
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

                setPatientOrdonnances(ordonnancesWithDoctors);
                setShowMedicationHistoryModal(true);
              }
            } catch (error) {
              console.error('Error loading ordonnances:', error);
            }
          }
        }}
        onEdit={() => {
          setEditingPatient(selectedPatientDetails);
          setShowPatientDetailsModal(false);
          setShowPatientEditModal(true);
        }}
      />

      <Modal
        isOpen={showPatientEditModal}
        onClose={() => {
          setShowPatientEditModal(false);
          setEditingPatient(null);
        }}
        title={editingPatient ? 'Modifier le Patient' : 'Ajouter un Patient'}
        size="xl"
      >
        <PatientForm
          patient={editingPatient}
          onSave={handleSavePatient}
          onCancel={() => {
            setShowPatientEditModal(false);
            setEditingPatient(null);
          }}
        />
      </Modal>

      {selectedPatientDetails && (
        <MedicationHistoryModal
          isOpen={showMedicationHistoryModal}
          onClose={() => setShowMedicationHistoryModal(false)}
          patient={{
            nom_complet: selectedPatientDetails.nom_complet
          }}
          ordonnances={patientOrdonnances}
        />
      )}

      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Inviter un médecin"
      >
        <form onSubmit={handleSendInvitation} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse e-mail <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="docteur@exemple.com"
                required
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Spécialité <span className="text-red-500">*</span>
            </label>
            <select
              value={inviteForm.speciality}
              onChange={(e) => setInviteForm({ ...inviteForm, speciality: e.target.value })}
              required
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              <option value="">Sélectionner une spécialité</option>
              {SPECIALITIES.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-800">
              Un email d'invitation sera envoyé à cette adresse avec un lien sécurisé pour créer un compte.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowInviteModal(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button type="submit" loading={inviteLoading} className="flex-1">
              Envoyer l'invitation
            </Button>
          </div>
        </form>
      </Modal>

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
