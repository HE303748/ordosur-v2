import { supabase } from './supabase';

// Sprint 3 — Traitement de fond structuré (table traitements_chroniques).
// Jamais de suppression physique : « Arrêter » = actif false + date_arret + arrete_par_doctor_id.

export interface TraitementMedicament {
  id: string;
  nom: string;
  nom_commercial?: string | null;
  dci?: string | null;
  dci_canonique?: string | null;
}

export interface TraitementChronique {
  id: string;
  patient_id: string;
  org_id: string;
  doctor_id: string;
  medicament_id: string | null;
  medicament_nom: string;
  posologie: string | null;
  date_debut: string | null;
  actif: boolean;
  date_arret: string | null;
  arrete_par_doctor_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Jointure medicaments (NULL si saisi hors base → non vérifiable par le moteur)
  medicament?: TraitementMedicament | null;
}

const SELECT_COLS = '*, medicament:medicaments(id, nom, nom_commercial, dci, dci_canonique)';

/** Traitements d'un patient (actifs d'abord). Borné par patient → jamais volumineux. */
export async function loadTraitements(patientId: string, onlyActive = false): Promise<TraitementChronique[]> {
  let q = supabase
    .from('traitements_chroniques')
    .select(SELECT_COLS)
    .eq('patient_id', patientId);
  if (onlyActive) q = q.eq('actif', true);
  const { data, error } = await q.order('created_at', { ascending: true });
  if (error) throw error;
  return (data as TraitementChronique[]) ?? [];
}

/**
 * Identifiant utilisé dans l'analyse et dans selectedMeds lors d'un renouvellement :
 * uuid du médicament en base, sinon identifiant « manuel » stable (non vérifiable).
 */
export function fondMedId(t: TraitementChronique): string {
  return t.medicament_id ?? `manual_fond_${t.id}`;
}

/** Nom affiché : nom commercial de la base si disponible, sinon le libellé saisi. */
export function fondDisplayName(t: TraitementChronique): string {
  return t.medicament?.nom_commercial || t.medicament?.nom || t.medicament_nom;
}

/**
 * « Dr Prénom Nom » pour une liste de doctors.id. Les secrétaires ne lisent pas
 * user_profiles des médecins (RLS) → entrée absente, l'appelant affiche un repli.
 */
export async function resolveDoctorNames(doctorIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const ids = [...new Set(doctorIds.filter(Boolean))];
  if (ids.length === 0) return out;
  const { data: docs } = await supabase.from('doctors').select('id, user_id').in('id', ids);
  const rows = (docs as Array<{ id: string; user_id: string }> | null) ?? [];
  if (rows.length === 0) return out;
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, prenom, nom')
    .in('user_id', rows.map(r => r.user_id));
  const byUser = new Map(
    ((profiles as Array<{ user_id: string; prenom: string | null; nom: string | null }> | null) ?? [])
      .map(p => [p.user_id, `${p.prenom ?? ''} ${p.nom ?? ''}`.trim()]),
  );
  for (const r of rows) {
    const name = byUser.get(r.user_id);
    if (name) out.set(r.id, `Dr ${name}`);
  }
  return out;
}

export function formatDateFrShort(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function todayIsoDate(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
