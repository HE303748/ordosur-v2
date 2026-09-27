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
