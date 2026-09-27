import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Calendar, History, AlertTriangle, RefreshCw } from 'lucide-react';
import type { DraftForm } from '../lib/ordonnanceDraft';
import { supabase, type Medicament } from '../lib/supabase';
import {
  computeVerification,
  type VerifMedicament, type VerifSelectedMed, type UncheckedLine as VerifUncheckedLine,
} from '../lib/ordonnanceVerification';
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
  // Sprint 3b — médicament choisi via search_medicaments dans le formulaire
  medicament?: VerifMedicament | null;
  // Sprint 3b — « Utiliser tel quel » : saisie libre, hors base, jamais vérifiable
  horsBase?: boolean;
}

export type UncheckedLine = VerifUncheckedLine<MedicationForm>;

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
   * renommées dans ce formulaire) et médicaments analysés retirés de l'ordonnance.
   * Le parent les renvoie au Vérificateur pour une nouvelle analyse.
   */
  onVerifyUnchecked?: (lines: UncheckedLine[], removedIds: string[]) => void;
  // Sprint 3b — état de vérification (voir lib/ordonnanceVerification)
  selectedMeds: VerifSelectedMed[];
  /** Une analyse a été faite sur la sélection actuelle du Vérificateur. */
  analysisValid: boolean;
  horsBaseConfirmedKey: string | null;
  onConfirmHorsBase: (key: string | null) => void;
  onPreview: (data: {
    motif: string;
    medications: MedicationForm[];
    remarks: string;
    nextAppointment?: string;
  }) => void;
}

const horsBaseBadge = (
  <span
    title="Saisie libre : ce médicament ne peut pas être analysé par le moteur"
    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5"
  >
    <AlertTriangle className="w-3 h-3" aria-hidden /> Hors base — non vérifiable
  </span>
);

/**
 * Sprint 3b — Nom du médicament relié à la base : autocomplete search_medicaments
 * (🇲🇦 d'abord), ou « Utiliser tel quel » (hors base). La liste ne s'ouvre qu'après
 * une frappe : une ligne venue du Vérificateur non modifiée reste sans friction.
 */
function MedNameField({ value, onChange, onPick, onUseAsIs }: {
  value: string;
  onChange: (v: string) => void;
  onPick: (m: Medicament) => void;
  onUseAsIs: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [results, setResults] = useState<Medicament[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (!open || !dirty) return;
    const q = value.trim();
    if (q.length < 2) { setResults([]); setLoading(false); return; }
    const s = ++seq.current;
    setLoading(true);
    const t = window.setTimeout(async () => {
      const { data } = await supabase.rpc('search_medicaments', { search_term: q, limit_count: 10 });
      if (s !== seq.current) return;
      setResults((data as Medicament[]) || []);
      setLoading(false);
    }, 250);
    return () => window.clearTimeout(t);
  }, [value, open, dirty]);

  const show = open && dirty && value.trim().length >= 2;

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => { setDirty(true); setOpen(true); onChange(e.target.value); }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 200)}
        placeholder="Rechercher un médicament (ex : Brufen, Glucophage…)"
        autoComplete="off"
      />
      {show && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 overflow-y-auto">
          {loading && <p className="px-4 py-3 text-sm text-slate-400 text-center">Recherche…</p>}
          {!loading && results.map(m => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onPick(m); setDirty(false); setOpen(false); }}
              className="w-full px-4 py-2.5 text-left hover:bg-[#E6F4EE] border-b border-slate-50 last:border-b-0 transition-colors"
            >
              <p className="text-sm font-semibold text-slate-900">
                {m.pays === 'MA' && <span className="mr-1" aria-label="Maroc">🇲🇦</span>}
                {m.nom_commercial || m.nom}
              </p>
              <p className="text-xs text-slate-500">{[m.dci, m.dosage, m.forme].filter(Boolean).join(' · ')}</p>
            </button>
          ))}
          {!loading && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onUseAsIs(); setDirty(false); setOpen(false); }}
              className="w-full px-4 py-2.5 text-left hover:bg-amber-50 transition-colors"
            >
              <span className="text-sm text-slate-700">
                {results.length === 0 ? 'Introuvable — ' : ''}Utiliser tel quel : <span className="font-semibold">« {value.trim()} »</span>
              </span>
              <span className="block text-[11px] text-amber-700 mt-0.5">Hors base — ne pourra pas être vérifié par le moteur</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
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
  selectedMeds,
  analysisValid,
  horsBaseConfirmedKey,
  onConfirmHorsBase,
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
        // Sprint 3b — toute frappe sur le nom délie la ligne de la base : elle devra être
        // re-sélectionnée (ou « Utiliser tel quel ») puis re-vérifiée.
        if (field === 'nom') { updated.medicament = null; updated.horsBase = false; }
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

  const handlePickMedicament = (id: string, m: Medicament) => {
    setMedications(prev => prev.map(med => med.id === id ? {
      ...med,
      nom: m.nom_commercial || m.nom,
      medicament: { id: m.id, nom: m.nom, nom_commercial: m.nom_commercial ?? null, dci: m.dci ?? null, dci_canonique: m.dci_canonique ?? null },
      horsBase: false,
    } : med));
  };

  const handleUseAsIs = (id: string) => {
    setMedications(prev => prev.map(med => med.id === id ? { ...med, medicament: null, horsBase: true } : med));
  };

  // Sprint 3b — état de vérification (source unique, partagée avec l'aperçu et l'enregistrement)
  const verification = computeVerification(medications, selectedMeds, analysisValid, horsBaseConfirmedKey);
  const uncheckedLines = verification.unchecked;
  const uncheckedIds = new Set(uncheckedLines.map(u => u.line.id));
  const horsBaseIds = new Set(verification.horsBase.map(l => l.id));
  const nbHorsBase = verification.horsBase.length;
  const canPreview =
    verification.status === 'verified' && medications.length > 0 && !medications.some(m => !m.nom.trim());

  const handlePreview = () => {
    if (!canPreview) return;
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

          {/* Sprint 3 / 3b — vérification périmée : ajout, renommage, suppression de ligne
              ou analyse antérieure à la sélection actuelle. Aperçu bloqué. */}
          {verification.status === 'stale' && (
            <div
              role="status"
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200"
            >
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden />
                <p className="text-sm text-amber-900">
                  <span className="font-semibold">
                    {uncheckedLines.length > 0
                      ? `${uncheckedLines.length} médicament${uncheckedLines.length > 1 ? 's' : ''} ajouté${uncheckedLines.length > 1 ? 's' : ''} ou modifié${uncheckedLines.length > 1 ? 's' : ''} sans analyse`
                      : verification.removedIds.length > 0
                        ? 'Ordonnance modifiée depuis l\u2019analyse'
                        : 'Vérification périmée'}
                  </span>
                  <span className="text-amber-800"> — relancez la vérification pour pouvoir enregistrer.</span>
                </p>
              </div>
              {onVerifyUnchecked && (
                <button
                  type="button"
                  onClick={() => onVerifyUnchecked(uncheckedLines, verification.removedIds)}
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
                  {(horsBaseIds.has(med.id) || (uncheckedIds.has(med.id) && med.horsBase)) && horsBaseBadge}
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
                <MedNameField
                  value={med.nom}
                  onChange={(v) => handleMedicationChange(med.id, 'nom', v)}
                  onPick={(m) => handlePickMedicament(med.id, m)}
                  onUseAsIs={() => handleUseAsIs(med.id)}
                />
                {uncheckedIds.has(med.id) && med.medicament && (
                  <p className="text-xs text-slate-500 mt-1">
                    {[med.medicament.dci, 'relié à la base — à vérifier'].filter(Boolean).join(' · ')}
                  </p>
                )}
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

        {/* Sprint 3b — lignes hors base : jamais vérifiables → confirmation explicite, journalisée */}
        {verification.status !== 'stale' && nbHorsBase > 0 && (
          <label className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 cursor-pointer">
            <input
              type="checkbox"
              checked={horsBaseConfirmedKey === verification.horsBaseKey}
              onChange={(e) => onConfirmHorsBase(e.target.checked ? verification.horsBaseKey : null)}
              className="mt-0.5 w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 flex-shrink-0"
            />
            <span className="text-sm text-amber-900">
              <span className="font-semibold">
                Je confirme la prescription de {nbHorsBase} médicament{nbHorsBase > 1 ? 's' : ''} non vérifiable{nbHorsBase > 1 ? 's' : ''} par le moteur
              </span>
              <span className="block text-xs text-amber-800 mt-0.5">
                {verification.horsBase.map(l => l.nom.trim()).join(', ')} — interactions et contre-indications non contrôlées.
              </span>
            </span>
          </label>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-200">
          {!canPreview && verification.status !== 'verified' && (
            <p className="text-xs text-amber-800 sm:mr-auto sm:self-center">
              {verification.status === 'stale'
                ? 'Aperçu indisponible : vérification à relancer.'
                : 'Aperçu indisponible : confirmation requise.'}
            </p>
          )}
          <Button onClick={onCancel ?? onClose} variant="secondary">
            Annuler
          </Button>
          <Button
            onClick={handlePreview}
            variant="primary"
            disabled={!canPreview}
          >
            Aperçu de l'ordonnance
          </Button>
        </div>
      </div>
    </Modal>
  );
}
