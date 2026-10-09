/**
 * Formatage d'affichage des noms propres (médecin, patient) sur les documents imprimés.
 * Transformation à l'affichage uniquement — ne jamais réécrire la valeur en base.
 *
 *   formatNomPropre('el masmoudi ahlam') → 'El Masmoudi Ahlam'
 *   formatNomPropre('BEN ALI fatima')    → 'Ben Ali Fatima'
 *   formatNomPropre('ait-taleb')         → 'Ait-Taleb'
 *   formatNomPropre("o'neil")            → "O'Neil"
 *   formatNomPropre('Dr. karim')         → 'Dr. Karim'
 */
export function formatNomPropre(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .trim()
    .split(/\s+/)
    .map(word => {
      // Titre conservé tel quel
      if (/^dr\.?$/i.test(word)) return word.toLowerCase() === 'dr' ? 'Dr' : 'Dr.';
      // Majuscule initiale sur chaque segment, y compris après un tiret ou une apostrophe.
      // Les particules marocaines (el, ben, ait, ou…) suivent la même règle : El, Ben, Ait.
      return word
        .toLocaleLowerCase('fr-FR')
        .replace(/(^|[-'’])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase('fr-FR'));
    })
    .join(' ');
}

/**
 * Sprint 4d-quater — Nom du médecin, identique sur l'ordonnance, le certificat et à l'écran :
 * « Dr Prénom Nom » (sans point, noms formatés).
 */
export function formatDocteur(prenom: string | null | undefined, nom: string | null | undefined): string {
  const full = formatNomPropre(`${prenom ?? ''} ${nom ?? ''}`).replace(/^(?:Dr\.?|Docteur)\s+/i, '').trim();
  return full ? `Dr ${full}` : 'Dr';
}

/**
 * Nom du cabinet affiché : si le nom contient celui du médecin (« Cabinet Dr. karim EL AMRANI »),
 * la partie « Dr … » suit la même règle (« Cabinet Dr Karim El Amrani »). Sinon inchangé.
 */
export function formatCabinet(name: string | null | undefined): string {
  const n = (name ?? '').trim();
  const m = n.match(/^(.*?)(?:\bdr\.?|\bdocteur)\s+(.+)$/i);
  if (!m) return n;
  return `${m[1]}Dr ${formatNomPropre(m[2])}`.replace(/\s+/g, ' ').trim();
}

const nameTokens = (x: string | null | undefined): string[] =>
  (x ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

// Mots qui ne nomment personne : « Cabinet médical du Dr … ».
const CABINET_GENERIC = new Set(['cabinet', 'medical', 'dr', 'docteur', 'du', 'de', 'des', 'd', 'le', 'la', 'l']);

/**
 * Nom du cabinet à imprimer, ou '' s'il ne fait que répéter le nom du médecin : celui-ci
 * figure déjà dans l'en-tête (« Dr Prénom Nom ») et ne doit apparaître qu'UNE fois.
 * Comparaison sans casse, sans accents, sans « Dr » ni mots génériques :
 *   cabinetDistinct('Cabinet Dr Oussama AJMIL', 'Oussama', 'Ajmil') → ''
 *   cabinetDistinct('Cabinet du Docteur Ajmil', 'Oussama', 'Ajmil') → ''
 *   cabinetDistinct('Centre médical Al Amal', 'Oussama', 'Ajmil')   → 'Centre médical Al Amal'
 */
export function cabinetDistinct(
  orgName: string | null | undefined, prenom: string | null | undefined, nom: string | null | undefined,
): string {
  const label = formatCabinet(orgName);
  if (!label) return '';
  const doctor = new Set([...nameTokens(prenom), ...nameTokens(nom)]);
  const propres = nameTokens(label).filter(t => !CABINET_GENERIC.has(t));
  const repete = propres.length > 0 && propres.every(t => doctor.has(t));
  return repete ? '' : label;
}

/** « M. » ou « Mme » selon le sexe du patient ; « M./Mme » seulement si le sexe est inconnu. */
export function civilite(sexe: string | null | undefined): 'M.' | 'Mme' | 'M./Mme' {
  const x = (sexe ?? '').trim().toLowerCase();
  if (x === 'm' || x === 'h' || x.startsWith('masc') || x.startsWith('homme')) return 'M.';
  if (x === 'f' || x.startsWith('fem') || x.startsWith('fém') || x.startsWith('femme')) return 'Mme';
  return 'M./Mme';
}
