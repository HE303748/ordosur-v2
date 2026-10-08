import { describe, it, expect } from 'vitest';
import {
  computeEcheance, echeancePhrase, suggestedControlDate, mergeLines, lineFromRef, freeLine, linesFromPack,
  fastingInfo, fullPrecision, deriveDemandeStatut, joursRetard, isEnRetard, prochainBilan, sortDemandes,
  findRedondances, renewDraftFromDemande, lastRenewable, buildRenseignements, examAlerts, validateExamDraft,
  newDemandeNumero, buildDemandePayload, emptyExamDraft, packLinesFromDraft,
  type DemandeExamens, type DemandeLigne, type ExamLineDraft,
} from './examRequest';
import { buildExamPages, fastingLabel, arabicInstructions, patientLine, examFileName, type ExamDocInput } from './examDocument';
import type { ExamRef, ExamPack } from './examSearch';
import data from './examens_reference.data.json';

const refs = data.examens as ExamRef[];
const ref = (c: string) => refs.find(r => r.code === c)!;
const L = (c: string, over: Partial<ExamLineDraft> = {}): ExamLineDraft => ({ ...lineFromRef(ref(c)), ...over });
const TODAY = new Date(2026, 9, 8); // 08/10/2026

describe('échéance', () => {
  it('raccourcis en jours et en mois', () => {
    expect(computeEcheance('1_semaine', TODAY)).toEqual({ date: '2026-10-15', libelle: '1_semaine' });
    expect(computeEcheance('15_jours', TODAY)?.date).toBe('2026-10-23');
    expect(computeEcheance('1_mois', TODAY)?.date).toBe('2026-11-08');
    expect(computeEcheance('3_mois', TODAY)?.date).toBe('2027-01-08');
    expect(computeEcheance('6_mois', TODAY)?.date).toBe('2027-04-08');
    expect(computeEcheance('1_an', TODAY)?.date).toBe('2027-10-08');
  });
  it('butée en fin de mois (31 janvier + 1 mois → 28 février)', () => {
    expect(computeEcheance('1_mois', new Date(2027, 0, 31))?.date).toBe('2027-02-28');
    expect(computeEcheance('1_mois', new Date(2028, 0, 31))?.date).toBe('2028-02-29');
    expect(computeEcheance('3_mois', new Date(2026, 10, 30))?.date).toBe('2027-02-28');
  });
  it('« avant le prochain RDV » : la date du RDV ; désactivé sans RDV à venir', () => {
    expect(computeEcheance('avant_prochain_rdv', TODAY, { rdvDate: '2026-11-20' })).toEqual({ date: '2026-11-20', libelle: 'avant_prochain_rdv' });
    expect(computeEcheance('avant_prochain_rdv', TODAY, { rdvDate: null })).toBeNull();
    expect(computeEcheance('avant_prochain_rdv', TODAY, { rdvDate: '2026-10-01' })).toBeNull();
    expect(computeEcheance('avant_prochain_rdv', TODAY, { rdvDate: '2026-10-08' })?.date).toBe('2026-10-08');
  });
  it('date précise : refusée si vide ou passée', () => {
    expect(computeEcheance('date_precise', TODAY, { customDate: '2026-12-01' })?.date).toBe('2026-12-01');
    expect(computeEcheance('date_precise', TODAY, { customDate: '' })).toBeNull();
    expect(computeEcheance('date_precise', TODAY, { customDate: '2026-10-07' })).toBeNull();
  });
  it('phrase du document', () => {
    expect(echeancePhrase({ date: '2026-11-08', libelle: '1_mois' })).toBe('Merci de réaliser les examens suivants avant le 08/11/2026');
    expect(echeancePhrase({ date: '2026-11-20', libelle: 'avant_prochain_rdv' })).toBe('Merci de réaliser les examens suivants avant votre prochain rendez-vous du 20/11/2026');
    expect(echeancePhrase({ date: '2026-11-08', libelle: '1_mois', urgent: true })).toBe('Merci de réaliser les examens suivants EN URGENCE');
  });
  it('RDV de contrôle suggéré : échéance + 7 jours', () => {
    expect(suggestedControlDate('2026-11-08')).toBe('2026-11-15');
    expect(suggestedControlDate('2026-12-28')).toBe('2027-01-04');
  });
});

describe('lignes, fusion, packs', () => {
  it('un examen identique dans la même demande est fusionné', () => {
    const a = L('NFS', { precision: 'saisie conservée' });
    const r = mergeLines([a], [L('NFS'), L('CRP')]);
    expect(r.lines.map(l => l.examen_code)).toEqual(['NFS', 'CRP']);
    expect(r.lines[0].precision).toBe('saisie conservée');
    expect(r.merged).toEqual([ref('NFS').libelle]);
  });
  it('saisie libre : fusion sans accents ni casse', () => {
    const r = mergeLines([freeLine('Scintigraphie osseuse', 'imagerie')], [freeLine('scintigraphie  OSSEUSE', 'imagerie'), freeLine('  ', 'biologie')]);
    expect(r.lines).toHaveLength(1);
  });
  it('pack : aperçu décochable, rien d’ajouté sans validation', () => {
    const pack = { lignes: data.packs.find(p => p.code === 'SUIVI_DIABETE')!.lignes as ExamPack['lignes'] };
    expect(linesFromPack(pack, refs).map(l => l.examen_code)).toEqual(['GLYCEMIE_JEUN', 'HBA1C', 'CREATININE', 'DFG', 'ALBU_CREAT_U', 'CHOLESTEROL_TOTAL', 'HDL', 'LDL', 'TRIGLYCERIDES']);
    expect(linesFromPack(pack, refs, new Set([0, 1])).map(l => l.examen_code)).toEqual(['GLYCEMIE_JEUN', 'HBA1C']);
    expect(linesFromPack(pack, refs, new Set())).toEqual([]);
  });
  it('deux packs qui se recoupent ne créent aucun doublon', () => {
    const p = (c: string) => ({ lignes: data.packs.find(x => x.code === c)!.lignes as ExamPack['lignes'] });
    const first = mergeLines([], linesFromPack(p('SUIVI_DIABETE'), refs)).lines;
    const both = mergeLines(first, linesFromPack(p('SUIVI_HTA'), refs));
    const cs = both.lines.map(l => l.examen_code);
    expect(new Set(cs).size).toBe(cs.length);
    expect(cs).toContain('ECG');
    expect(both.merged.length).toBeGreaterThan(0);
  });
  it('pack personnel : lignes libres conservées', () => {
    const lines = packLinesFromDraft([L('NFS', { precision: ' avec frottis ' }), freeLine('Scintigraphie', 'imagerie')]);
    expect(lines[0]).toEqual({ examen_code: 'NFS', libelle: ref('NFS').libelle, type: 'biologie', precision: 'avec frottis' });
    expect(linesFromPack({ lignes: lines }, refs).map(l => l.libelle)).toEqual([ref('NFS').libelle, 'Scintigraphie']);
  });
  it('précision imprimée : injection + précision libre', () => {
    expect(fullPrecision({ injection: true, precision: 'temps portal' })).toBe('avec injection — temps portal');
    expect(fullPrecision({ injection: false, precision: '' })).toBe('sans injection');
    expect(fullPrecision({ injection: null, precision: ' vessie pleine ' })).toBe('vessie pleine');
  });
});

describe('à jeun', () => {
  it('automatique depuis le référentiel, durée la plus longue', () => {
    expect(L('GLYCEMIE_JEUN').a_jeun).toBe(true);
    expect(L('NFS').a_jeun).toBe(false);
    expect(fastingInfo([L('NFS'), L('CRP')])).toEqual({ required: false, hours: null });
    expect(fastingInfo([L('GLYCEMIE_JEUN'), L('LDL'), L('NFS')])).toEqual({ required: true, hours: 12 });
    expect(fastingInfo([L('FOGD')])).toEqual({ required: true, hours: 6 });
  });
  it('modifiable par le médecin', () => {
    expect(fastingInfo([L('GLYCEMIE_JEUN', { a_jeun: false })]).required).toBe(false);
    expect(fastingInfo([{ a_jeun: true, delai_jeun_h: null }])).toEqual({ required: true, hours: null });
  });
});

const ligne = (id: string, code: string | null, statut: DemandeLigne['statut'], over: Partial<DemandeLigne> = {}): DemandeLigne => ({
  id, demande_id: 'd', examen_code: code, libelle: code ? ref(code).libelle : 'Libre', type: code ? ref(code).type : 'biologie',
  categorie: null, precision: null, question_clinique: null, a_jeun: false, delai_jeun_h: null, injection: null,
  statut, date_realisation: null, resultat_id: null, ordre: 0, ...over,
});
const demande = (over: Partial<DemandeExamens>): DemandeExamens => ({
  id: 'd1', numero: 'DEM-20260912-ABCD', patient_id: 'p', org_id: 'o', doctor_id: 'doc', ordonnance_id: null,
  date_demande: '2026-09-12', echeance_date: '2026-10-12', echeance_libelle: '1_mois', renseignements_cliniques: null,
  urgent: false, ald: false, regrouper_imageries: false, packs_utilises: [], statut: 'en_attente', motif_annulation: null,
  notes: null, created_at: '2026-09-12T10:00:00Z', lignes: [], ...over,
});

describe('statuts', () => {
  it('statut de la demande dérivé des lignes', () => {
    expect(deriveDemandeStatut([{ statut: 'en_attente' }, { statut: 'en_attente' }])).toBe('en_attente');
    expect(deriveDemandeStatut([{ statut: 'realise' }, { statut: 'en_attente' }])).toBe('partiel');
    expect(deriveDemandeStatut([{ statut: 'realise' }, { statut: 'realise' }])).toBe('realise');
    expect(deriveDemandeStatut([{ statut: 'annule' }, { statut: 'annule' }])).toBe('annule');
    expect(deriveDemandeStatut([{ statut: 'annule' }, { statut: 'en_attente' }])).toBe('en_attente');
    // Annulation d'une demande partielle : le reste est annulé, la demande est réalisée.
    expect(deriveDemandeStatut([{ statut: 'realise' }, { statut: 'annule' }])).toBe('realise');
  });
  it('en retard de N jours, uniquement pour une demande ouverte', () => {
    expect(joursRetard({ statut: 'en_attente', echeance_date: '2026-10-05' }, TODAY)).toBe(3);
    expect(joursRetard({ statut: 'partiel', echeance_date: '2026-10-07' }, TODAY)).toBe(1);
    expect(isEnRetard({ statut: 'en_attente', echeance_date: '2026-10-08' }, TODAY)).toBe(false);
    expect(isEnRetard({ statut: 'realise', echeance_date: '2026-09-01' }, TODAY)).toBe(false);
    expect(isEnRetard({ statut: 'annule', echeance_date: '2026-09-01' }, TODAY)).toBe(false);
  });
  it('prochain bilan : échéance la plus proche ; retard prioritaire', () => {
    expect(prochainBilan([], TODAY)).toBeNull();
    expect(prochainBilan([{ statut: 'realise', echeance_date: '2026-10-20' }], TODAY)).toBeNull();
    expect(prochainBilan([
      { statut: 'en_attente', echeance_date: '2026-12-01' },
      { statut: 'partiel', echeance_date: '2026-10-20' },
    ], TODAY)).toEqual({ kind: 'prevu', date: '2026-10-20', label: 'Prochain bilan prévu le 20/10' });
    expect(prochainBilan([
      { statut: 'en_attente', echeance_date: '2026-12-01' },
      { statut: 'en_attente', echeance_date: '2026-10-01' },
      { statut: 'en_attente', echeance_date: '2026-09-15' },
    ], TODAY)).toEqual({ kind: 'retard', date: '2026-09-15', label: 'Bilan en retard depuis le 15/09' });
  });
  it('tri : demandes ouvertes par échéance, puis historique récent d’abord', () => {
    const r = sortDemandes([
      { statut: 'realise' as const, echeance_date: '2026-01-01', created_at: '2026-01-01' },
      { statut: 'en_attente' as const, echeance_date: '2026-12-01', created_at: '2026-10-01' },
      { statut: 'annule' as const, echeance_date: '2026-06-01', created_at: '2026-06-01' },
      { statut: 'partiel' as const, echeance_date: '2026-10-20', created_at: '2026-09-01' },
    ]);
    expect(r.map(d => d.echeance_date)).toEqual(['2026-10-20', '2026-12-01', '2026-06-01', '2026-01-01']);
  });
});

describe('anti-redondance', () => {
  const pending = demande({ lignes: [ligne('l1', 'HBA1C', 'en_attente'), ligne('l2', 'NFS', 'realise'), ligne('l3', 'CRP', 'annule')] });
  it('examen déjà demandé et en attente → signalé avec la date', () => {
    const r = findRedondances([L('HBA1C'), L('TSH')], [pending]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ libelle: ref('HBA1C').libelle, date_demande: '2026-09-12' });
  });
  it('examen déjà réalisé ou annulé, ou demande close → non signalé', () => {
    expect(findRedondances([L('NFS'), L('CRP')], [pending])).toEqual([]);
    expect(findRedondances([L('HBA1C')], [demande({ statut: 'annule', lignes: [ligne('l1', 'HBA1C', 'annule')] })])).toEqual([]);
    expect(findRedondances([L('HBA1C')], [demande({ statut: 'realise', lignes: [ligne('l1', 'HBA1C', 'realise')] })])).toEqual([]);
  });
  it('saisie libre comparée par libellé normalisé', () => {
    const d = demande({ lignes: [ligne('l1', null, 'en_attente', { libelle: 'Scintigraphie osseuse', type: 'imagerie' })] });
    expect(findRedondances([freeLine('scintigraphie OSSEUSE', 'imagerie')], [d])).toHaveLength(1);
  });
});

describe('renouvellement', () => {
  it('recharge les examens (hors annulés), modifiables, échéance à redéfinir', () => {
    const d = demande({
      renseignements_cliniques: 'Diabète de type 2.', ald: true, statut: 'realise',
      lignes: [
        ligne('l1', 'HBA1C', 'realise', { ordre: 1 }),
        ligne('l2', 'GLYCEMIE_JEUN', 'realise', { ordre: 0, a_jeun: false }),
        ligne('l3', 'CRP', 'annule', { ordre: 2 }),
        ligne('l4', 'TDM_ABDOMINO_PELVIENNE', 'realise', { ordre: 3, injection: true, question_clinique: 'Lésion ?' }),
      ],
    });
    const draft = renewDraftFromDemande(d, refs);
    expect(draft.lines.map(l => l.examen_code)).toEqual(['GLYCEMIE_JEUN', 'HBA1C', 'TDM_ABDOMINO_PELVIENNE']);
    expect(draft.lines[0].a_jeun).toBe(true); // jeûne : référentiel actuel
    expect(draft.lines[2]).toMatchObject({ injection: true, question: 'Lésion ?' });
    expect(draft.echeance).toBe('1_mois');
    expect(draft.ald).toBe(true);
    expect(draft.renseignements).toBe('Diabète de type 2.');
  });
  it('dernière demande renouvelable : la plus récente non annulée', () => {
    const a = demande({ id: 'a', created_at: '2026-01-01T00:00:00Z' });
    const b = demande({ id: 'b', created_at: '2026-09-01T00:00:00Z', statut: 'annule' });
    const c = demande({ id: 'c', created_at: '2026-06-01T00:00:00Z', statut: 'realise' });
    expect(lastRenewable([a, b, c])?.id).toBe('c');
    expect(lastRenewable([b])).toBeNull();
  });
});

describe('renseignements cliniques', () => {
  it('pathologies (depuis AAAA), antécédents, traitement — concis', () => {
    expect(buildRenseignements({
      pathologies: ['Diabète de type 2', 'HTA'], pathologies_depuis: { 'Diabète de type 2': 2018 },
      antecedents: [{ libelle: 'Cholécystectomie', annee: 2015 }], traitements: ['Glucophage 850 mg', 'Kardegic 75 mg', 'Glucophage 850 mg'],
    })).toBe('Diabète de type 2 (depuis 2018), HTA. Antécédents : Cholécystectomie (2015). Traitement en cours : Glucophage 850 mg, Kardegic 75 mg.');
    expect(buildRenseignements({})).toBe('');
  });
});

describe('alertes informatives', () => {
  const tdmInj = L('TDM_ABDOMINO_PELVIENNE', { injection: true });
  const codes = (lines: ExamLineDraft[], ctx: Parameters<typeof examAlerts>[2]) => examAlerts(lines, refs, ctx).map(a => a.code);

  it('injection iodée + allergie aux produits de contraste iodés', () => {
    const a = examAlerts([tdmInj], refs, { allergies: ['Allergie aux produits de contraste iodés'] });
    expect(a[0]).toMatchObject({ code: 'iode_allergie', message: 'Allergie aux produits de contraste iodés déclarée — prémédication ou alternative à discuter' });
    expect(codes([tdmInj], { allergies: ['Iode'] })).toContain('iode_allergie');
    expect(codes([tdmInj], { allergies: ['Pénicilline'] })).not.toContain('iode_allergie');
  });
  it('sans injection, ou injection non précisée → pas d’alerte iode', () => {
    expect(codes([L('TDM_ABDOMINO_PELVIENNE', { injection: false })], { allergies: ['Iode'], medicaments: ['Glucophage'] })).toEqual([]);
    expect(codes([L('TDM_ABDOMINO_PELVIENNE')], { allergies: ['Iode'], medicaments: ['Glucophage'] })).toEqual([]);
    expect(codes([L('TDM_ABDOMINO_PELVIENNE', { precision: 'avec injection' })], { allergies: ['Iode'] })).toContain('iode_allergie');
  });
  it('IRM avec injection (gadolinium) → pas d’alerte iode', () => {
    expect(codes([L('IRM_HEPATIQUE', { injection: true })], { allergies: ['Iode'], medicaments: ['Metformine'] })).toEqual([]);
  });
  it('injection iodée + metformine (ordonnance en cours ou traitement de fond)', () => {
    const a = examAlerts([tdmInj], refs, { medicaments: ['GLUCOPHAGE 850 MG', 'Kardegic'] });
    expect(a[0]).toMatchObject({ code: 'iode_metformine', message: 'Patient sous metformine — conduite à tenir selon la fonction rénale' });
    expect(codes([tdmInj], { medicaments: ['Janumet 50/1000'] })).toContain('iode_metformine');
    expect(codes([tdmInj], { medicaments: ['METFORMINE CHLORHYDRATE'] })).toContain('iode_metformine');
    expect(codes([tdmInj], { medicaments: ['Brufen 400 mg', 'Sintrom'] })).toEqual([]);
  });
  it('saisie libre « Uroscanner avec injection » reconnue', () => {
    const libre = { ...freeLine('Uroscanner', 'imagerie'), precision: 'avec injection' };
    expect(codes([libre], { allergies: ['Produit de contraste iodé'] })).toContain('iode_allergie');
  });
  it('examen irradiant + patiente de 12 à 55 ans', () => {
    const rx = L('RX_THORAX');
    expect(examAlerts([rx], refs, { sexe: 'F', ageAns: 30, grossesse: 'inconnu' })[0])
      .toMatchObject({ code: 'irradiant_grossesse_inconnue', message: 'Examen irradiant — statut grossesse à vérifier' });
    expect(codes([rx], { sexe: 'F', ageAns: 30, grossesse: null })).toEqual(['irradiant_grossesse_inconnue']);
    expect(examAlerts([rx], refs, { sexe: 'F', ageAns: 30, grossesse: 'enceinte' })[0])
      .toMatchObject({ code: 'irradiant_enceinte', message: 'Patiente enceinte — examen irradiant : bénéfice/risque à évaluer' });
    expect(codes([rx], { sexe: 'F', ageAns: 30, grossesse: 'non_enceinte' })).toEqual([]);
  });
  it('hors périmètre : homme, âge hors 12-55 ans, âge inconnu, examen non irradiant', () => {
    const rx = L('RX_THORAX');
    expect(codes([rx], { sexe: 'M', ageAns: 30, grossesse: null })).toEqual([]);
    expect(codes([rx], { sexe: 'F', ageAns: 60, grossesse: null })).toEqual([]);
    expect(codes([rx], { sexe: 'F', ageAns: 11, grossesse: null })).toEqual([]);
    expect(codes([rx], { sexe: 'F', ageAns: null, grossesse: null })).toEqual([]);
    expect(codes([L('ECHO_ABDOMINALE'), L('IRM_CEREBRALE')], { sexe: 'F', ageAns: 30, grossesse: 'enceinte' })).toEqual([]);
  });
  it('consentement requis (VIH)', () => {
    expect(examAlerts([L('VIH'), L('NFS')], refs, {})).toEqual([{ code: 'consentement', message: 'Consentement du patient requis', examens: [ref('VIH').libelle] }]);
    expect(codes([L('NFS')], {})).toEqual([]);
  });
});

describe('validation et charge utile', () => {
  it('échéance obligatoire, au moins un examen ; renseignements : simple rappel', () => {
    const d = emptyExamDraft();
    expect(validateExamDraft(d, TODAY).ok).toBe(false);
    const ok = validateExamDraft({ ...d, lines: [L('NFS')] }, TODAY);
    expect(ok.ok).toBe(true);
    expect(ok.echeance?.date).toBe('2026-11-08'); // défaut : 1 mois
    expect(ok.warnings).toEqual(['Ajouter des renseignements cliniques aide le laboratoire et le radiologue']);
    expect(validateExamDraft({ ...d, lines: [L('NFS')], echeance: 'avant_prochain_rdv' }, TODAY, null).ok).toBe(false);
    expect(validateExamDraft({ ...d, lines: [L('NFS')], echeance: 'date_precise', echeanceDate: '' }, TODAY).ok).toBe(false);
    expect(validateExamDraft({ ...d, lines: [L('NFS')], renseignements: 'HTA.' }, TODAY).warnings).toEqual([]);
  });
  it('numéro DEM-AAAAMMJJ-XXXX', () => {
    expect(newDemandeNumero(TODAY, () => 0)).toBe('DEM-20261008-AAAA');
    expect(newDemandeNumero(TODAY)).toMatch(/^DEM-20261008-[A-Z0-9]{4}$/);
  });
  it('charge utile : biologie puis imagerie puis explorations ; question réservée à l’imagerie', () => {
    const d = { ...emptyExamDraft(), urgent: true, packsUtilises: ['A', 'A'], renseignements: ' HTA. ',
      lines: [L('ECG', { question: 'Trouble du rythme ?' }), L('NFS', { question: 'ignorée' }), L('TDM_THORACIQUE', { injection: true }), L('GLYCEMIE_JEUN', { a_jeun: false })] };
    const p = buildDemandePayload(d, { numero: 'DEM-20261008-AAAA', patient_id: 'p', org_id: 'o', doctor_id: 'doc' }, { date: '2026-11-08', libelle: '1_mois' }, TODAY);
    expect(p.demande).toMatchObject({ date_demande: '2026-10-08', echeance_date: '2026-11-08', urgent: true, ordonnance_id: null, packs_utilises: ['A'], renseignements_cliniques: 'HTA.' });
    expect(p.lignes.map(l => l.examen_code)).toEqual(['NFS', 'GLYCEMIE_JEUN', 'TDM_THORACIQUE', 'ECG']);
    expect(p.lignes[0].question_clinique).toBeNull();
    expect(p.lignes[1]).toMatchObject({ a_jeun: false, delai_jeun_h: null });
    expect(p.lignes[2].injection).toBe(true);
    expect(p.lignes[3].question_clinique).toBe('Trouble du rythme ?');
  });
});

describe('document : pagination', () => {
  const docLine = (c: string, over: Partial<ExamDocInput['lines'][number]> = {}) => {
    const r = ref(c);
    return { libelle: r.libelle, type: r.type, categorie: r.categorie, a_jeun: r.a_jeun, delai_jeun_h: r.delai_jeun_h, ...over };
  };
  const input = (lines: ExamDocInput['lines'], over: Partial<ExamDocInput> = {}): ExamDocInput => ({
    numero: 'DEM-20261008-AAAA', dateIso: '2026-10-08', echeance: { date: '2026-11-08', libelle: '1_mois' },
    urgent: false, ald: false, regrouperImageries: false, renseignements: 'Cirrhose virale B.',
    patient: { prenom: 'fatima zahra', nom: 'EL IDRISSI', sexe: 'F', date_naissance: '1972-03-10' }, lines, ...over,
  });

  it('1 page biologie groupée par catégorie', () => {
    const pages = buildExamPages(input([docLine('NFS'), docLine('ASAT'), docLine('ALAT'), docLine('TP_INR')]));
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({ kind: 'biologie', heading: 'BIOLOGIE MÉDICALE', pageLabel: null, fasting: null });
    expect(pages[0].groups.map(g => [g.label, g.items.length])).toEqual([['Hématologie', 1], ['Bilan hépatique', 2], ['Hémostase', 1]]);
    expect(pages[0].subtitle).toBe('Merci de réaliser les examens suivants avant le 08/11/2026');
    expect(pages[0].renseignements).toBe('Cirrhose virale B.');
  });
  it('1 page biologie + 1 page PAR imagerie ou exploration', () => {
    const pages = buildExamPages(input([
      docLine('ECHO_HEPATIQUE_DOPPLER', { question: 'Nodule ?' }), docLine('NFS'), docLine('FIBROSCAN'), docLine('FOGD'), docLine('AFP'),
    ]));
    expect(pages.map(p => p.kind)).toEqual(['biologie', 'imagerie', 'imagerie', 'exploration']);
    expect(pages.map(p => p.pageLabel)).toEqual(['1/4', '2/4', '3/4', '4/4']);
    expect(pages[1].heading).toBe('ÉCHOGRAPHIE HÉPATIQUE AVEC DOPPLER');
    expect(pages[1].groups[0].items[0].question).toBe('Nodule ?');
    expect(pages[0].groups.flatMap(g => g.items)).toHaveLength(2);
  });
  it('option « regrouper les imageries sur une page »', () => {
    const lines = [docLine('NFS'), docLine('ECHO_ABDOMINALE'), docLine('TDM_ABDOMINO_PELVIENNE', { precision: 'avec injection' }), docLine('ECG')];
    const pages = buildExamPages(input(lines, { regrouperImageries: true }));
    expect(pages.map(p => p.kind)).toEqual(['biologie', 'imagerie_groupee']);
    expect(pages[1].heading).toBe('IMAGERIE ET EXPLORATIONS');
    expect(pages[1].groups.map(g => [g.label, g.items.length])).toEqual([['Imagerie', 2], ['Explorations', 1]]);
    expect(pages[1].groups[0].items[1].precision).toBe('avec injection');
    // Une seule imagerie : rien à regrouper, la page porte son nom.
    expect(buildExamPages(input([docLine('ECHO_ABDOMINALE')], { regrouperImageries: true }))[0].kind).toBe('imagerie');
  });
  it('encadré « À jeun » seulement sur les pages concernées', () => {
    const pages = buildExamPages(input([docLine('NFS'), docLine('LDL'), docLine('ECHO_THYROIDIENNE'), docLine('FOGD')]));
    expect(pages.map(p => p.fasting)).toEqual([{ hours: 12 }, null, { hours: 6 }]);
    expect(fastingLabel({ hours: 12 })).toBe('À JEUN (12 h)');
    expect(fastingLabel({ hours: null })).toBe('À JEUN');
    const nonJeun = buildExamPages(input([docLine('GLYCEMIE_JEUN', { a_jeun: false })]));
    expect(nonJeun[0].fasting).toBeNull();
  });
  it('urgence, ALD, prochain RDV, bloc patient', () => {
    const p = buildExamPages(input([docLine('NFS')], { urgent: true, ald: true }))[0];
    expect(p).toMatchObject({ urgent: true, ald: true, subtitle: 'Merci de réaliser les examens suivants EN URGENCE' });
    const rdv = buildExamPages(input([docLine('NFS')], { echeance: { date: '2026-11-20', libelle: 'avant_prochain_rdv' } }))[0];
    expect(rdv.subtitle).toBe('Merci de réaliser les examens suivants avant votre prochain rendez-vous du 20/11/2026');
    expect(patientLine({ prenom: 'fatima zahra', nom: 'EL IDRISSI', sexe: 'F' })).toBe('Mme Fatima Zahra El Idrissi');
    expect(patientLine({ prenom: 'karim', nom: 'bennani', sexe: 'M' })).toBe('M. Karim Bennani');
  });
  it('saisie libre en biologie : « Autres examens » en dernier', () => {
    const pages = buildExamPages(input([{ libelle: 'Dosage de céruloplasmine', type: 'biologie', categorie: null, a_jeun: false }, docLine('NFS')]));
    expect(pages[0].groups.map(g => g.label)).toEqual(['Hématologie', 'Autres examens']);
  });
  it('consigne bilingue et nom de fichier', () => {
    expect(arabicInstructions({ fasting: { hours: 12 }, urgent: false, echeanceDate: '2026-11-08' })).toEqual(['على الريق (12 ساعة)', 'يُنجز قبل 08/11/2026']);
    expect(arabicInstructions({ fasting: { hours: 6 }, urgent: true, echeanceDate: '2026-11-08' })).toEqual(['على الريق (6 ساعات)']);
    expect(arabicInstructions({ fasting: null, urgent: true, echeanceDate: '2026-11-08' })).toEqual([]);
    expect(examFileName({ nom: 'El Idrissi', prenom: 'Fatima Zahra' }, 'DEM-20261008-AAAA')).toBe('examens_El_Idrissi_Fatima_Zahra_DEM-20261008-AAAA.pdf');
  });
});
