import { describe, it, expect } from 'vitest';
import { sortPacksForPatient, contextPackCodes, isContextPack, type ExamRef, type ExamPack } from './examSearch';
import {
  hasMetformine, isInjected, injectionNotes, creatinineSuggestion, countNewLines, abandonSummary, suiviVisible,
  pendingExamsLabel, echeanceRelative, lineFromRef, linesFromPack, freeLine, emptyExamDraft, buildDemandePayload,
  NOTE_CREATININE, NOTE_METFORMINE, type ExamLineDraft, type DemandeExamens, type DemandeLigne,
} from './examRequest';
import { buildExamPages, docInputFromDraft, pagesFromDemande, patientLine } from './examDocument';
import { placePopover, scrollTargetOnViewChange, POPOVER_MIN } from './uiPlacement';
import data from './examens_reference.data.json';

const refs = data.examens as ExamRef[];
const ref = (c: string) => refs.find(r => r.code === c)!;
const L = (c: string, over: Partial<ExamLineDraft> = {}): ExamLineDraft => ({ ...lineFromRef(ref(c)), ...over });
const packs: ExamPack[] = data.packs.map((p, i) => ({
  id: `sys-${i}`, systeme: true, code: p.code, doctor_id: null, nom: p.nom, mots_cles: p.mots_cles,
  lignes: p.lignes as ExamPack['lignes'], archive: false, ordre: p.ordre,
}));
const pack = (c: string) => packs.find(p => p.code === c)!;
const TODAY = new Date(2026, 9, 9); // 09/10/2026

describe('1. carte « Examens à suivre »', () => {
  it('visible dès qu’il existe une demande en attente, même sans retard ni échéance proche', () => {
    // Cas de la production : 2 demandes en attente, échéance le 24/10 (dans 15 jours).
    expect(suiviVisible({ enAttente: 2, enRetard: 0, sous7j: 0 })).toBe(true);
    expect(suiviVisible({ enAttente: 1, enRetard: 1, sous7j: 0 })).toBe(true);
  });
  it('masquée seulement s’il n’y a aucune demande en attente (ou pas encore de données)', () => {
    expect(suiviVisible({ enAttente: 0, enRetard: 0, sous7j: 0 })).toBe(false);
    expect(suiviVisible(null)).toBe(false);
  });
  it('échéance relative et examens encore en attente', () => {
    expect(echeanceRelative('2026-10-24', TODAY)).toEqual({ late: false, label: 'Dans 15 jours' });
    expect(echeanceRelative('2026-10-09', TODAY)).toEqual({ late: false, label: 'Aujourd’hui' });
    expect(echeanceRelative('2026-10-10', TODAY).label).toBe('Dans 1 jour');
    expect(echeanceRelative('2026-10-06', TODAY)).toEqual({ late: true, label: 'En retard de 3 jours' });
    const lignes = [
      { libelle: 'NFS', statut: 'en_attente' as const }, { libelle: 'CRP', statut: 'realise' as const },
      { libelle: 'TSH', statut: 'en_attente' as const }, { libelle: 'ASAT', statut: 'en_attente' as const },
      { libelle: 'ALAT', statut: 'en_attente' as const }, { libelle: 'GGT', statut: 'annule' as const },
    ];
    expect(pendingExamsLabel(lignes)).toBe('NFS, TSH, ASAT +1');
    expect(pendingExamsLabel(lignes.slice(0, 2))).toBe('NFS');
    expect(pendingExamsLabel([{ libelle: 'CRP', statut: 'realise' }])).toBe('');
  });
});

describe('2. position de défilement', () => {
  it('navigation normale : toujours en haut de page', () => {
    expect(scrollTargetOnViewChange(false, 840)).toBe(0);
    expect(scrollTargetOnViewChange(false, undefined)).toBe(0);
  });
  it('retour arrière du navigateur : position précédente restaurée', () => {
    expect(scrollTargetOnViewChange(true, 840)).toBe(840);
    expect(scrollTargetOnViewChange(true, undefined)).toBe(0);
  });
});

describe('4. liste de suggestions jamais coupée', () => {
  const VW = 1280, VH = 800;
  it('assez de place dessous : sous le champ, 8 résultats visibles', () => {
    const p = placePopover({ top: 200, bottom: 240, left: 100, width: 500 }, VH, VW);
    expect(p).toMatchObject({ placement: 'bottom', top: 244, left: 100, width: 500, maxHeight: 400 });
  });
  it('champ en bas de fenêtre : ouverture vers le haut', () => {
    const p = placePopover({ top: 650, bottom: 690, left: 100, width: 500 }, VH, VW);
    expect(p.placement).toBe('top');
    expect(p.bottom).toBe(VH - 650 + 4);
    expect(p.maxHeight).toBe(400);
  });
  it('au moins 6 résultats dessous → on reste dessous, hauteur bornée par la place', () => {
    const p = placePopover({ top: 420, bottom: 460, left: 0, width: 300 }, VH, VW);
    expect(p.placement).toBe('bottom');
    expect(p.maxHeight).toBe(VH - 460 - 4 - 8);
    expect(p.maxHeight).toBeGreaterThanOrEqual(POPOVER_MIN);
  });
  it('petite fenêtre (mobile, clavier ouvert) : le côté le plus spacieux, défilement interne', () => {
    const p = placePopover({ top: 250, bottom: 290, left: 8, width: 359 }, 420, 375);
    expect(p.placement).toBe('top');
    expect(p.maxHeight).toBe(250 - 4 - 8);
    const q = placePopover({ top: 60, bottom: 100, left: 8, width: 359 }, 420, 375);
    expect(q.placement).toBe('bottom');
    expect(q.maxHeight).toBe(420 - 100 - 12);
  });
  it('jamais plus large que la fenêtre ni hors écran', () => {
    const p = placePopover({ top: 100, bottom: 140, left: 300, width: 500 }, 800, 375);
    expect(p.width).toBe(375 - 16);
    expect(p.left).toBe(8);
  });
});

describe('5. dialogue « Abandonner ? » : médicaments et examens comptés', () => {
  it('« 1 médicament, 14 examens »', () => {
    expect(abandonSummary(1, 14)).toBe('1 médicament, 14 examens');
    expect(abandonSummary(2, 1)).toBe('2 médicaments, 1 examen');
  });
  it('un seul type de contenu', () => {
    expect(abandonSummary(3, 0)).toBe('3 médicaments');
    expect(abandonSummary(0, 5)).toBe('5 examens');
    expect(abandonSummary(0, 0)).toBe('0 médicament');
  });
});

const ligne = (id: string, code: string, statut: DemandeLigne['statut'], over: Partial<DemandeLigne> = {}): DemandeLigne => ({
  id, demande_id: 'd', examen_code: code, libelle: ref(code).libelle, type: ref(code).type, categorie: ref(code).categorie,
  precision: null, question_clinique: null, a_jeun: false, delai_jeun_h: null, injection: null,
  statut, date_realisation: null, resultat_id: null, ordre: 0, ...over,
});
const demande = (over: Partial<DemandeExamens>): DemandeExamens => ({
  id: 'd1', numero: 'DEM-20261009-YFUK', patient_id: 'p', org_id: 'o', doctor_id: 'doc', ordonnance_id: null,
  date_demande: '2026-10-09', echeance_date: '2026-10-24', echeance_libelle: '15_jours', renseignements_cliniques: null,
  urgent: false, ald: false, regrouper_imageries: false, packs_utilises: [], statut: 'en_attente', motif_annulation: null,
  notes: null, created_at: '2026-10-09T10:00:00Z', lignes: [], ...over,
});
const patient = { prenom: 'asma', nom: 'WAKRIM', sexe: 'F', date_naissance: '1990-01-01' };

describe('7. civilité cohérente sur tous les documents', () => {
  it('« M. », « Mme », et « M./Mme » seulement si le sexe est inconnu', () => {
    expect(patientLine({ prenom: 'asma', nom: 'WAKRIM', sexe: 'F' })).toBe('Mme Asma Wakrim');
    expect(patientLine({ prenom: 'walid', nom: 'idrissi', sexe: 'M' })).toBe('M. Walid Idrissi');
    expect(patientLine({ prenom: 'sam', nom: 'alami', sexe: null })).toBe('M./Mme Sam Alami');
    expect(patientLine({ prenom: 'sam', nom: 'alami' })).toBe('M./Mme Sam Alami');
  });
});

describe('8. injection de produit de contraste', () => {
  it('injection reconnue (bouton, précision, saisie libre) — iode comme gadolinium', () => {
    expect(isInjected(L('TDM_THORACIQUE', { injection: true }))).toBe(true);
    expect(isInjected(L('IRM_HEPATIQUE', { injection: true }))).toBe(true);
    expect(isInjected(L('TDM_THORACIQUE', { injection: false, precision: 'avec injection' }))).toBe(false);
    expect(isInjected(L('TDM_THORACIQUE'))).toBe(false);
    expect(isInjected(L('TDM_THORACIQUE', { precision: 'Avec injection, temps portal' }))).toBe(true);
    expect(isInjected({ ...freeLine('Uroscanner', 'imagerie'), precision: 'sans injection' })).toBe(false);
    expect(isInjected({ ...freeLine('Arthro-IRM injectée', 'imagerie') })).toBe(true);
  });
  it('mentions : créatininémie toujours, metformine si le patient en reçoit', () => {
    expect(injectionNotes(true, false)).toEqual([NOTE_CREATININE]);
    expect(injectionNotes(true, true)).toEqual([NOTE_CREATININE, NOTE_METFORMINE]);
    expect(injectionNotes(false, true)).toEqual([]);
    expect(NOTE_CREATININE).toBe('Créatininémie récente (< 3 mois) à apporter');
    expect(hasMetformine(['GLUCOPHAGE 850 MG METFORMINE'])).toBe(true);
    expect(hasMetformine(['Brufen 400 mg'])).toBe(false);
    expect(hasMetformine(null)).toBe(false);
  });
  it('la mention figure sur la page de l’imagerie concernée, et seulement celle-là', () => {
    const draft = { ...emptyExamDraft(), lines: [
      L('NFS'), L('TDM_ABDOMINO_PELVIENNE', { injection: true }), L('ECHO_ABDOMINALE'), L('IRM_HEPATIQUE', { injection: true }), L('TDM_THORACIQUE', { injection: false }),
    ] };
    const pages = buildExamPages(docInputFromDraft(draft, {
      numero: 'DEM-20261009-AAAA', dateIso: '2026-10-09', echeance: { date: '2026-10-24', libelle: '15_jours' }, patient, sousMetformine: true,
    }));
    expect(pages.map(p => [p.kind, p.notes.length])).toEqual([['biologie', 0], ['imagerie', 2], ['imagerie', 0], ['imagerie', 2], ['imagerie', 0]]);
    expect(pages[1].notes).toEqual([NOTE_CREATININE, NOTE_METFORMINE]);
  });
  it('sans metformine : créatininémie seule ; imageries regroupées : une seule mention', () => {
    const draft = { ...emptyExamDraft(), regrouperImageries: true, lines: [L('TDM_THORACIQUE', { injection: true }), L('ECHO_ABDOMINALE')] };
    const pages = buildExamPages(docInputFromDraft(draft, {
      numero: 'DEM-20261009-AAAA', dateIso: '2026-10-09', echeance: { date: '2026-10-24', libelle: '15_jours' }, patient,
    }));
    expect(pages).toHaveLength(1);
    expect(pages[0].notes).toEqual([NOTE_CREATININE]);
  });
  it('réimpression : la mention metformine est conservée avec la demande', () => {
    const d = demande({ sous_metformine: true, lignes: [ligne('l1', 'TDM_ABDOMINO_PELVIENNE', 'en_attente', { injection: true })] });
    expect(pagesFromDemande(d, patient)[0].notes).toEqual([NOTE_CREATININE, NOTE_METFORMINE]);
    expect(pagesFromDemande({ ...d, sous_metformine: false }, patient)[0].notes).toEqual([NOTE_CREATININE]);
    const p = buildDemandePayload({ ...emptyExamDraft(), lines: [L('NFS')] },
      { numero: 'DEM-20261009-AAAA', patient_id: 'p', org_id: 'o', doctor_id: 'd', sous_metformine: true }, { date: '2026-10-24', libelle: '15_jours' }, TODAY);
    expect(p.demande.sous_metformine).toBe(true);
  });
  it('suggestion « Ajouter créatinine + DFG » quand aucune créatinine n’est demandée', () => {
    const tdm = L('TDM_ABDOMINO_PELVIENNE', { injection: true });
    expect(creatinineSuggestion([tdm])).toEqual(['CREATININE', 'DFG']);
    expect(creatinineSuggestion([tdm, L('DFG')])).toEqual(['CREATININE']);
    expect(creatinineSuggestion([tdm, L('CREATININE')])).toEqual([]);
    expect(creatinineSuggestion([L('IRM_CEREBRALE', { injection: true })])).toEqual(['CREATININE', 'DFG']);
  });
  it('pas de suggestion sans injection, ni si une créatinine est déjà en attente pour ce patient', () => {
    expect(creatinineSuggestion([L('TDM_ABDOMINO_PELVIENNE'), L('NFS')])).toEqual([]);
    expect(creatinineSuggestion([L('TDM_ABDOMINO_PELVIENNE', { injection: false })])).toEqual([]);
    const pending = demande({ lignes: [ligne('l1', 'CREATININE', 'en_attente')] });
    expect(creatinineSuggestion([L('TDM_THORACIQUE', { injection: true })], [pending])).toEqual([]);
    const done = demande({ statut: 'realise', lignes: [ligne('l1', 'CREATININE', 'realise')] });
    expect(creatinineSuggestion([L('TDM_THORACIQUE', { injection: true })], [done])).toEqual(['CREATININE', 'DFG']);
  });
});

describe('9. packs', () => {
  const usage = new Map([['BILAN_INFLAMMATOIRE', 12], ['BILAN_LIPIDIQUE', 5]]);
  const codes = (pathologies: string[], u = usage) => sortPacksForPatient(packs, u, pathologies).map(p => p.code);

  it('diabète → « Suivi du diabète » en premier ; HTA → « Suivi HTA »', () => {
    expect(codes(['Diabète de type 2']).slice(0, 2)).toEqual(['SUIVI_DIABETE', 'BILAN_GLYCEMIQUE']);
    expect(codes(['HTA'])[0]).toBe('SUIVI_HTA');
    expect(codes(['Hypertension artérielle'])[0]).toBe('SUIVI_HTA');
    expect(codes(['Diabète de type 2', 'HTA']).slice(0, 3)).toEqual(['SUIVI_DIABETE', 'BILAN_GLYCEMIQUE', 'SUIVI_HTA']);
  });
  it('puis les packs les plus utilisés par le médecin', () => {
    expect(codes(['HTA']).slice(0, 3)).toEqual(['SUIVI_HTA', 'BILAN_INFLAMMATOIRE', 'BILAN_LIPIDIQUE']);
    expect(codes([]).slice(0, 2)).toEqual(['BILAN_INFLAMMATOIRE', 'BILAN_LIPIDIQUE']);
  });
  it('sans pathologie ni usage : ordre système', () => {
    expect(codes([], new Map())).toEqual(packs.map(p => p.code));
  });
  it('autres pathologies reconnues ; faux amis écartés', () => {
    expect(contextPackCodes(['Cirrhose virale B'])[0]).toBe('HEPATOPATHIE_CHRONIQUE');
    expect(contextPackCodes(['Hypothyroïdie'])).toEqual(['BILAN_THYROIDIEN']);
    expect(contextPackCodes(['Hypertension pulmonaire'])).toEqual([]);
    expect(contextPackCodes(['Hypertension portale'])).toEqual([]);
    expect(contextPackCodes(['Diabète insipide'])).toEqual([]);
    expect(isContextPack(pack('SUIVI_DIABETE'), ['DT2'])).toBe(true);
    expect(isContextPack(pack('SUIVI_HTA'), ['DT2'])).toBe(false);
  });
  it('packs personnels : jamais devant un pack suggéré, devant les packs système à usage égal ; archivés écartés', () => {
    const perso: ExamPack = { id: 'p1', systeme: false, code: null, doctor_id: 'd', nom: 'Mon bilan', mots_cles: [], lignes: [], archive: false, ordre: 0 };
    const r = sortPacksForPatient([...packs, perso, { ...perso, id: 'p2', archive: true }], new Map(), ['HTA']);
    expect(r[0].code).toBe('SUIVI_HTA');
    expect(r[1].id).toBe('p1');
    expect(r.some(p => p.id === 'p2')).toBe(false);
  });
  it('le bouton ne compte que les examens nouveaux', () => {
    const diabete = linesFromPack(pack('SUIVI_DIABETE'), refs); // 9 examens
    expect(countNewLines([], diabete)).toBe(9);
    // 5 déjà présents (glycémie, HbA1c, créatinine, DFG, cholestérol total) → « Ajouter 4 examens ».
    const existing = [L('GLYCEMIE_JEUN'), L('HBA1C'), L('CREATININE'), L('DFG'), L('CHOLESTEROL_TOTAL')];
    expect(countNewLines(existing, diabete)).toBe(4);
    expect(countNewLines(diabete, diabete)).toBe(0);
    // Suivi HTA après Suivi du diabète : seuls l'ionogramme et l'ECG sont nouveaux.
    expect(countNewLines(diabete, linesFromPack(pack('SUIVI_HTA'), refs))).toBe(2);
  });
});
