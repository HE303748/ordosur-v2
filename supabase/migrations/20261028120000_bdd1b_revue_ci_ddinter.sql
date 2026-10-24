-- Sprint BDD-1b — Contre-indications DDInter du second import mises en revue (revue_requise = true).
-- GÉNÉRÉ par scripts/gen_bdd1b_revue_ci.mjs — ne pas éditer à la main.
-- Empreinte de la source : daefebe53d9a847e7d4c2a60d30ebf23
--
-- 15 lignes « contre_indication » qui se propageaient au groupe d'équivalence depuis BDD-1 vers de
-- nouvelles paires de spécialités MA. Elles redeviennent comparées sur les liens directs (cartes d'avant BDD-1).
-- Aucune sévérité, description, liaison ni ligne n'est modifiée ou supprimée.

create temp table _bdd1b (a text not null, b text not null);
insert into _bdd1b (a, b) values
  ('amoxicillin', 'esomeprazole magnesium'),
  ('ciprofloxacin', 'tizanidine'),
  ('efavirenz', 'rifampin'),
  ('esomeprazole magnesium', 'clarithromycin'),
  ('esomeprazole magnesium', 'rifampin'),
  ('iron', 'deferasirox'),
  ('ketoconazole', 'rifampin'),
  ('rifampin', 'clopidogrel'),
  ('rifampin', 'haloperidol'),
  ('rifampin', 'lansoprazole'),
  ('rifampin', 'omeprazole'),
  ('rifampin', 'sofosbuvir'),
  ('rifampin', 'theophylline'),
  ('rifampin', 'ticagrelor'),
  ('voriconazole', 'rifampin');

-- 1. État de départ : chaque paire existe une seule fois, en contre_indication, pas encore en revue.
do $$
declare v_n int; v_revue int;
begin
  select count(*) into v_revue from interactions_ingredients where revue_requise;
  if v_revue <> 53 then
    raise exception 'BDD-1b : % lignes revue_requise au départ au lieu de 53 — STOP', v_revue;
  end if;
  select count(*) into v_n
  from _bdd1b s
  join ingredients ia on ia.name_en = s.a
  join ingredients ib on ib.name_en = s.b
  join interactions_ingredients ii
    on ii.ingredient_1 = least(ia.id, ib.id) and ii.ingredient_2 = greatest(ia.id, ib.id)
  where ii.severite = 'contre_indication' and not ii.revue_requise;
  if v_n <> 15 then
    raise exception 'BDD-1b : % lignes trouvées à l''état attendu au lieu de 15 — STOP', v_n;
  end if;
end $$;

-- 2. Mise en revue (seule colonne touchée).
update interactions_ingredients ii set revue_requise = true
from _bdd1b s
join ingredients ia on ia.name_en = s.a
join ingredients ib on ib.name_en = s.b
where ii.ingredient_1 = least(ia.id, ib.id) and ii.ingredient_2 = greatest(ia.id, ib.id)
  and ii.severite = 'contre_indication';

-- 3. Contrôles finaux « base = source » (sinon tout est annulé).
do $$
declare v_empreinte text; v_revue int;
begin
  select md5(string_agg(k, E'\n' order by k collate "C")) into v_empreinte
  from (
    select case when ia.name_en collate "C" <= ib.name_en collate "C"
                then ia.name_en || '|' || ib.name_en else ib.name_en || '|' || ia.name_en end as k
    from _bdd1b s
    join ingredients ia on ia.name_en = s.a
    join ingredients ib on ib.name_en = s.b
    join interactions_ingredients ii
      on ii.ingredient_1 = least(ia.id, ib.id) and ii.ingredient_2 = greatest(ia.id, ib.id)
    where ii.revue_requise and ii.severite = 'contre_indication'
  ) t;
  if v_empreinte is distinct from 'daefebe53d9a847e7d4c2a60d30ebf23' then
    raise exception 'BDD-1b : empreinte base (%) ≠ source (daefebe53d9a847e7d4c2a60d30ebf23)', v_empreinte;
  end if;
  select count(*) into v_revue from interactions_ingredients where revue_requise;
  if v_revue <> 68 then
    raise exception 'BDD-1b : % lignes revue_requise au lieu de 68', v_revue;
  end if;
end $$;

drop table _bdd1b;
