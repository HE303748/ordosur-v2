// Sprint 7 — Colle d'interface de la lettre d'adressage : ouverture de la modale depuis
// n'importe quelle vue (profil, « Ordonnance enregistrée », Vérificateur), brouillon protégé,
// (ré)impression à l'identique.

import type { Patient } from './supabase';
import type { LettreAdressage } from './adressageApi';
import {
  adressageDraftBelongsTo, adressageDraftHasContent, emptyAdressageParams, lettreFileName, type AdressageDraft,
} from './lettreTexte';
import type { LettreDocument } from './lettrePdf';
import { outputPdf, type OutputMode } from './examUi';

// ─── Ouverture de la modale ──────────────────────────────────────────────────

export interface OpenAdressage {
  patient: Patient;
  /** « Dupliquer » : lettre dont les paramètres et le texte sont repris (modifiables). */
  duplicateFrom?: LettreAdressage | null;
}

const bus = new EventTarget();
const OPEN = 'open-adressage';

export function openAdressage(detail: OpenAdressage): void {
  bus.dispatchEvent(new CustomEvent<OpenAdressage>(OPEN, { detail }));
}

export function onOpenAdressage(handler: (d: OpenAdressage) => void): () => void {
  const h = (e: Event) => handler((e as CustomEvent<OpenAdressage>).detail);
  bus.addEventListener(OPEN, h);
  return () => bus.removeEventListener(OPEN, h);
}

// ─── Brouillon ───────────────────────────────────────────────────────────────
// sessionStorage uniquement (données de santé), 24 h, purgé à la déconnexion par clearAllDrafts
// (même préfixe « ordosur:draft: »). Lié au médecin ET au patient. Jamais repris automatiquement :
// un bandeau propose « Reprendre / Supprimer ».

// Paramètres et règles du brouillon : lib/lettreTexte (module pur, testé).
export { emptyAdressageParams, adressageDraftHasContent, adressageDraftBelongsTo, destinataireCourt, type AdressageParams, type AdressageDraft } from './lettreTexte';

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const key = (doctorId: string, patientId: string) => `ordosur:draft:adressage:${doctorId}:${patientId}`;

interface Stored { v: 1; savedAt: number; doctorId: string; patientId: string; draft: AdressageDraft }

export function saveAdressageDraft(doctorId: string, patientId: string, draft: AdressageDraft): void {
  try {
    if (!adressageDraftHasContent(draft)) { window.sessionStorage.removeItem(key(doctorId, patientId)); return; }
    const s: Stored = { v: 1, savedAt: Date.now(), doctorId, patientId, draft };
    window.sessionStorage.setItem(key(doctorId, patientId), JSON.stringify(s));
  } catch { /* le brouillon est un confort, jamais bloquant */ }
}

export function loadAdressageDraft(doctorId: string, patientId: string): { draft: AdressageDraft; savedAt: number } | null {
  try {
    const raw = window.sessionStorage.getItem(key(doctorId, patientId));
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    const valide = s && s.v === 1 && typeof s.savedAt === 'number' && Date.now() - s.savedAt <= MAX_AGE_MS
      && adressageDraftBelongsTo(s, doctorId, patientId) && adressageDraftHasContent(s.draft);
    if (!valide) { clearAdressageDraft(doctorId, patientId); return null; }
    return { draft: { params: { ...emptyAdressageParams(), ...s.draft.params }, texte: s.draft.texte }, savedAt: s.savedAt };
  } catch {
    return null;
  }
}

export function clearAdressageDraft(doctorId: string, patientId: string): void {
  try { window.sessionStorage.removeItem(key(doctorId, patientId)); } catch { /* ignore */ }
}

// ─── Document et sorties ─────────────────────────────────────────────────────

/** Document imprimé d'une lettre ENREGISTRÉE : uniquement ses champs figés (réimpression à l'identique). */
export function documentFromLettre(l: LettreAdressage): LettreDocument {
  return {
    entete: l.entete, dateIso: l.date_lettre, destinataireLigne: l.destinataire_ligne, patientLigne: l.patient_ligne,
    motif: l.motif, urgence: l.urgence, contenu: l.contenu_final, annexeBilans: l.annexe_bilans,
  };
}

/** (Ré)impression, PDF ou partage natif d'une lettre enregistrée — médecin comme secrétaire. */
export async function outputLettre(l: LettreAdressage, patient: { nom: string; prenom: string } | null, mode: OutputMode): Promise<string> {
  if (!l.entete?.doctor) throw new Error('En-tête de la lettre indisponible : impression impossible');
  const { buildLettrePdf } = await import('./lettrePdf');
  const nom = patient ?? { nom: l.patient_ligne, prenom: '' };
  const file = await buildLettrePdf(documentFromLettre(l), { fileName: lettreFileName(nom, l.date_lettre) });
  return outputPdf(file, mode, `Lettre d'adressage — ${l.patient_ligne}`);
}
