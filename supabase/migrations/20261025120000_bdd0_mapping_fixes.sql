-- Sprint BDD-0 — correctifs ponctuels de mapping médicament → ingrédients.
-- GÉNÉRÉ par scripts/gen_bdd0_mapping_fixes.mjs — ne pas modifier à la main.
-- Empreinte de la source : dba743694a6b4aa88a20c45d20eae3bd
--
-- 36 spécialités MA : 26 liens retirés, 47 liens ajoutés, 13 DCI corrigées.
-- Aucune ligne de medicaments n'est supprimée. Les jumeaux FR/EN ne sont pas fusionnés (Phase 1).

-- 1. Garde : la migration ne s'applique que sur l'état lu au diagnostic (sinon tout est annulé).
do $$
declare v_ecarts text;
begin
  select string_agg(a.nom, ' ; ') into v_ecarts
  from (values
  ('4e1c949d-3faf-4a0e-9021-ba6903cd1d50', 'DEPAKINE 500 MG, Comprimé gastro-résistant', 'SODIUM (VALPROATE DE)', '623e135e-bb05-44ad-82e8-63107e9edaae'),
  ('0ef72794-66f1-4d33-af5f-18c4b6f04e8f', 'DEPAKINE CHRONO 500 MG, Comprimé pelliculé', 'SODIUM (VALPROATE DE)', '623e135e-bb05-44ad-82e8-63107e9edaae'),
  ('b98668a4-68ae-47d1-9368-84e57e2ca05a', 'DEPAKINE 200 MG / ML, Solution buvable', 'SODIUM (VALPROATE DE)', '623e135e-bb05-44ad-82e8-63107e9edaae'),
  ('2cbde5c2-a561-4116-9b70-bde57004b289', 'DEPAKINE, Sirop', 'SODIUM (VALPROATE DE)', '623e135e-bb05-44ad-82e8-63107e9edaae'),
  ('47b63255-e1d9-43b3-8ea4-8e0ed7f2c757', 'HYALGAN 20 MG / 2 ML, Solution Injectable pour usage intra-articulaire en seringue pré-remplie', 'SODIUM (HYALURONATE DE)', '623e135e-bb05-44ad-82e8-63107e9edaae'),
  ('47838bc8-e444-42f9-91c3-bd32ba0c9976', 'AGUETTANT 100 MG', 'FOLINATE DE CALCIUM', '23c4c366-6864-41b9-8925-436168cc1f65'),
  ('afdf9660-660f-412f-aaa5-15a3399f0740', 'FOLINATE DE CALCIUM AGUETTANT 100 MG, Lyophilisat injectable', 'FOLINATE DE CALCIUM', '23c4c366-6864-41b9-8925-436168cc1f65'),
  ('2894f0a9-4da2-4698-b53d-9ab01c7fef2c', 'FOLINATE DE CALCIUM AGUETTANT 50 MG, Lyophilisat injectable', 'FOLINATE DE CALCIUM', '23c4c366-6864-41b9-8925-436168cc1f65'),
  ('cbca7c8d-abb1-4d5c-aaee-c283556e7760', 'ELVORINE SOLUTION A DILUER POUR 1 BOITE 1 FLACON 4', 'FOLINATE DE CALCIUM', '23c4c366-6864-41b9-8925-436168cc1f65'),
  ('5773dfb6-fb49-4f85-b406-9451871a1e13', 'FOLINATE DE CALCIUM POUDRE POUR SOLUTION 1 BOITE 10 FLACON', 'FOLINATE DE CALCIUM', '23c4c366-6864-41b9-8925-436168cc1f65'),
  ('82c4b654-badb-4121-9af8-7a4dbd7e8b6e', 'CAFONATE', 'LEUCOVORINE CALCIQUE (FOLINATE DE CALCIUM)', ''),
  ('ef808aea-604a-4f15-940f-5a8e27a18d69', 'LEDERFOLINE TION INJECTABLE à 5 MG 1 BOITE 1 AMPOULE', 'FOLINATE DE CALCIUM SOLU', ''),
  ('41bbdfd4-f8e4-4d6f-9413-f93b3a575288', 'LEDERFOLINE RIME à 5 MG 1 BOITE 20 COMPRIME', 'FOLINATE DE CALCIUM COMP', '87a35c45-adbe-4e6d-a787-240ee0030ed1'),
  ('124b8d40-99b4-4712-a3ba-c097283acb3a', 'LEDERFOLINE RIME SECABLE à 15 MG 1 BOITE 10 COMPRIME', 'FOLINATE DE CALCIUM COMP', '87a35c45-adbe-4e6d-a787-240ee0030ed1'),
  ('7b4b9103-1641-4284-9eaa-30220334b099', 'LEDERFOLINE RIME SECABLE à 25 MG 1 BOITE 6 COMPRIME', 'FOLINATE DE CALCIUM COMP', '87a35c45-adbe-4e6d-a787-240ee0030ed1'),
  ('d7d80805-2dc2-42c9-9c2a-32e36e00ad64', 'KOGENATE 1000 UI COMPRIME ENROBE à 250 MG 1 BOITE 12 COMPRIME', 'CLARITHROMYCINE', '51e6f7f8-653b-4aae-afd8-620afdca8a65,9fba138c-8fb9-48d2-81b8-cc196e87fa1c'),
  ('84e7ba6e-47a9-4611-a565-8312dbbf018b', 'KOGENATE 250 UI ENROBE', 'CLARITHROMYCINE', '51e6f7f8-653b-4aae-afd8-620afdca8a65,9fba138c-8fb9-48d2-81b8-cc196e87fa1c'),
  ('dd8e9c4d-4c17-41c8-9fc5-8279cad2405e', 'KOGENATE 500 UI', 'CLARITHROMYCINE', '51e6f7f8-653b-4aae-afd8-620afdca8a65,9fba138c-8fb9-48d2-81b8-cc196e87fa1c'),
  ('8f9a5d06-0fbf-4a9e-bdca-85349041d398', 'KLONOPIN', 'CLARITHROMYCINE', '51e6f7f8-653b-4aae-afd8-620afdca8a65,9fba138c-8fb9-48d2-81b8-cc196e87fa1c'),
  ('33c0c901-0d5f-438a-a5e7-8a18e42ffedd', 'COLCHICINE MG', 'HYDROCHLOROTHIAZIDE MG /', '07076f7e-26a3-4286-932a-201894abb400'),
  ('20580b06-7a4c-4362-a956-fa65d8939b39', 'HYDREA', 'HYDROCORTISONE', 'a3c9cb17-6369-4102-b74d-7c7c81f8f8ff'),
  ('cc1e3059-8b30-4dce-8417-a89b2ffad41c', 'HYDREA GELULE à 500 MG 1 BOITE 20 GELULE', 'HYDROXYCARBAMIDE', '652668a4-4dcd-4271-8592-7696385cf0b8'),
  ('35abe92d-1519-4a8b-aed4-b1fb834e47c1', 'GLUCOPHAGE 850 MG, Comprimé pelliculé', 'CHLORHYDRATE DE METFORMINE', '03dea98f-3544-4b29-b419-47bede6553fa'),
  ('8f6bb892-eaa1-4067-86d6-3e60bacd6949', 'GLUCOPHAGE 500 MG, Comprimé pelliculé', 'CHLORHYDRATE DE METFORMINE', '03dea98f-3544-4b29-b419-47bede6553fa'),
  ('38b5dcdf-fd20-4b59-a856-3a13cd58a3d8', 'GLUCOPHAGE 1000 MG, Comprimé pelliculé', 'CHLORHYDRATE DE METFORMINE', '03dea98f-3544-4b29-b419-47bede6553fa'),
  ('d7b5dce9-1233-473b-be9c-ce0ae6e9cc56', 'COLCHICINE COOPER', 'COLCHICINE CRISTALLISEE', ''),
  ('0f8e8ae8-4e5b-4c5d-bc09-b1d1eb4b5abe', 'GLUCOVANCE 1000 MG / 5 MG, Comprimé pelliculé', 'GLIBENCLAMIDE', '815f6224-56fd-4d92-a98f-1ba05a34ad1a'),
  ('9709d445-f876-4d5f-adb7-277b2cbf6ace', 'GLUCOVANCE 500 MG / 2.5MG, Comprimé pelliculé', 'GLIBENCLAMIDE', '815f6224-56fd-4d92-a98f-1ba05a34ad1a'),
  ('53d5c408-873d-49f7-b3ac-3bf739c45bc2', 'GLUCOVANCE 500 MG / 5 MG, Comprimé pelliculé', 'GLIBENCLAMIDE', '815f6224-56fd-4d92-a98f-1ba05a34ad1a'),
  ('7fabccab-b037-4503-b22e-04e741be5323', 'GLUCOVANCE', 'ACARBOSE', 'a6b93770-8705-4556-972e-8c0d40297911'),
  ('e3cec812-660e-40ad-8b39-7ed4c6a5f712', 'NO-DOL CODEINE, Comprimé', 'PARACETAMOL // CODEINE', '8baf21dd-402d-4ee2-b209-6aea0c78ce79'),
  ('a024f3dd-8d52-4a04-b3bc-7cbdd1653b0a', 'COLPRONE', 'HYDROCHLOROTHIAZIDE MG /', '07076f7e-26a3-4286-932a-201894abb400'),
  ('63bf2d33-bf2c-4513-827f-63bfc8bba74c', 'COLPRONE COMPRIME SECABLE à 1 MG SECABLE', 'COLCHICINE', 'ea6e9c47-f4af-40b5-852f-1fa1bce695c1'),
  ('bf742897-eabf-4ad5-88e4-c3edbd37e0cd', 'COLPRONE COMPRIME SECABLE à 400 / 20 1 BOITE 16 COMPRIM', 'PARACETAMOL /', ''),
  ('db862c6f-d3d3-4560-87eb-d9d1da8a56b6', 'COLPRONE MG / MG', null, 'e1134133-6c71-44ab-a3ac-69a3806a0daf'),
  ('1ba2ed59-528d-46ba-b4eb-76b63306796e', 'COLPRONE 1 BOITE 40 COMPRIM', 'MEDROGESTONE', 'e1134133-6c71-44ab-a3ac-69a3806a0daf')
  ) as a(id, nom, dci, ings)
  left join medicaments m on m.id = a.id::uuid and m.pays = 'MA'
  where m.id is null
     or m.nom is distinct from a.nom
     or m.dci is distinct from a.dci
     or coalesce((select string_agg(mi.ingredient_id::text, ',' order by mi.ingredient_id::text collate "C")
                  from medicament_ingredients mi where mi.medicament_id = m.id), '') <> a.ings;
  if v_ecarts is not null then
    raise exception 'BDD-0 : état de départ inattendu pour : %', v_ecarts;
  end if;
end $$;

-- 2. Liens retirés
delete from medicament_ingredients mi
using (values
  ('4e1c949d-3faf-4a0e-9021-ba6903cd1d50', '623e135e-bb05-44ad-82e8-63107e9edaae'),
  ('0ef72794-66f1-4d33-af5f-18c4b6f04e8f', '623e135e-bb05-44ad-82e8-63107e9edaae'),
  ('b98668a4-68ae-47d1-9368-84e57e2ca05a', '623e135e-bb05-44ad-82e8-63107e9edaae'),
  ('2cbde5c2-a561-4116-9b70-bde57004b289', '623e135e-bb05-44ad-82e8-63107e9edaae'),
  ('47b63255-e1d9-43b3-8ea4-8e0ed7f2c757', '623e135e-bb05-44ad-82e8-63107e9edaae'),
  ('47838bc8-e444-42f9-91c3-bd32ba0c9976', '23c4c366-6864-41b9-8925-436168cc1f65'),
  ('afdf9660-660f-412f-aaa5-15a3399f0740', '23c4c366-6864-41b9-8925-436168cc1f65'),
  ('2894f0a9-4da2-4698-b53d-9ab01c7fef2c', '23c4c366-6864-41b9-8925-436168cc1f65'),
  ('cbca7c8d-abb1-4d5c-aaee-c283556e7760', '23c4c366-6864-41b9-8925-436168cc1f65'),
  ('5773dfb6-fb49-4f85-b406-9451871a1e13', '23c4c366-6864-41b9-8925-436168cc1f65'),
  ('d7d80805-2dc2-42c9-9c2a-32e36e00ad64', '51e6f7f8-653b-4aae-afd8-620afdca8a65'),
  ('d7d80805-2dc2-42c9-9c2a-32e36e00ad64', '9fba138c-8fb9-48d2-81b8-cc196e87fa1c'),
  ('84e7ba6e-47a9-4611-a565-8312dbbf018b', '51e6f7f8-653b-4aae-afd8-620afdca8a65'),
  ('84e7ba6e-47a9-4611-a565-8312dbbf018b', '9fba138c-8fb9-48d2-81b8-cc196e87fa1c'),
  ('dd8e9c4d-4c17-41c8-9fc5-8279cad2405e', '51e6f7f8-653b-4aae-afd8-620afdca8a65'),
  ('dd8e9c4d-4c17-41c8-9fc5-8279cad2405e', '9fba138c-8fb9-48d2-81b8-cc196e87fa1c'),
  ('8f9a5d06-0fbf-4a9e-bdca-85349041d398', '51e6f7f8-653b-4aae-afd8-620afdca8a65'),
  ('8f9a5d06-0fbf-4a9e-bdca-85349041d398', '9fba138c-8fb9-48d2-81b8-cc196e87fa1c'),
  ('33c0c901-0d5f-438a-a5e7-8a18e42ffedd', '07076f7e-26a3-4286-932a-201894abb400'),
  ('20580b06-7a4c-4362-a956-fa65d8939b39', 'a3c9cb17-6369-4102-b74d-7c7c81f8f8ff'),
  ('7fabccab-b037-4503-b22e-04e741be5323', 'a6b93770-8705-4556-972e-8c0d40297911'),
  ('e3cec812-660e-40ad-8b39-7ed4c6a5f712', '8baf21dd-402d-4ee2-b209-6aea0c78ce79'),
  ('a024f3dd-8d52-4a04-b3bc-7cbdd1653b0a', '07076f7e-26a3-4286-932a-201894abb400'),
  ('63bf2d33-bf2c-4513-827f-63bfc8bba74c', 'ea6e9c47-f4af-40b5-852f-1fa1bce695c1'),
  ('db862c6f-d3d3-4560-87eb-d9d1da8a56b6', 'e1134133-6c71-44ab-a3ac-69a3806a0daf'),
  ('1ba2ed59-528d-46ba-b4eb-76b63306796e', 'e1134133-6c71-44ab-a3ac-69a3806a0daf')
) as d(medicament_id, ingredient_id)
where mi.medicament_id = d.medicament_id::uuid and mi.ingredient_id = d.ingredient_id::uuid;

-- 3. Liens ajoutés
insert into medicament_ingredients (medicament_id, ingredient_id)
select v.medicament_id::uuid, v.ingredient_id::uuid
from (values
  ('4e1c949d-3faf-4a0e-9021-ba6903cd1d50', '46b92d72-da29-4708-aac5-12a4662a8d1a'),
  ('4e1c949d-3faf-4a0e-9021-ba6903cd1d50', 'c1ce864e-971a-44e0-8689-cf6c6317e296'),
  ('0ef72794-66f1-4d33-af5f-18c4b6f04e8f', '46b92d72-da29-4708-aac5-12a4662a8d1a'),
  ('0ef72794-66f1-4d33-af5f-18c4b6f04e8f', 'c1ce864e-971a-44e0-8689-cf6c6317e296'),
  ('b98668a4-68ae-47d1-9368-84e57e2ca05a', '46b92d72-da29-4708-aac5-12a4662a8d1a'),
  ('b98668a4-68ae-47d1-9368-84e57e2ca05a', 'c1ce864e-971a-44e0-8689-cf6c6317e296'),
  ('2cbde5c2-a561-4116-9b70-bde57004b289', '46b92d72-da29-4708-aac5-12a4662a8d1a'),
  ('2cbde5c2-a561-4116-9b70-bde57004b289', 'c1ce864e-971a-44e0-8689-cf6c6317e296'),
  ('47b63255-e1d9-43b3-8ea4-8e0ed7f2c757', '0010c033-08d9-4603-a7cc-6638453782b6'),
  ('47838bc8-e444-42f9-91c3-bd32ba0c9976', '87a35c45-adbe-4e6d-a787-240ee0030ed1'),
  ('47838bc8-e444-42f9-91c3-bd32ba0c9976', 'f320b18e-1a19-4629-906b-62dd12c2654f'),
  ('afdf9660-660f-412f-aaa5-15a3399f0740', '87a35c45-adbe-4e6d-a787-240ee0030ed1'),
  ('afdf9660-660f-412f-aaa5-15a3399f0740', 'f320b18e-1a19-4629-906b-62dd12c2654f'),
  ('2894f0a9-4da2-4698-b53d-9ab01c7fef2c', '87a35c45-adbe-4e6d-a787-240ee0030ed1'),
  ('2894f0a9-4da2-4698-b53d-9ab01c7fef2c', 'f320b18e-1a19-4629-906b-62dd12c2654f'),
  ('cbca7c8d-abb1-4d5c-aaee-c283556e7760', '87a35c45-adbe-4e6d-a787-240ee0030ed1'),
  ('cbca7c8d-abb1-4d5c-aaee-c283556e7760', 'f320b18e-1a19-4629-906b-62dd12c2654f'),
  ('5773dfb6-fb49-4f85-b406-9451871a1e13', '87a35c45-adbe-4e6d-a787-240ee0030ed1'),
  ('5773dfb6-fb49-4f85-b406-9451871a1e13', 'f320b18e-1a19-4629-906b-62dd12c2654f'),
  ('82c4b654-badb-4121-9af8-7a4dbd7e8b6e', '87a35c45-adbe-4e6d-a787-240ee0030ed1'),
  ('82c4b654-badb-4121-9af8-7a4dbd7e8b6e', 'f320b18e-1a19-4629-906b-62dd12c2654f'),
  ('ef808aea-604a-4f15-940f-5a8e27a18d69', '87a35c45-adbe-4e6d-a787-240ee0030ed1'),
  ('ef808aea-604a-4f15-940f-5a8e27a18d69', 'f320b18e-1a19-4629-906b-62dd12c2654f'),
  ('41bbdfd4-f8e4-4d6f-9413-f93b3a575288', 'f320b18e-1a19-4629-906b-62dd12c2654f'),
  ('124b8d40-99b4-4712-a3ba-c097283acb3a', 'f320b18e-1a19-4629-906b-62dd12c2654f'),
  ('7b4b9103-1641-4284-9eaa-30220334b099', 'f320b18e-1a19-4629-906b-62dd12c2654f'),
  ('d7d80805-2dc2-42c9-9c2a-32e36e00ad64', '76689dc4-4a62-4966-80be-03c444970729'),
  ('84e7ba6e-47a9-4611-a565-8312dbbf018b', '76689dc4-4a62-4966-80be-03c444970729'),
  ('dd8e9c4d-4c17-41c8-9fc5-8279cad2405e', '76689dc4-4a62-4966-80be-03c444970729'),
  ('33c0c901-0d5f-438a-a5e7-8a18e42ffedd', 'ea6e9c47-f4af-40b5-852f-1fa1bce695c1'),
  ('20580b06-7a4c-4362-a956-fa65d8939b39', '652668a4-4dcd-4271-8592-7696385cf0b8'),
  ('20580b06-7a4c-4362-a956-fa65d8939b39', '954ba383-290f-4bbe-be00-53f646b2114b'),
  ('cc1e3059-8b30-4dce-8417-a89b2ffad41c', '954ba383-290f-4bbe-be00-53f646b2114b'),
  ('35abe92d-1519-4a8b-aed4-b1fb834e47c1', '611be1d6-d666-494b-8355-9a9c4ea16619'),
  ('8f6bb892-eaa1-4067-86d6-3e60bacd6949', '611be1d6-d666-494b-8355-9a9c4ea16619'),
  ('38b5dcdf-fd20-4b59-a856-3a13cd58a3d8', '611be1d6-d666-494b-8355-9a9c4ea16619'),
  ('d7b5dce9-1233-473b-be9c-ce0ae6e9cc56', 'ea6e9c47-f4af-40b5-852f-1fa1bce695c1'),
  ('0f8e8ae8-4e5b-4c5d-bc09-b1d1eb4b5abe', '03dea98f-3544-4b29-b419-47bede6553fa'),
  ('0f8e8ae8-4e5b-4c5d-bc09-b1d1eb4b5abe', '611be1d6-d666-494b-8355-9a9c4ea16619'),
  ('9709d445-f876-4d5f-adb7-277b2cbf6ace', '03dea98f-3544-4b29-b419-47bede6553fa'),
  ('9709d445-f876-4d5f-adb7-277b2cbf6ace', '611be1d6-d666-494b-8355-9a9c4ea16619'),
  ('53d5c408-873d-49f7-b3ac-3bf739c45bc2', '03dea98f-3544-4b29-b419-47bede6553fa'),
  ('53d5c408-873d-49f7-b3ac-3bf739c45bc2', '611be1d6-d666-494b-8355-9a9c4ea16619'),
  ('e3cec812-660e-40ad-8b39-7ed4c6a5f712', '3854d3fd-f876-4bc4-b226-2197277c8faa'),
  ('e3cec812-660e-40ad-8b39-7ed4c6a5f712', 'e1134133-6c71-44ab-a3ac-69a3806a0daf'),
  ('e3cec812-660e-40ad-8b39-7ed4c6a5f712', 'a50ec2b3-ec76-4b3b-9b22-cfe2d9844916'),
  ('1ba2ed59-528d-46ba-b4eb-76b63306796e', '07a55ef8-1b39-40d0-a1bc-395770d42c33')
) as v(medicament_id, ingredient_id)
on conflict (medicament_id, ingredient_id) do nothing;

-- 4. DCI corrigées (null = ligne volontairement « non vérifiable »)
update medicaments set dci = 'OCTOCOG ALFA' where id = 'd7d80805-2dc2-42c9-9c2a-32e36e00ad64'; -- KOGENATE 1000 UI COMPRIME ENROBE à 250 MG 1 BOITE 12 COMPRIME
update medicaments set dci = 'OCTOCOG ALFA' where id = '84e7ba6e-47a9-4611-a565-8312dbbf018b'; -- KOGENATE 250 UI ENROBE
update medicaments set dci = 'OCTOCOG ALFA' where id = 'dd8e9c4d-4c17-41c8-9fc5-8279cad2405e'; -- KOGENATE 500 UI
update medicaments set dci = null where id = '8f9a5d06-0fbf-4a9e-bdca-85349041d398'; -- KLONOPIN
update medicaments set dci = 'COLCHICINE' where id = '33c0c901-0d5f-438a-a5e7-8a18e42ffedd'; -- COLCHICINE MG
update medicaments set dci = 'HYDROXYCARBAMIDE' where id = '20580b06-7a4c-4362-a956-fa65d8939b39'; -- HYDREA
update medicaments set dci = 'METFORMINE / GLIBENCLAMIDE' where id = '0f8e8ae8-4e5b-4c5d-bc09-b1d1eb4b5abe'; -- GLUCOVANCE 1000 MG / 5 MG, Comprimé pelliculé
update medicaments set dci = 'METFORMINE / GLIBENCLAMIDE' where id = '9709d445-f876-4d5f-adb7-277b2cbf6ace'; -- GLUCOVANCE 500 MG / 2.5MG, Comprimé pelliculé
update medicaments set dci = 'METFORMINE / GLIBENCLAMIDE' where id = '53d5c408-873d-49f7-b3ac-3bf739c45bc2'; -- GLUCOVANCE 500 MG / 5 MG, Comprimé pelliculé
update medicaments set dci = null where id = '7fabccab-b037-4503-b22e-04e741be5323'; -- GLUCOVANCE
update medicaments set dci = null where id = 'a024f3dd-8d52-4a04-b3bc-7cbdd1653b0a'; -- COLPRONE
update medicaments set dci = null where id = '63bf2d33-bf2c-4513-827f-63bfc8bba74c'; -- COLPRONE COMPRIME SECABLE à 1 MG SECABLE
update medicaments set dci = null where id = 'bf742897-eabf-4ad5-88e4-c3edbd37e0cd'; -- COLPRONE COMPRIME SECABLE à 400 / 20 1 BOITE 16 COMPRIM

-- Contrôle « base = source » (doit renvoyer l'empreinte ci-dessus) :
--   select md5(string_agg(m.id::text || '|' || coalesce(m.dci, '') || '|' ||
--            coalesce((select string_agg(mi.ingredient_id::text, ',' order by mi.ingredient_id::text collate "C")
--                      from medicament_ingredients mi where mi.medicament_id = m.id), ''),
--            E'\n' order by m.id::text collate "C"))
--   from medicaments m where m.id in (
--     '4e1c949d-3faf-4a0e-9021-ba6903cd1d50',
--     '0ef72794-66f1-4d33-af5f-18c4b6f04e8f',
--     'b98668a4-68ae-47d1-9368-84e57e2ca05a',
--     '2cbde5c2-a561-4116-9b70-bde57004b289',
--     '47b63255-e1d9-43b3-8ea4-8e0ed7f2c757',
--     '47838bc8-e444-42f9-91c3-bd32ba0c9976',
--     'afdf9660-660f-412f-aaa5-15a3399f0740',
--     '2894f0a9-4da2-4698-b53d-9ab01c7fef2c',
--     'cbca7c8d-abb1-4d5c-aaee-c283556e7760',
--     '5773dfb6-fb49-4f85-b406-9451871a1e13',
--     '82c4b654-badb-4121-9af8-7a4dbd7e8b6e',
--     'ef808aea-604a-4f15-940f-5a8e27a18d69',
--     '41bbdfd4-f8e4-4d6f-9413-f93b3a575288',
--     '124b8d40-99b4-4712-a3ba-c097283acb3a',
--     '7b4b9103-1641-4284-9eaa-30220334b099',
--     'd7d80805-2dc2-42c9-9c2a-32e36e00ad64',
--     '84e7ba6e-47a9-4611-a565-8312dbbf018b',
--     'dd8e9c4d-4c17-41c8-9fc5-8279cad2405e',
--     '8f9a5d06-0fbf-4a9e-bdca-85349041d398',
--     '33c0c901-0d5f-438a-a5e7-8a18e42ffedd',
--     '20580b06-7a4c-4362-a956-fa65d8939b39',
--     'cc1e3059-8b30-4dce-8417-a89b2ffad41c',
--     '35abe92d-1519-4a8b-aed4-b1fb834e47c1',
--     '8f6bb892-eaa1-4067-86d6-3e60bacd6949',
--     '38b5dcdf-fd20-4b59-a856-3a13cd58a3d8',
--     'd7b5dce9-1233-473b-be9c-ce0ae6e9cc56',
--     '0f8e8ae8-4e5b-4c5d-bc09-b1d1eb4b5abe',
--     '9709d445-f876-4d5f-adb7-277b2cbf6ace',
--     '53d5c408-873d-49f7-b3ac-3bf739c45bc2',
--     '7fabccab-b037-4503-b22e-04e741be5323',
--     'e3cec812-660e-40ad-8b39-7ed4c6a5f712',
--     'a024f3dd-8d52-4a04-b3bc-7cbdd1653b0a',
--     '63bf2d33-bf2c-4513-827f-63bfc8bba74c',
--     'bf742897-eabf-4ad5-88e4-c3edbd37e0cd',
--     'db862c6f-d3d3-4560-87eb-d9d1da8a56b6',
--     '1ba2ed59-528d-46ba-b4eb-76b63306796e');
