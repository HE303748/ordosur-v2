-- Sprint 2d — Corticoïdes par voie générale et antécédents digestifs (canal « antécédents »).
-- Généré par scripts/gen_regles_antecedents.mjs (source unique, partagée avec les tests).
-- Jamais de contre-indication absolue pour cette classe : « à évaluer » au plus.
-- Empreinte de la source : règles 7a820f4bf68d42037a9643b70cadc851 · classes d04bb535ae86b9fd2ef8d657200daadf

alter table public.regles_antecedents_classes drop constraint if exists regles_antecedents_classes_classe_check;
alter table public.regles_antecedents_classes add constraint regles_antecedents_classes_classe_check check (classe in ('ains','aspirine','antiagregant','anticoagulant','corticoide'));
alter table public.regles_antecedents drop constraint if exists regles_antecedents_classe_check;
alter table public.regles_antecedents add constraint regles_antecedents_classe_check check (classe in ('ains','aspirine','antiagregant','anticoagulant','corticoide'));

-- Voie d'administration exigée (NULL = toutes voies). « generale » : les formes locales (crème, pommade,
-- collyre, gouttes auriculaires…) n'entrent pas dans la classe (src/lib/antecedentEngine.ts, isLocalForm).
alter table public.regles_antecedents_classes add column if not exists voie text null;
alter table public.regles_antecedents_classes drop constraint if exists regles_antecedents_classes_voie_check;
alter table public.regles_antecedents_classes add constraint regles_antecedents_classes_voie_check check (voie in ('generale'));

insert into public.regles_antecedents_classes (classe, dci_motif, voie) values
  ('ains', 'ibuprofene', null),
  ('ains', 'ketoprofene', null),
  ('ains', 'dexketoprofene', null),
  ('ains', 'diclofenac', null),
  ('ains', 'aceclofenac', null),
  ('ains', 'naproxene', null),
  ('ains', 'piroxicam', null),
  ('ains', 'meloxicam', null),
  ('ains', 'tenoxicam', null),
  ('ains', 'lornoxicam', null),
  ('ains', 'indometacine', null),
  ('ains', 'celecoxib', null),
  ('ains', 'etoricoxib', null),
  ('ains', 'flurbiprofene', null),
  ('ains', 'acide niflumique', null),
  ('ains', 'nimesulide', null),
  ('ains', 'etodolac', null),
  ('ains', 'sulindac', null),
  ('ains', 'acide mefenamique', null),
  ('ains', 'ketorolac', null),
  ('ains', 'acide tiaprofenique', null),
  ('ains', 'morniflumate', null),
  ('ains', 'fenoprofene', null),
  ('ains', 'parecoxib', null),
  ('ains', 'tiaprofeni', null),
  ('ains', 'niflumi', null),
  ('ains', 'mefenami', null),
  ('ains', 'phenylbutazone', null),
  ('aspirine', 'aspirine', null),
  ('aspirine', 'acetylsalicyl', null),
  ('aspirine', 'acetilsalicyl', null),
  ('antiagregant', 'clopidogrel', null),
  ('antiagregant', 'prasugrel', null),
  ('antiagregant', 'ticagrelor', null),
  ('antiagregant', 'tirofiban', null),
  ('antiagregant', 'dipyridamole', null),
  ('anticoagulant', 'acenocoumarol', null),
  ('anticoagulant', 'warfarine', null),
  ('anticoagulant', 'fluindione', null),
  ('anticoagulant', 'rivaroxaban', null),
  ('anticoagulant', 'apixaban', null),
  ('anticoagulant', 'dabigatran', null),
  ('anticoagulant', 'edoxaban', null),
  ('anticoagulant', 'enoxaparine', null),
  ('anticoagulant', 'tinzaparine', null),
  ('anticoagulant', 'nadroparine', null),
  ('anticoagulant', 'heparine', null),
  ('anticoagulant', 'bemiparine', null),
  ('anticoagulant', 'fondaparinux', null),
  ('corticoide', 'prednisolone', 'generale'),
  ('corticoide', 'prednisone', 'generale'),
  ('corticoide', 'methylprednisolone', 'generale'),
  ('corticoide', 'dexamethasone', 'generale'),
  ('corticoide', 'betamethasone', 'generale'),
  ('corticoide', 'hydrocortisone', 'generale')
on conflict (classe, dci_motif) do update set voie = excluded.voie;

insert into public.regles_antecedents (code, ordre, classe, antecedent_type, criteres, severite, titre, conduite, source) values
  ('R1', 10, 'ains', 'hemorragie_digestive', '{"any_of":[{"en_cours":["oui"]}]}'::jsonb, 'absolue', 'Saignement digestif actif / ulcère évolutif', 'Lésion susceptible de saigner — ne pas prescrire.', 'Proposition Ordosur d''après RCP — à valider'),
  ('R1', 20, 'ains', 'ulcere_gd', '{"any_of":[{"statut":["evolutif"]}]}'::jsonb, 'absolue', 'Saignement digestif actif / ulcère évolutif', 'Lésion susceptible de saigner — ne pas prescrire.', 'Proposition Ordosur d''après RCP — à valider'),
  ('R1', 30, 'aspirine', 'hemorragie_digestive', '{"any_of":[{"en_cours":["oui"]}]}'::jsonb, 'absolue', 'Saignement digestif actif / ulcère évolutif', 'Lésion susceptible de saigner — ne pas prescrire.', 'Proposition Ordosur d''après RCP — à valider'),
  ('R1', 40, 'aspirine', 'ulcere_gd', '{"any_of":[{"statut":["evolutif"]}]}'::jsonb, 'absolue', 'Saignement digestif actif / ulcère évolutif', 'Lésion susceptible de saigner — ne pas prescrire.', 'Proposition Ordosur d''après RCP — à valider'),
  ('R1', 50, 'antiagregant', 'hemorragie_digestive', '{"any_of":[{"en_cours":["oui"]}]}'::jsonb, 'absolue', 'Saignement digestif actif / ulcère évolutif', 'Lésion susceptible de saigner — ne pas prescrire.', 'Proposition Ordosur d''après RCP — à valider'),
  ('R1', 60, 'antiagregant', 'ulcere_gd', '{"any_of":[{"statut":["evolutif"]}]}'::jsonb, 'absolue', 'Saignement digestif actif / ulcère évolutif', 'Lésion susceptible de saigner — ne pas prescrire.', 'Proposition Ordosur d''après RCP — à valider'),
  ('R1', 70, 'anticoagulant', 'hemorragie_digestive', '{"any_of":[{"en_cours":["oui"]}]}'::jsonb, 'absolue', 'Saignement digestif actif / ulcère évolutif', 'Lésion susceptible de saigner — ne pas prescrire.', 'Proposition Ordosur d''après RCP — à valider'),
  ('R1', 80, 'anticoagulant', 'ulcere_gd', '{"any_of":[{"statut":["evolutif"]}]}'::jsonb, 'absolue', 'Saignement digestif actif / ulcère évolutif', 'Lésion susceptible de saigner — ne pas prescrire.', 'Proposition Ordosur d''après RCP — à valider'),
  ('R1b', 90, 'ains', 'ulcere_gd', '{"any_of":[{"statut":["inconnu"]}]}'::jsonb, 'a_evaluer', 'Ulcère gastroduodénal — statut à préciser', 'CI absolue si l''ulcère est évolutif. Sinon : se référer à la conduite habituelle (dose minimale, IPP, surveillance). Préciser l''antécédent dans le profil.', 'Ajout Ordosur (zéro fausse réassurance : critère non renseigné) — à valider'),
  ('R1b', 100, 'aspirine', 'ulcere_gd', '{"any_of":[{"statut":["inconnu"]}]}'::jsonb, 'a_evaluer', 'Ulcère gastroduodénal — statut à préciser', 'CI absolue si l''ulcère est évolutif. Sinon : se référer à la conduite habituelle (dose minimale, IPP, surveillance). Préciser l''antécédent dans le profil.', 'Ajout Ordosur (zéro fausse réassurance : critère non renseigné) — à valider'),
  ('R1b', 110, 'antiagregant', 'ulcere_gd', '{"any_of":[{"statut":["inconnu"]}]}'::jsonb, 'a_evaluer', 'Ulcère gastroduodénal — statut à préciser', 'CI absolue si l''ulcère est évolutif. Sinon : se référer à la conduite habituelle (dose minimale, IPP, surveillance). Préciser l''antécédent dans le profil.', 'Ajout Ordosur (zéro fausse réassurance : critère non renseigné) — à valider'),
  ('R1b', 120, 'anticoagulant', 'ulcere_gd', '{"any_of":[{"statut":["inconnu"]}]}'::jsonb, 'a_evaluer', 'Ulcère gastroduodénal — statut à préciser', 'CI absolue si l''ulcère est évolutif. Sinon : se référer à la conduite habituelle (dose minimale, IPP, surveillance). Préciser l''antécédent dans le profil.', 'Ajout Ordosur (zéro fausse réassurance : critère non renseigné) — à valider'),
  ('R2', 130, 'ains', 'hemorragie_digestive', '{"any_of":[{"sous_ains":["oui"]},{"episodes":["2+"]}]}'::jsonb, 'absolue', 'Antécédent d’hémorragie / perforation digestive sous AINS ou récidivant', 'Risque majeur de récidive. Alternative antalgique : paracétamol (Doliprane).', 'Proposition Ordosur d''après RCP — à valider'),
  ('R3', 140, 'ains', 'ulcere_gd', '{"any_of":[{"statut":["cicatrise","inconnu"],"sous_ains":["oui"]},{"statut":["cicatrise","inconnu"],"episodes":["2+"]}]}'::jsonb, 'absolue', 'Antécédent d’ulcère gastroduodénal sous AINS ou récidivant', 'Risque majeur de récidive. Alternative antalgique : paracétamol (Doliprane).', 'Proposition Ordosur d''après RCP — à valider'),
  ('R4', 150, 'ains', 'hemorragie_digestive', '{"any_of":[{"sous_ains":["inconnu"]},{"episodes":["inconnu"]}]}'::jsonb, 'a_evaluer', 'Antécédent d’hémorragie / perforation digestive — contexte à préciser', 'CI absolue si l''épisode est survenu sous AINS ou s''il est récidivant. Sinon : dose minimale, durée courte, IPP (ex. Mopral). Préciser l''antécédent dans le profil.', 'Proposition Ordosur d''après RCP — à valider'),
  ('R4b', 160, 'ains', 'ulcere_gd', '{"any_of":[{"statut":["cicatrise"],"sous_ains":["inconnu"]},{"statut":["cicatrise"],"episodes":["inconnu"]}]}'::jsonb, 'a_evaluer', 'Antécédent d’ulcère gastroduodénal — contexte à préciser', 'CI absolue si l''ulcère est survenu sous AINS ou s''il est récidivant. Sinon : dose minimale, durée courte, IPP (ex. Mopral). Préciser l''antécédent dans le profil.', 'Ajout Ordosur (zéro fausse réassurance : critère non renseigné) — à valider'),
  ('R5', 170, 'ains', 'hemorragie_digestive', '{"any_of":[{"sous_ains":["non"],"episodes":["1"]}]}'::jsonb, 'precaution', 'Antécédent digestif unique, non lié aux AINS', 'Dose minimale, durée courte, associer un IPP.', 'Proposition Ordosur d''après RCP — à valider'),
  ('R5', 180, 'ains', 'ulcere_gd', '{"any_of":[{"statut":["cicatrise"],"sous_ains":["non"],"episodes":["1"]},{"statut":["inconnu"]}]}'::jsonb, 'precaution', 'Antécédent digestif unique, non lié aux AINS', 'Dose minimale, durée courte, associer un IPP.', 'Proposition Ordosur d''après RCP — à valider'),
  ('R6', 190, 'aspirine', 'hemorragie_digestive', '{"any_of":[{"en_cours":["non"]}]}'::jsonb, 'precaution', 'Antécédent d’hémorragie digestive ou d’ulcère', 'Risque hémorragique majoré — évaluer bénéfice/risque, discuter un IPP, surveillance.', 'Proposition Ordosur d''après RCP — à valider'),
  ('R6', 200, 'aspirine', 'ulcere_gd', '{"any_of":[{"statut":["cicatrise","inconnu"]}]}'::jsonb, 'precaution', 'Antécédent d’hémorragie digestive ou d’ulcère', 'Risque hémorragique majoré — évaluer bénéfice/risque, discuter un IPP, surveillance.', 'Proposition Ordosur d''après RCP — à valider'),
  ('R6', 210, 'antiagregant', 'hemorragie_digestive', '{"any_of":[{"en_cours":["non"]}]}'::jsonb, 'precaution', 'Antécédent d’hémorragie digestive ou d’ulcère', 'Risque hémorragique majoré — évaluer bénéfice/risque, discuter un IPP, surveillance.', 'Proposition Ordosur d''après RCP — à valider'),
  ('R6', 220, 'antiagregant', 'ulcere_gd', '{"any_of":[{"statut":["cicatrise","inconnu"]}]}'::jsonb, 'precaution', 'Antécédent d’hémorragie digestive ou d’ulcère', 'Risque hémorragique majoré — évaluer bénéfice/risque, discuter un IPP, surveillance.', 'Proposition Ordosur d''après RCP — à valider'),
  ('R6', 230, 'anticoagulant', 'hemorragie_digestive', '{"any_of":[{"en_cours":["non"]}]}'::jsonb, 'precaution', 'Antécédent d’hémorragie digestive ou d’ulcère', 'Risque hémorragique majoré — évaluer bénéfice/risque, discuter un IPP, surveillance.', 'Proposition Ordosur d''après RCP — à valider'),
  ('R6', 240, 'anticoagulant', 'ulcere_gd', '{"any_of":[{"statut":["cicatrise","inconnu"]}]}'::jsonb, 'precaution', 'Antécédent d’hémorragie digestive ou d’ulcère', 'Risque hémorragique majoré — évaluer bénéfice/risque, discuter un IPP, surveillance.', 'Proposition Ordosur d''après RCP — à valider'),
  ('C1', 250, 'corticoide', 'hemorragie_digestive', '{"any_of":[{"en_cours":["oui"]}]}'::jsonb, 'a_evaluer', 'Corticothérapie et lésion digestive évolutive', 'Corticothérapie : risque digestif majoré, protection gastrique à discuter.', 'Proposition Ordosur d''après RCP — à valider'),
  ('C1', 260, 'corticoide', 'ulcere_gd', '{"any_of":[{"statut":["evolutif"]}]}'::jsonb, 'a_evaluer', 'Corticothérapie et lésion digestive évolutive', 'Corticothérapie : risque digestif majoré, protection gastrique à discuter.', 'Proposition Ordosur d''après RCP — à valider'),
  ('C1b', 270, 'corticoide', 'ulcere_gd', '{"any_of":[{"statut":["inconnu"]}]}'::jsonb, 'a_evaluer', 'Corticothérapie et ulcère gastroduodénal — statut à préciser', 'Corticothérapie : risque digestif majoré, protection gastrique à discuter. Préciser dans le profil si l''ulcère est évolutif ou cicatrisé.', 'Ajout Ordosur (zéro fausse réassurance : critère non renseigné) — à valider'),
  ('C2', 280, 'corticoide', 'hemorragie_digestive', '{"any_of":[{"en_cours":["non"]}]}'::jsonb, 'precaution', 'Corticothérapie et antécédent d’ulcère ou d’hémorragie digestive', 'Corticothérapie : risque digestif majoré, protection gastrique à discuter.', 'Proposition Ordosur d''après RCP — à valider'),
  ('C2', 290, 'corticoide', 'ulcere_gd', '{"any_of":[{"statut":["cicatrise"]}]}'::jsonb, 'precaution', 'Corticothérapie et antécédent d’ulcère ou d’hémorragie digestive', 'Corticothérapie : risque digestif majoré, protection gastrique à discuter.', 'Proposition Ordosur d''après RCP — à valider')
on conflict (code, classe, antecedent_type) do update set
  ordre = excluded.ordre, criteres = excluded.criteres, severite = excluded.severite,
  titre = excluded.titre, conduite = excluded.conduite, source = excluded.source;

-- Empreintes base = source (à comparer aux valeurs de l'en-tête) :
--   select md5(string_agg(concat_ws('|', code, ordre::text, classe, antecedent_type, severite, titre, conduite, source, criteres::text),
--     E'\n' order by ordre)) from regles_antecedents;
--   select md5(string_agg(classe || '|' || dci_motif || '|' || coalesce(voie, ''), E'\n'
--     order by (classe || '|' || dci_motif || '|' || coalesce(voie, '')) collate "C")) from regles_antecedents_classes;
