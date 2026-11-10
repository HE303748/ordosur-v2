-- BDPM-2c-bis, étape 3 — lot 5/13 : 261 lignes de contraindications écrites
--   4 neutralisations de lignes de groupe · 55 restrictions (motif ambigu) · 0 mises à jour
--   de lignes mono-molécule · 0 réactivation(s) · 202 lignes recréées par molécule · 131 liens ci_sources_rcp.
-- GÉNÉRÉ par bdpm/2cbis/scripts/gen_migrations_2cbis.py depuis project/scripts/data/bdpm2c_bis.json — ne pas modifier à la main.
-- Option O1 et décision 2 (suppressions : bdpm/2cbis/decisions_suppression.json) validées le 2026-11-09.
-- Données : public.bdpm2cbis_staging, lot 5 (392 enregistrements) chargés depuis le fichier source ; contrôle md5 ci-dessous.
-- Les citations ne sont pas recopiées : lues en base (bdpm_ci_staging / bdpm_grossesse_staging / bdpm_rcp_sections) puis contrôlées.

do $$
declare n int; e text;
begin
  select count(*), md5(string_agg(t, chr(10) order by seq)) into n, e from public.bdpm2cbis_staging where lot = 5;
  if n <> 392 or e <> '91d17d2c68e22d46cce27c4f72cf599e' then raise exception 'BDPM-2c-bis lot 5 : staging ≠ fichier source (%, %)', n, e; end if;
  select count(*), md5(string_agg(id::text||'|'||dci_pattern||'|'||severite||'|'||coalesce(exclue_motif,'')||'|'||coalesce(array_to_string(sources,' ¤ '),''), '#' order by id::text collate "C")) into n, e from public.contraindications where id in (select (s.t::jsonb->>'id')::uuid from public.bdpm2cbis_staging s where s.lot = 5 and s.kind in ('neutr','restr','maj','react') union select (s.t::jsonb->>'source')::uuid from public.bdpm2cbis_staging s where s.lot = 5 and s.kind = 'ajout');
  if n <> 59 or e <> '246e4efa4b3af91ecc05002358b3ed49' then raise exception 'BDPM-2c-bis lot 5 : état de départ ≠ source (%, %)', n, e; end if;
  if exists (select 1 from public.contraindications where bdpm_ref in (select s.t::jsonb->>'ref' from public.bdpm2cbis_staging s where s.lot = 5 and s.kind = 'ajout')) then raise exception 'BDPM-2c-bis lot 5 : déjà appliqué'; end if;
end $$;

insert into public.contraindications (dci_pattern, condition_type, condition_valeur, severite, description, mecanisme_fr, conduite_fr,
  sources, atc_code, age_min_mois, age_max_mois, sexe_applicable, bdpm_ref)
select v.motif, c.condition_type, c.condition_valeur, v.sev, c.description, c.mecanisme_fr, c.conduite_fr,
  array_remove(array_remove(coalesce(c.sources, '{}'::text[]), 'BDPM-RCP'), 'Ordosur-pharmacien') || (case v.etiq when 'R' then array['BDPM-RCP'] when 'P' then array['Ordosur — à valider par un pharmacien'] else '{}'::text[] end) || array['BDPM-2c-bis — éclatée depuis la ligne ' || c.id],
  c.atc_code, c.age_min_mois, c.age_max_mois, c.sexe_applicable, v.ref
from public.contraindications c
join (select v.* from public.bdpm2cbis_staging s cross join lateral jsonb_to_record(s.t::jsonb) as v(source uuid, motif text, sev text, etiq text, ref text) where s.lot = 5 and s.kind = 'ajout') v on c.id = v.source
order by v.ref;

update public.contraindications c set exclue_motif = 'Éclatée par molécule — BDPM-2c-bis',
  sources = array_remove(array_remove(coalesce(c.sources, '{}'::text[]), 'BDPM-RCP'), 'Ordosur-pharmacien') || array['BDPM-2c-bis — éclatée par molécule (lignes 2cbis:' || left(c.id::text, 8) || ':*)']
from (select v.* from public.bdpm2cbis_staging s cross join lateral jsonb_to_record(s.t::jsonb) as v(id uuid) where s.lot = 5 and s.kind = 'neutr') v where c.id = v.id;

update public.contraindications c set dci_pattern = v.motif, severite = v.sev,
  sources = array_remove(array_remove(coalesce(c.sources, '{}'::text[]), 'BDPM-RCP'), 'Ordosur-pharmacien') || array['Ordosur — motif ambigu (sous-chaîne d''une autre molécule) — à valider par un pharmacien', 'BDPM-2c-bis — restreinte aux molécules à motif ambigu']
from (select v.* from public.bdpm2cbis_staging s cross join lateral jsonb_to_record(s.t::jsonb) as v(id uuid, motif text, sev text) where s.lot = 5 and s.kind = 'restr') v where c.id = v.id;

update public.contraindications c set severite = v.sev, sources = array_remove(array_remove(coalesce(c.sources, '{}'::text[]), 'BDPM-RCP'), 'Ordosur-pharmacien') || (case v.etiq when 'R' then array['BDPM-RCP'] when 'P' then array['Ordosur — à valider par un pharmacien'] else '{}'::text[] end)
from (select v.* from public.bdpm2cbis_staging s cross join lateral jsonb_to_record(s.t::jsonb) as v(id uuid, sev text, etiq text) where s.lot = 5 and s.kind = 'maj') v where c.id = v.id;

update public.contraindications c set exclue_motif = null, sources = array_remove(array_remove(coalesce(c.sources, '{}'::text[]), 'BDPM-RCP'), 'Ordosur-pharmacien')
from (select v.* from public.bdpm2cbis_staging s cross join lateral jsonb_to_record(s.t::jsonb) as v(id uuid) where s.lot = 5 and s.kind = 'react') v where c.id = v.id;

insert into public.ci_sources_rcp (ci_id, molecule, cis, url, date_rcp, rubrique, citation, nature, staging_ligne)
select c.id, v.mol, coalesce(ci.cis, gr.cis, se.cis)::text, coalesce(ci.url, gr.url, se.url), coalesce(ci.date_maj_rcp, gr.date_maj_rcp, se.date_maj_rcp),
       case v.typ when 'ci' then '4.3' when 'gr' then '4.6' else v.rub end,
       coalesce(ci.citation, gr.citation, substring(se.texte from v.pos for v.len)), v.nat, v.ligne
from (select v.* from public.bdpm2cbis_staging s cross join lateral jsonb_to_record(s.t::jsonb) as v(ref text, mol text, nat text, typ text, rub text, ligne int, cis bigint, pos int, len int) where s.lot = 5 and s.kind = 'lien') v
join public.contraindications c on (case when v.ref like '2cbis:%' then c.bdpm_ref = v.ref else c.id::text = v.ref end)
left join public.bdpm_ci_staging ci on v.typ = 'ci' and ci.ligne = v.ligne
left join public.bdpm_grossesse_staging gr on v.typ = 'gr' and gr.ligne = v.ligne
left join public.bdpm_rcp_sections se on v.typ = 'sec' and se.cis = v.cis and se.section = v.rub;

do $$
declare n int; e text;
begin
  select count(*), md5(string_agg(id::text||'|'||dci_pattern||'|'||severite||'|'||coalesce(exclue_motif,'')||'|'||coalesce(array_to_string(sources,' ¤ '),''), '#' order by id::text collate "C")) into n, e from public.contraindications where id in (select (s.t::jsonb->>'id')::uuid from public.bdpm2cbis_staging s where s.lot = 5 and s.kind in ('neutr','restr','maj','react') union select (s.t::jsonb->>'source')::uuid from public.bdpm2cbis_staging s where s.lot = 5 and s.kind = 'ajout');
  if n <> 59 or e <> '208066eb2b2a712d9635fbdb74c5517b' then raise exception 'BDPM-2c-bis lot 5 : lignes sources ≠ attendu (%, %)', n, e; end if;
  select count(*), md5(string_agg(bdpm_ref||'|'||dci_pattern||'|'||severite||'|'||coalesce(exclue_motif,'')||'|'||coalesce(array_to_string(sources,' ¤ '),''), '#' order by bdpm_ref collate "C")) into n, e from public.contraindications where bdpm_ref in (select s.t::jsonb->>'ref' from public.bdpm2cbis_staging s where s.lot = 5 and s.kind = 'ajout');
  if n <> 202 or coalesce(e, '') <> '098805d4fabff2ac7875565a5e80a63f' then raise exception 'BDPM-2c-bis lot 5 : lignes nouvelles ≠ attendu (%, %)', n, e; end if;
  select count(*), md5(string_agg(c.k||'|'||s.molecule||'|'||s.rubrique||'|'||s.nature||'|'||s.cis||'|'||s.url||'|'||s.date_rcp||'|'||md5(s.citation), '#'
           order by c.k collate "C", s.molecule collate "C", s.rubrique collate "C", s.nature collate "C", md5(s.citation) collate "C"))
    into n, e
    from public.ci_sources_rcp s
    join (select id, case when bdpm_ref like '2cbis:%' then bdpm_ref else id::text end k from public.contraindications) c on c.id = s.ci_id
   where s.sprint = 'BDPM-2c-bis'
     and c.k in (select s2.t::jsonb->>'ref' from public.bdpm2cbis_staging s2 where s2.lot = 5 and s2.kind = 'lien');
  if n <> 131 or coalesce(e, '') <> '566a09d1f72d542a6a95749117ac57ab' then raise exception 'BDPM-2c-bis lot 5 : liens ≠ attendu (%, %)', n, e; end if;
end $$;
