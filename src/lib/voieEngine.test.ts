import { describe, it, expect } from 'vitest';
import { ficheFiltree, regleApplicable, libelleFormeLocale, type FicheVoie } from './voieEngine';

const gel: FicheVoie = { voie: 'cutanee', portee: 'locale', rcpLu: true };          // VOLTARENE EMULGEL
const comprime: FicheVoie = { voie: 'orale', portee: 'systemique', rcpLu: false };   // VOLTARENE 50 mg
const patch: FicheVoie = { voie: 'transdermique', portee: 'systemique', rcpLu: false }; // DUROGESIC
const collyre: FicheVoie = { voie: 'ophtalmique', portee: 'locale', rcpLu: true };   // TIMOPTOL, CHIBROXINE
const gelNonLu: FicheVoie = { voie: 'cutanee', portee: 'locale', rcpLu: false };     // forme locale, RCP de la voie non lu

const orale = { voie: 'generale', voie_stricte: false, condition_type: 'pathologie' };
const sansRcp = { voie: null, voie_stricte: false, condition_type: 'pathologie' };
const collyreAsthme = { voie: 'ophtalmique', voie_stricte: false, condition_type: 'pathologie' };
const gelGrossesse = { voie: 'cutanee', voie_stricte: true, condition_type: 'pathologie' };
const allergie = { voie: null, voie_stricte: false, condition_type: 'allergie_med' };

describe('voieEngine — fiche filtrée', () => {
  it('forme locale dont le RCP de la voie est lu', () => {
    expect(ficheFiltree(gel)).toBe(true);
    expect(ficheFiltree(collyre)).toBe(true);
  });
  it('jamais une forme systémique, un patch, une forme locale non couverte ni une fiche inconnue', () => {
    for (const f of [comprime, patch, gelNonLu, null, undefined, { voie: null, portee: 'locale', rcpLu: true }]) {
      expect(ficheFiltree(f)).toBe(false);
    }
  });
});

describe('voieEngine — une crème, un gel ou un collyre ne reçoit que les règles de sa voie', () => {
  it('VOLTARENE EMULGEL : plus de règle orale ni de règle sans RCP', () => {
    expect(regleApplicable(orale, gel)).toBe(false);
    expect(regleApplicable(sansRcp, gel)).toBe(false);
    expect(regleApplicable(collyreAsthme, gel)).toBe(false);
  });
  it('VOLTARENE EMULGEL : garde la règle du RCP du gel et les allergies', () => {
    expect(regleApplicable(gelGrossesse, gel)).toBe(true);
    expect(regleApplicable(allergie, gel)).toBe(true);
    expect(regleApplicable({ voie: 'generale,cutanee', voie_stricte: false, condition_type: 'pathologie' }, gel)).toBe(true);
  });
  it('TIMOPTOL collyre : garde la contre-indication « asthme » lue dans le RCP du collyre', () => {
    expect(regleApplicable(collyreAsthme, collyre)).toBe(true);
    expect(regleApplicable(orale, collyre)).toBe(false);
  });
});

describe('voieEngine — une forme systémique ne perd rien', () => {
  it('VOLTARENE 50 mg et DUROGESIC : toutes les règles non strictes s’appliquent', () => {
    for (const f of [comprime, patch]) {
      for (const r of [orale, sansRcp, collyreAsthme, allergie]) expect(regleApplicable(r, f)).toBe(true);
    }
  });
  it('forme locale dont le RCP n’a pas été lu : inchangée', () => {
    for (const r of [orale, sansRcp, allergie]) expect(regleApplicable(r, gelNonLu)).toBe(true);
  });
  it('fiche inconnue (médicament saisi à la main, lecture échouée) : traitée comme systémique', () => {
    for (const r of [orale, sansRcp, collyreAsthme, allergie]) {
      expect(regleApplicable(r, null)).toBe(true);
      expect(regleApplicable(r, undefined)).toBe(true);
    }
  });
});

describe('voieEngine — une règle stricte ne déborde jamais sur une autre voie', () => {
  it('« grossesse ≥ 6e mois » du gel ne s’applique pas au comprimé ni au collyre', () => {
    expect(regleApplicable(gelGrossesse, comprime)).toBe(false);
    expect(regleApplicable(gelGrossesse, collyre)).toBe(false);
    expect(regleApplicable(gelGrossesse, null)).toBe(false);
  });
  it('elle s’applique à toute fiche de la même voie, même si son RCP n’a pas été lu', () => {
    expect(regleApplicable(gelGrossesse, gelNonLu)).toBe(true);
  });
});

describe('voieEngine — libellé', () => {
  it('forme locale filtrée', () => {
    expect(libelleFormeLocale(gel)).toBe('forme cutanée');
    expect(libelleFormeLocale(collyre)).toBe('forme ophtalmique');
    expect(libelleFormeLocale(comprime)).toBe('');
  });
});
