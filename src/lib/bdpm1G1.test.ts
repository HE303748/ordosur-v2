// Sprint BDPM-1, lot G1 — fiches MA reliées à une autre substance que la marque, synonyme « trauma ».
// Données : src/lib/bdpm1_g1.data.json (généré par scripts/gen_bdpm1_g1.mjs, même source que la migration).
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import data from './bdpm1_g1.data.json';
import concepts from './ci_condition_concepts.data.json';
import allergies from './regles_allergies.data.json';
import { buildConditionMatcher, analysePatientTerm } from './conditionMatcher';

interface Ligne {
  marque: string; id: string; nom: string; preuve: string;
  dci_avant: string | null; dci: string | null;
  ingredients_avant: string[]; ingredients: string[]; quarantaine: string[];
}
const lignes = data.lignes as Ligne[];
const ING = data.ingredients as Record<string, string>;
const marque = (m: string) => lignes.filter(l => l.marque === m);

describe('BDPM-1 G1 — cohérence de la source', () => {
  it('empreinte « base = source » recalculée depuis la fixture', () => {
    const texte = [...lignes].sort((a, b) => (a.id < b.id ? -1 : 1))
      .map(l => `${l.id}|${l.dci ?? ''}|${l.ingredients.map(n => ING[n]).sort().join(',')}`).join('\n');
    expect(createHash('md5').update(texte, 'utf8').digest('hex')).toBe(data.empreinte);
  });
  it('14 fiches corrigées, 7 non appliquées, aucune dans les deux listes', () => {
    expect(lignes).toHaveLength(14);
    expect(data.non_appliquees).toHaveLength(7);
    const ids = new Set(lignes.map(l => l.id));
    for (const n of data.non_appliquees) expect(ids.has(n.id), n.marque).toBe(false);
  });
  it('tout lien retiré part en quarantaine (jamais de suppression sèche)', () => {
    for (const l of lignes) {
      const retires = l.ingredients_avant.filter(n => !l.ingredients.includes(n)).sort();
      expect(l.quarantaine, l.nom).toEqual(retires);
    }
  });
});

describe('BDPM-1 G1 — cas de contrôle', () => {
  it('ENDOXAN (×3) → cyclophosphamide seule', () => {
    expect(marque('ENDOXAN')).toHaveLength(3);
    for (const l of marque('ENDOXAN')) { expect(l.ingredients).toEqual(['cyclophosphamide']); expect(l.dci).toBe('CYCLOPHOSPHAMIDE'); }
  });
  it('FUCIDINE → acide fusidique seul', () => {
    for (const l of marque('FUCIDINE')) expect(l.ingredients).toEqual(['acide fusidique']);
  });
  it('JANUMET (×3) → sitagliptine + metformine', () => {
    expect(marque('JANUMET')).toHaveLength(3);
    for (const l of marque('JANUMET')) { expect(l.ingredients).toEqual(['metformine', 'sitagliptin']); expect(l.dci).toMatch(/METFORMINE/); }
  });
  it('SECTRAL → acébutolol seul', () => {
    for (const l of marque('SECTRAL')) expect(l.ingredients).toEqual(['acebutolol']);
  });
  it('ESPERAL et ANDROCUR ne sont PAS reliés à la substance française', () => {
    const non = data.non_appliquees.map(n => n.marque);
    expect(non.filter(m => m === 'ESPERAL')).toHaveLength(4);
    expect(non).toContain('ANDROCUR');
  });
});

describe('BDPM-1 G1 — synonyme « trauma » de l’ESPT', () => {
  const curees = concepts.curees as Array<{ nom_fr: string; synonymes: string | null }>;
  it('le référentiel ne contient plus « trauma » comme synonyme', () => {
    const espt = curees.find(c => c.nom_fr === data.synonyme.nom);
    expect(espt?.synonymes).toBe(data.synonyme.apres);
    expect((espt?.synonymes ?? '').split(',').map(s => s.trim())).not.toContain('trauma');
  });
  it('un libellé patient « Trauma » n’est plus relié au concept ESPT ; « ESPT » l’est toujours', () => {
    const d = buildConditionMatcher(concepts.concepts as never, curees as never, allergies.familles as never);
    expect(analysePatientTerm('Trauma', 'pathologie', d).concepts).not.toContain(data.synonyme.nom);
    expect(analysePatientTerm('ESPT', 'pathologie', d).concepts).toContain(data.synonyme.nom);
  });
});
