import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCw, Home } from 'lucide-react';

/**
 * ErrorBoundary — filet de sécurité anti « page blanche ».
 *
 * Un crash de rendu React (ex: ReferenceError dans un sous-composant) ne doit
 * jamais afficher une page totalement blanche à un médecin. Ce composant capture
 * l'erreur, la logge en console pour le debug, et affiche un écran propre en
 * français avec des actions de récupération.
 *
 * Doit rester un *class component* : seules les méthodes de cycle de vie
 * `getDerivedStateFromError` / `componentDidCatch` permettent de capturer les
 * erreurs de rendu des descendants (pas d'équivalent hook à ce jour).
 *
 * Usage :
 *   // Filet global (autour du Router)
 *   <ErrorBoundary><App /></ErrorBoundary>
 *
 *   // Filet par vue (la sidebar reste utilisable si une vue crashe)
 *   <ErrorBoundary fallbackTitle="Cette vue a rencontré un problème" resetKey={activeView}>
 *     ...contenu de la vue...
 *   </ErrorBoundary>
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  /** Titre personnalisé selon la zone (par défaut : « Une erreur est survenue »). */
  fallbackTitle?: string;
  /**
   * Quand cette valeur change, l'ErrorBoundary se réinitialise et retente
   * d'afficher ses enfants. Au niveau « par vue », on y passe `activeView` :
   * changer d'onglet répare automatiquement la zone de contenu, sans recharger
   * la page ni perdre la navigation.
   */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log complet réservé au debug — jamais exposé à l'utilisateur.
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Réinitialisation automatique au changement de vue : le médecin clique sur
    // un autre onglet → resetKey change → on efface l'erreur et on réaffiche.
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const title = this.props.fallbackTitle ?? 'Une erreur est survenue';

    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#FAFAF7] dark:bg-[#060D1A] font-sans">
        <div className="w-full max-w-md text-center bg-white dark:bg-[#111827] border border-[#E5E5E0] dark:border-white/[0.06] rounded-2xl shadow-sm p-6 sm:p-8">
          {/* Icône sobre */}
          <div className="mx-auto mb-5 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#FEF2F2] dark:bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 text-[#DC2626]" strokeWidth={1.75} />
          </div>

          <h1 className="text-lg sm:text-xl font-bold text-[#0A1628] dark:text-[#E2E8F0] tracking-tight">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#475569] dark:text-[#94A3B8]">
            Vos données sont en sécurité. Rechargez la page pour continuer.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <button
              onClick={this.handleReload}
              className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#00A86B] text-white shadow-sm shadow-[#00A86B]/20 hover:bg-[#006B47] active:bg-[#006B47] transition-colors"
            >
              <RotateCw className="w-4 h-4" />
              Recharger la page
            </button>
            <button
              onClick={this.handleHome}
              className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white dark:bg-transparent text-[#0A1628] dark:text-[#E2E8F0] border border-[#E5E5E0] dark:border-white/[0.1] hover:border-[#0A1628] dark:hover:border-white/30 active:bg-[#FAFAF7] transition-colors"
            >
              <Home className="w-4 h-4" />
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }
}
