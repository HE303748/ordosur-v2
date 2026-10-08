import { describe, it, expect } from 'vitest';
import { dedupKey, dedupeMedicaments, duplicateIds, type DedupMed } from './medDedupe';

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
  const rows = [A_EFFERV, A_SECABLE, A_SUPPO, B_SECABLE, B_SUPPO, D500];

  it('une seule entrée par groupe, ordre de la recherche conservé', () => {
    const out = dedupeMedicaments(rows);
    expect(out).toHaveLength(4);
    expect(out[0].id).toBe('a2'); // effervescent : pas de doublon
    expect(out[3].id).toBe('d5');
  });
  it('priorité à l’entrée vérifiable par le moteur (ingrédients mappés)', () => {
    const out = dedupeMedicaments(rows, new Set(['a1', 'a3']));
    expect(out.map(m => m.id)).toEqual(['a2', 'a1', 'a3', 'd5']);
  });
  it('à vérifiabilité égale → la plus complète', () => {
    const out = dedupeMedicaments(rows, new Set(['a1', 'b1', 'a3', 'b3']));
    expect(out.map(m => m.id)).toEqual(['a2', 'b1', 'b3', 'd5']); // b* ont un EAN en plus
  });
  it('aucun doublon → liste inchangée', () => {
    expect(dedupeMedicaments([A_EFFERV, D500])).toEqual([A_EFFERV, D500]);
  });
  it('duplicateIds : seuls les membres de groupes en double', () => {
    expect(duplicateIds(rows).sort()).toEqual(['a1', 'a3', 'b1', 'b3']);
  });
});
