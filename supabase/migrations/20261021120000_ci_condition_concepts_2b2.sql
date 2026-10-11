-- Sprint 2b-2 — Table ci_condition_concepts : correctifs du matching.
-- Source : scripts/gen_ci_condition_concepts.mjs (empreinte attendue après application :
-- bd1dd28caa7c01fcd3263e2598ee99ae).
--   • famille « infection » : les CI génériques « Infection » valent pour toute infection précisée ;
--   • traitement « dialyse » : CI « Dialyse » déclenchée par un patient dialysé ou un DFG < 15 ;
--   • « Déficit en acide folique (grossesse planifiée) » : procréation (sans objet si grossesse en cours).

alter table public.ci_condition_concepts drop constraint if exists ci_condition_concepts_traitement_check;
alter table public.ci_condition_concepts add constraint ci_condition_concepts_traitement_check
  check (traitement in ('concept','renal','dialyse','grossesse','allaitement','procreation','age','allergie','contexte','sans_concept'));
alter table public.ci_condition_concepts drop constraint if exists ci_condition_concepts_famille_check;
alter table public.ci_condition_concepts add constraint ci_condition_concepts_famille_check
  check (famille is null or famille in ('diabete','ulcere_gastroduodenal','hta','hepatite_virale','migraine','depression','asthme','varicelle','infection_urinaire','trouble_rythme','coronaropathie','dyslipidemie','hyperthyroidie','psychose','neuropathie','retrecissement_aortique','mtev','infection'));

update public.ci_condition_concepts
   set traitement = 'procreation'
 where condition_norm = 'deficit en acide folique grossesse planifiee' and ordre = 1;

update public.ci_condition_concepts
   set traitement = 'dialyse', concept = null, stade = null
 where condition_norm = 'dialyse' and ordre = 1;

update public.ci_condition_concepts
   set traitement = 'concept', famille = 'infection', note = null
 where condition_norm = 'infection' and ordre = 1;

update public.ci_condition_concepts
   set traitement = 'concept', famille = 'infection', qualificatif = 'active non traitée', qualificatif_type = 'etat', note = null
 where condition_norm = 'infection active non traitee tuberculose sepsis fongique' and ordre = 1;

update public.ci_condition_concepts
   set traitement = 'concept', famille = 'infection', qualificatif = 'active sévère non contrôlée', qualificatif_type = 'etat', note = null
 where condition_norm = 'infection active severe non controlee' and ordre = 1;

update public.ci_condition_concepts
   set traitement = 'concept', famille = 'infection', qualificatif = 'actives sévères', qualificatif_type = 'gravite', note = null
 where condition_norm = 'infections actives severes' and ordre = 1;
