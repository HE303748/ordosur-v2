-- BDPM-2d, étape C (validée le 2026-11-15) : interactions des RCP ajoutés en BDPM-2d → interactions_rcp.
-- 2056 lignes : 535 contre-indiquées, 434 déconseillées, 724 précautions d'emploi, 363 à prendre en compte.
--   palier 1 (673) : relu ligne à ligne — associations de la 4.3, prose CI / déconseillé, format hybride, partenaires résolus à la main ;
--   palier 2 (1 383) : niveau = titre de niveau du RCP (formats ANSM et hybride). Règles de BDPM-2b (élément de liste = niveau du titre).
-- NON intégrées (restent en staging) : prose française non relue (statut a_relire_prose_fr, 643) et prose EMA en anglais
-- (a_reextraire_ema, 782) ; 137 lignes écartées et 51 non résolues, motif par ligne.
-- Source unique : bdpm_interactions_staging, lignes 34903 à 38571, statuts relu / auto. Même projection qu'en BDPM-2b.
-- Doses (décision 6) : warfarine et fluindione × acide acétylsalicylique suivent le découpage du thésaurus ANSM (règle
-- « acide acétylsalicylique × anticoagulants oraux ») : >= 1 000 mg contre-indiquée, >= 500 mg déconseillée, >= 50 mg à prendre en compte.
-- Flurbiprofène × méthotrexate : la ligne « déconseillée » ne vaut qu'au-delà de 20 mg (comme en BDPM-2b).
-- CI à condition de terrain (décision 5) : carte au niveau CI, la condition figure dans la colonne condition et dans le texte.
-- GÉNÉRÉ par bdpm/2d/scripts/gen_c_2d.py — ne pas modifier à la main.
do $$
declare n int; e text; r record;
begin
  select count(*) into n from public.interactions_rcp;
  if n <> 34498 then raise exception 'C : interactions_rcp compte % lignes, 34498 attendues', n; end if;
  select count(*) into n from public.interactions_rcp where bdpm_ligne >= 34903;
  if n <> 0 then raise exception 'C : % lignes déjà présentes au-delà de 34902', n; end if;
  select count(*), md5(string_agg(s.ligne || '|' || s.cis || '|' || array_to_string(s.canonical_ids, '/') || '|' || array_to_string(s.partenaire_canonical_ids, '/') || '|' || coalesce(s.partenaire_classe, '') || '|' || s.niveau || '|' || s.statut || '|' || coalesce(s.condition, '') || '|' || s.empreinte, '#' order by s.ligne)) into n, e from public.bdpm_interactions_staging s where s.ligne between 34903 and 38571;
  if n <> 3669 or e <> '4100564aac61d594af7b7f48d3f246dd' then raise exception 'C : staging ≠ fichier source (%, %)', n, e; end if;
  select count(*), md5(string_agg(s.ligne || '|' || s.cis || '|' || array_to_string(s.canonical_ids, '/') || '|' || array_to_string(s.partenaire_canonical_ids, '/') || '|' || coalesce(s.partenaire_classe, '') || '|' || s.niveau || '|' || s.statut || '|' || coalesce(s.condition, '') || '|' || s.empreinte, '#' order by s.ligne)) into n, e from public.bdpm_interactions_staging s where s.ligne between 34903 and 38571 and s.statut in ('relu', 'auto');
  if n <> 2056 or e <> '73545ccfcddc19d9a75fe9bba9120b5a' then raise exception 'C : lignes proposées ≠ fichier source (%, %)', n, e; end if;

  insert into public.interactions_rcp (
    molecule_cids, molecule_libelle, partenaire_cids, partenaire_classe, partenaire_libelle,
    niveau, condition, citation, description_carte,
    source_origine, source_cis, source_url, source_date,
    statut_relecture, action, bdpm_ligne, conditions_dose, dose_cible)
  select s.canonical_ids, lower(s.composition), s.partenaire_canonical_ids, s.partenaire_classe,
         lower(coalesce(s.partenaire_classe, (select string_agg(i.name_en, ' / ' order by i.name_en) from public.ingredients i where i.id = any(s.partenaire_canonical_ids)))),
         case s.niveau when 'contre-indique' then 'contre_indiquee' when 'deconseille' then 'deconseillee' when 'precaution' then 'precaution' when 'a_prendre_en_compte' then 'a_prendre_en_compte' end,
         s.condition, s.citation, coalesce(nullif(s.phrase, ''), s.citation),
         'RCP ' || s.source, s.cis, s.url, s.date_maj_rcp, 'a_relire_pharmacien', 'ajout', s.ligne,
         case when s.ligne in (34942, 34946, 35023, 35737, 35741, 35801, 38132, 38275) then '[{"seuil_mg":1000,"niveau":"contre_indiquee"},{"seuil_mg":500,"niveau":"deconseillee"},{"seuil_mg":50,"niveau":"a_prendre_en_compte"}]'::jsonb
              when s.ligne in (35323, 35324, 38170) then '[{"seuil_mg":20,"niveau":"deconseillee"}]'::jsonb end,
         case when s.ligne in (34942, 34946, 35023, 35737, 35741, 35801, 38132, 38275, 35323, 35324, 38170) then 'partenaire' end
    from public.bdpm_interactions_staging s
   where s.ligne between 34903 and 38571 and s.statut in ('relu', 'auto');
  get diagnostics n = row_count;
  if n <> 2056 then raise exception 'C : % lignes insérées, 2056 attendues', n; end if;

  select count(*) into n from public.interactions_rcp;
  if n <> 36554 then raise exception 'C : total après = %, 36554 attendu', n; end if;
  for r in select niveau, count(*) as n from public.interactions_rcp where bdpm_ligne >= 34903 group by niveau loop
    if (r.niveau, r.n) not in (('contre_indiquee', 535), ('deconseillee', 434), ('precaution', 724), ('a_prendre_en_compte', 363)) then
      raise exception 'C : niveau % : % lignes', r.niveau, r.n;
    end if;
  end loop;
  select count(*) into n from public.interactions_rcp where bdpm_ligne >= 34903 and (conditions_dose is not null) and dose_cible = 'partenaire';
  if n <> 11 then raise exception 'C : % lignes à condition de dose, 11 attendues', n; end if;
  select count(*) into n from public.interactions_rcp where bdpm_ligne >= 34903 and (partenaire_libelle is null or description_carte = '' or source_url is null);
  if n <> 0 then raise exception 'C : % lignes incomplètes', n; end if;
  select count(*) into n from public.bdpm_interactions_staging s where s.statut in ('relu', 'auto') and not exists (select 1 from public.interactions_rcp i where i.bdpm_ligne = s.ligne);
  if n <> 0 then raise exception 'C : % lignes relues ou auto hors du moteur', n; end if;
end $$;
