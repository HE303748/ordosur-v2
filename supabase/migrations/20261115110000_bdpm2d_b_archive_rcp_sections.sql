-- BDPM-2d, étape B (validée le 2026-11-15) : archive hors base du texte brut de bdpm_rcp_sections (table hors moteur, 25 Mo).
-- Copie complète exportée de la base et vérifiée : bdpm/archive_rcp_sections/sections.jsonl.gz
--   sha256 70572973a5157778b69c33cc6062add2fd1ca0835df4cd300a1178d0c52e5968, 12 420 rubriques, 1 887 RCP, 34 763 977 octets de texte.
-- Manifeste : bdpm/archive_rcp_sections/MANIFESTE.csv (md5 par CIS et par rubrique), md5 global 2d8ce06fa0bd89ffa9bfefe3c71599e2.
-- La ligne reste en base avec son empreinte (md5 du texte), sa taille, son URL et sa date : le texte se restaure depuis l'archive
-- et se vérifie rubrique par rubrique. Les citations restent en base (tables de staging, ci_sources_rcp, interactions_rcp).
-- Aucune fonction, vue ni code de l'application ne lit cette table. VACUUM FULL lancé ensuite, hors migration.
alter table public.bdpm_rcp_sections alter column texte drop not null;
alter table public.bdpm_rcp_sections add column if not exists texte_octets integer, add column if not exists archive_le date;
comment on column public.bdpm_rcp_sections.texte is 'Texte brut de la rubrique. NULL depuis l''archivage hors base (archive_le) : voir bdpm/archive_rcp_sections/.';
comment on column public.bdpm_rcp_sections.texte_octets is 'Taille en octets (UTF-8) du texte archivé.';
do $$
declare n int; e text; o bigint;
begin
  select count(*), md5(string_agg(cis || '|' || source || '|' || section || '|' || md5(texte), E'\n' order by cis, source, section)), sum(octet_length(texte))
    into n, e, o from public.bdpm_rcp_sections;
  if n <> 12420 or e <> '2d8ce06fa0bd89ffa9bfefe3c71599e2' or o <> 34763977 then raise exception 'B : base ≠ archive (%, %, %)', n, e, o; end if;
  select count(*) into n from public.bdpm_rcp_sections where empreinte is distinct from md5(texte);
  if n <> 0 then raise exception 'B : % rubriques dont l''empreinte ≠ md5 du texte', n; end if;
  update public.bdpm_rcp_sections set texte_octets = octet_length(texte), archive_le = date '2026-11-15', texte = null;
  select count(*), sum(texte_octets) into n, o from public.bdpm_rcp_sections where texte is null and archive_le is not null and empreinte is not null;
  if n <> 12420 or o <> 34763977 then raise exception 'B : état d''arrivée ≠ attendu (%, %)', n, o; end if;
end $$;
