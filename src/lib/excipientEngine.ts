// Sprint MOTEUR-3 — canal « Excipient à effet notoire ».
//
// Module PUR (ni React ni Supabase), testé par excipientEngine.test.ts. Appel ADDITIONNEL : il ne modifie aucun
// autre canal. Les données viennent de `medicament_excipients` : pour une fiche MA, l'excipient déclaré dans la
// rubrique 6.1 du RCP français de la MÊME spécialité (même marque, même forme, même dosage), avec la phrase exacte
// des rubriques 4.3 / 4.4 qui nomme le terrain à risque. Un excipient appartient à une spécialité, jamais à une
// molécule : aucune règle n'est étendue à un générique.
//
// Sévérité (décision D8 du sprint) : phrase de la rubrique 4.3 → contre-indication ; rubrique 4.4 → « À évaluer ».

import type { PatientConditions, PatientTerm } from './conditionMatcher';

export type ExcipientCode = 'aspartam' | 'gluten' | 'arachide' | 'soja' | 'lactose';
export type TerrainCode = 'phenylcetonurie' | 'coeliaque' | 'allergie_ble' | 'allergie_arachide' | 'allergie_soja' | 'intolerance_lactose';
export type ExcipientSeverite = 'absolue' | 'a_evaluer';

/** Ligne de `medicament_excipients`. */
export interface MedicamentExcipient {
  medicament_id: string;
  excipient: string;
  terrains: string[];
  severite: ExcipientSeverite;
  rubrique: string;
  cis: string;
  date_rcp: string | null;
  citation: string;
  specialite_fr: string;
}

export const EXCIPIENT_LIBELLE: Record<ExcipientCode, string> = {
  aspartam: 'aspartam (source de phénylalanine)',
  gluten: 'amidon de blé (gluten)',
  arachide: 'huile d’arachide',
  soja: 'soja (huile ou lécithine)',
  lactose: 'lactose',
};

export const TERRAIN_LIBELLE: Record<TerrainCode, string> = {
  phenylcetonurie: 'phénylcétonurie',
  coeliaque: 'maladie cœliaque',
  allergie_ble: 'allergie au blé',
  allergie_arachide: 'allergie à l’arachide',
  allergie_soja: 'allergie au soja',
  intolerance_lactose: 'intolérance au lactose / galactose',
};

const NEGATION = /\b(pas|sans|non|aucun|aucune|exclu|exclue|negatif|negative)\b/;

/**
 * Terrains portés par une condition du patient. Pathologie : le concept du référentiel (même lecture que le
 * moteur de contre-indications) ou le libellé ; allergie / intolérance : le libellé. Une condition niée
 * (« pas d'allergie à l'arachide ») ne porte aucun terrain.
 */
export function terrainsDuTerme(t: PatientTerm): Set<TerrainCode> {
  const out = new Set<TerrainCode>();
  const n = t.norm;
  if (!n || NEGATION.test(n)) return out;
  if (t.concepts.includes('Phénylcétonurie') || /\bphenylcetonuri|\bpcu\b/.test(n)) out.add('phenylcetonurie');
  if (t.concepts.includes('Maladie cœliaque') || /coeliaqu|celiaqu|\bsprue\b/.test(n)) out.add('coeliaque');
  if (/lactose|lactase|galactos/.test(n)) out.add('intolerance_lactose');
  if (t.kind === 'allergie') {
    if (/\b(ble|froment)\b/.test(n)) out.add('allergie_ble');
    if (/gluten/.test(n)) {
      // « Intolérance au gluten » = maladie cœliaque ; « Allergie au gluten » : allergie au blé ET maladie cœliaque
      // (le libellé ne permet pas de trancher : zéro fausse réassurance).
      if (/^intolerance/.test(n)) out.add('coeliaque');
      else { out.add('allergie_ble'); out.add('coeliaque'); }
    }
    if (/arachide|cacahuet/.test(n)) out.add('allergie_arachide');
    if (/\bsoja\b/.test(n)) out.add('allergie_soja');
  }
  return out;
}

export interface ExcipientMed { id: string; nom: string }

export interface ExcipientAlert {
  medId: string;
  medNom: string;
  excipient: string;
  /** Terrains du patient en cause (libellés). */
  terrains: string[];
  /** Conditions du patient telles que saisies. */
  conditionsPatient: string[];
  severite: ExcipientSeverite;
  /** « excipient à effet notoire : aspartam — phénylcétonurie » */
  conditionLabel: string;
  description: string;
  source: string;
}

const RANG: Record<ExcipientSeverite, number> = { absolue: 2, a_evaluer: 1 };

function dateFr(d: string | null): string {
  const m = (d ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (d ?? '');
}

/** Une alerte par médicament et par excipient (la phrase la plus sévère l'emporte). */
export function evaluateExcipients(meds: ExcipientMed[], rows: MedicamentExcipient[], patient: PatientConditions): ExcipientAlert[] {
  const parTerrain = new Map<TerrainCode, string[]>();
  for (const t of patient.termes) {
    for (const c of terrainsDuTerme(t)) parTerrain.set(c, [...(parTerrain.get(c) ?? []), t.label]);
  }
  if (parTerrain.size === 0) return [];
  const out = new Map<string, ExcipientAlert>();
  for (const med of meds) {
    for (const r of rows) {
      if (r.medicament_id !== med.id) continue;
      const touches = r.terrains.filter((x): x is TerrainCode => parTerrain.has(x as TerrainCode));
      if (touches.length === 0) continue;
      const key = `${med.id}|${r.excipient}`;
      const prev = out.get(key);
      if (prev && RANG[prev.severite] >= RANG[r.severite]) continue;
      const lib = EXCIPIENT_LIBELLE[r.excipient as ExcipientCode] ?? r.excipient;
      const terrains = touches.map(x => TERRAIN_LIBELLE[x]);
      const conditionsPatient = [...new Set(touches.flatMap(x => parTerrain.get(x) ?? []))];
      out.set(key, {
        medId: med.id, medNom: med.nom, excipient: r.excipient, terrains, conditionsPatient, severite: r.severite,
        conditionLabel: `excipient à effet notoire : ${r.excipient === 'gluten' ? 'amidon de blé' : r.excipient} — ${terrains.join(', ')}`,
        description: `Excipient à effet notoire : ${lib}. Rubrique ${r.rubrique} du RCP de ${r.specialite_fr} (CIS ${r.cis}`
          + `${r.date_rcp ? `, RCP du ${dateFr(r.date_rcp)}` : ''}) : « ${r.citation.trim()} » `
          + 'Spécialité française de même marque, même forme et même dosage : vérifier la composition sur la notice de la boîte.',
        source: `RCP BDPM CIS ${r.cis} — rubrique ${r.rubrique}`,
      });
    }
  }
  return [...out.values()];
}

/** Ce que la fusion lit d'une carte déjà affichée. */
export interface ExistingExcipientAlertLike {
  type: string;
  severite: string;
  involved: string[];
  condition?: string;
}

const RANG_CARTE: Record<string, number> = { contre_indication: 2, a_evaluer: 1 };
const TERRAIN_RE: Record<string, RegExp> = {
  'phénylcétonurie': /phenylcetonuri/, 'maladie cœliaque': /coeliaqu|celiaqu/, 'allergie au blé': /\bble\b|gluten/,
  'allergie à l’arachide': /arachide/, 'allergie au soja': /\bsoja\b/, 'intolérance au lactose / galactose': /lactose|galactos|lactase/,
};
const normCarte = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/**
 * Une contre-indication de la base qui porte déjà ce terrain sur ce médicament, avec une sévérité au moins égale,
 * reçoit une ligne « Également : excipient … » au lieu d'une seconde carte.
 */
export function mergeExcipientAlerts<E extends ExistingExcipientAlertLike>(
  existing: E[], alerts: ExcipientAlert[],
): { standalone: ExcipientAlert[]; alsoByIndex: Map<number, string[]> } {
  const alsoByIndex = new Map<number, string[]>();
  const standalone: ExcipientAlert[] = [];
  for (const a of alerts) {
    const sev = a.severite === 'absolue' ? 2 : 1;
    const idx = existing.findIndex(e => e.type === 'contraindication' && e.involved[0] === a.medNom && e.condition
      && a.terrains.some(t => TERRAIN_RE[t]?.test(normCarte(e.condition!))) && (RANG_CARTE[e.severite] ?? 0) >= sev);
    if (idx < 0) { standalone.push(a); continue; }
    alsoByIndex.set(idx, [...(alsoByIndex.get(idx) ?? []), `${a.conditionLabel} (${a.source})`]);
  }
  return { standalone, alsoByIndex };
}
