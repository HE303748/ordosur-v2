import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Patient } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDataSync } from '../lib/dataSync';
import { viewCache } from '../lib/viewCache';
import { loadConfreres, loadPatientLettres, type Confrere, type LettreAdressage } from '../lib/adressageApi';
import { loadAntecedents, formatDetails, type Antecedent } from '../lib/antecedents';
import { loadTraitements, fondDisplayName, type TraitementChronique } from '../lib/traitementsChroniques';
import { medLabel } from '../lib/medLabel';
import { loadPatientResultats } from '../lib/resultatsApi';
import { loadExamRefs, loadPatientDemandes } from '../lib/examensApi';
import type { ExamRef } from '../lib/examSearch';
import { formatFr, isOpen, type DemandeExamens } from '../lib/examRequest';
import { buildRecap, buildSeries, derniersBilans, qualitatifLabel, valeurAffichee, type RecapGroup, type ResultatExamen } from '../lib/resultatsLogic';
import { renalStatus } from '../lib/renalEngine';
import { pregnancyContext } from '../lib/pregnancyStatus';
import {
  grossesseTexte, type LettreAntecedent, type LettreBilan, type LettreExamenAttente, type LettrePathologie, type LettreTraitement,
} from '../lib/lettreTexte';

/** Lettres d'adressage d'un patient, rechargées à chaque changement publié (« adressages »). */
export function usePatientLettres(patientId: string | null | undefined) {
  const key = patientId ? `adressages:${patientId}` : null;
  const [lettres, setLettres] = useState<LettreAdressage[]>(() => (key ? viewCache.peek<LettreAdressage[]>(key) ?? [] : []));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const reload = useCallback(async (force = false) => {
    if (!patientId || !key) { setLettres([]); return; }
    const s = ++seq.current;
    try {
      await viewCache.swr<LettreAdressage[]>(
        key, () => loadPatientLettres(patientId),
        rows => { if (s === seq.current) { setLettres(rows); setError(null); setLoading(false); } },
        { topics: ['adressages'], maxAgeMs: 30_000, force },
      );
    } catch (e) {
      if (s !== seq.current) return;
      console.error('[adressages] chargement des lettres :', e);
      setError('Adressages indisponibles');
    } finally {
      if (s === seq.current) setLoading(false);
    }
  }, [patientId, key]);

  useEffect(() => {
    const cached = key ? viewCache.peek<LettreAdressage[]>(key) : undefined;
    setLettres(cached ?? []);
    setError(null);
    if (!patientId) { setLoading(false); return; }
    setLoading(!cached);
    void reload();
  }, [patientId, key, reload]);

  useDataSync(['adressages'], () => { void reload(); });

  return { lettres, loading, error, reload: () => reload(true) };
}

/** Carnet de confrères du médecin connecté, rechargé à chaque modification (« confreres »). */
export function useConfreres(includeArchived = false) {
  const { doctorProfile } = useAuth();
  const doctorId = doctorProfile?.id ?? null;
  const [confreres, setConfreres] = useState<Confrere[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const reload = useCallback(async () => {
    if (!doctorId) { setConfreres([]); return; }
    const s = ++seq.current;
    setLoading(true);
    try {
      const rows = await loadConfreres(doctorId, includeArchived);
      if (s === seq.current) { setConfreres(rows); setError(null); }
    } catch (e) {
      if (s !== seq.current) return;
      console.error('[adressages] carnet de confrères :', e);
      setError('Carnet de confrères indisponible');
    } finally {
      if (s === seq.current) setLoading(false);
    }
  }, [doctorId, includeArchived]);

  useEffect(() => { void reload(); }, [reload]);
  useDataSync(['confreres'], () => { void reload(); }, { onFocus: false });

  return { confreres, loading, error, reload };
}

// ─── Dossier du patient, tel que la lettre peut le citer ─────────────────────

export interface AntecedentOption extends LettreAntecedent { id: string; familial: boolean }
export interface BilanOption extends LettreBilan { key: string; examCode: string | null }

export interface AdressageContext {
  ready: boolean;
  /** Une partie du dossier n'a pas pu être lue : la section correspondante est absente (jamais inventée). */
  errors: string[];
  pathologies: LettrePathologie[];
  traitements: LettreTraitement[];
  antecedents: AntecedentOption[];
  allergiesMedicaments: string[];
  allergiesAlimentaires: string[];
  bilans: BilanOption[];
  /** Bilans cochés par défaut : les plus pertinents pour les pathologies du patient. */
  bilansParDefaut: string[];
  dfg: string | null;
  examensEnAttente: LettreExamenAttente[];
  grossesse: string;
  /** Récapitulatif complet des bilans (annexe « Joindre le récapitulatif »). */
  recap: RecapGroup[];
}

function traitementLettre(t: TraitementChronique): LettreTraitement {
  const m = t.medicament ?? null;
  return {
    nom: (m ? medLabel(m) : '') || fondDisplayName(t),
    posologie: t.posologie,
    dci: m?.dci ?? null, dci_canonique: m?.dci_canonique ?? null, nomBase: m ? [m.nom, m.nom_commercial].filter(Boolean).join(' ') : null,
  };
}

function antecedentOption(a: Antecedent): AntecedentOption {
  return {
    id: a.id, libelle: a.libelle, categorie: a.categorie, familial: a.categorie === 'familial',
    debutAnnee: a.date_debut_annee, finAnnee: a.date_fin_annee, enCours: a.en_cours, details: formatDetails(a.details),
  };
}

/** « DFG estimé à 72 mL/min/1,73 m² (CKD-EPI, créatinine du 12/09/2026) » — null si le DFG est inconnu. */
function dfgTexte(patient: Patient, resultats: ResultatExamen[], refs: ExamRef[], today: Date): string | null {
  const actifs = resultats.filter(r => !r.archive && r.valeur_num !== null);
  const s = renalStatus({
    dateNaissance: patient.date_naissance, sexe: patient.sexe, poidsKg: patient.poids_kg, poidsDate: patient.poids_date,
    pathologies: patient.pathologies,
    creatinines: actifs.filter(r => r.examen_code === 'CREATININE').map(r => ({ id: r.id, valeur_num: r.valeur_num, unite_saisie: r.unite_saisie, date_prelevement: r.date_prelevement, created_at: r.created_at })),
    dfgLabos: actifs.filter(r => r.examen_code === 'DFG').map(r => ({ id: r.id, valeur_num: r.valeur_num, date_prelevement: r.date_prelevement, created_at: r.created_at })),
    creatRef: refs.find(r => r.code === 'CREATININE') ?? null,
    today,
  });
  if (!s.connu || s.dfg === null) return null;
  if (s.source === 'labo' && s.dfgLabo) return `DFG ${s.dfg} mL/min/1,73 m² (laboratoire, ${formatFr(s.dfgLabo.date)})`;
  return s.creat ? `DFG estimé à ${s.dfg} mL/min/1,73 m² (CKD-EPI, créatinine du ${formatFr(s.creat.date)})` : null;
}

const VIDE: Omit<AdressageContext, 'pathologies' | 'allergiesMedicaments' | 'allergiesAlimentaires' | 'grossesse'> = {
  ready: false, errors: [], traitements: [], antecedents: [], bilans: [], bilansParDefaut: [], dfg: null, examensEnAttente: [], recap: [],
};

/**
 * Lit le dossier EN BASE à l'ouverture de la lettre (jamais le cache de vue) : traitement de fond
 * actif, antécédents, résultats, demandes d'examens. Une lecture en échec laisse sa section vide
 * et le signale ; rien n'est jamais rempli par défaut.
 */
export function useAdressageContext(patient: Patient, enabled = true): AdressageContext {
  const [data, setData] = useState(VIDE);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setData(VIDE);
    (async () => {
      const errors: string[] = [];
      const lire = async <T,>(label: string, fn: () => Promise<T>, repli: T): Promise<T> => {
        try { return await fn(); } catch (e) { console.error(`[adressages] ${label} :`, e); errors.push(label); return repli; }
      };
      const [fond, ant, resultats, refs, demandes] = await Promise.all([
        lire('traitement de fond', () => loadTraitements(patient.id, true), [] as TraitementChronique[]),
        lire('antécédents', () => loadAntecedents(patient.id, false), [] as Antecedent[]),
        lire('résultats de bilans', () => loadPatientResultats(patient.id), [] as ResultatExamen[]),
        lire('référentiel des examens', () => loadExamRefs(), [] as ExamRef[]),
        lire('examens en attente', () => loadPatientDemandes(patient.id), [] as DemandeExamens[]),
      ]);
      if (cancelled) return;
      const today = new Date();
      const series = buildSeries(resultats, refs);
      const citables = series.filter(s => s.dernier.valeur_num !== null || qualitatifLabel(s.dernier.valeur_texte) !== null);
      setData({
        ready: true, errors,
        traitements: fond.filter(t => t.actif).map(traitementLettre),
        antecedents: ant.filter(a => !a.archive).map(antecedentOption),
        bilans: citables.map(s => ({ key: s.key, examCode: s.examCode, label: s.label, valeur: valeurAffichee(s.dernier), date: s.dernier.date_prelevement })),
        bilansParDefaut: derniersBilans(series, patient.pathologies, 5).map(b => b.key),
        dfg: dfgTexte(patient, resultats, refs, today),
        examensEnAttente: demandes.filter(isOpen).flatMap(d => d.lignes.filter(l => l.statut === 'en_attente').map(l => ({ libelle: l.libelle, dateDemande: d.date_demande }))),
        recap: buildRecap(series),
      });
    })();
    return () => { cancelled = true; };
    // La fiche du patient est lue telle qu'affichée ; ses champs sont repris ci-dessous à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id, enabled]);

  return useMemo(() => ({
    ...data,
    pathologies: (patient.pathologies ?? []).map(nom => ({ nom, depuisAnnee: patient.pathologies_depuis?.[nom] ?? null })),
    allergiesMedicaments: patient.allergies_medicaments ?? [],
    allergiesAlimentaires: patient.allergies_alimentaires ?? [],
    grossesse: patient.sexe === 'F' ? grossesseTexte(pregnancyContext(patient, new Date())) : '',
  }), [data, patient]);
}
