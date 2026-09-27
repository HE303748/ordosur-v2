/**
 * Brouillon d'ordonnance — survit à un rafraîchissement de page.
 *
 * sessionStorage UNIQUEMENT (données de santé) : effacé à la fermeture de l'onglet,
 * jamais partagé entre onglets, jamais écrit dans localStorage ni dans un cookie.
 *
 * Clés :
 *   ordosur:draft:ordonnance:<doctorId>:<patientId>  → brouillon d'un patient
 *   ordosur:draft:ordonnance:<doctorId>:active       → id du patient du dernier brouillon
 *
 * Les résultats d'analyse d'interactions ne sont JAMAIS stockés : un résultat de
 * sécurité doit toujours être recalculé, jamais réaffiché depuis un cache.
 */

const PREFIX = 'ordosur:draft:';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const VERSION = 1;

export interface DraftMedicationForm {
  id: string;
  nom: string;
  posologie: string;
  duree: string;
  quantite: string;
  addedInForm?: boolean; // ligne ajoutée dans le formulaire (hors Vérificateur)
  // Sprint 3b — liaison à la base (autocomplete) / saisie libre assumée
  medicament?: { id: string; nom: string; nom_commercial?: string | null; dci?: string | null; dci_canonique?: string | null } | null;
  horsBase?: boolean;
}

export interface DraftForm {
  motif: string;
  medications: DraftMedicationForm[];
  remarks: string;
  appointmentDate: string;
  appointmentTime: string;
}

export interface DraftSelectedMed {
  id: string;
  nom: string;
  dci?: string | null;
  dci_canonique?: string | null;
  manual?: boolean;
}

export interface OrdonnanceDraft {
  v: number;
  savedAt: number;
  doctorId: string;
  patientId: string;
  selectedMeds: DraftSelectedMed[];
  form: DraftForm | null;
  formOpen: boolean;
}

const draftKey  = (doctorId: string, patientId: string) => `${PREFIX}ordonnance:${doctorId}:${patientId}`;
const activeKey = (doctorId: string) => `${PREFIX}ordonnance:${doctorId}:active`;

function storage(): Storage | null {
  try { return window.sessionStorage; } catch { return null; }
}

export function isFormEmpty(f: DraftForm | null): boolean {
  if (!f) return true;
  return !f.motif.trim() && !f.remarks.trim() && !f.appointmentDate && !f.appointmentTime && f.medications.length === 0;
}

export function saveDraft(draft: Omit<OrdonnanceDraft, 'v' | 'savedAt'>): void {
  const s = storage();
  if (!s) return;
  try {
    if (draft.selectedMeds.length === 0 && isFormEmpty(draft.form)) {
      clearDraft(draft.doctorId, draft.patientId);
      return;
    }
    const full: OrdonnanceDraft = { ...draft, v: VERSION, savedAt: Date.now() };
    s.setItem(draftKey(draft.doctorId, draft.patientId), JSON.stringify(full));
    s.setItem(activeKey(draft.doctorId), draft.patientId);
  } catch { /* quota / accès refusé : le brouillon est un confort, jamais bloquant */ }
}

/** Brouillon valide du patient, ou null (absent, corrompu, expiré, ou autre patient). */
export function loadDraft(doctorId: string, patientId: string): OrdonnanceDraft | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(draftKey(doctorId, patientId));
    if (!raw) return null;
    const d = JSON.parse(raw) as OrdonnanceDraft;
    const valid = d && d.v === VERSION && d.doctorId === doctorId && d.patientId === patientId
      && typeof d.savedAt === 'number' && Date.now() - d.savedAt <= MAX_AGE_MS
      && Array.isArray(d.selectedMeds);
    if (!valid) { clearDraft(doctorId, patientId); return null; }
    return d;
  } catch {
    clearDraft(doctorId, patientId);
    return null;
  }
}

export function getActiveDraftPatientId(doctorId: string): string | null {
  try { return storage()?.getItem(activeKey(doctorId)) ?? null; } catch { return null; }
}

export function clearDraft(doctorId: string, patientId: string): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(draftKey(doctorId, patientId));
    if (s.getItem(activeKey(doctorId)) === patientId) s.removeItem(activeKey(doctorId));
  } catch { /* ignore */ }
}

/** Déconnexion : purge toutes les clés ordosur:draft:*. */
export function clearAllDrafts(): void {
  const s = storage();
  if (!s) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach(k => s.removeItem(k));
  } catch { /* ignore */ }
}
