-- BDPM-2d, anomalie A4 (validée le 2026-11-15) : quatre entrées parasites du référentiel ingrédients (« contraceptif »,
-- « par extrapolation », « autres retinoides », « autres aminosides »). Aucune n'est reliée à un médicament : les lignes qui les
-- prennent pour partenaire ne se déclenchaient JAMAIS. Rattachement au vrai partenaire quand il existe, sinon neutralisation
-- réversible (exclue_motif). Aucune ligne supprimée. Liste : bdpm/2d/anomalies/a4_liste.csv. GÉNÉRÉ par bdpm/2d/scripts/gen_a4_2d.py.
--  1. « autres aminosides » → classe ANSM « aminosides » : 5 lignes RCP + la règle ANSM aminosides × autres aminosides (CI en cas
--     d'administration simultanée) qui ne se déclenchait pas.
--  2. « autres retinoides » → classe ANSM « retinoides » : 4 lignes RCP + la règle ANSM autres retinoides × retinoides (CI).
--  3. « contraceptif » : 16 précautions relues rattachées aux contraceptifs hormonaux (éthinylestradiol + progestatifs contraceptifs,
--     11 substances) ; 221 lignes neutralisées (8 CI clozapine non justifiées, 8 phrases sans objet, 205 « à prendre en compte »
--     en prose non relue) ; la ligne interactions_ingredients rifampicine × contraceptif est neutralisée (règle ANSM existante).
--  4. « par extrapolation » : 2 lignes rattachées (noradrénaline × IMAO-A, seul porteur du partenaire), 12 neutralisées (le partenaire
--     réel est porté par une autre ligne du même RCP) ; retrait du membre parasite de la classe « pamplemousse (jus et fruit) »
--     (restauration : insert into ansm_classe_membres values ('pamplemousse (jus et fruit)', 'par extrapolation')).
do $$
declare n int; e text; v uuid[]; r record;
begin
  -- état de départ
  for r in select niveau, count(*) as n, md5(string_agg(bdpm_ligne::text, ',' order by bdpm_ligne)) as e from public.interactions_rcp
            where partenaire_cids = array['ff9e69ea-235e-4f1c-9d74-9a40d109d394'::uuid] and exclue_motif is null group by niveau loop
    if (r.niveau, r.n, r.e) not in (('a_prendre_en_compte', 205, '613a80bf36e44222e89e42d9ededf8e4'), ('contre_indiquee', 8, '5756e68fe9f001540322b6d440abc3ed'), ('precaution', 24, '56940546b302950c3120d9da1d909c42')) then
      raise exception 'A4 : lignes « contraceptif » inattendues (%, %, %)', r.niveau, r.n, r.e;
    end if;
  end loop;
  select count(*) into n from public.interactions_rcp where exclue_motif is null and partenaire_cids && array['ff9e69ea-235e-4f1c-9d74-9a40d109d394'::uuid, '125befad-88af-4c8c-b4fe-767841483920'::uuid, '42e7e5db-4d57-48ba-816c-5c7905bfad64'::uuid, '8bc47e5f-1a66-4779-9ec2-39eef1c4e8b5'::uuid];
  if n <> 260 then raise exception 'A4 : % lignes actives à partenaire parasite, 260 attendues', n; end if;
  select count(*) into n from public.medicament_ingredients where ingredient_id in ('ff9e69ea-235e-4f1c-9d74-9a40d109d394', '125befad-88af-4c8c-b4fe-767841483920', '42e7e5db-4d57-48ba-816c-5c7905bfad64', '8bc47e5f-1a66-4779-9ec2-39eef1c4e8b5');
  if n <> 0 then raise exception 'A4 : % liens médicament inattendus', n; end if;
  select array_agg(id order by id), md5(string_agg(id::text, ',' order by id)) into v, e from (
    select distinct coalesce(i.canonical_id, i.id) as id from public.v_ingredient_entites x join public.ingredients i on i.id = x.ingredient_id
     where x.entite = 'progestatifs contraceptifs' or (x.entite = 'estroprogestatifs contraceptifs' and i.name_en !~* '^(o?estradiol|estradiol)')) t;
  if cardinality(v) <> 11 or e <> '1f50909f8c7799be9b5468f323bd9c8c' then raise exception 'A4 : contraceptifs hormonaux ≠ attendu (%, %)', cardinality(v), e; end if;

  -- 1 et 2 : classes réelles
  update public.interactions_rcp set partenaire_cids = '{}'::uuid[], partenaire_classe = 'aminosides', partenaire_libelle = 'aminosides' where partenaire_cids = array['8bc47e5f-1a66-4779-9ec2-39eef1c4e8b5'::uuid];
  get diagnostics n = row_count; if n <> 5 then raise exception 'A4 : aminosides %', n; end if;
  update public.interactions_rcp set partenaire_cids = '{}'::uuid[], partenaire_classe = 'retinoides', partenaire_libelle = 'retinoides' where partenaire_cids = array['42e7e5db-4d57-48ba-816c-5c7905bfad64'::uuid];
  get diagnostics n = row_count; if n <> 4 then raise exception 'A4 : rétinoïdes %', n; end if;
  update public.ansm_regles set entite_b = 'aminosides' where entite_a = 'aminosides' and entite_b = 'autres aminosides' and niveau = 'contre_indiquee';
  get diagnostics n = row_count; if n <> 1 then raise exception 'A4 : règle aminosides %', n; end if;
  update public.ansm_regles set entite_a = 'retinoides' where entite_a = 'autres retinoides' and entite_b = 'retinoides' and niveau = 'contre_indiquee';
  get diagnostics n = row_count; if n <> 1 then raise exception 'A4 : règle rétinoïdes %', n; end if;

  -- 3 : contraceptif
  update public.interactions_rcp set partenaire_cids = v, partenaire_libelle = 'contraceptifs hormonaux'
   where partenaire_cids = array['ff9e69ea-235e-4f1c-9d74-9a40d109d394'::uuid] and niveau = 'precaution' and bdpm_ligne in (3739, 21187, 21247, 23006, 23033, 23062, 10597, 31266, 31277, 31288, 24373, 7354, 27171, 25344, 25492, 25623);
  get diagnostics n = row_count; if n <> 16 then raise exception 'A4 : contraceptif rattaché %', n; end if;
  update public.interactions_rcp set exclue_motif = case when niveau = 'contre_indiquee' then 'Partenaire parasite « contraceptif » — niveau contre-indiqué non justifié par la phrase (inhibiteurs du CYP1A2), à relire' when niveau = 'precaution' then 'Partenaire parasite « contraceptif » — phrase négative, auto-référence ou sans conséquence clinique' else 'Partenaire parasite « contraceptif » — prose non relue, à reprendre au lot prose' end
   where partenaire_cids = array['ff9e69ea-235e-4f1c-9d74-9a40d109d394'::uuid] and exclue_motif is null
     and (niveau in ('contre_indiquee', 'a_prendre_en_compte') or (niveau = 'precaution' and bdpm_ligne in (22522, 1586, 16834, 16887, 16941, 466, 6389, 13625)));
  get diagnostics n = row_count; if n <> 221 then raise exception 'A4 : contraceptif neutralisé %', n; end if;
  update public.interactions_ingredients set exclue_motif = 'Partenaire parasite « contraceptif » — interaction portée par les règles ANSM (inducteurs enzymatiques × contraceptifs)' where 'ff9e69ea-235e-4f1c-9d74-9a40d109d394' in (ingredient_1, ingredient_2) and exclue_motif is null;
  get diagnostics n = row_count; if n <> 1 then raise exception 'A4 : interactions_ingredients %', n; end if;

  -- 4 : par extrapolation
  update public.interactions_rcp set partenaire_cids = '{}'::uuid[], partenaire_classe = 'imao-a reversibles, y compris oxazolidinones et bleu de methylene',
         partenaire_libelle = 'imao-a reversibles, y compris oxazolidinones et bleu de methylene'
   where partenaire_cids = array['125befad-88af-4c8c-b4fe-767841483920'::uuid] and bdpm_ligne in (32315, 32316);
  get diagnostics n = row_count; if n <> 2 then raise exception 'A4 : IMAO-A %', n; end if;
  update public.interactions_rcp set exclue_motif = 'Partenaire parasite « par extrapolation » (locution, pas une substance) — partenaire réel porté par une autre ligne du même RCP' where partenaire_cids = array['125befad-88af-4c8c-b4fe-767841483920'::uuid] and exclue_motif is null;
  get diagnostics n = row_count; if n <> 12 then raise exception 'A4 : par extrapolation neutralisé %', n; end if;
  delete from public.ansm_classe_membres where classe = 'pamplemousse (jus et fruit)' and substance = 'par extrapolation';
  get diagnostics n = row_count; if n <> 1 then raise exception 'A4 : membre de classe %', n; end if;

  -- état d'arrivée
  select count(*) into n from public.interactions_rcp where exclue_motif is null and partenaire_cids && array['ff9e69ea-235e-4f1c-9d74-9a40d109d394'::uuid, '125befad-88af-4c8c-b4fe-767841483920'::uuid, '42e7e5db-4d57-48ba-816c-5c7905bfad64'::uuid, '8bc47e5f-1a66-4779-9ec2-39eef1c4e8b5'::uuid];
  if n <> 0 then raise exception 'A4 : il reste % lignes actives à partenaire parasite', n; end if;
  select count(*) into n from public.ansm_regles where 'autres aminosides' in (entite_a, entite_b) or 'autres retinoides' in (entite_a, entite_b);
  if n <> 0 then raise exception 'A4 : il reste % règles ANSM sur une entité parasite', n; end if;
  select count(*) into n from public.ansm_regles; if n <> 1752 then raise exception 'A4 : % règles ANSM, 1752 attendues', n; end if;
  select count(*) into n from public.ansm_classe_membres; if n <> 2037 then raise exception 'A4 : % membres de classe, 2037 attendus', n; end if;
end $$;
