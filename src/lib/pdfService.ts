import jsPDF from 'jspdf';
import QRCode from 'qrcode';

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
    date_naissance?: string | null;
    pathologies?: string[] | null;
    allergies_medicaments?: string[] | null;
  };
  motif?: string;
  medications: MedicationLine[];
  remarks?: string;
  nextAppointment?: string;
  date: string;
  interactionAlerts?: PdfInteractionAlert[];
}

function formatDate(dateStr: string): string {
  if (dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

/** Fetches a public image URL and returns it as a base64 data-URL + detected format for jsPDF. */
async function urlToBase64(url: string): Promise<{ data: string; format: 'PNG' | 'JPEG' }> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Logo fetch failed: ${resp.status}`);
  const blob = await resp.blob();
  const format: 'PNG' | 'JPEG' = blob.type.includes('png') ? 'PNG' : 'JPEG';
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ data: reader.result as string, format });
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generateOrdonnancePdf(data: PdfOrdonnanceData): Promise<void> {
  // ── QR Code ────────────────────────────────────────────────────────────────
  const qrContent = [
    data.ordreNumber,
    `Patient: ${data.patient.nom} ${data.patient.prenom}`,
    `Médecin: Dr. ${data.doctor.prenom} ${data.doctor.nom}`,
    `Date: ${formatDate(data.date)}`,
    `Cabinet: ${data.org.name}`,
  ].join('\n');

  const qrDataUrl = await QRCode.toDataURL(qrContent, { width: 120, margin: 1, color: { dark: '#1e3a8a' } });

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const marginL = 18;
  const marginR = 18;
  const contentW = pageW - marginL - marginR;
  let y = 18;

  // ── En-tête cabinet ────────────────────────────────────────────────────────
  // Logo ou nom du cabinet en haut à gauche
  if (data.logo_url) {
    try {
      const { data: imgData, format } = await urlToBase64(data.logo_url);
      // Max height: 20 mm — width auto-scaled by jsPDF (pass 0)
      doc.addImage(imgData, format, marginL, y - 4, 0, 20);
      y += 22;
    } catch {
      // Fallback to text if logo fails to load
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text(data.org.name, marginL, y);
      y += 6;
    }
  } else {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175); // blue-700
    doc.text(data.org.name, marginL, y);
    y += 6;
  }

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  if (data.org.adresse) { doc.text(data.org.adresse, marginL, y); y += 5; }
  if (data.org.telephone) { doc.text(`Tél : ${data.org.telephone}`, marginL, y); y += 5; }

  // Date + numéro d'ordonnance — coin haut droit
  const dateFormatted = formatDate(data.date);
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`Le ${dateFormatted}`, pageW - marginR, 18, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text(data.ordreNumber, pageW - marginR, 24, { align: 'right' });

  // QR Code — coin haut droit (sous le numéro)
  const qrSize = 22;
  doc.addImage(qrDataUrl, 'PNG', pageW - marginR - qrSize, 27, qrSize, qrSize);

  // ── Séparateur ─────────────────────────────────────────────────────────────
  y = Math.max(y + 3, 53);
  doc.setDrawColor(200, 210, 240);
  doc.setLineWidth(0.5);
  doc.line(marginL, y, pageW - marginR, y);
  y += 7;

  // ── Médecin ────────────────────────────────────────────────────────────────
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text(`Dr. ${data.doctor.prenom} ${data.doctor.nom}`, marginL, y);
  y += 6;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  if (data.doctor.specialite) { doc.text(data.doctor.specialite, marginL, y); y += 5; }
  if (data.doctor.rpps) { doc.text(`N° INPE : ${data.doctor.rpps}`, marginL, y); y += 5; }
  if (data.doctor.ordre_number) { doc.text(`N° Ordre : ${data.doctor.ordre_number}`, marginL, y); y += 5; }

  // ── Séparateur ─────────────────────────────────────────────────────────────
  y += 3;
  doc.setDrawColor(200, 210, 240);
  doc.line(marginL, y, pageW - marginR, y);
  y += 7;

  // ── Patient ────────────────────────────────────────────────────────────────
  // Fond léger
  const patientBlockStart = y;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(marginL, y - 3, contentW, 10, 2, 2, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Patient :', marginL + 2, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.patient.prenom} ${data.patient.nom}`, marginL + 22, y + 4);
  y += 12;

  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  if (data.patient.date_naissance) {
    doc.text(`Né(e) le ${formatDate(data.patient.date_naissance)}`, marginL + 2, y);
    y += 5;
  }
  if (data.motif) {
    doc.text(`Motif : ${data.motif}`, marginL + 2, y);
    y += 5;
  }

  // Pathologies
  if (data.patient.pathologies && data.patient.pathologies.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235); // blue-600
    doc.text('Pathologies :', marginL + 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const pathoText = data.patient.pathologies.join(' · ');
    const wrapped = wrapText(doc, pathoText, contentW - 35);
    doc.text(wrapped, marginL + 30, y);
    y += wrapped.length * 4.5 + 2;
  }

  // Allergies médicamenteuses
  if (data.patient.allergies_medicaments && data.patient.allergies_medicaments.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38); // red-600
    doc.text('⚠ Allergies :', marginL + 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 30, 30);
    const allergyText = data.patient.allergies_medicaments.join(', ');
    const wrapped = wrapText(doc, allergyText, contentW - 35);
    doc.text(wrapped, marginL + 30, y);
    y += wrapped.length * 4.5 + 2;
  }

  // ── Séparateur ─────────────────────────────────────────────────────────────
  y += 3;
  doc.setDrawColor(200, 210, 240);
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  // ── Titre ORDONNANCE ───────────────────────────────────────────────────────
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('ORDONNANCE MÉDICALE', pageW / 2, y, { align: 'center' });
  y += 10;

  // ── Médicaments ────────────────────────────────────────────────────────────
  data.medications.forEach((med, idx) => {
    if (y > 240) { doc.addPage(); y = 18; }

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(`${idx + 1}. ${med.nom}`, marginL, y);
    y += 5.5;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);

    if (med.posologie) { doc.text(`   Posologie : ${med.posologie}`, marginL, y); y += 4.5; }
    if (med.duree)     { doc.text(`   Durée : ${med.duree}`,          marginL, y); y += 4.5; }
    if (med.quantite)  { doc.text(`   Quantité : ${med.quantite}`,    marginL, y); y += 4.5; }
    y += 2;
  });

  // ── Alertes interactions ────────────────────────────────────────────────────
  if (data.interactionAlerts && data.interactionAlerts.length > 0) {
    const criticalAlerts = data.interactionAlerts.filter(a =>
      a.severite === 'contre_indication' || a.severite === 'majeure'
    );
    if (criticalAlerts.length > 0) {
      if (y > 230) { doc.addPage(); y = 18; }
      y += 3;

      // Fond rouge clair
      const alertH = 8 + criticalAlerts.length * 8;
      doc.setFillColor(254, 242, 242); // red-50
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(0.4);
      doc.roundedRect(marginL, y - 3, contentW, alertH, 2, 2, 'FD');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(153, 27, 27); // red-800
      doc.text('⚠ ALERTES INTERACTIONS / CONTRE-INDICATIONS', marginL + 3, y + 3);
      y += 8;

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      criticalAlerts.forEach(alert => {
        const icon = alert.severite === 'contre_indication' ? '🔴' : '🟠';
        const label = alert.severite === 'contre_indication' ? 'CI' : 'MAJ';
        const line = `${label} ${alert.involved.join(' + ')} : ${alert.description.substring(0, 90)}${alert.description.length > 90 ? '...' : ''}`;
        doc.setTextColor(153, 27, 27);
        doc.text(line, marginL + 3, y);
        y += 6.5;
      });
      y += 3;
    }
  }

  // ── Remarques ──────────────────────────────────────────────────────────────
  if (data.remarks) {
    if (y > 240) { doc.addPage(); y = 18; }
    y += 3;
    doc.setDrawColor(200, 210, 240);
    doc.line(marginL, y, pageW - marginR, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Remarques :', marginL, y);
    y += 5.5;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const remarkLines = doc.splitTextToSize(data.remarks, contentW);
    doc.text(remarkLines, marginL, y);
    y += remarkLines.length * 4.5 + 3;
  }

  // ── Prochain RDV ───────────────────────────────────────────────────────────
  if (data.nextAppointment) {
    if (y > 250) { doc.addPage(); y = 18; }
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    doc.text(`Prochain rendez-vous : ${data.nextAppointment}`, marginL, y);
    y += 7;
  }

  // ── Signature ──────────────────────────────────────────────────────────────
  const sigY = Math.max(y + 18, 248);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Signature du médecin :', pageW - marginR - 58, sigY);
  doc.setDrawColor(180, 180, 180);
  doc.line(pageW - marginR - 58, sigY + 18, pageW - marginR, sigY + 18);

  // ── Pied de page ───────────────────────────────────────────────────────────
  doc.setFontSize(6.5);
  doc.setTextColor(160, 160, 160);
  doc.text(`Ordonnance générée par OrdoSur · ${data.ordreNumber}`, pageW / 2, 290, { align: 'center' });

  // ── Sauvegarde ─────────────────────────────────────────────────────────────
  const fileName = `ordonnance_${data.patient.nom}_${data.patient.prenom}_${data.date}.pdf`
    .replace(/[^a-zA-Z0-9_.-]/g, '_');
  doc.save(fileName);
}

/* ════════════════════════════════════════════════════════════════════════════
   DOCUMENTS MÉDICAUX — 5 types
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
