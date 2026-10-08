// Sprint 4bc — Source unique des règles « antécédents » du moteur.
// Génère :
//   • src/lib/regles_antecedents.data.json  (fixture des tests Vitest)
//   • supabase/migrations/20261002120000_regles_antecedents.sql (données en base)
// Usage : node scripts/gen_regles_antecedents.mjs
// Le moteur lit les règles EN BASE (tables regles_antecedents / _classes) : modifier une
// règle = mettre à jour la table (ou relancer ce script puis une migration dédiée).

import { writeFileSync } from 'node:fs';

const SOURCE = "Proposition Ordosur d'après RCP — à valider";
const SOURCE_AJOUT = "Ajout Ordosur (zéro fausse réassurance : critère non renseigné) — à valider";

const classes = {
  ains: [
    'ibuprofene', 'ketoprofene', 'dexketoprofene', 'diclofenac', 'aceclofenac', 'naproxene',
    'piroxicam', 'meloxicam', 'tenoxicam', 'lornoxicam', 'indometacine', 'celecoxib',
    'etoricoxib', 'flurbiprofene', 'acide niflumique', 'nimesulide', 'etodolac', 'sulindac',
    'acide mefenamique', 'ketorolac',
    // Complément : membres de la classe ANSM « anti-inflammatoires non stéroïdiens »
    // commercialisés au Maroc (absents de la liste initiale).
    'acide tiaprofenique', 'morniflumate', 'fenoprofene', 'parecoxib',
    // Sprint 4e-B (audit des motifs) : radicaux robustes aux formes inversées
    // (« TIAPROFÉNIQUE (ACIDE) ») + phénylbutazone.
    'tiaprofeni', 'niflumi', 'mefenami', 'phenylbutazone',
  ],
  // « acetilsalicyl » : orthographe fautive présente en base (CARDIOFLEX 100 MG).
  aspirine: ['aspirine', 'acetylsalicyl', 'acetilsalicyl'],
  antiagregant: ['clopidogrel', 'prasugrel', 'ticagrelor', 'tirofiban', 'dipyridamole'],
  anticoagulant: [
    'acenocoumarol', 'warfarine', 'fluindione', 'rivaroxaban', 'apixaban', 'dabigatran',
    'edoxaban', 'enoxaparine', 'tinzaparine', 'nadroparine', 'heparine',
    'bemiparine', 'fondaparinux',
  ],
};

const ALL = ['ains', 'aspirine', 'antiagregant', 'anticoagulant'];
const ANTITHROMBO = ['aspirine', 'antiagregant', 'anticoagulant'];

const CONDUITE_AINS_ABS = 'Risque majeur de récidive. Alternative antalgique : paracétamol (Doliprane).';
const CONDUITE_R6 = 'Risque hémorragique majoré — évaluer bénéfice/risque, discuter un IPP, surveillance.';

// Ordre d'évaluation = ordre de ce tableau. Pour un même médicament et un même
// antécédent, le moteur garde la sévérité la plus haute.
const defs = [
  {
    code: 'R1', classes: ALL, severite: 'absolue',
    titre: 'Saignement digestif actif / ulcère évolutif',
    conduite: 'Lésion susceptible de saigner — ne pas prescrire.',
    par_type: {
      hemorragie_digestive: { any_of: [{ en_cours: ['oui'] }] },
      ulcere_gd: { any_of: [{ statut: ['evolutif'] }] },
    },
  },
  {
    code: 'R1b', classes: ALL, severite: 'a_evaluer', source: SOURCE_AJOUT,
    titre: 'Ulcère gastroduodénal — statut à préciser',
    conduite: "CI absolue si l'ulcère est évolutif. Sinon : se référer à la conduite habituelle (dose minimale, IPP, surveillance). Préciser l'antécédent dans le profil.",
    par_type: { ulcere_gd: { any_of: [{ statut: ['inconnu'] }] } },
  },
  {
    code: 'R2', classes: ['ains'], severite: 'absolue',
    titre: 'Antécédent d’hémorragie / perforation digestive sous AINS ou récidivant',
    conduite: CONDUITE_AINS_ABS,
    par_type: { hemorragie_digestive: { any_of: [{ sous_ains: ['oui'] }, { episodes: ['2+'] }] } },
  },
  {
    // R3 étendu au statut inconnu : évolutif (R1) comme cicatrisé (R3) donnent une CI absolue.
    code: 'R3', classes: ['ains'], severite: 'absolue',
    titre: 'Antécédent d’ulcère gastroduodénal sous AINS ou récidivant',
    conduite: CONDUITE_AINS_ABS,
    par_type: {
      ulcere_gd: { any_of: [
        { statut: ['cicatrise', 'inconnu'], sous_ains: ['oui'] },
        { statut: ['cicatrise', 'inconnu'], episodes: ['2+'] },
      ] },
    },
  },
  {
    // R4 : contexte inconnu — dès qu'un des deux critères n'est pas renseigné
    // (un seul critère connu ne suffit pas à exclure la CI absolue).
    code: 'R4', classes: ['ains'], severite: 'a_evaluer',
    titre: 'Antécédent d’hémorragie / perforation digestive — contexte à préciser',
    conduite: "CI absolue si l'épisode est survenu sous AINS ou s'il est récidivant. Sinon : dose minimale, durée courte, IPP (ex. Mopral). Préciser l'antécédent dans le profil.",
    par_type: { hemorragie_digestive: { any_of: [{ sous_ains: ['inconnu'] }, { episodes: ['inconnu'] }] } },
  },
  {
    code: 'R4b', classes: ['ains'], severite: 'a_evaluer', source: SOURCE_AJOUT,
    titre: 'Antécédent d’ulcère gastroduodénal — contexte à préciser',
    conduite: "CI absolue si l'ulcère est survenu sous AINS ou s'il est récidivant. Sinon : dose minimale, durée courte, IPP (ex. Mopral). Préciser l'antécédent dans le profil.",
    par_type: { ulcere_gd: { any_of: [
      { statut: ['cicatrise'], sous_ains: ['inconnu'] },
      { statut: ['cicatrise'], episodes: ['inconnu'] },
    ] } },
  },
  {
    code: 'R5', classes: ['ains'], severite: 'precaution',
    titre: 'Antécédent digestif unique, non lié aux AINS',
    conduite: 'Dose minimale, durée courte, associer un IPP.',
    par_type: {
      hemorragie_digestive: { any_of: [{ sous_ains: ['non'], episodes: ['1'] }] },
      ulcere_gd: { any_of: [
        { statut: ['cicatrise'], sous_ains: ['non'], episodes: ['1'] },
        { statut: ['inconnu'] },
      ] },
    },
  },
  {
    code: 'R6', classes: ANTITHROMBO, severite: 'precaution',
    titre: 'Antécédent d’hémorragie digestive ou d’ulcère',
    conduite: CONDUITE_R6,
    par_type: {
      hemorragie_digestive: { any_of: [{ en_cours: ['non'] }] },
      ulcere_gd: { any_of: [{ statut: ['cicatrise', 'inconnu'] }] },
    },
  },
];

const regles = [];
let ordre = 0;
for (const d of defs) {
  for (const classe of d.classes) {
    for (const [antecedent_type, criteres] of Object.entries(d.par_type)) {
      ordre += 10;
      regles.push({
        code: d.code, ordre, classe, antecedent_type, criteres,
        severite: d.severite, titre: d.titre, conduite: d.conduite, source: d.source ?? SOURCE,
      });
    }
  }
}

const classeRows = Object.entries(classes).flatMap(([classe, motifs]) => motifs.map(dci_motif => ({ classe, dci_motif })));

writeFileSync(
  new URL('../src/lib/regles_antecedents.data.json', import.meta.url),
  JSON.stringify({ classes: classeRows, regles }, null, 2) + '\n',
);

const q = s => `'${String(s).replace(/'/g, "''")}'`;
const sql = `-- Sprint 4bc — Antécédents digestifs analysés par le moteur de sécurité.
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
${classeRows.map(r => `  (${q(r.classe)}, ${q(r.dci_motif)})`).join(',\n')}
on conflict (classe, dci_motif) do nothing;

insert into public.regles_antecedents (code, ordre, classe, antecedent_type, criteres, severite, titre, conduite, source) values
${regles.map(r => `  (${q(r.code)}, ${r.ordre}, ${q(r.classe)}, ${q(r.antecedent_type)}, ${q(JSON.stringify(r.criteres))}::jsonb, ${q(r.severite)}, ${q(r.titre)}, ${q(r.conduite)}, ${q(r.source)})`).join(',\n')}
on conflict (code, classe, antecedent_type) do update set
  ordre = excluded.ordre, criteres = excluded.criteres, severite = excluded.severite,
  titre = excluded.titre, conduite = excluded.conduite, source = excluded.source;
`;

writeFileSync(new URL('../supabase/migrations/20261002120000_regles_antecedents.sql', import.meta.url), sql);
console.log(`${classeRows.length} motifs, ${regles.length} règles`);
