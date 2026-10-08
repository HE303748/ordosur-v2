// Sprint 4bc — Canal « antécédents » du moteur de sécurité.
//
// Module PUR (ni React ni Supabase) : testé par antecedentEngine.test.ts.
// Il ne fait qu'AJOUTER des alertes, en appel additionnel après le matching existant
// (contre-indications par pathologies / allergies) qui reste inchangé.
//
// Les règles et les classes sont des DONNÉES (tables regles_antecedents et
// regles_antecedents_classes) : ce module ne contient aucune règle clinique en dur,
// seulement l'interprétation des critères et la classification des antécédents.

// ─── Détails structurés des antécédents digestifs ────────────────────────────

export type OuiNonInconnu = 'oui' | 'non' | 'inconnu';
export type Episodes = '1' | '2+' | 'inconnu';

export interface HemorragieDigestiveDetails {
  type: 'hemorragie_digestive';
  nature?: 'hemorragie' | 'perforation';
  en_cours?: boolean;
  sous_ains?: OuiNonInconnu;
  episodes?: Episodes;
}

export interface UlcereGdDetails {
  type: 'ulcere_gd';
  statut?: 'evolutif' | 'cicatrise' | 'inconnu';
  sous_ains?: OuiNonInconnu;
  episodes?: Episodes;
}

export type AntecedentEngineType = 'hemorragie_digestive' | 'ulcere_gd';

/** Libellés courts des antécédents analysés (bloc du Vérificateur). */
export const ANALYSED_TYPE_LABELS: Record<AntecedentEngineType, string> = {
  hemorragie_digestive: 'hémorragie digestive',
  ulcere_gd: 'ulcère',
};

// ─── Entrées ─────────────────────────────────────────────────────────────────

/** Médicament analysé — mêmes sources de matching que le moteur existant. */
export interface EngineMed {
  id: string;
  nom: string;
  dci?: string | null;
  dci_canonique?: string | null;
  /** Noms d'ingrédients (fallback medicament_ingredients), déjà normalisés ou non. */
  ingredients?: string[];
}

/** Antécédent tel que stocké (table antecedents) — champs utiles au moteur. */
export interface EngineAntecedent {
  id: string;
  categorie: string;
  libelle: string;
  archive: boolean;
  en_cours: boolean | null;
  date_debut_annee: number | null;
  details: unknown;
  pathologie?: { nom_fr: string } | null;
}

export type RegleSeverite = 'absolue' | 'a_evaluer' | 'precaution';

/**
 * Critères d'une règle (jsonb) :
 *   any_of : liste de conditions ; la règle s'applique si AU MOINS UNE est vraie.
 *   Une condition = { champ: [valeurs acceptées] } ; tous les champs doivent correspondre.
 *   Absent ou vide → la règle s'applique à tout antécédent du type.
 * Champs disponibles (valeurs normalisées, « inconnu » si non renseigné) :
 *   hémorragie : nature, en_cours ('oui'|'non'), sous_ains, episodes
 *   ulcère     : statut, sous_ains, episodes
 */
export interface RegleCriteres {
  any_of?: Array<Record<string, string[]>>;
}

export interface RegleAntecedent {
  id: string;
  code: string;
  ordre: number;
  classe: string;
  antecedent_type: string;
  criteres: RegleCriteres | null;
  severite: RegleSeverite;
  titre: string;
  conduite: string;
  source: string;
  actif: boolean;
}

export interface RegleClasse {
  classe: string;
  dci_motif: string;
}

// ─── Sortie ──────────────────────────────────────────────────────────────────

export interface AntecedentAlert {
  medId: string;
  medNom: string;
  antecedentId: string;
  antecedentType: AntecedentEngineType;
  /** « hémorragie digestive (2019) » */
  conditionLabel: string;
  severite: RegleSeverite;
  regleCode: string;
  classe: string;
  titre: string;
  conduite: string;
  source: string;
}

// ─── Normalisation (identique au moteur existant) ────────────────────────────

export function normEngine(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export const SEVERITE_RANK: Record<RegleSeverite, number> = { absolue: 3, a_evaluer: 2, precaution: 1 };

// ─── Classification des antécédents ──────────────────────────────────────────

const HEMO_RE = /hemorragie digestive|saignement digestif|hematemese|melena|rectorragie|perforation (digestive|gastrique|duodenale|d ulcere)|ulcere perfore|ulcere hemorragique/;
const ULCERE_RE = /ulcere (gastr|duoden|peptique|bulbaire)|ulcere gd\b|maladie ulcereuse/;

/** Catégories pouvant porter un antécédent personnel (exclut familial / toxique / gynéco). */
const PERSONAL_CATEGORIES = new Set(['medical', 'chirurgical']);

function detailsType(details: unknown): string | undefined {
  if (details && typeof details === 'object' && 'type' in details) {
    const t = (details as { type?: unknown }).type;
    return typeof t === 'string' ? t : undefined;
  }
  return undefined;
}

/**
 * Type d'antécédent analysé, ou null. Les détails structurés priment ; à défaut
 * (antécédents saisis avant ce sprint ou en texte libre) le libellé est reconnu.
 */
export function classifyAntecedent(a: Pick<EngineAntecedent, 'categorie' | 'libelle' | 'details' | 'pathologie'>): AntecedentEngineType | null {
  const t = detailsType(a.details);
  if (t === 'hemorragie_digestive' || t === 'ulcere_gd') return t;
  if (t) return null; // autre type structuré (tabac, alcool, phyto, cancer)
  if (!PERSONAL_CATEGORIES.has(a.categorie)) return null;
  const text = normEngine(`${a.libelle} ${a.pathologie?.nom_fr ?? ''}`);
  if (HEMO_RE.test(text)) return 'hemorragie_digestive';
  if (ULCERE_RE.test(text)) return 'ulcere_gd';
  return null;
}

/** Faits normalisés d'un antécédent (« inconnu » si non renseigné). */
export function antecedentFacts(a: EngineAntecedent, type: AntecedentEngineType): Record<string, string> {
  const d = (a.details && typeof a.details === 'object' ? a.details : {}) as Record<string, unknown>;
  const typed = detailsType(a.details) === type;
  const str = (v: unknown, allowed: string[]) => (typeof v === 'string' && allowed.includes(v) ? v : 'inconnu');
  const sous_ains = typed ? str(d.sous_ains, ['oui', 'non']) : 'inconnu';
  const episodes = typed ? str(d.episodes, ['1', '2+']) : 'inconnu';
  if (type === 'hemorragie_digestive') {
    // en_cours : détail structuré, sinon colonne en_cours de l'antécédent.
    const enCours = typed && typeof d.en_cours === 'boolean' ? d.en_cours : a.en_cours === true;
    const libNorm = normEngine(a.libelle);
    const nature = typed ? str(d.nature, ['hemorragie', 'perforation'])
      : /perfor/.test(libNorm) ? 'perforation' : 'hemorragie';
    return { nature, en_cours: enCours ? 'oui' : 'non', sous_ains, episodes };
  }
  // Ulcère : statut structuré, sinon déduit de la colonne en_cours (null → inconnu).
  const statut = typed ? str(d.statut, ['evolutif', 'cicatrise'])
    : a.en_cours === true ? 'evolutif' : a.en_cours === false ? 'cicatrise' : 'inconnu';
  return { statut, sous_ains, episodes };
}

/** Antécédent digestif dont les détails restent à préciser (incitation dans le profil). */
export function needsPrecision(a: EngineAntecedent): boolean {
  const type = classifyAntecedent(a);
  if (!type || a.archive) return false;
  const f = antecedentFacts(a, type);
  return Object.entries(f).some(([k, v]) => k !== 'nature' && v === 'inconnu');
}

function criteresMatch(criteres: RegleCriteres | null, facts: Record<string, string>): boolean {
  const anyOf = criteres?.any_of;
  if (!anyOf || anyOf.length === 0) return true;
  return anyOf.some(cond => Object.entries(cond).every(([field, values]) => values.includes(facts[field] ?? 'inconnu')));
}

// ─── Évaluation ──────────────────────────────────────────────────────────────

/** Classes d'un médicament : motif ⊆ norm(dci + nom + dci_canonique [+ ingrédients]). */
export function medClasses(med: EngineMed, classes: RegleClasse[]): Set<string> {
  const hay = [
    normEngine(med.dci ?? ''),
    normEngine(med.nom),
    normEngine(med.dci_canonique ?? ''),
    ...(med.ingredients ?? []).map(normEngine),
  ].filter(Boolean);
  const out = new Set<string>();
  for (const c of classes) {
    const motif = normEngine(c.dci_motif);
    if (motif.length < 3) continue;
    if (hay.some(h => h.includes(motif))) out.add(c.classe);
  }
  return out;
}

/**
 * Alertes du canal antécédents. Une alerte au plus par (médicament, antécédent) :
 * la sévérité la plus haute ; à égalité, la première règle dans l'ordre.
 * Antécédents archivés ignorés. Règles inactives ignorées.
 */
export function evaluateAntecedents(
  meds: EngineMed[],
  antecedents: EngineAntecedent[],
  regles: RegleAntecedent[],
  classes: RegleClasse[],
): AntecedentAlert[] {
  const active = regles.filter(r => r.actif).sort((a, b) => a.ordre - b.ordre);
  if (active.length === 0) return [];

  const typed = antecedents
    .filter(a => !a.archive)
    .map(a => ({ a, type: classifyAntecedent(a) }))
    .filter((x): x is { a: EngineAntecedent; type: AntecedentEngineType } => x.type !== null);
  if (typed.length === 0) return [];

  const alerts: AntecedentAlert[] = [];
  for (const med of meds) {
    const mc = medClasses(med, classes);
    if (mc.size === 0) continue;
    for (const { a, type } of typed) {
      const facts = antecedentFacts(a, type);
      let best: RegleAntecedent | null = null;
      for (const r of active) {
        if (r.antecedent_type !== type || !mc.has(r.classe)) continue;
        if (!criteresMatch(r.criteres, facts)) continue;
        if (!best || SEVERITE_RANK[r.severite] > SEVERITE_RANK[best.severite]) best = r;
      }
      if (!best) continue;
      const year = a.date_debut_annee ? ` (${a.date_debut_annee})` : '';
      alerts.push({
        medId: med.id,
        medNom: med.nom,
        antecedentId: a.id,
        antecedentType: type,
        conditionLabel: `${a.libelle.trim().toLowerCase()}${year}`,
        severite: best.severite,
        regleCode: best.code,
        classe: best.classe,
        titre: best.titre,
        conduite: best.conduite,
        source: best.source,
      });
    }
  }
  return alerts;
}

// ─── Fusion avec les contre-indications existantes ───────────────────────────

/** Condition d'une CI existante relevant du même thème (ulcère / saignement digestif). */
const THEME_RE = /ulc|digest|gastr|duoden|hemorragie active|saignement actif/;
const THEME_EXCLUDE_RE = /intracran|cerebr|avc|meninge/;

export function isDigestiveTheme(condition: string | undefined | null): boolean {
  if (!condition) return false;
  const c = normEngine(condition);
  return THEME_RE.test(c) && !THEME_EXCLUDE_RE.test(c);
}

/**
 * Rang comparable entre une CI existante et une alerte antécédent :
 * contre-indication absolue > à évaluer > CI relative (« majeure ») > précaution.
 */
export function existingRank(severite: string): number {
  if (severite === 'contre_indication') return 3;
  if (severite === 'majeure') return 1.5;
  return 0;
}

export interface ExistingAlertLike {
  type: string;
  severite: string;
  involved: string[];
  condition?: string;
}

/**
 * Doublons : une alerte antécédent est absorbée par une CI existante du même thème,
 * pour le même médicament, de sévérité supérieure ou égale (la carte existante reçoit
 * « Également : antécédent de … »). Sinon elle reste une carte à part : la sévérité la
 * plus haute n'est jamais supprimée.
 */
export function mergeWithExisting<E extends ExistingAlertLike>(
  existing: E[],
  antAlerts: AntecedentAlert[],
): { standalone: AntecedentAlert[]; alsoByIndex: Map<number, string[]> } {
  const standalone: AntecedentAlert[] = [];
  const alsoByIndex = new Map<number, string[]>();
  for (const aa of antAlerts) {
    let target = -1;
    let targetRank = -1;
    existing.forEach((e, i) => {
      if (e.type !== 'contraindication' || e.involved[0] !== aa.medNom || !isDigestiveTheme(e.condition)) return;
      const r = existingRank(e.severite);
      if (r >= SEVERITE_RANK[aa.severite] && r > targetRank) { target = i; targetRank = r; }
    });
    if (target === -1) { standalone.push(aa); continue; }
    const list = alsoByIndex.get(target) ?? [];
    const line = `antécédent de ${aa.conditionLabel}`;
    if (!list.includes(line)) list.push(line);
    alsoByIndex.set(target, list);
  }
  return { standalone, alsoByIndex };
}
