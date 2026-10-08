-- Sprint 4bc — Antécédents digestifs analysés par le moteur de sécurité.
-- Généré par scripts/gen_regles_antecedents.mjs (source unique, partagée avec les tests).
-- Canal additionnel : la table contraindications et son matching ne changent pas.

-- 1. Détails structurés : deux nouveaux types (champs facultatifs, « inconnu » par défaut).
alter table public.antecedents drop constraint if exists antecedents_details_objet;
alter table public.antecedents add constraint antecedents_details_objet check (
  jsonb_typeof(details) = 'object'
  and (not (details ? 'type') or details->>'type' in ('tabac','alcool','phyto','cancer','hemorragie_digestive','ulcere_gd'))
);

-- 2. Classes médicamenteuses (motifs DCI normalisés : minuscules, sans accents).
create table if not exists public.regles_antecedents_classes (
  id uuid primary key default gen_random_uuid(),
  classe text not null check (classe in ('ains','aspirine','antiagregant','anticoagulant')),
  dci_motif text not null check (length(dci_motif) >= 3 and dci_motif = lower(dci_motif)),
  unique (classe, dci_motif)
);

-- 3. Règles (évaluées par ordre ; sévérité la plus haute retenue par médicament × antécédent).
create table if not exists public.regles_antecedents (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  ordre integer not null,
  classe text not null check (classe in ('ains','aspirine','antiagregant','anticoagulant')),
  antecedent_type text not null check (antecedent_type in ('hemorragie_digestive','ulcere_gd')),
  criteres jsonb not null default '{}'::jsonb check (jsonb_typeof(criteres) = 'object'),
  severite text not null check (severite in ('absolue','a_evaluer','precaution')),
  titre text not null,
  conduite text not null,
  source text not null default 'Proposition Ordosur d''après RCP — à valider',
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  unique (code, classe, antecedent_type)
);

-- 4. RLS : lecture pour tout utilisateur authentifié, aucune écriture client.
alter table public.regles_antecedents_classes enable row level security;
alter table public.regles_antecedents enable row level security;
drop policy if exists regles_antecedents_classes_read on public.regles_antecedents_classes;
create policy regles_antecedents_classes_read on public.regles_antecedents_classes
  for select to authenticated using (true);
drop policy if exists regles_antecedents_read on public.regles_antecedents;
create policy regles_antecedents_read on public.regles_antecedents
  for select to authenticated using (true);
revoke insert, update, delete on public.regles_antecedents_classes from anon, authenticated;
revoke insert, update, delete on public.regles_antecedents from anon, authenticated;

-- 5. Données.
insert into public.regles_antecedents_classes (classe, dci_motif) values
  ('ains', 'ibuprofene'),
  ('ains', 'ketoprofene'),
  ('ains', 'dexketoprofene'),
  ('ains', 'diclofenac'),
  ('ains', 'aceclofenac'),
  ('ains', 'naproxene'),
  ('ains', 'piroxicam'),
  ('ains', 'meloxicam'),
  ('ains', 'tenoxicam'),
  ('ains', 'lornoxicam'),
  ('ains', 'indometacine'),
  ('ains', 'celecoxib'),
  ('ains', 'etoricoxib'),
  ('ains', 'flurbiprofene'),
  ('ains', 'acide niflumique'),
  ('ains', 'nimesulide'),
  ('ains', 'etodolac'),
  ('ains', 'sulindac'),
  ('ains', 'acide mefenamique'),
  ('ains', 'ketorolac'),
  ('ains', 'acide tiaprofenique'),
  ('ains', 'morniflumate'),
  ('ains', 'fenoprofene'),
  ('ains', 'parecoxib'),
  ('ains', 'tiaprofeni'),
  ('ains', 'niflumi'),
  ('ains', 'mefenami'),
  ('ains', 'phenylbutazone'),
  ('aspirine', 'aspirine'),
  ('aspirine', 'acetylsalicyl'),
  ('aspirine', 'acetilsalicyl'),
  ('antiagregant', 'clopidogrel'),
  ('antiagregant', 'prasugrel'),
  ('antiagregant', 'ticagrelor'),
  ('antiagregant', 'tirofiban'),
  ('antiagregant', 'dipyridamole'),
  ('anticoagulant', 'acenocoumarol'),
  ('anticoagulant', 'warfarine'),
  ('anticoagulant', 'fluindione'),
  ('anticoagulant', 'rivaroxaban'),
  ('anticoagulant', 'apixaban'),
  ('anticoagulant', 'dabigatran'),
  ('anticoagulant', 'edoxaban'),
  ('anticoagulant', 'enoxaparine'),
  ('anticoagulant', 'tinzaparine'),
  ('anticoagulant', 'nadroparine'),
  ('anticoagulant', 'heparine'),
  ('anticoagulant', 'bemiparine'),
  ('anticoagulant', 'fondaparinux')
on conflict (classe, dci_motif) do nothing;

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
  ('R6', 240, 'anticoagulant', 'ulcere_gd', '{"any_of":[{"statut":["cicatrise","inconnu"]}]}'::jsonb, 'precaution', 'Antécédent d’hémorragie digestive ou d’ulcère', 'Risque hémorragique majoré — évaluer bénéfice/risque, discuter un IPP, surveillance.', 'Proposition Ordosur d''après RCP — à valider')
on conflict (code, classe, antecedent_type) do update set
  ordre = excluded.ordre, criteres = excluded.criteres, severite = excluded.severite,
  titre = excluded.titre, conduite = excluded.conduite, source = excluded.source;
