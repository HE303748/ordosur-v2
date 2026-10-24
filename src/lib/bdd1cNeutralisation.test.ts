// Sprint BDD-1c — sels regroupés + neutralisation des « contre-indications » contradictoires du second import DDInter.
// Données : src/lib/bdd1c_neutralisation.data.json (généré par scripts/gen_bdd1c_neutralisation.mjs,
// même source que la migration). Aucun accès à la base.
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import data from './bdd1c_neutralisation.data.json';
import bdd1 from './bdd1_equivalences.data.json';

const octets = (a: string, b: string) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
const md5 = (s: string) => createHash('md5').update(s, 'utf8').digest('hex');
const paire = (a: string, b: string) => (octets(a, b) <= 0 ? `${a}|${b}` : `${b}|${a}`);

/** Référentiel complet : BDD-1 + sels BDD-1c. */
const canoniqueDe = new Map<string, string>();
for (const g of bdd1.groupes) for (const n of [g.canonique, ...g.membres]) canoniqueDe.set(n, g.canonique);
for (const g of data.groupes_sels) for (const n of [g.canonique, ...g.membres]) canoniqueDe.set(n, g.canonique);

describe('BDD-1c — référentiel (BDD-1 + sels)', () => {
  it('empreinte « base = source » du référentiel complet', () => {
    const texte = [...canoniqueDe].sort((x, y) => octets(x[0], y[0])).map(([n, c]) => `${n}|${c}`).join('\n');
    expect(md5(texte)).toBe(data.empreinte_referentiel);
  });

  it.each([
    ['esomeprazole magnesium', 'esomeprazole'], ['esomeprazole magnesium dihydrate', 'esomeprazole'],
    ['vardenafil trihydrate', 'vardenafil'], ['clopidogrel bisulfate', 'clopidogrel'],
  ])('%s est rattaché à %s', (membre, canonique) => {
    expect(canoniqueDe.get(membre)).toBe(canonique);
    expect(canoniqueDe.get(canonique)).toBe(canonique);
  });

  it('les énantiomères restent séparés (ésoméprazole ≠ oméprazole) et aucune paire interdite n’est réunie', () => {
    expect(canoniqueDe.get('omeprazole')).not.toBe(canoniqueDe.get('esomeprazole'));
    for (const [a, b] of bdd1.interdits) {
      const ca = canoniqueDe.get(a);
      expect(ca !== undefined && ca === canoniqueDe.get(b), `${a} / ${b}`).toBe(false);
    }
  });
});

describe('BDD-1c — neutralisation et mise en revue', () => {
  it('empreintes recalculées depuis la fixture', () => {
    expect(md5(data.neutralisation.map(x => `${paire(x.a, x.b)}|${x.motif}`).sort(octets).join('\n'))).toBe(data.empreinte_neutralisation);
    expect(md5(data.revue.map(x => paire(x.a, x.b)).sort(octets).join('\n'))).toBe(data.empreinte_revue);
  });

  it('listes explicites, sans doublon ni recouvrement', () => {
    const n = data.neutralisation.map(x => paire(x.a, x.b));
    const r = data.revue.map(x => paire(x.a, x.b));
    expect(new Set(n).size).toBe(n.length);
    expect(new Set(r).size).toBe(r.length);
    expect(n.filter(k => r.includes(k))).toEqual([]);
    expect(data.revue_apres).toBe(data.revue_avant + data.revue.length);
  });

  it('garde-fou assoupli : exactement les 2 lignes amoxicilline × ésoméprazole magnésium, motif RCP', () => {
    const rcp = data.neutralisation.filter(x => x.src === 'rcp');
    expect(rcp.map(x => paire(x.a, x.b)).sort()).toEqual(
      [paire('amoxicillin', 'esomeprazole magnesium'), paire('amoxicillin', 'esomeprazole magnesium dihydrate')].sort());
    for (const x of rcp) expect(x.motif).toMatch(/^Contredit par le RCP de l'ésoméprazole .* — BDD-1c$/);
    for (const x of data.neutralisation.filter(y => y.src !== 'rcp')) {
      expect(x.motif).toMatch(/^Second import DDInter contredit par (DDInter d'origine|ANSM|DDInter d'origine \+ ANSM) — BDD-1c$/);
    }
  });

  it('toutes les lignes du second import sur ésoméprazole magnésium et clopidogrel bisulfate sont neutralisées', () => {
    const k = new Set(data.neutralisation.map(x => paire(x.a, x.b)));
    for (const [a, b] of [
      ['esomeprazole magnesium', 'clarithromycin'], ['esomeprazole magnesium', 'rifampin'],
      ['esomeprazole magnesium dihydrate', 'clarithromycin'], ['esomeprazole magnesium dihydrate', 'rifampin'],
      ['clopidogrel bisulfate', 'esomeprazole'], ['clopidogrel bisulfate', 'omeprazole'],
    ]) expect(k.has(paire(a, b)), `${a} × ${b}`).toBe(true);
  });

  it('chaque ligne mise en revue porte sur un sel regroupé', () => {
    const sels = new Set(data.groupes_sels.flatMap(g => g.membres));
    for (const x of data.revue) expect(sels.has(x.a) || sels.has(x.b), `${x.a} × ${x.b}`).toBe(true);
  });
});

describe('BDD-1c — migration', () => {
  const sql = readFileSync(new URL('../../supabase/migrations/20261029120000_bdd1c_sels_neutralisation.sql', import.meta.url), 'utf8');
  const code = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n');

  it('porte les empreintes et les compteurs de la source', () => {
    for (const e of [data.empreinte_referentiel, data.empreinte_neutralisation, data.empreinte_revue]) expect(sql).toContain(e);
    expect(sql).toContain(`if v_n <> ${data.revue_avant} then`);
    expect(sql).toContain(`if v_n <> ${data.revue_apres} then`);
    expect(sql).toContain(`if v_n <> ${data.neutralisation.length} then`);
    expect(sql).toContain(bdd1.empreinte); // état de départ = référentiel BDD-1
  });

  it('RPC : seule la clause exclue_motif est ajoutée au texte de BDD-1', () => {
    const rpc = code.slice(code.indexOf('create or replace function public.check_interactions_v2'), code.indexOf('$function$;'));
    expect(rpc).toContain('WHERE ii.exclue_motif IS NULL\n      AND (NOT ii.revue_requise OR (a.direct AND b.direct))');
    expect(rpc.match(/a\.cid <> b\.cid/g)?.length).toBe(3);
    expect(rpc).toContain('x.rang >= d.rang');
  });

  it('vue : une ligne neutralisée ne rend plus une substance parlante', () => {
    expect(code).toContain('where (ii.ingredient_1 = g.id or ii.ingredient_2 = g.id) and ii.exclue_motif is null');
  });

  it('aucune suppression, aucune sévérité ni description modifiée', () => {
    expect(code).not.toMatch(/\bdelete from\b/i);
    expect(code).not.toMatch(/set\s+(severite|description|ingredient_)/i);
    expect(code).not.toMatch(/medicament_ingredients\s+set/i);
    expect(code).toContain('raise exception \'BDD-1c : % × % — la source déclarée (%) ne couvre pas la paire — STOP\'');
    expect(code).toContain("continue when r.src = 'rcp';");
  });
});
