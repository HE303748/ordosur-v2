// Sprint BDPM-1, lot G1 — Source unique des corrections critiques du catalogue (fiches MA reliées à une
// autre substance active que celle de la marque) et du synonyme « trauma » de l'ESPT.
// Génère :
//   • src/lib/bdpm1_g1.data.json                                 (fixture des tests Vitest)
//   • supabase/migrations/20261031120000_bdpm1_g1_catalogue.sql   (données en base)
// Usage : node scripts/gen_bdpm1_g1.mjs
//
// Origine : comparaison des fiches MA avec la BDPM (même marque en France), bdpm/contradictions_marques.csv.
// Chaque fiche a été relue avec sa forme, son dosage et son laboratoire : on ne corrige QUE lorsque ces
// indices désignent la substance de la marque (ex. MEDROL 4 mg Pfizer = méthylprednisolone, pas olanzapine).
// Quand ils désignent au contraire la DCI actuelle (le NOM de la fiche est faux), on ne touche à rien :
// voir NON_APPLIQUEES ci-dessous.
// Correction = ajout du bon ingrédient + mise en quarantaine du mauvais lien (mapping_quarantaine,
// motif « BDPM-1 G1 ») — jamais de suppression sèche. La DCI texte est corrigée aussi : les CI, le canal
// rénal et le canal tératogène lisent le texte (CLAUDE.md, Sprint BDD-0).

import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { writeNewMigration } from './lib/migrationGuard.mjs';

const ING = {
  hydrochlorothiazide: '07076f7e-26a3-4286-932a-201894abb400',
  cyclophosphamide: '2182893d-36a8-452f-8695-40df26060328',
  fer: 'dce8fd43-96c6-4020-a392-107642117c7b',
  'acide fusidique': '49356406-d47f-44ab-9e9a-ebaf1100e834',
  hydrocortisone: 'a3c9cb17-6369-4102-b74d-7c7c81f8f8ff',
  rilmenidine: '7addb55b-d696-47a5-9b3c-2706c5a43588',
  ciprofloxacine: '17238269-7635-42c2-946e-7de505d4da64',
  ciprofloxacin: '1b69cef5-3b05-4026-86b7-8d9a49260589',
  'calcium carbonate': '8a9b5ba6-d326-4d85-b17a-da2f94872f7c',
  cholecalciferol: '3db9db92-9181-4d73-b3d3-259498828796',
  trimebutine: '5dcf35db-57a6-4454-adf7-7cafacd79e98',
  sitagliptin: '4ed0a014-31ec-4700-b377-d583fc41d563',
  metformine: '611be1d6-d666-494b-8355-9a9c4ea16619',
  olanzapine: '130b366f-5527-4e29-9a9d-43f137f83334',
  methylprednisolone: 'd9aa2d4b-82cf-43cf-ad28-84f1c0009e6b',
  escitalopram: '53ecb9ff-77bf-427d-bc74-de708583e6b7',
  acebutolol: '34fa1d80-6136-429c-b585-20150a776af5',
  metronidazole: '14abbc09-5fb0-4ef4-b617-8295cae49046',
  tiotropium: 'ffa1ea40-06a9-4c32-af17-e705f455c534',
  tianeptine: '3cf64c16-0209-4656-89e5-d29d2f6a9719',
};

// avant : ingrédients reliés au diagnostic (26/10/2026) · dci : DCI au diagnostic · preuve : pourquoi la marque l'emporte.
const lignes = [
  ...[
    ['65fa1a36-bc52-4c43-8623-3b4e3c6ec875', 'ENDOXAN 1 G / MG SECABLE'],
    ['10a83535-7942-4fa2-9697-495e8b966e8e', 'ENDOXAN 200 MG'],
    ['c20c8949-ce1e-43eb-968a-ff23a06ac173', 'ENDOXAN 200 MG, Poudre pour injectable I.V et perfusion'],
  ].map(([id, nom]) => ({ marque: 'ENDOXAN', id, nom, dci: 'HYDROCHLOROTHIAZIDE MG', dciApres: 'CYCLOPHOSPHAMIDE',
    avant: ['hydrochlorothiazide'], retirer: ['hydrochlorothiazide'], ajouter: ['cyclophosphamide'],
    preuve: 'poudre injectable IV 200 mg / 1 g : cyclophosphamide (l’hydrochlorothiazide n’existe pas sous cette forme)' })),
  { marque: 'FUCIDINE', id: 'd2293d05-525d-4817-9a0f-b3e51c991488', nom: 'FUCIDINE ENFANT', dci: 'FER', dciApres: 'ACIDE FUSIDIQUE',
    avant: ['fer'], retirer: ['fer'], ajouter: ['acide fusidique'], preuve: 'suspension buvable 250 mg / 5 mL : acide fusidique' },
  { marque: 'HYPERIUM', id: '7b04c484-27c3-4be0-a8e0-cf3f891b6a5c', nom: 'HYPERIUM', dci: 'HYDROCORTISONE', dciApres: 'RILMENIDINE',
    avant: ['hydrocortisone'], retirer: ['hydrocortisone'], ajouter: ['rilmenidine'], preuve: 'comprimé 1 mg, Servier : rilménidine' },
  { marque: 'IDEOS', id: '9ab39d64-89f9-4e82-b25a-76332e770839', nom: 'IDEOS', dci: 'CIPROFLOXACINE',
    dciApres: 'CARBONATE DE CALCIUM / CHOLECALCIFEROL', avant: ['ciprofloxacin', 'ciprofloxacine'], retirer: ['ciprofloxacin', 'ciprofloxacine'],
    ajouter: ['calcium carbonate', 'cholecalciferol'], preuve: 'comprimé à croquer 500 mg / 400 UI : calcium + vitamine D3' },
  { marque: 'INFANRIX', id: '4c210c59-d99c-4fa4-9160-ff8b847d0e32', nom: 'INFANRIX HEXA 1 BOITE 1 FLACON', dci: 'TRIMEBUTINE',
    dciApres: 'VACCIN DIPHTERIQUE, TETANIQUE, COQUELUCHEUX ACELLULAIRE, POLIOMYELITIQUE INACTIVE, HEPATITE B ET HAEMOPHILUS INFLUENZAE B',
    avant: ['trimebutine'], retirer: ['trimebutine'], ajouter: [],
    preuve: 'vaccin hexavalent GSK ; aucun ingrédient vaccinal au référentiel : fiche laissée sans ingrédient (signal honnête)' },
  ...[
    ['62553140-49a7-4c54-8606-c8ed1720d398', 'JANUMET 50 / 1000 MG, Comprimé', 'PHOSPHATE DE SITAGLIPTINE MONOHYDRATÉ'],
    ['31ce6392-09c9-494a-8659-7ad9b2222f4d', 'JANUMET 50 / 850 MG, Comprimé', 'PHOSPHATE DE SITAGLIPTINE MONOHYDRATÉ'],
    ['cd1ce7ee-fced-4c17-ab43-2ebd92fb0a31', 'JANUMET COMPRIME PELLICULE à 50 / 1000 1 BOITE 56 COMPR', 'SITAGLIPTINE /'],
  ].map(([id, nom, dci]) => ({ marque: 'JANUMET', id, nom, dci, dciApres: 'SITAGLIPTINE / METFORMINE',
    avant: ['sitagliptin'], retirer: [], ajouter: ['metformine'], preuve: 'association sitagliptine + metformine (50 / 850, 50 / 1000)' })),
  { marque: 'MEDROL', id: '62e69988-fe04-42f6-8f2b-c33ace0bb5f1', nom: 'MEDROL', dci: 'OLANZAPINE', dciApres: 'METHYLPREDNISOLONE',
    avant: ['olanzapine'], retirer: ['olanzapine'], ajouter: ['methylprednisolone'], preuve: 'comprimé sécable 4 mg, Pfizer : méthylprednisolone (l’olanzapine n’existe pas à 4 mg)' },
  { marque: 'SECTRAL', id: '43670d5d-5414-4072-89df-e22e69724fdd', nom: 'SECTRAL', dci: 'ESCITALOPRAM', dciApres: 'ACEBUTOLOL',
    avant: ['escitalopram'], retirer: ['escitalopram'], ajouter: ['acebutolol'], preuve: 'comprimé pelliculé 200 mg : acébutolol (l’escitalopram n’existe pas à 200 mg)' },
  { marque: 'SPIRIVA', id: '36040c36-c101-4b87-8d62-0d8f03c5fec9', nom: 'SPIRIVA 1 BOITE 16 COMPRIME', dci: 'METRONIDAZOLE', dciApres: 'TIOTROPIUM',
    avant: ['metronidazole'], retirer: ['metronidazole'], ajouter: ['tiotropium'], preuve: 'dosage 18 µg : tiotropium (le métronidazole se dose en centaines de mg)' },
  { marque: 'STABLON', id: 'ede0d1dc-f6f2-415f-bc97-da3017d87c41', nom: 'STABLON COMPRIME PELLICULE à 0.75 /', dci: 'TIOTROPIUM', dciApres: 'TIANEPTINE',
    avant: ['tiotropium'], retirer: ['tiotropium'], ajouter: ['tianeptine'], preuve: 'comprimé pelliculé 12,5 mg, Servier : tianeptine' },
];

// Contradictions « critiques » NON corrigées : la forme, le dosage et le laboratoire désignent la DCI actuelle ;
// c'est le nom de marque de la fiche qui est erroné. Relier la substance française créerait l'erreur.
export const NON_APPLIQUEES = [
  { marque: 'ANDROCUR', id: 'e4e67a49-1170-44a7-9b11-5bdb49367bd9', raison: 'comprimé effervescent 1 g, Maphar, classe analgésique : paracétamol (Androcur = cyprotérone 50 mg)' },
  ...['61ad238c-5a0e-46ef-8b3d-40f8d33f6064', '38271b7c-674f-41e2-879f-daf994818621', '8d8794cc-e040-44c1-92ca-96dd50c22991', 'f045c1b9-ff85-4481-bb37-9469e4ccd3cc']
    .map(id => ({ marque: 'ESPERAL', id, raison: 'comprimés pelliculés 25 / 100 / 200 / 300 mg, classe psychiatrie : quétiapine (Esperal = disulfirame 500 mg)' })),
  { marque: 'KEPPRA', id: 'bcf7c203-0fd4-4f8a-823d-e69a6fecbd84', raison: 'poudre pour solution 500 mg, classe céphalosporine : céfotaxime plausible (Keppra IV = solution à diluer) — doute, non tranché' },
  { marque: 'LOCAPRED', id: '9a1a1473-408b-42c4-bbcc-84789b9f7859', raison: 'sachet buvable 100 mg (aspirine) mais classe dermatologie (Locapred = désonide crème) — doute, non tranché' },
];

const SYNONYME = {
  id: 'a01a4c7e-dc9c-4b01-b899-e5daefbd37df', nom: 'État de stress post-traumatique',
  avant: 'ESPT, PTSD, stress post traumatique, trauma', apres: 'ESPT, PTSD, stress post traumatique',
};

// ── Contrôles de la source ──────────────────────────────────────────────────
const idOf = n => { if (!ING[n]) throw new Error(`ingrédient inconnu : ${n}`); return ING[n]; };
const vus = new Set();
for (const l of lignes) {
  if (vus.has(l.id)) throw new Error(`ligne en double : ${l.nom}`);
  vus.add(l.id);
  for (const n of l.retirer) if (!l.avant.includes(n)) throw new Error(`${l.nom} : retrait de « ${n} » non relié`);
  for (const n of l.ajouter) if (l.avant.includes(n)) throw new Error(`${l.nom} : « ${n} » déjà relié`);
  [...l.avant, ...l.ajouter].forEach(idOf);
}
for (const n of NON_APPLIQUEES) if (vus.has(n.id)) throw new Error(`${n.marque} : à la fois corrigée et non appliquée`);

const apres = lignes.map(l => ({
  marque: l.marque, id: l.id, nom: l.nom, preuve: l.preuve,
  dci_avant: l.dci, dci: l.dciApres,
  ingredients_avant: [...l.avant].sort(),
  ingredients: [...l.avant.filter(n => !l.retirer.includes(n)), ...l.ajouter].sort(),
  quarantaine: [...l.retirer].sort(),
}));

const md5 = s => createHash('md5').update(s, 'utf8').digest('hex');
const empreinte = md5([...apres].sort((a, b) => (a.id < b.id ? -1 : 1))
  .map(l => `${l.id}|${l.dci ?? ''}|${l.ingredients.map(idOf).sort().join(',')}`).join('\n'));

writeFileSync(
  new URL('../src/lib/bdpm1_g1.data.json', import.meta.url),
  JSON.stringify({ empreinte, ingredients: ING, lignes: apres, non_appliquees: NON_APPLIQUEES, synonyme: SYNONYME }, null, 2) + '\n',
);

// ── Migration ───────────────────────────────────────────────────────────────
const q = s => (s === null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const MOTIF = l => `BDPM-1 G1 — fiche ${l.marque} : ${l.preuve}`;
const quarantaine = lignes.flatMap(l => l.retirer.map(n => `  ('${l.id}', '${idOf(n)}', ${q(l.nom)}, ${q(l.dci)}, ${q(MOTIF(l))})`));
const retraits = lignes.flatMap(l => l.retirer.map(n => `  ('${l.id}', '${idOf(n)}')`));
const ajouts = lignes.flatMap(l => l.ajouter.map(n => `  ('${l.id}', '${idOf(n)}')`));
const attendu = lignes.map(l => `  ('${l.id}', ${q(l.nom)}, ${q(l.dci)}, ${q([...l.avant].map(idOf).sort().join(','))})`);
const ids = lignes.map(l => `'${l.id}'`).join(', ');

const sql = `-- Sprint BDPM-1, lot G1 — fiches MA reliées à une autre substance que la marque + synonyme « trauma » de l'ESPT.
-- GÉNÉRÉ par scripts/gen_bdpm1_g1.mjs — ne pas modifier à la main.
-- Empreinte de la source : ${empreinte}
--
-- ${lignes.length} fiches : ${retraits.length} liens mis en quarantaine (mapping_quarantaine, motif « BDPM-1 G1 »),
-- ${ajouts.length} liens ajoutés, ${lignes.length} DCI corrigées. ${NON_APPLIQUEES.length} contradictions « critiques » NON corrigées
-- (le nom de la fiche est faux, pas la DCI : voir NON_APPLIQUEES dans le générateur).

-- 1. Garde : la migration ne s'applique que sur l'état lu au diagnostic (sinon tout est annulé).
do $$
declare v_ecarts text;
begin
  select string_agg(a.nom, ' ; ') into v_ecarts
  from (values
${attendu.join(',\n')}
  ) as a(id, nom, dci, ings)
  left join medicaments m on m.id = a.id::uuid and m.pays = 'MA'
  where m.id is null
     or m.nom is distinct from a.nom
     or m.dci is distinct from a.dci
     or coalesce((select string_agg(mi.ingredient_id::text, ',' order by mi.ingredient_id::text collate "C")
                  from medicament_ingredients mi where mi.medicament_id = m.id), '') <> a.ings;
  if v_ecarts is not null then
    raise exception 'BDPM-1 G1 : état de départ inattendu pour : %', v_ecarts;
  end if;
  if not exists (select 1 from pathologies_curees where id = '${SYNONYME.id}' and nom_fr = ${q(SYNONYME.nom)} and synonymes = ${q(SYNONYME.avant)}) then
    raise exception 'BDPM-1 G1 : synonymes de l''ESPT inattendus';
  end if;
end $$;

-- 2. Quarantaine des liens erronés (trace complète, réversible), puis retrait
insert into mapping_quarantaine (medicament_id, ingredient_id, medicament_nom, dci_base, dci_ammps, motif)
select v.medicament_id::uuid, v.ingredient_id::uuid, v.nom, v.dci, null, v.motif
from (values
${quarantaine.join(',\n')}
) as v(medicament_id, ingredient_id, nom, dci, motif);

delete from medicament_ingredients mi
using (values
${retraits.join(',\n')}
) as d(medicament_id, ingredient_id)
where mi.medicament_id = d.medicament_id::uuid and mi.ingredient_id = d.ingredient_id::uuid;

-- 3. Liens ajoutés
insert into medicament_ingredients (medicament_id, ingredient_id)
select v.medicament_id::uuid, v.ingredient_id::uuid
from (values
${ajouts.join(',\n')}
) as v(medicament_id, ingredient_id)
on conflict (medicament_id, ingredient_id) do nothing;

-- 4. DCI corrigées (lues par les canaux CI, rénal et tératogène)
${lignes.map(l => `update medicaments set dci = ${q(l.dciApres)} where id = '${l.id}'; -- ${l.nom}`).join('\n')}

-- 5. Synonyme « trauma » retiré de l'ESPT (un traumatisme physique n'est pas un ESPT)
update pathologies_curees set synonymes = ${q(SYNONYME.apres)}
 where id = '${SYNONYME.id}' and synonymes = ${q(SYNONYME.avant)};

-- Contrôle « base = source » (doit renvoyer l'empreinte ci-dessus) :
--   select md5(string_agg(m.id::text || '|' || coalesce(m.dci, '') || '|' ||
--            coalesce((select string_agg(mi.ingredient_id::text, ',' order by mi.ingredient_id::text collate "C")
--                      from medicament_ingredients mi where mi.medicament_id = m.id), ''),
--            E'\\n' order by m.id::text collate "C"))
--   from medicaments m where m.id in (${ids});
`;

writeNewMigration(new URL('../supabase/migrations/20261031120000_bdpm1_g1_catalogue.sql', import.meta.url), sql);
console.log(`${lignes.length} fiches · quarantaine ${retraits.length} · +${ajouts.length} liens · ${NON_APPLIQUEES.length} non appliquées · empreinte ${empreinte}`);
