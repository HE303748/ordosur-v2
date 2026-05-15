import { useEffect, useRef, useState } from 'react';
import { Search, ChevronRight, X, User, Pill, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { NotifBell, NotificationsPanel, useNotifications } from './NotificationsPanel';
import { useTheme } from '../../contexts/ThemeContext';

const LABELS: Record<string, string> = {
  home:        'Accueil',
  patients:    'Patients',
  checker:     "Vérificateur d'interactions",
  ordonnances: 'Ordonnances',
  stats:       'Statistiques',
  agenda:      'Agenda',
  settings:    'Paramètres',
  // Clinic admin views
  medecins:      'Gestion des médecins',
  notifications: 'Notifications',
};

interface TopBarProps {
  activeView: string;
  userInitials?: string;
  patients?: Array<{ id: string; prenom: string; nom: string; pathologies?: string[] }>;
  onNavigate?: (v: string) => void;
}

/* ── Global Ctrl+K search ─────────────────────────────────────── */
function GlobalSearch({ patients = [], onNavigate }: { patients: any[]; onNavigate?: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const filtered = query.length >= 1
    ? patients.filter(p => `${p.prenom} ${p.nom}`.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  return (
    <>
      {/* Trigger bar */}
      <button
        onClick={() => setOpen(true)}
        className="flex-1 max-w-lg mx-auto flex items-center gap-2.5 pl-3 pr-4 py-2
          bg-slate-50 dark:bg-white/[0.05]
          border border-[#E5E5E0] dark:border-white/[0.08]
          rounded-md text-sm
          text-[#94A3B8] dark:text-slate-500
          hover:border-[#00A86B] dark:hover:border-[#00A86B]/40
          hover:bg-white dark:hover:bg-white/[0.07]
          transition-all cursor-pointer text-left"
      >
        <Search className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">Rechercher...</span>
        <span className="text-[11px] bg-slate-200 dark:bg-white/[0.07] text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono hidden sm:block">
          Ctrl K
        </span>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[9995] flex items-start justify-center pt-20 px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1,    y: 0   }}
              exit={{    opacity: 0, scale: 0.96, y: -10  }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden
                bg-white dark:bg-[#111827]
                border border-slate-200/80 dark:border-white/[0.08]"
            >
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-white/[0.06]">
                <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Rechercher un patient, médicament..."
                  className="flex-1 bg-transparent text-sm
                    text-slate-900 dark:text-[#E2E8F0]
                    placeholder-slate-400 dark:placeholder-slate-600
                    focus:outline-none"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-white/[0.07] rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                )}
                <kbd className="text-[11px] bg-slate-100 dark:bg-white/[0.07] text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono">
                  Esc
                </kbd>
              </div>

              {/* Results */}
              {filtered.length > 0 ? (
                <div className="py-2">
                  <p className="px-4 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                    Patients
                  </p>
                  {filtered.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { onNavigate?.('patients'); setOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3
                        hover:bg-[#E6F4EE] dark:hover:bg-[#00A86B]/10
                        transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-md bg-[#00A86B] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {p.prenom[0]}{p.nom[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">
                          {p.prenom} {p.nom}
                        </p>
                        {p.pathologies?.[0] && (
                          <p className="text-xs text-slate-400 dark:text-slate-500">{p.pathologies[0]}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 ml-auto" />
                    </button>
                  ))}
                </div>
              ) : query.length >= 1 ? (
                <div className="py-10 text-center text-slate-400 dark:text-slate-600 text-sm">
                  Aucun résultat pour « {query} »
                </div>
              ) : (
                <div className="py-6 px-4">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-3">
                    Accès rapide
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Patients',     icon: User, view: 'patients' },
                      { label: 'Vérificateur', icon: Pill, view: 'checker'  },
                    ].map(item => (
                      <button
                        key={item.view}
                        onClick={() => { onNavigate?.(item.view); setOpen(false); }}
                        className="flex items-center gap-2.5 px-4 py-3
                          bg-slate-50 dark:bg-white/[0.05]
                          hover:bg-[#E6F4EE] dark:hover:bg-[#00A86B]/[0.08]
                          rounded-md transition-colors text-sm font-semibold
                          text-[#475569] dark:text-[#94A3B8]"
                      >
                        <item.icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Main TopBar ─────────────────────────────────────────────── */
export function TopBar({ activeView, userInitials, patients = [], onNavigate }: TopBarProps) {
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const { notifications, unreadCount, markRead, markAllRead, deleteNotif } = useNotifications();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header
      className="h-16 flex items-center px-6 gap-4 flex-shrink-0 z-20 relative
        bg-white/95 dark:bg-[#0D1424]/95
        border-b border-slate-200/80 dark:border-white/[0.06]
        backdrop-blur-md"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm min-w-0 flex-shrink-0">
        <span className="text-slate-400 dark:text-[#475569] font-medium hidden sm:block">OrdoSur</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700 hidden sm:block" />
        <span className="text-slate-800 dark:text-[#E2E8F0] font-semibold">{LABELS[activeView] || activeView}</span>
      </div>

      {/* Global search Ctrl+K */}
      <GlobalSearch patients={patients} onNavigate={onNavigate} />

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Dark mode toggle */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={toggleTheme}
          title={isDark ? 'Mode clair' : 'Mode sombre'}
          className="p-2 hover:bg-slate-100 dark:hover:bg-white/[0.07] rounded-xl transition-colors"
        >
          {isDark
            ? <Sun  className="w-5 h-5 text-amber-400" />
            : <Moon className="w-5 h-5 text-slate-500" />
          }
        </motion.button>

        <NotifBell count={unreadCount} onClick={() => setShowNotifs(v => !v)} />

        <button
          onClick={() => navigate('/profile')}
          className="w-9 h-9 rounded-full bg-[#00A86B] text-white text-sm font-bold flex items-center justify-center hover:shadow-md hover:shadow-[#00A86B]/25 transition-shadow"
        >
          {userInitials || 'MD'}
        </button>
      </div>

      <NotificationsPanel
        isOpen={showNotifs}
        onClose={() => setShowNotifs(false)}
        notifications={notifications}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onDelete={deleteNotif}
      />
    </header>
  );
}
