-- chembl_batch_051.sql (2 rows)
INSERT INTO medicaments (nom, dci, forme, voie_administration, pays, classe_therapeutique)
SELECT v.nom, v.dci, v.forme, v.voie, v.pays, v.classe
FROM (VALUES
('FECAL MICROBIOTA SPORES, LIVE','fecal microbiota spores, live',NULL,NULL,'INT',NULL),
('TECHNETIUM SESTAMIBI','technetium sestamibi',NULL,NULL,'INT',NULL)
) AS v(nom, dci, forme, voie, pays, classe)
WHERE NOT EXISTS (
  SELECT 1 FROM medicaments m WHERE LOWER(m.nom) = LOWER(v.nom)
);
