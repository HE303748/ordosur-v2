import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  searchPathologies, estReconnuParLeMoteur, suggestionPathologie, pathologiesNonReconnues, BADGE_NON_RECONNU,
} from './pathologySearch';
import { buildConditionMatcher, analysePatientTerm, type CiConceptRow, type PathologieCuree } from './conditionMatcher';
import data from './ci_condition_concepts.data.json';

// Sprint 2c — saisie des pathologies normalisée (même normalisation que le moteur).

const curees = data.curees as PathologieCuree[];
const D = buildConditionMatcher(data.concepts as CiConceptRow[], curees);
const top = (q: string) => searchPathologies(q, curees)[0];

describe('recherche insensible aux accents, à la casse, aux mots vides et aux variantes de chiffres', () => {
  it('« Diabete type 1 » et « Diabète type 1 » proposent « Diabète de type 1 » en tête', () => {
    for (const q of ['Diabete type 1', 'Diabète type 1', 'diabète de type 1', 'DIABETE DE TYPE 1', 'Diabète type I', 'diabete du type i']) {
      expect(top(q), q).toBe('Diabète de type 1');
    }
    expect(top('Diabete type 2')).toBe('Diabète de type 2');
    expect(top('diabète type II')).toBe('Diabète de type 2');
  });
  it('libellés réels saisis sans accent', () => {
    expect(top('Hypertension arterielle')).toBe('Hypertension artérielle');
    expect(top('Hypothyroidie')).toBe('Hypothyroïdie');
    expect(top('epilepsie')).toBe('Épilepsie');
    expect(top('Reflux gastro-oesophagien')).toBe('Reflux gastro-œsophagien');
    expect(top('insuffisance renale chronique')).toBe('Insuffisance rénale chronique');
  });
  it('abréviations et synonymes (jamais affichés, toujours le nom du référentiel)', () => {
    expect(top('hta')).toBe('Hypertension artérielle');
    expect(top('BPCO')).toBe('Bronchopneumopathie chronique obstructive');
    expect(top('avc')).toBe('Accident vasculaire cérébral');
    expect(top('irc')).toBe('Insuffisance rénale chronique');
  });
  it('frappe partielle : début de mot, plusieurs mots', () => {
    expect(searchPathologies('diab', curees)).toEqual(expect.arrayContaining(['Diabète de type 1', 'Diabète de type 2', 'Diabète gestationnel']));
    expect(searchPathologies('insuf ren', curees)).toEqual(expect.arrayContaining(['Insuffisance rénale chronique', 'Insuffisance rénale aiguë']));
    expect(searchPathologies('ulcere', curees).slice(0, 3)).toEqual(['Ulcère duodénal', 'Ulcère gastrique', 'Ulcère gastro-duodénal']);
  });
  it('ordre déterministe : la même frappe donne toujours la même liste', () => {
    expect(searchPathologies('hyper', curees)).toEqual(searchPathologies('hyper', curees));
    expect(searchPathologies('hyper', [...curees].reverse())).toEqual(searchPathologies('hyper', curees));
  });
  it('rien pour une frappe vide, trop courte ou sans rapport', () => {
    expect(searchPathologies('', curees)).toEqual([]);
    expect(searchPathologies('d', curees)).toEqual([]);
    expect(searchPathologies('de la', curees)).toEqual([]);
    expect(searchPathologies('zzzz', curees)).toEqual([]);
  });
  it('toute pathologie du référentiel est retrouvée, en tête, par son propre nom sans accents', () => {
    const sansAccent = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
    for (const c of curees) expect(top(sansAccent(c.nom_fr)), c.nom_fr).toBe(c.nom_fr);
  });
});

describe('texte libre : « Non reconnu par le moteur »', () => {
  it('libellé relié à un concept, une famille, un stade rénal ou une grossesse → reconnu', () => {
    for (const l of ['Diabete type 1', 'Hypertension arterielle', 'Hypothyroidie', 'asthme allergique', 'cirrhose alcoolique', 'Diabète',
      'Insuffisance renale moderee', 'Hémodialyse', 'grossesse', 'Infection ostéo-articulaire', 'Allergie aux Pénicillines']) {
      expect(estReconnuParLeMoteur(l, D), l).toBe(true);
    }
  });
  it('libellé sans concept → signalé, avec la meilleure suggestion en 1 clic', () => {
    expect(pathologiesNonReconnues(['Asthme', 'Asthme nocturne sévère du sujet jeune', 'Maladie de Machin'], D, curees)).toEqual([
      { label: 'Maladie de Machin', suggestion: null },
    ]);
    expect(pathologiesNonReconnues(['Hypertension artérielle pulmonaire'], D, curees)).toEqual([{ label: 'Hypertension artérielle pulmonaire', suggestion: null }]);
    expect(pathologiesNonReconnues(["Crise d'asthme nocturne"], D, curees)).toEqual([{ label: "Crise d'asthme nocturne", suggestion: 'Asthme' }]);
    expect(pathologiesNonReconnues(['Suspicion de sclérose en plaques'], D, curees)).toEqual([{ label: 'Suspicion de sclérose en plaques', suggestion: 'Sclérose en plaques' }]);
    expect(BADGE_NON_RECONNU).toBe('Non reconnu par le moteur — choisir dans la liste ?');
  });
  it('la suggestion est toujours un nom du référentiel que le moteur reconnaît ; jamais une pathologie voisine', () => {
    const noms = new Set(curees.map(c => c.nom_fr));
    for (const l of ["Crise d'asthme nocturne", 'Suspicion de sclérose en plaques', 'poussée de thyroidite de hashimoto']) {
      const s = suggestionPathologie(l, curees);
      if (s !== null) { expect(noms.has(s), l).toBe(true); expect(estReconnuParLeMoteur(s, D), s).toBe(true); }
    }
    expect(suggestionPathologie('cardiopathie hypertensive', curees)).toBeNull(); // pas « Cardiopathie ischémique »
    expect(suggestionPathologie('zzzz', curees)).toBeNull();
  });
});

describe('libellés existants en base : aucune donnée modifiée, tous rattachés par le moteur', () => {
  // Libellés réels de patients.pathologies (export du 09/10/2026 : 66 libellés distincts, 274 occurrences).
  const REELS = ['Anémie', 'anémie ferriprive', 'Anémie ferriprive', 'Anémie par carence en vitamine B12', 'Anxiete', 'Arthrose', 'asthme', 'Asthme',
    'asthme allergique', 'BPCO', 'cardiopathie ischémique', 'cirrhose alcoolique', 'Cirrhose du foie', 'dénutrition', 'Diabète de type 2',
    'Diabete type 1', 'Diabète type 1', 'Diabete type 2', 'diabète type 2', 'Diabète type 2', 'Dyslipidémie', 'épilepsie', 'Épilepsie', 'Gastrite',
    "Gastro-entérite de l'enfant", 'Glaucome', 'goutte', 'grossesse', 'Grossesse normale', 'Hépatite virale B', 'Hépatite virale C', 'Hypertension',
    'Hypertension arterielle', 'hypertension artérielle', 'Hypertension artérielle', 'hyperuricémie', 'Hypothyroidie', 'hypothyroïdie', 'Hypothyroïdie',
    'Insuffisance cardiaque', 'Insuffisance hépatique', 'insuffisance rénale chronique', 'Insuffisance rénale chronique', 'Insuffisance renale moderee',
    'Lithiase biliaire', 'lupus érythémateux disséminé', 'Maladie cœliaque', 'Maladie de Crohn', 'maladie de Parkinson', 'migraine chronique',
    'Migraine chronique', 'Neuropathie diabétique', 'obésité', 'ostéoporose', 'Pancréatite aiguë', 'Pancréatite chronique', 'Prédiabète',
    'Rectocolite hémorragique', 'Reflux gastro-oesophagien', 'Reflux gastro-œsophagien', 'Stéatose hépatique', "syndrome d'apnée du sommeil",
    "Syndrome de l'intestin irritable", 'tabagisme actif', 'Ulcère duodénal', 'Ulcère gastrique'];

  it('66 libellés distincts : 0 non reconnu', () => {
    expect(REELS).toHaveLength(66);
    expect(pathologiesNonReconnues(REELS, D, curees)).toEqual([]);
  });
  it('les libellés saisis sans accent ou sans mot vide sont rattachés au bon concept', () => {
    const concept = (l: string) => analysePatientTerm(l, 'pathologie', D).concepts;
    expect(concept('Diabete type 1')).toEqual(['Diabète de type 1']);
    expect(concept('Diabete type 2')).toEqual(['Diabète de type 2']);
    expect(concept('Hypertension arterielle')).toEqual(['Hypertension artérielle']);
    expect(concept('Hypothyroidie')).toEqual(['Hypothyroïdie']);
    expect(concept('Anxiete')).toEqual(['Trouble anxieux généralisé']);
    expect(concept('Reflux gastro-oesophagien')).toEqual(['Reflux gastro-œsophagien']);
    expect(concept('Insuffisance renale moderee')).toEqual(['Insuffisance rénale chronique']);
  });
});

describe('branchement dans les formulaires', () => {
  const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
  it('PatientForm : recherche locale normalisée, badge ambre et remplacement en 1 clic', () => {
    const s = SRC('../components/PatientForm.tsx');
    expect(s).toContain('localSearch={q => searchPathologiesLocal(q, CUREES_REFERENTIEL, 30)}');
    expect(s).toContain('warnings={pathologiesNonReconnues(formData.pathologies, MATCHER, CUREES_REFERENTIEL)}');
    expect(s).toContain('{BADGE_NON_RECONNU}');
    expect(s).toContain('Remplacer par « {w.suggestion} »');
    expect(s).not.toContain('nom_fr.ilike'); // l'ancienne recherche sensible aux accents a disparu
  });
  it('antécédents : même recherche normalisée', () => {
    const s = SRC('./antecedents.ts');
    expect(s).toContain('const noms = searchPathologies(q, CUREES_REFERENTIEL, 20);');
    expect(s).not.toContain('nom_fr.ilike');
  });
});
