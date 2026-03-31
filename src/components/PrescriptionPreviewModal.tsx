import { ArrowLeft, Save, Printer } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

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
  doctor: {
    nom: string;
    prenom: string;
    titre: string;
    specialites: string[];
    rpps: string;
    telephone: string;
    email: string;
  };
  patient: {
    nom_complet: string;
    date_naissance?: string;
    age: number;
  };
  medications: MedicationForm[];
  remarks: string;
  nextAppointment?: string;
  interactionStatus?: string;
}

export function PrescriptionPreviewModal({
  isOpen,
  onClose,
  onBack,
  onSave,
  doctor,
  patient,
  medications,
  remarks,
  nextAppointment,
  interactionStatus
}: PrescriptionPreviewModalProps) {
  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Aperçu de l'ordonnance">
      <div className="space-y-4">
        <div id="prescription-content" className="bg-white border-2 border-blue-600 rounded-lg p-6">
          <div className="text-center mb-6 pb-4 border-b-2 border-blue-600">
            <h2 className="text-2xl font-bold text-blue-600">ORDONNANCE MÉDICALE</h2>
            <p className="text-sm text-gray-600 mt-1">Dr {doctor.prenom} {doctor.nom}</p>
            <p className="text-xs text-gray-500">{doctor.specialites.join(', ')}</p>
          </div>

          <div className="mb-4 text-sm">
            <p><strong>RPPS :</strong> {doctor.rpps}</p>
            <p><strong>Téléphone :</strong> {doctor.telephone}</p>
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded">
            <p className="font-semibold">Patient : {patient.nom_complet}</p>
            {patient.date_naissance && (
              <p className="text-sm">Né(e) le : {patient.date_naissance} ({patient.age} ans)</p>
            )}
            {!patient.date_naissance && (
              <p className="text-sm">Âge : {patient.age} ans</p>
            )}
            <p className="text-sm">Date : {today}</p>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold mb-2">Médicaments prescrits :</h3>
            {medications.map((med, index) => (
              <div key={med.id} className="mb-3 pl-4 border-l-2 border-blue-300">
                <p className="font-medium">{index + 1}. {med.nom}</p>
                <p className="text-sm text-gray-700">{med.posologie}</p>
                <p className="text-xs text-gray-600">Durée : {med.duree} | Quantité : {med.quantite}</p>
              </div>
            ))}
          </div>

          {remarks && (
            <div className="mb-4 p-3 bg-yellow-50 rounded">
              <h3 className="font-semibold mb-1">Remarques :</h3>
              <p className="text-sm whitespace-pre-wrap">{remarks}</p>
            </div>
          )}

          {interactionStatus && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <h3 className="font-semibold text-red-800 mb-1">Interactions médicamenteuses :</h3>
              <p className="text-sm text-red-700">{interactionStatus}</p>
            </div>
          )}

          {nextAppointment && (
            <div className="mb-4 p-3 bg-blue-50 rounded">
              <h3 className="font-semibold mb-1">Prochain rendez-vous :</h3>
              <p className="text-sm">{nextAppointment}</p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t flex justify-between text-sm">
            <p>Date : {today}</p>
            <p>Signature : Dr {doctor.nom}</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end no-print">
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
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
          }

          body * {
            visibility: hidden !important;
          }

          .no-print,
          .no-print * {
            display: none !important;
            visibility: hidden !important;
          }

          .fixed.inset-0 > .absolute {
            display: none !important;
          }

          .fixed.inset-0 {
            position: static !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
          }

          .fixed.inset-0 > div:not(.absolute) {
            position: static !important;
            max-width: 100% !important;
            max-height: 297mm !important;
            width: 100% !important;
            height: 297mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .fixed.inset-0 > div > div:first-child {
            display: none !important;
          }

          .fixed.inset-0 > div > div:last-child {
            overflow: hidden !important;
            max-height: 297mm !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          #prescription-content,
          #prescription-content * {
            visibility: visible !important;
          }

          #prescription-content {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            padding: 15mm !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
          }

          button {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>
    </Modal>
  );
}
