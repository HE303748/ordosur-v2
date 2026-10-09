// Sprint P — jsPDF (≈ 390 Ko) n'est plus dans le bundle initial : importé au premier PDF.
import type { jsPDF } from 'jspdf';
import { formatAge } from './ageUtils';
import { formatNomPropre, formatDocteur, formatCabinet, civilite } from './formatName';
import { printedPosologie } from './posologie';

interface MedicationLine {
  nom: string;
  posologie: string;
  duree: string;
  quantite: string;
}

export interface PdfInteractionAlert {
  severite: 'contre_indication' | 'a_evaluer' | 'majeure' | 'precaution' | 'moderee' | 'mineure' | 'non_classee' | 'info';
  description: string;
  involved: string[];
  type: 'drug_drug' | 'contraindication' | 'info';
}

export interface PdfOrdonnanceData {
  ordreNumber: string;
  logo_url?: string | null;
  doctor: {
    prenom: string;
    nom: string;
    specialite?: string | null;
    rpps?: string | null;
    ordre_number?: string | null;
  };
  org: {
    name: string;
    adresse?: string | null;
    telephone?: string | null;
  };
  patient: {
    prenom: string;
    nom: string;
    // ── Sprint #3 — Optional enrichment fields (gracefully skipped if absent) ─
    sexe?: string | null;
    date_naissance?: string | null;
    pathologies?: string[] | null;
  };
  motif?: string;
  medications: MedicationLine[];
  remarks?: string;
  nextAppointment?: string;
  date: string;
  interactionAlerts?: PdfInteractionAlert[];
  /**
   * Préférence du médecin (doctors.show_patient_name_on_pdf, Paramètres › Cabinet) :
   * nom et âge du patient imprimés sur l'ordonnance médicamenteuse. Désactivée par défaut.
   * Sans effet sur les pages d'examens, les certificats et les lettres (patient toujours imprimé).
   */
  showPatientName?: boolean;
}

/**
 * Ligne « Patient : … » de l'ordonnance médicamenteuse, ou null si le médecin n'a pas activé
 * l'option : dans ce cas ni le nom ni l'âge ne sont imprimés.
 */
export function ordonnancePatientLine(
  patient: PdfOrdonnanceData['patient'], showPatientName: boolean | undefined,
): string | null {
  if (!showPatientName) return null;
  const ageStr = formatAge(patient.date_naissance);
  const fullName = `${formatNomPropre(patient.prenom)} ${formatNomPropre(patient.nom)}`.trim();
  // Même civilité que sur les pages d'examens : « M. », « Mme », « M./Mme » si sexe inconnu.
  return `Patient : ${civilite(patient.sexe)} ${fullName || '—'}${ageStr ? ` — ${ageStr}` : ''}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-');
    // Trim time component if present in y/d
    return `${(d || '').slice(0, 2)}/${m}/${y.slice(0, 4)}`;
  }
  return dateStr;
}


export interface PdfImage { data: string; format: 'PNG' | 'JPEG' }

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Sprint 4d-ter — Image prête pour jsPDF, à la résolution utile à l'impression.
 *
 * Avant : le filigrane (PNG 1600×1600 avec transparence) était inséré tel quel dans un PDF
 * NON compressé → jsPDF stockait les pixels décodés + le masque alpha (≈ 10 Mo par page).
 * Désormais : l'image est réduite à `maxPx` pixels sur son plus grand côté (canvas), ce qui
 * correspond à ~150-200 dpi pour sa taille imprimée, et le PDF est compressé (Flate).
 * Le format d'origine est conservé (PNG : transparence préservée ; JPEG : qualité 0,85).
 * En cas d'échec de la réduction, l'image d'origine est utilisée (le PDF reste compressé).
 */
async function urlToPdfImage(url: string, maxPx: number): Promise<PdfImage> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Image fetch failed: ${resp.status}`);
  const blob = await resp.blob();
  const format: 'PNG' | 'JPEG' = blob.type.includes('png') ? 'PNG' : 'JPEG';
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
    if (scale < 1) {
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, 0, 0, w, h);
        bitmap.close?.();
        return { data: canvas.toDataURL(format === 'PNG' ? 'image/png' : 'image/jpeg', 0.85), format };
      }
    }
    bitmap.close?.();
  } catch (e) {
    console.warn('[pdfService] réduction d’image impossible, image d’origine utilisée :', e);
  }
  return { data: await blobToDataUrl(blob), format };
}

/** Charge une image (réduite à maxPx) ; null en cas d'échec : le PDF n'est jamais bloqué. */
export async function loadPdfImage(url: string, maxPx: number): Promise<PdfImage | null> {
  try {
    return await urlToPdfImage(url, maxPx);
  } catch (e) {
    console.warn(`[pdfService] Optional asset missing: ${url}`, e);
    return null;
  }
}

// Résolutions cibles (≈ 150-200 dpi à la taille imprimée) :
//   filigrane 110 mm → 800 px ; logo de 12 à 18 mm de haut, largeur libre → 600 px.
export const PDF_WATERMARK_MAX_PX = 800;
export const PDF_LOGO_MAX_PX = 600;

/* ════════════════════════════════════════════════════════════════════════════
   ORDONNANCE — Sprint #3 brand refresh
   ════════════════════════════════════════════════════════════════════════════ */

// ── Brand colors (hex strings — jsPDF accepts them directly) ─────────────────
const C = {
  INK_NAVY:      '#0A1628',
  INK_MUTED:     '#475569',
  INK_FAINT:     '#94A3B8',
  GREEN:         '#00A86B',
  GREEN_DEEP:    '#006B47',
  DIVIDER:       '#E5E5E0',
  WHITE:         '#FFFFFF',
};

// ── Page geometry (A4 portrait) ──────────────────────────────────────────────
const PAGE_W   = 210;
const PAGE_H   = 297;
const MARGIN_L = 18;
const MARGIN_R = 18;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

/* ════════════════════════════════════════════════════════════════════════════
   EN-TÊTE PARTAGÉ — ordonnance et certificats (Sprint 4d-quater)
   Même habillage (bandes vertes, filigrane) et même bloc d'identité : médecin,
   spécialité, N° d'Ordre, INPE, cabinet, adresse, téléphone.
   ════════════════════════════════════════════════════════════════════════════ */

export interface PdfDocumentHeader {
  doctor: { prenom: string; nom: string; specialite?: string | null; rpps?: string | null; ordre_number?: string | null };
  org: { name: string; adresse?: string | null; telephone?: string | null };
  /** Titre du bloc droit : « ORDONNANCE », « CERTIFICAT MÉDICAL »… */
  title: string;
  /** Date du document : SEULE occurrence imprimée (ni bloc signature, ni pied de page). */
  dateIso: string;
  /**
   * Numéro du document, imprimé discrètement sous la date — certificats uniquement.
   * L'ordonnance et les pages d'examens ne portent plus de numéro à l'impression.
   */
  numero?: string | null;
}

export interface PdfChromeAssets { logo: PdfImage | null; watermark: PdfImage | null }

/** Logo du cabinet (facultatif) + filigrane, réduits à la résolution d'impression. */
export async function loadPdfChromeAssets(logoUrl?: string | null): Promise<PdfChromeAssets> {
  const [logo, watermark] = await Promise.all([
    logoUrl ? loadPdfImage(logoUrl, PDF_LOGO_MAX_PX) : Promise.resolve(null),
    loadPdfImage('/pdf-assets/watermark.png', PDF_WATERMARK_MAX_PX),
  ]);
  return { logo, watermark };
}

/** Habillage de page : bandes vertes haut / bas + filigrane centré à 6 % d'opacité. */
export function drawPageChrome(doc: jsPDF, watermark: PdfImage | null): void {
  // Top green band — 4mm
  doc.setFillColor(C.GREEN);
  doc.rect(0, 0, PAGE_W, 4, 'F');
  // Bottom green band — 2mm
  doc.rect(0, PAGE_H - 2, PAGE_W, 2, 'F');

  // Watermark centered at 6% opacity
  if (watermark) {
    try {
      const wSize = 110;
      const gs = (doc as unknown as { GState: (opts: { opacity: number }) => unknown }).GState({ opacity: 0.06 });
      // @ts-expect-error setGState exists at runtime in jsPDF v4
      doc.setGState(gs);
      doc.addImage(watermark.data, watermark.format, (PAGE_W - wSize) / 2, (PAGE_H - wSize) / 2, wSize, wSize);
      const gsReset = (doc as unknown as { GState: (opts: { opacity: number }) => unknown }).GState({ opacity: 1 });
      // @ts-expect-error setGState exists at runtime in jsPDF v4
      doc.setGState(gsReset);
    } catch {
      /* opacity API unsupported — skip watermark silently */
    }
  }
}

/**
 * En-tête : identité médicale (gauche) + titre / date (+ numéro des certificats) (droite).
 * Renvoie le y (mm) où tracer le séparateur qui suit.
 */
export function drawDocumentHeader(doc: jsPDF, h: PdfDocumentHeader, logo: PdfImage | null): number {
  const headerTop = 16;
  let lhY = headerTop;

  if (logo) {
    doc.addImage(logo.data, logo.format, MARGIN_L, lhY, 0, 12);
    lhY += 14;
  }

  // Identité du médecin prescripteur — « Dr Prénom Nom »
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(C.INK_NAVY);
  lhY += 5;
  doc.text(formatDocteur(h.doctor.prenom, h.doctor.nom), MARGIN_L, lhY);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_MUTED);
  if (h.doctor.specialite)   { lhY += 4.5; doc.text(h.doctor.specialite, MARGIN_L, lhY); }
  if (h.doctor.ordre_number) { lhY += 4;   doc.text(`N° Ordre : ${h.doctor.ordre_number}`, MARGIN_L, lhY); }
  if (h.doctor.rpps)         { lhY += 4;   doc.text(`INPE : ${h.doctor.rpps}`, MARGIN_L, lhY); }

  // Coordonnées du cabinet (taille réduite, estompées)
  lhY += 2.5;
  doc.setFontSize(7.5);
  doc.setTextColor(C.INK_FAINT);
  if (h.org.name)      { lhY += 3.5; doc.text(formatCabinet(h.org.name), MARGIN_L, lhY); }
  if (h.org.adresse)   { lhY += 3.5; doc.text(h.org.adresse, MARGIN_L, lhY); }
  if (h.org.telephone) { lhY += 3.5; doc.text(`Tél : ${h.org.telephone}`, MARGIN_L, lhY); }
  lhY += 2;

  // Bloc droit — titre + date + numéro (discret)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(C.INK_NAVY);
  doc.text(h.title, PAGE_W - MARGIN_R, headerTop + 6, { align: 'right' });
  // Date : unique occurrence du document, donc lisible (9,5 pt, encre soutenue).
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_MUTED);
  doc.text(`Le ${formatDate(h.dateIso)}`, PAGE_W - MARGIN_R, headerTop + 12, { align: 'right' });
  if (h.numero) {
    doc.setFontSize(7);
    doc.setTextColor(C.INK_FAINT);
    doc.text(`N° ${h.numero}`, PAGE_W - MARGIN_R, headerTop + 16, { align: 'right' });
  }

  return Math.max(lhY, headerTop + 19);
}

/** Géométrie commune (mm) pour les documents qui partagent l'en-tête. */
export const PDF_LAYOUT = { PAGE_W, PAGE_H, MARGIN_L, MARGIN_R, CONTENT_W } as const;
export const PDF_COLORS = C;

/**
 * Sprint 5 — Construit le PDF de l'ordonnance SANS l'enregistrer : les pages « Examens à
 * réaliser » peuvent ainsi suivre l'ordonnance dans le même fichier (lib/examPdf).
 */
export async function buildOrdonnancePdf(
  data: PdfOrdonnanceData, opts: { compress?: boolean } = {},
): Promise<{ doc: jsPDF; assets: PdfChromeAssets; fileName: string }> {
  // compress: true → flux (texte vectoriel et images) compressés ; indispensable pour le poids.
  // (false : réservé aux tests, pour relire le texte des pages.)
  const { jsPDF: JsPDF } = await import('jspdf');
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: opts.compress ?? true });

  // Load cabinet logo (non-fatal if missing) + optional watermark
  const { logo: logoAsset, watermark: watermarkAsset } = await loadPdfChromeAssets(data.logo_url);
  const decoratePage = () => drawPageChrome(doc, watermarkAsset);

  decoratePage();
  // ── En-tête partagé avec les certificats ───────────────────────────────────
  let y = drawDocumentHeader(doc, {
    // Numéro d'ordonnance : visible dans l'application et en base, jamais imprimé.
    doctor: data.doctor, org: data.org, title: 'ORDONNANCE', dateIso: data.date,
  }, logoAsset);

  // ── Séparateur ─────────────────────────────────────────────────────────────
  doc.setDrawColor(C.DIVIDER);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
  y += 7;

  // ── Identité patient — selon la préférence du médecin (désactivée par défaut) ──
  // Désactivée : ni nom ni âge sur l'ordonnance médicamenteuse. La date n'apparaît qu'une
  // fois, dans l'en-tête ; l'adresse du cabinet aussi.
  const patientLine = ordonnancePatientLine(data.patient, data.showPatientName);
  if (patientLine) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(C.INK_NAVY);
    const patientLineWrapped = doc.splitTextToSize(patientLine, CONTENT_W);
    doc.text(patientLineWrapped, MARGIN_L, y);
    y += patientLineWrapped.length > 1 ? patientLineWrapped.length * 4.5 + 2 : 6;

    // ── Séparateur ───────────────────────────────────────────────────────────
    doc.setDrawColor(C.DIVIDER);
    doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
    y += 8;
  } else {
    y += 1;
  }

  // ── Médicaments ────────────────────────────────────────────────────────────
  data.medications.forEach((med, idx) => {
    // Page-break safety — leave room for signature + footer chrome
    if (y > 230) {
      doc.addPage();
      decoratePage();
      y = 22;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(C.INK_NAVY);
    const nameWrapped = doc.splitTextToSize(`${idx + 1}.  ${med.nom}`, CONTENT_W);
    doc.text(nameWrapped, MARGIN_L, y);
    y += nameWrapped.length * 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(C.INK_MUTED);
    // Ligne sans posologie : imprimée sans posologie (aucun texte de remplacement).
    const posologie = printedPosologie(med.posologie);
    if (posologie) {
      const lines = doc.splitTextToSize(`     Posologie : ${posologie}`, CONTENT_W);
      doc.text(lines, MARGIN_L, y); y += lines.length * 4.5;
    }
    if (med.duree) {
      const lines = doc.splitTextToSize(`     Durée : ${med.duree.trim()}`, CONTENT_W);
      doc.text(lines, MARGIN_L, y); y += lines.length * 4.5;
    }
    // Quantité intentionnellement omise de l'ordonnance imprimée
    y += 2.5;
  });

  // Note du médecin
  if (data.remarks) {
    if (y > 235) { doc.addPage(); decoratePage(); y = 22; }
    y += 4;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(C.GREEN);
    doc.text('NOTE DU MÉDECIN', MARGIN_L, y);
    y += 4.5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(C.INK_MUTED);
    const lines = doc.splitTextToSize(data.remarks.trim(), CONTENT_W);
    doc.text(lines, MARGIN_L, y);
    y += lines.length * 4.5;
  }

  // Next appointment
  if (data.nextAppointment) {
    if (y > 240) { doc.addPage(); decoratePage(); y = 22; }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(C.INK_MUTED);
    doc.text(`Prochain rendez-vous : ${formatDate(data.nextAppointment)}`, MARGIN_L, y);
    y += 5;
  }

  // ── Signature / cachet (la date est dans l'en-tête) ───────────────────────
  drawSignatureBlock(doc, Math.max(y + 10, 232));

  // ── Pied de page neutre : cabinet seul (ni date, ni numéro d'ordonnance) ──
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_FAINT);
  doc.text(formatCabinet(data.org.name), PAGE_W / 2, PAGE_H - 6, { align: 'center' });

  const fileName = `ordonnance_${data.patient.nom}_${data.patient.prenom}_${data.date}.pdf`
    .replace(/[^a-zA-Z0-9_.-]/g, '_');
  return { doc, assets: { logo: logoAsset, watermark: watermarkAsset }, fileName };
}

export async function generateOrdonnancePdf(data: PdfOrdonnanceData): Promise<void> {
  const { doc, fileName } = await buildOrdonnancePdf(data);
  stampPageNumbers(doc);
  doc.save(fileName);
}

/**
 * Sprint 5c — « Page x/N » sur TOUT le document (ordonnance + pages d'examens), en bas à
 * droite. À appeler une fois, quand toutes les pages sont dessinées. Rien si une seule page.
 */
export function stampPageNumbers(doc: jsPDF): number {
  const n = doc.getNumberOfPages();
  if (n < 2) return n;
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(C.INK_FAINT);
    doc.text(`Page ${i}/${n}`, PAGE_W - MARGIN_R, PAGE_H - 6, { align: 'right' });
  }
  return n;
}

/* ════════════════════════════════════════════════════════════════════════════
   BLOC DE CLÔTURE — commun à l'ordonnance, aux examens et aux certificats
   Zone « Signature et cachet du médecin », alignée à droite. La date n'y figure
   plus : elle est imprimée une seule fois, dans l'en-tête (drawDocumentHeader).
   ════════════════════════════════════════════════════════════════════════════ */

/** Dessine la zone signature/cachet à partir de `topY` (mm) ; renvoie le y du bas du bloc. */
export function drawSignatureBlock(doc: jsPDF, topY: number): number {
  const blockX = PAGE_W - MARGIN_R - 60;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_FAINT);
  doc.text('Signature et cachet du médecin', blockX, topY + 4);

  doc.setDrawColor(C.DIVIDER);
  doc.setLineWidth(0.4);
  doc.line(blockX, topY + 22, PAGE_W - MARGIN_R, topY + 22);

  return topY + 22;
}
