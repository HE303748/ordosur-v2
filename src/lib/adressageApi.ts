import { supabase } from './supabase';
import type { RecapGroup } from './resultatsLogic';
import { dateLimiteSansReponse, type LettreStatut, type ModeTraitements, type Urgence } from './lettreTexte';
import type { LettreEntete } from './lettrePdf';

// Sprint 7 — Accès aux données : carnet de confrères et lettres d'adressage.
// Jamais de suppression physique : un confrère s'archive, une lettre s'annule (motif).
// doctor_id = doctors.id (PK), jamais auth.uid() — même règle que les ordonnances.
// Une lettre enregistrée est figée (trigger) : seul son suivi évolue.

// ─── Carnet de confrères ─────────────────────────────────────────────────────

export interface Confrere {
  id: string;
  org_id: string;
  doctor_id: string;
  titre: 'Dr' | 'Pr';
  civilite: 'M' | 'Mme' | null;
  nom: string;
  prenom: string | null;
  specialite: string;
  etablissement: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  notes: string | null;
  archive: boolean;
  created_at: string;
}

export type ConfrereInput = Pick<Confrere, 'titre' | 'civilite' | 'nom' | 'prenom' | 'specialite' | 'etablissement' | 'ville' | 'telephone' | 'email' | 'notes'>;

const CONFRERE_COLS = 'id, org_id, doctor_id, titre, civilite, nom, prenom, specialite, etablissement, ville, telephone, email, notes, archive, created_at';

const vide = (s: string | null | undefined): string | null => {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  return t || null;
};

function confrerePayload(c: ConfrereInput) {
  return {
    titre: c.titre === 'Pr' ? 'Pr' : 'Dr', civilite: c.civilite === 'M' || c.civilite === 'Mme' ? c.civilite : null,
    nom: (c.nom ?? '').replace(/\s+/g, ' ').trim(), prenom: vide(c.prenom), specialite: (c.specialite ?? '').replace(/\s+/g, ' ').trim(),
    etablissement: vide(c.etablissement), ville: vide(c.ville), telephone: vide(c.telephone), email: vide(c.email), notes: vide(c.notes),
  };
}

/** Carnet du médecin (le sien uniquement), trié par nom. Borné : un carnet reste court. */
export async function loadConfreres(doctorId: string, includeArchived = false): Promise<Confrere[]> {
  let q = supabase.from('confreres').select(CONFRERE_COLS).eq('doctor_id', doctorId);
  if (!includeArchived) q = q.eq('archive', false);
  const { data, error } = await q.order('nom', { ascending: true }).limit(500);
  if (error) throw new Error(error.message);
  return (data as Confrere[] | null) ?? [];
}

export async function createConfrere(c: ConfrereInput, ids: { doctorId: string; orgId: string }): Promise<Confrere> {
  const p = confrerePayload(c);
  if (!p.nom) throw new Error('Le nom du confrère est obligatoire.');
  if (!p.specialite) throw new Error('La spécialité du confrère est obligatoire.');
  const { data, error } = await supabase.from('confreres')
    .insert({ ...p, doctor_id: ids.doctorId, org_id: ids.orgId }).select(CONFRERE_COLS).single();
  if (error) throw new Error(error.message);
  return data as Confrere;
}

export async function updateConfrere(id: string, c: ConfrereInput): Promise<Confrere> {
  const p = confrerePayload(c);
  if (!p.nom) throw new Error('Le nom du confrère est obligatoire.');
  if (!p.specialite) throw new Error('La spécialité du confrère est obligatoire.');
  // .select() : une mise à jour refusée par la RLS ne renvoie pas d'erreur, seulement 0 ligne.
  const { data, error } = await supabase.from('confreres').update(p).eq('id', id).select(CONFRERE_COLS);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Ce confrère n’a pas pu être modifié.');
  return data[0] as Confrere;
}

export async function setConfrereArchive(id: string, archive: boolean): Promise<void> {
  const { data, error } = await supabase.from('confreres').update({ archive }).eq('id', id).select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Ce confrère n’a pas pu être modifié.');
}

// ─── Lettres ─────────────────────────────────────────────────────────────────

export interface SectionsIncluses {
  mode_traitements?: ModeTraitements;
  antecedents?: number;
  allergies?: boolean;
  bilans?: string[];
  dfg?: boolean;
  examens_en_attente?: boolean;
  grossesse?: boolean;
  joindre_bilans?: boolean;
}

export interface LettreAdressage {
  id: string;
  patient_id: string;
  org_id: string;
  doctor_id: string;
  confrere_id: string | null;
  specialite_destinataire: string;
  destinataire_libre: string | null;
  destinataire_ligne: string;
  patient_ligne: string;
  motif: string;
  contexte_suivi: string | null;
  question_posee: string | null;
  urgence: Urgence;
  contenu_final: string;
  sections_incluses: SectionsIncluses;
  entete: LettreEntete;
  annexe_bilans: RecapGroup[] | null;
  statut: LettreStatut;
  date_lettre: string;
  date_envoi: string | null;
  reponse_date: string | null;
  reponse_resume: string | null;
  motif_annulation: string | null;
  created_at: string;
}

const LETTRE_COLS = 'id, patient_id, org_id, doctor_id, confrere_id, specialite_destinataire, destinataire_libre, destinataire_ligne, patient_ligne, motif, contexte_suivi, question_posee, urgence, contenu_final, sections_incluses, entete, annexe_bilans, statut, date_lettre, date_envoi, reponse_date, reponse_resume, motif_annulation, created_at';

/** Lettres d'un patient (bornées par patient : jamais volumineux). */
export async function loadPatientLettres(patientId: string): Promise<LettreAdressage[]> {
  const { data, error } = await supabase.from('lettres_adressage').select(LETTRE_COLS)
    .eq('patient_id', patientId).order('created_at', { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return (data as unknown as LettreAdressage[] | null) ?? [];
}

/** Dernières lettres du cabinet (vue de la secrétaire : réimpression). */
export async function loadOrgLettres(limit = 60): Promise<LettreAdressage[]> {
  const { data, error } = await supabase.from('lettres_adressage').select(LETTRE_COLS)
    .order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data as unknown as LettreAdressage[] | null) ?? [];
}

export type NouvelleLettre = Pick<LettreAdressage,
  'patient_id' | 'org_id' | 'doctor_id' | 'confrere_id' | 'specialite_destinataire' | 'destinataire_libre' | 'destinataire_ligne'
  | 'patient_ligne' | 'motif' | 'contexte_suivi' | 'question_posee' | 'urgence' | 'contenu_final' | 'sections_incluses' | 'entete'
  | 'annexe_bilans' | 'date_lettre'>;

/** Enregistre la lettre validée (statut « non envoyée »). Son contenu est figé dès cet instant. */
export async function createLettre(l: NouvelleLettre): Promise<LettreAdressage> {
  const { data, error } = await supabase.from('lettres_adressage').insert({
    ...l,
    destinataire_libre: vide(l.destinataire_libre), contexte_suivi: vide(l.contexte_suivi), question_posee: vide(l.question_posee),
    statut: 'brouillon',
  }).select(LETTRE_COLS).single();
  if (error) throw new Error(error.message || 'La lettre n’a pas pu être enregistrée');
  return data as unknown as LettreAdressage;
}

async function patchLettre(id: string, patch: Record<string, unknown>): Promise<LettreAdressage> {
  const { data, error } = await supabase.from('lettres_adressage').update(patch).eq('id', id).select(LETTRE_COLS);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Cette lettre n’a pas pu être modifiée.');
  return data[0] as unknown as LettreAdressage;
}

export const marquerEnvoyee = (id: string, dateEnvoi: string) => patchLettre(id, { statut: 'envoyee', date_envoi: dateEnvoi });
export const remettreNonEnvoyee = (id: string) => patchLettre(id, { statut: 'brouillon' });
export const marquerReponseRecue = (id: string, reponseDate: string, resume: string) =>
  patchLettre(id, { statut: 'reponse_recue', reponse_date: reponseDate, reponse_resume: resume });
export function annulerLettre(id: string, motif: string): Promise<LettreAdressage> {
  if (motif.trim().length < 3) return Promise.reject(new Error('Motif d’annulation obligatoire.'));
  return patchLettre(id, { statut: 'annulee', motif_annulation: motif.trim() });
}

// ─── Suivi (Accueil) ─────────────────────────────────────────────────────────

export type SuiviAdressageRow = Pick<LettreAdressage, 'id' | 'patient_id' | 'destinataire_ligne' | 'specialite_destinataire' | 'motif' | 'date_envoi' | 'statut'>;
export interface SuiviAdressages { sansReponse: number; rows: SuiviAdressageRow[] }

/** Lettres envoyées depuis plus de 30 jours sans réponse : compteur exact + les 5 plus anciennes. */
export async function loadSuiviAdressages(doctorId: string, today: Date = new Date()): Promise<SuiviAdressages> {
  const limite = dateLimiteSansReponse(today);
  const [count, rows] = await Promise.all([
    supabase.from('lettres_adressage').select('id', { count: 'exact', head: true })
      .eq('doctor_id', doctorId).eq('statut', 'envoyee').lt('date_envoi', limite),
    supabase.from('lettres_adressage').select('id, patient_id, destinataire_ligne, specialite_destinataire, motif, date_envoi, statut')
      .eq('doctor_id', doctorId).eq('statut', 'envoyee').lt('date_envoi', limite)
      .order('date_envoi', { ascending: true }).limit(5),
  ]);
  if (count.error || rows.error) throw new Error((count.error ?? rows.error)?.message ?? 'Suivi des adressages indisponible');
  const data = (rows.data as SuiviAdressageRow[] | null) ?? [];
  return { sansReponse: count.count ?? data.length, rows: data };
}
