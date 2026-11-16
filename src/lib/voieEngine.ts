// Sprint MOTEUR-3 — voie d'administration : quelle contre-indication vaut pour quelle forme.
//
// Module pur (aucun accès réseau). Trois règles, dans cet ordre :
//   1. règle « stricte » (lue dans le RCP d'une forme locale, lot MOTEUR-3) : elle ne vaut QUE pour une fiche de cette voie ;
//   2. fiche filtrée (action locale ET RCP de sa voie lu) : elle ne reçoit que les allergies et les règles de sa voie ;
//   3. sinon — fiche systémique, voie inconnue, forme locale dont le RCP n'a pas été lu : toutes les règles, comme avant.
// Une erreur vers « systémique » fait du bruit ; une erreur vers « locale » retire des alertes : dans le doute, rien n'est retiré.

/** Voie et portée d'une fiche (colonnes medicaments.voie_administration / voie_portee / voie_rcp_lu). */
export interface FicheVoie {
  voie: string | null;
  portee: string | null;
  rcpLu: boolean;
}

/** Ce que le filtre lit d'une ligne de `contraindications`. */
export interface RegleVoie {
  /** « generale », une voie locale, « generale,cutanee »… ou null (règle sans RCP). */
  voie?: string | null;
  voie_stricte?: boolean | null;
  condition_type: string;
}

const voiesDe = (regle: RegleVoie): string[] =>
  (regle.voie ?? '').split(',').map(v => v.trim()).filter(Boolean);

/** La fiche est une forme à action locale dont le RCP de la voie a été lu : le filtre s'applique. */
export function ficheFiltree(fiche: FicheVoie | null | undefined): boolean {
  return !!fiche && fiche.portee === 'locale' && fiche.rcpLu === true && !!fiche.voie;
}

/** La règle s'applique-t-elle à cette fiche ? Fiche inconnue (médicament saisi à la main, lecture échouée) = systémique. */
export function regleApplicable(regle: RegleVoie, fiche: FicheVoie | null | undefined): boolean {
  const voies = voiesDe(regle);
  if (regle.voie_stricte) return !!fiche?.voie && voies.includes(fiche.voie);
  if (!ficheFiltree(fiche)) return true;
  if (regle.condition_type === 'allergie_med' || regle.condition_type === 'allergie_alim') return true;
  return voies.includes(fiche!.voie!);
}

const LIBELLES: Record<string, string> = {
  cutanee: 'cutanée', ophtalmique: 'ophtalmique', auriculaire: 'auriculaire', nasale: 'nasale',
  inhalee: 'inhalée', vaginale: 'vaginale', buccale: 'buccale',
};

/** « forme cutanée », « forme ophtalmique »… pour l'affichage ; chaîne vide si la fiche n'est pas filtrée. */
export function libelleFormeLocale(fiche: FicheVoie | null | undefined): string {
  return ficheFiltree(fiche) ? `forme ${LIBELLES[fiche!.voie!] ?? fiche!.voie}` : '';
}
