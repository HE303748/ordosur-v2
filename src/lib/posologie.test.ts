import { describe, it, expect } from 'vitest';
import {
  linesMissingPosologie, posologieConfirmMessage, printedPosologie, deduceForme, computeQuantite, lastPosologieFor,
  POSOLOGIE_FIABLE_DEPUIS,
  type PastLine,
} from './posologie';

describe('posologie non bloquante (confirmation à l’aperçu)', () => {
  it('ligne sans posologie → repérée, confirmation nominative', () => {
    const lines = [
      { id: '1', nom: 'KARDEGIC 75 MG', posologie: '' },
      { id: '2', nom: 'BRUFEN 400 MG', posologie: '1 comprimé 3 fois par jour' },
    ];
    expect(linesMissingPosologie(lines).map(l => l.id)).toEqual(['1']);
    expect(posologieConfirmMessage(lines)).toBe('1 ligne sans posologie : KARDEGIC 75 MG');
  });
  it('posologie faite d’espaces → comptée comme absente', () => {
    expect(posologieConfirmMessage([{ id: '1', nom: 'SINTROM 4 MG', posologie: '   ' }])).toBe('1 ligne sans posologie : SINTROM 4 MG');
  });
  it('posologie absente (null / undefined) → plusieurs lignes, dans l’ordre', () => {
    expect(posologieConfirmMessage([{ id: '1', nom: 'PLAVIX', posologie: null }, { id: '2', nom: 'DOLIPRANE' }]))
      .toBe('2 lignes sans posologie : PLAVIX, DOLIPRANE');
  });
  it('toutes les lignes renseignées → aucune confirmation', () => {
    expect(posologieConfirmMessage([{ id: '1', nom: 'GLUCOPHAGE 850', posologie: '1 cp matin et soir' }])).toBeNull();
  });
  it('ligne sans nom → ignorée (bloquée par ailleurs)', () => {
    expect(posologieConfirmMessage([{ id: '1', nom: '  ', posologie: '' }])).toBeNull();
  });
  it('impression : la saisie telle quelle, ou rien — jamais de texte inventé', () => {
    expect(printedPosologie(' 1 sachet par jour ')).toBe('1 sachet par jour');
    expect(printedPosologie('')).toBeNull();
    expect(printedPosologie('   ')).toBeNull();
    expect(printedPosologie(null)).toBeNull();
    expect(printedPosologie(undefined)).toBeNull();
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
    { medicament_nom: 'KARDEGIC 75 MG', posologie: '1 sachet par jour', duree: '30 jours', created_at: '2026-10-09T10:00:00Z' },
    { medicament_nom: 'Kardegic 75 mg', posologie: '1 sachet le midi', duree: '90 jours', created_at: '2026-10-12T10:00:00Z' },
    { medicament_nom: 'KARDEGIC 75 MG', posologie: '  ', duree: '30 jours', created_at: '2026-10-15T10:00:00Z' },
    { medicament_nom: 'KARDEGIC 160 MG', posologie: '1 sachet par jour', duree: '30 jours', created_at: '2026-10-16T10:00:00Z' },
  ];
  it('la plus récente, non vide, pour le même médicament (casse ignorée)', () => {
    expect(lastPosologieFor('KARDEGIC 75 MG', past)).toEqual({
      posologie: '1 sachet le midi', duree: '90 jours', date: '2026-10-12T10:00:00Z',
    });
  });

  // Sprint 4d-ter — les lignes d'avant le Sprint 4d-bis portaient une posologie par défaut
  // automatique (« 1 comprimé 2 fois par jour · 7 jours ») : jamais suggérées.
  const empoisonnee: PastLine = {
    medicament_nom: 'KARDEGIC 75 MG', posologie: '1 comprimé 2 fois par jour', duree: '7 jours', created_at: '2026-10-07T18:00:00Z',
  };
  it('ligne antérieure au seuil → jamais suggérée', () => {
    expect(lastPosologieFor('KARDEGIC 75 MG', [empoisonnee])).toBeNull();
    expect(lastPosologieFor('BRUFEN 400 MG', [{ ...empoisonnee, medicament_nom: 'BRUFEN 400 MG', created_at: '2025-01-01T00:00:00Z' }])).toBeNull();
  });
  it('juste avant le seuil → refusée ; au seuil → acceptée', () => {
    const avant = new Date(Date.parse(POSOLOGIE_FIABLE_DEPUIS) - 1).toISOString();
    expect(lastPosologieFor('KARDEGIC 75 MG', [{ ...empoisonnee, created_at: avant }])).toBeNull();
    expect(lastPosologieFor('KARDEGIC 75 MG', [{ ...empoisonnee, posologie: '1 sachet par jour', created_at: POSOLOGIE_FIABLE_DEPUIS }]))
      .not.toBeNull();
  });
  it('ligne ancienne ignorée même si elle est la seule ; la ligne fiable l’emporte', () => {
    expect(lastPosologieFor('KARDEGIC 75 MG', [empoisonnee, past[0]])?.posologie).toBe('1 sachet par jour');
  });
  it('date absente ou illisible → jamais suggérée', () => {
    expect(lastPosologieFor('KARDEGIC 75 MG', [{ ...empoisonnee, created_at: '' }])).toBeNull();
  });
  it('autre dosage → pas de suggestion croisée', () => {
    expect(lastPosologieFor('KARDEGIC 300 MG', past)).toBeNull();
  });
  it('jamais prescrit → aucune suggestion (champ vide)', () => {
    expect(lastPosologieFor('BRUFEN 400 MG', past)).toBeNull();
    expect(lastPosologieFor('', past)).toBeNull();
  });
});
