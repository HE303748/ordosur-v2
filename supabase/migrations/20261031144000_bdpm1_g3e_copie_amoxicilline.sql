-- Sprint BDPM-1, lot G3 — correction d'une recréation trop large (G3c).
-- GÉNÉRÉ par scripts/gen_bdpm1_g3.mjs — ne pas modifier à la main.
-- Empreinte de la source (G3 complet, après G3e) : 796a710ab0c8681c0c520d64defc3645
-- 1 copie(s) neutralisée(s) (exclue_motif, réversible) et recréée(s) sans l'alternative qui atteignait
-- la molécule que le RCP ne contre-indique pas (contrôle sur tout le catalogue : bdpm/scripts/verif_copies_g3.py).

do $$
begin
  if (select count(*) from public.contraindications where bdpm_ref in ('G3:copie:a3890e11:286b8a86') and exclue_motif is null) <> 1
     or exists (select 1 from public.contraindications where bdpm_ref in ('G3:copie:a3890e11:afd0e79b')) then
    raise exception 'BDPM-1 G3e : état de départ inattendu';
  end if;
end $$;

insert into public.contraindications (dci_pattern, condition_type, condition_valeur, severite, description, mecanisme_fr, conduite_fr,
  sources, atc_code, age_min_mois, age_max_mois, sexe_applicable, bdpm_ref)
select v.motif, c.condition_type, c.condition_valeur, c.severite, c.description, c.mecanisme_fr, c.conduite_fr,
  coalesce(c.sources, '{}') || array['BDPM-1 G3 — recréée pour cette molécule depuis la ligne ' || c.id || ' (neutralisée)'],
  c.atc_code, c.age_min_mois, c.age_max_mois, c.sexe_applicable, v.ref
from public.contraindications c
join (values
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','amoxicilline acide|amoxicilline acide clavulanique|amoxicilline anhydre acide clavulanique|amoxicilline trihydratee acide clavulanique|amoxicilline trihydratee clavalanate potassium|augmentin 1 g 125 mg sachet|augmentin 100 mg 12 5 mg poudre pour sirop enfant|augmentin 100 mg 12 5 mg poudre pour sirop nourrisson|augmentin 500 mg 62 5 mg adulte comprime pellicule|augmentin enfant 500 mg 62 5 mg sachet','G3:copie:a3890e11:afd0e79b')
) as v(source, motif, ref) on c.id = v.source::uuid;

update public.contraindications c set exclue_motif = v.motif
from (values
  ('G3:copie:a3890e11:286b8a86','Copie trop large — BDPM-1 G3e (l’alternative « amoxicilline trihydratee » atteignait l’amoxicilline seule, que le RCP ne contre-indique pas)')
) as v(ref, motif)
where c.bdpm_ref = v.ref;

-- Contrôle « base = source » : requête de 20261031142000_bdpm1_g3c_releves.sql
--   + union all select 'copie_neutralisee|' || bdpm_ref from contraindications where bdpm_ref like 'G3:copie:%' and exclue_motif is not null
--   → 796a710ab0c8681c0c520d64defc3645
