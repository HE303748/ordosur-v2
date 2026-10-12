// Sprint BDD-0 — correctifs de mapping médicament → ingrédients.
// Données : src/lib/bdd0_mapping_fixes.data.json (généré par scripts/gen_bdd0_mapping_fixes.mjs,
// même source que la migration). Aucun accès à la base.
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import data from './bdd0_mapping_fixes.data.json';
import { evaluateRenal, renalClasses, renalStatus, type RegleRenale, type RenalClasse } from './renalEngine';
import type { ExamRef } from './examSearch';
import type { EngineMed } from './antecedentEngine';
import examData from './examens_reference.data.json';
import renalData from './regles_renales.data.json';

interface Ligne {
  cas: string; id: string; nom: string;
  dci_avant: string | null; dci: string | null;
  ingredients_avant: string[]; ingredients: string[];
}
const lignes = data.lignes as Ligne[];
const ING = data.ingredients as Record<string, string>;
const du = (cas: string) => lignes.filter(l => l.cas === cas);
const ligne = (nom: string) => {
  const l = lignes.find(x => x.nom === nom);
  if (!l) throw new Error(`ligne absente : ${nom}`);
  return l;
};
const norm = (s: string | null) => (s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Contre-ions : jamais seuls quand la DCI désigne le sel d'une autre molécule.
const CONTRE_IONS = ['sodium', 'potassium', 'calcium', 'magnesium', 'lysine', 'dl-lysine', 'arginine', 'zinc'];
/** « SODIUM (VALPROATE DE) » ou « FOLINATE DE CALCIUM » : sel d'une autre molécule. */
const selDUneAutreMolecule = (dci: string | null) => {
  const d = norm(dci);
  return CONTRE_IONS.some(ion =>
    new RegExp(`^${ion} \\([a-z]+ate( de)?\\)`).test(d) || new RegExp(`[a-z]+ate de ${ion}`).test(d));
};
const contreIonSeul = (l: Ligne) => l.ingredients.length > 0 && l.ingredients.every(i => CONTRE_IONS.includes(norm(i)));

describe('BDD-0 — cohérence de la source', () => {
  it('empreinte « base = source » recalculée depuis la fixture', () => {
    const texte = [...lignes].sort((a, b) => (a.id < b.id ? -1 : 1))
      .map(l => `${l.id}|${l.dci ?? ''}|${l.ingredients.map(n => ING[n]).sort().join(',')}`).join('\n');
    expect(createHash('md5').update(texte, 'utf8').digest('hex')).toBe(data.empreinte);
  });
  it('chaque ligne est unique et chaque ingrédient est connu', () => {
    expect(new Set(lignes.map(l => l.id)).size).toBe(lignes.length);
    for (const l of lignes) for (const n of [...l.ingredients, ...l.ingredients_avant]) expect(ING[n], `${l.nom} : ${n}`).toBeTruthy();
  });
});

describe('BDD-0 — un test par cas', () => {
  it('a. Depakine (×4) : les deux jumeaux du valproate, plus de sodium', () => {
    expect(du('a')).toHaveLength(4);
    for (const l of du('a')) expect(l.ingredients, l.nom).toEqual(['valproate', 'valproic acid']);
  });
  it('b. Hyalgan : acide hyaluronique, plus de sodium', () => {
    expect(ligne('HYALGAN 20 MG / 2 ML, Solution Injectable pour usage intra-articulaire en seringue pré-remplie').ingredients)
      .toEqual(['hyaluronic acid']);
  });
  it('b. Folinate de calcium (×10) : leucovorin + acide folinique, plus de calcium', () => {
    const fol = du('b').filter(l => /FOLINATE/.test(l.dci ?? ''));
    expect(fol).toHaveLength(10);
    for (const l of fol) expect(l.ingredients, l.nom).toEqual(['acide folinique', 'leucovorin']);
  });
  it('c. Kogenate (×3) : octocog alfa, DCI corrigée, plus de clarithromycine', () => {
    expect(du('c')).toHaveLength(3);
    for (const l of du('c')) {
      expect(l.ingredients, l.nom).toEqual(['octocog alfa']);
      expect(l.dci).toBe('OCTOCOG ALFA');
    }
  });
  it('d. Klonopin : aucun ingrédient, DCI vidée (pas de clonazépam inventé)', () => {
    const l = ligne('KLONOPIN');
    expect(l.ingredients).toEqual([]);
    expect(l.dci).toBeNull();
  });
  it('e. Colchicine MG : colchicine, DCI « COLCHICINE »', () => {
    const l = ligne('COLCHICINE MG');
    expect(l.ingredients).toEqual(['colchicine']);
    expect(l.dci).toBe('COLCHICINE');
  });
  it('f. Hydrea : hydroxycarbamide (ANSM) + hydroxyurea (DDInter) sur les deux lignes', () => {
    expect(du('f')).toHaveLength(2);
    for (const l of du('f')) {
      expect(l.ingredients, l.nom).toEqual(['hydroxycarbamide', 'hydroxyurea']);
      expect(l.dci).toBe('HYDROXYCARBAMIDE');
    }
  });
  it('g. Glucophage comprimé pelliculé (×3) : metformin + metformine', () => {
    expect(du('g')).toHaveLength(3);
    for (const l of du('g')) expect(l.ingredients, l.nom).toEqual(['metformin', 'metformine']);
  });
  it('h. Colchicine Cooper : reliée à la colchicine', () => {
    expect(ligne('COLCHICINE COOPER').ingredients).toEqual(['colchicine']);
  });
});

describe('BDD-0 — ajouts au périmètre', () => {
  const glucovance = du('A').filter(l => l.nom !== 'GLUCOVANCE');

  it('Glucovance contient la metformine (et garde le glibenclamide)', () => {
    expect(glucovance).toHaveLength(3);
    for (const l of glucovance) {
      expect(l.ingredients, l.nom).toEqual(['glyburide', 'metformin', 'metformine']);
      expect(l.dci).toBe('METFORMINE / GLIBENCLAMIDE');
    }
  });
  it('Glucovance ligne courte (décalage acarbose) : vidée', () => {
    const l = ligne('GLUCOVANCE');
    expect(l.ingredients).toEqual([]);
    expect(l.dci).toBeNull();
  });
  it('No-Dol Codeine ne contient pas d’ibuprofène', () => {
    const l = ligne('NO-DOL CODEINE, Comprimé');
    expect(l.ingredients.some(i => norm(i).startsWith('ibuprof'))).toBe(false);
    expect(l.ingredients).toEqual(['acetaminophen', 'codeine', 'codéine']);
  });
  it('aucune ligne COLPRONE n’est reliée à colchicine, codéine ou hydrochlorothiazide', () => {
    const colprone = lignes.filter(l => l.nom.startsWith('COLPRONE'));
    expect(colprone).toHaveLength(5);
    for (const l of colprone) {
      for (const i of l.ingredients) expect(['colchicine', 'codeine', 'hydrochlorothiazide'], l.nom).not.toContain(norm(i));
      // Ligne décalée → vidée ; ligne médrogestone → reliée à la médrogestone.
      if (/MEDROGESTONE/.test(norm(l.dci).toUpperCase())) expect(l.ingredients).toEqual(['medrogestone']);
      else { expect(l.ingredients, l.nom).toEqual([]); expect(l.dci, l.nom).toBeNull(); }
    }
  });
});

describe('BDD-0 — garde-fou contre-ion', () => {
  it('aucune spécialité dont la DCI contient « VALPRO » n’est reliée au seul sodium', () => {
    const valpro = lignes.filter(l => /VALPRO/.test((l.dci ?? '').toUpperCase()));
    expect(valpro.length).toBeGreaterThan(0);
    for (const l of valpro) expect(l.ingredients, l.nom).not.toEqual(['sodium']);
  });
  it('« FOLINATE DE CALCIUM » n’est jamais relié au seul calcium', () => {
    const fol = lignes.filter(l => /FOLINATE DE CALCIUM/.test((l.dci ?? '').toUpperCase()));
    expect(fol.length).toBeGreaterThan(0);
    for (const l of fol) expect(contreIonSeul(l), l.nom).toBe(false);
  });
  it('les deux ordres d’écriture d’un sel sont reconnus', () => {
    expect(selDUneAutreMolecule('SODIUM (VALPROATE DE)')).toBe(true);
    expect(selDUneAutreMolecule('SODIUM (HYALURONATE DE)')).toBe(true);
    expect(selDUneAutreMolecule('FOLINATE DE CALCIUM')).toBe(true);
    expect(selDUneAutreMolecule('DL-LYSINE (ACÉTYLSALICYLATE DE)')).toBe(true);
    // Le contre-ion EST le principe actif : hors garde-fou.
    expect(selDUneAutreMolecule('CALCIUM')).toBe(false);
    expect(selDUneAutreMolecule('MAGNÉSIUM (300MG)')).toBe(false);
  });
  it('aucune ligne corrigée dont la DCI est un sel n’est reliée à un contre-ion seul', () => {
    for (const l of lignes) if (selDUneAutreMolecule(l.dci)) expect(contreIonSeul(l), l.nom).toBe(false);
  });
  it('le garde-fou aurait détecté l’état d’avant', () => {
    const avant = lignes.filter(l => selDUneAutreMolecule(l.dci_avant)
      && l.ingredients_avant.length > 0 && l.ingredients_avant.every(i => CONTRE_IONS.includes(norm(i))));
    expect(avant).toHaveLength(10); // 4 Depakine + Hyalgan + 5 folinate
  });
});

describe('BDD-0 — Glucovance et la règle rénale metformine (canal lu sur le texte de la DCI)', () => {
  const regles = renalData.regles as RegleRenale[];
  const classes = renalData.classes as RenalClasse[];
  const creatRef = (examData.examens as ExamRef[]).find(e => e.code === 'CREATININE')!;
  const statut = {
    ...renalStatus({
      dateNaissance: '1956-03-01', sexe: 'M', poidsKg: 72, poidsDate: '2026-09-01', pathologies: [],
      creatinines: [{ id: 'c1', valeur_num: 10, unite_saisie: 'mg/L', date_prelevement: '2026-09-12', created_at: '2026-09-12T10:00:00Z' }],
      creatRef, today: new Date(2026, 9, 9),
    }),
    dfg: 25,
  };
  const l = ligne('GLUCOVANCE 500 MG / 5 MG, Comprimé pelliculé');
  const med = (dci: string | null): EngineMed => ({ id: l.id, nom: l.nom, dci });

  it('AVANT (DCI « GLIBENCLAMIDE ») : la règle metformine ne se déclenche pas', () => {
    expect([...renalClasses(med(l.dci_avant), classes)]).not.toContain('metformine');
    expect(evaluateRenal([med(l.dci_avant)], statut, [], regles, classes).alerts.map(a => a.regleCode)).not.toContain('METFORMINE_DFG_30');
  });
  it('APRÈS (DCI « METFORMINE / GLIBENCLAMIDE ») : contre-indication pour un DFG < 30', () => {
    expect([...renalClasses(med(l.dci), classes)]).toContain('metformine');
    const a = evaluateRenal([med(l.dci)], statut, [], regles, classes).alerts.find(x => x.regleCode === 'METFORMINE_DFG_30');
    expect(a?.severite).toBe('contre_indication');
  });
});
