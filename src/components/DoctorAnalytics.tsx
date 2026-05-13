import { useState, useEffect } from 'react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, AlertTriangle, Pill, Clock, History, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

// ─── MonthlyInteractionsChart (real data: ordonnances by month) ───────────────

interface MonthlyInteractionsChartProps {
  doctorId: string;
}

export function MonthlyInteractionsChart({ doctorId }: MonthlyInteractionsChartProps) {
  const [chartData, setChartData] = useState<Array<{ mois: string; ordonnances: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!doctorId) return;
    loadMonthlyData();
  }, [doctorId]);

  const loadMonthlyData = async () => {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('ordonnances')
        .select('created_at')
        .eq('doctor_id', doctorId)
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true });

      const now = new Date();
      const months: Array<{ mois: string; ordonnances: number; key: string }> = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          mois: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
          ordonnances: 0,
        });
      }

      (data || []).forEach(ord => {
        const d = new Date(ord.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const bucket = months.find(m => m.key === key);
        if (bucket) bucket.ordonnances++;
      });

      setChartData(months.map(({ mois, ordonnances }) => ({ mois, ordonnances })));
    } catch (error) {
      console.error('Error loading monthly ordonnances:', error);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-[300px] flex items-center justify-center">
        <p className="text-sm text-slate-400">Chargement…</p>
      </div>
    );
  }

  const hasData = chartData.some(d => d.ordonnances > 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-[300px]">
      <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
        <BarChart3 className="w-5 h-5 mr-2 text-primary-600" />
        Mes Ordonnances par Mois
      </h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="mois" stroke="#6B7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
              formatter={(value: number) => [value, 'Ordonnances']}
            />
            <Line
              type="monotone"
              dataKey="ordonnances"
              stroke="#0066CC"
              strokeWidth={3}
              dot={{ fill: '#0066CC', r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[220px]">
          <p className="text-sm text-slate-400 text-center">
            Aucune ordonnance sur les 6 derniers mois
          </p>
        </div>
      )}
    </div>
  );
}

// ─── RiskDistributionChart (real data: from interaction_logs.risk_level) ─────

interface RiskDistributionChartProps {
  doctorId: string;
}

const RISK_CONFIG = [
  { key: 'safe',      name: 'Sécuritaire', color: '#10B981' },
  { key: 'attention', name: 'Attention',    color: '#F59E0B' },
  { key: 'dangerous', name: 'Dangereux',    color: '#EF4444' },
];

export function RiskDistributionChart({ doctorId }: RiskDistributionChartProps) {
  const [pieData, setPieData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!doctorId) return;
    loadRiskData();
  }, [doctorId]);

  const loadRiskData = async () => {
    try {
      const { data: logs } = await supabase
        .from('interaction_logs')
        .select('risk_level')
        .eq('doctor_id', doctorId);

      if (logs && logs.length > 0) {
        const counts: Record<string, number> = { safe: 0, attention: 0, dangerous: 0 };
        logs.forEach(l => {
          const k = l.risk_level as string;
          if (k in counts) counts[k]++;
        });
        const total = logs.length;
        setPieData(
          RISK_CONFIG.map(r => ({
            name: r.name,
            value: Math.round((counts[r.key] / total) * 100),
            color: r.color,
          })).filter(d => d.value > 0)
        );
      } else {
        setPieData([]);
      }
    } catch (error) {
      console.error('Error loading risk distribution:', error);
      setPieData([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-[300px] flex items-center justify-center">
        <p className="text-sm text-slate-400">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-[300px]">
      <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
        <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
        Répartition des Risques
      </h3>
      {pieData.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB'
                }}
                formatter={(value: number) => [`${value}%`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-xs text-slate-700 font-medium">{item.name}: {item.value}%</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-[220px]">
          <p className="text-sm text-slate-400 text-center">
            Aucune vérification d'interaction enregistrée
          </p>
        </div>
      )}
    </div>
  );
}

// ─── AllMedicationsHistory ────────────────────────────────────────────────────
// Reads from ordonnance_lignes (prescribed meds) via get_medications_stats RPC

interface AllMedicationsHistoryProps {
  doctorId: string;
}

export function AllMedicationsHistory({ doctorId }: AllMedicationsHistoryProps) {
  const [allMeds, setAllMeds] = useState<Array<{ nom: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!doctorId) return;
    loadAllMedications();
  }, [doctorId]);

  const loadAllMedications = async () => {
    try {
      const { data, error } = await supabase.rpc('get_medications_stats', {
        p_doctor_id: doctorId,
      });
      if (error) throw error;
      setAllMeds(
        (data || []).map((row: { medicament_nom: string; prescriptions: number }) => ({
          nom: row.medicament_nom,
          count: Number(row.prescriptions),
        }))
      );
    } catch (error) {
      console.error('Error loading medications history:', error);
      setAllMeds([]);
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

// ─── TopMedicationsSection ────────────────────────────────────────────────────
// Top 10 from same get_medications_stats RPC (already ordered DESC)

interface TopMedicationsSectionProps {
  doctorId: string;
}

export function TopMedicationsSection({ doctorId }: TopMedicationsSectionProps) {
  const [topMeds, setTopMeds] = useState<Array<{ nom: string; count: number; percentage: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!doctorId) return;
    loadTopMedications();
  }, [doctorId]);

  const loadTopMedications = async () => {
    try {
      const { data, error } = await supabase.rpc('get_medications_stats', {
        p_doctor_id: doctorId,
      });
      if (error) throw error;

      const top10 = (data || [])
        .slice(0, 10)
        .map((row: { medicament_nom: string; prescriptions: number }) => ({
          nom: row.medicament_nom,
          count: Number(row.prescriptions),
        }));

      const maxCount = top10[0]?.count || 1;
      setTopMeds(
        top10.map(med => ({
          ...med,
          percentage: Math.round((med.count / maxCount) * 100),
        }))
      );
    } catch (error) {
      console.error('Error loading top medications:', error);
      setTopMeds([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-[300px] md:h-[300px] flex flex-col">
      <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center flex-shrink-0">
        <Pill className="w-5 h-5 mr-2 text-primary-600" />
        Top 10 Médicaments Prescrits
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

// ─── RecentActivityTimeline ───────────────────────────────────────────────────
// Multi-source feed: ordonnances + interaction checks via get_recent_activity RPC

interface RecentActivityTimelineProps {
  doctorId: string;
}

type ActivityItem = {
  id: string;
  type: 'ordonnance' | 'interaction';
  date: string;
  patientName: string;
  details: string;
  riskLevel: string | null;
};

export function RecentActivityTimeline({ doctorId }: RecentActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!doctorId) return;
    loadRecentActivity();
  }, [doctorId]);

  const loadRecentActivity = async () => {
    try {
      const { data, error } = await supabase.rpc('get_recent_activity', {
        p_doctor_id: doctorId,
        p_limit: 15,
      });
      if (error) throw error;
      setActivities(
        (data || []).map((row: {
          id: string;
          activity_type: string;
          activity_date: string;
          patient_name: string;
          details: string;
          risk_level: string | null;
        }) => ({
          id: row.id,
          type: row.activity_type as 'ordonnance' | 'interaction',
          date: row.activity_date,
          patientName: row.patient_name || '',
          details: row.details || '',
          riskLevel: row.risk_level || null,
        }))
      );
    } catch (error) {
      console.error('Error loading recent activity:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string | null) => {
    if (level === 'safe')      return 'text-green-700 bg-green-50 border-green-200';
    if (level === 'attention') return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    if (level === 'dangerous') return 'text-red-700 bg-red-50 border-red-200';
    return '';
  };

  const getRiskIcon = (level: string | null) => {
    if (level === 'safe')      return '🟢';
    if (level === 'attention') return '🟡';
    if (level === 'dangerous') return '🔴';
    return '⚪';
  };

  const getRiskLabel = (level: string | null) => {
    if (level === 'safe')      return 'SÉCURITAIRE';
    if (level === 'attention') return 'ATTENTION';
    if (level === 'dangerous') return 'DANGEREUX';
    return '';
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1)   return 'À l\'instant';
    if (diffMins < 60)  return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 30)  return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
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
              {/* Icon */}
              {activity.type === 'ordonnance' ? (
                <div className="w-7 h-7 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="w-3.5 h-3.5 text-primary-600" />
                </div>
              ) : (
                <span className="text-lg mt-0.5 flex-shrink-0">{getRiskIcon(activity.riskLevel)}</span>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-semibold text-slate-900 truncate">
                    {activity.type === 'ordonnance'
                      ? (activity.patientName || 'Patient')
                      : 'Vérification'}
                  </span>
                  <span className="text-xs text-slate-400 ml-2 flex-shrink-0">
                    {formatTime(activity.date)}
                  </span>
                </div>
                <div className="text-xs text-slate-600 mb-1 truncate">
                  {activity.details}
                </div>
                {activity.type === 'interaction' && activity.riskLevel && (
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${getRiskColor(activity.riskLevel)}`}>
                    {getRiskLabel(activity.riskLevel)}
                  </span>
                )}
                {activity.type === 'ordonnance' && (
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">
                    ORDONNANCE
                  </span>
                )}
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
