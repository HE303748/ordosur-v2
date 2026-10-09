// Sprint 4e-B — Source unique des familles d'allergies et des règles d'allergies croisées.
// Génère :
//   • src/lib/regles_allergies.data.json  (fixture des tests Vitest)
//   • supabase/migrations/20261011120000_regles_allergies.sql (données en base)
// Usage : node scripts/gen_regles_allergies.mjs
// Le moteur lit les familles et les règles EN BASE (allergie_familles / regles_allergies).

import { writeFileSync } from 'node:fs';
import { writeNewMigration } from './lib/migrationGuard.mjs';

const SOURCE = "Proposition Ordosur d'après RCP — à valider";

// Motifs normalisés (minuscules, sans accents). Par défaut : début de mot (« morphin » ne
// reconnaît pas « apomorphine »). Préfixe « * » : n'importe où dans le mot (« *cillin »
// reconnaît amoxicilline, ampicilline, oxacilline…). Les radicaux couvrent le français et
// l'anglais (« ibuprofen » ⊂ « ibuprofene »).
//   molecule : reconnaît le MÉDICAMENT prescrit ET une allergie saisie par molécule.
//   alias    : reconnaît seulement le libellé d'une allergie (« pénicillines », « AINS », marque).
const familles = {
  penicillines: {
    label: 'pénicillines',
    molecules: ['*cillin', 'mecillinam'],
    alias: ['betalactamine', 'betalactamines', 'beta lactamine', 'beta lactamines', 'augmentin', 'clamoxyl', 'amoxil', 'oracilline', 'extencilline'],
  },
  cephalosporines: {
    label: 'céphalosporines',
    molecules: [
      'cefaclor', 'cefadroxil', 'cefalexin', 'cephalexin', 'cefalotin', 'cephalothin', 'cefazolin', 'cefditoren',
      'cefepim', 'cefixim', 'cefotaxim', 'cefpodoxim', 'ceftazidim', 'ceftobiprol', 'ceftolozan', 'ceftriaxon',
      'cefuroxim', 'cefoxitin', 'cefprozil', 'cefdinir', 'cefradin', 'cephradin', 'cefamandol', 'ceftarolin',
      'cefoperazon', 'cefotiam',
    ],
    alias: ['cephalosporine', 'cephalosporines', 'betalactamine', 'betalactamines', 'beta lactamine', 'beta lactamines'],
  },
  carbapenemes: {
    label: 'carbapénèmes',
    molecules: ['*penem'],
    alias: ['carbapeneme', 'carbapenemes', 'betalactamine', 'betalactamines', 'beta lactamine', 'beta lactamines'],
  },
  sulfamides_antibacteriens: {
    label: 'sulfamides antibactériens',
    // sulfasalazine : sulfamide (RCP : contre-indiquée en cas d'hypersensibilité aux sulfamides)
    molecules: ['sulfamethoxazol', 'sulfadiazin', 'sulfafurazol', 'sulfaguanidin', 'sulfacetamid', 'sulfadoxin', 'sulfamethizol', 'cotrimoxazol', 'co trimoxazol', 'sulfasalazin'],
    alias: ['sulfamide', 'sulfamides', 'bactrim'],
  },
  sulfamides_hypoglycemiants: {
    label: 'sulfamides hypoglycémiants',
    molecules: ['glibenclamid', 'gliclazid', 'glimepirid', 'glipizid', 'gliquidon'],
    alias: [],
  },
  diuretiques_sulfamides: {
    label: 'diurétiques sulfamidés',
    // Variantes d'orthographe présentes en base : « chlorthalidone », « hydrochlorthiazide » (sic).
    molecules: ['furosemid', 'bumetanid', 'torasemid', 'torsemid', 'piretanid', 'hydrochlorothiazid', 'hydrochlorthiazid', 'indapamid', 'chlortalidon', 'chlorthalidon', 'xipamid', 'altizid', 'clopamid'],
    alias: [],
  },
  ains: {
    label: 'AINS',
    molecules: [
      'ibuprofen', 'ketoprofen', 'dexketoprofen', 'diclofenac', 'aceclofenac', 'naproxen', 'piroxicam', 'meloxicam',
      'tenoxicam', 'lornoxicam', 'indometacin', 'indomethacin', 'celecoxib', 'etoricoxib', 'parecoxib', 'flurbiprofen',
      'acide niflumique', 'niflumic', 'morniflumat', 'nimesulid', 'etodolac', 'sulindac', 'acide mefenamique', 'mefenamic',
      'ketorolac', 'acide tiaprofenique', 'tiaprofenic', 'fenoprofen', 'nabumeton',
      // Radicaux valables en français, en anglais et en forme inversée (« TIAPROFÉNIQUE (ACIDE) »)
      'tiaprofeni', 'niflumi', 'mefenami', 'phenylbutazon',
    ],
    alias: ['ains', 'anti inflammatoire', 'anti inflammatoires', 'antiinflammatoire', 'antiinflammatoires', 'brufen', 'voltarene', 'profenid', 'advil', 'nurofen'],
  },
  aspirine: {
    label: 'aspirine',
    // « acetilsalicyl » : orthographe fautive présente en base (CARDIOFLEX). Salicylés par
    // voie orale ou buccale : salicylamide, salicylate de choline.
    molecules: ['aspirin', 'acetylsalicyl', 'acide acetylsalicylique', 'acetilsalicyl', 'salicylamid', 'salicylate de choline', 'choline salicylate'],
    alias: ['aas', 'aspegic', 'kardegic', 'widal'],
  },
  macrolides: {
    label: 'macrolides',
    molecules: ['azithromycin', 'clarithromycin', 'erythromycin', 'roxithromycin', 'josamycin', 'spiramycin', 'telithromycin', 'midecamycin'],
    alias: ['macrolide', 'macrolides'],
  },
  quinolones: {
    label: 'quinolones',
    molecules: ['*floxacin', 'acide nalidixique', 'nalidixic', 'acide pipemidique', 'pipemidic', 'flumequin', 'nalidixi', 'pipemidi'],
    alias: ['quinolone', 'quinolones', 'fluoroquinolone', 'fluoroquinolones'],
  },
  opioides: {
    label: 'opioïdes (morphine, codéine et dérivés)',
    molecules: ['codein', 'dihydrocodein', 'morphin', 'ethylmorphin', 'hydromorphon', 'oxycodon', 'pholcodin'],
    alias: ['opioide', 'opioides', 'opiace', 'opiaces', 'morphinique', 'morphiniques'],
  },
};

const BETA = ['penicillines', 'cephalosporines', 'carbapenemes'];
const CONDUITE_MEME = 'Ne pas prescrire. Choisir une alternative hors de cette famille.';
const CONDUITE_CROISEE = "Risque de réaction croisée faible mais réel. Contre-indication absolue en cas d'antécédent d'anaphylaxie. Sinon : évaluer le bénéfice/risque, première prise sous surveillance, avis allergologique si doute. Préciser le type de réaction dans le profil.";
const CONDUITE_CROISEE_ABS = "Antécédent d'anaphylaxie : ne pas prescrire une bêta-lactamine apparentée sans avis allergologique.";
const CONDUITE_AINS = 'Une intolérance limitée à un seul AINS est possible — avis allergologique avant toute réintroduction.';

// Critères : { anaphylaxie: ['oui'] } → la règle ne s'applique que si l'allergie du patient
// porte ce type de réaction. Absent → s'applique toujours. Sévérité la plus haute retenue.
const regles = [];
let ordre = 0;
const add = (r) => { ordre += 10; regles.push({ ordre, criteres: {}, source: SOURCE, ...r }); };

// L0 — allergie saisie par nom (hors familles) retrouvée dans le médicament prescrit.
add({ code: 'L0', famille_allergie: '*', famille_medicament: '*', severite: 'absolue',
  titre: 'Allergie déclarée à ce principe actif', conduite: 'Ne pas prescrire.' });

// L1 / L2 / L9 — même molécule ou même famille.
for (const f of ['penicillines', 'cephalosporines', 'carbapenemes', 'sulfamides_antibacteriens', 'macrolides', 'quinolones', 'opioides']) {
  add({ code: 'L2', famille_allergie: f, famille_medicament: f, severite: 'absolue',
    titre: `Allergie aux ${familles[f].label} — même famille`, conduite: CONDUITE_MEME });
}

// L3 / L4 / L5 — bêta-lactamines : réaction croisée entre familles.
for (const a of BETA) for (const m of BETA) {
  if (a === m) continue;
  const code = (a === 'penicillines' && m === 'cephalosporines') ? 'L3'
    : (a === 'cephalosporines' && m === 'penicillines') ? 'L4' : 'L5';
  add({ code, famille_allergie: a, famille_medicament: m, severite: 'a_evaluer',
    titre: `Allergie aux ${familles[a].label} — réaction croisée possible avec les ${familles[m].label}`, conduite: CONDUITE_CROISEE });
  add({ code: `${code}a`, famille_allergie: a, famille_medicament: m, severite: 'absolue', criteres: { anaphylaxie: ['oui'] },
    titre: `Anaphylaxie aux ${familles[a].label} — contre-indication des ${familles[m].label}`, conduite: CONDUITE_CROISEE_ABS });
}

// L6 / L7 — aspirine et AINS : intolérance croisée, dans les deux sens.
for (const a of ['aspirine', 'ains']) for (const m of ['aspirine', 'ains']) {
  add({ code: a === 'aspirine' ? 'L6' : 'L7', famille_allergie: a, famille_medicament: m, severite: 'absolue',
    titre: a === m
      ? `Allergie ${a === 'ains' ? 'à un AINS' : "à l'aspirine"} — même famille`
      : `Allergie ${a === 'ains' ? 'à un AINS' : "à l'aspirine"} — intolérance croisée (${m === 'ains' ? 'AINS' : 'aspirine'})`,
    conduite: CONDUITE_AINS });
}

// L8 — sulfamides antibactériens → sulfamides non antibactériens : précaution.
for (const m of ['sulfamides_hypoglycemiants', 'diuretiques_sulfamides']) {
  add({ code: 'L8', famille_allergie: 'sulfamides_antibacteriens', famille_medicament: m, severite: 'precaution',
    titre: `Allergie aux sulfamides antibactériens — ${familles[m].label}`,
    conduite: 'Réaction croisée discutée et rare. Prescription possible sous surveillance ; arrêt immédiat en cas de réaction cutanée.' });
}

const familleRows = Object.entries(familles).flatMap(([famille, f]) => [
  ...f.molecules.map(motif => ({ famille, label: f.label, type: 'molecule', motif })),
  ...f.alias.map(motif => ({ famille, label: f.label, type: 'alias', motif })),
]);

writeFileSync(
  new URL('../src/lib/regles_allergies.data.json', import.meta.url),
  JSON.stringify({ familles: familleRows, regles }, null, 2) + '\n',
);

const q = s => `'${String(s).replace(/'/g, "''")}'`;
const FAMS = Object.keys(familles).map(q).join(',');
const sql = `-- Sprint 4e-B — Allergies croisées : canal additionnel du moteur de sécurité.
-- Généré par scripts/gen_regles_allergies.mjs (source unique, partagée avec les tests).
-- La table contraindications et son matching (conditionTerms) ne changent pas.

-- 1. Type de réaction par allergie médicamenteuse (facultatif) :
--    { "<libellé de l'allergie>": "oui" | "non" | "inconnu" } — anaphylaxie.
alter table public.patients add column if not exists allergies_reactions jsonb null;
alter table public.patients drop constraint if exists patients_allergies_reactions_objet;
alter table public.patients add constraint patients_allergies_reactions_objet
  check (allergies_reactions is null or jsonb_typeof(allergies_reactions) = 'object');
comment on column public.patients.allergies_reactions is
  'Sprint 4e-B — anaphylaxie par allergie médicamenteuse : { libellé: oui | non | inconnu }.';

-- 2. Familles : motifs normalisés (minuscules, sans accents). « * » en tête = n'importe où
--    dans le mot ; sinon début de mot. type molecule = médicament + allergie ; alias = allergie.
create table if not exists public.allergie_familles (
  id uuid primary key default gen_random_uuid(),
  famille text not null check (famille in (${FAMS})),
  label text not null,
  type text not null check (type in ('molecule','alias')),
  motif text not null check (length(replace(motif, '*', '')) >= 3 and motif = lower(motif)),
  unique (famille, type, motif)
);

-- 3. Règles (sévérité la plus haute retenue par médicament × allergie).
create table if not exists public.regles_allergies (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  ordre integer not null,
  famille_allergie text not null,
  famille_medicament text not null,
  criteres jsonb not null default '{}'::jsonb check (jsonb_typeof(criteres) = 'object'),
  severite text not null check (severite in ('absolue','a_evaluer','precaution')),
  titre text not null,
  conduite text not null,
  source text not null default 'Proposition Ordosur d''après RCP — à valider',
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  unique (code, famille_allergie, famille_medicament)
);

-- 4. RLS : lecture pour tout utilisateur authentifié, aucune écriture client.
alter table public.allergie_familles enable row level security;
alter table public.regles_allergies enable row level security;
drop policy if exists allergie_familles_read on public.allergie_familles;
create policy allergie_familles_read on public.allergie_familles for select to authenticated using (true);
drop policy if exists regles_allergies_read on public.regles_allergies;
create policy regles_allergies_read on public.regles_allergies for select to authenticated using (true);
revoke insert, update, delete on public.allergie_familles from anon, authenticated;
revoke insert, update, delete on public.regles_allergies from anon, authenticated;

-- 5. Données.
insert into public.allergie_familles (famille, label, type, motif) values
${familleRows.map(r => `  (${q(r.famille)}, ${q(r.label)}, ${q(r.type)}, ${q(r.motif)})`).join(',\n')}
on conflict (famille, type, motif) do nothing;

insert into public.regles_allergies (code, ordre, famille_allergie, famille_medicament, criteres, severite, titre, conduite, source) values
${regles.map(r => `  (${q(r.code)}, ${r.ordre}, ${q(r.famille_allergie)}, ${q(r.famille_medicament)}, ${q(JSON.stringify(r.criteres))}::jsonb, ${q(r.severite)}, ${q(r.titre)}, ${q(r.conduite)}, ${q(r.source)})`).join(',\n')}
on conflict (code, famille_allergie, famille_medicament) do update set
  ordre = excluded.ordre, criteres = excluded.criteres, severite = excluded.severite,
  titre = excluded.titre, conduite = excluded.conduite, source = excluded.source;
`;

// Garde-fou : une migration existante n'est jamais réécrite (scripts/lib/migrationGuard.mjs).
writeNewMigration(new URL('../supabase/migrations/20261011120000_regles_allergies.sql', import.meta.url), sql);
console.log(`${familleRows.length} motifs, ${regles.length} règles`);
