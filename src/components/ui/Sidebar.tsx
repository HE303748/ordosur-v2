import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Shield, FileText,
  BarChart3, Calendar, Settings, LogOut, Bot,
  ChevronLeft, ChevronRight, BookOpen, FilePlus,
} from 'lucide-react';
import { Logo } from '../Logo';

export type ViewType = 'home' | 'patients' | 'checker' | 'ordonnances' | 'stats' | 'agenda' | 'encyclopedie' | 'documents' | 'settings';

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
  { id: 'stats',        label: 'Statistiques', icon: BarChart3  },
  { id: 'encyclopedie', label: 'Encyclopédie', icon: BookOpen   },
  { id: 'documents',    label: 'Documents',    icon: FilePlus   },
  { id: 'settings',     label: 'Paramètres',   icon: Settings   },
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
              style={{ background: '#1A2B42', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {label}
              {/* Arrow */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-0 h-0"
                style={{ borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: '6px solid #1A2B42' }}
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
        className={`w-full flex items-center gap-3 rounded-md text-[13px] font-medium transition-all duration-150 ${
          collapsed ? 'px-2.5 py-2.5 justify-center' : 'px-3 py-2.5'
        } ${
          isActive
            ? 'bg-[#00A86B]/10 text-[#00A86B]'
            : 'text-white/60 hover:text-white hover:bg-[#1A2B42]'
        }`}
        style={
          isActive
            ? { borderLeft: collapsed ? 'none' : '3px solid #00A86B' }
            : { borderLeft: collapsed ? 'none' : '3px solid transparent' }
        }
      >
        <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-[#00A86B]' : 'text-white/50'}`} />
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
            isActive
              ? 'bg-[#006B47] text-white'
              : 'bg-[#00A86B] text-white'
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
      style={{ backgroundColor: '#0A1628' }}
      className="h-screen hidden lg:flex flex-col border-r border-white/[0.06] overflow-hidden select-none flex-shrink-0"
    >
      {/* ── Logo row ── */}
      <div className={`flex items-center border-b border-white/[0.08] flex-shrink-0 ${
        collapsed ? 'flex-col px-2 py-4 gap-2' : 'px-5 pt-5 pb-4'
      }`}>
        {!collapsed && (
          <div className="flex items-center flex-1 min-w-0">
            <Logo variant="horizontal-dark" size="md" />
          </div>
        )}
        {collapsed && (
          <Logo variant="symbol-dark" size="sm" />
        )}
        <button
          onClick={toggle}
          className="p-1.5 text-white/30 hover:text-white/70 hover:bg-white/[0.07] rounded-md transition-colors flex-shrink-0"
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
            <div className="w-10 h-10 rounded-full bg-[#00A86B] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {userInitials || 'MD'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-[13px] font-bold truncate leading-tight">{userName || 'Médecin'}</p>
              <p className="text-white/50 text-[11px] truncate mt-0.5">{specialite || 'Généraliste'}</p>
            </div>
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00A86B] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00A86B]" />
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Collapsed: avatar ── */}
      {collapsed && (
        <div className="flex justify-center py-3 border-b border-white/[0.06] flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-[#00A86B] flex items-center justify-center text-white font-bold text-xs">
            {userInitials || 'MD'}
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className={`flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-bold text-white/25 uppercase tracking-[0.12em]">
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
          <p className="px-3 pb-2 pt-5 text-[10px] font-bold text-white/25 uppercase tracking-[0.12em]">
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
            className={`w-full flex items-center rounded-md text-[13px] font-semibold bg-[#00A86B] text-white hover:bg-[#006B47] transition-colors shadow-lg shadow-[#00A86B]/20 ${
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
            className={`w-full flex items-center text-white/40 hover:text-[#DC2626] hover:bg-[#DC2626]/[0.1] text-[13px] font-medium transition-colors duration-150 rounded-md ${
              collapsed ? 'px-2.5 py-2.5 justify-center' : 'gap-3 px-3 py-2.5'
            }`}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span>Déconnexion</span>}
          </motion.button>
        </Tooltip>

        {/* Collapse toggle hint at very bottom (expanded only) */}
        {!collapsed && (
          <p className="text-center text-[10px] text-white/20 pt-1 select-none">
            ← Réduire
          </p>
        )}
      </div>
    </motion.div>
  );
}
