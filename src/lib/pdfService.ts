import jsPDF from 'jspdf';

interface MedicationLine {
  nom: string;
  posologie: string;
  duree: string;
  quantite: string;
}

interface PdfOrdonnanceData {
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
  };
  motif?: string;
  medications: MedicationLine[];
  remarks?: string;
  nextAppointment?: string;
  date: string; // format 'YYYY-MM-DD' ou 'DD/MM/YYYY'
}

function formatDate(dateStr: string): string {
  // Accepte 'YYYY-MM-DD' ou 'DD/MM/YYYY'
  if (dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

export function generateOrdonnancePdf(data: PdfOrdonnanceData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;
  let y = 20;

  // ── En-tête : infos cabinet (gauche) + date (droite) ──────────────────────
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(data.org.name, marginL, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  y += 6;
  if (data.org.adresse) {
    doc.text(data.org.adresse, marginL, y);
    y += 5;
  }
  if (data.org.telephone) {
    doc.text(`Tél : ${data.org.telephone}`, marginL, y);
    y += 5;
  }

  // Date en haut à droite
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const dateFormatted = formatDate(data.date);
  doc.text(`Le ${dateFormatted}`, pageW - marginR, 20, { align: 'right' });

  // ── Séparateur ─────────────────────────────────────────────────────────────
  y += 4;
  doc.setDrawColor(180, 180, 180);
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  // ── Médecin ────────────────────────────────────────────────────────────────
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175); // blue-700
  doc.text(`Dr. ${data.doctor.prenom} ${data.doctor.nom}`, marginL, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  if (data.doctor.specialite) {
    doc.text(data.doctor.specialite, marginL, y);
    y += 5;
  }
  if (data.doctor.rpps) {
    doc.text(`N° RPPS : ${data.doctor.rpps}`, marginL, y);
    y += 5;
  }
  if (data.doctor.ordre_number) {
    doc.text(`N° Ordre : ${data.doctor.ordre_number}`, marginL, y);
    y += 5;
  }

  // ── Séparateur ─────────────────────────────────────────────────────────────
  y += 4;
  doc.setDrawColor(180, 180, 180);
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  // ── Patient ────────────────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Patient :', marginL, y);

  doc.setFont('helvetica', 'normal');
  doc.text(`${data.patient.prenom} ${data.patient.nom}`, marginL + 22, y);
  y += 6;

  if (data.patient.date_naissance) {
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Date de naissance : ${formatDate(data.patient.date_naissance)}`, marginL, y);
    y += 5;
  }

  if (data.motif) {
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Motif : ${data.motif}`, marginL, y);
    y += 5;
  }

  // ── Séparateur ─────────────────────────────────────────────────────────────
  y += 4;
  doc.setDrawColor(180, 180, 180);
  doc.line(marginL, y, pageW - marginR, y);
  y += 10;

  // ── Titre ORDONNANCE ───────────────────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('ORDONNANCE MÉDICALE', pageW / 2, y, { align: 'center' });
  y += 12;

  // ── Médicaments ────────────────────────────────────────────────────────────
  data.medications.forEach((med, idx) => {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(`${idx + 1}. ${med.nom}`, marginL, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);

    const lines: string[] = [];
    if (med.posologie) lines.push(`Posologie : ${med.posologie}`);
    if (med.duree) lines.push(`Durée : ${med.duree}`);
    if (med.quantite) lines.push(`Quantité : ${med.quantite}`);

    lines.forEach(line => {
      doc.text(line, marginL + 4, y);
      y += 5;
    });

    y += 3;
  });

  // ── Remarques ──────────────────────────────────────────────────────────────
  if (data.remarks) {
    if (y > 230) { doc.addPage(); y = 20; }
    y += 4;
    doc.setDrawColor(180, 180, 180);
    doc.line(marginL, y, pageW - marginR, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Remarques :', marginL, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const remarkLines = doc.splitTextToSize(data.remarks, contentW);
    doc.text(remarkLines, marginL, y);
    y += remarkLines.length * 5 + 3;
  }

  // ── Prochain RDV ───────────────────────────────────────────────────────────
  if (data.nextAppointment) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    doc.text(`Prochain rendez-vous : ${data.nextAppointment}`, marginL, y);
    y += 8;
  }

  // ── Signature ──────────────────────────────────────────────────────────────
  const sigY = Math.max(y + 20, 240);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Signature du médecin :', pageW - marginR - 60, sigY);
  doc.setDrawColor(180, 180, 180);
  doc.line(pageW - marginR - 60, sigY + 20, pageW - marginR, sigY + 20);

  // ── Pied de page ───────────────────────────────────────────────────────────
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Ordonnance générée par OrdoSur', pageW / 2, 287, { align: 'center' });

  // ── Téléchargement ─────────────────────────────────────────────────────────
  const fileName = `ordonnance_${data.patient.nom}_${data.patient.prenom}_${data.date}.pdf`
    .replace(/[^a-zA-Z0-9_.-]/g, '_');
  doc.save(fileName);
}
