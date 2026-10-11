// Sprint 2c — Empreinte de la fiche patient lue par le moteur de sécurité.
//
// Module PUR (testé par patientEngineSig.test.ts). Toute modification d'un champ que le moteur
// lit change l'empreinte ; l'empreinte fait partie de la clé d'analyse du Vérificateur : le
// verdict est donc invalidé et l'analyse relancée, quel que soit l'écran d'où vient la
// modification (formulaire patient, profil, sections du Sprint 4, Vérificateur).
//
// Champs lus par le moteur : pathologies, allergies (médicamenteuses et alimentaires), type de
// réaction, sexe, date de naissance, grossesse / allaitement, poids.
// Les antécédents, le traitement de fond et les résultats biologiques vivent dans d'autres
// tables : ils ont leurs propres empreintes dans la clé d'analyse.

export interface EnginePatientFields {
  id?: string | null;
  pathologies?: string[] | null;
  allergies_medicaments?: string[] | null;
  allergies_alimentaires?: string[] | null;
  allergies_reactions?: Record<string, string | null | undefined> | null;
  sexe?: string | null;
  date_naissance?: string | null;
  grossesse_statut?: string | null;
  grossesse_ddr?: string | null;
  allaitement?: boolean | null;
  grossesse_maj_le?: string | null;
  poids_kg?: number | string | null;
  poids_date?: string | null;
}

const liste = (xs: string[] | null | undefined) =>
  (xs ?? []).map(x => (x ?? '').trim()).filter(Boolean).sort().join('¦');

/** Empreinte des champs de la fiche lus par le moteur (l'ordre des listes est indifférent). */
export function patientEngineSignature(p: EnginePatientFields | null | undefined): string {
  if (!p) return '';
  const reactions = Object.entries(p.allergies_reactions ?? {})
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k.trim()}=${v}`).sort().join('¦');
  return [
    liste(p.pathologies),
    liste(p.allergies_medicaments),
    liste(p.allergies_alimentaires),
    reactions,
    p.sexe ?? '',
    (p.date_naissance ?? '').slice(0, 10),
    p.grossesse_statut ?? '', (p.grossesse_ddr ?? '').slice(0, 10), String(p.allaitement ?? ''), (p.grossesse_maj_le ?? '').slice(0, 10),
    p.poids_kg === null || p.poids_kg === undefined || p.poids_kg === '' ? '' : String(Number(p.poids_kg)),
    (p.poids_date ?? '').slice(0, 10),
  ].join('#');
}

/** Champs de `patients` dont la modification doit invalider le verdict. */
export const ENGINE_PATIENT_FIELDS = [
  'pathologies', 'allergies_medicaments', 'allergies_alimentaires', 'allergies_reactions', 'sexe', 'date_naissance',
  'grossesse_statut', 'grossesse_ddr', 'allaitement', 'grossesse_maj_le', 'poids_kg', 'poids_date',
] as const;
