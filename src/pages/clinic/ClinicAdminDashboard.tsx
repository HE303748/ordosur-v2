import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { KPICard } from '../../components/KPICard';
import { Users, FileText, AlertTriangle, Activity } from 'lucide-react';

interface ClinicStats {
  totalDoctors: number;
  totalPatients: number;
  ordonnancesThisMonth: number;
  interactionsDetected: number;
}

export function ClinicAdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<ClinicStats>({
    totalDoctors: 0,
    totalPatients: 0,
    ordonnancesThisMonth: 0,
    interactionsDetected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [clinicName, setClinicName] = useState('Ma Clinique');

  const currentPath = location.pathname;

  useEffect(() => {
    loadClinicData();
  }, []);

  async function loadClinicData() {
    try {
      setLoading(true);

      const orgId = user?.org_id;
      if (!orgId) {
        setLoading(false);
        return;
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .maybeSingle();

      if (org?.name) {
        setClinicName(org.name);
      }

      const [doctorsRes, patientsRes, ordonnancesRes] = await Promise.all([
        supabase
          .from('doctors')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId),
        supabase
          .from('patients')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId),
        supabase
          .from('ordonnances')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);

      setStats({
        totalDoctors: doctorsRes.count || 0,
        totalPatients: patientsRes.count || 0,
        ordonnancesThisMonth: ordonnancesRes.count || 0,
        interactionsDetected: 0,
      });
    } catch (error) {
      console.error('Error loading clinic data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <div className="flex">
        <aside className="w-64 min-h-screen bg-white border-r border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">{clinicName}</h2>
                <p className="text-xs text-gray-500">Administration</p>
              </div>
            </div>
          </div>

          <nav className="p-4">
            <div className="space-y-1">
              <button
                onClick={() => navigate('/clinic/admin')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  currentPath === '/clinic/admin'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Activity className="w-5 h-5" />
                <span>Tableau de bord</span>
              </button>

              <button
                onClick={() => navigate('/clinic/admin/doctors')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  currentPath === '/clinic/admin/doctors'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Users className="w-5 h-5" />
                <span>Médecins</span>
              </button>

              <button
                onClick={() => navigate('/clinic/admin/stats')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  currentPath === '/clinic/admin/stats'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span>Statistiques</span>
              </button>

              <button
                onClick={() => navigate('/clinic/admin/settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  currentPath === '/clinic/admin/settings'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Paramètres</span>
              </button>
            </div>
          </nav>

          <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                <p className="text-xs text-gray-500">Administrateur</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        </aside>

        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de bord</h1>
              <p className="text-gray-600">Vue d'ensemble de votre clinique</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                  title="Total Médecins"
                  value={stats.totalDoctors}
                  icon={Users}
                  trend={{ value: 0, isPositive: true }}
                  color="blue"
                />
                <KPICard
                  title="Total Patients"
                  value={stats.totalPatients}
                  icon={Users}
                  trend={{ value: 0, isPositive: true }}
                  color="teal"
                />
                <KPICard
                  title="Ordonnances ce mois"
                  value={stats.ordonnancesThisMonth}
                  icon={FileText}
                  trend={{ value: 0, isPositive: true }}
                  color="green"
                />
                <KPICard
                  title="Interactions détectées"
                  value={stats.interactionsDetected}
                  icon={AlertTriangle}
                  trend={{ value: 0, isPositive: false }}
                  color="orange"
                />
              </div>
            )}

            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Activité récente</h2>
              <p className="text-gray-500 text-center py-8">Aucune activité récente</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
