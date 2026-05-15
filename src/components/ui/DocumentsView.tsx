import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, X, Download, Search, Calendar,
  Clock, AlertTriangle, CheckCircle2, Shield, Heart,
  Activity, Star, Loader2, ChevronDown, Edit2,
  Eye, Save, ChevronLeft, User, Phone, MapPin, Stethoscope,
} from 'lucide-react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { supabase, Patient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PageTransition } from './PageTransition';

/* ── Types ─────────────────────────────────────────────────────────────────── */
type CertType =
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
  adresse: string;
  telephone: string;
  ville: string;
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
  patients: Patient[];
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
  doctorProfile?: {
    id?: string;
    specialite?: string | null;
    inpe?: string | null;
    logo_url?: string | null;
    organisations?: {
      name?: string;
      adresse?: string | null;
      telephone?: string | null;
      ville?: string | null;
    } | null;
  } | null;
}

/* ── Certificate configs ────────────────────────────────────────────────────── */
interface CertConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

const CERT_CONFIGS: Record<CertType, CertConfig> = {
  arret_travail:   { label: 'Arrêt de travail',        icon: Clock,          color: 'text-orange-600',  bgColor: 'bg-orange-50',  borderColor: 'border-orange-200', description: 'Congé maladie / arrêt de travail' },
  accident_travail:{ label: 'Accident de travail',     icon: AlertTriangle,  color: 'text-red-600',     bgColor: 'bg-red-50',     borderColor: 'border-red-200',    description: 'Constatation médicale suite à accident' },
  general:         { label: 'Certificat médical',      icon: FileText,       color: 'text-blue-600',    bgColor: 'bg-blue-50',    borderColor: 'border-blue-200',   description: 'Certificat médical général' },
  aptitude:        { label: "Certificat d'aptitude",   icon: CheckCircle2,   color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200',description: 'Aptitude à une activité / emploi' },
  inaptitude:      { label: "Certificat d'inaptitude", icon: Shield,         color: 'text-slate-600',   bgColor: 'bg-slate-50',   borderColor: 'border-slate-200',  description: 'Inaptitude médicale constatée' },
  vaccination:     { label: 'Certificat de vaccination', icon: Heart,        color: 'text-pink-600',    bgColor: 'bg-pink-50',    borderColor: 'border-pink-200',   description: 'Attestation de vaccination' },
  transport:       { label: 'Bon de transport médical',icon: Activity,       color: 'text-violet-600',  bgColor: 'bg-violet-50',  borderColor: 'border-violet-200', description: 'Prescription de transport sanitaire' },
  autre:           { label: 'Autre certificat',        icon: Star,           color: 'text-amber-600',   bgColor: 'bg-amber-50',   borderColor: 'border-amber-200',  description: 'Document médical personnalisé' },
};

/* ── Templates ──────────────────────────────────────────────────────────────── */
function getTemplate(type: CertType, doctorNom: string, patientNom: string, date: string): string {
  const patient = patientNom || '[NOM DU PATIENT]';
  const doctor  = doctorNom  || '[NOM DU MÉDECIN]';
  const d = date || new Date().toLocaleDateString('fr-FR');

  switch (type) {
    case 'arret_travail':
      return `Je soussigné, Docteur ${doctor}, certifie avoir examiné ce jour M./Mme ${patient}.

Suite à cet examen, je prescris un arrêt de travail de _____ jours à compter du ${d}.

Motif médical : [PRÉCISER LE MOTIF]

Autorisation de sortie : ☐ Oui  ☐ Non
Si oui, sorties autorisées de ___h à ___h.

Ce certificat est établi à la demande de l'intéressé(e) et lui est remis pour faire valoir ce que de droit.`;

    case 'accident_travail':
      return `Je soussigné, Docteur ${doctor}, certifie avoir examiné ce jour M./Mme ${patient}, suite à un accident survenu le ${d}.

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
      return `Je soussigné, Docteur ${doctor}, certifie avoir examiné ce jour M./Mme ${patient}.

[OBJET DU CERTIFICAT — décrire les constations médicales ou l'objet du certificat]

En foi de quoi, je délivre le présent certificat à l'intéressé(e) pour faire valoir ce que de droit.`;

    case 'aptitude':
      return `Je soussigné, Docteur ${doctor}, certifie avoir examiné ce jour M./Mme ${patient}.

À l'issue de cet examen médical, je déclare que l'intéressé(e) est :

✓ APTE à [PRÉCISER L'ACTIVITÉ / L'EMPLOI / LE SPORT]

[Observations éventuelles ou restrictions particulières]

Ce certificat est établi à la demande de l'intéressé(e) et lui est remis pour faire valoir ce que de droit.`;

    case 'inaptitude':
      return `Je soussigné, Docteur ${doctor}, certifie avoir examiné ce jour M./Mme ${patient}.

À l'issue de cet examen médical, je déclare que l'intéressé(e) est :

✗ INAPTE à [PRÉCISER L'ACTIVITÉ / L'EMPLOI]

Motif de l'inaptitude : [PRÉCISER LA RAISON MÉDICALE]

Durée de l'inaptitude : ☐ Temporaire (jusqu'au __________)  ☐ Définitive

Ce certificat est établi à la demande de l'intéressé(e) et lui est remis pour faire valoir ce que de droit.`;

    case 'vaccination':
      return `Je soussigné, Docteur ${doctor}, certifie avoir vacciné ce jour M./Mme ${patient}.

VACCIN ADMINISTRÉ : [NOM DU VACCIN]
Fabricant / Lot n° : ___________
Voie d'administration : ___________
Site d'injection : ___________

Prochaine dose / rappel prévu le : ___________

Réactions post-vaccinales observées : ☐ Aucune  ☐ Autres : ___________

Ce certificat est établi conformément aux recommandations vaccinales en vigueur.`;

    case 'transport':
      return `Je soussigné, Docteur ${doctor}, prescris le transport sanitaire de M./Mme ${patient}.

MOTIF DU TRANSPORT : [PRÉCISER LE MOTIF MÉDICAL]

TYPE DE TRANSPORT :
☐ Ambulance  ☐ VSL (véhicule sanitaire léger)  ☐ Taxi médical

De : [LIEU DE DÉPART]
Vers : [LIEU DE DESTINATION / ÉTABLISSEMENT DE SOINS]

Date et heure prévues : ___________

Fréquence : ☐ Aller simple  ☐ Aller-retour  ☐ Répété (_____ fois/semaine)

Ce bon de transport est établi conformément aux exigences médicales du patient.`;

    case 'autre':
      return `Je soussigné, Docteur ${doctor}, certifie que M./Mme ${patient} :

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
    arret_travail: 'AT', accident_travail: 'ACC', general: 'CG',
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

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const mL = 18, mR = 18, mT = 15;
  const cW = pageW - mL - mR;
  let y = mT;

  // ── QR code (optional) ─────────────────────────────────────────────────────
  let qrDataUrl: string | null = null;
  if (inclureQR) {
    const qrText = [
      `N° ${numero}`,
      `${CERT_CONFIGS[type].label}`,
      `Patient: ${patient.prenom} ${patient.nom}`,
      `Médecin: Dr. ${doctor.prenom} ${doctor.nom}`,
      `Date: ${formatDateFr(certDate)}`,
    ].join('\n');
    qrDataUrl = await QRCode.toDataURL(qrText, { width: 100, margin: 1, color: { dark: '#1e3a8a' } });
  }

  // ── Logo (optional) ───────────────────────────────────────────────────────
  if (inclureLogo && logoUrl) {
    try {
      const resp = await fetch(logoUrl);
      const blob = await resp.blob();
      const format: 'PNG' | 'JPEG' = blob.type.includes('png') ? 'PNG' : 'JPEG';
      const b64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      doc.addImage(b64, format, mL, y, 0, 18);
      y += 22;
    } catch { /* skip logo on error */ }
  }

  // ── Header: Cabinet info left / Date + Numéro right ─────────────────────
  const headerY = y;

  // Cabinet / Doctor info (left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 64, 175);
  doc.text(doctor.orgName || `Cabinet Dr. ${doctor.prenom} ${doctor.nom}`, mL, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.text(`Dr. ${doctor.prenom} ${doctor.nom}`, mL, y); y += 4.5;
  if (doctor.specialite) { doc.text(doctor.specialite, mL, y); y += 4.5; }
  if (doctor.inpe) { doc.text(`N° INPE : ${doctor.inpe}`, mL, y); y += 4.5; }
  if (doctor.adresse) { doc.text(doctor.adresse, mL, y); y += 4.5; }
  if (doctor.telephone) { doc.text(`Tél : ${doctor.telephone}`, mL, y); y += 4.5; }

  // Date + Numéro (right)
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.text(`Le ${formatDateFr(certDate)}`, pageW - mR, headerY, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(8);
  doc.text(numero, pageW - mR, headerY + 5, { align: 'right' });

  // QR code top-right
  if (qrDataUrl) {
    const qrSize = 22;
    doc.addImage(qrDataUrl, 'PNG', pageW - mR - qrSize, headerY + 9, qrSize, qrSize);
  }

  // ── Separator ─────────────────────────────────────────────────────────────
  y = Math.max(y + 4, headerY + 34);
  doc.setDrawColor(180, 200, 240);
  doc.setLineWidth(0.5);
  doc.line(mL, y, pageW - mR, y);
  y += 10;

  // ── Patient block ─────────────────────────────────────────────────────────
  if (patient.nom || patient.prenom) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(mL, y - 3, cW, (patient.dateNaissance ? 18 : 12), 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text(`${patient.prenom} ${patient.nom}`, mL + 4, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    if (patient.dateNaissance) {
      doc.text(`Né(e) le : ${formatDateFr(patient.dateNaissance)}`, mL + 4, y + 10);
      if (patient.sexe) doc.text(`Sexe : ${patient.sexe}`, mL + 80, y + 10);
    }
    y += (patient.dateNaissance ? 22 : 15);
  }

  // ── Certificate title ─────────────────────────────────────────────────────
  const title = (type === 'autre' && certName) ? certName.toUpperCase() : CERT_CONFIGS[type].label.toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text(title, pageW / 2, y, { align: 'center' });
  y += 10;

  doc.setDrawColor(30, 64, 175);
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
      y = mT;
    }
    doc.text(line, mL, y);
    y += 5.5;
  }

  // ── Closing / Fait à ─────────────────────────────────────────────────────
  y = Math.max(y + 8, pageH - 65);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(60, 60, 60);
  doc.text(`Fait à ${doctor.ville || 'Casablanca'}, le ${formatDateFr(certDate)}`, pageW - mR, y, { align: 'right' });
  y += 10;

  // ── Signature zone ────────────────────────────────────────────────────────
  const sigX = pageW - mR - 65;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text('Signature et cachet du médecin', sigX, y, { align: 'left' });
  y += 4;
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.3);
  doc.setLineDash([1, 1]);
  doc.line(sigX, y, pageW - mR, y);
  y += 14;
  doc.line(sigX, y, pageW - mR, y);
  doc.setLineDash([]);

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(160, 160, 160);
  doc.text(
    `Document généré par OrdoSur • ${numero} • ${formatDateFr(certDate)}`,
    pageW / 2, pageH - 8, { align: 'center' }
  );

  doc.save(`certificat-${type}-${numero}.pdf`);
}

/* ══════════════════════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════════════════════ */
export function DocumentsView({ patients, showToast, doctorProfile }: DocumentsViewProps) {
  const { user } = useAuth();

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
    nom: '', prenom: '', specialite: '', inpe: '', adresse: '', telephone: '', ville: 'Casablanca', orgName: '',
  });
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
      const org = doctorProfile?.organisations;
      setDoctorInfo({
        nom:       user.nom       || '',
        prenom:    user.prenom    || '',
        specialite: doctorProfile?.specialite || '',
        inpe:      doctorProfile?.inpe        || '',
        adresse:   org?.adresse              || '',
        telephone: org?.telephone            || '',
        ville:     (org as any)?.ville       || 'Casablanca',
        orgName:   org?.name                 || `Cabinet Dr. ${user.prenom} ${user.nom}`,
      });
    }
  }, [user, doctorProfile]);

  // Load existing certificates
  useEffect(() => {
    loadCerts();
  }, []);

  const loadCerts = async () => {
    setLoadingList(true);
    try {
      const { data } = await supabase
        .from('documents_medicaux')
        .select('id, type, numero, data, created_at, patient_id')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) {
        const mapped: CertRecord[] = data.map(r => ({
          id: r.id,
          type: r.type,
          numero: r.numero,
          certName: (r.data as any)?.certName || '',
          patientNom: (r.data as any)?.patientNom || '',
          patientPrenom: (r.data as any)?.patientPrenom || '',
          created_at: r.created_at,
          data: r.data as Record<string, string | boolean | null>,
        }));
        setCerts(mapped);
      }
    } catch { /* ignore */ }
    setLoadingList(false);
  };

  // When cert type changes, update template
  const handleTypeChange = (t: CertType) => {
    setCertType(t);
    const patNom = selectedPatient
      ? `${selectedPatient.prenom} ${selectedPatient.nom}`
      : (useManualPatient ? `${manualPatient.prenom} ${manualPatient.nom}` : '');
    const drNom = `${doctorInfo.prenom} ${doctorInfo.nom}`;
    setCertBody(getTemplate(t, drNom, patNom, formatDateFr(certDate)));
  };

  // Init template on first open
  useEffect(() => {
    if (view === 'create' && !certBody) {
      const patNom = selectedPatient
        ? `${selectedPatient.prenom} ${selectedPatient.nom}`
        : '';
      const drNom = `${doctorInfo.prenom} ${doctorInfo.nom}`;
      setCertBody(getTemplate(certType, drNom, patNom, formatDateFr(certDate)));
    }
  }, [view]);

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatient(p);
    setPatientSearch(`${p.prenom} ${p.nom}`);
    setShowPatientDropdown(false);
    setUseManualPatient(false);
    setManualPatient({ nom: p.nom, prenom: p.prenom, dateNaissance: p.date_naissance || '', sexe: p.sexe || '' });
    // Refresh template with patient name
    const drNom = `${doctorInfo.prenom} ${doctorInfo.nom}`;
    setCertBody(getTemplate(certType, drNom, `${p.prenom} ${p.nom}`, formatDateFr(certDate)));
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
        type: 'general', // fallback type for DB constraint
        numero: certNumero,
        data: {
          certType,
          certName,
          certBody,
          certDate,
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
    const drNom = `${doctorInfo.prenom} ${doctorInfo.nom}`;
    setCertBody(getTemplate('general', drNom, '', formatDateFr(todayStr())));
    setView('create');
  };

  /* ── List view ─────────────────────────────────────────────────────────────── */
  if (view === 'list') {
    const filtered = certs.filter(c => {
      if (filterType !== 'all' && c.type !== filterType) return false;
      const q = searchList.toLowerCase();
      return !q || `${c.patientPrenom} ${c.patientNom} ${c.numero}`.toLowerCase().includes(q);
    });

    return (
      <PageTransition>
        <div className="p-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Certificats médicaux</h1>
              <p className="text-sm text-slate-500 mt-0.5">Rédigez et téléchargez vos certificats en PDF</p>
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

          {/* Type filters */}
          <div className="flex gap-2 flex-wrap mb-4">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            >Tous</button>
            {(Object.entries(CERT_CONFIGS) as [CertType, CertConfig][]).map(([t, c]) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === t ? `${c.bgColor} ${c.color} border ${c.borderColor}` : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
              >{c.label}</button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchList}
              onChange={e => setSearchList(e.target.value)}
              placeholder="Rechercher par patient ou numéro…"
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B] bg-white"
            />
          </div>

          {/* List */}
          {loadingList ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#00A86B] animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
              <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Aucun certificat trouvé</p>
              <p className="text-slate-400 text-sm mt-1">Créez votre premier certificat médical</p>
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
                    className={`flex items-center gap-4 p-4 bg-white border ${cfg.borderColor} rounded-xl hover:shadow-sm transition-shadow`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${cfg.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bgColor} ${cfg.color}`}>
                          {cert.certName || cfg.label}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{cert.numero}</span>
                      </div>
                      {(cert.patientNom || cert.patientPrenom) && (
                        <p className="text-sm text-slate-600 mt-0.5 truncate">
                          {cert.patientPrenom} {cert.patientNom}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-400">
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
      <div className="p-6 max-w-5xl mx-auto">
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

            {/* Type selector */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Type de certificat</p>
              <div className="space-y-1.5">
                {(Object.entries(CERT_CONFIGS) as [CertType, CertConfig][]).map(([t, c]) => {
                  const Icon = c.icon;
                  return (
                    <button
                      key={t}
                      onClick={() => handleTypeChange(t)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-colors ${
                        certType === t
                          ? `${c.bgColor} ${c.color} border ${c.borderColor}`
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Patient */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Patient</p>

              {!useManualPatient ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    value={patientSearch}
                    onChange={e => { setPatientSearch(e.target.value); setShowPatientDropdown(true); setSelectedPatient(null); }}
                    onFocus={() => setShowPatientDropdown(true)}
                    placeholder="Rechercher un patient…"
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B]"
                  />
                  <AnimatePresence>
                    {showPatientDropdown && filteredPatients.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                      >
                        {filteredPatients.map(p => (
                          <button
                            key={p.id}
                            onMouseDown={() => handleSelectPatient(p)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-[#E6F4EE] transition-colors"
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
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={manualPatient.prenom}
                      onChange={e => setManualPatient(p => ({ ...p, prenom: e.target.value }))}
                      placeholder="Prénom"
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B]"
                    />
                    <input
                      value={manualPatient.nom}
                      onChange={e => setManualPatient(p => ({ ...p, nom: e.target.value }))}
                      placeholder="Nom"
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B]"
                    />
                  </div>
                  <input
                    type="date"
                    value={manualPatient.dateNaissance}
                    onChange={e => setManualPatient(p => ({ ...p, dateNaissance: e.target.value }))}
                    placeholder="Date de naissance"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B]"
                  />
                  <select
                    value={manualPatient.sexe}
                    onChange={e => setManualPatient(p => ({ ...p, sexe: e.target.value }))}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B] bg-white"
                  >
                    <option value="">Sexe (optionnel)</option>
                    <option value="Masculin">Masculin</option>
                    <option value="Féminin">Féminin</option>
                  </select>
                </div>
              )}
            </div>

            {/* PDF options */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Options PDF</p>
              <label className="flex items-center gap-3 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={inclureLogo}
                  onChange={e => setInclureLogo(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 accent-[#00A86B]"
                />
                <span className="text-sm text-slate-700">Inclure le logo du cabinet</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inclureQR}
                  onChange={e => setInclureQR(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 accent-[#00A86B]"
                />
                <span className="text-sm text-slate-700">Inclure un QR code</span>
              </label>
            </div>
          </div>

          {/* ── Right column ─────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Certificate header */}
            <div className={`bg-white rounded-2xl border ${cfg.borderColor} p-5`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl ${cfg.bgColor} flex items-center justify-center`}>
                  <CertIcon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div className="flex-1">
                  {certType === 'autre' ? (
                    <input
                      value={certName}
                      onChange={e => setCertName(e.target.value)}
                      placeholder="Nom du certificat (ex: Certificat de repos)"
                      className="w-full text-lg font-bold bg-transparent border-b border-slate-300 focus:outline-none focus:border-[#00A86B] pb-1 text-slate-800"
                    />
                  ) : (
                    <h2 className="text-lg font-bold text-slate-800">{cfg.label}</h2>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">{cfg.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={certDate}
                    onChange={e => setCertDate(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B]"
                  />
                </div>
              </div>

              {/* Doctor info (collapsible edit) */}
              <div className="border-t border-slate-100 pt-3">
                <button
                  onClick={() => setEditDoctorInfo(!editDoctorInfo)}
                  className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-colors mb-2"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Dr. {doctorInfo.prenom} {doctorInfo.nom}</span>
                  {doctorInfo.specialite && <span className="text-slate-400">· {doctorInfo.specialite}</span>}
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
                      <div className="grid grid-cols-2 gap-2 pb-2">
                        {[
                          { key: 'prenom',     label: 'Prénom',      icon: User },
                          { key: 'nom',        label: 'Nom',         icon: User },
                          { key: 'specialite', label: 'Spécialité',  icon: Stethoscope },
                          { key: 'inpe',       label: 'N° INPE',     icon: FileText },
                          { key: 'telephone',  label: 'Téléphone',   icon: Phone },
                          { key: 'ville',      label: 'Ville',       icon: MapPin },
                          { key: 'adresse',    label: 'Adresse',     icon: MapPin },
                          { key: 'orgName',    label: 'Nom cabinet', icon: FileText },
                        ].map(({ key, label }) => (
                          <input
                            key={key}
                            value={(doctorInfo as any)[key]}
                            onChange={e => setDoctorInfo(d => ({ ...d, [key]: e.target.value }))}
                            placeholder={label}
                            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B]"
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Body textarea */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contenu du certificat</p>
                <button
                  onClick={() => {
                    const patNom = selectedPatient
                      ? `${selectedPatient.prenom} ${selectedPatient.nom}`
                      : `${manualPatient.prenom} ${manualPatient.nom}`;
                    const drNom = `${doctorInfo.prenom} ${doctorInfo.nom}`;
                    setCertBody(getTemplate(certType, drNom, patNom, formatDateFr(certDate)));
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
                className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B] resize-none"
                placeholder="Rédigez le contenu du certificat…"
              />
              <p className="text-xs text-slate-400 mt-1.5">
                Le texte est pré-rempli avec un modèle — modifiez-le librement avant de générer le PDF.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setView('list')}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                {/* Preview header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800">Aperçu du certificat</h3>
                  <button onClick={() => setShowPreview(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Preview content */}
                <div className="p-6">
                  {/* Simulated A4 preview */}
                  <div className="border border-slate-200 rounded-xl p-8 bg-white shadow-inner font-sans">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-bold text-blue-700 text-base">{doctorInfo.orgName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Dr. {doctorInfo.prenom} {doctorInfo.nom}</p>
                        {doctorInfo.specialite && <p className="text-xs text-slate-400">{doctorInfo.specialite}</p>}
                        {doctorInfo.inpe && <p className="text-xs text-slate-400">N° INPE : {doctorInfo.inpe}</p>}
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
                        <p className="text-sm font-semibold text-slate-800">{currentPatient.prenom} {currentPatient.nom}</p>
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

                    {/* Closing */}
                    <p className="text-sm italic text-slate-600 text-right mb-6">
                      Fait à {doctorInfo.ville || 'Casablanca'}, le {formatDateFr(certDate)}
                    </p>

                    {/* Signature */}
                    <div className="ml-auto w-64">
                      <p className="text-xs text-slate-500 mb-1 text-center">Signature et cachet du médecin</p>
                      <div className="border-b border-dashed border-slate-300 h-12" />
                    </div>

                    {/* Footer */}
                    <p className="text-center text-xs text-slate-300 mt-6">
                      Document généré par OrdoSur • {certNumero}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 p-5 border-t border-slate-100 justify-end">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium transition-colors"
                  >
                    Modifier
                  </button>
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
