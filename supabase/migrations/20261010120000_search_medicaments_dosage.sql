-- Sprint 4d-ter — Recherche : équivalence de dosage mg ↔ g.
--
-- search_term_variantes('doliprane 1000 mg') → {doliprane 1000 mg, doliprane 1 g}
-- search_term_variantes('doliprane 500')     → {doliprane 500, doliprane 0,5 g, doliprane 0.5 g}
-- search_term_variantes('doliprane 1 g')     → {doliprane 1 g, doliprane 1000 mg}
-- Seul le premier nombre du terme est converti. « 500mg » est d'abord normalisé en « 500 mg ».
CREATE OR REPLACE FUNCTION public.search_term_variantes(p_term text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  n text := btrim(regexp_replace(regexp_replace(coalesce(p_term, ''), '(\d)\s*(mg|g)\M', '\1 \2', 'gi'), '\s+', ' ', 'g'));
  out text[] := ARRAY[]::text[];
  num text;
  g text;
BEGIN
  IF n = '' THEN RETURN ARRAY[coalesce(p_term, '')]; END IF;
  out := out || n;
  IF btrim(p_term) <> n THEN out := out || btrim(p_term); END IF;

  -- mg → g : nombre de 3 à 5 chiffres, avec ou sans « mg » (« 1000 », « 500 mg »)
  num := substring(n from '(?:^|\s)(\d{3,5})(?:\s*mg)?(?=\s|$)');
  IF num IS NOT NULL THEN
    g := trim(trailing '.' from trim(trailing '0' from (num::numeric / 1000)::numeric(12,3)::text));
    out := out || regexp_replace(n, '(^|\s)(\d{3,5})(\s*mg)?(?=\s|$)', '\1' || g || ' g', 'i');
    IF position('.' in g) > 0 THEN
      out := out || regexp_replace(n, '(^|\s)(\d{3,5})(\s*mg)?(?=\s|$)', '\1' || replace(g, '.', ',') || ' g', 'i');
    END IF;
  END IF;

  -- g → mg : « 1 g », « 0,5 g », « 0.5 g »
  num := substring(n from '(?:^|\s)(\d{1,3}(?:[.,]\d{1,3})?)\s*g(?=\s|$)');
  IF num IS NOT NULL THEN
    out := out || regexp_replace(n, '(^|\s)(\d{1,3}(?:[.,]\d{1,3})?)\s*g(?=\s|$)',
      '\1' || round(replace(num, ',', '.')::numeric * 1000)::bigint::text || ' mg', 'i');
  END IF;

  RETURN ARRAY(SELECT DISTINCT v FROM unnest(out) v WHERE v <> '');
END;
$function$;

-- search_medicaments : signature, colonnes (dont dci_canonique), filtre 🇲🇦, SECURITY DEFINER
-- et ordre (🇲🇦 commercialisés d'abord, puis rang textuel) INCHANGÉS. Le terme est
-- simplement cherché sous toutes ses variantes de dosage.
-- Perf : une seule chaîne en minuscules par ligne (nom commercial | DCI | nom) comparée par
-- LIKE aux variantes — ~20 ms sur les 7 600 lignes 🇲🇦, contre ~130 ms avec ILIKE ANY × 3.
CREATE OR REPLACE FUNCTION public.search_medicaments(search_term text, limit_count integer DEFAULT 15)
 RETURNS TABLE(id uuid, nom text, nom_commercial text, dci text, dci_canonique text, forme text, dosage text, laboratoire text, pays text, ppv_ma numeric, remboursement_cnops boolean, classe_therapeutique text, ean text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH v AS MATERIALIZED (
  SELECT ARRAY(SELECT '%' || lower(x) || '%' FROM unnest(search_term_variantes(search_term)) x) AS contient,
         ARRAY(SELECT lower(x) FROM unnest(search_term_variantes(search_term)) x) AS egal,
         ARRAY(SELECT lower(x) || ' %' FROM unnest(search_term_variantes(search_term)) x) AS mot,
         ARRAY(SELECT lower(x) || '%' FROM unnest(search_term_variantes(search_term)) x) AS prefixe
)
SELECT m.id, m.nom, m.nom_commercial, m.dci, m.dci_canonique, m.forme, m.dosage, m.laboratoire, m.pays, m.ppv_ma,
  m.remboursement_cnops, m.classe_therapeutique, m.ean
FROM medicaments m, v
WHERE m.pays = 'MA'
  AND lower(coalesce(m.nom_commercial,'') || '|' || coalesce(m.dci,'') || '|' || coalesce(m.nom,'')) LIKE ANY (v.contient)
ORDER BY
  CASE WHEN coalesce(m.statut_commercialisation,'') IN ('Commercialisé','Commercialisé AO') THEN 0
       WHEN m.statut_commercialisation IS NULL THEN 1 ELSE 2 END,
  CASE
    WHEN lower(m.nom_commercial) = ANY (v.egal) THEN 1
    WHEN lower(m.nom_commercial) LIKE ANY (v.mot) THEN 2
    WHEN lower(m.nom_commercial) LIKE ANY (v.prefixe) THEN 3
    WHEN lower(m.dci) LIKE ANY (v.contient) THEN 4
    ELSE 5
  END,
  m.nom_commercial
LIMIT limit_count;
$function$;
