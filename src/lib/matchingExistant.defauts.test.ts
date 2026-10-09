import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Sprint 6B — CONSTAT (sans correction) de deux défauts du matching EXISTANT des
// contre-indications par pathologies (DoctorDashboard.tsx, bloc conditionTerms).
// Ces tests décrivent le comportement ACTUEL : ils passent tant que le défaut existe.
// Le Sprint 2b, qui corrigera le matching, devra inverser les attentes marquées « DÉFAUT ».
//
// Le matching n'est pas exporté (il vit dans le composant). On en reproduit ici la règle
// « nom de pathologie », et on VÉRIFIE que le code source contient toujours exactement cette
// règle : si elle change, ce test échoue et doit être revu avec le correctif.

const SRC = readFileSync(new URL('../pages/DoctorDashboard.tsx', import.meta.url), 'utf8');

/** Normalisation du moteur (copie de `norm` dans runCheck). */
const norm = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Règle « nom » de condMatch (les synonymes ne font qu'AJOUTER des correspondances). */
function condMatchNom(pathologie: string, conditionValeur: string): boolean {
  const pc = norm(pathologie), cv = norm(conditionValeur);
  return pc.includes(cv) || cv.includes(pc) || (cv.length > 6 && pc.includes(cv.slice(0, Math.min(cv.length, 14))));
}

// Formulations « fonction rénale » présentes en base (108 lignes — diagnostic du 09/10/2026).
const CI_RENALES: Array<[string, number]> = [
  ['Insuffisance rénale chronique stade 3', 37],
  ['Insuffisance rénale sévère (DFG < 30 mL/min)', 30],
  ['Insuffisance rénale chronique stade 4', 15],
  ['Insuffisance rénale chronique stade 4-5', 13],
  ['Insuffisance rénale chronique stade 4-5 (DFG < 30)', 3],
  ['Insuffisance rénale chronique stade 3b-5 (DFG < 45)', 2],
  ['Insuffisance rénale chronique stade 5 (DFG < 15)', 2],
  ['Insuffisance rénale chronique stade 5', 2],
  ['Insuffisance rénale chronique stade 3-5', 1],
  ['Insuffisance rénale chronique stade 5 (dialyse)', 1],
  ['Dialyse', 1],
  ['Insuffisance rénale aiguë oligurique (sans hypervolémie)', 1],
];
const lignes = (pathologie: string) => CI_RENALES.filter(([cv]) => condMatchNom(pathologie, cv)).reduce((n, [, k]) => n + k, 0);

describe('le test porte bien sur le code réel', () => {
  it('la règle de correspondance reproduite ici est celle du moteur, à l’identique', () => {
    expect(SRC).toContain('pc.includes(cv) || cv.includes(pc) ||');
    expect(SRC).toContain('(cv.length > 6 && pc.includes(cv.slice(0, Math.min(cv.length, 14))))');
    expect(SRC).toContain("s.normalize('NFD').replace(/\\p{Diacritic}/gu, '').toLowerCase()");
    expect(SRC).toContain(".replace(/[^a-z0-9 ]/g, ' ').replace(/\\s+/g, ' ').trim();");
  });
  it('le préfixe de 14 caractères d’une CI rénale est « insuffisance r »', () => {
    expect(norm('Insuffisance rénale chronique stade 3').slice(0, 14)).toBe('insuffisance r');
  });
});

describe('DÉFAUT 1 — « Insuffisance respiratoire » déclenche les CI rénales', () => {
  it('DÉFAUT : la pathologie « Insuffisance respiratoire chronique » correspond aux CI d’insuffisance rénale', () => {
    expect(condMatchNom('Insuffisance respiratoire chronique', 'Insuffisance rénale chronique stade 3')).toBe(true);
    expect(condMatchNom('Insuffisance respiratoire', 'Insuffisance rénale sévère (DFG < 30 mL/min)')).toBe(true);
    // 107 des 108 lignes rénales de la base (toutes sauf « Dialyse »).
    expect(lignes('Insuffisance respiratoire chronique')).toBe(107);
  });
  it('cause : le préfixe commun « insuffisance r » ; les autres « insuffisance … » ne sont pas touchées', () => {
    expect(lignes('Insuffisance cardiaque')).toBe(0);
    expect(lignes('Insuffisance hépatique sévère')).toBe(0);
    expect(lignes('Insuffisance surrénalienne')).toBe(0);
    expect(lignes('BPCO')).toBe(0);
  });
});

describe('DÉFAUT 2 — le stade n’est pas distingué', () => {
  it('DÉFAUT : « IRC stade 3 » déclenche les CI réservées aux stades 4, 5 et « sévère »', () => {
    const p = 'Insuffisance rénale chronique stade 3';
    expect(condMatchNom(p, 'Insuffisance rénale chronique stade 4')).toBe(true);
    expect(condMatchNom(p, 'Insuffisance rénale chronique stade 4-5')).toBe(true);
    expect(condMatchNom(p, 'Insuffisance rénale chronique stade 5 (DFG < 15)')).toBe(true);
    expect(condMatchNom(p, 'Insuffisance rénale sévère (DFG < 30 mL/min)')).toBe(true);
    // 107 lignes déclenchées, dont 69 qui ne visent pas le stade 3 (stades 4, 5, sévère, 3b-5, aiguë).
    expect(lignes(p)).toBe(107);
    expect(lignes(p) - 37 - 1).toBe(69); // hors « stade 3 » (37) et « stade 3-5 » (1)
  });
  it('même défaut pour une pathologie saisie sans stade', () => {
    expect(lignes('Insuffisance rénale')).toBe(107);
    expect(lignes('Insuffisance rénale chronique')).toBe(107);
  });
  it('seule « Dialyse » échappe au préfixe (libellé court, sans « insuffisance »)', () => {
    expect(condMatchNom('Insuffisance rénale chronique stade 3', 'Dialyse')).toBe(false);
    expect(condMatchNom('Hémodialyse', 'Dialyse')).toBe(true);
  });
});
