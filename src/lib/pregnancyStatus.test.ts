import { describe, it, expect } from 'vitest';
import {
  pregnancyContext, classifyPregnancyAlert, parseTermWindow, isMajorTeratogen, ddrToSa, saToDdr, pregnancyKinds,
  type PregnancyFields, type PregnancyMode,
} from './pregnancyStatus';

const TODAY = new Date(2026, 9, 15); // 15/10/2026
const daysAgo = (n: number) => {
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - n);
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Motifs de la table teratogenes_majeurs.
const TERATOGENES = ['valpro', 'divalpro', 'isotretinoin', 'acitretin', 'methotrexat', 'mycophenol', 'thalidomid', 'acenocoumarol', 'warfarin', 'fluindion'];

const DEPAKINE   = { nom: 'DEPAKINE CHRONO 500 MG', dci: 'VALPROATE DE SODIUM // ACIDE VALPROIQUE', ingredients: ['valproic acid'] };
const GLUCOPHAGE = { nom: 'GLUCOPHAGE 850 MG', dci: 'METFORMINE', ingredients: ['metformin'] };
const BRUFEN     = { nom: 'BRUFEN 400 MG', dci: 'IBUPROFÈNE', ingredients: ['ibuprofène', 'ibuprofen'] };
const SINTROM    = { nom: 'SINTROM 4 MG', dci: 'ACÉNOCOUMAROL', ingredients: ['acenocoumarol'] };

type Med = typeof BRUFEN;
const decide = (med: Med, condition: string, p: PregnancyFields) =>
  classifyPregnancyAlert(condition, pregnancyContext(p, TODAY), isMajorTeratogen(med, TERATOGENES));

/** Le bloc grossesse empêche-t-il le vert ? (tout sauf « rassurée ») */
const blocksGreen = (modes: PregnancyMode[]) => modes.some(m => m !== 'rassuree');

const nonEnceinte = (jours: number): PregnancyFields => ({ grossesse_statut: 'non_enceinte', grossesse_maj_le: daysAgo(jours) });
const enceinte = (sa: number | null): PregnancyFields => ({
  grossesse_statut: 'enceinte', grossesse_ddr: sa === null ? null : saToDdr(sa, TODAY), grossesse_maj_le: daysAgo(3),
});

describe('cas cliniques obligatoires', () => {
  it('Depakine + déclarée non enceinte il y a 1 mois → toujours conditionnelle (tératogène)', () => {
    const d = decide(DEPAKINE, 'Grossesse', nonEnceinte(30));
    expect(d.mode).toBe('conditionnelle');
    expect(d.note).toContain('Tératogène majeur');
    expect(blocksGreen([d.mode])).toBe(true);
  });

  it('Glucophage + non enceinte il y a 1 mois → vert possible', () => {
    const d = decide(GLUCOPHAGE, 'Grossesse', nonEnceinte(30));
    expect(d.mode).toBe('rassuree');
    expect(d.note).toMatch(/^Déclarée non enceinte le \d{2}\/\d{2}$/);
    expect(blocksGreen([d.mode])).toBe(false);
  });

  it('même cas déclaré il y a 4 mois → « Sécuritaire sous réserve » (conditionnelle)', () => {
    const d = decide(GLUCOPHAGE, 'Grossesse', nonEnceinte(122));
    expect(d.mode).toBe('conditionnelle');
    expect(d.note).toContain('expiré');
    expect(blocksGreen([d.mode])).toBe(true);
  });

  it('Brufen + enceinte 30 SA → CI ferme (3e trimestre)', () => {
    expect(decide(BRUFEN, 'Grossesse — 3ème trimestre (après 24 SA)', enceinte(30)).mode).toBe('ferme');
    expect(decide(BRUFEN, 'Grossesse (3e trimestre)', enceinte(30)).mode).toBe('ferme');
  });

  it('Brufen + enceinte 10 SA → CI 3e trimestre « À évaluer » avec le terme', () => {
    const d = decide(BRUFEN, 'Grossesse — 3ème trimestre (après 24 SA)', enceinte(10));
    expect(d).toEqual({ mode: 'a_evaluer', note: 'à partir de 24 SA — terme actuel 10 SA' });
    expect(decide(BRUFEN, 'Grossesse (3e trimestre)', enceinte(10)).note).toBe('à partir de 28 SA — terme actuel 10 SA');
  });

  it('enceinte sans DDR → toutes les CI fermes', () => {
    for (const c of ['Grossesse', 'Grossesse — 1er trimestre', 'Grossesse — 3ème trimestre (après 24 SA)', 'Grossesse — 2ème et 3ème trimestre']) {
      expect(decide(BRUFEN, c, enceinte(null)).mode).toBe('ferme');
    }
  });

  it('allaitement oui → CI allaitement fermes', () => {
    const p: PregnancyFields = { grossesse_statut: 'non_enceinte', allaitement: true, grossesse_maj_le: daysAgo(10) };
    expect(decide(BRUFEN, 'Allaitement', p)).toEqual({ mode: 'ferme', note: 'Patiente allaitante' });
    expect(decide(BRUFEN, 'Allaitement (6 premières semaines)', p).mode).toBe('ferme');
    // … et la CI grossesse du même médicament reste rassurée
    expect(decide(BRUFEN, 'Grossesse', p).mode).toBe('rassuree');
  });
});

describe('statut effectif', () => {
  it('inconnu ou non renseigné → comportement d’origine (conditionnelle)', () => {
    expect(decide(GLUCOPHAGE, 'Grossesse', {}).mode).toBe('conditionnelle');
    expect(decide(GLUCOPHAGE, 'Grossesse', { grossesse_statut: 'inconnu', grossesse_maj_le: daysAgo(1) }).mode).toBe('conditionnelle');
    expect(decide(GLUCOPHAGE, 'Allaitement', {}).mode).toBe('conditionnelle');
  });

  it('« non enceinte » sans date de déclaration → jamais rassurant', () => {
    expect(decide(GLUCOPHAGE, 'Grossesse', { grossesse_statut: 'non_enceinte' }).mode).toBe('conditionnelle');
  });

  it('limite des 3 mois : 92 jours valable, 93 jours expiré', () => {
    expect(decide(GLUCOPHAGE, 'Grossesse', nonEnceinte(92)).mode).toBe('rassuree');
    expect(decide(GLUCOPHAGE, 'Grossesse', nonEnceinte(93)).mode).toBe('conditionnelle');
  });

  it('« enceinte » non mis à jour depuis plus de 10 mois → « à confirmer », traité comme inconnu', () => {
    const p: PregnancyFields = { grossesse_statut: 'enceinte', grossesse_ddr: daysAgo(400), grossesse_maj_le: daysAgo(330) };
    const ctx = pregnancyContext(p, TODAY);
    expect(ctx).toMatchObject({ statut: 'inconnu', aConfirmer: true });
    expect(decide(BRUFEN, 'Grossesse', p)).toEqual({ mode: 'conditionnelle', note: 'Statut « enceinte » à confirmer' });
  });

  it('DDR donnant un terme dépassé (> 43 SA) → à confirmer', () => {
    const p: PregnancyFields = { grossesse_statut: 'enceinte', grossesse_ddr: daysAgo(46 * 7), grossesse_maj_le: daysAgo(20) };
    expect(pregnancyContext(p, TODAY).aConfirmer).toBe(true);
  });

  it('« n’allaite pas » récent → CI allaitement rassurées ; ancien → conditionnelles', () => {
    expect(decide(BRUFEN, 'Allaitement', { allaitement: false, grossesse_maj_le: daysAgo(10) }).mode).toBe('rassuree');
    expect(decide(BRUFEN, 'Allaitement', { allaitement: false, grossesse_maj_le: daysAgo(200) }).mode).toBe('conditionnelle');
  });
});

describe('CI toujours conditionnelles', () => {
  it('« en âge de procréer » : conditionnelle quel que soit le statut', () => {
    const c = 'Femme en âge de procréer sans contraception efficace';
    expect(decide(GLUCOPHAGE, c, nonEnceinte(5)).mode).toBe('conditionnelle');
    expect(decide(GLUCOPHAGE, c, enceinte(12)).mode).toBe('conditionnelle');
    expect(decide(GLUCOPHAGE, c, {}).mode).toBe('conditionnelle');
    expect(pregnancyKinds(c)).toEqual(['procreation']);
  });

  it('projet de grossesse (planifiée, mois suivant l’arrêt) : conditionnelle même si non enceinte', () => {
    expect(decide(GLUCOPHAGE, 'Déficit en acide folique (grossesse planifiée)', nonEnceinte(5)).mode).toBe('conditionnelle');
    expect(decide(GLUCOPHAGE, "Grossesse dans le mois suivant l'arrêt (isotrétinoïne)", nonEnceinte(5)).mode).toBe('conditionnelle');
  });

  it('marques saisies à la main (hors base) reconnues par les motifs de marque', () => {
    const motifs = [...TERATOGENES, 'depakin', 'sintrom', 'roaccutan'];
    for (const nom of ['Depakine', 'MINI-SINTROM 1 MG', 'Roaccutane 20']) expect(isMajorTeratogen({ nom }, motifs)).toBe(true);
    expect(isMajorTeratogen({ nom: 'Doliprane 1000' }, motifs)).toBe(false);
  });

  it('tératogènes majeurs : valproate, AVK, isotrétinoïne, méthotrexate, mycophénolate, thalidomide, acitrétine', () => {
    expect(isMajorTeratogen(DEPAKINE, TERATOGENES)).toBe(true);
    expect(isMajorTeratogen(SINTROM, TERATOGENES)).toBe(true);
    for (const dci of ['ISOTRÉTINOÏNE', 'METHOTREXATE', 'MYCOPHÉNOLATE MOFÉTIL', 'THALIDOMIDE', 'ACITRÉTINE', 'WARFARINE', 'FLUINDIONE']) {
      expect(isMajorTeratogen({ nom: 'X', dci }, TERATOGENES)).toBe(true);
    }
    expect(isMajorTeratogen(GLUCOPHAGE, TERATOGENES)).toBe(false);
    expect(isMajorTeratogen(BRUFEN, TERATOGENES)).toBe(false);
    expect(decide(SINTROM, 'Grossesse', nonEnceinte(10)).mode).toBe('conditionnelle');
  });

  it('enceinte : un tératogène est une CI ferme comme les autres', () => {
    expect(decide(DEPAKINE, 'Grossesse', enceinte(8)).mode).toBe('ferme');
  });
});

describe('terme lu dans le libellé', () => {
  it('fenêtres reconnues', () => {
    expect(parseTermWindow('Grossesse — 1er trimestre')).toMatchObject({ fromSa: 0, toSa: 14 });
    expect(parseTermWindow('Grossesse (2e trimestre)')).toMatchObject({ fromSa: 14, toSa: 28 });
    expect(parseTermWindow('Grossesse — 3ème trimestre')).toMatchObject({ fromSa: 28, toSa: null });
    expect(parseTermWindow('Grossesse — 2ème et 3ème trimestre')).toMatchObject({ fromSa: 14, toSa: null });
    expect(parseTermWindow('Grossesse — 3ème trimestre (après 24 SA)')).toMatchObject({ fromSa: 24, toSa: null });
    expect(parseTermWindow('Grossesse — insuffisance rénale fœtale (> 20 SA)')).toMatchObject({ fromSa: 20, toSa: null });
  });
  it('libellé sans terme ou non reconnu → toute la grossesse', () => {
    expect(parseTermWindow('Grossesse')).toBeNull();
    expect(parseTermWindow('Grossesse (toute période)')).toBeNull();
    expect(parseTermWindow('Grossesse — hypertension artérielle gravidique')).toBeNull();
    expect(decide(BRUFEN, 'Grossesse — hypertension artérielle gravidique', enceinte(10)).mode).toBe('ferme');
  });
  it('CI du 1er trimestre à 30 SA : période passée → reste conditionnelle, avec le terme', () => {
    const d = decide(BRUFEN, 'Grossesse — 1er trimestre', enceinte(30));
    expect(d.mode).toBe('conditionnelle');
    expect(d.note).toContain('terme actuel 30 SA');
  });
  it('CI 2e et 3e trimestre : 10 SA → à évaluer ; 14 SA → ferme', () => {
    expect(decide(BRUFEN, 'Grossesse — 2ème et 3ème trimestre', enceinte(10)).mode).toBe('a_evaluer');
    expect(decide(BRUFEN, 'Grossesse — 2ème et 3ème trimestre', enceinte(14)).mode).toBe('ferme');
  });
});

describe('DDR ↔ terme', () => {
  it('terme saisi en SA converti en DDR, puis recalculé', () => {
    const ddr = saToDdr(12, TODAY);
    expect(ddrToSa(ddr, TODAY)).toBe(12);
    const plusTard = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 21);
    expect(ddrToSa(ddr, plusTard)).toBe(15); // le terme avance tout seul
  });
  it('DDR absente ou future → terme inconnu', () => {
    expect(ddrToSa(null, TODAY)).toBeNull();
    expect(ddrToSa('2027-01-01', TODAY)).toBeNull();
  });
});
