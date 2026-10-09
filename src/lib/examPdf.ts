// Sprint 5 — PDF « Examens à réaliser ».
//
// Même habillage et même en-tête que l'ordonnance (lib/pdfService). Les pages viennent de
// la fonction pure buildExamPages : ce module ne décide de rien, il dessine.
// Poids : texte vectoriel + un filigrane réduit, partagé par toutes les pages (< 500 Ko).

import jsPDF from 'jspdf';
import {
  buildOrdonnancePdf, drawDocumentHeader, drawPageChrome, drawSignatureBlock, loadPdfChromeAssets, stampPageNumbers,
  PDF_COLORS as C, PDF_LAYOUT, type PdfChromeAssets, type PdfDocumentHeader, type PdfImage, type PdfOrdonnanceData,
} from './pdfService';
import { formatCabinet } from './formatName';
import { arabicInstructions, fastingLabel, type ExamPage } from './examDocument';
import { formatFr } from './examRequest';

const { PAGE_W, PAGE_H, MARGIN_L, MARGIN_R, CONTENT_W } = PDF_LAYOUT;
const AMBER = '#B45309';
const BOTTOM_LIMIT = 236; // au-delà : nouvelle page (place pour la signature et le pied)

/**
 * Consigne bilingue français / arabe : DÉSACTIVÉE tant que le rendu n'a pas été contrôlé à
 * l'œil sur un PDF réel (exigence : arabe parfait ou rien). Le code de rendu est prêt
 * (renderArabicLine) ; passer à true après validation visuelle sur ordinateur et mobile.
 */
export const EXAM_PDF_BILINGUAL = false;

export type ExamPdfHeader = Pick<PdfDocumentHeader, 'doctor' | 'org'>;

interface ArabicImage extends PdfImage { wMm: number; hMm: number }

/**
 * Consigne en arabe rendue par le moteur de texte du NAVIGATEUR (ligatures et sens de
 * lecture corrects), puis insérée comme image : jsPDF ne sait pas mettre en forme l'arabe
 * avec ses polices standard. Hors navigateur (tests), renvoie null : la ligne est omise.
 */
export function renderArabicLine(text: string, heightMm = 5): ArabicImage | null {
  try {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const px = 56;
    const font = `600 ${px}px "Noto Naskh Arabic", "Noto Sans Arabic", "Geeza Pro", "Segoe UI", Tahoma, Arial, sans-serif`;
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width) + 16;
    const h = Math.ceil(px * 1.7);
    if (w <= 16 || w > 4000) return null;
    canvas.width = w;
    canvas.height = h;
    const c2 = canvas.getContext('2d');
    if (!c2) return null;
    c2.font = font;
    c2.direction = 'rtl';
    c2.textAlign = 'right';
    c2.textBaseline = 'middle';
    c2.fillStyle = C.INK_NAVY;
    c2.fillText(text, w - 8, h / 2);
    return { data: canvas.toDataURL('image/png'), format: 'PNG', hMm: heightMm, wMm: (w / h) * heightMm };
  } catch {
    return null;
  }
}

function drawFooter(doc: jsPDF, header: ExamPdfHeader, page: ExamPage): void {
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_FAINT);
  doc.text(
    // Numéro de page : posé à la fin sur TOUT le document (stampPageNumbers), ordonnance comprise.
    [formatCabinet(header.org.name), formatFr(page.dateIso), `N° ${page.numero}`].filter(Boolean).join('  ·  '),
    PAGE_W / 2, PAGE_H - 6, { align: 'center' },
  );
}

function drawExamPage(doc: jsPDF, page: ExamPage, header: ExamPdfHeader, assets: PdfChromeAssets, bilingual: boolean): void {
  const chrome = () => drawPageChrome(doc, assets.watermark);
  chrome();
  let y = drawDocumentHeader(doc, {
    doctor: header.doctor, org: header.org, title: 'EXAMENS À RÉALISER', dateIso: page.dateIso, numero: page.numero,
  }, assets.logo);

  const rule = () => { doc.setDrawColor(C.DIVIDER); doc.setLineWidth(0.4); doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y); };
  const ensure = (need: number) => {
    if (y + need <= BOTTOM_LIMIT) return;
    drawFooter(doc, header, page);
    doc.addPage();
    chrome();
    y = 22;
  };

  rule();
  y += 7;

  // Bloc patient (civilité, nom, prénom, âge)
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_NAVY);
  const pl = doc.splitTextToSize(`Patient : ${page.patientLine}`, CONTENT_W);
  doc.text(pl, MARGIN_L, y);
  y += pl.length > 1 ? pl.length * 4.5 + 2 : 6;
  rule();
  y += 8;

  // Intitulé de la page + destinataire
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(C.GREEN_DEEP);
  const hl = doc.splitTextToSize(page.heading, CONTENT_W);
  doc.text(hl, MARGIN_L, y);
  y += hl.length * 5.6;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_FAINT);
  doc.text(page.destination, MARGIN_L, y);
  // « À réaliser avant le … » en arabe, à droite de la même ligne (si le rendu est disponible).
  if (bilingual && !page.urgent) {
    const txt = arabicInstructions({ fasting: null, urgent: false, echeanceDate: page.echeanceDate })[0];
    const ar = txt ? renderArabicLine(txt, 4.4) : null;
    if (ar) doc.addImage(ar.data, ar.format, PAGE_W - MARGIN_R - ar.wMm, y - 3.4, ar.wMm, ar.hMm);
  }
  y += 6.5;

  // Échéance
  doc.setFontSize(10);
  doc.setFont('helvetica', page.urgent ? 'bold' : 'normal');
  doc.setTextColor(C.INK_NAVY);
  const sl = doc.splitTextToSize(page.subtitle, CONTENT_W);
  doc.text(sl, MARGIN_L, y);
  y += sl.length * 4.8 + 3;

  // Encadré « À jeun », placé AVANT la liste : c'est la consigne que le patient doit voir.
  if (page.fasting) {
    const h = 15;
    doc.setDrawColor(AMBER);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN_L, y, CONTENT_W, h, 2, 2);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(C.INK_NAVY);
    doc.text(fastingLabel(page.fasting), MARGIN_L + 4, y + 6);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(C.INK_MUTED);
    doc.text(
      page.fasting.hours
        ? `Ne rien manger ni boire (sauf de l'eau) pendant les ${page.fasting.hours} heures qui précèdent l'examen.`
        : "Ne rien manger ni boire (sauf de l'eau) avant l'examen.",
      MARGIN_L + 4, y + 11.2,
    );
    if (bilingual) {
      const ar = renderArabicLine(arabicInstructions({ fasting: page.fasting, urgent: true, echeanceDate: page.echeanceDate })[0] ?? '');
      if (ar) doc.addImage(ar.data, ar.format, PAGE_W - MARGIN_R - 4 - ar.wMm, y + 2.2, ar.wMm, ar.hMm);
    }
    y += h + 6;
  }

  // Sprint 5c — imagerie injectée : créatininémie à apporter (et metformine le cas échéant)
  if (page.notes.length > 0) {
    const h = 5 + page.notes.length * 5;
    doc.setDrawColor(C.INK_MUTED);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN_L, y, CONTENT_W, h, 2, 2);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(C.INK_NAVY);
    page.notes.forEach((n, i) => doc.text(`•  ${n}`, MARGIN_L + 4, y + 6 + i * 5));
    y += h + 6;
  }

  // Renseignements cliniques
  if (page.renseignements) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(C.GREEN);
    doc.text('RENSEIGNEMENTS CLINIQUES', MARGIN_L, y);
    y += 4.5;
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(C.INK_MUTED);
    const rl = doc.splitTextToSize(page.renseignements, CONTENT_W);
    for (const line of rl as string[]) { ensure(5); doc.text(line, MARGIN_L, y); y += 4.6; }
    y += 3;
  }

  // Examens
  const total = page.groups.reduce((n, g) => n + g.items.length, 0);
  const single = page.kind === 'imagerie' || page.kind === 'exploration';
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(C.GREEN);
  ensure(10);
  doc.text(single ? 'EXAMEN DEMANDÉ' : `EXAMENS DEMANDÉS (${total})`, MARGIN_L, y);
  y += 6;

  // Biologie fournie : deux colonnes. Sinon une colonne pleine largeur.
  const twoCols = page.kind === 'biologie' && total > 12;
  const colW = twoCols ? (CONTENT_W - 8) / 2 : CONTENT_W;
  const box = 2.6;

  const measureItem = (it: ExamPage['groups'][number]['items'][number], w: number) => {
    doc.setFontSize(single ? 12 : 10.5);
    doc.setFont('helvetica', 'bold');
    const name = doc.splitTextToSize(it.libelle, w - box - 3) as string[];
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const prec = it.precision ? (doc.splitTextToSize(it.precision, w - box - 3) as string[]) : [];
    const ques = it.question ? (doc.splitTextToSize(`Question posée : ${it.question}`, w - box - 3) as string[]) : [];
    const h = name.length * (single ? 5.6 : 4.8) + prec.length * 4.2 + ques.length * 4.2 + (single ? 3 : 1.6);
    return { name, prec, ques, h };
  };
  const drawItem = (it: ExamPage['groups'][number]['items'][number], x: number, yy: number, w: number): number => {
    const m = measureItem(it, w);
    const lh = single ? 5.6 : 4.8;
    doc.setDrawColor(C.INK_MUTED);
    doc.setLineWidth(0.25);
    doc.rect(x, yy - box + 0.3, box, box);
    doc.setFontSize(single ? 12 : 10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(C.INK_NAVY);
    doc.text(m.name, x + box + 3, yy);
    let cy = yy + m.name.length * lh;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(C.INK_MUTED);
    if (m.prec.length) { doc.text(m.prec, x + box + 3, cy - 0.6); cy += m.prec.length * 4.2; }
    if (m.ques.length) {
      doc.setFont('helvetica', 'italic');
      doc.text(m.ques, x + box + 3, cy - 0.6);
      cy += m.ques.length * 4.2;
    }
    return yy + m.h;
  };

  if (!twoCols) {
    for (const g of page.groups) {
      if (g.label) {
        ensure(12);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(C.INK_MUTED);
        doc.text(g.label.toLocaleUpperCase('fr-FR'), MARGIN_L, y);
        y += 5;
      }
      for (const it of g.items) {
        ensure(measureItem(it, colW).h + 1);
        y = drawItem(it, MARGIN_L, y, colW);
      }
      y += 2.5;
    }
  } else {
    // Flux en deux colonnes : colonnes équilibrées si tout tient, sinon remplies jusqu'en bas ;
    // au-delà, la suite passe sur une nouvelle page. Un titre de groupe reste avec son 1er examen.
    type Block = { group: string; label: string | null; it: ExamPage['groups'][number]['items'][number]; h: number; gap: number };
    const blocks: Block[] = [];
    for (const g of page.groups) {
      g.items.forEach((it, i) => blocks.push({
        group: g.label ?? '', label: i === 0 ? (g.label ?? '') : null, it,
        h: measureItem(it, colW).h + (i === 0 ? 5 : 0), gap: i === g.items.length - 1 ? 2.5 : 0,
      }));
    }
    const totalH = blocks.reduce((s, b) => s + b.h + b.gap, 0);
    let startY = y;
    const fitsBalanced = startY + totalH / 2 + 14 <= BOTTOM_LIMIT;
    let colLimit = fitsBalanced ? startY + totalH / 2 + 6 : BOTTOM_LIMIT;
    let col = 0;
    let cy = startY;
    let maxY = y;
    for (const b of blocks) {
      let cont = false;
      if (cy + b.h > colLimit && cy > startY) {
        cont = b.label === null && !!b.group; // groupe coupé : son titre est rappelé « (suite) »
        if (col === 0) { col = 1; colLimit = BOTTOM_LIMIT; cy = startY; }
        else {
          drawFooter(doc, header, page);
          doc.addPage();
          chrome();
          startY = 22; col = 0; cy = startY; colLimit = BOTTOM_LIMIT; maxY = startY;
        }
      }
      const x = MARGIN_L + col * (colW + 8);
      const label = b.label !== null ? b.label : cont ? `${b.group} (suite)` : null;
      if (label !== null) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(C.INK_MUTED);
        doc.text(label.toLocaleUpperCase('fr-FR'), x, cy);
        cy += 5;
      }
      cy = drawItem(b.it, x, cy, colW) + b.gap;
      maxY = Math.max(maxY, cy);
    }
    y = maxY;
  }

  if (page.ald) {
    // Mention courte : tolérée un peu plus bas que la liste (la signature suit).
    if (y > BOTTOM_LIMIT + 12) ensure(7);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(C.INK_MUTED);
    doc.text('En rapport avec une affection de longue durée (ALD / ALC).', MARGIN_L, y + 2);
    y += 7;
  }

  drawSignatureBlock(doc, Math.max(y + 8, 232), page.dateIso);
  drawFooter(doc, header, page);
}

/** Ajoute les pages d'examens à un document existant (après l'ordonnance) ou vide. */
export function appendExamPages(
  doc: jsPDF, pages: ExamPage[], header: ExamPdfHeader, assets: PdfChromeAssets,
  opts: { startOnNewPage: boolean; bilingual?: boolean },
): void {
  pages.forEach((p, i) => {
    if (i > 0 || opts.startOnNewPage) doc.addPage();
    drawExamPage(doc, p, header, assets, opts.bilingual ?? EXAM_PDF_BILINGUAL);
  });
}

export interface PdfFile { blob: Blob; fileName: string }

/** PDF autonome d'une demande d'examens. */
export async function buildExamPdf(
  pages: ExamPage[], header: ExamPdfHeader, opts: { logoUrl?: string | null; fileName: string; assets?: PdfChromeAssets; bilingual?: boolean },
): Promise<PdfFile> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const assets = opts.assets ?? await loadPdfChromeAssets(opts.logoUrl);
  appendExamPages(doc, pages, header, assets, { startOnNewPage: false, bilingual: opts.bilingual });
  stampPageNumbers(doc);
  return { blob: doc.output('blob'), fileName: opts.fileName };
}

/** Ordonnance suivie des pages d'examens, dans le même PDF. */
export async function buildOrdonnanceWithExamsPdf(data: PdfOrdonnanceData, pages: ExamPage[]): Promise<PdfFile> {
  const { doc, assets, fileName } = await buildOrdonnancePdf(data);
  appendExamPages(doc, pages, { doctor: data.doctor, org: data.org }, assets, { startOnNewPage: true });
  stampPageNumbers(doc);
  return { blob: doc.output('blob'), fileName };
}

// ─── Sorties : téléchargement, impression, partage natif ─────────────────────

export function downloadPdf(file: PdfFile): void {
  const url = URL.createObjectURL(file.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const isTouchDevice = () =>
  typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0) && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

/** Le partage natif de fichiers est disponible (mobile : WhatsApp, e-mail…). */
export function canSharePdf(): boolean {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
    return navigator.canShare({ files: [new File([new Blob(['x'], { type: 'application/pdf' })], 'x.pdf', { type: 'application/pdf' })] });
  } catch {
    return false;
  }
}

/** Partage natif ; repli : téléchargement. Renvoie ce qui s'est passé. */
export async function sharePdf(file: PdfFile, title: string): Promise<'shared' | 'cancelled' | 'downloaded'> {
  try {
    const f = new File([file.blob], file.fileName, { type: 'application/pdf' });
    if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [f] })) {
      await navigator.share({ files: [f], title });
      return 'shared';
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
  }
  downloadPdf(file);
  return 'downloaded';
}

/**
 * Impression du PDF : cadre invisible + boîte d'impression du navigateur (ordinateur).
 * Sur mobile (ou si le cadre échoue), le fichier est téléchargé : il s'imprime depuis
 * la visionneuse du téléphone. Renvoie le mode utilisé.
 */
export function printPdf(file: PdfFile): Promise<'printed' | 'downloaded'> {
  return new Promise(resolve => {
    if (isTouchDevice()) { downloadPdf(file); resolve('downloaded'); return; }
    const url = URL.createObjectURL(file.blob);
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    let done = false;
    const finish = (mode: 'printed' | 'downloaded') => {
      if (done) return;
      done = true;
      if (mode === 'downloaded') { downloadPdf(file); frame.remove(); URL.revokeObjectURL(url); }
      else window.setTimeout(() => { frame.remove(); URL.revokeObjectURL(url); }, 10 * 60_000);
      resolve(mode);
    };
    frame.onload = () => {
      window.setTimeout(() => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
          finish('printed');
        } catch {
          finish('downloaded');
        }
      }, 300);
    };
    frame.onerror = () => finish('downloaded');
    window.setTimeout(() => finish('downloaded'), 6000);
    frame.src = url;
    document.body.appendChild(frame);
  });
}
