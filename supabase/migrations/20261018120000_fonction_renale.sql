-- Sprint 6B — Fonction rénale dans le moteur de sécurité.
-- FICHIER GÉNÉRÉ par scripts/gen_regles_renales.mjs — ne pas modifier à la main.
-- Canal additionnel : la table contraindications et son matching ne changent pas.
-- Empreinte de la source : règles 75e7074c8bef1073e15afb5bbcf442d6 · classes f36bcdd7b74eb7fa092345dd278d49c4
--                          examens 86950639dc35155c0ae105b9fb06a114

-- 1. Poids du patient (clairance de Cockcroft-Gault). La date dit de quand date la pesée.
alter table public.patients add column if not exists poids_kg numeric(5,1) null;
alter table public.patients add column if not exists poids_date date null;
alter table public.patients drop constraint if exists patients_poids_valide;
alter table public.patients add constraint patients_poids_valide check (
  (poids_kg is null and poids_date is null)
  or (poids_kg between 2 and 400 and poids_date is not null)
);

-- 2. Classes médicamenteuses (motifs DCI normalisés : minuscules, sans accents).
create table if not exists public.regles_renales_classes (
  id uuid primary key default gen_random_uuid(),
  classe text not null check (classe in ('metformine','ains','dabigatran','rivaroxaban','apixaban','edoxaban','spironolactone','nitrofurantoine')),
  dci_motif text not null check (length(dci_motif) >= 3 and dci_motif = lower(dci_motif)),
  unique (classe, dci_motif)
);

-- 3. Règles : s'appliquent si seuil_min ≤ valeur arrondie < seuil (ou patient dialysé si inclut_dialyse).
create table if not exists public.regles_renales (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  ordre integer not null,
  classe text not null check (classe in ('metformine','ains','dabigatran','rivaroxaban','apixaban','edoxaban','spironolactone','nitrofurantoine')),
  mesure text not null check (mesure in ('dfg','cockcroft')),
  seuil smallint not null check (seuil between 1 and 200),
  seuil_min smallint null check (seuil_min is null or (seuil_min >= 0 and seuil_min < seuil)),
  inclut_dialyse boolean not null default false,
  severite text not null check (severite in ('absolue','a_evaluer')),
  titre text not null,
  conduite text not null,
  source text not null default 'Proposition Ordosur d''après RCP — à valider',
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4. RLS : lecture pour tout utilisateur authentifié, aucune écriture client.
alter table public.regles_renales_classes enable row level security;
alter table public.regles_renales enable row level security;
drop policy if exists regles_renales_classes_read on public.regles_renales_classes;
create policy regles_renales_classes_read on public.regles_renales_classes
  for select to authenticated using (true);
drop policy if exists regles_renales_read on public.regles_renales;
create policy regles_renales_read on public.regles_renales
  for select to authenticated using (true);
revoke all on public.regles_renales_classes from anon;
revoke all on public.regles_renales from anon;
revoke insert, update, delete on public.regles_renales_classes from authenticated;
revoke insert, update, delete on public.regles_renales from authenticated;

-- 5. Données.
insert into public.regles_renales_classes (classe, dci_motif) values
  ('metformine', 'metformin'),
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
  ('dabigatran', 'dabigatran'),
  ('rivaroxaban', 'rivaroxaban'),
  ('apixaban', 'apixaban'),
  ('edoxaban', 'edoxaban'),
  ('spironolactone', 'spironolactone'),
  ('nitrofurantoine', 'nitrofurantoin')
on conflict (classe, dci_motif) do nothing;

insert into public.regles_renales (code, ordre, classe, mesure, seuil, seuil_min, inclut_dialyse, severite, titre, conduite, source) values
  ('METFORMINE_DFG_30', 10, 'metformine', 'dfg', 30, null, false, 'absolue', 'Metformine contre-indiquée — DFG < 30 mL/min', 'ne pas prescrire (risque d’acidose lactique) ; choisir une alternative', 'Proposition Ordosur d''après RCP — à valider'),
  ('METFORMINE_DFG_30_44', 20, 'metformine', 'dfg', 45, 30, false, 'a_evaluer', 'Metformine — DFG 30-44 mL/min : dose à réduire', 'ne pas initier ; dose maximale 1 000 mg/j en 2 prises ; contrôler la fonction rénale tous les 3 mois', 'Proposition Ordosur d''après RCP — à valider'),
  ('AINS_DFG_30', 30, 'ains', 'dfg', 30, null, false, 'absolue', 'AINS contre-indiqué — insuffisance rénale sévère (DFG < 30 mL/min)', 'ne pas prescrire ; préférer le paracétamol', 'Proposition Ordosur d''après RCP — à valider'),
  ('AINS_DFG_30_59', 40, 'ains', 'dfg', 60, 30, false, 'a_evaluer', 'AINS — DFG 30-59 mL/min : risque d’insuffisance rénale aiguë fonctionnelle', 'éviter si possible ; sinon dose minimale, durée la plus courte, contrôle de la créatinine — surtout avec IEC, ARA II ou diurétique', 'Proposition Ordosur d''après RCP — à valider'),
  ('DABIGATRAN_CG_30', 50, 'dabigatran', 'cockcroft', 30, null, false, 'absolue', 'Dabigatran contre-indiqué — clairance de la créatinine < 30 mL/min', 'ne pas prescrire ; discuter un autre anticoagulant', 'Proposition Ordosur d''après RCP — à valider'),
  ('DABIGATRAN_CG_30_50', 60, 'dabigatran', 'cockcroft', 51, 30, false, 'a_evaluer', 'Dabigatran — clairance 30-50 mL/min : posologie à adapter', 'réduction de dose à discuter selon l’indication et le risque hémorragique ; contrôler la fonction rénale au moins une fois par an', 'Proposition Ordosur d''après RCP — à valider'),
  ('RIVAROXABAN_CG_15', 70, 'rivaroxaban', 'cockcroft', 15, null, true, 'absolue', 'Non recommandé (RCP) — insuffisance rénale terminale', 'rivaroxaban non recommandé si clairance < 15 mL/min ou en dialyse ; discuter une alternative avec le néphrologue', 'Proposition Ordosur d''après RCP — à valider'),
  ('RIVAROXABAN_CG_15_49', 80, 'rivaroxaban', 'cockcroft', 50, 15, false, 'a_evaluer', 'Rivaroxaban — clairance 15-49 mL/min : posologie à adapter', 'adapter la dose selon l’indication ; prudence particulière entre 15 et 29 mL/min', 'Proposition Ordosur d''après RCP — à valider'),
  ('APIXABAN_CG_15', 90, 'apixaban', 'cockcroft', 15, null, true, 'absolue', 'Non recommandé (RCP) — insuffisance rénale terminale', 'apixaban non recommandé si clairance < 15 mL/min ou en dialyse ; discuter une alternative avec le néphrologue', 'Proposition Ordosur d''après RCP — à valider'),
  ('APIXABAN_CG_15_29', 100, 'apixaban', 'cockcroft', 30, 15, false, 'a_evaluer', 'Apixaban — clairance 15-29 mL/min : prudence, dose à adapter', 'réduire la dose selon l’indication ; surveiller le risque hémorragique', 'Proposition Ordosur d''après RCP — à valider'),
  ('EDOXABAN_CG_15', 110, 'edoxaban', 'cockcroft', 15, null, true, 'absolue', 'Non recommandé (RCP) — insuffisance rénale terminale', 'édoxaban non recommandé si clairance < 15 mL/min ou en dialyse ; discuter une alternative avec le néphrologue', 'Proposition Ordosur d''après RCP — à valider'),
  ('EDOXABAN_CG_15_29', 120, 'edoxaban', 'cockcroft', 30, 15, false, 'a_evaluer', 'Édoxaban — clairance 15-29 mL/min : prudence, dose à adapter', 'réduire la dose selon l’indication ; surveiller le risque hémorragique', 'Proposition Ordosur d''après RCP — à valider'),
  ('SPIRONOLACTONE_DFG_30', 130, 'spironolactone', 'dfg', 30, null, false, 'absolue', 'Spironolactone contre-indiquée — insuffisance rénale sévère (DFG < 30 mL/min)', 'ne pas prescrire (risque d’hyperkaliémie)', 'Proposition Ordosur d''après RCP — à valider'),
  ('SPIRONOLACTONE_DFG_30_59', 140, 'spironolactone', 'dfg', 60, 30, false, 'a_evaluer', 'Spironolactone — DFG 30-59 mL/min : risque d’hyperkaliémie', 'dose réduite ; contrôler kaliémie et créatinine à l’instauration puis régulièrement — surtout avec IEC ou ARA II', 'Proposition Ordosur d''après RCP — à valider'),
  ('NITROFURANTOINE_DFG_30', 150, 'nitrofurantoine', 'dfg', 30, null, false, 'absolue', 'Nitrofurantoïne contre-indiquée — DFG < 30 mL/min', 'ne pas prescrire (inefficacité urinaire et toxicité accrue) ; choisir un autre antibiotique', 'Proposition Ordosur d''après RCP — à valider'),
  ('NITROFURANTOINE_DFG_30_59', 160, 'nitrofurantoine', 'dfg', 60, 30, false, 'a_evaluer', 'Nitrofurantoïne — DFG 30-59 mL/min : contre-indication possible selon le RCP', 'seuil du RCP à vérifier (45 ou 60 mL/min selon la version) ; préférer un autre antibiotique', 'Proposition Ordosur d''après RCP — à valider')
on conflict (code) do update set
  ordre = excluded.ordre, classe = excluded.classe, mesure = excluded.mesure, seuil = excluded.seuil,
  seuil_min = excluded.seuil_min, inclut_dialyse = excluded.inclut_dialyse, severite = excluded.severite,
  titre = excluded.titre, conduite = excluded.conduite, source = excluded.source;

-- 6. Référentiel d'examens : conversions standard ajoutées (créatinine et glycémie en mg/dL).
--    valeur_autre = valeur_defaut × facteur, ou ÷ diviseur.
update public.examens_reference set unites = '[{"unite":"µmol/L","facteur":8.84},{"unite":"mg/dL","diviseur":10}]'::jsonb where code = 'CREATININE';
update public.examens_reference set unites = '[{"unite":"mmol/L","facteur":5.551},{"unite":"mg/dL","facteur":100}]'::jsonb where code = 'GLYCEMIE_JEUN';
update public.examens_reference set unites = '[{"unite":"mmol/L","facteur":5.551},{"unite":"mg/dL","facteur":100}]'::jsonb where code = 'GLYCEMIE_PP';
update public.examens_reference set unites = '[{"unite":"mmol/L","facteur":5.551},{"unite":"mg/dL","facteur":100}]'::jsonb where code = 'HGPO';

-- Empreintes base = source (à comparer aux valeurs de l'en-tête) :
--   select md5(string_agg(concat_ws('|', code, ordre::text, classe, mesure, seuil::text, coalesce(seuil_min::text, ''),
--     inclut_dialyse::text, severite, titre, conduite, source), E'\n' order by code collate "C")) from regles_renales;
--   select md5(string_agg(classe || '|' || dci_motif, E'\n' order by (classe || '|' || dci_motif) collate "C")) from regles_renales_classes;
--   (examens : requête en fin de 20261015120000_examens_demandes.sql)
