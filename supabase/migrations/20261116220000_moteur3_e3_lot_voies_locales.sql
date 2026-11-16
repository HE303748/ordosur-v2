-- Sprint MOTEUR-3, étape 3 — lot « voies locales » : contre-indications lues dans le RCP d'une forme locale et absentes du moteur.
-- GÉNÉRÉ par bdpm/moteur3/scripts/gen_e3_lot.py — ne pas modifier à la main.
-- Source : project/scripts/data/moteur3_e3.json (64 lignes), chargée dans bdpm2d_staging lot 41 (128 enregistrements).
-- Empreintes : staging 410fb9eec25cb15876ed0cdf6d8a7ba7 · lignes 3fb07e36fd5e2fec4fc9c4a6d16ca29b · liens 9c05a4e001bb46a4266a90bdac52ecaf
--
-- Méthode BDPM-2d : condition = formulation existante de ci_condition_concepts, un seul jeton par ligne (la molécule),
-- citation et référence lues dans le staging des RCP (bdpm_ci_staging / bdpm_grossesse_staging), lien « source » complet.
-- Chaque ligne porte la voie de son RCP (contraindications.voie) : elle ne vaut que pour les fiches de cette voie.
-- Elle est écrite NEUTRALISÉE (exclue_motif) : le client en production ne sait pas encore lire la voie et l'appliquerait
-- aux formes orales. L'activation se fait avec le filtre de voie (étape 4).

alter table public.contraindications add column if not exists voie text;
comment on column public.contraindications.voie is
  'MOTEUR-3 — voie du RCP dont vient la règle. Voie locale (cutanee, ophtalmique…) : la règle ne vaut que pour les fiches de cette voie. NULL : règle sans RCP ou de voie générale.';

do $$
declare n int; e text; k constant text := 'MOTEUR-3 — règle propre à une voie locale : en attente de l’activation du filtre de voie (étape 4)';
begin
  select count(*), md5(string_agg(t, chr(10) order by seq)) into n, e from bdpm2d_staging where lot = 41;
  if n <> 128 or e is distinct from '410fb9eec25cb15876ed0cdf6d8a7ba7' then raise exception 'MOTEUR-3 E3 : staging ≠ fichier source (%, %)', n, e; end if;
  if exists (select 1 from contraindications where bdpm_ref like 'm3:%') then raise exception 'MOTEUR-3 E3 : déjà appliqué'; end if;

  insert into contraindications (dci_pattern, condition_type, condition_valeur, severite, description, sources, sexe_applicable, bdpm_ref, voie, exclue_motif)
  select v.motif, v.ctype, v.cv, v.sev,
    'Source : RCP ' || s.source || ', CIS ' || s.cis || ' (RCP du ' || to_char(s.date_maj_rcp, 'DD/MM/YYYY') || '), forme ' || v.voie || '. « ' || s.citation || ' »',
    array['BDPM-RCP', 'MOTEUR-3 — lue dans le RCP d''une forme ' || v.voie || ' (CIS ' || s.cis || ')'],
    v.sexe, v.ref, v.voie, k
  from (select v.* from bdpm2d_staging g cross join lateral jsonb_to_record(g.t::jsonb)
          as v(ref text, motif text, ctype text, cv text, sev text, sexe text, voie text, typ text, pl int)
        where g.lot = 41 and g.kind = 'ligne') v
  join (select 'ci' typ, ligne, source, cis, date_maj_rcp, citation from bdpm_ci_staging
        union all select 'gr', ligne, source, cis, date_maj_rcp, citation from bdpm_grossesse_staging) s on s.typ = v.typ and s.ligne = v.pl
  order by v.ref;
  get diagnostics n = row_count;
  if n <> 64 then raise exception 'MOTEUR-3 E3 : % lignes écrites (attendu 64)', n; end if;

  insert into ci_sources_rcp (ci_id, molecule, cis, url, date_rcp, rubrique, citation, nature, staging_ligne, sprint)
  select c.id, v.mol, coalesce(ci.cis, gr.cis)::text, coalesce(ci.url, gr.url), coalesce(ci.date_maj_rcp, gr.date_maj_rcp),
         case v.typ when 'ci' then '4.3' else '4.6' end, coalesce(ci.citation, gr.citation), 'source', v.ligne, 'MOTEUR-3'
  from (select v.* from bdpm2d_staging g cross join lateral jsonb_to_record(g.t::jsonb) as v(ref text, mol text, typ text, ligne int)
        where g.lot = 41 and g.kind = 'lien') v
  join contraindications c on c.bdpm_ref = v.ref
  left join bdpm_ci_staging ci on v.typ = 'ci' and ci.ligne = v.ligne
  left join bdpm_grossesse_staging gr on v.typ = 'gr' and gr.ligne = v.ligne;

  -- contrôles « base = source »
  select count(*), md5(string_agg(c.bdpm_ref || '|' || c.dci_pattern || '|' || c.condition_type || '|' || c.condition_valeur || '|' || c.severite || '|' || coalesce(c.exclue_motif, '')
           || '|' || array_to_string(c.sources, ' ¤ ') || '|' || coalesce(c.sexe_applicable::text, '') || '|' || c.voie || '|' || md5(c.description), '#'
           order by c.bdpm_ref collate "C"))
    into n, e from contraindications c where c.bdpm_ref like 'm3:%';
  if n <> 64 or e is distinct from '3fb07e36fd5e2fec4fc9c4a6d16ca29b' then raise exception 'MOTEUR-3 E3 : lignes ≠ source (%, %)', n, e; end if;
  select count(*), md5(string_agg(c.bdpm_ref || '|' || s.molecule || '|' || s.rubrique || '|' || s.nature || '|' || s.cis || '|' || s.url || '|' || s.date_rcp || '|' || md5(s.citation), '#'
           order by c.bdpm_ref collate "C"))
    into n, e from ci_sources_rcp s join contraindications c on c.id = s.ci_id where s.sprint = 'MOTEUR-3';
  if n <> 64 or e is distinct from '9c05a4e001bb46a4266a90bdac52ecaf' then raise exception 'MOTEUR-3 E3 : liens ≠ source (%, %)', n, e; end if;
end $$;
