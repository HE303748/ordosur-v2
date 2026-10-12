// Sprint 7 — PDF « Lettre d'adressage ».
//
// Même habillage et même en-tête que l'ordonnance (lib/pdfService) : le nom du médecin et la
// date n'y figurent qu'UNE fois, dans l'en-tête (ni « Fait à », ni rappel en signature ou en pied).
// Le patient est TOUJOURS imprimé (ligne « Patient : … »), quelle que soit l'option d'ordonnance.
// Léger : texte vectoriel + filigrane réduit partagé (< 500 Ko). Ce module ne décide de rien,
// il dessine le document figé à l'enregistrement.

import type { jsPDF } from 'jspdf';
import {
  drawDocumentHeader, drawPageChrome, drawSignatureBlock, loadPdfChromeAssets, stampPageNumbers,
  PDF_COLORS as C, PDF_LAYOUT, type PdfChromeAssets,
} from './pdfService';
import type { ExamPdfHeader, PdfFile } from './examPdf';
import { drawBilanRecap } from './bilanPdf';
import type { RecapGroup } from './resultatsLogic';
import { mentionUrgence, objetLettre, parseMarkup, type Run, type Urgence } from './lettreTexte';

const { PAGE_W, MARGIN_L, MARGIN_R, CONTENT_W } = PDF_LAYOUT;
const BOTTOM_LIMIT = 268;
const CORPS_PT = 10.5;
const INTERLIGNE = 5.3;
const ENTRE_PARAGRAPHES = 3.2;

/** En-tête figé avec la lettre : médecin auteur et cabinet au jour de l'enregistrement. */
export interface LettreEntete {
  doctor: ExamPdfHeader['doctor'];
  org: ExamPdfHeader['org'];
  logoUrl?: string | null;
}

export interface LettreDocument {
  entete: LettreEntete;
  dateIso: string;
  /** « À l'attention du Dr Salma Bennani, cardiologie » */
  destinataireLigne: string;
  /** « M. Karim Alaoui — 27 ans » */
  patientLigne: string;
  motif: string;
  urgence: Urgence;
  /** Texte validé (paragraphes, **gras**). */
  contenu: string;
  /** Récapitulatif des bilans joint à la suite, ou null. */
  annexeBilans?: RecapGroup[] | null;
}

/** Les polices standard du PDF (WinAnsi) ne couvrent pas tout : équivalents sûrs, sens inchangé. */
const car = (...codes: number[]) => codes.map(c => String.fromCharCode(c)).join('');
const TIRETS_INSECABLES = new RegExp(`[${car(0x2010, 0x2011)}]`, 'g');
const ESPACES_SPECIALES = new RegExp(`[${car(0xa0, 0x202f, 0x2009)}]`, 'g');
const MU_GREC = new RegExp(car(0x3bc), 'g');
// Latin-1 + les caractères WinAnsi utiles au français : Œ œ – — ‘ ’ “ ” … € •
const HORS_POLICE = new RegExp(`[^\x00-\xff${car(0x152, 0x153, 0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2026, 0x20ac, 0x2022)}]`, 'g');

export function lettreSafe(s: string): string {
  return s.replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/→/g, '->').replace(TIRETS_INSECABLES, '-')
    .replace(ESPACES_SPECIALES, ' ').replace(MU_GREC, car(0xb5)).replace(HORS_POLICE, '?');
}

interface Piece { text: string; bold: boolean }
/** Un mot peut mêler gras et normal (« **M. Alaoui**, » : la virgule reste collée). null = retour à la ligne. */
type Mot = Piece[] | null;

export function motsDuParagraphe(p: Run[]): Mot[] {
  const mots: Mot[] = [];
  let cur: Piece[] = [];
  const fin = () => { if (cur.length > 0) { mots.push(cur); cur = []; } };
  for (const run of p) {
    const re = /(\n)|([^\S\n]+)|(\S+)/g;
    const texte = lettreSafe(run.text);
    for (let m = re.exec(texte); m; m = re.exec(texte)) {
      if (m[1]) { fin(); mots.push(null); }
      else if (m[2]) fin();
      else cur.push({ text: m[3], bold: run.bold });
    }
  }
  fin();
  return mots;
}

/** Corps de la lettre : retour à la ligne mot par mot, gras et normal mêlés sur une même ligne. */
function drawCorps(doc: jsPDF, paragraphes: Run[][], y0: number, nouvellePage: () => number): number {
  let y = y0;
  const style = () => { doc.setFontSize(CORPS_PT); doc.setTextColor(C.INK_NAVY); };
  style();
  const largeur = (text: string, bold: boolean) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); return doc.getTextWidth(text); };
  const espace = largeur(' ', false);
  const largeurMot = (mot: Piece[]) => mot.reduce((w, x) => w + largeur(x.text, x.bold), 0);

  const flush = (ligne: Piece[][]) => {
    if (y > BOTTOM_LIMIT) { y = nouvellePage(); style(); }
    // Morceaux consécutifs de même graisse réunis : un seul appel de texte, fichier plus léger.
    const blocs: Array<Piece & { espaceAvant: boolean }> = [];
    ligne.forEach((mot, i) => mot.forEach((piece, k) => {
      const espaceAvant = i > 0 && k === 0;
      const dernier = blocs[blocs.length - 1];
      if (dernier && dernier.bold === piece.bold) dernier.text += (espaceAvant ? ' ' : '') + piece.text;
      else blocs.push({ ...piece, espaceAvant });
    }));
    let x = MARGIN_L;
    for (const b of blocs) {
      if (b.espaceAvant) x += espace;
      doc.setFont('helvetica', b.bold ? 'bold' : 'normal');
      doc.text(b.text, x, y);
      x += doc.getTextWidth(b.text);
    }
    y += INTERLIGNE;
  };

  for (const p of paragraphes) {
    let ligne: Piece[][] = [];
    let w = 0;
    for (const mot of motsDuParagraphe(p)) {
      if (mot === null) { flush(ligne); ligne = []; w = 0; continue; }
      const wm = largeurMot(mot);
      if (ligne.length > 0 && w + espace + wm > CONTENT_W) { flush(ligne); ligne = []; w = 0; }
      w += (ligne.length ? espace : 0) + wm;
      ligne.push(mot);
    }
    if (ligne.length > 0) flush(ligne);
    y += ENTRE_PARAGRAPHES;
  }
  return y;
}

/** Dessine la lettre sur la page courante (et les suivantes si le texte est long). */
export function drawLettre(doc: jsPDF, d: LettreDocument, assets: PdfChromeAssets): void {
  const chrome = () => drawPageChrome(doc, assets.watermark);
  chrome();
  let y = drawDocumentHeader(doc, {
    doctor: d.entete.doctor, org: d.entete.org, title: "LETTRE D'ADRESSAGE", dateIso: d.dateIso,
  }, assets.logo);
  const rule = () => { doc.setDrawColor(C.DIVIDER); doc.setLineWidth(0.4); doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y); };

  rule();
  y += 7;
  // Patient : toujours imprimé.
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_NAVY);
  const pl = doc.splitTextToSize(lettreSafe(`Patient : ${d.patientLigne}`), CONTENT_W) as string[];
  doc.text(pl, MARGIN_L, y);
  y += pl.length > 1 ? pl.length * 4.5 + 2 : 6;
  rule();
  y += 9;

  // Destinataire
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(C.INK_NAVY);
  const dl = doc.splitTextToSize(lettreSafe(d.destinataireLigne), CONTENT_W) as string[];
  doc.text(dl, MARGIN_L, y);
  y += dl.length * 5.2 + 1.5;

  // Objet
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_MUTED);
  const ol = doc.splitTextToSize(lettreSafe(objetLettre(d.motif)), CONTENT_W) as string[];
  doc.text(ol, MARGIN_L, y);
  y += ol.length * 4.8;

  // Urgence
  const mention = mentionUrgence(d.urgence);
  if (mention) {
    y += 2.5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(C.INK_NAVY);
    if (d.urgence === 'urgent') {
      doc.setFontSize(11);
      const w = doc.getTextWidth(mention) + 8;
      doc.setDrawColor(C.INK_NAVY);
      doc.setLineWidth(0.5);
      doc.roundedRect(MARGIN_L, y - 4.6, w, 7, 1.2, 1.2);
      doc.text(mention, MARGIN_L + 4, y + 0.4);
      y += 5;
    } else {
      doc.setFontSize(9.5);
      doc.text(mention, MARGIN_L, y);
      y += 3;
    }
  }
  y += 8;

  const nouvellePage = () => { doc.addPage(); chrome(); return 24; };
  y = drawCorps(doc, parseMarkup(d.contenu), y, nouvellePage);

  // Signature et cachet (la date est dans l'en-tête, le nom du médecin aussi).
  let top = Math.max(y + 8, 228);
  if (top + 24 > 286) { top = nouvellePage() + 6; }
  drawSignatureBlock(doc, top);
}

/** PDF de la lettre, suivi du récapitulatif des bilans s'il est joint. */
export async function buildLettrePdf(
  d: LettreDocument, opts: { fileName: string; assets?: PdfChromeAssets; compress?: boolean },
): Promise<PdfFile> {
  const { jsPDF: JsPDF } = await import('jspdf');
  // compress: false — réservé aux tests (relire le texte des pages).
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: opts.compress ?? true });
  const assets = opts.assets ?? await loadPdfChromeAssets(d.entete.logoUrl);
  drawLettre(doc, d, assets);
  if (d.annexeBilans && d.annexeBilans.length > 0) {
    doc.addPage();
    drawBilanRecap(doc, d.annexeBilans, d.patientLigne, { doctor: d.entete.doctor, org: d.entete.org }, assets, d.dateIso);
  }
  stampPageNumbers(doc);
  return { blob: doc.output('blob'), fileName: opts.fileName };
}
