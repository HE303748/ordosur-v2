import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, X, Download, Search, Calendar,
  Loader2, Edit2,
  Eye, Save, ChevronLeft, User, Phone, MapPin, Stethoscope, Printer,
} from 'lucide-react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { supabase, Patient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PageTransition } from './PageTransition';
import { formatNomPropre } from '../../lib/formatName';
import {
  drawSignatureBlock, loadPdfChromeAssets, drawPageChrome, drawDocumentHeader, PDF_LAYOUT, PDF_COLORS,
} from '../../lib/pdfService';
import { formatDocteur, formatCabinet, civilite } from '../../lib/formatName';
import { DocumentSignatureBlock } from '../DocumentSignatureBlock';
import { ExamensListView } from '../exams/ExamensListView';

/* ── Types ─────────────────────────────────────────────────────────────────── */
type CertType =
  | 'repos'
  | 'arret_travail'
  | 'accident_travail'
  | 'general'
  | 'aptitude'
  | 'inaptitude'
  | 'vaccination'
  | 'transport'
  | 'autre';

interface DoctorInfo {
  nom: string;
  prenom: string;
  specialite: string;
  inpe: string;
  ordre: string;
  adresse: string;
  telephone: string;
  orgName: string;
}

interface PatientInfo {
  nom: string;
  prenom: string;
  dateNaissance: string;
  sexe: string;
}

interface CertRecord {
  id: string;
  type: string;
  numero: string;
  certName: string;
  patientNom: string;
  patientPrenom: string;
  created_at: string;
  data: Record<string, string | boolean | null>;
}

interface DocumentsViewProps {
  /** Sprint 5B — onglet ouvert à l'arrivée et lien vers la fiche d'un patient. */
  initialTab?: 'certificats' | 'examens';
  onOpenPatient?: (patientId: string) => void;
  patients: Patient[];
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
  doctorProfile?: {
    id?: string;
    specialite?: string | null;
    inpe?: string | null;
    rpps?: string | null;
    ordre_number?: string | null;
    logo_url?: string | null;
    organisations?: {
      name?: string;
      adresse?: string | null;
      telephone?: string | null;
    } | null;
  } | null;
  /** Sprint 4d-quater — cabinet (même source que l'ordonnance) : nom, adresse, téléphone. */
  org?: { name?: string | null; adresse?: string | null; telephone?: string | null } | null;
}

/* ── Certificate config (Certificat médical uniquement) ─────────────────────── */
interface CertConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

// Types proposés dans le formulaire = types acceptés par la base (documents_medicaux.type).
const SELECTABLE_TYPES: CertType[] = ['general', 'repos', 'aptitude'];

const CERT_CONFIGS: Record<CertType, CertConfig> = {
  repos:           { label: 'Certificat de repos',     icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', description: 'Repos médical : nombre de jours, dates calculées' },
  arret_travail:   { label: 'Arrêt de travail',        icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', description: 'Certificat médical général' },
  accident_travail:{ label: 'Accident de travail',     icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', description: 'Certificat médical général' },
  general:         { label: 'Certificat médical',      icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', description: 'Certificat médical général' },
  aptitude:        { label: "Certificat d'aptitude",   icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', description: 'Aptitude à une activité, un emploi ou un sport' },
  inaptitude:      { label: "Certificat d'inaptitude", icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', description: 'Certificat médical général' },
  vaccination:     { label: 'Certificat de vaccination',icon: FileText,color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', description: 'Certificat médical général' },
  transport:       { label: 'Bon de transport médical',icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', description: 'Certificat médical général' },
  autre:           { label: 'Autre certificat',        icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', description: 'Certificat médical général' },
};

/* ── Templates ──────────────────────────────────────────────────────────────── */
interface TemplateOpts {
  /** Sexe du patient : « M. » / « Mme » ; « M./Mme » seulement s'il est inconnu. */
  sexe?: string | null;
  /** Certificat de repos : nombre de jours et date de début (ISO). */
  reposJours?: number;
  reposDebutIso?: string;
}

/** Date de fin d'un repos de `jours` jours commençant le `debutIso` (inclus). */
function reposFinIso(debutIso: string, jours: number): string {
  const [y, m, d] = debutIso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + Math.max(1, jours) - 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function getTemplate(type: CertType, doctorNom: string, patientNom: string, date: string, opts: TemplateOpts = {}): string {
  const civ = civilite(opts.sexe);
  const patient = `${civ} ${formatNomPropre(patientNom) || '[NOM DU PATIENT]'}`;
  const doctor  = formatNomPropre(doctorNom)  || '[NOM DU MÉDECIN]';
  const d = date || new Date().toLocaleDateString('fr-FR');
  const interesse = civ === 'M.' ? "l'intéressé" : civ === 'Mme' ? "l'intéressée" : "l'intéressé(e)";

  switch (type) {
    case 'repos': {
      const jours = Math.max(1, opts.reposJours ?? 1);
      const debut = opts.reposDebutIso || todayStr();
      const fin = reposFinIso(debut, jours);
      return `Je soussigné, Docteur ${doctor}, certifie avoir examiné ce jour ${patient}.

Son état de santé nécessite un repos de ${jours} jour${jours > 1 ? 's' : ''}, du ${formatDateFr(debut)} au ${formatDateFr(fin)} inclus, sauf complications.

En foi de quoi, je délivre le présent certificat à ${interesse} pour faire valoir ce que de droit.`;
    }

    case 'arret_travail':
      return `Je soussigné, Docteur ${doctor}, certifie avoir examiné ce jour ${patient}.

Suite à cet examen, je prescris un arrêt de travail de _____ jours à compter du ${d}.

Motif médical : [PRÉCISER LE MOTIF]

Autorisation de sortie : ☐ Oui  ☐ Non
Si oui, sorties autorisées de ___h à ___h.

Ce certificat est établi à la demande de l'intéressé(e) et lui est remis pour faire valoir ce que de droit.`;

    case 'accident_travail':
      return `Je soussigné, Docteur ${doctor}, certifie avoir examiné ce jour ${patient}, suite à un accident survenu le ${d}.

CONSTATATIONS CLINIQUES :
[Décrire les lésions constatées]

ÉTAT GÉNÉRAL :
[Description de l'état général]

TRAITEMENT PRESCRIT :
[Traitement ou soins prescrits]

SUITES PRÉVISIBLES :
Durée d'incapacité de travail estimée : _____ jours
Consolidation prévisible le : ___________

Ce certificat est établi à la demande de l'intéressé(e) pour faire valoir ce que de droit.`;

    case 'general':
      return `Je soussigné, Docteur ${doctor}, certifie avoir examiné ce jour ${patient}.

[OBJET DU CERTIFICAT — décrire les constations médicales ou l'objet du certificat]

En foi de quoi, je délivre le présent certificat à ${interesse} pour faire valoir ce que de droit.`;

    case 'aptitude':
      return `Je soussigné, Docteur ${doctor}, certifie avoir examiné ce jour ${patient}.

À l'issue de cet examen médical, je déclare que ${interesse} est apte à [PRÉCISER L'ACTIVITÉ / L'EMPLOI / LE SPORT] et ne présente, à ce jour, aucune contre-indication cliniquement décelable à cette pratique.

[Observations éventuelles ou restrictions particulières]

Ce certificat est établi à la demande de ${interesse} et lui est remis pour faire valoir ce que de droit.`;

    case 'inaptitude':
      return `Je soussigné, Docteur ${doctor}, certifie avoir examiné ce jour ${patient}.

À l'issue de cet examen médical, je déclare que l'intéressé(e) est :

✗ INAPTE à [PRÉCISER L'ACTIVITÉ / L'EMPLOI]

Motif de l'inaptitude : [PRÉCISER LA RAISON MÉDICALE]

Durée de l'inaptitude : ☐ Temporaire (jusqu'au __________)  ☐ Définitive

Ce certificat est établi à la demande de l'intéressé(e) et lui est remis pour faire valoir ce que de droit.`;

    case 'vaccination':
      return `Je soussigné, Docteur ${doctor}, certifie avoir vacciné ce jour ${patient}.

VACCIN ADMINISTRÉ : [NOM DU VACCIN]
Fabricant / Lot n° : ___________
Voie d'administration : ___________
Site d'injection : ___________

Prochaine dose / rappel prévu le : ___________

Réactions post-vaccinales observées : ☐ Aucune  ☐ Autres : ___________

Ce certificat est établi conformément aux recommandations vaccinales en vigueur.`;

    case 'transport':
      return `Je soussigné, Docteur ${doctor}, prescris le transport sanitaire de ${patient}.

MOTIF DU TRANSPORT : [PRÉCISER LE MOTIF MÉDICAL]

TYPE DE TRANSPORT :
☐ Ambulance  ☐ VSL (véhicule sanitaire léger)  ☐ Taxi médical

De : [LIEU DE DÉPART]
Vers : [LIEU DE DESTINATION / ÉTABLISSEMENT DE SOINS]

Date et heure prévues : ___________

Fréquence : ☐ Aller simple  ☐ Aller-retour  ☐ Répété (_____ fois/semaine)

Ce bon de transport est établi conformément aux exigences médicales du patient.`;

    case 'autre':
      return `Je soussigné, Docteur ${doctor}, certifie que ${patient} :

[INDIQUER LE CONTENU DU CERTIFICAT]

En foi de quoi, je délivre le présent certificat à l'intéressé(e) pour faire valoir ce que de droit.`;
  }
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
function formatDateFr(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function generateNumero(type: CertType): string {
  const codes: Record<CertType, string> = {
    repos: 'REP', arret_travail: 'AT', accident_travail: 'ACC', general: 'CG',
    aptitude: 'APT', inaptitude: 'INA', vaccination: 'VAC',
    transport: 'TR', autre: 'DOC',
  };
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${codes[type]}-${year}-${rand}`;
}

/* ── PDF generation ──────────────────────────────────────────────────────────── */
async function generateCertificatPdf(params: {
  type: CertType;
  certName: string;
  certBody: string;
  certDate: string;
  numero: string;
  doctor: DoctorInfo;
  patient: PatientInfo;
  inclureLogo: boolean;
  inclureQR: boolean;
  logoUrl?: string | null;
}): Promise<void> {
  const { type, certName, certBody, certDate, numero, doctor, patient, inclureLogo, inclureQR, logoUrl } = params;
  // Noms formatés à l'affichage uniquement (la donnée en base reste inchangée)
  const patientName = formatNomPropre(`${patient.prenom} ${patient.nom}`);
  const civ = civilite(patient.sexe);

  // Sprint 4d-ter — même traitement que l'ordonnance : PDF compressé, images réduites.
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pageW = PDF_LAYOUT.PAGE_W;
  const pageH = PDF_LAYOUT.PAGE_H;
  const mL = PDF_LAYOUT.MARGIN_L, mR = PDF_LAYOUT.MARGIN_R, mT = 22;
  const cW = PDF_LAYOUT.CONTENT_W;

  // ── QR code (optional) ─────────────────────────────────────────────────────
  let qrDataUrl: string | null = null;
  if (inclureQR) {
    const qrText = [
      `N° ${numero}`,
      `${CERT_CONFIGS[type].label}`,
      `Patient: ${patientName}`,
      `Médecin: ${formatDocteur(doctor.prenom, doctor.nom)}`,
      `Date: ${formatDateFr(certDate)}`,
    ].join('\n');
    qrDataUrl = await QRCode.toDataURL(qrText, { width: 100, margin: 1, color: { dark: '#0A1628' } });
  }

  // ── Sprint 4d-quater — habillage et en-tête IDENTIQUES à l'ordonnance (composant partagé) :
  //    bandes vertes, filigrane, Dr Prénom Nom, spécialité, N° d'Ordre, INPE, cabinet,
  //    adresse, téléphone ; titre, date et numéro à droite.
  const assets = await loadPdfChromeAssets(inclureLogo ? logoUrl : null);
  const decoratePage = () => drawPageChrome(doc, assets.watermark);
  decoratePage();
  let y = drawDocumentHeader(doc, {
    doctor: { prenom: doctor.prenom, nom: doctor.nom, specialite: doctor.specialite || null, rpps: doctor.inpe || null, ordre_number: doctor.ordre || null },
    org: { name: doctor.orgName, adresse: doctor.adresse || null, telephone: doctor.telephone || null },
    title: 'CERTIFICAT',
    dateIso: certDate,
    numero,
  }, assets.logo);

  // QR code sous le numéro (bloc droit)
  if (qrDataUrl) {
    const qrSize = 20;
    doc.addImage(qrDataUrl, 'PNG', pageW - mR - qrSize, 16 + 18, qrSize, qrSize);
    y = Math.max(y, 16 + 18 + qrSize + 2);
  }

  // ── Separator ─────────────────────────────────────────────────────────────
  doc.setDrawColor(PDF_COLORS.DIVIDER);
  doc.setLineWidth(0.4);
  doc.line(mL, y, pageW - mR, y);
  y += 7;

  // ── Patient — même ligne que sur l'ordonnance, sans espace vide au-dessus ──
  if (patient.nom || patient.prenom) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(PDF_COLORS.INK_NAVY);
    const naissance = patient.dateNaissance ? ` — né${civ === 'Mme' ? 'e' : civ === 'M.' ? '' : '(e)'} le ${formatDateFr(patient.dateNaissance)}` : '';
    const line = doc.splitTextToSize(`Patient : ${civ} ${patientName}${naissance}`, cW);
    doc.text(line, mL, y);
    y += line.length * 4.5 + 1.5;
    doc.setDrawColor(PDF_COLORS.DIVIDER);
    doc.line(mL, y, pageW - mR, y);
    y += 10;
  } else {
    y += 4;
  }

  // ── Certificate title ─────────────────────────────────────────────────────
  const title = (type === 'autre' && certName) ? certName.toUpperCase() : CERT_CONFIGS[type].label.toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(PDF_COLORS.INK_NAVY);
  doc.text(title, pageW / 2, y, { align: 'center' });
  y += 10;

  doc.setDrawColor(PDF_COLORS.GREEN);
  doc.setLineWidth(0.4);
  const titleW = doc.getTextWidth(title);
  doc.line(pageW / 2 - titleW / 2, y - 3, pageW / 2 + titleW / 2, y - 3);
  y += 6;

  // ── Body text ─────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);

  const bodyLines = doc.splitTextToSize(certBody, cW);
  for (const line of bodyLines) {
    if (y > pageH - 45) {
      doc.addPage();
      decoratePage();
      y = mT;
    }
    doc.text(line, mL, y);
    y += 5.5;
  }

  // ── Date + signature/cachet — même bloc que l'ordonnance ─────────────────
  y = Math.max(y + 8, pageH - 65);
  if (y > pageH - 40) { doc.addPage(); decoratePage(); y = mT + 10; }
  drawSignatureBlock(doc, y, certDate);

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(160, 160, 160);
  doc.text(
    [formatCabinet(doctor.orgName), formatDateFr(certDate), `N° ${numero}`].filter(Boolean).join('  ·  '),
    pageW / 2, pageH - 8, { align: 'center' }
  );

  doc.save(`certificat-${type}-${numero}.pdf`);
}

/* ══════════════════════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════════════════════ */
export function DocumentsView({ patients, showToast, doctorProfile, org, initialTab = 'certificats', onOpenPatient }: DocumentsViewProps) {
  const { user } = useAuth();
  // Sprint 5B — onglets de la page Documents : certificats / demandes d'examens.
  const [docTab, setDocTab] = useState<'certificats' | 'examens'>(initialTab);
  const docTabs = (
    <div className="inline-flex p-1 mb-5 rounded-xl bg-slate-100 dark:bg-white/[0.05]" role="tablist" aria-label="Type de document">
      {([['certificats', 'Certificats'], ['examens', 'Demandes d’examens']] as const).map(([id, label]) => (
        <button key={id} type="button" role="tab" aria-selected={docTab === id} onClick={() => setDocTab(id)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${docTab === id
            ? 'bg-white dark:bg-[#111827] text-[#0A1628] dark:text-[#E2E8F0] shadow-sm'
            : 'text-slate-500 dark:text-[#94A3B8] hover:text-[#0A1628] dark:hover:text-[#E2E8F0]'}`}>
          {label}
        </button>
      ))}
    </div>
  );

  // View mode
  const [view, setView] = useState<'list' | 'create'>('list');

  // List state
  const [certs, setCerts] = useState<CertRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [filterType, setFilterType] = useState<CertType | 'all'>('all');
  const [searchList, setSearchList] = useState('');

  // Editor state
  const [certType, setCertType] = useState<CertType>('general');
  const [certName, setCertName] = useState('');
  const [certBody, setCertBody] = useState('');
  const [certDate, setCertDate] = useState(todayStr());
  const [inclureLogo, setInclureLogo] = useState(true);
  const [inclureQR, setInclureQR] = useState(false);
  const [editDoctorInfo, setEditDoctorInfo] = useState(false);
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo>({
    nom: '', prenom: '', specialite: '', inpe: '', ordre: '', adresse: '', telephone: '', orgName: '',
  });
  // Certificat de repos : nombre de jours (dates « du … au … » calculées).
  const [reposJours, setReposJours] = useState(3);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [manualPatient, setManualPatient] = useState<PatientInfo>({ nom: '', prenom: '', dateNaissance: '', sexe: '' });
  const [useManualPatient, setUseManualPatient] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [saving, setSaving] = useState(false);
  const [docNumero] = useState(generateNumero('general'));

  // Init doctor info from profile
  useEffect(() => {
    if (user) {
      // Même source que l'ordonnance (profil du cabinet), à défaut l'organisation jointe au profil.
      const o = org ?? doctorProfile?.organisations;
      setDoctorInfo({
        nom:       user.nom       || '',
        prenom:    user.prenom    || '',
        specialite: doctorProfile?.specialite || '',
        inpe:      doctorProfile?.inpe || doctorProfile?.rpps || '',
        ordre:     doctorProfile?.ordre_number || '',
        adresse:   o?.adresse              || '',
        telephone: o?.telephone            || '',
        orgName:   formatCabinet(o?.name) || `Cabinet ${formatDocteur(user.prenom, user.nom)}`,
      });
    }
  // Dépendances primitives : ne pas écraser le formulaire quand le profil est rechargé.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, doctorProfile?.id, org?.name, org?.adresse, org?.telephone]);

  // Load existing certificates
  useEffect(() => {
    loadCerts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients.length]);

  const loadCerts = async () => {
    setLoadingList(true);
    try {
      const { data } = await supabase
        .from('documents_medicaux')
        .select('id, type, numero, data, created_at, patient_id')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) {
        // Nom du patient : celui enregistré avec le certificat, sinon la fiche patient.
        const byId = new Map(patients.map(pt => [pt.id, pt]));
        const mapped: CertRecord[] = data.map(r => ({
          id: r.id,
          // Type réel du certificat (data.certType), à défaut le type en base.
          type: (r.data as any)?.certType || r.type,
          numero: r.numero,
          certName: (r.data as any)?.certName || '',
          patientNom: (r.data as any)?.patientNom || byId.get(r.patient_id)?.nom || '',
          patientPrenom: (r.data as any)?.patientPrenom || byId.get(r.patient_id)?.prenom || '',
          created_at: r.created_at,
          data: r.data as Record<string, string | boolean | null>,
        }));
        setCerts(mapped);
      }
    } catch { /* ignore */ }
    setLoadingList(false);
  };

  /** Texte type du certificat pour l'état courant (type, patient, sexe, repos). */
  const buildTemplate = (t: CertType, over: { patient?: Patient | null; jours?: number; date?: string } = {}) => {
    const pat = over.patient !== undefined ? over.patient : selectedPatient;
    const patNom = pat ? `${pat.prenom} ${pat.nom}` : `${manualPatient.prenom} ${manualPatient.nom}`.trim();
    const sexe = pat ? pat.sexe : manualPatient.sexe;
    const date = over.date ?? certDate;
    return getTemplate(t, `${doctorInfo.prenom} ${doctorInfo.nom}`, patNom, formatDateFr(date), {
      sexe, reposJours: over.jours ?? reposJours, reposDebutIso: date,
    });
  };

  // When cert type changes, update template
  const handleTypeChange = (t: CertType) => {
    setCertType(t);
    setCertBody(buildTemplate(t));
  };

  // Init template on first open
  useEffect(() => {
    if (view === 'create' && !certBody) setCertBody(buildTemplate(certType));
  }, [view]);

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatient(p);
    setPatientSearch(`${p.prenom} ${p.nom}`);
    setShowPatientDropdown(false);
    setUseManualPatient(false);
    setManualPatient({ nom: p.nom, prenom: p.prenom, dateNaissance: p.date_naissance || '', sexe: p.sexe || '' });
    // Refresh template with patient name (+ civilité selon le sexe)
    setCertBody(buildTemplate(certType, { patient: p }));
  };

  const filteredPatients = patients.filter(p =>
    `${p.prenom} ${p.nom}`.toLowerCase().includes(patientSearch.toLowerCase())
  ).slice(0, 8);

  const currentPatient: PatientInfo = useManualPatient
    ? manualPatient
    : (selectedPatient
      ? { nom: selectedPatient.nom, prenom: selectedPatient.prenom, dateNaissance: selectedPatient.date_naissance || '', sexe: selectedPatient.sexe || '' }
      : manualPatient);

  const certNumero = generateNumero(certType);

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      await generateCertificatPdf({
        type: certType,
        certName,
        certBody,
        certDate,
        numero: certNumero,
        doctor: doctorInfo,
        patient: currentPatient,
        inclureLogo,
        inclureQR,
        logoUrl: doctorProfile?.logo_url,
      });
    } catch (e: any) {
      showToast('Erreur lors de la génération du PDF', 'error');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSave = async () => {
    if (!selectedPatient && !useManualPatient) {
      handleDownloadPdf();
      return;
    }
    setSaving(true);
    try {
      const payload = {
        // Types acceptés par la base : repos, general, aptitude.
        type: SELECTABLE_TYPES.includes(certType) ? certType : 'general',
        numero: certNumero,
        data: {
          certType,
          certName,
          certBody,
          certDate,
          reposJours: certType === 'repos' ? reposJours : null,
          patientNom: currentPatient.nom,
          patientPrenom: currentPatient.prenom,
          inclureLogo,
          inclureQR,
        },
        patient_id: selectedPatient?.id ?? null,
        doctor_id: doctorProfile?.id ?? null,
        org_id: user?.org_id ?? null,
      };
      const { error } = await supabase.from('documents_medicaux').insert(payload);
      if (!error) showToast('Certificat enregistré', 'success');
      await loadCerts();
    } catch { /* ignore DB errors, PDF still generated */ }
    await handleDownloadPdf();
    setSaving(false);
    setShowPreview(false);
    setView('list');
  };

  const handleNewCert = () => {
    setCertType('general');
    setCertName('');
    setSelectedPatient(null);
    setPatientSearch('');
    setManualPatient({ nom: '', prenom: '', dateNaissance: '', sexe: '' });
    setUseManualPatient(false);
    setCertDate(todayStr());
    setInclureLogo(true);
    setInclureQR(false);
    setEditDoctorInfo(false);
    setReposJours(3);
    setCertBody(getTemplate('general', `${doctorInfo.prenom} ${doctorInfo.nom}`, '', formatDateFr(todayStr())));
    setView('create');
  };

  /* ── Demandes d'examens (Sprint 5B) ────────────────────────────────────────── */
  if (view === 'list' && docTab === 'examens') {
    return (
      <PageTransition>
        <div className="p-4 lg:p-6 max-w-5xl mx-auto">
          {docTabs}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">Demandes d’examens</h1>
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">Suivez les examens demandés jusqu’à leur réalisation</p>
          </div>
          <ExamensListView patients={patients} onOpenPatient={onOpenPatient} />
        </div>
      </PageTransition>
    );
  }

  /* ── List view ─────────────────────────────────────────────────────────────── */
  if (view === 'list') {
    const filtered = certs.filter(c => {
      if (filterType !== 'all' && c.type !== filterType) return false;
      const q = searchList.toLowerCase();
      return !q || `${c.patientPrenom} ${c.patientNom} ${c.numero}`.toLowerCase().includes(q);
    });

    return (
      <PageTransition>
        <div className="p-4 lg:p-6 max-w-5xl mx-auto">
          {docTabs}
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">Certificats médicaux</h1>
              <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">Rédigez et téléchargez vos certificats en PDF</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleNewCert}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#00A86B] hover:bg-[#006B47] text-white rounded-xl text-sm font-semibold shadow-lg shadow-[#00A86B]/25 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouveau certificat
            </motion.button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchList}
              onChange={e => setSearchList(e.target.value)}
              placeholder="Rechercher par patient ou numéro…"
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B] bg-white dark:bg-[#111827] text-slate-900 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-[#475569]"
            />
          </div>

          {/* List */}
          {loadingList ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#00A86B] animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-white/[0.06]">
              <FileText className="w-12 h-12 text-slate-200 dark:text-white/[0.08] mx-auto mb-3" />
              <p className="text-slate-500 dark:text-[#94A3B8] font-medium">Aucun certificat trouvé</p>
              <p className="text-slate-400 dark:text-[#475569] text-sm mt-1">Créez votre premier certificat médical</p>
              <button onClick={handleNewCert} className="mt-4 px-4 py-2 bg-[#00A86B] text-white rounded-xl text-sm font-semibold hover:bg-[#006B47] transition-colors">
                + Nouveau certificat
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(cert => {
                const cfg = CERT_CONFIGS[cert.type as CertType] || CERT_CONFIGS.autre;
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={cert.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-4 p-4 bg-white dark:bg-[#111827] border ${cfg.borderColor} dark:border-white/[0.06] rounded-xl hover:shadow-sm transition-shadow`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${cfg.bgColor} dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${cfg.color} dark:text-blue-400`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bgColor} dark:bg-blue-500/10 ${cfg.color} dark:text-blue-400`}>
                          {cert.certName || cfg.label}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-[#475569] font-mono">{cert.numero}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0] mt-0.5 truncate">
                        {(cert.patientNom || cert.patientPrenom)
                          ? formatNomPropre(`${cert.patientPrenom} ${cert.patientNom}`)
                          : <span className="font-normal text-slate-400 dark:text-[#475569]">Patient non renseigné</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-400 dark:text-[#475569]">
                        {new Date(cert.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </PageTransition>
    );
  }

  /* ── Create/Edit view ──────────────────────────────────────────────────────── */
  const cfg = CERT_CONFIGS[certType];
  const CertIcon = cfg.icon;

  return (
    <PageTransition>
      <div className="p-4 lg:p-6 max-w-5xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => setView('list')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour aux certificats
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left column ─────────────────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-4">

            {/* Patient */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-white/[0.06] p-4">
              <p className="text-xs font-bold text-slate-400 dark:text-[#475569] uppercase tracking-wider mb-3">Patient</p>

              {!useManualPatient ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    value={patientSearch}
                    onChange={e => { setPatientSearch(e.target.value); setShowPatientDropdown(true); setSelectedPatient(null); }}
                    onFocus={() => setShowPatientDropdown(true)}
                    placeholder="Rechercher un patient…"
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B] bg-white dark:bg-[#0A1628] text-slate-900 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-[#475569]"
                  />
                  <AnimatePresence>
                    {showPatientDropdown && filteredPatients.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-xl shadow-xl overflow-hidden"
                      >
                        {filteredPatients.map(p => (
                          <button
                            key={p.id}
                            onMouseDown={() => handleSelectPatient(p)}
                            className="w-full text-left px-3 py-2 text-sm text-slate-800 dark:text-[#E2E8F0] hover:bg-[#E6F4EE] dark:hover:bg-[#00A86B]/10 transition-colors"
                          >
                            <span className="font-medium">{p.prenom} {p.nom}</span>
                            {p.date_naissance && (
                              <span className="text-slate-400 ml-2 text-xs">{formatDateFr(p.date_naissance)}</span>
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : null}

              <button
                onClick={() => { setUseManualPatient(!useManualPatient); setSelectedPatient(null); setPatientSearch(''); }}
                className="mt-2 text-xs text-[#00A86B] hover:text-[#006B47] font-medium"
              >
                {useManualPatient ? '← Rechercher un patient existant' : 'Saisir manuellement →'}
              </button>

              {(useManualPatient || !selectedPatient) && (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      value={manualPatient.prenom}
                      onChange={e => setManualPatient(p => ({ ...p, prenom: e.target.value }))}
                      placeholder="Prénom"
                      className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B] bg-white dark:bg-[#0A1628] text-slate-800 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-[#475569]"
                    />
                    <input
                      value={manualPatient.nom}
                      onChange={e => setManualPatient(p => ({ ...p, nom: e.target.value }))}
                      placeholder="Nom"
                      className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B] bg-white dark:bg-[#0A1628] text-slate-800 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-[#475569]"
                    />
                  </div>
                  <input
                    type="date"
                    value={manualPatient.dateNaissance}
                    onChange={e => setManualPatient(p => ({ ...p, dateNaissance: e.target.value }))}
                    placeholder="Date de naissance"
                    className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B] bg-white dark:bg-[#0A1628] text-slate-800 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-[#475569]"
                  />
                  <select
                    value={manualPatient.sexe}
                    onChange={e => setManualPatient(p => ({ ...p, sexe: e.target.value }))}
                    className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B] bg-white dark:bg-[#0A1628] text-slate-800 dark:text-[#E2E8F0]"
                  >
                    <option value="">Sexe (optionnel)</option>
                    <option value="Masculin">Masculin</option>
                    <option value="Féminin">Féminin</option>
                  </select>
                </div>
              )}
            </div>

            {/* PDF options */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-white/[0.06] p-4">
              <p className="text-xs font-bold text-slate-400 dark:text-[#475569] uppercase tracking-wider mb-3">Options PDF</p>
              <label className="flex items-center gap-3 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={inclureLogo}
                  onChange={e => setInclureLogo(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 accent-[#00A86B]"
                />
                <span className="text-sm text-slate-700 dark:text-[#E2E8F0]">Inclure le logo du cabinet</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inclureQR}
                  onChange={e => setInclureQR(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 accent-[#00A86B]"
                />
                <span className="text-sm text-slate-700 dark:text-[#E2E8F0]">Inclure un QR code</span>
              </label>
            </div>
          </div>

          {/* ── Right column ─────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Certificate header */}
            <div className={`bg-white dark:bg-[#111827] rounded-2xl border ${cfg.borderColor} dark:border-white/[0.06] p-5`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl ${cfg.bgColor} dark:bg-blue-500/10 flex items-center justify-center`}>
                  <CertIcon className={`w-5 h-5 ${cfg.color} dark:text-blue-400`} />
                </div>
                <div className="flex-1">
                  {certType === 'autre' ? (
                    <input
                      value={certName}
                      onChange={e => setCertName(e.target.value)}
                      placeholder="Nom du certificat (ex: Certificat de repos)"
                      className="w-full text-lg font-bold bg-transparent border-b border-slate-300 dark:border-white/[0.08] focus:outline-none focus:border-[#00A86B] pb-1 text-slate-800 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-[#475569]"
                    />
                  ) : (
                    <h2 className="text-lg font-bold text-slate-800 dark:text-[#E2E8F0]">{cfg.label}</h2>
                  )}
                  <p className="text-xs text-slate-400 dark:text-[#475569] mt-0.5">{cfg.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-[#475569]" />
                  <input
                    type="date"
                    value={certDate}
                    onChange={e => {
                      setCertDate(e.target.value);
                      if (certType === 'repos' && e.target.value) setCertBody(buildTemplate('repos', { date: e.target.value }));
                    }}
                    className="text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B] bg-white dark:bg-[#0A1628] text-slate-800 dark:text-[#E2E8F0]"
                  />
                </div>
              </div>

              {/* Sprint 4d-quater — type de certificat (types acceptés par la base) */}
              <div className="mb-4">
                <p className="text-xs font-bold text-slate-400 dark:text-[#475569] uppercase tracking-wider mb-2">Type de certificat</p>
                <div className="flex flex-wrap gap-1.5">
                  {SELECTABLE_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTypeChange(t)}
                      aria-pressed={certType === t}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        certType === t
                          ? 'bg-[#00A86B] border-[#00A86B] text-white'
                          : 'bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#94A3B8] hover:border-[#00A86B]/50'
                      }`}
                    >
                      {CERT_CONFIGS[t].label}
                    </button>
                  ))}
                </div>
                {certType === 'repos' && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-[#E2E8F0]">
                    <label htmlFor="repos-jours" className="font-medium">Repos de</label>
                    <input
                      id="repos-jours"
                      type="number" min={1} max={365}
                      value={reposJours}
                      onChange={e => {
                        const n = Math.min(365, Math.max(1, Number(e.target.value) || 1));
                        setReposJours(n);
                        setCertBody(buildTemplate('repos', { jours: n }));
                      }}
                      className="w-20 px-2 py-1.5 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm bg-white dark:bg-[#0A1628] focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B]"
                    />
                    <span>jour{reposJours > 1 ? 's' : ''}, du <strong>{formatDateFr(certDate)}</strong> au <strong>{formatDateFr(reposFinIso(certDate, reposJours))}</strong> inclus</span>
                  </div>
                )}
                <p className="text-[11px] text-slate-400 dark:text-[#475569] mt-2">
                  Changer de type, de patient ou de durée recharge le texte type (modifiable ensuite).
                </p>
              </div>

              {/* Doctor info (collapsible edit) */}
              <div className="border-t border-slate-100 dark:border-white/[0.06] pt-3">
                <button
                  onClick={() => setEditDoctorInfo(!editDoctorInfo)}
                  className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#94A3B8] hover:text-slate-700 dark:hover:text-[#E2E8F0] transition-colors mb-2"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>{formatDocteur(doctorInfo.prenom, doctorInfo.nom)}</span>
                  {doctorInfo.specialite && <span className="text-slate-400 dark:text-[#475569]">· {doctorInfo.specialite}</span>}
                  <Edit2 className="w-3 h-3 ml-1 opacity-50" />
                </button>

                <AnimatePresence>
                  {editDoctorInfo && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2">
                        {[
                          { key: 'prenom',     label: 'Prénom',      icon: User },
                          { key: 'nom',        label: 'Nom',         icon: User },
                          { key: 'specialite', label: 'Spécialité',  icon: Stethoscope },
                          { key: 'inpe',       label: 'N° INPE',     icon: FileText },
                          { key: 'ordre',      label: "N° d'Ordre",  icon: FileText },
                          { key: 'telephone',  label: 'Téléphone',   icon: Phone },
                          { key: 'adresse',    label: 'Adresse',     icon: MapPin },
                          { key: 'orgName',    label: 'Nom cabinet', icon: FileText },
                        ].map(({ key, label }) => (
                          <input
                            key={key}
                            value={(doctorInfo as any)[key]}
                            onChange={e => setDoctorInfo(d => ({ ...d, [key]: e.target.value }))}
                            placeholder={label}
                            className="px-2.5 py-1.5 border border-slate-200 dark:border-white/[0.08] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B] bg-white dark:bg-[#0A1628] text-slate-800 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-[#475569]"
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Body textarea */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-white/[0.06] p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-400 dark:text-[#475569] uppercase tracking-wider">Contenu du certificat</p>
                <button
                  onClick={() => {
                    setCertBody(buildTemplate(certType));
                  }}
                  className="text-xs text-[#00A86B] hover:text-[#006B47] font-medium"
                >
                  ↺ Recharger le modèle
                </button>
              </div>
              <textarea
                value={certBody}
                onChange={e => setCertBody(e.target.value)}
                rows={18}
                className="w-full px-3 py-3 border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B] resize-none bg-white dark:bg-[#0A1628] text-slate-800 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-[#475569]"
                placeholder="Rédigez le contenu du certificat…"
              />
              <p className="text-xs text-slate-400 dark:text-[#475569] mt-1.5">
                Le texte est pré-rempli avec un modèle — modifiez-le librement avant de générer le PDF.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setView('list')}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#E2E8F0] transition-colors"
              >
                Annuler
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Aperçu
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleDownloadPdf}
                disabled={generatingPdf}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#00A86B] text-white rounded-xl text-sm font-semibold hover:bg-[#006B47] disabled:opacity-60 transition-colors shadow-lg shadow-[#00A86B]/25"
              >
                {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Télécharger PDF
              </motion.button>
            </div>
          </div>
        </div>

        {/* ── Preview modal ────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowPreview(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                {/* Preview header */}
                <div className="flex items-center justify-between p-4 lg:p-5 border-b border-slate-100 dark:border-white/[0.06]">
                  <h3 className="font-bold text-slate-800 dark:text-[#E2E8F0]">Aperçu du certificat</h3>
                  <button onClick={() => setShowPreview(false)} className="p-2 lg:p-1.5 text-slate-400 dark:text-[#475569] hover:text-slate-600 dark:hover:text-[#E2E8F0] active:bg-slate-200 dark:active:bg-white/[0.05] rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Preview content */}
                <div className="p-4 lg:p-6">
                  {/* Simulated A4 preview */}
                  <div className="border border-slate-200 rounded-xl p-4 lg:p-8 bg-white shadow-inner font-sans">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-bold text-[#0A1628] text-base">{formatDocteur(doctorInfo.prenom, doctorInfo.nom)}</p>
                        {doctorInfo.specialite && <p className="text-xs text-slate-500">{doctorInfo.specialite}</p>}
                        {doctorInfo.ordre && <p className="text-xs text-slate-500">N° Ordre : {doctorInfo.ordre}</p>}
                        {doctorInfo.inpe && <p className="text-xs text-slate-500">INPE : {doctorInfo.inpe}</p>}
                        <p className="text-xs text-slate-400 mt-1">{formatCabinet(doctorInfo.orgName)}</p>
                        {doctorInfo.adresse && <p className="text-xs text-slate-400">{doctorInfo.adresse}</p>}
                        {doctorInfo.telephone && <p className="text-xs text-slate-400">Tél : {doctorInfo.telephone}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Le {formatDateFr(certDate)}</p>
                        <p className="text-xs text-blue-600 font-mono mt-0.5">{certNumero}</p>
                      </div>
                    </div>

                    <hr className="border-blue-100 mb-4" />

                    {/* Patient */}
                    {(currentPatient.nom || currentPatient.prenom) && (
                      <div className="bg-slate-50 rounded-lg p-3 mb-4">
                        <p className="text-sm font-semibold text-slate-800">Patient : {civilite(currentPatient.sexe)} {formatNomPropre(`${currentPatient.prenom} ${currentPatient.nom}`)}</p>
                        {currentPatient.dateNaissance && <p className="text-xs text-slate-500 mt-0.5">Né(e) le : {formatDateFr(currentPatient.dateNaissance)}</p>}
                      </div>
                    )}

                    {/* Title */}
                    <p className="text-center font-bold text-slate-900 text-base mb-4 underline">
                      {(certType === 'autre' && certName) ? certName.toUpperCase() : CERT_CONFIGS[certType].label.toUpperCase()}
                    </p>

                    {/* Body */}
                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap mb-6">
                      {certBody}
                    </div>

                    {/* Date + signature/cachet — même bloc que l'ordonnance */}
                    <DocumentSignatureBlock date={formatDateFr(certDate)} />

                    {/* Footer */}
                    <p className="text-center text-xs text-slate-300 mt-6">
                      {formatCabinet(doctorInfo.orgName)} · N° {certNumero}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 p-5 border-t border-slate-100 dark:border-white/[0.06] justify-end flex-wrap">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-4 py-2 text-sm text-slate-600 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#E2E8F0] font-medium transition-colors"
                  >
                    Modifier
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-[#E2E8F0] rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimer
                  </motion.button>
                  {selectedPatient && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 disabled:opacity-60 transition-colors"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Enregistrer + PDF
                    </motion.button>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleDownloadPdf}
                    disabled={generatingPdf}
                    className="flex items-center gap-2 px-4 py-2 bg-[#00A86B] text-white rounded-xl text-sm font-semibold hover:bg-[#006B47] disabled:opacity-60 transition-colors shadow-lg shadow-[#00A86B]/25"
                  >
                    {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Télécharger PDF
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
