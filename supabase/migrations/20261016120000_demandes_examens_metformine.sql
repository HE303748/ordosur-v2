-- Sprint 5c — Imagerie injectée : la mention « Patient sous metformine » doit pouvoir être
-- réimprimée telle qu'à la demande. Elle est donc conservée avec la demande (l'ordonnance en
-- cours et le traitement de fond du jour ne sont plus connus à la réimpression).
-- Migration légère : une colonne avec défaut constant + remplacement de la RPC de création.

alter table public.demandes_examens
  add column if not exists sous_metformine boolean not null default false;

create or replace function public.creer_demande_examens(p_demande jsonb, p_lignes jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
begin
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' or jsonb_array_length(p_lignes) = 0 then
    raise exception 'Demande d''examens vide : ajoutez au moins un examen';
  end if;
  if jsonb_array_length(p_lignes) > 80 then
    raise exception 'Demande d''examens trop longue (80 examens au maximum)';
  end if;

  insert into demandes_examens (
    numero, patient_id, org_id, doctor_id, ordonnance_id, date_demande, echeance_date,
    echeance_libelle, renseignements_cliniques, urgent, ald, regrouper_imageries, sous_metformine,
    packs_utilises, notes
  ) values (
    p_demande->>'numero',
    (p_demande->>'patient_id')::uuid,
    (p_demande->>'org_id')::uuid,
    (p_demande->>'doctor_id')::uuid,
    nullif(p_demande->>'ordonnance_id', '')::uuid,
    coalesce(nullif(p_demande->>'date_demande', '')::date, current_date),
    (p_demande->>'echeance_date')::date,
    coalesce(nullif(p_demande->>'echeance_libelle', ''), 'date_precise'),
    nullif(trim(coalesce(p_demande->>'renseignements_cliniques', '')), ''),
    coalesce((p_demande->>'urgent')::boolean, false),
    coalesce((p_demande->>'ald')::boolean, false),
    coalesce((p_demande->>'regrouper_imageries')::boolean, false),
    coalesce((p_demande->>'sous_metformine')::boolean, false),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_demande->'packs_utilises', '[]'::jsonb)) x), '{}'),
    nullif(trim(coalesce(p_demande->>'notes', '')), '')
  ) returning id into v_id;

  insert into demande_examen_lignes (
    demande_id, examen_code, libelle, type, categorie, precision, question_clinique,
    a_jeun, delai_jeun_h, injection, ordre
  )
  select v_id,
         nullif(l->>'examen_code', ''),
         l->>'libelle',
         l->>'type',
         nullif(l->>'categorie', ''),
         nullif(trim(coalesce(l->>'precision', '')), ''),
         nullif(trim(coalesce(l->>'question_clinique', '')), ''),
         coalesce((l->>'a_jeun')::boolean, false),
         nullif(l->>'delai_jeun_h', '')::smallint,
         nullif(l->>'injection', '')::boolean,
         (ord - 1)::int
  from jsonb_array_elements(p_lignes) with ordinality as t(l, ord);

  return v_id;
end;
$$;

revoke all on function public.creer_demande_examens(jsonb, jsonb) from public, anon;
grant execute on function public.creer_demande_examens(jsonb, jsonb) to authenticated;
