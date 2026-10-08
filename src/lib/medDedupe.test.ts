import { describe, it, expect } from 'vitest';
import { dedupKey, dedupeMedicaments, duplicateIds, type DedupMed } from './medDedupe';
import { medLabel } from './medLabel';

// Lignes réelles de la base (🇲🇦 commercialisés, deux sources de données).
const A_SECABLE: DedupMed = { id: 'a1', nom: 'DOLIPRANE 1 G, Comprimé sécable', nom_commercial: 'DOLIPRANE 1 G', laboratoire: 'BOTTU S.A.', forme: 'Comprimé sécable', dosage: '1 G', dci: 'PARACÉTAMOL', ppv_ma: 13.1, ean: null };
const A_EFFERV:  DedupMed = { id: 'a2', nom: 'DOLIPRANE 1 G, Comprimé effervescent sécable', nom_commercial: 'DOLIPRANE 1 G', laboratoire: 'BOTTU S.A.', forme: 'Comprimé effervescent sécable', dosage: '1 G', dci: 'PARACÉTAMOL', ppv_ma: 13.7, ean: null };
const A_SUPPO:   DedupMed = { id: 'a3', nom: 'DOLIPRANE 1 G, Suppositoire', nom_commercial: 'DOLIPRANE 1 G', laboratoire: 'BOTTU S.A.', forme: 'Suppositoire', dosage: '1 G', dci: 'PARACÉTAMOL', ppv_ma: 13.4, ean: null };
const B_SECABLE: DedupMed = { id: 'b1', nom: 'DOLIPRANE COMPRIME SECABLE à 1 G 1 BOITE 10 COMPRIME', nom_commercial: 'DOLIPRANE', laboratoire: 'BOTTU', forme: 'COMPRIME SECABLE à 1 G 1 BOITE 10 COMPRIME', dosage: '1 G', dci: 'PARACETAMOL', ppv_ma: 14, ean: '6118000040248' };
const B_SUPPO:   DedupMed = { id: 'b3', nom: 'DOLIPRANE SUPPOSITOIRE à 1 G 1 BOITE 10 SUPPOSITO', nom_commercial: 'DOLIPRANE', laboratoire: 'BOTTU', forme: 'SUPPOSITOIRE à 1 G 1 BOITE 10 SUPPOSITO', dosage: '1 G', dci: 'PARACETAMOL', ppv_ma: 14.4, ean: '6118000040248' };
const D500:      DedupMed = { id: 'd5', nom: 'DOLIPRANE 500 MG, Comprimé sécable', nom_commercial: 'DOLIPRANE 500 MG', laboratoire: 'BOTTU S.A.', forme: 'Comprimé sécable', dosage: '500 MG', dci: 'PARACÉTAMOL' };

describe('dedupKey', () => {
  it('même spécialité dans deux sources → même clé', () => {
    expect(dedupKey(A_SECABLE)).toBe(dedupKey(B_SECABLE));
    expect(dedupKey(A_SUPPO)).toBe(dedupKey(B_SUPPO));
  });
  it('formes différentes → jamais fusionnées', () => {
    expect(dedupKey(A_SECABLE)).not.toBe(dedupKey(A_EFFERV));
    expect(dedupKey(A_SECABLE)).not.toBe(dedupKey(A_SUPPO));
  });
  it('dosages différents → jamais fusionnés', () => {
    expect(dedupKey(A_SECABLE)).not.toBe(dedupKey(D500));
  });
  it('laboratoires différents → jamais fusionnés', () => {
    expect(dedupKey(A_SECABLE)).not.toBe(dedupKey({ ...A_SECABLE, id: 'x', laboratoire: 'SANOFI' }));
  });
});

describe('dedupeMedicaments', () => {
  // Ordre de la RPC pour « doliprane » : les fiches de la seconde source (nom exact) d'abord.
  const rows = [B_SECABLE, B_SUPPO, A_EFFERV, A_SECABLE, A_SUPPO, D500];

  it('une seule entrée par groupe ; à vérifiabilité égale, la fiche au nom propre', () => {
    const out = dedupeMedicaments(rows);
    expect(out.map(m => m.id)).toEqual(['a2', 'a1', 'a3', 'd5']);
  });
  it('fiche propre vérifiable préférée à la fiche sale vérifiable', () => {
    const out = dedupeMedicaments(rows, new Set(['a1', 'b1', 'a3', 'b3', 'a2', 'd5']));
    expect(out.map(m => m.id)).toEqual(['a2', 'a1', 'a3', 'd5']);
  });
  it('seule la fiche sale est vérifiable → elle est gardée (libellé propre à l’affichage)', () => {
    const out = dedupeMedicaments(rows, new Set(['b1', 'a3', 'a2', 'd5']));
    expect(out.map(m => m.id).sort()).toEqual(['a2', 'a3', 'b1', 'd5']);
    expect(medLabel(out.find(m => m.id === 'b1')!)).toBe('DOLIPRANE 1 G, Comprimé sécable');
  });
  it('ordre : fiches au nom propre avant celles de la seconde source', () => {
    const out = dedupeMedicaments(rows, new Set(['b1', 'a3', 'a2', 'd5']));
    expect(out[out.length - 1].id).toBe('b1');
  });
  it('quasi-doublons au conditionnement près fusionnés', () => {
    const boite20 = { ...B_SECABLE, id: 'b1x', nom: 'DOLIPRANE COMPRIME SECABLE à 1 G 1 BOITE 20 COMPRIME', forme: 'COMPRIME SECABLE à 1 G 1 BOITE 20 COMPRIME' };
    expect(dedupeMedicaments([B_SECABLE, boite20])).toHaveLength(1);
  });
  it('« buvable … SACHET » (seconde source) = « Sachet » (source principale)', () => {
    const sale   = { id: 's1', nom_commercial: 'DOLIPRANE', laboratoire: 'BOTTU', forme: 'BUVABLE à 100 MG 1 BOITE 12 SACHET', dosage: '100 MG' };
    const propre = { id: 's2', nom_commercial: 'DOLIPRANE 100 MG', laboratoire: 'BOTTU S.A.', forme: 'Sachet', dosage: '100 MG' };
    expect(dedupKey(sale)).toBe(dedupKey(propre));
  });
  it('« 1 G » et « 1000 MG » : même dosage', () => {
    expect(dedupKey({ ...A_SECABLE, id: 'm', nom_commercial: 'DOLIPRANE 1000 MG', dosage: '1000 MG' })).toBe(dedupKey(A_SECABLE));
  });
  it('libération prolongée jamais fusionnée avec la forme standard', () => {
    const std = { id: 't1', nom_commercial: 'TILDIEM 60 MG', laboratoire: 'SANOFI', forme: 'Comprimé', dosage: '60 MG' };
    const lp  = { id: 't2', nom_commercial: 'TILDIEM LP 60 MG', laboratoire: 'SANOFI', forme: 'Comprimé LP', dosage: '60 MG' };
    expect(dedupKey(std)).not.toBe(dedupKey(lp));
  });
  it('aucun doublon → liste inchangée', () => {
    expect(dedupeMedicaments([A_EFFERV, D500])).toEqual([A_EFFERV, D500]);
  });
  it('duplicateIds : seuls les membres de groupes en double', () => {
    expect(duplicateIds(rows).sort()).toEqual(['a1', 'a3', 'b1', 'b3']);
  });
});
