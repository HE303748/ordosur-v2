-- BDPM-2c-bis, étape 1 — TRAÇABILITÉ de BDPM-2c, lot A (745 lignes).
-- BDPM-2c a été appliquée en SQL direct le 2026-11-09, sans migration : ce fichier N'ÉCRIT RIEN dans le moteur, il fige
-- l'état exact laissé par 2c et vérifie base = source. Source : project/scripts/data/bdpm2c_etat.json (généré par
-- bdpm/2cbis/scripts/tracabilite_2c.py depuis l'export de la base du 2026-11-09). Identifiants du lot : bdpm2cbis_staging, lot 101.
-- Empreinte des identifiants : 9bae893c336907552bf0f39912c12b23 · empreinte de l'état : bc9fb294b6a9d226bdf1d06b47286694
do $$
declare e text; n int;
begin
  select count(*), md5(string_agg(t, chr(10) order by seq)) into n, e from public.bdpm2cbis_staging where lot = 101 and kind = 'trace';
  if n <> 745 or e <> '9bae893c336907552bf0f39912c12b23' then raise exception 'BDPM-2c lot A : staging ≠ fichier source (%, %)', n, e; end if;
  select count(*), md5(string_agg(id||'|'||severite||'|'||coalesce(exclue_motif,'')||'|'||coalesce(array_to_string(sources,' ¤ '),''), '#' order by id))
    into n, e from public.contraindications where id in (select t::uuid from public.bdpm2cbis_staging where lot = 101 and kind = 'trace');
  if n <> 745 or e <> 'bc9fb294b6a9d226bdf1d06b47286694' then
    raise exception 'BDPM-2c lot A : base ≠ source (% lignes, empreinte %) — aligner le FICHIER sur la base, jamais l''inverse', n, e;
  end if;
end $$;
