import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCheck, AlertTriangle, UserPlus, FileText, Activity, Info } from 'lucide-react';
import { PageTransition } from '../../../components/ui/PageTransition';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type NotifCategory = 'all' | 'alerts' | 'system' | 'activity';

interface MockNotif {
  id: string;
  type: 'alert' | 'system' | 'activity' | 'info';
  title: string;
  body: string;
  time: string;
  read: boolean;
}

// â”€â”€â”€ Mock data (Ã  remplacer par Supabase realtime) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MOCK: MockNotif[] = [
  {
    id: '1',
    type: 'alert',
    title: 'Interaction mÃ©dicamenteuse dÃ©tectÃ©e',
    body: 'Patient Mohamed A. â€” Amoxicilline + Warfarine (risque hÃ©morragique)',
    time: "Il y a 12 min",
    read: false,
  },
  {
    id: '2',
    type: 'activity',
    title: 'Nouvelle ordonnance crÃ©Ã©e',
    body: 'Dr. Benali a crÃ©Ã© une ordonnance pour Fatima Z.',
    time: "Il y a 45 min",
    read: false,
  },
  {
    id: '3',
    type: 'system',
    title: 'Invitation mÃ©decin acceptÃ©e',
    body: 'Dr. Rachidi a rejoint la clinique via votre invitation.',
    time: "Il y a 2 h",
    read: false,
  },
  {
    id: '4',
    type: 'activity',
    title: 'Nouveau patient enregistrÃ©',
    body: 'Karim L. a Ã©tÃ© ajoutÃ© par Dr. El Amrani.',
    time: "Il y a 3 h",
    read: true,
  },
  {
    id: '5',
    type: 'info',
    title: 'Rapport mensuel disponible',
    body: 'Le rapport statistique de mars 2026 est prÃªt Ã  tÃ©lÃ©charger.',
    time: "Hier",
    read: true,
  },
  {
    id: '6',
    type: 'alert',
    title: 'Ordonnance expirÃ©e',
    body: '3 ordonnances ont expirÃ© cette semaine sans renouvellement.',
    time: "Hier",
    read: true,
  },
  {
    id: '7',
    type: 'system',
    title: 'Mise Ã  jour systÃ¨me',
    body: 'OrdoSur v2.4 dÃ©ployÃ© â€” vÃ©rificateur d\'interactions amÃ©liorÃ©.',
    time: "Il y a 2 jours",
    read: true,
  },
];

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TYPE_META: Record<MockNotif['type'], {
  icon: React.ElementType;
  bg: string;
  text: string;
  dot: string;
}> = {
  alert: {
    icon: AlertTriangle,
    bg: 'bg-red-50 dark:bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
  },
  activity: {
    icon: Activity,
    bg: 'bg-[#E6F4EE] dark:bg-[#00A86B]/10',
    text: 'text-[#00A86B]',
    dot: 'bg-[#00A86B]',
  },
  system: {
    icon: UserPlus,
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    text: 'text-violet-600 dark:text-violet-400',
    dot: 'bg-violet-500',
  },
  info: {
    icon: Info,
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
};

const CATEGORIES: { key: NotifCategory; label: string }[] = [
  { key: 'all',      label: 'Toutes'     },
  { key: 'alerts',   label: 'Alertes'    },
  { key: 'activity', label: 'ActivitÃ©'   },
  { key: 'system',   label: 'SystÃ¨me'    },
];

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function ClinicNotificationsView() {
  const [notifs, setNotifs] = useState<MockNotif[]>(MOCK);
  const [category, setCategory] = useState<NotifCategory>('all');

  const unreadCount = notifs.filter(n => !n.read).length;

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const filtered = notifs.filter(n => {
    if (category === 'all')      return true;
    if (category === 'alerts')   return n.type === 'alert';
    if (category === 'activity') return n.type === 'activity';
    if (category === 'system')   return n.type === 'system' || n.type === 'info';
    return true;
  });

  return (
    <PageTransition>
      <div className="p-6 max-w-[900px]">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">Notifications</h1>
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">
              {unreadCount > 0
                ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
                : 'Tout est Ã  jour'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-[#94A3B8] bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Tout marquer lu
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-5">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                category === cat.key
                  ? 'bg-[#00A86B] text-white'
                  : 'bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-[#94A3B8] hover:border-[#00A86B]'
              }`}
            >
              {cat.label}
              {cat.key === 'all' && unreadCount > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  category === 'all' ? 'bg-white/25 text-white' : 'bg-red-500 text-white'
                }`}>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notification list */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-50 dark:divide-white/[0.04]">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Bell className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-sm text-slate-400 dark:text-slate-600">Aucune notification</p>
            </div>
          ) : (
            filtered.map((n, i) => {
              const meta = TYPE_META[n.type];
              const Icon = meta.icon;
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => markRead(n.id)}
                  className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors ${
                    n.read
                      ? 'hover:bg-slate-50/70 dark:hover:bg-white/[0.02]'
                      : 'bg-[#E6F4EE]/30 dark:bg-[#00A86B]/[0.04] hover:bg-[#E6F4EE]/60 dark:hover:bg-[#00A86B]/[0.07]'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                    <Icon className={`w-5 h-5 ${meta.text}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className={`text-sm font-semibold leading-snug ${
                        n.read
                          ? 'text-slate-700 dark:text-[#94A3B8]'
                          : 'text-slate-900 dark:text-[#E2E8F0]'
                      }`}>
                        {n.title}
                      </p>
                      <span className="text-xs text-slate-400 dark:text-slate-600 whitespace-nowrap flex-shrink-0">
                        {n.time}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#64748B] mt-0.5 leading-relaxed">
                      {n.body}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${meta.dot}`} />
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-4">
          Les notifications en temps rÃ©el via Supabase Realtime seront activÃ©es dans un prochain sprint.
        </p>

      </div>
    </PageTransition>
  );
}
