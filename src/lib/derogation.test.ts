import { describe, it, expect } from 'vitest';
import {
  requiresDerogation, derogationAlerts, ordonnanceSignature, isConfirmationValid,
  validateDerogationForm, buildDerogationEntries,
  type DerogationAlertLike, type DerogationConfirmation,
} from './derogation';

const ci = (over: Partial<DerogationAlertLike> = {}): DerogationAlertLike => ({
  type: 'contraindication', severite: 'contre_indication', description: 'CI',
  involved: ['BRUFEN 400 MG'], condition: 'Ulcère gastroduodénal actif', origin: 'nouveau', ...over,
});

describe('requiresDerogation', () => {
  it('CI absolue → oui', () => {
    expect(requiresDerogation(ci())).toBe(true);
  });
  it('CI absolue issue d’un antécédent → oui', () => {
    expect(requiresDerogation(ci({ condition: 'antécédent de hémorragie digestive' }))).toBe(true);
  });
  it('interaction majeure → oui', () => {
    expect(requiresDerogation(ci({ type: 'drug_drug', severite: 'majeure', involved: ['KARDEGIC', 'SINTROM'], condition: undefined }))).toBe(true);
  });
  it('« À évaluer » → non', () => {
    expect(requiresDerogation(ci({ severite: 'a_evaluer' }))).toBe(false);
  });
  it('« Précaution » → non', () => {
    expect(requiresDerogation(ci({ severite: 'precaution' }))).toBe(false);
  });
  it('CI relative (majeure sur une contre-indication) → non', () => {
    expect(requiresDerogation(ci({ severite: 'majeure' }))).toBe(false);
  });
  it('interaction modérée → non', () => {
    expect(requiresDerogation(ci({ type: 'drug_drug', severite: 'moderee' }))).toBe(false);
  });
  it('alerte préexistante (traitement de fond seul) → non', () => {
    expect(requiresDerogation(ci({ origin: 'fond' }))).toBe(false);
  });
  it('bloc conditionnel grossesse → non', () => {
    expect(requiresDerogation(ci({ pregnancyContext: true }))).toBe(false);
  });
  it('dédoublonnage des alertes à confirmer', () => {
    expect(derogationAlerts([ci(), ci(), ci({ severite: 'precaution' })])).toHaveLength(1);
  });
});

describe('invalidation de la dérogation', () => {
  const lines = [{ nom: 'BRUFEN 400 MG', posologie: '1 cp x 3/j', duree: '5 jours', quantite: '1' }];
  const alerts = [ci()];
  const sig = ordonnanceSignature(lines, alerts);
  const conf: DerogationConfirmation = {
    signature: sig, motif: 'benefice_risque', motifAutre: null, commentaire: null, confirmedAt: '2026-10-08T10:00:00.000Z',
  };

  it('ordonnance inchangée → confirmation valide', () => {
    expect(isConfirmationValid(conf, ordonnanceSignature([...lines.map(l => ({ ...l }))], alerts))).toBe(true);
  });
  it('posologie modifiée → confirmation annulée', () => {
    expect(isConfirmationValid(conf, ordonnanceSignature([{ ...lines[0], posologie: '1 cp x 2/j' }], alerts))).toBe(false);
  });
  it('médicament ajouté → confirmation annulée', () => {
    expect(isConfirmationValid(conf, ordonnanceSignature([...lines, { nom: 'DOLIPRANE' }], alerts))).toBe(false);
  });
  it('nouvelle alerte → confirmation annulée', () => {
    const more = [...alerts, ci({ involved: ['KARDEGIC'], condition: 'Hémorragie active' })];
    expect(isConfirmationValid(conf, ordonnanceSignature(lines, more))).toBe(false);
  });
  it('aucune confirmation → invalide', () => {
    expect(isConfirmationValid(null, sig)).toBe(false);
  });
});

describe('modale de dérogation', () => {
  it('motif obligatoire, texte obligatoire si « Autre », case obligatoire', () => {
    expect(validateDerogationForm({ motif: null, motifAutre: '', confirmed: true })).not.toBeNull();
    expect(validateDerogationForm({ motif: 'autre', motifAutre: '  ', confirmed: true })).not.toBeNull();
    expect(validateDerogationForm({ motif: 'avis_specialise', motifAutre: '', confirmed: false })).not.toBeNull();
    expect(validateDerogationForm({ motif: 'autre', motifAutre: 'Avis gastro', confirmed: true })).toBeNull();
  });
  it('traçabilité : une entrée par alerte avec motif et horodatage', () => {
    const conf: DerogationConfirmation = {
      signature: 'x', motif: 'autre', motifAutre: 'Avis gastro', commentaire: ' sous IPP ', confirmedAt: '2026-10-08T10:00:00.000Z',
    };
    const e = buildDerogationEntries([ci()], conf);
    expect(e).toEqual([{
      medicament: 'BRUFEN 400 MG', alerte: 'BRUFEN 400 MG — Ulcère gastroduodénal actif', severite: 'contre_indication',
      motif: 'Autre : Avis gastro', commentaire: 'sous IPP', horodatage: '2026-10-08T10:00:00.000Z',
    }]);
  });
});
