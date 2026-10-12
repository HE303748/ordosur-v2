// Sprint 7 — Lettre d'adressage : vocabulaire, accords, destinataire, texte riche, validation et
// règles de suivi. Module PUR et LÉGER (ni React, ni Supabase, ni référentiel embarqué) : chargé avec
// le profil patient et l'Accueil. La génération du texte, qui embarque les classes thérapeutiques,
// vit dans lib/lettreAdressage (chargé avec la modale). Testé par lettreAdressage.test.ts.

import { formatNomPropre, civilite } from './formatName';

// ─── Spécialités destinataires ───────────────────────────────────────────────

/** `specialiste` : « À l'attention de Monsieur ou Madame le [spécialiste] ». */
export const SPECIALITES_ADRESSAGE: ReadonlyArray<{ label: string; specialiste: string }> = [
  { label: 'Cardiologie', specialiste: 'cardiologue' },
  { label: 'Endocrinologie-diabétologie', specialiste: 'endocrinologue-diabétologue' },
  { label: 'Néphrologie', specialiste: 'néphrologue' },
  { label: 'Gastro-entérologie et hépatologie', specialiste: 'gastro-entérologue' },
  { label: 'Pneumologie', specialiste: 'pneumologue' },
  { label: 'Neurologie', specialiste: 'neurologue' },
  { label: 'Dermatologie', specialiste: 'dermatologue' },
  { label: 'Ophtalmologie', specialiste: 'ophtalmologue' },
  { label: 'ORL', specialiste: 'médecin ORL' },
  { label: 'Gynécologie-obstétrique', specialiste: 'gynécologue-obstétricien' },
  { label: 'Urologie', specialiste: 'urologue' },
  { label: 'Rhumatologie', specialiste: 'rhumatologue' },
  { label: 'Psychiatrie', specialiste: 'psychiatre' },
  { label: 'Médecine interne', specialiste: 'médecin interniste' },
  { label: 'Chirurgie générale et viscérale', specialiste: 'chirurgien viscéral' },
  { label: 'Chirurgie orthopédique', specialiste: 'chirurgien orthopédiste' },
  { label: 'Oncologie', specialiste: 'oncologue' },
  { label: 'Hématologie', specialiste: 'hématologue' },
  { label: 'Pédiatrie', specialiste: 'pédiatre' },
  { label: 'Gériatrie', specialiste: 'gériatre' },
  { label: 'Radiologie', specialiste: 'radiologue' },
  { label: 'Médecine physique et réadaptation', specialiste: 'médecin de médecine physique et de réadaptation' },
  { label: 'Autre', specialiste: 'médecin spécialiste' },
];

export const MOTIFS_COURANTS = ['Complément de prise en charge', 'Avis spécialisé'] as const;

export type Urgence = 'urgent' | 'rapide' | 'programme';
export const URGENCES: ReadonlyArray<{ id: Urgence; label: string; mention: string | null }> = [
  { id: 'programme', label: 'Programmé', mention: null },
  { id: 'rapide', label: 'Rapide', mention: 'Avis souhaité rapidement' },
  { id: 'urgent', label: 'Urgent', mention: 'URGENT' },
];
/** Mention imprimée sous l'objet (« URGENT »), ou null. */
export const mentionUrgence = (u: Urgence | null | undefined): string | null => URGENCES.find(x => x.id === u)?.mention ?? null;

// ─── Outils de texte ─────────────────────────────────────────────────────────

export const norm = (s: string | null | undefined): string =>
  (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

export const propre = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

/** « Stéatose hépatique » → « stéatose hépatique » ; un sigle en tête (« BPCO », « HTA ») est conservé. */
export function minuscule(s: string): string {
  const t = propre(s);
  if (!t) return '';
  const premier = t.split(/[\s-]/)[0];
  if (premier.length >= 2 && premier === premier.toLocaleUpperCase('fr-FR') && /\p{Lu}/u.test(premier)) return t;
  return t.charAt(0).toLocaleLowerCase('fr-FR') + t.slice(1);
}

export const sansPointFinal = (s: string): string => propre(s).replace(/[.\s]+$/u, '');
export const majuscule = (s: string): string => (s ? s.charAt(0).toLocaleUpperCase('fr-FR') + s.slice(1) : s);

/** Phrase terminée par une ponctuation forte (« ? » et « ! » sont conservés). */
export function phrase(s: string): string {
  const t = propre(s);
  if (!t) return '';
  return /[.?!…]$/u.test(t) ? t : `${t}.`;
}

/** « a, b et c » */
export function enumerer(items: string[]): string {
  const l = items.filter(Boolean);
  if (l.length <= 1) return l[0] ?? '';
  return `${l.slice(0, -1).join(', ')} et ${l[l.length - 1]}`;
}

export const dateFr = (iso: string | null | undefined): string => {
  const m = (iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

// ─── Accords ─────────────────────────────────────────────────────────────────

export type SexeLettre = 'M' | 'F' | null;

export function sexeLettre(sexe: string | null | undefined): SexeLettre {
  const c = civilite(sexe);
  return c === 'M.' ? 'M' : c === 'Mme' ? 'F' : null;
}

/** Accord selon le sexe ; sexe inconnu → forme « (e) » (jamais de sexe supposé). */
export function accord(sexe: SexeLettre, masculin: string, feminin: string, inconnu: string): string {
  return sexe === 'M' ? masculin : sexe === 'F' ? feminin : inconnu;
}

/** « 27 ans », « 8 mois », ou null si la date de naissance est absente ou invalide. */
export function ageLettre(dateNaissance: string | null | undefined, today: Date): string | null {
  const m = (dateNaissance ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
  const mois = (today.getFullYear() - y) * 12 + (today.getMonth() - mo) - (today.getDate() < d ? 1 : 0);
  if (mois < 0 || y < 1900) return null;
  if (mois < 24) return mois <= 1 ? '1 mois' : `${mois} mois`;
  const ans = Math.floor(mois / 12);
  return `${ans} ans`;
}

/** « M. Karim Alaoui » (« M./Mme » si le sexe est inconnu). */
export function nomPatient(p: { prenom: string; nom: string; sexe?: string | null }): string {
  const nom = `${formatNomPropre(p.prenom)} ${formatNomPropre(p.nom)}`.trim();
  return `${civilite(p.sexe)} ${nom || '—'}`;
}

/** Ligne imprimée et figée : « M. Karim Alaoui — 27 ans ». */
export function patientLigne(p: { prenom: string; nom: string; sexe?: string | null; date_naissance?: string | null }, today: Date): string {
  const age = ageLettre(p.date_naissance, today);
  return `${nomPatient(p)}${age ? ` — ${age}` : ''}`;
}

// ─── Destinataire ────────────────────────────────────────────────────────────

export interface ConfrereLettre {
  titre?: 'Dr' | 'Pr' | null;
  civilite?: 'M' | 'Mme' | null;
  nom: string;
  prenom?: string | null;
  specialite?: string | null;
}

/**
 * Formule d'ouverture : « Cher confrère, » / « Chère consœur, » si le confrère est connu (accord
 * d'après la civilité SAISIE, jamais devinée d'après le prénom), sinon « Chers collègues, ».
 */
export function formuleOuverture(confrere: ConfrereLettre | null | undefined): string {
  if (!confrere || !propre(confrere.nom)) return 'Chers collègues,';
  if (confrere.civilite === 'M') return 'Cher confrère,';
  if (confrere.civilite === 'Mme') return 'Chère consœur,';
  return 'Chère consœur, cher confrère,';
}

export function nomConfrere(c: ConfrereLettre): string {
  return `${c.titre === 'Pr' ? 'Pr' : 'Dr'} ${formatNomPropre(`${c.prenom ?? ''} ${c.nom}`)}`.trim();
}

const specialisteDe = (specialite: string): string =>
  SPECIALITES_ADRESSAGE.find(s => norm(s.label) === norm(specialite))?.specialiste ?? 'médecin spécialiste';

/**
 * « À l'attention du Dr Salma Bennani, cardiologie » — confrère du carnet ;
 * « À l'attention de : Service de cardiologie, CHU Ibn Rochd » — destinataire saisi librement ;
 * « À l'attention de Monsieur ou Madame le cardiologue » — spécialité seule.
 */
export function destinataireLigne(d: { confrere?: ConfrereLettre | null; specialite: string; libre?: string | null }): string {
  const spe = propre(d.specialite);
  if (d.confrere && propre(d.confrere.nom)) {
    const s = propre(d.confrere.specialite) || spe;
    return `À l'attention du ${nomConfrere(d.confrere)}${s && norm(s) !== 'autre' ? `, ${minuscule(s)}` : ''}`;
  }
  const libre = propre(d.libre);
  if (libre) return `À l'attention de : ${libre}`;
  return `À l'attention de Monsieur ou Madame le ${specialisteDe(spe)}`;
}

export const objetLettre = (motif: string): string => `Objet : Adressage — ${sansPointFinal(motif)}`;

// ─── Pathologies ─────────────────────────────────────────────────────────────

export interface LettrePathologie { nom: string; depuisAnnee?: number | null }

type GroupePathologie = 'diabete' | 'hta' | null;
interface Adjectif { formes: string[]; m: string; f: string; inconnu: string; groupe: GroupePathologie }

// Formes EXACTES uniquement (après normalisation) : « Diabète insipide », « Hypertension portale »,
// « Asthme sévère » ou « IRC stade 4 » gardent leur libellé (« suivi pour … »), sans perte d'information.
const ADJECTIFS: Adjectif[] = [
  { formes: ['diabete', 'diabete sucre'], m: 'diabétique', f: 'diabétique', inconnu: 'diabétique', groupe: 'diabete' },
  { formes: ['diabete de type 1', 'diabete type 1', 'diabete de type i', 'dt1'], m: 'diabétique de type 1', f: 'diabétique de type 1', inconnu: 'diabétique de type 1', groupe: 'diabete' },
  { formes: ['diabete de type 2', 'diabete type 2', 'diabete de type ii', 'dt2'], m: 'diabétique de type 2', f: 'diabétique de type 2', inconnu: 'diabétique de type 2', groupe: 'diabete' },
  { formes: ['hta', 'hypertension', 'hypertension arterielle', 'hypertension arterielle essentielle'], m: 'hypertendu', f: 'hypertendue', inconnu: 'hypertendu(e)', groupe: 'hta' },
  { formes: ['asthme'], m: 'asthmatique', f: 'asthmatique', inconnu: 'asthmatique', groupe: null },
  { formes: ['insuffisance renale chronique', 'irc', 'maladie renale chronique'], m: 'insuffisant rénal chronique', f: 'insuffisante rénale chronique', inconnu: 'insuffisant(e) rénal(e) chronique', groupe: null },
  { formes: ['coronaropathie', 'cardiopathie ischemique', 'insuffisance coronaire', 'insuffisance coronarienne', 'maladie coronaire', 'maladie coronarienne', 'angor'], m: 'coronarien', f: 'coronarienne', inconnu: 'coronarien(ne)', groupe: null },
  { formes: ['epilepsie'], m: 'épileptique', f: 'épileptique', inconnu: 'épileptique', groupe: null },
];

export const adjectifDe = (nom: string): Adjectif | null => {
  const n = norm(nom);
  return ADJECTIFS.find(a => a.formes.includes(n)) ?? null;
};

/** « depuis 2 ans », « depuis 1 an », « depuis cette année » ; '' si l'année est inconnue ou invalide. */
export function dureeDepuis(annee: number | null | undefined, today: Date): string {
  if (typeof annee !== 'number' || !Number.isInteger(annee) || annee < 1900) return '';
  const n = today.getFullYear() - annee;
  if (n < 0) return '';
  if (n === 0) return 'depuis cette année';
  return `depuis ${n} an${n > 1 ? 's' : ''}`;
}

export const anneeValide = (annee: number | null | undefined, today: Date): annee is number =>
  typeof annee === 'number' && Number.isInteger(annee) && annee >= 1900 && annee <= today.getFullYear();

// ─── Traitements ─────────────────────────────────────────────────────────────

export interface LettreTraitement {
  /** Nom affiché (« Glucophage 850 mg »). */
  nom: string;
  posologie?: string | null;
  /** Données de la fiche du médicament, quand il vient de la base : servent à reconnaître sa classe. */
  dci?: string | null;
  dci_canonique?: string | null;
  nomBase?: string | null;
}

export type ModeTraitements = 'detaille' | 'classes';

// ─── Sections facultatives ───────────────────────────────────────────────────

export interface LettreAntecedent {
  libelle: string;
  /** 'toxique' → « Habitudes et toxiques ». */
  categorie?: string | null;
  debutAnnee?: number | null;
  finAnnee?: number | null;
  enCours?: boolean | null;
  /** Détails structurés déjà mis en forme (« Sevré en 2020 · 15 PA »). */
  details?: string | null;
}

export interface LettreBilan { label: string; valeur: string; date: string }
export interface LettreExamenAttente { libelle: string; dateDemande: string }

/** « cholécystectomie (en 2015) », « tabagisme (depuis 2010, actif, 10 PA) ». */
export function antecedentTexte(a: LettreAntecedent, today: Date): string {
  const d = anneeValide(a.debutAnnee, today) ? a.debutAnnee : null;
  const f = anneeValide(a.finAnnee, today) ? a.finAnnee : null;
  let periode = '';
  if (d !== null && f !== null) periode = d === f ? `en ${d}` : `${d}-${f}`;
  else if (d !== null) periode = a.enCours === true ? `depuis ${d}` : `en ${d}`;
  else if (f !== null) periode = `jusqu'en ${f}`;
  const details = propre(a.details).split(/\s*·\s*/).filter(Boolean).map(x => minuscule(x)).join(', ');
  // « jusqu'en 2020, sevré en 2020 » : l'année déjà dite par les détails n'est pas répétée.
  if (d === null && f !== null && details.includes(String(f))) periode = '';
  const precisions = [periode, details].filter(Boolean).join(', ');
  return `${minuscule(a.libelle)}${precisions ? ` (${precisions})` : ''}`;
}

/** « Patiente enceinte, terme de 24 SA. Allaitement en cours. » — '' si rien n'est déclaré de pertinent. */
export function grossesseTexte(g: { statut: 'enceinte' | 'non_enceinte' | 'inconnu'; sa: number | null; allaitement: boolean | null } | null | undefined): string {
  if (!g) return '';
  const out: string[] = [];
  if (g.statut === 'enceinte') out.push(g.sa !== null ? `Patiente enceinte, terme de ${g.sa} SA.` : 'Patiente enceinte.');
  if (g.allaitement === true) out.push('Allaitement en cours.');
  return out.join(' ');
}

// ─── Texte riche simple : paragraphes + gras ─────────────────────────────────
// Format enregistré (contenu_final) : paragraphes séparés par une ligne vide, retour à la ligne
// simple à l'intérieur d'un paragraphe, gras entre « ** ». Rien d'autre.

export interface Run { text: string; bold: boolean }

/** Paragraphes vides retirés, espaces superflus retirés : deux textes équivalents sont égaux. */
export function normaliserMarkup(markup: string | null | undefined): string {
  return (markup ?? '').replace(/\r\n?/g, '\n').split(/\n[ \t]*\n+/)
    .map(p => p.split('\n').map(l => l.replace(/[ \t\xa0]+/g, ' ').trim()).filter(Boolean).join('\n'))
    .filter(p => p.replace(/\*/g, '').trim()).join('\n\n');
}

/** Paragraphes → segments (gras ou non). */
export function parseMarkup(markup: string | null | undefined): Run[][] {
  const texte = normaliserMarkup(markup);
  if (!texte) return [];
  return texte.split('\n\n').map(p => {
    const runs: Run[] = [];
    let i = 0;
    const re = /\*\*([\s\S]+?)\*\*/g;
    for (let m = re.exec(p); m; m = re.exec(p)) {
      if (m.index > i) runs.push({ text: p.slice(i, m.index), bold: false });
      runs.push({ text: m[1], bold: true });
      i = m.index + m[0].length;
    }
    if (i < p.length) runs.push({ text: p.slice(i), bold: false });
    return runs.filter(r => r.text);
  });
}

/** Texte brut (sans marques de gras) — recherche, partage en texte, contrôles. */
export function markupToPlain(markup: string | null | undefined): string {
  return parseMarkup(markup).map(p => p.map(r => r.text).join('')).join('\n\n');
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** HTML de la zone de texte : <p>, <strong>, <br> — rien d'autre, texte toujours échappé. */
export function markupToHtml(markup: string | null | undefined): string {
  const paragraphes = parseMarkup(markup);
  if (paragraphes.length === 0) return '<p><br></p>';
  return paragraphes.map(p => `<p>${p.map(r => {
    const t = escapeHtml(r.text).replace(/\n/g, '<br>');
    return r.bold ? `<strong>${t}</strong>` : t;
  }).join('')}</p>`).join('');
}

const ENTITES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decodeEntites = (s: string) => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (tout, e: string) => {
  if (e[0] === '#') {
    const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : tout;
  }
  return ENTITES[e.toLowerCase()] ?? tout;
});

const BLOCS = new Set(['p', 'div', 'li', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'tr', 'table']);
const GRAS_STYLE = /font-weight\s*:\s*(bold|bolder|[6-9]00)/i;
const NORMAL_STYLE = /font-weight\s*:\s*(normal|[1-4]00)/i;

/**
 * HTML de la zone modifiable (quel que soit le navigateur : <div>, <p>, <br>, <b>, <strong>,
 * <span style="font-weight">) → format enregistré. Toute autre balise est ignorée, son texte gardé.
 */
export function htmlToMarkup(html: string | null | undefined): string {
  const paragraphes: Run[][] = [[]];
  const pile: Array<{ tag: string; bold: boolean }> = [];
  const gras = () => (pile.length ? pile[pile.length - 1].bold : false);
  const courant = () => paragraphes[paragraphes.length - 1];
  const nouveau = () => { if (courant().length > 0) paragraphes.push([]); };
  const ajoute = (text: string) => {
    if (!text) return;
    const p = courant(), dernier = p[p.length - 1];
    if (dernier && dernier.bold === gras()) dernier.text += text; else p.push({ text, bold: gras() });
  };

  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|([^<]+)|</g;
  const src = (html ?? '').replace(/\r\n?/g, '\n');
  for (let m = re.exec(src); m; m = re.exec(src)) {
    if (m[4] !== undefined) { ajoute(decodeEntites(m[4]).replace(/\n/g, ' ')); continue; }
    if (!m[2]) { if (m[0] === '<') ajoute('<'); continue; }
    const tag = m[2].toLowerCase();
    const ferme = m[1] === '/';
    if (tag === 'br') { ajoute('\n'); continue; }
    if (BLOCS.has(tag)) nouveau();
    if (ferme) {
      const i = pile.map(x => x.tag).lastIndexOf(tag);
      if (i >= 0) pile.length = i;
    } else if (!/\/\s*$/.test(m[3]) && !['img', 'hr', 'input', 'meta', 'link'].includes(tag)) {
      const style = m[3];
      const bold = NORMAL_STYLE.test(style) ? false : (tag === 'b' || tag === 'strong' || GRAS_STYLE.test(style) || gras());
      pile.push({ tag, bold });
    }
  }

  const out = paragraphes.map(p => p.map(r => {
    if (!r.bold) return r.text.replace(/\*\*/g, '');
    // Le gras ne porte jamais sur les espaces ni les retours à la ligne de bord.
    const m = r.text.replace(/\*\*/g, '').match(/^(\s*)([\s\S]*?)(\s*)$/)!;
    return m[2] ? `${m[1]}**${m[2].replace(/\n/g, '**\n**')}**${m[3]}` : m[1] + m[3];
  }).join('').replace(/\*\*\*\*/g, ''));
  return normaliserMarkup(out.join('\n\n'));
}

// ─── Modification manuelle protégée ──────────────────────────────────────────

/**
 * `texte` : ce que le médecin voit et modifie ; `base` : le texte généré dont il est parti ;
 * `genere` : le texte que donneraient les paramètres ACTUELS ; `ignore` : régénération refusée.
 */
export interface TexteLettre { texte: string; base: string; genere: string; ignore: string | null }

export const texteInitial = (genere: string): TexteLettre => ({ texte: genere, base: genere, genere, ignore: null });

/** Le médecin a modifié le texte à la main. */
export const estModifie = (s: TexteLettre): boolean => normaliserMarkup(s.texte) !== normaliserMarkup(s.base);

export const surSaisie = (s: TexteLettre, texte: string): TexteLettre => ({ ...s, texte });

/**
 * Un paramètre a changé. Texte intact → il suit les paramètres. Texte modifié à la main → il
 * n'est JAMAIS écrasé : la nouvelle version est seulement proposée (propositionEnAttente).
 */
export function surRegeneration(s: TexteLettre, genere: string): TexteLettre {
  return estModifie(s) ? { ...s, genere } : texteInitial(genere);
}

/** Une régénération attend la décision du médecin (« Régénérer » / « Garder mon texte »). */
export const propositionEnAttente = (s: TexteLettre): boolean =>
  estModifie(s) && normaliserMarkup(s.genere) !== normaliserMarkup(s.base) && s.genere !== s.ignore;

/** Confirmation explicite : le texte modifié est remplacé par le texte régénéré. */
export const accepterRegeneration = (s: TexteLettre): TexteLettre => texteInitial(s.genere);

/** Le médecin garde son texte : la proposition disparaît jusqu'au prochain changement de paramètre. */
export const garderTexte = (s: TexteLettre): TexteLettre => ({ ...s, ignore: s.genere });

// ─── Validation ──────────────────────────────────────────────────────────────

/** Erreurs bloquant l'enregistrement : spécialité et motif obligatoires, texte non vide. */
export function validerLettre(l: { specialite: string | null | undefined; motif: string | null | undefined; texte: string | null | undefined }): string[] {
  const erreurs: string[] = [];
  if (!propre(l.specialite)) erreurs.push('Choisissez un confrère ou une spécialité destinataire.');
  if (!propre(l.motif)) erreurs.push('Le motif de l’adressage est obligatoire.');
  if (!markupToPlain(l.texte).trim()) erreurs.push('Le texte de la lettre est vide.');
  return erreurs;
}

// ─── Suivi ───────────────────────────────────────────────────────────────────

export type LettreStatut = 'brouillon' | 'envoyee' | 'reponse_recue' | 'annulee';

export const STATUT_LETTRE: Record<LettreStatut, string> = {
  brouillon: 'Non envoyée', envoyee: 'Envoyée', reponse_recue: 'Réponse reçue', annulee: 'Annulée',
};

/** Changements de statut permis — mêmes règles que le trigger en base. */
export function transitionsPossibles(statut: LettreStatut): LettreStatut[] {
  if (statut === 'brouillon') return ['envoyee', 'reponse_recue', 'annulee'];
  if (statut === 'envoyee') return ['reponse_recue', 'annulee', 'brouillon'];
  return [];
}
export const peutPasser = (de: LettreStatut, vers: LettreStatut): boolean => transitionsPossibles(de).includes(vers);

export const SEUIL_SANS_REPONSE_JOURS = 30;

const jourUtc = (iso: string | null | undefined): number | null => {
  const m = (iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

/** Jours écoulés depuis l'envoi d'une lettre ENVOYÉE et sans réponse ; null dans tous les autres cas. */
export function joursSansReponse(l: { statut: LettreStatut; date_envoi: string | null }, today: Date): number | null {
  if (l.statut !== 'envoyee') return null;
  const envoi = jourUtc(l.date_envoi);
  if (envoi === null) return null;
  return Math.max(0, Math.round((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - envoi) / 86_400_000));
}

/** « Sans réponse depuis 42 jours » au-delà de 30 jours, sinon null. */
export function badgeSansReponse(l: { statut: LettreStatut; date_envoi: string | null }, today: Date): string | null {
  const n = joursSansReponse(l, today);
  return n !== null && n > SEUIL_SANS_REPONSE_JOURS ? `Sans réponse depuis ${n} jours` : null;
}

/** Date ISO avant laquelle une lettre envoyée est « sans réponse » (envoi strictement antérieur). */
export function dateLimiteSansReponse(today: Date): string {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - SEUIL_SANS_REPONSE_JOURS);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Ouvertes d'abord (retards en tête), puis réponses reçues et annulées, les plus récentes d'abord. */
export function trierLettres<T extends { statut: LettreStatut; date_envoi: string | null; created_at: string }>(list: T[], today: Date): T[] {
  const rang = (l: T) => (l.statut === 'envoyee' ? 0 : l.statut === 'brouillon' ? 1 : 2);
  return [...list].sort((a, b) => rang(a) - rang(b)
    || (rang(a) === 0 ? (joursSansReponse(b, today) ?? 0) - (joursSansReponse(a, today) ?? 0) : 0)
    || b.created_at.localeCompare(a.created_at));
}

export function lettreFileName(patient: { nom: string; prenom: string }, dateIso: string): string {
  return `adressage_${patient.nom}_${patient.prenom}_${dateIso}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

// ─── Paramètres de la lettre et brouillon ────────────────────────────────────

export interface AdressageParams {
  confrereId: string | null;
  specialite: string;
  destinataireLibre: string;
  motif: string;
  urgence: Urgence;
  contexte: string;
  question: string;
  mode: ModeTraitements;
  /** Antécédents décochés (identifiants). Tous les autres sont inclus… */
  antecedentsExclus: string[];
  /** …sauf les antécédents FAMILIAUX, proposés mais non cochés par défaut : ceux-ci sont cochés un à un. */
  antecedentsFamiliauxInclus: string[];
  allergies: boolean;
  /** Bilans cochés (clés de série) ; null = sélection par défaut (les plus pertinents). */
  bilans: string[] | null;
  dfg: boolean;
  examensEnAttente: boolean;
  grossesse: boolean;
  joindreBilans: boolean;
}

export const emptyAdressageParams = (): AdressageParams => ({
  confrereId: null, specialite: '', destinataireLibre: '', motif: '', urgence: 'programme', contexte: '', question: '',
  mode: 'classes', antecedentsExclus: [], antecedentsFamiliauxInclus: [], allergies: true, bilans: null, dfg: true, examensEnAttente: true, grossesse: true,
  joindreBilans: false,
});

export interface AdressageDraft { params: AdressageParams; texte: Pick<TexteLettre, 'texte' | 'base'> }

/** Le brouillon contient une saisie du médecin (paramètre renseigné ou texte modifié à la main). */
export function adressageDraftHasContent(d: AdressageDraft | null | undefined): boolean {
  if (!d) return false;
  const p = d.params;
  return !!p.confrereId || !!p.specialite.trim() || !!p.destinataireLibre.trim() || !!p.motif.trim() || !!p.contexte.trim()
    || !!p.question.trim() || estModifie({ texte: d.texte.texte, base: d.texte.base, genere: d.texte.base, ignore: null });
}

/** Le brouillon est celui de ce patient et de ce médecin (un identifiant absent ne correspond jamais). */
export function adressageDraftBelongsTo(
  s: { doctorId?: string; patientId?: string } | null | undefined, doctorId: string | null | undefined, patientId: string | null | undefined,
): boolean {
  return !!s && !!doctorId && !!patientId && s.doctorId === doctorId && s.patientId === patientId;
}

/** « Dr Salma Bennani, cardiologie » — la ligne figée sans « À l'attention de ». */
export function destinataireCourt(l: { destinataire_ligne: string }): string {
  return l.destinataire_ligne.replace(/^À l'attention (?:du |de : |de Monsieur ou Madame le )/u, '').replace(/^./u, c => c.toLocaleUpperCase('fr-FR'));
}
