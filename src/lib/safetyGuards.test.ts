import { describe, it, expect } from 'vitest';
import {
  excludedFond, fondExclusionLabel, verdictWithFondExclusion, patientFieldLabel, patientMismatchMessage,
  applyMergedLines, alertLogSources, buildInteractionLogRows, countBySource, isLoggable,
  reconcileVerdictWithDisplay, isUndocumentedSeverity, undocumentedLabel, verdictTitle, greenLineAllowed, VERDICT_TITLES,
  type VerdictSeverity,
  type LoggableAlert, type MergedChannel,
} from './safetyGuards';
import {
  requiresDerogation, derogationKind, alertVerdictLevel, derogationSummary, derogationTitle, derogationMotifsFor,
  alertLabel, motifLabel, derogationAlerts, buildDerogationEntries, MOTIF_PREVENTION_GROSSESSE, DEROGATION_MOTIFS,
  type DerogationAlertLike,
} from './derogation';
import {
  classifyPregnancyAlert, pregnancyContext, isMajorTeratogen, isContraceptionRequirement, PREVENTION_NOTE,
  type PregnancyFields,
} from './pregnancyStatus';
import { evaluateAllergies, mergeAllergyAlerts, type AllergieFamilleRow, type RegleAllergie } from './allergyClassEngine';
import allergyData from './regles_allergies.data.json';

// ─── 1. Traitement de fond exclu ─────────────────────────────────────────────
describe('1. traitement de fond exclu de l’analyse', () => {
  const fond = [{ id: 't1', nom: 'INALER' }, { id: 't2', nom: 'KARDEGIC 75 MG' }, { id: 't3', nom: 'GLUCOPHAGE 850 MG' }];

  it('liste des exclus, dans l’ordre du traitement de fond', () => {
    expect(excludedFond(fond, new Set(['t3', 't1'])).map(t => t.nom)).toEqual(['INALER', 'GLUCOPHAGE 850 MG']);
    expect(excludedFond(fond, new Set())).toEqual([]);
    // Une exclusion qui ne correspond plus à aucun traitement (arrêté depuis) ne compte pas.
    expect(excludedFond(fond, new Set(['disparu']))).toEqual([]);
  });
  it('bandeau : « N traitement(s) de fond exclu(s) de l’analyse : X »', () => {
    expect(fondExclusionLabel(['INALER'])).toBe('1 traitement de fond exclu de l’analyse : INALER');
    expect(fondExclusionLabel(['INALER', 'KARDEGIC 75 MG'])).toBe('2 traitements de fond exclus de l’analyse : INALER, KARDEGIC 75 MG');
    expect(fondExclusionLabel([])).toBe('');
  });
  it('jamais « Sécuritaire » sans réserve tant qu’une exclusion est active', () => {
    expect(verdictWithFondExclusion('safe', 1)).toBe('conditional');
    expect(verdictWithFondExclusion('safe', 0)).toBe('safe');
  });
  it('une exclusion n’atténue jamais un verdict plus sévère', () => {
    expect(verdictWithFondExclusion('attention', 2)).toBe('attention');
    expect(verdictWithFondExclusion('dangerous', 2)).toBe('dangerous');
    expect(verdictWithFondExclusion('conditional', 2)).toBe('conditional');
  });
});

// ─── 2. Identité patient ─────────────────────────────────────────────────────
describe('2. identité patient', () => {
  it('le champ affiche toujours le patient sélectionné', () => {
    expect(patientFieldLabel({ prenom: 'Asma', nom: 'Wakrim' })).toBe('Asma Wakrim');
    expect(patientFieldLabel(null)).toBe('');
  });
  it('enregistrement accepté seulement si l’ordonnance porte sur le patient affiché', () => {
    expect(patientMismatchMessage('asma', 'asma')).toBeNull();
  });
  it('ordonnance préparée pour un autre patient → refus avec un message', () => {
    expect(patientMismatchMessage('walid', 'asma')).toMatch(/autre patient/);
  });
  it('patient de l’ordonnance ou patient affiché inconnu → refus', () => {
    expect(patientMismatchMessage(undefined, 'asma')).toMatch(/rouvrez l’aperçu/);
    expect(patientMismatchMessage('asma', null)).toMatch(/Aucun patient sélectionné/);
    expect(patientMismatchMessage(null, null)).not.toBeNull();
  });
});

// ─── 3. Verdict cohérent avec la dérogation ──────────────────────────────────
const alert = (over: Partial<DerogationAlertLike> = {}): DerogationAlertLike => ({
  type: 'contraindication', severite: 'contre_indication', description: 'x', involved: ['BRUFEN 400 MG'],
  condition: 'Ulcère gastroduodénal actif', origin: 'nouveau', ...over,
});
const DOUBLON = alert({ type: 'drug_drug', severite: 'majeure', involved: ['DOLIPRANE 1 G', 'EFFERALGAN'], condition: undefined, channel: 'doublon' });
const DOUBLON_CLASSE = alert({ type: 'drug_drug', severite: 'moderee', involved: ['INEXIUM', 'OMEPRAZOLE'], condition: undefined, channel: 'doublon' });
const INTERACTION = alert({ type: 'drug_drug', severite: 'majeure', involved: ['KARDEGIC', 'SINTROM'], condition: undefined });
const PREVENTION = alert({ severite: 'majeure', involved: ['DEPAKINE'], condition: 'Femme en âge de procréer sans contraception efficace', preventionGrossesse: true });

describe('3. une seule fonction décide de la dérogation et du niveau du verdict', () => {
  it('Doliprane + Efferalgan (même principe actif) : dérogation ET « Prescription à risque »', () => {
    expect(derogationKind(DOUBLON)).toBe('doublon');
    expect(requiresDerogation(DOUBLON)).toBe(true);
    expect(alertVerdictLevel(DOUBLON)).toBe('dangerous');
  });
  it('interaction majeure : dérogation ET niveau maximal', () => {
    expect(derogationKind(INTERACTION)).toBe('interaction_majeure');
    expect(alertVerdictLevel(INTERACTION)).toBe('dangerous');
  });
  it('contre-indication (patient, antécédent, allergie, interaction contre-indiquée)', () => {
    expect(derogationKind(alert())).toBe('contre_indication');
    expect(derogationKind(alert({ channel: 'allergie' }))).toBe('contre_indication');
    expect(derogationKind(alert({ type: 'drug_drug', involved: ['A', 'B'] }))).toBe('contre_indication');
    expect(alertVerdictLevel(alert())).toBe('dangerous');
  });
  it('invariant : dérogation requise ⇔ niveau maximal, pour toutes les combinaisons', () => {
    const types = ['drug_drug', 'contraindication', 'info'] as const;
    const sev = ['contre_indication', 'a_evaluer', 'majeure', 'precaution', 'moderee', 'mineure', 'non_classee', 'info'];
    const origins = ['nouveau', 'mixte', 'fond'] as const;
    for (const type of types) for (const severite of sev) for (const origin of origins)
      for (const channel of [undefined, 'antecedent', 'allergie', 'doublon'])
        for (const pregnancyContext of [false, true]) for (const preventionGrossesse of [false, true]) {
          const a = alert({ type, severite, origin, channel, pregnancyContext, preventionGrossesse });
          expect(requiresDerogation(a)).toBe(alertVerdictLevel(a) === 'dangerous');
          expect(requiresDerogation(a)).toBe(derogationKind(a) !== null);
        }
  });
  it('sans dérogation : « Attention » pour les alertes réelles, rien pour le reste', () => {
    expect(alertVerdictLevel(DOUBLON_CLASSE)).toBe('attention');
    expect(alertVerdictLevel(alert({ severite: 'majeure' }))).toBe('attention'); // CI relative
    expect(alertVerdictLevel(alert({ severite: 'a_evaluer' }))).toBe('attention');
    expect(alertVerdictLevel(alert({ severite: 'precaution' }))).toBe('attention');
    expect(alertVerdictLevel(alert({ severite: 'mineure' }))).toBe('none');
    expect(alertVerdictLevel(alert({ type: 'info', severite: 'info' }))).toBe('none');
  });
  it('jamais de dérogation pour une alerte préexistante ou le bloc grossesse replié', () => {
    expect(derogationKind({ ...DOUBLON, origin: 'fond' })).toBeNull();
    expect(derogationKind(alert({ pregnancyContext: true }))).toBeNull();
  });
  it('libellés adaptés au type', () => {
    expect(alertLabel(DOUBLON)).toBe('DOLIPRANE 1 G + EFFERALGAN — doublon thérapeutique');
    expect(alertLabel(INTERACTION)).toBe('KARDEGIC + SINTROM — interaction majeure');
    expect(alertLabel(alert())).toBe('BRUFEN 400 MG — Ulcère gastroduodénal actif');
    expect(derogationSummary([DOUBLON])).toBe('1 doublon thérapeutique');
    expect(derogationSummary([INTERACTION, { ...INTERACTION, involved: ['A', 'B'] }])).toBe('2 interactions majeures');
    expect(derogationSummary([alert(), DOUBLON, INTERACTION])).toBe('1 contre-indication, 1 interaction majeure et 1 doublon thérapeutique');
    expect(derogationSummary([DOUBLON_CLASSE])).toBe('');
    expect(derogationTitle([DOUBLON])).toBe('Doublon thérapeutique');
    expect(derogationTitle([INTERACTION])).toBe('Interaction majeure');
    expect(derogationTitle([alert()])).toBe('Prescription contre-indiquée');
    expect(derogationTitle([alert(), DOUBLON])).toBe('Prescription à risque');
  });
});

// ─── 4. Tératogènes majeurs ──────────────────────────────────────────────────
const TODAY = new Date(2026, 9, 15);
const TERATOGENES = ['valpro', 'divalpro', 'isotretinoin', 'acitretin', 'methotrexat', 'mycophenol', 'thalidomid', 'acenocoumarol', 'warfarin', 'fluindion'];
const DEPAKINE = { nom: 'DEPAKINE CHRONO 500 MG', dci: 'VALPROATE DE SODIUM // ACIDE VALPROIQUE', ingredients: ['valproic acid'] };
const BRUFEN = { nom: 'BRUFEN 400 MG', dci: 'IBUPROFÈNE', ingredients: ['ibuprofen'] };
const CONTRACEPTION = 'Femme en âge de procréer sans contraception efficace';
const classify = (med: typeof BRUFEN, condition: string, p: PregnancyFields, listeChargee = true) => {
  const avere = listeChargee && isMajorTeratogen(med, TERATOGENES);
  return classifyPregnancyAlert(condition, pregnancyContext(p, TODAY), !listeChargee || avere, avere);
};
const statuts: PregnancyFields[] = [
  {}, { grossesse_statut: 'inconnu' },
  { grossesse_statut: 'non_enceinte', grossesse_maj_le: '2026-10-10' },
  { grossesse_statut: 'non_enceinte', grossesse_maj_le: '2026-01-01' },
  { grossesse_statut: 'enceinte', grossesse_ddr: '2026-07-01', grossesse_maj_le: '2026-10-10' },
];

describe('4. tératogène majeur : exigence de contraception toujours visible', () => {
  it('Depakine + « sans contraception efficace » : alerte FERME quel que soit le statut déclaré', () => {
    for (const p of statuts) {
      expect(classify(DEPAKINE, CONTRACEPTION, p)).toEqual({ mode: 'ferme', note: PREVENTION_NOTE });
    }
    expect(classify(DEPAKINE, 'Femme en âge de procréer sans contraception', {}).mode).toBe('ferme');
  });
  it('elle déclenche la dérogation et impose le niveau maximal', () => {
    expect(derogationKind(PREVENTION)).toBe('prevention_grossesse');
    expect(requiresDerogation(PREVENTION)).toBe(true);
    expect(alertVerdictLevel(PREVENTION)).toBe('dangerous');
    expect(derogationSummary([PREVENTION])).toBe('1 exigence de contraception (tératogène majeur)');
    expect(derogationTitle([PREVENTION])).toBe('Tératogène majeur — contraception exigée');
  });
  it('motif « Programme de prévention de la grossesse respecté » proposé pour ce cas seulement', () => {
    expect(derogationMotifsFor([PREVENTION])[0]).toEqual(MOTIF_PREVENTION_GROSSESSE);
    expect(derogationMotifsFor([PREVENTION])).toHaveLength(DEROGATION_MOTIFS.length + 1);
    expect(derogationMotifsFor([DOUBLON])).toEqual(DEROGATION_MOTIFS);
    expect(motifLabel({ motif: 'prevention_grossesse', motifAutre: null }))
      .toBe('Programme de prévention de la grossesse respecté (contraception efficace)');
    const entries = buildDerogationEntries(derogationAlerts([PREVENTION]), {
      signature: 's', motif: 'prevention_grossesse', motifAutre: null, commentaire: null, confirmedAt: '2026-10-15T10:00:00Z',
    });
    expect(entries[0]).toMatchObject({ medicament: 'DEPAKINE', motif: MOTIF_PREVENTION_GROSSESSE.label });
  });
  it('médicament non tératogène : « en âge de procréer » reste dans le bloc replié', () => {
    for (const p of statuts) expect(classify(BRUFEN, CONTRACEPTION, p).mode).toBe('conditionnelle');
  });
  it('liste des tératogènes non chargée : rien n’est durci à l’aveugle (ni rassuré)', () => {
    expect(classify(DEPAKINE, CONTRACEPTION, {}, false).mode).toBe('conditionnelle');
    expect(classify(DEPAKINE, 'Grossesse', { grossesse_statut: 'non_enceinte', grossesse_maj_le: '2026-10-10' }, false).mode).toBe('conditionnelle');
  });
  it('le reste du bloc grossesse est inchangé pour un tératogène', () => {
    expect(classify(DEPAKINE, 'Grossesse', {}).mode).toBe('conditionnelle');
    expect(classify(DEPAKINE, 'Grossesse', { grossesse_statut: 'non_enceinte', grossesse_maj_le: '2026-10-10' }).mode).toBe('conditionnelle');
    expect(classify(DEPAKINE, 'Grossesse', { grossesse_statut: 'enceinte', grossesse_ddr: '2026-07-01', grossesse_maj_le: '2026-10-10' }).mode).toBe('ferme');
    expect(classify(DEPAKINE, 'Allaitement', {}).mode).toBe('conditionnelle');
    expect(classify(BRUFEN, 'Grossesse', { grossesse_statut: 'non_enceinte', grossesse_maj_le: '2026-10-10' }).mode).toBe('rassuree');
  });
  it('reconnaissance du libellé', () => {
    expect(isContraceptionRequirement(CONTRACEPTION)).toBe(true);
    expect(isContraceptionRequirement('Femme en âge de procréer (HTA chronique)')).toBe(true);
    expect(isContraceptionRequirement('Grossesse (3e trimestre)')).toBe(false);
    expect(isContraceptionRequirement('Allaitement')).toBe(false);
  });
});

// ─── 5. Journalisation ───────────────────────────────────────────────────────
type Alert = LoggableAlert & { condition?: string; description?: string; also?: string[] };
const familles = allergyData.familles as AllergieFamilleRow[];
const regles: RegleAllergie[] = allergyData.regles.map((r, i) => ({
  ...r, id: `r${i}`, actif: true, severite: r.severite as RegleAllergie['severite'], criteres: r.criteres as RegleAllergie['criteres'],
}));
const IDS = { doctorId: 'doc', patientId: 'pat' };
const SEV = { ci_absolue: 'contre_indication', a_evaluer: 'a_evaluer', precaution: 'precaution' } as Record<string, string>;

describe('5. toute alerte affichée est journalisée avec sa source', () => {
  it('cas de la production : Augmentin, patiente allergique aux pénicillines, carte de la base déjà présente', () => {
    // Carte produite par le matching CI existant (aucun canal), au moins aussi sévère.
    const alerts: Alert[] = [{
      type: 'contraindication', severite: 'contre_indication', involved: ['AUGMENTIN'],
      condition: 'Allergie aux pénicillines', origin: 'nouveau',
    }];
    const canal = evaluateAllergies(
      [{ id: 'augmentin', nom: 'AUGMENTIN', dci: 'AMOXICILLINE // ACIDE CLAVULANIQUE', ingredients: ['amoxicilline', 'clavulanic acid'] }],
      [{ label: 'Amoxicilline' }], familles, regles,
    );
    expect(canal).toHaveLength(1);
    const merged = mergeAllergyAlerts(alerts, canal);
    // L'alerte du canal est absorbée par la carte existante : c'était la cause de l'absence de ligne.
    expect(merged.standalone).toHaveLength(0);
    applyMergedLines(alerts, merged.alsoByIndex, 'allergie');
    expect(alerts[0].alsoChannels).toEqual(['allergie']);
    expect(alerts[0].also?.length).toBe(1);

    const rows = buildInteractionLogRows(alerts, IDS);
    expect(countBySource(rows)).toEqual({ nouveau: 1, allergie: 1 });
    expect(rows.find(r => r.source === 'allergie')).toEqual({
      doctor_id: 'doc', patient_id: 'pat', medicament_a: 'AUGMENTIN', medicament_b: null, risk_level: 'dangerous', source: 'allergie',
    });
  });

  it('alerte d’allergie seule (aucune carte de la base) : une ligne « allergie »', () => {
    const canal = evaluateAllergies(
      [{ id: 'amoxil', nom: 'AMOXIL 1 G', dci: 'AMOXICILLINE', ingredients: ['amoxicilline'] }],
      [{ label: 'Amoxicilline' }], familles, regles,
    );
    const merged = mergeAllergyAlerts([] as Alert[], canal);
    const alerts: Alert[] = merged.standalone.map(aa => ({
      type: 'contraindication', severite: SEV[aa.severite], involved: [aa.medNom], channel: 'allergie', origin: 'nouveau',
    }));
    expect(countBySource(buildInteractionLogRows(alerts, IDS))).toEqual({ allergie: 1 });
  });

  it('enregistrement simulé : tous les canaux, fusionnés ou non — lignes attendues par source', () => {
    const alerts: Alert[] = [
      // interaction de la RPC, nouveaux médicaments
      { type: 'drug_drug', severite: 'moderee', involved: ['BRUFEN 400 MG', 'TRIATEC'], origin: 'nouveau' },
      // interaction avec le traitement de fond
      { type: 'drug_drug', severite: 'majeure', involved: ['BRUFEN 400 MG', 'SINTROM 4 MG'], origin: 'mixte' },
      // canal antécédents, carte propre
      { type: 'contraindication', severite: 'contre_indication', involved: ['BRUFEN 400 MG'], channel: 'antecedent', origin: 'nouveau' },
      // canal allergies, carte propre
      { type: 'contraindication', severite: 'a_evaluer', involved: ['OROKEN 200 MG'], channel: 'allergie', origin: 'nouveau' },
      // canal doublons, carte propre
      { type: 'drug_drug', severite: 'majeure', involved: ['DOLIPRANE 1 G', 'EFFERALGAN'], channel: 'doublon', origin: 'nouveau' },
      // grossesse : alerte ferme (patiente enceinte), exigence de contraception, bloc replié
      { type: 'contraindication', severite: 'contre_indication', involved: ['BRUFEN 400 MG'], pregnancyFirm: true, origin: 'nouveau' },
      { type: 'contraindication', severite: 'majeure', involved: ['DEPAKINE'], pregnancyFirm: true, preventionGrossesse: true, origin: 'nouveau' },
      { type: 'contraindication', severite: 'contre_indication', involved: ['TRIATEC'], pregnancyContext: true, origin: 'nouveau' },
      // cartes de la base ayant absorbé un canal
      { type: 'contraindication', severite: 'contre_indication', involved: ['VOLTARENE'], origin: 'nouveau' },
      { type: 'contraindication', severite: 'contre_indication', involved: ['AUGMENTIN'], origin: 'nouveau' },
      { type: 'drug_drug', severite: 'contre_indication', involved: ['COVERSYL', 'APROVEL'], origin: 'nouveau' },
      // jamais journalisées : préexistante, information, non classée
      { type: 'drug_drug', severite: 'majeure', involved: ['KARDEGIC', 'SINTROM'], origin: 'fond' },
      { type: 'info', severite: 'info', involved: ['X'], origin: 'nouveau' },
      { type: 'drug_drug', severite: 'non_classee', involved: ['A', 'B'], origin: 'nouveau' },
    ];
    applyMergedLines(alerts, new Map([[8, ['antécédent de ulcère gastroduodénal']]]), 'antecedent');
    applyMergedLines(alerts, new Map([[9, ['allergie : Amoxicilline']]]), 'allergie');
    applyMergedLines(alerts, new Map([[10, ['même classe (IEC + ARA2)']]]), 'doublon');

    const rows = buildInteractionLogRows(alerts, IDS);
    expect(countBySource(rows)).toEqual({
      nouveau: 4,              // 1 interaction + 3 cartes de la base (ligne d'origine conservée)
      avec_traitement_fond: 1,
      antecedent: 2,           // 1 carte propre + 1 fusionnée
      allergie: 2,             // 1 carte propre + 1 fusionnée
      doublon: 2,              // 1 carte propre + 1 fusionnée
      grossesse: 3,
    });
    expect(rows).toHaveLength(14);
    // Aucune alerte journalisable n'est perdue : chacune a au moins une ligne.
    const logged = new Set(rows.map(r => r.medicament_a));
    for (const a of alerts.filter(isLoggable)) expect(logged.has(a.involved[0])).toBe(true);
    // Antécédent / allergie : pas de second médicament ; doublon : la paire.
    expect(rows.filter(r => r.source === 'antecedent' || r.source === 'allergie').every(r => r.medicament_b === null)).toBe(true);
    expect(rows.filter(r => r.source === 'doublon').map(r => r.medicament_b)).toEqual(['EFFERALGAN', 'APROVEL']);
    expect(rows.every(r => r.doctor_id === 'doc' && r.patient_id === 'pat')).toBe(true);
  });

  it('plusieurs canaux fusionnés dans la même carte : une ligne par canal, sans doublon', () => {
    const alerts: Alert[] = [{ type: 'contraindication', severite: 'contre_indication', involved: ['BRUFEN 400 MG'], origin: 'nouveau' }];
    for (const c of ['antecedent', 'allergie', 'allergie'] as MergedChannel[]) applyMergedLines(alerts, new Map([[0, ['x']]]), c);
    expect(alertLogSources(alerts[0])).toEqual(['nouveau', 'antecedent', 'allergie']);
    expect(alerts[0].also).toHaveLength(3);
  });

  it('niveau de risque : CI et majeure → dangerous ; le reste → attention', () => {
    const risk = (severite: string) => buildInteractionLogRows([{ type: 'contraindication', severite, involved: ['X'] }], IDS)[0]?.risk_level;
    expect(risk('contre_indication')).toBe('dangerous');
    expect(risk('majeure')).toBe('dangerous');
    for (const s of ['a_evaluer', 'precaution', 'moderee', 'mineure']) expect(risk(s)).toBe('attention');
  });
});

// ─── Sprint 4g — titre du verdict cohérent avec la liste affichée ────────────
describe('4g. le titre du verdict ne contredit jamais la liste', () => {
  const SEVERITIES: VerdictSeverity[] = ['safe', 'conditional', 'attention', 'dangerous'];
  const RANK: Record<VerdictSeverity, number> = { safe: 0, conditional: 1, attention: 2, dangerous: 3 };
  const VERT = VERDICT_TITLES.safe;

  it('cas de la production : INALER + Doliprane, interaction « non documentée » listée', () => {
    const r = reconcileVerdictWithDisplay('safe', { cartes: 1, nonDocumentees: 1, mineures: 0, infos: 0 });
    expect(r).toEqual({ severity: 'conditional', lowered: true, note: '1 interaction de sévérité non documentée — à évaluer' });
    expect(verdictTitle(r.severity)).toBe('Sécuritaire sous réserve');
    expect(undocumentedLabel(2)).toBe('2 interactions de sévérité non documentée — à évaluer');
  });

  it('toutes les combinaisons : « Aucune interaction détectée » ⇔ verdict vert ET rien d’affiché', () => {
    let verts = 0;
    for (const severity of SEVERITIES)
      for (const nonDocumentees of [0, 1, 3]) for (const mineures of [0, 1, 2]) for (const autres of [0, 1, 4]) for (const infos of [0, 1]) {
        const cartes = nonDocumentees + mineures + autres;
        const r = reconcileVerdictWithDisplay(severity, { cartes, nonDocumentees, mineures, infos });
        const titre = verdictTitle(r.severity);
        // 1. le titre vert n'existe que si la liste affichée est réellement vide
        if (titre === VERT) {
          verts++;
          expect(severity).toBe('safe');
          expect(cartes).toBe(0);
          expect(infos).toBe(0);
        }
        if (severity === 'safe' && cartes === 0 && infos === 0) expect(titre).toBe(VERT);
        // 2. un verdict n'est jamais atténué
        expect(RANK[r.severity]).toBeGreaterThanOrEqual(RANK[severity]);
        // 3. une sévérité non documentée est toujours dite, et donne au minimum « sous réserve »
        if (nonDocumentees > 0) {
          expect(r.note).toBe(undocumentedLabel(nonDocumentees));
          expect(RANK[r.severity]).toBeGreaterThanOrEqual(RANK.conditional);
        }
        // 4. un verdict vert abaissé porte toujours sa raison
        if (r.lowered) { expect(severity).toBe('safe'); expect(r.severity).toBe('conditional'); expect(r.note).toBeTruthy(); }
      }
    expect(verts).toBe(1);
  });

  it('raison affichée selon ce qui est listé', () => {
    const note = (s: Partial<{ cartes: number; nonDocumentees: number; mineures: number; infos: number }>) =>
      reconcileVerdictWithDisplay('safe', { cartes: 0, nonDocumentees: 0, mineures: 0, infos: 0, ...s }).note;
    expect(note({ cartes: 2, mineures: 2 })).toBe('2 interactions mineures signalées');
    expect(note({ cartes: 1 })).toBe('1 alerte affichée — à évaluer');
    expect(note({ infos: 1 })).toBe('1 médicament sans DCI rattachée — vérification limitée');
    expect(note({})).toBeNull();
    // Verdict déjà sévère : seule la sévérité non documentée est ajoutée.
    expect(reconcileVerdictWithDisplay('attention', { cartes: 3, nonDocumentees: 1, mineures: 1, infos: 0 }))
      .toEqual({ severity: 'attention', lowered: false, note: '1 interaction de sévérité non documentée — à évaluer' });
    expect(reconcileVerdictWithDisplay('dangerous', { cartes: 2, nonDocumentees: 0, mineures: 1, infos: 0 }).note).toBeNull();
  });

  it('sévérité non documentée ou inconnue', () => {
    expect(isUndocumentedSeverity('non_classee')).toBe(true);
    expect(isUndocumentedSeverity('inconnue')).toBe(true);
    expect(isUndocumentedSeverity('')).toBe(true);
    expect(isUndocumentedSeverity(null)).toBe(true);
    for (const s of ['contre_indication', 'a_evaluer', 'majeure', 'precaution', 'moderee', 'mineure', 'info']) {
      expect(isUndocumentedSeverity(s)).toBe(false);
    }
  });

  it('titre particulier (« Vérification impossible ») conservé, sans pictogramme', () => {
    expect(verdictTitle('attention', '⚠ Vérification impossible')).toBe('Vérification impossible');
    expect(verdictTitle('safe', undefined)).toBe(VERT);
    expect(verdictTitle('dangerous')).toBe('Prescription à risque');
  });

  it('ligne verte : jamais avec une carte, un bandeau d’exclusion ou une réserve — toutes combinaisons', () => {
    let affichee = 0;
    for (const severity of SEVERITIES) for (const cartes of [0, 1]) for (const fondExclus of [0, 1]) for (const reserves of [0, 2]) {
      const ok = greenLineAllowed({ severity, cartes, fondExclus, reserves });
      expect(ok).toBe(severity === 'safe' && cartes === 0 && fondExclus === 0 && reserves === 0);
      if (ok) affichee++;
    }
    expect(affichee).toBe(1);
  });
});
