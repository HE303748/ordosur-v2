import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDataSync } from '../lib/dataSync';
import { viewCache } from '../lib/viewCache';
import type { ExamRef, ExamPack } from '../lib/examSearch';
import type { DemandeExamens } from '../lib/examRequest';
import { loadExamRefs, loadPacks, loadPackUsage, loadPatientDemandes, loadNextRdvDate } from '../lib/examensApi';
import { loadAntecedents } from '../lib/antecedents';
import { loadTraitements, fondDisplayName } from '../lib/traitementsChroniques';
import type { PrintContext } from '../lib/examUi';

/** Demandes d'examens d'un patient, rechargées à chaque changement publié (« examens »). */
export function usePatientDemandes(patientId: string | null | undefined) {
  const key = patientId ? `demandes:${patientId}` : null;
  const [demandes, setDemandes] = useState<DemandeExamens[]>(() => (key ? viewCache.peek<DemandeExamens[]>(key) ?? [] : []));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  // Sprint P — cache de vue : contenu immédiat au retour sur le profil, rafraîchi en arrière-plan.
  // Plusieurs composants abonnés au même patient (en-tête, onglet, Vérificateur) partagent UNE
  // requête : plus de double appel après « Marquer réalisé ».
  const reload = useCallback(async (force = false) => {
    if (!patientId || !key) { setDemandes([]); return; }
    const s = ++seq.current;
    try {
      await viewCache.swr<DemandeExamens[]>(
        key, () => loadPatientDemandes(patientId),
        rows => { if (s === seq.current) { setDemandes(rows); setError(null); setLoading(false); } },
        { topics: ['examens'], maxAgeMs: 30_000, force },
      );
    } catch (e) {
      if (s !== seq.current) return;
      console.error('[examens] chargement des demandes :', e);
      setError('Demandes d’examens indisponibles');
    } finally {
      if (s === seq.current) setLoading(false);
    }
  }, [patientId, key]);

  useEffect(() => {
    const cached = key ? viewCache.peek<DemandeExamens[]>(key) : undefined;
    setDemandes(cached ?? []);
    setError(null);
    if (!patientId) { setLoading(false); return; }
    setLoading(!cached);
    void reload();
  }, [patientId, key, reload]);

  // Le sujet « examens » a déjà périmé le cache (notifyDataChanged) : simple revalidation.
  useDataSync(['examens'], () => { void reload(); });

  return { demandes, loading, error, reload: () => reload(true) };
}

/** Référentiel + packs (triés par usage de CE médecin). Référentiel mis en cache par session. */
export function useExamReferentiel(enabled: boolean) {
  const { doctorProfile } = useAuth();
  const doctorId = doctorProfile?.id ?? null;
  const [refs, setRefs] = useState<ExamRef[]>([]);
  const [packs, setPacks] = useState<ExamPack[]>([]);
  // Sprint 5c — usage des packs par ce médecin : le tri final dépend aussi des pathologies du patient.
  const [packUsage, setPackUsage] = useState<Map<string, number>>(() => new Map());
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const reloadPacks = useCallback(async () => {
    const [p, usage] = await Promise.all([loadPacks(doctorId), doctorId ? loadPackUsage(doctorId) : Promise.resolve(new Map<string, number>())]);
    setPacks(p);
    setPackUsage(usage);
  }, [doctorId]);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const r = await loadExamRefs();
      setRefs(r);
      setFailed(r.length === 0);
      await reloadPacks();
    } catch (e) {
      console.error('[examens] référentiel :', e);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [reloadPacks]);

  useEffect(() => { if (enabled) void load(); }, [enabled, load]);

  return { refs, packs, packUsage, loading, failed, reload: load, reloadPacks };
}

export interface PatientExamContext {
  antecedents: Array<{ libelle: string; annee: number | null }>;
  traitements: string[];
  /** Noms + DCI du traitement de fond (détection de la metformine). */
  traitementsMedicaments: string[];
  nextRdvDate: string | null;
  ready: boolean;
}

/** Données du dossier utiles à la demande : antécédents, traitement de fond, prochain RDV. */
export function usePatientExamContext(patientId: string | null | undefined, enabled: boolean): PatientExamContext {
  const [ctx, setCtx] = useState<PatientExamContext>({ antecedents: [], traitements: [], traitementsMedicaments: [], nextRdvDate: null, ready: false });
  useEffect(() => {
    if (!enabled || !patientId) return;
    let cancelled = false;
    setCtx(c => ({ ...c, ready: false }));
    (async () => {
      const [ant, fond, rdv] = await Promise.all([
        loadAntecedents(patientId, false).catch(() => []),
        loadTraitements(patientId, true).catch(() => []),
        loadNextRdvDate(patientId).catch(() => null),
      ]);
      if (cancelled) return;
      setCtx({
        antecedents: ant.filter(a => !a.archive && a.categorie !== 'familial' && a.categorie !== 'toxique')
          .map(a => ({ libelle: a.libelle, annee: a.date_debut_annee ?? null })),
        traitements: fond.map(fondDisplayName),
        traitementsMedicaments: fond.map(t => [t.medicament_nom, t.medicament?.nom, t.medicament?.nom_commercial, t.medicament?.dci, t.medicament?.dci_canonique].filter(Boolean).join(' ')),
        nextRdvDate: rdv,
        ready: true,
      });
    })();
    return () => { cancelled = true; };
  }, [patientId, enabled]);
  return ctx;
}

/** En-tête d'impression du médecin connecté + cabinet. */
export function useExamPrintContext(): PrintContext {
  const { user, doctorProfile, clinicProfile } = useAuth();
  return useMemo(() => ({
    me: user && doctorProfile ? {
      doctorId: doctorProfile.id,
      header: {
        prenom: user.prenom, nom: user.nom, specialite: doctorProfile.specialite ?? null,
        rpps: doctorProfile.rpps ?? null, ordre_number: doctorProfile.ordre_number ?? null,
      },
      logoUrl: doctorProfile.logo_url ?? null,
    } : null,
    org: { name: clinicProfile?.name ?? '', adresse: clinicProfile?.adresse ?? null, telephone: clinicProfile?.telephone ?? null },
  }), [user, doctorProfile, clinicProfile]);
}
