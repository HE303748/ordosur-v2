-- BDPM-2e (validé le 2026-11-16) : 217 lignes d'interactions_rcp dont le niveau venait d'un titre « Associations contre-indiquées »
-- reporté à tort. Cause : l'analyseur de BDPM-1 ne reconnaissait pas certains intertitres (« Précautions d'emploi, y compris les
-- adaptations posologiques », « Associations non recommandées », « Autres », tableau « Interactions », « Effets d'autres médicaments
-- sur … ») ; tout ce qui suivait héritait du titre précédent. Niveau repris d'après l'intertitre RÉEL du RCP, puis la phrase complète.
-- CLOZAPINE 163 ; AMITRIPTYLINE 27 ; BROMURE DE ROCURONIUM 15 ; ALFACALCIDOL 10 ; METHOTREXATE 1 ; FLUOXETINE 1.
-- 25 CI → déconseillée, 106 CI → précaution, 53 CI → à prendre en compte, 1 CI neutralisée (partenaire erroné),
-- 28 déconseillée → CI (clozapine × carbamazépine et autres myélosuppresseurs : « ne doit pas être utilisée de façon concomitante »),
-- 4 déconseillée → précaution (clozapine × lithium). Chaque ligne porte ci-dessous son niveau de départ, d'arrivée et la citation
-- qui le justifie : aucune baisse silencieuse. Le motif est aussi écrit dans bdpm_interactions_staging.raison.
-- Source : bdpm/2e/corrections_proposees.csv. GÉNÉRÉ par bdpm/2e/scripts/gen_migration_2e.py — ne pas modifier à la main.
do $$
declare n int; e text;
begin
  create temp table _c (ligne int primary key, avant text not null, apres text not null, motif text not null) on commit drop;
  insert into _c select unnest(array[24282, 24283, 24284, 24285, 24286, 24287, 24288, 24289, 24290, 24291]), 'contre-indique', 'a_prendre_en_compte', 'alfacalcidol — sous-titre de partenaire dans le bloc CI, mais phrase complète sans interdiction : « L’absorption … peut être altérée » / « Le risque d’hypercalcémie est augmenté » (seule la vitamine D porte « ne doivent pas être donnés »)';
  insert into _c select unnest(array[3695, 3696, 3697, 3698, 3712, 3713, 3714, 21145, 21146, 21147, 21148, 21162, 21163, 21164, 21203, 21204, 21205, 21206, 21220, 21221, 21222]), 'contre-indique', 'deconseille', 'amitriptyline — intertitre réel « Associations non recommandées » (et non « contre-indiquées »)';
  insert into _c select unnest(array[3708, 3709, 21158, 21159, 21216, 21217]), 'contre-indique', 'precaution', 'amitriptyline — phrase complète : « La prudence est également recommandée »';
  insert into _c select unnest(array[29928, 29929, 29930, 29931, 29932, 29933, 29934, 29935, 29936, 29937, 29938, 29939, 29940, 29942, 29943]), 'contre-indique', 'a_prendre_en_compte', 'bromure de rocuronium — intertitres réels « Effets d’autres médicaments sur ROCURONIUM » / « Effet accru » / « Diminution de l’effet » : aucune interdiction, effet pharmacodynamique décrit';
  insert into _c select unnest(array[5155, 24115, 24158, 24201]), 'contre-indique', 'a_prendre_en_compte', 'clozapine — intertitre réel « Autres » ; phrase descriptive : « ont été signalés », sans conduite à tenir';
  insert into _c select unnest(array[5140, 24099, 24142, 24185]), 'contre-indique', 'a_prendre_en_compte', 'clozapine — la phrase ne nomme que la fluvoxamine ; phrase suivante : pour les autres ISRS, interactions majeures « moins probables »';
  insert into _c select unnest(array[5142, 5143, 5144, 24101, 24102, 24103, 24144, 24145, 24146, 24187, 24188, 24189]), 'contre-indique', 'a_prendre_en_compte', 'clozapine — phrase : « des interactions pharmacocinétiques majeures avec la clozapine sont moins probables »';
  insert into _c select unnest(array[5145, 5146, 24104, 24105, 24147, 24148, 24190, 24191]), 'contre-indique', 'a_prendre_en_compte', 'clozapine — phrase : « sont peu probables bien que quelques cas aient été rapportés »';
  insert into _c select unnest(array[5134, 24093, 24136, 24179]), 'contre-indique', 'deconseille', 'clozapine — phrase complète sous le titre CI : « est déconseillée » / « doit être évitée »';
  insert into _c select unnest(array[5156, 24116, 24159, 24202]), 'contre-indique', 'precaution', 'clozapine — intertitre réel « Autres » ; phrase suivante : « une surveillance minutieuse doit impérativement être instaurée »';
  insert into _c select unnest(array[5135, 5136, 5137, 5138, 5139, 5141, 5148, 5149, 5151, 5152, 5153, 5163, 5164, 5165, 5166, 5167, 5168, 5169, 5170, 5171, 5172, 5173, 5174, 24094, 24095, 24096, 24097, 24098, 24100, 24107, 24108, 24109, 24111, 24112, 24113, 24123, 24124, 24125, 24126, 24127, 24128, 24129, 24130, 24131, 24132, 24133, 24134, 24137, 24138, 24139, 24140, 24141, 24143, 24150, 24151, 24152, 24154, 24155, 24156, 24166, 24167, 24168, 24169, 24170, 24171, 24172, 24173, 24174, 24175, 24176, 24177, 24180, 24181, 24182, 24183, 24184, 24186, 24193, 24194, 24195, 24197, 24198, 24199, 24209, 24210, 24211, 24212, 24213, 24214, 24215, 24216, 24217, 24218, 24219, 24220]), 'contre-indique', 'precaution', 'clozapine — intertitre réel « Précautions d’emploi, y compris les adaptations posologiques » (ou tableau « Interactions » : « la prudence est requise », « doivent être surveillés »)';
  insert into _c select unnest(array[5150, 24110, 24153, 24196]), 'deconseille', 'contre-indique', 'clozapine — phrase : « la carbamazépine (ne devant pas être associée avec la clozapine du fait de son potentiel myélosuppresseur) »';
  insert into _c select unnest(array[5157, 5158, 5159, 5160, 5161, 5162, 24117, 24118, 24119, 24120, 24121, 24122, 24160, 24161, 24162, 24163, 24164, 24165, 24203, 24204, 24205, 24206, 24207, 24208]), 'deconseille', 'contre-indique', 'clozapine — tableau : « La clozapine ne doit pas être utilisée de façon concomitante avec d’autres agents ayant un potentiel dépresseur de la moelle osseuse bien connu (voir rubrique 4.3) »';
  insert into _c select unnest(array[5154, 24114, 24157, 24200]), 'deconseille', 'precaution', 'clozapine — intertitre réel « Autres » ; tableau du même RCP : « Observer tout signe ou symptôme de SMN »';
  insert into _c select unnest(array[18376]), 'contre-indique', 'NEUTRALISER', 'fluoxetine — partenaire tiré des mots « syndrome malin des neuroleptiques » : pas une association de la fluoxétine avec un neuroleptique';
  insert into _c select unnest(array[2537]), 'contre-indique', 'precaution', 'methotrexate — phrase complète sous le titre CI : « une prudence extrême s’impose » (méthotrexate × AINS)';
  select count(*) into n from _c;
  if n <> 217 then raise exception '2e : % corrections, 217 attendues', n; end if;
  select count(*), md5(string_agg(c.ligne || ':' || s.empreinte, ',' order by c.ligne)) into n, e
    from _c c join public.bdpm_interactions_staging s on s.ligne = c.ligne and s.niveau = c.avant and s.statut in ('relu', 'auto') and s.empreinte = md5(s.citation);
  if n <> 217 or e <> '25be6dc256d50f4cd9a1fe9872d91350' then raise exception '2e : staging ≠ source (%, %)', n, e; end if;
  select count(*) into n from _c c join public.interactions_rcp r on r.bdpm_ligne = c.ligne
   where r.exclue_motif is null and r.niveau = case c.avant when 'contre-indique' then 'contre_indiquee' when 'deconseille' then 'deconseillee' end;
  if n <> 217 then raise exception '2e : état de départ du moteur inattendu (% lignes sur 217)', n; end if;

  update public.interactions_rcp r
     set niveau = case c.apres when 'contre-indique' then 'contre_indiquee' when 'deconseille' then 'deconseillee' else c.apres end
    from _c c where r.bdpm_ligne = c.ligne and c.apres <> 'NEUTRALISER';
  get diagnostics n = row_count;
  if n <> 216 then raise exception '2e : % niveaux corrigés, 216 attendus', n; end if;
  update public.interactions_rcp r set exclue_motif = 'BDPM-2e — ' || c.motif from _c c where r.bdpm_ligne = c.ligne and c.apres = 'NEUTRALISER';
  get diagnostics n = row_count;
  if n <> 1 then raise exception '2e : % lignes neutralisées, 1 attendue(s)', n; end if;
  update public.bdpm_interactions_staging s
     set niveau = case when c.apres = 'NEUTRALISER' then s.niveau else c.apres end,
         statut = case when c.apres = 'NEUTRALISER' then 'ecarte' else 'relu' end,
         raison = 'BDPM-2e (2026-11-16) : ' || c.avant || ' → ' || case when c.apres = 'NEUTRALISER' then 'écartée' else c.apres end || ' — ' || c.motif
    from _c c where s.ligne = c.ligne;

  select count(*) into n from _c c join public.interactions_rcp r on r.bdpm_ligne = c.ligne join public.bdpm_interactions_staging s on s.ligne = c.ligne
   where (c.apres = 'NEUTRALISER' and r.exclue_motif is not null and s.statut = 'ecarte')
      or (c.apres <> 'NEUTRALISER' and r.exclue_motif is null and s.niveau = c.apres
          and r.niveau = case c.apres when 'contre-indique' then 'contre_indiquee' when 'deconseille' then 'deconseillee' else c.apres end);
  if n <> 217 then raise exception '2e : état d''arrivée ≠ attendu (% lignes sur 217)', n; end if;
  select count(*) into n from public.interactions_rcp r join _c c on c.ligne = r.bdpm_ligne where r.niveau = 'contre_indiquee' and r.exclue_motif is null;
  if n <> 28 then raise exception '2e : % CI parmi les lignes corrigées, 28 attendues', n; end if;
  select count(*) into n from public.bdpm_interactions_staging s where s.statut in ('relu', 'auto') and not exists (select 1 from public.interactions_rcp i where i.bdpm_ligne = s.ligne);
  if n <> 0 then raise exception '2e : % lignes relues ou auto hors du moteur', n; end if;
  select count(*) into n from public.interactions_rcp; if n <> 36554 then raise exception '2e : % lignes, 36554 attendues', n; end if;
end $$;
