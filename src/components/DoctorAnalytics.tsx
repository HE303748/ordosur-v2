import { useState, useEffect } from 'react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, AlertTriangle, Pill, Clock, History } from 'lucide-react';
import { supabase } from '../lib/supabase';

const monthlyData = [
  { mois: 'Juin', interactions: 95 },
  { mois: 'Juillet', interactions: 120 },
  { mois: 'Août', interactions: 85 },
  { mois: 'Sept.', interactions: 145 },
  { mois: 'Oct.', interactions: 160 },
  { mois: 'Nov.', interactions: 178 },
];

const riskData = [
  { name: 'Sécuritaire', value: 65, color: '#10B981' },
  { name: 'Attention', value: 30, color: '#F59E0B' },
  { name: 'Dangereux', value: 5, color: '#EF4444' },
];

export function MonthlyInteractionsChart() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-[300px]">
      <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
        <BarChart3 className="w-5 h-5 mr-2 text-primary-600" />
        Mes Interactions par Mois
      </h3>
      <ResponsiveContainer width="100%" height={230}>
        <LineChart data={monthlyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="mois" stroke="#6B7280" style={{ fontSize: '12px' }} />
          <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          />
          <Line
            type="monotone"
            dataKey="interactions"
            stroke="#0066CC"
            strokeWidth={3}
            dot={{ fill: '#0066CC', r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RiskDistributionChart() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-[300px]">
      <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
        <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
        Répartition des Risques
      </h3>
      <ResponsiveContainer width="100%" height={170}>
        <PieChart>
          <Pie
            data={riskData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
          >
            {riskData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #E5E7EB'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 mt-2">
        {riskData.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
            <span className="text-xs text-slate-700 font-medium">{item.name}: {item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AllMedicationsHistoryProps {
  doctorId: string;
}

export function AllMedicationsHistory({ doctorId }: AllMedicationsHistoryProps) {
  const [allMeds, setAllMeds] = useState<Array<{ nom: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllMedications();
  }, [doctorId]);

  const loadAllMedications = async () => {
    try {
      const { data: logs } = await supabase
        .from('interaction_logs')
        .select('medicament_a, medicament_b')
        .eq('doctor_id', doctorId);

      if (logs) {
        const medCounts: { [key: string]: number } = {};

        logs.forEach(log => {
          if (log.medicament_a) {
            medCounts[log.medicament_a] = (medCounts[log.medicament_a] || 0) + 1;
          }
          if (log.medicament_b) {
            medCounts[log.medicament_b] = (medCounts[log.medicament_b] || 0) + 1;
          }
        });

        const sortedMeds = Object.entries(medCounts)
          .map(([nom, count]) => ({ nom, count }))
          .sort((a, b) => b.count - a.count);

        setAllMeds(sortedMeds);
      }
    } catch (error) {
      console.error('Error loading medications:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-[300px] md:h-[300px] flex flex-col">
      <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center flex-shrink-0">
        <History className="w-5 h-5 mr-2 text-primary-600" />
        Historique Complet des Médicaments
      </h3>
      <div className="space-y-2 overflow-y-auto flex-1 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <p className="text-sm text-slate-500 text-center py-8">Chargement...</p>
        ) : allMeds.length > 0 ? (
          allMeds.map((med, idx) => (
            <div key={idx} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <span className="text-sm font-medium text-slate-900">
                {idx + 1}. {med.nom}
              </span>
              <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded">
                {med.count} fois
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500 text-center py-8">Aucune donnée disponible</p>
        )}
      </div>
    </div>
  );
}

interface TopMedicationsSectionProps {
  doctorId: string;
}

export function TopMedicationsSection({ doctorId }: TopMedicationsSectionProps) {
  const [topMeds, setTopMeds] = useState<Array<{ nom: string; count: number; percentage: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTopMedications();
  }, [doctorId]);

  const loadTopMedications = async () => {
    try {
      const { data: logs } = await supabase
        .from('interaction_logs')
        .select('medicament_a, medicament_b')
        .eq('doctor_id', doctorId);

      if (logs) {
        const medCounts: { [key: string]: number } = {};

        logs.forEach(log => {
          if (log.medicament_a) {
            medCounts[log.medicament_a] = (medCounts[log.medicament_a] || 0) + 1;
          }
          if (log.medicament_b) {
            medCounts[log.medicament_b] = (medCounts[log.medicament_b] || 0) + 1;
          }
        });

        const sortedMeds = Object.entries(medCounts)
          .map(([nom, count]) => ({ nom, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        const maxCount = sortedMeds[0]?.count || 1;
        const medsWithPercentage = sortedMeds.map(med => ({
          ...med,
          percentage: Math.round((med.count / maxCount) * 100)
        }));

        setTopMeds(medsWithPercentage);
      }
    } catch (error) {
      console.error('Error loading top medications:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-[300px] md:h-[300px] flex flex-col">
      <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center flex-shrink-0">
        <Pill className="w-5 h-5 mr-2 text-primary-600" />
        Top 10 Médicaments Vérifiés
      </h3>
      <div className="space-y-3 overflow-y-auto flex-1 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <p className="text-sm text-slate-500 text-center py-8">Chargement...</p>
        ) : topMeds.length > 0 ? (
          topMeds.map((med, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">
                  {idx + 1}. {med.nom}
                </span>
                <span className="text-xs font-bold text-slate-600">{med.count} fois</span>
              </div>
              <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-primary-600 rounded-full transition-all duration-500"
                  style={{ width: `${med.percentage}%` }}
                ></div>
              </div>
              <div className="text-xs text-slate-500 text-right">{med.percentage}%</div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500 text-center py-8">Aucune donnée disponible</p>
        )}
      </div>
    </div>
  );
}

interface RecentActivityTimelineProps {
  doctorId: string;
}

export function RecentActivityTimeline({ doctorId }: RecentActivityTimelineProps) {
  const [activities, setActivities] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentActivity();
  }, [doctorId]);

  const loadRecentActivity = async () => {
    try {
      const { data: logs } = await supabase
        .from('interaction_logs')
        .select('*, patients(nom_complet)')
        .eq('doctor_id', doctorId)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (logs) {
        setActivities(logs);
      }
    } catch (error) {
      console.error('Error loading recent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'safe') return 'text-green-700 bg-green-50 border-green-200';
    if (status === 'attention') return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'safe') return '🟢';
    if (status === 'attention') return '🟡';
    return '🔴';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'safe') return 'SÉCURITAIRE';
    if (status === 'attention') return 'ATTENTION';
    return 'DANGEREUX';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-[300px] md:h-[300px] flex flex-col">
      <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center flex-shrink-0">
        <Clock className="w-5 h-5 mr-2 text-primary-600" />
        Activité Récente
      </h3>
      <div className="space-y-3 overflow-y-auto flex-1 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <p className="text-sm text-slate-500 text-center py-8">Chargement...</p>
        ) : activities.length > 0 ? (
          activities.map((activity, idx) => (
            <div key={idx} className="flex items-start space-x-3 pb-3 border-b border-slate-100 last:border-b-0">
              <span className="text-lg mt-0.5">{getStatusIcon(activity.risk_level)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-900">
                    {activity.patients?.nom_complet || 'Patient'}
                  </span>
                  <span className="text-xs text-slate-500">{formatTime(activity.timestamp)}</span>
                </div>
                <div className="text-xs text-slate-600 mb-1">
                  {activity.medicament_a} + {activity.medicament_b}
                </div>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${getStatusColor(activity.risk_level)}`}>
                  {getStatusLabel(activity.risk_level)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500 text-center py-8">Aucune activité récente</p>
        )}
      </div>
    </div>
  );
}
