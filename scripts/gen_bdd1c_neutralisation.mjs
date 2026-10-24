// Sprint BDD-1c — Source unique : sels regroupés + neutralisation des « contre-indications » contradictoires du
// second import DDInter + mise en revue des lignes du même gabarit sur les sels regroupés.
// Génère :
//   • src/lib/bdd1c_neutralisation.data.json                              (fixture des tests Vitest)
//   • supabase/migrations/20261029120000_bdd1c_sels_neutralisation.sql    (migration atomique)
// Usage : node scripts/gen_bdd1c_neutralisation.mjs
//
// Le second import DDInter se reconnaît à sa description « A × B — Contre-indication : association déconseillée
// (risque grave documenté). » (115 lignes contre_indication). Il contredit le DDInter d'origine et l'ANSM
// (ex. CLAMOXYL + EZIUM, trithérapie anti-H. pylori, en « Prescription à risque »). Rapport et classement :
// ../sprint2b/revue/bdd1c_second_import.csv.
//
// Ordre de la migration (une seule transaction) :
//   1. état de départ vérifié ;
//   2. regroupement des sels (esomeprazole magnesium [dihydrate] → esomeprazole, vardenafil trihydrate →
//      vardenafil, clopidogrel bisulfate → clopidogrel) ; empreinte du référentiel COMPLET (BDD-1 + BDD-1c) ;
//   3. colonne interactions_ingredients.exclue_motif (NULL = active) ; RPC et vue l'ignorent quand non NULL ;
//   4. lignes du gabarit « A × B — … » (hors contre-indication) sur les sels regroupés → revue_requise : elles
//      restent comparées sur leurs liens directs (aucune carte perdue) et ne se propagent pas au groupe ;
//   5. neutralisation : lignes C1 (contredites, recalculées APRÈS regroupement) + 2 lignes amoxicilline nommées.
//      Garde-fou strict : la source déclarée (DDInter d'origine et/ou ANSM) couvre réellement la même paire
//      canonique, aucune autre source ne la confirme en contre-indication ; sinon la migration échoue.
// Rien n'est supprimé ; sévérités et descriptions inchangées. Réversible :
//   update interactions_ingredients set exclue_motif = null where exclue_motif like '% — BDD-1c';

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { writeNewMigration } from './lib/migrationGuard.mjs';

const bdd1 = JSON.parse(readFileSync(new URL('../src/lib/bdd1_equivalences.data.json', import.meta.url), 'utf8'));
const BDD1_MIGRATION = readFileSync(new URL('../supabase/migrations/20261026120000_bdd1_equivalences.sql', import.meta.url), 'utf8');

// [canonique, [membres], justification] — sels d'une même molécule, aux lignes DDInter contradictoires.
const GROUPES_SELS = [
  ['esomeprazole', ['esomeprazole magnesium', 'esomeprazole magnesium dihydrate'], 'Même molécule (S-oméprazole), sel de magnésium / hydrate'],
  ['vardenafil', ['vardenafil trihydrate'], 'Même molécule, hydrate'],
  ['clopidogrel', ['clopidogrel bisulfate'], 'Même molécule, sel (hydrogénosulfate)'],
];

// Lignes du second import (gabarit « A × B — … », hors contre-indication) sur les sels regroupés : mises en revue.
const REVUE = [
  ['antacids', 'vardenafil trihydrate'], ['aspirin', 'vardenafil trihydrate'], ['clopidogrel bisulfate', 'lansoprazole'],
  ['clopidogrel bisulfate', 'warfarin'], ['dabigatran', 'vardenafil trihydrate'],
  ['esomeprazole magnesium', 'atazanavir'], ['esomeprazole magnesium', 'citalopram'], ['esomeprazole magnesium', 'clopidogrel'],
  ['esomeprazole magnesium', 'digoxin'], ['esomeprazole magnesium', 'itraconazole'], ['esomeprazole magnesium', 'methotrexate'],
  ['esomeprazole magnesium', 'mycophenolate'], ['esomeprazole magnesium', 'ritonavir'], ['esomeprazole magnesium', 'tacrolimus'],
  ['esomeprazole magnesium', 'warfarin'],
  ['esomeprazole magnesium dihydrate', 'atazanavir'], ['esomeprazole magnesium dihydrate', 'citalopram'],
  ['esomeprazole magnesium dihydrate', 'clopidogrel'], ['esomeprazole magnesium dihydrate', 'digoxin'],
  ['esomeprazole magnesium dihydrate', 'itraconazole'], ['esomeprazole magnesium dihydrate', 'methotrexate'],
  ['esomeprazole magnesium dihydrate', 'mycophenolate'], ['esomeprazole magnesium dihydrate', 'ritonavir'],
  ['esomeprazole magnesium dihydrate', 'tacrolimus'], ['esomeprazole magnesium dihydrate', 'warfarin'],
  ['insulin', 'vardenafil trihydrate'], ['iron', 'esomeprazole magnesium'], ['iron', 'esomeprazole magnesium dihydrate'],
  ['ketoconazole', 'esomeprazole magnesium'], ['ketoconazole', 'esomeprazole magnesium dihydrate'],
  ['magnesium', 'vardenafil trihydrate'], ['morphine', 'clopidogrel bisulfate'], ['nifedipine', 'vardenafil trihydrate'],
  ['nitroglycerin', 'vardenafil trihydrate'], ['pantoprazole', 'clopidogrel bisulfate'], ['ranitidine', 'vardenafil trihydrate'],
  ['rifampin', 'clopidogrel bisulfate'], ['tamsulosin', 'vardenafil trihydrate'], ['vardenafil trihydrate', 'alcohol'],
  ['vardenafil trihydrate', 'cimetidine'], ['vardenafil trihydrate', 'digoxin'], ['vardenafil trihydrate', 'warfarin'],
  ['voriconazole', 'esomeprazole magnesium'], ['voriconazole', 'esomeprazole magnesium dihydrate'],
];
const REVUE_AVANT = 68; // BDD-1 (53) + BDD-1b (15)

// Neutralisation. src : 'orig' = DDInter d'origine, 'ansm' = ANSM, 'orig+ansm' = les deux ; 'rcp' = garde-fou assoupli.
const NEUTRALISER = [
  ['alcohol', 'sodium oxybate', 'orig'], ['alcohol', 'trimethobenzamide', 'orig'],
  ['clopidogrel bisulfate', 'esomeprazole', 'orig'], ['clopidogrel bisulfate', 'omeprazole', 'orig'],
  ['efavirenz', 'rifampin', 'ansm'], ['efavirenz', 'voriconazole', 'ansm'], ['escitalopram', 'linezolid', 'ansm'],
  ['esomeprazole magnesium', 'clarithromycin', 'orig'], ['esomeprazole magnesium', 'rifampin', 'orig'],
  ['esomeprazole magnesium dihydrate', 'clarithromycin', 'orig'], ['esomeprazole magnesium dihydrate', 'rifampin', 'orig'],
  ['itraconazole', 'rifampin', 'ansm'], ['ketoconazole', 'rifampin', 'orig+ansm'],
  ['linezolid', 'paroxetine', 'ansm'], ['linezolid', 'venlafaxine', 'ansm'],
  ['ranolazine', 'carbamazepine', 'ansm'], ['ranolazine', 'phenobarbital', 'ansm'], ['ranolazine', 'phenytoin', 'ansm'],
  ['ranolazine', 'rifampin', 'ansm'],
  ['rifampin', 'clopidogrel', 'orig'], ['rifampin', 'haloperidol', 'ansm'], ['rifampin', 'lansoprazole', 'orig'],
  ['rifampin', 'omeprazole', 'orig'], ['rifampin', 'theophylline', 'orig+ansm'], ['rifampin', 'ticagrelor', 'orig+ansm'],
  ['rifampin', 'warfarin', 'orig+ansm'], ['sertraline', 'linezolid', 'ansm'], ["st. john's wort", 'lansoprazole', 'orig+ansm'],
  ['voriconazole', 'ritonavir', 'ansm'],
  // Garde-fou assoupli, nommément : aucune ligne amoxicilline × ésoméprazole n'existe ; la trithérapie est l'indication.
  ['amoxicillin', 'esomeprazole magnesium', 'rcp'], ['amoxicillin', 'esomeprazole magnesium dihydrate', 'rcp'],
];
const LIBELLE = { orig: "DDInter d'origine", ansm: 'ANSM', 'orig+ansm': "DDInter d'origine + ANSM" };
const motifDe = src => src === 'rcp'
  ? "Contredit par le RCP de l'ésoméprazole (indication éradication H. pylori en association avec amoxicilline) et par DDInter d'origine sur les autres IPP — BDD-1c"
  : `Second import DDInter contredit par ${LIBELLE[src]} — BDD-1c`;

// ── Contrôles de la source ──────────────────────────────────────────────────
const octets = (a, b) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
const md5 = s => createHash('md5').update(s, 'utf8').digest('hex');
const paire = (a, b) => (octets(a, b) <= 0 ? `${a}|${b}` : `${b}|${a}`);

const canoniqueDe = new Map();
for (const g of bdd1.groupes) for (const n of [g.canonique, ...g.membres]) canoniqueDe.set(n, g.canonique);
for (const [canon, membres] of GROUPES_SELS) {
  for (const n of [canon, ...membres]) {
    if (canoniqueDe.has(n)) throw new Error(`« ${n} » est déjà groupé (${canoniqueDe.get(n)})`);
    canoniqueDe.set(n, canon);
  }
}
for (const [a, b] of bdd1.interdits) {
  if (canoniqueDe.has(a) && canoniqueDe.get(a) === canoniqueDe.get(b)) throw new Error(`paire interdite réunie : ${a} / ${b}`);
}
const empreinteReferentiel = md5([...canoniqueDe].sort((x, y) => octets(x[0], y[0])).map(([n, c]) => `${n}|${c}`).join('\n'));

const sels = new Set(GROUPES_SELS.flatMap(([, m]) => m));
const revueCles = REVUE.map(([a, b]) => paire(a, b));
const neutCles = NEUTRALISER.map(([a, b]) => paire(a, b));
if (new Set(revueCles).size !== REVUE.length) throw new Error('doublon dans REVUE');
if (new Set(neutCles).size !== NEUTRALISER.length) throw new Error('doublon dans NEUTRALISER');
if (revueCles.some(k => neutCles.includes(k))) throw new Error('une ligne est à la fois mise en revue et neutralisée');
for (const [a, b] of REVUE) if (!sels.has(a) && !sels.has(b)) throw new Error(`revue hors sels regroupés : ${a} × ${b}`);
if (NEUTRALISER.filter(x => x[2] === 'rcp').length !== 2) throw new Error('exactement 2 lignes au garde-fou assoupli');
for (const [a, b] of [...REVUE, ...NEUTRALISER]) if (/[$]/.test(a + b)) throw new Error(`caractère réservé : ${a} / ${b}`);

const neut = NEUTRALISER.map(([a, b, src]) => ({ a, b, src, motif: motifDe(src) }));
const empreinteNeut = md5(neut.map(x => `${paire(x.a, x.b)}|${x.motif}`).sort(octets).join('\n'));
const empreinteRevue = md5([...revueCles].sort(octets).join('\n'));

writeFileSync(new URL('../src/lib/bdd1c_neutralisation.data.json', import.meta.url), JSON.stringify({
  _genere_par: 'scripts/gen_bdd1c_neutralisation.mjs',
  empreinte_referentiel: empreinteReferentiel,
  empreinte_neutralisation: empreinteNeut,
  empreinte_revue: empreinteRevue,
  revue_avant: REVUE_AVANT,
  revue_apres: REVUE_AVANT + REVUE.length,
  groupes_sels: GROUPES_SELS.map(([canonique, membres, justification]) => ({ canonique, membres, justification })),
  revue: REVUE.map(([a, b]) => ({ a, b })),
  neutralisation: neut,
}, null, 2) + '\n');

// ── RPC et vue : texte appliqué par BDD-1, une seule clause ajoutée ─────────
const extrait = (debut, fin) => {
  const i = BDD1_MIGRATION.indexOf(debut), j = BDD1_MIGRATION.indexOf(fin, i);
  if (i < 0 || j < 0) throw new Error(`extrait introuvable : ${debut}`);
  return BDD1_MIGRATION.slice(i, j + fin.length);
};
const remplaceUneFois = (txt, avant, apres) => {
  if (txt.split(avant).length !== 2) throw new Error(`motif non unique : ${avant}`);
  return txt.replace(avant, apres);
};
const rpc = remplaceUneFois(
  extrait('create or replace function public.check_interactions_v2(p_med_ids uuid[])', '$function$;'),
  '    WHERE NOT ii.revue_requise OR (a.direct AND b.direct)\n',
  '    WHERE ii.exclue_motif IS NULL\n      AND (NOT ii.revue_requise OR (a.direct AND b.direct))\n',
);
const vue = remplaceUneFois(
  extrait('create or replace view v_ingredient_parlant as', '\n);\n'),
  '      or exists (select 1 from interactions_ingredients ii where ii.ingredient_1 = g.id or ii.ingredient_2 = g.id)\n',
  '      or exists (select 1 from interactions_ingredients ii\n                 where (ii.ingredient_1 = g.id or ii.ingredient_2 = g.id) and ii.exclue_motif is null)\n',
);

const q = s => `'${s.replace(/'/g, "''")}'`;
const LOT = `' × .* — Contre-indication : association déconseillée \\(risque grave documenté\\)\\.$'`;
const ORIG = `'^(Interaction (majeure|modérée|mineure) |Interaction entre )'`;
const nomsSels = GROUPES_SELS.flatMap(([c, m]) => [c, ...m]);

const sql = `-- Sprint BDD-1c — sels regroupés + neutralisation des « contre-indications » contradictoires du second import DDInter.
-- GÉNÉRÉ par scripts/gen_bdd1c_neutralisation.mjs — ne pas éditer à la main.
-- Empreinte du référentiel (BDD-1 + BDD-1c) : ${empreinteReferentiel}
-- Empreinte de la neutralisation : ${empreinteNeut}
-- Empreinte de la mise en revue : ${empreinteRevue}
--
-- ${GROUPES_SELS.length} groupes de sels · ${REVUE.length} lignes mises en revue · ${NEUTRALISER.length} lignes neutralisées (exclue_motif).
-- Aucune suppression ; sévérités, descriptions et liens inchangés. Réversible :
--   update interactions_ingredients set exclue_motif = null where exclue_motif like '% — BDD-1c';

create temp table _sels (canon text not null, membre text not null);
insert into _sels values
${GROUPES_SELS.flatMap(([c, m]) => m.map(x => `  (${q(c)}, ${q(x)})`)).join(',\n')};

create temp table _revue (a text not null, b text not null);
insert into _revue values
${REVUE.map(([a, b]) => `  (${q(a)}, ${q(b)})`).join(',\n')};

create temp table _neut (a text not null, b text not null, src text not null, motif text not null);
insert into _neut values
${neut.map(x => `  (${q(x.a)}, ${q(x.b)}, ${q(x.src)}, ${q(x.motif)})`).join(',\n')};

-- 1. État de départ.
do $$
declare v_n int;
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'interactions_ingredients' and column_name = 'exclue_motif') then
    raise exception 'BDD-1c : exclue_motif existe déjà — STOP';
  end if;
  if (select md5(string_agg(i.name_en || '|' || c.name_en, E'\\n' order by i.name_en collate "C"))
      from ingredients i join ingredients c on c.id = i.canonical_id) is distinct from '${bdd1.empreinte}' then
    raise exception 'BDD-1c : le référentiel de départ n''est pas celui de BDD-1 — STOP';
  end if;
  select count(*) into v_n from ingredients where name_en in (${nomsSels.map(q).join(', ')}) and canonical_id is null;
  if v_n <> ${nomsSels.length} then raise exception 'BDD-1c : % substances à regrouper libres au lieu de ${nomsSels.length} — STOP', v_n; end if;
  select count(*) into v_n from interactions_ingredients where revue_requise;
  if v_n <> ${REVUE_AVANT} then raise exception 'BDD-1c : % lignes revue_requise au départ au lieu de ${REVUE_AVANT} — STOP', v_n; end if;
  select count(*) into v_n from interactions_ingredients where severite = 'contre_indication' and description ~ ${LOT};
  if v_n <> 115 then raise exception 'BDD-1c : % lignes du second import au lieu de 115 — STOP', v_n; end if;
end $$;

-- 2. Regroupement des sels : les canoniques d'abord (trigger ingredients_canonical_guard), puis leurs membres.
update ingredients set canonical_id = id where name_en in (select distinct canon from _sels);
update ingredients i set canonical_id = c.id
from _sels s join ingredients c on c.name_en = s.canon
where i.name_en = s.membre;

-- 3. Colonne exclue_motif : ajout de métadonnées uniquement (pas de valeur par défaut) ; table réécrite → STOP.
do $$
declare v_avant oid; v_apres oid;
begin
  v_avant := pg_relation_filenode('public.interactions_ingredients');
  alter table interactions_ingredients add column exclue_motif text;
  v_apres := pg_relation_filenode('public.interactions_ingredients');
  if v_avant is distinct from v_apres then
    raise exception 'BDD-1c : interactions_ingredients a été réécrite par l''ajout de exclue_motif — STOP';
  end if;
end $$;
comment on column interactions_ingredients.exclue_motif is
  'BDD-1c — NULL = ligne active. Non NULL = ligne neutralisée (motif), ignorée par check_interactions_v2 et v_ingredient_parlant. Jamais supprimée.';

-- 4. Mise en revue des lignes du second import (hors contre-indication) sur les sels regroupés.
do $$
declare v_n int;
begin
  select count(*) into v_n
  from _revue s
  join ingredients ia on ia.name_en = s.a join ingredients ib on ib.name_en = s.b
  join interactions_ingredients ii on ii.ingredient_1 = least(ia.id, ib.id) and ii.ingredient_2 = greatest(ia.id, ib.id)
  where not ii.revue_requise and ii.severite <> 'contre_indication' and ii.description ~ ' × .* — ';
  if v_n <> ${REVUE.length} then raise exception 'BDD-1c : % lignes à mettre en revue trouvées au lieu de ${REVUE.length} — STOP', v_n; end if;
end $$;
update interactions_ingredients ii set revue_requise = true
from _revue s join ingredients ia on ia.name_en = s.a join ingredients ib on ib.name_en = s.b
where ii.ingredient_1 = least(ia.id, ib.id) and ii.ingredient_2 = greatest(ia.id, ib.id);

-- 5. Neutralisation, avec garde-fou (après regroupement : paires canoniques à jour).
do $$
declare r record; v_orig boolean; v_ansm boolean; v_ci boolean;
begin
  for r in
    select s.*, ii.ingredient_1 i1, ii.ingredient_2 i2, ii.severite, ii.description,
      array(select x.id from ingredients x where x.id = ia.id or x.canonical_id = ia.canonical_id) ga,
      array(select x.id from ingredients x where x.id = ib.id or x.canonical_id = ib.canonical_id) gb
    from _neut s
    join ingredients ia on ia.name_en = s.a join ingredients ib on ib.name_en = s.b
    left join interactions_ingredients ii on ii.ingredient_1 = least(ia.id, ib.id) and ii.ingredient_2 = greatest(ia.id, ib.id)
  loop
    if r.i1 is null or r.severite <> 'contre_indication' or r.description !~ ${LOT} then
      raise exception 'BDD-1c : % × % n''est pas une ligne contre_indication du second import — STOP', r.a, r.b;
    end if;
    continue when r.src = 'rcp';
    select exists (select 1 from interactions_ingredients o
                   where ((o.ingredient_1 = any(r.ga) and o.ingredient_2 = any(r.gb)) or (o.ingredient_1 = any(r.gb) and o.ingredient_2 = any(r.ga)))
                     and o.exclue_motif is null and o.description ~ ${ORIG}) into v_orig;
    select exists (select 1 from v_ingredient_entites ea join v_ingredient_entites eb on true
                   join ansm_regles x on x.entite_a = least(ea.entite, eb.entite) and x.entite_b = greatest(ea.entite, eb.entite)
                   where ea.ingredient_id = any(r.ga) and eb.ingredient_id = any(r.gb)) into v_ansm;
    -- Une autre source qui CONFIRME la contre-indication interdit la neutralisation (catégorie C3).
    select exists (select 1 from v_ingredient_entites ea join v_ingredient_entites eb on true
                   join ansm_regles x on x.entite_a = least(ea.entite, eb.entite) and x.entite_b = greatest(ea.entite, eb.entite)
                   where ea.ingredient_id = any(r.ga) and eb.ingredient_id = any(r.gb) and x.niveau = 'contre_indiquee')
        or exists (select 1 from interactions_ingredients o
                   where ((o.ingredient_1 = any(r.ga) and o.ingredient_2 = any(r.gb)) or (o.ingredient_1 = any(r.gb) and o.ingredient_2 = any(r.ga)))
                     and not (o.ingredient_1 = r.i1 and o.ingredient_2 = r.i2)
                     and o.exclue_motif is null and o.severite = 'contre_indication' and o.description !~ ' × .* — ') into v_ci;
    if v_ci then raise exception 'BDD-1c : % × % est confirmée par une autre source (C3) — STOP', r.a, r.b; end if;
    if (r.src in ('orig', 'orig+ansm') and not v_orig) or (r.src in ('ansm', 'orig+ansm') and not v_ansm) then
      raise exception 'BDD-1c : % × % — la source déclarée (%) ne couvre pas la paire — STOP', r.a, r.b, r.src;
    end if;
  end loop;
end $$;
update interactions_ingredients ii set exclue_motif = s.motif
from _neut s join ingredients ia on ia.name_en = s.a join ingredients ib on ib.name_en = s.b
where ii.ingredient_1 = least(ia.id, ib.id) and ii.ingredient_2 = greatest(ia.id, ib.id);

-- 6. RPC : texte de BDD-1, une seule clause ajoutée (ligne neutralisée ignorée).
${rpc}

-- 7. Vue : une ligne neutralisée ne rend plus une substance « parlante ».
${vue}

-- 8. Contrôles finaux « base = source » (sinon tout est annulé).
do $$
declare v text; v_n int;
begin
  select md5(string_agg(i.name_en || '|' || c.name_en, E'\\n' order by i.name_en collate "C")) into v
  from ingredients i join ingredients c on c.id = i.canonical_id;
  if v is distinct from '${empreinteReferentiel}' then raise exception 'BDD-1c : empreinte du référentiel (%) ≠ source', v; end if;
  select md5(string_agg(k, E'\\n' order by k collate "C")) into v from (
    select case when a.name_en collate "C" <= b.name_en collate "C" then a.name_en || '|' || b.name_en else b.name_en || '|' || a.name_en end
           || '|' || ii.exclue_motif as k
    from interactions_ingredients ii join ingredients a on a.id = ii.ingredient_1 join ingredients b on b.id = ii.ingredient_2
    where ii.exclue_motif is not null) t;
  if v is distinct from '${empreinteNeut}' then raise exception 'BDD-1c : empreinte de la neutralisation (%) ≠ source', v; end if;
  select md5(string_agg(k, E'\\n' order by k collate "C")) into v from (
    select case when a.name_en collate "C" <= b.name_en collate "C" then a.name_en || '|' || b.name_en else b.name_en || '|' || a.name_en end as k
    from _revue s join ingredients a on a.name_en = s.a join ingredients b on b.name_en = s.b
    join interactions_ingredients ii on ii.ingredient_1 = least(a.id, b.id) and ii.ingredient_2 = greatest(a.id, b.id)
    where ii.revue_requise) t;
  if v is distinct from '${empreinteRevue}' then raise exception 'BDD-1c : empreinte de la mise en revue (%) ≠ source', v; end if;
  select count(*) into v_n from interactions_ingredients where revue_requise;
  if v_n <> ${REVUE_AVANT + REVUE.length} then raise exception 'BDD-1c : % lignes revue_requise au lieu de ${REVUE_AVANT + REVUE.length}', v_n; end if;
  select count(*) into v_n from interactions_ingredients where exclue_motif is not null;
  if v_n <> ${NEUTRALISER.length} then raise exception 'BDD-1c : % lignes neutralisées au lieu de ${NEUTRALISER.length}', v_n; end if;
end $$;

drop table _sels;
drop table _revue;
drop table _neut;
`;

writeNewMigration(new URL('../supabase/migrations/20261029120000_bdd1c_sels_neutralisation.sql', import.meta.url), sql);
console.log(`${GROUPES_SELS.length} groupes · ${REVUE.length} revue · ${NEUTRALISER.length} neutralisées · référentiel ${empreinteReferentiel}`);
