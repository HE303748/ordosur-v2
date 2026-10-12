// Sprint BDD-1 — référentiel de substances unique (équivalences FR/EN, sels, promédicaments).
// Données : src/lib/bdd1_equivalences.data.json (généré par scripts/gen_bdd1_equivalences.mjs,
// même source que la migration). Aucun accès à la base.
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import data from './bdd1_equivalences.data.json';

interface Origine { membres: string[]; confiance: string; type: string; justification: string }
interface Groupe { canonique: string; membres: string[]; origines: Origine[] }
const groupes = data.groupes as Groupe[];
const interdits = data.interdits as [string, string][];
const tous = (g: Groupe) => [g.canonique, ...g.membres];

/** substance → canonique de son groupe */
const canoniqueDe = new Map<string, string>();
for (const g of groupes) for (const n of tous(g)) canoniqueDe.set(n, g.canonique);
const memeGroupe = (a: string, b: string) => canoniqueDe.has(a) && canoniqueDe.get(a) === canoniqueDe.get(b);

describe('BDD-1 — cohérence de la source', () => {
  it('empreinte « base = source » recalculée depuis la fixture', () => {
    const octets = (a: string, b: string) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
    const texte = [...canoniqueDe].sort((x, y) => octets(x[0], y[0])).map(([n, c]) => `${n}|${c}`).join('\n');
    expect(createHash('md5').update(texte, 'utf8').digest('hex')).toBe(data.empreinte);
  });

  it('chaque groupe a un seul canonique et au moins un autre membre', () => {
    const canoniques = groupes.map(g => g.canonique);
    expect(new Set(canoniques).size).toBe(canoniques.length);
    for (const g of groupes) {
      expect(g.membres.length, g.canonique).toBeGreaterThan(0);
      expect(g.membres, g.canonique).not.toContain(g.canonique);
      expect(new Set(g.membres).size, g.canonique).toBe(g.membres.length);
    }
  });

  it('aucune substance ne figure dans deux groupes (pas de chaîne de canoniques)', () => {
    const noms = groupes.flatMap(tous);
    expect(new Set(noms).size).toBe(noms.length);
  });

  it('aucun identifiant technique ddinterNNNN, aucune association, aucune fiche de voie locale', () => {
    for (const n of canoniqueDe.keys()) {
      expect(n, n).not.toMatch(/^ddinter\d+$/i);
      expect(n, n).not.toMatch(/,| and | \/ /);
      expect(n, n).not.toMatch(/ (topical|nasal|ophthalmic|otic)$/);
    }
  });

  it('périmètre du premier passage : « certain », ou « probable » de type sel / promédicament', () => {
    for (const g of groupes) for (const o of g.origines) {
      const ok = o.confiance === 'certain' || (o.confiance === 'probable' && ['sel', 'promedicament'].includes(o.type));
      expect(ok, `${g.canonique} (${o.confiance}/${o.type})`).toBe(true);
    }
  });
});

describe('BDD-1 — pièges exclus', () => {
  it('aucune paire interdite (énantiomères, molécules voisines, HBPM, conjugués) dans un même groupe', () => {
    expect(interdits.length).toBeGreaterThan(30);
    for (const [a, b] of interdits) expect(memeGroupe(a, b), `${a} / ${b}`).toBe(false);
  });

  it.each([
    ['omeprazole', 'esomeprazole'], ['cetirizine', 'levocetirizine'], ['citalopram', 'escitalopram'],
    ['ketoprofen', 'dexketoprofene trometamol'], ['heparin', 'enoxaparin'], ['trastuzumab', 'trastuzumab emtansine'],
  ])('%s et %s restent deux substances', (a, b) => {
    expect(memeGroupe(a, b)).toBe(false);
  });

  it('les fiches « sel » aux lignes DDInter à relire ne sont pas groupées', () => {
    for (const n of ['esomeprazole magnesium', 'clopidogrel bisulfate', 'vardenafil trihydrate', 'citalopram hydrobromide',
      'paroxetine hemihydrate', 'tenofovir', 'mycophenolic acid']) {
      expect(canoniqueDe.has(n), n).toBe(false);
    }
  });
});

describe('BDD-1 — groupes attendus', () => {
  it.each([
    ['metformin', 'metformine'], ['amoxicillin', 'amoxicilline'], ['valproate', 'valproic acid'],
    ['hydroxyurea', 'hydroxycarbamide'], ['acyclovir', 'aciclovir'], ['oméprazole', 'omeprazole'],
    ['clarithromycin', 'clarithromycine'], ['acetylsalicylic acid', 'aspirin'], ['aspirine', 'aspirin'],
    ['rifampin', 'rifampicine'], ['methotrimeprazine', 'levomepromazine'], ['dabigatran etexilate', 'dabigatran'],
    ['magnesium heptahydrate', 'magnesium sulfate'], ['heparine calcique', 'heparine sodique'],
  ])('%s est rattaché à %s', (membre, canonique) => {
    expect(canoniqueDe.get(membre)).toBe(canonique);
    expect(canoniqueDe.get(canonique)).toBe(canonique);
  });
});

describe('BDD-1 — migration', () => {
  const sql = readFileSync(new URL('../../supabase/migrations/20261026120000_bdd1_equivalences.sql', import.meta.url), 'utf8');

  it('porte l\'empreinte de la source et le nombre de lignes à relire', () => {
    expect(sql).toContain(`Empreinte de la source : ${data.empreinte}`);
    expect(sql).toContain(`if v_revue <> ${data.lignes_revue_attendues} then`);
  });

  it('la RPC compare les canoniques, jamais les ids bruts', () => {
    const rpc = sql.slice(sql.indexOf('create or replace function public.check_interactions_v2'), sql.indexOf('-- 8. Vue'));
    expect(rpc).not.toMatch(/a\.ingredient_id\s*<>\s*b\.ingredient_id/);
    expect(rpc.match(/a\.cid <> b\.cid/g)?.length).toBe(3); // ANSM, DDInter, cumul
    expect(rpc).toContain('WHERE NOT ii.revue_requise OR (a.direct AND b.direct)');
    expect(rpc).toContain('x.rang >= d.rang');
  });

  it('ne supprime aucun lien spécialité → ingrédient et aucun ingrédient réel', () => {
    expect(sql).not.toMatch(/delete from medicament_ingredients/i);
    expect(sql).not.toMatch(/update medicament_ingredients/i);
    const suppressions = sql.match(/delete from ingredients[^;]*;/gi) ?? [];
    expect(suppressions).toEqual(["delete from ingredients where name_en in ('__test_a__', '__test_b__');"]);
  });
});
