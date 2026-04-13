import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Shield, FileText,
  BarChart3, Calendar, Settings, LogOut, Bot, Activity,
  ChevronLeft, ChevronRight, Bell,
} from 'lucide-react';

export type ViewType = 'home' | 'patients' | 'checker' | 'ordonnances' | 'stats' | 'agenda' | 'settings';

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNav: NavItem[] = [
  { id: 'home',        label: 'Accueil',      icon: LayoutDashboard },
  { id: 'patients',    label: 'Patients',     icon: Users           },
  { id: 'checker',    label: 'Vérificateur', icon: Shield          },
  { id: 'ordonnances', label: 'Ordonnances',  icon: FileText        },
  { id: 'agenda',     label: 'Agenda',       icon: Calendar        },
];

const toolsNav: NavItem[] = [
  { id: 'stats',    label: 'Statistiques', icon: BarChart3 },
  { id: 'settings', label: 'Paramètres',   icon: Settings  },
];

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
  collapsed?: boolean;
}

function NavButton({ item, isActive, onClick, badge, collapsed }: NavButtonProps) {
  const Icon = item.icon;
  return (
    <motion.button
      whileHover={{ x: isActive || collapsed ? 0 : 3 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`w-full flex items-center gap-3 rounded-xl text-[13px] font-medium transition-colors duration-150 ${
        collapsed ? 'px-2.5 py-2.5 justify-center' : 'px-3 py-2.5'
      } ${
        isActive
          ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
          : 'text-slate-400 hover:text-white hover:bg-white/[0.07]'
      }`}
      style={isActive && !collapsed ? { borderLeft: '2px solid rgba(255,255,255,0.35)' } : { borderLeft: '2px solid transparent' }}
    >
      <Icon className="w-[18px] h-[18px] flex-shrink-0" />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 text-left overflow-hidden whitespace-nowrap"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      {!collapsed && badge !== undefined && badge > 0 && (
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
  notifCount?: number;
}

export function Sidebar({
  activeView, onNavigate, onAIChat, onLogout,
  userName, userInitials, specialite, patientCount, notifCount = 0,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const w = collapsed ? 68 : 260;

  return (
    <motion.div
      animate={{ width: w }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="h-screen bg-[#0F172A] flex flex-col border-r border-white/[0.06] overflow-hidden select-none flex-shrink-0"
    >
      {/* ── Logo + collapse button ── */}
      <div className={`flex items-center border-b border-white/[0.08] flex-shrink-0 ${collapsed ? 'px-2 py-5 justify-center' : 'px-5 pt-6 pb-5'}`}>
        {!collapsed && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-bold text-[17px] tracking-tight leading-none">OrdoSur</h1>
              <p className="text-sky-400/70 text-[11px] font-medium mt-0.5">Plateforme médicale</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className={`p-1.5 text-slate-600 hover:text-white hover:bg-white/[0.07] rounded-lg transition-colors ${collapsed ? 'mt-2' : ''}`}
          title={collapsed ? 'Agrandir' : 'Réduire'}
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <ChevronLeft  className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ── Doctor card (expanded only) ── */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-3 flex-shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {userInitials || 'MD'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-[13px] font-semibold truncate leading-tight">{userName || 'Médecin'}</p>
              <p className="text-slate-500 text-[11px] truncate mt-0.5">{specialite || 'Généraliste'}</p>
            </div>
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navigation ── */}
      <nav className={`flex-1 overflow-y-auto py-4 space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-bold text-slate-600 uppercase tracking-[0.12em]">
            Navigation
          </p>
        )}
        {mainNav.map(item => (
          <NavButton
            key={item.id}
            item={item}
            isActive={activeView === item.id}
            onClick={() => onNavigate(item.id)}
            badge={item.id === 'patients' ? patientCount : undefined}
            collapsed={collapsed}
          />
        ))}

        {!collapsed && (
          <p className="px-3 pb-2 pt-5 text-[10px] font-bold text-slate-600 uppercase tracking-[0.12em]">
            Outils
          </p>
        )}
        {collapsed && <div className="h-3" />}
        {toolsNav.map(item => (
          <NavButton
            key={item.id}
            item={item}
            isActive={activeView === item.id}
            onClick={() => onNavigate(item.id)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* ── Bottom ── */}
      <div className={`pb-5 pt-3 border-t border-white/[0.08] space-y-1.5 flex-shrink-0 ${collapsed ? 'px-2' : 'px-3'}`}>
        {/* AI Chat button */}
        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.975 }}
          onClick={onAIChat}
          title={collapsed ? 'Assistant IA' : undefined}
          className={`w-full flex items-center rounded-xl text-[13px] font-semibold bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-shadow ${
            collapsed ? 'px-2.5 py-2.5 justify-center' : 'gap-3 px-3 py-3'
          }`}
        >
          <Bot className="w-5 h-5 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Assistant IA</span>
              <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded-full font-bold">IA</span>
            </>
          )}
        </motion.button>

        {/* Logout */}
        <motion.button
          whileHover={{ x: collapsed ? 0 : 3 }}
          transition={{ duration: 0.15 }}
          onClick={onLogout}
          title={collapsed ? 'Déconnexion' : undefined}
          className={`w-full flex items-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 text-[13px] font-medium transition-colors duration-150 rounded-xl ${
            collapsed ? 'px-2.5 py-2.5 justify-center' : 'gap-3 px-3 py-2.5'
          }`}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </motion.button>
      </div>
    </motion.div>
  );
}
