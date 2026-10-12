// Sprint BDD-0 — Source unique des correctifs ponctuels de mapping médicament → ingrédients.
// Génère :
//   • src/lib/bdd0_mapping_fixes.data.json                          (fixture des tests Vitest)
//   • supabase/migrations/20261025120000_bdd0_mapping_fixes.sql     (données en base)
// Usage : node scripts/gen_bdd0_mapping_fixes.mjs
//
// Périmètre : erreurs ponctuelles relevées au diagnostic (état « avant » lu en base le 13/10/2026).
// Les jumeaux FR/EN ne sont PAS fusionnés ici (Phase 1) : quand une molécule a deux ingrédients
// (ANSM sur l'un, DDInter sur l'autre), la spécialité est reliée aux deux.
// Règle : ne jamais relier une spécialité à un contre-ion seul (sodium, potassium, calcium,
// magnésium, lysine) quand la DCI désigne un sel d'une autre molécule.
// Aucune ligne de `medicaments` n'est supprimée (des ordonnances y font référence).

import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { writeNewMigration } from './lib/migrationGuard.mjs';

const ING = {
  'sodium': '623e135e-bb05-44ad-82e8-63107e9edaae',
  'calcium': '23c4c366-6864-41b9-8925-436168cc1f65',
  'valproic acid': '46b92d72-da29-4708-aac5-12a4662a8d1a',
  'valproate': 'c1ce864e-971a-44e0-8689-cf6c6317e296',
  'hyaluronic acid': '0010c033-08d9-4603-a7cc-6638453782b6',
  'leucovorin': '87a35c45-adbe-4e6d-a787-240ee0030ed1',
  'acide folinique': 'f320b18e-1a19-4629-906b-62dd12c2654f',
  'clarithromycin': '51e6f7f8-653b-4aae-afd8-620afdca8a65',
  'clarithromycine': '9fba138c-8fb9-48d2-81b8-cc196e87fa1c',
  'octocog alfa': '76689dc4-4a62-4966-80be-03c444970729',
  'hydrochlorothiazide': '07076f7e-26a3-4286-932a-201894abb400',
  'colchicine': 'ea6e9c47-f4af-40b5-852f-1fa1bce695c1',
  'hydrocortisone': 'a3c9cb17-6369-4102-b74d-7c7c81f8f8ff',
  'hydroxycarbamide': '652668a4-4dcd-4271-8592-7696385cf0b8',
  'hydroxyurea': '954ba383-290f-4bbe-be00-53f646b2114b',
  'metformin': '03dea98f-3544-4b29-b419-47bede6553fa',
  'metformine': '611be1d6-d666-494b-8355-9a9c4ea16619',
  'glyburide': '815f6224-56fd-4d92-a98f-1ba05a34ad1a',
  'acarbose': 'a6b93770-8705-4556-972e-8c0d40297911',
  'ibuprofen': '8baf21dd-402d-4ee2-b209-6aea0c78ce79',
  'acetaminophen': '3854d3fd-f876-4bc4-b226-2197277c8faa',
  'codeine': 'e1134133-6c71-44ab-a3ac-69a3806a0daf',
  'codéine': 'a50ec2b3-ec76-4b3b-9b22-cfe2d9844916',
  'medrogestone': '07a55ef8-1b39-40d0-a1bc-395770d42c33',
};

const VALPROATE = ['valproic acid', 'valproate'];
const FOLINATE = ['leucovorin', 'acide folinique'];
const CLARI = ['clarithromycin', 'clarithromycine'];
const METFORMINE = ['metformin', 'metformine'];

// avant : ingrédients reliés au diagnostic · dci : DCI au diagnostic.
// dciApres absent = DCI inchangée · dciApres null = DCI vidée (ligne « non vérifiable », signal honnête).
const lignes = [
  // a — valproate relié au contre-ion
  ...[
    ['4e1c949d-3faf-4a0e-9021-ba6903cd1d50', 'DEPAKINE 500 MG, Comprimé gastro-résistant'],
    ['0ef72794-66f1-4d33-af5f-18c4b6f04e8f', 'DEPAKINE CHRONO 500 MG, Comprimé pelliculé'],
    ['b98668a4-68ae-47d1-9368-84e57e2ca05a', 'DEPAKINE 200 MG / ML, Solution buvable'],
    ['2cbde5c2-a561-4116-9b70-bde57004b289', 'DEPAKINE, Sirop'],
  ].map(([id, nom]) => ({ cas: 'a', id, nom, dci: 'SODIUM (VALPROATE DE)', avant: ['sodium'], retirer: ['sodium'], ajouter: VALPROATE })),

  // b — même bug, autres sels
  { cas: 'b', id: '47b63255-e1d9-43b3-8ea4-8e0ed7f2c757',
    nom: 'HYALGAN 20 MG / 2 ML, Solution Injectable pour usage intra-articulaire en seringue pré-remplie',
    dci: 'SODIUM (HYALURONATE DE)', avant: ['sodium'], retirer: ['sodium'], ajouter: ['hyaluronic acid'] },
  ...[
    ['47838bc8-e444-42f9-91c3-bd32ba0c9976', 'AGUETTANT 100 MG'],
    ['afdf9660-660f-412f-aaa5-15a3399f0740', 'FOLINATE DE CALCIUM AGUETTANT 100 MG, Lyophilisat injectable'],
    ['2894f0a9-4da2-4698-b53d-9ab01c7fef2c', 'FOLINATE DE CALCIUM AGUETTANT 50 MG, Lyophilisat injectable'],
    ['cbca7c8d-abb1-4d5c-aaee-c283556e7760', 'ELVORINE SOLUTION A DILUER POUR 1 BOITE 1 FLACON 4'],
    ['5773dfb6-fb49-4f85-b406-9451871a1e13', 'FOLINATE DE CALCIUM POUDRE POUR SOLUTION 1 BOITE 10 FLACON'],
  ].map(([id, nom]) => ({ cas: 'b', id, nom, dci: 'FOLINATE DE CALCIUM', avant: ['calcium'], retirer: ['calcium'], ajouter: FOLINATE })),
  { cas: 'b', id: '82c4b654-badb-4121-9af8-7a4dbd7e8b6e', nom: 'CAFONATE',
    dci: 'LEUCOVORINE CALCIQUE (FOLINATE DE CALCIUM)', avant: [], retirer: [], ajouter: FOLINATE },
  { cas: 'b', id: 'ef808aea-604a-4f15-940f-5a8e27a18d69', nom: 'LEDERFOLINE TION INJECTABLE à 5 MG 1 BOITE 1 AMPOULE',
    dci: 'FOLINATE DE CALCIUM SOLU', avant: [], retirer: [], ajouter: FOLINATE },
  ...[
    ['41bbdfd4-f8e4-4d6f-9413-f93b3a575288', 'LEDERFOLINE RIME à 5 MG 1 BOITE 20 COMPRIME'],
    ['124b8d40-99b4-4712-a3ba-c097283acb3a', 'LEDERFOLINE RIME SECABLE à 15 MG 1 BOITE 10 COMPRIME'],
    ['7b4b9103-1641-4284-9eaa-30220334b099', 'LEDERFOLINE RIME SECABLE à 25 MG 1 BOITE 6 COMPRIME'],
  ].map(([id, nom]) => ({ cas: 'b', id, nom, dci: 'FOLINATE DE CALCIUM COMP', avant: ['leucovorin'], retirer: [], ajouter: ['acide folinique'] })),

  // c — Kogenate (facteur VIII) relié à la clarithromycine
  ...[
    ['d7d80805-2dc2-42c9-9c2a-32e36e00ad64', 'KOGENATE 1000 UI COMPRIME ENROBE à 250 MG 1 BOITE 12 COMPRIME'],
    ['84e7ba6e-47a9-4611-a565-8312dbbf018b', 'KOGENATE 250 UI ENROBE'],
    ['dd8e9c4d-4c17-41c8-9fc5-8279cad2405e', 'KOGENATE 500 UI'],
  ].map(([id, nom]) => ({ cas: 'c', id, nom, dci: 'CLARITHROMYCINE', dciApres: 'OCTOCOG ALFA', avant: CLARI, retirer: CLARI, ajouter: ['octocog alfa'] })),

  // d — Klonopin : aucune source officielle marocaine, ligne laissée sans ingrédient
  { cas: 'd', id: '8f9a5d06-0fbf-4a9e-bdca-85349041d398', nom: 'KLONOPIN',
    dci: 'CLARITHROMYCINE', dciApres: null, avant: CLARI, retirer: CLARI, ajouter: [] },

  // e — Colchicine MG
  { cas: 'e', id: '33c0c901-0d5f-438a-a5e7-8a18e42ffedd', nom: 'COLCHICINE MG',
    dci: 'HYDROCHLOROTHIAZIDE MG /', dciApres: 'COLCHICINE', avant: ['hydrochlorothiazide'], retirer: ['hydrochlorothiazide'], ajouter: ['colchicine'] },

  // f — Hydrea (hydroxycarbamide : ANSM · hydroxyurea : DDInter)
  { cas: 'f', id: '20580b06-7a4c-4362-a956-fa65d8939b39', nom: 'HYDREA',
    dci: 'HYDROCORTISONE', dciApres: 'HYDROXYCARBAMIDE', avant: ['hydrocortisone'], retirer: ['hydrocortisone'], ajouter: ['hydroxycarbamide', 'hydroxyurea'] },
  { cas: 'f', id: 'cc1e3059-8b30-4dce-8417-a89b2ffad41c', nom: 'HYDREA GELULE à 500 MG 1 BOITE 20 GELULE',
    dci: 'HYDROXYCARBAMIDE', avant: ['hydroxycarbamide'], retirer: [], ajouter: ['hydroxyurea'] },

  // g — Glucophage « Comprimé pelliculé » : metformine (ANSM) manquante
  ...[
    ['35abe92d-1519-4a8b-aed4-b1fb834e47c1', 'GLUCOPHAGE 850 MG, Comprimé pelliculé'],
    ['8f6bb892-eaa1-4067-86d6-3e60bacd6949', 'GLUCOPHAGE 500 MG, Comprimé pelliculé'],
    ['38b5dcdf-fd20-4b59-a856-3a13cd58a3d8', 'GLUCOPHAGE 1000 MG, Comprimé pelliculé'],
  ].map(([id, nom]) => ({ cas: 'g', id, nom, dci: 'CHLORHYDRATE DE METFORMINE', avant: ['metformin'], retirer: [], ajouter: ['metformine'] })),

  // h — Colchicine Cooper sans ingrédient
  { cas: 'h', id: 'd7b5dce9-1233-473b-be9c-ce0ae6e9cc56', nom: 'COLCHICINE COOPER',
    dci: 'COLCHICINE CRISTALLISEE', avant: [], retirer: [], ajouter: ['colchicine'] },

  // A — Glucovance (metformine + glibenclamide) : la DCI est lue par les canaux CI et rénal
  ...[
    ['0f8e8ae8-4e5b-4c5d-bc09-b1d1eb4b5abe', 'GLUCOVANCE 1000 MG / 5 MG, Comprimé pelliculé'],
    ['9709d445-f876-4d5f-adb7-277b2cbf6ace', 'GLUCOVANCE 500 MG / 2.5MG, Comprimé pelliculé'],
    ['53d5c408-873d-49f7-b3ac-3bf739c45bc2', 'GLUCOVANCE 500 MG / 5 MG, Comprimé pelliculé'],
  ].map(([id, nom]) => ({ cas: 'A', id, nom, dci: 'GLIBENCLAMIDE', dciApres: 'METFORMINE / GLIBENCLAMIDE', avant: ['glyburide'], retirer: [], ajouter: METFORMINE })),
  { cas: 'A', id: '7fabccab-b037-4503-b22e-04e741be5323', nom: 'GLUCOVANCE',
    dci: 'ACARBOSE', dciApres: null, avant: ['acarbose'], retirer: ['acarbose'], ajouter: [] },

  // B — No-Dol Codeine (paracétamol + codéine) relié à l'ibuprofène
  { cas: 'B', id: 'e3cec812-660e-40ad-8b39-7ed4c6a5f712', nom: 'NO-DOL CODEINE, Comprimé',
    dci: 'PARACETAMOL // CODEINE', avant: ['ibuprofen'], retirer: ['ibuprofen'], ajouter: ['acetaminophen', 'codeine', 'codéine'] },

  // C — Colprone (médrogestone) : lignes décalées vidées, ligne à DCI correcte reliée
  { cas: 'C', id: 'a024f3dd-8d52-4a04-b3bc-7cbdd1653b0a', nom: 'COLPRONE',
    dci: 'HYDROCHLOROTHIAZIDE MG /', dciApres: null, avant: ['hydrochlorothiazide'], retirer: ['hydrochlorothiazide'], ajouter: [] },
  { cas: 'C', id: '63bf2d33-bf2c-4513-827f-63bfc8bba74c', nom: 'COLPRONE COMPRIME SECABLE à 1 MG SECABLE',
    dci: 'COLCHICINE', dciApres: null, avant: ['colchicine'], retirer: ['colchicine'], ajouter: [] },
  { cas: 'C', id: 'bf742897-eabf-4ad5-88e4-c3edbd37e0cd', nom: 'COLPRONE COMPRIME SECABLE à 400 / 20 1 BOITE 16 COMPRIM',
    dci: 'PARACETAMOL /', dciApres: null, avant: [], retirer: [], ajouter: [] },
  { cas: 'C', id: 'db862c6f-d3d3-4560-87eb-d9d1da8a56b6', nom: 'COLPRONE MG / MG',
    dci: null, avant: ['codeine'], retirer: ['codeine'], ajouter: [] },
  { cas: 'C', id: '1ba2ed59-528d-46ba-b4eb-76b63306796e', nom: 'COLPRONE 1 BOITE 40 COMPRIM',
    dci: 'MEDROGESTONE', avant: ['codeine'], retirer: ['codeine'], ajouter: ['medrogestone'] },
];

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

const apres = lignes.map(l => ({
  cas: l.cas, id: l.id, nom: l.nom,
  dci_avant: l.dci, dci: 'dciApres' in l ? l.dciApres : l.dci,
  ingredients_avant: [...l.avant].sort(),
  ingredients: [...l.avant.filter(n => !l.retirer.includes(n)), ...l.ajouter].sort(),
}));

// Empreinte « base = source » : état attendu des lignes après migration.
const md5 = s => createHash('md5').update(s, 'utf8').digest('hex');
const empreinte = md5([...apres].sort((a, b) => (a.id < b.id ? -1 : 1))
  .map(l => `${l.id}|${l.dci ?? ''}|${l.ingredients.map(idOf).sort().join(',')}`).join('\n'));

writeFileSync(
  new URL('../src/lib/bdd0_mapping_fixes.data.json', import.meta.url),
  JSON.stringify({ empreinte, ingredients: ING, lignes: apres }, null, 2) + '\n',
);

// ── Migration ───────────────────────────────────────────────────────────────
const q = s => (s === null ? 'null' : `'${s.replace(/'/g, "''")}'`);
const deletes = lignes.flatMap(l => l.retirer.map(n => `  ('${l.id}', '${idOf(n)}')`));
const inserts = lignes.flatMap(l => l.ajouter.map(n => `  ('${l.id}', '${idOf(n)}')`));
const updates = lignes.filter(l => 'dciApres' in l && l.dciApres !== l.dci);
const attendu = lignes.map(l => `  ('${l.id}', ${q(l.nom)}, ${q(l.dci)}, ${q([...l.avant].map(idOf).sort().join(','))})`);
const ids = lignes.map(l => `'${l.id}'`).join(',\n    ');

const sql = `-- Sprint BDD-0 — correctifs ponctuels de mapping médicament → ingrédients.
-- GÉNÉRÉ par scripts/gen_bdd0_mapping_fixes.mjs — ne pas modifier à la main.
-- Empreinte de la source : ${empreinte}
--
-- ${lignes.length} spécialités MA : ${deletes.length} liens retirés, ${inserts.length} liens ajoutés, ${updates.length} DCI corrigées.
-- Aucune ligne de medicaments n'est supprimée. Les jumeaux FR/EN ne sont pas fusionnés (Phase 1).

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
    raise exception 'BDD-0 : état de départ inattendu pour : %', v_ecarts;
  end if;
end $$;

-- 2. Liens retirés
delete from medicament_ingredients mi
using (values
${deletes.join(',\n')}
) as d(medicament_id, ingredient_id)
where mi.medicament_id = d.medicament_id::uuid and mi.ingredient_id = d.ingredient_id::uuid;

-- 3. Liens ajoutés
insert into medicament_ingredients (medicament_id, ingredient_id)
select v.medicament_id::uuid, v.ingredient_id::uuid
from (values
${inserts.join(',\n')}
) as v(medicament_id, ingredient_id)
on conflict (medicament_id, ingredient_id) do nothing;

-- 4. DCI corrigées (null = ligne volontairement « non vérifiable »)
${updates.map(l => `update medicaments set dci = ${q(l.dciApres)} where id = '${l.id}'; -- ${l.nom}`).join('\n')}

-- Contrôle « base = source » (doit renvoyer l'empreinte ci-dessus) :
--   select md5(string_agg(m.id::text || '|' || coalesce(m.dci, '') || '|' ||
--            coalesce((select string_agg(mi.ingredient_id::text, ',' order by mi.ingredient_id::text collate "C")
--                      from medicament_ingredients mi where mi.medicament_id = m.id), ''),
--            E'\\n' order by m.id::text collate "C"))
--   from medicaments m where m.id in (
--     ${ids.replace(/\n {4}/g, '\n--     ')});
`;

writeNewMigration(new URL('../supabase/migrations/20261025120000_bdd0_mapping_fixes.sql', import.meta.url), sql);
console.log(`${lignes.length} lignes · -${deletes.length} +${inserts.length} liens · ${updates.length} DCI · empreinte ${empreinte}`);
