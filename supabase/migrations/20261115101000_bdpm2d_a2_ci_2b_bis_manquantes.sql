-- BDPM-2d, anomalie A2 (validée le 2026-11-15) : 201 contre-indications relues en BDPM-2b-bis, restées hors d'interactions_rcp.
-- Cause : la migration 20261108040000_bdpm2b_bis_rcp_resolution ne prenait que le statut « auto » ; les 201 lignes résolues à la main
-- portent le statut « relu » (ex. escitalopram × IMAO, clarithromycine × mizolastine, carvédilol × antiarythmiques de classe I).
-- Source unique : bdpm_interactions_staging. Même projection que la migration d'origine. GÉNÉRÉ par bdpm/2d/scripts/gen_anomalies_2d.py.
-- Contrôles dans la migration : liste des lignes (md5), contenu (md5), total avant et après.
do $$
declare n int; e text; e2 text;
begin
  select count(*) into n from public.interactions_rcp;
  if n <> 34297 then raise exception 'A2 : interactions_rcp compte % lignes, 34297 attendues', n; end if;
  select count(*), md5(string_agg(s.ligne::text, ',' order by s.ligne)),
         md5(string_agg(s.ligne || '|' || s.cis || '|' || array_to_string(s.canonical_ids, '/') || '|' || array_to_string(s.partenaire_canonical_ids, '/') || '|' || coalesce(s.partenaire_classe, '') || '|' || s.empreinte, '#' order by s.ligne))
    into n, e, e2
    from public.bdpm_interactions_staging s
   where s.statut = 'relu' and s.niveau = 'contre-indique' and not exists (select 1 from public.interactions_rcp r where r.bdpm_ligne = s.ligne);
  if n <> 201 or e <> 'ffed7b6cf6f3197b85c60fad563a3d2d' or e2 <> 'd6940d79772bc231a65318cf54f74080' then raise exception 'A2 : source ≠ attendu (%, %, %)', n, e, e2; end if;

  insert into public.interactions_rcp (
    molecule_cids, molecule_libelle, partenaire_cids, partenaire_classe, partenaire_libelle,
    niveau, condition, citation, description_carte,
    source_origine, source_cis, source_url, source_date,
    statut_relecture, action, bdpm_ligne)
  select s.canonical_ids, lower(s.composition), s.partenaire_canonical_ids, s.partenaire_classe,
         lower(coalesce(s.partenaire_classe, (select string_agg(i.name_en, ' / ' order by i.name_en) from public.ingredients i where i.id = any(s.partenaire_canonical_ids)))),
         'contre_indiquee', s.condition, s.citation, coalesce(s.phrase, s.citation),
         'RCP ' || s.source, s.cis, s.url, s.date_maj_rcp, 'a_relire_pharmacien', 'ajout', s.ligne
    from public.bdpm_interactions_staging s
   where s.statut = 'relu' and s.niveau = 'contre-indique' and not exists (select 1 from public.interactions_rcp r where r.bdpm_ligne = s.ligne);
  get diagnostics n = row_count;
  if n <> 201 then raise exception 'A2 : % lignes insérées, 201 attendues', n; end if;

  select count(*) into n from public.interactions_rcp;
  if n <> 34498 then raise exception 'A2 : total après = %, 34498 attendu', n; end if;
  select count(*) into n from public.bdpm_interactions_staging s
   where s.statut in ('relu', 'auto') and not exists (select 1 from public.interactions_rcp r where r.bdpm_ligne = s.ligne);
  if n <> 0 then raise exception 'A2 : il reste % lignes relues ou auto hors du moteur', n; end if;
end $$;
