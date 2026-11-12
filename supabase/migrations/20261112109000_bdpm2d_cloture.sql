-- BDPM-2d — clôture : les fonctions de lot ne servent plus (elles restent lisibles dans la migration bdpm2d_socle).
-- La table public.bdpm2d_staging est conservée : c'est la trace exacte des données appliquées (RLS sans politique).
drop function if exists public.bdpm2d_lot(integer, integer, text, integer, text, text, integer, text, integer, text);
drop function if exists public.bdpm2d_referentiel(integer, text, text, text, integer, text, integer, text);
