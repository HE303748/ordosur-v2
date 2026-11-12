-- BDPM-2d — socle des migrations (validé le 2026-11-11 après ⛔ STOP). N'écrit dans AUCUNE table du moteur.
-- 1. public.bdpm2d_staging : données des lots (hors moteur ; RLS sans politique : propriétaire et fonction de chargement seulement).
--    Chaque enregistrement est un texte JSON EXACT produit par bdpm/2d/scripts/gen_migrations_2d.py (source :
--    project/scripts/data/bdpm2d.json) ; chaque migration vérifie md5(textes du lot) = empreinte de la source.
-- 2. ci_sources_rcp : source EMA autorisée (CONTRAT §2 amendé le 2026-11-11) — CIS (BDPM) OU numéro de produit EMA (EPAR).
-- 3. Fonctions de lot : appelées par les migrations suivantes avec les empreintes attendues ; au moindre écart elles lèvent une
--    exception, ce qui annule toute la migration. Elles sont supprimées par la migration bdpm2d_cloture.

create table if not exists public.bdpm2d_staging (
  lot   smallint not null,
  seq   integer  not null,
  kind  text     not null check (kind in ('concept', 'form', 'ratt', 'ligne', 'maj', 'neutr', 'restr', 'lien')),
  t     text     not null,
  primary key (lot, seq)
);
alter table public.bdpm2d_staging enable row level security;

alter table public.ci_sources_rcp add column if not exists ema_produit text;
alter table public.ci_sources_rcp alter column cis drop not null;
alter table public.ci_sources_rcp drop constraint if exists ci_sources_rcp_cis_check;
alter table public.ci_sources_rcp add constraint ci_sources_rcp_cis_check check (
  (cis is not null and cis ~ '^[0-9]{8}$') or (cis is null and ema_produit ~ '^EMEA/H/C/[0-9]{6}$'));
create unique index if not exists ci_sources_rcp_lien_ema
  on public.ci_sources_rcp (ci_id, molecule, ema_produit, rubrique, nature, md5(citation)) where cis is null;
comment on column public.ci_sources_rcp.ema_produit is
  'BDPM-2d — numéro de produit EMA (EPAR, « EMEA/H/C/000000 ») quand le RCP n''a pas de CIS français ; sinon NULL et cis renseigné.';

-- Clé stable d'une ligne de contraindications : bdpm_ref pour les lignes générées par 2c-bis / 2d, sinon l'id.
create or replace function public.bdpm2d_cle(p_ref text, p_id uuid) returns text language sql immutable as
$$ select case when p_ref like '2cbis:%' or p_ref like '2d:%' then p_ref else p_id::text end $$;
revoke all on function public.bdpm2d_cle(text, uuid) from public, anon, authenticated;

create or replace function public.bdpm2d_referentiel(p_n int, p_stg text, p_cur_av text, p_cc_av text,
                                                     p_cur_n int, p_cur_ap text, p_cc_n int, p_cc_ap text)
returns void language plpgsql set search_path = public as $f$
declare n int; e text;
begin
  select count(*), md5(string_agg(t, chr(10) order by seq)) into n, e from bdpm2d_staging where lot = 0;
  if n <> p_n or e <> p_stg then raise exception 'BDPM-2d référentiel : staging ≠ fichier source (%, %)', n, e; end if;
  select md5(string_agg(l, chr(10) order by l collate "C")) into e from (select nom_fr || '|' || coalesce(synonymes, 'null') l from pathologies_curees) x;
  if e <> p_cur_av then raise exception 'BDPM-2d référentiel : pathologies_curees de départ ≠ fixture du projet (%)', e; end if;
  select md5(string_agg(l, chr(10) order by l collate "C")) into e from (
    select condition_norm || '|' || ordre || '|' || libelle || '|' || traitement || '|' || coalesce(concept, '') || '|' || coalesce(famille, '') || '|' || coalesce(qualificatif, '')
           || '|' || coalesce(qualificatif_type, '') || '|' || coalesce(trim_scale(stade)::text, '') || '|' || coalesce(note, '') l from ci_condition_concepts) x;
  if e <> p_cc_av then raise exception 'BDPM-2d référentiel : ci_condition_concepts de départ ≠ fixture du projet (%)', e; end if;

  insert into pathologies_curees (nom_fr, categorie, code_cim10, synonymes)
  select v.nom, v.cat, v.cim, v.syn
  from bdpm2d_staging s cross join lateral jsonb_to_record(s.t::jsonb) as v(nom text, cat text, cim text, syn text)
  where s.lot = 0 and s.kind = 'concept' order by s.seq;

  insert into ci_condition_concepts (condition_norm, condition_valeur, ordre, libelle, traitement, concept, famille, qualificatif, qualificatif_type, note)
  select v.cn, v.cv, v.ordre, v.lib, v.trait, v.concept, v.fam, v.q, v.qt, v.note
  from bdpm2d_staging s cross join lateral jsonb_to_record(s.t::jsonb) as v(cn text, cv text, ordre smallint, lib text, trait text, concept text, fam text, q text, qt text, note text)
  where s.lot = 0 and s.kind = 'form' order by s.seq;

  update ci_condition_concepts c set traitement = 'concept', concept = v.concept, qualificatif = v.q, qualificatif_type = v.qt, note = null
  from (select v.* from bdpm2d_staging s cross join lateral jsonb_to_record(s.t::jsonb) as v(cv text, concept text, q text, qt text)
        where s.lot = 0 and s.kind = 'ratt') v
  where c.condition_valeur = v.cv;

  select count(*), md5(string_agg(l, chr(10) order by l collate "C")) into n, e from (select nom_fr || '|' || coalesce(synonymes, 'null') l from pathologies_curees) x;
  if n <> p_cur_n or e <> p_cur_ap then raise exception 'BDPM-2d référentiel : pathologies_curees ≠ attendu (%, %)', n, e; end if;
  select count(*), md5(string_agg(l, chr(10) order by l collate "C")) into n, e from (
    select condition_norm || '|' || ordre || '|' || libelle || '|' || traitement || '|' || coalesce(concept, '') || '|' || coalesce(famille, '') || '|' || coalesce(qualificatif, '')
           || '|' || coalesce(qualificatif_type, '') || '|' || coalesce(trim_scale(stade)::text, '') || '|' || coalesce(note, '') l from ci_condition_concepts) x;
  if n <> p_cc_n or e <> p_cc_ap then raise exception 'BDPM-2d référentiel : ci_condition_concepts ≠ attendu (%, %)', n, e; end if;
end $f$;
revoke all on function public.bdpm2d_referentiel(int, text, text, text, int, text, int, text) from public, anon, authenticated;

create or replace function public.bdpm2d_lot(p_lot int, p_n int, p_stg text, p_ex_n int, p_avant text, p_apres text,
                                             p_new_n int, p_new text, p_liens_n int, p_liens text)
returns void language plpgsql set search_path = public as $f$
declare
  n int; e text;
  k_rcp constant text := 'BDPM-RCP';
  k_ph  constant text := 'Ordosur — à valider par un pharmacien';
  k_old constant text := 'Ordosur-pharmacien';
begin
  select count(*), md5(string_agg(t, chr(10) order by seq)) into n, e from bdpm2d_staging where lot = p_lot;
  if n <> p_n or e <> p_stg then raise exception 'BDPM-2d lot % : staging ≠ fichier source (%, %)', p_lot, n, e; end if;

  -- lignes existantes touchées (mises à jour, neutralisations, restrictions, lignes de groupe éclatées)
  create temp table _bdpm2d_ex on commit drop as
    select c.id, x.k
    from (select s.t::jsonb ->> 'id' k from bdpm2d_staging s where s.lot = p_lot and s.kind in ('maj', 'neutr', 'restr')
          union
          select s.t::jsonb ->> 'src' from bdpm2d_staging s where s.lot = p_lot and s.kind = 'ligne' and s.t::jsonb ? 'src') x
    join contraindications c on bdpm2d_cle(c.bdpm_ref, c.id) = x.k;
  select count(*), md5(string_agg(x.k || '|' || c.dci_pattern || '|' || c.condition_type || '|' || c.condition_valeur || '|' || c.severite || '|' || coalesce(c.exclue_motif, '')
           || '|' || coalesce(array_to_string(c.sources, ' ¤ '), '') || '|' || coalesce(c.sexe_applicable, ''), '#' order by x.k collate "C"))
    into n, e from _bdpm2d_ex x join contraindications c on c.id = x.id;
  if n <> p_ex_n or coalesce(e, '') <> p_avant then raise exception 'BDPM-2d lot % : état de départ ≠ source (%, %)', p_lot, n, e; end if;
  if exists (select 1 from contraindications where bdpm_ref in (select s.t::jsonb ->> 'ref' from bdpm2d_staging s where s.lot = p_lot and s.kind = 'ligne')) then
    raise exception 'BDPM-2d lot % : déjà appliqué', p_lot;
  end if;

  -- 1. lignes recréées par molécule depuis une ligne de groupe (texte de la ligne d'origine conservé)
  insert into contraindications (dci_pattern, condition_type, condition_valeur, severite, description, mecanisme_fr, conduite_fr,
    sources, atc_code, age_min_mois, age_max_mois, sexe_applicable, bdpm_ref)
  select v.motif, c.condition_type, c.condition_valeur, v.sev, c.description, c.mecanisme_fr, c.conduite_fr,
    array_remove(array_remove(array_remove(coalesce(c.sources, '{}'::text[]), k_rcp), k_old), k_ph)
      || (case v.etiq when 'R' then array[k_rcp] when 'P' then array[k_ph] else '{}'::text[] end)
      || array['BDPM-2d — éclatée depuis la ligne ' || c.id],
    c.atc_code, c.age_min_mois, c.age_max_mois, c.sexe_applicable, v.ref
  from (select v.* from bdpm2d_staging s cross join lateral jsonb_to_record(s.t::jsonb) as v(ref text, motif text, sev text, etiq text, src text)
        where s.lot = p_lot and s.kind = 'ligne' and s.t::jsonb ? 'src') v
  join _bdpm2d_ex x on x.k = v.src join contraindications c on c.id = x.id
  order by v.ref;

  -- 2. lignes lues dans un RCP (la citation et sa référence viennent du staging des RCP, jamais du fichier)
  insert into contraindications (dci_pattern, condition_type, condition_valeur, severite, description, sources, sexe_applicable, bdpm_ref)
  select v.motif, v.ctype, v.cv, v.sev,
    coalesce(v.mention || ' ', '') || 'Source : RCP ' || s.source || ', CIS ' || s.cis || ' (RCP du ' || to_char(s.date_maj_rcp, 'DD/MM/YYYY') || '). « ' || s.citation || ' »',
    (case v.etiq when 'R' then array[k_rcp] when 'P' then array[k_ph] else '{}'::text[] end) || array['BDPM-2d — lue dans le RCP (CIS ' || s.cis || ')'],
    v.sexe, v.ref
  from (select v.* from bdpm2d_staging s cross join lateral jsonb_to_record(s.t::jsonb)
          as v(ref text, motif text, ctype text, cv text, sev text, sexe text, etiq text, typ text, pl int, mention text)
        where s.lot = p_lot and s.kind = 'ligne' and not (s.t::jsonb ? 'src')) v
  join (select 'ci' typ, ligne, source, cis, date_maj_rcp, citation from bdpm_ci_staging
        union all select 'gr', ligne, source, cis, date_maj_rcp, citation from bdpm_grossesse_staging) s on s.typ = v.typ and s.ligne = v.pl
  order by v.ref;

  -- 3. lignes existantes : étiquette et niveau, neutralisation, restriction
  update contraindications c set severite = coalesce(v.sev, c.severite),
    sources = array_remove(array_remove(array_remove(coalesce(c.sources, '{}'::text[]), k_rcp), k_old), k_ph)
              || (case v.etiq when 'R' then array[k_rcp] when 'P' then array[k_ph] else '{}'::text[] end)
  from (select v.* from bdpm2d_staging s cross join lateral jsonb_to_record(s.t::jsonb) as v(id text, sev text, etiq text) where s.lot = p_lot and s.kind = 'maj') v
  join _bdpm2d_ex x on x.k = v.id where c.id = x.id;

  update contraindications c set exclue_motif = v.excl,
    sources = array_remove(array_remove(array_remove(coalesce(c.sources, '{}'::text[]), k_rcp), k_old), k_ph) || array[v.trace]
  from (select v.* from bdpm2d_staging s cross join lateral jsonb_to_record(s.t::jsonb) as v(id text, excl text, trace text) where s.lot = p_lot and s.kind = 'neutr') v
  join _bdpm2d_ex x on x.k = v.id where c.id = x.id;

  update contraindications c set dci_pattern = v.motif,
    sources = array_remove(array_remove(array_remove(coalesce(c.sources, '{}'::text[]), k_rcp), k_old), k_ph)
              || array['Ordosur — motif ambigu (sous-chaîne d''une autre molécule) — à valider par un pharmacien', 'BDPM-2d — restreinte aux molécules à motif ambigu']
  from (select v.* from bdpm2d_staging s cross join lateral jsonb_to_record(s.t::jsonb) as v(id text, motif text) where s.lot = p_lot and s.kind = 'restr') v
  join _bdpm2d_ex x on x.k = v.id where c.id = x.id;

  -- 4. liens de source
  insert into ci_sources_rcp (ci_id, molecule, cis, url, date_rcp, rubrique, citation, nature, staging_ligne, sprint)
  select c.id, v.mol, coalesce(ci.cis, gr.cis, se.cis)::text, coalesce(ci.url, gr.url, se.url), coalesce(ci.date_maj_rcp, gr.date_maj_rcp, se.date_maj_rcp),
         case v.typ when 'ci' then '4.3' when 'gr' then '4.6' else v.rub end,
         coalesce(ci.citation, gr.citation, substring(se.texte from v.pos for v.len)), v.nat, v.ligne, 'BDPM-2d'
  from (select v.* from bdpm2d_staging s cross join lateral jsonb_to_record(s.t::jsonb)
          as v(ref text, mol text, nat text, typ text, rub text, ligne int, cis bigint, pos int, len int)
        where s.lot = p_lot and s.kind = 'lien') v
  join contraindications c on bdpm2d_cle(c.bdpm_ref, c.id) = v.ref
  left join bdpm_ci_staging ci on v.typ = 'ci' and ci.ligne = v.ligne
  left join bdpm_grossesse_staging gr on v.typ = 'gr' and gr.ligne = v.ligne
  left join bdpm_rcp_sections se on v.typ = 'sec' and se.cis = v.cis and se.section = v.rub and se.source = 'BDPM';

  -- contrôles d'arrivée
  select count(*), md5(string_agg(x.k || '|' || c.dci_pattern || '|' || c.condition_type || '|' || c.condition_valeur || '|' || c.severite || '|' || coalesce(c.exclue_motif, '')
           || '|' || coalesce(array_to_string(c.sources, ' ¤ '), '') || '|' || coalesce(c.sexe_applicable, ''), '#' order by x.k collate "C"))
    into n, e from _bdpm2d_ex x join contraindications c on c.id = x.id;
  if n <> p_ex_n or coalesce(e, '') <> p_apres then raise exception 'BDPM-2d lot % : lignes existantes ≠ attendu (%, %)', p_lot, n, e; end if;
  select count(*), md5(string_agg(c.bdpm_ref || '|' || c.dci_pattern || '|' || c.condition_type || '|' || c.condition_valeur || '|' || c.severite || '|' || coalesce(c.exclue_motif, '')
           || '|' || coalesce(array_to_string(c.sources, ' ¤ '), '') || '|' || coalesce(c.sexe_applicable, '') || '|' || md5(coalesce(c.description, '')), '#'
           order by c.bdpm_ref collate "C"))
    into n, e from contraindications c where c.bdpm_ref in (select s.t::jsonb ->> 'ref' from bdpm2d_staging s where s.lot = p_lot and s.kind = 'ligne');
  if n <> p_new_n or coalesce(e, '') <> p_new then raise exception 'BDPM-2d lot % : lignes nouvelles ≠ attendu (%, %)', p_lot, n, e; end if;
  select count(*), md5(string_agg(c.k || '|' || s.molecule || '|' || s.rubrique || '|' || s.nature || '|' || s.cis || '|' || s.url || '|' || s.date_rcp || '|' || md5(s.citation), '#'
           order by c.k collate "C", s.molecule collate "C", s.rubrique collate "C", s.nature collate "C", md5(s.citation) collate "C"))
    into n, e
    from ci_sources_rcp s join (select id, bdpm2d_cle(bdpm_ref, id) k from contraindications) c on c.id = s.ci_id
   where s.sprint = 'BDPM-2d' and c.k in (select s2.t::jsonb ->> 'ref' from bdpm2d_staging s2 where s2.lot = p_lot and s2.kind = 'lien');
  if n <> p_liens_n or coalesce(e, '') <> p_liens then raise exception 'BDPM-2d lot % : liens ≠ attendu (%, %)', p_lot, n, e; end if;
  drop table _bdpm2d_ex;
end $f$;
revoke all on function public.bdpm2d_lot(int, int, text, int, text, text, int, text, int, text) from public, anon, authenticated;
