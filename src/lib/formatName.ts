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

/** « M. » ou « Mme » selon le sexe du patient ; « M./Mme » seulement si le sexe est inconnu. */
export function civilite(sexe: string | null | undefined): 'M.' | 'Mme' | 'M./Mme' {
  const x = (sexe ?? '').trim().toLowerCase();
  if (x === 'm' || x === 'h' || x.startsWith('masc') || x.startsWith('homme')) return 'M.';
  if (x === 'f' || x.startsWith('fem') || x.startsWith('fém') || x.startsWith('femme')) return 'Mme';
  return 'M./Mme';
}
