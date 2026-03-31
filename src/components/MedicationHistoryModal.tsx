import { Clock, User, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface Medication {
  nom: string;
  posologie: string;
  duree: string;
  quantite: string;
}

interface Ordonnance {
  id: string;
  created_at: string;
  doctor_name: string;
  doctor_specialty: string;
  medications: Medication[];
  remarks?: string;
  interaction_status?: string;
}

interface MedicationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: {
    nom_complet: string;
  };
  ordonnances: Ordonnance[];
}

const getStatusIcon = (status?: string) => {
  if (!status) return null;

  if (status.toLowerCase().includes('sécuritaire') || status.toLowerCase().includes('safe')) {
    return <CheckCircle2 className="w-4 h-4 text-success-600" />;
  }
  if (status.toLowerCase().includes('attention')) {
    return <AlertTriangle className="w-4 h-4 text-warning-600" />;
  }
  if (status.toLowerCase().includes('danger')) {
    return <AlertCircle className="w-4 h-4 text-danger-600" />;
  }
  return null;
};

const getStatusColor = (status?: string) => {
  if (!status) return 'text-slate-600';

  if (status.toLowerCase().includes('sécuritaire') || status.toLowerCase().includes('safe')) {
    return 'text-success-600';
  }
  if (status.toLowerCase().includes('attention')) {
    return 'text-warning-600';
  }
  if (status.toLowerCase().includes('danger')) {
    return 'text-danger-600';
  }
  return 'text-slate-600';
};

export function MedicationHistoryModal({ isOpen, onClose, patient, ordonnances }: MedicationHistoryModalProps) {
  const mostRecentOrdonnance = ordonnances.length > 0 ? [ordonnances[0]] : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Ordonnance - ${patient.nom_complet}`} size="xl">
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {mostRecentOrdonnance.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucune prescription disponible</p>
          </div>
        ) : (
          mostRecentOrdonnance.map((ordonnance) => {
            const date = new Date(ordonnance.created_at);
            const formattedDate = date.toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
            const formattedTime = date.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div key={ordonnance.id} className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-primary-600" />
                    <div>
                      <p className="font-semibold text-slate-900">
                        {formattedDate} à {formattedTime}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <User className="w-4 h-4 text-slate-500" />
                        <p className="text-sm text-slate-600">
                          {ordonnance.doctor_name}
                          {ordonnance.doctor_specialty && (
                            <span className="text-slate-500"> ({ordonnance.doctor_specialty})</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  {ordonnance.interaction_status && (
                    <div className={`flex items-center space-x-1 ${getStatusColor(ordonnance.interaction_status)}`}>
                      {getStatusIcon(ordonnance.interaction_status)}
                      <span className="text-xs font-medium">{ordonnance.interaction_status}</span>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 rounded-lg p-4 mb-3">
                  <h4 className="font-semibold text-slate-900 mb-2 text-sm">Médicaments prescrits</h4>
                  <ul className="space-y-2">
                    {ordonnance.medications.map((med, idx) => (
                      <li key={idx} className="text-sm text-slate-700">
                        <span className="font-medium">{med.nom}</span>
                        <span className="text-slate-500"> - {med.posologie} - {med.duree}</span>
                        {med.quantite && (
                          <span className="text-slate-400"> ({med.quantite})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {ordonnance.remarks && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                    <p className="text-sm text-slate-700 italic">{ordonnance.remarks}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="flex justify-end mt-6 pt-4 border-t border-slate-200">
        <Button onClick={onClose} variant="secondary">
          Fermer
        </Button>
      </div>
    </Modal>
  );
}
