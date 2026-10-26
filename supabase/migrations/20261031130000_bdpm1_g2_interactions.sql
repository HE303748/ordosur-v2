-- Sprint BDPM-1, lot G2 — interactions lues dans les RCP ajoutées au moteur (table interactions_rcp).
-- GÉNÉRÉ par scripts/gen_bdpm1_g2.mjs — ne pas modifier à la main.
-- Empreinte de la source : 3216f00ddf9ae9836946aec52ce4672a
--
-- 534 interactions : 256 ajouts (aucune carte dans le moteur),
-- 278 relèvements (carte existante moins sévère que le RCP).
-- Aucune ligne de ansm_regles ni de interactions_ingredients n'est modifiée : check_interactions_v2 ajoute
-- une carte « RCP » à une paire seulement si aucune carte existante n'est au moins aussi sévère.
-- Données copiées de bdpm_interactions_staging (citation exacte, CIS, URL, date du RCP).

-- 1. Garde : les lignes staging sont dans l'état relu (sinon tout est annulé).
do $$
declare v_n int; v_md5 text;
begin
  select count(*), md5(string_agg(s.ligne || '|' || s.empreinte || '|' || s.statut || '|' || s.niveau, E'\n' order by s.ligne))
    into v_n, v_md5
  from bdpm_interactions_staging s
  where s.ligne in (select v.ligne from (values
  (62,'relevement'),(212,'relevement'),(323,'ajout'),(536,'ajout'),(672,'relevement'),(749,'relevement'),(750,'relevement'),(751,'relevement'),(754,'relevement'),(1114,'ajout'),(1137,'ajout'),(1223,'ajout'),
  (1236,'ajout'),(1361,'ajout'),(1362,'relevement'),(1390,'relevement'),(2241,'ajout'),(2427,'ajout'),(2444,'ajout'),(2446,'relevement'),(2676,'ajout'),(2821,'ajout'),(3025,'relevement'),(3039,'ajout'),
  (3055,'ajout'),(3591,'ajout'),(3862,'relevement'),(3870,'relevement'),(3996,'ajout'),(3997,'ajout'),(4030,'relevement'),(4305,'relevement'),(4770,'ajout'),(4853,'relevement'),(4873,'ajout'),(4910,'ajout'),
  (4915,'relevement'),(5017,'ajout'),(5227,'ajout'),(5236,'ajout'),(5237,'ajout'),(5238,'relevement'),(5239,'relevement'),(5240,'relevement'),(5249,'ajout'),(5250,'ajout'),(5251,'ajout'),(5252,'ajout'),
  (5819,'relevement'),(5842,'relevement'),(5853,'ajout'),(5903,'relevement'),(5905,'relevement'),(5908,'relevement'),(5909,'relevement'),(5947,'ajout'),(5949,'relevement'),(5951,'relevement'),(6045,'relevement'),(6636,'ajout'),
  (6757,'ajout'),(6761,'ajout'),(6767,'ajout'),(6819,'relevement'),(6834,'ajout'),(6893,'relevement'),(6894,'relevement'),(6895,'ajout'),(6904,'ajout'),(6911,'ajout'),(6918,'ajout'),(7576,'relevement'),
  (7953,'relevement'),(8148,'ajout'),(8387,'ajout'),(8408,'relevement'),(8577,'ajout'),(8580,'ajout'),(8990,'relevement'),(8991,'relevement'),(8992,'relevement'),(9203,'relevement'),(9204,'relevement'),(9288,'relevement'),
  (9349,'ajout'),(9385,'relevement'),(9501,'relevement'),(9510,'relevement'),(9732,'ajout'),(9788,'relevement'),(10062,'ajout'),(10083,'relevement'),(10247,'relevement'),(10248,'relevement'),(10249,'relevement'),(10250,'relevement'),
  (10251,'relevement'),(10252,'relevement'),(10253,'relevement'),(10254,'relevement'),(10256,'relevement'),(10258,'relevement'),(10259,'ajout'),(10508,'ajout'),(10537,'ajout'),(10861,'relevement'),(10879,'ajout'),(11042,'ajout'),
  (11066,'ajout'),(11186,'relevement'),(11371,'relevement'),(11444,'relevement'),(11660,'ajout'),(11729,'relevement'),(11730,'relevement'),(11807,'relevement'),(11808,'relevement'),(11846,'ajout'),(12001,'ajout'),(12002,'ajout'),
  (12038,'ajout'),(12069,'ajout'),(12270,'relevement'),(12396,'ajout'),(12397,'ajout'),(12398,'ajout'),(12458,'relevement'),(12563,'relevement'),(12595,'relevement'),(12840,'ajout'),(13001,'ajout'),(13178,'ajout'),
  (13364,'relevement'),(13367,'relevement'),(13370,'ajout'),(13775,'ajout'),(14134,'relevement'),(14140,'relevement'),(14215,'relevement'),(14337,'ajout'),(14338,'ajout'),(14625,'ajout'),(14844,'ajout'),(15334,'ajout'),
  (16075,'ajout'),(16184,'relevement'),(17267,'ajout'),(17956,'relevement'),(17965,'relevement'),(18297,'relevement'),(18377,'relevement'),(18462,'relevement'),(18697,'ajout'),(18804,'ajout'),(18814,'relevement'),(18821,'ajout'),
  (18824,'ajout'),(19253,'relevement'),(19254,'relevement'),(19256,'relevement'),(19257,'relevement'),(19258,'relevement'),(19259,'relevement'),(19260,'relevement'),(19489,'relevement'),(19528,'ajout'),(19530,'relevement'),(19903,'ajout'),
  (19998,'ajout'),(20451,'ajout'),(20505,'ajout'),(20676,'ajout'),(20816,'relevement'),(20817,'relevement'),(20818,'relevement'),(21470,'ajout'),(22021,'relevement'),(22025,'ajout'),(22056,'ajout'),(22201,'relevement'),
  (22202,'relevement'),(22204,'relevement'),(22205,'ajout'),(22339,'relevement'),(22838,'ajout'),(22840,'relevement'),(22875,'relevement'),(23655,'ajout'),(23832,'ajout'),(24395,'ajout'),(24402,'relevement'),(24544,'relevement'),
  (24827,'relevement'),(24829,'relevement'),(25499,'relevement'),(25544,'relevement'),(25553,'relevement'),(25585,'relevement'),(26308,'relevement'),(26726,'ajout'),(26809,'relevement'),(26810,'ajout'),(26850,'ajout'),(26880,'ajout'),
  (27015,'relevement'),(27273,'relevement'),(27385,'ajout'),(27388,'ajout'),(27390,'ajout'),(27392,'ajout'),(27393,'ajout'),(27405,'relevement'),(27406,'relevement'),(27407,'relevement'),(27408,'relevement'),(27409,'relevement'),
  (27410,'relevement'),(27985,'relevement'),(28187,'relevement'),(28188,'relevement'),(28579,'relevement'),(28609,'relevement'),(28612,'relevement'),(28615,'ajout'),(28925,'relevement'),(29080,'relevement'),(29081,'ajout'),(29082,'relevement'),
  (29173,'ajout'),(29270,'ajout'),(29444,'ajout'),(29445,'ajout'),(29446,'ajout'),(29447,'ajout'),(29448,'ajout'),(29622,'relevement'),(29645,'relevement'),(29890,'relevement'),(29891,'relevement'),(29907,'ajout'),
  (29908,'relevement'),(29909,'relevement'),(29966,'ajout'),(30195,'ajout'),(30257,'relevement'),(30258,'relevement'),(30259,'ajout'),(30313,'ajout'),(30344,'ajout'),(30348,'ajout'),(30741,'ajout'),(30742,'ajout'),
  (30744,'relevement'),(30745,'relevement'),(30761,'ajout'),(30856,'ajout'),(30857,'relevement'),(30858,'relevement'),(30859,'relevement'),(30860,'ajout'),(30861,'relevement'),(30862,'relevement'),(30863,'ajout'),(30864,'relevement'),
  (30865,'relevement'),(30866,'ajout'),(30867,'ajout'),(30868,'ajout'),(31201,'ajout'),(31361,'relevement'),(31672,'relevement'),(31673,'relevement'),(31674,'relevement'),(31725,'ajout'),(31728,'relevement'),(32030,'ajout'),
  (32055,'ajout'),(32064,'ajout'),(32065,'ajout'),(32066,'ajout'),(32067,'ajout'),(32155,'relevement'),(32302,'relevement'),(32419,'ajout'),(32420,'relevement'),(32421,'relevement'),(32565,'ajout'),(32572,'ajout'),
  (32573,'ajout'),(32577,'ajout'),(32847,'relevement'),(32848,'ajout'),(32868,'ajout'),(32907,'relevement'),(32922,'relevement'),(32925,'ajout'),(32967,'relevement'),(32970,'ajout'),(32993,'relevement'),(32996,'ajout'),
  (33008,'relevement'),(33010,'relevement'),(33018,'relevement'),(33025,'ajout'),(33087,'ajout'),(33100,'relevement'),(33101,'relevement'),(33102,'relevement'),(33121,'ajout'),(33147,'ajout'),(33149,'relevement'),(33151,'ajout'),
  (33161,'ajout'),(33189,'relevement'),(33194,'ajout'),(33237,'relevement'),(33238,'relevement'),(33242,'relevement'),(33247,'ajout'),(33275,'relevement'),(33276,'relevement'),(33277,'relevement'),(33279,'relevement'),(33280,'relevement'),
  (33304,'ajout'),(33305,'relevement'),(33306,'ajout'),(33307,'ajout'),(33365,'ajout'),(33376,'ajout'),(33392,'relevement'),(33396,'ajout'),(33397,'ajout'),(33398,'ajout'),(33399,'ajout'),(33400,'ajout'),
  (33401,'ajout'),(33402,'relevement'),(33404,'relevement'),(33407,'ajout'),(33408,'ajout'),(33409,'relevement'),(33410,'relevement'),(33414,'relevement'),(33417,'ajout'),(33418,'ajout'),(33419,'relevement'),(33425,'relevement'),
  (33428,'relevement'),(33432,'ajout'),(33433,'relevement'),(33434,'relevement'),(33435,'ajout'),(33436,'relevement'),(33469,'ajout'),(33478,'ajout'),(33479,'ajout'),(33480,'relevement'),(33481,'relevement'),(33482,'ajout'),
  (33483,'ajout'),(33488,'ajout'),(33489,'ajout'),(33495,'ajout'),(33498,'relevement'),(33499,'ajout'),(33500,'ajout'),(33510,'relevement'),(33511,'relevement'),(33513,'ajout'),(33515,'ajout'),(33516,'ajout'),
  (33517,'ajout'),(33518,'ajout'),(33519,'ajout'),(33535,'relevement'),(33545,'ajout'),(33548,'relevement'),(33549,'relevement'),(33550,'relevement'),(33554,'ajout'),(33558,'relevement'),(33569,'relevement'),(33586,'ajout'),
  (33587,'ajout'),(33589,'ajout'),(33594,'ajout'),(33600,'relevement'),(33606,'ajout'),(33608,'relevement'),(33610,'ajout'),(33613,'ajout'),(33614,'ajout'),(33615,'ajout'),(33621,'relevement'),(33624,'ajout'),
  (33625,'ajout'),(33626,'relevement'),(33638,'ajout'),(33661,'relevement'),(33673,'ajout'),(33674,'ajout'),(33683,'relevement'),(33684,'relevement'),(33693,'ajout'),(33694,'ajout'),(33695,'ajout'),(33770,'relevement'),
  (33774,'relevement'),(33782,'relevement'),(33783,'relevement'),(33784,'relevement'),(33791,'ajout'),(33844,'ajout'),(33852,'relevement'),(33854,'ajout'),(33861,'relevement'),(33862,'ajout'),(33863,'ajout'),(33876,'ajout'),
  (33877,'ajout'),(33884,'ajout'),(33910,'ajout'),(33912,'relevement'),(33947,'relevement'),(33948,'relevement'),(33949,'relevement'),(33975,'relevement'),(33976,'relevement'),(33997,'ajout'),(34018,'relevement'),(34021,'ajout'),
  (34022,'ajout'),(34033,'relevement'),(34041,'relevement'),(34091,'relevement'),(34102,'relevement'),(34142,'ajout'),(34147,'relevement'),(34148,'relevement'),(34150,'ajout'),(34234,'ajout'),(34236,'ajout'),(34248,'ajout'),
  (34254,'ajout'),(34256,'relevement'),(34264,'relevement'),(34300,'relevement'),(34303,'relevement'),(34322,'ajout'),(34341,'relevement'),(34344,'ajout'),(34345,'ajout'),(34346,'relevement'),(34371,'relevement'),(34374,'ajout'),
  (34375,'ajout'),(34376,'relevement'),(34393,'ajout'),(34413,'ajout'),(34414,'ajout'),(34415,'ajout'),(34416,'ajout'),(34417,'ajout'),(34439,'relevement'),(34440,'relevement'),(34441,'relevement'),(34442,'relevement'),
  (34470,'relevement'),(34471,'relevement'),(34495,'ajout'),(34508,'relevement'),(34522,'relevement'),(34525,'ajout'),(34526,'ajout'),(34527,'relevement'),(34539,'relevement'),(34540,'ajout'),(34544,'relevement'),(34545,'ajout'),
  (34547,'relevement'),(34548,'relevement'),(34550,'ajout'),(34552,'relevement'),(34556,'relevement'),(34621,'ajout'),(34622,'ajout'),(34624,'ajout'),(34625,'relevement'),(34628,'relevement'),(34632,'relevement'),(34635,'relevement'),
  (34639,'ajout'),(34666,'relevement'),(34667,'relevement'),(34668,'relevement'),(34691,'ajout'),(34693,'relevement'),(34700,'ajout'),(34718,'ajout'),(34728,'relevement'),(34737,'relevement'),(34746,'relevement'),(34750,'relevement'),
  (34751,'ajout'),(34752,'relevement'),(34774,'ajout'),(34775,'ajout'),(34777,'ajout'),(34778,'relevement'),(34779,'relevement'),(34780,'relevement'),(34782,'relevement'),(34783,'relevement'),(34784,'relevement'),(34785,'relevement'),
  (34787,'relevement'),(34788,'relevement'),(34789,'relevement'),(34790,'relevement'),(34791,'relevement'),(34792,'relevement'),(34816,'ajout'),(34825,'ajout'),(34826,'ajout'),(34827,'ajout'),(34875,'ajout'),(34876,'relevement'),
  (34877,'relevement'),(34878,'relevement'),(34891,'relevement'),(34894,'ajout'),(34895,'ajout'),(34896,'relevement')
  ) as v(ligne, action));
  if v_n <> 534 or v_md5 <> 'd78da032d6c4f0be522610cbfb22eab7' then
    raise exception 'BDPM-1 G2 : lignes staging inattendues (% lignes, empreinte %)', v_n, v_md5;
  end if;
end $$;

-- 2. Table des interactions lues dans les RCP
create table public.interactions_rcp (
  id bigserial primary key,
  molecule_cids uuid[] not null check (cardinality(molecule_cids) > 0),   -- canoniques de la composition (toutes requises)
  molecule_libelle text not null,
  partenaire_cids uuid[] not null default '{}',                             -- canoniques du partenaire (l'un suffit)
  partenaire_classe text,                                                   -- ou classe ANSM (v_ingredient_entites.entite)
  partenaire_libelle text not null,
  niveau text not null check (niveau in ('contre_indiquee', 'deconseillee')),
  condition text,                                                           -- dose, voie, terrain lus dans le RCP
  citation text not null,                                                   -- texte exact du RCP
  description_carte text not null,
  source_origine text not null check (source_origine in ('RCP BDPM', 'RCP EMA')),
  source_cis bigint not null,
  source_url text not null,
  source_date date,
  statut_relecture text not null default 'a_relire_pharmacien' check (statut_relecture in ('a_relire_pharmacien', 'relu_pharmacien')),
  action text not null check (action in ('ajout', 'relevement')),
  bdpm_ligne integer not null unique,                                       -- bdpm_interactions_staging.ligne
  exclue_motif text,                                                        -- NULL = active ; sinon neutralisée (réversible)
  created_at timestamptz not null default now(),
  check (cardinality(partenaire_cids) > 0 or partenaire_classe is not null)
);
comment on table public.interactions_rcp is 'BDPM-1 G2 : interactions contre-indiquées / déconseillées lues dans les RCP (BDPM, EMA), source et date sur chaque ligne, à relire par un pharmacien. Lue par check_interactions_v2.';
create index interactions_rcp_molecule on public.interactions_rcp using gin (molecule_cids);
alter table public.interactions_rcp enable row level security;
create policy interactions_rcp_lecture on public.interactions_rcp for select to authenticated using (true);
revoke all on public.interactions_rcp from anon;
revoke insert, update, delete on public.interactions_rcp from authenticated;

-- 3. Données (copiées de la ligne staging de preuve)
insert into public.interactions_rcp (molecule_cids, molecule_libelle, partenaire_cids, partenaire_classe, partenaire_libelle, niveau,
  condition, citation, description_carte, source_origine, source_cis, source_url, source_date, action, bdpm_ligne)
select s.canonical_ids, lower(s.composition), s.partenaire_canonical_ids, s.partenaire_classe,
  coalesce(s.partenaire_classe, (select string_agg(i.name_en, ' / ' order by i.name_en) from ingredients i where i.id = any(s.partenaire_canonical_ids))),
  case s.niveau when 'contre-indique' then 'contre_indiquee' else 'deconseillee' end,
  s.condition, s.citation,
  'Source : RCP ' || s.source || ', CIS ' || s.cis || coalesce(' (RCP du ' || to_char(s.date_maj_rcp, 'DD/MM/YYYY') || ')', '')
    || ' — à relire par un pharmacien. ' || case s.niveau when 'contre-indique' then 'Association contre-indiquée' else 'Association déconseillée' end
    || coalesce(' (' || s.condition || ')', '') || ' : « ' || coalesce(s.phrase, s.citation) || ' » ' || s.url,
  'RCP ' || s.source, s.cis, s.url, s.date_maj_rcp, v.action, s.ligne
from bdpm_interactions_staging s
join (values
  (62,'relevement'),(212,'relevement'),(323,'ajout'),(536,'ajout'),(672,'relevement'),(749,'relevement'),(750,'relevement'),(751,'relevement'),(754,'relevement'),(1114,'ajout'),(1137,'ajout'),(1223,'ajout'),
  (1236,'ajout'),(1361,'ajout'),(1362,'relevement'),(1390,'relevement'),(2241,'ajout'),(2427,'ajout'),(2444,'ajout'),(2446,'relevement'),(2676,'ajout'),(2821,'ajout'),(3025,'relevement'),(3039,'ajout'),
  (3055,'ajout'),(3591,'ajout'),(3862,'relevement'),(3870,'relevement'),(3996,'ajout'),(3997,'ajout'),(4030,'relevement'),(4305,'relevement'),(4770,'ajout'),(4853,'relevement'),(4873,'ajout'),(4910,'ajout'),
  (4915,'relevement'),(5017,'ajout'),(5227,'ajout'),(5236,'ajout'),(5237,'ajout'),(5238,'relevement'),(5239,'relevement'),(5240,'relevement'),(5249,'ajout'),(5250,'ajout'),(5251,'ajout'),(5252,'ajout'),
  (5819,'relevement'),(5842,'relevement'),(5853,'ajout'),(5903,'relevement'),(5905,'relevement'),(5908,'relevement'),(5909,'relevement'),(5947,'ajout'),(5949,'relevement'),(5951,'relevement'),(6045,'relevement'),(6636,'ajout'),
  (6757,'ajout'),(6761,'ajout'),(6767,'ajout'),(6819,'relevement'),(6834,'ajout'),(6893,'relevement'),(6894,'relevement'),(6895,'ajout'),(6904,'ajout'),(6911,'ajout'),(6918,'ajout'),(7576,'relevement'),
  (7953,'relevement'),(8148,'ajout'),(8387,'ajout'),(8408,'relevement'),(8577,'ajout'),(8580,'ajout'),(8990,'relevement'),(8991,'relevement'),(8992,'relevement'),(9203,'relevement'),(9204,'relevement'),(9288,'relevement'),
  (9349,'ajout'),(9385,'relevement'),(9501,'relevement'),(9510,'relevement'),(9732,'ajout'),(9788,'relevement'),(10062,'ajout'),(10083,'relevement'),(10247,'relevement'),(10248,'relevement'),(10249,'relevement'),(10250,'relevement'),
  (10251,'relevement'),(10252,'relevement'),(10253,'relevement'),(10254,'relevement'),(10256,'relevement'),(10258,'relevement'),(10259,'ajout'),(10508,'ajout'),(10537,'ajout'),(10861,'relevement'),(10879,'ajout'),(11042,'ajout'),
  (11066,'ajout'),(11186,'relevement'),(11371,'relevement'),(11444,'relevement'),(11660,'ajout'),(11729,'relevement'),(11730,'relevement'),(11807,'relevement'),(11808,'relevement'),(11846,'ajout'),(12001,'ajout'),(12002,'ajout'),
  (12038,'ajout'),(12069,'ajout'),(12270,'relevement'),(12396,'ajout'),(12397,'ajout'),(12398,'ajout'),(12458,'relevement'),(12563,'relevement'),(12595,'relevement'),(12840,'ajout'),(13001,'ajout'),(13178,'ajout'),
  (13364,'relevement'),(13367,'relevement'),(13370,'ajout'),(13775,'ajout'),(14134,'relevement'),(14140,'relevement'),(14215,'relevement'),(14337,'ajout'),(14338,'ajout'),(14625,'ajout'),(14844,'ajout'),(15334,'ajout'),
  (16075,'ajout'),(16184,'relevement'),(17267,'ajout'),(17956,'relevement'),(17965,'relevement'),(18297,'relevement'),(18377,'relevement'),(18462,'relevement'),(18697,'ajout'),(18804,'ajout'),(18814,'relevement'),(18821,'ajout'),
  (18824,'ajout'),(19253,'relevement'),(19254,'relevement'),(19256,'relevement'),(19257,'relevement'),(19258,'relevement'),(19259,'relevement'),(19260,'relevement'),(19489,'relevement'),(19528,'ajout'),(19530,'relevement'),(19903,'ajout'),
  (19998,'ajout'),(20451,'ajout'),(20505,'ajout'),(20676,'ajout'),(20816,'relevement'),(20817,'relevement'),(20818,'relevement'),(21470,'ajout'),(22021,'relevement'),(22025,'ajout'),(22056,'ajout'),(22201,'relevement'),
  (22202,'relevement'),(22204,'relevement'),(22205,'ajout'),(22339,'relevement'),(22838,'ajout'),(22840,'relevement'),(22875,'relevement'),(23655,'ajout'),(23832,'ajout'),(24395,'ajout'),(24402,'relevement'),(24544,'relevement'),
  (24827,'relevement'),(24829,'relevement'),(25499,'relevement'),(25544,'relevement'),(25553,'relevement'),(25585,'relevement'),(26308,'relevement'),(26726,'ajout'),(26809,'relevement'),(26810,'ajout'),(26850,'ajout'),(26880,'ajout'),
  (27015,'relevement'),(27273,'relevement'),(27385,'ajout'),(27388,'ajout'),(27390,'ajout'),(27392,'ajout'),(27393,'ajout'),(27405,'relevement'),(27406,'relevement'),(27407,'relevement'),(27408,'relevement'),(27409,'relevement'),
  (27410,'relevement'),(27985,'relevement'),(28187,'relevement'),(28188,'relevement'),(28579,'relevement'),(28609,'relevement'),(28612,'relevement'),(28615,'ajout'),(28925,'relevement'),(29080,'relevement'),(29081,'ajout'),(29082,'relevement'),
  (29173,'ajout'),(29270,'ajout'),(29444,'ajout'),(29445,'ajout'),(29446,'ajout'),(29447,'ajout'),(29448,'ajout'),(29622,'relevement'),(29645,'relevement'),(29890,'relevement'),(29891,'relevement'),(29907,'ajout'),
  (29908,'relevement'),(29909,'relevement'),(29966,'ajout'),(30195,'ajout'),(30257,'relevement'),(30258,'relevement'),(30259,'ajout'),(30313,'ajout'),(30344,'ajout'),(30348,'ajout'),(30741,'ajout'),(30742,'ajout'),
  (30744,'relevement'),(30745,'relevement'),(30761,'ajout'),(30856,'ajout'),(30857,'relevement'),(30858,'relevement'),(30859,'relevement'),(30860,'ajout'),(30861,'relevement'),(30862,'relevement'),(30863,'ajout'),(30864,'relevement'),
  (30865,'relevement'),(30866,'ajout'),(30867,'ajout'),(30868,'ajout'),(31201,'ajout'),(31361,'relevement'),(31672,'relevement'),(31673,'relevement'),(31674,'relevement'),(31725,'ajout'),(31728,'relevement'),(32030,'ajout'),
  (32055,'ajout'),(32064,'ajout'),(32065,'ajout'),(32066,'ajout'),(32067,'ajout'),(32155,'relevement'),(32302,'relevement'),(32419,'ajout'),(32420,'relevement'),(32421,'relevement'),(32565,'ajout'),(32572,'ajout'),
  (32573,'ajout'),(32577,'ajout'),(32847,'relevement'),(32848,'ajout'),(32868,'ajout'),(32907,'relevement'),(32922,'relevement'),(32925,'ajout'),(32967,'relevement'),(32970,'ajout'),(32993,'relevement'),(32996,'ajout'),
  (33008,'relevement'),(33010,'relevement'),(33018,'relevement'),(33025,'ajout'),(33087,'ajout'),(33100,'relevement'),(33101,'relevement'),(33102,'relevement'),(33121,'ajout'),(33147,'ajout'),(33149,'relevement'),(33151,'ajout'),
  (33161,'ajout'),(33189,'relevement'),(33194,'ajout'),(33237,'relevement'),(33238,'relevement'),(33242,'relevement'),(33247,'ajout'),(33275,'relevement'),(33276,'relevement'),(33277,'relevement'),(33279,'relevement'),(33280,'relevement'),
  (33304,'ajout'),(33305,'relevement'),(33306,'ajout'),(33307,'ajout'),(33365,'ajout'),(33376,'ajout'),(33392,'relevement'),(33396,'ajout'),(33397,'ajout'),(33398,'ajout'),(33399,'ajout'),(33400,'ajout'),
  (33401,'ajout'),(33402,'relevement'),(33404,'relevement'),(33407,'ajout'),(33408,'ajout'),(33409,'relevement'),(33410,'relevement'),(33414,'relevement'),(33417,'ajout'),(33418,'ajout'),(33419,'relevement'),(33425,'relevement'),
  (33428,'relevement'),(33432,'ajout'),(33433,'relevement'),(33434,'relevement'),(33435,'ajout'),(33436,'relevement'),(33469,'ajout'),(33478,'ajout'),(33479,'ajout'),(33480,'relevement'),(33481,'relevement'),(33482,'ajout'),
  (33483,'ajout'),(33488,'ajout'),(33489,'ajout'),(33495,'ajout'),(33498,'relevement'),(33499,'ajout'),(33500,'ajout'),(33510,'relevement'),(33511,'relevement'),(33513,'ajout'),(33515,'ajout'),(33516,'ajout'),
  (33517,'ajout'),(33518,'ajout'),(33519,'ajout'),(33535,'relevement'),(33545,'ajout'),(33548,'relevement'),(33549,'relevement'),(33550,'relevement'),(33554,'ajout'),(33558,'relevement'),(33569,'relevement'),(33586,'ajout'),
  (33587,'ajout'),(33589,'ajout'),(33594,'ajout'),(33600,'relevement'),(33606,'ajout'),(33608,'relevement'),(33610,'ajout'),(33613,'ajout'),(33614,'ajout'),(33615,'ajout'),(33621,'relevement'),(33624,'ajout'),
  (33625,'ajout'),(33626,'relevement'),(33638,'ajout'),(33661,'relevement'),(33673,'ajout'),(33674,'ajout'),(33683,'relevement'),(33684,'relevement'),(33693,'ajout'),(33694,'ajout'),(33695,'ajout'),(33770,'relevement'),
  (33774,'relevement'),(33782,'relevement'),(33783,'relevement'),(33784,'relevement'),(33791,'ajout'),(33844,'ajout'),(33852,'relevement'),(33854,'ajout'),(33861,'relevement'),(33862,'ajout'),(33863,'ajout'),(33876,'ajout'),
  (33877,'ajout'),(33884,'ajout'),(33910,'ajout'),(33912,'relevement'),(33947,'relevement'),(33948,'relevement'),(33949,'relevement'),(33975,'relevement'),(33976,'relevement'),(33997,'ajout'),(34018,'relevement'),(34021,'ajout'),
  (34022,'ajout'),(34033,'relevement'),(34041,'relevement'),(34091,'relevement'),(34102,'relevement'),(34142,'ajout'),(34147,'relevement'),(34148,'relevement'),(34150,'ajout'),(34234,'ajout'),(34236,'ajout'),(34248,'ajout'),
  (34254,'ajout'),(34256,'relevement'),(34264,'relevement'),(34300,'relevement'),(34303,'relevement'),(34322,'ajout'),(34341,'relevement'),(34344,'ajout'),(34345,'ajout'),(34346,'relevement'),(34371,'relevement'),(34374,'ajout'),
  (34375,'ajout'),(34376,'relevement'),(34393,'ajout'),(34413,'ajout'),(34414,'ajout'),(34415,'ajout'),(34416,'ajout'),(34417,'ajout'),(34439,'relevement'),(34440,'relevement'),(34441,'relevement'),(34442,'relevement'),
  (34470,'relevement'),(34471,'relevement'),(34495,'ajout'),(34508,'relevement'),(34522,'relevement'),(34525,'ajout'),(34526,'ajout'),(34527,'relevement'),(34539,'relevement'),(34540,'ajout'),(34544,'relevement'),(34545,'ajout'),
  (34547,'relevement'),(34548,'relevement'),(34550,'ajout'),(34552,'relevement'),(34556,'relevement'),(34621,'ajout'),(34622,'ajout'),(34624,'ajout'),(34625,'relevement'),(34628,'relevement'),(34632,'relevement'),(34635,'relevement'),
  (34639,'ajout'),(34666,'relevement'),(34667,'relevement'),(34668,'relevement'),(34691,'ajout'),(34693,'relevement'),(34700,'ajout'),(34718,'ajout'),(34728,'relevement'),(34737,'relevement'),(34746,'relevement'),(34750,'relevement'),
  (34751,'ajout'),(34752,'relevement'),(34774,'ajout'),(34775,'ajout'),(34777,'ajout'),(34778,'relevement'),(34779,'relevement'),(34780,'relevement'),(34782,'relevement'),(34783,'relevement'),(34784,'relevement'),(34785,'relevement'),
  (34787,'relevement'),(34788,'relevement'),(34789,'relevement'),(34790,'relevement'),(34791,'relevement'),(34792,'relevement'),(34816,'ajout'),(34825,'ajout'),(34826,'ajout'),(34827,'ajout'),(34875,'ajout'),(34876,'relevement'),
  (34877,'relevement'),(34878,'relevement'),(34891,'relevement'),(34894,'ajout'),(34895,'ajout'),(34896,'relevement')
) as v(ligne, action) on v.ligne = s.ligne;

-- 4. check_interactions_v2 : blocs RCP ajoutés, le reste à l'identique de BDD-1c
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
  ),
  -- BDPM-1 G2 — interactions lues dans les RCP (interactions_rcp), à relire par un pharmacien.
  med_cids AS MATERIALIZED (
    SELECT mc.medicament_id, mc.nom, array_agg(DISTINCT mc.cid) AS cids FROM med_can mc GROUP BY mc.medicament_id, mc.nom
  ),
  rcp_hits AS (
    SELECT r.id, m.medicament_id AS mm, p.medicament_id AS mp, m.nom AS nom_m, p.nom AS nom_p,
      r.molecule_libelle, r.partenaire_libelle, r.niveau, r.description_carte,
      CASE r.niveau WHEN 'contre_indiquee' THEN 5 ELSE 4 END AS rang
    FROM interactions_rcp r
    JOIN med_cids m ON m.cids @> r.molecule_cids
    JOIN med_cids p ON p.medicament_id <> m.medicament_id
    WHERE r.exclue_motif IS NULL
      AND ((cardinality(r.partenaire_cids) > 0 AND p.cids && r.partenaire_cids)
        OR (r.partenaire_classe IS NOT NULL AND EXISTS (
              SELECT 1 FROM med_x bx JOIN v_ingredient_entites e ON e.ingredient_id = bx.ingredient_id
              WHERE bx.medicament_id = p.medicament_id AND e.entite = r.partenaire_classe)))
  ),
  rcp AS (
    SELECT DISTINCT ON (LEAST(h.mm, h.mp), GREATEST(h.mm, h.mp))
      CASE WHEN h.mm < h.mp THEN h.nom_m ELSE h.nom_p END AS nom_a,
      CASE WHEN h.mm < h.mp THEN h.nom_p ELSE h.nom_m END AS nom_b,
      CASE WHEN h.mm < h.mp THEN h.molecule_libelle ELSE h.partenaire_libelle END AS ing_a,
      CASE WHEN h.mm < h.mp THEN h.partenaire_libelle ELSE h.molecule_libelle END AS ing_b,
      CASE h.niveau WHEN 'contre_indiquee' THEN 'contre_indication' ELSE 'majeure' END AS severite,
      NULL::text AS niveau_ansm, h.description_carte AS description, 'RCP'::text AS source,
      LEAST(h.mm, h.mp) AS ma, GREATEST(h.mm, h.mp) AS mb, h.rang
    FROM rcp_hits h
    ORDER BY LEAST(h.mm, h.mp), GREATEST(h.mm, h.mp), h.rang DESC, h.id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'medicament_a',nom_a,'medicament_b',nom_b,'ingredient_a',ing_a,'ingredient_b',ing_b,
    'severite',severite,'niveau_ansm',niveau_ansm,'description',description,'source',source)),'[]'::jsonb)
  INTO v_i
  FROM (SELECT nom_a,nom_b,ing_a,ing_b,severite,niveau_ansm,description,source FROM ansm
        UNION ALL SELECT nom_a,nom_b,ing_a,ing_b,severite,niveau_ansm,description,source FROM ddi
        UNION ALL SELECT nom_a,nom_b,ing_a,ing_b,severite,niveau_ansm,description,source FROM cumul
        -- BDPM-1 G2 — carte RCP seulement si aucune carte ANSM / DDInter de la paire n'est au moins aussi sévère.
        UNION ALL SELECT r.nom_a,r.nom_b,r.ing_a,r.ing_b,r.severite,r.niveau_ansm,r.description,r.source FROM rcp r
          WHERE NOT EXISTS (SELECT 1 FROM ansm x WHERE x.ma = r.ma AND x.mb = r.mb
                              AND CASE x.niveau_ansm WHEN 'contre_indiquee' THEN 5 WHEN 'deconseillee' THEN 4
                                                     WHEN 'precaution' THEN 3 ELSE 2 END >= r.rang)
            AND NOT EXISTS (SELECT 1 FROM ddi_c d WHERE d.ma = r.ma AND d.mb = r.mb AND d.rang >= r.rang)) t;

  SELECT COALESCE(jsonb_agg(m.nom),'[]'::jsonb) INTO v_nv FROM medicaments m
  WHERE m.id = ANY(p_med_ids)
    AND NOT EXISTS (SELECT 1 FROM medicament_ingredients mi WHERE mi.medicament_id=m.id);

  SELECT COALESCE(jsonb_agg(m.nom),'[]'::jsonb) INTO v_ok FROM medicaments m
  WHERE m.id = ANY(p_med_ids)
    AND EXISTS (SELECT 1 FROM medicament_ingredients mi WHERE mi.medicament_id=m.id);

  RETURN jsonb_build_object('interactions',v_i,'medicaments_verifies',v_ok,'medicaments_non_verifiables',v_nv);
END;
$function$;

-- Contrôle « base = source » (doit renvoyer l'empreinte ci-dessus) :
--   select md5(string_agg(bdpm_ligne || '|' || niveau || '|' || action || '|' ||
--     (select string_agg(x::text, ',' order by x::text collate "C") from unnest(molecule_cids) x) || '|' ||
--     coalesce((select string_agg(x::text, ',' order by x::text collate "C") from unnest(partenaire_cids) x), '') || '|' ||
--     coalesce(partenaire_classe, ''), E'\n' order by bdpm_ligne)) from interactions_rcp;
