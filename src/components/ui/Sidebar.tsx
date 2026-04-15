import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Shield, FileText,
  BarChart3, Calendar, Settings, LogOut, Bot, Activity,
  ChevronLeft, ChevronRight,
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

/* ── Tooltip wrapper for collapsed mode ────────────────────────── */
interface TooltipProps {
  label: string;
  children: React.ReactNode;
  collapsed: boolean;
}
function Tooltip({ label, children, collapsed }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  if (!collapsed) return <>{children}</>;
  return (
    <div
      className="relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[99999] pointer-events-none"
          >
            <div
              className="px-2.5 py-1.5 rounded-lg text-white text-xs font-semibold whitespace-nowrap shadow-xl"
              style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {label}
              {/* Arrow */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-0 h-0"
                style={{ borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: '6px solid #1E293B' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Nav button ─────────────────────────────────────────────────── */
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
    <Tooltip label={item.label} collapsed={!!collapsed}>
      <motion.button
        whileHover={{ x: isActive || collapsed ? 0 : 2 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        onClick={onClick}
        className={`w-full flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-150 ${
          collapsed ? 'px-2.5 py-2.5 justify-center' : 'px-3 py-2.5'
        } ${
          isActive
            ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
            : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
        }`}
        style={
          isActive
            ? { borderLeft: collapsed ? 'none' : '2px solid rgba(255,255,255,0.35)' }
            : { borderLeft: collapsed ? 'none' : '2px solid transparent' }
        }
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
            isActive ? 'bg-white/25 text-white' : 'bg-white/[0.1] text-slate-300'
          }`}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </motion.button>
    </Tooltip>
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
  userName, userInitials, specialite, patientCount,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });

  const toggle = () => {
    setCollapsed(c => {
      const next = !c;
      try { localStorage.setItem('sidebar-collapsed', String(next)); } catch {}
      return next;
    });
  };

  const w = collapsed ? 64 : 260;

  return (
    <motion.div
      animate={{ width: w }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      style={{ background: 'linear-gradient(180deg, #060B14 0%, #0A0F1E 100%)' }}
      className="h-screen flex flex-col border-r border-white/[0.06] overflow-hidden select-none flex-shrink-0"
    >
      {/* ── Logo row ── */}
      <div className={`flex items-center border-b border-white/[0.08] flex-shrink-0 ${
        collapsed ? 'flex-col px-2 py-4 gap-2' : 'px-5 pt-6 pb-5'
      }`}>
        {!collapsed && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/25 flex-shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-bold text-[17px] tracking-tight leading-none">OrdoSur</h1>
              <p className="text-sky-400/60 text-[11px] font-medium mt-0.5">Plateforme médicale</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/25">
            <Activity className="w-5 h-5 text-white" />
          </div>
        )}
        <button
          onClick={toggle}
          className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-white/[0.07] rounded-lg transition-colors flex-shrink-0"
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

      {/* ── Collapsed: avatar ── */}
      {collapsed && (
        <div className="flex justify-center py-3 border-b border-white/[0.06] flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
            {userInitials || 'MD'}
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className={`flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
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
        {collapsed && <div className="h-4" />}

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
        {/* AI Chat */}
        <Tooltip label="Assistant IA" collapsed={collapsed}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onAIChat}
            className={`w-full flex items-center rounded-xl text-[13px] font-semibold bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/20 hover:shadow-sky-500/35 transition-shadow ${
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
        </Tooltip>

        {/* Logout */}
        <Tooltip label="Déconnexion" collapsed={collapsed}>
          <motion.button
            whileHover={{ x: collapsed ? 0 : 2 }}
            transition={{ duration: 0.12 }}
            onClick={onLogout}
            className={`w-full flex items-center text-slate-500 hover:text-red-400 hover:bg-red-400/[0.1] text-[13px] font-medium transition-colors duration-150 rounded-xl ${
              collapsed ? 'px-2.5 py-2.5 justify-center' : 'gap-3 px-3 py-2.5'
            }`}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span>Déconnexion</span>}
          </motion.button>
        </Tooltip>

        {/* Collapse toggle hint at very bottom (expanded only) */}
        {!collapsed && (
          <p className="text-center text-[10px] text-slate-700 pt-1 select-none">
            ← Réduire
          </p>
        )}
      </div>
    </motion.div>
  );
}
