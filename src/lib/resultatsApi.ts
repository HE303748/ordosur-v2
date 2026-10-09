import { supabase } from './supabase';
import { fetchAllRows } from './fetchAllRows';
import { lastUnitsBySerie, type ResultatExamen, type ResultatPayload } from './resultatsLogic';

// Sprint 6A — Accès aux résultats d'examens.
// Jamais de suppression physique : une erreur s'archive avec un motif (la correction est une
// nouvelle ligne). doctor_id = doctors.id (PK), jamais auth.uid().

const COLS = 'id, patient_id, org_id, doctor_id, examen_code, libelle, parametre, type, categorie, demande_ligne_id, date_prelevement, valeur_num, valeur_texte, unite_saisie, valeur_ref, unite_ref, borne_basse, borne_haute, interpretation, a_revoir, laboratoire, commentaire, vu_le, vu_par_doctor_id, vu_commentaire, archive, archive_motif, archive_par_doctor_id, archive_le, created_at';

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** PostgREST peut renvoyer un `numeric` sous forme de chaîne : toujours des nombres côté client. */
function normalize(r: ResultatExamen): ResultatExamen {
  return {
    ...r,
    valeur_num: num(r.valeur_num), valeur_ref: num(r.valeur_ref),
    borne_basse: num(r.borne_basse), borne_haute: num(r.borne_haute),
  };
}

/** Tous les résultats d'un patient, archivés compris (historique des corrections). */
export async function loadPatientResultats(patientId: string): Promise<ResultatExamen[]> {
  const rows = await fetchAllRows<ResultatExamen>(
    (from, to) => supabase.from('resultats_examens').select(COLS).eq('patient_id', patientId)
      .order('date_prelevement', { ascending: false }).order('created_at', { ascending: false }).range(from, to),
    { label: 'resultats_examens', maxPages: 5 },
  );
  return rows.map(normalize);
}

/**
 * Enregistre un lot de résultats dans UNE transaction. `correction` archive l'ancien
 * résultat (motif obligatoire) dans la même transaction. Renvoie les identifiants créés.
 */
export async function saveResultats(payloads: ResultatPayload[], correction?: { archiverId: string; motif: string }): Promise<string[]> {
  const { data, error } = await supabase.rpc('enregistrer_resultats_examens', {
    p_resultats: payloads,
    p_archiver_id: correction?.archiverId ?? null,
    p_motif: correction?.motif ?? null,
  });
  if (error) throw new Error(error.message || "Les résultats n'ont pas pu être enregistrés");
  return (data as string[] | null) ?? [];
}

/** « Marquer comme vu » (individuel ou groupé), commentaire facultatif. */
export async function markVus(ids: string[], doctorId: string, commentaire?: string | null): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('resultats_examens')
    .update({ vu_par_doctor_id: doctorId, vu_commentaire: commentaire?.trim() || null })
    .in('id', ids).is('vu_le', null).eq('archive', false);
  if (error) throw new Error(error.message);
}

/** Archivage (motif obligatoire) : le résultat sort du suivi, il reste visible dans l'historique. */
export async function archiveResultat(id: string, doctorId: string, motif: string): Promise<void> {
  const m = motif.trim();
  if (m.length < 3) throw new Error('Motif obligatoire');
  const { data, error } = await supabase.from('resultats_examens')
    .update({ archive: true, archive_motif: m, archive_par_doctor_id: doctorId })
    .eq('id', id).eq('archive', false).select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Résultat introuvable ou déjà archivé');
}

// ─── Accueil : « Résultats à revoir (N) » ────────────────────────────────────

export type ARevoirRow = Pick<ResultatExamen, 'id' | 'patient_id' | 'examen_code' | 'libelle' | 'parametre' | 'valeur_num' | 'valeur_texte' | 'unite_saisie' | 'interpretation' | 'date_prelevement'>;
export interface ARevoirData { total: number; rows: ARevoirRow[] }

/** Compteur exact + les 6 résultats non vus les plus récents saisis par ce médecin. */
export async function loadARevoir(doctorId: string): Promise<ARevoirData> {
  const { data, error, count } = await supabase.from('resultats_examens')
    .select('id, patient_id, examen_code, libelle, parametre, valeur_num, valeur_texte, unite_saisie, interpretation, date_prelevement', { count: 'exact' })
    .eq('doctor_id', doctorId).eq('a_revoir', true).is('vu_le', null).eq('archive', false)
    .order('date_prelevement', { ascending: false }).limit(6);
  if (error) throw new Error(error.message);
  const rows = ((data as ARevoirRow[] | null) ?? []).map(r => ({ ...r, valeur_num: num(r.valeur_num) }));
  return { total: count ?? rows.length, rows };
}

/** Dernière unité saisie par ce médecin pour chaque examen (300 dernières saisies). */
export async function loadDoctorLastUnits(doctorId: string): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('resultats_examens')
    .select('examen_code, parametre, libelle, unite_saisie')
    .eq('doctor_id', doctorId).not('unite_saisie', 'is', null)
    .order('created_at', { ascending: false }).limit(300);
  if (error) return {};
  return lastUnitsBySerie((data as Array<Pick<ResultatExamen, 'examen_code' | 'parametre' | 'libelle' | 'unite_saisie'>> | null) ?? []);
}
