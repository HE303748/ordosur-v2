// Sprint P — Chargement à la demande des vues et des librairies lourdes (jsPDF, Recharts,
// SheetJS). Le bundle initial ne contient plus que l'Accueil, les Patients, le Vérificateur
// et les Ordonnances ; le reste arrive au premier usage, préchargé au survol du menu.

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const RELOAD_FLAG = 'ordosur:chunk-reload';

/**
 * Après un déploiement, les anciens fichiers n'existent plus : un chargement à la demande
 * peut échouer. La page est alors rechargée UNE fois (nouvelle version), jamais en boucle.
 */
function withRetry<T>(loader: () => Promise<T>): () => Promise<T> {
  return () => loader().then(
    m => { try { window.sessionStorage.removeItem(RELOAD_FLAG); } catch { /* ignore */ } return m; },
    err => {
      try {
        if (!window.sessionStorage.getItem(RELOAD_FLAG)) {
          window.sessionStorage.setItem(RELOAD_FLAG, '1');
          window.location.reload();
          return new Promise<T>(() => {}); // la page se recharge
        }
      } catch { /* ignore */ }
      throw err;
    },
  );
}

const loaders = {
  agenda: withRetry(() => import('../components/ui/AgendaView')),
  documents: withRetry(() => import('../components/ui/DocumentsView')),
  encyclopedie: withRetry(() => import('../components/ui/EncyclopedieView')),
  stats: withRetry(() => import('../components/DoctorAnalytics')),
  aiChat: withRetry(() => import('../components/ui/AIChat')),
  patientImport: withRetry(() => import('../components/PatientImportModal')),
  examRequest: withRetry(() => import('../components/exams/ExamRequestModal')),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;
const pick = <M, K extends keyof M>(loader: () => Promise<M>, name: K) =>
  lazy(() => loader().then(m => ({ default: m[name] as unknown as AnyComponent }))) as LazyExoticComponent<M[K] extends AnyComponent ? M[K] : never>;

export const AgendaView = pick(loaders.agenda, 'AgendaView');
export const DocumentsView = pick(loaders.documents, 'DocumentsView');
export const EncyclopedieView = pick(loaders.encyclopedie, 'EncyclopedieView');
export const AIChat = pick(loaders.aiChat, 'AIChat');
export const PatientImportModal = pick(loaders.patientImport, 'PatientImportModal');
export const ExamRequestModal = pick(loaders.examRequest, 'ExamRequestModal');
export const MonthlyInteractionsChart = pick(loaders.stats, 'MonthlyInteractionsChart');
export const RiskDistributionChart = pick(loaders.stats, 'RiskDistributionChart');
export const TopMedicationsSection = pick(loaders.stats, 'TopMedicationsSection');
export const RecentActivityTimeline = pick(loaders.stats, 'RecentActivityTimeline');
export const AllMedicationsHistory = pick(loaders.stats, 'AllMedicationsHistory');

/** Précharge le code d'une vue (survol ou focus du menu) : le clic l'affiche sans attente. */
export function preloadView(view: string): void {
  const l = (loaders as Record<string, (() => Promise<unknown>) | undefined>)[view];
  if (l) void l().catch(() => { /* le clic réessaiera */ });
}

/** Précharge les vues les plus probables quand le navigateur est au repos. */
export function preloadLikelyViews(): void {
  const run = () => { preloadView('agenda'); preloadView('documents'); preloadView('examRequest'); };
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 4000 });
  else window.setTimeout(run, 2500);
}

/** Squelette affiché immédiatement pendant le chargement d'une vue. */
export function ViewSkeleton({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="p-4 lg:p-6 max-w-5xl" role="status" aria-busy="true" aria-label={label}>
      <div className="h-6 w-56 rounded-lg bg-slate-200/80 dark:bg-white/[0.06] animate-pulse" />
      <div className="h-4 w-80 max-w-full mt-2 rounded-lg bg-slate-200/60 dark:bg-white/[0.04] animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-white/[0.06] animate-pulse" />
        ))}
      </div>
    </div>
  );
}
