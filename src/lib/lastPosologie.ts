import { supabase } from './supabase';
import { POSOLOGIE_FIABLE_DEPUIS, type PastLine } from './posologie';

// Sprint 4d-bis — Dernières lignes d'ordonnance de CE médecin pour une liste de médicaments
// (suggestion « Dernière posologie utilisée »). Requête légère : filtrée par médecin et par
// noms exacts, bornée à 200 lignes, les plus récentes d'abord.

interface Row {
  medicament_nom: string;
  posologie: string | null;
  duree: string | null;
  ordonnances: { created_at: string } | { created_at: string }[] | null;
}

export async function fetchPastLines(doctorId: string, noms: string[]): Promise<PastLine[]> {
  const names = [...new Set(noms.map(n => n.trim()).filter(Boolean))].slice(0, 40);
  if (!doctorId || names.length === 0) return [];
  const base = () => supabase
    .from('ordonnance_lignes')
    .select('medicament_nom, posologie, duree, ordonnances!inner(doctor_id, created_at)')
    .eq('ordonnances.doctor_id', doctorId)
    // Jamais les lignes d'avant le Sprint 4d-bis (posologie par défaut automatique).
    .gte('ordonnances.created_at', POSOLOGIE_FIABLE_DEPUIS)
    .in('medicament_nom', names);
  let { data, error } = await base().order('ordonnances(created_at)', { ascending: false }).limit(200);
  // Tri par table liée refusé par l'API : même requête sans tri (le plus récent est choisi
  // côté client par lastPosologieFor).
  if (error) ({ data, error } = await base().limit(200));
  if (error) {
    // Suggestion facultative : en cas d'échec, le champ reste simplement vide.
    console.error('[OrdoSur] fetchPastLines error:', error);
    return [];
  }
  return ((data as Row[] | null) ?? []).map(r => {
    const o = Array.isArray(r.ordonnances) ? r.ordonnances[0] : r.ordonnances;
    return { medicament_nom: r.medicament_nom, posologie: r.posologie, duree: r.duree, created_at: o?.created_at ?? '' };
  });
}
