/**
 * fetchAllRows — garde-fou anti-troncature pour les chargements complets Supabase.
 *
 * Problème résolu : Supabase/PostgREST plafonne TOUTE requête à 1000 lignes par défaut.
 * Un `.select()` qui doit ramener l'intégralité d'une table (ex: les 1421 contre-indications)
 * était silencieusement tronqué à 1000 → trou de données invisible.
 *
 * Ce helper pagine automatiquement via `.range()` jusqu'à épuisement, et retourne TOUTES
 * les lignes. Robuste même si la table grossit.
 *
 * Usage :
 *   const ci = await fetchAllRows(
 *     (from, to) => supabase.from('contraindications').select('*').range(from, to)
 *   );
 *
 * Le callback reçoit (from, to) et DOIT appliquer .range(from, to) sur le query builder,
 * puis retourner la promesse Supabase ({ data, error }). On passe par un callback (et non
 * un query builder déjà construit) car les query builders Supabase ne sont pas réutilisables
 * une fois `.range()` appliqué.
 *
 * Garanties :
 *   - Erreur sur une page → console.error + retourne ce qui est déjà chargé (pas de crash).
 *   - Plafond de pages (anti boucle infinie). Si atteint avec une page encore pleine →
 *     console.warn explicite (chargement potentiellement tronqué).
 */

interface SupabasePageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

export async function fetchAllRows<T>(
  pageFetcher: (from: number, to: number) => PromiseLike<SupabasePageResult<T>>,
  options?: { pageSize?: number; maxPages?: number; label?: string },
): Promise<T[]> {
  const pageSize = options?.pageSize ?? 1000;
  const maxPages = options?.maxPages ?? 50;
  const label = options?.label ?? 'fetchAllRows';

  const all: T[] = [];
  let from = 0;

  for (let page = 0; page < maxPages; page++) {
    const { data, error } = await pageFetcher(from, from + pageSize - 1);

    if (error) {
      console.error(`[${label}] pagination error (page ${page}, from ${from}):`, error);
      break; // fallback gracieux : on garde ce qui est déjà chargé
    }

    const rows = data ?? [];
    all.push(...rows);

    // Dernière page atteinte (page incomplète = il n'y a plus rien après).
    if (rows.length < pageSize) {
      return all;
    }

    from += pageSize;

    // Plafond atteint alors que la page était PLEINE → il reste probablement des lignes.
    if (page === maxPages - 1) {
      console.warn(
        `[${label}] plafond de ${maxPages} pages atteint (${all.length} lignes chargées) — ` +
        `chargement POTENTIELLEMENT TRONQUÉ. Augmentez maxPages ou filtrez la requête.`,
      );
    }
  }

  return all;
}
