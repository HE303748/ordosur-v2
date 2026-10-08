-- Sprint 4d-bis — Recherche : 🇲🇦 commercialisés avant TOUT le reste.
--
-- 1. search_medicaments : signature, colonnes de retour (dont dci_canonique), filtre 🇲🇦,
--    SECURITY DEFINER et search_path INCHANGÉS. Seul l'ordre change : le statut de
--    commercialisation passe AVANT le rang textuel (égal > « terme + espace » > préfixe >
--    DCI > reste), qui ne départage plus qu'à statut égal.
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
  CASE WHEN coalesce(statut_commercialisation,'') IN ('Commercialisé','Commercialisé AO') THEN 0
       WHEN statut_commercialisation IS NULL THEN 1 ELSE 2 END,
  CASE
    WHEN lower(nom_commercial) = lower(search_term) THEN 1
    WHEN lower(nom_commercial) LIKE lower(search_term) || ' %' THEN 2
    WHEN lower(nom_commercial) LIKE lower(search_term) || '%' THEN 3
    WHEN dci ILIKE '%' || search_term || '%' THEN 4
    ELSE 5
  END,
  nom_commercial
LIMIT limit_count;
$function$;

-- 2. Entrées HORS Maroc (FR / INT / US) : jamais mêlées aux résultats 🇲🇦. Affichées
--    seulement si aucun résultat 🇲🇦 ne correspond, ou à la demande. `mappe` = au moins un
--    ingrédient (sinon non vérifiable par le moteur → badge « Non vérifiable »).
--    Terme ≥ 3 caractères (index trigram sur nom et dci).
CREATE OR REPLACE FUNCTION public.search_medicaments_hors_maroc(search_term text, limit_count integer DEFAULT 15)
 RETURNS TABLE(id uuid, nom text, nom_commercial text, dci text, dci_canonique text, forme text, dosage text, laboratoire text, pays text, ppv_ma numeric, remboursement_cnops boolean, classe_therapeutique text, ean text, mappe boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
SELECT m.id, m.nom, m.nom_commercial, m.dci, m.dci_canonique, m.forme, m.dosage, m.laboratoire, m.pays, m.ppv_ma,
  m.remboursement_cnops, m.classe_therapeutique, m.ean,
  EXISTS (SELECT 1 FROM medicament_ingredients mi WHERE mi.medicament_id = m.id) AS mappe
FROM medicaments m
WHERE m.pays <> 'MA'
  AND length(btrim(search_term)) >= 3
  AND (m.nom ILIKE '%' || search_term || '%' OR m.dci ILIKE '%' || search_term || '%')
ORDER BY
  CASE
    WHEN lower(m.nom) = lower(search_term) THEN 1
    WHEN lower(m.nom) LIKE lower(search_term) || ' %' THEN 2
    WHEN lower(m.nom) LIKE lower(search_term) || '%' THEN 3
    WHEN m.dci ILIKE '%' || search_term || '%' THEN 4
    ELSE 5
  END,
  CASE WHEN m.pays = 'FR' THEN 0 ELSE 1 END,
  m.nom
LIMIT least(greatest(limit_count, 1), 50);
$function$;

REVOKE ALL ON FUNCTION public.search_medicaments_hors_maroc(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_medicaments_hors_maroc(text, integer) TO authenticated, service_role;
