import { describe, it, expect } from 'vitest';
import {
  linesMissingPosologie, posologieBlockMessage, deduceForme, computeQuantite, lastPosologieFor,
  type PastLine,
} from './posologie';

describe('posologie obligatoire (blocage)', () => {
  it('ligne sans posologie → bloquée, message nominatif', () => {
    const lines = [
      { id: '1', nom: 'KARDEGIC 75 MG', posologie: '' },
      { id: '2', nom: 'BRUFEN 400 MG', posologie: '1 comprimé 3 fois par jour' },
    ];
    expect(linesMissingPosologie(lines).map(l => l.id)).toEqual(['1']);
    expect(posologieBlockMessage(lines)).toBe('Posologie manquante pour KARDEGIC 75 MG.');
  });
  it('posologie faite d’espaces → bloquée', () => {
    expect(posologieBlockMessage([{ id: '1', nom: 'SINTROM 4 MG', posologie: '   ' }])).not.toBeNull();
  });
  it('posologie absente (null / undefined) → bloquée', () => {
    expect(posologieBlockMessage([{ id: '1', nom: 'PLAVIX', posologie: null }, { id: '2', nom: 'DOLIPRANE' }]))
      .toBe('Posologie manquante pour 2 médicaments : PLAVIX, DOLIPRANE.');
  });
  it('toutes les lignes renseignées → pas de blocage', () => {
    expect(posologieBlockMessage([{ id: '1', nom: 'GLUCOPHAGE 850', posologie: '1 cp matin et soir' }])).toBeNull();
  });
});

describe('forme déduite du nom — jamais « comprimé » par défaut', () => {
  it('Kardegic sachet → sachet', () => {
    expect(deduceForme('KARDEGIC 75 MG, Poudre pour solution buvable en sachet')?.singulier).toBe('sachet');
  });
  it('Doliprane gélule / suppositoire / comprimé', () => {
    expect(deduceForme('DOLIPRANE 500 MG, Gélule')?.singulier).toBe('gélule');
    expect(deduceForme('DOLIPRANE SUPPOSITOIRE à 300 MG')?.singulier).toBe('suppositoire');
    expect(deduceForme('DOLIPRANE 1 G, Comprimé sécable')?.singulier).toBe('comprimé');
  });
  it('forme en base utilisée si le nom ne dit rien', () => {
    expect(deduceForme('BRUFEN 400 MG', 'Comprimé pelliculé')?.singulier).toBe('comprimé');
  });
  it('sirop / crème → reconnu sans unité comptable', () => {
    expect(deduceForme('BRUFEN ENFANTS, sirop')).toBeNull();
  });
  it('forme inconnue → undefined (pas de « comprimé »)', () => {
    expect(deduceForme('KARDEGIC 75')).toBeUndefined();
  });
});

describe('quantité calculée uniquement sur données connues', () => {
  const sachet = { singulier: 'sachet', pluriel: 'sachets' };
  it('1 sachet par jour pendant 30 jours → 30 sachets', () => {
    expect(computeQuantite('1 sachet par jour', '30 jours', sachet)).toBe('30 sachets');
  });
  it('2 comprimés 3 fois par jour pendant 5 jours → 30 comprimés', () => {
    expect(computeQuantite('2 comprimés 3 fois par jour', '5 jours', { singulier: 'comprimé', pluriel: 'comprimés' })).toBe('30 comprimés');
  });
  it('forme inconnue, posologie ou durée illisible → vide', () => {
    expect(computeQuantite('1 par jour', '30 jours', undefined)).toBe('');
    expect(computeQuantite('selon INR', '30 jours', sachet)).toBe('');
    expect(computeQuantite('1 sachet par jour', '', sachet)).toBe('');
  });
});

describe('suggestion : dernière posologie utilisée', () => {
  const past: PastLine[] = [
    { medicament_nom: 'KARDEGIC 75 MG', posologie: '1 sachet par jour', duree: '30 jours', created_at: '2026-09-01T10:00:00Z' },
    { medicament_nom: 'Kardegic 75 mg', posologie: '1 sachet le midi', duree: '90 jours', created_at: '2026-10-01T10:00:00Z' },
    { medicament_nom: 'KARDEGIC 75 MG', posologie: '  ', duree: '30 jours', created_at: '2026-10-05T10:00:00Z' },
    { medicament_nom: 'KARDEGIC 160 MG', posologie: '1 sachet par jour', duree: '30 jours', created_at: '2026-10-06T10:00:00Z' },
  ];
  it('la plus récente, non vide, pour le même médicament (casse ignorée)', () => {
    expect(lastPosologieFor('KARDEGIC 75 MG', past)).toEqual({
      posologie: '1 sachet le midi', duree: '90 jours', date: '2026-10-01T10:00:00Z',
    });
  });
  it('autre dosage → pas de suggestion croisée', () => {
    expect(lastPosologieFor('KARDEGIC 300 MG', past)).toBeNull();
  });
  it('jamais prescrit → aucune suggestion (champ vide)', () => {
    expect(lastPosologieFor('BRUFEN 400 MG', past)).toBeNull();
    expect(lastPosologieFor('', past)).toBeNull();
  });
});
