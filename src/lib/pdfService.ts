import jsPDF from 'jspdf';
import QRCode from 'qrcode'; // used only in generateDocumentPdf

interface MedicationLine {
  nom: string;
  posologie: string;
  duree: string;
  quantite: string;
}

export interface PdfInteractionAlert {
  severite: 'contre_indication' | 'majeure' | 'moderee' | 'mineure';
  description: string;
  involved: string[];
  type: 'drug_drug' | 'contraindication';
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

function getAge(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const dob = new Date(dateStr);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

/** Fetches a public image URL and returns it as a base64 data-URL + detected format for jsPDF. */
async function urlToBase64(url: string): Promise<{ data: string; format: 'PNG' | 'JPEG' }> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Image fetch failed: ${resp.status}`);
  const blob = await resp.blob();
  const format: 'PNG' | 'JPEG' = blob.type.includes('png') ? 'PNG' : 'JPEG';
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ data: reader.result as string, format });
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Load a public asset, return null on failure so PDF generation never blocks. */
async function safeLoad(url: string): Promise<{ data: string; format: 'PNG' | 'JPEG' } | null> {
  try {
    return await urlToBase64(url);
  } catch (e) {
    console.warn(`[pdfService] Optional asset missing: ${url}`, e);
    return null;
  }
}

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
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Load brand assets in parallel — non-fatal if missing
  const [logoAsset, watermarkAsset, badgeAsset] = await Promise.all([
    safeLoad('/pdf-assets/logo.png'),
    safeLoad('/pdf-assets/watermark.png'),
    safeLoad('/pdf-assets/badge.png'),
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

  // ── Header: Logo (left) + ORDONNANCE / N° / Date (right) ───────────────────
  if (logoAsset) {
    // Height 12mm, width auto
    doc.addImage(logoAsset.data, logoAsset.format, MARGIN_L, y, 0, 12);
  } else {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(C.INK_NAVY);
    doc.text('Ordosur', MARGIN_L, y + 8);
  }
  // Tagline under logo
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_FAINT);
  doc.text('Ordosur — La prescription, sécurisée.', MARGIN_L, y + 18);

  // Right block — ORDONNANCE title + numéro + date
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(C.INK_NAVY);
  doc.text('ORDONNANCE', PAGE_W - MARGIN_R, y + 6, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_MUTED);
  doc.text(`N° ${data.ordreNumber}`, PAGE_W - MARGIN_R, y + 12, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(C.INK_FAINT);
  doc.text(formatDate(data.date), PAGE_W - MARGIN_R, y + 18, { align: 'right' });

  y += 26;

  // ── Separator ──────────────────────────────────────────────────────────────
  doc.setDrawColor(C.DIVIDER);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
  y += 7;

  // ── PRESCRIPTEUR ───────────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(C.GREEN);
  doc.text('PRESCRIPTEUR', MARGIN_L, y);
  y += 5.5;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(C.INK_NAVY);
  doc.text(`Dr. ${data.doctor.prenom} ${data.doctor.nom}`, MARGIN_L, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_MUTED);
  if (data.doctor.specialite) { doc.text(data.doctor.specialite, MARGIN_L, y); y += 4.5; }
  // INPE / CNOM compact line
  const inpeBits: string[] = [];
  if (data.doctor.rpps)         inpeBits.push(`INPE : ${data.doctor.rpps}`);
  if (data.doctor.ordre_number) inpeBits.push(`CNOM : ${data.doctor.ordre_number}`);
  if (inpeBits.length) { doc.text(inpeBits.join('   ·   '), MARGIN_L, y); y += 4.5; }
  if (data.org.telephone) { doc.text(`Tél : ${data.org.telephone}`, MARGIN_L, y); y += 4.5; }
  if (data.org.adresse)   { doc.text(`Cabinet : ${data.org.adresse}`, MARGIN_L, y); y += 4.5; }

  y += 4;

  // ── PATIENT ────────────────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(C.GREEN);
  doc.text('PATIENT', MARGIN_L, y);
  y += 5.5;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(C.INK_NAVY);
  let patientHeader = `${data.patient.prenom} ${data.patient.nom}`;
  const patientMeta: string[] = [];
  if (data.patient.sexe) patientMeta.push(data.patient.sexe);
  const age = getAge(data.patient.date_naissance);
  if (age !== null) patientMeta.push(`${age} ans`);
  if (patientMeta.length) patientHeader += ` — ${patientMeta.join(', ')}`;
  doc.text(patientHeader, MARGIN_L, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_MUTED);
  if (data.patient.date_naissance) {
    doc.text(`Né(e) le : ${formatDate(data.patient.date_naissance)}`, MARGIN_L, y);
    y += 4.5;
  }
  if (data.patient.pathologies && data.patient.pathologies.length > 0) {
    const pathText = `Pathologies : ${data.patient.pathologies.join(', ')}`;
    const pLines = doc.splitTextToSize(pathText, CONTENT_W);
    doc.text(pLines, MARGIN_L, y);
    y += pLines.length * 4.5;
  }
  if (data.motif) {
    const motifLines = doc.splitTextToSize(`Motif : ${data.motif}`, CONTENT_W);
    doc.text(motifLines, MARGIN_L, y);
    y += motifLines.length * 4.5;
  }

  y += 5;

  // ── Separator ──────────────────────────────────────────────────────────────
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
      const lines = doc.splitTextToSize(`     Posologie : ${med.posologie}`, CONTENT_W);
      doc.text(lines, MARGIN_L, y); y += lines.length * 4.5;
    }
    if (med.duree) {
      const lines = doc.splitTextToSize(`     Durée : ${med.duree}`, CONTENT_W);
      doc.text(lines, MARGIN_L, y); y += lines.length * 4.5;
    }
    if (med.quantite) {
      const lines = doc.splitTextToSize(`     Quantité : ${med.quantite}`, CONTENT_W);
      doc.text(lines, MARGIN_L, y); y += lines.length * 4.5;
    }
    y += 2.5;
  });

  // Remarks
  if (data.remarks) {
    if (y > 235) { doc.addPage(); decoratePage(); y = 22; }
    y += 2;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(C.INK_MUTED);
    const lines = doc.splitTextToSize(`Remarques : ${data.remarks}`, CONTENT_W);
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

  // ── Signature ──────────────────────────────────────────────────────────────
  const sigY = Math.max(y + 14, 232);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_FAINT);
  doc.text('Signature du médecin', PAGE_W - MARGIN_R - 55, sigY);
  doc.setDrawColor(C.DIVIDER);
  doc.setLineWidth(0.4);
  doc.line(PAGE_W - MARGIN_R - 55, sigY + 14, PAGE_W - MARGIN_R, sigY + 14);

  // ── Footer band: badge + tagline + verify URL ──────────────────────────────
  const footerLineY = 268;
  doc.setDrawColor(C.DIVIDER);
  doc.line(MARGIN_L, footerLineY, PAGE_W - MARGIN_R, footerLineY);

  if (badgeAsset) {
    // Badge image, height ~10mm, left-aligned just below the divider
    doc.addImage(badgeAsset.data, badgeAsset.format, MARGIN_L, footerLineY + 3, 0, 10);
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(C.GREEN);
    doc.text('VÉRIFIÉ PAR ORDOSUR', MARGIN_L, footerLineY + 9);
  }

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.INK_FAINT);
  doc.text(
    'Interactions vérifiées · Ordonnance horodatée · ordosur.com',
    PAGE_W - MARGIN_R, footerLineY + 9,
    { align: 'right' }
  );

  // Bottom strip — generated by Ordosur + verify URL
  doc.setFontSize(6.5);
  doc.setTextColor(C.INK_FAINT);
  doc.text(
    `Document généré par Ordosur, plateforme médicale.   Vérification : ordosur.com/verify/${data.ordreNumber}`,
    PAGE_W / 2, PAGE_H - 6,
    { align: 'center' }
  );

  // ── Save ───────────────────────────────────────────────────────────────────
  const fileName = `ordonnance_${data.patient.nom}_${data.patient.prenom}_${data.date}.pdf`
    .replace(/[^a-zA-Z0-9_.-]/g, '_');
  doc.save(fileName);
}

/* ════════════════════════════════════════════════════════════════════════════
   DOCUMENTS MÉDICAUX — 5 types
   (Conservé inchangé — Sprint #3 refonte cible les ordonnances uniquement)
   ════════════════════════════════════════════════════════════════════════════ */

export type DocumentType = 'repos' | 'aptitude' | 'general' | 'deces' | 'grossesse';

export interface PdfDocumentData {
  type: DocumentType;
  numero: string;
  logo_url?: string | null;
  doctor: {
    prenom: string;
    nom: string;
    specialite?: string | null;
    rpps?: string | null;
  };
  org: {
    name: string;
    adresse?: string | null;
    telephone?: string | null;
  };
  date: string;
  // Patient info (optional for 'deces')
  patient?: {
    prenom: string;
    nom: string;
    date_naissance?: string | null;
  };
  // Type-specific fields (stored in jsonb)
  fields: Record<string, string | number | boolean | null>;
}

const DOC_TITLES: Record<DocumentType, string> = {
  repos:     'CERTIFICAT DE REPOS MÉDICAL',
  aptitude:  "CERTIFICAT D'APTITUDE PHYSIQUE",
  general:   'CERTIFICAT MÉDICAL',
  deces:     'CERTIFICAT DE DÉCÈS',
  grossesse: 'CERTIFICAT DE GROSSESSE',
};

export async function generateDocumentPdf(data: PdfDocumentData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const marginL = 18;
  const marginR = 18;
  const contentW = pageW - marginL - marginR;
  let y = 18;

  // ── QR Code ─────────────────────────────────────────────────────────────────
  const qrContent = [
    data.numero,
    `Type: ${DOC_TITLES[data.type]}`,
    data.patient ? `Patient: ${data.patient.nom} ${data.patient.prenom}` : '',
    `Médecin: Dr. ${data.doctor.prenom} ${data.doctor.nom}`,
    `Date: ${formatDate(data.date)}`,
    `Cabinet: ${data.org.name}`,
  ].filter(Boolean).join('\n');

  const qrDataUrl = await QRCode.toDataURL(qrContent, { width: 120, margin: 1, color: { dark: '#1e3a8a' } });

  // ── Logo / nom cabinet ───────────────────────────────────────────────────────
  if (data.logo_url) {
    try {
      const { data: imgData, format } = await urlToBase64(data.logo_url);
      doc.addImage(imgData, format, marginL, y - 4, 0, 20);
      y += 22;
    } catch {
      doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 64, 175);
      doc.text(data.org.name, marginL, y); y += 6;
    }
  } else {
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 64, 175);
    doc.text(data.org.name, marginL, y); y += 6;
  }

  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
  if (data.org.adresse)   { doc.text(data.org.adresse, marginL, y);             y += 4.5; }
  if (data.org.telephone) { doc.text(`Tél : ${data.org.telephone}`, marginL, y); y += 4.5; }

  // Date + numéro — coin haut droit
  doc.setFontSize(8.5); doc.setTextColor(80, 80, 80);
  doc.text(`Le ${formatDate(data.date)}`, pageW - marginR, 18, { align: 'right' });
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 64, 175);
  doc.text(data.numero, pageW - marginR, 24, { align: 'right' });

  // QR code
  const qrSize = 22;
  doc.addImage(qrDataUrl, 'PNG', pageW - marginR - qrSize, 27, qrSize, qrSize);

  // ── Séparateur ───────────────────────────────────────────────────────────────
  y = Math.max(y + 3, 53);
  doc.setDrawColor(200, 210, 240); doc.setLineWidth(0.5);
  doc.line(marginL, y, pageW - marginR, y); y += 7;

  // ── Médecin ──────────────────────────────────────────────────────────────────
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 64, 175);
  doc.text(`Dr. ${data.doctor.prenom} ${data.doctor.nom}`, marginL, y); y += 5.5;
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
  if (data.doctor.specialite) { doc.text(data.doctor.specialite, marginL, y); y += 4.5; }
  if (data.doctor.rpps)       { doc.text(`N° INPE : ${data.doctor.rpps}`, marginL, y); y += 4.5; }

  // ── Titre du document ────────────────────────────────────────────────────────
  y += 6;
  doc.setDrawColor(200, 210, 240); doc.line(marginL, y, pageW - marginR, y); y += 8;
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
  doc.text(DOC_TITLES[data.type], pageW / 2, y, { align: 'center' }); y += 10;
  doc.setDrawColor(200, 210, 240); doc.line(marginL, y, pageW - marginR, y); y += 8;

  // ── Corps — formule légale "Je soussigné" ────────────────────────────────────
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
  const intro = `Je soussigné, Dr. ${data.doctor.prenom} ${data.doctor.nom}` +
    (data.doctor.specialite ? `, ${data.doctor.specialite}` : '') +
    `, certifie avoir examiné le patient :`;
  const introLines = doc.splitTextToSize(intro, contentW);
  doc.text(introLines, marginL, y); y += introLines.length * 5.5 + 3;

  // ── Identité patient ─────────────────────────────────────────────────────────
  if (data.patient) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(marginL, y - 2, contentW, 12, 2, 2, 'F');
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
    doc.text(`${data.patient.prenom} ${data.patient.nom}`, marginL + 3, y + 5);
    if (data.patient.date_naissance) {
      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
      doc.text(`Né(e) le ${formatDate(data.patient.date_naissance)}`, marginL + 3, y + 10);
      y += 15;
    } else {
      y += 14;
    }
  }

  y += 6;

  // ── Contenu spécifique par type ──────────────────────────────────────────────
  const f = data.fields;
  const line = (label: string, value: string | null | undefined) => {
    if (!value) return;
    const fullText = `${label} : ${value}`;
    const lines = doc.splitTextToSize(fullText, contentW);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
    doc.text(lines, marginL, y); y += lines.length * 5.5 + 2;
  };
  const boldLine = (text: string) => {
    const lines = doc.splitTextToSize(text, contentW);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
    doc.text(lines, marginL, y); y += lines.length * 5.5 + 2;
  };
  const bodyText = (text: string) => {
    const lines = doc.splitTextToSize(text, contentW);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
    doc.text(lines, marginL, y); y += lines.length * 5.5 + 3;
  };

  if (data.type === 'repos') {
    line('Motif', f.motif as string);
    boldLine(`Que son état de santé nécessite un repos médical de ${f.duree_jours} jour${Number(f.duree_jours) > 1 ? 's' : ''}.`);
    if (f.date_debut) line('Du', f.date_debut as string);
    if (f.date_fin)   line('Au', f.date_fin as string);
    if (f.avec_sortie !== undefined) {
      bodyText(f.avec_sortie ? 'Sortie autorisée.' : 'Sortie non autorisée — repos à domicile strict.');
    }
    if (f.commentaire) { y += 3; bodyText(f.commentaire as string); }
  }

  if (data.type === 'aptitude') {
    const apte = f.apte === true || f.apte === 'true';
    boldLine(`Que ${data.patient?.prenom || ''} ${data.patient?.nom || ''} est ${apte ? 'apte' : 'inapte'} à la pratique de :`);
    line('Activité', f.activite as string);
    if (!apte && f.duree_inapte) line('Durée d\'inaptitude', f.duree_inapte as string);
    if (f.reserves) { y += 2; bodyText(`Réserves : ${f.reserves}`); }
    if (f.commentaire) bodyText(f.commentaire as string);
  }

  if (data.type === 'general') {
    line('Objet', f.objet as string);
    if (f.contenu) { y += 3; bodyText(f.contenu as string); }
  }

  if (data.type === 'deces') {
    if (f.nom_defunt)   line('Défunt', `${f.prenom_defunt || ''} ${f.nom_defunt}`);
    if (f.date_naissance_defunt) line('Né(e) le', f.date_naissance_defunt as string);
    if (f.date_deces)   line('Date du décès', f.date_deces as string);
    if (f.heure_deces)  line('Heure', f.heure_deces as string);
    if (f.lieu_deces)   line('Lieu', f.lieu_deces as string);
    if (f.cause)        line('Cause du décès', f.cause as string);
    if (f.mode)         line('Mode de constatation', f.mode as string);
    y += 4;
    bodyText("Ce certificat est établi aux fins d'état civil conformément à la réglementation en vigueur.");
  }

  if (data.type === 'grossesse') {
    boldLine(`Que la patiente est enceinte.`);
    if (f.terme_sa)          line('Terme actuel', `${f.terme_sa} SA`);
    if (f.date_accouchement) line('Date prévue d\'accouchement', f.date_accouchement as string);
    if (f.type_grossesse)    line('Type de grossesse', f.type_grossesse as string);
    if (f.commentaire) { y += 3; bodyText(f.commentaire as string); }
  }

  // ── Formule de clôture ───────────────────────────────────────────────────────
  y += 8;
  doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(80, 80, 80);
  doc.text(
    `Certifié sincère et véritable, fait à ${data.org.adresse?.split(',')[0] || 'Cabinet'}, le ${formatDate(data.date)}.`,
    marginL, y
  );

  // ── Signature ────────────────────────────────────────────────────────────────
  const sigY = Math.max(y + 22, 255);
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
  doc.text('Signature et cachet du médecin :', pageW - marginR - 68, sigY);
  doc.setDrawColor(180, 180, 180);
  doc.line(pageW - marginR - 68, sigY + 18, pageW - marginR, sigY + 18);

  // ── Pied de page ─────────────────────────────────────────────────────────────
  doc.setFontSize(6.5); doc.setTextColor(160, 160, 160);
  doc.text(`Document généré par OrdoSur · ${data.numero}`, pageW / 2, 290, { align: 'center' });

  // ── Sauvegarde ───────────────────────────────────────────────────────────────
  const patientPart = data.patient ? `${data.patient.nom}_${data.patient.prenom}_` : '';
  const fileName = `${data.type}_${patientPart}${data.date}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
  doc.save(fileName);
}
