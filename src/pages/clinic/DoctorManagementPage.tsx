import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Toast } from '../../components/Toast';
import { Users, UserPlus } from 'lucide-react';

interface DoctorRow {
  id: string;
  user_id: string;
  rpps: string | null;
  specialite: string | null;
  ordre_number: string | null;
  prenom: string;
  nom: string;
  email: string;
}

export function DoctorManagementPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadDoctors();
  }, []);

  async function loadDoctors() {
    try {
      setLoading(true);

      const orgId = user?.org_id;
      if (!orgId) {
        setLoading(false);
        return;
      }

      const { data: doctorsData, error: doctorsError } = await supabase
        .from('doctors')
        .select('id, user_id, rpps, specialite, ordre_number')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (doctorsError) throw doctorsError;

      if (!doctorsData || doctorsData.length === 0) {
        setDoctors([]);
        setLoading(false);
        return;
      }

      const userIds = doctorsData.map((d: any) => d.user_id).filter(Boolean);

      const { data: profilesData } = await supabase
        .from('user_profiles')
        .select('user_id, prenom, nom')
        .in('user_id', userIds);

      const { data: authData } = await supabase
        .from('user_profiles')
        .select('user_id')
        .in('user_id', userIds);

      const rows: DoctorRow[] = doctorsData.map((doctor: any) => {
        const profile = profilesData?.find((p: any) => p.user_id === doctor.user_id);
        return {
          id: doctor.id,
          user_id: doctor.user_id,
          rpps: doctor.rpps,
          specialite: doctor.specialite,
          ordre_number: doctor.ordre_number,
          prenom: profile?.prenom || 'Prénom',
          nom: profile?.nom || 'Nom',
          email: '',
        };
      });

      setDoctors(rows);
    } catch (error: any) {
      console.error('Error loading doctors:', error);
      setError('Erreur lors du chargement des médecins');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <div className="flex">
        <aside className="w-64 min-h-screen bg-white border-r border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <button
              onClick={() => navigate('/clinic/admin')}
              className="flex items-center gap-3 w-full"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h2 className="font-bold text-gray-900">Ma Clinique</h2>
                <p className="text-xs text-gray-500">Administration</p>
              </div>
            </button>
          </div>

          <nav className="p-4">
            <div className="space-y-1">
              <button
                onClick={() => navigate('/clinic/admin')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>Tableau de bord</span>
              </button>

              <button
                onClick={() => navigate('/clinic/admin/doctors')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left bg-blue-50 text-blue-700 font-medium"
              >
                <Users className="w-5 h-5" />
                <span>Médecins</span>
              </button>

              <button
                onClick={() => navigate('/clinic/admin/stats')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Statistiques</span>
              </button>

              <button
                onClick={() => navigate('/clinic/admin/settings')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Paramètres</span>
              </button>
            </div>
          </nav>
        </aside>

        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des médecins</h1>
                <p className="text-gray-600">Médecins rattachés à votre organisation</p>
              </div>
            </div>

            {error && <Toast message={error} type="error" onClose={() => setError('')} />}
            {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Médecin
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Spécialité
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        N° RPPS
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        N° Ordre
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          </div>
                        </td>
                      </tr>
                    ) : doctors.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Users className="w-12 h-12 text-gray-300" />
                            <p className="text-gray-500">Aucun médecin enregistré</p>
                            <p className="text-sm text-gray-400">
                              Les médecins apparaissent ici après leur inscription avec votre organisation.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      doctors.map((doctor) => (
                        <tr key={doctor.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm">
                                {doctor.prenom.charAt(0)}{doctor.nom.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">Dr. {doctor.prenom} {doctor.nom}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {doctor.specialite || '-'}
                          </td>
                          <td className="px-6 py-4 text-gray-700 font-mono text-sm">
                            {doctor.rpps || '-'}
                          </td>
                          <td className="px-6 py-4 text-gray-700 font-mono text-sm">
                            {doctor.ordre_number || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
