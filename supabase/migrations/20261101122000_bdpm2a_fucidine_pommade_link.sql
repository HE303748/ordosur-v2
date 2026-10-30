-- BDPM-2a Complément Partie 1 — Lien FUCIDINE POMMADE MA → acide fusidique
-- Sprint BDPM-2a, 2026-10-28
--
-- La session précédente avait signalé ce lien comme fait en base, mais il était
-- absent. FUCIDINE POMMADE à 2 % 1 TUBE 15 G (id 9f9843b3, MA, DCI=ACIDE FUSIDIQUE)
-- est liée ici à l'ingrédient "fusidic acid" (fbf4009d, canonical acide fusidique 49356406),
-- cohérent avec les autres fiches FUCIDINE (FUCIDINE 2%, Pommade / Crème FR).
--
-- Contrôle attendu :
--   SELECT array_agg(i.name_en) FROM medicament_ingredients mi
--   JOIN ingredients i ON i.id = mi.ingredient_id
--   WHERE mi.medicament_id = '9f9843b3-25e0-4324-a956-3bbb5f81ab13';
--   → {fusidic acid}

INSERT INTO medicament_ingredients (medicament_id, ingredient_id)
VALUES (
  '9f9843b3-25e0-4324-a956-3bbb5f81ab13',  -- FUCIDINE POMMADE à 2 % 1 TUBE 15 G (MA)
  'fbf4009d-2ad2-4aac-ab52-906a05a23787'   -- fusidic acid (canonical : acide fusidique 49356406)
)
ON CONFLICT DO NOTHING;
