import { supabase } from './supabase';
import type { HemorragieDigestiveDetails, UlcereGdDetails, OuiNonInconnu, Episodes } from './antecedentEngine';

// Sprint 4 — Antécédents structurés (table antecedents) + dates des pathologies actives.
// Sprint 4bc — seuls l'hémorragie digestive et l'ulcère gastroduodénal sont lus par le
// moteur (canal additionnel src/lib/antecedentEngine.ts) ; les autres antécédents et
// `patients.pathologies_depuis` restent une information. Les contre-indications de la base
// continuent de porter sur patients.pathologies.
// Jamais de suppression physique : une erreur de saisie s'archive.

export type AntecedentCategorie = 'medical' | 'chirurgical' | 'familial' | 'toxique' | 'gyneco_obstetrical';

export const CATEGORIES: { id: AntecedentCategorie; label: string; short: string }[] = [
  { id: 'medical',            label: 'Médicaux',                short: 'Médical' },
  { id: 'chirurgical',        label: 'Chirurgicaux',            short: 'Chirurgical' },
  { id: 'toxique',            label: 'Habitudes & toxiques',    short: 'Toxique' },
  { id: 'gyneco_obstetrical', label: 'Gynéco-obstétricaux',     short: 'Gynéco' },
  { id: 'familial',           label: 'Familiaux',               short: 'Familial' },
];

export type TabacStatut = 'actif' | 'sevre' | 'jamais';
export type AlcoolStatut = 'actif' | 'sevre' | 'occasionnel';
export type CancerStatut = 'traitement' | 'remission' | 'surveillance';

export interface TabacDetails  { type: 'tabac';  statut?: TabacStatut; paquets_annees?: number | null; annee_sevrage?: number | null }
export interface AlcoolDetails { type: 'alcool'; statut?: AlcoolStatut; consommation?: string | null }
export interface PhytoDetails  { type: 'phyto';  plantes?: string | null }
export interface CancerDetails { type: 'cancer'; localisation?: string | null; statut?: CancerStatut }
export type { HemorragieDigestiveDetails, UlcereGdDetails, OuiNonInconnu, Episodes };
export type AntecedentDetails =
  | TabacDetails | AlcoolDetails | PhytoDetails | CancerDetails
  | HemorragieDigestiveDetails | UlcereGdDetails
  | { type?: undefined };
export type DetailsType = 'tabac' | 'alcool' | 'phyto' | 'cancer' | 'hemorragie_digestive' | 'ulcere_gd';

export interface Antecedent {
  id: string;
  patient_id: string;
  org_id: string;
  doctor_id: string;
  categorie: AntecedentCategorie;
  libelle: string;
  pathologie_curee_id: string | null;
  date_debut_annee: number | null;
  date_debut: string | null;
  date_fin_annee: number | null;
  en_cours: boolean | null;
  details: AntecedentDetails;
  notes: string | null;
  archive: boolean;
  archive_par_doctor_id: string | null;
  archive_motif: string | null;
  archive_le: string | null;
  created_at: string;
  updated_at: string;
  // Jointure pathologies_curees (NULL si hors référentiel)
  pathologie?: { id: string; nom_fr: string } | null;
}

const SELECT_COLS = '*, pathologie:pathologies_curees(id, nom_fr)';

/** Antécédents d'un patient (archivés inclus si demandé). Borné par patient. */
export async function loadAntecedents(patientId: string, includeArchived = true): Promise<Antecedent[]> {
  let q = supabase.from('antecedents').select(SELECT_COLS).eq('patient_id', patientId);
  if (!includeArchived) q = q.eq('archive', false);
  const { data, error } = await q.order('created_at', { ascending: true });
  if (error) throw error;
  return (data as Antecedent[]) ?? [];
}

/** Recherche dans le référentiel curé (372 lignes) — même requête que PatientForm. */
export async function searchPathologiesCurees(q: string): Promise<{ id: string; nom_fr: string }[]> {
  const sanitized = q.replace(/[%,()]/g, '').trim();
  if (!sanitized) return [];
  const { data } = await supabase
    .from('pathologies_curees')
    .select('id, nom_fr')
    .or(`nom_fr.ilike.%${sanitized}%,synonymes.ilike.%${sanitized}%`)
    .order('nom_fr')
    .limit(20);
  return ((data as { id: string; nom_fr: string }[] | null) ?? []).filter(r => !!r.nom_fr);
}

/** id d'une pathologie curée par nom_fr EXACT (null si absente). */
export async function findCureeByNom(nom: string): Promise<{ id: string; nom_fr: string } | null> {
  const { data } = await supabase.from('pathologies_curees').select('id, nom_fr').eq('nom_fr', nom).limit(1);
  return ((data as { id: string; nom_fr: string }[] | null) ?? [])[0] ?? null;
}

// ─── Saisie rapide ────────────────────────────────────────────────────────────
// cureeNom : nom_fr EXACT dans pathologies_curees (résolu à l'ouverture ; null → hors référentiel).
// « Hémorragie digestive » et « Tabagisme » : volontairement SANS lien (absents du référentiel,
// ajout reporté au sprint de données dédié).
// Sprint 4bc — hémorragie digestive et ulcère : mini-fiche structurée, lue par le moteur.
export interface QuickChip {
  key: string;
  label: string;
  categorie: AntecedentCategorie;
  libelle: string;
  detailsType?: DetailsType;
  cureeNom?: string;
}

export const QUICK_CHIPS: QuickChip[] = [
  { key: 'tabac',     label: 'Tabagisme',              categorie: 'toxique',     libelle: 'Tabagisme',              detailsType: 'tabac' },
  { key: 'alcool',    label: 'Alcool',                 categorie: 'toxique',     libelle: 'Consommation d’alcool',  detailsType: 'alcool' },
  { key: 'phyto',     label: 'Phytothérapie',          categorie: 'toxique',     libelle: 'Phytothérapie',          detailsType: 'phyto' },
  { key: 'cancer',    label: 'Cancer',                 categorie: 'medical',     libelle: 'Cancer',                 detailsType: 'cancer' },
  { key: 'hemo_dig',  label: 'Hémorragie digestive',   categorie: 'medical',     libelle: 'Hémorragie digestive',   detailsType: 'hemorragie_digestive' },
  { key: 'ulcere',    label: 'Ulcère gastroduodénal',  categorie: 'medical',     libelle: 'Ulcère gastro-duodénal', detailsType: 'ulcere_gd', cureeNom: 'Ulcère gastro-duodénal' },
  { key: 'vhb',       label: 'Hépatite B',             categorie: 'medical',     libelle: 'Hépatite virale B',      cureeNom: 'Hépatite virale B' },
  { key: 'vhc',       label: 'Hépatite C',             categorie: 'medical',     libelle: 'Hépatite virale C',      cureeNom: 'Hépatite virale C' },
  { key: 'chir_abdo', label: 'Chirurgie abdominale',   categorie: 'chirurgical', libelle: 'Chirurgie abdominale' },
];

// Localisations de cancer → libellé + nom_fr exact du référentiel (null = pas d'entrée).
export const CANCER_LOCALISATIONS: { label: string; libelle: string; cureeNom: string | null }[] = [
  { label: 'Sein',            libelle: 'Cancer du sein',             cureeNom: 'Cancer du sein' },
  { label: 'Côlon / rectum',  libelle: 'Cancer colorectal',          cureeNom: 'Cancer colorectal' },
  { label: 'Estomac',         libelle: 'Cancer de l’estomac',        cureeNom: 'Cancer de l\'estomac' },
  { label: 'Foie',            libelle: 'Cancer du foie',             cureeNom: 'Cancer du foie' },
  { label: 'Pancréas',        libelle: 'Cancer du pancréas',         cureeNom: 'Cancer du pancréas' },
  { label: 'Poumon',          libelle: 'Cancer du poumon',           cureeNom: 'Cancer du poumon' },
  { label: 'Prostate',        libelle: 'Cancer de la prostate',      cureeNom: 'Cancer de la prostate' },
  { label: 'Thyroïde',        libelle: 'Cancer de la thyroïde',      cureeNom: 'Cancer de la thyroïde' },
  { label: 'Vessie',          libelle: 'Cancer de la vessie',        cureeNom: 'Cancer de la vessie' },
  { label: 'Col de l’utérus', libelle: 'Cancer du col de l’utérus',  cureeNom: 'Cancer du col de l\'utérus' },
  { label: 'Autre',           libelle: 'Cancer',                     cureeNom: null },
];

export const TABAC_STATUTS: { id: TabacStatut; label: string }[] = [
  { id: 'actif', label: 'Actif' }, { id: 'sevre', label: 'Sevré' }, { id: 'jamais', label: 'Jamais' },
];
export const ALCOOL_STATUTS: { id: AlcoolStatut; label: string }[] = [
  { id: 'actif', label: 'Actif' }, { id: 'occasionnel', label: 'Occasionnel' }, { id: 'sevre', label: 'Sevré' },
];
export const CANCER_STATUTS: { id: CancerStatut; label: string }[] = [
  { id: 'traitement', label: 'En traitement' }, { id: 'surveillance', label: 'Surveillance' }, { id: 'remission', label: 'Rémission' },
];
// Sprint 4bc — mini-fiches digestives (« inconnu » = non renseigné).
export const HEMO_NATURES: { id: 'hemorragie' | 'perforation'; label: string }[] = [
  { id: 'hemorragie', label: 'Hémorragie' }, { id: 'perforation', label: 'Perforation' },
];
export const ULCERE_STATUTS: { id: 'evolutif' | 'cicatrise' | 'inconnu'; label: string }[] = [
  { id: 'evolutif', label: 'Évolutif' }, { id: 'cicatrise', label: 'Cicatrisé' }, { id: 'inconnu', label: 'Ne sait pas' },
];
export const SOUS_AINS_CHOIX: { id: OuiNonInconnu; label: string }[] = [
  { id: 'oui', label: 'Oui' }, { id: 'non', label: 'Non' }, { id: 'inconnu', label: 'Ne sait pas' },
];
export const EPISODES_CHOIX: { id: Episodes; label: string }[] = [
  { id: '1', label: '1 épisode' }, { id: '2+', label: '2 ou plus' }, { id: 'inconnu', label: 'Ne sait pas' },
];

/** en_cours dérivé des détails structurés (null = pas de dérivation). */
export function deriveEnCours(d: AntecedentDetails): boolean | null {
  switch (d.type) {
    case 'tabac':  return d.statut ? d.statut === 'actif' : null;
    case 'alcool': return d.statut ? d.statut !== 'sevre' : null;
    case 'cancer': return d.statut ? d.statut === 'traitement' : null;
    case 'hemorragie_digestive': return typeof d.en_cours === 'boolean' ? d.en_cours : null;
    case 'ulcere_gd': return d.statut === 'evolutif' ? true : d.statut === 'cicatrise' ? false : null;
    default:       return null;
  }
}

// ─── Affichage des durées ─────────────────────────────────────────────────────

export function currentYear(): number {
  return new Date().getFullYear();
}

export function isValidYear(y: unknown): y is number {
  return typeof y === 'number' && Number.isInteger(y) && y >= 1900 && y <= currentYear();
}

function ansDepuis(y: number): string {
  const n = currentYear() - y;
  if (n <= 0) return 'cette année';
  return `${n} an${n > 1 ? 's' : ''}`;
}

/** « depuis 2019 · 7 ans » — pathologie active ou antécédent en cours. */
export function formatDepuis(y: number | null | undefined): string {
  if (!isValidYear(y)) return '';
  return `depuis ${y} · ${ansDepuis(y)}`;
}

/** Période lisible d'un antécédent. */
export function formatPeriode(a: Pick<Antecedent, 'date_debut_annee' | 'date_fin_annee' | 'en_cours' | 'categorie'>): string {
  const d = a.date_debut_annee;
  const f = a.date_fin_annee;
  if (isValidYear(d) && isValidYear(f)) return d === f ? `en ${d}` : `${d}–${f}`;
  if (isValidYear(d)) {
    if (a.en_cours === true) return formatDepuis(d);
    if (a.en_cours === false || a.categorie === 'chirurgical') {
      const n = currentYear() - d;
      return n <= 0 ? `en ${d}` : `en ${d} · il y a ${n} an${n > 1 ? 's' : ''}`;
    }
    return `depuis ${d}`;
  }
  if (isValidYear(f)) return `jusqu’en ${f}`;
  return '';
}

/** Détails structurés en une ligne (profil + Vérificateur). */
export function formatDetails(d: AntecedentDetails): string {
  const parts: string[] = [];
  switch (d.type) {
    case 'tabac':
      if (d.statut === 'sevre' && isValidYear(d.annee_sevrage)) parts.push(`Sevré en ${d.annee_sevrage}`);
      else if (d.statut) parts.push(TABAC_STATUTS.find(s => s.id === d.statut)?.label ?? '');
      if (typeof d.paquets_annees === 'number') parts.push(`${d.paquets_annees} PA`);
      break;
    case 'alcool':
      if (d.statut) parts.push(ALCOOL_STATUTS.find(s => s.id === d.statut)?.label ?? '');
      if (d.consommation) parts.push(d.consommation);
      break;
    case 'phyto':
      if (d.plantes) parts.push(d.plantes);
      break;
    case 'cancer':
      if (d.statut) parts.push(CANCER_STATUTS.find(s => s.id === d.statut)?.label ?? '');
      break;
    case 'hemorragie_digestive':
      if (d.nature === 'perforation') parts.push('Perforation');
      if (d.en_cours === true) parts.push('Saignement actif');
      if (d.sous_ains === 'oui') parts.push('Sous AINS');
      else if (d.sous_ains === 'non') parts.push('Hors AINS');
      if (d.episodes === '2+') parts.push('Récidivant');
      else if (d.episodes === '1') parts.push('1 épisode');
      break;
    case 'ulcere_gd':
      if (d.statut === 'evolutif') parts.push('Évolutif');
      else if (d.statut === 'cicatrise') parts.push('Cicatrisé');
      if (d.sous_ains === 'oui') parts.push('Sous AINS');
      else if (d.sous_ains === 'non') parts.push('Hors AINS');
      if (d.episodes === '2+') parts.push('Récidivant');
      else if (d.episodes === '1') parts.push('1 épisode');
      break;
  }
  return parts.filter(Boolean).join(' · ');
}

/** Normalisation pour comparer un libellé à patients.pathologies. */
export function normLabel(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Garde-fou F — antécédent médical EN COURS absent de patients.pathologies :
 * il n'est pas analysé par le moteur. Comparaison sur le nom_fr curé ET le libellé saisi.
 */
export function isActiveMedicalNotInPathologies(a: Antecedent, pathologies: string[] | null | undefined): boolean {
  if (a.archive || a.categorie !== 'medical' || a.en_cours !== true) return false;
  const pathos = (pathologies ?? []).map(normLabel);
  const candidates = [a.pathologie?.nom_fr, a.libelle].filter((x): x is string => !!x).map(normLabel);
  return !candidates.some(c => pathos.includes(c));
}

// ─── patients.pathologies_depuis ──────────────────────────────────────────────

export type PathologiesDepuis = Record<string, number>;

/** Ne garde que les clés présentes dans pathologies et les années valides (nettoyage des orphelines). */
export function cleanPathologiesDepuis(
  pathologies: string[] | null | undefined,
  depuis: PathologiesDepuis | null | undefined,
): PathologiesDepuis | null {
  const out: PathologiesDepuis = {};
  for (const p of pathologies ?? []) {
    const y = depuis?.[p];
    if (isValidYear(y)) out[p] = y;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Saisie « année » → nombre valide ou null. */
export function parseYear(raw: string): number | null {
  const t = raw.trim();
  if (!/^\d{4}$/.test(t)) return null;
  const y = Number(t);
  return isValidYear(y) ? y : null;
}
