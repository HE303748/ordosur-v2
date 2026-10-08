import { describe, it, expect } from 'vitest';
import {
  evaluateDuplicates, mergeDuplicateAlerts, medSubstances, substanceKey, duplicateDescription,
  type DuplicateMed, type DoublonClasseRow, type DoublonSubstanceRow, type RegleDoublon,
} from './duplicateEngine';
import { requiresDerogation } from './derogation';
// Mêmes données que celles insérées en base (scripts/gen_regles_doublons.mjs).
import data from './regles_doublons.data.json';

const classes = data.classes as DoublonClasseRow[];
const substances = data.substances as DoublonSubstanceRow[];
const regles: RegleDoublon[] = data.regles.map((r, i) => ({ ...r, id: `r${i}`, actif: true, severite: r.severite as RegleDoublon['severite'] }));

// Spécialités marocaines (DCI et ingrédients tels qu'en base).
const DOLIPRANE:   DuplicateMed = { id: 'doliprane', nom: 'DOLIPRANE 1 G', dci: 'PARACÉTAMOL', ingredients: ['acetaminophen'] };
const EFFERALGAN:  DuplicateMed = { id: 'efferalgan', nom: 'EFFERALGAN', dci: 'PARACETAMOL', ingredients: ['acetaminophen'] };
const CODOLIPRANE: DuplicateMed = { id: 'codoliprane', nom: 'CODOLIPRANE 400 MG / 20 MG', dci: 'PARACETAMOL | CODEINE', ingredients: ['acetaminophen', 'codeine'] };
const BRUFEN:      DuplicateMed = { id: 'brufen', nom: 'BRUFEN 400 MG', dci: 'IBUPROFÈNE', ingredients: ['ibuprofène', 'ibuprofen'] };
const VOLTARENE:   DuplicateMed = { id: 'voltarene', nom: 'VOLTARENE', dci: 'DICLOFENAC', ingredients: ['diclofenac'] };
const KARDEGIC:    DuplicateMed = { id: 'kardegic', nom: 'KARDEGIC 75 MG', dci: 'DL-LYSINE (ACÉTYLSALICYLATE DE)', dci_canonique: 'aspirine acide acetylsalicylique acetylsalicylate', ingredients: ['aspirine', 'aspirin'] };
const ASPEGIC:     DuplicateMed = { id: 'aspegic', nom: 'ASPEGIC NOUR 100 MG', dci: 'DL-LYSINE (ACÉTYLSALICYLATE DE)', ingredients: ['aspirin'] };
const PLAVIX:      DuplicateMed = { id: 'plavix', nom: 'PLAVIX', dci: 'CLOPIDOGREL', ingredients: ['clopidogrel'] };
const INEXIUM:     DuplicateMed = { id: 'inexium', nom: 'INEXIUM 10 MG', dci: 'ÉSOMÉPRAZOLE MAGNÉSIUM TRIHYDRATÉ', ingredients: ['esomeprazole magnesium'] };
const OMEPRAZOLE:  DuplicateMed = { id: 'omeprazole', nom: 'OMEPRAZOLE GT 40 MG', dci: 'OMÉPRAZOLE', ingredients: ['omeprazole', 'oméprazole'] };
const TRIATEC:     DuplicateMed = { id: 'triatec', nom: 'TRIATEC', dci: 'RAMIPRIL', ingredients: ['ramipril'] };
const COVERSYL:    DuplicateMed = { id: 'coversyl', nom: 'COVERSYL', dci: 'PERINDOPRIL', ingredients: ['perindopril'] };
const APROVEL:     DuplicateMed = { id: 'aprovel', nom: 'APROVEL', dci: 'IRBESARTAN', ingredients: ['irbesartan'] };
const AMOXIL:      DuplicateMed = { id: 'amoxil', nom: 'AMOXIL 1 G', dci: 'AMOXICILLINE', ingredients: ['amoxicilline'] };
const AUGMENTIN:   DuplicateMed = { id: 'augmentin', nom: 'AUGMENTIN', dci: 'AMOXICILLINE // ACIDE CLAVULANIQUE', ingredients: ['amoxicilline', 'clavulanic acid'] };
const AMLOR:       DuplicateMed = { id: 'amlor', nom: 'AMLOR 5 MG', dci: 'AMLODIPINE', ingredients: ['amlodipine'] };
const TILDIEM:     DuplicateMed = { id: 'tildiem', nom: 'TILDIEM 60 MG', dci: 'DILTIAZEM', ingredients: ['diltiazem'] };
const SINTROM:     DuplicateMed = { id: 'sintrom', nom: 'SINTROM 4 MG', dci: 'ACÉNOCOUMAROL', ingredients: ['acenocoumarol'] };
const TAHOR:       DuplicateMed = { id: 'tahor', nom: 'TAHOR 20 MG', dci: 'ATORVASTATINE', ingredients: ['atorvastatin calcium'] };
const CRESTOR:     DuplicateMed = { id: 'crestor', nom: 'CRESTOR 10 MG', dci: 'ROSUVASTATINE', ingredients: ['rosuvastatin'] };

const run = (meds: DuplicateMed[]) => evaluateDuplicates(meds, classes, substances, regles);

describe('D1 — même principe actif', () => {
  it('Doliprane + Efferalgan (paracétamol × 2) → majeure', () => {
    const r = run([DOLIPRANE, EFFERALGAN]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ type: 'meme_substance', severite: 'majeure', regleCode: 'D1', commun: 'paracétamol' });
    expect(duplicateDescription(r[0])).toContain('Même principe actif (paracétamol) dans DOLIPRANE 1 G et EFFERALGAN — risque de surdosage');
  });

  it('association fixe : Doliprane + Codoliprane → majeure', () => {
    const r = run([DOLIPRANE, CODOLIPRANE]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ type: 'meme_substance', severite: 'majeure', commun: 'paracétamol' });
  });

  it('Amoxil + Augmentin (amoxicilline dans une association) → majeure', () => {
    expect(run([AMOXIL, AUGMENTIN])[0]).toMatchObject({ type: 'meme_substance', severite: 'majeure' });
  });

  it('Kardegic + Aspégic (aspirine sous deux marques) → majeure', () => {
    expect(run([KARDEGIC, ASPEGIC])[0]).toMatchObject({ severite: 'majeure', commun: 'aspirine' });
  });

  it('médicament sans ingrédient en base : la DCI est utilisée', () => {
    const sansIng: DuplicateMed = { id: 'x', nom: 'PARACETAMOL GENERIQUE', dci: 'PARACETAMOL' };
    expect(run([DOLIPRANE, sansIng])[0]).toMatchObject({ severite: 'majeure', commun: 'paracétamol' });
  });

  it('un médicament seul n’est jamais en doublon avec lui-même (ingrédients français + anglais)', () => {
    expect(medSubstances(BRUFEN, substances)).toHaveLength(1);
    expect(medSubstances(KARDEGIC, substances)).toHaveLength(1);
    expect(run([BRUFEN])).toEqual([]);
  });

  it('le doublon de même principe actif déclenche la dérogation ; la même classe non', () => {
    const d1 = run([DOLIPRANE, CODOLIPRANE])[0];
    const d2 = run([INEXIUM, OMEPRAZOLE])[0];
    const asAlert = (sev: string) => ({ type: 'drug_drug' as const, severite: sev, description: '', involved: ['A', 'B'], origin: 'nouveau' as const });
    expect(requiresDerogation(asAlert(d1.severite === 'majeure' ? 'majeure' : 'moderee'))).toBe(true);
    expect(requiresDerogation(asAlert(d2.severite === 'majeure' ? 'majeure' : 'moderee'))).toBe(false);
  });
});

describe('D2 — même classe à risque', () => {
  it('deux IPP (Inexium + Oméprazole) → attention', () => {
    const r = run([INEXIUM, OMEPRAZOLE]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ type: 'meme_classe', severite: 'attention', regleCode: 'D2' });
  });

  it('deux IEC (Triatec + Coversyl) → attention', () => {
    expect(run([TRIATEC, COVERSYL])[0]).toMatchObject({ type: 'meme_classe', severite: 'attention', commun: 'IEC' });
  });

  it('IEC + ARA2 (Triatec + Aprovel) → attention', () => {
    const r = run([TRIATEC, APROVEL]);
    expect(r[0]).toMatchObject({ type: 'meme_classe', severite: 'attention' });
    expect(r[0].titre).toContain('double blocage');
  });

  it('deux statines → attention', () => {
    expect(run([TAHOR, CRESTOR])[0]).toMatchObject({ type: 'meme_classe', severite: 'attention' });
  });

  it('Doliprane + Codoliprane + un autre opioïde : même substance prioritaire, puis même classe', () => {
    const tramadol: DuplicateMed = { id: 'tramadol', nom: 'TRAMAL 50 MG', dci: 'TRAMADOL (CHLORHYDRATE)', ingredients: ['tramadol'] };
    const r = run([DOLIPRANE, CODOLIPRANE, tramadol]);
    const byPair = Object.fromEntries(r.map(a => [`${a.idA}+${a.idB}`, a.severite]));
    expect(byPair).toEqual({ 'doliprane+codoliprane': 'majeure', 'codoliprane+tramadol': 'attention' });
  });
});

describe('exclusions voulues — aucune alerte de ce canal', () => {
  it('double antiagrégation Kardegic + Plavix', () => {
    expect(run([KARDEGIC, PLAVIX])).toEqual([]);
  });
  it('deux inhibiteurs calciques (DHP + non-DHP)', () => {
    expect(run([AMLOR, TILDIEM])).toEqual([]);
  });
  it('deux AINS et AINS + anticoagulant : laissés au cumul de la RPC', () => {
    expect(run([BRUFEN, VOLTARENE])).toEqual([]);
    expect(run([BRUFEN, SINTROM])).toEqual([]);
  });
  it('classes différentes sans lien (Doliprane + Triatec + Tahor)', () => {
    expect(run([DOLIPRANE, TRIATEC, TAHOR])).toEqual([]);
  });
  it('saisie libre : jamais analysée (aucune substance fiable)', () => {
    expect(run([DOLIPRANE, { id: 'm', nom: 'paracetamol', manual: true }])).toEqual([]);
  });
});

describe('substanceKey — pas de faux doublon', () => {
  it('français = anglais ; sel et hydrate ignorés', () => {
    expect(substanceKey('ibuprofène')).toBe(substanceKey('ibuprofen'));
    expect(substanceKey('acide clavulanique')).toBe(substanceKey('clavulanic acid'));
    expect(substanceKey('diclofénac sodique')).toBe(substanceKey('diclofenac sodium'));
    expect(substanceKey('ÉSOMÉPRAZOLE MAGNÉSIUM TRIHYDRATÉ')).toBe(substanceKey('esomeprazole magnesium'));
  });
  it('chlorure de sodium ≠ chlorure de potassium', () => {
    expect(substanceKey('sodium chloride')).not.toBe(substanceKey('potassium chloride'));
    const nacl: DuplicateMed = { id: 'nacl', nom: 'NACL 0,9 %', dci: 'CHLORURE DE SODIUM', ingredients: ['sodium chloride'] };
    const kcl: DuplicateMed = { id: 'kcl', nom: 'KCL', dci: 'CHLORURE DE POTASSIUM', ingredients: ['potassium chloride'] };
    expect(run([nacl, kcl])).toEqual([]);
  });
  it('oméprazole ≠ ésoméprazole ; prednisone ≠ prednisolone', () => {
    expect(substanceKey('omeprazole')).not.toBe(substanceKey('esomeprazole'));
    expect(substanceKey('prednisone')).not.toBe(substanceKey('prednisolone'));
  });
  it('substance d’appoint commune (caféine) → attention, sans dérogation', () => {
    const a: DuplicateMed = { id: 'a', nom: 'CLARADOL CAFEINE', dci: 'PARACETAMOL // CAFEINE', ingredients: ['acetaminophen', 'caffeine'] };
    const b: DuplicateMed = { id: 'b', nom: 'MIGRALGINE', dci: 'AMYLOCAINE // CAFEINE', ingredients: ['amylocaine', 'caffeine'] };
    expect(run([a, b])[0]).toMatchObject({ severite: 'attention', regleCode: 'D1b', commun: 'caféine' });
  });
  it('règle inactive ignorée', () => {
    expect(evaluateDuplicates([DOLIPRANE, EFFERALGAN], classes, substances, regles.map(r => ({ ...r, actif: false })))).toEqual([]);
  });
});

describe('mergeDuplicateAlerts — jamais de perte de la sévérité la plus haute', () => {
  const namesOf = (id: string) => ({
    triatec: ['TRIATEC', 'TRIATEC 5 MG, Comprimé'], coversyl: ['COVERSYL', 'COVERSYL 5 MG, Comprimé'],
    doliprane: ['DOLIPRANE 1 G'], efferalgan: ['EFFERALGAN'],
  } as Record<string, string[]>)[id] ?? [];

  it('carte ANSM « mineure » de la même paire → absorbée par le doublon « attention »', () => {
    const existing = [{ type: 'drug_drug', severite: 'mineure', involved: ['COVERSYL 5 MG, Comprimé', 'TRIATEC 5 MG, Comprimé'], description: 'A prendre en compte : majoration du risque.' }];
    const m = mergeDuplicateAlerts(existing, run([TRIATEC, COVERSYL]), namesOf);
    expect(m.standalone).toHaveLength(1);
    expect(m.standalone[0].severite).toBe('attention');
    expect(m.standalone[0].also?.[0]).toContain('interaction déjà signalée');
    expect([...m.absorbed]).toEqual([0]);
  });

  it('carte existante « majeure » de la même paire → elle absorbe le doublon de classe', () => {
    const existing = [{ type: 'drug_drug', severite: 'majeure', involved: ['TRIATEC', 'COVERSYL'], description: 'Cumul.' }];
    const m = mergeDuplicateAlerts(existing, run([TRIATEC, COVERSYL]), namesOf);
    expect(m.standalone).toEqual([]);
    expect(m.alsoByIndex.get(0)).toEqual(['même classe (IEC)']);
  });

  it('carte d’une autre paire → pas de fusion', () => {
    const existing = [{ type: 'drug_drug', severite: 'majeure', involved: ['TRIATEC', 'AUTRE'], description: '' }];
    const m = mergeDuplicateAlerts(existing, run([DOLIPRANE, EFFERALGAN]), namesOf);
    expect(m.standalone).toHaveLength(1);
    expect(m.absorbed.size).toBe(0);
    expect(m.alsoByIndex.size).toBe(0);
  });
});
