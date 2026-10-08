import jsPDF from 'jspdf';
import { formatAge } from './ageUtils';
import { formatNomPropre } from './formatName';

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

export async function generateOrdonnancePdf(data: PdfOrdonnanceData): Promise<void> {
  // compress: true → flux (texte vectoriel et images) compressés ; indispensable pour le poids.
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  // Load cabinet logo (non-fatal if missing) + optional watermark
  const [logoAsset, watermarkAsset] = await Promise.all([
    data.logo_url ? loadPdfImage(data.logo_url, PDF_LOGO_MAX_PX) : Promise.resolve(null),
    loadPdfImage('/pdf-assets/watermark.png', PDF_WATERMARK_MAX_PX),
  ]);

  // Helper: draw the per-page chrome (green bands + faint watermark)
  const decoratePage = () => {
    // Top green band — 4mm
    doc.setFillColor(C.GREEN);
    doc.rect(0, 0, PAGE_W, 4, 'F');
    // Bottom green band — 2mm
    doc.rect(0, PAGE_H - 2, PAGE_W, 2, 'F');

    // Watermark centered at 6% opacity
    if (watermarkAsset) {
      try {
        const wSize = 110;
        const gs = (doc as unknown as { GState: (opts: { opacity: number }) => unknown }).GState({ opacity: 0.06 });
        // @ts-expect-error setGState exists at runtime in jsPDF v4
        doc.setGState(gs);
        doc.addImage(watermarkAsset.data, watermarkAsset.format, (PAGE_W - wSize) / 2, (PAGE_H - wSize) / 2, wSize, wSize);
        const gsReset = (doc as unknown as { GState: (opts: { opacity: number }) => unknown }).GState({ opacity: 1 });
        // @ts-expect-error setGState exists at runtime in jsPDF v4
        doc.setGState(gsReset);
      } catch {
        /* opacity API unsupported — skip watermark silently */
      }
    }
  };

  decoratePage();
  let y = 16;

  // ── En-tête : identité médicale (gauche) + ORDONNANCE / date (droite) ───────
  const headerTop = y;
  let lhY = headerTop;

  if (logoAsset) {
    doc.addImage(logoAsset.data, logoAsset.format, MARGIN_L, lhY, 0, 12);
    lhY += 14;
  }

  // Identité du médecin prescripteur
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(C.INK_NAVY);
  lhY += 5;
  doc.text(`Dr. ${formatNomPropre(data.doctor.prenom)} ${formatNomPropre(data.doctor.nom)}`, MARGIN_L, lhY);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_MUTED);
  if (data.doctor.specialite)   { lhY += 4.5; doc.text(data.doctor.specialite, MARGIN_L, lhY); }
  if (data.doctor.ordre_number) { lhY += 4;   doc.text(`N° Ordre : ${data.doctor.ordre_number}`, MARGIN_L, lhY); }
  if (data.doctor.rpps)         { lhY += 4;   doc.text(`INPE : ${data.doctor.rpps}`, MARGIN_L, lhY); }

  // Coordonnées du cabinet (taille réduite, estompées)
  lhY += 2.5;
  doc.setFontSize(7.5);
  doc.setTextColor(C.INK_FAINT);
  lhY += 3.5; doc.text(data.org.name, MARGIN_L, lhY);
  if (data.org.adresse)   { lhY += 3.5; doc.text(data.org.adresse, MARGIN_L, lhY); }
  if (data.org.telephone) { lhY += 3.5; doc.text(`Tél : ${data.org.telephone}`, MARGIN_L, lhY); }
  lhY += 2;

  // Bloc droit — titre ORDONNANCE + date + N° d'ordonnance (discret)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(C.INK_NAVY);
  doc.text('ORDONNANCE', PAGE_W - MARGIN_R, headerTop + 6, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_FAINT);
  doc.text(formatDate(data.date), PAGE_W - MARGIN_R, headerTop + 12, { align: 'right' });
  if (data.ordreNumber) {
    doc.setFontSize(7);
    doc.text(`N° ${data.ordreNumber}`, PAGE_W - MARGIN_R, headerTop + 16, { align: 'right' });
  }

  y = Math.max(lhY, headerTop + 19);

  // ── Séparateur ─────────────────────────────────────────────────────────────
  doc.setDrawColor(C.DIVIDER);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
  y += 7;

  // ── Identité patient — TOUJOURS imprimée (Sprint 4d-ter) ──────────────────
  // Une ordonnance médicamenteuse doit identifier le patient : l'ancienne préférence
  // « Afficher le nom du patient » (désactivée par défaut) est supprimée.
  // L'adresse du cabinet n'apparaît qu'une fois, dans l'en-tête ; la date est
  // reprise dans le bloc de clôture (drawSignatureBlock).
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_NAVY);
  {
    const ageStr = formatAge(data.patient.date_naissance);
    const fullName = `${formatNomPropre(data.patient.prenom)} ${formatNomPropre(data.patient.nom)}`.trim();
    const patientLine = `Patient : ${fullName || '—'}${ageStr ? ` — ${ageStr}` : ''}`;
    const patientLineWrapped = doc.splitTextToSize(patientLine, CONTENT_W);
    doc.text(patientLineWrapped, MARGIN_L, y);
    y += patientLineWrapped.length > 1 ? patientLineWrapped.length * 4.5 + 2 : 6;
  }

  // ── Séparateur ─────────────────────────────────────────────────────────────
  doc.setDrawColor(C.DIVIDER);
  doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
  y += 8;

  // ── Médicaments ────────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(C.GREEN);
  doc.text(`ORDONNANCE — ${formatDate(data.date)}`, MARGIN_L, y);
  y += 7;

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
    if (med.posologie) {
      const lines = doc.splitTextToSize(`     Posologie : ${med.posologie.trim()}`, CONTENT_W);
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

  // ── Date + signature/cachet ────────────────────────────────────────────────
  drawSignatureBlock(doc, Math.max(y + 10, 232), data.date);

  // ── Pied de page neutre ────────────────────────────────────────────────────
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_FAINT);
  doc.text(
    [data.org.name, formatDate(data.date), data.ordreNumber ? `N° ${data.ordreNumber}` : ''].filter(Boolean).join('  ·  '),
    PAGE_W / 2, PAGE_H - 6,
    { align: 'center' }
  );

  // ── Save ───────────────────────────────────────────────────────────────────
  const fileName = `ordonnance_${data.patient.nom}_${data.patient.prenom}_${data.date}.pdf`
    .replace(/[^a-zA-Z0-9_.-]/g, '_');
  doc.save(fileName);
}

/* ════════════════════════════════════════════════════════════════════════════
   BLOC DE CLÔTURE — commun à l'ordonnance et aux certificats
   Date + zone « Signature et cachet du médecin », alignés à droite.
   Aucune ville en dur : la date seule, comme sur l'ordonnance.
   ════════════════════════════════════════════════════════════════════════════ */

/** Dessine le bloc date + signature/cachet à partir de `topY` (mm) ; renvoie le y du bas du bloc. */
export function drawSignatureBlock(doc: jsPDF, topY: number, dateIso: string): number {
  const blockX = PAGE_W - MARGIN_R - 60;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_MUTED);
  doc.text(`Le ${formatDate(dateIso)}`, PAGE_W - MARGIN_R, topY, { align: 'right' });

  doc.setTextColor(C.INK_FAINT);
  doc.text('Signature et cachet du médecin', blockX, topY + 7);

  doc.setDrawColor(C.DIVIDER);
  doc.setLineWidth(0.4);
  doc.line(blockX, topY + 22, PAGE_W - MARGIN_R, topY + 22);

  return topY + 22;
}
