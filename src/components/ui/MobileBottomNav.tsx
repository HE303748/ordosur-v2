/**
 * MobileBottomNav — Sprint M0
 *
 * Barre de navigation fixe affichée UNIQUEMENT sur mobile (< 1024px).
 * 5 slots horizontaux : Accueil / Patients / Vérificateur (central, proéminent) /
 * Ordonnances / Plus (ouvre un bottom sheet vers les vues secondaires + IA).
 *
 * Desktop : la barre est masquée via `lg:hidden`, la sidebar prend le relais.
 *
 * Le composant ne contient AUCUNE logique métier — il appelle uniquement
 * onNavigate(viewId) et onAIChat() fournis par le parent.
 */

import { useEffect, useState } from 'react';
import {
  Home, Users, Shield, FileText, MoreHorizontal,
  Calendar, BarChart3, BookOpen, Folder, Settings, Sparkles, X,
} from 'lucide-react';
import type { ViewType } from './Sidebar';

interface MobileBottomNavProps {
  activeView: ViewType;
  onNavigate: (v: ViewType) => void;
  onAIChat: () => void;
}

// Vues secondaires accessibles via le bouton "Plus".
// Quand l'une d'elles est active, le bouton "Plus" doit s'illuminer.
const SECONDARY_VIEWS: ViewType[] = ['agenda', 'stats', 'encyclopedie', 'documents', 'settings'];

export function MobileBottomNav({ activeView, onNavigate, onAIChat }: MobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  // Lock scroll quand le bottom sheet "Plus" est ouvert
  useEffect(() => {
    if (moreOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [moreOpen]);

  const isMoreActive = SECONDARY_VIEWS.includes(activeView);

  const go = (v: ViewType) => {
    onNavigate(v);
    setMoreOpen(false);
  };

  return (
    <>
      {/* ── Bottom sheet "Plus" ───────────────────────────────────────── */}
      {moreOpen && (
        <div className="fixed inset-0 z-[55] lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl border-t border-[#E5E5E0] animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h3 className="text-base font-bold text-[#0A1628]">Plus</h3>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 text-[#94A3B8]" />
              </button>
            </div>
            <div className="px-3 pb-6 grid grid-cols-3 gap-2">
              <MoreItem icon={Calendar}   label="Agenda"       active={activeView === 'agenda'}       onClick={() => go('agenda')} />
              <MoreItem icon={BarChart3}  label="Statistiques" active={activeView === 'stats'}        onClick={() => go('stats')} />
              <MoreItem icon={BookOpen}   label="Encyclopédie" active={activeView === 'encyclopedie'} onClick={() => go('encyclopedie')} />
              <MoreItem icon={Folder}     label="Documents"    active={activeView === 'documents'}    onClick={() => go('documents')} />
              <MoreItem icon={Settings}   label="Paramètres"   active={activeView === 'settings'}     onClick={() => go('settings')} />
              <MoreItem icon={Sparkles}   label="Assistant IA" active={false}                         onClick={() => { onAIChat(); setMoreOpen(false); }} accent />
            </div>
            {/* Safe area iOS */}
            <div className="h-[env(safe-area-inset-bottom,0px)]" />
          </div>
        </div>
      )}

      {/* ── Bottom nav fixe ────────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 flex lg:hidden items-end justify-around bg-white border-t border-[#E5E5E0] shadow-[0_-2px_12px_rgba(10,22,40,0.06)] pt-1 pb-[max(env(safe-area-inset-bottom,0px),4px)]"
        aria-label="Navigation principale"
      >
        <NavItem icon={Home}     label="Accueil"     active={activeView === 'home'}        onClick={() => onNavigate('home')} />
        <NavItem icon={Users}    label="Patients"    active={activeView === 'patients'}    onClick={() => onNavigate('patients')} />
        {/* Central — Vérificateur, proéminent */}
        <CentralItem            label="Vérificateur" active={activeView === 'checker'}    onClick={() => onNavigate('checker')} />
        <NavItem icon={FileText} label="Ordonnances" active={activeView === 'ordonnances'} onClick={() => onNavigate('ordonnances')} />
        <NavItem icon={MoreHorizontal} label="Plus" active={isMoreActive || moreOpen} onClick={() => setMoreOpen(o => !o)} />
      </nav>
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

interface NavItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavItem({ icon: Icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 transition-colors ${
        active ? 'text-[#00A86B]' : 'text-[#475569]'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className="w-5 h-5" />
      <span className={`text-[10px] leading-tight ${active ? 'font-bold' : 'font-medium'}`}>
        {label}
      </span>
    </button>
  );
}

interface CentralItemProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function CentralItem({ label, active, onClick }: CentralItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center justify-end gap-0.5 py-1.5"
      aria-current={active ? 'page' : undefined}
    >
      {/* Cercle vert proéminent légèrement surélevé */}
      <div
        className={`w-12 h-12 -mt-5 rounded-full flex items-center justify-center shadow-lg shadow-[#00A86B]/30 ring-4 ring-white transition-transform ${
          active ? 'bg-[#006B47] scale-105' : 'bg-[#00A86B]'
        }`}
      >
        <Shield className="w-6 h-6 text-white" />
      </div>
      <span className={`text-[10px] leading-tight ${active ? 'font-bold text-[#00A86B]' : 'font-medium text-[#475569]'}`}>
        {label}
      </span>
    </button>
  );
}

interface MoreItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
  accent?: boolean; // Style spécial Assistant IA
}

function MoreItem({ icon: Icon, label, active, onClick, accent }: MoreItemProps) {
  const baseCls = active
    ? 'bg-[#E6F4EE] text-[#00A86B] border-[#00A86B]/30'
    : accent
      ? 'bg-[#0A1628] text-white border-[#0A1628] hover:bg-[#1A2B42]'
      : 'bg-[#FAFAF7] text-[#475569] border-[#E5E5E0] hover:border-[#00A86B] hover:text-[#00A86B]';
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 px-2 py-4 rounded-xl border transition-colors ${baseCls}`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs font-semibold text-center leading-tight">{label}</span>
    </button>
  );
}
