-- BDPM-2d, anomalie A3 (validée le 2026-11-15) : lignes « RCP EMA » d'interactions_rcp dont la phrase affirme l'ABSENCE d'effet
-- (« did not result in any changes », « no clinically significant », « no dose adjustment »…) ou est une phrase coupée sans verbe.
-- Cause : les PDF EMA ont été découpés en lignes physiques. Neutralisation RÉVERSIBLE (exclue_motif), jamais de suppression.
-- Périmètre : niveaux « précaution » et « à prendre en compte » seulement ; une CI ou une association déconseillée relue en BDPM-1
-- reste active même tronquée (8 déconseillées dans ce cas). Phrase sans verbe : prose de la rubrique 4.5 seulement.
-- Garde-fou : une phrase qui chiffre ou nomme un effet (hausse, baisse, %) reste active. « Not studied » n'est pas une absence d'effet.
-- Source : bdpm2d_staging lot 30 (classement local, bdpm/2d/anomalies/a3_classement.csv). GÉNÉRÉ par bdpm/2d/scripts/gen_a3_2d.py.
-- Résultat : 2 352 lignes neutralisées (2 300 « à prendre en compte », 52 « précaution ») ; 2 429 conservées
-- (1 977 « à prendre en compte », 161 « précaution », 129 « déconseillée », 162 « contre-indiquée »).
do $$
declare n int; e text; r record;
begin
  select count(*), md5(string_agg(t, ',' order by seq)) into n, e from public.bdpm2d_staging where lot = 30;
  if n <> 2360 or e <> '9dc8e31cef27a4d3c107d6b8662c377e' then raise exception 'A3 : lot 30 ≠ fichier local (%, %)', n, e; end if;

  create temp table _a3 on commit drop as
  select x.id, x.niveau, x.cl_loc,
         case when x.d ~* '\y(did|does) not\y|\yno (clinically |statistically )?(relevant|significant|meaningful|important|notable)|\yno (dose|dosage|dosing) adjustment|\yno (effect|interaction|change|influence|impact|difference|alteration|adjustment)s?\y|\ynot (clinically |statistically )?(relevant|significant|meaningful)|\y(is|are|was|were) not (affected|altered|changed|influenced|modified|expected|anticipated|necessary|required|needed|considered)|\ynot expected to|\yunlikely\y|\y(had|has|have|having) no\y|\ywithout (any |a )?(clinically |significant |relevant )|\yunaffected\y' and x.d !~* 'increas|decreas|reduc|elevat|higher|lower|[↑↓]|[0-9] ?%|fold\y' then 'NEG'
              when x.rubrique = '4.5' and x.format = 'europeen' and x.d !~* '\y(is|are|was|were|be|been|being|may|might|can|cannot|could|should|must|will|would|shall|has|have|had|does|do|did|cause|causes|lead|leads|avoid|use|uses|monitor|consider|reduce|reduces|increase|increases|decrease|decreases|inhibit|inhibits|induce|induces|affect|affects|alter|alters|require|requires|result|results|prolong|prolongs|potentiate|potentiates|enhance|enhances|lower|lowers|raise|raises|adjust|administer|take|give|show|shows|appear|appears|remain|remains|occur|occurs|exceed|interrupt|discontinue|recommend|include|includes)\y|[a-z]{3,}ed\y' then 'SANSV' end as cl_sql
    from (select i.id, i.niveau, regexp_replace(i.description_carte, '\s+', ' ', 'g') as d, s.rubrique, s.format,
                 (select split_part(l.t, '|', 2) from public.bdpm2d_staging l where l.lot = 30 and split_part(l.t, '|', 1)::int = i.bdpm_ligne) as cl_loc
            from public.interactions_rcp i join public.bdpm_interactions_staging s on s.ligne = i.bdpm_ligne
           where i.source_origine = 'RCP EMA' and i.exclue_motif is null) x;

  select count(*) into n from _a3 where cl_sql is distinct from cl_loc;
  if n <> 0 then raise exception 'A3 : % lignes classées différemment en SQL et dans le fichier local', n; end if;
  for r in select niveau, count(*) as tot, count(*) filter (where cl_loc is not null and niveau in ('precaution', 'a_prendre_en_compte')) as neu from _a3 group by niveau loop
    if (r.niveau, r.tot, r.neu) not in (('a_prendre_en_compte', 4277, 2300), ('precaution', 213, 52), ('deconseillee', 129, 0), ('contre_indiquee', 162, 0)) then
      raise exception 'A3 : comptes inattendus pour % (% actives, % à neutraliser)', r.niveau, r.tot, r.neu;
    end if;
  end loop;

  update public.interactions_rcp i set exclue_motif = 'Phrase EMA tronquée ou négative — à ré-extraire'
    from _a3 a where a.id = i.id and a.cl_loc is not null and a.niveau in ('precaution', 'a_prendre_en_compte');
  get diagnostics n = row_count;
  if n <> 2352 then raise exception 'A3 : % lignes neutralisées, 2352 attendues', n; end if;
  select count(*) into n from public.interactions_rcp where source_origine = 'RCP EMA' and exclue_motif is null;
  if n <> 2429 then raise exception 'A3 : % lignes EMA actives après, 2429 attendues', n; end if;
end $$;
