-- Sprint MOTEUR-3, étape 1 — fiches MA dont la DCI contredit la composition BDPM de la même marque.
-- GÉNÉRÉ par scripts/gen_moteur3_e1_catalogue.mjs — ne pas modifier à la main.
-- Empreinte de la source (état final attendu : id | dci | masque | ingrédients) : 2fd8ac7995fbe975c99413f6b4ebe29c
--
-- 16 fiches corrigées (6 liens mis en quarantaine, 17 liens ajoutés, 16 DCI corrigées),
-- 26 fiches masquées (réversible : masque = false + motif_masquage = null).

-- 1. Garde : la migration ne s'applique que sur l'état lu au diagnostic (2026-11-16), sinon tout est annulé.
do $$
declare v_ecarts text;
begin
  select string_agg(a.nom, ' ; ') into v_ecarts
  from (values
  ('90118027-d595-48e0-8682-f4a5f23c2b21', 'SERETIDE', 'FLUOXETINE', '', 'c'),
  ('ec208df8-d948-4f55-8941-814bdbe4f6fc', 'ENGERIX-B (ADULTE) 1 BOITE 10 FLACON', 'CYCLOPHOSPHAMIDE', '2182893d-36a8-452f-8695-40df26060328', 'c'),
  ('a0e056c8-6193-4b9e-9063-354b61e65a42', 'ESTRACYT', 'ERYTHROMYCINE', '811894a9-e319-4cef-910f-0874d6869787', 'c'),
  ('029360f4-8680-44bb-9d9f-dff7f7c7162e', 'FRAXODI', 'ACIDE FUSIDIQUE', '', 'c'),
  ('82b091bb-cf3c-471d-a9c1-c97719a3df26', 'INNOHEP 10 000 UI ANTI- 1 BOITE 2 SERINGUE', 'AMLODIPINE', '10d1b3f7-6c13-4328-a3d0-e08367b6bd46', 'c'),
  ('8701b45e-74ec-4c08-9b0e-2c3f945693d1', 'LOVENOX', 'LOSARTAN', '', 'c'),
  ('82c5dcf8-f968-428b-8316-74491c444524', 'SOLIAN PELLICULE', 'INDAPAMIDE', '', 'c'),
  ('65fad93e-2aa3-41c3-8e1a-d9e4e05d1639', 'SOLIAN POUDRE POUR SUSPENSION PELLICULE', 'INDAPAMIDE', '', 'c'),
  ('617eec75-33e6-43ff-9caa-3b8c9fbd4537', 'TIENAM', 'DIPROPHYLLINE', '', 'c'),
  ('6ddb8afa-6484-4a32-a027-f62e9e25ae34', 'VENOFER 100 MG/5ML FER SOLUTION INJECTABLE IV à 100 / 5 AMPOULE 5 ML', 'VENLAFAXINE', '', 'c'),
  ('7a36b36c-b249-4c99-aa8b-b9d6cd7606f4', 'XALACOM COLLYRE à 50 / 5 µG / MG 1 FLACON 2,5 ML', 'CELECOXIB', '', 'c'),
  ('730e2d1d-8e7a-47c6-887f-30e28106460e', 'XYLOCAINE 2%', 'OXALIPLATINE', '62fd292b-c18b-4193-a977-e6e5a0038f9a', 'c'),
  ('05f2657b-e23d-4426-9ef1-53653cc0a7ee', 'ZOMETA', 'SERTRALINE', '34ff789c-5313-4d38-98c3-7c62bf99447d', 'c'),
  ('448e9d76-b9a5-4973-b368-c0c57b39ea46', 'BECLOJET 1 FLACON 200 DOSE', 'DEXAMETHASONE', 'a8104c9a-8402-4de3-950a-8bd818d98eb3', 'c'),
  ('1fe76b27-c32b-4b52-95b5-005662d0b0b6', 'HALDOL FORT BUVABLES à 2 MG', 'MODIFIEE', '', 'c'),
  ('4284db0c-398e-4a37-89ee-da20cbef2a7a', 'ROVAMYCINE LYOPHILISAT POUR SUSPENSION 1 BOITE 1 FLACON', 'VACCIN', '14fb45c0-b119-464f-b531-051dbfb93f71', 'c'),
  ('1f7564f4-a4e4-4619-8e53-ed30178b74f2', 'ACTONEL POUDRE POUR SUSPENSION 1 SERINGUE 0,5 ML', 'VACCIN ANTI-', null, 'm'),
  ('edec608a-eafe-4437-9c80-6128aa78dd1c', 'DUPHASTON COMPRIME PELLICULE à 150 / 300 1 BOITE 60 COMPRIM', 'LAMIVUDINE /', null, 'm'),
  ('d309f254-9368-4e06-9ef4-b7047a492ba1', 'ESTRACYT BUVABLE à 500 MG', 'ERYTHROMYCINE', null, 'm'),
  ('f2f1ff79-b5af-44f0-ba29-0fc57b2740f9', 'ESTRACYT COMPRIME à 500 MG 1 BOITE 100 GELULE', 'ERYTHROMYCINE', null, 'm'),
  ('09c6cce4-b76e-46b0-bfb0-3c694b735cb0', 'ESTRACYT GRANULE POUR SOLUTION', 'ERYTHROMYCINE', null, 'm'),
  ('0eb549bc-c0b1-4b15-9a85-d4cee096c863', 'ESTRACYT MPRIME SECABLE à 25 MG', 'HYDROCHLOROTHIAZIDE CO', null, 'm'),
  ('0865be31-27d4-49a1-9292-fe28722a7a22', 'LEDERFOLINE COMPRIME SECABLE à 500 MG 1 BOITE 50 COMPRIME', 'FUROSEMIDE', null, 'm'),
  ('cbfba396-85fe-4f83-a6ed-773196213a0c', 'LOVENOX COMPRIME PELLICULE SECABLE 1 BOITE 20 COMPRIME', 'LOSARTAN', null, 'm'),
  ('7c123280-bf37-4d3d-bfce-fffddd5ec7cf', 'LOVENOX COMPRIME PELLICULE SECABLE 1 BOITE 30 COMPRIME', 'LOSARTAN', null, 'm'),
  ('aa2617a8-aff3-4fb4-aef3-28e1549e50f6', 'LOVENOX à 100 MG PELLICULE', 'LOSARTAN', null, 'm'),
  ('97f45ae7-b3d2-442a-9b05-e1420f96480b', 'LOVENOX à 50 MG PELLICULE', 'LOSARTAN', null, 'm'),
  ('dee2a851-03fe-45b9-9c31-8c962106900b', 'PREVENAR 13 COMPRIME PELLICULE à 0.625 / 1 BOITE 30 COMPRIM', 'INDAPAMIDE /', null, 'm'),
  ('329fd014-77f8-4a0e-a913-083eb36fb721', 'PROZAC BUVABLE à 2 G', 'STRONTIUM', null, 'm'),
  ('c50f6b87-05ca-46f8-8a34-efc0af4f32a2', 'ZOMIG SOLUTION A DILUER POUR 1 BOITE 1 FLACON', 'ACIDE ZOLEDRONIQUE', null, 'm'),
  ('74810e82-dc7b-433f-848c-db0d79e58446', 'ANCOTIL MG PELLICULE', 'HYDROCHLOROTHIAZIDE MG /', null, 'm'),
  ('e828768a-dcbf-405b-9c56-09f3b070866b', 'AUGMENTIN PAR NEBULISEUR à 0.5 MG/2ML UNIDOSE', 'IPRATROPIUM', null, 'm'),
  ('3e389031-0f6c-4965-8ca2-9abed79a923a', 'BACTRIM ENROBE', 'CIPROFLOXACINE', null, 'm'),
  ('1ef0da7a-c990-47a0-861a-3e81add3f854', 'BICNU SOLUTE CONCENTRE 1 BIDON 10 L', 'CONCENTRE POUR', null, 'm'),
  ('fa38edaf-a35c-43f1-9494-6984c8ab6230', 'BREXIN PERFUSION à 6 MG', 'ACIDE IBANDRONIQUE', null, 'm'),
  ('e436db48-8ee5-4015-a77e-38ae62d2fd39', 'HALDOL FORT SOLUTION POUR PERFUSION 1 FLACON 15 ML', 'GELATINE FLUIDE', null, 'm'),
  ('f3a750f0-f2f7-45a4-b98b-20f5062df5bd', 'INDOBIOTIC SUSPENSION POUR INHALATION 1 FLACON 200 DOSE', 'SALBUTAMOL', null, 'm'),
  ('0e17cd61-1b1d-43ce-9f4b-f8afd799e5b2', 'NOZINAN DRE POUR SOLUTION', 'EPTACOG ALPHA ACTIVE POU', null, 'm'),
  ('4091c595-f696-41fc-b1be-c296707c62b1', 'RISORDAN AURICULAIRE à 2 MUI 1 BOITE 60 COMPRIME', 'RIFAMYCINE', null, 'm'),
  ('aa362657-30da-407b-a4cd-2e83d87f6c55', 'TERLOMEXIN MG', 'IMMUNOGLOBULINE', null, 'm'),
  ('16aa6534-4119-451b-8bad-84d3cc4fa8e7', 'VISKEN QUINZE', 'SALBUTAMOL', null, 'm'),
  ('653e7cd7-5bf3-4b50-85ff-319329e3da2a', 'ACETATE EM 142 COMPRIME à 4 / 1.25 MG / MG 1 BOITE 28 COMPRIME', 'INDAPAMIDE', null, 'm')
  ) as a(id, nom, dci, ings, sorte)
  left join medicaments m on m.id = a.id::uuid and m.pays = 'MA'
  where m.id is null
     or m.nom is distinct from a.nom
     or m.dci is distinct from a.dci
     or m.masque
     or (a.sorte = 'c' and coalesce((select string_agg(mi.ingredient_id::text, ',' order by mi.ingredient_id::text collate "C")
                  from medicament_ingredients mi where mi.medicament_id = m.id), '') <> a.ings);
  if v_ecarts is not null then
    raise exception 'MOTEUR-3 E1 : état de départ inattendu pour : %', v_ecarts;
  end if;
end $$;

-- 2. Quarantaine des liens erronés (trace complète, réversible), puis retrait
insert into mapping_quarantaine (medicament_id, ingredient_id, medicament_nom, dci_base, dci_ammps, motif)
select v.medicament_id::uuid, v.ingredient_id::uuid, v.nom, v.dci, null, v.motif
from (values
  ('ec208df8-d948-4f55-8941-814bdbe4f6fc', '2182893d-36a8-452f-8695-40df26060328', 'ENGERIX-B (ADULTE) 1 BOITE 10 FLACON', 'CYCLOPHOSPHAMIDE', 'MOTEUR-3 E1 — fiche ENGERIX : ENGERIX-B adulte, boîte de 10 flacons : vaccin de l’hépatite B ; aucun ingrédient vaccinal au référentiel, fiche laissée sans ingrédient'),
  ('a0e056c8-6193-4b9e-9063-354b61e65a42', '811894a9-e319-4cef-910f-0874d6869787', 'ESTRACYT', 'ERYTHROMYCINE', 'MOTEUR-3 E1 — fiche ESTRACYT : gélule 140 mg, Pfizer : estramustine (l’érythromycine n’existe pas à 140 mg)'),
  ('82b091bb-cf3c-471d-a9c1-c97719a3df26', '10d1b3f7-6c13-4328-a3d0-e08367b6bd46', 'INNOHEP 10 000 UI ANTI- 1 BOITE 2 SERINGUE', 'AMLODIPINE', 'MOTEUR-3 E1 — fiche INNOHEP : 10 000 UI anti-Xa, boîte de 2 seringues : tinzaparine'),
  ('730e2d1d-8e7a-47c6-887f-30e28106460e', '62fd292b-c18b-4193-a977-e6e5a0038f9a', 'XYLOCAINE 2%', 'OXALIPLATINE', 'MOTEUR-3 E1 — fiche XYLOCAINE : gel à 2 % : lidocaïne (l’oxaliplatine est une solution pour perfusion)'),
  ('05f2657b-e23d-4426-9ef1-53653cc0a7ee', '34ff789c-5313-4d38-98c3-7c62bf99447d', 'ZOMETA', 'SERTRALINE', 'MOTEUR-3 E1 — fiche ZOMETA : solution pour perfusion 4 mg, Novartis : acide zolédronique'),
  ('448e9d76-b9a5-4973-b368-c0c57b39ea46', 'a8104c9a-8402-4de3-950a-8bd818d98eb3', 'BECLOJET 1 FLACON 200 DOSE', 'DEXAMETHASONE', 'MOTEUR-3 E1 — fiche BECLOJET : flacon de 200 doses : béclométasone (la dexaméthasone n’existe pas en flacon doseur)')
) as v(medicament_id, ingredient_id, nom, dci, motif);

delete from medicament_ingredients mi
using (values
  ('ec208df8-d948-4f55-8941-814bdbe4f6fc', '2182893d-36a8-452f-8695-40df26060328'),
  ('a0e056c8-6193-4b9e-9063-354b61e65a42', '811894a9-e319-4cef-910f-0874d6869787'),
  ('82b091bb-cf3c-471d-a9c1-c97719a3df26', '10d1b3f7-6c13-4328-a3d0-e08367b6bd46'),
  ('730e2d1d-8e7a-47c6-887f-30e28106460e', '62fd292b-c18b-4193-a977-e6e5a0038f9a'),
  ('05f2657b-e23d-4426-9ef1-53653cc0a7ee', '34ff789c-5313-4d38-98c3-7c62bf99447d'),
  ('448e9d76-b9a5-4973-b368-c0c57b39ea46', 'a8104c9a-8402-4de3-950a-8bd818d98eb3')
) as d(medicament_id, ingredient_id)
where mi.medicament_id = d.medicament_id::uuid and mi.ingredient_id = d.ingredient_id::uuid;

-- 3. Liens ajoutés
insert into medicament_ingredients (medicament_id, ingredient_id)
select v.medicament_id::uuid, v.ingredient_id::uuid
from (values
  ('90118027-d595-48e0-8682-f4a5f23c2b21', '0304a195-ae6a-47f2-b2b6-16fa2a9520dc'),
  ('90118027-d595-48e0-8682-f4a5f23c2b21', 'a314eba9-67c1-4e72-a03d-674e1e944193'),
  ('a0e056c8-6193-4b9e-9063-354b61e65a42', '5a3a4872-0b31-4a76-b7d2-0b958cd6ad21'),
  ('029360f4-8680-44bb-9d9f-dff7f7c7162e', '7bffac60-6bb2-40e2-85f7-ecec96af141d'),
  ('82b091bb-cf3c-471d-a9c1-c97719a3df26', 'ed738831-6253-4677-9f11-55be73a33916'),
  ('8701b45e-74ec-4c08-9b0e-2c3f945693d1', 'a81f8752-5c0d-426c-819d-2fb223e62630'),
  ('82c5dcf8-f968-428b-8316-74491c444524', '790014f4-7651-469a-97f2-06bbde2037be'),
  ('65fad93e-2aa3-41c3-8e1a-d9e4e05d1639', '790014f4-7651-469a-97f2-06bbde2037be'),
  ('617eec75-33e6-43ff-9caa-3b8c9fbd4537', 'a8a901ae-d94d-494b-b1d0-528f5fb30efd'),
  ('617eec75-33e6-43ff-9caa-3b8c9fbd4537', 'bf858398-6a72-49ea-94d7-9a3de32c64d4'),
  ('6ddb8afa-6484-4a32-a027-f62e9e25ae34', '77d7504f-5069-41fd-a389-bf341e48e500'),
  ('7a36b36c-b249-4c99-aa8b-b9d6cd7606f4', '838c3dd5-3440-407f-9284-580511c9e92b'),
  ('7a36b36c-b249-4c99-aa8b-b9d6cd7606f4', 'f95d56b7-556e-4e0e-96d6-97e4b1675764'),
  ('730e2d1d-8e7a-47c6-887f-30e28106460e', '03046ed3-65bb-4578-9b4b-a80dd1a1454e'),
  ('05f2657b-e23d-4426-9ef1-53653cc0a7ee', '198b3755-0e02-46bd-b392-c061a2c0323c'),
  ('448e9d76-b9a5-4973-b368-c0c57b39ea46', 'ff5f0ec1-0d88-452c-9784-5b378d7ad149'),
  ('1fe76b27-c32b-4b52-95b5-005662d0b0b6', '6f31eec6-78d8-4c3b-925e-17f50ecb26af')
) as v(medicament_id, ingredient_id)
on conflict (medicament_id, ingredient_id) do nothing;

-- 4. DCI corrigées (lues par les canaux CI, rénal et tératogène)
update medicaments set dci = 'FLUTICASONE / SALMETEROL' where id = '90118027-d595-48e0-8682-f4a5f23c2b21'; -- SERETIDE (était : FLUOXETINE)
update medicaments set dci = 'VACCIN DE L''HEPATITE B (ANTIGENE HBs RECOMBINANT)' where id = 'ec208df8-d948-4f55-8941-814bdbe4f6fc'; -- ENGERIX-B (ADULTE) 1 BOITE 10 FLACON (était : CYCLOPHOSPHAMIDE)
update medicaments set dci = 'ESTRAMUSTINE' where id = 'a0e056c8-6193-4b9e-9063-354b61e65a42'; -- ESTRACYT (était : ERYTHROMYCINE)
update medicaments set dci = 'NADROPARINE CALCIQUE' where id = '029360f4-8680-44bb-9d9f-dff7f7c7162e'; -- FRAXODI (était : ACIDE FUSIDIQUE)
update medicaments set dci = 'TINZAPARINE SODIQUE' where id = '82b091bb-cf3c-471d-a9c1-c97719a3df26'; -- INNOHEP 10 000 UI ANTI- 1 BOITE 2 SERINGUE (était : AMLODIPINE)
update medicaments set dci = 'ENOXAPARINE SODIQUE' where id = '8701b45e-74ec-4c08-9b0e-2c3f945693d1'; -- LOVENOX (était : LOSARTAN)
update medicaments set dci = 'AMISULPRIDE' where id = '82c5dcf8-f968-428b-8316-74491c444524'; -- SOLIAN PELLICULE (était : INDAPAMIDE)
update medicaments set dci = 'AMISULPRIDE' where id = '65fad93e-2aa3-41c3-8e1a-d9e4e05d1639'; -- SOLIAN POUDRE POUR SUSPENSION PELLICULE (était : INDAPAMIDE)
update medicaments set dci = 'IMIPENEME / CILASTATINE' where id = '617eec75-33e6-43ff-9caa-3b8c9fbd4537'; -- TIENAM (était : DIPROPHYLLINE)
update medicaments set dci = 'FER (COMPLEXE D''HYDROXYDE FERRIQUE - SACCHAROSE)' where id = '6ddb8afa-6484-4a32-a027-f62e9e25ae34'; -- VENOFER 100 MG/5ML FER SOLUTION INJECTABLE IV à 100 / 5 AMPOULE 5 ML (était : VENLAFAXINE)
update medicaments set dci = 'LATANOPROST / TIMOLOL' where id = '7a36b36c-b249-4c99-aa8b-b9d6cd7606f4'; -- XALACOM COLLYRE à 50 / 5 µG / MG 1 FLACON 2,5 ML (était : CELECOXIB)
update medicaments set dci = 'LIDOCAINE' where id = '730e2d1d-8e7a-47c6-887f-30e28106460e'; -- XYLOCAINE 2% (était : OXALIPLATINE)
update medicaments set dci = 'ACIDE ZOLEDRONIQUE' where id = '05f2657b-e23d-4426-9ef1-53653cc0a7ee'; -- ZOMETA (était : SERTRALINE)
update medicaments set dci = 'BECLOMETASONE' where id = '448e9d76-b9a5-4973-b368-c0c57b39ea46'; -- BECLOJET 1 FLACON 200 DOSE (était : DEXAMETHASONE)
update medicaments set dci = 'HALOPERIDOL' where id = '1fe76b27-c32b-4b52-95b5-005662d0b0b6'; -- HALDOL FORT BUVABLES à 2 MG (était : MODIFIEE)
update medicaments set dci = 'SPIRAMYCINE' where id = '4284db0c-398e-4a37-89ee-da20cbef2a7a'; -- ROVAMYCINE LYOPHILISAT POUR SUSPENSION 1 BOITE 1 FLACON (était : VACCIN)

-- 5. Fiches masquées (exclues des recherches, jamais supprimées)
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : ACTONEL (risédronate, comprimé) avec une forme de vaccin (seringue 0,5 mL) et la DCI « VACCIN ANTI- »' where id = '1f7564f4-a4e4-4619-8e53-ed30178b74f2'; -- ACTONEL POUDRE POUR SUSPENSION 1 SERINGUE 0,5 ML
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : DUPHASTON (dydrogestérone 10 mg) avec la forme 150 / 300 et la DCI de la lamivudine / zidovudine' where id = 'edec608a-eafe-4437-9c80-6128aa78dd1c'; -- DUPHASTON COMPRIME PELLICULE à 150 / 300 1 BOITE 60 COMPRIM
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : ESTRACYT (estramustine, gélule 140 mg) avec une forme buvable 500 mg et la DCI érythromycine' where id = 'd309f254-9368-4e06-9ef4-b7047a492ba1'; -- ESTRACYT BUVABLE à 500 MG
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : ESTRACYT (estramustine, gélule 140 mg) avec un comprimé 500 mg et la DCI érythromycine' where id = 'f2f1ff79-b5af-44f0-ba29-0fc57b2740f9'; -- ESTRACYT COMPRIME à 500 MG 1 BOITE 100 GELULE
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : ESTRACYT (estramustine, gélule) avec un granulé pour solution et la DCI érythromycine' where id = '09c6cce4-b76e-46b0-bfb0-3c694b735cb0'; -- ESTRACYT GRANULE POUR SOLUTION
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : ESTRACYT (estramustine) avec un comprimé sécable 25 mg et la DCI hydrochlorothiazide' where id = '0eb549bc-c0b1-4b15-9a85-d4cee096c863'; -- ESTRACYT MPRIME SECABLE à 25 MG
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : LEDERFOLINE (folinate, 5 à 25 mg) avec un comprimé sécable 500 mg et la DCI furosémide' where id = '0865be31-27d4-49a1-9292-fe28722a7a22'; -- LEDERFOLINE COMPRIME SECABLE à 500 MG 1 BOITE 50 COMPRIME
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : LOVENOX (énoxaparine injectable) avec la forme « comprimé pelliculé sécable » et la DCI losartan' where id = 'cbfba396-85fe-4f83-a6ed-773196213a0c'; -- LOVENOX COMPRIME PELLICULE SECABLE 1 BOITE 20 COMPRIME
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : LOVENOX (énoxaparine injectable) avec la forme « comprimé pelliculé sécable » et la DCI losartan' where id = '7c123280-bf37-4d3d-bfce-fffddd5ec7cf'; -- LOVENOX COMPRIME PELLICULE SECABLE 1 BOITE 30 COMPRIME
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : LOVENOX (énoxaparine injectable) avec un comprimé pelliculé 100 mg et la DCI losartan' where id = 'aa2617a8-aff3-4fb4-aef3-28e1549e50f6'; -- LOVENOX à 100 MG PELLICULE
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : LOVENOX (énoxaparine injectable) avec un comprimé pelliculé 50 mg et la DCI losartan' where id = '97f45ae7-b3d2-442a-9b05-e1420f96480b'; -- LOVENOX à 50 MG PELLICULE
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : PREVENAR 13 (vaccin) avec un comprimé pelliculé et la DCI indapamide' where id = 'dee2a851-03fe-45b9-9c31-8c962106900b'; -- PREVENAR 13 COMPRIME PELLICULE à 0.625 / 1 BOITE 30 COMPRIM
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : PROZAC (fluoxétine 20 mg) avec une forme buvable 2 g et la DCI strontium' where id = '329fd014-77f8-4a0e-a913-083eb36fb721'; -- PROZAC BUVABLE à 2 G
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : ZOMIG (zolmitriptan 2,5 mg, comprimé) avec une solution à diluer pour perfusion et la DCI acide zolédronique' where id = 'c50f6b87-05ca-46f8-8a34-efc0af4f32a2'; -- ZOMIG SOLUTION A DILUER POUR 1 BOITE 1 FLACON
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : ANCOTIL (flucytosine) avec la DCI hydrochlorothiazide, forme tronquée' where id = '74810e82-dc7b-433f-848c-db0d79e58446'; -- ANCOTIL MG PELLICULE
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : AUGMENTIN (amoxicilline + acide clavulanique) avec une forme pour nébuliseur 0,5 mg / 2 mL et la DCI ipratropium' where id = 'e828768a-dcbf-405b-9c56-09f3b070866b'; -- AUGMENTIN PAR NEBULISEUR à 0.5 MG/2ML UNIDOSE
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : BACTRIM (sulfaméthoxazole + triméthoprime) avec la DCI ciprofloxacine, forme tronquée' where id = '3e389031-0f6c-4965-8ca2-9abed79a923a'; -- BACTRIM ENROBE
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : BICNU (carmustine) avec un soluté concentré en bidon de 10 L (dialyse)' where id = '1ef0da7a-c990-47a0-861a-3e81add3f854'; -- BICNU SOLUTE CONCENTRE 1 BIDON 10 L
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : BREXIN (piroxicam) avec une perfusion à 6 mg et la DCI acide ibandronique' where id = 'fa38edaf-a35c-43f1-9494-6984c8ab6230'; -- BREXIN PERFUSION à 6 MG
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : HALDOL FORT (halopéridol) avec une solution pour perfusion et la DCI gélatine fluide' where id = 'e436db48-8ee5-4015-a77e-38ae62d2fd39'; -- HALDOL FORT SOLUTION POUR PERFUSION 1 FLACON 15 ML
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : INDOBIOTIC (indométacine + gentamicine, collyre) avec une suspension pour inhalation et la DCI salbutamol' where id = 'f3a750f0-f2f7-45a4-b98b-20f5062df5bd'; -- INDOBIOTIC SUSPENSION POUR INHALATION 1 FLACON 200 DOSE
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : NOZINAN (lévomépromazine) avec la DCI eptacog alpha activé' where id = '0e17cd61-1b1d-43ce-9f4b-f8afd799e5b2'; -- NOZINAN DRE POUR SOLUTION
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : RISORDAN (isosorbide dinitrate) avec une forme auriculaire en MUI et la DCI rifamycine' where id = '4091c595-f696-41fc-b1be-c296707c62b1'; -- RISORDAN AURICULAIRE à 2 MUI 1 BOITE 60 COMPRIME
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : TERLOMEXIN (fenticonazole) avec la DCI immunoglobuline, forme tronquée' where id = 'aa362657-30da-407b-a4cd-2e83d87f6c55'; -- TERLOMEXIN MG
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : VISKEN QUINZE (pindolol 15 mg) avec la DCI salbutamol, sans forme ni dosage pour trancher' where id = '16aa6534-4119-451b-8bad-84d3cc4fa8e7'; -- VISKEN QUINZE
update medicaments set masque = true, motif_masquage = 'MOTEUR-3 — marque et DCI contradictoires, non tranché : nom d’un soluté de dialyse (ACETATE EM 142) avec un comprimé 4 / 1,25 mg et la DCI indapamide' where id = '653e7cd7-5bf3-4b50-85ff-319329e3da2a'; -- ACETATE EM 142 COMPRIME à 4 / 1.25 MG / MG 1 BOITE 28 COMPRIME

-- 6. Contrôle « base = source » : toute différence annule la migration.
do $$
declare v text;
begin
  select md5(string_agg(m.id::text || '|' || coalesce(m.dci, '') || '|' || m.masque::text || '|' ||
           case when m.masque then '' else coalesce((select string_agg(mi.ingredient_id::text, ',' order by mi.ingredient_id::text collate "C")
                     from medicament_ingredients mi where mi.medicament_id = m.id), '') end,
           E'\n' order by m.id::text collate "C")) into v
  from medicaments m where m.id in ('90118027-d595-48e0-8682-f4a5f23c2b21', 'ec208df8-d948-4f55-8941-814bdbe4f6fc', 'a0e056c8-6193-4b9e-9063-354b61e65a42', '029360f4-8680-44bb-9d9f-dff7f7c7162e', '82b091bb-cf3c-471d-a9c1-c97719a3df26', '8701b45e-74ec-4c08-9b0e-2c3f945693d1', '82c5dcf8-f968-428b-8316-74491c444524', '65fad93e-2aa3-41c3-8e1a-d9e4e05d1639', '617eec75-33e6-43ff-9caa-3b8c9fbd4537', '6ddb8afa-6484-4a32-a027-f62e9e25ae34', '7a36b36c-b249-4c99-aa8b-b9d6cd7606f4', '730e2d1d-8e7a-47c6-887f-30e28106460e', '05f2657b-e23d-4426-9ef1-53653cc0a7ee', '448e9d76-b9a5-4973-b368-c0c57b39ea46', '1fe76b27-c32b-4b52-95b5-005662d0b0b6', '4284db0c-398e-4a37-89ee-da20cbef2a7a', '1f7564f4-a4e4-4619-8e53-ed30178b74f2', 'edec608a-eafe-4437-9c80-6128aa78dd1c', 'd309f254-9368-4e06-9ef4-b7047a492ba1', 'f2f1ff79-b5af-44f0-ba29-0fc57b2740f9', '09c6cce4-b76e-46b0-bfb0-3c694b735cb0', '0eb549bc-c0b1-4b15-9a85-d4cee096c863', '0865be31-27d4-49a1-9292-fe28722a7a22', 'cbfba396-85fe-4f83-a6ed-773196213a0c', '7c123280-bf37-4d3d-bfce-fffddd5ec7cf', 'aa2617a8-aff3-4fb4-aef3-28e1549e50f6', '97f45ae7-b3d2-442a-9b05-e1420f96480b', 'dee2a851-03fe-45b9-9c31-8c962106900b', '329fd014-77f8-4a0e-a913-083eb36fb721', 'c50f6b87-05ca-46f8-8a34-efc0af4f32a2', '74810e82-dc7b-433f-848c-db0d79e58446', 'e828768a-dcbf-405b-9c56-09f3b070866b', '3e389031-0f6c-4965-8ca2-9abed79a923a', '1ef0da7a-c990-47a0-861a-3e81add3f854', 'fa38edaf-a35c-43f1-9494-6984c8ab6230', 'e436db48-8ee5-4015-a77e-38ae62d2fd39', 'f3a750f0-f2f7-45a4-b98b-20f5062df5bd', '0e17cd61-1b1d-43ce-9f4b-f8afd799e5b2', '4091c595-f696-41fc-b1be-c296707c62b1', 'aa362657-30da-407b-a4cd-2e83d87f6c55', '16aa6534-4119-451b-8bad-84d3cc4fa8e7', '653e7cd7-5bf3-4b50-85ff-319329e3da2a');
  if v is distinct from '2fd8ac7995fbe975c99413f6b4ebe29c' then
    raise exception 'MOTEUR-3 E1 : empreinte base % <> source 2fd8ac7995fbe975c99413f6b4ebe29c', v;
  end if;
end $$;
