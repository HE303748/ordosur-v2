// Sprint BDD-1b — Source unique : contre-indications du second import DDInter mises en revue.
// Génère :
//   • src/lib/bdd1b_revue_ci.data.json                              (fixture des tests Vitest)
//   • supabase/migrations/20261028120000_bdd1b_revue_ci_ddinter.sql (passage à revue_requise = true)
// Usage : node scripts/gen_bdd1b_revue_ci.mjs
//
// Ces lignes « contre_indication » (gabarit « A × B — Contre-indication : association déconseillée… ») ne
// sont pas rédigées à la main : BDD-1 les a donc laissées propager au groupe d'équivalence. Or elles
// touchent de NOUVELLES paires de spécialités MA commercialisées depuis BDD-1 (ex. amoxicilline FR ×
// ésoméprazole magnésium, rifampicine FR × oméprazole / clopidogrel…). Passées à revue_requise, elles
// redeviennent comparées sur les liens DIRECTS : exactement les cartes d'avant BDD-1, ni plus ni moins.
// Aucune sévérité, description ou ligne n'est modifiée ni supprimée.
//
// Critère du diagnostic (appliqué une fois, puis figé ici en liste explicite) : severite = contre_indication,
// revue_requise = false, au moins un ingrédient groupé (canonical_id non NULL), et au moins une paire de
// spécialités MA commercialisées atteinte via le groupe et pas via les liens directs.
// Revue hors dépôt : ../sprint2b/revue/bdd1_ddinter_manuelles.csv (origine = « second import BDD-1b »).

import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { writeNewMigration } from './lib/migrationGuard.mjs';

// [ingrédient A, ingrédient B] (ingredients.name_en, clé unique en base), paires MA avant → après BDD-1
const LIGNES = [
  ['amoxicillin', 'esomeprazole magnesium', 672, 1470],
  ['ciprofloxacin', 'tizanidine', 51, 95],
  ['efavirenz', 'rifampin', 0, 45],
  ['esomeprazole magnesium', 'clarithromycin', 114, 192],
  ['esomeprazole magnesium', 'rifampin', 0, 54],
  ['iron', 'deferasirox', 12, 30],
  ['ketoconazole', 'rifampin', 0, 18],
  ['rifampin', 'clopidogrel', 0, 135],
  ['rifampin', 'haloperidol', 0, 54],
  ['rifampin', 'lansoprazole', 0, 198],
  ['rifampin', 'omeprazole', 0, 621],
  ['rifampin', 'sofosbuvir', 0, 27],
  ['rifampin', 'theophylline', 0, 18],
  ['rifampin', 'ticagrelor', 0, 18],
  ['voriconazole', 'rifampin', 0, 63],
];
const REVUE_AVANT = 53; // lignes revue_requise posées par BDD-1

// ── Contrôles de la source ──────────────────────────────────────────────────
const octets = (a, b) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
const cle = ([a, b]) => (octets(a, b) <= 0 ? `${a}|${b}` : `${b}|${a}`);
const cles = LIGNES.map(cle);
if (new Set(cles).size !== cles.length) throw new Error('paire en double');
for (const [a, b, avant, apres] of LIGNES) {
  if (a === b) throw new Error(`paire réflexive : ${a}`);
  if (/[~^|']/.test(a + b)) throw new Error(`caractère réservé dans : ${a} / ${b}`);
  if (!(apres > avant)) throw new Error(`${a} × ${b} : aucune nouvelle paire MA, hors périmètre`);
}

// Empreinte « base = source » : une ligne « min|max » (ordre des octets) par paire, triée en octets.
const md5 = s => createHash('md5').update(s, 'utf8').digest('hex');
const empreinte = md5([...cles].sort(octets).join('\n'));

writeFileSync(new URL('../src/lib/bdd1b_revue_ci.data.json', import.meta.url), JSON.stringify({
  _genere_par: 'scripts/gen_bdd1b_revue_ci.mjs',
  empreinte,
  revue_avant: REVUE_AVANT,
  revue_apres: REVUE_AVANT + LIGNES.length,
  lignes: LIGNES.map(([a, b, avant, apres]) => ({ a, b, paires_ma_avant: avant, paires_ma_apres: apres })),
}, null, 2) + '\n');

const valeurs = LIGNES.map(([a, b]) => `  ('${a}', '${b}')`).join(',\n');

const sql = `-- Sprint BDD-1b — Contre-indications DDInter du second import mises en revue (revue_requise = true).
-- GÉNÉRÉ par scripts/gen_bdd1b_revue_ci.mjs — ne pas éditer à la main.
-- Empreinte de la source : ${empreinte}
--
-- ${LIGNES.length} lignes « contre_indication » qui se propageaient au groupe d'équivalence depuis BDD-1 vers de
-- nouvelles paires de spécialités MA. Elles redeviennent comparées sur les liens directs (cartes d'avant BDD-1).
-- Aucune sévérité, description, liaison ni ligne n'est modifiée ou supprimée.

create temp table _bdd1b (a text not null, b text not null);
insert into _bdd1b (a, b) values
${valeurs};

-- 1. État de départ : chaque paire existe une seule fois, en contre_indication, pas encore en revue.
do $$
declare v_n int; v_revue int;
begin
  select count(*) into v_revue from interactions_ingredients where revue_requise;
  if v_revue <> ${REVUE_AVANT} then
    raise exception 'BDD-1b : % lignes revue_requise au départ au lieu de ${REVUE_AVANT} — STOP', v_revue;
  end if;
  select count(*) into v_n
  from _bdd1b s
  join ingredients ia on ia.name_en = s.a
  join ingredients ib on ib.name_en = s.b
  join interactions_ingredients ii
    on ii.ingredient_1 = least(ia.id, ib.id) and ii.ingredient_2 = greatest(ia.id, ib.id)
  where ii.severite = 'contre_indication' and not ii.revue_requise;
  if v_n <> ${LIGNES.length} then
    raise exception 'BDD-1b : % lignes trouvées à l''état attendu au lieu de ${LIGNES.length} — STOP', v_n;
  end if;
end $$;

-- 2. Mise en revue (seule colonne touchée).
update interactions_ingredients ii set revue_requise = true
from _bdd1b s
join ingredients ia on ia.name_en = s.a
join ingredients ib on ib.name_en = s.b
where ii.ingredient_1 = least(ia.id, ib.id) and ii.ingredient_2 = greatest(ia.id, ib.id)
  and ii.severite = 'contre_indication';

-- 3. Contrôles finaux « base = source » (sinon tout est annulé).
do $$
declare v_empreinte text; v_revue int;
begin
  select md5(string_agg(k, E'\\n' order by k collate "C")) into v_empreinte
  from (
    select case when ia.name_en collate "C" <= ib.name_en collate "C"
                then ia.name_en || '|' || ib.name_en else ib.name_en || '|' || ia.name_en end as k
    from _bdd1b s
    join ingredients ia on ia.name_en = s.a
    join ingredients ib on ib.name_en = s.b
    join interactions_ingredients ii
      on ii.ingredient_1 = least(ia.id, ib.id) and ii.ingredient_2 = greatest(ia.id, ib.id)
    where ii.revue_requise and ii.severite = 'contre_indication'
  ) t;
  if v_empreinte is distinct from '${empreinte}' then
    raise exception 'BDD-1b : empreinte base (%) ≠ source (${empreinte})', v_empreinte;
  end if;
  select count(*) into v_revue from interactions_ingredients where revue_requise;
  if v_revue <> ${REVUE_AVANT + LIGNES.length} then
    raise exception 'BDD-1b : % lignes revue_requise au lieu de ${REVUE_AVANT + LIGNES.length}', v_revue;
  end if;
end $$;

drop table _bdd1b;
`;

writeNewMigration(new URL('../supabase/migrations/20261028120000_bdd1b_revue_ci_ddinter.sql', import.meta.url), sql);
console.log(`${LIGNES.length} lignes · revue_requise ${REVUE_AVANT} → ${REVUE_AVANT + LIGNES.length} · empreinte ${empreinte}`);
