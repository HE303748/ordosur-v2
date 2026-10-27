// Sprint BDPM-1, lot G3 — contre-indications, grossesse et allaitement lus dans les RCP ; neutralisation réversible.
// Données : src/lib/bdpm1_g3.data.json (généré par scripts/gen_bdpm1_g3.mjs, même source que les migrations).
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import data from './bdpm1_g3.data.json';
import concepts from './ci_condition_concepts.data.json';

interface Ajout { ref: string; composition: string; cle: string; condition_type: string; condition_valeur: string; severite: string; sexe: string | null }
const ajouts = data.ajouts as Ajout[];
const motifs = data.motifs as Record<string, string>;
const md5 = (s: string) => createHash('md5').update(s, 'utf8').digest('hex');
const formulations = new Map((concepts.concepts as Array<{ condition_valeur: string; traitement: string }>).map(c => [c.condition_valeur, c.traitement]));

describe('BDPM-1 G3 — cohérence de la source', () => {
  it('empreinte « base = source » recalculée depuis la fixture', () => {
    const lignes = [
      ...ajouts.map(a => `${a.ref}|${motifs[a.composition]}|${a.condition_type}|${a.condition_valeur}|${a.severite}|${a.sexe ?? ''}`),
      ...data.releves.map(r => `releve|${r.ci_id}|absolue`),
      ...data.neutralisations.map(n => `neutralise|${n.ci_id}`),
      ...data.copies.map(c => `${c.ref}|${c.dci_pattern}`),
      ...data.copies_neutralisees.map(c => `copie_neutralisee|${c.ref}`),
    ].sort();
    expect(md5(lignes.join('\n'))).toBe(data.empreinte);
  });
  it('chaque formulation employée existe dans ci_condition_concepts (ou est une allergie déjà en base)', () => {
    for (const a of ajouts) {
      if (a.condition_type === 'allergie_med') continue;
      expect(formulations.has(a.condition_valeur), a.condition_valeur).toBe(true);
    }
    for (const f of data.formulations_nouvelles) expect(formulations.get(f.condition_valeur), f.condition_valeur).toBe('concept');
  });
});

describe('BDPM-1 G3 — règles du lot', () => {
  it('grossesse et allaitement passent par le canal du statut déclaré (sexe F, formulation de grossesse / allaitement)', () => {
    const g = ajouts.filter(a => a.cle === 'grossesse' || a.cle === 'allaitement');
    expect(g.length).toBe(data.compte.grossesse_allaitement);
    for (const a of g) {
      expect(a.sexe, a.ref).toBe('F');
      expect(['grossesse', 'allaitement'], a.condition_valeur).toContain(formulations.get(a.condition_valeur));
    }
    for (const a of ajouts.filter(x => x.cle !== 'grossesse' && x.cle !== 'allaitement')) expect(a.sexe, a.ref).toBeNull();
  });
  it('motif = molécule de la composition, jamais une classe', () => {
    const CLASSE = /(^|\|)(ains|statines?|diuretiques?|corticoides?|penicillines?|cephalosporines?|antivitamines?|anticoagulants?|betabloquants?|imao|iec|sartans?|quinolones?|macrolides?)(\||$)/;
    for (const [c, m] of Object.entries(motifs)) {
      expect(m, c).not.toMatch(CLASSE);
      for (const p of m.split('|')) expect(p.length, `${c} : ${p}`).toBeGreaterThan(3);
    }
  });
  it('neutralisation réversible : motif « Contredit par le RCP — BDPM-1 », lignes de classe recréées molécule par molécule', () => {
    const neutres = new Set(data.neutralisations.map(n => n.ci_id));
    for (const n of data.neutralisations) expect(n.motif).toMatch(/^Contredit par le RCP — BDPM-1/);
    for (const c of data.copies) {
      expect(neutres.has(c.source_ci_id), c.ref).toBe(true);
      expect(c.dci_pattern.length).toBeGreaterThan(3);
    }
  });
  it('G3e : une copie ne réatteint jamais la molécule contredite seule (amoxicilline → Clamoxyl)', () => {
    const refs = new Set(data.copies.map(c => c.ref));
    for (const n of data.copies_neutralisees) expect(refs.has(n.remplacee_par), n.ref).toBe(true);
    const actives = data.copies.filter(c => !data.copies_neutralisees.some(n => n.ref === c.ref));
    for (const c of actives.filter(x => x.source_ci_id.startsWith('a3890e11'))) {
      expect(c.dci_pattern.split('|'), c.ref).not.toContain('amoxicilline trihydratee');
      expect(c.dci_pattern.split('|'), c.ref).not.toContain('amoxicilline');
    }
  });
  it('le Vérificateur ne charge jamais une ligne neutralisée', () => {
    const src = readFileSync(new URL('../pages/DoctorDashboard.tsx', import.meta.url), 'utf8');
    expect(src).toMatch(/from\('contraindications'\)\.select\('\*'\)\.is\('exclue_motif', null\)/);
  });
  it('aucune suppression de contre-indication dans les migrations G3', () => {
    for (const f of ['20261031140000_bdpm1_g3a_ci.sql', '20261031141000_bdpm1_g3b_grossesse.sql', '20261031142000_bdpm1_g3c_releves.sql', '20261031143000_bdpm1_g3d_copies_complement.sql', '20261031144000_bdpm1_g3e_copie_amoxicilline.sql']) {
      const sql = readFileSync(new URL(`../../supabase/migrations/${f}`, import.meta.url), 'utf8');
      expect(sql, f).not.toMatch(/delete\s+from\s+(public\.)?contraindications/i);
      expect(sql, f).not.toMatch(/severite\s*=\s*'relative'\s*,/i);
    }
  });
});
