-- BDPM-2d — référentiel : 103 concepts dans pathologies_curees, 182 formulations dans ci_condition_concepts,
-- 6 formulations « sans concept » rattachées à un concept créé. Validé le 2026-11-11 après ⛔ STOP (synonymes ambigus retirés).
-- GÉNÉRÉ par bdpm/2d/scripts/gen_migrations_2d.py depuis project/scripts/data/bdpm2d.json — ne pas modifier à la main.
-- Données : public.bdpm2d_staging, lot 0 (291 enregistrements). Empreintes de départ et d'arrivée = fixture du projet
-- (src/lib/ci_condition_concepts.data.json, scripts/gen_ci_condition_concepts.mjs) : la base et l'application lisent le même référentiel.
select public.bdpm2d_referentiel(291, 'c82161994b5d792e9d7dcc232112f9ee',
  '24e3557742b394272ccb0c9c47dd2358', 'b54401a7237def01c330e57dd10aa517',
  475, '41a59d87300bbb822c378766ae02992d', 530, '5d0d68564186daffc1966d9dd94353a3');
