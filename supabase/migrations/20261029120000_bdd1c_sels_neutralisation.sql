-- Sprint BDD-1c — sels regroupés + neutralisation des « contre-indications » contradictoires du second import DDInter.
-- GÉNÉRÉ par scripts/gen_bdd1c_neutralisation.mjs — ne pas éditer à la main.
-- Empreinte du référentiel (BDD-1 + BDD-1c) : a7f1030569669007938650c04c75865e
-- Empreinte de la neutralisation : b2168147ddc1b4d874e43dd808ff8b02
-- Empreinte de la mise en revue : 4f32e19fddf3b5fc0b6a4d6a718ce31a
--
-- 3 groupes de sels · 44 lignes mises en revue · 31 lignes neutralisées (exclue_motif).
-- Aucune suppression ; sévérités, descriptions et liens inchangés. Réversible :
--   update interactions_ingredients set exclue_motif = null where exclue_motif like '% — BDD-1c';

create temp table _sels (canon text not null, membre text not null);
insert into _sels values
  ('esomeprazole', 'esomeprazole magnesium'),
  ('esomeprazole', 'esomeprazole magnesium dihydrate'),
  ('vardenafil', 'vardenafil trihydrate'),
  ('clopidogrel', 'clopidogrel bisulfate');

create temp table _revue (a text not null, b text not null);
insert into _revue values
  ('antacids', 'vardenafil trihydrate'),
  ('aspirin', 'vardenafil trihydrate'),
  ('clopidogrel bisulfate', 'lansoprazole'),
  ('clopidogrel bisulfate', 'warfarin'),
  ('dabigatran', 'vardenafil trihydrate'),
  ('esomeprazole magnesium', 'atazanavir'),
  ('esomeprazole magnesium', 'citalopram'),
  ('esomeprazole magnesium', 'clopidogrel'),
  ('esomeprazole magnesium', 'digoxin'),
  ('esomeprazole magnesium', 'itraconazole'),
  ('esomeprazole magnesium', 'methotrexate'),
  ('esomeprazole magnesium', 'mycophenolate'),
  ('esomeprazole magnesium', 'ritonavir'),
  ('esomeprazole magnesium', 'tacrolimus'),
  ('esomeprazole magnesium', 'warfarin'),
  ('esomeprazole magnesium dihydrate', 'atazanavir'),
  ('esomeprazole magnesium dihydrate', 'citalopram'),
  ('esomeprazole magnesium dihydrate', 'clopidogrel'),
  ('esomeprazole magnesium dihydrate', 'digoxin'),
  ('esomeprazole magnesium dihydrate', 'itraconazole'),
  ('esomeprazole magnesium dihydrate', 'methotrexate'),
  ('esomeprazole magnesium dihydrate', 'mycophenolate'),
  ('esomeprazole magnesium dihydrate', 'ritonavir'),
  ('esomeprazole magnesium dihydrate', 'tacrolimus'),
  ('esomeprazole magnesium dihydrate', 'warfarin'),
  ('insulin', 'vardenafil trihydrate'),
  ('iron', 'esomeprazole magnesium'),
  ('iron', 'esomeprazole magnesium dihydrate'),
  ('ketoconazole', 'esomeprazole magnesium'),
  ('ketoconazole', 'esomeprazole magnesium dihydrate'),
  ('magnesium', 'vardenafil trihydrate'),
  ('morphine', 'clopidogrel bisulfate'),
  ('nifedipine', 'vardenafil trihydrate'),
  ('nitroglycerin', 'vardenafil trihydrate'),
  ('pantoprazole', 'clopidogrel bisulfate'),
  ('ranitidine', 'vardenafil trihydrate'),
  ('rifampin', 'clopidogrel bisulfate'),
  ('tamsulosin', 'vardenafil trihydrate'),
  ('vardenafil trihydrate', 'alcohol'),
  ('vardenafil trihydrate', 'cimetidine'),
  ('vardenafil trihydrate', 'digoxin'),
  ('vardenafil trihydrate', 'warfarin'),
  ('voriconazole', 'esomeprazole magnesium'),
  ('voriconazole', 'esomeprazole magnesium dihydrate');

create temp table _neut (a text not null, b text not null, src text not null, motif text not null);
insert into _neut values
  ('alcohol', 'sodium oxybate', 'orig', 'Second import DDInter contredit par DDInter d''origine — BDD-1c'),
  ('alcohol', 'trimethobenzamide', 'orig', 'Second import DDInter contredit par DDInter d''origine — BDD-1c'),
  ('clopidogrel bisulfate', 'esomeprazole', 'orig', 'Second import DDInter contredit par DDInter d''origine — BDD-1c'),
  ('clopidogrel bisulfate', 'omeprazole', 'orig', 'Second import DDInter contredit par DDInter d''origine — BDD-1c'),
  ('efavirenz', 'rifampin', 'ansm', 'Second import DDInter contredit par ANSM — BDD-1c'),
  ('efavirenz', 'voriconazole', 'ansm', 'Second import DDInter contredit par ANSM — BDD-1c'),
  ('escitalopram', 'linezolid', 'ansm', 'Second import DDInter contredit par ANSM — BDD-1c'),
  ('esomeprazole magnesium', 'clarithromycin', 'orig', 'Second import DDInter contredit par DDInter d''origine — BDD-1c'),
  ('esomeprazole magnesium', 'rifampin', 'orig', 'Second import DDInter contredit par DDInter d''origine — BDD-1c'),
  ('esomeprazole magnesium dihydrate', 'clarithromycin', 'orig', 'Second import DDInter contredit par DDInter d''origine — BDD-1c'),
  ('esomeprazole magnesium dihydrate', 'rifampin', 'orig', 'Second import DDInter contredit par DDInter d''origine — BDD-1c'),
  ('itraconazole', 'rifampin', 'ansm', 'Second import DDInter contredit par ANSM — BDD-1c'),
  ('ketoconazole', 'rifampin', 'orig+ansm', 'Second import DDInter contredit par DDInter d''origine + ANSM — BDD-1c'),
  ('linezolid', 'paroxetine', 'ansm', 'Second import DDInter contredit par ANSM — BDD-1c'),
  ('linezolid', 'venlafaxine', 'ansm', 'Second import DDInter contredit par ANSM — BDD-1c'),
  ('ranolazine', 'carbamazepine', 'ansm', 'Second import DDInter contredit par ANSM — BDD-1c'),
  ('ranolazine', 'phenobarbital', 'ansm', 'Second import DDInter contredit par ANSM — BDD-1c'),
  ('ranolazine', 'phenytoin', 'ansm', 'Second import DDInter contredit par ANSM — BDD-1c'),
  ('ranolazine', 'rifampin', 'ansm', 'Second import DDInter contredit par ANSM — BDD-1c'),
  ('rifampin', 'clopidogrel', 'orig', 'Second import DDInter contredit par DDInter d''origine — BDD-1c'),
  ('rifampin', 'haloperidol', 'ansm', 'Second import DDInter contredit par ANSM — BDD-1c'),
  ('rifampin', 'lansoprazole', 'orig', 'Second import DDInter contredit par DDInter d''origine — BDD-1c'),
  ('rifampin', 'omeprazole', 'orig', 'Second import DDInter contredit par DDInter d''origine — BDD-1c'),
  ('rifampin', 'theophylline', 'orig+ansm', 'Second import DDInter contredit par DDInter d''origine + ANSM — BDD-1c'),
  ('rifampin', 'ticagrelor', 'orig+ansm', 'Second import DDInter contredit par DDInter d''origine + ANSM — BDD-1c'),
  ('rifampin', 'warfarin', 'orig+ansm', 'Second import DDInter contredit par DDInter d''origine + ANSM — BDD-1c'),
  ('sertraline', 'linezolid', 'ansm', 'Second import DDInter contredit par ANSM — BDD-1c'),
  ('st. john''s wort', 'lansoprazole', 'orig+ansm', 'Second import DDInter contredit par DDInter d''origine + ANSM — BDD-1c'),
  ('voriconazole', 'ritonavir', 'ansm', 'Second import DDInter contredit par ANSM — BDD-1c'),
  ('amoxicillin', 'esomeprazole magnesium', 'rcp', 'Contredit par le RCP de l''ésoméprazole (indication éradication H. pylori en association avec amoxicilline) et par DDInter d''origine sur les autres IPP — BDD-1c'),
  ('amoxicillin', 'esomeprazole magnesium dihydrate', 'rcp', 'Contredit par le RCP de l''ésoméprazole (indication éradication H. pylori en association avec amoxicilline) et par DDInter d''origine sur les autres IPP — BDD-1c');

-- 1. État de départ.
do $$
declare v_n int;
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'interactions_ingredients' and column_name = 'exclue_motif') then
    raise exception 'BDD-1c : exclue_motif existe déjà — STOP';
  end if;
  if (select md5(string_agg(i.name_en || '|' || c.name_en, E'\n' order by i.name_en collate "C"))
      from ingredients i join ingredients c on c.id = i.canonical_id) is distinct from '3cfb7538a18df91430a457e2c84e82bd' then
    raise exception 'BDD-1c : le référentiel de départ n''est pas celui de BDD-1 — STOP';
  end if;
  select count(*) into v_n from ingredients where name_en in ('esomeprazole', 'esomeprazole magnesium', 'esomeprazole magnesium dihydrate', 'vardenafil', 'vardenafil trihydrate', 'clopidogrel', 'clopidogrel bisulfate') and canonical_id is null;
  if v_n <> 7 then raise exception 'BDD-1c : % substances à regrouper libres au lieu de 7 — STOP', v_n; end if;
  select count(*) into v_n from interactions_ingredients where revue_requise;
  if v_n <> 68 then raise exception 'BDD-1c : % lignes revue_requise au départ au lieu de 68 — STOP', v_n; end if;
  select count(*) into v_n from interactions_ingredients where severite = 'contre_indication' and description ~ ' × .* — Contre-indication : association déconseillée \(risque grave documenté\)\.$';
  if v_n <> 115 then raise exception 'BDD-1c : % lignes du second import au lieu de 115 — STOP', v_n; end if;
end $$;

-- 2. Regroupement des sels : les canoniques d'abord (trigger ingredients_canonical_guard), puis leurs membres.
update ingredients set canonical_id = id where name_en in (select distinct canon from _sels);
update ingredients i set canonical_id = c.id
from _sels s join ingredients c on c.name_en = s.canon
where i.name_en = s.membre;

-- 3. Colonne exclue_motif : ajout de métadonnées uniquement (pas de valeur par défaut) ; table réécrite → STOP.
do $$
declare v_avant oid; v_apres oid;
begin
  v_avant := pg_relation_filenode('public.interactions_ingredients');
  alter table interactions_ingredients add column exclue_motif text;
  v_apres := pg_relation_filenode('public.interactions_ingredients');
  if v_avant is distinct from v_apres then
    raise exception 'BDD-1c : interactions_ingredients a été réécrite par l''ajout de exclue_motif — STOP';
  end if;
end $$;
comment on column interactions_ingredients.exclue_motif is
  'BDD-1c — NULL = ligne active. Non NULL = ligne neutralisée (motif), ignorée par check_interactions_v2 et v_ingredient_parlant. Jamais supprimée.';

-- 4. Mise en revue des lignes du second import (hors contre-indication) sur les sels regroupés.
do $$
declare v_n int;
begin
  select count(*) into v_n
  from _revue s
  join ingredients ia on ia.name_en = s.a join ingredients ib on ib.name_en = s.b
  join interactions_ingredients ii on ii.ingredient_1 = least(ia.id, ib.id) and ii.ingredient_2 = greatest(ia.id, ib.id)
  where not ii.revue_requise and ii.severite <> 'contre_indication' and ii.description ~ ' × .* — ';
  if v_n <> 44 then raise exception 'BDD-1c : % lignes à mettre en revue trouvées au lieu de 44 — STOP', v_n; end if;
end $$;
update interactions_ingredients ii set revue_requise = true
from _revue s join ingredients ia on ia.name_en = s.a join ingredients ib on ib.name_en = s.b
where ii.ingredient_1 = least(ia.id, ib.id) and ii.ingredient_2 = greatest(ia.id, ib.id);

-- 5. Neutralisation, avec garde-fou (après regroupement : paires canoniques à jour).
do $$
declare r record; v_orig boolean; v_ansm boolean; v_ci boolean;
begin
  for r in
    select s.*, ii.ingredient_1 i1, ii.ingredient_2 i2, ii.severite, ii.description,
      array(select x.id from ingredients x where x.id = ia.id or x.canonical_id = ia.canonical_id) ga,
      array(select x.id from ingredients x where x.id = ib.id or x.canonical_id = ib.canonical_id) gb
    from _neut s
    join ingredients ia on ia.name_en = s.a join ingredients ib on ib.name_en = s.b
    left join interactions_ingredients ii on ii.ingredient_1 = least(ia.id, ib.id) and ii.ingredient_2 = greatest(ia.id, ib.id)
  loop
    if r.i1 is null or r.severite <> 'contre_indication' or r.description !~ ' × .* — Contre-indication : association déconseillée \(risque grave documenté\)\.$' then
      raise exception 'BDD-1c : % × % n''est pas une ligne contre_indication du second import — STOP', r.a, r.b;
    end if;
    continue when r.src = 'rcp';
    select exists (select 1 from interactions_ingredients o
                   where ((o.ingredient_1 = any(r.ga) and o.ingredient_2 = any(r.gb)) or (o.ingredient_1 = any(r.gb) and o.ingredient_2 = any(r.ga)))
                     and o.exclue_motif is null and o.description ~ '^(Interaction (majeure|modérée|mineure) |Interaction entre )') into v_orig;
    select exists (select 1 from v_ingredient_entites ea join v_ingredient_entites eb on true
                   join ansm_regles x on x.entite_a = least(ea.entite, eb.entite) and x.entite_b = greatest(ea.entite, eb.entite)
                   where ea.ingredient_id = any(r.ga) and eb.ingredient_id = any(r.gb)) into v_ansm;
    -- Une autre source qui CONFIRME la contre-indication interdit la neutralisation (catégorie C3).
    select exists (select 1 from v_ingredient_entites ea join v_ingredient_entites eb on true
                   join ansm_regles x on x.entite_a = least(ea.entite, eb.entite) and x.entite_b = greatest(ea.entite, eb.entite)
                   where ea.ingredient_id = any(r.ga) and eb.ingredient_id = any(r.gb) and x.niveau = 'contre_indiquee')
        or exists (select 1 from interactions_ingredients o
                   where ((o.ingredient_1 = any(r.ga) and o.ingredient_2 = any(r.gb)) or (o.ingredient_1 = any(r.gb) and o.ingredient_2 = any(r.ga)))
                     and not (o.ingredient_1 = r.i1 and o.ingredient_2 = r.i2)
                     and o.exclue_motif is null and o.severite = 'contre_indication' and o.description !~ ' × .* — ') into v_ci;
    if v_ci then raise exception 'BDD-1c : % × % est confirmée par une autre source (C3) — STOP', r.a, r.b; end if;
    if (r.src in ('orig', 'orig+ansm') and not v_orig) or (r.src in ('ansm', 'orig+ansm') and not v_ansm) then
      raise exception 'BDD-1c : % × % — la source déclarée (%) ne couvre pas la paire — STOP', r.a, r.b, r.src;
    end if;
  end loop;
end $$;
update interactions_ingredients ii set exclue_motif = s.motif
from _neut s join ingredients ia on ia.name_en = s.a join ingredients ib on ib.name_en = s.b
where ii.ingredient_1 = least(ia.id, ib.id) and ii.ingredient_2 = greatest(ia.id, ib.id);

-- 6. RPC : texte de BDD-1, une seule clause ajoutée (ligne neutralisée ignorée).
create or replace function public.check_interactions_v2(p_med_ids uuid[])
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
DECLARE v_i jsonb; v_nv jsonb; v_ok jsonb;
BEGIN
  WITH med_can AS MATERIALIZED (
    SELECT DISTINCT mi.medicament_id, m.nom, COALESCE(i.canonical_id, i.id) AS cid
    FROM medicament_ingredients mi
    JOIN medicaments m ON m.id = mi.medicament_id
    JOIN ingredients i ON i.id = mi.ingredient_id
    WHERE mi.medicament_id = ANY(p_med_ids)
  ),
  med_x AS MATERIALIZED (
    SELECT mc.medicament_id, mc.nom, mc.cid, c.name_en, g.id AS ingredient_id,
      EXISTS (SELECT 1 FROM medicament_ingredients d
              WHERE d.medicament_id = mc.medicament_id AND d.ingredient_id = g.id) AS direct
    FROM med_can mc
    JOIN ingredients c ON c.id = mc.cid
    CROSS JOIN LATERAL (
      SELECT mc.cid AS id
      UNION
      SELECT x.id FROM ingredients x WHERE x.canonical_id = mc.cid
    ) g
  ),
  ansm AS (
    SELECT DISTINCT ON (a.medicament_id, b.medicament_id)
      a.nom AS nom_a, b.nom AS nom_b, a.name_en AS ing_a, b.name_en AS ing_b,
      CASE r.niveau WHEN 'contre_indiquee' THEN 'majeure'
                    WHEN 'deconseillee' THEN 'majeure'
                    WHEN 'precaution' THEN 'moderee'
                    ELSE 'mineure' END AS severite,
      r.niveau AS niveau_ansm, r.description, 'ANSM'::text AS source,
      a.medicament_id AS ma, b.medicament_id AS mb,
      CASE r.niveau WHEN 'contre_indiquee' THEN 4 WHEN 'deconseillee' THEN 4
                    WHEN 'precaution' THEN 3 ELSE 2 END AS rang
    FROM med_x a
    JOIN med_x b ON a.medicament_id < b.medicament_id AND a.cid <> b.cid
    JOIN v_ingredient_entites ea ON ea.ingredient_id = a.ingredient_id
    JOIN v_ingredient_entites eb ON eb.ingredient_id = b.ingredient_id
    JOIN ansm_regles r
      ON r.entite_a = LEAST(ea.entite, eb.entite) AND r.entite_b = GREATEST(ea.entite, eb.entite)
    ORDER BY a.medicament_id, b.medicament_id,
      CASE r.niveau WHEN 'contre_indiquee' THEN 4 WHEN 'deconseillee' THEN 3
                    WHEN 'precaution' THEN 2 ELSE 1 END DESC,
      r.entite_a, r.entite_b
  ),
  ddi_c AS (
    SELECT DISTINCT ON (a.medicament_id, b.medicament_id, LEAST(a.cid, b.cid), GREATEST(a.cid, b.cid))
      a.nom AS nom_a, b.nom AS nom_b, a.name_en AS ing_a, b.name_en AS ing_b,
      ii.severite, ii.description, a.medicament_id AS ma, b.medicament_id AS mb,
      CASE ii.severite WHEN 'contre_indication' THEN 5 WHEN 'majeure' THEN 4
                       WHEN 'moderee' THEN 3 WHEN 'mineure' THEN 2 ELSE 1 END AS rang
    FROM med_x a
    JOIN med_x b ON a.medicament_id < b.medicament_id AND a.cid <> b.cid
    JOIN interactions_ingredients ii
      ON ii.ingredient_1 = LEAST(a.ingredient_id, b.ingredient_id)
     AND ii.ingredient_2 = GREATEST(a.ingredient_id, b.ingredient_id)
    WHERE ii.exclue_motif IS NULL
      AND (NOT ii.revue_requise OR (a.direct AND b.direct))
    ORDER BY a.medicament_id, b.medicament_id, LEAST(a.cid, b.cid), GREATEST(a.cid, b.cid),
      CASE ii.severite WHEN 'contre_indication' THEN 5 WHEN 'majeure' THEN 4
                       WHEN 'moderee' THEN 3 WHEN 'mineure' THEN 2 ELSE 1 END DESC,
      ii.revue_requise, ii.description
  ),
  ddi AS (
    SELECT d.nom_a, d.nom_b, d.ing_a, d.ing_b, d.severite, NULL::text AS niveau_ansm, d.description,
      'DDInter'::text AS source
    FROM ddi_c d
    WHERE NOT EXISTS (SELECT 1 FROM ansm x WHERE x.ma = d.ma AND x.mb = d.mb AND x.rang >= d.rang)
  ),
  cumul AS (
    SELECT DISTINCT a.nom AS nom_a, b.nom AS nom_b, a.name_en AS ing_a, b.name_en AS ing_b,
      'majeure'::text AS severite, 'cumul_classe'::text AS niveau_ansm,
      ('Association de deux medicaments de la meme classe a risque (' || ea.entite ||
       '). Cumul d''effets : risque majore. Conduite : verifier l''indication de cette association.')::text AS description,
      'Cumul'::text AS source
    FROM med_x a
    JOIN med_x b ON a.medicament_id < b.medicament_id AND a.cid <> b.cid
    JOIN v_ingredient_entites ea ON ea.ingredient_id = a.ingredient_id
    JOIN v_ingredient_entites eb ON eb.ingredient_id = b.ingredient_id AND eb.entite = ea.entite
    WHERE ea.entite IN ('anticoagulants oraux','antivitamines k','antiagregants plaquettaires',
                        'substances susceptibles de donner des torsades de pointes',
                        'anti-inflammatoires non steroidiens',
                        'inhibiteurs de l''enzyme de conversion',
                        'antagonistes des recepteurs de l''angiotensine ii',
                        'medicaments a l''origine d''un syndrome serotoninergique',
                        'benzodiazepines et apparentes','morphiniques')
      AND NOT EXISTS (SELECT 1 FROM ansm x WHERE x.ma=a.medicament_id AND x.mb=b.medicament_id)
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'medicament_a',nom_a,'medicament_b',nom_b,'ingredient_a',ing_a,'ingredient_b',ing_b,
    'severite',severite,'niveau_ansm',niveau_ansm,'description',description,'source',source)),'[]'::jsonb)
  INTO v_i
  FROM (SELECT nom_a,nom_b,ing_a,ing_b,severite,niveau_ansm,description,source FROM ansm
        UNION ALL SELECT nom_a,nom_b,ing_a,ing_b,severite,niveau_ansm,description,source FROM ddi
        UNION ALL SELECT nom_a,nom_b,ing_a,ing_b,severite,niveau_ansm,description,source FROM cumul) t;

  SELECT COALESCE(jsonb_agg(m.nom),'[]'::jsonb) INTO v_nv FROM medicaments m
  WHERE m.id = ANY(p_med_ids)
    AND NOT EXISTS (SELECT 1 FROM medicament_ingredients mi WHERE mi.medicament_id=m.id);

  SELECT COALESCE(jsonb_agg(m.nom),'[]'::jsonb) INTO v_ok FROM medicaments m
  WHERE m.id = ANY(p_med_ids)
    AND EXISTS (SELECT 1 FROM medicament_ingredients mi WHERE mi.medicament_id=m.id);

  RETURN jsonb_build_object('interactions',v_i,'medicaments_verifies',v_ok,'medicaments_non_verifiables',v_nv);
END;
$function$;

-- 7. Vue : une ligne neutralisée ne rend plus une substance « parlante ».
create or replace view v_ingredient_parlant as
select i.id as ingredient_id, i.name_en
from ingredients i
where exists (
  select 1 from ingredients g
  where (g.id = i.id or g.canonical_id = i.canonical_id)
    and (g.sans_interaction_documentee
      or exists (select 1 from interactions_ingredients ii
                 where (ii.ingredient_1 = g.id or ii.ingredient_2 = g.id) and ii.exclue_motif is null)
      or exists (select 1 from v_ingredient_entites v
                 join ansm_regles r on r.entite_a = v.entite or r.entite_b = v.entite
                 where v.ingredient_id = g.id)
      or exists (select 1 from contraindications c
                 where unaccent(lower(g.name_en)) ~ unaccent(lower(c.dci_pattern))))
);


-- 8. Contrôles finaux « base = source » (sinon tout est annulé).
do $$
declare v text; v_n int;
begin
  select md5(string_agg(i.name_en || '|' || c.name_en, E'\n' order by i.name_en collate "C")) into v
  from ingredients i join ingredients c on c.id = i.canonical_id;
  if v is distinct from 'a7f1030569669007938650c04c75865e' then raise exception 'BDD-1c : empreinte du référentiel (%) ≠ source', v; end if;
  select md5(string_agg(k, E'\n' order by k collate "C")) into v from (
    select case when a.name_en collate "C" <= b.name_en collate "C" then a.name_en || '|' || b.name_en else b.name_en || '|' || a.name_en end
           || '|' || ii.exclue_motif as k
    from interactions_ingredients ii join ingredients a on a.id = ii.ingredient_1 join ingredients b on b.id = ii.ingredient_2
    where ii.exclue_motif is not null) t;
  if v is distinct from 'b2168147ddc1b4d874e43dd808ff8b02' then raise exception 'BDD-1c : empreinte de la neutralisation (%) ≠ source', v; end if;
  select md5(string_agg(k, E'\n' order by k collate "C")) into v from (
    select case when a.name_en collate "C" <= b.name_en collate "C" then a.name_en || '|' || b.name_en else b.name_en || '|' || a.name_en end as k
    from _revue s join ingredients a on a.name_en = s.a join ingredients b on b.name_en = s.b
    join interactions_ingredients ii on ii.ingredient_1 = least(a.id, b.id) and ii.ingredient_2 = greatest(a.id, b.id)
    where ii.revue_requise) t;
  if v is distinct from '4f32e19fddf3b5fc0b6a4d6a718ce31a' then raise exception 'BDD-1c : empreinte de la mise en revue (%) ≠ source', v; end if;
  select count(*) into v_n from interactions_ingredients where revue_requise;
  if v_n <> 112 then raise exception 'BDD-1c : % lignes revue_requise au lieu de 112', v_n; end if;
  select count(*) into v_n from interactions_ingredients where exclue_motif is not null;
  if v_n <> 31 then raise exception 'BDD-1c : % lignes neutralisées au lieu de 31', v_n; end if;
end $$;

drop table _sels;
drop table _revue;
drop table _neut;
