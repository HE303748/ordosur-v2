// Sprint 3b — État de vérification d'une ordonnance : aucune ordonnance enregistrée,
// imprimée ou téléchargée sans que chacune de ses lignes ait été analysée par le moteur.
//
// Source unique partagée par le formulaire (boutons désactivés), l'aperçu et
// handleSaveOrdonnance (garde-fou final).

export interface VerifMedicament {
  id: string;
  nom: string;
  nom_commercial?: string | null;
  dci?: string | null;
  dci_canonique?: string | null;
}

export interface VerifLine {
  id: string;             // `chk-<id Vérificateur>` si la ligne vient du Vérificateur
  nom: string;
  addedInForm?: boolean;
  medicament?: VerifMedicament | null; // choisi via search_medicaments dans le formulaire
  horsBase?: boolean;                  // « Utiliser tel quel » (saisie libre)
}

export interface VerifSelectedMed {
  id: string;
  nom: string;
  manual?: boolean;
}

export interface UncheckedLine<L extends VerifLine = VerifLine> {
  line: L;
  /** Ligne issue du Vérificateur dont le nom a été modifié : id du médicament d'origine. */
  replacesCheckerId?: string;
}

export type VerificationStatus = 'stale' | 'needs_confirmation' | 'verified';

export interface VerificationState<L extends VerifLine = VerifLine> {
  status: VerificationStatus;
  /** Lignes ajoutées ou renommées dans le formulaire depuis l'analyse. */
  unchecked: UncheckedLine<L>[];
  /** Médicaments analysés retirés de l'ordonnance depuis l'analyse. */
  removedIds: string[];
  /** Analyse absente ou antérieure à une modification de la sélection du Vérificateur. */
  analysisMissing: boolean;
  /** Lignes vérifiées mais hors base (jamais vérifiables par le moteur). */
  horsBase: L[];
  /** Clé de la confirmation « hors base » : change dès que la liste change. */
  horsBaseKey: string;
}

const normName = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function computeVerification<L extends VerifLine>(
  lines: L[],
  selectedMeds: VerifSelectedMed[],
  analysisValid: boolean,
  horsBaseConfirmedKey: string | null,
): VerificationState<L> {
  const selById = new Map(selectedMeds.map(m => [m.id, m]));
  const unchecked: UncheckedLine<L>[] = [];
  const linked = new Set<string>();
  const horsBase: L[] = [];

  for (const line of lines) {
    if (!line.nom.trim()) continue; // ligne vide : « Aperçu » déjà désactivé
    const medId = line.id.startsWith('chk-') ? line.id.slice(4) : null;
    const sel = medId ? selById.get(medId) : undefined;
    if (!sel || line.addedInForm) { unchecked.push({ line }); continue; }
    if (sel.nom.trim() !== line.nom.trim()) { unchecked.push({ line, replacesCheckerId: medId! }); continue; }
    linked.add(sel.id);
    if (sel.manual) horsBase.push(line);
  }

  const removedIds = selectedMeds.filter(m => !linked.has(m.id)
    // une ligne renommée « remplace » son médicament d'origine : déjà comptée dans unchecked
    && !unchecked.some(u => u.replacesCheckerId === m.id)).map(m => m.id);

  const horsBaseKey = horsBase.map(l => normName(l.nom)).sort().join('|');
  const stale = !analysisValid || unchecked.length > 0 || removedIds.length > 0;
  const status: VerificationStatus = stale
    ? 'stale'
    : horsBase.length > 0 && horsBaseConfirmedKey !== horsBaseKey
      ? 'needs_confirmation'
      : 'verified';

  return { status, unchecked, removedIds, analysisMissing: !analysisValid, horsBase, horsBaseKey };
}

/** Message utilisateur expliquant pourquoi l'ordonnance ne peut pas être enregistrée. */
export function verificationBlockMessage(state: VerificationState): string | null {
  if (state.status === 'verified') return null;
  if (state.status === 'needs_confirmation') {
    const n = state.horsBase.length;
    return `Confirmez la prescription de ${n} médicament${n > 1 ? 's' : ''} non vérifiable${n > 1 ? 's' : ''} par le moteur avant d'enregistrer.`;
  }
  return "Vérification périmée : l'ordonnance a été modifiée depuis l'analyse. Relancez la vérification avant d'enregistrer.";
}
