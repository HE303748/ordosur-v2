import { describe, it, expect } from 'vitest';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ExamRef } from './examSearch';
import { deriveDemandeStatut, type LigneStatut } from './examRequest';
import {
  parseSaisieLibre, quickEntryState, ajouteLabel, restoreTextOnFailure, buildResultatPayload, fieldToDraft, emptyField, examMesure, toRef,
  findLigneARattacher, ligneSuiviLabel, lignesApresResultats, lignesApresArchivage, buildSeries, chartSerie, chartRows, derniersBilans, serieKey,
  type ResultatExamen,
} from './resultatsLogic';
import { latestCreatinine, renalStatus, type CreatinineResult } from './renalEngine';
import { patientSearchInput, homeAlertLabel } from './uiLabels';
import { patientFieldLabel } from './safetyGuards';
// @ts-expect-error module .mjs des scripts (pas de types)
import { writeNewMigration } from '../../scripts/lib/migrationGuard.mjs';
import data from './examens_reference.data.json';

// Sprint 6A-bis — Fiabilité de la saisie des résultats (constats du test en production).

const refs = data.examens as ExamRef[];
const ref = (c: string) => refs.find(r => r.code === c)!;
const P = (s: string, pathologies: string[] = []) => parseSaisieLibre(s, refs, { pathologies });
const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

let seq = 0;
const R = (code: string, valeur: number, unite: string, over: Partial<ResultatExamen> = {}): ResultatExamen => {
  seq += 1;
  const e = ref(code);
  const t = toRef(valeur, unite, examMesure(e));
  return {
    id: `r${seq}`, patient_id: 'p1', org_id: 'o1', doctor_id: 'd1', examen_code: code, libelle: e.libelle, parametre: null, type: e.type, categorie: e.categorie,
    demande_ligne_id: null, date_prelevement: '2026-10-09', valeur_num: valeur, valeur_texte: null, unite_saisie: unite,
    valeur_ref: t?.valeur_ref ?? null, unite_ref: t?.unite_ref ?? null, borne_basse: null, borne_haute: null, interpretation: null, a_revoir: false,
    laboratoire: null, commentaire: null, vu_le: null, vu_par_doctor_id: null, vu_commentaire: null,
    archive: false, archive_motif: null, archive_par_doctor_id: null, archive_le: null, created_at: '2026-10-09T20:53:01Z', ...over,
  };
};

describe('1. caractères perdus → plus jamais de faux examen', () => {
  it('une saisie « créat … » est toujours reconnue comme créatinine', () => {
    for (const s of ['créat 106', 'creat 106', 'Créat 106', 'CRÉAT 106', 'créat 12', 'créat 12 mg/l', 'créat 106 µmol/l', 'creat: 1,2 mg/dl', 'créatinine 106', '  créat   106  ']) {
      const st = quickEntryState(P(s));
      expect(st.etat, s).toBe('pret');
      expect(st.candidat?.exam.code, s).toBe('CREATININE');
      expect(st.libre, s).toBe(false);
    }
  });
  it('nom tronqué (« éat 106 », le cas observé) : NON RECONNU — ni créatinine devinée, ni examen libre créé', () => {
    for (const s of ['éat 106', 'at 106', 'réat 106', 'ét 106', 'xyzq 12', 'zincémie 12 µmol/L']) {
      const p = P(s);
      const st = quickEntryState(p);
      expect(st.etat, s).toBe('non_reconnu');
      expect(st.candidat, s).toBeNull();
      expect(st.libre, s).toBe(false);
    }
  });
  it('toutes les troncatures de « créat 106 » : jamais « prêt » sur un autre examen que la créatinine', () => {
    for (const debut of ['créat', 'réat', 'éat', 'at', 't', 'cré', 'cr', 'c', 'ré', 'éa']) {
      const st = quickEntryState(P(`${debut} 106`));
      if (st.etat === 'pret') expect(st.candidat?.exam.code, debut).toBe('CREATININE');
      else expect(['non_reconnu', 'ambigu', 'vide'], debut).toContain(st.etat);
      expect(st.libre, debut).toBe(false);
    }
    // « ét » était le préfixe de « ETT » (échocardiographie) : une valeur chiffrée ne vise que la biologie.
    expect(P('ét 106').candidats).toEqual([]);
    // « cr » : créatinine ou CRP — proposés, jamais choisis à la place du médecin.
    const cr = P('cr 12');
    expect(cr.ambigu).toBe(true);
    expect(cr.candidats.map(c => c.exam.code).sort()).toEqual(['CREATININE', 'CRP']);
    expect(quickEntryState(cr).etat).toBe('ambigu');
  });
  it('nom de 2 lettres : seul un sigle exact est retenu d’office (« vs 12 », « tp »), un simple préfixe demande confirmation', () => {
    expect(quickEntryState(P('vs 12'))).toMatchObject({ etat: 'pret' });
    expect(quickEntryState(P('vs 12')).candidat?.exam.code).toBe('VS');
    const et = P('et'); // préfixe de « ETT », sans valeur
    expect(et.candidats.map(c => c.exam.code)).toEqual(['ECHOCARDIOGRAPHIE']);
    expect(et.ambigu).toBe(true); // un seul candidat, mais choix explicite exigé
    expect(quickEntryState(et).etat).toBe('ambigu');
    expect(quickEntryState(et, { choice: 0 }).etat).toBe('pret');
  });
  it('examen libre : uniquement après confirmation explicite ; ou examen choisi dans la liste', () => {
    const p = P('éat 106');
    expect(quickEntryState(p, { libreConfirme: false }).etat).toBe('non_reconnu');
    expect(quickEntryState(p, { libreConfirme: true })).toEqual({ etat: 'pret', candidat: null, libre: true });
    const forced = { exam: ref('CREATININE'), parametre: null, label: 'Créatinine' };
    const st = quickEntryState(p, { forced });
    expect(st).toMatchObject({ etat: 'pret', libre: false });
    expect(st.candidat?.exam.code).toBe('CREATININE');
    // La valeur tapée est conservée pour l'examen choisi.
    expect(p.nombre?.valeur).toBe(106);
  });
  it('ambiguïté : toujours un choix explicite ; saisie vide : rien', () => {
    expect(quickEntryState(P('hb 13,5')).etat).toBe('ambigu');
    expect(quickEntryState(P('hb 13,5'), { choice: 0 }).etat).toBe('pret');
    expect(quickEntryState(P('')).etat).toBe('vide');
    expect(quickEntryState(P('c')).etat).toBe('vide');
  });
  it('le message « Ajouté » est construit à partir de la ligne enregistrée (même chaîne)', () => {
    const commun = { patient_id: 'p', org_id: 'o', doctor_id: 'd', date_prelevement: '2026-10-09' };
    const d1 = fieldToDraft({ ...emptyField('µmol/L'), valeur: '106' }, ref('CREATININE'), null).draft!;
    const p1 = buildResultatPayload(d1, commun);
    expect(ajouteLabel(p1, ref('CREATININE'))).toBe('Créatinine 106 µmol/L');
    const d2 = fieldToDraft({ ...emptyField(null), valeur: '106' }, null, null, { libelleLibre: 'Éat' }).draft!;
    const p2 = buildResultatPayload(d2, commun);
    expect(p2.libelle).toBe('Éat');
    expect(ajouteLabel(p2, null)).toBe('Éat 106'); // le libellé enregistré, tel quel — jamais « Ét »
    expect(ajouteLabel(p2, null).startsWith(p2.libelle)).toBe(true);
  });
  it('échec en arrière-plan : le texte n’est rendu que si le champ est vide — une frappe en cours n’est jamais écrasée', () => {
    expect(restoreTextOnFailure('', 'hba1c 7,2')).toBe('hba1c 7,2');
    expect(restoreTextOnFailure('  ', 'hba1c 7,2')).toBe('hba1c 7,2');
    expect(restoreTextOnFailure('cr', 'hba1c 7,2')).toBe('cr');
    expect(restoreTextOnFailure('créat 106', 'hba1c 7,2')).toBe('créat 106');
  });
  it('composant : champ jamais désactivé, vidé AVANT tout appel réseau, aucun vidage après un await', () => {
    const src = SRC('../components/bilans/QuickResultInput.tsx');
    const debut = src.indexOf('<input ref={mainRef} id="bilan-saisie-rapide"');
    const main = src.slice(debut, src.indexOf('/>', debut));
    expect(debut).toBeGreaterThan(-1);
    expect(main).not.toContain('disabled='); // le champ principal n'a pas d'attribut disabled
    expect(src).not.toContain('disabled={saving}');
    const submit = src.slice(src.indexOf('const submit = ('), src.indexOf('const onMainKey'));
    const clear = submit.indexOf("setText('')");
    const net = submit.indexOf('await saveResultats');
    expect(clear).toBeGreaterThan(-1);
    expect(net).toBeGreaterThan(clear); // vidage puis réseau
    expect(submit.slice(net)).not.toContain("setText('')"); // jamais de reset après l'await
    expect(submit.slice(net)).toContain('restoreTextOnFailure');
    expect(submit).toContain('mainRef.current?.focus');
    expect(submit.indexOf('mainRef.current?.focus')).toBeLessThan(net);
    // Le nom non reconnu passe par la confirmation, et la fonction pure décide.
    expect(src).toContain('quickEntryState(parsed');
    expect(src).toContain('Créer un examen libre');
    expect(src).toContain('Choisir dans la liste');
  });
});

describe('2. rattachement à une demande en attente', () => {
  const L = (id: string, code: string | null, statut: LigneStatut, resultat_id: string | null = null, libelle = code ?? 'Libre') =>
    ({ id, examen_code: code, libelle, statut, resultat_id });
  const demandes = [
    { id: 'd2', numero: 'DEM-2', date_demande: '2026-10-09', statut: 'partiel', lignes: [L('l3', 'CREATININE', 'en_attente'), L('l4', 'DFG', 'realise', 'r9')] },
    { id: 'd1', numero: 'DEM-1', date_demande: '2026-09-01', statut: 'realise', lignes: [L('l1', 'CREATININE', 'realise'), L('l2', 'HBA1C', 'annule')] },
    { id: 'd0', numero: 'DEM-0', date_demande: '2026-08-01', statut: 'annule', lignes: [L('l0', 'CREATININE', 'annule'), L('l00', 'TSH', 'en_attente')] },
  ];
  it('même examen dans une demande en attente → proposé (ligne en attente d’abord)', () => {
    expect(findLigneARattacher(demandes, { examCode: 'CREATININE', libelle: 'Créatinine' })).toMatchObject({ ligneId: 'l3', demandeId: 'd2', dateDemande: '2026-10-09', statut: 'en_attente' });
  });
  it('ligne déjà prise par un enregistrement en cours → la suivante (marquée réalisée à la main, sans résultat)', () => {
    expect(findLigneARattacher(demandes, { examCode: 'CREATININE', libelle: '' }, new Set(['l3']))).toMatchObject({ ligneId: 'l1', statut: 'realise' });
    expect(findLigneARattacher(demandes, { examCode: 'CREATININE', libelle: '' }, new Set(['l3', 'l1']))).toBeNull();
  });
  it('jamais : ligne annulée, ligne ayant déjà un résultat, demande annulée, autre examen', () => {
    expect(findLigneARattacher(demandes, { examCode: 'HBA1C', libelle: '' })).toBeNull();   // annulée
    expect(findLigneARattacher(demandes, { examCode: 'DFG', libelle: '' })).toBeNull();     // a déjà un résultat
    expect(findLigneARattacher(demandes, { examCode: 'TSH', libelle: '' })).toBeNull();     // demande annulée
    expect(findLigneARattacher(demandes, { examCode: 'NFS', libelle: '' })).toBeNull();
    expect(findLigneARattacher([], { examCode: 'CREATININE', libelle: '' })).toBeNull();
  });
  it('examen hors référentiel : rattaché par libellé (sans accents ni casse), jamais à un examen codé', () => {
    const d = [{ id: 'd', numero: 'N', date_demande: '2026-10-01', statut: 'en_attente', lignes: [L('lz', null, 'en_attente', null, 'Zincémie'), L('lc', 'CREATININE', 'en_attente')] }];
    expect(findLigneARattacher(d, { examCode: null, libelle: 'zincemie' })?.ligneId).toBe('lz');
    expect(findLigneARattacher(d, { examCode: null, libelle: 'Créatinine' })).toBeNull();
  });
  it('« oui » : la ligne passe à « réalisé » avec le résultat lié ; « non » : elle ne bouge pas', () => {
    type Li = { id: string; statut: LigneStatut; date_realisation: string | null; resultat_id: string | null };
    const lignes: Li[] = [
      { id: 'l3', statut: 'en_attente', date_realisation: null, resultat_id: null },
      { id: 'l5', statut: 'en_attente', date_realisation: null, resultat_id: null },
    ];
    const oui = lignesApresResultats(lignes, [{ ligneId: 'l3', resultatId: 'r1' }], '2026-10-09');
    expect(oui[0]).toEqual({ id: 'l3', statut: 'realise', date_realisation: '2026-10-09', resultat_id: 'r1' });
    expect(deriveDemandeStatut(oui)).toBe('partiel');
    const non = lignesApresResultats(lignes, [], '2026-10-09'); // résultat enregistré sans demande_ligne_id
    expect(non).toEqual(lignes);
    expect(deriveDemandeStatut(non)).toBe('en_attente');
  });
  it('le résultat non rattaché n’a pas de demande_ligne_id ; rattaché, il porte celui de la ligne', () => {
    const commun = { patient_id: 'p', org_id: 'o', doctor_id: 'd', date_prelevement: '2026-10-09' };
    const draft = fieldToDraft({ ...emptyField('mg/L'), valeur: '12' }, ref('CREATININE'), null).draft!;
    expect(buildResultatPayload({ ...draft, demandeLigneId: null }, commun).demande_ligne_id).toBeNull();
    expect(buildResultatPayload({ ...draft, demandeLigneId: 'l3' }, commun).demande_ligne_id).toBe('l3');
  });
  it('résultat archivé sans remplacement : la ligne revient « en attente » (jamais « réalisé » sans action explicite)', () => {
    type Li = { id: string; statut: LigneStatut; date_realisation: string | null; resultat_id: string | null };
    const lignes: Li[] = [
      { id: 'l3', statut: 'realise', date_realisation: '2026-10-09', resultat_id: 'r1' },
      { id: 'l4', statut: 'realise', date_realisation: '2026-10-09', resultat_id: 'r2' },
      { id: 'l5', statut: 'realise', date_realisation: '2026-10-08', resultat_id: null }, // marquée à la main
    ];
    const apres = lignesApresArchivage(lignes, 'r1');
    expect(apres[0]).toEqual({ id: 'l3', statut: 'en_attente', date_realisation: null, resultat_id: null });
    expect(apres[1]).toEqual(lignes[1]);
    expect(apres[2]).toEqual(lignes[2]);
    expect(deriveDemandeStatut(apres)).toBe('partiel');
  });
  it('« résultat à saisir » : uniquement une ligne marquée réalisée à la main, sans résultat', () => {
    expect(ligneSuiviLabel({ statut: 'en_attente', date_realisation: null, resultat_id: null })).toBe('En attente de résultat');
    expect(ligneSuiviLabel({ statut: 'realise', date_realisation: '2026-10-09', resultat_id: 'r1' })).toBe('Réalisé le 09/10/2026 — résultat saisi');
    expect(ligneSuiviLabel({ statut: 'realise', date_realisation: '2026-10-09', resultat_id: null })).toBe('Réalisé le 09/10/2026 — résultat à saisir');
    expect(ligneSuiviLabel({ statut: 'annule', date_realisation: null, resultat_id: null })).toBe('Annulé');
    for (const l of [
      { statut: 'en_attente' as const, date_realisation: null, resultat_id: null },
      { statut: 'realise' as const, date_realisation: '2026-10-09', resultat_id: 'r1' },
      { statut: 'annule' as const, date_realisation: null, resultat_id: null },
    ]) expect(ligneSuiviLabel(l)).not.toContain('à saisir');
  });
  it('voies qui passent une ligne à « réalisé » dans le code : « Marquer réalisé » (2 fonctions) et rien d’autre', () => {
    const api = SRC('./examensApi.ts');
    // setLigneStatut (un examen) et markDemandeRealisee (toute la demande) : actions volontaires du médecin.
    expect(api.match(/statut: 'realise'/g)?.length).toBe(1);
    expect(api).toContain("if (statut === 'realise') patch.date_realisation");
    // La couche d'accès aux résultats n'écrit jamais dans les lignes de demande.
    const res = SRC('./resultatsApi.ts');
    expect(res).not.toContain('demande_examen_lignes');
    expect(SRC('../components/bilans/QuickResultInput.tsx')).not.toMatch(/setLigneStatut|markDemandeRealisee/);
    // En base : seul un résultat RATTACHÉ (demande_ligne_id) réalise sa ligne ; son archivage la rend en attente.
    const sql6a = SRC('../../supabase/migrations/20261017120000_resultats_examens.sql');
    expect(sql6a).toMatch(/if new\.demande_ligne_id is not null then\s+update demande_examen_lignes\s+set statut = 'realise'/);
    const sqlBis = SRC('../../supabase/migrations/20261019120000_resultat_archive_ligne_en_attente.sql');
    expect(sqlBis).toMatch(/set resultat_id = null, statut = 'en_attente'/);
  });
});

describe('3. courbes : tous les points', () => {
  const a = R('HBA1C', 7.2, '%', { created_at: '2026-10-09T20:53:01Z', laboratoire: 'Labo Atlas' });
  const b = R('HBA1C', 6.8, '%', { created_at: '2026-10-09T20:58:06Z' });
  const old = R('HBA1C', 8.1, '%', { date_prelevement: '2026-06-01', created_at: '2026-06-02T09:00:00Z' });
  const serie = buildSeries([b, a, old], refs).find(s => s.examCode === 'HBA1C')!;
  const cs = chartSerie(serie, examMesure(ref('HBA1C')), '%');

  it('deux valeurs à la même date = deux points (cas observé : HbA1c 7,2 puis 6,8 le 09/10)', () => {
    expect(cs.points.map(p => p.valeur)).toEqual([8.1, 7.2, 6.8]);
    expect(cs.points.filter(p => p.date === '2026-10-09')).toHaveLength(2);
  });
  it('axe du temps réel : positions strictement croissantes, ordre de saisie à date égale, même jour civil', () => {
    const [p0, p1, p2] = cs.points;
    expect(p0.t).toBeLessThan(p1.t);
    expect(p1.t).toBeLessThan(p2.t);
    expect(p1.id).toBe(a.id); // 7,2 saisi à 20:53 avant 6,8 saisi à 20:58
    expect(p2.id).toBe(b.id);
    expect(new Date(p1.t).toISOString().slice(0, 10)).toBe('2026-10-09');
    expect(new Date(p2.t).toISOString().slice(0, 10)).toBe('2026-10-09');
    expect(new Set(cs.points.map(p => p.t)).size).toBe(3);
  });
  it('lignes du graphique : une par résultat, aucune fusion — y compris avec un second examen aux mêmes dates', () => {
    const g1 = R('GLYCEMIE_JEUN', 1.45, 'g/L', { created_at: '2026-10-09T20:55:35Z' });
    const g2 = R('GLYCEMIE_JEUN', 1.1, 'g/L', { created_at: '2026-10-09T21:00:00Z' });
    const s2 = buildSeries([g1, g2], refs)[0];
    const sec = chartSerie(s2, examMesure(ref('GLYCEMIE_JEUN')), 'g/L');
    const rows = chartRows(cs, sec);
    expect(rows).toHaveLength(5);
    expect(rows.filter(r => r.serie === 'a').map(r => r.a)).toEqual([8.1, 7.2, 6.8]);
    expect(rows.filter(r => r.serie === 'b').map(r => r.b)).toEqual([1.45, 1.1]);
    expect(new Set(rows.map(r => r.key)).size).toBe(5);
    expect(rows.every(r => (r.serie === 'a') === (r.a !== undefined) && (r.serie === 'b') === (r.b !== undefined))).toBe(true);
    expect(chartRows(cs)).toHaveLength(3);
  });
  it('infobulle : valeur, date et laboratoire portés par chaque point', () => {
    const row = chartRows(cs).find(r => r.id === a.id)!;
    expect(row).toMatchObject({ a: 7.2, date: '2026-10-09', laboratoire: 'Labo Atlas' });
    expect(chartRows(cs).find(r => r.id === b.id)!.laboratoire).toBeNull();
  });
  it('dix résultats le même jour : dix points distincts, tous dans la journée', () => {
    const many = Array.from({ length: 10 }, (_, i) => R('TSH', i + 1, 'mUI/L', { created_at: `2026-10-09T10:${String(i).padStart(2, '0')}:00Z` }));
    const pts = chartSerie(buildSeries(many, refs)[0], examMesure(ref('TSH')), 'mUI/L').points;
    expect(pts.map(p => p.valeur)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(pts.map(p => p.t)).size).toBe(10);
    expect(pts.every(p => new Date(p.t).toISOString().slice(0, 10) === '2026-10-09')).toBe(true);
    const beaucoup = Array.from({ length: 40 }, (_, i) => R('TSH', i + 1, 'mUI/L', { created_at: `2026-10-09T10:00:${String(i).padStart(2, '0')}Z` }));
    const pts40 = chartSerie(buildSeries(beaucoup, refs)[0], examMesure(ref('TSH')), 'mUI/L').points;
    expect(new Set(pts40.map(p => p.t)).size).toBe(40);
    expect(pts40.every(p => new Date(p.t).toISOString().slice(0, 10) === '2026-10-09')).toBe(true);
  });
  it('tableau : la « dernière valeur » est la plus récemment saisie à date égale', () => {
    expect(serie.dernier.id).toBe(b.id);
    expect(serie.precedent?.id).toBe(a.id);
    expect(serie.tendance).toBe('baisse');
  });
});

describe('3 bis. moteur rénal : créatinine la plus récente (date de prélèvement PUIS horodatage de saisie)', () => {
  const C = (id: string, valeur: number, date: string, created_at: string): CreatinineResult => ({ id, valeur_num: valeur, unite_saisie: 'mg/L', date_prelevement: date, created_at });
  // Cas de la production : 12 mg/L (20:53:36) puis 10 mg/L (20:57:26), même date de prélèvement.
  const rows = [
    C('c12', 12, '2026-10-09', '2026-10-09T20:53:36Z'),
    C('c10', 10, '2026-10-09', '2026-10-09T20:57:26Z'),
    C('vieux', 30, '2026-09-01', '2026-10-09T21:30:00Z'), // saisi après, mais prélevé avant
  ];
  it('même date : la dernière saisie l’emporte, quel que soit l’ordre de lecture', () => {
    expect(latestCreatinine(rows)?.id).toBe('c10');
    expect(latestCreatinine([...rows].reverse())?.id).toBe('c10');
    expect(latestCreatinine([rows[2], rows[1], rows[0]])?.id).toBe('c10');
  });
  it('la date de prélèvement prime sur l’horodatage de saisie', () => {
    expect(latestCreatinine([rows[2], rows[0]])?.id).toBe('c12');
  });
  it('le DFG est calculé sur cette créatinine', () => {
    const s = renalStatus({
      dateNaissance: '1956-03-01', sexe: 'M', poidsKg: null, poidsDate: null, pathologies: [], creatinines: rows,
      creatRef: ref('CREATININE'), today: new Date(2026, 9, 9),
    });
    expect(s.creat).toMatchObject({ id: 'c10', valeur: 10 });
    expect(s.dfg).toBe(81);
  });
  it('le chargeur du moteur lit dans le même ordre (date puis horodatage), sans cache', () => {
    const src = SRC('../hooks/useRenal.ts');
    expect(src).toMatch(/\.order\('date_prelevement', \{ ascending: false \}\)\.order\('created_at', \{ ascending: false \}\)/);
    expect(src).not.toMatch(/import[^;]*viewCache/);
    expect(src).not.toContain('viewCache.');
  });
});

describe('4. finitions', () => {
  it('« Derniers bilans » : interprétation jointe (badge Haut / Bas / Anormal)', () => {
    const haut = R('HBA1C', 7.2, '%', { borne_basse: 4, borne_haute: 6, interpretation: 'haut' });
    const sans = R('CREATININE', 12, 'mg/L');
    const items = derniersBilans(buildSeries([haut, sans], refs), ['Diabète de type 2']);
    expect(items.find(i => i.label === 'HbA1c')).toMatchObject({ valeur: '7,2 %', interpretation: 'haut' });
    expect(items.find(i => i.label === 'Créatinine')?.interpretation).toBeNull();
    const src = SRC('../components/bilans/BilanWidgets.tsx');
    expect(src).toContain("i.interpretation && i.interpretation !== 'normal' && <InterpretationBadge");
  });
  it('champ patient prérempli : jamais concaténé (« Walid IdrissiWalid Idrissi »)', () => {
    const label = patientFieldLabel({ prenom: 'Walid', nom: 'Idrissi' });
    expect(label).toBe('Walid Idrissi');
    expect(patientSearchInput('Walid IdrissiW', label)).toBe('W');
    expect(patientSearchInput('Walid IdrissiWalid Idrissi', label)).toBe('Walid Idrissi');
    expect(patientSearchInput('Walid Idrissi Fatima', label)).toBe('Fatima');
    // Frappes normales : inchangées.
    expect(patientSearchInput('Walid Idrissi', label)).toBe('Walid Idrissi');
    expect(patientSearchInput('Walid Idr', label)).toBe('Walid Idr');
    expect(patientSearchInput('Fat', label)).toBe('Fat');
    expect(patientSearchInput('', label)).toBe('');
    expect(patientSearchInput('Walid', '')).toBe('Walid'); // aucun patient sélectionné
    const src = SRC('../pages/DoctorDashboard.tsx');
    expect(src).toContain('patientSearchInput(e.target.value, patientFieldLabel(selectedPatient))');
    expect(src).toContain('e.currentTarget.select()');
    // Sprint 4f : le champ reste réaligné sur le patient sélectionné (source unique).
    expect(src).toContain('setPatientSearchTerm(patientFieldLabel(selectedPatient));');
    expect(src).toContain('setPatientSearchTerm(patientFieldLabel(selectedPatientRef.current));');
  });
  it('« Dernières alertes » : jamais de « null », un seul médicament pour une alerte patient', () => {
    expect(homeAlertLabel({ medicament_a: 'AUGMENTIN 1 G / 125 MG', medicament_b: null, source: 'allergie' })).toBe('AUGMENTIN 1 G / 125 MG — allergie');
    expect(homeAlertLabel({ medicament_a: 'Brufen', medicament_b: null, source: 'antecedent' })).toBe('Brufen — antécédent');
    expect(homeAlertLabel({ medicament_a: 'Glucophage', medicament_b: null, source: 'renal' })).toBe('Glucophage — fonction rénale');
    expect(homeAlertLabel({ medicament_a: 'Depakine', medicament_b: 'Depakine', source: 'grossesse' })).toBe('Depakine — grossesse / allaitement');
    expect(homeAlertLabel({ medicament_a: 'Kardegic', medicament_b: 'Aspégic', source: 'doublon' })).toBe('Kardegic + Aspégic — doublon');
    expect(homeAlertLabel({ medicament_a: 'Sintrom', medicament_b: 'Brufen', source: 'nouveau' })).toBe('Sintrom + Brufen');
    expect(homeAlertLabel({ medicament_a: 'Sintrom', medicament_b: 'Brufen', source: null })).toBe('Sintrom + Brufen');
    expect(homeAlertLabel({ medicament_a: 'Migergot', medicament_b: 'Migergot', source: 'nouveau' })).toBe('Migergot — contre-indication');
    expect(homeAlertLabel({ medicament_a: 'Migergot', medicament_b: null })).toBe('Migergot — contre-indication');
    expect(homeAlertLabel({ medicament_a: 'Migergot', medicament_b: 'null', source: 'derogation' })).toBe('Migergot — dérogation');
    for (const a of [
      { medicament_a: 'A', medicament_b: null }, { medicament_a: 'A', medicament_b: 'null', source: 'allergie' },
      { medicament_a: null, medicament_b: null, source: null }, { medicament_a: 'A', medicament_b: undefined, source: 'renal' },
      { medicament_a: 'A', medicament_b: null, source: 'doublon' },
    ]) expect(homeAlertLabel(a)).not.toMatch(/null|undefined/);
    expect(SRC('../components/ui/DoctorHomeView.tsx')).not.toContain('`${a.medicament_a} + ${a.medicament_b}`');
  });
  it('« Ajouté : … » : un seul message, effacé à la frappe suivante et après quelques secondes', () => {
    const src = SRC('../components/bilans/QuickResultInput.tsx');
    expect(src).toContain('useState<string | null>(null);'); // un message, pas une liste
    expect(src).not.toMatch(/setAdded\(a => \[/);
    expect(src).toMatch(/onChange=\{e => \{ setText\(e\.target\.value\);[^}]*setAdded\(null\);/);
    expect(src).toMatch(/window\.setTimeout\(\(\) => \{ if \(mounted\.current\) setAdded\(null\); \}, AJOUTE_MS\)/);
  });
});

describe('5. générateurs : une migration existante n’est jamais réécrite', () => {
  it('garde-fou : crée si absent, ne touche jamais un fichier existant', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ordosur-mig-'));
    const url = pathToFileURL(join(dir, '20990101000000_test.sql'));
    expect(writeNewMigration(url, 'select 1;\n')).toBe('created');
    expect(existsSync(url)).toBe(true);
    expect(writeNewMigration(url, 'select 1;\n')).toBe('unchanged');
    expect(writeNewMigration(url, 'select 2;\n')).toBe('kept');
    expect(readFileSync(url, 'utf8')).toBe('select 1;\n'); // contenu d'origine intact
    writeFileSync(url, 'select 1;\r\n');
    expect(writeNewMigration(url, 'select 1;\n')).toBe('unchanged'); // fins de ligne ignorées
  });
  it('tous les générateurs passent par le garde-fou (aucune écriture directe dans supabase/migrations)', () => {
    for (const f of ['gen_examens', 'gen_regles_antecedents', 'gen_regles_allergies', 'gen_regles_doublons', 'gen_regles_renales']) {
      const src = SRC(`../../scripts/${f}.mjs`);
      expect(src, f).toContain("from './lib/migrationGuard.mjs'");
      expect(src, f).toMatch(/writeNewMigration\(new URL\('\.\.\/supabase\/migrations\//);
      expect(src, f).not.toMatch(/writeFileSync\(new URL\('\.\.\/supabase\/migrations\//);
    }
  });
  it('migration du Sprint 5 restaurée : les unités mg/dL ne figurent que dans la migration de la 6B', () => {
    const s5 = SRC('../../supabase/migrations/20261015120000_examens_demandes.sql');
    expect(s5).not.toContain('mg/dL');
    expect(s5).toContain('examens 098f3c1a3cc38564d7c4c0090783616a'); // empreinte d'origine du Sprint 5
    const s6b = SRC('../../supabase/migrations/20261018120000_fonction_renale.sql');
    expect(s6b).toContain('{"unite":"mg/dL","diviseur":10}');
    expect(s6b).toContain(`examens ${data.empreinte.examens}`); // empreinte de la source actuelle
    expect(data.empreinte.examens).toBe('86950639dc35155c0ae105b9fb06a114');
  });
});

describe('série : clé stable (non-régression)', () => {
  it('créatinine saisie en trois unités = une seule série', () => {
    const rs = [R('CREATININE', 12, 'mg/L'), R('CREATININE', 106, 'µmol/L'), R('CREATININE', 1.2, 'mg/dL')];
    expect(new Set(rs.map(serieKey)).size).toBe(1);
    expect(buildSeries(rs, refs)).toHaveLength(1);
  });
});
