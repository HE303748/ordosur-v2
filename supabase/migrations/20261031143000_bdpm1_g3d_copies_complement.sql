-- Sprint BDPM-1, lot G3 — recréation complémentaire des lignes de classe neutralisées (tout le catalogue).
-- GÉNÉRÉ par scripts/gen_bdpm1_g3.mjs — ne pas modifier à la main.
-- Empreinte de la source (G3 complet, après G3d) : 9b3d04698fbe28bf9d2c1a10eb6e5194
-- 11 recréations : molécules NON contredites par le RCP dont les fiches hors MA avaient perdu la CI.

do $$
begin
  if exists (select 1 from public.contraindications where bdpm_ref like 'G3:copie:%' and bdpm_ref in ('G3:copie:7164f751:18b83ca3', 'G3:copie:7164f751:2ae250d7', 'G3:copie:a3890e11:6c141976', 'G3:copie:a3890e11:77a6353a', 'G3:copie:43e3ae38:14213e76', 'G3:copie:43e3ae38:cfe95b76', 'G3:copie:1acd7371:ecbbdcf0', 'G3:copie:1acd7371:5a17d19f', 'G3:copie:223c960e:f47967b3', 'G3:copie:223c960e:60c419eb', 'G3:copie:223c960e:657f9ac6')) then
    raise exception 'BDPM-1 G3d : copie complémentaire déjà présente';
  end if;
  if (select count(*) from public.contraindications where bdpm_ref like 'G3:copie:%') <> 82
     or (select count(*) from public.contraindications where id in ('7164f751-225e-4e14-afff-c424f9f405b1', 'a3890e11-0ffb-4ba5-bad1-6e13613362ea', '43e3ae38-c887-4869-9458-4206df3ff53e', '1acd7371-4f7d-468a-99f9-e82d25e4a0f4', '223c960e-b81d-45ff-affc-5ecf34574dfe') and exclue_motif like 'Contredit par le RCP — BDPM-1%') <> 5 then
    raise exception 'BDPM-1 G3d : état de départ inattendu (G3c non appliquée ?)';
  end if;
end $$;

insert into public.contraindications (dci_pattern, condition_type, condition_valeur, severite, description, mecanisme_fr, conduite_fr,
  sources, atc_code, age_min_mois, age_max_mois, sexe_applicable, bdpm_ref)
select v.motif, c.condition_type, c.condition_valeur, c.severite, c.description, c.mecanisme_fr, c.conduite_fr,
  coalesce(c.sources, '{}') || array['BDPM-1 G3 — recréée pour cette molécule depuis la ligne ' || c.id || ' (neutralisée)'],
  c.atc_code, c.age_min_mois, c.age_max_mois, c.sexe_applicable, v.ref
from public.contraindications c
join (values
  ('7164f751-225e-4e14-afff-c424f9f405b1','warfarine','G3:copie:7164f751:18b83ca3'),
  ('7164f751-225e-4e14-afff-c424f9f405b1','fluindione','G3:copie:7164f751:2ae250d7'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','ticarcilline','G3:copie:a3890e11:6c141976'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','phenoxymethylpenicilline','G3:copie:a3890e11:77a6353a'),
  ('43e3ae38-c887-4869-9458-4206df3ff53e','cefoxitine','G3:copie:43e3ae38:14213e76'),
  ('43e3ae38-c887-4869-9458-4206df3ff53e','cefprozil','G3:copie:43e3ae38:cfe95b76'),
  ('1acd7371-4f7d-468a-99f9-e82d25e4a0f4','gestodene','G3:copie:1acd7371:ecbbdcf0'),
  ('1acd7371-4f7d-468a-99f9-e82d25e4a0f4','norgestimate','G3:copie:1acd7371:5a17d19f'),
  ('223c960e-b81d-45ff-affc-5ecf34574dfe','phenytoine','G3:copie:223c960e:f47967b3'),
  ('223c960e-b81d-45ff-affc-5ecf34574dfe','valproate','G3:copie:223c960e:60c419eb'),
  ('223c960e-b81d-45ff-affc-5ecf34574dfe','zonisamide','G3:copie:223c960e:657f9ac6')
) as v(source, motif, ref) on c.id = v.source::uuid;

-- Contrôle « base = source » : même requête que dans 20261031142000_bdpm1_g3c_releves.sql → 9b3d04698fbe28bf9d2c1a10eb6e5194
