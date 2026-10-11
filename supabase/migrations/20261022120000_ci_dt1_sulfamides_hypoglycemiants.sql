-- Sprint 2c — Données : contre-indication ABSOLUE « Diabète de type 1 » pour les sulfamides
-- hypoglycémiants (glibenclamide, gliclazide, glimépiride, glipizide) et le répaglinide
-- (Novonorm, Glynorm : commercialisés au Maroc).
-- Vérifié avant ajout : aucune CI de ces molécules sur le diabète de type 1 n'existait, sous aucune
-- formulation (type 1, insulino-dépendant, juvénile, acidocétose).
-- La formulation « Diabète de type 1 » est déjà reliée au concept dans ci_condition_concepts.
-- Les motifs sont comparés sans accents ni casse (« glimepiride » couvre « GLIMÉPIRIDE »).

insert into public.contraindications
  (dci_pattern, condition_type, condition_valeur, severite, description, mecanisme_fr, conduite_fr, sources)
select v.dci_pattern, 'pathologie', v.condition_valeur, v.severite, v.description, v.mecanisme_fr, v.conduite_fr, v.sources
from (values
  ('glibenclamide|gliclazide|glimepiride|glipizide', 'pathologie', 'Diabète de type 1', 'absolue',
   'Sulfamide hypoglycémiant contre-indiqué dans le diabète de type 1 (insulino-dépendant) : inefficace et risque d''acidocétose',
   'Les sulfamides hypoglycémiants stimulent la sécrétion d''insuline par les cellules bêta : sans sécrétion résiduelle, ils sont inefficaces et retardent l''insulinothérapie',
   'Ne pas prescrire. Le traitement du diabète de type 1 repose sur l''insuline.',
   array['Proposition Ordosur d''après RCP — à valider']),
  ('repaglinide', 'pathologie', 'Diabète de type 1', 'absolue',
   'Répaglinide contre-indiqué dans le diabète de type 1 (insulino-dépendant, peptide C négatif) : inefficace et risque d''acidocétose',
   'Le répaglinide stimule la sécrétion d''insuline par les cellules bêta : sans sécrétion résiduelle, il est inefficace et retarde l''insulinothérapie',
   'Ne pas prescrire. Le traitement du diabète de type 1 repose sur l''insuline.',
   array['Proposition Ordosur d''après RCP — à valider'])
) as v(dci_pattern, condition_type, condition_valeur, severite, description, mecanisme_fr, conduite_fr, sources)
where not exists (
  select 1 from public.contraindications c
   where c.dci_pattern = v.dci_pattern and c.condition_valeur = v.condition_valeur
);
