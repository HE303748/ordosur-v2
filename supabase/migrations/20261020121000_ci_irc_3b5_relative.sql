-- Sprint 2b-1 — Données (C) : les 2 lignes « Insuffisance rénale chronique stade 3b-5 (DFG < 45) »
-- (metformine ; liste AINS) passent en sévérité relative.
-- Le canal rénal (regles_renales) couvre déjà ces seuils avec le DFG mesuré :
--   metformine  DFG < 30 → contre-indication · DFG 30-44 → « À évaluer » (dose à réduire)
--   AINS        DFG < 30 → contre-indication · DFG 30-59 → « À évaluer »
-- Une CI ABSOLUE sur le seul libellé « stade 3b-5 » bloquait à tort les DFG 30-44.
update public.contraindications
   set severite = 'relative'
 where condition_type = 'pathologie'
   and condition_valeur = 'Insuffisance rénale chronique stade 3b-5 (DFG < 45)'
   and severite = 'absolue';
