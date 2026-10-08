import { describe, it, expect } from 'vitest';
import {
  evaluateAllergies, classifyAllergies, mergeAllergyAlerts, allergyFamilles, medFamilles, motifMatch,
  type AllergyMed, type PatientAllergy, type AllergieFamilleRow, type RegleAllergie,
} from './allergyClassEngine';
// Mêmes familles et règles que celles insérées en base (scripts/gen_regles_allergies.mjs).
import data from './regles_allergies.data.json';

const familles = data.familles as AllergieFamilleRow[];
const regles: RegleAllergie[] = data.regles.map((r, i) => ({
  ...r, id: `r${i}`, actif: true,
  severite: r.severite as RegleAllergie['severite'],
  criteres: r.criteres as RegleAllergie['criteres'],
}));

// Spécialités marocaines (DCI et ingrédients tels qu'en base).
const AMOXIL:      AllergyMed = { id: 'amoxil', nom: 'AMOXIL 1 G', dci: 'AMOXICILLINE', ingredients: ['amoxicilline'] };
const AUGMENTIN:   AllergyMed = { id: 'augmentin', nom: 'AUGMENTIN', dci: 'AMOXICILLINE // ACIDE CLAVULANIQUE', ingredients: ['amoxicilline', 'clavulanic acid'] };
const BRUFEN:      AllergyMed = { id: 'brufen', nom: 'BRUFEN 400 MG', dci: 'IBUPROFÈNE', ingredients: ['ibuprofène', 'ibuprofen'] };
const VOLTARENE:   AllergyMed = { id: 'voltarene', nom: 'VOLTARENE', dci: 'DICLOFENAC', ingredients: ['diclofenac'] };
const KARDEGIC:    AllergyMed = { id: 'kardegic', nom: 'KARDEGIC 75 MG', dci: 'DL-LYSINE (ACÉTYLSALICYLATE DE)', dci_canonique: 'aspirine acide acetylsalicylique acetylsalicylate', ingredients: ['aspirine', 'aspirin'] };
const OROKEN:      AllergyMed = { id: 'oroken', nom: 'OROKEN 200 MG', dci: 'CEFIXIME', ingredients: ['cefixime'] };
const ROCEPHINE:   AllergyMed = { id: 'rocephine', nom: 'ROCEPHINE 1 G', dci: 'CEFTRIAXONE (SODIQUE)', ingredients: ['ceftriaxone'] };
const TIENAM:      AllergyMed = { id: 'tienam', nom: 'TIENAM', dci: 'IMIPENEME // CILASTATINE', ingredients: ['imipenem', 'cilastatin'] };
const CODOLIPRANE: AllergyMed = { id: 'codoliprane', nom: 'CODOLIPRANE 400 MG / 20 MG', dci: 'PARACETAMOL | CODEINE', ingredients: ['acetaminophen', 'codeine'] };
const DOLIPRANE:   AllergyMed = { id: 'doliprane', nom: 'DOLIPRANE 1 G', dci: 'PARACÉTAMOL', ingredients: ['acetaminophen'] };
const GLUCOPHAGE:  AllergyMed = { id: 'glucophage', nom: 'GLUCOPHAGE 850 MG', dci: 'METFORMINE', ingredients: ['metformin'] };
const DIAMICRON:   AllergyMed = { id: 'diamicron', nom: 'DIAMICRON 30 MG', dci: 'GLICLAZIDE', ingredients: ['gliclazide'] };
const BACTRIM:     AllergyMed = { id: 'bactrim', nom: 'BACTRIM FORTE', dci: 'SULFAMETHOXAZOLE // TRIMETHOPRIME', ingredients: ['sulfamethoxazole', 'trimethoprim'] };
const ZITHROMAX:   AllergyMed = { id: 'zithromax', nom: 'ZITHROMAX', dci: 'AZITHROMYCINE', ingredients: ['azithromycin'] };
const CIFLOX:      AllergyMed = { id: 'ciflox', nom: 'CIFLOX 500 MG', dci: 'CIPROFLOXACINE', ingredients: ['ciprofloxacin'] };

const al = (label: string, anaphylaxie?: PatientAllergy['anaphylaxie']): PatientAllergy => ({ label, anaphylaxie });
const run = (meds: AllergyMed[], allergies: PatientAllergy[]) => evaluateAllergies(meds, allergies, familles, regles);
const sev = (meds: AllergyMed[], allergies: PatientAllergy[]) =>
  Object.fromEntries(run(meds, allergies).map(a => [a.medId, a.severite]));

describe('evaluateAllergies — cas cliniques', () => {
  it('allergie « Amoxicilline » → Amoxil et Augmentin en CI absolue', () => {
    expect(sev([AMOXIL, AUGMENTIN], [al('Amoxicilline')])).toEqual({ amoxil: 'absolue', augmentin: 'absolue' });
  });

  it('allergie « Ibuprofène » → Brufen, Voltarène et Kardegic en CI absolue', () => {
    expect(sev([BRUFEN, VOLTARENE, KARDEGIC], [al('Ibuprofène')]))
      .toEqual({ brufen: 'absolue', voltarene: 'absolue', kardegic: 'absolue' });
    expect(sev([BRUFEN], [al('Ibuprofene')])).toEqual({ brufen: 'absolue' }); // saisie sans accent
  });

  it('allergie « Pénicilline » → Amoxil en CI absolue, céphalosporine « À évaluer »', () => {
    expect(sev([AMOXIL, OROKEN, ROCEPHINE], [al('Pénicilline')]))
      .toEqual({ amoxil: 'absolue', oroken: 'a_evaluer', rocephine: 'a_evaluer' });
  });

  it('allergie « Pénicilline » avec anaphylaxie → céphalosporine en CI absolue', () => {
    const r = run([OROKEN], [al('Pénicilline', 'oui')]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ severite: 'absolue', regleCode: 'L3a' });
    expect(r[0].conditionLabel).toBe('allergie : Pénicilline (anaphylaxie)');
    // anaphylaxie « non » ou non renseignée → reste « À évaluer »
    expect(sev([OROKEN], [al('Pénicilline', 'non')])).toEqual({ oroken: 'a_evaluer' });
    expect(sev([OROKEN], [al('Pénicilline', 'inconnu')])).toEqual({ oroken: 'a_evaluer' });
  });

  it('allergie « Aspirine » → Brufen en CI absolue (intolérance croisée)', () => {
    const r = run([BRUFEN, KARDEGIC], [al('Aspirine')]);
    expect(Object.fromEntries(r.map(a => [a.medId, a.severite]))).toEqual({ brufen: 'absolue', kardegic: 'absolue' });
    expect(r.find(a => a.medId === 'brufen')!.regleCode).toBe('L6');
  });

  it('allergie « Codéine » → Codoliprane en CI absolue', () => {
    expect(sev([CODOLIPRANE], [al('Codéine')])).toEqual({ codoliprane: 'absolue' });
    expect(sev([CODOLIPRANE], [al('codéine')])).toEqual({ codoliprane: 'absolue' });
  });

  it('Doliprane avec toutes ces allergies → aucune alerte', () => {
    const toutes = [al('Amoxicilline'), al('Ibuprofène'), al('Pénicilline', 'oui'), al('Aspirine'), al('Codéine'),
      al('Allergie aux Sulfamides'), al('Allergie aux Macrolides'), al('Allergie aux AINS'), al('Acariens')];
    expect(run([DOLIPRANE], toutes)).toEqual([]);
  });

  it('allergie non reconnue → mention « non analysée »', () => {
    const c = classifyAllergies(['Acariens', 'Amoxicilline', 'Allergie au Paracétamol'], familles, ['Allergie au Paracétamol']);
    expect(c.find(x => x.label === 'Acariens')!.status).toBe('non_reconnue');
    expect(c.find(x => x.label === 'Amoxicilline')).toMatchObject({ status: 'famille', familles: ['pénicillines'] });
    expect(c.find(x => x.label === 'Allergie au Paracétamol')!.status).toBe('base');
  });
});

describe('evaluateAllergies — familles et règles croisées', () => {
  it('libellés du référentiel reconnus (« Allergie aux Pénicillines », « Allergie aux AINS »)', () => {
    expect(sev([AMOXIL], [al('Allergie aux Pénicillines')])).toEqual({ amoxil: 'absolue' });
    expect(sev([BRUFEN, KARDEGIC], [al('Allergie aux AINS')])).toEqual({ brufen: 'absolue', kardegic: 'absolue' });
    expect(sev([BRUFEN], [al("Allergie à l'Aspirine")])).toEqual({ brufen: 'absolue' });
  });

  it('céphalosporine → pénicilline et carbapénème : « À évaluer », absolue si anaphylaxie', () => {
    expect(sev([AMOXIL, TIENAM, OROKEN], [al('Allergie aux Céphalosporines')]))
      .toEqual({ amoxil: 'a_evaluer', tienam: 'a_evaluer', oroken: 'absolue' });
    expect(sev([AMOXIL, TIENAM], [al('Ceftriaxone', 'oui')])).toEqual({ amoxil: 'absolue', tienam: 'absolue' });
  });

  it('« bêta-lactamines » → pénicillines, céphalosporines et carbapénèmes en CI absolue', () => {
    expect(sev([AMOXIL, OROKEN, TIENAM], [al('Bêta-lactamines')]))
      .toEqual({ amoxil: 'absolue', oroken: 'absolue', tienam: 'absolue' });
  });

  it('sulfamides antibactériens → Bactrim absolue, sulfamide hypoglycémiant en précaution', () => {
    expect(sev([BACTRIM, DIAMICRON], [al('Allergie aux Sulfamides')])).toEqual({ bactrim: 'absolue', diamicron: 'precaution' });
  });

  it('macrolides et quinolones : même famille en CI absolue, pas de croisement entre elles', () => {
    expect(sev([ZITHROMAX, CIFLOX], [al('Allergie aux Macrolides')])).toEqual({ zithromax: 'absolue' });
    expect(sev([ZITHROMAX, CIFLOX], [al('Ciprofloxacine')])).toEqual({ ciflox: 'absolue' });
  });

  it('allergie hors familles saisie par nom → même principe actif en CI absolue (L0)', () => {
    const r = run([GLUCOPHAGE, DOLIPRANE], [al('Allergie à la Metformine')]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ medId: 'glucophage', severite: 'absolue', regleCode: 'L0' });
  });

  it('une seule alerte par médicament × allergie, la plus sévère', () => {
    const r = run([AMOXIL], [al('Amoxicilline', 'oui')]);
    expect(r).toHaveLength(1);
    expect(r[0].severite).toBe('absolue');
  });

  it('règle inactive ignorée ; aucune allergie → aucune alerte', () => {
    expect(evaluateAllergies([AMOXIL], [al('Amoxicilline')], familles, regles.map(r => ({ ...r, actif: false })))).toEqual([]);
    expect(run([AMOXIL], [])).toEqual([]);
    expect(run([AMOXIL], [al('   ')])).toEqual([]);
  });
});

describe('motifs — pas de faux positifs', () => {
  it('« morphin » ne reconnaît pas l’apomorphine ; « *cillin » reconnaît les pénicillines', () => {
    expect(motifMatch('morphin', 'chlorhydrate d apomorphine')).toBe(false);
    expect(motifMatch('morphin', 'morphine sulfate de')).toBe(true);
    expect(motifMatch('*cillin', 'amoxicilline')).toBe(true);
  });
  it('un nom de marque contenant « cef » n’est pas une céphalosporine', () => {
    expect(medFamilles({ id: 'x', nom: 'PRIMPERAN', dci: 'METOCLOPRAMIDE', ingredients: ['metoclopramide'] }, familles).size).toBe(0);
    expect(medFamilles({ id: 'y', nom: 'ACFOL', dci: 'ACIDE FOLIQUE' }, familles).size).toBe(0);
  });
  it('« sulfate » n’est pas un sulfamide', () => {
    expect(medFamilles({ id: 'z', nom: 'TARDYFERON', dci: 'FER (SULFATE FERREUX)' }, familles).size).toBe(0);
  });
  it('allergie alimentaire ou environnementale → aucune famille', () => {
    expect(allergyFamilles('Acariens', familles).size).toBe(0);
    expect(allergyFamilles('Allergie au Latex', familles).size).toBe(0);
  });
});

describe('mergeAllergyAlerts — jamais de perte de la sévérité la plus haute', () => {
  const croisee = run([OROKEN], [al('Pénicilline')]);            // À évaluer
  const absolue = run([AMOXIL], [al('Pénicilline')]);            // CI absolue

  it('carte existante absolue → elle absorbe l’alerte (« Également »)', () => {
    const existing = [{ type: 'contraindication', severite: 'contre_indication', involved: ['AMOXIL 1 G'], condition: 'Allergie aux pénicillines' }];
    const m = mergeAllergyAlerts(existing, absolue);
    expect(m.standalone).toEqual([]);
    expect(m.alsoByIndex.get(0)).toEqual(['allergie : Pénicilline']);
    expect(m.absorbed.size).toBe(0);
  });

  it('CI relative existante + « À évaluer » → une seule carte, la plus sévère', () => {
    const existing = [{ type: 'contraindication', severite: 'majeure', involved: ['OROKEN 200 MG'], condition: 'Allergie aux pénicillines' }];
    const m = mergeAllergyAlerts(existing, croisee);
    expect(m.standalone).toHaveLength(1);
    expect(m.standalone[0].severite).toBe('a_evaluer');
    expect(m.standalone[0].also).toEqual(['contre-indication de la base — Allergie aux pénicillines']);
    expect([...m.absorbed]).toEqual([0]);
  });

  it('carte d’un autre médicament ou d’un autre thème → pas de fusion', () => {
    const existing = [
      { type: 'contraindication', severite: 'contre_indication', involved: ['BRUFEN 400 MG'], condition: 'Allergie à l’Aspirine' },
      { type: 'contraindication', severite: 'contre_indication', involved: ['OROKEN 200 MG'], condition: 'Insuffisance rénale sévère' },
    ];
    const m = mergeAllergyAlerts(existing, croisee);
    expect(m.standalone).toHaveLength(1);
    expect(m.absorbed.size).toBe(0);
    expect(m.alsoByIndex.size).toBe(0);
  });
});
