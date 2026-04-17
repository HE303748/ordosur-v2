import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';

interface MedicationForm {
  id: string;
  nom: string;
  posologie: string;
  duree: string;
  quantite: string;
}

interface PrescriptionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: {
    prenom: string;
    nom: string;
  };
  initialMedications: Array<{ nom: string }>;
  onPreview: (data: {
    motif: string;
    medications: MedicationForm[];
    remarks: string;
    nextAppointment?: string;
  }) => void;
}

const getDosageSuggestion = (medName: string): { posologie: string; duree: string } => {
  const name = medName.toLowerCase();

  if (name.includes('doliprane') || name.includes('paracetamol')) {
    return { posologie: '1 comprimé 3 fois par jour', duree: '7 jours' };
  }
  if (name.includes('ibuprofène') || name.includes('ibuprofen')) {
    return { posologie: '1 comprimé 2 fois par jour', duree: '5 jours' };
  }
  if (name.includes('amoxicilline')) {
    return { posologie: '1 comprimé matin et soir', duree: '7 jours' };
  }
  if (name.includes('metformine')) {
    return { posologie: '1 comprimé 2 fois par jour', duree: '30 jours' };
  }
  if (name.includes('aspirine')) {
    return { posologie: '1 comprimé par jour', duree: '30 jours' };
  }

  return { posologie: '1 comprimé 2 fois par jour', duree: '7 jours' };
};

const calculateQuantity = (posologie: string, duree: string): string => {
  const daysMatch = duree.match(/(\d+)\s*jour/);
  const days = daysMatch ? parseInt(daysMatch[1]) : 7;

  const timesMatch = posologie.match(/(\d+)\s*fois/);
  const timesPerDay = timesMatch ? parseInt(timesMatch[1]) : 2;

  const total = days * timesPerDay;
  return `${total} comprimés`;
};

export function PrescriptionFormModal({
  isOpen,
  onClose,
  patient,
  initialMedications = [],
  onPreview
}: PrescriptionFormModalProps) {
  const [motif, setMotif] = useState('');
  const [medications, setMedications] = useState<MedicationForm[]>([]);
  const [remarks, setRemarks] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');

  useEffect(() => {
    if (isOpen && initialMedications?.length > 0) {
      const meds = initialMedications.map((med, idx) => {
        const suggestion = getDosageSuggestion(med.nom);
        return {
          id: `med-${idx}`,
          nom: med.nom,
          posologie: suggestion.posologie,
          duree: suggestion.duree,
          quantite: calculateQuantity(suggestion.posologie, suggestion.duree)
        };
      });
      setMedications(meds);
    }
  }, [isOpen, initialMedications]);

  const handleMedicationChange = (id: string, field: keyof MedicationForm, value: string) => {
    setMedications(prev => prev.map(med => {
      if (med.id === id) {
        const updated = { ...med, [field]: value };
        if (field === 'posologie' || field === 'duree') {
          updated.quantite = calculateQuantity(updated.posologie, updated.duree);
        }
        return updated;
      }
      return med;
    }));
  };

  const handleAddMedication = () => {
    setMedications(prev => [...prev, {
      id: `med-${Date.now()}`,
      nom: '',
      posologie: '1 comprimé 2 fois par jour',
      duree: '7 jours',
      quantite: '14 comprimés'
    }]);
  };

  const handleRemoveMedication = (id: string) => {
    setMedications(prev => prev.filter(med => med.id !== id));
  };

  const handlePreview = () => {
    const nextAppointment = appointmentDate && appointmentTime
      ? `${appointmentDate} à ${appointmentTime}`
      : undefined;

    onPreview({
      motif,
      medications,
      remarks,
      nextAppointment
    });
  };

  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Créer une Ordonnance" size="xl">
      <div className="space-y-6">
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">Patient</label>
              <p className="text-slate-900 font-medium">{patient.prenom} {patient.nom}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Date</label>
              <p className="text-slate-900 font-medium">{today}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Motif de consultation
          </label>
          <Input
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex: Hypertension artérielle, contrôle de routine..."
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-lg">Médicaments</h3>
            <Button onClick={handleAddMedication} variant="secondary" className="text-sm">
              <Plus className="w-4 h-4 mr-1" />
              Ajouter un médicament
            </Button>
          </div>

          {medications.map((med, idx) => (
            <div key={med.id} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <h4 className="font-semibold text-slate-900">Médicament {idx + 1}</h4>
                {medications.length > 1 && (
                  <button
                    onClick={() => handleRemoveMedication(med.id)}
                    className="text-danger-600 hover:text-danger-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nom du médicament
                </label>
                <Input
                  value={med.nom}
                  onChange={(e) => handleMedicationChange(med.id, 'nom', e.target.value)}
                  placeholder="Ex: Doliprane 1g"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Posologie suggérée
                </label>
                <Input
                  value={med.posologie}
                  onChange={(e) => handleMedicationChange(med.id, 'posologie', e.target.value)}
                  placeholder="Ex: 1 comprimé 3 fois par jour"
                />
                <p className="text-xs text-slate-500 mt-1">Modifiable par le médecin</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Durée suggérée
                  </label>
                  <Input
                    value={med.duree}
                    onChange={(e) => handleMedicationChange(med.id, 'duree', e.target.value)}
                    placeholder="Ex: 7 jours"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Quantité (calculée)
                  </label>
                  <Input
                    value={med.quantite}
                    onChange={(e) => handleMedicationChange(med.id, 'quantite', e.target.value)}
                    placeholder="Ex: 21 comprimés"
                  />
                </div>
              </div>
            </div>
          ))}

          {medications.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p>Aucun médicament ajouté</p>
              <Button onClick={handleAddMedication} variant="primary" className="mt-3">
                <Plus className="w-4 h-4 mr-1" />
                Ajouter un médicament
              </Button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Commentaires du médecin
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Écrivez vos commentaires médicaux ici..."
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            rows={4}
          />
          <p className="text-xs text-slate-500 mt-1">Zone de texte libre pour vos remarques</p>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Prochain rendez-vous (optionnel)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Date</label>
              <Input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Heure</label>
              <Input
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
          <Button onClick={onClose} variant="secondary">
            Annuler
          </Button>
          <Button
            onClick={handlePreview}
            variant="primary"
            disabled={medications.length === 0 || medications.some(m => !m.nom)}
          >
            Aperçu de l'ordonnance
          </Button>
        </div>
      </div>
    </Modal>
  );
}
