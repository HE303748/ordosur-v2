import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { patientEngineSignature, ENGINE_PATIENT_FIELDS, type EnginePatientFields } from './patientEngineSig';

// Sprint 2c — toute modification de la fiche qui touche le moteur invalide le verdict.

const BASE: EnginePatientFields = {
  id: 'p1', pathologies: ['Diabète de type 2', 'Hypertension artérielle'], allergies_medicaments: ['Aspirine'],
  allergies_alimentaires: ['Arachides'], allergies_reactions: { Aspirine: 'oui' }, sexe: 'F', date_naissance: '1980-05-12',
  grossesse_statut: 'non_enceinte', grossesse_ddr: null, allaitement: false, grossesse_maj_le: '2026-10-01T09:00:00Z',
  poids_kg: 72, poids_date: '2026-09-01',
};
const sig = (over: Partial<EnginePatientFields> = {}) => patientEngineSignature({ ...BASE, ...over });

describe('empreinte de la fiche lue par le moteur', () => {
  it.each<[string, Partial<EnginePatientFields>]>([
    ['pathologie ajoutée', { pathologies: [...BASE.pathologies!, 'Asthme'] }],
    ['pathologie retirée', { pathologies: ['Hypertension artérielle'] }],
    ['pathologie remplacée (libellé normalisé)', { pathologies: ['Diabète de type 1', 'Hypertension artérielle'] }],
    ['allergie médicamenteuse', { allergies_medicaments: ['Aspirine', 'Amoxicilline'] }],
    ['allergie alimentaire', { allergies_alimentaires: [] }],
    ['type de réaction', { allergies_reactions: { Aspirine: 'non' } }],
    ['sexe', { sexe: 'M' }],
    ['date de naissance', { date_naissance: '1981-05-12' }],
    ['grossesse', { grossesse_statut: 'enceinte', grossesse_ddr: '2026-08-01' }],
    ['allaitement', { allaitement: true }],
    ['date de déclaration du statut', { grossesse_maj_le: '2026-10-11T09:00:00Z' }],
    ['poids', { poids_kg: 75 }],
    ['date du poids', { poids_date: '2026-10-11' }],
  ])('%s → l’empreinte change (verdict invalidé)', (_nom, over) => {
    expect(sig(over)).not.toBe(sig());
  });

  it('ce que le moteur ne lit pas ne change pas l’empreinte (pas de relance inutile)', () => {
    const autres = { ...BASE, telephone: '0600000000', adresse: 'Rabat', pathologies_depuis: { Asthme: 2012 }, nom: 'Idrissi' } as EnginePatientFields;
    expect(patientEngineSignature(autres)).toBe(sig());
    // Ordre des listes, espaces, forme du nombre : indifférents.
    expect(sig({ pathologies: ['Hypertension artérielle', ' Diabète de type 2 '] })).toBe(sig());
    expect(sig({ poids_kg: '72.0' })).toBe(sig());
    expect(sig({ allergies_reactions: { Aspirine: 'oui', Ibuprofène: null } })).toBe(sig());
  });

  it('patient absent → empreinte vide ; deux listes ne se confondent pas', () => {
    expect(patientEngineSignature(null)).toBe('');
    expect(sig({ pathologies: ['Aspirine'], allergies_medicaments: [] })).not.toBe(sig({ pathologies: [], allergies_medicaments: ['Aspirine'] }));
  });

  it('les champs couverts sont ceux de la consigne', () => {
    expect([...ENGINE_PATIENT_FIELDS].sort()).toEqual([
      'allaitement', 'allergies_alimentaires', 'allergies_medicaments', 'allergies_reactions', 'date_naissance', 'grossesse_ddr',
      'grossesse_maj_le', 'grossesse_statut', 'pathologies', 'poids_date', 'poids_kg', 'sexe',
    ]);
  });
});

describe('branchement : clé d’analyse et synchronisation', () => {
  const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
  const dash = SRC('../pages/DoctorDashboard.tsx');

  it('l’empreinte fait partie de la clé d’analyse : la modifier invalide le verdict et relance l’analyse', () => {
    expect(dash).toContain('const patientEngineSig = patientEngineSignature(selectedPatient);');
    expect(dash).toContain("return `${selectedPatient?.id ?? ''}#${patientEngineSig}#");
    expect(dash).toMatch(/\}, \[selectedPatient\?\.id, patientEngineSig, selectedMeds,/);
    // Clé différente → verdict effacé et analyse automatique relancée (mécanisme existant du Sprint 4d).
    expect(dash).toContain('if (result && (analyzedKey !== currentAnalysisKey || result.runId !== alertsRunId)) {');
  });
  it('le Vérificateur relit la fiche en base quand le sujet « patient » est publié', () => {
    expect(dash).toContain("useDataSync(['patient'], () => {");
    expect(dash).toContain("supabase.from('patients').select('*').eq('id', pid).maybeSingle()");
    expect(SRC('./dataSync.ts')).toContain("| 'patient'");
  });
  it('chaque écran qui écrit la fiche publie « patient » ; antécédents et bilans ont déjà leur sujet', () => {
    expect(dash.match(/notifyDataChanged\('patient'\)/g)!.length).toBeGreaterThanOrEqual(2); // formulaire patient + profil
    expect(SRC('../components/ui/AntecedentsSection.tsx')).toContain("notifyDataChanged('patient')");   // « ajouter aux pathologies »
    expect(SRC('../components/ui/AntecedentsSection.tsx')).toContain("notifyDataChanged('antecedents')");
    expect(SRC('../components/PregnancyStatusEditor.tsx')).toContain("notifyDataChanged('patient')");   // grossesse / allaitement
    expect(SRC('../hooks/useRenal.ts')).toContain("notifyDataChanged('patient')");                      // poids
    expect(SRC('../components/bilans/QuickResultInput.tsx')).toContain("notifyDataChanged('bilans')");  // résultats biologiques
  });
});
