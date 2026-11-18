import { describe, it, expect } from 'vitest';
import { buildConditionMatcher, preparePatient, type CiConceptRow, type PathologieCuree } from './conditionMatcher';
import { evaluateExcipients, mergeExcipientAlerts, terrainsDuTerme, type MedicamentExcipient } from './excipientEngine';
import type { AllergieFamilleRow } from './allergyClassEngine';
import data from './ci_condition_concepts.data.json';
import allergyData from './regles_allergies.data.json';

// Référentiel RÉEL des conditions (fixture de l'application = base).
const D = buildConditionMatcher(data.concepts as CiConceptRow[], data.curees as PathologieCuree[], allergyData.familles as AllergieFamilleRow[]);
type P = { pathologies?: string[]; allergiesMedicaments?: string[]; allergiesAlimentaires?: string[] };
const pat = (p: P) => preparePatient(p, D);
const terrains = (label: string, kind: 'pathologie' | 'allergie' = 'pathologie') =>
  [...terrainsDuTerme(pat(kind === 'pathologie' ? { pathologies: [label] } : { allergiesAlimentaires: [label] }).termes[0])].sort();

const CLAMOXYL = { id: 'clamoxyl-250', nom: 'CLAMOXYL 250 MG, Poudre pour suspension buvable' };
const DOLIPRANE = { id: 'doliprane', nom: 'DOLIPRANE 1000 MG, Comprimé' };
const ligne = (o: Partial<MedicamentExcipient>): MedicamentExcipient => ({
  medicament_id: CLAMOXYL.id, excipient: 'aspartam', terrains: ['phenylcetonurie'], severite: 'a_evaluer', rubrique: '4.4',
  cis: '67140810', date_rcp: '2025-03-12', citation: 'Ce médicament contient de l’aspartam, source de phénylalanine. Peut être dangereux chez les personnes atteintes de phénylcétonurie.',
  specialite_fr: 'CLAMOXYL 250 mg/5 ml, poudre pour suspension buvable', ...o,
});

describe('excipientEngine — terrains du patient', () => {
  it('phénylcétonurie : concept du référentiel ou sigle', () => {
    expect(terrains('Phénylcétonurie')).toEqual(['phenylcetonurie']);
    expect(terrains('PCU')).toEqual(['phenylcetonurie']);
  });
  it('maladie cœliaque, intolérance au gluten', () => {
    expect(terrains('Maladie cœliaque')).toEqual(['coeliaque']);
    expect(terrains('Intolérance au gluten')).toEqual(['coeliaque']);
  });
  it('allergies alimentaires de la liste de référence', () => {
    expect(terrains('Allergie aux Arachides', 'allergie')).toEqual(['allergie_arachide']);
    expect(terrains('Allergie au Soja', 'allergie')).toEqual(['allergie_soja']);
    expect(terrains('Allergie au Blé/Gluten', 'allergie')).toEqual(['allergie_ble', 'coeliaque']);
    expect(terrains('Intolérance au lactose', 'allergie')).toEqual(['intolerance_lactose']);
    expect(terrains('Galactosémie')).toEqual(['intolerance_lactose']);
  });
  it('jamais une condition niée, jamais une allergie voisine', () => {
    expect(terrains('Pas d’allergie à l’arachide', 'allergie')).toEqual([]);
    expect(terrains('Allergie au Lait de vache', 'allergie')).toEqual([]);
    expect(terrains('Diabète de type 2')).toEqual([]);
    expect(terrains('Hypertension artérielle')).toEqual([]);
  });
});

describe('excipientEngine — carte « Excipient à effet notoire »', () => {
  it('CLAMOXYL 250 mg/5 mL × phénylcétonurie → carte excipient', () => {
    const a = evaluateExcipients([CLAMOXYL], [ligne({})], pat({ pathologies: ['Phénylcétonurie'] }));
    expect(a).toHaveLength(1);
    expect(a[0].severite).toBe('a_evaluer');
    expect(a[0].conditionLabel).toBe('excipient à effet notoire : aspartam — phénylcétonurie');
    expect(a[0].description).toContain('CIS 67140810');
    expect(a[0].description).toContain('phénylcétonurie.');
  });
  it('phrase de la rubrique 4.3 → contre-indication', () => {
    const a = evaluateExcipients([CLAMOXYL], [ligne({ severite: 'absolue', rubrique: '4.3' })], pat({ pathologies: ['Phénylcétonurie'] }));
    expect(a[0].severite).toBe('absolue');
  });
  it('aucune carte sans le terrain, ni pour un autre médicament', () => {
    expect(evaluateExcipients([CLAMOXYL], [ligne({})], pat({ pathologies: ['Asthme'] }))).toEqual([]);
    expect(evaluateExcipients([DOLIPRANE], [ligne({})], pat({ pathologies: ['Phénylcétonurie'] }))).toEqual([]);
  });
  it('une seule carte par médicament et par excipient : la phrase la plus sévère l’emporte', () => {
    const a = evaluateExcipients([CLAMOXYL], [ligne({}), ligne({ severite: 'absolue', rubrique: '4.3' })], pat({ pathologies: ['Phénylcétonurie'] }));
    expect(a).toHaveLength(1);
    expect(a[0].severite).toBe('absolue');
  });
  it('amidon de blé : carte pour l’allergie au blé, pas pour la maladie cœliaque si la phrase ne la vise pas', () => {
    const ble = ligne({ excipient: 'gluten', terrains: ['allergie_ble'], citation: 'Les patients présentant une allergie au blé (différente de la maladie cœliaque) ne doivent pas prendre ce médicament.' });
    expect(evaluateExcipients([CLAMOXYL], [ble], pat({ pathologies: ['Maladie cœliaque'] }))).toEqual([]);
    expect(evaluateExcipients([CLAMOXYL], [ble], pat({ allergiesAlimentaires: ['Allergie au Blé/Gluten'] }))).toHaveLength(1);
  });
});

describe('excipientEngine — fusion avec une contre-indication de la base', () => {
  it('CI « Phénylcétonurie » déjà affichée pour ce médicament, sévérité ≥ : ligne « Également »', () => {
    const a = evaluateExcipients([CLAMOXYL], [ligne({})], pat({ pathologies: ['Phénylcétonurie'] }));
    const existing = [{ type: 'contraindication', severite: 'contre_indication', involved: [CLAMOXYL.nom], condition: 'Phénylcétonurie' }];
    const r = mergeExcipientAlerts(existing, a);
    expect(r.standalone).toEqual([]);
    expect(r.alsoByIndex.get(0)?.[0]).toContain('aspartam');
  });
  it('carte de la base moins sévère ou sans rapport : carte excipient à part', () => {
    const a = evaluateExcipients([CLAMOXYL], [ligne({ severite: 'absolue', rubrique: '4.3' })], pat({ pathologies: ['Phénylcétonurie'] }));
    expect(mergeExcipientAlerts([{ type: 'contraindication', severite: 'a_evaluer', involved: [CLAMOXYL.nom], condition: 'Phénylcétonurie' }], a).standalone).toHaveLength(1);
    expect(mergeExcipientAlerts([{ type: 'contraindication', severite: 'contre_indication', involved: [CLAMOXYL.nom], condition: 'Asthme' }], a).standalone).toHaveLength(1);
  });
});
