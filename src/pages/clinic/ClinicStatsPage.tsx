import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Users, TrendingUp } from 'lucide-react';

interface DoctorStats {
  name: string;
  ordonnances: number;
}

interface InteractionStats {
  name: string;
  value: number;
}

interface ActivityStats {
  date: string;
  ordonnances: number;
}

const SEVERITY_COLORS = {
  'Majeure': '#ef4444',
  'Modérée': '#f59e0b',
  'Mineure': '#10b981',
};

export function ClinicStatsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doctorStats, setDoctorStats] = useState<DoctorStats[]>([]);
  const [interactionStats, setInteractionStats] = useState<InteractionStats[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  async function loadStatistics() {
    try {
      setLoading(true);

      const orgId = user?.org_id;
      if (!orgId) {
        setLoading(false);
        return;
      }

      const { data: doctors } = await supabase
        .from('doctors')
        .select('id, user_id, specialite')
        .eq('org_id', orgId);

      if (doctors && doctors.length > 0) {
        const userIds = doctors.map((d: any) => d.user_id).filter(Boolean);
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, prenom, nom')
          .in('user_id', userIds);

        const doctorStatsData = await Promise.all(
          doctors.map(async (doctor: any) => {
            const profile = profiles?.find((p: any) => p.user_id === doctor.user_id);
            const name = profile ? `Dr. ${profile.prenom} ${profile.nom}` : 'Médecin';
            const { count } = await supabase
              .from('ordonnances')
              .select('id', { count: 'exact', head: true })
              .eq('doctor_id', doctor.id);

            return { name, ordonnances: count || 0 };
          })
        );

        setDoctorStats(doctorStatsData.filter(d => d.ordonnances > 0));
      }

      setInteractionStats([]);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: ordonnances } = await supabase
        .from('ordonnances')
        .select('created_at')
        .eq('org_id', orgId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (ordonnances) {
        const activityMap = new Map<string, number>();

        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          activityMap.set(dateStr, 0);
        }

        ordonnances.forEach((ord) => {
          const dateStr = ord.created_at.split('T')[0];
          if (activityMap.has(dateStr)) {
            activityMap.set(dateStr, (activityMap.get(dateStr) || 0) + 1);
          }
        });

        setActivityStats(
          Array.from(activityMap.entries()).map(([date, ordonnances]) => ({
            date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
            ordonnances,
          }))
        );
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAFAF7] via-white to-[#E6F4EE]">
      <div className="flex">
        <aside className="w-64 min-h-screen bg-white border-r border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <button
              onClick={() => navigate('/clinic/admin')}
              className="flex items-center gap-3 w-full"
            >
              <div className="w-10 h-10 bg-gradient-to-br [#00A86B] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
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
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Users className="w-5 h-5" />
                <span>Médecins</span>
              </button>

              <button
                onClick={() => navigate('/clinic/admin/stats')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left bg-blue-50 text-blue-700 font-medium"
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
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Statistiques</h1>
              <p className="text-gray-600">Analyse détaillée de l'activité de votre clinique</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Ordonnances par médecin</h2>
                  {doctorStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={doctorStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="ordonnances" fill="#3b82f6" name="Ordonnances" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-gray-500 py-8">Aucune donnée disponible</p>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Interactions par gravité</h2>
                    {interactionStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={interactionStats}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {interactionStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.name as keyof typeof SEVERITY_COLORS] || '#94a3b8'} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center text-gray-500 py-8">Aucune interaction détectée</p>
                    )}
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Activité des 30 derniers jours</h2>
                    {activityStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={activityStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="ordonnances" stroke="#14b8a6" strokeWidth={2} name="Ordonnances" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center text-gray-500 py-8">Aucune donnée disponible</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
