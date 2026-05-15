import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Calendar, FileText, LogOut, Activity,
  Search, ChevronLeft, ChevronRight,
  Phone, Mail, User, Clock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Patient } from '../lib/supabase';
import { AgendaView } from '../components/ui/AgendaView';
import { PageTransition } from '../components/ui/PageTransition';
import { ToastManager, type ToastItem } from '../components/ui/Toast';

/* ── Types ──────────────────────────────────────────────────────────────────── */
interface Ordonnance {
  id: string;
  created_at: string;
  patient_nom?: string;
  patient_prenom?: string;
  medications?: { nom: string }[];
}

type ViewType = 'patients' | 'agenda' | 'ordonnances';

/* ── Sidebar secrétaire ─────────────────────────────────────────────────────── */
const NAV: { id: ViewType; label: string; icon: React.ElementType }[] = [
  { id: 'patients',    label: 'Patients',    icon: Users    },
  { id: 'agenda',      label: 'Agenda',      icon: Calendar },
  { id: 'ordonnances', label: 'Ordonnances', icon: FileText },
];

function SecretaireSidebar({
  active, onNavigate, onLogout, collapsed, onToggle, userName, orgName,
}: {
  active: ViewType;
  onNavigate: (v: ViewType) => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggle: () => void;
  userName: string;
  orgName: string;
}) {
  const w = collapsed ? 64 : 240;
  return (
    <motion.div
      animate={{ width: w }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
      style={{ background: 'linear-gradient(180deg, #060B14 0%, #0A0F1E 100%)' }}
      className="h-screen flex flex-col border-r border-white/[0.06] overflow-hidden select-none flex-shrink-0"
    >
      {/* Logo */}
      <div className={`flex items-center border-b border-white/[0.08] flex-shrink-0 ${collapsed ? 'flex-col px-2 py-4 gap-2' : 'px-4 pt-5 pb-4'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br bg-[#00A86B] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-bold text-[15px] leading-none">OrdoSur</h1>
              <p className="text-[#00A86B]/60 text-[10px] font-medium mt-0.5 truncate">{orgName}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-gradient-to-br bg-[#00A86B] rounded-xl flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-white/[0.07] rounded-lg transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* User */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-[12px] font-semibold truncate leading-tight">{userName}</p>
            <p className="text-violet-400/70 text-[10px] font-medium mt-0.5">Secrétaire médicale</p>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className={`flex-1 overflow-y-auto py-4 space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
        {NAV.map(item => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                collapsed ? 'px-2.5 py-2.5 justify-center' : 'px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-[#00A86B] text-white shadow-lg shadow-[#00A86B]/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className={`pb-5 pt-3 border-t border-white/[0.08] flex-shrink-0 ${collapsed ? 'px-2' : 'px-3'}`}>
        <button
          onClick={onLogout}
          className={`w-full flex items-center text-slate-500 hover:text-red-400 hover:bg-red-400/[0.1] text-[13px] font-medium transition-colors duration-150 rounded-xl ${
            collapsed ? 'px-2.5 py-2.5 justify-center' : 'gap-3 px-3 py-2.5'
          }`}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </motion.div>
  );
}

/* ── Patients view (read-only) ──────────────────────────────────────────────── */
function PatientsView({ patients, loading }: { patients: Patient[]; loading: boolean }) {
  const [search, setSearch] = useState('');
  const filtered = patients.filter(p =>
    `${p.prenom} ${p.nom}`.toLowerCase().includes(search.toLowerCase()) ||
    (p.telephone || '').includes(search)
  );

  return (
    <PageTransition>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Patients</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Liste des patients du cabinet</p>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un patient…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 dark:focus:ring-[#00A86B]/40"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Users className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Aucun patient trouvé</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <div
                key={p.id}
                className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-4 hover:border-[#00A86B]/20 dark:hover:border-[#00A86B]/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br bg-[#00A86B] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {p.prenom[0]}{p.nom[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">
                    {p.prenom} {p.nom}
                    {p.sexe && <span className="ml-2 text-slate-400 font-normal text-xs">{p.sexe === 'M' ? 'Homme' : 'Femme'}</span>}
                  </p>
                  <div className="flex items-center gap-4 mt-0.5">
                    {p.telephone && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Phone className="w-3 h-3" />{p.telephone}
                      </span>
                    )}
                    {p.email && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Mail className="w-3 h-3" />{p.email}
                      </span>
                    )}
                  </div>
                </div>
                {p.pathologies && p.pathologies.length > 0 && (
                  <div className="flex gap-1 flex-wrap max-w-[200px] justify-end">
                    {p.pathologies.slice(0, 2).map(path => (
                      <span key={path} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px] font-medium rounded-full border border-blue-100 dark:border-blue-500/20">
                        {path}
                      </span>
                    ))}
                    {p.pathologies.length > 2 && (
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/[0.06] text-slate-500 text-[10px] rounded-full">
                        +{p.pathologies.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

/* ── Ordonnances view (read-only) ───────────────────────────────────────────── */
function OrdonnancesView({ orgId }: { orgId: string }) {
  const [ordonnances, setOrdonnances] = useState<Ordonnance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('ordonnances')
        .select('id, created_at, patient_nom, patient_prenom, medications')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(100);
      setOrdonnances((data as Ordonnance[]) || []);
      setLoading(false);
    };
    if (orgId) load();
  }, [orgId]);

  const filtered = ordonnances.filter(o =>
    `${o.patient_prenom || ''} ${o.patient_nom || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageTransition>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ordonnances</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Historique des ordonnances du cabinet</p>
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par patient…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 dark:focus:ring-[#00A86B]/40"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FileText className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Aucune ordonnance trouvée</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(o => (
              <div
                key={o.id}
                className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">
                    {o.patient_prenom || ''} {o.patient_nom || ''}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(o.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                {o.medications && Array.isArray(o.medications) && o.medications.length > 0 && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {o.medications.length} médicament{o.medications.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

/* ── Main SecretaireDashboard ───────────────────────────────────────────────── */
export function SecretaireDashboard() {
  const { user, clinicProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const [activeView, setActiveView] = useState<ViewType>('agenda');
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('sec-sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: ToastItem['type'] = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const toggle = () => {
    setCollapsed(c => {
      const next = !c;
      try { localStorage.setItem('sec-sidebar-collapsed', String(next)); } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (!user?.org_id) return;
    const load = async () => {
      setPatientsLoading(true);
      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('org_id', user.org_id)
        .order('nom');
      setPatients((data as Patient[]) || []);
      setPatientsLoading(false);
    };
    load();
  }, [user?.org_id]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const userName = user?.full_name || `${user?.prenom || ''} ${user?.nom || ''}`.trim() || 'Secrétaire';
  const orgName = clinicProfile?.name || 'Cabinet';

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#060D1A] overflow-hidden font-sans">
      <SecretaireSidebar
        active={activeView}
        onNavigate={setActiveView}
        onLogout={handleLogout}
        collapsed={collapsed}
        onToggle={toggle}
        userName={userName}
        orgName={orgName}
      />

      <main className="flex-1 overflow-auto bg-[#F8FAFC] dark:bg-[#060D1A]">
        <AnimatePresence mode="wait">
          {activeView === 'patients' && (
            <PatientsView key="patients" patients={patients} loading={patientsLoading} />
          )}
          {activeView === 'agenda' && (
            <AgendaView key="agenda" patients={patients} showToast={showToast} />
          )}
          {activeView === 'ordonnances' && (
            <OrdonnancesView key="ordonnances" orgId={user?.org_id || ''} />
          )}
        </AnimatePresence>
      </main>

      <ToastManager toasts={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  );
}
