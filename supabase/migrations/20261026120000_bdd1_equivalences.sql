-- Sprint BDD-1 — référentiel de substances unique : équivalences FR/EN, sels, promédicaments.
-- GÉNÉRÉ par scripts/gen_bdd1_equivalences.mjs — ne pas modifier à la main.
-- Empreinte de la source : 3cfb7538a18df91430a457e2c84e82bd
--
-- 159 groupes, 331 substances. Non destructif : aucun ingrédient réel supprimé, aucune ligne de
-- medicament_ingredients modifiée. check_interactions_v2 garde sa signature et son format de sortie.

-- 0. Source (canonique en premier dans chaque groupe)
create temp table _bdd1 as
select g.ord::int as grp, m.nom, (m.k = 1) as canon
from unnest(string_to_array($bdd1$diclofenac~diclofénac^omeprazole~oméprazole^metronidazole~métronidazole^paroxetine~paroxétine^furosemide~furosémide^fluoxetine~fluoxétine^carbamazepine~carbamazépine^codeine~codéine^enalapril~énalapril^fenofibrate~fénofibrate^methotrexate~méthotrexate^diazepam~diazépam^lorazepam~lorazépam^verapamil~vérapamil^metoprolol~métoprolol^amoxicilline~amoxicillin^ciprofloxacine~ciprofloxacin^metformine~metformin^atorvastatine~atorvastatin~atorvastatin trihydrate~atorvastatin propylene glycol solvate^clarithromycine~clarithromycin^simvastatine~simvastatin^digoxine~digoxin^warfarine~warfarin^amphotericine b~amphotericin b^polymyxine b~polymyxin b^erythromycin~érythromycine~erythromycin ethylsuccinate^phenytoin~phénytoïne^insuline~insulin^insuline glargine~insulin glargine^insuline lispro~insulin lispro^insuline degludec~insulin degludec^insuline asparte~insulin aspart^ibuprofen~ibuprofène^trimethoprim~triméthoprime^isoniazide~isoniazid^sulfamethizol~sulfamethizole^vitamine a~vitamin a^cafeine~caffeine^aciclovir~acyclovir^valaciclovir~valacyclovir^indometacine~indomethacin^chlortalidone~chlorthalidone^tiabendazole~thiabendazole^aspirin~aspirine~acetylsalicylic acid^rifampicine~rifampicin~rifampin^acide fusidique~fusidic acid^acide ascorbique~ascorbic acid^acide zoledronique~zoledronic acid^acide folique~folic acid^acide alendronique~alendronic acid~alendronate^acide mefenamique~mefenamic acid^acide acetohydroxamique~acetohydroxamic acid^acide cholique~cholic acid^acide etidronique~etidronic acid^acide pamidronique~pamidronic acid^acide risedronique~risedronic acid^acide tiludronique~tiludronic acid^acide ibandronique~ibandronate^acide ursodesoxycholique~ursodeoxycholic acid~ursodiol^acide amidotrizoique~diatrizoate^acide folinique~leucovorin^acide nicotinique~niacin^valproic acid~valproate~divalproex^clorazepate~clorazepic acid^sodium (picosulfate de)~picosulfuric acid^hydroxycarbamide~hydroxyurea^salbutamol~albuterol^chlorphenamine~chlorpheniramine^colestyramine~cholestyramine^ethinylestradiol~ethinyl estradiol^norethisterone~norethindrone^isoprenaline~isoproterenol^methylergometrine~methylergonovine^mesalazine~mesalamine^glycopyrronium~glycopyrrolate^benzatropine~benztropine^levomepromazine~methotrimeprazine^leuproreline~leuprolide^suxamethonium~succinylcholine^torasemide~torsemide^trometamol~tromethamine^tetracosactide~cosyntropin^fampridine~dalfampridine^sulfafurazol~sulfisoxazole^diprophylline~dyphylline^trientine~triethylenetetramine^somatropin~somatotropin^phylloquinone~phytonadione^chenodeoxycholic acid~chenodiol^glycerol~glycerin^alcool~alcohol~ethanol^mitomycine c~mitomycin^charbon active~activated charcoal^bleu de methylene~methylene blue^millepertuis~st john s wort~st. john's wort^reglisse~licorice^fer~iron^estrogenes conjugues~conjugated estrogens^ginkgo~ginkgo biloba^peg-interferon alfa-2a~peginterferon alfa-2a^salmon calcitonin~calcitonin salmon^dinitrate d'isosorbide~isosorbide dinitrate^sodium (bicarbonate de)~sodium bicarbonate^sodium (citrate de)~sodium citrate^sodium (chlorure de)~sodium chloride^sodium (docusate de)~docusate^sodium (nitroprussiate de)~nitroprusside^potassium (citrate de)~potassium citrate^magnesium (hydroxyde de)~magnesium hydroxide^polystyrene sulfonate de sodium~sodium polystyrene sulfonate^oxybate de sodium~sodium oxybate^dimethyle ( fumarate de)~dimethyl fumarate^liothyronine sodique~liothyronine^dalteparine sodique~dalteparin^danaparoide sodique~danaparoid^heparine sodique~heparine calcique~heparin^perindopril~perindopril tert-butylamine^abciximab (c 7e3b fab)~abciximab^alteplase recombinante~alteplase^lanthane~lanthanum carbonate^azithromycin~azithromycin dihydrate^ampicillin~ampicillin trihydrate^doxycycline~doxycycline hyclate^dextromethorphan~dextromethorphan hydrobromide^eltrombopag~eltrombopag olamine^fluticasone~fluticasone propionate^ketorolac~ketorolac tromethamine^lisdexamfetamine~lisdexamfetamine dimesylate^lithium~lithium carbonate^medroxyprogesterone~medroxyprogesterone acetate^megestrol~megestrol acetate^mometasone~mometasone furoate^neostigmine~neostigmine methylsulfate^norepinephrine~norepinephrine bitartrate^pemetrexed~pemetrexed disodium hemipentahydrate^pramipexole~pramipexole dihydrochloride^rizatriptan~rizatriptan benzoate^rucaparib~rucaparib camsylate^salmeterol~salmeterol xinafoate^sapropterin~sapropterin dihydrochloride^sevelamer~sevelamer carbonate^triamcinolone~triamcinolone acetonide^benzylpenicillin~benzylpenicillin potassium~benzylpenicillin sodium^dapagliflozin~dapagliflozin propanediol^carbidopa~carbidopa hydrate^testosterone~testosterone cypionate^balsalazide~balsalazide disodium^magnesium sulfate~magnesium heptahydrate^dicitrate trimagnesien~magnesium citrate^p a s sodique~aminosalicylic acid^piroxicam~piroxicam-betadex^dabigatran~dabigatran etexilate^candesartan cilexetil~candesartan^azilsartan~azilsartan medoxomil~azilsartan kamedoxomil^olmesartan~olmesartan medoxomil^adefovir~adefovir dipivoxil^isavuconazole~isavuconazonium^cefuroxime~cefuroxime axetil^colistin~colistimethate$bdd1$, '^')) with ordinality as g(s, ord)
cross join lateral unnest(string_to_array(g.s, '~')) with ordinality as m(nom, k);

-- 1. Gardes : état de départ attendu (sinon tout est annulé).
do $$
declare v_manquants text;
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'ingredients' and column_name = 'canonical_id') then
    raise exception 'BDD-1 : ingredients.canonical_id existe déjà';
  end if;
  select string_agg(b.nom, ' ; ') into v_manquants
  from _bdd1 b left join ingredients i on i.name_en = b.nom where i.id is null;
  if v_manquants is not null then
    raise exception 'BDD-1 : substances absentes de ingredients : %', v_manquants;
  end if;
  if exists (select 1 from _bdd1 group by nom having count(*) > 1) then
    raise exception 'BDD-1 : une substance figure dans deux groupes';
  end if;
  if exists (select 1 from ingredients i
             where i.name_en in ('__test_a__', '__test_b__')
               and (exists (select 1 from medicament_ingredients mi where mi.ingredient_id = i.id)
                 or exists (select 1 from ansm_substance_ingredient a where a.ingredient_id = i.id))) then
    raise exception 'BDD-1 : une entité de test est reliée à une spécialité ou à l''ANSM — STOP';
  end if;
end $$;

-- 2. Hygiène : entités de test (aucune spécialité reliée) et leur ligne DDInter.
delete from interactions_ingredients ii
using ingredients t
where t.name_en in ('__test_a__', '__test_b__') and t.id in (ii.ingredient_1, ii.ingredient_2);
delete from ingredients where name_en in ('__test_a__', '__test_b__');

-- 3. Colonnes. revue_requise : ajout de métadonnées uniquement (valeur par défaut constante, PostgreSQL ≥ 11) ;
--    si la table était réécrite, la migration s'annule.
alter table ingredients add column canonical_id uuid references ingredients(id);
comment on column ingredients.canonical_id is
  'BDD-1 — entité canonique du groupe d''équivalence (même molécule). Le canonique pointe vers lui-même ; NULL = substance hors groupe.';
create index idx_ingredients_canonical on ingredients (canonical_id) where canonical_id is not null;

do $$
declare v_avant oid; v_apres oid;
begin
  v_avant := pg_relation_filenode('public.interactions_ingredients');
  alter table interactions_ingredients add column revue_requise boolean not null default false;
  v_apres := pg_relation_filenode('public.interactions_ingredients');
  if v_avant is distinct from v_apres then
    raise exception 'BDD-1 : interactions_ingredients a été réécrite par l''ajout de revue_requise — STOP';
  end if;
end $$;
comment on column interactions_ingredients.revue_requise is
  'BDD-1 — ligne rédigée à la main, à relire : comparée sur les ids bruts, jamais propagée au groupe d''équivalence.';

-- 4. Garde-fou permanent : pas de chaîne (la cible d'un canonical_id est toujours un canonique).
create or replace function public.ingredients_canonical_guard()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.canonical_id is not null and new.canonical_id <> new.id
     and not exists (select 1 from ingredients c where c.id = new.canonical_id and c.canonical_id = c.id) then
    raise exception 'ingredients.canonical_id : la cible n''est pas un canonique (elle doit pointer vers elle-même)';
  end if;
  if tg_op = 'UPDATE' and old.canonical_id = old.id and new.canonical_id is distinct from new.id
     and exists (select 1 from ingredients m where m.canonical_id = old.id and m.id <> old.id) then
    raise exception 'ingredients.canonical_id : « % » est le canonique d''autres substances', old.name_en;
  end if;
  return new;
end $$;

create trigger trg_ingredients_canonical_guard
before insert or update of canonical_id on ingredients
for each row execute function public.ingredients_canonical_guard();

-- 5. Remplissage : les canoniques d'abord, puis leurs membres.
update ingredients i set canonical_id = i.id
from _bdd1 b where b.canon and i.name_en = b.nom;

update ingredients i set canonical_id = c.id
from _bdd1 b
join _bdd1 bc on bc.grp = b.grp and bc.canon
join ingredients c on c.name_en = bc.nom
where not b.canon and i.name_en = b.nom;

-- 6. Lignes DDInter rédigées à la main (ni « Interaction … » ni « A × B — … ») : à relire, non propagées.
update interactions_ingredients set revue_requise = true
where description !~ ' × '
  and description !~ '^Interaction (majeure|modérée|mineure) '
  and description !~ '^Interaction entre ';

-- 7. RPC : même signature, même format de sortie.
--    • med_can : une ligne par (spécialité, substance canonique) ; med_x : la substance dépliée en tout son groupe.
--    • Deux jumeaux ne sont jamais comparés entre eux : on compare les canoniques (cid), pas les ids bruts.
--    • DDInter : UNE carte par paire de substances canoniques, la plus sévère.
--    • Priorité ANSM > DDInter > cumul de classe ; une carte DDInter STRICTEMENT plus sévère que la carte ANSM
--      de la même paire de spécialités est conservée (jamais de baisse de sévérité).
--    • Ligne revue_requise : comparée sur les liens DIRECTS des deux spécialités (aucune propagation).
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
    WHERE NOT ii.revue_requise OR (a.direct AND b.direct)
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

-- 8. Vue : un ingrédient est « parlant » si UN membre de son groupe l'est (v_medicament_verifiable en hérite).
create or replace view v_ingredient_parlant as
select i.id as ingredient_id, i.name_en
from ingredients i
where exists (
  select 1 from ingredients g
  where (g.id = i.id or g.canonical_id = i.canonical_id)
    and (g.sans_interaction_documentee
      or exists (select 1 from interactions_ingredients ii where ii.ingredient_1 = g.id or ii.ingredient_2 = g.id)
      or exists (select 1 from v_ingredient_entites v
                 join ansm_regles r on r.entite_a = v.entite or r.entite_b = v.entite
                 where v.ingredient_id = g.id)
      or exists (select 1 from contraindications c
                 where unaccent(lower(g.name_en)) ~ unaccent(lower(c.dci_pattern))))
);

-- 9. Contrôles finaux « base = source » (sinon tout est annulé).
do $$
declare v_empreinte text; v_revue int;
begin
  select md5(string_agg(i.name_en || '|' || c.name_en, E'\n' order by i.name_en collate "C")) into v_empreinte
  from ingredients i join ingredients c on c.id = i.canonical_id;
  if v_empreinte is distinct from '3cfb7538a18df91430a457e2c84e82bd' then
    raise exception 'BDD-1 : empreinte base (%) ≠ source (3cfb7538a18df91430a457e2c84e82bd)', v_empreinte;
  end if;
  select count(*) into v_revue from interactions_ingredients where revue_requise;
  if v_revue <> 53 then
    raise exception 'BDD-1 : % lignes revue_requise au lieu de 53', v_revue;
  end if;
end $$;

drop table _bdd1;

-- Contrôle « base = source » (doit renvoyer l'empreinte ci-dessus) :
--   select md5(string_agg(i.name_en || '|' || c.name_en, E'\n' order by i.name_en collate "C"))
--   from ingredients i join ingredients c on c.id = i.canonical_id;
