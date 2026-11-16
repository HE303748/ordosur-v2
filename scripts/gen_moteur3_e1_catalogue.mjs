// Sprint MOTEUR-3, étape 1 — fiches MA dont la DCI contredit la composition BDPM de la même marque.
// Source unique. Génère :
//   • scripts/data/moteur3_e1.json                                  (décisions + empreinte)
//   • supabase/migrations/20261116200000_moteur3_e1_catalogue.sql   (données en base)
// Usage : node scripts/gen_moteur3_e1_catalogue.mjs
//
// Origine : balayage des 7 642 fiches MA (bdpm/moteur3/scripts/e1_scan_dci.py → scripts/data/moteur3_e1_candidats.json,
// 74 fiches où aucune substance de la DCI n'est commune avec la marque française de même nom). Chaque fiche a été relue
// avec sa forme, son dosage, son laboratoire et son statut (même règle que BDPM-1 G1) :
//   • CORRECTION  : forme / dosage / laboratoire désignent la substance de la marque → la DCI est fausse, on la corrige,
//                   on met en quarantaine les liens erronés (mapping_quarantaine) et on relie le bon ingrédient ;
//   • MASQUAGE    : les indices se contredisent (le NOM de la fiche est peut-être le faux) → fiche masquée, réversible ;
//   • rien        : déjà masquée (BDPM-2a) ou faux positif (DCI tronquée mais juste, vaccin, « marque » = mot générique).
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { writeNewMigration } from './lib/migrationGuard.mjs';

const CANDIDATS = JSON.parse(readFileSync(new URL('./data/moteur3_e1_candidats.json', import.meta.url), 'utf8'));
const ING = {
  cyclophosphamide: '2182893d-36a8-452f-8695-40df26060328', erythromycin: '811894a9-e319-4cef-910f-0874d6869787',
  amlodipine: '10d1b3f7-6c13-4328-a3d0-e08367b6bd46', dexamethasone: 'a8104c9a-8402-4de3-950a-8bd818d98eb3',
  oxaliplatin: '62fd292b-c18b-4193-a977-e6e5a0038f9a', sertraline: '34ff789c-5313-4d38-98c3-7c62bf99447d',
  spiramycine: '14fb45c0-b119-464f-b531-051dbfb93f71', estramustine: '5a3a4872-0b31-4a76-b7d2-0b958cd6ad21',
  'nadroparine calcique': '7bffac60-6bb2-40e2-85f7-ecec96af141d', tinzaparin: 'ed738831-6253-4677-9f11-55be73a33916',
  enoxaparin: 'a81f8752-5c0d-426c-819d-2fb223e62630', fluticasone: '0304a195-ae6a-47f2-b2b6-16fa2a9520dc',
  salmeterol: 'a314eba9-67c1-4e72-a03d-674e1e944193', amisulpride: '790014f4-7651-469a-97f2-06bbde2037be',
  imipenem: 'a8a901ae-d94d-494b-b1d0-528f5fb30efd', cilastatin: 'bf858398-6a72-49ea-94d7-9a3de32c64d4',
  'iron sucrose': '77d7504f-5069-41fd-a389-bf341e48e500', latanoprost: '838c3dd5-3440-407f-9284-580511c9e92b',
  timolol: 'f95d56b7-556e-4e0e-96d6-97e4b1675764', lidocaine: '03046ed3-65bb-4578-9b4b-a80dd1a1454e',
  'acide zoledronique': '198b3755-0e02-46bd-b392-c061a2c0323c', 'beclomethasone dipropionate': 'ff5f0ec1-0d88-452c-9784-5b378d7ad149',
  haloperidol: '6f31eec6-78d8-4c3b-925e-17f50ecb26af',
};
// clé = 8 premiers caractères de l'id (uniques parmi les 74 candidats, contrôlé ci-dessous).
// avant = ingrédients reliés au diagnostic (2026-11-16) ; retirer ⊆ avant.
const CORRECTIONS = {
  ec208df8: { dci: 'VACCIN DE L\'HEPATITE B (ANTIGENE HBs RECOMBINANT)', avant: ['cyclophosphamide'], retirer: ['cyclophosphamide'], ajouter: [],
    preuve: 'ENGERIX-B adulte, boîte de 10 flacons : vaccin de l’hépatite B ; aucun ingrédient vaccinal au référentiel, fiche laissée sans ingrédient' },
  a0e056c8: { dci: 'ESTRAMUSTINE', avant: ['erythromycin'], retirer: ['erythromycin'], ajouter: ['estramustine'], preuve: 'gélule 140 mg, Pfizer : estramustine (l’érythromycine n’existe pas à 140 mg)' },
  '029360f4': { dci: 'NADROPARINE CALCIQUE', avant: [], retirer: [], ajouter: ['nadroparine calcique'], preuve: 'solution injectable 11 400 UI anti-Xa : nadroparine (l’acide fusidique ne se dose pas en UI anti-Xa)' },
  '82b091bb': { dci: 'TINZAPARINE SODIQUE', avant: ['amlodipine'], retirer: ['amlodipine'], ajouter: ['tinzaparin'], preuve: '10 000 UI anti-Xa, boîte de 2 seringues : tinzaparine' },
  '8701b45e': { dci: 'ENOXAPARINE SODIQUE', avant: [], retirer: [], ajouter: ['enoxaparin'], preuve: 'solution injectable 4 000 UI anti-Xa, Sanofi : énoxaparine (le losartan est un comprimé)' },
  '90118027': { dci: 'FLUTICASONE / SALMETEROL', avant: [], retirer: [], ajouter: ['fluticasone', 'salmeterol'], preuve: 'suspension pour inhalation 50 µg / 25 µg, GSK : fluticasone + salmétérol (la fluoxétine ne s’inhale pas)' },
  '82c5dcf8': { dci: 'AMISULPRIDE', avant: [], retirer: [], ajouter: ['amisulpride'], preuve: 'comprimé pelliculé 200 mg, Sanofi : amisulpride (l’indapamide ne dépasse pas 2,5 mg)' },
  '65fad93e': { dci: 'AMISULPRIDE', avant: [], retirer: [], ajouter: ['amisulpride'], preuve: '200 mg, Sanofi : amisulpride (l’indapamide ne dépasse pas 2,5 mg)' },
  '617eec75': { dci: 'IMIPENEME / CILASTATINE', avant: [], retirer: [], ajouter: ['imipenem', 'cilastatin'], preuve: 'poudre pour perfusion 500 mg, MSD : imipénème + cilastatine' },
  '6ddb8afa': { dci: 'FER (COMPLEXE D\'HYDROXYDE FERRIQUE - SACCHAROSE)', avant: [], retirer: [], ajouter: ['iron sucrose'], preuve: 'solution injectable IV 100 mg / 5 mL de fer : fer saccharose (la venlafaxine n’est pas injectable)' },
  '7a36b36c': { dci: 'LATANOPROST / TIMOLOL', avant: [], retirer: [], ajouter: ['latanoprost', 'timolol'], preuve: 'collyre 50 µg / 5 mg par mL, flacon de 2,5 mL : latanoprost + timolol (le célécoxib n’existe pas en collyre)' },
  '730e2d1d': { dci: 'LIDOCAINE', avant: ['oxaliplatin'], retirer: ['oxaliplatin'], ajouter: ['lidocaine'], preuve: 'gel à 2 % : lidocaïne (l’oxaliplatine est une solution pour perfusion)' },
  '05f2657b': { dci: 'ACIDE ZOLEDRONIQUE', avant: ['sertraline'], retirer: ['sertraline'], ajouter: ['acide zoledronique'], preuve: 'solution pour perfusion 4 mg, Novartis : acide zolédronique' },
  '448e9d76': { dci: 'BECLOMETASONE', avant: ['dexamethasone'], retirer: ['dexamethasone'], ajouter: ['beclomethasone dipropionate'], preuve: 'flacon de 200 doses : béclométasone (la dexaméthasone n’existe pas en flacon doseur)' },
  '1fe76b27': { dci: 'HALOPERIDOL', avant: [], retirer: [], ajouter: ['haloperidol'], preuve: 'solution buvable à 2 mg : halopéridol (la DCI « MODIFIEE » est un reste de « gélatine fluide modifiée »)' },
  '4284db0c': { dci: 'SPIRAMYCINE', avant: ['spiramycine'], retirer: [], ajouter: [], preuve: 'lyophilisat 1,5 MUI, Maphar : spiramycine injectable (déjà reliée ; seule la DCI « VACCIN » était fausse)' },
};
const MASQUAGES = {
  '1f7564f4': 'ACTONEL (risédronate, comprimé) avec une forme de vaccin (seringue 0,5 mL) et la DCI « VACCIN ANTI- »',
  edec608a: 'DUPHASTON (dydrogestérone 10 mg) avec la forme 150 / 300 et la DCI de la lamivudine / zidovudine',
  d309f254: 'ESTRACYT (estramustine, gélule 140 mg) avec une forme buvable 500 mg et la DCI érythromycine',
  f2f1ff79: 'ESTRACYT (estramustine, gélule 140 mg) avec un comprimé 500 mg et la DCI érythromycine',
  '09c6cce4': 'ESTRACYT (estramustine, gélule) avec un granulé pour solution et la DCI érythromycine',
  '0eb549bc': 'ESTRACYT (estramustine) avec un comprimé sécable 25 mg et la DCI hydrochlorothiazide',
  '0865be31': 'LEDERFOLINE (folinate, 5 à 25 mg) avec un comprimé sécable 500 mg et la DCI furosémide',
  cbfba396: 'LOVENOX (énoxaparine injectable) avec la forme « comprimé pelliculé sécable » et la DCI losartan',
  '7c123280': 'LOVENOX (énoxaparine injectable) avec la forme « comprimé pelliculé sécable » et la DCI losartan',
  aa2617a8: 'LOVENOX (énoxaparine injectable) avec un comprimé pelliculé 100 mg et la DCI losartan',
  '97f45ae7': 'LOVENOX (énoxaparine injectable) avec un comprimé pelliculé 50 mg et la DCI losartan',
  dee2a851: 'PREVENAR 13 (vaccin) avec un comprimé pelliculé et la DCI indapamide',
  '329fd014': 'PROZAC (fluoxétine 20 mg) avec une forme buvable 2 g et la DCI strontium',
  c50f6b87: 'ZOMIG (zolmitriptan 2,5 mg, comprimé) avec une solution à diluer pour perfusion et la DCI acide zolédronique',
  '74810e82': 'ANCOTIL (flucytosine) avec la DCI hydrochlorothiazide, forme tronquée',
  e828768a: 'AUGMENTIN (amoxicilline + acide clavulanique) avec une forme pour nébuliseur 0,5 mg / 2 mL et la DCI ipratropium',
  '3e389031': 'BACTRIM (sulfaméthoxazole + triméthoprime) avec la DCI ciprofloxacine, forme tronquée',
  '1ef0da7a': 'BICNU (carmustine) avec un soluté concentré en bidon de 10 L (dialyse)',
  fa38edaf: 'BREXIN (piroxicam) avec une perfusion à 6 mg et la DCI acide ibandronique',
  e436db48: 'HALDOL FORT (halopéridol) avec une solution pour perfusion et la DCI gélatine fluide',
  f3a750f0: 'INDOBIOTIC (indométacine + gentamicine, collyre) avec une suspension pour inhalation et la DCI salbutamol',
  '0e17cd61': 'NOZINAN (lévomépromazine) avec la DCI eptacog alpha activé',
  '4091c595': 'RISORDAN (isosorbide dinitrate) avec une forme auriculaire en MUI et la DCI rifamycine',
  aa362657: 'TERLOMEXIN (fenticonazole) avec la DCI immunoglobuline, forme tronquée',
  '16aa6534': 'VISKEN QUINZE (pindolol 15 mg) avec la DCI salbutamol, sans forme ni dosage pour trancher',
  '653e7cd7': 'nom d’un soluté de dialyse (ACETATE EM 142) avec un comprimé 4 / 1,25 mg et la DCI indapamide',
};
const DEJA_MASQUEES = ['e4e67a49', '61ad238c', '38271b7c', '8d8794cc', 'f045c1b9', 'ca8625d8', 'bcf7c203', '9a1a1473'];

// ── Contrôles de la source ──────────────────────────────────────────────────
const par8 = new Map();
for (const c of CANDIDATS) { const k = c.medicament_id.slice(0, 8); if (par8.has(k)) throw new Error('préfixe en double ' + k); par8.set(k, c); }
const idOf = n => { if (!ING[n]) throw new Error(`ingrédient inconnu : ${n}`); return ING[n]; };
for (const k of [...Object.keys(CORRECTIONS), ...Object.keys(MASQUAGES), ...DEJA_MASQUEES]) if (!par8.has(k)) throw new Error('fiche hors candidats : ' + k);
for (const k of Object.keys(CORRECTIONS)) if (MASQUAGES[k]) throw new Error('corrigée ET masquée : ' + k);
for (const [k, c] of Object.entries(CORRECTIONS)) {
  for (const n of c.retirer) if (!c.avant.includes(n)) throw new Error(`${k} : retrait de « ${n} » non relié`);
  for (const n of c.ajouter) if (c.avant.includes(n)) throw new Error(`${k} : « ${n} » déjà relié`);
  [...c.avant, ...c.ajouter].forEach(idOf);
}
for (const k of DEJA_MASQUEES) if (par8.get(k).masque !== 'masquée') throw new Error('non masquée au diagnostic : ' + k);

const corr = Object.entries(CORRECTIONS).map(([k, c]) => {
  const f = par8.get(k);
  return { id: f.medicament_id, nom: f.nom, marque: f.marque, dci_avant: f.dci, dci: c.dci, preuve: c.preuve,
    avant: c.avant.map(idOf).sort(), retirer: c.retirer.map(idOf).sort(), ajouter: c.ajouter.map(idOf).sort(),
    ingredients: [...c.avant.filter(n => !c.retirer.includes(n)), ...c.ajouter].map(idOf).sort() };
});
const masq = Object.entries(MASQUAGES).map(([k, detail]) => {
  const f = par8.get(k);
  return { id: f.medicament_id, nom: f.nom, marque: f.marque, dci: f.dci, motif: `MOTEUR-3 — marque et DCI contradictoires, non tranché : ${detail}` };
});
const faux = CANDIDATS.filter(c => { const k = c.medicament_id.slice(0, 8); return !CORRECTIONS[k] && !MASQUAGES[k] && !DEJA_MASQUEES.includes(k); })
  .map(c => ({ id: c.medicament_id, nom: c.nom, dci: c.dci, marque: c.marque }));

const md5 = s => createHash('md5').update(s, 'utf8').digest('hex');
// état final attendu : id | dci | masque | ingrédients
const lignesEmp = [
  ...corr.map(l => `${l.id}|${l.dci}|false|${l.ingredients.join(',')}`),
  ...masq.map(l => `${l.id}|${l.dci}|true|`),
].sort();
const empreinte = md5(lignesEmp.join('\n'));
writeFileSync(new URL('./data/moteur3_e1.json', import.meta.url),
  JSON.stringify({ empreinte, corrections: corr, masquages: masq, deja_masquees: DEJA_MASQUEES, faux_positifs: faux }, null, 1) + '\n');

// ── Migration ───────────────────────────────────────────────────────────────
const q = s => (s === null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const attendu = [
  ...corr.map(l => `  ('${l.id}', ${q(l.nom)}, ${q(l.dci_avant)}, ${q(l.avant.join(','))}, 'c')`),
  ...masq.map(l => `  ('${l.id}', ${q(l.nom)}, ${q(l.dci)}, null, 'm')`),
];
const quarantaine = corr.flatMap(l => l.retirer.map(i => `  ('${l.id}', '${i}', ${q(l.nom)}, ${q(l.dci_avant)}, ${q(`MOTEUR-3 E1 — fiche ${l.marque} : ${l.preuve}`)})`));
const retraits = corr.flatMap(l => l.retirer.map(i => `  ('${l.id}', '${i}')`));
const ajouts = corr.flatMap(l => l.ajouter.map(i => `  ('${l.id}', '${i}')`));
const tous = [...corr, ...masq].map(l => `'${l.id}'`).join(', ');

const sql = `-- Sprint MOTEUR-3, étape 1 — fiches MA dont la DCI contredit la composition BDPM de la même marque.
-- GÉNÉRÉ par scripts/gen_moteur3_e1_catalogue.mjs — ne pas modifier à la main.
-- Empreinte de la source (état final attendu : id | dci | masque | ingrédients) : ${empreinte}
--
-- ${corr.length} fiches corrigées (${retraits.length} liens mis en quarantaine, ${ajouts.length} liens ajoutés, ${corr.length} DCI corrigées),
-- ${masq.length} fiches masquées (réversible : masque = false + motif_masquage = null).

-- 1. Garde : la migration ne s'applique que sur l'état lu au diagnostic (2026-11-16), sinon tout est annulé.
do $$
declare v_ecarts text;
begin
  select string_agg(a.nom, ' ; ') into v_ecarts
  from (values
${attendu.join(',\n')}
  ) as a(id, nom, dci, ings, sorte)
  left join medicaments m on m.id = a.id::uuid and m.pays = 'MA'
  where m.id is null
     or m.nom is distinct from a.nom
     or m.dci is distinct from a.dci
     or m.masque
     or (a.sorte = 'c' and coalesce((select string_agg(mi.ingredient_id::text, ',' order by mi.ingredient_id::text collate "C")
                  from medicament_ingredients mi where mi.medicament_id = m.id), '') <> a.ings);
  if v_ecarts is not null then
    raise exception 'MOTEUR-3 E1 : état de départ inattendu pour : %', v_ecarts;
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
${corr.map(l => `update medicaments set dci = ${q(l.dci)} where id = '${l.id}'; -- ${l.nom} (était : ${l.dci_avant})`).join('\n')}

-- 5. Fiches masquées (exclues des recherches, jamais supprimées)
${masq.map(l => `update medicaments set masque = true, motif_masquage = ${q(l.motif)} where id = '${l.id}'; -- ${l.nom}`).join('\n')}

-- 6. Contrôle « base = source » : toute différence annule la migration.
do $$
declare v text;
begin
  select md5(string_agg(m.id::text || '|' || coalesce(m.dci, '') || '|' || m.masque::text || '|' ||
           case when m.masque then '' else coalesce((select string_agg(mi.ingredient_id::text, ',' order by mi.ingredient_id::text collate "C")
                     from medicament_ingredients mi where mi.medicament_id = m.id), '') end,
           E'\\n' order by m.id::text collate "C")) into v
  from medicaments m where m.id in (${tous});
  if v is distinct from '${empreinte}' then
    raise exception 'MOTEUR-3 E1 : empreinte base % <> source ${empreinte}', v;
  end if;
end $$;
`;
writeNewMigration(new URL('../supabase/migrations/20261116200000_moteur3_e1_catalogue.sql', import.meta.url), sql);
console.log(`${corr.length} corrections · quarantaine ${retraits.length} · +${ajouts.length} liens · ${masq.length} masquages · ${DEJA_MASQUEES.length} déjà masquées · ${faux.length} faux positifs · empreinte ${empreinte}`);
