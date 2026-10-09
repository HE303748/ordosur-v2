// Sprint 6A — PDF « Récapitulatif des bilans » : dernier résultat de chaque examen, pour une
// lettre ou un confrère. Même habillage et même en-tête que l'ordonnance (lib/pdfService).
// Léger : texte vectoriel uniquement + filigrane partagé. Le contenu vient de la fonction
// pure buildRecap : ce module ne décide de rien, il dessine.

import {
  drawDocumentHeader, drawPageChrome, loadPdfChromeAssets, stampPageNumbers,
  PDF_COLORS as C, PDF_LAYOUT, type PdfChromeAssets,
} from './pdfService';
import type { ExamPdfHeader, PdfFile } from './examPdf';
import { formatFr } from './examRequest';
import type { RecapGroup } from './resultatsLogic';

const { PAGE_W, MARGIN_L, MARGIN_R, CONTENT_W } = PDF_LAYOUT;
const BOTTOM_LIMIT = 272;
const RED = '#B91C1C';

/** Les polices standard du PDF ne couvrent pas ≥ ≤ – … : équivalents sûrs. */
export function pdfSafe(s: string): string {
  return s.replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/[’‘]/g, "'").replace(/→/g, '->');
}

export function bilanFileName(patient: { nom: string; prenom: string }, dateIso: string): string {
  return `bilans_${patient.nom}_${patient.prenom}_${dateIso}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

const COLS = [
  { key: 'examen', label: 'Examen', x: 0, w: 52 },
  { key: 'valeur', label: 'Résultat', x: 52, w: 44 },
  { key: 'bornes', label: 'Bornes du labo', x: 96, w: 28 },
  { key: 'date', label: 'Date', x: 124, w: 20 },
  { key: 'precedent', label: 'Précédent', x: 144, w: CONTENT_W - 144 },
] as const;

export async function buildBilanPdf(
  groups: RecapGroup[], patientLine: string, header: ExamPdfHeader,
  opts: { dateIso: string; fileName: string; logoUrl?: string | null; assets?: PdfChromeAssets },
): Promise<PdfFile> {
  const { jsPDF: JsPDF } = await import('jspdf');
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const assets = opts.assets ?? await loadPdfChromeAssets(opts.logoUrl);

  const chrome = () => drawPageChrome(doc, assets.watermark);
  chrome();
  let y = drawDocumentHeader(doc, { doctor: header.doctor, org: header.org, title: 'BILANS', dateIso: opts.dateIso }, assets.logo);
  const rule = (color = C.DIVIDER, w = 0.4) => { doc.setDrawColor(color); doc.setLineWidth(w); doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y); };

  const tableHead = () => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(C.INK_FAINT);
    for (const c of COLS) doc.text(c.label.toUpperCase(), MARGIN_L + c.x, y);
    y += 2.2;
    rule();
    y += 5;
  };
  const ensure = (need: number) => {
    if (y + need <= BOTTOM_LIMIT) return;
    doc.addPage();
    chrome();
    y = 20;
    tableHead();
  };

  rule();
  y += 7;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_NAVY);
  const pl = doc.splitTextToSize(pdfSafe(`Patient : ${patientLine}`), CONTENT_W);
  doc.text(pl, MARGIN_L, y);
  y += pl.length > 1 ? pl.length * 4.5 + 2 : 6;
  rule();
  y += 8;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(C.GREEN_DEEP);
  doc.text('Récapitulatif des résultats', MARGIN_L, y);
  y += 5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_FAINT);
  doc.text('Dernier résultat connu de chaque examen.', MARGIN_L, y);
  y += 8;
  tableHead();

  for (const g of groups) {
    ensure(14);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(C.GREEN_DEEP);
    doc.text(pdfSafe(g.categorie), MARGIN_L, y);
    y += 5;
    for (const r of g.rows) {
      doc.setFontSize(9);
      const alert = !!r.interpretation && r.interpretation !== 'Normal';
      const cells = {
        examen: doc.splitTextToSize(pdfSafe(r.examen), COLS[0].w - 2) as string[],
        valeur: doc.splitTextToSize(pdfSafe(r.interpretation ? `${r.valeur} (${r.interpretation})` : r.valeur), COLS[1].w - 2) as string[],
        bornes: doc.splitTextToSize(pdfSafe(r.bornes), COLS[2].w - 2) as string[],
        date: [formatFr(r.date)],
        precedent: doc.splitTextToSize(pdfSafe(r.precedent), COLS[4].w) as string[],
      };
      const lines = Math.max(...Object.values(cells).map(c => c.length));
      ensure(lines * 4.2 + 3);
      for (const c of COLS) {
        const bold = c.key === 'examen' || (c.key === 'valeur' && alert);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(c.key === 'valeur' && alert ? RED : c.key === 'precedent' || c.key === 'bornes' ? C.INK_MUTED : C.INK_NAVY);
        doc.text(cells[c.key], MARGIN_L + c.x, y);
      }
      y += lines * 4.2 + 1.2;
      rule(C.DIVIDER, 0.15);
      y += 4;
    }
    y += 2;
  }

  ensure(10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_FAINT);
  doc.text('Bas / Haut : par rapport aux bornes du laboratoire saisies avec le résultat. « - » : bornes non renseignées.', MARGIN_L, y);

  stampPageNumbers(doc);
  return { blob: doc.output('blob'), fileName: opts.fileName };
}
