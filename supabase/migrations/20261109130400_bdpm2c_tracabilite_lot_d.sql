-- BDPM-2c-bis, étape 1 — TRAÇABILITÉ de BDPM-2c, lot D (25 lignes).
-- BDPM-2c a été appliquée en SQL direct le 2026-11-09, sans migration : ce fichier N'ÉCRIT RIEN dans le moteur, il fige
-- l'état exact laissé par 2c et vérifie base = source. Source : project/scripts/data/bdpm2c_etat.json (généré par
-- bdpm/2cbis/scripts/tracabilite_2c.py depuis l'export de la base du 2026-11-09). Identifiants du lot : bdpm2cbis_staging, lot 105.
-- Empreinte des identifiants : 8bfa3cedb26aa8ca3833b6dc8af7989d · empreinte de l'état : c8983eda2095ab1e61eb9db3734bb115
do $$
declare e text; n int;
begin
  select count(*), md5(string_agg(t, chr(10) order by seq)) into n, e from public.bdpm2cbis_staging where lot = 105 and kind = 'trace';
  if n <> 25 or e <> '8bfa3cedb26aa8ca3833b6dc8af7989d' then raise exception 'BDPM-2c lot D : staging ≠ fichier source (%, %)', n, e; end if;
  select count(*), md5(string_agg(id||'|'||severite||'|'||coalesce(exclue_motif,'')||'|'||coalesce(array_to_string(sources,' ¤ '),''), '#' order by id))
    into n, e from public.contraindications where id in (select t::uuid from public.bdpm2cbis_staging where lot = 105 and kind = 'trace');
  if n <> 25 or e <> 'c8983eda2095ab1e61eb9db3734bb115' then
    raise exception 'BDPM-2c lot D : base ≠ source (% lignes, empreinte %) — aligner le FICHIER sur la base, jamais l''inverse', n, e;
  end if;
end $$;
