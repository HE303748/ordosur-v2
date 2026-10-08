// Sprint 4e-A — Source unique des données du canal « doublons thérapeutiques ».
// Génère :
//   • src/lib/regles_doublons.data.json  (fixture des tests Vitest)
//   • supabase/migrations/20261013120000_regles_doublons.sql (données en base)
// Usage : node scripts/gen_regles_doublons.mjs
// Le moteur lit ces données EN BASE (doublon_classes / doublon_substances / regles_doublons).

import { writeFileSync } from 'node:fs';

const SOURCE = "Proposition Ordosur d'après RCP — à valider";

// Motifs normalisés (minuscules, sans accents), reconnus en DÉBUT DE MOT dans la DCI, le nom,
// la DCI canonique et les ingrédients. Radicaux valables en français et en anglais.

// ── Classes à risque (D2 : même classe, substances différentes → attention) ──
// Exclus volontairement : antiagrégants (double antiagrégation voulue après un stent),
// inhibiteurs calciques (DHP + non-DHP parfois voulue), anticoagulants et AINS (déjà
// couverts par le cumul de la RPC check_interactions_v2).
const classes = {
  ipp: { label: 'inhibiteurs de la pompe à protons', motifs: ['omeprazol', 'esomeprazol', 'lansoprazol', 'dexlansoprazol', 'pantoprazol', 'rabeprazol'] },
  iec: { label: 'IEC', motifs: ['captopril', 'enalapril', 'lisinopril', 'perindopril', 'ramipril', 'quinapril', 'benazepril', 'fosinopril', 'trandolapril', 'zofenopril', 'cilazapril', 'imidapril', 'moexipril'] },
  ara2: { label: 'ARA2 (sartans)', motifs: ['losartan', 'valsartan', 'irbesartan', 'candesartan', 'telmisartan', 'olmesartan', 'azilsartan', 'eprosartan'] },
  benzodiazepines: { label: 'benzodiazépines et apparentés', motifs: ['diazepam', 'alprazolam', 'lorazepam', 'bromazepam', 'clonazepam', 'oxazepam', 'prazepam', 'nordazepam', 'clorazepat', 'clobazam', 'nitrazepam', 'lormetazepam', 'temazepam', 'midazolam', 'tetrazepam', 'loprazolam', 'estazolam', 'flunitrazepam', 'triazolam', 'chlordiazepoxid', 'zolpidem', 'zopiclon', 'eszopiclon'] },
  statines: { label: 'statines', motifs: ['simvastatin', 'atorvastatin', 'rosuvastatin', 'pravastatin', 'fluvastatin', 'pitavastatin', 'lovastatin'] },
  opioides: { label: 'opioïdes', motifs: ['codein', 'dihydrocodein', 'morphin', 'ethylmorphin', 'tramadol', 'oxycodon', 'hydromorphon', 'fentanyl', 'buprenorphin', 'nalbuphin', 'methadon', 'pethidin', 'tapentadol', 'pholcodin', 'opium'] },
  isrs_irsna: { label: 'antidépresseurs ISRS / IRSNA', motifs: ['fluoxetin', 'paroxetin', 'sertralin', 'citalopram', 'escitalopram', 'fluvoxamin', 'venlafaxin', 'desvenlafaxin', 'duloxetin', 'milnacipran'] },
  sulfamides_hypoglycemiants: { label: 'sulfamides hypoglycémiants', motifs: ['glibenclamid', 'glyburid', 'gliclazid', 'glimepirid', 'glipizid', 'gliquidon'] },
  betabloquants: { label: 'bêtabloquants', motifs: ['atenolol', 'bisoprolol', 'metoprolol', 'propranolol', 'carvedilol', 'nebivolol', 'acebutolol', 'sotalol', 'celiprolol', 'labetalol', 'nadolol', 'betaxolol', 'pindolol', 'esmolol', 'tertatolol', 'timolol'] },
  antihistaminiques_h1_sedatifs: { label: 'antihistaminiques H1 sédatifs', motifs: ['hydroxyzin', 'dexchlorpheniramin', 'chlorphenamin', 'chlorpheniramin', 'brompheniramin', 'pheniramin', 'promethazin', 'alimemazin', 'oxomemazin', 'doxylamin', 'diphenhydramin', 'mequitazin', 'cyproheptadin', 'ketotifen', 'triprolidin', 'clemastin', 'buclizin', 'carbinoxamin'] },
};

// ── Substances : synonymes (français / anglais / dénominations multiples) et adjuvants ──
//   synonyme : plusieurs écritures d'une même substance → une seule clé.
//   adjuvant : substance d'appoint (caféine, vitamine C…) : son doublon est signalé en
//              « attention », sans dérogation (pas un surdosage du principe actif principal).
const substances = {
  paracetamol: { label: 'paracétamol', type: 'synonyme', motifs: ['paracetamol', 'acetaminophen'] },
  aspirine: { label: 'aspirine', type: 'synonyme', motifs: ['aspirin', 'acetylsalicyl', 'acetilsalicyl', 'acide acetylsalicylique'] },
  valproate: { label: 'valproate', type: 'synonyme', motifs: ['valpro', 'divalpro'] },
  salbutamol: { label: 'salbutamol', type: 'synonyme', motifs: ['salbutamol', 'albuterol'] },
  adrenaline: { label: 'adrénaline', type: 'synonyme', motifs: ['adrenalin', 'epinephrin'] },
  noradrenaline: { label: 'noradrénaline', type: 'synonyme', motifs: ['noradrenalin', 'norepinephrin'] },
  glibenclamide: { label: 'glibenclamide', type: 'synonyme', motifs: ['glibenclamid', 'glyburid'] },
  metamizole: { label: 'métamizole', type: 'synonyme', motifs: ['metamizol', 'dipyron', 'noramidopyrin'] },
  ciclosporine: { label: 'ciclosporine', type: 'synonyme', motifs: ['ciclosporin', 'cyclosporin'] },
  rifampicine: { label: 'rifampicine', type: 'synonyme', motifs: ['rifampicin', 'rifampin'] },
  lidocaine: { label: 'lidocaïne', type: 'synonyme', motifs: ['lidocain', 'lignocain'] },
  furosemide: { label: 'furosémide', type: 'synonyme', motifs: ['furosemid', 'frusemid'] },
  pethidine: { label: 'péthidine', type: 'synonyme', motifs: ['pethidin', 'meperidin'] },
  vitamine_d3: { label: 'vitamine D3', type: 'synonyme', motifs: ['colecalciferol', 'cholecalciferol', 'vitamine d3', 'vitamin d3'] },
  levothyroxine: { label: 'lévothyroxine', type: 'synonyme', motifs: ['levothyrox'] },
  aciclovir: { label: 'aciclovir', type: 'synonyme', motifs: ['aciclovir', 'acyclovir'] },
  cefalexine: { label: 'céfalexine', type: 'synonyme', motifs: ['cefalexin', 'cephalexin'] },
  acetylcysteine: { label: 'acétylcystéine', type: 'synonyme', motifs: ['acetylcystein', 'n acetylcystein'] },
  cafeine: { label: 'caféine', type: 'adjuvant', motifs: ['cafein', 'caffein'] },
  vitamine_c: { label: 'vitamine C', type: 'adjuvant', motifs: ['acide ascorbique', 'ascorbic', 'ascorbique', 'vitamine c', 'vitamin c'] },
  menthol: { label: 'menthol', type: 'adjuvant', motifs: ['menthol', 'levomenthol'] },
  camphre: { label: 'camphre', type: 'adjuvant', motifs: ['camphre', 'camphor'] },
  eucalyptus: { label: 'eucalyptus', type: 'adjuvant', motifs: ['eucalypt', 'niaouli', 'cineol'] },
};

const regles = [];
let ordre = 0;
const add = (r) => { ordre += 10; regles.push({ ordre, source: SOURCE, ...r }); };

// D1 — même principe actif dans deux lignes (associations fixes comprises).
add({ code: 'D1', classe_a: '*', classe_b: '*', severite: 'majeure',
  titre: 'Même principe actif', conduite: 'Risque de surdosage. Ne garder qu’une seule spécialité, ou vérifier la dose totale journalière.' });
// D1b — même substance d'appoint (caféine, vitamine C…) : attention, sans dérogation.
add({ code: 'D1b', classe_a: '+', classe_b: '+', severite: 'attention',
  titre: 'Même substance d’appoint', conduite: 'Substance présente dans les deux spécialités : vérifier la dose totale.' });

// D2 — même classe à risque, substances différentes.
const CONDUITES = {
  ipp: 'Association de deux IPP sans bénéfice : n’en garder qu’un.',
  iec: 'Association de deux IEC sans bénéfice : risque d’hypotension, d’hyperkaliémie et d’insuffisance rénale. N’en garder qu’un.',
  ara2: 'Association de deux sartans sans bénéfice : risque d’hypotension, d’hyperkaliémie et d’insuffisance rénale. N’en garder qu’un.',
  benzodiazepines: 'Cumul des effets sédatifs et du risque de dépendance : n’en garder qu’une.',
  statines: 'Association de deux statines sans bénéfice : risque musculaire majoré. N’en garder qu’une.',
  opioides: 'Cumul des effets dépresseurs respiratoires et sédatifs : vérifier que l’association est voulue et la dose totale.',
  isrs_irsna: 'Risque de syndrome sérotoninergique : n’en garder qu’un.',
  sulfamides_hypoglycemiants: 'Association de deux sulfamides hypoglycémiants : risque d’hypoglycémie. N’en garder qu’un.',
  betabloquants: 'Association de deux bêtabloquants : risque de bradycardie et de troubles de la conduction. N’en garder qu’un (collyres compris).',
  antihistaminiques_h1_sedatifs: 'Cumul des effets sédatifs et atropiniques : n’en garder qu’un.',
};
for (const [c, conduite] of Object.entries(CONDUITES)) {
  add({ code: 'D2', classe_a: c, classe_b: c, severite: 'attention',
    titre: `Deux médicaments de la même classe (${classes[c].label})`, conduite });
}
// IEC + ARA2 : double blocage du système rénine-angiotensine.
add({ code: 'D2', classe_a: 'ara2', classe_b: 'iec', severite: 'attention',
  titre: 'Association IEC + ARA2 (double blocage du système rénine-angiotensine)',
  conduite: 'Double blocage déconseillé : risque d’hyperkaliémie, d’hypotension et d’insuffisance rénale. Vérifier que l’association est voulue ; surveillance de la kaliémie et de la créatinine.' });

const classeRows = Object.entries(classes).flatMap(([classe, c]) => c.motifs.map(motif => ({ classe, label: c.label, motif })));
const substanceRows = Object.entries(substances).flatMap(([substance, s]) => s.motifs.map(motif => ({ substance, label: s.label, type: s.type, motif })));

writeFileSync(
  new URL('../src/lib/regles_doublons.data.json', import.meta.url),
  JSON.stringify({ classes: classeRows, substances: substanceRows, regles }, null, 2) + '\n',
);

const q = s => `'${String(s).replace(/'/g, "''")}'`;
const sql = `-- Sprint 4e-A — Doublons thérapeutiques : canal additionnel du moteur de sécurité.
-- Généré par scripts/gen_regles_doublons.mjs (source unique, partagée avec les tests).
-- La RPC check_interactions_v2, la table contraindications et leur matching ne changent pas.

-- 1. Classes à risque : motifs normalisés (minuscules, sans accents), en début de mot.
create table if not exists public.doublon_classes (
  id uuid primary key default gen_random_uuid(),
  classe text not null,
  label text not null,
  motif text not null check (length(motif) >= 3 and motif = lower(motif)),
  unique (classe, motif)
);

-- 2. Substances : synonymes (une seule clé par substance) et adjuvants (caféine, vitamine C…).
create table if not exists public.doublon_substances (
  id uuid primary key default gen_random_uuid(),
  substance text not null,
  label text not null,
  type text not null check (type in ('synonyme','adjuvant')),
  motif text not null check (length(motif) >= 3 and motif = lower(motif)),
  unique (substance, motif)
);

-- 3. Règles. classe « * » = même principe actif ; « + » = même substance d'appoint.
create table if not exists public.regles_doublons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  ordre integer not null,
  classe_a text not null,
  classe_b text not null,
  severite text not null check (severite in ('majeure','attention')),
  titre text not null,
  conduite text not null,
  source text not null default 'Proposition Ordosur d''après RCP — à valider',
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  unique (code, classe_a, classe_b)
);

-- 4. RLS : lecture pour tout utilisateur authentifié, aucune écriture client.
alter table public.doublon_classes enable row level security;
alter table public.doublon_substances enable row level security;
alter table public.regles_doublons enable row level security;
drop policy if exists doublon_classes_read on public.doublon_classes;
create policy doublon_classes_read on public.doublon_classes for select to authenticated using (true);
drop policy if exists doublon_substances_read on public.doublon_substances;
create policy doublon_substances_read on public.doublon_substances for select to authenticated using (true);
drop policy if exists regles_doublons_read on public.regles_doublons;
create policy regles_doublons_read on public.regles_doublons for select to authenticated using (true);
revoke insert, update, delete on public.doublon_classes from anon, authenticated;
revoke insert, update, delete on public.doublon_substances from anon, authenticated;
revoke insert, update, delete on public.regles_doublons from anon, authenticated;

-- 5. Données.
insert into public.doublon_classes (classe, label, motif) values
${classeRows.map(r => `  (${q(r.classe)}, ${q(r.label)}, ${q(r.motif)})`).join(',\n')}
on conflict (classe, motif) do nothing;

insert into public.doublon_substances (substance, label, type, motif) values
${substanceRows.map(r => `  (${q(r.substance)}, ${q(r.label)}, ${q(r.type)}, ${q(r.motif)})`).join(',\n')}
on conflict (substance, motif) do nothing;

insert into public.regles_doublons (code, ordre, classe_a, classe_b, severite, titre, conduite, source) values
${regles.map(r => `  (${q(r.code)}, ${r.ordre}, ${q(r.classe_a)}, ${q(r.classe_b)}, ${q(r.severite)}, ${q(r.titre)}, ${q(r.conduite)}, ${q(r.source)})`).join(',\n')}
on conflict (code, classe_a, classe_b) do update set
  ordre = excluded.ordre, severite = excluded.severite, titre = excluded.titre,
  conduite = excluded.conduite, source = excluded.source;
`;

writeFileSync(new URL('../supabase/migrations/20261013120000_regles_doublons.sql', import.meta.url), sql);
console.log(`${classeRows.length} motifs de classe, ${substanceRows.length} motifs de substance, ${regles.length} règles`);
