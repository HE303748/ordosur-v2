import { supabase } from './supabase';
import { fetchAllRows } from './fetchAllRows';
import type { ExamRef, ExamPack, PackLine } from './examSearch';
import {
  buildDemandePayload, newDemandeNumero, toIsoDate,
  type DemandeExamens, type DemandeLigne, type ExamRequestDraft, type EcheanceResult,
} from './examRequest';

// Sprint 5 — Accès aux données des demandes d'examens.
// Jamais de suppression physique : annulation = statut 'annule' (RPC annuler_demande_examens).
// doctor_id = doctors.id (PK), jamais auth.uid() — même règle que les ordonnances.

// ─── Référentiel (chargé une fois par session, via fetchAllRows) ─────────────

let refsPromise: Promise<ExamRef[]> | null = null;

export function loadExamRefs(force = false): Promise<ExamRef[]> {
  if (force) refsPromise = null;
  if (!refsPromise) {
    refsPromise = fetchAllRows<ExamRef>(
      (from, to) => supabase.from('examens_reference').select('*').eq('actif', true).order('ordre', { ascending: true }).range(from, to),
      { label: 'examens_reference' },
    ).then(rows => {
      // Chargement vide (erreur réseau) : ne pas mémoriser, la prochaine ouverture réessaie.
      if (rows.length === 0) refsPromise = null;
      return rows;
    });
  }
  return refsPromise;
}

// ─── Packs ───────────────────────────────────────────────────────────────────

/** Packs système + packs personnels (non archivés) du médecin. */
export async function loadPacks(doctorId: string | null): Promise<ExamPack[]> {
  const rows = await fetchAllRows<ExamPack>(
    (from, to) => supabase.from('packs_examens')
      .select('id, systeme, code, doctor_id, nom, mots_cles, lignes, archive, ordre')
      .eq('archive', false).order('ordre', { ascending: true }).range(from, to),
    { label: 'packs_examens' },
  );
  return rows.filter(p => p.systeme || (!!doctorId && p.doctor_id === doctorId));
}

/** Nombre d'utilisations de chaque pack par CE médecin (200 dernières demandes). */
export async function loadPackUsage(doctorId: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const { data, error } = await supabase.from('demandes_examens')
    .select('packs_utilises').eq('doctor_id', doctorId)
    .order('created_at', { ascending: false }).limit(200);
  if (error) return out;
  for (const r of (data as Array<{ packs_utilises: string[] | null }> | null) ?? []) {
    for (const k of r.packs_utilises ?? []) out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

export async function createPersonalPack(p: { doctorId: string; orgId: string; nom: string; lignes: PackLine[]; mots_cles?: string[] }): Promise<ExamPack> {
  const { data, error } = await supabase.from('packs_examens')
    .insert({ systeme: false, doctor_id: p.doctorId, org_id: p.orgId, nom: p.nom.trim(), mots_cles: p.mots_cles ?? [], lignes: p.lignes })
    .select('id, systeme, code, doctor_id, nom, mots_cles, lignes, archive, ordre').single();
  if (error) throw error;
  return data as ExamPack;
}

export async function renamePack(id: string, nom: string): Promise<void> {
  const { error } = await supabase.from('packs_examens').update({ nom: nom.trim() }).eq('id', id);
  if (error) throw error;
}

export async function archivePack(id: string): Promise<void> {
  const { error } = await supabase.from('packs_examens').update({ archive: true }).eq('id', id);
  if (error) throw error;
}

// ─── Demandes ────────────────────────────────────────────────────────────────

const LIGNE_COLS = 'id, demande_id, examen_code, libelle, type, categorie, precision, question_clinique, a_jeun, delai_jeun_h, injection, statut, date_realisation, resultat_id, ordre';
export const DEMANDE_COLS = `id, numero, patient_id, org_id, doctor_id, ordonnance_id, date_demande, echeance_date, echeance_libelle, renseignements_cliniques, urgent, ald, regrouper_imageries, sous_metformine, packs_utilises, statut, motif_annulation, notes, created_at, lignes:demande_examen_lignes(${LIGNE_COLS})`;

function normalizeDemande(d: DemandeExamens): DemandeExamens {
  return { ...d, lignes: [...(d.lignes ?? [])].sort((a, b) => a.ordre - b.ordre) };
}

/** Demandes d'un patient (bornées par patient : jamais volumineux). */
export async function loadPatientDemandes(patientId: string): Promise<DemandeExamens[]> {
  const { data, error } = await supabase.from('demandes_examens')
    .select(DEMANDE_COLS).eq('patient_id', patientId)
    .order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return ((data as unknown as DemandeExamens[]) ?? []).map(normalizeDemande);
}

export async function loadDemande(id: string): Promise<DemandeExamens | null> {
  const { data, error } = await supabase.from('demandes_examens').select(DEMANDE_COLS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? normalizeDemande(data as unknown as DemandeExamens) : null;
}

/** Demandes rattachées à des ordonnances (badge « + examens », réimpression). */
export async function loadDemandesForOrdonnances(ordonnanceIds: string[]): Promise<Map<string, DemandeExamens>> {
  const out = new Map<string, DemandeExamens>();
  const ids = [...new Set(ordonnanceIds.filter(Boolean))];
  if (ids.length === 0) return out;
  const { data, error } = await supabase.from('demandes_examens').select(DEMANDE_COLS).in('ordonnance_id', ids);
  if (error) { console.error('[examens] demandes des ordonnances :', error); return out; }
  for (const d of (data as unknown as DemandeExamens[]) ?? []) {
    if (d.ordonnance_id) out.set(d.ordonnance_id, normalizeDemande(d));
  }
  return out;
}

export interface CreateDemandeIds { patientId: string; orgId: string; doctorId: string; ordonnanceId?: string | null; numero?: string; sousMetformine?: boolean }

/**
 * Crée la demande et ses lignes dans UNE transaction (RPC). En cas de collision de numéro
 * (improbable), un nouveau numéro est tiré une fois. Lève une erreur lisible sinon.
 */
export async function createDemande(draft: ExamRequestDraft, ids: CreateDemandeIds, echeance: EcheanceResult, today: Date = new Date()): Promise<{ id: string; numero: string }> {
  let numero = ids.numero ?? newDemandeNumero(today);
  for (let attempt = 0; attempt < 2; attempt++) {
    const payload = buildDemandePayload(draft, {
      numero, patient_id: ids.patientId, org_id: ids.orgId, doctor_id: ids.doctorId, ordonnance_id: ids.ordonnanceId ?? null,
      sous_metformine: !!ids.sousMetformine,
    }, echeance, today);
    const { data, error } = await supabase.rpc('creer_demande_examens', { p_demande: payload.demande, p_lignes: payload.lignes });
    if (!error) return { id: data as string, numero };
    const collision = error.code === '23505' && /numero/i.test(`${error.message} ${error.details ?? ''}`);
    if (!collision || attempt === 1) throw new Error(error.message || "La demande d'examens n'a pas pu être enregistrée");
    numero = newDemandeNumero(today);
  }
  throw new Error("La demande d'examens n'a pas pu être enregistrée");
}

export async function attachOrdonnance(demandeId: string, ordonnanceId: string): Promise<void> {
  const { error } = await supabase.from('demandes_examens').update({ ordonnance_id: ordonnanceId }).eq('id', demandeId);
  if (error) throw error;
}

export async function cancelDemande(demandeId: string, motif: string): Promise<void> {
  const { error } = await supabase.rpc('annuler_demande_examens', { p_demande_id: demandeId, p_motif: motif });
  if (error) throw new Error(error.message);
}

export async function setLigneStatut(ligneId: string, statut: DemandeLigne['statut'], dateRealisation?: string | null): Promise<void> {
  const patch: Record<string, unknown> = { statut };
  if (statut === 'realise') patch.date_realisation = dateRealisation || toIsoDate(new Date());
  const { error } = await supabase.from('demande_examen_lignes').update(patch).eq('id', ligneId);
  if (error) throw new Error(error.message);
}

/**
 * Annulation d'UN examen (motif obligatoire) : la ligne passe à « annulé », le motif est
 * consigné sur la demande. Le statut de la demande est recalculé par le trigger.
 */
export async function cancelLigne(ligne: Pick<DemandeLigne, 'id' | 'libelle'>, demande: Pick<DemandeExamens, 'id' | 'motif_annulation'>, motif: string): Promise<void> {
  const m = motif.trim();
  if (m.length < 3) throw new Error("Motif d'annulation obligatoire");
  const { error } = await supabase.from('demande_examen_lignes').update({ statut: 'annule' }).eq('id', ligne.id);
  if (error) throw new Error(error.message);
  const note = [demande.motif_annulation, `${ligne.libelle} : ${m}`].filter(Boolean).join(' · ');
  const { error: e2 } = await supabase.from('demandes_examens').update({ motif_annulation: note }).eq('id', demande.id);
  if (e2) console.error('[examens] motif d’annulation non consigné :', e2);
}

/** « Marquer réalisé » sur toute la demande : les examens encore en attente. */
export async function markDemandeRealisee(demandeId: string, dateRealisation?: string | null): Promise<void> {
  const { error } = await supabase.from('demande_examen_lignes')
    .update({ statut: 'realise', date_realisation: dateRealisation || toIsoDate(new Date()) })
    .eq('demande_id', demandeId).eq('statut', 'en_attente');
  if (error) throw new Error(error.message);
}

// ─── Suivi (Accueil) et liste paginée (Documents) ────────────────────────────

export interface SuiviRow {
  id: string; patient_id: string; numero: string; echeance_date: string; statut: DemandeExamens['statut']; urgent: boolean;
  lignes: Array<{ libelle: string; statut: DemandeLigne['statut'] }>;
}
export interface SuiviData { enAttente: number; enRetard: number; sous7j: number; rows: SuiviRow[] }

/**
 * Carte « Examens à suivre » : compteurs exacts (head) + les 8 échéances les plus proches.
 * `doctorId` renseigné → demandes de ce médecin ; sinon toute l'org visible (RLS).
 */
export async function loadSuivi(doctorId: string | null, today: Date = new Date()): Promise<SuiviData> {
  const todayIso = toIsoDate(today);
  const in7 = toIsoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7));
  const base = () => {
    let q = supabase.from('demandes_examens').select('id', { count: 'exact', head: true }).in('statut', ['en_attente', 'partiel']);
    if (doctorId) q = q.eq('doctor_id', doctorId);
    return q;
  };
  // Sprint 5c — la liste porte sur TOUTES les demandes en attente (les prochaines échéances),
  // et non plus seulement sur celles en retard ou à moins de 7 jours : une demande à 15 jours
  // n'affichait pas la carte.
  let list = supabase.from('demandes_examens')
    .select('id, patient_id, numero, echeance_date, statut, urgent, lignes:demande_examen_lignes(libelle, statut, ordre)')
    .in('statut', ['en_attente', 'partiel'])
    .order('echeance_date', { ascending: true }).limit(6);
  if (doctorId) list = list.eq('doctor_id', doctorId);
  const [all, late, soon, rows] = await Promise.all([
    base(),
    base().lt('echeance_date', todayIso),
    base().gte('echeance_date', todayIso).lte('echeance_date', in7),
    list,
  ]);
  if (all.error || rows.error) throw new Error((all.error ?? rows.error)?.message ?? 'Suivi des examens indisponible');
  const data = ((rows.data as unknown as Array<SuiviRow & { lignes: Array<{ libelle: string; statut: DemandeLigne['statut']; ordre: number }> }>) ?? [])
    .map(r => ({ ...r, lignes: [...(r.lignes ?? [])].sort((a, b) => a.ordre - b.ordre) }));
  return {
    enAttente: all.count ?? data.length,
    enRetard: late.count ?? 0,
    sous7j: soon.count ?? 0,
    rows: data,
  };
}

export type DemandeFilter = 'toutes' | 'en_attente' | 'en_retard' | 'realisees';

/** Liste paginée côté serveur, avec compteur exact pour le filtre. */
export async function loadDemandesPage(opts: {
  doctorId: string | null; filter: DemandeFilter; offset: number; pageSize: number; patientIds?: string[] | null; numero?: string; today?: Date;
}): Promise<{ rows: DemandeExamens[]; count: number }> {
  const todayIso = toIsoDate(opts.today ?? new Date());
  let q = supabase.from('demandes_examens').select(DEMANDE_COLS, { count: 'exact' });
  if (opts.doctorId) q = q.eq('doctor_id', opts.doctorId);
  if (opts.filter === 'en_attente') q = q.in('statut', ['en_attente', 'partiel']);
  if (opts.filter === 'en_retard') q = q.in('statut', ['en_attente', 'partiel']).lt('echeance_date', todayIso);
  if (opts.filter === 'realisees') q = q.eq('statut', 'realise');
  const num = (opts.numero ?? '').replace(/[%,()*\\]/g, ' ').trim();
  if (opts.patientIds && opts.patientIds.length > 0) {
    q = num ? q.or(`numero.ilike.%${num}%,patient_id.in.(${opts.patientIds.join(',')})`) : q.in('patient_id', opts.patientIds);
  } else if (num) {
    q = q.ilike('numero', `%${num}%`);
  }
  const ordered = opts.filter === 'en_attente' || opts.filter === 'en_retard'
    ? q.order('echeance_date', { ascending: true })
    : q.order('created_at', { ascending: false });
  const { data, error, count } = await ordered.range(opts.offset, opts.offset + opts.pageSize - 1);
  if (error) throw error;
  const rows = ((data as unknown as DemandeExamens[]) ?? []).map(normalizeDemande);
  return { rows, count: count ?? rows.length };
}

/** Prochain rendez-vous à venir du patient (date ISO), ou null. */
export async function loadNextRdvDate(patientId: string, today: Date = new Date()): Promise<string | null> {
  const { data, error } = await supabase.from('rendez_vous')
    .select('date, statut').eq('patient_id', patientId).gte('date', toIsoDate(today))
    .neq('statut', 'annule').order('date', { ascending: true }).limit(1);
  if (error) return null;
  return ((data as Array<{ date: string }> | null) ?? [])[0]?.date ?? null;
}

/** En-tête d'un document : identité du médecin AUTEUR de la demande (réimpression). */
export interface DoctorHeader { prenom: string; nom: string; specialite: string | null; rpps: string | null; ordre_number: string | null; logo_url: string | null }
export async function loadDoctorHeader(doctorId: string): Promise<DoctorHeader | null> {
  const { data: doc } = await supabase.from('doctors').select('id, user_id, specialite, rpps, ordre_number, logo_url').eq('id', doctorId).maybeSingle();
  if (!doc) return null;
  const d = doc as { user_id: string; specialite: string | null; rpps: string | null; ordre_number: string | null; logo_url: string | null };
  const { data: prof } = await supabase.from('user_profiles').select('prenom, nom').eq('user_id', d.user_id).maybeSingle();
  const p = prof as { prenom: string | null; nom: string | null } | null;
  if (!p) return null;
  return { prenom: p.prenom ?? '', nom: p.nom ?? '', specialite: d.specialite, rpps: d.rpps, ordre_number: d.ordre_number, logo_url: d.logo_url };
}
