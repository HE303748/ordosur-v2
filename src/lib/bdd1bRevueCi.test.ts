// Sprint BDD-1b — contre-indications DDInter du second import mises en revue (revue_requise = true).
// Données : src/lib/bdd1b_revue_ci.data.json (généré par scripts/gen_bdd1b_revue_ci.mjs,
// même source que la migration). Aucun accès à la base.
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import data from './bdd1b_revue_ci.data.json';

interface Ligne { a: string; b: string; paires_ma_avant: number; paires_ma_apres: number }
const lignes = data.lignes as Ligne[];
const octets = (x: string, y: string) => Buffer.compare(Buffer.from(x, 'utf8'), Buffer.from(y, 'utf8'));
const cle = (l: Ligne) => (octets(l.a, l.b) <= 0 ? `${l.a}|${l.b}` : `${l.b}|${l.a}`);

describe('BDD-1b — cohérence de la source', () => {
  it('empreinte « base = source » recalculée depuis la fixture', () => {
    const texte = lignes.map(cle).sort(octets).join('\n');
    expect(createHash('md5').update(texte, 'utf8').digest('hex')).toBe(data.empreinte);
  });

  it('liste explicite, sans doublon ni paire réflexive', () => {
    const cles = lignes.map(cle);
    expect(new Set(cles).size).toBe(cles.length);
    for (const l of lignes) expect(l.a, l.a).not.toBe(l.b);
    expect(data.revue_apres).toBe(data.revue_avant + lignes.length);
  });

  it('chaque ligne touche de nouvelles paires de spécialités MA depuis BDD-1 (sinon hors périmètre)', () => {
    for (const l of lignes) expect(l.paires_ma_apres, `${l.a} × ${l.b}`).toBeGreaterThan(l.paires_ma_avant);
  });

  it('cas cliniques du sprint présents (trithérapie anti-H. pylori, rifampicine)', () => {
    const cles = new Set(lignes.map(cle));
    for (const [a, b] of [['amoxicillin', 'esomeprazole magnesium'], ['omeprazole', 'rifampin'],
      ['clopidogrel', 'rifampin'], ['lansoprazole', 'rifampin'], ['haloperidol', 'rifampin'], ['rifampin', 'theophylline']]) {
      expect(cles.has(octets(a, b) <= 0 ? `${a}|${b}` : `${b}|${a}`), `${a} × ${b}`).toBe(true);
    }
  });
});

describe('BDD-1b — migration', () => {
  const sql = readFileSync(new URL('../../supabase/migrations/20261028120000_bdd1b_revue_ci_ddinter.sql', import.meta.url), 'utf8');

  it('porte l’empreinte de la source et les compteurs attendus', () => {
    expect(sql).toContain(data.empreinte);
    expect(sql).toContain(`v_revue <> ${data.revue_avant}`);
    expect(sql).toContain(`v_revue <> ${data.revue_apres}`);
  });

  it('ne touche que revue_requise : ni sévérité, ni description, ni suppression', () => {
    const code = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
    expect(code).not.toMatch(/\bdelete\b/i);
    expect(code).not.toMatch(/set\s+(severite|description|ingredient_)/i);
    expect(code.match(/^update /gim)?.length).toBe(1);
    expect(code).toMatch(/update interactions_ingredients ii set revue_requise = true/);
  });
});
