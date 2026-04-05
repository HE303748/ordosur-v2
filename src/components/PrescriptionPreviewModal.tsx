import { ArrowLeft, Save, Printer, Download, AlertTriangle, Shield } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { generateOrdonnancePdf, PdfInteractionAlert } from '../lib/pdfService';

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
  onSave: () => void;
  ordreNumber: string;
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
    pathologies?: string[] | null;
    allergies_medicaments?: string[] | null;
  };
  motif?: string;
  medications: MedicationForm[];
  remarks: string;
  nextAppointment?: string;
  interactionAlerts?: PdfInteractionAlert[];
}

export function PrescriptionPreviewModal({
  isOpen,
  onClose,
  onBack,
  onSave,
  ordreNumber,
  doctor,
  org,
  patient,
  motif,
  medications,
  remarks,
  nextAppointment,
  interactionAlerts = [],
}: PrescriptionPreviewModalProps) {
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const todayIso = new Date().toISOString().split('T')[0];

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    await generateOrdonnancePdf({
      ordreNumber,
      doctor,
      org,
      patient,
      motif,
      medications,
      remarks,
      nextAppointment,
      date: todayIso,
      interactionAlerts,
    });
  };

  const criticalAlerts = interactionAlerts.filter(a =>
    a.severite === 'contre_indication' || a.severite === 'majeure'
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Aperçu de l'ordonnance">
      <div className="space-y-4">
        <div id="prescription-content" className="bg-white border-2 border-blue-600 rounded-lg p-6">

          {/* En-tête cabinet */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-blue-700">{org.name}</h2>
                {org.adresse && <p className="text-sm text-gray-600">{org.adresse}</p>}
                {org.telephone && <p className="text-sm text-gray-600">Tél : {org.telephone}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Le {today}</p>
                <p className="text-xs font-bold text-blue-600 mt-1">{ordreNumber}</p>
              </div>
            </div>
          </div>

          {/* Médecin */}
          <div className="mb-4">
            <p className="text-xl font-bold text-blue-700">Dr {doctor.prenom} {doctor.nom}</p>
            {doctor.specialite && <p className="text-sm text-gray-600">{doctor.specialite}</p>}
            {doctor.rpps && <p className="text-sm text-gray-600">N° RPPS : {doctor.rpps}</p>}
            {doctor.ordre_number && <p className="text-sm text-gray-600">N° Ordre : {doctor.ordre_number}</p>}
          </div>

          {/* Patient */}
          <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="font-semibold">Patient : {patient.prenom} {patient.nom}</p>
            {patient.date_naissance && (
              <p className="text-sm text-gray-600">Né(e) le : {new Date(patient.date_naissance).toLocaleDateString('fr-FR')}</p>
            )}
            {motif && <p className="text-sm mt-1">Motif : {motif}</p>}

            {/* Pathologies */}
            {patient.pathologies && patient.pathologies.length > 0 && (
              <div className="mt-2 flex items-start gap-2 flex-wrap">
                <span className="text-xs font-semibold text-blue-700">Pathologies :</span>
                {patient.pathologies.map(p => (
                  <span key={p} className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full border border-blue-200">{p}</span>
                ))}
              </div>
            )}

            {/* Allergies */}
            {patient.allergies_medicaments && patient.allergies_medicaments.length > 0 && (
              <div className="mt-1.5 flex items-start gap-2 flex-wrap">
                <span className="text-xs font-semibold text-red-700">⚠ Allergies :</span>
                {patient.allergies_medicaments.map(a => (
                  <span key={a} className="px-1.5 py-0.5 bg-red-100 text-red-800 text-xs rounded-full border border-red-200 font-medium">{a}</span>
                ))}
              </div>
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
                <p className="text-sm text-gray-700">{med.posologie}</p>
                <p className="text-xs text-gray-600">Durée : {med.duree} | Quantité : {med.quantite}</p>
              </div>
            ))}
          </div>

          {/* Alertes interactions */}
          {criticalAlerts.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-1.5 text-sm">
                <AlertTriangle className="w-4 h-4" />
                Alertes interactions / contre-indications
              </h3>
              <div className="space-y-1.5">
                {criticalAlerts.map((alert, idx) => (
                  <div key={idx} className="text-xs text-red-700 flex items-start gap-1.5">
                    <span className="flex-shrink-0">
                      {alert.severite === 'contre_indication' ? '🔴' : '🟠'}
                    </span>
                    <span>
                      <strong>{alert.involved.join(' + ')}</strong> — {alert.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aucune alerte */}
          {interactionAlerts.length === 0 && medications.length >= 2 && (
            <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-700 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                🟢 Aucune interaction médicamenteuse connue détectée
              </p>
            </div>
          )}

          {remarks && (
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="font-semibold mb-1 text-sm">Remarques :</h3>
              <p className="text-sm whitespace-pre-wrap">{remarks}</p>
            </div>
          )}

          {nextAppointment && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="font-semibold mb-1 text-sm">Prochain rendez-vous :</h3>
              <p className="text-sm">{nextAppointment}</p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t flex justify-between items-center text-sm text-gray-500">
            <span className="text-xs text-gray-400">Ordonnance générée par OrdoSur</span>
            <p>Signature : Dr {doctor.prenom} {doctor.nom}</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end no-print flex-wrap">
          <Button onClick={onBack} variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Modifier
          </Button>
          <Button onClick={onSave} variant="primary">
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
          <Button onClick={handlePrint} variant="secondary">
            <Printer className="w-4 h-4 mr-2" />
            Imprimer
          </Button>
          <Button onClick={handleDownloadPdf} variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Télécharger PDF
          </Button>
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
