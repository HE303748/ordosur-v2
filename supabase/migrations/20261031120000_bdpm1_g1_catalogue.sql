-- Sprint BDPM-1, lot G1 — fiches MA reliées à une autre substance que la marque + synonyme « trauma » de l'ESPT.
-- GÉNÉRÉ par scripts/gen_bdpm1_g1.mjs — ne pas modifier à la main.
-- Empreinte de la source : b7c8ac9285c84bca20dba619e8c60c82
--
-- 14 fiches : 12 liens mis en quarantaine (mapping_quarantaine, motif « BDPM-1 G1 »),
-- 14 liens ajoutés, 14 DCI corrigées. 7 contradictions « critiques » NON corrigées
-- (le nom de la fiche est faux, pas la DCI : voir NON_APPLIQUEES dans le générateur).

-- 1. Garde : la migration ne s'applique que sur l'état lu au diagnostic (sinon tout est annulé).
do $$
declare v_ecarts text;
begin
  select string_agg(a.nom, ' ; ') into v_ecarts
  from (values
  ('65fa1a36-bc52-4c43-8623-3b4e3c6ec875', 'ENDOXAN 1 G / MG SECABLE', 'HYDROCHLOROTHIAZIDE MG', '07076f7e-26a3-4286-932a-201894abb400'),
  ('10a83535-7942-4fa2-9697-495e8b966e8e', 'ENDOXAN 200 MG', 'HYDROCHLOROTHIAZIDE MG', '07076f7e-26a3-4286-932a-201894abb400'),
  ('c20c8949-ce1e-43eb-968a-ff23a06ac173', 'ENDOXAN 200 MG, Poudre pour injectable I.V et perfusion', 'HYDROCHLOROTHIAZIDE MG', '07076f7e-26a3-4286-932a-201894abb400'),
  ('d2293d05-525d-4817-9a0f-b3e51c991488', 'FUCIDINE ENFANT', 'FER', 'dce8fd43-96c6-4020-a392-107642117c7b'),
  ('7b04c484-27c3-4be0-a8e0-cf3f891b6a5c', 'HYPERIUM', 'HYDROCORTISONE', 'a3c9cb17-6369-4102-b74d-7c7c81f8f8ff'),
  ('9ab39d64-89f9-4e82-b25a-76332e770839', 'IDEOS', 'CIPROFLOXACINE', '17238269-7635-42c2-946e-7de505d4da64,1b69cef5-3b05-4026-86b7-8d9a49260589'),
  ('4c210c59-d99c-4fa4-9160-ff8b847d0e32', 'INFANRIX HEXA 1 BOITE 1 FLACON', 'TRIMEBUTINE', '5dcf35db-57a6-4454-adf7-7cafacd79e98'),
  ('62553140-49a7-4c54-8606-c8ed1720d398', 'JANUMET 50 / 1000 MG, Comprimé', 'PHOSPHATE DE SITAGLIPTINE MONOHYDRATÉ', '4ed0a014-31ec-4700-b377-d583fc41d563'),
  ('31ce6392-09c9-494a-8659-7ad9b2222f4d', 'JANUMET 50 / 850 MG, Comprimé', 'PHOSPHATE DE SITAGLIPTINE MONOHYDRATÉ', '4ed0a014-31ec-4700-b377-d583fc41d563'),
  ('cd1ce7ee-fced-4c17-ab43-2ebd92fb0a31', 'JANUMET COMPRIME PELLICULE à 50 / 1000 1 BOITE 56 COMPR', 'SITAGLIPTINE /', '4ed0a014-31ec-4700-b377-d583fc41d563'),
  ('62e69988-fe04-42f6-8f2b-c33ace0bb5f1', 'MEDROL', 'OLANZAPINE', '130b366f-5527-4e29-9a9d-43f137f83334'),
  ('43670d5d-5414-4072-89df-e22e69724fdd', 'SECTRAL', 'ESCITALOPRAM', '53ecb9ff-77bf-427d-bc74-de708583e6b7'),
  ('36040c36-c101-4b87-8d62-0d8f03c5fec9', 'SPIRIVA 1 BOITE 16 COMPRIME', 'METRONIDAZOLE', '14abbc09-5fb0-4ef4-b617-8295cae49046'),
  ('ede0d1dc-f6f2-415f-bc97-da3017d87c41', 'STABLON COMPRIME PELLICULE à 0.75 /', 'TIOTROPIUM', 'ffa1ea40-06a9-4c32-af17-e705f455c534')
  ) as a(id, nom, dci, ings)
  left join medicaments m on m.id = a.id::uuid and m.pays = 'MA'
  where m.id is null
     or m.nom is distinct from a.nom
     or m.dci is distinct from a.dci
     or coalesce((select string_agg(mi.ingredient_id::text, ',' order by mi.ingredient_id::text collate "C")
                  from medicament_ingredients mi where mi.medicament_id = m.id), '') <> a.ings;
  if v_ecarts is not null then
    raise exception 'BDPM-1 G1 : état de départ inattendu pour : %', v_ecarts;
  end if;
  if not exists (select 1 from pathologies_curees where id = 'a01a4c7e-dc9c-4b01-b899-e5daefbd37df' and nom_fr = 'État de stress post-traumatique' and synonymes = 'ESPT, PTSD, stress post traumatique, trauma') then
    raise exception 'BDPM-1 G1 : synonymes de l''ESPT inattendus';
  end if;
end $$;

-- 2. Quarantaine des liens erronés (trace complète, réversible), puis retrait
insert into mapping_quarantaine (medicament_id, ingredient_id, medicament_nom, dci_base, dci_ammps, motif)
select v.medicament_id::uuid, v.ingredient_id::uuid, v.nom, v.dci, null, v.motif
from (values
  ('65fa1a36-bc52-4c43-8623-3b4e3c6ec875', '07076f7e-26a3-4286-932a-201894abb400', 'ENDOXAN 1 G / MG SECABLE', 'HYDROCHLOROTHIAZIDE MG', 'BDPM-1 G1 — fiche ENDOXAN : poudre injectable IV 200 mg / 1 g : cyclophosphamide (l’hydrochlorothiazide n’existe pas sous cette forme)'),
  ('10a83535-7942-4fa2-9697-495e8b966e8e', '07076f7e-26a3-4286-932a-201894abb400', 'ENDOXAN 200 MG', 'HYDROCHLOROTHIAZIDE MG', 'BDPM-1 G1 — fiche ENDOXAN : poudre injectable IV 200 mg / 1 g : cyclophosphamide (l’hydrochlorothiazide n’existe pas sous cette forme)'),
  ('c20c8949-ce1e-43eb-968a-ff23a06ac173', '07076f7e-26a3-4286-932a-201894abb400', 'ENDOXAN 200 MG, Poudre pour injectable I.V et perfusion', 'HYDROCHLOROTHIAZIDE MG', 'BDPM-1 G1 — fiche ENDOXAN : poudre injectable IV 200 mg / 1 g : cyclophosphamide (l’hydrochlorothiazide n’existe pas sous cette forme)'),
  ('d2293d05-525d-4817-9a0f-b3e51c991488', 'dce8fd43-96c6-4020-a392-107642117c7b', 'FUCIDINE ENFANT', 'FER', 'BDPM-1 G1 — fiche FUCIDINE : suspension buvable 250 mg / 5 mL : acide fusidique'),
  ('7b04c484-27c3-4be0-a8e0-cf3f891b6a5c', 'a3c9cb17-6369-4102-b74d-7c7c81f8f8ff', 'HYPERIUM', 'HYDROCORTISONE', 'BDPM-1 G1 — fiche HYPERIUM : comprimé 1 mg, Servier : rilménidine'),
  ('9ab39d64-89f9-4e82-b25a-76332e770839', '1b69cef5-3b05-4026-86b7-8d9a49260589', 'IDEOS', 'CIPROFLOXACINE', 'BDPM-1 G1 — fiche IDEOS : comprimé à croquer 500 mg / 400 UI : calcium + vitamine D3'),
  ('9ab39d64-89f9-4e82-b25a-76332e770839', '17238269-7635-42c2-946e-7de505d4da64', 'IDEOS', 'CIPROFLOXACINE', 'BDPM-1 G1 — fiche IDEOS : comprimé à croquer 500 mg / 400 UI : calcium + vitamine D3'),
  ('4c210c59-d99c-4fa4-9160-ff8b847d0e32', '5dcf35db-57a6-4454-adf7-7cafacd79e98', 'INFANRIX HEXA 1 BOITE 1 FLACON', 'TRIMEBUTINE', 'BDPM-1 G1 — fiche INFANRIX : vaccin hexavalent GSK ; aucun ingrédient vaccinal au référentiel : fiche laissée sans ingrédient (signal honnête)'),
  ('62e69988-fe04-42f6-8f2b-c33ace0bb5f1', '130b366f-5527-4e29-9a9d-43f137f83334', 'MEDROL', 'OLANZAPINE', 'BDPM-1 G1 — fiche MEDROL : comprimé sécable 4 mg, Pfizer : méthylprednisolone (l’olanzapine n’existe pas à 4 mg)'),
  ('43670d5d-5414-4072-89df-e22e69724fdd', '53ecb9ff-77bf-427d-bc74-de708583e6b7', 'SECTRAL', 'ESCITALOPRAM', 'BDPM-1 G1 — fiche SECTRAL : comprimé pelliculé 200 mg : acébutolol (l’escitalopram n’existe pas à 200 mg)'),
  ('36040c36-c101-4b87-8d62-0d8f03c5fec9', '14abbc09-5fb0-4ef4-b617-8295cae49046', 'SPIRIVA 1 BOITE 16 COMPRIME', 'METRONIDAZOLE', 'BDPM-1 G1 — fiche SPIRIVA : dosage 18 µg : tiotropium (le métronidazole se dose en centaines de mg)'),
  ('ede0d1dc-f6f2-415f-bc97-da3017d87c41', 'ffa1ea40-06a9-4c32-af17-e705f455c534', 'STABLON COMPRIME PELLICULE à 0.75 /', 'TIOTROPIUM', 'BDPM-1 G1 — fiche STABLON : comprimé pelliculé 12,5 mg, Servier : tianeptine')
) as v(medicament_id, ingredient_id, nom, dci, motif);

delete from medicament_ingredients mi
using (values
  ('65fa1a36-bc52-4c43-8623-3b4e3c6ec875', '07076f7e-26a3-4286-932a-201894abb400'),
  ('10a83535-7942-4fa2-9697-495e8b966e8e', '07076f7e-26a3-4286-932a-201894abb400'),
  ('c20c8949-ce1e-43eb-968a-ff23a06ac173', '07076f7e-26a3-4286-932a-201894abb400'),
  ('d2293d05-525d-4817-9a0f-b3e51c991488', 'dce8fd43-96c6-4020-a392-107642117c7b'),
  ('7b04c484-27c3-4be0-a8e0-cf3f891b6a5c', 'a3c9cb17-6369-4102-b74d-7c7c81f8f8ff'),
  ('9ab39d64-89f9-4e82-b25a-76332e770839', '1b69cef5-3b05-4026-86b7-8d9a49260589'),
  ('9ab39d64-89f9-4e82-b25a-76332e770839', '17238269-7635-42c2-946e-7de505d4da64'),
  ('4c210c59-d99c-4fa4-9160-ff8b847d0e32', '5dcf35db-57a6-4454-adf7-7cafacd79e98'),
  ('62e69988-fe04-42f6-8f2b-c33ace0bb5f1', '130b366f-5527-4e29-9a9d-43f137f83334'),
  ('43670d5d-5414-4072-89df-e22e69724fdd', '53ecb9ff-77bf-427d-bc74-de708583e6b7'),
  ('36040c36-c101-4b87-8d62-0d8f03c5fec9', '14abbc09-5fb0-4ef4-b617-8295cae49046'),
  ('ede0d1dc-f6f2-415f-bc97-da3017d87c41', 'ffa1ea40-06a9-4c32-af17-e705f455c534')
) as d(medicament_id, ingredient_id)
where mi.medicament_id = d.medicament_id::uuid and mi.ingredient_id = d.ingredient_id::uuid;

-- 3. Liens ajoutés
insert into medicament_ingredients (medicament_id, ingredient_id)
select v.medicament_id::uuid, v.ingredient_id::uuid
from (values
  ('65fa1a36-bc52-4c43-8623-3b4e3c6ec875', '2182893d-36a8-452f-8695-40df26060328'),
  ('10a83535-7942-4fa2-9697-495e8b966e8e', '2182893d-36a8-452f-8695-40df26060328'),
  ('c20c8949-ce1e-43eb-968a-ff23a06ac173', '2182893d-36a8-452f-8695-40df26060328'),
  ('d2293d05-525d-4817-9a0f-b3e51c991488', '49356406-d47f-44ab-9e9a-ebaf1100e834'),
  ('7b04c484-27c3-4be0-a8e0-cf3f891b6a5c', '7addb55b-d696-47a5-9b3c-2706c5a43588'),
  ('9ab39d64-89f9-4e82-b25a-76332e770839', '8a9b5ba6-d326-4d85-b17a-da2f94872f7c'),
  ('9ab39d64-89f9-4e82-b25a-76332e770839', '3db9db92-9181-4d73-b3d3-259498828796'),
  ('62553140-49a7-4c54-8606-c8ed1720d398', '611be1d6-d666-494b-8355-9a9c4ea16619'),
  ('31ce6392-09c9-494a-8659-7ad9b2222f4d', '611be1d6-d666-494b-8355-9a9c4ea16619'),
  ('cd1ce7ee-fced-4c17-ab43-2ebd92fb0a31', '611be1d6-d666-494b-8355-9a9c4ea16619'),
  ('62e69988-fe04-42f6-8f2b-c33ace0bb5f1', 'd9aa2d4b-82cf-43cf-ad28-84f1c0009e6b'),
  ('43670d5d-5414-4072-89df-e22e69724fdd', '34fa1d80-6136-429c-b585-20150a776af5'),
  ('36040c36-c101-4b87-8d62-0d8f03c5fec9', 'ffa1ea40-06a9-4c32-af17-e705f455c534'),
  ('ede0d1dc-f6f2-415f-bc97-da3017d87c41', '3cf64c16-0209-4656-89e5-d29d2f6a9719')
) as v(medicament_id, ingredient_id)
on conflict (medicament_id, ingredient_id) do nothing;

-- 4. DCI corrigées (lues par les canaux CI, rénal et tératogène)
update medicaments set dci = 'CYCLOPHOSPHAMIDE' where id = '65fa1a36-bc52-4c43-8623-3b4e3c6ec875'; -- ENDOXAN 1 G / MG SECABLE
update medicaments set dci = 'CYCLOPHOSPHAMIDE' where id = '10a83535-7942-4fa2-9697-495e8b966e8e'; -- ENDOXAN 200 MG
update medicaments set dci = 'CYCLOPHOSPHAMIDE' where id = 'c20c8949-ce1e-43eb-968a-ff23a06ac173'; -- ENDOXAN 200 MG, Poudre pour injectable I.V et perfusion
update medicaments set dci = 'ACIDE FUSIDIQUE' where id = 'd2293d05-525d-4817-9a0f-b3e51c991488'; -- FUCIDINE ENFANT
update medicaments set dci = 'RILMENIDINE' where id = '7b04c484-27c3-4be0-a8e0-cf3f891b6a5c'; -- HYPERIUM
update medicaments set dci = 'CARBONATE DE CALCIUM / CHOLECALCIFEROL' where id = '9ab39d64-89f9-4e82-b25a-76332e770839'; -- IDEOS
update medicaments set dci = 'VACCIN DIPHTERIQUE, TETANIQUE, COQUELUCHEUX ACELLULAIRE, POLIOMYELITIQUE INACTIVE, HEPATITE B ET HAEMOPHILUS INFLUENZAE B' where id = '4c210c59-d99c-4fa4-9160-ff8b847d0e32'; -- INFANRIX HEXA 1 BOITE 1 FLACON
update medicaments set dci = 'SITAGLIPTINE / METFORMINE' where id = '62553140-49a7-4c54-8606-c8ed1720d398'; -- JANUMET 50 / 1000 MG, Comprimé
update medicaments set dci = 'SITAGLIPTINE / METFORMINE' where id = '31ce6392-09c9-494a-8659-7ad9b2222f4d'; -- JANUMET 50 / 850 MG, Comprimé
update medicaments set dci = 'SITAGLIPTINE / METFORMINE' where id = 'cd1ce7ee-fced-4c17-ab43-2ebd92fb0a31'; -- JANUMET COMPRIME PELLICULE à 50 / 1000 1 BOITE 56 COMPR
update medicaments set dci = 'METHYLPREDNISOLONE' where id = '62e69988-fe04-42f6-8f2b-c33ace0bb5f1'; -- MEDROL
update medicaments set dci = 'ACEBUTOLOL' where id = '43670d5d-5414-4072-89df-e22e69724fdd'; -- SECTRAL
update medicaments set dci = 'TIOTROPIUM' where id = '36040c36-c101-4b87-8d62-0d8f03c5fec9'; -- SPIRIVA 1 BOITE 16 COMPRIME
update medicaments set dci = 'TIANEPTINE' where id = 'ede0d1dc-f6f2-415f-bc97-da3017d87c41'; -- STABLON COMPRIME PELLICULE à 0.75 /

-- 5. Synonyme « trauma » retiré de l'ESPT (un traumatisme physique n'est pas un ESPT)
update pathologies_curees set synonymes = 'ESPT, PTSD, stress post traumatique'
 where id = 'a01a4c7e-dc9c-4b01-b899-e5daefbd37df' and synonymes = 'ESPT, PTSD, stress post traumatique, trauma';

-- Contrôle « base = source » (doit renvoyer l'empreinte ci-dessus) :
--   select md5(string_agg(m.id::text || '|' || coalesce(m.dci, '') || '|' ||
--            coalesce((select string_agg(mi.ingredient_id::text, ',' order by mi.ingredient_id::text collate "C")
--                      from medicament_ingredients mi where mi.medicament_id = m.id), ''),
--            E'\n' order by m.id::text collate "C"))
--   from medicaments m where m.id in ('65fa1a36-bc52-4c43-8623-3b4e3c6ec875', '10a83535-7942-4fa2-9697-495e8b966e8e', 'c20c8949-ce1e-43eb-968a-ff23a06ac173', 'd2293d05-525d-4817-9a0f-b3e51c991488', '7b04c484-27c3-4be0-a8e0-cf3f891b6a5c', '9ab39d64-89f9-4e82-b25a-76332e770839', '4c210c59-d99c-4fa4-9160-ff8b847d0e32', '62553140-49a7-4c54-8606-c8ed1720d398', '31ce6392-09c9-494a-8659-7ad9b2222f4d', 'cd1ce7ee-fced-4c17-ab43-2ebd92fb0a31', '62e69988-fe04-42f6-8f2b-c33ace0bb5f1', '43670d5d-5414-4072-89df-e22e69724fdd', '36040c36-c101-4b87-8d62-0d8f03c5fec9', 'ede0d1dc-f6f2-415f-bc97-da3017d87c41');
