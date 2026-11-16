-- Sprint MOTEUR-3, étape 2 — voie d'administration et portée (locale / systémique) des fiches MA.
-- GÉNÉRÉ par bdpm/moteur3/scripts/gen_e2_voies.py — ne pas modifier à la main.
-- Source : project/scripts/data/moteur3_voies.tsv (7642 fiches), chargée dans bdpm2d_staging lot 40.
-- Empreinte de la source (staging) : 169afb4fe98722c96ce632dd44f1ade2 · empreinte de l'état final : 6770c952fb14c0318919d43b69d4859a
--
-- voie_administration : orale 4922, injectable 1402, (sans voie) 475, cutanee 220, ophtalmique 190, rectale 140, inhalee 122, vaginale 42, autre:dialyse ou irrigation 34, nasale 33, buccale 22, transdermique 14, auriculaire 13, sublinguale 10, autre:intra-uterine 1, autre:intravesicale 1, autre:endotracheobronchique 1.
-- voie_portee : locale 562 (dont RCP de la voie lu : 376), systémique 7080.
-- Une fiche n'est « locale » que si sa forme le dit sans ambiguïté, que sa molécule n'agit pas à distance par cette voie
-- et que la BDPM connaît cette molécule par cette voie. Dispositifs transdermiques, formes rectales et sublinguales :
-- systémiques. Forme illisible : voie NULL, portée systémique (aucune règle retirée).

alter table public.medicaments
  add column if not exists voie_portee text,
  add column if not exists voie_rcp_lu boolean not null default false;
alter table public.medicaments drop constraint if exists medicaments_voie_portee_check;
alter table public.medicaments add constraint medicaments_voie_portee_check check (voie_portee is null or voie_portee in ('locale', 'systemique'));
comment on column public.medicaments.voie_portee is 'MOTEUR-3 — locale : la fiche ne reçoit que les règles de sa voie (si voie_rcp_lu) ; systemique ou NULL : toutes les règles.';
comment on column public.medicaments.voie_rcp_lu is 'MOTEUR-3 — le RCP de cette voie a été lu pour cette molécule : condition du filtre de voie.';

do $$
declare n int; e text; v text;
begin
  -- 1. Garde : source complète en staging, état de départ = diagnostic (aucune voie MA renseignée).
  select count(*), md5(string_agg(t, chr(10) order by seq)) into n, e from bdpm2d_staging where lot = 40;
  if n <> 7642 or e is distinct from '169afb4fe98722c96ce632dd44f1ade2' then
    raise exception 'MOTEUR-3 E2 : staging lot 40 = % lignes, empreinte % (attendu 7642, 169afb4fe98722c96ce632dd44f1ade2)', n, e;
  end if;
  if (select count(*) from medicaments where pays = 'MA') <> 7642
     or exists (select 1 from medicaments where pays = 'MA' and (voie_administration is not null or voie_portee is not null)) then
    raise exception 'MOTEUR-3 E2 : état de départ inattendu (nombre de fiches MA ou voie déjà renseignée)';
  end if;
  -- 2. Écriture
  update medicaments m
     set voie_administration = nullif(split_part(s.t, chr(9), 2), ''),
         voie_portee = split_part(s.t, chr(9), 3),
         voie_rcp_lu = split_part(s.t, chr(9), 4) = 'true'
    from bdpm2d_staging s
   where s.lot = 40 and m.id = split_part(s.t, chr(9), 1)::uuid and m.pays = 'MA';
  get diagnostics n = row_count;
  if n <> 7642 then raise exception 'MOTEUR-3 E2 : % fiches mises à jour (attendu 7642)', n; end if;
  -- 3. Contrôle « base = source »
  select md5(string_agg(m.id::text || '|' || coalesce(m.voie_administration, '') || '|' || m.voie_portee || '|' || m.voie_rcp_lu::text,
                        chr(10) order by m.id::text collate "C")) into v
    from medicaments m where m.pays = 'MA';
  if v is distinct from '6770c952fb14c0318919d43b69d4859a' then raise exception 'MOTEUR-3 E2 : empreinte base % <> source 6770c952fb14c0318919d43b69d4859a', v; end if;
end $$;
