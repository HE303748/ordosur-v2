import { useRef, useState } from 'react';
import { createActionLock } from '../lib/viewCache';
import { ArrowLeft, Save, Printer, Download, AlertTriangle, Share2, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { generateOrdonnancePdf, PdfInteractionAlert, type PdfOrdonnanceData } from '../lib/pdfService';
import type { ExamPage } from '../lib/examDocument';
import { buildOrdonnanceWithExamsPdf, canSharePdf } from '../lib/examPdf';
import { outputPdf, type OutputMode } from '../lib/examUi';
import { ExamPagesPreview } from './exams/ExamPagesPreview';
import { formatAge } from '../lib/ageUtils';
import { formatNomPropre, formatDocteur, cabinetDistinct, civilite } from '../lib/formatName';
import { DocumentSignatureBlock } from './DocumentSignatureBlock';

interface MedicationForm {
  id: string;
  nom: string;
  posologie: string;
  duree: string;
  quantite: string;
}

interface PrescriptionPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  /**
   * Enregistre l'ordonnance (garde-fous Sprint 3b). Résout `true` si elle est enregistrée
   * (ou l'était déjà). Imprimer / Télécharger PDF l'appellent avec `keepPreview`.
   */
  onSave: (opts?: { keepPreview?: boolean }) => Promise<boolean>;
  /** Ordonnance déjà enregistrée : Imprimer / PDF ne réenregistrent pas. */
  isSaved?: boolean;
  /**
   * Sprint 4d-bis — consultation d'une ordonnance existante (page Ordonnances) : lecture
   * seule, réimpression sans réenregistrer ni redemander de dérogation.
   */
  readOnly?: boolean;
  /** Date de l'ordonnance (ISO) ; par défaut aujourd'hui (ordonnance en cours de création). */
  date?: string | null;
  /**
   * Sprint 3b — motif de blocage (vérification périmée / confirmation hors base manquante).
   * Non nul → Enregistrer, Imprimer et Télécharger PDF désactivés : aucune ordonnance ne
   * sort sans vérification.
   */
  blockedReason?: string | null;
  ordreNumber: string;
  logo_url?: string | null;
  doctor: {
    nom: string;
    prenom: string;
    specialite?: string | null;
    rpps?: string | null;
    ordre_number?: string | null;
    telephone?: string | null;
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
    sexe?: string | null;
  };
  motif?: string;
  medications: MedicationForm[];
  remarks: string;
  nextAppointment?: string;
  interactionAlerts?: PdfInteractionAlert[];
  /**
   * Sprint 5 — pages « Examens à réaliser » jointes à l'ordonnance : elles la suivent dans le
   * même PDF. Impression, PDF et partage passent alors par ce PDF unique.
   */
  examPages?: ExamPage[];
  /**
   * Préférence du médecin (Paramètres › Cabinet, désactivée par défaut) : nom et âge du patient
   * sur l'ordonnance imprimée / PDF. Les pages d'examens portent toujours le patient.
   */
  showPatientName?: boolean;
}

export function PrescriptionPreviewModal({
  isOpen,
  onClose,
  onBack,
  onSave,
  isSaved = false,
  readOnly = false,
  date = null,
  blockedReason = null,
  ordreNumber,
  logo_url,
  doctor,
  org,
  patient,
  motif,
  medications,
  remarks,
  nextAppointment,
  interactionAlerts = [],
  examPages = [],
  showPatientName = false,
}: PrescriptionPreviewModalProps) {
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  // Sprint P — double clic : une seule action à la fois (verrou synchrone ; l'état « en cours »
  // de React n'est connu qu'au rendu suivant). Jamais 2 enregistrements ni 2 PDF.
  const lock = useRef(createActionLock()).current;

  const docDate = date ? new Date(date) : new Date();
  const today = docDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const todayIso = docDate.toISOString().split('T')[0];

  const [saving, setSaving] = useState(false);
  const busy = saving || pdfLoading;

  /** Enregistre l'ordonnance si besoin avant toute sortie papier/PDF. */
  const ensureSaved = async (): Promise<boolean> => {
    if (isSaved) return true;
    setSaving(true);
    try {
      return await onSave({ keepPreview: true });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => lock.run('action', doSave);
  const doSave = async () => {
    if (blockedReason || busy || isSaved) return;
    setSaving(true);
    try { await onSave({ keepPreview: true }); } finally { setSaving(false); }
  };

  // Nom du cabinet : masqué s'il ne fait que répéter le nom du médecin (imprimé une seule fois).
  const cabinetName = cabinetDistinct(org.name, doctor.prenom, doctor.nom);
  const hasExams = examPages.length > 0;
  // Sprint 5c — partage natif (mobile) pour l'ordonnance seule comme pour l'ordonnance + examens.
  const shareable = canSharePdf();
  const confirmation = isSaved && !readOnly;
  const pdfData = (): PdfOrdonnanceData => ({
    ordreNumber, logo_url, doctor, org, patient, motif, medications, remarks, nextAppointment, date: todayIso, interactionAlerts,
    showPatientName,
  });
  const [outNote, setOutNote] = useState<string | null>(null);

  /** Ordonnance + examens : un seul PDF, imprimé, téléchargé ou partagé. */
  const outputCombined = (mode: OutputMode) => lock.run('action', () => doOutputCombined(mode));
  const doOutputCombined = async (mode: OutputMode) => {
    if (blockedReason || busy) return;
    setPdfError(null);
    setOutNote(null);
    if (!(await ensureSaved())) return;
    setPdfLoading(true);
    try {
      const file = await buildOrdonnanceWithExamsPdf(pdfData(), examPages);
      const msg = await outputPdf(file, mode, `Ordonnance et examens — ${patient.prenom} ${patient.nom}`);
      if (mode !== 'download') setOutNote(msg);
    } catch (e: unknown) {
      setPdfError(e instanceof Error ? e.message : 'Erreur lors de la génération du PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePrint = () => (hasExams ? outputCombined('print') : lock.run('action', doPrint));
  const doPrint = async () => {
    if (blockedReason || busy) return;
    if (!(await ensureSaved())) return; // échec : toast affiché par onSave, pas d'impression
    window.print();
  };

  const handleDownloadPdf = () => (hasExams ? outputCombined('download') : lock.run('action', doDownloadPdf));
  const doDownloadPdf = async () => {
    if (blockedReason || busy) return;
    setPdfError(null);
    if (!(await ensureSaved())) return;
    setPdfLoading(true);
    try {
      await generateOrdonnancePdf(pdfData());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur lors de la génération du PDF';
      setPdfError(msg);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={readOnly ? 'Ordonnance' : confirmation ? 'Ordonnance enregistrée' : "Aperçu de l'ordonnance"}>
      <div className="space-y-4">
        {/* Sprint 5c — écran de confirmation après l'enregistrement (ordonnance seule ou + examens) */}
        {confirmation && (
          <div role="status" className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#E6F4EE] border border-[#00A86B]/20 no-print">
            <CheckCircle2 className="w-5 h-5 text-[#00A86B] flex-shrink-0 mt-0.5" aria-hidden />
            <p className="text-sm text-[#0A1628]">
              <span className="font-semibold">Ordonnance enregistrée</span> — N° {ordreNumber}
              {hasExams && <> · {examPages.length} page{examPages.length > 1 ? 's' : ''} d’examens jointe{examPages.length > 1 ? 's' : ''}</>}.
              <span className="block text-xs text-slate-600 mt-0.5">Vous pouvez la télécharger, l’imprimer ou la partager, puis fermer.</span>
            </p>
          </div>
        )}
        <div id="prescription-content" className="bg-white border-2 border-blue-600 rounded-lg p-6">

          {/* En-tête cabinet */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                {logo_url
                  ? <img src={logo_url} alt="Logo cabinet" className="max-h-14 max-w-[160px] object-contain mb-1" />
                  : cabinetName && <h2 className="text-lg font-bold text-blue-700">{cabinetName}</h2>
                }
                {org.adresse && <p className="text-sm text-gray-600">{org.adresse}</p>}
                {org.telephone && <p className="text-sm text-gray-600">Tél : {org.telephone}</p>}
              </div>
              <div className="text-right">
                {/* Date : seule occurrence du document (le bloc signature ne la répète pas) */}
                <p className="text-sm text-gray-600">Le {today}</p>
                {/* Numéro : repère à l'écran uniquement, jamais imprimé */}
                <p className="text-xs font-bold text-blue-600 mt-1 no-print">{ordreNumber}</p>
              </div>
            </div>
          </div>

          {/* Médecin */}
          <div className="mb-4">
            <p className="text-xl font-bold text-blue-700">{formatDocteur(doctor.prenom, doctor.nom)}</p>
            {doctor.specialite && <p className="text-sm text-gray-600">{doctor.specialite}</p>}
            {doctor.rpps && <p className="text-sm text-gray-600">N° INPE : {doctor.rpps}</p>}
            {doctor.ordre_number && <p className="text-sm text-gray-600">N° Ordre : {doctor.ordre_number}</p>}
          </div>

          {/* Patient — repère à l'écran ; imprimé seulement si l'option du cabinet est activée */}
          <div className={`mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 ${showPatientName ? '' : 'no-print'}`}>
            {!showPatientName && (
              <p className="text-xs text-slate-500 mb-1">Non imprimé sur l’ordonnance (modifiable dans Paramètres › Cabinet)</p>
            )}
            <p className="font-semibold">Patient : {civilite(patient.sexe)} {formatNomPropre(patient.prenom)} {formatNomPropre(patient.nom)}</p>
            {patient.date_naissance && (
              <p className="text-sm text-gray-600 mt-0.5">
                Né(e) le : {(() => {
                  const [y, m, d] = patient.date_naissance!.split('T')[0].split('-');
                  return `${d}/${m}/${y}`;
                })()} {formatAge(patient.date_naissance) ? `(${formatAge(patient.date_naissance)})` : ''}
              </p>
            )}
          </div>

          {/* Titre */}
          <div className="text-center mb-4">
            <h3 className="text-base font-bold uppercase tracking-wide text-gray-800 border-b border-gray-300 pb-2">
              Ordonnance médicale
            </h3>
          </div>

          {/* Médicaments */}
          <div className="mb-4">
            {medications.map((med, index) => (
              <div key={med.id} className="mb-3 pl-4 border-l-2 border-blue-300">
                <p className="font-medium">{index + 1}. {med.nom}</p>
                {/* Sans posologie : la ligne s'imprime sans posologie (aucun texte inventé) */}
                {med.posologie?.trim() && <p className="text-sm text-gray-700">{med.posologie}</p>}
                {med.duree?.trim() && <p className="text-xs text-gray-600">Durée : {med.duree}</p>}
              </div>
            ))}
          </div>

          {/* Note du médecin */}
          {remarks && (
            <div className="mb-4 pt-3 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Note du médecin</p>
              <p className="text-sm text-gray-700 italic whitespace-pre-wrap">{remarks}</p>
            </div>
          )}

          <DocumentSignatureBlock />
        </div>

        {hasExams && (
          <div className="no-print">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Examens à réaliser — {examPages.length} page{examPages.length > 1 ? 's' : ''} à la suite de l’ordonnance
            </p>
            <ExamPagesPreview pages={examPages} />
          </div>
        )}

        {outNote && <p role="status" className="text-xs text-slate-600 no-print">{outNote}</p>}

        {pdfError && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 no-print">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {pdfError}
          </div>
        )}

        {blockedReason && (
          <div role="status" className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900 no-print">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <span>{blockedReason} Revenez au formulaire avec « Modifier ».</span>
          </div>
        )}

        <div className="flex gap-2 justify-end no-print flex-wrap">
          {/* Ordonnance enregistrée : figée, toute modification = nouvelle ordonnance */}
          {!isSaved && (
            <Button onClick={onBack} variant="secondary" disabled={busy}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Modifier
            </Button>
          )}
          {!readOnly && !isSaved && <Button onClick={handleSave} variant="primary" disabled={!!blockedReason || busy || isSaved}>
            {saving
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
              : <Save className="w-4 h-4 mr-2" />}
            {isSaved ? 'Enregistrée' : saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>}
          {shareable && (
            <Button onClick={() => outputCombined('share')} variant="secondary" disabled={!!blockedReason || busy}>
              <Share2 className="w-4 h-4 mr-2" />
              Partager
            </Button>
          )}
          <Button onClick={handlePrint} variant="secondary" disabled={!!blockedReason || busy}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimer
          </Button>
          <Button onClick={handleDownloadPdf} variant="secondary" disabled={busy || !!blockedReason}>
            {pdfLoading
              ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-2" />
              : <Download className="w-4 h-4 mr-2" />}
            {pdfLoading ? 'Génération…' : 'Télécharger PDF'}
          </Button>
          {confirmation && (
            <Button onClick={onClose} variant="primary" disabled={busy}>
              Fermer
            </Button>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body { margin: 0 !important; padding: 0 !important; width: 210mm !important; height: 297mm !important; overflow: hidden !important; }
          body * { visibility: hidden !important; }
          .no-print, .no-print * { display: none !important; }
          .fixed.inset-0 { position: static !important; background: white !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
          .fixed.inset-0 > div:not(.absolute) { position: static !important; max-width: 100% !important; }
          .fixed.inset-0 > div > div:first-child { display: none !important; }
          #prescription-content, #prescription-content * { visibility: visible !important; }
          #prescription-content { display: block !important; position: absolute !important; top: 0 !important; left: 0 !important; width: 210mm !important; min-height: 297mm !important; padding: 15mm !important; margin: 0 !important; border: none !important; border-radius: 0 !important; box-sizing: border-box !important; }
          button { display: none !important; }
        }
      `}</style>
    </Modal>
  );
}
