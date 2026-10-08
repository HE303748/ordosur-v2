// Sprint 4e-A — Canal « doublons thérapeutiques » du moteur de sécurité.
//
// Module PUR (ni React ni Supabase) : testé par duplicateEngine.test.ts.
// Il ne fait qu'AJOUTER des alertes, en appel additionnel après la RPC
// check_interactions_v2 et le matching des contre-indications, qui restent inchangés.
//
// Pourquoi : la RPC exige deux ingrédients DIFFÉRENTS. Le même principe actif sous deux
// marques (Doliprane + Efferalgan), ou dans une association fixe (Doliprane + Codoliprane),
// ne produisait aucune alerte ; deux IPP non plus.
//   D1 — même principe actif dans deux lignes → alerte majeure (dérogation motivée).
//   D2 — même classe à risque, substances différentes → attention.
// Un traitement de fond qui doublonne un nouveau médicament est détecté (origine « mixte »).

export interface DuplicateMed {
  id: string;
  nom: string;
  dci?: string | null;
  dci_canonique?: string | null;
  /** Noms d'ingrédients de la base (parfois en double : « ibuprofène » et « ibuprofen »). */
  ingredients?: string[];
  /** Saisie libre : aucune substance fiable → jamais analysé par ce canal. */
  manual?: boolean;
}

export interface DoublonClasseRow { classe: string; label: string; motif: string }
export interface DoublonSubstanceRow { substance: string; label: string; type: 'synonyme' | 'adjuvant'; motif: string }

export type DoublonSeverite = 'majeure' | 'attention';

export interface RegleDoublon {
  id: string;
  code: string;
  ordre: number;
  /** « * » = même principe actif ; « + » = même substance d'appoint ; sinon une classe. */
  classe_a: string;
  classe_b: string;
  severite: DoublonSeverite;
  titre: string;
  conduite: string;
  source: string;
  actif: boolean;
}

export interface DuplicateAlert {
  idA: string;
  idB: string;
  nomA: string;
  nomB: string;
  type: 'meme_substance' | 'meme_classe';
  /** Substance ou classe commune, lisible (« paracétamol », « IEC »). */
  commun: string;
  severite: DoublonSeverite;
  regleCode: string;
  titre: string;
  conduite: string;
  source: string;
  /** Carte(s) existante(s) de la même paire absorbée(s) par cette alerte (sévérité inférieure). */
  also?: string[];
}

// ─── Normalisation ───────────────────────────────────────────────────────────

export function normDup(s: string | null | undefined): string {
  return (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Motif en début de mot (« morphin » ne reconnaît pas « apomorphine »). */
function wordStart(motif: string, text: string): boolean {
  return motif.length >= 3 && new RegExp(`(^| )${escapeRe(motif)}`).test(text);
}

// Mots de sel, d'hydratation, d'ester ou de liaison : ne changent pas le principe actif.
const SEL = new Set([
  'sodium', 'sodique', 'disodique', 'potassium', 'potassique', 'calcium', 'calcique', 'magnesium', 'magnesien', 'zinc',
  'chlorhydrate', 'dichlorhydrate', 'hydrochloride', 'dihydrochloride', 'hcl', 'bromhydrate', 'hydrobromide', 'bromure', 'bromide',
  'chlorure', 'chloride', 'sulfate', 'sulphate', 'hydrogenosulfate', 'bisulfate', 'phosphate', 'acetate', 'maleate', 'fumarate',
  'hemifumarate', 'succinate', 'tartrate', 'bitartrate', 'citrate', 'nitrate', 'mesilate', 'mesylate', 'besilate', 'besylate',
  'tosilate', 'embonate', 'pamoate', 'gluconate', 'lactate', 'carbonate', 'oxyde', 'oxide', 'hydroxyde', 'hydroxide',
  'bicarbonate', 'iodure', 'iodide', 'fluorure', 'fluoride', 'benzoate', 'alginate', 'stearate', 'silicate',
  'anhydre', 'anhydrous', 'base', 'micronise', 'micronized',
  'arginine', 'lysine', 'dl', 'tromethamine', 'trometamol', 'medoxomil', 'axetil', 'proxetil', 'cilexetil', 'pivoxil',
  'etexilate', 'mofetil', 'disoproxil', 'propionate', 'dipropionate', 'valerate', 'furoate', 'butyrate', 'palmitate',
  'decanoate', 'enanthate', 'undecanoate', 'acetonide',
  'de', 'd', 'du', 'la', 'le', 'l', 'et', 'a',
]);

/**
 * Clé générique d'une substance : sans accents, sans sel ni hydrate, indépendante de la
 * langue (« ibuprofène » = « ibuprofen », « acide clavulanique » = « clavulanic acid »,
 * « diclofénac sodique » = « diclofenac sodium »). Si le nom n'est fait que de mots de sel
 * (« sodium chloride », « sulfate de magnésium »), il est gardé entier : le chlorure de
 * sodium et le chlorure de potassium ne sont pas la même substance.
 */
export function substanceKey(name: string): string {
  const n = normDup(name);
  if (!n) return '';
  const tokens = n.split(' ');
  const core = tokens.filter(t => !SEL.has(t) && !/hydrat/.test(t));
  if (core.length === 0) return n;
  return core
    .filter(t => t !== 'acide' && t !== 'acid')
    .map(t => t.replace(/ique$/, 'ic').replace(/e$/, ''))
    .filter(Boolean)
    .join(' ') || n;
}

/** Composants d'une DCI multiple : « PARACETAMOL | CODEINE », « AMOXICILLINE // ACIDE CLAVULANIQUE ». */
export function dciComponents(dci: string | null | undefined): string[] {
  return (dci ?? '').split(/\s*(?:\/\/|\|\||\||\/|\+|;|,)\s*/).map(s => s.trim()).filter(Boolean);
}

export interface MedSubstance { key: string; label: string; adjuvant: boolean }

/**
 * Substances actives d'un médicament. Source : les ingrédients de la base quand ils
 * existent (les doublons français / anglais sont ramenés à une seule clé), sinon les
 * composants de la DCI. Une saisie libre n'a aucune substance fiable.
 */
export function medSubstances(med: DuplicateMed, substances: DoublonSubstanceRow[]): MedSubstance[] {
  if (med.manual) return [];
  const ing = (med.ingredients ?? []).filter(x => normDup(x) !== '');
  const names = ing.length > 0 ? ing : dciComponents(med.dci);
  const out = new Map<string, MedSubstance>();
  for (const raw of names) {
    const n = normDup(raw);
    if (!n) continue;
    const syn = substances.find(s => wordStart(s.motif, n));
    const sub: MedSubstance = syn
      ? { key: `syn:${syn.substance}`, label: syn.label, adjuvant: syn.type === 'adjuvant' }
      : { key: substanceKey(raw), label: n, adjuvant: false };
    if (sub.key && !out.has(sub.key)) out.set(sub.key, sub);
  }
  return [...out.values()];
}

/** Classes à risque d'un médicament (DCI, nom, DCI canonique, ingrédients). */
export function medClassesDup(med: DuplicateMed, classes: DoublonClasseRow[]): Map<string, string> {
  const out = new Map<string, string>();
  if (med.manual) return out;
  const hay = [med.dci, med.nom, med.dci_canonique, ...(med.ingredients ?? [])].map(normDup).filter(Boolean).join(' | ');
  for (const c of classes) if (!out.has(c.classe) && wordStart(c.motif, hay)) out.set(c.classe, c.label);
  return out;
}

export const DOUBLON_RANK: Record<DoublonSeverite, number> = { majeure: 2, attention: 1 };

// ─── Évaluation ──────────────────────────────────────────────────────────────

/**
 * Alertes de doublon. Une alerte au plus par paire de médicaments : la sévérité la plus
 * haute (même principe actif avant même classe) ; à égalité, la première règle dans l'ordre.
 */
export function evaluateDuplicates(
  meds: DuplicateMed[],
  classes: DoublonClasseRow[],
  substances: DoublonSubstanceRow[],
  regles: RegleDoublon[],
): DuplicateAlert[] {
  const active = regles.filter(r => r.actif).sort((a, b) => a.ordre - b.ordre);
  if (active.length === 0 || meds.length < 2) return [];
  const rSubstance = active.find(r => r.classe_a === '*');
  const rAdjuvant = active.find(r => r.classe_a === '+');
  const rClasses = active.filter(r => r.classe_a !== '*' && r.classe_a !== '+');

  const info = meds.map(m => ({ m, subs: medSubstances(m, substances), cls: medClassesDup(m, classes) }));
  const alerts: DuplicateAlert[] = [];

  for (let i = 0; i < info.length; i++) {
    for (let j = i + 1; j < info.length; j++) {
      const A = info[i];
      const B = info[j];
      if (A.m.id === B.m.id) continue;
      type Cand = Pick<DuplicateAlert, 'type' | 'commun' | 'severite' | 'regleCode' | 'titre' | 'conduite' | 'source'>;
      let best: Cand | null = null;
      const consider = (c: Cand) => { if (!best || DOUBLON_RANK[c.severite] > DOUBLON_RANK[best.severite]) best = c; };

      // D1 / D1b — même principe actif (associations fixes comprises).
      const keysB = new Map(B.subs.map(s => [s.key, s]));
      const common = A.subs.filter(s => keysB.has(s.key));
      const principals = common.filter(s => !s.adjuvant);
      const adjuvants = common.filter(s => s.adjuvant);
      if (principals.length > 0 && rSubstance) {
        const commun = principals.map(s => s.label).join(', ');
        consider({
          type: 'meme_substance', commun, severite: rSubstance.severite, regleCode: rSubstance.code,
          titre: `${rSubstance.titre} (${commun})`, conduite: rSubstance.conduite, source: rSubstance.source,
        });
      } else if (adjuvants.length > 0 && rAdjuvant) {
        const commun = adjuvants.map(s => s.label).join(', ');
        consider({
          type: 'meme_substance', commun, severite: rAdjuvant.severite, regleCode: rAdjuvant.code,
          titre: `${rAdjuvant.titre} (${commun})`, conduite: rAdjuvant.conduite, source: rAdjuvant.source,
        });
      }

      // D2 — même classe à risque (les deux médicaments ont alors des substances différentes,
      // sinon D1, plus sévère, l'emporte).
      for (const r of rClasses) {
        const ok = (A.cls.has(r.classe_a) && B.cls.has(r.classe_b)) || (A.cls.has(r.classe_b) && B.cls.has(r.classe_a));
        if (!ok) continue;
        const labels = [...new Set([A.cls.get(r.classe_a) ?? B.cls.get(r.classe_a), A.cls.get(r.classe_b) ?? B.cls.get(r.classe_b)])]
          .filter((x): x is string => !!x);
        consider({
          type: 'meme_classe', commun: labels.join(' + '), severite: r.severite, regleCode: r.code,
          titre: r.titre, conduite: r.conduite, source: r.source,
        });
      }

      if (!best) continue;
      const b = best as Cand;
      alerts.push({ idA: A.m.id, idB: B.m.id, nomA: A.m.nom, nomB: B.m.nom, ...b });
    }
  }
  return alerts;
}

/** Texte de la carte : « Même principe actif (paracétamol) dans X et Y — risque de surdosage ». */
export function duplicateDescription(a: DuplicateAlert): string {
  const tete = a.type === 'meme_substance'
    ? `${a.titre} dans ${a.nomA} et ${a.nomB} — risque de surdosage`
    : `${a.titre} : ${a.nomA} et ${a.nomB}`;
  return `${tete}. Conduite à tenir : ${a.conduite}`;
}

// ─── Fusion avec les interactions existantes de la même paire ────────────────

export interface ExistingPairAlertLike {
  type: string;
  severite: string;
  involved: string[];
  description?: string;
  channel?: string;
}

/** Rang d'une interaction existante, comparable à celui d'un doublon (majeure 2, attention 1). */
function existingRank(severite: string): number {
  if (severite === 'contre_indication') return 3;
  if (severite === 'majeure') return 2;
  if (severite === 'moderee') return 1;
  if (severite === 'mineure') return 0.5;
  return 0.1; // non classée
}

/**
 * Fusion sans jamais perdre la sévérité la plus haute. `namesOf(id)` : tous les noms sous
 * lesquels le médicament peut apparaître dans une carte existante (nom affiché, nom en base).
 *   • carte existante de la paire, sévérité ≥ → elle absorbe le doublon (« Également : … ») ;
 *   • doublon plus sévère → il absorbe la ou les cartes existantes de la paire.
 */
export function mergeDuplicateAlerts<E extends ExistingPairAlertLike>(
  existing: E[],
  dups: DuplicateAlert[],
  namesOf: (id: string) => string[],
): { standalone: DuplicateAlert[]; alsoByIndex: Map<number, string[]>; absorbed: Set<number> } {
  const standalone: DuplicateAlert[] = [];
  const alsoByIndex = new Map<number, string[]>();
  const absorbed = new Set<number>();
  for (const d of dups) {
    const na = new Set(namesOf(d.idA));
    const nb = new Set(namesOf(d.idB));
    const candidates = existing
      .map((e, i) => ({ e, i }))
      .filter(({ e, i }) => !absorbed.has(i) && e.type === 'drug_drug' && !e.channel && e.involved.length === 2
        && ((na.has(e.involved[0]) && nb.has(e.involved[1])) || (na.has(e.involved[1]) && nb.has(e.involved[0]))));
    const top = candidates.reduce<{ e: E; i: number } | null>(
      (m, c) => (!m || existingRank(c.e.severite) > existingRank(m.e.severite) ? c : m), null);
    const line = d.type === 'meme_substance' ? `même principe actif (${d.commun})` : `même classe (${d.commun})`;
    if (top && existingRank(top.e.severite) >= DOUBLON_RANK[d.severite]) {
      const list = alsoByIndex.get(top.i) ?? [];
      if (!list.includes(line)) list.push(line);
      alsoByIndex.set(top.i, list);
      continue;
    }
    const also: string[] = [];
    for (const c of candidates) {
      absorbed.add(c.i);
      const txt = `interaction déjà signalée — ${(c.e.description ?? '').trim().slice(0, 160)}`.trim();
      if (!also.includes(txt)) also.push(txt);
    }
    standalone.push(also.length > 0 ? { ...d, also } : d);
  }
  return { standalone, alsoByIndex, absorbed };
}
