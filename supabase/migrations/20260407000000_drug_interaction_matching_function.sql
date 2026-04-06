-- ============================================================
-- MIGRATION 2026-04-07 — Fonction matching interactions médicamenteuses
-- Remplace le chargement de toutes les interactions (160k lignes)
-- par une recherche server-side performante.
-- ============================================================

-- Extension unaccent pour normaliser les accents (disponible par défaut dans Supabase)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ── Fonction de normalisation d'un nom de médicament ─────────────────────
-- Identique à la normalisation utilisée lors de l'import DDInter :
-- accents supprimés, minuscules, caractères spéciaux → espace
CREATE OR REPLACE FUNCTION drug_name_normalize(p_text text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = public
AS $$
  SELECT regexp_replace(lower(unaccent(p_text)), '[^a-z0-9 ]', ' ', 'g')
$$;

-- ── Fonction principale de matching ──────────────────────────────────────
-- Prend un tableau de chaînes médicament normalisées,
-- retourne toutes les interactions drug-drug dont les 2 patterns
-- appartiennent à des médicaments DIFFÉRENTS de la liste.
CREATE OR REPLACE FUNCTION check_drug_interactions_for_meds(p_med_strings text[])
RETURNS TABLE(
  id          uuid,
  dci_1_pattern text,
  dci_2_pattern text,
  severite    text,
  description text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n int;
  v_normalized text[];
BEGIN
  v_n := coalesce(array_length(p_med_strings, 1), 0);
  IF v_n < 2 THEN RETURN; END IF;

  -- Normaliser les chaînes médicament passées en entrée
  SELECT array_agg(drug_name_normalize(m))
    INTO v_normalized
    FROM unnest(p_med_strings) m;

  -- Pour chaque interaction, vérifier que :
  --   • dci_1_pattern est une sous-chaîne de l'une des médications normalisées
  --   • dci_2_pattern est une sous-chaîne d'UNE AUTRE médication normalisée
  RETURN QUERY
  SELECT DISTINCT
    di.id,
    di.dci_1_pattern,
    di.dci_2_pattern,
    di.severite::text,
    di.description
  FROM drug_interactions di
  WHERE EXISTS (
    SELECT 1
    FROM unnest(v_normalized) WITH ORDINALITY t1(s1, i1)
    WHERE s1 LIKE '%' || di.dci_1_pattern || '%'
      AND EXISTS (
        SELECT 1
        FROM unnest(v_normalized) WITH ORDINALITY t2(s2, i2)
        WHERE s2 LIKE '%' || di.dci_2_pattern || '%'
          AND i2 <> i1
      )
  )
  -- Symétrique : dci_2_pattern dans med1, dci_1_pattern dans med2
  OR EXISTS (
    SELECT 1
    FROM unnest(v_normalized) WITH ORDINALITY t1(s1, i1)
    WHERE s1 LIKE '%' || di.dci_2_pattern || '%'
      AND EXISTS (
        SELECT 1
        FROM unnest(v_normalized) WITH ORDINALITY t2(s2, i2)
        WHERE s2 LIKE '%' || di.dci_1_pattern || '%'
          AND i2 <> i1
      )
  );
END;
$$;

-- Accès SELECT pour les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION check_drug_interactions_for_meds(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION drug_name_normalize(text) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✓ Fonctions drug_name_normalize et check_drug_interactions_for_meds créées';
END $$;
