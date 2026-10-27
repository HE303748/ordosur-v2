-- Sprint BDPM-1, lot G3 — relative → absolue et neutralisation des contradictions.
-- GÉNÉRÉ par scripts/gen_bdpm1_g3.mjs — ne pas modifier à la main.
-- Empreinte de la source (G3 complet) : 268ff7a6a917fa51000b143588924f7a
-- 20 relèvements, 16 neutralisations, 82 recréations molécule par molécule.

-- Garde : chaque ligne touchée est dans l'état lu au diagnostic.
do $$
declare v_ecarts text;
begin
  select string_agg(v.id, ' ; ') into v_ecarts
  from (values
  ('02dee7d2-9fa6-4cfa-902e-33f949181bf0','clozapine','Insuffisance hépatique','relative',null),
  ('09e5b597-98e1-4a58-80f4-c91f947411aa','isotretinoine','Hyperlipidémie','relative',null),
  ('176e6a89-908d-47e6-88b5-843085f3e675','metoclopramide','Épilepsie','relative',null),
  ('1a62960b-2ba2-4e54-8cb6-5defd4ca587c','testosterone|androgenes','Hypertrophie bénigne de la prostate','relative','M'),
  ('1f48aedd-4a58-44d2-a2cc-17076bf46c21','baclofene','Épilepsie','relative',null),
  ('2ced4485-681d-4e25-8611-ea5a3f5aec6c','bétaméthasone','Psychose aiguë ou antécédent de psychose cortisonique','relative',null),
  ('330f3bc0-6d20-4651-8d43-361cdaf13091','hydroxyzine','Bradycardie sinusale','relative',null),
  ('359e5368-1ad7-4639-bd3b-337d346d156e','testosterone|androgenes','Insuffisance cardiaque','relative',null),
  ('57ee3c7f-f8fe-45fd-a9b6-758929fe6319','hydroxyzine','Bradycardie sinusale','relative',null),
  ('58e4e175-cf75-4f29-8723-bf363b2fcdcc','fondaparinux','Endocardite bactérienne','relative',null),
  ('59c08688-1111-46e6-ade4-02f1dee576f4','tramadol','Épilepsie','relative',null),
  ('672fd0b6-b563-42a4-896b-2ce0329d7227','méthotrexate','Tuberculose latente non traitée','relative',null),
  ('693bbba5-d974-44d6-919c-1d4edfb03a42','levothyroxine','Coronaropathie','relative',null),
  ('6cda6e16-c5e9-4dbb-bbf9-2dd22c7f8c04','léflunomide','Insuffisance rénale sévère (DFG < 30 mL/min)','relative',null),
  ('78a0758b-172d-4b3a-bea8-b5bd85247081','furosémide|bumétanide|torsémi|acide éthacrynique|pirétanide','Insuffisance rénale aiguë oligurique (sans hypervolémie)','relative',null),
  ('7aa1e0ff-0910-423c-b08e-8767d469de54','lithium','Insuffisance cardiaque','relative',null),
  ('a432752c-4bbc-4385-809e-3971b8dde0c2','carboplatine','Insuffisance rénale sévère (DFG < 30 mL/min)','relative',null),
  ('b52df1ca-eac1-4297-b6ca-562955e91d09','cisplatine','Neuropathie périphérique sévère préexistante','relative',null),
  ('ef7ce8ed-5696-4e63-93bd-141f20b60678','héparine','Endocardite bactérienne','relative',null),
  ('efd5daa2-7d97-472c-b92a-5320004fe9b5','baclofene','Épilepsie','relative',null),
  ('7164f751-225e-4e14-afff-c424f9f405b1','warfarine|acenocoumarol|fluindione','Allaitement','relative','F'),
  ('60b0474e-4fec-4385-9a98-61fcd0ee9f92','adalimumab','Allaitement','absolue','F'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','amoxicilline|ampicilline|amoxicilline-clavulanate|pipéracilline|oxacilline|cloxacilline|ticarcilline|benzylpénicilline|phénoxyméthylpénicilline','Grossesse (1er trimestre)','relative','F'),
  ('43e3ae38-c887-4869-9458-4206df3ff53e','céfazoline|céfuroxime|céfotaxime|ceftriaxone|céfépime|ceftazidime|cefpodoxime|céfalexine|cefadroxil|cefoxitine|cefprozil','Grossesse (1er trimestre)','relative','F'),
  ('1acd7371-4f7d-468a-99f9-e82d25e4a0f4','éthinylestradiol|lévonorgestrel|désogestrel|gestodène|norgestimate|drospirénone|ulipristal','Allaitement (6 premières semaines)','absolue','F'),
  ('223c960e-b81d-45ff-affc-5ecf34574dfe','phénytoïne|carbamazépine|valproate|lamotrigine|lévétiracétam|topiramate|gabapentine|prégabaline|oxcarbazépine|phénobarbital|zonisamide','Grossesse (1er trimestre)','absolue','F'),
  ('4b7ec1b6-7c95-4c47-a415-67f7cbbaefc8','gabapentine|pregabaline','Grossesse','relative','F'),
  ('e1b3f317-e7d8-4af0-be97-74c6044a1399','gentamicine','Allaitement','relative','F'),
  ('623df906-70a9-4620-a63f-b0d6568f8476','infliximab','Allaitement','absolue','F'),
  ('cf25c50e-1373-4a64-9b6b-2e75b8647fdf','interféron bêta','Allaitement','absolue','F'),
  ('7a914666-ffdb-488c-99e9-f61b2bb16f66','levetiracetam','Grossesse','relative','F'),
  ('c80b8c07-ea89-4a64-91a0-fabe0cea0532','metformine','Grossesse (toute période)','relative','F'),
  ('987c222d-ae5e-4ad4-a43b-6242e9934a7f','metronidazole','Grossesse','relative','F'),
  ('a690c1eb-8e9b-4baf-aa04-3bbde6f993c7','métronidazole|tinidazole|ornidazole|secnidazole','Grossesse (1er trimestre)','absolue','F'),
  ('97a7c7fb-8655-4d37-abe1-d567554d0c3e','ciclosporine|tacrolimus','Grossesse','relative','F'),
  ('a4409119-ebb5-4a50-b139-7a3106533a23','tacrolimus','Grossesse','absolue','F')
  ) as v(id, motif, cv, sev, sexe)
  left join public.contraindications c on c.id = v.id::uuid
  where c.id is null or c.dci_pattern is distinct from v.motif or c.condition_valeur is distinct from v.cv
     or c.severite is distinct from v.sev or c.sexe_applicable::text is distinct from v.sexe or c.exclue_motif is not null;
  if v_ecarts is not null then raise exception 'BDPM-1 G3 : état de départ inattendu : %', v_ecarts; end if;
end $$;

-- 1. Relative → absolue (lignes propres à la molécule ; les lignes de classe ne sont pas modifiées)
update public.contraindications c set severite = 'absolue',
  sources = coalesce(c.sources, '{}') || array['BDPM-1 G3 — relative → absolue d''après le RCP CIS ' || v.cis || ' (à relire par un pharmacien)']
from (values
  ('02dee7d2-9fa6-4cfa-902e-33f949181bf0','62552920'),('09e5b597-98e1-4a58-80f4-c91f947411aa','61654491'),('176e6a89-908d-47e6-88b5-843085f3e675','63845762'),
  ('1a62960b-2ba2-4e54-8cb6-5defd4ca587c','68178899'),('1f48aedd-4a58-44d2-a2cc-17076bf46c21','62472716'),('2ced4485-681d-4e25-8611-ea5a3f5aec6c','66171354'),
  ('330f3bc0-6d20-4651-8d43-361cdaf13091','61519586'),('359e5368-1ad7-4639-bd3b-337d346d156e','68178899'),('57ee3c7f-f8fe-45fd-a9b6-758929fe6319','61519586'),
  ('58e4e175-cf75-4f29-8723-bf363b2fcdcc','64683217'),('59c08688-1111-46e6-ade4-02f1dee576f4','63435884'),('672fd0b6-b563-42a4-896b-2ce0329d7227','66253794'),
  ('693bbba5-d974-44d6-919c-1d4edfb03a42','65143010'),('6cda6e16-c5e9-4dbb-bbf9-2dd22c7f8c04','62780055'),('78a0758b-172d-4b3a-bea8-b5bd85247081','65606743'),
  ('7aa1e0ff-0910-423c-b08e-8767d469de54','62124478'),('a432752c-4bbc-4385-809e-3971b8dde0c2','66150794'),('b52df1ca-eac1-4297-b6ca-562955e91d09','68377552'),
  ('ef7ce8ed-5696-4e63-93bd-141f20b60678','60852495'),('efd5daa2-7d97-472c-b92a-5320004fe9b5','62472716')
) as v(id, cis)
where c.id = v.id::uuid and c.severite = 'relative';

-- 2. Recréation molécule par molécule des lignes de classe neutralisées (fiches que le RCP ne contredit pas)
insert into public.contraindications (dci_pattern, condition_type, condition_valeur, severite, description, mecanisme_fr, conduite_fr,
  sources, atc_code, age_min_mois, age_max_mois, sexe_applicable, bdpm_ref)
select v.motif, c.condition_type, c.condition_valeur, c.severite, c.description, c.mecanisme_fr, c.conduite_fr,
  coalesce(c.sources, '{}') || array['BDPM-1 G3 — recréée pour cette molécule depuis la ligne ' || c.id || ' (neutralisée)'],
  c.atc_code, c.age_min_mois, c.age_max_mois, c.sexe_applicable, v.ref
from public.contraindications c
join (values
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','amoxicilline acide','G3:copie:a3890e11:720fa586'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','amoxicilline acide 1 boite 1 flacon','G3:copie:a3890e11:8d09e07b'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','amoxicilline acide clavulanique','G3:copie:a3890e11:cb6b3949'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','amoxicilline acide clavulanique cineol','G3:copie:a3890e11:c5fa68ef'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','amoxicilline acide|amoxicilline acide clavulanique|amoxicilline anhydre acide clavulanique|amoxicilline trihydratee|amoxicilline trihydratee acide clavulanique|amoxicilline trihydratee clavalanate potassium','G3:copie:a3890e11:286b8a86'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','amoxicilline metronidazole','G3:copie:a3890e11:0a67b72e'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','ampicilline','G3:copie:a3890e11:5ad7ba0a'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','ampicilline llorente ampi gelule a 500 mg|ampicilline llorente ampi gelule a 500 mg 1 boite 24 gelule','G3:copie:a3890e11:007ccad5'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','ampicilline llorente ampi poudre pour suspension','G3:copie:a3890e11:07e8895c'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','clavulanique mylan injectable a 1 100 g mg','G3:copie:a3890e11:30c79d98'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','clavulanique mylan injectable a 1 200 g mg 1 boite 10 flacon','G3:copie:a3890e11:f6bd83bb'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','clavulanique mylan poudre pour solution','G3:copie:a3890e11:62188302'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','clavulanique mylan poudre pour solution 1 boite 1 flacon','G3:copie:a3890e11:4957b8df'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','cloxacilline','G3:copie:a3890e11:36411d88'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','co amoxiclav 1 g 125 mg sachet','G3:copie:a3890e11:3bbe564e'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','co amoxiclav 100 mg 12 5 mg poudre pour suspension buvable','G3:copie:a3890e11:3c0f1eaf'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','co amoxiclav 500 mg 62 5 mg sachet','G3:copie:a3890e11:f145109d'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','ecoclav nourisson 100 mg 12 5 mg poudre pour suspension buvable','G3:copie:a3890e11:6eccc5d4'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','flucloxacilline','G3:copie:a3890e11:2592245e'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','llorente poudre pour solution 1 boite 1 flacon','G3:copie:a3890e11:5f5a3d94'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','maxipene poudre pour preparation 1 boite 1 flacon','G3:copie:a3890e11:1def0995'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','nourrisson poudre pour suspension 1 flacon 60 ml','G3:copie:a3890e11:1757bf6c'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','oxacilline','G3:copie:a3890e11:8bd57956'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','piperacilline tazobactam','G3:copie:a3890e11:789aab78'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','saphir enfant 100 mg 12 5 mg sirop','G3:copie:a3890e11:2586889d'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','saphir nourisson 100 mg 12 5 mg sirop','G3:copie:a3890e11:4cc859ec'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','sulbactam ampicilline','G3:copie:a3890e11:7d265539'),
  ('43e3ae38-c887-4869-9458-4206df3ff53e','cefadroxil','G3:copie:43e3ae38:d5ce7430'),
  ('43e3ae38-c887-4869-9458-4206df3ff53e','cefazoline','G3:copie:43e3ae38:f5202d9d'),
  ('43e3ae38-c887-4869-9458-4206df3ff53e','cefepime','G3:copie:43e3ae38:ec54d154'),
  ('43e3ae38-c887-4869-9458-4206df3ff53e','cefotaxime','G3:copie:43e3ae38:c6fbb2a2'),
  ('43e3ae38-c887-4869-9458-4206df3ff53e','cefotaxime sodique','G3:copie:43e3ae38:7d67ba38'),
  ('43e3ae38-c887-4869-9458-4206df3ff53e','cefotaxime|cefotaxime sodique','G3:copie:43e3ae38:c9d4e1cf'),
  ('43e3ae38-c887-4869-9458-4206df3ff53e','ceftazidime','G3:copie:43e3ae38:daa45e73'),
  ('43e3ae38-c887-4869-9458-4206df3ff53e','ceftazidime pentahydratee','G3:copie:43e3ae38:3b6419d6'),
  ('43e3ae38-c887-4869-9458-4206df3ff53e','ceftazidime|ceftazidime avibactam','G3:copie:43e3ae38:d818c213'),
  ('43e3ae38-c887-4869-9458-4206df3ff53e','ceftriaxone','G3:copie:43e3ae38:6ec7d05a'),
  ('43e3ae38-c887-4869-9458-4206df3ff53e','ceftriaxone mylan ceftria poudre pour solution|ceftriaxone mylan ceftria poudre pour solution 1 boite 1 flacon|ceftriaxone mylan ceftria poudre pour solution 1 boite 30 compr','G3:copie:43e3ae38:4f04027d'),
  ('43e3ae38-c887-4869-9458-4206df3ff53e','ceftriaxone|ceftriaxone sodique','G3:copie:43e3ae38:af2904ed'),
  ('43e3ae38-c887-4869-9458-4206df3ff53e','cefuroxime','G3:copie:43e3ae38:ab67c2d6'),
  ('43e3ae38-c887-4869-9458-4206df3ff53e','cefuroxime|cefuroxime axetil|cefuroxime sodique','G3:copie:43e3ae38:ba511080'),
  ('1acd7371-4f7d-468a-99f9-e82d25e4a0f4','acetate d ulipristal|ulipristal','G3:copie:1acd7371:7431ed2f'),
  ('1acd7371-4f7d-468a-99f9-e82d25e4a0f4','chlormadinone acetate ethinylestradiol|chlormadinone ethinylestradiol','G3:copie:1acd7371:48d9ec04'),
  ('1acd7371-4f7d-468a-99f9-e82d25e4a0f4','cyproterone acetate ethinylestradiol','G3:copie:1acd7371:f8b0286d'),
  ('1acd7371-4f7d-468a-99f9-e82d25e4a0f4','desogestrel ethinylestradiol','G3:copie:1acd7371:44660f5f'),
  ('1acd7371-4f7d-468a-99f9-e82d25e4a0f4','drospirenone ethinylestradiol','G3:copie:1acd7371:7a288ab1'),
  ('1acd7371-4f7d-468a-99f9-e82d25e4a0f4','ethinylestradiol','G3:copie:1acd7371:bcbb6b98'),
  ('1acd7371-4f7d-468a-99f9-e82d25e4a0f4','levonorgestrel','G3:copie:1acd7371:1bdf7088'),
  ('1acd7371-4f7d-468a-99f9-e82d25e4a0f4','levonorgestrel ethinylestradiol','G3:copie:1acd7371:44f966e5'),
  ('223c960e-b81d-45ff-affc-5ecf34574dfe','carbamazepine','G3:copie:223c960e:ae00b699'),
  ('223c960e-b81d-45ff-affc-5ecf34574dfe','lamotrigine','G3:copie:223c960e:212e2997'),
  ('223c960e-b81d-45ff-affc-5ecf34574dfe','oxcarbazepine','G3:copie:223c960e:ece3fb77'),
  ('223c960e-b81d-45ff-affc-5ecf34574dfe','phenobarbital','G3:copie:223c960e:18e338a1'),
  ('223c960e-b81d-45ff-affc-5ecf34574dfe','pregabaline','G3:copie:223c960e:3d4a7f2c'),
  ('223c960e-b81d-45ff-affc-5ecf34574dfe','sodium valproate de|valproate de sodium','G3:copie:223c960e:4c204d9c'),
  ('223c960e-b81d-45ff-affc-5ecf34574dfe','topiramate','G3:copie:223c960e:2d0b52fc'),
  ('223c960e-b81d-45ff-affc-5ecf34574dfe','valproate de sodium','G3:copie:223c960e:c37da73e'),
  ('223c960e-b81d-45ff-affc-5ecf34574dfe','valproate de sodium acide valproique','G3:copie:223c960e:29a176ca'),
  ('223c960e-b81d-45ff-affc-5ecf34574dfe','valproate de sodium gran','G3:copie:223c960e:cc2a54c5'),
  ('223c960e-b81d-45ff-affc-5ecf34574dfe','valproate de sodium siro','G3:copie:223c960e:2e356466'),
  ('223c960e-b81d-45ff-affc-5ecf34574dfe','valproate de sodium solu','G3:copie:223c960e:4a8d40dc'),
  ('4b7ec1b6-7c95-4c47-a415-67f7cbbaefc8','pregabaline','G3:copie:4b7ec1b6:3d4a7f2c'),
  ('e1b3f317-e7d8-4af0-be97-74c6044a1399','dexa gentamicine comprime pellicule secable 1 boite 30 comprime','G3:copie:e1b3f317:24eea497'),
  ('e1b3f317-e7d8-4af0-be97-74c6044a1399','dexamethasone gentamicine','G3:copie:e1b3f317:61b476a4'),
  ('c80b8c07-ea89-4a64-91a0-fabe0cea0532','alogliptine metformine','G3:copie:c80b8c07:46a20ccd'),
  ('c80b8c07-ea89-4a64-91a0-fabe0cea0532','glimepiride metformine','G3:copie:c80b8c07:9457784f'),
  ('c80b8c07-ea89-4a64-91a0-fabe0cea0532','metformine glibenclamide','G3:copie:c80b8c07:04e22216'),
  ('c80b8c07-ea89-4a64-91a0-fabe0cea0532','metformine linagliptine','G3:copie:c80b8c07:91076a5b'),
  ('c80b8c07-ea89-4a64-91a0-fabe0cea0532','sitagliptine metformine','G3:copie:c80b8c07:fa5aa12c'),
  ('c80b8c07-ea89-4a64-91a0-fabe0cea0532','sitagliptine metformine|sitagliptine metformine chlorhydrate','G3:copie:c80b8c07:7ac6f3e6'),
  ('987c222d-ae5e-4ad4-a43b-6242e9934a7f','amoxicilline metronidazole','G3:copie:987c222d:0a67b72e'),
  ('987c222d-ae5e-4ad4-a43b-6242e9934a7f','metronidazole','G3:copie:987c222d:0cb11116'),
  ('987c222d-ae5e-4ad4-a43b-6242e9934a7f','metronidazole mylan metro solution pour perfusion a','G3:copie:987c222d:0297df43'),
  ('987c222d-ae5e-4ad4-a43b-6242e9934a7f','spiramycine metronidazole','G3:copie:987c222d:d3f46ae7'),
  ('a690c1eb-8e9b-4baf-aa04-3bbde6f993c7','amoxicilline metronidazole','G3:copie:a690c1eb:0a67b72e'),
  ('a690c1eb-8e9b-4baf-aa04-3bbde6f993c7','metronidazole','G3:copie:a690c1eb:0cb11116'),
  ('a690c1eb-8e9b-4baf-aa04-3bbde6f993c7','metronidazole mylan metro solution pour perfusion a','G3:copie:a690c1eb:0297df43'),
  ('a690c1eb-8e9b-4baf-aa04-3bbde6f993c7','ornidazole','G3:copie:a690c1eb:943a45d0'),
  ('a690c1eb-8e9b-4baf-aa04-3bbde6f993c7','secnidazole','G3:copie:a690c1eb:c6c7f007'),
  ('a690c1eb-8e9b-4baf-aa04-3bbde6f993c7','spiramycine metronidazole','G3:copie:a690c1eb:d3f46ae7'),
  ('a690c1eb-8e9b-4baf-aa04-3bbde6f993c7','tinidazole','G3:copie:a690c1eb:db0dabd1'),
  ('97a7c7fb-8655-4d37-abe1-d567554d0c3e','ciclosporine','G3:copie:97a7c7fb:6dfc289e')
) as v(source, motif, ref) on c.id = v.source::uuid;

-- 3. Neutralisation réversible (exclue_motif) des lignes contredites par le RCP
update public.contraindications c set exclue_motif = v.motif
from (values
  ('7164f751-225e-4e14-afff-c424f9f405b1','Contredit par le RCP — BDPM-1 (« utilisation possible » : acenocoumarol ; allaitement)'),
  ('60b0474e-4fec-4385-9a98-61fcd0ee9f92','Contredit par le RCP — BDPM-1 (« utilisation possible » : adalimumab ; allaitement)'),
  ('a3890e11-0ffb-4ba5-bad1-6e13613362ea','Contredit par le RCP — BDPM-1 (« utilisation possible » : amoxicilline, benzylpenicilline, piperacilline ; grossesse)'),
  ('43e3ae38-c887-4869-9458-4206df3ff53e','Contredit par le RCP — BDPM-1 (« utilisation possible » : cefalexine, cefpodoxime ; grossesse)'),
  ('1acd7371-4f7d-468a-99f9-e82d25e4a0f4','Contredit par le RCP — BDPM-1 (« utilisation possible » : desogestrel, drospirenone ; allaitement)'),
  ('223c960e-b81d-45ff-affc-5ecf34574dfe','Contredit par le RCP — BDPM-1 (« utilisation possible » : gabapentine, levetiracetam ; grossesse)'),
  ('4b7ec1b6-7c95-4c47-a415-67f7cbbaefc8','Contredit par le RCP — BDPM-1 (« utilisation possible » : gabapentine ; grossesse)'),
  ('e1b3f317-e7d8-4af0-be97-74c6044a1399','Contredit par le RCP — BDPM-1 (« utilisation possible » : gentamicine ; allaitement)'),
  ('623df906-70a9-4620-a63f-b0d6568f8476','Contredit par le RCP — BDPM-1 (« utilisation possible » : infliximab ; allaitement)'),
  ('cf25c50e-1373-4a64-9b6b-2e75b8647fdf','Contredit par le RCP — BDPM-1 (« utilisation possible » : interferon beta 1a, interferon beta 1b, peginterferon beta 1a ; allaitement)'),
  ('7a914666-ffdb-488c-99e9-f61b2bb16f66','Contredit par le RCP — BDPM-1 (« utilisation possible » : levetiracetam ; grossesse)'),
  ('c80b8c07-ea89-4a64-91a0-fabe0cea0532','Contredit par le RCP — BDPM-1 (« utilisation possible » : metformine ; grossesse)'),
  ('987c222d-ae5e-4ad4-a43b-6242e9934a7f','Contredit par le RCP — BDPM-1 (« utilisation possible » : metronidazole + spiramycine ; grossesse)'),
  ('a690c1eb-8e9b-4baf-aa04-3bbde6f993c7','Contredit par le RCP — BDPM-1 (« utilisation possible » : metronidazole + spiramycine ; grossesse)'),
  ('97a7c7fb-8655-4d37-abe1-d567554d0c3e','Contredit par le RCP — BDPM-1 (« utilisation possible » : tacrolimus ; grossesse)'),
  ('a4409119-ebb5-4a50-b139-7a3106533a23','Contredit par le RCP — BDPM-1 (« utilisation possible » : tacrolimus ; grossesse)')
) as v(id, motif)
where c.id = v.id::uuid;

-- Contrôle « base = source » (doit renvoyer l'empreinte ci-dessus) :
--   select md5(string_agg(x, E'\n' order by x collate "C")) from (
--     select bdpm_ref || '|' || dci_pattern || '|' || condition_type || '|' || condition_valeur || '|' || severite || '|' || coalesce(sexe_applicable::text, '') x
--       from contraindications where bdpm_ref like 'G3:ci:%' or bdpm_ref like 'G3:gr:%'
--     union all select 'releve|' || id || '|' || severite from contraindications where id in ('02dee7d2-9fa6-4cfa-902e-33f949181bf0', '09e5b597-98e1-4a58-80f4-c91f947411aa', '176e6a89-908d-47e6-88b5-843085f3e675', '1a62960b-2ba2-4e54-8cb6-5defd4ca587c', '1f48aedd-4a58-44d2-a2cc-17076bf46c21', '2ced4485-681d-4e25-8611-ea5a3f5aec6c', '330f3bc0-6d20-4651-8d43-361cdaf13091', '359e5368-1ad7-4639-bd3b-337d346d156e', '57ee3c7f-f8fe-45fd-a9b6-758929fe6319', '58e4e175-cf75-4f29-8723-bf363b2fcdcc', '59c08688-1111-46e6-ade4-02f1dee576f4', '672fd0b6-b563-42a4-896b-2ce0329d7227', '693bbba5-d974-44d6-919c-1d4edfb03a42', '6cda6e16-c5e9-4dbb-bbf9-2dd22c7f8c04', '78a0758b-172d-4b3a-bea8-b5bd85247081', '7aa1e0ff-0910-423c-b08e-8767d469de54', 'a432752c-4bbc-4385-809e-3971b8dde0c2', 'b52df1ca-eac1-4297-b6ca-562955e91d09', 'ef7ce8ed-5696-4e63-93bd-141f20b60678', 'efd5daa2-7d97-472c-b92a-5320004fe9b5')
--     union all select 'neutralise|' || id from contraindications where exclue_motif like 'Contredit par le RCP — BDPM-1%'
--     union all select bdpm_ref || '|' || dci_pattern from contraindications where bdpm_ref like 'G3:copie:%') t;
