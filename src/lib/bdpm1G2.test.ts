// Sprint BDPM-1, lot G2 — interactions lues dans les RCP (table interactions_rcp, lue par check_interactions_v2).
// Données : src/lib/bdpm1_g2.data.json (généré par scripts/gen_bdpm1_g2.mjs, même source que la migration).
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import data from './bdpm1_g2.data.json';

interface Ligne {
  ligne: number; action: string; niveau: string; composition: string; partenaire: string;
  molecule_cids: string[]; partenaire_cids: string[]; partenaire_classe: string | null; statut: string;
}
const lignes = data.lignes as Ligne[];
const md5 = (s: string) => createHash('md5').update(s, 'utf8').digest('hex');
const lire = (f: string) => readFileSync(new URL(`../../supabase/migrations/${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const rpcDe = (sql: string) => {
  const d = sql.indexOf('create or replace function public.check_interactions_v2');
  return sql.slice(d, sql.indexOf('$function$;', d) + '$function$;'.length);
};
const NIV: Record<string, string> = { 'contre-indique': 'contre_indiquee', deconseille: 'deconseillee' };

describe('BDPM-1 G2 — cohérence de la source', () => {
  it('empreinte « base = source » recalculée depuis la fixture', () => {
    const texte = [...lignes].sort((a, b) => a.ligne - b.ligne)
      .map(l => `${l.ligne}|${NIV[l.niveau]}|${l.action}|${[...l.molecule_cids].sort().join(',')}|${[...l.partenaire_cids].sort().join(',')}|${l.partenaire_classe ?? ''}`)
      .join('\n');
    expect(md5(texte)).toBe(data.empreinte);
  });
  it('périmètre validé : CI et déconseillé seulement, lignes relues ou auto, ajouts et relèvements', () => {
    expect(lignes).toHaveLength(534);
    expect(lignes.filter(l => l.action === 'ajout')).toHaveLength(256);
    expect(lignes.filter(l => l.action === 'relevement')).toHaveLength(278);
    for (const l of lignes) {
      expect(['contre-indique', 'deconseille'], `${l.ligne}`).toContain(l.niveau);
      expect(['relu', 'auto'], `${l.ligne}`).toContain(l.statut);
      expect(l.molecule_cids.length).toBeGreaterThan(0);
      expect(l.partenaire_cids.length > 0 || !!l.partenaire_classe).toBe(true);
      expect(l.partenaire_cids.some(c => l.molecule_cids.includes(c)), `${l.ligne} partenaire = molécule`).toBe(false);
    }
  });
  it('aucun partenaire non médicamenteux (alcool, pamplemousse, spermicides, préservatifs)', () => {
    for (const l of lignes) expect(l.partenaire.toLowerCase(), `${l.ligne}`).not.toMatch(/alcool|pamplemousse|grapefruit|spermicide|preservatif/);
  });
});

describe('BDPM-1 G2 — check_interactions_v2', () => {
  const g2 = lire('20261031130000_bdpm1_g2_interactions.sql');
  const bdd1c = rpcDe(lire('20261029120000_bdd1c_sels_neutralisation.sql'));
  it('la RPC privée des deux blocs RCP est exactement celle de BDD-1c (rien d’autre ne change)', () => {
    expect(md5(bdd1c)).toBe(data.rpc_avant_md5);
    const sansRcp = rpcDe(g2)
      .replace(data.blocs.cte, '  )\n  SELECT COALESCE(jsonb_agg(jsonb_build_object(')
      .replace(data.blocs.union, 'UNION ALL SELECT nom_a,nom_b,ing_a,ing_b,severite,niveau_ansm,description,source FROM cumul) t;');
    expect(sansRcp).toBe(bdd1c);
  });
  it('une carte RCP n’apparaît que si aucune carte ANSM / DDInter de la paire n’est au moins aussi sévère', () => {
    expect(data.blocs.union).toMatch(/NOT EXISTS \(SELECT 1 FROM ansm x WHERE x\.ma = r\.ma AND x\.mb = r\.mb/);
    expect(data.blocs.union).toMatch(/NOT EXISTS \(SELECT 1 FROM ddi_c d WHERE d\.ma = r\.ma AND d\.mb = r\.mb AND d\.rang >= r\.rang\)/);
    expect(data.blocs.cte).toMatch(/WHERE r\.exclue_motif IS NULL/);
  });
  it('chaque ligne porte sa source et le statut « à relire par un pharmacien »', () => {
    expect(g2).toMatch(/source_cis bigint not null/);
    expect(g2).toMatch(/source_url text not null/);
    expect(g2).toMatch(/source_origine text not null check \(source_origine in \('RCP BDPM', 'RCP EMA'\)\)/);
    expect(g2).toMatch(/statut_relecture text not null default 'a_relire_pharmacien'/);
    expect(g2).toMatch(/à relire par un pharmacien/);
  });
  it('aucune écriture dans ansm_regles ni interactions_ingredients', () => {
    expect(g2).not.toMatch(/(insert into|update|delete from)\s+(public\.)?(ansm_regles|interactions_ingredients)/i);
  });
});

describe('BDPM-1 G2 — relecture après chargement (migration 20261031131000)', () => {
  const corr = data.corrections as Record<string, { neutraliser?: string; partenaire_cids?: string[]; motif?: string }>;
  const actives = lignes.filter(l => !corr[l.ligne]?.neutraliser);
  it('82 neutralisées (jamais supprimées), 11 partenaires corrigés, 452 actives', () => {
    expect(Object.values(corr).filter(c => c.neutraliser)).toHaveLength(82);
    expect(Object.values(corr).filter(c => c.partenaire_cids)).toHaveLength(11);
    expect(actives).toHaveLength(452);
  });
  it('empreinte après relecture recalculée depuis la fixture', () => {
    const texte = [...lignes].sort((a, b) => a.ligne - b.ligne).map(l => {
      const c = corr[l.ligne] ?? {};
      const p = c.partenaire_cids ?? l.partenaire_cids;
      return `${l.ligne}|${NIV[l.niveau]}|${l.action}|${[...l.molecule_cids].sort().join(',')}|${[...p].sort().join(',')}|${l.partenaire_classe ?? ''}|${c.neutraliser ? 'neutralisee' : 'active'}`;
    }).join('\n');
    expect(md5(texte)).toBe(data.empreinte_relecture);
  });
  it('aucune CI active « IEC × valsartan seul » : le partenaire est le sacubitril', () => {
    for (const l of actives) {
      if (l.partenaire === 'valsartan' && /pril/i.test(l.composition)) expect(corr[l.ligne]?.partenaire_cids, `${l.ligne}`).toBeTruthy();
    }
  });
  it('estroprogestatifs : ni ritonavir, ni sofosbuvir, ni velpatasvir seuls en contre-indication', () => {
    for (const l of actives) {
      if (/ETHINYLESTRADIOL/.test(l.composition)) expect(l.partenaire, `${l.ligne}`).not.toMatch(/^(ritonavir|sofosbuvir|velpatasvir)$/);
    }
  });
});
