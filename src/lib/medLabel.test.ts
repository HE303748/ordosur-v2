import { describe, it, expect } from 'vitest';
import {
  medLabel, extractDosage, cleanForme, dosageManquant, isCleanFiche, ligneLabel, dosageBlockMessage,
} from './medLabel';

// Fiches réelles (🇲🇦 commercialisées).
const BRUFEN_SALE   = { nom_commercial: 'BRUFEN', nom: 'BRUFEN COMPRIME ENROBE à 400 MG 1 BOITE 30 COMPRIME', forme: 'COMPRIME ENROBE à 400 MG 1 BOITE 30 COMPRIME', dosage: '400 MG' };
const BRUFEN_PROPRE = { nom_commercial: 'BRUFEN 400 MG', nom: 'BRUFEN 400 MG, Comprimé enrobé', forme: 'Comprimé enrobé', dosage: '400 MG' };
const BRUFEN_SUSP   = { nom_commercial: 'BRUFEN', nom: 'BRUFEN SUSPENSION BUVABLE à 2 % 1 FLACON 150 ML', forme: 'SUSPENSION BUVABLE à 2 % 1 FLACON 150 ML', dosage: '150 ML' };
const KARDEGIC      = { nom_commercial: 'KARDEGIC 75 MG', nom: 'KARDEGIC 75 MG, Poudre en sachet', forme: 'Poudre en sachet', dosage: '75 MG' };
const SANS_DOSAGE   = { nom_commercial: 'MONO-TILDIEM LP', nom: 'MONO-TILDIEM LP', forme: null, dosage: null };

describe('medLabel — marque + dosage + forme, toujours', () => {
  it('fiche de la seconde source : le dosage manquant est rétabli', () => {
    expect(medLabel(BRUFEN_SALE)).toBe('BRUFEN 400 MG, Comprimé enrobé');
  });
  it('les deux sources donnent le même libellé', () => {
    expect(medLabel(BRUFEN_SALE)).toBe(medLabel(BRUFEN_PROPRE));
  });
  it('fiche propre inchangée', () => {
    expect(medLabel(KARDEGIC)).toBe('KARDEGIC 75 MG, Poudre en sachet');
  });
  it('dosage pris dans la forme avant la colonne (volume du flacon)', () => {
    expect(extractDosage(BRUFEN_SUSP)).toBe('2 %');
    expect(medLabel(BRUFEN_SUSP)).toBe('BRUFEN 2 %, Suspension buvable');
  });
  it('forme déjà présente dans le nom → pas de répétition', () => {
    expect(medLabel({ nom_commercial: 'DOLIPRANE 1000 mg, comprimé effervescent sécable', forme: 'comprimé effervescent sécable' }))
      .toBe('DOLIPRANE 1000 mg, comprimé effervescent sécable');
  });
  it('la colonne dosage de la seconde source n’est JAMAIS utilisée (souvent fausse)', () => {
    // Fiches réelles : la colonne contient la taille de la boîte ou un autre dosage.
    const amoxilGelule = { nom_commercial: 'AMOXIL', forme: '1 BOITE 24 GELULE', dosage: '24 G' };
    expect(extractDosage(amoxilGelule)).toBeNull();
    expect(medLabel(amoxilGelule)).toBe('AMOXIL, Gélule');
    expect(dosageManquant(amoxilGelule)).toBe(true);
    const glucophage = { nom_commercial: 'GLUCOPHAGE 500', forme: 'COMPRIME PELLICULE', dosage: '1000   MG' };
    expect(medLabel(glucophage)).toBe('GLUCOPHAGE 500, Comprimé pelliculé');
    expect(medLabel(glucophage)).not.toContain('1000');
  });
  it('nombre nu dans le nom + dosage explicite de la forme → unité ajoutée, sans répétition', () => {
    expect(medLabel({ nom_commercial: 'GLUCOPHAGE 1000', forme: 'COMPRIME PELLICULE à 1000 MG 1 BOITE 30 COMPRIME', dosage: '1000 MG' }))
      .toBe('GLUCOPHAGE 1000 MG, Comprimé pelliculé');
  });
  it('cleanForme retire le conditionnement', () => {
    expect(cleanForme('POUDRE POUR SOLUTION 1 BOITE 12 SACHET')).toBe('Poudre pour solution');
    expect(cleanForme('1 BOITE 12 SACHET')).toBe('Sachet');
    expect(cleanForme('SUPPOSITOIRE à 1 G 1 BOITE 10 SUPPOSITO')).toBe('Suppositoire');
    expect(cleanForme('Comprimé sécable')).toBe('Comprimé sécable');
  });
  it('source principale reconnue', () => {
    expect(isCleanFiche(BRUFEN_PROPRE)).toBe(true);
    expect(isCleanFiche(BRUFEN_SALE)).toBe(false);
  });
});

describe('dosage absent de la fiche → « Dosage à préciser »', () => {
  it('aucun dosage nulle part → signalé', () => {
    expect(dosageManquant(SANS_DOSAGE)).toBe(true);
    expect(dosageManquant(BRUFEN_SALE)).toBe(false);
  });
  it('bloque l’aperçu tant que le médecin ne l’a pas complété', () => {
    const line = { nom: 'MONO-TILDIEM LP', dosageAPreciser: true, dosagePrecise: '' };
    expect(dosageBlockMessage([line])).toBe('Dosage à préciser pour MONO-TILDIEM LP.');
    expect(dosageBlockMessage([{ ...line, dosagePrecise: '300 mg' }])).toBeNull();
    expect(dosageBlockMessage([{ nom: 'BRUFEN 400 MG, Comprimé enrobé' }])).toBeNull();
  });
  it('le dosage précisé figure sur la ligne enregistrée et imprimée', () => {
    expect(ligneLabel({ nom: 'MONO-TILDIEM LP', dosagePrecise: ' 300 mg ' })).toBe('MONO-TILDIEM LP — 300 mg');
    expect(ligneLabel({ nom: 'BRUFEN 400 MG, Comprimé enrobé' })).toBe('BRUFEN 400 MG, Comprimé enrobé');
  });
});
