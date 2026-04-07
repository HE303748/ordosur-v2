import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Shield, FileText,
  BarChart3, Calendar, Settings, LogOut, Bot, Activity,
} from 'lucide-react';

export type ViewType = 'home' | 'patients' | 'checker' | 'ordonnances' | 'stats' | 'agenda' | 'settings';

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNav: NavItem[] = [
  { id: 'home',        label: 'Accueil',           icon: LayoutDashboard },
  { id: 'patients',    label: 'Patients',           icon: Users },
  { id: 'checker',     label: 'Vérificateur',       icon: Shield },
  { id: 'ordonnances', label: 'Ordonnances',        icon: FileText },
  { id: 'agenda',      label: 'Agenda',             icon: Calendar },
];

const toolsNav: NavItem[] = [
  { id: 'stats',    label: 'Statistiques', icon: BarChart3 },
  { id: 'settings', label: 'Paramètres',   icon: Settings },
];

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}

function NavButton({ item, isActive, onClick, badge }: NavButtonProps) {
  const Icon = item.icon;
  return (
    <motion.button
      whileHover={{ x: isActive ? 0 : 3 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors duration-150 ${
        isActive
          ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
          : 'text-slate-400 hover:text-white hover:bg-white/[0.07]'
      }`}
      style={isActive ? { borderLeft: '2px solid rgba(255,255,255,0.35)' } : { borderLeft: '2px solid transparent' }}
    >
      <Icon className="w-[18px] h-[18px] flex-shrink-0" />
      <span className="flex-1 text-left">{item.label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`min-w-[20px] px-1.5 py-0.5 rounded-full text-[11px] font-bold text-center tabular-nums ${
          isActive ? 'bg-white/25 text-white' : 'bg-slate-700 text-slate-300'
        }`}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </motion.button>
  );
}

interface SidebarProps {
  activeView: ViewType;
  onNavigate: (v: ViewType) => void;
  onAIChat: () => void;
  onLogout: () => void;
  userName?: string;
  userInitials?: string;
  specialite?: string;
  patientCount?: number;
}

export function Sidebar({
  activeView, onNavigate, onAIChat, onLogout,
  userName, userInitials, specialite, patientCount,
}: SidebarProps) {
  return (
    <div className="w-[260px] min-w-[260px] h-screen bg-[#0F172A] flex flex-col border-r border-white/[0.06] overflow-hidden select-none">
      {/* ─── Logo + Doctor ─── */}
      <div className="px-5 pt-6 pb-5 border-b border-white/[0.08]">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-[17px] tracking-tight leading-none">OrdoSur</h1>
            <p className="text-sky-400/70 text-[11px] font-medium mt-0.5">Plateforme médicale</p>
          </div>
        </div>

        {/* Doctor card */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-inner">
            {userInitials || 'MD'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-[13px] font-semibold truncate leading-tight">{userName || 'Médecin'}</p>
            <p className="text-slate-500 text-[11px] truncate mt-0.5">{specialite || 'Généraliste'}</p>
          </div>
          {/* Online dot */}
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
        </div>
      </div>

      {/* ─── Navigation ─── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="px-3 pb-2 text-[10px] font-bold text-slate-600 uppercase tracking-[0.12em]">
          Navigation
        </p>
        {mainNav.map(item => (
          <NavButton
            key={item.id}
            item={item}
            isActive={activeView === item.id}
            onClick={() => onNavigate(item.id)}
            badge={item.id === 'patients' ? patientCount : undefined}
          />
        ))}

        <p className="px-3 pb-2 pt-5 text-[10px] font-bold text-slate-600 uppercase tracking-[0.12em]">
          Outils
        </p>
        {toolsNav.map(item => (
          <NavButton
            key={item.id}
            item={item}
            isActive={activeView === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </nav>

      {/* ─── Bottom ─── */}
      <div className="px-3 pb-5 pt-3 border-t border-white/[0.08] space-y-1.5">
        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.975 }}
          onClick={onAIChat}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] font-semibold bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-shadow"
        >
          <Bot className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1 text-left">Assistant IA</span>
          <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded-full font-bold tracking-wide">IA</span>
        </motion.button>

        <motion.button
          whileHover={{ x: 3 }}
          transition={{ duration: 0.15 }}
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-400/10 text-[13px] font-medium transition-colors duration-150"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span>Déconnexion</span>
        </motion.button>
      </div>
    </div>
  );
}
