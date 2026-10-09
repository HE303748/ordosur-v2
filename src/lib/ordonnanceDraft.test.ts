import { describe, it, expect } from 'vitest';
import {
  evaluateDraftOffer, draftMedsKey, isDraftWorthOffering, formHasContent, draftLinesForSelection, draftSummary,
  draftBelongsTo, draftResumeBlockReason, draftBannerLabel, draftMedsLabel,
  type OrdonnanceDraft, type DraftForm,
} from './ordonnanceDraft';

const line = (id: string, nom: string, extra: Partial<DraftForm['medications'][number]> = {}) =>
  ({ id, nom, posologie: '', duree: '', quantite: '', ...extra });

const form = (meds: DraftForm['medications']): DraftForm =>
  ({ motif: '', medications: meds, remarks: '', appointmentDate: '', appointmentTime: '' });

function draft(over: Partial<OrdonnanceDraft> = {}): OrdonnanceDraft {
  return {
    v: 1, savedAt: new Date(2026, 9, 8, 14, 32).getTime(), doctorId: 'doc', patientId: 'pat-1',
    selectedMeds: [{ id: 'doliprane', nom: 'DOLIPRANE 1 G' }],
    form: form([line('chk-doliprane', 'DOLIPRANE 1 G', { posologie: '1 cp x 3/j' })]),
    formOpen: true,
    ...over,
  };
}

describe('reprise du brouillon — jamais automatique, jamais d’écrasement', () => {
  it('aucun brouillon ou brouillon vide → rien à proposer', () => {
    expect(evaluateDraftOffer(null, 'pat-1', [])).toBe('none');
    expect(evaluateDraftOffer(draft({ selectedMeds: [], form: form([]) }), 'pat-1', [])).toBe('none');
    expect(isDraftWorthOffering(draft({ selectedMeds: [], form: null }))).toBe(false);
  });

  it('brouillon d’un autre patient → jamais proposé', () => {
    expect(evaluateDraftOffer(draft(), 'pat-2', [])).toBe('none');
  });

  it('sélection vide → « Reprendre / Supprimer »', () => {
    expect(evaluateDraftOffer(draft(), 'pat-1', [])).toBe('resume');
  });

  it('même sélection que le brouillon → reprise possible', () => {
    expect(evaluateDraftOffer(draft(), 'pat-1', [{ id: 'doliprane' }])).toBe('resume');
  });

  it('sélection en cours différente (Kardegic) → conflit : le brouillon ne l’écrase pas', () => {
    expect(evaluateDraftOffer(draft(), 'pat-1', [{ id: 'kardegic' }])).toBe('conflict');
    expect(evaluateDraftOffer(draft(), 'pat-1', [{ id: 'doliprane' }, { id: 'kardegic' }])).toBe('conflict');
  });

  it('saisie déjà en cours dans le formulaire → conflit', () => {
    expect(evaluateDraftOffer(draft(), 'pat-1', [{ id: 'doliprane' }], true)).toBe('conflict');
  });

  it('aucun patient sélectionné (après F5) → proposé, jamais appliqué d’office', () => {
    expect(evaluateDraftOffer(draft(), null, [])).toBe('resume');
  });

  it('clé de sélection indépendante de l’ordre', () => {
    expect(draftMedsKey([{ id: 'b' }, { id: 'a' }])).toBe(draftMedsKey([{ id: 'a' }, { id: 'b' }]));
  });
});

describe('brouillon fantôme', () => {
  // Scénario du constat : ancien brouillon « doliprane 1000 » ; sélection actuelle = Kardegic.
  const ancien = form([
    line('chk-doliprane', 'DOLIPRANE 1 G', { posologie: '1 cp x 3/j' }),
    line('med-17', 'doliprane 1000', { addedInForm: true }),
  ]);

  it('une ligne d’un médicament retiré de la sélection ne revient jamais', () => {
    const kept = draftLinesForSelection(ancien, [{ id: 'kardegic' }]);
    expect(kept.map(l => l.id)).toEqual(['med-17']);
    expect(kept.some(l => l.id === 'chk-doliprane')).toBe(false);
  });

  it('les lignes de la sélection actuelle sont conservées', () => {
    expect(draftLinesForSelection(ancien, [{ id: 'doliprane' }]).map(l => l.id)).toEqual(['chk-doliprane', 'med-17']);
  });

  it('formulaire « non vide » : une ligne nommée ou une posologie suffit', () => {
    expect(formHasContent(form([]))).toBe(false);
    expect(formHasContent(form([line('med-1', '')]))).toBe(false);
    expect(formHasContent(form([line('med-1', 'Kardegic')]))).toBe(true);
    expect(formHasContent({ ...form([]), motif: 'Douleur' })).toBe(true);
    expect(formHasContent(null)).toBe(false);
  });

  it('libellé du bandeau : date, heure et nombre de médicaments', () => {
    expect(draftSummary(draft())).toBe('08/10 14:32 (1 médicament)');
    expect(draftSummary(draft({ selectedMeds: [{ id: 'a', nom: 'A' }, { id: 'b', nom: 'B' }] }))).toBe('08/10 14:32 (2 médicaments)');
  });
});

// ─── Sprint 4g — brouillon d'un autre patient : jamais proposé ni repris ─────
describe('un brouillon n’appartient qu’à son patient', () => {
  const WALID = 'walid';
  const ASMA = 'asma';
  const deWalid = draft({ patientId: WALID, savedAt: new Date(2026, 9, 9, 3, 0).getTime() });

  it('jamais PROPOSÉ sous un autre patient, quelle que soit la sélection en cours', () => {
    for (const meds of [[], [{ id: 'doliprane' }], [{ id: 'brufen' }], [{ id: 'doliprane' }, { id: 'brufen' }]]) {
      for (const formEnCours of [false, true]) {
        expect(evaluateDraftOffer(deWalid, ASMA, meds, formEnCours)).toBe('none');
      }
    }
    expect(draftBelongsTo(deWalid, ASMA)).toBe(false);
  });
  it('proposé pour son propre patient', () => {
    expect(draftBelongsTo(deWalid, WALID)).toBe(true);
    expect(evaluateDraftOffer(deWalid, WALID, [])).toBe('resume');
    expect(evaluateDraftOffer(deWalid, WALID, [{ id: 'doliprane' }])).toBe('resume');
    expect(evaluateDraftOffer(deWalid, WALID, [{ id: 'brufen' }])).toBe('conflict');
  });
  it('un identifiant absent ne correspond jamais', () => {
    expect(draftBelongsTo(deWalid, null)).toBe(false);
    expect(draftBelongsTo(deWalid, undefined)).toBe(false);
    expect(draftBelongsTo(null, WALID)).toBe(false);
    expect(draftBelongsTo(draft({ patientId: '' }), '')).toBe(false);
  });
  it('jamais REPRIS si le patient sélectionné n’est pas celui du brouillon (garde-fou de la reprise)', () => {
    expect(draftResumeBlockReason(deWalid, ASMA, WALID)).toMatch(/autre patient/);
    expect(draftResumeBlockReason(deWalid, WALID, WALID)).toBeNull();
  });
  it('aucun patient sélectionné : reprise permise (elle sélectionne le patient du brouillon)', () => {
    expect(draftResumeBlockReason(deWalid, null, WALID)).toBeNull();
  });
  it('patient du brouillon introuvable ou incohérent, brouillon absent → refus', () => {
    expect(draftResumeBlockReason(deWalid, null, null)).toMatch(/introuvable/);
    expect(draftResumeBlockReason(deWalid, null, ASMA)).toMatch(/introuvable/);
    expect(draftResumeBlockReason(deWalid, ASMA, ASMA)).not.toBeNull();
    expect(draftResumeBlockReason(null, WALID, WALID)).not.toBeNull();
  });
  it('le bandeau nomme toujours le patient et les médicaments', () => {
    expect(draftBannerLabel(deWalid, { prenom: 'Walid', nom: 'Idrissi' })).toBe('Brouillon pour Walid Idrissi du 09/10 03:00 — DOLIPRANE 1 G');
    const libelle = draft({ patientId: WALID, savedAt: new Date(2026, 9, 9, 3, 0).getTime(), selectedMeds: [{ id: 'd', nom: 'DOLIPRANE', label: 'Doliprane 1 G' }] });
    expect(draftBannerLabel(libelle, { prenom: 'Walid', nom: 'Idrissi' })).toBe('Brouillon pour Walid Idrissi du 09/10 03:00 — Doliprane 1 G');
  });
  it('médicaments : sélection ou lignes du formulaire, abrégés au-delà de 3', () => {
    const many = draft({ selectedMeds: ['A', 'B', 'C', 'D', 'E'].map(n => ({ id: n, nom: n })) });
    expect(draftMedsLabel(many)).toBe('A, B, C +2');
    expect(draftMedsLabel(draft({ selectedMeds: [], form: form([line('m1', 'Brufen 400 mg'), line('m2', '  ')]) }))).toBe('Brufen 400 mg');
    expect(draftMedsLabel(draft({ selectedMeds: [], form: null }))).toBe('aucun médicament');
  });
});
