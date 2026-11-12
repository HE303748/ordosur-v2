-- BDPM-2d — correctif des motifs (2026-11-12), trouvé par la requête de preuve « ligne active étiquetée BDPM-RCP dont le
-- dci_pattern contient | » : 133 au lieu de 0. GÉNÉRÉ par bdpm/2d/scripts/gen_correctif_2d.py — ne pas modifier à la main.
-- 1. Un jeton d'une AUTRE molécule : « cyclophosphamide » sur la ligne hydrochlorothiazide × insuffisance rénale aiguë (DCI erroné
--    de fiches reliées à tort à l'hydrochlorothiazide) → retiré.
-- 2. Ligne historique carbocistéine | ambroxol × ulcère gastro-duodénal, relevée et étiquetée d'après le RCP de la carbocistéine
--    seule → scindée : l'ambroxol retrouve son niveau d'origine (relative), sans étiquette RCP.
-- 3. Une ligne étiquetée BDPM-RCP ne garde qu'un jeton : graphies redondantes retirées (75 lignes), autres libellés d'une
--    même composition recréés chacun en une ligne avec les mêmes liens (57 lignes scindées, 89 lignes créées).
--    La couverture des fiches est inchangée (un jeton retiré contient toujours un jeton gardé).
-- Contrôles d'empreinte dans la migration : état de départ, état d'arrivée, plus aucune ligne étiquetée à motif multiple.
do $$
declare n int; e text;
begin
  select count(*) into n from public.contraindications where exclue_motif is null and dci_pattern like '%|%' and 'BDPM-RCP' = any(sources);
  if n <> 133 then raise exception 'BDPM-2d correctif : état de départ inattendu (% lignes étiquetées à motif multiple)', n; end if;

  update public.contraindications set dci_pattern = 'hydrochlorothiazide 12|hydrochlorothiazide co|hydrochlorothiazide comp|hydrochlorothiazide mg'
   where bdpm_ref = '2d:ci:503:7b3be381' and dci_pattern = 'cyclophosphamide|hydrochlorothiazide 12|hydrochlorothiazide co|hydrochlorothiazide comp|hydrochlorothiazide mg';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'BDPM-2d correctif : ligne hydrochlorothiazide introuvable'; end if;

  insert into public.contraindications (dci_pattern, condition_type, condition_valeur, severite, description, mecanisme_fr, conduite_fr,
    sources, atc_code, age_min_mois, age_max_mois, sexe_applicable, bdpm_ref)
  select 'ambroxol', condition_type, condition_valeur, 'relative', description, mecanisme_fr, conduite_fr,
         array_remove(sources, 'BDPM-RCP') || array['BDPM-2d — éclatée depuis la ligne ' || id], atc_code, age_min_mois, age_max_mois, sexe_applicable, '2d:ef0fba4d:10319332'
    from public.contraindications where id = 'ef0fba4d-f467-4ce5-87b1-cf59ce52581a' and dci_pattern = 'carbocisteine|carbocistéine|ambroxol' and severite = 'absolue';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'BDPM-2d correctif : ligne carbocistéine | ambroxol introuvable'; end if;
  update public.contraindications set dci_pattern = 'carbocisteine' where id = 'ef0fba4d-f467-4ce5-87b1-cf59ce52581a';

  create temp table _bdpm2d_tok on commit drop as
    select c.id, c.bdpm_ref, x.tok, row_number() over (partition by c.id order by x.tok collate "C") rn
    from public.contraindications c
    cross join lateral (select distinct tok from unnest(string_to_array(c.dci_pattern, '|')) tok) x
    where c.exclue_motif is null and c.dci_pattern like '%|%' and 'BDPM-RCP' = any(c.sources)
      and not exists (select 1 from unnest(string_to_array(c.dci_pattern, '|')) u where u <> x.tok and position(u in x.tok) > 0);

  insert into public.contraindications (dci_pattern, condition_type, condition_valeur, severite, description, mecanisme_fr, conduite_fr,
    sources, atc_code, age_min_mois, age_max_mois, sexe_applicable, bdpm_ref)
  select t.tok, c.condition_type, c.condition_valeur, c.severite, c.description, c.mecanisme_fr, c.conduite_fr, c.sources, c.atc_code, c.age_min_mois, c.age_max_mois,
         c.sexe_applicable, c.bdpm_ref || ':' || t.rn
    from _bdpm2d_tok t join public.contraindications c on c.id = t.id where t.rn > 1;
  insert into public.ci_sources_rcp (ci_id, molecule, cis, ema_produit, url, date_rcp, rubrique, citation, nature, staging_ligne, sprint)
  select n2.id, s.molecule, s.cis, s.ema_produit, s.url, s.date_rcp, s.rubrique, s.citation, s.nature, s.staging_ligne, s.sprint
    from _bdpm2d_tok t join public.contraindications n2 on n2.bdpm_ref = t.bdpm_ref || ':' || t.rn join public.ci_sources_rcp s on s.ci_id = t.id where t.rn > 1;
  update public.contraindications c set dci_pattern = t.tok from _bdpm2d_tok t where t.id = c.id and t.rn = 1;

  select count(*) into n from public.contraindications where exclue_motif is null and dci_pattern like '%|%' and 'BDPM-RCP' = any(sources);
  if n <> 0 then raise exception 'BDPM-2d correctif : il reste % lignes étiquetées à motif multiple', n; end if;
  select count(*), md5(string_agg(public.bdpm2d_cle(c.bdpm_ref, c.id) || '|' || c.dci_pattern || '|' || c.condition_type || '|' || c.condition_valeur || '|' || c.severite || '|' || coalesce(c.exclue_motif, '') || '|' || coalesce(array_to_string(c.sources, ' ¤ '), '') || '|' || coalesce(c.sexe_applicable, '') || '|' || md5(coalesce(c.description, '')), '#' order by public.bdpm2d_cle(c.bdpm_ref, c.id) collate "C")) into n, e from public.contraindications c where c.bdpm_ref like '2d:%' or c.id = 'ef0fba4d-f467-4ce5-87b1-cf59ce52581a';
  if n <> 992 or e <> '248c9a026db0df24d88923e73321d1e3' then raise exception 'BDPM-2d correctif : état d''arrivée ≠ attendu (%, %)', n, e; end if;
  select count(*) into n from public.contraindications c where c.exclue_motif is null and 'BDPM-RCP' = any(c.sources)
    and not exists (select 1 from public.ci_sources_rcp s where s.ci_id = c.id and s.nature = 'source');
  if n <> 0 then raise exception 'BDPM-2d correctif : % lignes étiquetées sans lien source', n; end if;
  drop table _bdpm2d_tok;
end $$;
