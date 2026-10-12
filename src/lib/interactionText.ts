// Sprint 2d — Texte lisible des interactions ANSM. Module PUR (testé par interactionText.test.ts).
//
// Constat : dans `ansm_regles.description`, le NIVEAU de l'interaction (« A prendre en compte »,
// « Précaution d'emploi », « Association DECONSEILLEE », « CONTRE-INDICATION », ou une combinaison
// « CI - ASDEC - APEC ») est inséré AU MILIEU de la phrase de risque :
//   « …voire de rupture A prendre en compte tendineuse (exceptionnelle)… »
// Le thésaurus ANSM est un tableau à deux colonnes (risque | niveau + conduite à tenir) : à l'import,
// les deux colonnes ont été aplaties ligne par ligne, et la première ligne de la colonne de droite
// (le niveau) s'est retrouvée dans la phrase de gauche.
//
// Correction À L'AFFICHAGE uniquement (la base n'est pas modifiée, la sévérité non plus) : le niveau
// est retiré de la phrase et redit à la fin (« Niveau ANSM : à prendre en compte »).
// Limite connue : quand les deux colonnes font plusieurs lignes, la suite de la conduite à tenir
// reste entremêlée ; seul un réimport du thésaurus peut la démêler (texteEntremele le signale).

const NIVEAUX: Array<{ re: RegExp; label: string }> = [
  { re: /CONTRE-INDICATION/, label: 'contre-indication' },
  { re: /Association DECONSEILLEE/, label: 'association déconseillée' },
  { re: /Précaution d'emploi/, label: 'précaution d’emploi' },
  { re: /A prendre en compte/, label: 'à prendre en compte' },
];
const SIGLES: Record<string, string> = { CI: 'contre-indication', ASDEC: 'association déconseillée', PE: 'précaution d’emploi', APEC: 'à prendre en compte' };
// Niveau combiné (« CI - ASDEC - APEC ») : d'abord, car il prime sur un niveau simple situé plus loin.
const COMBINE_RE = /(?<![A-Za-zÀ-ÿ])(?:CI|ASDEC|PE|APEC)(?: - (?:CI|ASDEC|PE|APEC))+(?![A-Za-zÀ-ÿ])/;

export interface TexteAnsm {
  /** Texte à afficher. */
  texte: string;
  /** Niveau ANSM lu dans le texte (« à prendre en compte »), ou null. */
  niveau: string | null;
  /** Le niveau était inséré au milieu d'une phrase : le texte affiché diffère de la base. */
  corrige: boolean;
}

function trouverNiveau(d: string): { index: number; longueur: number; label: string } | null {
  const c = COMBINE_RE.exec(d);
  if (c) return { index: c.index, longueur: c[0].length, label: `${c[0].split(' - ').map(s => SIGLES[s]).join(', ')} selon les cas` };
  let best: { index: number; longueur: number; label: string } | null = null;
  for (const n of NIVEAUX) {
    const m = n.re.exec(d);
    if (m && (best === null || m.index < best.index)) best = { index: m.index, longueur: m[0].length, label: n.label };
  }
  return best;
}

const finDePhrase = (s: string) => /[.!?:;]$/.test(s);
/** Début de phrase : majuscule suivie d'une minuscule (« Surveillance »), pas un sigle (« CYP2D6 »). */
const debutDePhrase = (s: string) => /^[A-ZÀ-Ý][a-zà-ÿ]/.test(s);

/**
 * Remet le niveau ANSM à sa place. Un niveau déjà placé entre deux phrases (ou en fin de texte après
 * un point) est laissé tel quel : le texte n'est alors pas modifié.
 */
export function texteAnsmLisible(description: string | null | undefined): TexteAnsm {
  const d = (description ?? '').replace(/\s+/g, ' ').trim();
  const n = trouverNiveau(d);
  if (!n) return { texte: d, niveau: null, corrige: false };
  const avant = d.slice(0, n.index).trimEnd();
  const apres = d.slice(n.index + n.longueur).trimStart();
  // Niveau en tête, ou après une phrase terminée : rien n'est coupé.
  if (!avant || finDePhrase(avant)) return { texte: d, niveau: n.label, corrige: false };
  // Niveau au milieu d'une phrase : la phrase est recousue.
  const corps = !apres ? `${avant}.`
    : debutDePhrase(apres) ? `${avant}. ${apres}`   // la colonne de droite commençait une phrase
    : `${avant} ${apres}`;                           // la phrase de gauche continuait
  const fin = finDePhrase(corps) ? corps : `${corps}.`;
  return { texte: `${fin} — Niveau ANSM : ${n.label}.`, niveau: n.label, corrige: true };
}

/**
 * Indice d'un texte dont les deux colonnes restent entremêlées APRÈS correction : un mot en minuscules
 * directement suivi d'un début de phrase sans ponctuation (« …de son métabolisme Surveillance clinique »).
 * Sert au rapport de diagnostic ; l'affichage ne s'en sert pas.
 */
export function texteEntremele(texteCorrige: string): boolean {
  const corps = texteCorrige.replace(/ — Niveau ANSM : .*$/, '');
  return /[a-zà-ÿ,] (?:Surveillance|Adaptation|Contrôle|Prendre|Utiliser|Si |En cas|Eviter|Éviter|Réduire|Tenir compte|Ne pas|Mesure|Dosage|Respecter|Débuter|Renforcer|Diminuer|Arrêter|Préférer|Chez |Avec |Avertir|Informer|Limiter)/.test(corps);
}
