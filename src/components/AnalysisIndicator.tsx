// Indicateur discret à côté du champ de recherche du Vérificateur : « Analyse… » pendant le
// calcul, puis une pastille du niveau du verdict. Affichage seul — il ne calcule rien : il
// reprend la sévérité du verdict déjà établi. Un clic fait défiler vers le verdict (le seul
// défilement vers le verdict est celui que le médecin demande).

export type IndicatorSeverity = 'safe' | 'conditional' | 'attention' | 'dangerous';

export type AnalysisIndicatorState =
  | { kind: 'hidden' }
  | { kind: 'running' }
  | { kind: 'failed' }
  | { kind: 'verdict'; severity: IndicatorSeverity; title: string };

/**
 * État de l'indicateur, calqué sur le panneau de résultats : rien sans patient ni médicament,
 * « Analyse… » tant qu'il n'y a pas de verdict, échec signalé, sinon le niveau du verdict.
 */
export function analysisIndicatorState(s: {
  hasPatient: boolean; medCount: number; failed: boolean;
  verdict: { severity: IndicatorSeverity; title: string } | null;
}): AnalysisIndicatorState {
  if (!s.hasPatient || s.medCount < 1) return { kind: 'hidden' };
  if (s.verdict) return { kind: 'verdict', severity: s.verdict.severity, title: s.verdict.title };
  return s.failed ? { kind: 'failed' } : { kind: 'running' };
}

/** Libellé court de la pastille (le titre complet reste dans le bandeau du verdict). */
export const INDICATOR_LABELS: Record<IndicatorSeverity, string> = {
  safe: 'Aucune interaction',
  conditional: 'Sous réserve',
  attention: 'Attention',
  dangerous: 'À risque',
};

const PILL: Record<IndicatorSeverity, { box: string; dot: string }> = {
  safe:        { box: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300', dot: 'bg-emerald-500' },
  conditional: { box: 'bg-slate-100 border-slate-300 text-[#0A1628] dark:bg-white/[0.06] dark:border-white/[0.15] dark:text-[#E2E8F0]', dot: 'bg-[#0A1628] dark:bg-slate-200' },
  attention:   { box: 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-200', dot: 'bg-amber-500' },
  dangerous:   { box: 'bg-red-50 border-[#DC2626]/40 text-[#DC2626] dark:bg-red-500/10 dark:border-red-500/40 dark:text-red-300', dot: 'bg-[#DC2626]' },
};

const BASE = 'inline-flex items-center gap-1.5 flex-shrink-0 rounded-full border px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap';

export function AnalysisIndicator({ state, onShowVerdict }: { state: AnalysisIndicatorState; onShowVerdict: () => void }) {
  if (state.kind === 'hidden') return null;
  if (state.kind === 'running') {
    return (
      <span role="status" aria-live="polite" className={`${BASE} border-slate-200 bg-slate-50 text-slate-600 dark:bg-white/[0.04] dark:border-white/[0.1] dark:text-[#94A3B8]`}>
        <span className="w-3 h-3 border-2 border-slate-300 border-t-[#00A86B] rounded-full animate-spin" aria-hidden />
        Analyse…
      </span>
    );
  }
  if (state.kind === 'failed') {
    return (
      <button type="button" onClick={onShowVerdict} title="Analyse impossible — voir le détail"
        className={`${BASE} bg-amber-50 border-amber-300 text-amber-900 hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition`}>
        <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden />
        Analyse impossible
      </button>
    );
  }
  const p = PILL[state.severity];
  return (
    <button type="button" onClick={onShowVerdict}
      title={`${state.title} — voir le verdict`}
      aria-label={`Verdict : ${state.title}. Afficher le verdict`}
      className={`${BASE} ${p.box} hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B] transition`}>
      <span className={`w-2 h-2 rounded-full ${p.dot}`} aria-hidden />
      {INDICATOR_LABELS[state.severity]}
    </button>
  );
}
