import { supabase, type Medicament } from './supabase';
import { dedupeMedicaments, duplicateIds } from './medDedupe';

// Sprint 4d-ter — Recherche de médicaments 🇲🇦 commune au Vérificateur, au formulaire
// d'ordonnance et au traitement de fond : RPC search_medicaments (équivalence mg ↔ g côté
// SQL) + dédoublonnage À L'AFFICHAGE (rien n'est modifié en base).

/** Marge demandée en plus à la RPC pour compenser les doublons retirés. */
const DEDUP_MARGIN = 30;

export async function searchMedicamentsMA(term: string, limit: number): Promise<Medicament[]> {
  const { data, error } = await supabase.rpc('search_medicaments', {
    search_term: term,
    limit_count: limit + DEDUP_MARGIN,
  });
  if (error) console.error('[OrdoSur] search_medicaments error:', error);
  const rows = (data as Medicament[]) || [];

  // Savoir quelles entrées sont vérifiables n'est utile que s'il y a des doublons :
  // une requête filtrée par identifiants, uniquement dans ce cas.
  const dupIds = duplicateIds(rows);
  let mapped: Set<string> | undefined;
  if (dupIds.length > 0) {
    const { data: mi, error: miErr } = await supabase
      .from('medicament_ingredients')
      .select('medicament_id')
      .in('medicament_id', dupIds);
    if (miErr) console.error('[OrdoSur] medicament_ingredients (dédoublonnage) error:', miErr);
    else mapped = new Set(((mi as Array<{ medicament_id: string }> | null) ?? []).map(r => r.medicament_id));
  }
  return dedupeMedicaments(rows, mapped).slice(0, limit);
}
