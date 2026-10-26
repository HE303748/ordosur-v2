-- Sprint BDPM-1, lot G2 — relecture des interactions RCP après chargement (réversible).
-- GÉNÉRÉ par scripts/gen_bdpm1_g2.mjs — ne pas modifier à la main.
-- Empreinte attendue après relecture : dd0554c16bc11c58732ceccfbf91c116
--
-- 82 lignes neutralisées (exclue_motif : la carte RCP n'apparaît plus, la ligne reste) ;
-- 11 partenaires corrigés (IEC × « valsartan » → sacubitril/valsartan).

do $$
begin
  if (select count(*) from interactions_rcp where exclue_motif is null and bdpm_ligne in (672, 1362, 1390, 3862, 3870, 4305, 4853, 5842, 5903, 5905, 5908, 5909, 6819, 6893, 6894, 7953, 8408, 9788, 10247, 10248, 10249, 10250, 10251, 10252, 10253, 10254, 10256, 10258, 10259, 11729, 11730, 13364, 13367, 14140, 16184, 18377, 18814, 19253, 19254, 19256, 19257, 19258, 19259, 19260, 22201, 22202, 22339, 24402, 24829, 27015, 28579, 28609, 28612, 28925, 30744, 30745, 31361, 32155, 32302, 32847, 33149, 33404, 33407, 33408, 33414, 33417, 33418, 33548, 33549, 33550, 33608, 33621, 33624, 33625, 33912, 34256, 34341, 34344, 34345, 34371, 34374, 34375, 34522, 34525, 34526, 34539, 34552, 34693, 34876, 34877, 34891, 34894, 34895)) <> 93 then
    raise exception 'BDPM-1 G2 relecture : état de départ inattendu';
  end if;
end $$;

update interactions_rcp r set exclue_motif = 'BDPM-1 G2 relecture — ' || v.motif
from (values
  (672, 'atazanavir « n’est pas recommandé » (déconseillé, déjà dans le moteur) ; la CI de la phrase vise le nelfinavir'),
  (1362, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (1390, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (3870, 'rubrique 4.5 du RCP (CIS 62817482) mal mise en page : niveau du titre non fiable'),
  (4305, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (4853, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (5842, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (5903, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (5905, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (5908, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (5909, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (6819, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (6893, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (6894, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (7953, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (8408, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (9788, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (10247, 'rubrique 4.5 du RCP (CIS 62914611) mal mise en page : niveau du titre non fiable'),
  (10248, 'rubrique 4.5 du RCP (CIS 62914611) mal mise en page : niveau du titre non fiable'),
  (10249, 'rubrique 4.5 du RCP (CIS 62914611) mal mise en page : niveau du titre non fiable'),
  (10250, 'rubrique 4.5 du RCP (CIS 62914611) mal mise en page : niveau du titre non fiable'),
  (10251, 'rubrique 4.5 du RCP (CIS 62914611) mal mise en page : niveau du titre non fiable'),
  (10252, 'rubrique 4.5 du RCP (CIS 62914611) mal mise en page : niveau du titre non fiable'),
  (10253, 'rubrique 4.5 du RCP (CIS 62914611) mal mise en page : niveau du titre non fiable'),
  (10254, 'rubrique 4.5 du RCP (CIS 62914611) mal mise en page : niveau du titre non fiable'),
  (10256, 'rubrique 4.5 du RCP (CIS 62914611) mal mise en page : niveau du titre non fiable'),
  (10258, 'rubrique 4.5 du RCP (CIS 62914611) mal mise en page : niveau du titre non fiable'),
  (10259, 'rubrique 4.5 du RCP (CIS 62914611) mal mise en page : niveau du titre non fiable'),
  (11729, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (11730, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (13364, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (13367, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (14140, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (16184, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (18377, 'cyproheptadine citée comme traitement du syndrome sérotoninergique, pas comme partenaire'),
  (18814, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (19253, 'liste « décrit pour … » : la CI vise la phénytoïne à visée prophylactique, pas les autres anticancéreux'),
  (19254, 'liste « décrit pour … » : la CI vise la phénytoïne à visée prophylactique, pas les autres anticancéreux'),
  (19256, 'liste « décrit pour … » : la CI vise la phénytoïne à visée prophylactique, pas les autres anticancéreux'),
  (19257, 'liste « décrit pour … » : la CI vise la phénytoïne à visée prophylactique, pas les autres anticancéreux'),
  (19258, 'liste « décrit pour … » : la CI vise la phénytoïne à visée prophylactique, pas les autres anticancéreux'),
  (19259, 'liste « décrit pour … » : la CI vise la phénytoïne à visée prophylactique, pas les autres anticancéreux'),
  (19260, 'liste « décrit pour … » : la CI vise la phénytoïne à visée prophylactique, pas les autres anticancéreux'),
  (22201, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (22202, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (24402, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (24829, 'CI liée à l’éthanol d’une seule spécialité (DROPIZAL) : ne vaut pas pour toute la morphine'),
  (27015, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (28579, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (28609, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (28612, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (30744, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (30745, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (31361, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (32155, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (32302, 'relèvement d’une carte ANSM par une ligne « auto » : le thésaurus du moteur fait foi'),
  (33404, 'la CI vise l’association (ombitasvir/paritaprévir/ritonavir, sofosbuvir/velpatasvir/voxilaprévir), pas cette substance seule'),
  (33407, 'la CI vise l’association (ombitasvir/paritaprévir/ritonavir, sofosbuvir/velpatasvir/voxilaprévir), pas cette substance seule'),
  (33408, 'la CI vise l’association (ombitasvir/paritaprévir/ritonavir, sofosbuvir/velpatasvir/voxilaprévir), pas cette substance seule'),
  (33414, 'la CI vise l’association (ombitasvir/paritaprévir/ritonavir, sofosbuvir/velpatasvir/voxilaprévir), pas cette substance seule'),
  (33417, 'la CI vise l’association (ombitasvir/paritaprévir/ritonavir, sofosbuvir/velpatasvir/voxilaprévir), pas cette substance seule'),
  (33418, 'la CI vise l’association (ombitasvir/paritaprévir/ritonavir, sofosbuvir/velpatasvir/voxilaprévir), pas cette substance seule'),
  (33548, 'CI limitée à l’injection épidurale : la voie n’est pas représentable dans le moteur'),
  (33549, 'CI limitée à l’injection épidurale : la voie n’est pas représentable dans le moteur'),
  (33550, 'CI limitée à l’injection épidurale : la voie n’est pas représentable dans le moteur'),
  (33621, 'la CI vise l’association (ombitasvir/paritaprévir/ritonavir, sofosbuvir/velpatasvir/voxilaprévir), pas cette substance seule'),
  (33624, 'la CI vise l’association (ombitasvir/paritaprévir/ritonavir, sofosbuvir/velpatasvir/voxilaprévir), pas cette substance seule'),
  (33625, 'la CI vise l’association (ombitasvir/paritaprévir/ritonavir, sofosbuvir/velpatasvir/voxilaprévir), pas cette substance seule'),
  (34341, 'la CI vise l’association (ombitasvir/paritaprévir/ritonavir, sofosbuvir/velpatasvir/voxilaprévir), pas cette substance seule'),
  (34344, 'la CI vise l’association (ombitasvir/paritaprévir/ritonavir, sofosbuvir/velpatasvir/voxilaprévir), pas cette substance seule'),
  (34345, 'la CI vise l’association (ombitasvir/paritaprévir/ritonavir, sofosbuvir/velpatasvir/voxilaprévir), pas cette substance seule'),
  (34371, 'la CI vise l’association (ombitasvir/paritaprévir/ritonavir, sofosbuvir/velpatasvir/voxilaprévir), pas cette substance seule'),
  (34374, 'la CI vise l’association (ombitasvir/paritaprévir/ritonavir, sofosbuvir/velpatasvir/voxilaprévir), pas cette substance seule'),
  (34375, 'la CI vise l’association (ombitasvir/paritaprévir/ritonavir, sofosbuvir/velpatasvir/voxilaprévir), pas cette substance seule'),
  (34522, 'la CI vise l’association (ombitasvir/paritaprévir/ritonavir, sofosbuvir/velpatasvir/voxilaprévir), pas cette substance seule'),
  (34525, 'la CI vise l’association (ombitasvir/paritaprévir/ritonavir, sofosbuvir/velpatasvir/voxilaprévir), pas cette substance seule'),
  (34526, 'la CI vise l’association (ombitasvir/paritaprévir/ritonavir, sofosbuvir/velpatasvir/voxilaprévir), pas cette substance seule'),
  (34876, 'CI de la triple association IEC + ARA II avec l’éplérénone, pas d’une seule classe'),
  (34877, 'CI de la triple association IEC + ARA II avec l’éplérénone, pas d’une seule classe'),
  (34891, 'la CI vise l’association (ombitasvir/paritaprévir/ritonavir, sofosbuvir/velpatasvir/voxilaprévir), pas cette substance seule'),
  (34894, 'la CI vise l’association (ombitasvir/paritaprévir/ritonavir, sofosbuvir/velpatasvir/voxilaprévir), pas cette substance seule'),
  (34895, 'la CI vise l’association (ombitasvir/paritaprévir/ritonavir, sofosbuvir/velpatasvir/voxilaprévir), pas cette substance seule')
) as v(ligne, motif)
where r.bdpm_ligne = v.ligne;

update interactions_rcp r set partenaire_cids = v.cids::uuid[], partenaire_libelle = v.libelle,
  condition = coalesce(r.condition || ' ; ', '') || v.motif
from (values
  (3862, '{e500189f-459d-4e29-8b10-516fb46abb3b}', 'sacubitril / valsartan', 'la CI vise l’association sacubitril/valsartan (angio-œdème), pas le valsartan seul'),
  (22339, '{e500189f-459d-4e29-8b10-516fb46abb3b}', 'sacubitril / valsartan', 'la CI vise l’association sacubitril/valsartan (angio-œdème), pas le valsartan seul'),
  (28925, '{e500189f-459d-4e29-8b10-516fb46abb3b}', 'sacubitril / valsartan', 'la CI vise l’association sacubitril/valsartan (angio-œdème), pas le valsartan seul'),
  (32847, '{e500189f-459d-4e29-8b10-516fb46abb3b}', 'sacubitril / valsartan', 'la CI vise l’association sacubitril/valsartan (angio-œdème), pas le valsartan seul'),
  (33149, '{e500189f-459d-4e29-8b10-516fb46abb3b}', 'sacubitril / valsartan', 'la CI vise l’association sacubitril/valsartan (angio-œdème), pas le valsartan seul'),
  (33608, '{e500189f-459d-4e29-8b10-516fb46abb3b}', 'sacubitril / valsartan', 'la CI vise l’association sacubitril/valsartan (angio-œdème), pas le valsartan seul'),
  (33912, '{e500189f-459d-4e29-8b10-516fb46abb3b}', 'sacubitril / valsartan', 'la CI vise l’association sacubitril/valsartan (angio-œdème), pas le valsartan seul'),
  (34256, '{e500189f-459d-4e29-8b10-516fb46abb3b}', 'sacubitril / valsartan', 'la CI vise l’association sacubitril/valsartan (angio-œdème), pas le valsartan seul'),
  (34539, '{e500189f-459d-4e29-8b10-516fb46abb3b}', 'sacubitril / valsartan', 'la CI vise l’association sacubitril/valsartan (angio-œdème), pas le valsartan seul'),
  (34552, '{e500189f-459d-4e29-8b10-516fb46abb3b}', 'sacubitril / valsartan', 'la CI vise l’association sacubitril/valsartan (angio-œdème), pas le valsartan seul'),
  (34693, '{e500189f-459d-4e29-8b10-516fb46abb3b}', 'sacubitril / valsartan', 'la CI vise l’association sacubitril/valsartan (angio-œdème), pas le valsartan seul')
) as v(ligne, cids, libelle, motif)
where r.bdpm_ligne = v.ligne;

-- Contrôle « base = source » :
--   select md5(string_agg(bdpm_ligne || '|' || niveau || '|' || action || '|' ||
--     (select string_agg(x::text, ',' order by x::text collate "C") from unnest(molecule_cids) x) || '|' ||
--     coalesce((select string_agg(x::text, ',' order by x::text collate "C") from unnest(partenaire_cids) x), '') || '|' ||
--     coalesce(partenaire_classe, '') || '|' || case when exclue_motif is null then 'active' else 'neutralisee' end,
--     E'\n' order by bdpm_ligne)) from interactions_rcp;
