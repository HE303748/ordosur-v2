// Sprint 4e-B — Canal « allergies croisées » du moteur de sécurité.
//
// Module PUR (ni React ni Supabase) : testé par allergyClassEngine.test.ts.
// Il ne fait qu'AJOUTER des alertes, en appel additionnel après le matching existant
// (contre-indications par libellé, conditionTerms) qui reste inchangé.
//
// Pourquoi : le matching existant compare le LIBELLÉ de l'allergie au libellé d'une
// contre-indication. Une allergie saisie par molécule (« Amoxicilline », « Ibuprofène »)
// ne correspondait à aucun libellé : Amoxil ou Brufen passaient sans alerte.
// Ici, l'allergie est rattachée à une FAMILLE (pénicillines, AINS…) et comparée à la famille
// du médicament prescrit, avec des règles d'allergie croisée stockées en table.

export type Anaphylaxie = 'oui' | 'non' | 'inconnu';
export type AllergieSeverite = 'absolue' | 'a_evaluer' | 'precaution';

export interface AllergyMed {
  id: string;
  nom: string;
  dci?: string | null;
  dci_canonique?: string | null;
  ingredients?: string[];
}

export interface PatientAllergy {
  /** Libellé tel que saisi dans la fiche (« Amoxicilline », « Allergie aux Pénicillines »). */
  label: string;
  anaphylaxie?: Anaphylaxie | null;
}

export interface AllergieFamilleRow {
  famille: string;
  label: string;
  type: 'molecule' | 'alias';
  /** Normalisé. « *x » = n'importe où dans le mot ; sinon début de mot. */
  motif: string;
}

export interface RegleAllergie {
  id: string;
  code: string;
  ordre: number;
  /** Famille de l'allergie du patient ; « * » = règle générique L0 (même nom). */
  famille_allergie: string;
  famille_medicament: string;
  criteres: { anaphylaxie?: string[] } | null;
  severite: AllergieSeverite;
  titre: string;
  conduite: string;
  source: string;
  actif: boolean;
}

export interface AllergyAlert {
  medId: string;
  medNom: string;
  allergie: string;
  /** « allergie : Amoxicilline (anaphylaxie) » */
  conditionLabel: string;
  severite: AllergieSeverite;
  regleCode: string;
  familleAllergie: string;
  familleMedicament: string;
  titre: string;
  conduite: string;
  source: string;
  /** Carte(s) de la base absorbée(s) par cette alerte (sévérité inférieure, même thème). */
  also?: string[];
}

// ─── Normalisation (identique au moteur existant) ────────────────────────────

export function normAllergy(s: string | null | undefined): string {
  return (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export const ALLERGIE_RANK: Record<AllergieSeverite, number> = { absolue: 3, a_evaluer: 2, precaution: 1 };

/** Libellé d'allergie sans son préfixe : « Allergie aux Pénicillines » → « penicillines ». */
export function allergyCore(label: string): string {
  return normAllergy(label)
    .replace(/^(allergie|allergies|intolerance|hypersensibilite)\s+(a la|a l|aux|au|a|de la|des|du|de)\s+/, '')
    .replace(/^(allergie|allergies|intolerance|hypersensibilite)\s+/, '')
    .trim();
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Motif présent dans le texte : « *x » n'importe où, sinon en début de mot. */
export function motifMatch(motif: string, text: string): boolean {
  if (!text) return false;
  if (motif.startsWith('*')) {
    const m = motif.slice(1);
    return m.length >= 3 && text.includes(m);
  }
  return motif.length >= 3 && new RegExp(`(^| )${escapeRe(motif)}`).test(text);
}

/** Alias : mot(s) entier(s) dans le libellé de l'allergie. */
function aliasMatch(alias: string, text: string): boolean {
  return new RegExp(`(^| )${escapeRe(alias)}( |$)`).test(text);
}

function medHaystack(med: AllergyMed): string {
  return [med.dci, med.nom, med.dci_canonique, ...(med.ingredients ?? [])].map(normAllergy).filter(Boolean).join(' | ');
}

/** Familles du médicament prescrit (motifs « molecule » uniquement). */
export function medFamilles(med: AllergyMed, familles: AllergieFamilleRow[]): Set<string> {
  const hay = medHaystack(med);
  const out = new Set<string>();
  for (const f of familles) if (f.type === 'molecule' && motifMatch(f.motif, hay)) out.add(f.famille);
  return out;
}

/** Familles d'une allergie du patient : par molécule (« Amoxicilline ») ou par alias (« AINS »). */
export function allergyFamilles(label: string, familles: AllergieFamilleRow[]): Set<string> {
  const text = allergyCore(label);
  const out = new Set<string>();
  for (const f of familles) {
    if (f.type === 'molecule' ? motifMatch(f.motif, text) : aliasMatch(f.motif, text)) out.add(f.famille);
  }
  return out;
}

/**
 * Règle générique L0 : le nom de l'allergie (≥ 5 caractères) figure tel quel, en début de
 * mot, dans le médicament prescrit (DCI, nom, DCI canonique, ingrédients). Couvre les
 * allergies hors familles (« Metformine », « Tramadol »…).
 */
export function sameNameMatch(label: string, med: AllergyMed): boolean {
  const core = allergyCore(label);
  if (core.length < 5) return false;
  const hay = medHaystack(med);
  if (motifMatch(core, hay)) return true;
  // « codeine » ↔ « codein » : même racine en français et en anglais.
  return core.endsWith('e') && core.length >= 6 && motifMatch(core.slice(0, -1), hay);
}

// ─── Évaluation ──────────────────────────────────────────────────────────────

function criteresMatch(r: RegleAllergie, a: PatientAllergy): boolean {
  const req = r.criteres?.anaphylaxie;
  if (!req || req.length === 0) return true;
  return req.includes(a.anaphylaxie ?? 'inconnu');
}

/**
 * Alertes du canal allergies. Une alerte au plus par (médicament, allergie) : la sévérité
 * la plus haute ; à égalité, la première règle dans l'ordre. Règles inactives ignorées.
 */
export function evaluateAllergies(
  meds: AllergyMed[],
  allergies: PatientAllergy[],
  familles: AllergieFamilleRow[],
  regles: RegleAllergie[],
): AllergyAlert[] {
  const active = regles.filter(r => r.actif).sort((a, b) => a.ordre - b.ordre);
  if (active.length === 0) return [];
  const labelOf = new Map(familles.map(f => [f.famille, f.label]));
  const pats = allergies
    .filter(a => normAllergy(a.label) !== '')
    .map(a => ({ a, fams: allergyFamilles(a.label, familles) }));
  if (pats.length === 0) return [];

  const alerts: AllergyAlert[] = [];
  for (const med of meds) {
    const mf = medFamilles(med, familles);
    for (const { a, fams } of pats) {
      let best: { r: RegleAllergie; fa: string; fm: string } | null = null;
      const consider = (r: RegleAllergie, fa: string, fm: string) => {
        if (!criteresMatch(r, a)) return;
        if (!best || ALLERGIE_RANK[r.severite] > ALLERGIE_RANK[best.r.severite]) best = { r, fa, fm };
      };
      for (const r of active) {
        if (r.famille_allergie === '*') {
          if (sameNameMatch(a.label, med)) consider(r, '*', '*');
          continue;
        }
        if (fams.has(r.famille_allergie) && mf.has(r.famille_medicament)) consider(r, r.famille_allergie, r.famille_medicament);
      }
      if (!best) continue;
      const b = best as { r: RegleAllergie; fa: string; fm: string };
      alerts.push({
        medId: med.id,
        medNom: med.nom,
        allergie: a.label,
        conditionLabel: `allergie : ${a.label.trim()}${a.anaphylaxie === 'oui' ? ' (anaphylaxie)' : ''}`,
        severite: b.r.severite,
        regleCode: b.r.code,
        familleAllergie: b.fa === '*' ? '*' : (labelOf.get(b.fa) ?? b.fa),
        familleMedicament: b.fm === '*' ? '*' : (labelOf.get(b.fm) ?? b.fm),
        titre: b.r.titre,
        conduite: b.r.conduite,
        source: b.r.source,
      });
    }
  }
  return alerts;
}

// ─── Allergies analysées / non analysées (bloc du Vérificateur) ──────────────

export type AllergyStatus = 'famille' | 'base' | 'non_reconnue';

export interface AllergyClassification {
  label: string;
  status: AllergyStatus;
  /** Libellés des familles reconnues (status = 'famille'). */
  familles: string[];
}

/**
 * Chaque allergie du patient est-elle analysée ?
 *   famille       → rattachée à une famille du canal (allergies croisées contrôlées) ;
 *   base          → libellé connu des contre-indications de la base (matching existant) ;
 *   non_reconnue  → ni l'un ni l'autre : seul le nom exact du médicament est contrôlé.
 *                   À afficher : « Allergie non analysée : … ».
 * `conditionsBase` : libellés des contre-indications d'allergie de la base.
 */
export function classifyAllergies(
  labels: string[],
  familles: AllergieFamilleRow[],
  conditionsBase: string[] = [],
): AllergyClassification[] {
  const labelOf = new Map(familles.map(f => [f.famille, f.label]));
  const cvs = conditionsBase.map(normAllergy).filter(Boolean);
  return labels.filter(l => normAllergy(l) !== '').map(label => {
    const fams = [...allergyFamilles(label, familles)];
    if (fams.length > 0) return { label, status: 'famille' as const, familles: fams.map(f => labelOf.get(f) ?? f) };
    const pc = normAllergy(label);
    const known = cvs.some(cv => cv.includes(pc) || pc.includes(cv));
    return { label, status: known ? 'base' as const : 'non_reconnue' as const, familles: [] };
  });
}

// ─── Fusion avec les contre-indications existantes ───────────────────────────

export interface ExistingAllergyAlertLike {
  type: string;
  severite: string;
  involved: string[];
  condition?: string;
  channel?: string;
}

function existingRank(severite: string): number {
  if (severite === 'contre_indication') return 3;
  if (severite === 'majeure') return 1.5; // CI relative de la base
  return 0;
}

/** Carte existante de la base portant sur une allergie, pour ce médicament. */
function isAllergyCard(e: ExistingAllergyAlertLike, medNom: string): boolean {
  return e.type === 'contraindication' && !e.channel && e.involved[0] === medNom
    && /allerg|intoleran|hypersensib/.test(normAllergy(e.condition));
}

/**
 * Fusion dans les deux sens, sans jamais perdre la sévérité la plus haute :
 *   • carte existante de sévérité ≥ → elle absorbe l'alerte (« Également : allergie … ») ;
 *   • alerte du canal plus sévère → elle absorbe la ou les cartes existantes du même
 *     médicament (retirées de l'affichage, rappelées dans `also`).
 */
export function mergeAllergyAlerts<E extends ExistingAllergyAlertLike>(
  existing: E[],
  allergyAlerts: AllergyAlert[],
): { standalone: AllergyAlert[]; alsoByIndex: Map<number, string[]>; absorbed: Set<number> } {
  const standalone: AllergyAlert[] = [];
  const alsoByIndex = new Map<number, string[]>();
  const absorbed = new Set<number>();
  for (const aa of allergyAlerts) {
    const candidates = existing
      .map((e, i) => ({ e, i }))
      .filter(({ e, i }) => !absorbed.has(i) && isAllergyCard(e, aa.medNom));
    const top = candidates.reduce<{ e: E; i: number } | null>(
      (m, c) => (!m || existingRank(c.e.severite) > existingRank(m.e.severite) ? c : m), null);
    if (top && existingRank(top.e.severite) >= ALLERGIE_RANK[aa.severite]) {
      const list = alsoByIndex.get(top.i) ?? [];
      if (!list.includes(aa.conditionLabel)) list.push(aa.conditionLabel);
      alsoByIndex.set(top.i, list);
      continue;
    }
    const also: string[] = [];
    for (const c of candidates) {
      absorbed.add(c.i);
      const line = `contre-indication de la base — ${c.e.condition ?? ''}`.trim();
      if (!also.includes(line)) also.push(line);
    }
    standalone.push(also.length > 0 ? { ...aa, also } : aa);
  }
  return { standalone, alsoByIndex, absorbed };
}
