import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, CheckCheck, Info, AlertTriangle, Calendar, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'rdv' | 'interaction';
  titre: string;
  message?: string;
  lu: boolean;
  created_at: string;
  lien?: string;
}

const NOTIF_ICONS: Record<string, any> = {
  info:        Info,
  warning:     AlertTriangle,
  success:     Check,
  rdv:         Calendar,
  interaction: Shield,
};

const NOTIF_COLORS: Record<string, string> = {
  info:        'bg-[#E6F4EE] dark:bg-[#00A86B]/20 text-[#006B47] dark:text-[#00A86B]',
  warning:     'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
  success:     'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  rdv:         'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400',
  interaction: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
};

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return 'Ã€ l\'instant';
  if (diff < 3600)  return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return `Il y a ${Math.floor(diff / 86400)} j`;
}

interface NotifBellProps {
  count: number;
  onClick: () => void;
}

export function NotifBell({ count, onClick }: NotifBellProps) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 hover:bg-slate-100 dark:hover:bg-white/[0.07] rounded-xl transition-colors"
    >
      <Bell className="w-5 h-5 text-slate-600 dark:text-[#94A3B8]" />
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
          >
            {count > 9 ? '9+' : count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
}

export function NotificationsPanel({
  isOpen, onClose, notifications, onMarkRead, onMarkAllRead, onDelete,
}: NotificationsPanelProps) {
  const unreadCount = notifications.filter(n => !n.lu).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9980]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: -8, scale: 0.97  }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed top-16 right-4 z-[9990] w-96 rounded-2xl shadow-2xl overflow-hidden
              bg-white dark:bg-[#111827]
              border border-slate-200/80 dark:border-white/[0.06]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0]">Notifications</h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-0.5">{unreadCount} non lue(s)</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllRead}
                    className="text-xs text-[#00A86B] hover:text-[#006B47] font-semibold flex items-center gap-1
                      hover:bg-[#E6F4EE] dark:hover:bg-[#00A86B]/[0.1] px-2 py-1 rounded-lg transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Tout lire
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.07] rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                  <p className="text-sm font-medium text-slate-400 dark:text-slate-600">Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
                  {notifications.map(n => {
                    const Icon = NOTIF_ICONS[n.type] || Info;
                    return (
                      <motion.div
                        key={n.id}
                        layout
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`group flex items-start gap-3 px-5 py-4 cursor-pointer transition-colors ${
                          !n.lu
                            ? 'bg-[#E6F4EE]/40 dark:bg-[#00A86B]/[0.05] hover:bg-[#E6F4EE] dark:hover:bg-[#00A86B]/[0.1]'
                            : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                        }`}
                        onClick={() => onMarkRead(n.id)}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${NOTIF_COLORS[n.type]}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm ${
                              n.lu
                                ? 'text-slate-600 dark:text-[#94A3B8]'
                                : 'text-slate-900 dark:text-[#E2E8F0] font-semibold'
                            }`}>
                              {n.titre}
                            </p>
                            {!n.lu && <span className="w-2 h-2 bg-[#00A86B] rounded-full flex-shrink-0 mt-1" />}
                          </div>
                          {n.message && (
                            <p className="text-xs text-slate-400 dark:text-[#475569] mt-0.5 line-clamp-2">{n.message}</p>
                          )}
                          <p className="text-[10px] text-slate-300 dark:text-slate-700 mt-1">{timeAgo(n.created_at)}</p>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); onDelete(n.id); }}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-white/[0.1] rounded-lg transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3 text-slate-400" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* â”€â”€ Hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setNotifications(data || []);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ lu: true }).eq('id', id);
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, lu: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ lu: true }).eq('user_id', user.id).eq('lu', false);
    setNotifications(ns => ns.map(n => ({ ...n, lu: true })));
  };

  const deleteNotif = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(ns => ns.filter(n => n.id !== id));
  };

  const addNotification = async (titre: string, message?: string, type: Notification['type'] = 'info') => {
    if (!user) return;
    await supabase.from('notifications').insert({ user_id: user.id, org_id: user.org_id, titre, message, type });
    load();
  };

  return {
    notifications,
    unreadCount: notifications.filter(n => !n.lu).length,
    markRead, markAllRead, deleteNotif, addNotification, reload: load,
  };
}
