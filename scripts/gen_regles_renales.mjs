// Sprint 6B — Source unique des règles « fonction rénale » du moteur.
// Génère :
//   • src/lib/regles_renales.data.json                       (fixture des tests Vitest)
//   • supabase/migrations/20261018120000_fonction_renale.sql (schéma + données en base)
// Usage : node scripts/gen_examens.mjs && node scripts/gen_regles_renales.mjs
// Le moteur lit les règles EN BASE (tables regles_renales / regles_renales_classes) :
// modifier une règle = mettre à jour la table (ou relancer ce script puis une migration dédiée).
//
// Chaque seuil est une PROPOSITION d'après les RCP, à valider. Un seuil incertain n'est jamais
// porté au niveau contre-indication : il reste « À évaluer ».
// Les seuils sont des entiers, comparés à la valeur ARRONDIE affichée au médecin :
//   la règle s'applique si  seuil_min ≤ valeur < seuil  (seuil_min absent = pas de borne basse).

import { readFileSync, writeFileSync } from 'node:fs';
import { writeNewMigration } from './lib/migrationGuard.mjs';
import { createHash } from 'node:crypto';

const SOURCE = "Proposition Ordosur d'après RCP — à valider";
const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));

// Classe AINS : même liste que le canal antécédents (source unique : son générateur).
const ains = read('../src/lib/regles_antecedents.data.json').classes.filter(c => c.classe === 'ains').map(c => c.dci_motif);

const classes = {
  metformine: ['metformin'],
  ains,
  dabigatran: ['dabigatran'],
  rivaroxaban: ['rivaroxaban'],
  apixaban: ['apixaban'],
  edoxaban: ['edoxaban'],
  spironolactone: ['spironolactone'],
  nitrofurantoine: ['nitrofurantoin'],
};

const NON_RECOMMANDE = 'Non recommandé (RCP) — insuffisance rénale terminale';

// mesure : 'dfg' (CKD-EPI 2021, mL/min/1,73 m²) ou 'cockcroft' (clairance de Cockcroft-Gault, mL/min).
const defs = [
  { code: 'METFORMINE_DFG_30', classe: 'metformine', mesure: 'dfg', seuil: 30, severite: 'absolue',
    titre: 'Metformine contre-indiquée — DFG < 30 mL/min',
    conduite: 'ne pas prescrire (risque d’acidose lactique) ; choisir une alternative' },
  { code: 'METFORMINE_DFG_30_44', classe: 'metformine', mesure: 'dfg', seuil_min: 30, seuil: 45, severite: 'a_evaluer',
    titre: 'Metformine — DFG 30-44 mL/min : dose à réduire',
    conduite: 'ne pas initier ; dose maximale 1 000 mg/j en 2 prises ; contrôler la fonction rénale tous les 3 mois' },

  { code: 'AINS_DFG_30', classe: 'ains', mesure: 'dfg', seuil: 30, severite: 'absolue',
    titre: 'AINS contre-indiqué — insuffisance rénale sévère (DFG < 30 mL/min)',
    conduite: 'ne pas prescrire ; préférer le paracétamol' },
  { code: 'AINS_DFG_30_59', classe: 'ains', mesure: 'dfg', seuil_min: 30, seuil: 60, severite: 'a_evaluer',
    titre: 'AINS — DFG 30-59 mL/min : risque d’insuffisance rénale aiguë fonctionnelle',
    conduite: 'éviter si possible ; sinon dose minimale, durée la plus courte, contrôle de la créatinine — surtout avec IEC, ARA II ou diurétique' },

  { code: 'DABIGATRAN_CG_30', classe: 'dabigatran', mesure: 'cockcroft', seuil: 30, severite: 'absolue',
    titre: 'Dabigatran contre-indiqué — clairance de la créatinine < 30 mL/min',
    conduite: 'ne pas prescrire ; discuter un autre anticoagulant' },
  { code: 'DABIGATRAN_CG_30_50', classe: 'dabigatran', mesure: 'cockcroft', seuil_min: 30, seuil: 51, severite: 'a_evaluer',
    titre: 'Dabigatran — clairance 30-50 mL/min : posologie à adapter',
    conduite: 'réduction de dose à discuter selon l’indication et le risque hémorragique ; contrôler la fonction rénale au moins une fois par an' },

  { code: 'RIVAROXABAN_CG_15', classe: 'rivaroxaban', mesure: 'cockcroft', seuil: 15, dialyse: true, severite: 'absolue',
    titre: NON_RECOMMANDE,
    conduite: 'rivaroxaban non recommandé si clairance < 15 mL/min ou en dialyse ; discuter une alternative avec le néphrologue' },
  { code: 'RIVAROXABAN_CG_15_49', classe: 'rivaroxaban', mesure: 'cockcroft', seuil_min: 15, seuil: 50, severite: 'a_evaluer',
    titre: 'Rivaroxaban — clairance 15-49 mL/min : posologie à adapter',
    conduite: 'adapter la dose selon l’indication ; prudence particulière entre 15 et 29 mL/min' },

  { code: 'APIXABAN_CG_15', classe: 'apixaban', mesure: 'cockcroft', seuil: 15, dialyse: true, severite: 'absolue',
    titre: NON_RECOMMANDE,
    conduite: 'apixaban non recommandé si clairance < 15 mL/min ou en dialyse ; discuter une alternative avec le néphrologue' },
  { code: 'APIXABAN_CG_15_29', classe: 'apixaban', mesure: 'cockcroft', seuil_min: 15, seuil: 30, severite: 'a_evaluer',
    titre: 'Apixaban — clairance 15-29 mL/min : prudence, dose à adapter',
    conduite: 'réduire la dose selon l’indication ; surveiller le risque hémorragique' },

  { code: 'EDOXABAN_CG_15', classe: 'edoxaban', mesure: 'cockcroft', seuil: 15, dialyse: true, severite: 'absolue',
    titre: NON_RECOMMANDE,
    conduite: 'édoxaban non recommandé si clairance < 15 mL/min ou en dialyse ; discuter une alternative avec le néphrologue' },
  { code: 'EDOXABAN_CG_15_29', classe: 'edoxaban', mesure: 'cockcroft', seuil_min: 15, seuil: 30, severite: 'a_evaluer',
    titre: 'Édoxaban — clairance 15-29 mL/min : prudence, dose à adapter',
    conduite: 'réduire la dose selon l’indication ; surveiller le risque hémorragique' },

  { code: 'SPIRONOLACTONE_DFG_30', classe: 'spironolactone', mesure: 'dfg', seuil: 30, severite: 'absolue',
    titre: 'Spironolactone contre-indiquée — insuffisance rénale sévère (DFG < 30 mL/min)',
    conduite: 'ne pas prescrire (risque d’hyperkaliémie)' },
  { code: 'SPIRONOLACTONE_DFG_30_59', classe: 'spironolactone', mesure: 'dfg', seuil_min: 30, seuil: 60, severite: 'a_evaluer',
    titre: 'Spironolactone — DFG 30-59 mL/min : risque d’hyperkaliémie',
    conduite: 'dose réduite ; contrôler kaliémie et créatinine à l’instauration puis régulièrement — surtout avec IEC ou ARA II' },

  // Seuil du RCP incertain (45 ou 60 mL/min selon la version) : CI seulement là où les deux
  // versions s'accordent (< 30) ; entre 30 et 59 → « À évaluer ».
  { code: 'NITROFURANTOINE_DFG_30', classe: 'nitrofurantoine', mesure: 'dfg', seuil: 30, severite: 'absolue',
    titre: 'Nitrofurantoïne contre-indiquée — DFG < 30 mL/min',
    conduite: 'ne pas prescrire (inefficacité urinaire et toxicité accrue) ; choisir un autre antibiotique' },
  { code: 'NITROFURANTOINE_DFG_30_59', classe: 'nitrofurantoine', mesure: 'dfg', seuil_min: 30, seuil: 60, severite: 'a_evaluer',
    titre: 'Nitrofurantoïne — DFG 30-59 mL/min : contre-indication possible selon le RCP',
    conduite: 'seuil du RCP à vérifier (45 ou 60 mL/min selon la version) ; préférer un autre antibiotique' },
];

const regles = defs.map((d, i) => ({
  code: d.code, ordre: (i + 1) * 10, classe: d.classe, mesure: d.mesure,
  seuil: d.seuil, seuil_min: d.seuil_min ?? null, inclut_dialyse: !!d.dialyse,
  severite: d.severite, titre: d.titre, conduite: d.conduite, source: SOURCE, actif: true,
}));
const classeRows = Object.entries(classes).flatMap(([classe, motifs]) => motifs.map(dci_motif => ({ classe, dci_motif })));

const md5 = s => createHash('md5').update(s, 'utf8').digest('hex');
const empreinteRegles = md5([...regles].sort((a, b) => (a.code < b.code ? -1 : 1)).map(r =>
  [r.code, r.ordre, r.classe, r.mesure, r.seuil, r.seuil_min ?? '', r.inclut_dialyse, r.severite, r.titre, r.conduite, r.source].join('|')).join('\n'));
const empreinteClasses = md5(classeRows.map(c => `${c.classe}|${c.dci_motif}`).sort().join('\n'));

writeFileSync(
  new URL('../src/lib/regles_renales.data.json', import.meta.url),
  JSON.stringify({ empreinte: { regles: empreinteRegles, classes: empreinteClasses }, classes: classeRows, regles }, null, 2) + '\n',
);

// ── Référentiel d'examens : conversions ajoutées (source : scripts/gen_examens.mjs) ──
const examData = read('../src/lib/examens_reference.data.json');
const UNITES_MAJ = ['CREATININE', 'GLYCEMIE_JEUN', 'GLYCEMIE_PP', 'HGPO'];
const examMaj = UNITES_MAJ.map(code => examData.examens.find(e => e.code === code));
if (examMaj.some(e => !e)) throw new Error('examen introuvable dans examens_reference.data.json');
if (!examMaj.every(e => e.unites.some(u => u.unite === 'mg/dL'))) throw new Error('relancer d’abord scripts/gen_examens.mjs (conversion mg/dL absente)');

const q = s => `'${String(s).replace(/'/g, "''")}'`;
const n = v => (v === null || v === undefined ? 'null' : String(v));
const CLASSES_SQL = Object.keys(classes).map(q).join(',');

const sql = `-- Sprint 6B — Fonction rénale dans le moteur de sécurité.
-- FICHIER GÉNÉRÉ par scripts/gen_regles_renales.mjs — ne pas modifier à la main.
-- Canal additionnel : la table contraindications et son matching ne changent pas.
-- Empreinte de la source : règles ${empreinteRegles} · classes ${empreinteClasses}
--                          examens ${examData.empreinte.examens}

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
  classe text not null check (classe in (${CLASSES_SQL})),
  dci_motif text not null check (length(dci_motif) >= 3 and dci_motif = lower(dci_motif)),
  unique (classe, dci_motif)
);

-- 3. Règles : s'appliquent si seuil_min ≤ valeur arrondie < seuil (ou patient dialysé si inclut_dialyse).
create table if not exists public.regles_renales (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  ordre integer not null,
  classe text not null check (classe in (${CLASSES_SQL})),
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
${classeRows.map(r => `  (${q(r.classe)}, ${q(r.dci_motif)})`).join(',\n')}
on conflict (classe, dci_motif) do nothing;

insert into public.regles_renales (code, ordre, classe, mesure, seuil, seuil_min, inclut_dialyse, severite, titre, conduite, source) values
${regles.map(r => `  (${q(r.code)}, ${r.ordre}, ${q(r.classe)}, ${q(r.mesure)}, ${r.seuil}, ${n(r.seuil_min)}, ${r.inclut_dialyse}, ${q(r.severite)}, ${q(r.titre)}, ${q(r.conduite)}, ${q(r.source)})`).join(',\n')}
on conflict (code) do update set
  ordre = excluded.ordre, classe = excluded.classe, mesure = excluded.mesure, seuil = excluded.seuil,
  seuil_min = excluded.seuil_min, inclut_dialyse = excluded.inclut_dialyse, severite = excluded.severite,
  titre = excluded.titre, conduite = excluded.conduite, source = excluded.source;

-- 6. Référentiel d'examens : conversions standard ajoutées (créatinine et glycémie en mg/dL).
--    valeur_autre = valeur_defaut × facteur, ou ÷ diviseur.
${examMaj.map(e => `update public.examens_reference set unites = ${q(JSON.stringify(e.unites))}::jsonb where code = ${q(e.code)};`).join('\n')}

-- Empreintes base = source (à comparer aux valeurs de l'en-tête) :
--   select md5(string_agg(concat_ws('|', code, ordre::text, classe, mesure, seuil::text, coalesce(seuil_min::text, ''),
--     inclut_dialyse::text, severite, titre, conduite, source), E'\\n' order by code collate "C")) from regles_renales;
--   select md5(string_agg(classe || '|' || dci_motif, E'\\n' order by (classe || '|' || dci_motif) collate "C")) from regles_renales_classes;
--   (examens : requête en fin de 20261015120000_examens_demandes.sql)
`;

// Garde-fou : une migration existante n'est jamais réécrite (scripts/lib/migrationGuard.mjs).
writeNewMigration(new URL('../supabase/migrations/20261018120000_fonction_renale.sql', import.meta.url), sql);
console.log(`${regles.length} règles, ${classeRows.length} motifs (${Object.keys(classes).length} classes)`);
console.log(`empreinte règles ${empreinteRegles} · classes ${empreinteClasses} · examens ${examData.empreinte.examens}`);
