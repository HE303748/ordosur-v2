import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Calendar, History, AlertTriangle, RefreshCw } from 'lucide-react';
import type { DraftForm } from '../lib/ordonnanceDraft';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';

export interface MedicationForm {
  id: string;
  nom: string;
  posologie: string;
  duree: string;
  quantite: string;
  addedInForm?: boolean;
}

interface PrescriptionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Bouton « Annuler » explicite (abandon de l'ordonnance). Par défaut : onClose. */
  onCancel?: () => void;
  patient: {
    prenom: string;
    nom: string;
  };
  // Sprint 3 — posologie : reprise du traitement de fond lors d'un « Renouveler ».
  initialMedications: Array<{ id: string; nom: string; posologie?: string | null }>;
  /** État du formulaire à reprendre à l'ouverture (brouillon ou saisie précédente). */
  initialForm?: DraftForm | null;
  onFormChange?: (form: DraftForm) => void;
  /** Bandeau « Brouillon restauré » + action « Repartir de zéro ». */
  restored?: boolean;
  onDiscardDraft?: () => void;
  /**
   * Sprint 3 — lignes arrivées sur l'ordonnance sans passer par le moteur (ajoutées ou
   * renommées dans ce formulaire). Le parent les renvoie au Vérificateur pour analyse.
   */
  onVerifyUnchecked?: (lines: UncheckedLine[]) => void;
  onPreview: (data: {
    motif: string;
    medications: MedicationForm[];
    remarks: string;
    nextAppointment?: string;
  }) => void;
}

export interface UncheckedLine {
  line: MedicationForm;
  /** Ligne issue du Vérificateur dont le nom a été modifié : id du médicament d'origine. */
  replacesCheckerId?: string;
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
  onCancel,
  patient,
  initialMedications = [],
  initialForm = null,
  onFormChange,
  restored = false,
  onDiscardDraft,
  onVerifyUnchecked,
  onPreview
}: PrescriptionFormModalProps) {
  const [motif, setMotif] = useState('');
  const [medications, setMedications] = useState<MedicationForm[]>([]);
  const [remarks, setRemarks] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');

  // Initialisation à l'OUVERTURE uniquement (auparavant à chaque rendu du parent, ce qui
  // écrasait les posologies saisies). Les lignes suivent la sélection du Vérificateur ;
  // les valeurs déjà saisies (initialForm) sont conservées pour ces mêmes médicaments.
  const wasOpenRef = useRef(false);
  const initializedRef = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const previous = new Map((initialForm?.medications ?? []).map(m => [m.id, m]));
      const fromChecker = initialMedications.map(med => {
        const id = `chk-${med.id}`;
        const kept = previous.get(id);
        if (kept) return kept;
        const suggestion = getDosageSuggestion(med.nom);
        return {
          id,
          nom: med.nom,
          posologie: med.posologie?.trim() || suggestion.posologie,
          duree: suggestion.duree,
          quantite: calculateQuantity(suggestion.posologie, suggestion.duree)
        };
      });
      const addedInForm = (initialForm?.medications ?? []).filter(m => m.addedInForm);
      setMedications([...fromChecker, ...addedInForm]);
      if (initialForm) {
        setMotif(initialForm.motif);
        setRemarks(initialForm.remarks);
        setAppointmentDate(initialForm.appointmentDate);
        setAppointmentTime(initialForm.appointmentTime);
      }
      initializedRef.current = true;
    }
    wasOpenRef.current = isOpen;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Remonte chaque modification au parent (sauvegarde du brouillon, debounce côté parent).
  useEffect(() => {
    if (!isOpen || !initializedRef.current) return;
    onFormChange?.({ motif, medications, remarks, appointmentDate, appointmentTime });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motif, medications, remarks, appointmentDate, appointmentTime]);

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
      quantite: '14 comprimés',
      addedInForm: true
    }]);
  };

  const handleRemoveMedication = (id: string) => {
    setMedications(prev => prev.filter(med => med.id !== id));
  };

  // Sprint 3 — Lignes non vérifiées par le moteur :
  //  • ajoutées dans ce formulaire (addedInForm) ;
  //  • issues du Vérificateur mais renommées ici (le nom analysé n'est plus celui prescrit).
  const checkerNames = new Map(initialMedications.map(m => [`chk-${m.id}`, m.nom]));
  const uncheckedLines: UncheckedLine[] = medications.flatMap((m): UncheckedLine[] => {
    if (!m.nom.trim()) return [];
    if (m.addedInForm) return [{ line: m }];
    const original = checkerNames.get(m.id);
    if (original !== undefined && original.trim() !== m.nom.trim()) {
      return [{ line: m, replacesCheckerId: m.id.slice(4) }];
    }
    return [];
  });
  const uncheckedIds = new Set(uncheckedLines.map(u => u.line.id));

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
        {restored && (
          <div
            role="status"
            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3 rounded-xl bg-[#E6F4EE] border border-[#00A86B]/20"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <History className="w-4 h-4 text-[#00A86B] flex-shrink-0" aria-hidden />
              <p className="text-sm text-[#0A1628]">
                <span className="font-semibold">Brouillon restauré.</span>{' '}
                <span className="text-slate-600">L'analyse des interactions a été relancée.</span>
              </p>
            </div>
            {onDiscardDraft && (
              <button
                type="button"
                onClick={onDiscardDraft}
                className="self-start sm:self-auto text-sm font-semibold text-[#006B47] hover:text-[#0A1628] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B] rounded"
              >
                Repartir de zéro
              </button>
            )}
          </div>
        )}

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

          {/* Sprint 3 — médicaments arrivés sur l'ordonnance sans analyse du moteur */}
          {uncheckedLines.length > 0 && (
            <div
              role="status"
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200"
            >
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden />
                <p className="text-sm text-amber-900">
                  <span className="font-semibold">
                    {uncheckedLines.length} médicament{uncheckedLines.length > 1 ? 's' : ''} ajouté{uncheckedLines.length > 1 ? 's' : ''} sans analyse
                  </span>
                  <span className="text-amber-800"> — interactions et contre-indications non vérifiées.</span>
                </p>
              </div>
              {onVerifyUnchecked && (
                <button
                  type="button"
                  onClick={() => onVerifyUnchecked(uncheckedLines)}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-amber-300 text-sm font-semibold text-amber-900 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition-colors whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden />
                  Relancer la vérification
                </button>
              )}
            </div>
          )}

          {medications.map((med, idx) => (
            <div key={med.id} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                  Médicament {idx + 1}
                  {uncheckedIds.has(med.id) && (
                    <span
                      title="Ce médicament n'a pas été analysé par le moteur d'interactions"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5"
                    >
                      <AlertTriangle className="w-3 h-3" aria-hidden /> Non vérifié
                    </span>
                  )}
                </h4>
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
          <Button onClick={onCancel ?? onClose} variant="secondary">
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
