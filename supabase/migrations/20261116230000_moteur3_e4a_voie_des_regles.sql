-- Sprint MOTEUR-3, étape 4 (A) — voie des règles, activation du lot « voies locales », entités ANSM visant une forme locale.
-- GÉNÉRÉ par bdpm/moteur3/scripts/gen_e4_filtre.py — ne pas modifier à la main.
-- Sources : project/scripts/data/moteur3_e4_voies_regles.tsv (3505 règles, staging lot 42, empreinte b1f6e89ce5ebd080080b2787522dbc82) ;
--           project/scripts/data/moteur3_e4_voies_rcp.tsv (1514 spécialités BDPM de voie locale, staging lot 43, empreinte c00a165f609b7095c398069483053800).
-- Empreinte de l'état final de contraindications (clé | voie | voie_stricte | active) : b38f987f4d1ced6706c22e197bb59b5c (6073 lignes, 5814 actives).
--
-- contraindications.voie : « generale » (RCP oral, injectable, rectal, transdermique), une voie locale, « generale,<locale> », ou NULL (règle sans RCP).
-- contraindications.voie_stricte : la règle ne vaut QUE pour une fiche de cette voie (les 64 lignes du lot local ; 62 sont activées ici,
--   2 restent neutralisées : doublons d'une ligne déjà sourcée par un RCP de la même voie).
-- interactions_rcp.voie : voie du RCP source si elle est locale (NULL = voie générale). ansm_entites_voies : entités du thésaurus qui visent explicitement une forme locale.
-- Le filtre lui-même est dans le client (src/lib/voieEngine.ts) et dans check_interactions_v2 (migration B).

alter table public.contraindications add column if not exists voie_stricte boolean not null default false;
comment on column public.contraindications.voie_stricte is 'MOTEUR-3 — vrai : la règle ne vaut que pour une fiche dont la voie d''administration est celle de la règle.';
alter table public.interactions_rcp add column if not exists voie text;
comment on column public.interactions_rcp.voie is 'MOTEUR-3 — voie du RCP source quand elle est locale (cutanee, ophtalmique, inhalee, nasale, vaginale, buccale, auriculaire) ; NULL = voie générale.';
create table if not exists public.ansm_entites_voies (
  entite text primary key,
  voies  text[] not null check (cardinality(voies) > 0),
  motif  text not null
);
alter table public.ansm_entites_voies enable row level security;
comment on table public.ansm_entites_voies is 'MOTEUR-3 — entités du thésaurus ANSM dont les règles s''appliquent aussi à une forme locale de ces voies (lu par check_interactions_v2).';

do $$
declare n int; e text; k constant text := 'MOTEUR-3 — règle propre à une voie locale : en attente de l’activation du filtre de voie (étape 4)';
begin
  select count(*), md5(string_agg(t, chr(10) order by seq)) into n, e from bdpm2d_staging where lot = 42;
  if n <> 3505 or e is distinct from 'b1f6e89ce5ebd080080b2787522dbc82' then raise exception 'MOTEUR-3 E4A : staging lot 42 ≠ source (%, %)', n, e; end if;
  select count(*), md5(string_agg(t, chr(10) order by seq)) into n, e from bdpm2d_staging where lot = 43;
  if n <> 1514 or e is distinct from 'c00a165f609b7095c398069483053800' then raise exception 'MOTEUR-3 E4A : staging lot 43 ≠ source (%, %)', n, e; end if;
  if exists (select 1 from contraindications where voie is not null and coalesce(bdpm_ref, '') not like 'm3:%')
     or (select count(*) from contraindications where bdpm_ref like 'm3:%' and exclue_motif = k and not voie_stricte) <> 64
     or exists (select 1 from interactions_rcp where voie is not null) then
    raise exception 'MOTEUR-3 E4A : état de départ inattendu';
  end if;

  -- clé d'une ligne : sa référence pour les lignes écrites par 2c-bis / 2d, son id sinon (même clé que BDPM-2d)
  update contraindications c set voie = split_part(s.t, chr(9), 2)
    from bdpm2d_staging s
   where s.lot = 42 and split_part(s.t, chr(9), 1) = (case when c.bdpm_ref like '2cbis:%' or c.bdpm_ref like '2d:%' then c.bdpm_ref else c.id::text end);
  get diagnostics n = row_count;
  if n <> 3505 then raise exception 'MOTEUR-3 E4A : % règles reçoivent une voie (attendu 3505)', n; end if;
  update contraindications set voie_stricte = true,
         exclue_motif = case bdpm_ref
           when 'm3:gr:3333:18394234' then 'MOTEUR-3 — doublon de la ligne 2cbis:2a8a5dc7:824cd300 (même molécule, même voie, même condition, même sévérité)'
           when 'm3:ci:9130:087f21a1' then 'MOTEUR-3 — doublon de la ligne 2d:12906da2:d3f15013 (même molécule, même voie, même condition, même sévérité)'
           else null end
   where bdpm_ref like 'm3:%' and exclue_motif = k;

  -- interactions_rcp.voie : NULL = RCP de voie générale (aucune réécriture des 35 000 lignes) ; voie locale sinon
  update interactions_rcp r set voie = m.v
    from (select split_part(t, chr(9), 1)::bigint cis, split_part(t, chr(9), 2) v from bdpm2d_staging where lot = 43) m
   where m.cis = r.source_cis;

  insert into ansm_entites_voies (entite, voies, motif) values
    ('beta-bloquants (sauf esmolol et sotalol) (y compris collyres)', array['ophtalmique'], 'thésaurus ANSM : « y compris collyres »'),
    ('beta-bloquants (sauf esmolol) (y compris collyres)', array['ophtalmique'], 'thésaurus ANSM : « y compris collyres »'),
    ('beta-bloquants non cardio-selectifs (y compris collyres)', array['ophtalmique'], 'thésaurus ANSM : « y compris collyres »'),
    ('corticoides metabolises, notamment inhales', array['inhalee', 'nasale'], 'thésaurus ANSM : « notamment inhalés » (voie nasale assimilée)'),
    ('sympathomimetiques alpha (voies orale et/ou nasale)', array['nasale'], 'thésaurus ANSM : « voies orale et/ou nasale »'),
    ('econazole', array['cutanee', 'vaginale'], 'thésaurus ANSM : « quelle que soit la voie d’administration de l’éconazole »'),
    ('medicaments utilises par voie vaginale', array['vaginale'], 'thésaurus ANSM : traitement local vaginal');
  if (select count(*) from ansm_entites_voies v where exists (select 1 from ansm_regles r where r.entite_a = v.entite or r.entite_b = v.entite)) <> 7 then
    raise exception 'MOTEUR-3 E4A : une entité de ansm_entites_voies est absente de ansm_regles';
  end if;

  -- contrôles « base = source »
  select count(*), md5(string_agg(x.l, chr(10) order by x.l collate "C")) into n, e from (
    select (case when bdpm_ref like 'm3:%' or bdpm_ref like '2cbis:%' or bdpm_ref like '2d:%' then bdpm_ref else id::text end) || '|' || coalesce(voie, '') || '|' || voie_stricte::text || '|' || (exclue_motif is null)::text l
    from contraindications) x;
  if n <> 6073 or e is distinct from 'b38f987f4d1ced6706c22e197bb59b5c' then raise exception 'MOTEUR-3 E4A : contraindications ≠ source (%, %)', n, e; end if;
  if exists (select 1 from interactions_rcp r
             left join (select split_part(t, chr(9), 1)::bigint cis, split_part(t, chr(9), 2) v from bdpm2d_staging where lot = 43) m on m.cis = r.source_cis
             where r.voie is distinct from m.v) then
    raise exception 'MOTEUR-3 E4A : interactions_rcp.voie ≠ source';
  end if;
end $$;
