-- Sprint 4d — Classement de la recherche médicament.
-- Signature, colonnes de retour (dont dci_canonique), filtre (🇲🇦, ILIKE sur nom commercial /
-- DCI / nom), SECURITY DEFINER et search_path INCHANGÉS. Seul l'ORDER BY change :
--   1. nom commercial égal au terme ;
--   2. nom commençant par le terme suivi d'un espace (« Doliprane 1000 » pour « doliprane ») ;
--   3. nom commençant par le terme ;
--   4. correspondance sur la DCI ;
--   5. reste.
-- Dans chaque rang : commercialisés d'abord, puis statut inconnu, puis le reste ; puis nom.
CREATE OR REPLACE FUNCTION public.search_medicaments(search_term text, limit_count integer DEFAULT 15)
 RETURNS TABLE(id uuid, nom text, nom_commercial text, dci text, dci_canonique text, forme text, dosage text, laboratoire text, pays text, ppv_ma numeric, remboursement_cnops boolean, classe_therapeutique text, ean text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
SELECT id, nom, nom_commercial, dci, dci_canonique, forme, dosage, laboratoire, pays, ppv_ma,
  remboursement_cnops, classe_therapeutique, ean
FROM medicaments
WHERE pays = 'MA'
  AND (nom_commercial ILIKE '%' || search_term || '%'
    OR dci ILIKE '%' || search_term || '%'
    OR nom ILIKE '%' || search_term || '%')
ORDER BY
  CASE
    WHEN lower(nom_commercial) = lower(search_term) THEN 1
    WHEN lower(nom_commercial) LIKE lower(search_term) || ' %' THEN 2
    WHEN lower(nom_commercial) LIKE lower(search_term) || '%' THEN 3
    WHEN dci ILIKE '%' || search_term || '%' THEN 4
    ELSE 5
  END,
  CASE WHEN coalesce(statut_commercialisation,'') IN ('Commercialisé','Commercialisé AO') THEN 0
       WHEN statut_commercialisation IS NULL THEN 1 ELSE 2 END,
  nom_commercial
LIMIT limit_count;
$function$;
