import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildConditionMatcher, preparePatient, matchCondition, analysePatientTerm, conditionTitre, normCondition, motsDe, racine,
  stadeDuDfg, FAMILLES, TITRE_STADE, NOMS_COMPLEMENTAIRES,
  type CiConceptRow, type PathologieCuree, type ConditionVerdict,
} from './conditionMatcher';
import { evaluateAllergies, type AllergieFamilleRow, type AllergyMed, type RegleAllergie } from './allergyClassEngine';
import { medMatchesPattern, parseRenalCondition } from './renalEngine';
import { isPlannedPregnancyCondition } from './pregnancyStatus';
import data from './ci_condition_concepts.data.json';
import allergyData from './regles_allergies.data.json';

// Sprint 2b-1 — matching des conditions par concepts, stades et qualificatifs.
// Données RÉELLES : la table de correspondance générée et les 372 pathologies de pathologies_curees.

const rows = data.concepts as CiConceptRow[];
const curees = data.curees as PathologieCuree[];
const familles = allergyData.familles as AllergieFamilleRow[];
const regles = (allergyData.regles as Array<Omit<RegleAllergie, 'id' | 'actif'>>).map((r, i) => ({ ...r, id: `r${i}`, actif: true }));
const D = buildConditionMatcher(rows, curees, familles);

type P = { pathologies?: string[]; allergiesMedicaments?: string[]; allergiesAlimentaires?: string[]; dfg?: number | null; antecedents?: string[] };
const m = (p: P, cv: string, type = 'pathologie') => matchCondition(D, preparePatient(p, D), type, cv);
const v = (p: P, cv: string, type = 'pathologie'): ConditionVerdict => m(p, cv, type).verdict;
const patho = (...pathologies: string[]): P => ({ pathologies });
const allergie = (...allergiesMedicaments: string[]): P => ({ allergiesMedicaments });

// Formulations « fonction rénale » de la base (108 lignes — diagnostic du 09/10/2026).
const CI_RENALES: Array<[string, number]> = [
  ['Insuffisance rénale chronique stade 3', 37],
  ['Insuffisance rénale sévère (DFG < 30 mL/min)', 30],
  ['Insuffisance rénale chronique stade 4', 15],
  ['Insuffisance rénale chronique stade 4-5', 13],
  ['Insuffisance rénale chronique stade 4-5 (DFG < 30)', 3],
  ['Insuffisance rénale chronique stade 3b-5 (DFG < 45)', 2],
  ['Insuffisance rénale chronique stade 5 (DFG < 15)', 2],
  ['Insuffisance rénale chronique stade 5', 2],
  ['Insuffisance rénale chronique stade 3-5', 1],
  ['Insuffisance rénale chronique stade 5 (dialyse)', 1],
  ['Dialyse', 1],
  ['Insuffisance rénale aiguë oligurique (sans hypervolémie)', 1],
];
/** Lignes rénales atteintes, par verdict. */
const lignes = (p: P, verdict: ConditionVerdict) => CI_RENALES.filter(([cv]) => v(p, cv) === verdict).reduce((n, [, k]) => n + k, 0);

describe('table de correspondance (données générées)', () => {
  it('chaque concept existe dans pathologies_curees, chaque famille est déclarée dans le moteur', () => {
    const noms = new Set(curees.map(c => c.nom_fr));
    for (const r of rows) {
      if (r.concept) expect(noms.has(r.concept), r.concept).toBe(true);
      if (r.famille) expect(Object.keys(FAMILLES), r.famille).toContain(r.famille);
    }
    for (const def of Object.values(FAMILLES)) for (const membre of def.membres) expect(noms.has(membre), membre).toBe(true);
    expect([...data.familles].sort()).toEqual(Object.keys(FAMILLES).sort());
  });
  it('la clé est la formulation normalisée ; une ligne par alternative', () => {
    for (const r of rows) expect(r.condition_norm).toBe(normCondition(r.condition_valeur));
    expect(new Set(rows.map(r => `${r.condition_norm}|${r.ordre}`)).size).toBe(rows.length);
    expect(D.rowsByNorm.get(normCondition('Hypothyroïdie sévère / Hyperthyroïdie'))!.map(r => r.concept)).toEqual(['Hypothyroïdie', 'Hyperthyroïdie']);
  });
  it('stades rénaux de la table = seuils lus par le canal rénal (60 → 3 · 45 → 3b · 30 → 4 · 15 → 5)', () => {
    const attendu: Record<number, number> = { 60: 3, 45: 3.5, 30: 4, 15: 5 };
    const renales = rows.filter(r => r.traitement === 'renal');
    expect(renales).toHaveLength(10); // « Dialyse » a son traitement propre depuis le Sprint 2b-2
    for (const r of renales) expect(Number(r.stade), r.condition_valeur).toBe(attendu[parseRenalCondition(r.condition_valeur)!.seuil]);
  });
  it('rattachements corrigés à la relecture', () => {
    const de = (cv: string) => D.rowsByNorm.get(normCondition(cv))!;
    // Wolff-Parkinson-White ≠ maladie de Parkinson.
    expect(de('Syndrome de Wolff-Parkinson-White avec fibrillation auriculaire').map(r => r.concept)).toEqual(['Syndrome de Wolff-Parkinson-White']);
    expect(v(patho('Maladie de Parkinson'), 'Syndrome de Wolff-Parkinson-White avec fibrillation auriculaire')).toBe('non');
    expect(v(patho('Fibrillation auriculaire'), 'Syndrome de Wolff-Parkinson-White avec fibrillation auriculaire')).toBe('non');
    expect(v(patho('Syndrome de Wolff-Parkinson-White'), 'Maladie de Parkinson')).toBe('non');
    // Risque fœtal / gravidique : jamais une pathologie du patient.
    expect(de('Grossesse — hypertension artérielle gravidique')[0].traitement).toBe('grossesse');
    expect(de('Grossesse — insuffisance rénale fœtale (> 20 SA)')[0].traitement).toBe('grossesse');
    expect(de('Femme en âge de procréer sans contraception')[0].traitement).toBe('procreation');
    expect(de('Angio-œdème héréditaire (déficit en C1-inhibiteur)')[0].concept).toBe('Œdème de Quincke');
    expect(de('Pneumopathie interstitielle')[0].concept).toBe('Fibrose pulmonaire');
    expect(de('Valve cardiaque prothétique mécanique')[0].traitement).toBe('sans_concept');
  });
  it('synonymes anglais : rattachés au bon concept', () => {
    expect(analysePatientTerm('heart failure', 'pathologie', D).concepts).toEqual(['Insuffisance cardiaque']);
    expect(analysePatientTerm('chronic kidney disease', 'pathologie', D).concepts).toEqual(['Insuffisance rénale chronique']);
    expect(v(patho('heart failure'), 'Insuffisance cardiaque')).toBe('oui');
    expect(v(patho('stroke'), 'Antécédent cardiovasculaire (IDM, AVC, AOMI)')).toBe('oui');
  });
});

describe('règle 1 — ni préfixe de 14 caractères, ni « la condition contient la pathologie »', () => {
  it('le moteur ne contient plus l’ancienne règle', () => {
    const src = readFileSync(new URL('../pages/DoctorDashboard.tsx', import.meta.url), 'utf8');
    expect(src).not.toContain('cv.slice(0, Math.min(cv.length, 14))');
    expect(src).not.toContain('pc.includes(cv) || cv.includes(pc)');
    expect(src).toContain('matchCondition(conditionData, patientConditions, contra.condition_type, contra.condition_valeur)');
  });
  it('un préfixe commun ne déclenche rien', () => {
    expect(v(patho('Insuffisance respiratoire chronique'), 'Insuffisance rénale chronique stade 3')).toBe('non');
    expect(v(patho('Insuffisance cardiaque'), 'Insuffisance hépatique')).toBe('non');
    expect(v(patho('Diabète de type 2'), 'Diabète de type 1')).toBe('non');
    expect(v({ allergiesAlimentaires: ["Allergie à l'Avocat"] }, "Allergie à l'Aspirine", 'allergie_med')).toBe('non');
  });
  it('un mot générique contenu dans la condition ne déclenche rien', () => {
    for (const p of ['Insuffisance', 'Syndrome', 'Maladie']) {
      expect(v(patho(p), 'Insuffisance cardiaque')).toBe('non');
      expect(v(patho(p), 'Syndrome parkinsonien')).toBe('non');
      expect(v(patho(p), 'Maladie de Parkinson')).toBe('non');
    }
    expect(v(patho('Tension'), 'Hypotension')).toBe('non');
  });
  it('Prédiabète ne déclenche pas les CI « Diabète » (disparition validée)', () => {
    expect(v(patho('Prédiabète'), 'Diabète')).toBe('non');
  });
});

describe('règle 2 — normalisation sans accents ni casse, des deux côtés', () => {
  it('normalisation', () => {
    expect(normCondition('Reflux gastro-œsophagien')).toBe('reflux gastro oesophagien');
    expect(racine('contrôlées'.normalize('NFD').replace(/\p{Diacritic}/gu, ''))).toBe(racine('controle'));
    expect(motsDe('Diabète de type 2')).toEqual(motsDe('DIABETE TYPE 2'));
    expect(motsDe('évolutive')).toEqual(motsDe('actif'));
  });
  it('« Diabete type 1 » déclenche « Diabète de type 1 » (faux négatif corrigé)', () => {
    expect(v(patho('Diabete type 1'), 'Diabète de type 1')).toBe('oui');
    expect(v(patho('DIABÈTE TYPE 1'), 'Diabète de type 1')).toBe('oui');
  });
  it('« Hypertension arterielle » sans accent a ses synonymes (HTA)', () => {
    expect(analysePatientTerm('Hypertension arterielle', 'pathologie', D).concepts).toEqual(['Hypertension artérielle']);
    expect(v(patho('Hypertension arterielle'), 'Hypertension artérielle')).toBe('oui');
    expect(v(patho('Hypertension arterielle'), 'HTA sévère non contrôlée (PA > 180/110 mmHg)')).toBe('a_evaluer');
    expect(v(patho('hta'), 'Hypertension artérielle')).toBe('oui');
  });
  it('allergies et synonymes : mêmes règles', () => {
    expect(v(allergie('penicilline'), 'Allergie aux Pénicillines', 'allergie_med')).toBe('oui');
    expect(v(allergie('IBUPROFENE'), 'Allergie aux AINS', 'allergie_med')).toBe('oui');
    expect(v(patho('coronaropathie'), 'Coronaropathie')).toBe('oui');
  });
});

describe('règle 3 — le concept d’une CI vient de la table, jamais de son texte', () => {
  it('formulation sans concept : seul un libellé identique déclenche', () => {
    expect(v(patho('Hypokaliémie'), 'Hypokaliémie')).toBe('oui');
    expect(v(patho('hypokaliemie'), 'Hypokaliémie')).toBe('oui');
    expect(v(patho('Infection urinaire'), 'Infections fongiques systémiques')).toBe('non');
    expect(v(patho('Infarctus du myocarde'), 'Infarctus du ventricule droit')).toBe('non');
    expect(v(patho('Insuffisance surrénalienne'), 'Insuffisance surrénale (arrêt brusque)')).toBe('non');
  });
  it('CI d’âge ou de procréation : jamais déclenchées par une pathologie', () => {
    expect(v(patho("Gastro-entérite de l'enfant"), 'Enfant < 8 ans')).toBe('non');
    expect(v(patho('Hypertension artérielle'), 'Femme en âge de procréer (HTA chronique)')).toBe('non');
    expect(v(patho('Contraception'), 'Femme en âge de procréer sans contraception')).toBe('non');
  });
  it('CI de grossesse / allaitement : la pathologie du patient doit en parler', () => {
    expect(v(patho('Hypertension artérielle'), 'Grossesse — hypertension artérielle gravidique')).toBe('non');
    expect(v(patho('Insuffisance rénale chronique'), 'Grossesse — insuffisance rénale fœtale (> 20 SA)')).toBe('non');
    expect(v(patho('Grossesse normale'), 'Grossesse — 3ème trimestre')).toBe('oui');
    expect(v(patho('grossesse'), 'Grossesse')).toBe('oui');
    expect(v(patho('Allaitement'), 'Allaitement', 'autre')).toBe('oui');
    expect(v(patho('grossesse'), 'Allaitement')).toBe('non');
  });
  it('formulation inconnue de la table : traitement déduit de sa forme, sans recherche de concept', () => {
    expect(v(patho('Insuffisance rénale chronique stade 4'), 'Insuffisance rénale chronique stade 4 (nouvelle écriture)')).toBe('oui');
    expect(v(patho('Insuffisance rénale chronique stade 3'), 'Insuffisance rénale chronique stade 4 (nouvelle écriture)')).toBe('non');
    expect(v(patho('grossesse'), 'Grossesse (nouvelle formulation)')).toBe('oui');
    expect(v(patho('Asthme'), 'Asthme induit par un médicament inconnu')).toBe('non');
    expect(v(patho('Maladie inconnue de la table'), 'Maladie inconnue de la table')).toBe('oui');
  });
  it('libellé du patient qui écarte lui-même la maladie', () => {
    expect(analysePatientTerm('Pas de diabète de type 2', 'pathologie', D).concepts).toEqual([]);
    expect(analysePatientTerm('ATCD familial de cancer du sein', 'pathologie', D).concepts).toEqual([]);
    expect(analysePatientTerm('Hypertension artérielle pulmonaire', 'pathologie', D).concepts).toEqual([]);
  });
});

describe('règle 4 — familles', () => {
  it('ulcère gastrique / duodénal ⊂ ulcère gastro-duodénal (faux négatif corrigé)', () => {
    for (const p of ['Ulcère gastrique', 'Ulcère duodénal', 'Ulcère gastro-duodénal', 'ulcere gastroduodenal']) {
      expect(v(patho(p), 'Ulcère gastro-duodénal'), p).toBe('oui');
    }
    expect(v(patho("Antécédent d'ulcère gastrique"), 'Ulcère gastro-duodénal')).toBe('oui');
  });
  it('diabète de type 1 / type 2 ⊂ diabète', () => {
    for (const p of ['Diabète de type 1', 'Diabete type 2', 'Diabète', 'Diabète gestationnel']) expect(v(patho(p), 'Diabète'), p).toBe('oui');
    expect(v(patho('Diabète insipide'), 'Diabète')).toBe('non');
  });
  it('la famille ne remonte pas : une CI sur un membre ne vaut pas pour un autre membre', () => {
    expect(v(patho('Diabète de type 2'), 'Diabète de type 1')).toBe('non');
    expect(m(patho('Diabète'), 'Diabète de type 1')).toMatchObject({ verdict: 'preciser', titre: 'Si de type 1 — préciser' });
  });
});

describe('règle 5 — qualificatif absent chez le patient', () => {
  it('ÉTAT DE CONTRÔLE → « À évaluer », titre « Si [qualificatif] »', () => {
    expect(m(patho('Épilepsie'), 'Épilepsie non contrôlée')).toMatchObject({ verdict: 'a_evaluer', titre: 'Si non contrôlée', par: 'Épilepsie' });
    expect(m(patho('Insuffisance cardiaque'), 'Insuffisance cardiaque décompensée')).toMatchObject({ verdict: 'a_evaluer', titre: 'Si décompensée' });
    expect(m(patho('Diabète de type 2'), 'Diabète insulino-dépendant avec hypoglycémies fréquentes'))
      .toMatchObject({ verdict: 'a_evaluer', titre: 'Si insulino-dépendant avec hypoglycémies fréquentes' });
    expect(m(patho('Diabète de type 2'), 'Diabète décompensé (glycémie > 3 g/L)')).toMatchObject({ verdict: 'a_evaluer', titre: 'Si décompensé (glycémie > 3 g/L)' });
  });
  it('GRAVITÉ D’ORGANE → sévérité conservée, titre « Si sévère — préciser »', () => {
    expect(m(patho('Insuffisance hépatique'), 'Insuffisance hépatique sévère (Child-Pugh C)'))
      .toMatchObject({ verdict: 'preciser', titre: 'Si sévère (Child-Pugh C) — préciser' });
    expect(v(patho('Insuffisance cardiaque'), 'Insuffisance cardiaque systolique sévère (FEVG < 35%)')).toBe('preciser');
    expect(v(patho('Insuffisance respiratoire chronique'), 'Insuffisance respiratoire sévère (SpO2 < 90%)')).toBe('preciser');
    expect(m(patho('Glaucome'), 'Glaucome à angle fermé')).toMatchObject({ verdict: 'preciser', titre: 'Si à angle fermé — préciser' });
  });
  it('précision présente chez le patient → la CI s’applique', () => {
    expect(v(patho('Asthme sévère'), 'Asthme sévère')).toBe('oui');
    expect(v(patho('Glaucome à angle fermé'), 'Glaucome à angle fermé')).toBe('oui');
    expect(v(patho('Insuffisance cardiaque décompensée'), 'Insuffisance cardiaque décompensée (NYHA III-IV)')).toBe('oui');
    expect(v(patho('Hypertension artérielle non contrôlée'), 'Hypertension artérielle non contrôlée')).toBe('oui');
    expect(v(patho('Diabète décompensé'), 'Diabète décompensé')).toBe('oui');
    expect(v(patho('Ulcère gastrique évolutif'), 'Ulcère gastroduodénal actif')).toBe('oui');
    expect(v(patho('Insuffisance hépatique sévère'), 'Insuffisance hépatique sévère (Child-Pugh C)')).toBe('oui');
  });
  it('état ou forme opposés chez le patient → pas de correspondance', () => {
    expect(v(patho('Ulcère gastrique cicatrisé'), 'Ulcère gastroduodénal actif')).toBe('non');
    expect(v(patho('Hypertension artérielle contrôlée'), 'Hypertension artérielle non contrôlée')).toBe('non');
    expect(v(patho('Hypertension artérielle mal contrôlée'), 'Hypertension artérielle non contrôlée')).toBe('a_evaluer');
    expect(v(patho('Glaucome à angle fermé'), 'Glaucome à angle ouvert non contrôlé')).toBe('non');
    expect(v(patho('AVC ischémique'), 'AVC hémorragique récent (< 3 mois)')).toBe('non');
    expect(v(patho('Asthme léger'), 'Asthme sévère')).toBe('non');
  });
  it('sans qualificatif dans la CI, la pathologie précisée du patient déclenche toujours', () => {
    expect(v(patho('Asthme sévère'), 'Asthme')).toBe('oui');
    expect(v(patho('Ulcère gastrique cicatrisé'), 'Ulcère gastro-duodénal')).toBe('oui');
    expect(v(patho('asthme allergique'), 'Asthme')).toBe('oui');
  });
  it('le meilleur verdict l’emporte entre plusieurs pathologies', () => {
    expect(v(patho('Asthme', 'Asthme sévère'), 'Asthme sévère')).toBe('oui');
    expect(v(patho('Épilepsie', 'Glaucome'), 'Glaucome à angle fermé')).toBe('preciser');
  });
  it('texte de carte : le titre nomme la condition du patient', () => {
    expect(conditionTitre(m(patho('Épilepsie'), 'Épilepsie non contrôlée'))).toBe('Si non contrôlée (patient : « Épilepsie »)');
    expect(conditionTitre(m(patho('Épilepsie'), 'Épilepsie'))).toBeNull();
    expect(conditionTitre(m(patho('Arthrose'), 'Épilepsie'))).toBeNull();
  });
});

describe('règle 6 — qualificatifs discriminants du seul côté de la CI', () => {
  it.each([
    ['Hypertension artérielle', 'Grossesse — hypertension pulmonaire néonatale persistante'],
    ['Hypertension artérielle', 'Grossesse — hypertension artérielle gravidique'],
    ['Insuffisance rénale chronique', 'Grossesse — insuffisance rénale fœtale (> 20 SA)'],
    ['Insuffisance rénale chronique', 'Insuffisance respiratoire'],
    ['Insuffisance rénale chronique', 'Insuffisance respiratoire sévère (SpO2 < 90%)'],
    ['Insuffisance rénale chronique', 'Insuffisance rénale aiguë oligurique (sans hypervolémie)'],
    ['Insuffisance rénale chronique', 'Insuffisance surrénalienne'],
    ['Insuffisance rénale', 'Insuffisance surrénale non substituée'],
    ['AVC', 'Hémorragie intracrânienne récente (< 3 mois)'],
    ['Hypertension artérielle', 'Hypertension portale'],
  ])('« %s » ne déclenche pas « %s »', (p, cv) => {
    expect(v(patho(p), cv)).toBe('non');
  });
  it('garde-fou à l’exécution : même si la table rattachait à tort la CI au concept du patient', () => {
    const faux: CiConceptRow[] = [
      { condition_norm: normCondition('Hypertension artérielle pulmonaire'), condition_valeur: 'Hypertension artérielle pulmonaire', ordre: 1,
        libelle: 'Hypertension artérielle pulmonaire', traitement: 'concept', concept: 'Hypertension artérielle', famille: null,
        qualificatif: null, qualificatif_type: null, stade: null },
      { condition_norm: normCondition('Pancréatite aiguë sévère'), condition_valeur: 'Pancréatite aiguë sévère', ordre: 1,
        libelle: 'Pancréatite aiguë sévère', traitement: 'concept', concept: 'Pancréatite chronique', famille: null,
        qualificatif: null, qualificatif_type: null, stade: null },
    ];
    const d = buildConditionMatcher(faux, curees, familles);
    const vv = (p: string, cv: string) => matchCondition(d, preparePatient({ pathologies: [p] }, d), 'pathologie', cv).verdict;
    expect(vv('Hypertension artérielle', 'Hypertension artérielle pulmonaire')).toBe('non');
    expect(vv('Pancréatite chronique', 'Pancréatite aiguë sévère')).toBe('non'); // « aiguë » face à une pathologie chronique
  });
  it('le discriminant porté par les DEUX côtés ne bloque pas', () => {
    expect(v(patho('Insuffisance respiratoire chronique'), 'Insuffisance respiratoire')).toBe('oui');
    expect(v(patho('Insuffisance rénale aiguë'), 'Insuffisance rénale aiguë oligurique (sans hypervolémie)')).toBe('oui');
    expect(v(patho('IRA'), 'Insuffisance rénale aiguë oligurique (sans hypervolémie)')).toBe('oui');
    expect(v(patho('Insuffisance surrénalienne'), 'Insuffisance surrénalienne')).toBe('oui');
    expect(v(patho('Maladie d\'Addison'), 'Insuffisance surrénale non substituée')).toBe('a_evaluer');
    expect(v(patho('Fibrose pulmonaire'), 'Fibrose pulmonaire préexistante')).toBe('oui');
  });
});

describe('règle 7 — stades rénaux', () => {
  it('« insuffisance rénale modérée » = stade 3', () => {
    const p = patho('Insuffisance renale moderee');
    expect(v(p, 'Insuffisance rénale chronique stade 3')).toBe('oui');
    expect(v(p, 'Insuffisance rénale chronique stade 3-5')).toBe('oui');
    expect(v(p, 'Insuffisance rénale chronique stade 4')).toBe('non');
    expect(v(p, 'Insuffisance rénale sévère (DFG < 30 mL/min)')).toBe('non');
    // 3a ou 3b : seul le DFG tranche.
    expect(m(p, 'Insuffisance rénale chronique stade 3b-5 (DFG < 45)')).toMatchObject({ verdict: 'a_evaluer', titre: TITRE_STADE });
    expect(v({ ...p, dfg: 40 }, 'Insuffisance rénale chronique stade 3b-5 (DFG < 45)')).toBe('oui');
    expect(v({ ...p, dfg: 50 }, 'Insuffisance rénale chronique stade 3b-5 (DFG < 45)')).toBe('non');
  });
  it('une CI de stade N ne se déclenche que si le stade du patient est ≥ N', () => {
    const s = (n: string) => patho(`Insuffisance rénale chronique stade ${n}`);
    expect(v(s('2'), 'Insuffisance rénale chronique stade 3')).toBe('non');
    expect(v(s('3b'), 'Insuffisance rénale chronique stade 3b-5 (DFG < 45)')).toBe('oui');
    expect(v(s('3a'), 'Insuffisance rénale chronique stade 3b-5 (DFG < 45)')).toBe('non');
    expect(v(s('4'), 'Insuffisance rénale chronique stade 3')).toBe('oui');
    expect(v(s('4'), 'Insuffisance rénale chronique stade 4-5')).toBe('oui');
    expect(v(s('4'), 'Insuffisance rénale chronique stade 5 (DFG < 15)')).toBe('non');
    expect(v(patho('Insuffisance rénale sévère'), 'Insuffisance rénale chronique stade 4')).toBe('oui');
    expect(v(patho('Insuffisance rénale terminale'), 'Insuffisance rénale chronique stade 5')).toBe('oui');
    expect(lignes(patho('Hémodialyse'), 'oui')).toBe(107); // toutes (dont « Dialyse ») sauf l'insuffisance rénale AIGUË
  });
  it('IRC sans stade ni DFG → « À évaluer » + « Préciser le stade ou saisir une créatinine »', () => {
    for (const p of ['Insuffisance rénale chronique', 'insuffisance rénale chronique', 'Insuffisance rénale', 'IRC']) {
      expect(m(patho(p), 'Insuffisance rénale chronique stade 4'), p).toMatchObject({ verdict: 'a_evaluer', titre: TITRE_STADE });
      expect(lignes(patho(p), 'a_evaluer'), p).toBe(106); // tout sauf « Dialyse » (1) et l'insuffisance rénale aiguë (1)
      expect(lignes(patho(p), 'oui'), p).toBe(0);
    }
  });
  it('IRC sans stade : le DFG du canal rénal donne le stade', () => {
    expect(stadeDuDfg(72)).toBe(2);
    expect(stadeDuDfg(59)).toBe(3);
    expect(stadeDuDfg(44)).toBe(3.5);
    expect(stadeDuDfg(29)).toBe(4);
    expect(stadeDuDfg(14)).toBe(5);
    const p = (dfg: number): P => ({ pathologies: ['Insuffisance rénale chronique'], dfg });
    expect(v(p(72), 'Insuffisance rénale chronique stade 3')).toBe('non');
    expect(v(p(50), 'Insuffisance rénale chronique stade 3')).toBe('oui');
    expect(v(p(50), 'Insuffisance rénale chronique stade 4')).toBe('non');
    expect(v(p(25), 'Insuffisance rénale sévère (DFG < 30 mL/min)')).toBe('oui');
    expect(v(p(25), 'Insuffisance rénale chronique stade 5')).toBe('non');
    // Le stade déclaré n'est jamais abaissé par un DFG meilleur.
    expect(v({ pathologies: ['Insuffisance rénale chronique stade 4'], dfg: 70 }, 'Insuffisance rénale chronique stade 4')).toBe('oui');
  });
  it('le DFG seul ne déclenche rien ici : il faut une insuffisance rénale chronique dans les pathologies', () => {
    expect(v({ pathologies: ['Asthme'], dfg: 20 }, 'Insuffisance rénale chronique stade 4')).toBe('non');
  });
});

describe('défauts constatés au Sprint 6B (matchingExistant.defauts.test.ts) — attentes INVERSÉES', () => {
  it('DÉFAUT 1 corrigé : « Insuffisance respiratoire » ne déclenche plus AUCUNE CI rénale', () => {
    expect(v(patho('Insuffisance respiratoire chronique'), 'Insuffisance rénale chronique stade 3')).toBe('non');
    expect(v(patho('Insuffisance respiratoire'), 'Insuffisance rénale sévère (DFG < 30 mL/min)')).toBe('non');
    expect(lignes(patho('Insuffisance respiratoire chronique'), 'non')).toBe(108); // 107 lignes déclenchées à tort auparavant
    expect(lignes(patho('Insuffisance respiratoire'), 'non')).toBe(108);
  });
  it('les autres « insuffisance … » ne sont toujours pas touchées', () => {
    for (const p of ['Insuffisance cardiaque', 'Insuffisance hépatique sévère', 'Insuffisance surrénalienne', 'BPCO']) {
      expect(lignes(patho(p), 'non'), p).toBe(108);
    }
  });
  it('DÉFAUT 2 corrigé : « IRC stade 3 » ne déclenche plus les CI des stades 4, 5 et « sévère »', () => {
    const p = patho('Insuffisance rénale chronique stade 3');
    expect(v(p, 'Insuffisance rénale chronique stade 4')).toBe('non');
    expect(v(p, 'Insuffisance rénale chronique stade 4-5')).toBe('non');
    expect(v(p, 'Insuffisance rénale chronique stade 5 (DFG < 15)')).toBe('non');
    expect(v(p, 'Insuffisance rénale sévère (DFG < 30 mL/min)')).toBe('non');
    // Seules les CI visant le stade 3 : « stade 3 » (37) et « stade 3-5 » (1). Les 69 autres ne se déclenchent plus.
    expect(lignes(p, 'oui')).toBe(38);
    expect(lignes(p, 'a_evaluer')).toBe(2); // « stade 3b-5 » : 3a ou 3b non précisé
    expect(lignes(p, 'non')).toBe(108 - 38 - 2);
  });
  it('même correction pour une pathologie saisie sans stade : plus rien de ferme, tout est « À évaluer »', () => {
    expect(lignes(patho('Insuffisance rénale'), 'oui')).toBe(0);
    expect(lignes(patho('Insuffisance rénale chronique'), 'oui')).toBe(0);
    expect(lignes(patho('Insuffisance rénale chronique'), 'a_evaluer')).toBe(106);
  });
  it('« Dialyse » : un stade 3 ne la déclenche pas, une hémodialyse oui (inchangé)', () => {
    expect(v(patho('Insuffisance rénale chronique stade 3'), 'Dialyse')).toBe('non');
    expect(v(patho('Hémodialyse'), 'Dialyse')).toBe('oui');
  });
});

describe('règle 8 — allergies : par famille ou molécule', () => {
  it('même molécule ou même famille, en mots entiers', () => {
    expect(v(allergie('Aspirine'), "Allergie à l'Aspirine", 'allergie_med')).toBe('oui');
    expect(v(allergie("Allergie à l'Aspirine"), 'Allergie aux AINS / Aspirine')).toBe('oui'); // CI typée « pathologie » en base
    expect(v(allergie('Allergie à la Warfarine'), 'Allergie aux coumarines (warfarine, acénocoumarol)', 'allergie_med')).toBe('oui');
    expect(v(allergie('Sulfamides'), 'Allergie aux sulfamides', 'allergie_med')).toBe('oui');
    expect(v({ allergiesAlimentaires: ['Gluten'] }, 'Allergie au Blé/Gluten', 'allergie_alim')).toBe('oui');
    expect(v({ allergiesAlimentaires: ['arachide'] }, 'Allergie aux Arachides', 'allergie_alim')).toBe('oui');
  });
  it('molécule du patient ∈ famille nommée par la CI (cohérent avec allergyClassEngine)', () => {
    expect(v(allergie('Amoxicilline'), 'Allergie aux Pénicillines', 'allergie_med')).toBe('oui');
    expect(v(allergie('Ibuprofène'), 'Allergie aux AINS (syndrome de Widal)', 'allergie_med')).toBe('oui');
    expect(v(allergie('Kardegic'), "Allergie à l'Aspirine", 'allergie_med')).toBe('oui');
    // Allergie croisée entre familles : c'est le canal allergies qui décide (L3, L6…), pas la base.
    expect(v(allergie('Amoxicilline'), 'Allergie aux céphalosporines', 'allergie_med')).toBe('non');
  });
  it('jamais par préfixe', () => {
    expect(v(allergie('Allergie à la Carbamazépine'), 'Allergie à la Morphine', 'allergie_med')).toBe('non');
    expect(v(allergie('Allergie aux Sulfamides'), 'Allergie aux Sartans', 'allergie_med')).toBe('non');
    expect(v(allergie('Allergie aux Sulfamides'), 'Allergie aux Statines', 'allergie_med')).toBe('non');
    expect(v(allergie('Allergie au Latex'), 'Allergie au Lait de vache', 'allergie_alim')).toBe('non');
    expect(v(allergie('Allergie aux AINS'), 'Allergie aux AOD (rivaroxaban, apixaban, dabigatran)', 'allergie_med')).toBe('non');
    expect(v({ allergiesAlimentaires: ['Allergie aux Poissons'] }, 'Allergie aux Pénicillines', 'allergie_med')).toBe('non');
  });
  it('jamais de croisement allergie × pathologie', () => {
    expect(v(patho('Asthme'), 'Allergie aux AINS (urticaire, angio-œdème, asthme)', 'allergie_med')).toBe('non');
    expect(v(allergie('Aspirine'), "Asthme aggravé par l'aspirine / AINS")).toBe('non');
    expect(v(patho('Allergie aux Pénicillines'), 'Allergie aux Pénicillines', 'allergie_med')).toBe('oui'); // allergie saisie en pathologie
    expect(v(allergie('Asthme'), 'Asthme')).toBe('non');
  });
  it('sans les familles du canal (chargement en échec), le nom reste comparé', () => {
    const d = buildConditionMatcher(rows, curees, []);
    const vv = (a: string, cv: string) => matchCondition(d, preparePatient({ allergiesMedicaments: [a] }, d), 'allergie_med', cv).verdict;
    expect(vv('Pénicilline', 'Allergie aux Pénicillines')).toBe('oui');
    expect(vv('Amoxicilline', 'Allergie aux Pénicillines')).toBe('non');
  });
});

describe('règle 9 — conditions obligatoires des disparitions validées', () => {
  const KARDEGIC: AllergyMed = { id: 'kardegic', nom: 'KARDEGIC 75 MG', dci: 'DL-LYSINE (ACÉTYLSALICYLATE DE)', dci_canonique: 'aspirine acide acetylsalicylique acetylsalicylate', ingredients: ['aspirine', 'aspirin'] };
  const ASPEGIC: AllergyMed = { id: 'aspegic', nom: 'ASPEGIC 500 MG', dci: 'ACÉTYLSALICYLATE DE DL-LYSINE', dci_canonique: 'aspirine acide acetylsalicylique acetylsalicylate', ingredients: ['aspirine', 'aspirin'] };
  const BRUFEN: AllergyMed = { id: 'brufen', nom: 'BRUFEN 400 MG', dci: 'IBUPROFÈNE', ingredients: ['ibuprofène', 'ibuprofen'] };
  // Lignes de la base (contraindications), relevées le 11/10/2026.
  const CI_WIDAL = {
    dci_pattern: 'aspirine|acide acétylsalicylique|acétylsalicylate|ibuprofène|naproxène|diclofénac|kétoprofène|indométacine|piroxicam|méloxicam|ténoxicam|flurbiprofène|acide tiaprofénique',
    condition_type: 'pathologie', condition_valeur: "Asthme aggravé par l'aspirine / AINS", severite: 'absolue',
  };
  const CI_ALLERGIE_ASPIRINE = [
    { dci_pattern: 'acide acetylsalicylique|aspirine', condition_valeur: "Allergie à l'Aspirine" },
    { dci_pattern: 'ibuprofene|diclofenac|naproxene|ketoprofene|meloxicam|piroxicam|indometacine|celecoxib', condition_valeur: "Allergie à l'Aspirine" },
  ];

  it('Kardegic chez un patient « Asthme » : l’alerte « syndrome de Widal / asthme » reste déclenchée, sévérité conservée', () => {
    expect(medMatchesPattern(KARDEGIC, CI_WIDAL.dci_pattern)).toBe(true);
    for (const p of ['Asthme', 'asthme', 'asthme allergique']) {
      const r = m(patho(p), CI_WIDAL.condition_valeur, CI_WIDAL.condition_type);
      expect(r.verdict, p).toBe('preciser'); // jamais « non », jamais abaissée en « À évaluer »
      expect(r.titre).toBe("Si aggravé par l'aspirine ou les AINS (syndrome de Widal) — préciser");
    }
    // La seule alerte qui disparaît est le croisement avec une CI d'ALLERGIE (type croisé).
    expect(v(patho('Asthme'), 'Allergie aux AINS (urticaire, angio-œdème, asthme)', 'allergie_med')).toBe('non');
  });
  it('allergie « Aspirine » → Kardegic, Aspégic et Brufen en CI absolue via allergyClassEngine', () => {
    const r = evaluateAllergies([KARDEGIC, ASPEGIC, BRUFEN], [{ label: 'Aspirine' }], familles, regles as RegleAllergie[]);
    // Kardegic / Aspégic : le principe actif lui-même (L0, à égalité de sévérité avec L6) ; Brufen : intolérance croisée (L6).
    expect(Object.fromEntries(r.map(a => [a.medId, [a.severite, a.regleCode]])))
      .toEqual({ kardegic: ['absolue', 'L0'], aspegic: ['absolue', 'L0'], brufen: ['absolue', 'L6'] });
    // Sans la règle L0, la famille (L6) suffit : même sévérité.
    const sansL0 = evaluateAllergies([KARDEGIC, ASPEGIC, BRUFEN], [{ label: 'Aspirine' }], familles, (regles as RegleAllergie[]).filter(x => x.code !== 'L0'));
    expect(sansL0.map(a => [a.severite, a.regleCode])).toEqual([['absolue', 'L6'], ['absolue', 'L6'], ['absolue', 'L6']]);
  });
  it('allergie « Allergie aux AINS » → mêmes trois médicaments en CI absolue (L7)', () => {
    const r = evaluateAllergies([KARDEGIC, ASPEGIC, BRUFEN], [{ label: 'Allergie aux AINS' }], familles, regles as RegleAllergie[]);
    expect(r.map(a => a.severite)).toEqual(['absolue', 'absolue', 'absolue']);
    expect(new Set(r.map(a => a.regleCode))).toEqual(new Set(['L7']));
  });
  it('…et les CI d’allergie de la base restent déclenchées par le nouveau matching', () => {
    expect(medMatchesPattern(KARDEGIC, CI_ALLERGIE_ASPIRINE[0].dci_pattern)).toBe(true);
    expect(medMatchesPattern(ASPEGIC, CI_ALLERGIE_ASPIRINE[0].dci_pattern)).toBe(true);
    expect(medMatchesPattern(BRUFEN, CI_ALLERGIE_ASPIRINE[1].dci_pattern)).toBe(true);
    for (const a of ['Aspirine', "Allergie à l'Aspirine"]) expect(v(allergie(a), "Allergie à l'Aspirine", 'allergie_med'), a).toBe('oui');
  });
});

// ─── Sprint 2b-2 — correctifs du matching ────────────────────────────────────

describe('2b-2, point 1 — une pathologie listée est ACTIVE par définition', () => {
  it('« actif / évolutif » est satisfait : la CI s’applique, sévérité conservée, sans « À évaluer »', () => {
    for (const [p, cv] of [
      ['Ulcère gastrique', 'Ulcère gastroduodénal actif'],
      ['Ulcère duodénal', 'Ulcère gastroduodénal actif (non traité)'],
      ['Ulcère gastro-duodénal', 'Ulcère peptique actif'],
      ['Goutte', 'Goutte active'],
      ['Hépatite virale B', 'Hépatite virale active (B ou C)'],
      ["Addiction à l'alcool", 'Alcoolisme actif'],
      ['alcoolisme', 'Alcoolisme chronique actif'],
      ['Zona', 'Varicelle ou zona actif (patient non immunisé)'],
      ['Herpès', 'Varicelle / Herpès actif'],
    ]) {
      const r = m(patho(p), cv);
      expect(r, `${p} × ${cv}`).toMatchObject({ verdict: 'oui', titre: null });
      expect(conditionTitre(r)).toBeNull();
    }
  });
  it('« en poussée » : même règle', () => {
    const d = buildConditionMatcher([{
      condition_norm: normCondition('Maladie de Crohn en poussée'), condition_valeur: 'Maladie de Crohn en poussée', ordre: 1,
      libelle: 'Maladie de Crohn en poussée', traitement: 'concept', concept: 'Maladie de Crohn', famille: null,
      qualificatif: 'en poussée', qualificatif_type: 'etat', stade: null,
    }], curees, familles);
    expect(matchCondition(d, preparePatient({ pathologies: ['Maladie de Crohn'] }, d), 'pathologie', 'Maladie de Crohn en poussée'))
      .toMatchObject({ verdict: 'oui', titre: null });
  });
  it('le libellé du patient dit le contraire (cicatrisé, antécédent, rémission) → pas de correspondance', () => {
    expect(v(patho('Ulcère gastrique cicatrisé'), 'Ulcère gastroduodénal actif')).toBe('non');
    expect(v(patho("Antécédent d'ulcère gastrique"), 'Ulcère peptique actif')).toBe('non');
    expect(v(patho('Goutte en rémission'), 'Goutte active')).toBe('non');
  });
  it('les AUTRES qualificatifs d’état restent « À évaluer » — le titre ne répète pas « actif »', () => {
    expect(m(patho('Épilepsie'), 'Épilepsie non contrôlée')).toMatchObject({ verdict: 'a_evaluer', titre: 'Si non contrôlée' });
    expect(m(patho('Insuffisance cardiaque'), 'Insuffisance cardiaque décompensée')).toMatchObject({ verdict: 'a_evaluer', titre: 'Si décompensée' });
    expect(m(patho('Phéochromocytome'), 'Phéochromocytome non traité')).toMatchObject({ verdict: 'a_evaluer', titre: 'Si non traité' });
    expect(m(patho('Diabète de type 2'), 'Diabète insulino-dépendant avec hypoglycémies fréquentes').verdict).toBe('a_evaluer');
    expect(m(patho('Tuberculose pulmonaire'), 'Tuberculose active non traitée')).toMatchObject({ verdict: 'a_evaluer', titre: 'Si non traitée' });
    expect(m(patho('Néoplasie évolutive'), 'Néoplasie évolutive non contrôlée')).toMatchObject({ verdict: 'a_evaluer', titre: 'Si non contrôlée' });
  });
});

describe('2b-2, point 2 — faux négatifs fermés', () => {
  it('« Hypotension orthostatique » ⊂ Hypotension', () => {
    expect(analysePatientTerm('Hypotension orthostatique', 'pathologie', D).concepts).toEqual(['Hypotension artérielle']);
    expect(v(patho('Hypotension orthostatique'), 'Hypotension')).toBe('oui');
    expect(v(patho('hypotension orthostatique'), 'Hypotension artérielle (TAS < 90 mmHg)')).toBe('oui');
    expect(v(patho('Hypertension artérielle'), 'Hypotension')).toBe('non');
  });
  it('« Infection urinaire » et toute infection précisée ⊂ CI génériques « Infection »', () => {
    for (const p of ['Infection urinaire', 'Cystite', 'Pneumonie', 'Tuberculose pulmonaire', 'Hépatite virale C', "Gastro-entérite de l'enfant",
      'Infection ostéo-articulaire', 'infection cutanée', 'Infection']) {
      expect(v(patho(p), 'Infection'), p).toBe('oui');
    }
    expect(m(patho('Infection urinaire'), 'Infection active sévère non contrôlée')).toMatchObject({ verdict: 'a_evaluer', titre: 'Si sévère non contrôlée' });
    expect(m(patho('Infection urinaire'), 'Infections actives sévères')).toMatchObject({ verdict: 'preciser', titre: 'Si sévères — préciser' });
    expect(m(patho('Pneumonie'), 'Infection active non traitée (tuberculose, sepsis fongique)')).toMatchObject({ verdict: 'a_evaluer', titre: 'Si non traitée' });
    // Ni une négation, ni une pathologie non infectieuse, ni une CI d'infection SPÉCIFIQUE.
    expect(v(patho("Pas d'infection"), 'Infection')).toBe('non');
    expect(v(patho('Arthrose'), 'Infection')).toBe('non');
    expect(v(patho('Asthme'), 'Infection')).toBe('non');
    expect(v(patho('Infection urinaire'), 'Infections fongiques systémiques')).toBe('non');
  });
  it('« Cirrhose alcoolique » → concept Cirrhose', () => {
    for (const p of ['cirrhose alcoolique', 'Cirrhose', 'Cirrhose biliaire primitive', 'Cirrhose du foie']) {
      expect(analysePatientTerm(p, 'pathologie', D).concepts, p).toEqual(['Cirrhose du foie']);
      expect(v(patho(p), 'Cirrhose hépatique'), p).toBe('oui');
    }
    // La table ne rattache pas la cirrhose à l'insuffisance hépatique : aucune déduction ici.
    expect(v(patho('cirrhose alcoolique'), 'Insuffisance hépatique')).toBe('non');
  });
  it('« Lupus érythémateux disséminé » → concept Lupus', () => {
    expect(analysePatientTerm('lupus érythémateux disséminé', 'pathologie', D).concepts).toEqual(['Lupus érythémateux systémique']);
  });
  it('les noms complémentaires désignent tous un concept existant', () => {
    const noms = new Set(curees.map(c => c.nom_fr));
    for (const k of Object.keys(NOMS_COMPLEMENTAIRES)) expect(noms.has(k), k).toBe(true);
  });
});

describe('2b-2, point 3 — CI « Dialyse »', () => {
  it('déclenchée par un patient dialysé : pathologie ou antécédent', () => {
    expect(v(patho('Hémodialyse'), 'Dialyse')).toBe('oui');
    expect(v(patho('Dialyse péritonéale'), 'Dialyse')).toBe('oui');
    expect(v({ pathologies: ['Insuffisance rénale chronique'], antecedents: ['Hémodialyse depuis 2023'] }, 'Dialyse')).toBe('oui');
    expect(v({ pathologies: [], antecedents: ['Dialyse'] }, 'Dialyse')).toBe('oui');
  });
  it('déclenchée par un DFG < 15, même sans pathologie rénale saisie', () => {
    expect(v({ pathologies: ['Asthme'], dfg: 14 }, 'Dialyse')).toBe('oui');
    expect(v({ pathologies: ['Insuffisance rénale chronique'], dfg: 15 }, 'Dialyse')).toBe('non');
    expect(v({ pathologies: ['Insuffisance rénale chronique'], dfg: 40 }, 'Dialyse')).toBe('non');
  });
  it('plus jamais « À évaluer » : IRC sans stade, stade 5 non dialysé, « non dialysé » → rien', () => {
    for (const p of ['Insuffisance rénale chronique', 'IRC', 'Insuffisance rénale', 'Insuffisance rénale chronique stade 5',
      'Insuffisance rénale terminale', 'IRC non dialysée']) {
      expect(v(patho(p), 'Dialyse'), p).toBe('non');
    }
    // Les CI de STADE restent inchangées pour ces patients.
    expect(v(patho('Insuffisance rénale chronique stade 5'), 'Insuffisance rénale chronique stade 5 (dialyse)')).toBe('oui');
    expect(v(patho('Insuffisance rénale chronique'), 'Insuffisance rénale chronique stade 5')).toBe('a_evaluer');
  });
});

describe('2b-2, point 4 — « Déficit en acide folique (grossesse planifiée) »', () => {
  const CI = 'Déficit en acide folique (grossesse planifiée)';
  it('jamais déclenchée par « Grossesse » en pathologie', () => {
    for (const p of ['Grossesse', 'grossesse', 'Grossesse normale']) expect(v(patho(p), CI), p).toBe('non');
    expect(D.rowsByNorm.get(normCondition(CI))![0].traitement).toBe('procreation');
  });
  it('reconnue comme CI de grossesse PLANIFIÉE (écartée par le moteur chez une patiente enceinte)', () => {
    expect(isPlannedPregnancyCondition(CI)).toBe(true);
    for (const c of ['Grossesse', 'Grossesse — 1er trimestre', 'Femme en âge de procréer sans contraception', "Grossesse dans le mois suivant l'arrêt (isotrétinoïne)"]) {
      expect(isPlannedPregnancyCondition(c), c).toBe(false);
    }
  });
  it('les autres CI de grossesse restent déclenchées par « Grossesse » en pathologie', () => {
    expect(v(patho('Grossesse'), 'Grossesse — 1er trimestre')).toBe('oui');
  });
});
