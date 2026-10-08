// Sprint 5 — Colle d'interface des demandes d'examens : ouverture de la modale depuis
// n'importe quelle vue (profil, Vérificateur, listes), brouillon protégé, impression.

import type { Patient } from './supabase';
import type { DemandeExamens, ExamRequestDraft } from './examRequest';
import { examDraftHasContent, fullPrecision } from './examRequest';
import { buildExamPages, examFileName, type ExamDocInput, type ExamDocLine, type ExamPage } from './examDocument';
import { buildExamPdf, downloadPdf, printPdf, sharePdf, type ExamPdfHeader, type PdfFile } from './examPdf';
import { loadDoctorHeader } from './examensApi';

// ─── Ouverture de la modale « Demande d'examens » ────────────────────────────

export interface OpenExamRequest {
  patient: Patient;
  /** « Renouveler » : demande dont les examens sont rechargés (modifiables). */
  renewFrom?: DemandeExamens | null;
}

const bus = new EventTarget();
const OPEN = 'open-exam-request';

export function openExamRequest(detail: OpenExamRequest): void {
  bus.dispatchEvent(new CustomEvent<OpenExamRequest>(OPEN, { detail }));
}

export function onOpenExamRequest(handler: (d: OpenExamRequest) => void): () => void {
  const h = (e: Event) => handler((e as CustomEvent<OpenExamRequest>).detail);
  bus.addEventListener(OPEN, h);
  return () => bus.removeEventListener(OPEN, h);
}

// ─── Brouillon de la demande autonome ────────────────────────────────────────
// sessionStorage uniquement (données de santé), 24 h, purgé à la déconnexion par
// clearAllDrafts (même préfixe « ordosur:draft: » que le brouillon d'ordonnance).
// Jamais repris automatiquement : un bandeau propose « Reprendre / Supprimer ».

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const key = (doctorId: string, patientId: string) => `ordosur:draft:examens:${doctorId}:${patientId}`;

interface StoredExamDraft { v: 1; savedAt: number; draft: ExamRequestDraft }

export function saveExamDraft(doctorId: string, patientId: string, draft: ExamRequestDraft): void {
  try {
    if (!examDraftHasContent(draft)) { window.sessionStorage.removeItem(key(doctorId, patientId)); return; }
    const s: StoredExamDraft = { v: 1, savedAt: Date.now(), draft };
    window.sessionStorage.setItem(key(doctorId, patientId), JSON.stringify(s));
  } catch { /* le brouillon est un confort, jamais bloquant */ }
}

export function loadExamDraft(doctorId: string, patientId: string): { draft: ExamRequestDraft; savedAt: number } | null {
  try {
    const raw = window.sessionStorage.getItem(key(doctorId, patientId));
    if (!raw) return null;
    const s = JSON.parse(raw) as StoredExamDraft;
    if (!s || s.v !== 1 || typeof s.savedAt !== 'number' || Date.now() - s.savedAt > MAX_AGE_MS || !examDraftHasContent(s.draft)) {
      clearExamDraft(doctorId, patientId);
      return null;
    }
    return { draft: s.draft, savedAt: s.savedAt };
  } catch {
    return null;
  }
}

export function clearExamDraft(doctorId: string, patientId: string): void {
  try { window.sessionStorage.removeItem(key(doctorId, patientId)); } catch { /* ignore */ }
}

// ─── Du brouillon / de la demande vers le document ───────────────────────────

type DocPatient = ExamDocInput['patient'];

export function docInputFromDraft(
  draft: ExamRequestDraft, o: { numero: string; dateIso: string; echeance: { date: string; libelle: string }; patient: DocPatient },
): ExamDocInput {
  const lines: ExamDocLine[] = draft.lines.map(l => ({
    libelle: l.libelle, type: l.type, categorie: l.categorie, precision: fullPrecision(l), question: l.question,
    a_jeun: l.a_jeun, delai_jeun_h: l.a_jeun ? l.delai_jeun_h : null,
  }));
  return {
    numero: o.numero, dateIso: o.dateIso, echeance: o.echeance, urgent: draft.urgent, ald: draft.ald,
    regrouperImageries: draft.regrouperImageries, renseignements: draft.renseignements, patient: o.patient, lines,
  };
}

/** Réimpression : les examens annulés ne figurent plus sur le document. */
export function docInputFromDemande(d: DemandeExamens, patient: DocPatient): ExamDocInput {
  const lines: ExamDocLine[] = d.lignes.filter(l => l.statut !== 'annule').map(l => ({
    libelle: l.libelle, type: l.type, categorie: l.categorie,
    precision: fullPrecision({ precision: l.precision ?? '', injection: l.injection }),
    question: l.question_clinique, a_jeun: l.a_jeun, delai_jeun_h: l.delai_jeun_h,
  }));
  return {
    numero: d.numero, dateIso: d.date_demande, echeance: { date: d.echeance_date, libelle: d.echeance_libelle },
    urgent: d.urgent, ald: d.ald, regrouperImageries: d.regrouper_imageries,
    renseignements: d.renseignements_cliniques, patient, lines,
  };
}

export function pagesFromDemande(d: DemandeExamens, patient: DocPatient): ExamPage[] {
  return buildExamPages(docInputFromDemande(d, patient));
}

// ─── Sorties ─────────────────────────────────────────────────────────────────

export type OutputMode = 'print' | 'download' | 'share';

export async function outputPdf(file: PdfFile, mode: OutputMode, title: string): Promise<string> {
  if (mode === 'share') {
    const r = await sharePdf(file, title);
    return r === 'shared' ? 'Document partagé' : r === 'cancelled' ? 'Partage annulé' : 'PDF téléchargé';
  }
  if (mode === 'print') {
    const r = await printPdf(file);
    return r === 'printed' ? 'Impression lancée' : 'PDF téléchargé — imprimez-le depuis votre appareil';
  }
  downloadPdf(file);
  return 'PDF téléchargé';
}

export interface PrintContext {
  /** Médecin connecté (repli si l'auteur de la demande n'est pas lisible). */
  me: { doctorId: string | null; header: ExamPdfHeader['doctor']; logoUrl: string | null } | null;
  org: ExamPdfHeader['org'];
}

/**
 * (Ré)impression d'une demande enregistrée, en lecture seule : l'en-tête est celui du
 * médecin AUTEUR de la demande (cabinet de groupe), à défaut celui du médecin connecté.
 */
export async function outputDemande(d: DemandeExamens, patient: Patient, ctx: PrintContext, mode: OutputMode): Promise<string> {
  let doctor = ctx.me?.header ?? null;
  let logoUrl = ctx.me?.logoUrl ?? null;
  if (!ctx.me || ctx.me.doctorId !== d.doctor_id) {
    const author = await loadDoctorHeader(d.doctor_id);
    if (author) {
      doctor = { prenom: author.prenom, nom: author.nom, specialite: author.specialite, rpps: author.rpps, ordre_number: author.ordre_number };
      logoUrl = author.logo_url;
    }
  }
  if (!doctor) throw new Error("Identité du médecin prescripteur indisponible : impression impossible");
  const pages = pagesFromDemande(d, patient);
  if (pages.length === 0) throw new Error('Aucun examen à imprimer sur cette demande');
  const file = await buildExamPdf(pages, { doctor, org: ctx.org }, { logoUrl, fileName: examFileName(patient, d.numero) });
  return outputPdf(file, mode, `Examens à réaliser — ${patient.prenom} ${patient.nom}`);
}
