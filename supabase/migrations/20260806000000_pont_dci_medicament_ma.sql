-- =====================================================================
-- Sprint: Scraping medicament.ma + pont DCI manquants
-- Étapes B, D, C+E
--
-- ORDRE D'EXÉCUTION : B (UPDATE dci) → D (mapping_partiel) → C+E (medicament_ingredients)
-- D avant C+E pour capturer l'état "non-mappé" pré-sprint dans mapping_partiel
--
-- SÉCURITÉ :
--   * Lecture seule sur : check_interactions_v2, ansm_regles, ansm_classe_membres,
--     ansm_substance_ingredient
--   * Aucun DELETE dans medicament_ingredients
--   * faux_verts DOIT rester à 0 (parlant check obligatoire)
--   * Ne jamais deviner une molécule depuis le nom de marque
--   * Médicaments déjà mappés (medicament_ingredients) ignorés pour C+E
--   * Médicaments en quarantaine ignorés pour tout
-- =====================================================================

-- =====================================================================
-- ÉTAPE B : Écrire les compositions dans medicaments.dci (Condition 3)
-- Même si le pont molécule échoue plus bas, on écrit la composition source
-- JOIN key : drug_name_normalize(nom) LIKE drug_name_normalize(split_part(nom_complet,',',1)) || '%'
-- Cela garantit la correspondance marque+dosage sans faux positifs cross-brand
-- =====================================================================
UPDATE medicaments m
SET dci = staged.composition
FROM (
  SELECT DISTINCT ON (m2.id)
    m2.id  AS med_id,
    s2.composition
  FROM medicament_ma_staging s2
  JOIN medicaments m2
    ON drug_name_normalize(m2.nom)
       LIKE drug_name_normalize(split_part(s2.nom_complet, ',', 1)) || '%'
  WHERE m2.pays = 'MA'
    AND (m2.dci IS NULL OR m2.dci = '')
    AND NOT EXISTS (
      SELECT 1 FROM mapping_quarantaine mq WHERE mq.medicament_id = m2.id
    )
    AND s2.composition NOT ILIKE '%homéopath%'
  ORDER BY m2.id, length(split_part(s2.nom_complet, ',', 1)) DESC
) staged
WHERE m.id = staged.med_id;

-- =====================================================================
-- ÉTAPE D : Remplir mapping_partiel (avant C+E pour état pré-sprint)
-- Uniquement multi-molécules avec bridge PARTIEL (au moins 1 pontée ET 1 manquante)
-- =====================================================================
INSERT INTO mapping_partiel
  (medicament_id, medicament_nom, composition_source, molecules_pontees, molecules_manquantes)
WITH
candidate_map_d AS (
  SELECT DISTINCT ON (m.id)
    m.id   AS med_id,
    m.nom  AS med_nom,
    s.composition
  FROM medicament_ma_staging s
  JOIN medicaments m
    ON drug_name_normalize(m.nom)
       LIKE drug_name_normalize(split_part(s.nom_complet, ',', 1)) || '%'
  WHERE m.pays = 'MA'
    AND NOT EXISTS (
      SELECT 1 FROM medicament_ingredients mi WHERE mi.medicament_id = m.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM mapping_quarantaine mq WHERE mq.medicament_id = m.id
    )
    AND s.composition NOT ILIKE '%homéopath%'
    AND array_length(string_to_array(s.composition, '|'), 1) > 1
  ORDER BY m.id, length(split_part(s.nom_complet, ',', 1)) DESC
),
mol_raw_d AS (
  SELECT med_id, med_nom, composition,
         btrim(mol) AS mol
  FROM candidate_map_d,
       unnest(string_to_array(composition, '|')) AS mol
  WHERE btrim(mol) != ''
),
bases_d AS (
  SELECT med_id, med_nom, composition, mol,
         _base_dci(mol) AS base
  FROM mol_raw_d
),
mol_status_d AS (
  SELECT med_id, med_nom, composition, mol,
    CASE
      WHEN base IS NULL OR base = '' OR base ILIKE 'de %'
        OR drug_name_normalize(base) = ANY(ARRAY[
             'sodium','potassium','sodium benzoate',
             'eau','glucose','eau purifiee','eau injectable'])
      THEN false
      ELSE EXISTS (
        SELECT 1
        FROM ansm_substance_ingredient asi
        WHERE drug_name_normalize(asi.substance) = drug_name_normalize(base)
          AND asi.ingredient_id IS NOT NULL
          AND (
            EXISTS (
              SELECT 1 FROM interactions_ingredients ii
              WHERE ii.ingredient_1 = asi.ingredient_id
                 OR ii.ingredient_2 = asi.ingredient_id
            )
            OR EXISTS (
              SELECT 1 FROM v_ingredient_entites v
              JOIN ansm_regles r
                ON r.entite_a = v.entite OR r.entite_b = v.entite
              WHERE v.ingredient_id = asi.ingredient_id
            )
          )
      )
    END AS is_ponte
  FROM bases_d
),
agg_d AS (
  SELECT
    med_id, med_nom, composition,
    string_agg(mol, ' | ') FILTER (WHERE     is_ponte) AS molecules_pontees,
    string_agg(mol, ' | ') FILTER (WHERE NOT is_ponte) AS molecules_manquantes
  FROM mol_status_d
  GROUP BY med_id, med_nom, composition
)
SELECT med_id, med_nom, composition, molecules_pontees, molecules_manquantes
FROM agg_d
WHERE molecules_pontees IS NOT NULL
  AND molecules_manquantes IS NOT NULL;

-- =====================================================================
-- ÉTAPE C + E : Pont molécules → medicament_ingredients
-- Uniquement ingrédients PARLANTS (anti-faux-vert garanti)
-- Recherche : ansm_substance_ingredient (primaire) → ingredients.name_en (fallback)
-- =====================================================================
INSERT INTO medicament_ingredients (medicament_id, ingredient_id)
WITH
known_aliases (fr_norm, en_norm) AS (
  VALUES
    ('paracetamol',    'acetaminophen'),
    ('acetaminophene', 'acetaminophen'),
    ('glibenclamide',  'glyburide'),
    ('trinitrine',     'nitroglycerin'),
    ('thiamazole',     'methimazole'),
    ('acide folinique','leucovorin'),
    ('meclozine',      'meclizine'),
    ('meclocine',      'meclizine')
),
candidate_map AS (
  SELECT DISTINCT ON (m.id)
    m.id AS med_id,
    s.composition
  FROM medicament_ma_staging s
  JOIN medicaments m
    ON drug_name_normalize(m.nom)
       LIKE drug_name_normalize(split_part(s.nom_complet, ',', 1)) || '%'
  WHERE m.pays = 'MA'
    AND NOT EXISTS (
      SELECT 1 FROM medicament_ingredients mi WHERE mi.medicament_id = m.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM mapping_quarantaine mq WHERE mq.medicament_id = m.id
    )
    AND s.composition NOT ILIKE '%homéopath%'
  ORDER BY m.id, length(split_part(s.nom_complet, ',', 1)) DESC
),
mol_raw AS (
  SELECT med_id, btrim(mol) AS mol
  FROM candidate_map,
       unnest(string_to_array(composition, '|')) AS mol
  WHERE btrim(mol) != ''
),
bases AS (
  SELECT med_id, mol, _base_dci(mol) AS base
  FROM mol_raw
),
valid_bases AS (
  SELECT med_id, mol, base
  FROM bases
  WHERE base IS NOT NULL
    AND base != ''
    AND NOT (base ILIKE 'de %')
    AND drug_name_normalize(base) != ALL(ARRAY[
      'sodium','potassium','sodium benzoate',
      'eau','glucose','eau purifiee','eau injectable',
      'stearate de magnesium','lactose'
    ])
),
bridged_ansm AS (
  SELECT vb.med_id, vb.mol, asi.ingredient_id
  FROM valid_bases vb
  JOIN ansm_substance_ingredient asi
    ON drug_name_normalize(asi.substance) = drug_name_normalize(vb.base)
  WHERE asi.ingredient_id IS NOT NULL
),
bridged_fallback AS (
  SELECT vb.med_id, vb.mol, i.id AS ingredient_id
  FROM valid_bases vb
  LEFT JOIN known_aliases ka
    ON drug_name_normalize(ka.fr_norm) = drug_name_normalize(vb.base)
  JOIN ingredients i
    ON drug_name_normalize(i.name_en) = COALESCE(
         drug_name_normalize(ka.en_norm),
         drug_name_normalize(vb.base)
       )
  WHERE NOT EXISTS (
    SELECT 1 FROM ansm_substance_ingredient asi2
    WHERE drug_name_normalize(asi2.substance) = drug_name_normalize(vb.base)
      AND asi2.ingredient_id IS NOT NULL
  )
),
bridged_all AS (
  SELECT med_id, mol, ingredient_id FROM bridged_ansm
  UNION ALL
  SELECT med_id, mol, ingredient_id FROM bridged_fallback
),
parlant AS (
  SELECT DISTINCT b.med_id, b.ingredient_id
  FROM bridged_all b
  WHERE (
    EXISTS (
      SELECT 1 FROM interactions_ingredients ii
      WHERE ii.ingredient_1 = b.ingredient_id
         OR ii.ingredient_2 = b.ingredient_id
    )
    OR EXISTS (
      SELECT 1 FROM v_ingredient_entites v
      JOIN ansm_regles r
        ON r.entite_a = v.entite OR r.entite_b = v.entite
      WHERE v.ingredient_id = b.ingredient_id
    )
  )
)
SELECT med_id, ingredient_id
FROM parlant
ON CONFLICT DO NOTHING;
