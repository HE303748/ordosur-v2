import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCheck, AlertTriangle, UserPlus, FileText, Activity, Info } from 'lucide-react';
import { PageTransition } from '../../../components/ui/PageTransition';

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifCategory = 'all' | 'alerts' | 'system' | 'activity';

interface MockNotif {
  id: string;
  type: 'alert' | 'system' | 'activity' | 'info';
  title: string;
  body: string;
  time: string;
  read: boolean;
}

// ─── Mock data (à remplacer par Supabase realtime) ────────────────────────────

const MOCK: MockNotif[] = [
  {
    id: '1',
    type: 'alert',
    title: 'Interaction médicamenteuse détectée',
    body: 'Patient Mohamed A. — Amoxicilline + Warfarine (risque hémorragique)',
    time: "Il y a 12 min",
    read: false,
  },
  {
    id: '2',
    type: 'activity',
    title: 'Nouvelle ordonnance créée',
    body: 'Dr. Benali a créé une ordonnance pour Fatima Z.',
    time: "Il y a 45 min",
    read: false,
  },
  {
    id: '3',
    type: 'system',
    title: 'Invitation médecin acceptée',
    body: 'Dr. Rachidi a rejoint la clinique via votre invitation.',
    time: "Il y a 2 h",
    read: false,
  },
  {
    id: '4',
    type: 'activity',
    title: 'Nouveau patient enregistré',
    body: 'Karim L. a été ajouté par Dr. El Amrani.',
    time: "Il y a 3 h",
    read: true,
  },
  {
    id: '5',
    type: 'info',
    title: 'Rapport mensuel disponible',
    body: 'Le rapport statistique de mars 2026 est prêt à télécharger.',
    time: "Hier",
    read: true,
  },
  {
    id: '6',
    type: 'alert',
    title: 'Ordonnance expirée',
    body: '3 ordonnances ont expiré cette semaine sans renouvellement.',
    time: "Hier",
    read: true,
  },
  {
    id: '7',
    type: 'system',
    title: 'Mise à jour système',
    body: 'OrdoSur v2.4 déployé — vérificateur d\'interactions amélioré.',
    time: "Il y a 2 jours",
    read: true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    bg: 'bg-sky-50 dark:bg-sky-500/10',
    text: 'text-sky-600 dark:text-sky-400',
    dot: 'bg-sky-500',
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
  { key: 'activity', label: 'Activité'   },
  { key: 'system',   label: 'Système'    },
];

// ─── Component ────────────────────────────────────────────────────────────────

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
                : 'Tout est à jour'}
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
                  ? 'bg-sky-500 text-white'
                  : 'bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-[#94A3B8] hover:border-sky-300'
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
                      : 'bg-sky-50/30 dark:bg-sky-500/[0.04] hover:bg-sky-50/60 dark:hover:bg-sky-500/[0.07]'
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
          Les notifications en temps réel via Supabase Realtime seront activées dans un prochain sprint.
        </p>

      </div>
    </PageTransition>
  );
}
