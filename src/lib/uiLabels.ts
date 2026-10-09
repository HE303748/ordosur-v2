// Sprint 6A-bis — Petits libellés d'interface, purs et testés (uiLabels.test.ts).
// Aucun rapport avec la détection des alertes : ce module ne fait que mettre en forme.

/**
 * Champ de recherche patient du Vérificateur. Le champ est prérempli avec le patient
 * sélectionné : si une frappe arrive à la suite de ce texte (focus sans sélection, saisie
 * automatisée), elle ne doit JAMAIS s'y concaténer — « Walid IdrissiWalid » devient « Walid ».
 */
export function patientSearchInput(value: string, selectedLabel: string): string {
  if (selectedLabel && value.length > selectedLabel.length && value.startsWith(selectedLabel)) {
    return value.slice(selectedLabel.length).replace(/^\s+/, '');
  }
  return value;
}

export interface HomeAlertLike {
  medicament_a: string | null;
  medicament_b?: string | null;
  source?: string | null;
}

const propre = (v: string | null | undefined) => {
  const t = (v ?? '').trim();
  return t === '' || t.toLowerCase() === 'null' || t.toLowerCase() === 'undefined' ? '' : t;
};

const SOURCE_SUFFIXE: Record<string, string> = {
  allergie: 'allergie',
  antecedent: 'antécédent',
  renal: 'fonction rénale',
  grossesse: 'grossesse / allaitement',
};

/**
 * Libellé d'une ligne « Dernières alertes » (interaction_logs). Jamais de « null » :
 *   interaction ou doublon → « A + B » ; alerte « médicament × patient » (contre-indication,
 *   allergie, antécédent, fonction rénale, grossesse) → un seul médicament, suivi de sa nature.
 */
export function homeAlertLabel(a: HomeAlertLike): string {
  const ma = propre(a.medicament_a), mb = propre(a.medicament_b);
  const source = propre(a.source);
  const un = ma || mb || 'Médicament';
  const suffixe = SOURCE_SUFFIXE[source];
  if (suffixe) return `${un} — ${suffixe}`;
  const paire = ma && mb && ma !== mb;
  if (source === 'doublon') return paire ? `${ma} + ${mb} — doublon` : `${un} — doublon`;
  if (paire) return `${ma} + ${mb}${source === 'derogation' ? ' — dérogation' : ''}`;
  return `${un} — ${source === 'derogation' ? 'dérogation' : 'contre-indication'}`;
}
