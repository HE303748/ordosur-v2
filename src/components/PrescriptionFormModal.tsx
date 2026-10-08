import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Calendar, History, AlertTriangle, RefreshCw } from 'lucide-react';
import { formHasContent, type DraftForm } from '../lib/ordonnanceDraft';
import { medLabel, dosageManquant, linesMissingDosage, hasDosage } from '../lib/medLabel';
import { type Medicament } from '../lib/supabase';
import { searchMedicamentsMA } from '../lib/medSearch';
import {
  computeVerification,
  type VerifMedicament, type VerifSelectedMed, type UncheckedLine as VerifUncheckedLine,
} from '../lib/ordonnanceVerification';
import {
  linesMissingPosologie, deduceForme, computeQuantite, lastPosologieFor, medKey,
  type PastLine,
} from '../lib/posologie';
import { fetchPastLines } from '../lib/lastPosologie';
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
  // Sprint 4d-bis — forme galénique connue (base) : sert à déduire l'unité de prise.
  formeHint?: string | null;
  // Sprint 4d-quater — le dosage n'existe nulle part dans la fiche : « Dosage à préciser »
  // (obligatoire avant l'aperçu). Saisi à part pour ne pas délier la ligne de l'analyse.
  dosageAPreciser?: boolean;
  dosagePrecise?: string;
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
  initialMedications: Array<{ id: string; nom: string; posologie?: string | null; formeHint?: string | null; dosageAPreciser?: boolean }>;
  /** Sprint 4d-bis — médecin connecté (doctors.id) : suggestion « Dernière posologie utilisée ». */
  doctorId?: string | null;
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
  /**
   * Sprint 4d — alertes de niveau maximal (CI absolue / interaction majeure) de l'analyse
   * en cours : bandeau rouge persistant. La confirmation motivée est demandée à
   * l'enregistrement, à l'impression et au PDF.
   */
  contraindicationAlerts?: string[];
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
      const rows = await searchMedicamentsMA(q, 10);
      if (s !== seq.current) return;
      setResults(rows);
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
        onKeyDown={(e) => {
          // Sprint 4d-quater — Échap ferme UNIQUEMENT la liste de suggestions (l'élément le
          // plus haut) : l'événement ne remonte ni au formulaire ni au tableau de bord.
          if (e.key === 'Escape' && show) {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            setOpen(false);
          }
        }}
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
                {medLabel(m)}
              </p>
              <p className="text-xs text-slate-500">{[m.dci, m.laboratoire].filter(Boolean).join(' · ')}</p>
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

// Sprint 4d-bis — AUCUNE posologie inventée : le champ est vide et obligatoire. La quantité
// n'est calculée que si la forme, le rythme et la durée sont connus (lib/posologie).

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
  contraindicationAlerts = [],
  doctorId = null,
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
        // Seule donnée réelle reprise ici : la posologie du traitement de fond (Renouveler).
        return {
          id,
          nom: med.nom,
          posologie: med.posologie?.trim() || '',
          duree: '',
          quantite: '',
          formeHint: med.formeHint ?? null,
          dosageAPreciser: !!med.dosageAPreciser,
          dosagePrecise: '',
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
          // Quantité recalculée seulement si elle est calculable (forme + rythme + durée connus).
          const q = computeQuantite(updated.posologie, updated.duree, deduceForme(updated.nom, updated.formeHint));
          if (q) updated.quantite = q;
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
      posologie: '',
      duree: '',
      quantite: '',
      addedInForm: true
    }]);
  };

  const handleRemoveMedication = (id: string) => {
    setMedications(prev => prev.filter(med => med.id !== id));
  };

  const handlePickMedicament = (id: string, m: Medicament) => {
    setMedications(prev => prev.map(med => med.id === id ? {
      ...med,
      // Sprint 4d-quater — libellé complet : marque + dosage + forme (jamais « BRUFEN » seul).
      nom: medLabel(m),
      dosageAPreciser: dosageManquant(m),
      dosagePrecise: '',
      medicament: { id: m.id, nom: m.nom, nom_commercial: m.nom_commercial ?? null, dci: m.dci ?? null, dci_canonique: m.dci_canonique ?? null },
      horsBase: false,
      formeHint: `${m.forme ?? ''} ${m.nom ?? ''}`.trim() || null,
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
  // Sprint 4d-bis — posologie obligatoire sur chaque ligne (jamais de valeur par défaut).
  const missingPosologieIds = new Set(linesMissingPosologie(medications).map(l => l.id));
  // Sprint 4d-quater — dosage absent de la fiche : à préciser avant l'aperçu.
  const missingDosageIds = new Set(linesMissingDosage(medications).map(l => l.id));
  const canPreview =
    verification.status === 'verified' && medications.length > 0 && !medications.some(m => !m.nom.trim())
    && missingPosologieIds.size === 0 && missingDosageIds.size === 0;

  // Sprint 4d-quater — fermer un formulaire non vide (croix, clic extérieur, Échap, Annuler)
  // demande confirmation ; il n'est jamais fermé sans que le médecin l'ait décidé.
  const [confirmClose, setConfirmClose] = useState(false);
  const hasContent = formHasContent({ motif, medications, remarks, appointmentDate, appointmentTime });
  const requestClose = () => { if (hasContent) setConfirmClose(true); else onClose(); };
  useEffect(() => { if (!isOpen) setConfirmClose(false); }, [isOpen]);

  // Sprint 4d-bis — « Dernière posologie utilisée » par ce médecin pour ces médicaments.
  const [pastLines, setPastLines] = useState<PastLine[]>([]);
  const namesKey = [...new Set(medications.map(m => medKey(m.nom)).filter(Boolean))].sort().join('|');
  const pastSeq = useRef(0);
  useEffect(() => {
    if (!isOpen || !doctorId || !namesKey) return;
    const seq = ++pastSeq.current;
    const t = window.setTimeout(async () => {
      const rows = await fetchPastLines(doctorId, medications.map(m => m.nom));
      if (seq === pastSeq.current) setPastLines(rows);
    }, 300);
    return () => window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, doctorId, namesKey]);

  const applySuggestion = (id: string, posologie: string, duree: string) => {
    setMedications(prev => prev.map(med => {
      if (med.id !== id) return med;
      const next = { ...med, posologie, duree: med.duree.trim() ? med.duree : duree };
      const q = computeQuantite(next.posologie, next.duree, deduceForme(next.nom, next.formeHint));
      return q ? { ...next, quantite: q } : next;
    }));
  };

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
    <Modal isOpen={isOpen} onClose={requestClose} title="Créer une Ordonnance" size="xl">
      <div
        className="space-y-6"
        onKeyDown={(e) => {
          // Échap dans le formulaire : demande de confirmation, jamais de fermeture directe.
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            if (confirmClose) setConfirmClose(false); else requestClose();
          }
        }}
      >
        {confirmClose && (
          <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4" role="alertdialog" aria-modal="true" aria-labelledby="abandon-title">
            <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmClose(false)} />
            <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-5">
              <h3 id="abandon-title" className="text-base font-bold text-[#0A1628]">Abandonner cette ordonnance ?</h3>
              <p className="text-sm text-slate-600 mt-1.5">
                La saisie en cours ({medications.filter(m => m.nom.trim()).length} médicament{medications.filter(m => m.nom.trim()).length > 1 ? 's' : ''}) sera supprimée.
                Le patient et l’analyse restent en place.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <button type="button" autoFocus onClick={() => setConfirmClose(false)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#00A86B] hover:bg-[#006B47] transition-colors">
                  Continuer la saisie
                </button>
                <button type="button" onClick={() => { setConfirmClose(false); onClose(); }}
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-[#0A1628] border border-slate-200 hover:bg-slate-50 transition-colors">
                  Fermer et garder le brouillon
                </button>
                <button type="button" onClick={() => { setConfirmClose(false); (onCancel ?? onClose)(); }}
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-[#DC2626] border border-[#DC2626]/40 hover:bg-[#DC2626]/[0.06] transition-colors">
                  Abandonner
                </button>
              </div>
            </div>
          </div>
        )}
        {contraindicationAlerts.length > 0 && (
          <div role="alert" className="px-4 py-3 rounded-xl bg-[#DC2626]/[0.06] border border-[#DC2626]/40 border-l-4 border-l-[#DC2626]">
            <p className="flex items-center gap-2 text-sm font-bold text-[#0A1628]">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#DC2626]" aria-hidden />
              Cette ordonnance contient {contraindicationAlerts.length} contre-indication{contraindicationAlerts.length > 1 ? 's' : ''}
            </p>
            <ul className="mt-1.5 ml-6 list-disc space-y-0.5 text-sm text-[#0A1628] marker:text-[#DC2626]">
              {contraindicationAlerts.map((l, i) => <li key={i} className="break-words">{l}</li>)}
            </ul>
            <p className="mt-1.5 ml-6 text-xs text-slate-700">
              Une confirmation motivée vous sera demandée à l’enregistrement, à l’impression et au PDF.
            </p>
          </div>
        )}
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
                {med.dosageAPreciser && !hasDosage(med.nom) && (
                  <div className="mt-2">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
                      Dosage à préciser <span className="text-[#DC2626]" aria-hidden>*</span>
                      <span className="font-normal text-slate-500">— absent de la fiche du médicament</span>
                    </label>
                    <Input
                      value={med.dosagePrecise ?? ''}
                      onChange={(e) => setMedications(prev => prev.map(x => x.id === med.id ? { ...x, dosagePrecise: e.target.value } : x))}
                      placeholder="Ex : 300 mg"
                      aria-required
                      aria-invalid={missingDosageIds.has(med.id)}
                    />
                    {missingDosageIds.has(med.id) && (
                      <p role="alert" className="text-xs font-medium text-[#DC2626] mt-1">Dosage obligatoire avant l’aperçu.</p>
                    )}
                  </div>
                )}
                {uncheckedIds.has(med.id) && med.medicament && (
                  <p className="text-xs text-slate-500 mt-1">
                    {[med.medicament.dci, 'relié à la base — à vérifier'].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Posologie <span className="text-[#DC2626]" aria-hidden>*</span>
                </label>
                <Input
                  value={med.posologie}
                  onChange={(e) => handleMedicationChange(med.id, 'posologie', e.target.value)}
                  placeholder={(() => {
                    const u = deduceForme(med.nom, med.formeHint);
                    return u ? `Ex : 1 ${u.singulier} … fois par jour` : 'Dose, rythme et moment de prise';
                  })()}
                  aria-required
                  aria-invalid={missingPosologieIds.has(med.id)}
                />
                {missingPosologieIds.has(med.id) && (
                  <p role="alert" className="text-xs font-medium text-[#DC2626] mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" aria-hidden />
                    Posologie obligatoire — aucune valeur n’est pré-remplie.
                  </p>
                )}
                {(() => {
                  const sug = lastPosologieFor(med.nom, pastLines);
                  if (!sug || sug.posologie === med.posologie.trim()) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => applySuggestion(med.id, sug.posologie, sug.duree)}
                      className="mt-1.5 inline-flex items-start gap-1.5 text-left text-xs text-[#006B47] bg-[#E6F4EE] border border-[#00A86B]/25 rounded-lg px-2.5 py-1.5 hover:bg-[#d7efe3] transition-colors"
                    >
                      <History className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden />
                      <span>
                        <span className="font-semibold">Dernière posologie utilisée :</span> {sug.posologie}
                        {sug.duree && ` · ${sug.duree}`}
                        {sug.date && ` (${new Date(sug.date).toLocaleDateString('fr-FR')})`}
                        <span className="underline underline-offset-2 ml-1">Utiliser</span>
                      </span>
                    </button>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Durée
                  </label>
                  <Input
                    value={med.duree}
                    onChange={(e) => handleMedicationChange(med.id, 'duree', e.target.value)}
                    placeholder="Ex: 7 jours"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Quantité
                  </label>
                  <Input
                    value={med.quantite}
                    onChange={(e) => handleMedicationChange(med.id, 'quantite', e.target.value)}
                    placeholder="Facultatif"
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
          {verification.status === 'verified' && missingPosologieIds.size === 0 && missingDosageIds.size > 0 && (
            <p role="alert" className="text-xs font-medium text-[#DC2626] sm:mr-auto sm:self-center">
              Aperçu indisponible : dosage à préciser sur {missingDosageIds.size} ligne{missingDosageIds.size > 1 ? 's' : ''}.
            </p>
          )}
          {verification.status === 'verified' && missingPosologieIds.size > 0 && (
            <p role="alert" className="text-xs font-medium text-[#DC2626] sm:mr-auto sm:self-center">
              Aperçu indisponible : posologie manquante sur {missingPosologieIds.size} ligne{missingPosologieIds.size > 1 ? 's' : ''}.
            </p>
          )}
          {!canPreview && verification.status !== 'verified' && (
            <p className="text-xs text-amber-800 sm:mr-auto sm:self-center">
              {verification.status === 'stale'
                ? 'Aperçu indisponible : vérification à relancer.'
                : 'Aperçu indisponible : confirmation requise.'}
            </p>
          )}
          <Button onClick={requestClose} variant="secondary">
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
