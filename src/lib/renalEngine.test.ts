import { describe, it, expect } from 'vitest';
import type { ExamRef } from './examSearch';
import {
  ckdEpi2021, cockcroftGault, renalStade, ageAns, fraicheurCreatinine, poidsAncien, parsePoids, renalStatus, latestCreatinine,
  dfgLine, cockcroftLine, dfgActuelLine, parseRenalCondition, evaluateRenal, reservesLabel, mergeRenalWithExisting, applyInfoLines,
  isRenalCard, renalClasses, medMatchesPattern, hasDialyse, SOURCE_BASE,
  type BaseCI, type CreatinineResult, type RegleRenale, type RenalClasse, type RenalInput, type RenalStatus,
} from './renalEngine';
import { derogationKind, requiresDerogation, alertVerdictLevel } from './derogation';
import { applyMergedLines, buildInteractionLogRows, countBySource, type LoggableAlert } from './safetyGuards';
import type { EngineMed } from './antecedentEngine';
import examData from './examens_reference.data.json';
import renalData from './regles_renales.data.json';

const creatRef = (examData.examens as ExamRef[]).find(e => e.code === 'CREATININE')!;
const regles = renalData.regles as RegleRenale[];
const classes = renalData.classes as RenalClasse[];
const TODAY = new Date(2026, 9, 9); // 09/10/2026

const C = (valeur: number, unite: string | null, date = '2026-09-12', id = 'c1'): CreatinineResult =>
  ({ id, valeur_num: valeur, unite_saisie: unite, date_prelevement: date, created_at: `${date}T10:00:00Z` });
const input = (over: Partial<RenalInput> = {}): RenalInput => ({
  dateNaissance: '1956-03-01', sexe: 'M', poidsKg: 72, poidsDate: '2026-09-01', pathologies: [],
  creatinines: [C(10, 'mg/L')], creatRef, today: TODAY, ...over,
});
/** Statut connu avec des valeurs imposées (tests de bornes exactes). */
const S = (over: Partial<RenalStatus> = {}): RenalStatus => ({ ...renalStatus(input()), ...over });
const inconnu = (over: Partial<RenalInput> = {}) => renalStatus(input({ creatinines: [], ...over }));

const med = (id: string, nom: string, dci: string): EngineMed => ({ id, nom, dci });
const GLUCOPHAGE = med('m1', 'Glucophage', 'CHLORHYDRATE DE METFORMINE');
const BRUFEN = med('m2', 'Brufen', 'IBUPROFÈNE');
const XARELTO = med('m3', 'Xarelto', 'RIVAROXABAN');
const PRADAXA = med('m4', 'Pradaxa', 'DABIGATRAN ETEXILATE');
const ELIQUIS = med('m5', 'Eliquis', 'APIXABAN');
const ALDACTONE = med('m6', 'Aldactone', 'SPIRONOLACTONE');
const FURADANTINE = med('m7', 'Furadantine', 'NITROFURANTOÏNE');
const DOLIPRANE = med('m8', 'Doliprane', 'PARACÉTAMOL');
const LIXIANA = med('m9', 'Lixiana', 'EDOXABAN');
const VASTAREL = med('m10', 'Vastarel', 'TRIMÉTAZIDINE');
const ev = (meds: EngineMed[], s: RenalStatus, cis: BaseCI[] = []) => evaluateRenal(meds, s, cis, regles, classes);

describe('1. formules — valeurs de référence', () => {
  it('CKD-EPI 2021 (sans coefficient ethnique)', () => {
    // Valeurs calculées à la main d'après la formule publiée (NEJM 2021), arrondies à l'unité.
    expect(Math.round(ckdEpi2021(1.0, 50, 'M'))).toBe(92);
    expect(Math.round(ckdEpi2021(0.7, 60, 'F'))).toBe(99);
    expect(Math.round(ckdEpi2021(1.5, 70, 'F'))).toBe(37);
    expect(Math.round(ckdEpi2021(0.8, 30, 'M'))).toBe(122);
    expect(Math.round(ckdEpi2021(2.5, 80, 'M'))).toBe(25);
  });
  it('CKD-EPI 2021 : cohérence (décroît avec la créatinine et l’âge ; continu au point κ)', () => {
    expect(ckdEpi2021(1.2, 60, 'M')).toBeLessThan(ckdEpi2021(1.0, 60, 'M'));
    expect(ckdEpi2021(1.0, 70, 'M')).toBeLessThan(ckdEpi2021(1.0, 60, 'M'));
    expect(ckdEpi2021(0.9, 40, 'M')).toBeCloseTo(142 * 0.9938 ** 40, 6);
    expect(ckdEpi2021(0.7, 40, 'F')).toBeCloseTo(142 * 0.9938 ** 40 * 1.012, 6);
    expect(ckdEpi2021(0.8999, 40, 'M')).toBeCloseTo(ckdEpi2021(0.9001, 40, 'M'), 1);
  });
  it('Cockcroft-Gault', () => {
    expect(cockcroftGault(1.0, 60, 72, 'M')).toBeCloseTo(80, 6);
    expect(cockcroftGault(1.0, 60, 72, 'F')).toBeCloseTo(68, 6);
    expect(cockcroftGault(2.0, 80, 60, 'M')).toBeCloseTo(25, 6);
    expect(cockcroftGault(1.2, 75, 55, 'F')).toBeCloseTo((65 * 55) / (72 * 1.2) * 0.85, 6);
  });
  it('bornes de stade', () => {
    expect([60, 59, 45, 44, 30, 29, 15, 14, 0, 120].map(renalStade))
      .toEqual(['>=60', '45-59', '45-59', '30-44', '30-44', '15-29', '15-29', '<15', '<15', '>=60']);
  });
});

describe('2. fraîcheur, âge, poids', () => {
  it('créatinine : < 3 mois fiable ; 3 mois pile → ancienne ; 12 mois pile → ancienne ; au-delà → inconnue', () => {
    expect(fraicheurCreatinine('2026-10-09', TODAY)).toBe('fiable');
    expect(fraicheurCreatinine('2026-07-10', TODAY)).toBe('fiable');   // 3 mois moins un jour
    expect(fraicheurCreatinine('2026-07-09', TODAY)).toBe('ancienne'); // 3 mois pile
    expect(fraicheurCreatinine('2025-10-10', TODAY)).toBe('ancienne');
    expect(fraicheurCreatinine('2025-10-09', TODAY)).toBe('ancienne'); // 12 mois pile
    expect(fraicheurCreatinine('2025-10-08', TODAY)).toBe('inconnue'); // 12 mois et un jour
    expect(fraicheurCreatinine('', TODAY)).toBe('inconnue');
    // Fin de mois : 30/11 + 3 mois = 28/02.
    expect(fraicheurCreatinine('2025-11-30', new Date(2026, 1, 27))).toBe('fiable');
    expect(fraicheurCreatinine('2025-11-30', new Date(2026, 1, 28))).toBe('ancienne');
  });
  it('âge en années révolues', () => {
    expect(ageAns('2008-10-09', TODAY)).toBe(18);
    expect(ageAns('2008-10-10', TODAY)).toBe(17);
    expect(ageAns('1956-03-01', TODAY)).toBe(70);
    expect(ageAns(null, TODAY)).toBeNull();
    expect(ageAns('2030-01-01', TODAY)).toBeNull();
  });
  it('poids : saisie 2–400 kg, une décimale ; ancien au-delà de 12 mois', () => {
    expect(parsePoids('72')).toBe(72);
    expect(parsePoids('72,5')).toBe(72.5);
    expect(parsePoids('72.5 kg')).toBe(72.5);
    for (const s of ['', '1', '401', '72,55', 'abc', '-5', '7 2']) expect(parsePoids(s), s).toBeNull();
    expect(poidsAncien('2025-10-09', TODAY)).toBe(false); // 12 mois pile
    expect(poidsAncien('2025-10-08', TODAY)).toBe(true);
    expect(poidsAncien(null, TODAY)).toBe(false);
  });
});

describe('3. statut rénal du patient', () => {
  it('connu : DFG arrondi, stade, Cockcroft si le poids est connu', () => {
    const s = renalStatus(input()); // homme 70 ans, créat 10 mg/L = 1,0 mg/dL, 72 kg
    expect(s.connu).toBe(true);
    expect(s.dfg).toBe(Math.round(ckdEpi2021(1.0, 70, 'M')));
    expect(s.dfg).toBe(81);
    expect(s.stade).toBe('>=60');
    expect(s.cockcroft).toBe(70); // (140 − 70) × 72 / 72
    expect(s.fraicheur).toBe('fiable');
    expect(dfgLine(s)).toBe('DFG 81 mL/min/1,73 m² (CKD-EPI, créat du 12/09)');
    expect(cockcroftLine(s)).toBe('Cl. Cockcroft 70 mL/min');
    expect(dfgActuelLine(s)).toBe('DFG actuel 81 mL/min (créat du 12/09)');
  });
  it('unités du référentiel : mg/L, µmol/L et mg/dL donnent le même DFG', () => {
    const a = renalStatus(input({ creatinines: [C(12, 'mg/L')] })).dfg;
    expect(renalStatus(input({ creatinines: [C(106, 'µmol/L')] })).dfg).toBe(a);
    expect(renalStatus(input({ creatinines: [C(1.2, 'mg/dL')] })).dfg).toBe(a);
    expect(renalStatus(input({ creatinines: [C(1.2, 'MG/dl')] })).creat?.mgDl).toBeCloseTo(1.2, 6);
    expect(renalStatus(input({ creatinines: [C(106.08, 'umol/l')] })).creat?.mgDl).toBeCloseTo(1.2, 3);
  });
  it('unité réellement hors référentiel → fonction rénale inconnue (jamais devinée)', () => {
    for (const u of ['nmol/L', 'mg', null, 'UI/L']) {
      const s = renalStatus(input({ creatinines: [C(1.2, u)] }));
      expect(s.connu, String(u)).toBe(false);
      expect(s.raison, String(u)).toBe('unite_inconnue');
      expect(s.dfg).toBeNull();
    }
    expect(dfgLine(renalStatus(input({ creatinines: [C(1.2, 'nmol/L')] })))).toBe('Fonction rénale inconnue — unité de la créatinine hors référentiel (1,2 nmol/L)');
    expect(renalStatus(input({ creatRef: null })).raison).toBe('referentiel');
  });
  it('dernière créatinine seulement : jamais de repli sur un résultat plus ancien', () => {
    const rows = [C(10, 'mg/L', '2026-06-01', 'old'), C(30, 'nmol/L', '2026-09-20', 'new')];
    expect(latestCreatinine(rows)?.id).toBe('new');
    expect(renalStatus(input({ creatinines: rows })).raison).toBe('unite_inconnue');
    const two = [C(10, 'mg/L', '2026-06-01', 'a'), C(25, 'mg/L', '2026-09-20', 'b')];
    expect(renalStatus(input({ creatinines: two })).creat?.id).toBe('b');
  });
  it('fraîcheur : 3-12 mois → utilisée avec « ancienne » ; plus de 12 mois → inconnue', () => {
    const anc = renalStatus(input({ creatinines: [C(10, 'mg/L', '2026-03-01')] }));
    expect(anc.connu).toBe(true);
    expect(anc.fraicheur).toBe('ancienne');
    expect(dfgLine(anc)).toBe('DFG 81 mL/min/1,73 m² (CKD-EPI, créat du 01/03, ancienne)');
    const per = renalStatus(input({ creatinines: [C(10, 'mg/L', '2025-06-01')] }));
    expect(per.connu).toBe(false);
    expect(per.raison).toBe('creatinine_perimee');
    expect(dfgLine(per)).toBe('Fonction rénale inconnue — créatinine de plus de 12 mois (01/06/2025)');
  });
  it('moins de 18 ans : « DFG non calculable (< 18 ans) », pas de formule pédiatrique', () => {
    const s = renalStatus(input({ dateNaissance: '2012-05-01' }));
    expect(s.connu).toBe(false);
    expect(s.raison).toBe('mineur');
    expect(s.dfg).toBeNull();
    expect(s.cockcroft).toBeNull();
    expect(dfgLine(s)).toBe('DFG non calculable (< 18 ans)');
    expect(renalStatus(input({ dateNaissance: '2008-10-09' })).connu).toBe(true); // 18 ans aujourd'hui
  });
  it('autres cas inconnus : aucune créatinine, valeur invalide, âge ou sexe manquant, chargement', () => {
    expect(inconnu().raison).toBe('aucune_creatinine');
    expect(dfgLine(inconnu())).toBe('Fonction rénale inconnue — aucune créatinine enregistrée');
    expect(renalStatus(input({ creatinines: [C(0, 'mg/L')] })).raison).toBe('valeur_invalide');
    expect(renalStatus(input({ dateNaissance: null })).raison).toBe('age_inconnu');
    expect(renalStatus(input({ sexe: null })).raison).toBe('sexe_inconnu');
    expect(renalStatus(input({ loadError: true })).raison).toBe('chargement');
    expect(cockcroftLine(inconnu())).toBeNull();
    expect(dfgActuelLine(inconnu())).toBeNull();
  });
  it('poids : absent → pas de Cockcroft ; ancien → utilisé avec la mention', () => {
    const sans = renalStatus(input({ poidsKg: null, poidsDate: null }));
    expect(sans.connu).toBe(true);
    expect(sans.cockcroft).toBeNull();
    expect(cockcroftLine(sans)).toBeNull();
    const vieux = renalStatus(input({ poidsDate: '2025-01-15' }));
    expect(vieux.cockcroft).toBe(70);
    expect(vieux.poidsAncien).toBe(true);
    expect(cockcroftLine(vieux)).toBe('Cl. Cockcroft 70 mL/min (poids ancien)');
    expect(renalStatus(input({ poidsKg: 900 })).cockcroft).toBeNull(); // hors bornes : ignoré
  });
  it('empreinte : créatinine, poids ou date du poids changés → analyse invalidée', () => {
    const a = renalStatus(input()).sig;
    expect(renalStatus(input()).sig).toBe(a);
    expect(renalStatus(input({ poidsKg: 80 })).sig).not.toBe(a);
    expect(renalStatus(input({ poidsDate: '2026-10-01' })).sig).not.toBe(a);
    expect(renalStatus(input({ poidsKg: null, poidsDate: null })).sig).not.toBe(a);
    expect(renalStatus(input({ creatinines: [C(10, 'mg/L', '2026-09-12', 'autre')] })).sig).not.toBe(a);
    expect(renalStatus(input({ creatinines: [] })).sig).not.toBe(a);
    expect(renalStatus(input({ pathologies: ['Hémodialyse chronique'] })).sig).not.toBe(a);
  });
  it('dialyse lue dans les pathologies', () => {
    expect(hasDialyse(['Insuffisance rénale chronique stade 5 (dialyse)'])).toBe(true);
    expect(hasDialyse(['Hémodialyse'])).toBe(true);
    expect(hasDialyse(['Diabète de type 2', 'HTA'])).toBe(false);
    expect(hasDialyse(null)).toBe(false);
  });
});

describe('4. formulations des contre-indications en base', () => {
  // Les 12 formulations « fonction rénale » présentes en base (diagnostic du 09/10/2026).
  const attendu: Array<[string, number, boolean]> = [
    ['Insuffisance rénale chronique stade 3', 60, false],
    ['Insuffisance rénale chronique stade 3-5', 60, false],
    ['Insuffisance rénale chronique stade 3b-5 (DFG < 45)', 45, true],
    ['Insuffisance rénale sévère (DFG < 30 mL/min)', 30, true],
    ['Insuffisance rénale chronique stade 4', 30, false],
    ['Insuffisance rénale chronique stade 4-5', 30, false],
    ['Insuffisance rénale chronique stade 4-5 (DFG < 30)', 30, true],
    ['Insuffisance rénale chronique stade 5', 15, false],
    ['Insuffisance rénale chronique stade 5 (DFG < 15)', 15, true],
    ['Insuffisance rénale chronique stade 5 (dialyse)', 15, false],
    ['Dialyse', 15, false],
  ];
  it.each(attendu)('« %s » → DFG < %i', (libelle, seuil, explicite) => {
    expect(parseRenalCondition(libelle)).toMatchObject({ seuil, explicite });
  });
  it('le seuil explicite du libellé prime sur le stade', () => {
    expect(parseRenalCondition('Insuffisance rénale chronique stade 3 (DFG < 50)')).toMatchObject({ seuil: 50, explicite: true });
    expect(parseRenalCondition('Insuffisance rénale (clairance de la créatinine < 20 mL/min)')).toMatchObject({ seuil: 20, explicite: true });
    expect(parseRenalCondition('Insuffisance rénale sévère')).toMatchObject({ seuil: 30, explicite: false });
    expect(parseRenalCondition('Insuffisance rénale terminale')).toMatchObject({ seuil: 15, explicite: false });
    expect(parseRenalCondition('Dialyse')?.dialyse).toBe(true);
  });
  // Les 17 faux amis de la base + l'insuffisance rénale aiguë : le canal rénal ne s'en mêle pas.
  it.each([
    'Insuffisance surrénalienne',
    'Insuffisance surrénale non substituée',
    'Insuffisance surrénale (arrêt brusque)',
    'Sténose de l\'artère rénale',
    'Sténose bilatérale des artères rénales',
    'Grossesse — insuffisance rénale fœtale (> 20 SA)',
    'Insuffisance rénale aiguë oligurique (sans hypervolémie)',
  ])('exclusion : « %s »', libelle => {
    expect(parseRenalCondition(libelle)).toBeNull();
  });
  it('formulation sans stade ni seuil, ou sans rapport : non interprétée', () => {
    for (const s of ['Insuffisance rénale', 'Insuffisance rénale modérée', 'Insuffisance respiratoire chronique', 'Insuffisance hépatique sévère', 'Lithiase rénale', '', null]) {
      expect(parseRenalCondition(s), String(s)).toBeNull();
    }
  });
});

describe('5. règles (données) — seuils validés', () => {
  it('classes : mêmes sources de matching que le moteur (DCI, nom, DCI canonique, ingrédients)', () => {
    expect([...renalClasses(GLUCOPHAGE, classes)]).toEqual(['metformine']);
    expect([...renalClasses(BRUFEN, classes)]).toEqual(['ains']);
    expect([...renalClasses({ id: 'x', nom: 'Janumet', dci: null, ingredients: ['Sitagliptine', 'Metformine'] }, classes)]).toEqual(['metformine']);
    expect([...renalClasses({ id: 'x', nom: 'Voltarène', dci: null, dci_canonique: 'diclofénac' }, classes)]).toEqual(['ains']);
    expect(renalClasses(DOLIPRANE, classes).size).toBe(0);
    expect(renalClasses({ id: 'k', nom: 'Kardégic', dci: 'ACÉTYLSALICYLATE DE LYSINE' }, classes).size).toBe(0); // aspirine : hors règles rénales
  });
  it('metformine (Glucophage) : CI < 30 · À évaluer 30-44 · rien à partir de 45', () => {
    const at = (dfg: number) => ev([GLUCOPHAGE], S({ dfg })).alerts[0];
    expect(at(29)).toMatchObject({ severite: 'contre_indication', regleCode: 'METFORMINE_DFG_30', origine: 'regle' });
    expect(at(30)).toMatchObject({ severite: 'a_evaluer', regleCode: 'METFORMINE_DFG_30_44' });
    expect(at(44)).toMatchObject({ severite: 'a_evaluer' });
    expect(at(45)).toBeUndefined();
    expect(at(90)).toBeUndefined();
    expect(at(29).condition).toBe('fonction rénale — DFG 29 mL/min/1,73 m² (créat du 12/09)');
    expect(at(29).description).toMatch(/^Metformine contre-indiquée — DFG < 30 mL\/min\. Conduite à tenir : /);
    expect(at(29).source).toBe("Proposition Ordosur d'après RCP — à valider");
    expect(at(29).ligne).toBe('DFG 29 mL/min');
  });
  it.each([
    ['AINS (Brufen)', BRUFEN], ['spironolactone (Aldactone)', ALDACTONE], ['nitrofurantoïne (Furadantine)', FURADANTINE],
  ])('%s : CI < 30 · À évaluer 30-59 · rien à partir de 60', (_n, m) => {
    const at = (dfg: number) => ev([m], S({ dfg })).alerts[0]?.severite;
    expect(at(14)).toBe('contre_indication');
    expect(at(29)).toBe('contre_indication');
    expect(at(30)).toBe('a_evaluer');
    expect(at(59)).toBe('a_evaluer');
    expect(at(60)).toBeUndefined();
  });
  it('nitrofurantoïne 30-59 : seuil incertain → « À évaluer », jamais CI', () => {
    const a = ev([FURADANTINE], S({ dfg: 50 })).alerts[0];
    expect(a.severite).toBe('a_evaluer');
    expect(a.description).toMatch(/seuil du RCP à vérifier/);
  });
  it('dabigatran (Pradaxa) : en clairance de Cockcroft — CI < 30 · À évaluer 30-50', () => {
    const at = (cockcroft: number) => ev([PRADAXA], S({ dfg: 90, cockcroft })).alerts[0];
    expect(at(29)).toMatchObject({ severite: 'contre_indication', regleCode: 'DABIGATRAN_CG_30' });
    expect(at(30)).toMatchObject({ severite: 'a_evaluer' });
    expect(at(50)).toMatchObject({ severite: 'a_evaluer' });
    expect(at(51)).toBeUndefined();
    expect(at(29).condition).toBe('fonction rénale — clairance de Cockcroft 29 mL/min — créat du 12/09');
    expect(at(29).ligne).toBe('Cl. Cockcroft 29 mL/min');
    // Le DFG ne décide pas pour un AOD : DFG 20 mais Cockcroft 60 → aucune alerte.
    expect(ev([PRADAXA], S({ dfg: 20, cockcroft: 60 })).alerts).toEqual([]);
  });
  it('rivaroxaban, apixaban, édoxaban : < 15 → niveau maximal « Non recommandé (RCP) — insuffisance rénale terminale »', () => {
    for (const m of [XARELTO, ELIQUIS, LIXIANA]) {
      const a = ev([m], S({ cockcroft: 14 })).alerts[0];
      expect(a.severite, m.nom).toBe('contre_indication');
      expect(a.description, m.nom).toMatch(/^Non recommandé \(RCP\) — insuffisance rénale terminale\. Conduite à tenir : /);
    }
    const riva = (cockcroft: number) => ev([XARELTO], S({ cockcroft })).alerts[0]?.severite;
    expect([14, 15, 29, 49, 50].map(riva)).toEqual(['contre_indication', 'a_evaluer', 'a_evaluer', 'a_evaluer', undefined]);
    for (const m of [ELIQUIS, LIXIANA]) {
      const at = (cockcroft: number) => ev([m], S({ cockcroft })).alerts[0]?.severite;
      expect([14, 15, 29, 30].map(at), m.nom).toEqual(['contre_indication', 'a_evaluer', 'a_evaluer', undefined]);
    }
  });
  it('patient dialysé : AOD au niveau maximal même sans clairance calculable', () => {
    const dialyseSansPoids = S({ cockcroft: null, dialyse: true });
    const a = ev([XARELTO], dialyseSansPoids);
    expect(a.alerts[0]).toMatchObject({ severite: 'contre_indication', condition: 'fonction rénale — dialyse', ligne: 'dialyse' });
    expect(a.reserves).toEqual([]);
    const dialyseInconnu = { ...inconnu({ pathologies: ['Hémodialyse'] }) };
    expect(ev([ELIQUIS], dialyseInconnu).alerts[0]?.severite).toBe('contre_indication');
    // Dialysé avec une clairance calculée élevée : la dialyse prime.
    expect(ev([XARELTO], S({ cockcroft: 40, dialyse: true })).alerts[0].severite).toBe('contre_indication');
    // La dialyse ne concerne que les règles qui la prévoient : pas d'effet sur le dabigatran sans clairance.
    expect(ev([PRADAXA], dialyseSansPoids).alerts).toEqual([]);
  });
  it('règle inactive ignorée', () => {
    const off = regles.map(r => (r.code === 'METFORMINE_DFG_30' ? { ...r, actif: false } : r));
    expect(evaluateRenal([GLUCOPHAGE], S({ dfg: 20 }), [], off, classes).alerts).toEqual([]);
  });
});

describe('6. fonction rénale inconnue → réserve ciblée, pas de bruit', () => {
  it('médicament concerné par une règle de niveau CI → réserve ; les autres ne sont pas touchés', () => {
    const r = ev([GLUCOPHAGE, DOLIPRANE, BRUFEN], inconnu());
    expect(r.alerts).toEqual([]);
    expect(r.reserves).toEqual([
      { medId: 'm1', medNom: 'Glucophage', motif: 'fonction' },
      { medId: 'm2', medNom: 'Brufen', motif: 'fonction' },
    ]);
    expect(reservesLabel(r.reserves, inconnu())).toBe('fonction rénale non disponible (Glucophage, Brufen)');
    expect(ev([DOLIPRANE], inconnu())).toEqual({ alerts: [], reserves: [] });
  });
  it('toutes les raisons d’inconnu donnent la même réserve (créatinine périmée, unité, chargement…)', () => {
    for (const s of [
      renalStatus(input({ creatinines: [C(10, 'mg/L', '2025-01-01')] })),
      renalStatus(input({ creatinines: [C(10, 'nmol/L')] })),
      renalStatus(input({ loadError: true })),
      renalStatus(input({ sexe: null })),
    ]) expect(ev([GLUCOPHAGE], s).reserves, s.raison ?? '').toHaveLength(1);
  });
  it('moins de 18 ans : sous réserve pour un médicament à règle CI, libellé explicite', () => {
    const s = renalStatus(input({ dateNaissance: '2012-05-01' }));
    const r = ev([BRUFEN, DOLIPRANE], s);
    expect(r.alerts).toEqual([]);
    expect(r.reserves).toEqual([{ medId: 'm2', medNom: 'Brufen', motif: 'fonction' }]);
    expect(reservesLabel(r.reserves, s)).toBe('fonction rénale non disponible (Brufen) — DFG non calculable (< 18 ans)');
  });
  it('AOD sans poids : DFG connu mais Cockcroft non calculable → réserve « poids manquant »', () => {
    const sansPoids = S({ dfg: 25, cockcroft: null });
    const r = ev([XARELTO, PRADAXA, GLUCOPHAGE], sansPoids);
    expect(r.reserves).toEqual([
      { medId: 'm3', medNom: 'Xarelto', motif: 'cockcroft' },
      { medId: 'm4', medNom: 'Pradaxa', motif: 'cockcroft' },
    ]);
    expect(r.alerts.map(a => a.medNom)).toEqual(['Glucophage']); // le DFG reste exploité pour la metformine
    expect(reservesLabel(r.reserves, sansPoids)).toBe('clairance de Cockcroft non calculable — poids manquant (Xarelto, Pradaxa)');
  });
  it('fonction rénale connue et normale : ni alerte ni réserve', () => {
    expect(ev([GLUCOPHAGE, BRUFEN, XARELTO, PRADAXA, ELIQUIS, ALDACTONE, FURADANTINE, DOLIPRANE], S({ dfg: 95, cockcroft: 95 })))
      .toEqual({ alerts: [], reserves: [] });
  });
});

describe('7. contre-indications rénales déjà en base, reliées au DFG', () => {
  const ci = (over: Partial<BaseCI>): BaseCI => ({
    id: 'ci1', dci_pattern: 'trimetazidine', condition_type: 'pathologie',
    condition_valeur: 'Insuffisance rénale sévère (DFG < 30 mL/min)', severite: 'absolue', description: 'Accumulation — syndrome parkinsonien.', ...over,
  });
  it('DFG sous le seuil lu dans le libellé → alerte, avec la description de la base', () => {
    const a = ev([VASTAREL], S({ dfg: 24 }), [ci({})]).alerts[0];
    expect(a).toMatchObject({
      severite: 'contre_indication', origine: 'base', source: SOURCE_BASE, description: 'Accumulation — syndrome parkinsonien.',
      condition: 'Insuffisance rénale sévère (DFG < 30 mL/min) — DFG 24 mL/min/1,73 m² (créat du 12/09)', ligne: 'DFG 24 mL/min',
    });
    expect(ev([VASTAREL], S({ dfg: 30 }), [ci({})]).alerts).toEqual([]);
    expect(ev([VASTAREL], S({ dfg: 29 }), [ci({})]).alerts).toHaveLength(1);
  });
  it('CI relative → « majeure » ; stade 3 → DFG < 60 ; exclusions et autres types ignorés', () => {
    expect(ev([VASTAREL], S({ dfg: 24 }), [ci({ severite: 'relative' })]).alerts[0].severite).toBe('majeure');
    const st3 = ci({ condition_valeur: 'Insuffisance rénale chronique stade 3' });
    expect(ev([VASTAREL], S({ dfg: 59 }), [st3]).alerts).toHaveLength(1);
    expect(ev([VASTAREL], S({ dfg: 60 }), [st3]).alerts).toEqual([]);
    expect(ev([VASTAREL], S({ dfg: 10 }), [ci({ condition_valeur: 'Insuffisance surrénalienne' })]).alerts).toEqual([]);
    expect(ev([VASTAREL], S({ dfg: 10 }), [ci({ condition_valeur: 'Insuffisance rénale aiguë oligurique (sans hypervolémie)' })]).alerts).toEqual([]);
    expect(ev([VASTAREL], S({ dfg: 10 }), [ci({ condition_type: 'allergie_med' })]).alerts).toEqual([]);
    expect(ev([DOLIPRANE], S({ dfg: 10 }), [ci({})]).alerts).toEqual([]); // autre médicament
  });
  it('motif DCI : même règle que le moteur (séparateur « | », motifs de plus de 2 caractères)', () => {
    expect(medMatchesPattern(VASTAREL, 'trimétazidine|ranolazine')).toBe(true);
    expect(medMatchesPattern(VASTAREL, 'ab|ranolazine')).toBe(false);
    expect(medMatchesPattern({ id: 'x', nom: 'Aspégic', dci: 'ACÉTYLSALICYLATE DE LYSINE', dci_canonique: 'aspirine' }, 'aspirine')).toBe(true);
  });
  it('fonction rénale inconnue : les CI de la base ne produisent ni alerte ni réserve (pas de bruit)', () => {
    expect(ev([VASTAREL], inconnu(), [ci({})])).toEqual({ alerts: [], reserves: [] });
  });
  it('une alerte au plus par médicament : la plus sévère ; à égalité, la règle prime', () => {
    const cis = [
      ci({ id: 'a', dci_pattern: 'metformine', severite: 'absolue' }),
      ci({ id: 'b', dci_pattern: 'metformine', severite: 'relative', condition_valeur: 'Insuffisance rénale chronique stade 3' }),
    ];
    const r = ev([GLUCOPHAGE], S({ dfg: 24 }), cis);
    expect(r.alerts).toHaveLength(1);
    expect(r.alerts[0]).toMatchObject({ severite: 'contre_indication', origine: 'regle' });
    // DFG 40 : règle « À évaluer » (2) > CI relative stade 3 (1,5).
    expect(ev([GLUCOPHAGE], S({ dfg: 40 }), cis).alerts[0]).toMatchObject({ severite: 'a_evaluer', origine: 'regle' });
    // DFG 50 : plus de règle metformine ; reste la CI relative « stade 3 » de la base.
    expect(ev([GLUCOPHAGE], S({ dfg: 50 }), cis).alerts[0]).toMatchObject({ severite: 'majeure', origine: 'base' });
  });
});

describe('8. fusion avec les cartes existantes — jamais de carte en double', () => {
  type Card = { type: string; severite: string; involved: string[]; condition?: string; channel?: string; also?: string[]; alsoChannels?: string[] };
  const card = (over: Partial<Card> = {}): Card => ({
    type: 'contraindication', severite: 'contre_indication', involved: ['Glucophage'], condition: 'Insuffisance rénale sévère (DFG < 30 mL/min)', ...over,
  });
  const renal24 = () => ev([GLUCOPHAGE], S({ dfg: 24 })).alerts;

  it('carte existante de sévérité ≥ : « Également : DFG 24 mL/min », pas de nouvelle carte', () => {
    const existing = [card()];
    const m = mergeRenalWithExisting(existing, renal24(), S({ dfg: 24 }));
    expect(m.standalone).toEqual([]);
    expect(m.absorbed).toEqual([]);
    expect(m.alsoByIndex.get(0)).toEqual(['DFG 24 mL/min']);
    expect(m.infoByIndex.size).toBe(0);
    const alerts = [...existing] as Array<Card & { alsoChannels?: never[] }>;
    applyMergedLines(alerts as never, m.alsoByIndex, 'renal');
    expect(alerts[0].also).toEqual(['DFG 24 mL/min']);
    expect(alerts[0].alsoChannels).toEqual(['renal']);
    expect(alerts).toHaveLength(1);
  });
  it('alerte rénale plus sévère que la carte existante : elle devient la carte et absorbe l’autre', () => {
    const existing = [card({ severite: 'majeure', condition: 'Insuffisance rénale chronique stade 3' }), card({ involved: ['Brufen'] })];
    const m = mergeRenalWithExisting(existing, renal24(), S({ dfg: 24 }));
    expect(m.standalone).toHaveLength(1);
    expect(m.standalone[0]).toMatchObject({ severite: 'contre_indication', also: ['Insuffisance rénale chronique stade 3'] });
    expect(m.absorbed).toEqual([0]);
    expect(m.alsoByIndex.size).toBe(0);
    // La carte d'un AUTRE médicament n'est pas absorbée : elle reçoit seulement le DFG actuel.
    expect(m.infoByIndex.get(1)).toEqual(['DFG actuel 24 mL/min (créat du 12/09)']);
  });
  it('plusieurs cartes existantes du même médicament : fusion sur la plus sévère, les autres gardées et informées', () => {
    const existing = [card({ severite: 'majeure', condition: 'Insuffisance rénale chronique stade 3' }), card()];
    const m = mergeRenalWithExisting(existing, renal24(), S({ dfg: 24 }));
    expect(m.standalone).toEqual([]);
    expect(m.alsoByIndex.get(1)).toEqual(['DFG 24 mL/min']);
    expect(m.absorbed).toEqual([]);
    expect(m.infoByIndex.get(0)).toEqual(['DFG actuel 24 mL/min (créat du 12/09)']);
  });
  it('DFG ≥ 60 mais pathologie « IRC » déclenchant une CI : RIEN n’est masqué, seule la ligne du DFG actuel est ajoutée', () => {
    const s = S({ dfg: 72 });
    const existing = [card(), card({ involved: ['Brufen'], severite: 'majeure', condition: 'Insuffisance rénale chronique stade 4-5' })];
    const renal = ev([GLUCOPHAGE, BRUFEN], s).alerts;
    expect(renal).toEqual([]);
    const m = mergeRenalWithExisting(existing, renal, s);
    expect(m.standalone).toEqual([]);
    expect(m.absorbed).toEqual([]);
    expect(m.alsoByIndex.size).toBe(0);
    expect([...m.infoByIndex.entries()]).toEqual([[0, ['DFG actuel 72 mL/min (créat du 12/09)']], [1, ['DFG actuel 72 mL/min (créat du 12/09)']]]);
    const alerts = [...existing];
    applyInfoLines(alerts, m.infoByIndex);
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toMatchObject({ severite: 'contre_indication', also: ['DFG actuel 72 mL/min (créat du 12/09)'] });
    expect(alerts[0].alsoChannels).toBeUndefined(); // information : pas une alerte du canal, non journalisée
    applyInfoLines(alerts, m.infoByIndex);
    expect(alerts[0].also).toHaveLength(1); // jamais en double
  });
  it('fonction rénale inconnue : les cartes existantes ne reçoivent aucune ligne', () => {
    const m = mergeRenalWithExisting([card()], [], inconnu());
    expect(m.infoByIndex.size).toBe(0);
  });
  it('seules les CI rénales du matching par pathologies sont concernées', () => {
    expect(isRenalCard(card())).toBe(true);
    expect(isRenalCard(card({ condition: 'Insuffisance surrénalienne' }))).toBe(false);
    expect(isRenalCard(card({ condition: 'Insuffisance hépatique sévère' }))).toBe(false);
    expect(isRenalCard(card({ channel: 'antecedent' }))).toBe(false);
    expect(isRenalCard(card({ type: 'drug_drug' }))).toBe(false);
    const existing = [card({ condition: 'Insuffisance hépatique sévère' }), card({ type: 'drug_drug', involved: ['Glucophage', 'Brufen'], condition: undefined })];
    const m = mergeRenalWithExisting(existing, renal24(), S({ dfg: 24 }));
    expect(m.standalone).toHaveLength(1);
    expect(m.absorbed).toEqual([]);
    expect(m.infoByIndex.size).toBe(0);
  });
  it('alerte issue d’une CI de la base déjà affichée par les pathologies : fusionnée, sans répéter sa condition', () => {
    const base: BaseCI = { id: 'x', dci_pattern: 'trimetazidine', condition_type: 'pathologie', condition_valeur: 'Insuffisance rénale chronique stade 3', severite: 'relative', description: 'd' };
    const renal = evaluateRenal([VASTAREL], S({ dfg: 40 }), [base], regles, classes).alerts;
    const same = [card({ involved: ['Vastarel'], severite: 'majeure', condition: 'Insuffisance rénale chronique stade 3' })];
    const m = mergeRenalWithExisting(same, renal, S({ dfg: 40 }));
    expect(m.standalone).toEqual([]);
    expect(m.alsoByIndex.get(0)).toEqual(['DFG 40 mL/min']);
  });
});

describe('9. verdict, dérogation et journal', () => {
  const asAlert = (severite: string) => ({ type: 'contraindication' as const, severite, description: 'd', involved: ['Xarelto'], condition: 'fonction rénale — dialyse', channel: 'renal' });
  it('niveau maximal → dérogation requise et « Prescription à risque » (derogationKind)', () => {
    const a = asAlert(ev([XARELTO], S({ cockcroft: 12 })).alerts[0].severite);
    expect(derogationKind(a)).toBe('contre_indication');
    expect(requiresDerogation(a)).toBe(true);
    expect(alertVerdictLevel(a)).toBe('dangerous');
  });
  it('« À évaluer » et CI relative de la base : « Attention », jamais de dérogation, jamais vert', () => {
    for (const sev of ['a_evaluer', 'majeure']) {
      expect(derogationKind(asAlert(sev)), sev).toBeNull();
      expect(alertVerdictLevel(asAlert(sev)), sev).toBe('attention');
    }
  });
  it('alerte du traitement de fond seul : préexistante, pas de dérogation', () => {
    expect(derogationKind({ ...asAlert('contre_indication'), origin: 'fond' })).toBeNull();
  });
  it('journal : source = « renal », carte propre ou fusionnée ; la ligne d’information n’est pas journalisée', () => {
    const propre: LoggableAlert = { type: 'contraindication', severite: 'contre_indication', involved: ['Glucophage'], channel: 'renal' };
    const fusion: LoggableAlert = { type: 'contraindication', severite: 'contre_indication', involved: ['Brufen'], alsoChannels: ['renal'] };
    const info: LoggableAlert = { type: 'contraindication', severite: 'majeure', involved: ['Vastarel'] }; // « DFG actuel … » seulement
    const evaluer: LoggableAlert = { type: 'contraindication', severite: 'a_evaluer', involved: ['Xarelto'], channel: 'renal' };
    const rows = buildInteractionLogRows([propre, fusion, info, evaluer], { doctorId: 'd', patientId: 'p' });
    expect(countBySource(rows)).toEqual({ renal: 3, nouveau: 2 });
    const r = rows.find(x => x.source === 'renal' && x.medicament_a === 'Glucophage')!;
    expect(r).toMatchObject({ medicament_b: null, risk_level: 'dangerous' });
    expect(rows.find(x => x.source === 'renal' && x.medicament_a === 'Xarelto')!.risk_level).toBe('attention');
    // Alerte préexistante (fond seul) : non journalisée, comme les autres canaux.
    expect(buildInteractionLogRows([{ ...propre, origin: 'fond' }], { doctorId: 'd', patientId: 'p' })).toEqual([]);
  });
});

describe('10. données : fixture = source des règles en base', () => {
  it('16 règles actives, 8 classes, une seule source', () => {
    expect(regles).toHaveLength(16);
    expect(new Set(classes.map(c => c.classe)).size).toBe(8);
    expect(regles.every(r => r.actif && r.source === "Proposition Ordosur d'après RCP — à valider")).toBe(true);
    expect(regles.every(r => r.seuil_min === null || r.seuil_min < r.seuil)).toBe(true);
  });
  it('toute règle « À évaluer » a une borne basse ; toute règle CI n’en a pas', () => {
    for (const r of regles) expect(r.seuil_min === null, r.code).toBe(r.severite === 'absolue');
  });
  it('AOD en clairance de Cockcroft, le reste en DFG ; dialyse seulement pour rivaroxaban, apixaban, édoxaban', () => {
    const aod = ['dabigatran', 'rivaroxaban', 'apixaban', 'edoxaban'];
    for (const r of regles) expect(r.mesure, r.code).toBe(aod.includes(r.classe) ? 'cockcroft' : 'dfg');
    expect(regles.filter(r => r.inclut_dialyse).map(r => r.classe).sort()).toEqual(['apixaban', 'edoxaban', 'rivaroxaban']);
  });
});
