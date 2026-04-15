import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { FileText, Users, TrendingUp, Activity, RefreshCw } from 'lucide-react';
import { PageTransition } from '../../../components/ui/PageTransition';
import { supabase } from '../../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DoctorWithProfile {
  id: string;
  user_id: string;
  rpps: string | null;
  specialite: string | null;
  prenom: string;
  nom: string;
  email: string;
}

interface DoctorStat { name: string; ordonnances: number; }
interface WeekStat   { semaine: string; ordonnances: number; }
interface MonthStat  { mois: string; patients: number; }
interface SpecStat   { name: string; value: number; }

// ─── Constants ────────────────────────────────────────────────────────────────

const PIE_COLORS = ['#0ea5e9', '#14b8a6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#f97316'];

const CHART_STYLE = {
  labelStyle:   { fill: '#94a3b8', fontSize: 11 },
  tooltipStyle: { backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0' },
};

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KPI({ icon: Icon, label, value, color, sub }: {
  icon: any; label: string; value: string | number; color: string; sub?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-5 shadow-sm"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">{value}</p>
      <p className="text-sm font-medium text-slate-600 dark:text-[#94A3B8] mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-[#475569] mt-0.5">{sub}</p>}
    </motion.div>
  );
}

// ─── Chart card wrapper ────────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 dark:text-[#E2E8F0] mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props { orgId?: string; doctors: DoctorWithProfile[]; }

// ─── Component ────────────────────────────────────────────────────────────────

export function ClinicStatsView({ orgId, doctors }: Props) {
  const [doctorStats,   setDoctorStats]   = useState<DoctorStat[]>([]);
  const [weekStats,     setWeekStats]     = useState<WeekStat[]>([]);
  const [monthStats,    setMonthStats]    = useState<MonthStat[]>([]);
  const [specStats,     setSpecStats]     = useState<SpecStat[]>([]);
  const [totalOrd,      setTotalOrd]      = useState(0);
  const [newPatientsM,  setNewPatientsM]  = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [lastRefresh,   setLastRefresh]   = useState(new Date());

  useEffect(() => { if (orgId) load(); }, [orgId, doctors]);

  async function load() {
    if (!orgId) return;
    setLoading(true);
    try {
      await Promise.all([
        loadDoctorStats(),
        loadWeekStats(),
        loadMonthStats(),
        loadSpecStats(),
        loadTotalOrd(),
        loadNewPatients(),
      ]);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }

  async function loadDoctorStats() {
    const stats: DoctorStat[] = await Promise.all(
      doctors.map(async d => {
        const { count } = await supabase
          .from('ordonnances')
          .select('id', { count: 'exact', head: true })
          .eq('doctor_id', d.id);
        return { name: `Dr. ${d.prenom} ${d.nom}`, ordonnances: count ?? 0 };
      })
    );
    setDoctorStats(stats.sort((a, b) => b.ordonnances - a.ordonnances));
  }

  async function loadWeekStats() {
    const weeks: WeekStat[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - start.getDay() - i * 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const { count } = await supabase
        .from('ordonnances')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      weeks.push({
        semaine: `S${6 - i}`,
        ordonnances: count ?? 0,
      });
    }
    setWeekStats(weeks);
  }

  async function loadMonthStats() {
    const months: MonthStat[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const { count } = await supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      months.push({
        mois: d.toLocaleDateString('fr-FR', { month: 'short' }),
        patients: count ?? 0,
      });
    }
    setMonthStats(months);
  }

  async function loadSpecStats() {
    const map = new Map<string, number>();
    doctors.forEach(d => {
      const s = d.specialite ?? 'Autre';
      map.set(s, (map.get(s) ?? 0) + 1);
    });
    setSpecStats(Array.from(map.entries()).map(([name, value]) => ({ name, value })));
  }

  async function loadTotalOrd() {
    const { count } = await supabase
      .from('ordonnances')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId);
    setTotalOrd(count ?? 0);
  }

  async function loadNewPatients() {
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const { count } = await supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('created_at', start.toISOString());
    setNewPatientsM(count ?? 0);
  }

  const skeletonCard = (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-5 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/[0.07] mb-4" />
      <div className="h-7 w-16 bg-slate-200 dark:bg-white/[0.07] rounded mb-2" />
      <div className="h-4 w-24 bg-slate-200 dark:bg-white/[0.07] rounded" />
    </div>
  );

  return (
    <PageTransition>
      <div className="p-6 max-w-[1400px]">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">Statistiques</h1>
            <p className="text-xs text-slate-400 dark:text-[#475569] mt-0.5">
              Mis à jour le {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-[#94A3B8] bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i}>{skeletonCard}</div>)
          ) : (
            <>
              <KPI icon={FileText}   label="Ordonnances totales"    value={totalOrd}       color="bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400"       sub="Depuis le début" />
              <KPI icon={Users}      label="Nouveaux patients / mois" value={newPatientsM}  color="bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400"   sub="Ce mois" />
              <KPI icon={Activity}   label="Médecins actifs"         value={doctors.length} color="bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400" />
              <KPI icon={TrendingUp} label="Taux d'occupation"       value="75%"            color="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" sub="Estimation" />
            </>
          )}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
          <ChartCard title="Ordonnances par semaine (6 dernières semaines)">
            {loading ? (
              <div className="h-52 bg-slate-100 dark:bg-white/[0.04] rounded-xl animate-pulse" />
            ) : weekStats.every(w => w.ordonnances === 0) ? (
              <p className="text-center text-sm text-slate-400 dark:text-slate-600 py-16">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={weekStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="semaine" tick={CHART_STYLE.labelStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={CHART_STYLE.labelStyle} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CHART_STYLE.tooltipStyle} />
                  <Line type="monotone" dataKey="ordonnances" stroke="#0ea5e9" strokeWidth={2.5}
                    dot={{ fill: '#0ea5e9', r: 4 }} name="Ordonnances" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Performance par médecin">
            {loading ? (
              <div className="h-52 bg-slate-100 dark:bg-white/[0.04] rounded-xl animate-pulse" />
            ) : doctorStats.length === 0 ? (
              <p className="text-center text-sm text-slate-400 dark:text-slate-600 py-16">Aucun médecin</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={doctorStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" horizontal={false} />
                  <XAxis type="number" tick={CHART_STYLE.labelStyle} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={CHART_STYLE.labelStyle} axisLine={false} tickLine={false} width={90} />
                  <Tooltip contentStyle={CHART_STYLE.tooltipStyle} />
                  <Bar dataKey="ordonnances" fill="#8b5cf6" radius={[0, 6, 6, 0]} name="Ordonnances" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
          <ChartCard title="Répartition par spécialité">
            {loading ? (
              <div className="h-52 bg-slate-100 dark:bg-white/[0.04] rounded-xl animate-pulse" />
            ) : specStats.length === 0 ? (
              <p className="text-center text-sm text-slate-400 dark:text-slate-600 py-16">Aucun médecin</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={specStats} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}>
                    {specStats.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_STYLE.tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Croissance des patients (6 mois)">
            {loading ? (
              <div className="h-52 bg-slate-100 dark:bg-white/[0.04] rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthStats}>
                  <defs>
                    <linearGradient id="gradPatients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="mois" tick={CHART_STYLE.labelStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={CHART_STYLE.labelStyle} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CHART_STYLE.tooltipStyle} />
                  <Area type="monotone" dataKey="patients" stroke="#14b8a6" strokeWidth={2.5}
                    fill="url(#gradPatients)" name="Nouveaux patients" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Top médecins table */}
        <ChartCard title="Top médecins — ordonnances">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 dark:bg-white/[0.04] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : doctorStats.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-600 text-center py-6">Aucun médecin</p>
          ) : (
            <div className="space-y-2">
              {doctorStats.slice(0, 5).map((d, i) => (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="w-6 text-xs font-bold text-slate-400 dark:text-[#475569] text-right">{i + 1}</span>
                  <div className="flex-1 bg-slate-100 dark:bg-white/[0.05] rounded-lg overflow-hidden h-7 relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${doctorStats[0].ordonnances ? (d.ordonnances / doctorStats[0].ordonnances) * 100 : 0}%` }}
                      transition={{ delay: i * 0.1, duration: 0.6, ease: 'easeOut' }}
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-400 to-cyan-400 rounded-lg"
                    />
                    <span className="absolute inset-0 flex items-center px-3 text-xs font-semibold text-slate-700 dark:text-[#E2E8F0] z-10">
                      {d.name}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-sky-600 dark:text-sky-400 w-8 text-right">
                    {d.ordonnances}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

      </div>
    </PageTransition>
  );
}
