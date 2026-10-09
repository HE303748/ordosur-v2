import { describe, it, expect } from 'vitest';
import type { ExamRef } from './examSearch';
import { deriveDemandeStatut, type LigneStatut } from './examRequest';
import {
  parseNombre, formatNombre, examMesure, matchUnite, toRef, convertir, normUnite, resultKind, parseQualitatif,
  interpret, bornesLabel, bornesValides, needsReview, isNonVu, resultatsARevoir, serieKey, buildSeries, categoriesOf,
  tendance, valeurAffichee, findPrevious, deltaCheck, parseSaisieLibre, defaultUnite, lastUnitsBySerie,
  buildResultatPayload, draftError, lignesASaisir, lignesApresResultats, derniersBilans, derniersBilansLine,
  chartSerie, unitesCourbe, buildRecap, shortLabel, defaultParametre, emptyField, fieldToDraft,
  type ResultatExamen, type ResultatDraft,
} from './resultatsLogic';
import data from './examens_reference.data.json';

const refs = data.examens as ExamRef[];
const ref = (c: string) => refs.find(r => r.code === c)!;

let seq = 0;
const R = (code: string | null, over: Partial<ResultatExamen> = {}): ResultatExamen => {
  const e = code ? ref(code) : null;
  const m = examMesure(e);
  seq += 1;
  const base: ResultatExamen = {
    id: `r${seq}`, patient_id: 'p1', org_id: 'o1', doctor_id: 'd1',
    examen_code: code, libelle: e?.libelle ?? 'Examen libre', parametre: m.parametre, type: e?.type ?? 'biologie', categorie: e?.categorie ?? null,
    demande_ligne_id: null, date_prelevement: '2026-09-12', valeur_num: null, valeur_texte: null, unite_saisie: null,
    valeur_ref: null, unite_ref: null, borne_basse: null, borne_haute: null, interpretation: null, a_revoir: false,
    laboratoire: null, commentaire: null, vu_le: null, vu_par_doctor_id: null, vu_commentaire: null,
    archive: false, archive_motif: null, archive_par_doctor_id: null, archive_le: null, created_at: `2026-09-12T10:00:${String(seq % 60).padStart(2, '0')}Z`,
  };
  const r = { ...base, ...over };
  if (r.valeur_num !== null && over.valeur_ref === undefined) {
    const t = toRef(r.valeur_num, r.unite_saisie, examMesure(e, r.parametre));
    r.valeur_ref = t?.valeur_ref ?? null;
    r.unite_ref = t?.unite_ref ?? null;
  }
  if (r.valeur_num !== null && over.interpretation === undefined) r.interpretation = interpret(r.valeur_num, r.borne_basse, r.borne_haute);
  return r;
};

describe('1. nombres au format français', () => {
  it('virgule ou point, milliers séparés par une espace', () => {
    expect(parseNombre('7,2')).toEqual({ valeur: 7.2, decimales: 1 });
    expect(parseNombre('7.2')).toEqual({ valeur: 7.2, decimales: 1 });
    expect(parseNombre('12')).toEqual({ valeur: 12, decimales: 0 });
    expect(parseNombre('1 250')).toEqual({ valeur: 1250, decimales: 0 });
    expect(parseNombre('1 250,5')).toEqual({ valeur: 1250.5, decimales: 1 });
    expect(parseNombre(' 0,85 ')).toEqual({ valeur: 0.85, decimales: 2 });
  });
  it('refuse ce qui n’est pas un nombre', () => {
    for (const s of ['', 'abc', '7,2,1', '-3', '12 5', '7,', ',5', '1e3']) expect(parseNombre(s)).toBeNull();
  });
  it('affichage : virgule, zéros de fin retirés', () => {
    expect(formatNombre(7.2)).toBe('7,2');
    expect(formatNombre(12)).toBe('12');
    expect(formatNombre(106.08)).toBe('106,1');
    expect(formatNombre(0.8456)).toBe('0,846');
    expect(formatNombre(null)).toBe('');
  });
});

describe('2. conversions — uniquement celles du référentiel', () => {
  const avecConversion = refs.filter(e => e.unites.length > 0);

  it('le référentiel porte bien des conversions (Sprint 5)', () => {
    expect(avecConversion.length).toBeGreaterThanOrEqual(14);
  });

  it('TOUTES les conversions du référentiel : aller-retour sans perte', () => {
    let n = 0;
    for (const e of avecConversion) {
      const m = examMesure(e);
      expect(m.uniteRef, e.code).toBeTruthy();
      // Chaque entrée du référentiel est comprise (aucune ignorée en silence).
      expect(m.unites.length, e.code).toBe(1 + e.unites.filter(u => (u.parametre ?? null) === m.parametre).length);
      for (const u of m.unites) {
        for (const v of [0.5, 1, 7.2, 12, 135]) {
          const aller = convertir(v, m.uniteRef, u.unite, m)!;
          const retour = convertir(aller, u.unite, m.uniteRef, m)!;
          expect(retour, `${e.code} ${m.uniteRef}→${u.unite}→${m.uniteRef}`).toBeCloseTo(v, 6);
          n += 1;
        }
      }
    }
    expect(n).toBeGreaterThan(100);
  });

  it('valeurs de contrôle (facteur, diviseur, formule IFCC)', () => {
    expect(convertir(12, 'mg/L', 'µmol/L', examMesure(ref('CREATININE')))).toBeCloseTo(106.08, 2);
    expect(convertir(1, 'g/L', 'mmol/L', examMesure(ref('GLYCEMIE_JEUN')))).toBeCloseTo(5.551, 3);
    expect(convertir(100.2, 'mg/L', 'mmol/L', examMesure(ref('CALCIUM')))).toBeCloseTo(2.5, 3);
    expect(convertir(7, '%', 'mmol/mol', examMesure(ref('HBA1C')))).toBeCloseTo(53.0, 1);
    expect(convertir(53, 'mmol/mol', '%', examMesure(ref('HBA1C')))).toBeCloseTo(7.0, 1);
    expect(convertir(13.5, 'g/dL', 'g/L', examMesure(ref('NFS')))).toBeCloseTo(135, 6);
  });

  it('NFS : le paramètre « hémoglobine » porte l’unité de référence', () => {
    expect(defaultParametre(ref('NFS'))).toBe('hémoglobine');
    expect(defaultParametre(ref('CREATININE'))).toBeNull();
    const m = examMesure(ref('NFS'));
    expect(m.uniteRef).toBe('g/dL');
    expect(m.unites.map(u => u.unite)).toEqual(['g/dL', 'g/L']);
  });

  it('unité : casse, espaces et « µ » tolérés ; préfixe unique accepté', () => {
    const creat = examMesure(ref('CREATININE'));
    expect(matchUnite('MG/l', creat)?.unite).toBe('mg/L');
    expect(matchUnite('umol/l', creat)?.unite).toBe('µmol/L');
    expect(matchUnite('μmol/L', creat)?.unite).toBe('µmol/L');
    expect(matchUnite('µmol', creat)?.unite).toBe('µmol/L');
    expect(matchUnite('g/dl', examMesure(ref('NFS')))?.unite).toBe('g/dL');
    expect(normUnite(' mL / min ')).toBe('ml/min');
  });

  it('aucune conversion inventée : unité hors référentiel → pas de valeur de référence', () => {
    const creat = examMesure(ref('CREATININE'));
    expect(matchUnite('mg/dL', creat)).toBeNull();
    expect(toRef(1.2, 'mg/dL', creat)).toBeNull();
    expect(convertir(1.2, 'mg/dL', 'mg/L', creat)).toBeNull();
    // Examen sans conversion : seule son unité de référence est connue.
    const tsh = examMesure(ref('TSH'));
    expect(tsh.unites.map(u => u.unite)).toEqual(['mUI/L']);
    expect(toRef(2.1, 'mUI/L', tsh)).toEqual({ valeur_ref: 2.1, unite_ref: 'mUI/L' });
    expect(toRef(2.1, 'µUI/mL', tsh)).toBeNull();
    // Formule inconnue du module : ignorée.
    const faux = { ...ref('CREATININE'), unites: [{ unite: 'x', formule: 'inconnue' }] } as ExamRef;
    expect(examMesure(faux).unites.map(u => u.unite)).toEqual(['mg/L']);
    // Examen sans unité, saisie libre : rien.
    expect(examMesure(ref('ECBU')).unites).toEqual([]);
    expect(examMesure(null).unites).toEqual([]);
  });

  it('nature du résultat attendu', () => {
    expect(resultKind(ref('HBA1C'))).toBe('numerique');
    expect(resultKind(ref('NFS'))).toBe('numerique');
    expect(resultKind(ref('VIH'))).toBe('qualitatif');
    expect(resultKind(ref('AG_HBS'))).toBe('qualitatif');
    expect(resultKind(ref('ECBU'))).toBe('texte');
    expect(resultKind(refs.find(r => r.type === 'imagerie')!)).toBe('texte');
    expect(resultKind(refs.find(r => r.type === 'exploration')!)).toBe('texte');
    expect(resultKind(null)).toBe('libre');
  });
});

describe('3. interprétation — bornes du laboratoire uniquement', () => {
  it('bornes présentes : bas, haut, normal (bornes incluses)', () => {
    expect(interpret(7.2, 4, 6)).toBe('haut');
    expect(interpret(3.9, 4, 6)).toBe('bas');
    expect(interpret(4, 4, 6)).toBe('normal');
    expect(interpret(6, 4, 6)).toBe('normal');
    expect(interpret(5, 4, 6)).toBe('normal');
  });
  it('une seule borne', () => {
    expect(interpret(0.35, 0.4, null)).toBe('bas');
    expect(interpret(0.5, 0.4, null)).toBe('normal');
    expect(interpret(1.3, null, 1.1)).toBe('haut');
    expect(interpret(1.0, null, 1.1)).toBe('normal');
  });
  it('sans bornes : jamais d’interprétation, quelle que soit la valeur', () => {
    for (const v of [0, 0.01, 7.2, 14, 250, 99999]) {
      expect(interpret(v, null, null)).toBeNull();
      expect(interpret(v, undefined, undefined)).toBeNull();
    }
    expect(interpret(null, 4, 6)).toBeNull();
  });
  it('aucune valeur normale codée en dur dans le module', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('./resultatsLogic.ts', import.meta.url), 'utf8');
    // Ni table de normes, ni seuil par examen : l'interprétation ne dépend que de ses arguments.
    expect(src).not.toMatch(/normes?\s*[:=]\s*[{[]/i);
    expect(src).not.toMatch(/(HBA1C|CREATININE|GLYCEMIE_JEUN|TSH)['"]?\s*:\s*[{[]?\s*\d/);
  });
  it('libellé des bornes et validité', () => {
    expect(bornesLabel({ borne_basse: 4, borne_haute: 6 })).toBe('4 – 6');
    expect(bornesLabel({ borne_basse: 0.4, borne_haute: null })).toBe('≥ 0,4');
    expect(bornesLabel({ borne_basse: null, borne_haute: 1.1 })).toBe('≤ 1,1');
    expect(bornesLabel({ borne_basse: null, borne_haute: null })).toBe('');
    expect(bornesValides(4, 6)).toBe(true);
    expect(bornesValides(6, 4)).toBe(false);
    expect(bornesValides(null, 4)).toBe(true);
  });
});

describe('4. contrôle de cohérence (delta check)', () => {
  const creat = examMesure(ref('CREATININE'));
  const prec = R('CREATININE', { valeur_num: 12, unite_saisie: 'mg/L', date_prelevement: '2026-09-12' });

  it('message exact, avec la valeur et la date du précédent', () => {
    const w = deltaCheck({ valeur: 40, decimales: 0, unite: 'mg/L' }, prec, creat)!;
    expect(w.kind).toBe('ecart');
    expect(w.message).toBe("Valeur très différente du précédent (12 mg/L le 12/09) — vérifier la valeur et l'unité");
  });
  it('rapport > ×3 ou < ÷3 → avertissement ; sinon rien', () => {
    expect(deltaCheck({ valeur: 37, decimales: 0, unite: 'mg/L' }, prec, creat)).not.toBeNull();
    expect(deltaCheck({ valeur: 36, decimales: 0, unite: 'mg/L' }, prec, creat)).toBeNull(); // ×3 pile : toléré
    expect(deltaCheck({ valeur: 3.9, decimales: 1, unite: 'mg/L' }, prec, creat)).not.toBeNull();
    expect(deltaCheck({ valeur: 4, decimales: 0, unite: 'mg/L' }, prec, creat)).toBeNull(); // ÷3 pile : toléré
    expect(deltaCheck({ valeur: 14, decimales: 0, unite: 'mg/L' }, prec, creat)).toBeNull();
  });
  it('comparaison dans l’unité de référence, même si l’unité de saisie change', () => {
    // 106 µmol/L = 12 mg/L : aucune alerte.
    expect(deltaCheck({ valeur: 106, decimales: 0, unite: 'µmol/L' }, prec, creat)).toBeNull();
    // 400 µmol/L = 45 mg/L : ×3,8.
    expect(deltaCheck({ valeur: 400, decimales: 0, unite: 'µmol/L' }, prec, creat)?.kind).toBe('ecart');
  });
  it('valeur = le précédent exprimé dans une autre unité → erreur d’unité probable', () => {
    const w = deltaCheck({ valeur: 106, decimales: 0, unite: 'mg/L' }, prec, creat)!;
    expect(w.kind).toBe('unite');
    expect(w.uniteProbable).toBe('µmol/L');
    // Cas où le rapport seul ne suffirait pas : cholestérol 2,00 g/L = 5,17 mmol/L (×2,6).
    const chol = examMesure(ref('CHOLESTEROL_TOTAL'));
    const pc = R('CHOLESTEROL_TOTAL', { valeur_num: 2, unite_saisie: 'g/L' });
    const wc = deltaCheck({ valeur: 5.17, decimales: 2, unite: 'g/L' }, pc, chol)!;
    expect(wc.kind).toBe('unite');
    expect(wc.uniteProbable).toBe('mmol/L');
    expect(deltaCheck({ valeur: 5.17, decimales: 2, unite: 'mmol/L' }, pc, chol)).toBeNull();
    // HbA1c : 7,2 % puis « 55 » laissé en %.
    const hb = examMesure(ref('HBA1C'));
    const ph = R('HBA1C', { valeur_num: 7.2, unite_saisie: '%' });
    expect(deltaCheck({ valeur: 55, decimales: 0, unite: '%' }, ph, hb)?.uniteProbable).toBe('mmol/mol');
  });
  it('même valeur que la précédente : jamais prise pour une erreur d’unité', () => {
    // Triglycérides 2 g/L = 2,26 mmol/L ; « 2 » tapé en g/L s'arrondit pareil dans les deux unités.
    const tg = examMesure(ref('TRIGLYCERIDES'));
    const pt = R('TRIGLYCERIDES', { valeur_num: 2, unite_saisie: 'g/L' });
    expect(deltaCheck({ valeur: 2, decimales: 0, unite: 'g/L' }, pt, tg)).toBeNull();
  });
  it('pas de précédent, précédent qualitatif ou unités non comparables → rien', () => {
    expect(deltaCheck({ valeur: 40, decimales: 0, unite: 'mg/L' }, null, creat)).toBeNull();
    expect(deltaCheck({ valeur: 40, decimales: 0, unite: 'mg/L' }, R('VIH', { valeur_texte: 'negatif' }), creat)).toBeNull();
    // Unité hors référentiel, différente de la précédente : non comparable.
    expect(deltaCheck({ valeur: 9, decimales: 0, unite: 'mg/dL' }, prec, creat)).toBeNull();
    // Même unité hors référentiel des deux côtés : comparaison brute.
    const libre = R(null, { libelle: 'Zinc', valeur_num: 10, unite_saisie: 'µmol/L' });
    expect(deltaCheck({ valeur: 45, decimales: 0, unite: 'µmol/l' }, libre, examMesure(null))?.kind).toBe('ecart');
    expect(deltaCheck({ valeur: 12, decimales: 0, unite: 'µmol/L' }, libre, examMesure(null))).toBeNull();
  });
  it('le précédent est le dernier résultat NON archivé de la même série', () => {
    const a = R('CREATININE', { valeur_num: 9, unite_saisie: 'mg/L', date_prelevement: '2026-03-01' });
    const b = R('CREATININE', { valeur_num: 120, unite_saisie: 'mg/L', date_prelevement: '2026-09-01', archive: true });
    const c = R('HBA1C', { valeur_num: 7, unite_saisie: '%', date_prelevement: '2026-09-20' });
    expect(findPrevious([a, b, c], serieKey(a))?.id).toBe(a.id);
    expect(findPrevious([a, b, c], serieKey(a), a.id)).toBeNull();
  });
});

describe('5. saisie libre', () => {
  const P = (s: string, pathologies: string[] = []) => parseSaisieLibre(s, refs, { pathologies });

  it('« hba1c 7,2 »', () => {
    const p = P('hba1c 7,2');
    expect(p.candidats[0].exam.code).toBe('HBA1C');
    expect(p.ambigu).toBe(false);
    expect(p.nombre).toEqual({ valeur: 7.2, decimales: 1 });
    expect(p.unite).toBeNull();
  });
  it('« créat 12 » (accent) et « creat 12 »', () => {
    for (const s of ['créat 12', 'creat 12', 'CREAT 12']) {
      const p = P(s);
      expect(p.candidats[0].exam.code, s).toBe('CREATININE');
      expect(p.ambigu, s).toBe(false);
      expect(p.nombre?.valeur, s).toBe(12);
    }
  });
  it('« tsh 2.1 » (point décimal)', () => {
    const p = P('tsh 2.1');
    expect(p.candidats.map(c => c.exam.code)).toEqual(['TSH']);
    expect(p.nombre).toEqual({ valeur: 2.1, decimales: 1 });
  });
  it('« hb 13,5 g/dl » : ambigu, choix explicite Hémoglobine / HbA1c', () => {
    const p = P('hb 13,5 g/dl');
    expect(p.ambigu).toBe(true);
    expect(p.candidats.map(c => c.exam.code).sort()).toEqual(['HBA1C', 'NFS']);
    const nfs = p.candidats.find(c => c.exam.code === 'NFS')!;
    expect(nfs.parametre).toBe('hémoglobine');
    expect(nfs.label).toBe('Hémoglobine (NFS)');
    expect(p.candidats.find(c => c.exam.code === 'HBA1C')!.label).toBe('HbA1c');
    expect(p.nombre?.valeur).toBe(13.5);
    expect(p.unite).toBe('g/dl');
    expect(matchUnite(p.unite, examMesure(nfs.exam, nfs.parametre))?.unite).toBe('g/dL');
  });
  it('« hb » : HbA1c en premier si le patient est diabétique, Hémoglobine sinon', () => {
    expect(P('hb 7,1', ['Diabète de type 2']).candidats[0].exam.code).toBe('HBA1C');
    expect(P('hb 7,1', ['Diabète de type 2']).ambigu).toBe(true);
    expect(P('hb 13', ['HTA']).candidats[0].exam.code).toBe('NFS');
    expect(P('hb 13', ['Diabète insipide']).candidats[0].exam.code).toBe('NFS');
  });
  it('unité collée, séparateurs « : » et « = », espaces multiples', () => {
    expect(P('hba1c 7,2%')).toMatchObject({ nombre: { valeur: 7.2 }, unite: '%' });
    expect(P('creat: 106 µmol/L')).toMatchObject({ nombre: { valeur: 106 }, unite: 'µmol/L' });
    expect(P('tsh=2,1')).toMatchObject({ nombre: { valeur: 2.1 }, unite: null });
    expect(P('  hba1c    7,2  ').nombre?.valeur).toBe(7.2);
    expect(P('glycemie 1,05 g/l').unite).toBe('g/l');
  });
  it('nom d’examen contenant des chiffres : la valeur est le bon nombre', () => {
    const p = P('ca 19-9 35');
    expect(p.candidats[0].exam.code).toBe('CA_19_9');
    expect(p.nombre?.valeur).toBe(35);
    const q = P('ca 125 30');
    expect(q.candidats[0].exam.code).toBe('CA_125');
    expect(q.nombre?.valeur).toBe(30);
    expect(P('t4l 12,5').candidats[0].exam.code).toBe('T4L');
    expect(P('vitamine d 28').candidats[0].exam.code).toBe('VITAMINE_D');
    expect(P('vitamine d 28').nombre?.valeur).toBe(28);
  });
  it('nom seul : examen proposé, pas de valeur', () => {
    expect(P('ca 125')).toMatchObject({ nombre: null, qualitatif: null });
    expect(P('ca 125').candidats[0].exam.code).toBe('CA_125');
    expect(P('tsh')).toMatchObject({ nombre: null });
    expect(P('tsh').candidats[0].exam.code).toBe('TSH');
  });
  it('qualitatif : « vih négatif », « ag hbs + »', () => {
    const p = P('vih négatif');
    expect(p.candidats[0].exam.code).toBe('VIH');
    expect(p.qualitatif).toBe('negatif');
    expect(P('vih positif').qualitatif).toBe('positif');
    expect(P('vih +').qualitatif).toBe('positif');
    expect(parseQualitatif('Indéterminé')).toBe('indetermine');
    expect(parseQualitatif('normal')).toBeNull();
  });
  it('examen inconnu : aucun candidat, mais nom / valeur / unité restent compris (saisie libre)', () => {
    const p = P('zincémie 12 µmol/L');
    expect(p.candidats).toEqual([]);
    expect(p).toMatchObject({ nom: 'zincémie', nombre: { valeur: 12 }, unite: 'µmol/L' });
    expect(P('x').candidats).toEqual([]);
    expect(P('').candidats).toEqual([]);
  });
  it('unité par défaut : dernière unité du médecin, sinon unité de référence', () => {
    const creat = examMesure(ref('CREATININE'));
    expect(defaultUnite(creat, null)).toBe('mg/L');
    expect(defaultUnite(creat, 'µmol/L')).toBe('µmol/L');
    expect(defaultUnite(creat, 'mg/dL')).toBe('mg/L'); // unité inconnue du référentiel : ignorée
    const rows = [
      R('CREATININE', { valeur_num: 100, unite_saisie: 'µmol/L' }),
      R('CREATININE', { valeur_num: 12, unite_saisie: 'mg/L' }),
      R('HBA1C', { valeur_num: 7, unite_saisie: '%' }),
    ];
    const last = lastUnitsBySerie(rows); // les plus récentes d'abord
    expect(last[serieKey(rows[0])]).toBe('µmol/L');
    expect(last[serieKey(rows[2])]).toBe('%');
  });
});

describe('6. résultat à enregistrer', () => {
  const commun = { patient_id: 'p1', org_id: 'o1', doctor_id: 'd1', date_prelevement: '2026-09-12', laboratoire: ' Labo Atlas ' };
  const D = (over: Partial<ResultatDraft>): ResultatDraft => ({
    exam: null, parametre: null, nombre: null, texte: '', unite: null, borneBasse: null, borneHaute: null, anormal: false, ...over,
  });

  it('chiffré : unité canonique, valeur de référence, interprétation d’après les bornes', () => {
    const p = buildResultatPayload(D({ exam: ref('CREATININE'), nombre: { valeur: 106, decimales: 0 }, unite: 'umol/l', borneBasse: 53, borneHaute: 97 }), commun);
    expect(p).toMatchObject({
      examen_code: 'CREATININE', unite_saisie: 'µmol/L', valeur_num: 106, unite_ref: 'mg/L',
      borne_basse: 53, borne_haute: 97, interpretation: 'haut', laboratoire: 'Labo Atlas', valeur_texte: null,
    });
    expect(p.valeur_ref).toBeCloseTo(11.99, 2);
  });
  it('sans bornes : interprétation nulle', () => {
    const p = buildResultatPayload(D({ exam: ref('HBA1C'), nombre: { valeur: 7.2, decimales: 1 }, unite: '%' }), commun);
    expect(p.interpretation).toBeNull();
    expect(p).toMatchObject({ valeur_ref: 7.2, unite_ref: '%' });
  });
  it('NFS : paramètre hémoglobine', () => {
    const p = buildResultatPayload(D({ exam: ref('NFS'), parametre: 'hémoglobine', nombre: { valeur: 135, decimales: 0 }, unite: 'g/L' }), commun);
    expect(p).toMatchObject({ examen_code: 'NFS', parametre: 'hémoglobine', unite_saisie: 'g/L', valeur_ref: 13.5, unite_ref: 'g/dL' });
  });
  it('unité hors référentiel : conservée telle quelle, sans valeur de référence', () => {
    const p = buildResultatPayload(D({ exam: ref('CREATININE'), nombre: { valeur: 1.2, decimales: 1 }, unite: 'mg/dL' }), commun);
    expect(p).toMatchObject({ unite_saisie: 'mg/dL', valeur_ref: null, unite_ref: null });
  });
  it('qualitatif canonique ; compte rendu + case « Anormal »', () => {
    expect(buildResultatPayload(D({ exam: ref('VIH'), texte: 'Positif' }), commun)).toMatchObject({ valeur_texte: 'positif', valeur_num: null, interpretation: null });
    const img = refs.find(r => r.type === 'imagerie')!;
    expect(buildResultatPayload(D({ exam: img, texte: ' Nodule de 12 mm ', anormal: true }), commun)).toMatchObject({ valeur_texte: 'Nodule de 12 mm', interpretation: 'anormal', type: 'imagerie' });
    expect(buildResultatPayload(D({ exam: img, texte: 'Sans particularité' }), commun).interpretation).toBeNull();
    // Texte purement numérique (INR) : enregistré comme valeur chiffrée, sans unité inventée.
    expect(buildResultatPayload(D({ exam: ref('TP_INR'), texte: '2,5' }), commun)).toMatchObject({ valeur_num: 2.5, valeur_texte: null, unite_saisie: null, valeur_ref: null });
  });
  it('saisie hors référentiel et lien avec la ligne de demande', () => {
    const p = buildResultatPayload(D({ libelleLibre: 'Zincémie', nombre: { valeur: 12, decimales: 0 }, unite: 'µmol/L', demandeLigneId: 'l1' }), commun);
    expect(p).toMatchObject({ examen_code: null, libelle: 'Zincémie', unite_saisie: 'µmol/L', valeur_ref: null, demande_ligne_id: 'l1', type: 'biologie' });
  });
  it('erreurs de saisie', () => {
    expect(draftError(D({ exam: ref('TSH') }))).toBe('Valeur manquante');
    expect(draftError(D({ exam: ref('TSH'), nombre: { valeur: 2, decimales: 0 }, borneBasse: 4, borneHaute: 0.4 }))).toMatch(/Borne basse/);
    expect(draftError(D({ nombre: { valeur: 2, decimales: 0 } }))).toMatch(/Nom/);
    expect(draftError(D({ exam: ref('TSH'), nombre: { valeur: 2, decimales: 0 } }))).toBeNull();
  });
});

describe('7. fermeture de la boucle', () => {
  type L = { id: string; statut: LigneStatut; date_realisation: string | null; resultat_id: string | null };
  const lignes: L[] = [
    { id: 'l1', statut: 'en_attente', date_realisation: null, resultat_id: null },
    { id: 'l2', statut: 'en_attente', date_realisation: null, resultat_id: null },
    { id: 'l3', statut: 'annule', date_realisation: null, resultat_id: null },
  ];
  it('lignes proposées à la saisie : ni annulées, ni déjà renseignées', () => {
    expect(lignesASaisir(lignes).map(l => l.id)).toEqual(['l1', 'l2']);
    expect(lignesASaisir([{ ...lignes[0], statut: 'realise' as const }, { ...lignes[1], resultat_id: 'r9' }]).map(l => l.id)).toEqual(['l1']);
  });
  it('un résultat sur deux → ligne « réalisé », demande « partiel »', () => {
    const apres = lignesApresResultats(lignes, [{ ligneId: 'l1', resultatId: 'r1' }], '2026-09-12');
    expect(apres[0]).toEqual({ id: 'l1', statut: 'realise', date_realisation: '2026-09-12', resultat_id: 'r1' });
    expect(apres[1].statut).toBe('en_attente');
    expect(deriveDemandeStatut(apres)).toBe('partiel');
  });
  it('tous les résultats saisis → demande « réalisé » (la ligne annulée ne compte pas)', () => {
    const apres = lignesApresResultats(lignes, [{ ligneId: 'l1', resultatId: 'r1' }, { ligneId: 'l2', resultatId: 'r2' }], '2026-09-12');
    expect(deriveDemandeStatut(apres)).toBe('realise');
    expect(apres[2].statut).toBe('annule');
  });
  it('une ligne annulée ne reçoit jamais de résultat ; aucun résultat → demande inchangée', () => {
    const apres = lignesApresResultats(lignes, [{ ligneId: 'l3', resultatId: 'r3' }], '2026-09-12');
    expect(apres[2]).toEqual(lignes[2]);
    expect(deriveDemandeStatut(apres)).toBe('en_attente');
  });
  it('ligne déjà marquée réalisée sans résultat : le résultat s’y rattache', () => {
    const l: L[] = [{ id: 'l1', statut: 'realise', date_realisation: '2026-09-10', resultat_id: null }];
    expect(lignesApresResultats(l, [{ ligneId: 'l1', resultatId: 'r1' }], '2026-09-09')[0]).toMatchObject({ statut: 'realise', date_realisation: '2026-09-09', resultat_id: 'r1' });
  });
});

describe('8. « à revoir »', () => {
  it('Bas, Haut, Anormal et qualitatif positif → à revoir', () => {
    expect(needsReview(R('HBA1C', { valeur_num: 7.2, unite_saisie: '%', borne_basse: 4, borne_haute: 6 }))).toBe(true);
    expect(needsReview(R('NFS', { valeur_num: 9, unite_saisie: 'g/dL', borne_basse: 12, borne_haute: 16 }))).toBe(true);
    expect(needsReview(R('ECBU', { valeur_texte: 'E. coli 10^6', interpretation: 'anormal' }))).toBe(true);
    expect(needsReview(R('VIH', { valeur_texte: 'positif' }))).toBe(true);
  });
  it('normal, sans bornes, négatif, indéterminé, compte rendu non coché → pas à revoir', () => {
    expect(needsReview(R('HBA1C', { valeur_num: 5.5, unite_saisie: '%', borne_basse: 4, borne_haute: 6 }))).toBe(false);
    expect(needsReview(R('HBA1C', { valeur_num: 14, unite_saisie: '%' }))).toBe(false); // sans bornes : non calculable
    expect(needsReview(R('VIH', { valeur_texte: 'negatif' }))).toBe(false);
    expect(needsReview(R('VIH', { valeur_texte: 'indetermine' }))).toBe(false);
    expect(needsReview(R('ECBU', { valeur_texte: 'Stérile' }))).toBe(false);
  });
  it('« non vu » jusqu’au marquage ; un résultat archivé sort de la liste', () => {
    const a = R('HBA1C', { valeur_num: 7.2, unite_saisie: '%', borne_basse: 4, borne_haute: 6, date_prelevement: '2026-09-01' });
    const b = R('VIH', { valeur_texte: 'positif', date_prelevement: '2026-09-20' });
    const vu = { ...a, id: 'vu', vu_le: '2026-09-13T08:00:00Z', vu_par_doctor_id: 'd1' };
    const arch = { ...b, id: 'arch', archive: true };
    expect(isNonVu(a)).toBe(true);
    expect(isNonVu(vu)).toBe(false);
    expect(isNonVu(arch)).toBe(false);
    expect(resultatsARevoir([a, vu, arch, b]).map(r => r.id)).toEqual([b.id, a.id]); // plus récent d'abord
  });
});

describe('9. suivi : séries, tendance, derniers bilans, courbe, récapitulatif', () => {
  const h1 = R('HBA1C', { valeur_num: 8.1, unite_saisie: '%', date_prelevement: '2026-03-10' });
  const h2 = R('HBA1C', { valeur_num: 7.2, unite_saisie: '%', date_prelevement: '2026-09-12', borne_basse: 4, borne_haute: 6 });
  const h3 = R('HBA1C', { valeur_num: 9.9, unite_saisie: '%', date_prelevement: '2026-09-13', archive: true, archive_motif: 'erreur de patient' });
  const c1 = R('CREATININE', { valeur_num: 106, unite_saisie: 'µmol/L', date_prelevement: '2026-03-10' });
  const c2 = R('CREATININE', { valeur_num: 12, unite_saisie: 'mg/L', date_prelevement: '2026-09-12' });
  const hb = R('NFS', { valeur_num: 13.5, unite_saisie: 'g/dL', date_prelevement: '2026-09-12' });
  const vih = R('VIH', { valeur_texte: 'negatif', date_prelevement: '2026-01-05' });
  const echo = R(refs.find(r => r.type === 'imagerie')!.code, { valeur_texte: 'Foie de taille normale, contours réguliers, pas de lésion focale visible.', date_prelevement: '2026-09-15' });
  const zinc = R(null, { libelle: 'Zincémie', valeur_num: 12, unite_saisie: 'µmol/L', date_prelevement: '2026-09-12' });
  const all = [h1, h2, h3, c1, c2, hb, vih, echo, zinc];
  const series = buildSeries(all, refs);
  const S = (code: string | null) => series.find(s => s.examCode === code)!;

  it('une série par examen ; les archivés restent visibles dans l’historique seulement', () => {
    expect(series).toHaveLength(6);
    const s = S('HBA1C');
    expect(s.label).toBe('HbA1c');
    expect(s.points.map(p => p.id)).toEqual([h2.id, h1.id]);
    expect(s.dernier.id).toBe(h2.id);
    expect(s.precedent?.id).toBe(h1.id);
    expect(s.archives.map(p => p.id)).toEqual([h3.id]);
    expect(S('NFS').label).toBe('Hémoglobine');
    expect(S(null).label).toBe('Zincémie');
    expect(S(null).categorie).toBe('Autres');
    expect(shortLabel('HbA1c (hémoglobine glyquée)')).toBe('HbA1c');
  });
  it('série entièrement archivée : absente du tableau', () => {
    expect(buildSeries([{ ...h1, archive: true }], refs)).toEqual([]);
  });
  it('tendance comparée dans l’unité de référence', () => {
    expect(S('HBA1C').tendance).toBe('baisse');
    // 106 µmol/L puis 12 mg/L : même valeur à l'arrondi d'affichage → stable.
    expect(S('CREATININE').tendance).toBe('stable');
    expect(S('NFS').tendance).toBeNull(); // un seul résultat
    expect(tendance(R('TSH', { valeur_num: 4, unite_saisie: 'mUI/L' }), R('TSH', { valeur_num: 2, unite_saisie: 'mUI/L' }))).toBe('hausse');
    // Unités non comparables : pas de flèche.
    expect(tendance(R('CREATININE', { valeur_num: 1.2, unite_saisie: 'mg/dL' }), c2)).toBeNull();
    expect(tendance(vih, vih)).toBeNull();
  });
  it('catégories dans l’ordre du référentiel', () => {
    const cats = categoriesOf(series);
    expect(cats[0]).toBe('Hématologie');
    expect(cats).toContain('Glycémie');
    expect(cats).toContain('Bilan rénal');
    expect(cats[cats.length - 1]).toBe('Autres');
  });
  it('valeur affichée', () => {
    expect(valeurAffichee(h2)).toBe('7,2 %');
    expect(valeurAffichee(vih)).toBe('Négatif');
    expect(valeurAffichee(echo, 20)).toBe('Foie de taille norm…');
    expect(valeurAffichee(R('TP_INR', { valeur_num: 2.5 }))).toBe('2,5');
  });
  it('Vérificateur : 5 au maximum, examens liés aux pathologies d’abord, sans compte rendu', () => {
    const diab = derniersBilans(series, ['Diabète de type 2']);
    expect(diab[0]).toMatchObject({ label: 'HbA1c', valeur: '7,2 %', date: '2026-09-12' });
    expect(diab.length).toBeLessThanOrEqual(5);
    expect(diab.some(d => /Foie/.test(d.valeur))).toBe(false);
    expect(derniersBilansLine(diab.slice(0, 2))).toMatch(/^HbA1c 7,2 % \(12\/09\) · /);
    const renal = derniersBilans(series, ['Insuffisance rénale chronique']);
    expect(renal[0]).toMatchObject({ label: 'Créatinine', valeur: '12 mg/L' });
    expect(derniersBilans(series, [], 2)).toHaveLength(2);
    expect(derniersBilans([], ['Diabète'])).toEqual([]);
  });
  it('courbe : unité au choix, ordre chronologique, bande des bornes du labo', () => {
    const s = S('HBA1C'), m = examMesure(ref('HBA1C'));
    expect(unitesCourbe(s, m)).toEqual(['%', 'mmol/mol']);
    const pct = chartSerie(s, m, '%');
    expect(pct.points.map(p => p.valeur)).toEqual([8.1, 7.2]);
    expect(pct.points[0].t).toBeLessThan(pct.points[1].t);
    expect(pct.bande).toEqual({ basse: 4, haute: 6 });
    const ifcc = chartSerie(s, m, 'mmol/mol');
    expect(ifcc.points[1].valeur).toBeCloseTo(55.2, 1);
    expect(ifcc.bande!.basse).toBeCloseTo(20.2, 1);
    expect(ifcc.bande!.haute).toBeCloseTo(42.1, 1);
    // Saisies dans deux unités différentes : une seule courbe cohérente.
    const cr = chartSerie(S('CREATININE'), examMesure(ref('CREATININE')), 'mg/L');
    expect(cr.points.map(p => formatNombre(p.valeur, 1))).toEqual(['12', '12']);
    expect(cr.bande).toBeNull(); // pas de bornes saisies : pas de bande
  });
  it('courbe : un résultat en unité hors référentiel n’est tracé que dans son unité', () => {
    const horsRef = R('CREATININE', { valeur_num: 1.2, unite_saisie: 'mg/dL', date_prelevement: '2026-10-01' });
    const s = buildSeries([c2, horsRef], refs)[0], m = examMesure(ref('CREATININE'));
    expect(chartSerie(s, m, 'mg/L').points).toHaveLength(1);
    expect(chartSerie(s, m, 'mg/dL').points.map(p => p.valeur)).toEqual([1.2]);
    const z = S(null);
    expect(unitesCourbe(z, examMesure(null))).toEqual(['µmol/L']);
    expect(chartSerie(z, examMesure(null), 'µmol/L').points).toHaveLength(1);
  });
  it('récapitulatif PDF : dernier résultat par examen, bornes ou « — »', () => {
    const recap = buildRecap(series);
    const gly = recap.find(g => g.categorie === 'Glycémie')!;
    expect(gly.rows[0]).toEqual({ examen: 'HbA1c', valeur: '7,2 %', bornes: '4 – 6', interpretation: 'Haut', date: '2026-09-12', precedent: '8,1 % (10/03)' });
    const renal = recap.find(g => g.categorie === 'Bilan rénal')!;
    expect(renal.rows[0]).toMatchObject({ examen: 'Créatinine', bornes: '—', interpretation: '' });
  });
});

describe('10. champ de saisie → brouillon', () => {
  it('champ vide : ni brouillon ni erreur ; valeur ou borne illisible : erreur explicite', () => {
    expect(fieldToDraft(emptyField('%'), ref('HBA1C'), null)).toEqual({ draft: null, error: null });
    expect(fieldToDraft({ ...emptyField('%'), valeur: '7,2x' }, ref('HBA1C'), null).error).toMatch(/Valeur illisible/);
    expect(fieldToDraft({ ...emptyField('%'), valeur: '7,2', basse: 'a' }, ref('HBA1C'), null).error).toMatch(/Borne illisible/);
    expect(fieldToDraft({ ...emptyField('%'), valeur: '7,2', basse: '6', haute: '4' }, ref('HBA1C'), null).error).toMatch(/Borne basse/);
  });
  it('chiffré avec bornes, qualitatif, compte rendu', () => {
    const n = fieldToDraft({ ...emptyField('%'), valeur: '7,2', basse: '4', haute: '6,0' }, ref('HBA1C'), null, { demandeLigneId: 'l1' });
    expect(n.error).toBeNull();
    expect(n.draft).toMatchObject({ nombre: { valeur: 7.2, decimales: 1 }, unite: '%', borneBasse: 4, borneHaute: 6, demandeLigneId: 'l1', anormal: false });
    expect(fieldToDraft({ ...emptyField(), texte: 'positif', anormal: true }, ref('VIH'), null).draft).toMatchObject({ texte: 'positif', nombre: null, anormal: false });
    expect(fieldToDraft({ ...emptyField(), texte: 'Nodule', anormal: true }, refs.find(r => r.type === 'imagerie')!, null).draft).toMatchObject({ texte: 'Nodule', anormal: true });
    expect(fieldToDraft({ ...emptyField('µmol/L'), valeur: '12' }, null, null, { libelleLibre: 'Zincémie' }).draft).toMatchObject({ nombre: { valeur: 12 }, unite: 'µmol/L' });
    expect(fieldToDraft({ ...emptyField(), texte: 'RAS' }, null, null, { libelleLibre: 'Frottis' }).draft).toMatchObject({ texte: 'RAS', nombre: null });
  });
});
