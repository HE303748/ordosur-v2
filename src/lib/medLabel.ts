// Sprint 4d-quater — Libellé d'un médicament : marque + dosage + forme, toujours.
//
// Module pur (testé par medLabel.test.ts).
//
// Deux sources coexistent dans les fiches 🇲🇦 :
//   • source principale (« propre ») : nom_commercial « BRUFEN 400 MG », forme « Comprimé enrobé » ;
//   • seconde source : nom_commercial « BRUFEN » SANS dosage, le dosage étant dans la colonne
//     `dosage` et dans la forme « COMPRIME ENROBE à 400 MG 1 BOITE 30 COMPRIME ».
// Avant ce sprint, la ligne d'ordonnance reprenait nom_commercial tel quel : « BRUFEN », sans
// dosage (≈ 30 % des spécialités 🇲🇦 commercialisées). Le libellé est désormais reconstruit.

export interface LabelMed {
  nom?: string | null;
  nom_commercial?: string | null;
  forme?: string | null;
  dosage?: string | null;
}

const UNIT = '(?:mg|g|ml|mcg|µg|ui|%)';
const DOSE_SRC = `\\d+(?:[.,]\\d+)?\\s*${UNIT}(?:\\s*\\/\\s*\\d*(?:[.,]\\d+)?\\s*${UNIT}?)*`;
const DOSE_RE = new RegExp(DOSE_SRC, 'i');
// « … à 400 MG 1 BOITE 30 COMPRIME » : dosage annoncé par « à » dans la forme (seconde source)
const FORME_DOSE_RE = new RegExp(`\\s[àa]\\s+(${DOSE_SRC})`, 'i');

const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

export function hasDosage(text: string | null | undefined): boolean {
  return DOSE_RE.test(text ?? '');
}

/** Fiche de la source principale : le nom commercial porte déjà le dosage. */
export function isCleanFiche(m: LabelMed): boolean {
  return hasDosage(m.nom_commercial);
}

/**
 * Dosage FIABLE du médicament, ou null.
 * Sources admises : le nom commercial (« BRUFEN 400 MG ») puis la mention explicite de la
 * forme (« COMPRIME ENROBE à 400 MG … »).
 *
 * ⚠️ La colonne `dosage` n'est JAMAIS utilisée : dans la seconde source elle est souvent
 * fausse (« GLUCOPHAGE 500 » → « 1000 MG », gélules d'AMOXIL → « 24 G » = taille de la boîte,
 * suspension à 2 % → « 150 ML » = volume du flacon). Imprimer un dosage faux serait pire que
 * de ne pas en imprimer : dans ce cas la ligne est signalée « Dosage à préciser ».
 */
export function extractDosage(m: LabelMed): string | null {
  const inName = clean(m.nom_commercial || m.nom).match(DOSE_RE)?.[0];
  if (inName) return clean(inName);
  const inForme = clean(m.forme).match(FORME_DOSE_RE)?.[1];
  if (inForme) return clean(inForme).toUpperCase();
  return null;
}

// Forme reconnue quand il ne reste que le conditionnement (« 1 BOITE 24 GELULE »).
const FORME_MOTS: Array<[RegExp, string]> = [
  [/GELULE/i, 'Gélule'], [/SACHET/i, 'Sachet'], [/SUPPOSITO/i, 'Suppositoire'], [/COMPRIME/i, 'Comprimé'],
];

/** Forme lisible : « COMPRIME ENROBE à 400 MG 1 BOITE 30 COMPRIME » → « Comprimé enrobé ». */
export function cleanForme(forme: string | null | undefined): string {
  const full = clean(forme);
  // Coupe au dosage (« à 400 MG ») ou au conditionnement (« 1 BOITE 30 … », « 1 FLACON 150 ML »).
  const head = full.split(/\s[àa]\s+\d|(?:^|\s)\d+\s+(?:BOITE|FLACON|TUBE|AMPOULE)S?\b/i)[0].trim();
  if (!head || /^[A-Z%]{1,3}$/.test(head)) {
    return FORME_MOTS.find(([re]) => re.test(full))?.[1] ?? '';
  }
  // Seule la seconde source est en capitales : on rend la casse et les accents usuels.
  if (head !== head.toUpperCase()) return head;
  const lower = head.toLowerCase()
    .replace(/\bcomprime\b/g, 'comprimé').replace(/\bcomprimes\b/g, 'comprimés')
    .replace(/\benrobe\b/g, 'enrobé').replace(/\bpellicule\b/g, 'pelliculé')
    .replace(/\bsecable\b/g, 'sécable').replace(/\bgelule\b/g, 'gélule')
    .replace(/\bcreme\b/g, 'crème').replace(/\bliberation prolongee\b/g, 'libération prolongée')
    .replace(/\bgastro-resistant\b/g, 'gastro-résistant');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

const normCmp = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Libellé complet : « BRUFEN 400 MG, Comprimé enrobé ». Identique pour les deux sources.
 * Le dosage et la forme ne sont ajoutés que s'ils ne figurent pas déjà dans le nom.
 */
export function medLabel(m: LabelMed): string {
  const brand = clean(m.nom_commercial) || clean(m.nom);
  if (!brand) return '';
  let label = brand;
  if (!hasDosage(brand)) {
    const dose = extractDosage(m);
    if (dose) {
      // « GLUCOPHAGE 1000 » + « 1000 MG » → « GLUCOPHAGE 1000 MG » (pas de nombre répété).
      const bare = brand.match(/(\d+(?:[.,]\d+)?)$/)?.[1];
      const m2 = dose.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
      label = bare && m2 && bare.replace(',', '.') === m2[1].replace(',', '.')
        ? `${brand} ${m2[2]}`.trim()
        : `${brand} ${dose}`;
    }
  }
  const forme = cleanForme(m.forme);
  if (forme && !normCmp(label).includes(normCmp(forme))) label = `${label}, ${forme}`;
  return label;
}

/** Le dosage n'existe nulle part dans la fiche : « Dosage à préciser » par le médecin. */
export function dosageManquant(m: LabelMed): boolean {
  return extractDosage(m) === null;
}

/** Libellé final d'une ligne d'ordonnance (nom + dosage précisé par le médecin le cas échéant). */
export function ligneLabel(l: { nom: string; dosagePrecise?: string | null }): string {
  const d = clean(l.dosagePrecise);
  return d ? `${clean(l.nom)} — ${d}` : clean(l.nom);
}

/** Lignes signalées « Dosage à préciser » que le médecin n'a pas encore complétées. */
export function linesMissingDosage<L extends { nom: string; dosageAPreciser?: boolean; dosagePrecise?: string | null }>(lines: L[]): L[] {
  return lines.filter(l => l.dosageAPreciser && !clean(l.dosagePrecise) && !hasDosage(l.nom));
}

export function dosageBlockMessage(lines: Array<{ nom: string; dosageAPreciser?: boolean; dosagePrecise?: string | null }>): string | null {
  const missing = linesMissingDosage(lines);
  if (missing.length === 0) return null;
  return `Dosage à préciser pour ${missing.map(l => clean(l.nom)).join(', ')}.`;
}
