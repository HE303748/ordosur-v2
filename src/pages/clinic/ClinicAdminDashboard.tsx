import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Users, FileText, AlertTriangle, Activity,
  BarChart2, Settings, LogOut, Building2,
} from 'lucide-react';

interface ClinicStats {
  totalDoctors: number;
  totalPatients: number;
  ordonnancesThisMonth: number;
  interactionsDetected: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: 'sky' | 'teal' | 'violet' | 'amber';
}) {
  const colors = {
    sky:    'bg-sky-50    text-sky-600    dark:bg-sky-500/10    dark:text-sky-400',
    teal:   'bg-teal-50   text-teal-600   dark:bg-teal-500/10   dark:text-teal-400',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
    amber:  'bg-amber-50  text-amber-600  dark:bg-amber-500/10  dark:text-amber-400',
  };

  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-6 flex items-center gap-4 shadow-sm">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-slate-500 dark:text-[#94A3B8]">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">{value}</p>
      </div>
    </div>
  );
}

const NAV = [
  { path: '/clinic/admin',          icon: Activity,  label: 'Tableau de bord' },
  { path: '/clinic/admin/doctors',  icon: Users,     label: 'Médecins' },
  { path: '/clinic/admin/stats',    icon: BarChart2, label: 'Statistiques' },
  { path: '/clinic/admin/settings', icon: Settings,  label: 'Paramètres' },
];

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

  useEffect(() => {
    if (user?.org_id) loadClinicData();
    else setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.org_id]);

  async function loadClinicData() {
    try {
      setLoading(true);
      const orgId = user!.org_id;

      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .maybeSingle();

      if (org?.name) setClinicName(org.name);

      const [doctorsRes, patientsRes, ordonnancesRes] = await Promise.all([
        supabase.from('doctors').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
        supabase.from('patients').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
        supabase
          .from('ordonnances')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);

      setStats({
        totalDoctors: doctorsRes.count ?? 0,
        totalPatients: patientsRes.count ?? 0,
        ordonnancesThisMonth: ordonnancesRes.count ?? 0,
        interactionsDetected: 0,
      });
    } catch (err) {
      console.error('[ClinicAdmin] loadClinicData error:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const initials = user?.prenom && user?.nom
    ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase()
    : (user?.email?.[0] ?? 'A').toUpperCase();

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0A0F1E]">

      {/* ── Sidebar ── */}
      <aside
        className="w-64 flex-shrink-0 flex flex-col min-h-screen border-r border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#111827]"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shadow">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-slate-900 dark:text-[#E2E8F0] truncate">{clinicName}</p>
            <p className="text-[11px] text-slate-400 dark:text-[#475569]">Administration</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                  active
                    ? 'bg-sky-50 dark:bg-sky-500/[0.12] text-sky-700 dark:text-sky-400'
                    : 'text-slate-600 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-white/[0.05]'
                }`}
              >
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-slate-100 dark:border-white/[0.06] space-y-3">
          <div className="flex items-center gap-3 px-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] truncate">
                {user?.prenom} {user?.nom}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-[#475569] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/[0.08] rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">
              Tableau de bord
            </h1>
            <p className="text-slate-500 dark:text-[#94A3B8] mt-1">
              Vue d'ensemble de {clinicName}
            </p>
          </div>

          {/* KPIs */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-6 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-white/[0.07]" />
                    <div className="space-y-2">
                      <div className="h-3 w-20 bg-slate-200 dark:bg-white/[0.07] rounded" />
                      <div className="h-6 w-10 bg-slate-200 dark:bg-white/[0.07] rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={Users}         label="Médecins"            value={stats.totalDoctors}           color="sky"    />
              <StatCard icon={Users}         label="Patients"            value={stats.totalPatients}          color="teal"   />
              <StatCard icon={FileText}      label="Ordonnances ce mois" value={stats.ordonnancesThisMonth}   color="violet" />
              <StatCard icon={AlertTriangle} label="Interactions"        value={stats.interactionsDetected}   color="amber"  />
            </div>
          )}

          {/* Activity card */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-[#E2E8F0] mb-4">
              Activité récente
            </h2>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center mb-4">
                <Activity className="w-7 h-7 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-sm font-medium text-slate-400 dark:text-slate-600">Aucune activité récente</p>
              <p className="text-xs text-slate-300 dark:text-slate-700 mt-1">
                L'activité de votre clinique apparaîtra ici
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
