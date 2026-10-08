// Sprint 4d-bis — Posologie : jamais de valeur inventée.
//
// Module pur (testé par posologie.test.ts).
//  • Aucune posologie pré-remplie par défaut : le champ est vide et OBLIGATOIRE
//    (pas d'aperçu, d'enregistrement, d'impression ni de PDF sans posologie).
//  • Pré-remplissage uniquement depuis des données réelles : posologie du traitement de
//    fond (renouvellement) ou dernière posologie utilisée par CE médecin pour CE médicament,
//    proposée comme suggestion modifiable.
//  • La forme (comprimé, sachet, gélule…) est déduite du nom quand c'est possible, jamais
//    forcée à « comprimé ».

export interface PosologieLine {
  id: string;
  nom: string;
  posologie?: string | null;
}

/** Lignes nommées sans posologie (les lignes sans nom sont déjà bloquées par ailleurs). */
export function linesMissingPosologie<L extends PosologieLine>(lines: L[]): L[] {
  return lines.filter(l => l.nom.trim() !== '' && !(l.posologie ?? '').trim());
}

/** Motif de blocage (aperçu / enregistrement / impression / PDF), ou null. */
export function posologieBlockMessage(lines: PosologieLine[]): string | null {
  const missing = linesMissingPosologie(lines);
  if (missing.length === 0) return null;
  const noms = missing.map(l => l.nom.trim()).join(', ');
  return missing.length === 1
    ? `Posologie manquante pour ${noms}.`
    : `Posologie manquante pour ${missing.length} médicaments : ${noms}.`;
}

// ─── Forme galénique déduite du nom ──────────────────────────────────────────

export interface FormeUnite { singulier: string; pluriel: string }

const norm = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

// Ordre significatif : formes les plus spécifiques d'abord.
const FORMES: Array<{ re: RegExp; unite: FormeUnite | null }> = [
  { re: /\bsachets?\b|sachet dose/, unite: { singulier: 'sachet', pluriel: 'sachets' } },
  { re: /\bgelules?\b|\bcapsules?\b|\bcaps\b/, unite: { singulier: 'gélule', pluriel: 'gélules' } },
  { re: /\bsuppositoires?\b|\bsupposito\b|\bsuppo\b/, unite: { singulier: 'suppositoire', pluriel: 'suppositoires' } },
  { re: /\bovules?\b/, unite: { singulier: 'ovule', pluriel: 'ovules' } },
  { re: /\bampoules?\b/, unite: { singulier: 'ampoule', pluriel: 'ampoules' } },
  { re: /\bpatchs?\b|dispositif transdermique/, unite: { singulier: 'patch', pluriel: 'patchs' } },
  { re: /\bcomprimes?\b|\bcp\b|\bcpr\b/, unite: { singulier: 'comprimé', pluriel: 'comprimés' } },
  // Formes sans unité comptable simple : aucune quantité calculée.
  { re: /sirop|buvable|suspension|solution|gouttes|collyre|creme|pommade|\bgel\b|emulgel|lotion|spray|inhal|aerosol|injectable|perfusion|poudre/, unite: null },
];

/**
 * Unité de prise déduite du nom (ou de la forme en base). `undefined` = forme inconnue,
 * `null` = forme reconnue mais sans unité comptable (sirop, crème…). Jamais « comprimé »
 * par défaut.
 */
export function deduceForme(nom: string, forme?: string | null): FormeUnite | null | undefined {
  const text = norm(`${forme ?? ''} ${nom}`);
  for (const f of FORMES) if (f.re.test(text)) return f.unite;
  return undefined;
}

/**
 * Quantité totale indicative, calculée UNIQUEMENT si tout est connu : nombre de prises
 * par jour, durée en jours et unité de prise. Sinon chaîne vide (à saisir par le médecin).
 */
export function computeQuantite(posologie: string, duree: string, unite: FormeUnite | null | undefined): string {
  if (!unite) return '';
  const p = norm(posologie);
  const d = norm(duree);
  const days = d.match(/(\d+)\s*(jour|j\b)/);
  const weeks = d.match(/(\d+)\s*semaine/);
  const months = d.match(/(\d+)\s*mois/);
  const nbDays = days ? Number(days[1]) : weeks ? Number(weeks[1]) * 7 : months ? Number(months[1]) * 30 : null;
  if (!nbDays) return '';
  const perTake = p.match(/^(\d+(?:[.,]\d+)?)\s/);
  const times = p.match(/(\d+)\s*(fois|x)\b/) ?? p.match(/\bx\s*(\d+)/);
  const perDay = times ? Number(times[1]) : /par jour|\/ ?j\b|le matin|le soir|au coucher/.test(p) ? 1 : null;
  if (!perDay) return '';
  const dose = perTake ? Number(perTake[1].replace(',', '.')) : 1;
  const total = Math.ceil(dose * perDay * nbDays);
  if (!Number.isFinite(total) || total <= 0) return '';
  return `${total} ${total > 1 ? unite.pluriel : unite.singulier}`;
}

// ─── Dernière posologie utilisée ─────────────────────────────────────────────

export interface PastLine {
  medicament_nom: string;
  posologie: string | null;
  duree: string | null;
  /** Date de l'ordonnance (ISO). */
  created_at: string;
}

export interface PosologieSuggestion {
  posologie: string;
  duree: string;
  date: string;
}

/**
 * Sprint 4d-ter — Date seuil des posologies FIABLES.
 *
 * Avant le Sprint 4d-bis (commit fbe5748, déployé le 08/10/2026 vers 03 h 40 UTC), chaque
 * ligne d'ordonnance recevait une posologie par défaut automatique (« 1 comprimé 2 fois
 * par jour · 7 jours »), y compris pour un sachet de Kardegic. Ces lignes ne reflètent pas
 * une décision du médecin : elles ne sont JAMAIS proposées comme « Dernière posologie
 * utilisée ». Seules les lignes créées à partir de ce seuil (marge incluse pour la fin du
 * déploiement) peuvent l'être. Aucune suggestion plutôt qu'une suggestion douteuse.
 */
export const POSOLOGIE_FIABLE_DEPUIS = '2026-10-08T04:00:00.000Z';

/** Clé de comparaison d'un nom de médicament (casse, accents et espaces ignorés). */
export function medKey(nom: string): string {
  return norm(nom);
}

/**
 * Dernière posologie réellement prescrite par ce médecin pour ce médicament (même nom),
 * ou null. Les lignes sans posologie et celles antérieures à POSOLOGIE_FIABLE_DEPUIS sont
 * ignorées ; la plus récente gagne.
 */
export function lastPosologieFor(
  nom: string, past: PastLine[], depuis: string = POSOLOGIE_FIABLE_DEPUIS,
): PosologieSuggestion | null {
  const key = medKey(nom);
  if (!key) return null;
  const seuil = Date.parse(depuis);
  let best: PastLine | null = null;
  for (const l of past) {
    if (medKey(l.medicament_nom) !== key || !(l.posologie ?? '').trim()) continue;
    // Ligne antérieure au seuil, ou sans date exploitable : jamais suggérée.
    const t = Date.parse(l.created_at);
    if (!Number.isFinite(t) || t < seuil) continue;
    if (!best || l.created_at > best.created_at) best = l;
  }
  return best ? { posologie: best.posologie!.trim(), duree: (best.duree ?? '').trim(), date: best.created_at } : null;
}
