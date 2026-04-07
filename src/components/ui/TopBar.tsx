import { Search, Bell, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LABELS: Record<string, string> = {
  home:        'Accueil',
  patients:    'Patients',
  checker:     "Vérificateur d'interactions",
  ordonnances: 'Ordonnances',
  stats:       'Statistiques',
  agenda:      'Agenda',
  settings:    'Paramètres',
};

interface TopBarProps {
  activeView: string;
  userInitials?: string;
}

export function TopBar({ activeView, userInitials }: TopBarProps) {
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 flex items-center px-6 gap-4 flex-shrink-0 z-20">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm min-w-0 flex-shrink-0">
        <span className="text-slate-400 font-medium hidden sm:block">OrdoSur</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:block" />
        <span className="text-slate-800 font-semibold">{LABELS[activeView] || activeView}</span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-lg mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher patients, médicaments, ordonnances..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300 focus:bg-white transition-all placeholder-slate-400"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button className="relative p-2.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>

        <button
          onClick={() => navigate('/profile')}
          className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white text-sm font-bold flex items-center justify-center hover:shadow-md hover:shadow-sky-500/25 transition-shadow"
        >
          {userInitials || 'MD'}
        </button>
      </div>
    </header>
  );
}
