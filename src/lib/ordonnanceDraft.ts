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
  // Sprint 4d-bis — forme galénique connue (déduction de l'unité de prise)
  formeHint?: string | null;
  // Sprint 4d-quater — dosage absent de la fiche : à préciser par le médecin
  dosageAPreciser?: boolean;
  dosagePrecise?: string;
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
  // Sprint 4d-bis / 4d-quater — libellé affiché (marque + dosage + forme), forme, dosage manquant
  label?: string | null;
  formeHint?: string | null;
  dosageManquant?: boolean;
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

// ─── Sprint 4d-quater — reprise du brouillon : jamais automatique ─────────────
//
// Un brouillon enregistré n'est JAMAIS rouvert ni appliqué tout seul (ni au chargement,
// ni à la sélection du patient) : un bandeau propose « Reprendre / Supprimer ».
// Il est lié au patient ET à la sélection de médicaments du Vérificateur : il n'écrase
// jamais une sélection en cours différente de la sienne.

/** Signature de la sélection du Vérificateur (ordre indifférent). */
export function draftMedsKey(meds: Array<{ id: string }>): string {
  return meds.map(m => m.id).sort().join(',');
}

/** Le formulaire contient une saisie du médecin (au-delà des lignes vides). */
export function formHasContent(f: DraftForm | null | undefined): boolean {
  if (!f) return false;
  return !!f.motif.trim() || !!f.remarks.trim() || !!f.appointmentDate || !!f.appointmentTime
    || f.medications.some(m => !!m.nom.trim() || !!m.posologie.trim() || !!m.duree.trim());
}

/** Brouillon qui mérite d'être proposé (au moins un médicament ou une saisie). */
export function isDraftWorthOffering(d: OrdonnanceDraft | null | undefined): d is OrdonnanceDraft {
  return !!d && (d.selectedMeds.length > 0 || formHasContent(d.form));
}

export type DraftOffer =
  | 'none'      // rien à proposer (pas de brouillon, autre patient, ou identique à l'état en cours)
  | 'resume'    // « Reprendre / Supprimer »
  | 'conflict'; // la sélection en cours diffère : reprise impossible sans la vider (jamais d'écrasement)

/**
 * Que proposer pour un brouillon enregistré, face à l'état actuel du Vérificateur ?
 *   • autre patient, brouillon vide → rien ;
 *   • sélection en cours vide → reprise possible ;
 *   • sélection identique à celle du brouillon → reprise possible (seul le formulaire est repris) ;
 *   • sélection différente et non vide → conflit : le brouillon n'écrase jamais la sélection.
 * `liveFormHasContent` : une saisie est déjà en cours dans le formulaire → conflit également.
 */
export function evaluateDraftOffer(
  draft: OrdonnanceDraft | null | undefined,
  patientId: string | null,
  currentMeds: Array<{ id: string }>,
  liveFormHasContent = false,
): DraftOffer {
  if (!isDraftWorthOffering(draft)) return 'none';
  if (patientId !== null && draft.patientId !== patientId) return 'none';
  if (liveFormHasContent) return 'conflict';
  if (currentMeds.length === 0) return 'resume';
  return draftMedsKey(currentMeds) === draftMedsKey(draft.selectedMeds) ? 'resume' : 'conflict';
}

/** « 08/10 14:32 (2 médicaments) » */
export function draftSummary(d: OrdonnanceDraft): string {
  const dt = new Date(d.savedAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  const n = Math.max(d.selectedMeds.length, d.form?.medications.filter(m => m.nom.trim()).length ?? 0);
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)} ${pad(dt.getHours())}:${pad(dt.getMinutes())} (${n} médicament${n > 1 ? 's' : ''})`;
}

/**
 * Lignes du formulaire à reprendre pour la sélection ACTUELLE : seules les lignes dont le
 * médicament est encore sélectionné (id `chk-<id>`) et les lignes ajoutées dans le formulaire
 * sont conservées. Une ligne d'un médicament retiré de la sélection ne revient jamais.
 */
export function draftLinesForSelection(form: DraftForm | null | undefined, currentMeds: Array<{ id: string }>): DraftMedicationForm[] {
  if (!form) return [];
  const ids = new Set(currentMeds.map(m => `chk-${m.id}`));
  return form.medications.filter(m => m.addedInForm || ids.has(m.id));
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
