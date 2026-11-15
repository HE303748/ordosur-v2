-- BDPM-2d, anomalie A1 (validée le 2026-11-15) : trinitrine × allaitement — absolue → relative.
-- Le RCP (CIS 60259242, rubrique 4.3) place « allaitement. » sous le titre « Ce médicament NE DOIT GENERALEMENT PAS ETRE UTILISE en cas de: » :
-- contre-indication relative. L'analyseur avait ignoré le titre pour la catégorie « allaitement ». Seul cas sur 9 601 lignes contrôlées.
-- GÉNÉRÉ par bdpm/2d/scripts/gen_anomalies_2d.py — ne pas modifier à la main. La baisse est tracée dans « sources ».
do $$
declare n int; v uuid;
begin
  select count(*), min(id::text)::uuid into n, v from public.contraindications
   where bdpm_ref = '2d:ci:8741:6f029a08' and dci_pattern = 'trinitrine' and condition_valeur = 'Allaitement' and severite = 'absolue' and exclue_motif is null
     and md5(description) = '07fe1982409d77a106de1eb9f71659ab';
  if n <> 1 then raise exception 'A1 : état de départ inattendu (% ligne)', n; end if;
  update public.contraindications set severite = 'relative', description = 'Source : RCP BDPM, CIS 60259242 (RCP du 22/10/2024). Sous le titre « Ce médicament NE DOIT GENERALEMENT PAS ETRE UTILISE en cas de: » : « allaitement. »',
         sources = sources || array['BDPM-2d — niveau corrigé le 2026-11-15 : absolue → relative (item placé sous le titre « NE DOIT GENERALEMENT PAS ETRE UTILISE »)']
   where id = v;
  insert into public.ci_sources_rcp (ci_id, molecule, cis, url, date_rcp, rubrique, citation, nature, staging_ligne, sprint)
  select ci_id, molecule, cis, url, date_rcp, rubrique, 'Ce médicament NE DOIT GENERALEMENT PAS ETRE UTILISE en cas de:', 'indice', staging_ligne, 'BDPM-2d'
    from public.ci_sources_rcp where ci_id = v and nature = 'source' and citation = 'allaitement.';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'A1 : lien source introuvable (%)', n; end if;
  select count(*) into n from public.contraindications where id = v and severite = 'relative' and md5(description) = 'd40d5c6dbb2d5ed1683177d943ba191f' and cardinality(sources) = 3;
  if n <> 1 then raise exception 'A1 : état d''arrivée ≠ attendu'; end if;
  select count(*) into n from public.contraindications where dci_pattern ~* 'trinitrine' and condition_valeur = 'Allaitement' and severite = 'absolue' and exclue_motif is null;
  if n <> 0 then raise exception 'A1 : il reste % ligne absolue', n; end if;
end $$;
