// Sprint BDPM-1, lot G2 — Source unique des interactions lues dans les RCP (BDPM / EMA) ajoutées au moteur.
// Génère :
//   • src/lib/bdpm1_g2.data.json                                   (fixture des tests Vitest)
//   • supabase/migrations/20261031130000_bdpm1_g2_interactions.sql  (table interactions_rcp + RPC + données)
// Usage : node scripts/gen_bdpm1_g2.mjs
//
// Entrée : scripts/data/bdpm1_g2.lignes.json (bdpm/scripts/selection_g2.py) — une ligne de preuve de
// bdpm_interactions_staging par composition × partenaire :
//   • ajout       : le RCP contre-indique / déconseille l'association, le moteur n'a aucune carte ;
//   • relevement  : le moteur a une carte MOINS sévère que le RCP.
// Hors périmètre : précautions, partenaires non médicamenteux, lignes « à vérifier ».
//
// Moteur : check_interactions_v2 lit la nouvelle table interactions_rcp et rend une carte « RCP » pour une paire
// SEULEMENT si aucune carte ANSM ou DDInter de la paire n'est déjà au moins aussi sévère. Aucune carte existante
// n'est modifiée ni retirée : le niveau d'une paire ne peut que monter. Le reste de la fonction est recopié à
// l'identique (le test vérifie que la RPC privée des blocs RCP redonne exactement la version BDD-1c).
// Chaque ligne porte sa source (CIS, URL, date du RCP, origine « RCP BDPM » / « RCP EMA ») et le statut
// « à relire par un pharmacien ». Les données sont copiées depuis bdpm_interactions_staging (citation exacte).

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { writeNewMigration } from './lib/migrationGuard.mjs';

const lignes = JSON.parse(readFileSync(new URL('./data/bdpm1_g2.lignes.json', import.meta.url), 'utf8'));
const RPC_BDD1C = readFileSync(new URL('../supabase/migrations/20261029120000_bdd1c_sels_neutralisation.sql', import.meta.url), 'utf8')
  .replace(/\r\n/g, '\n');
const debut = RPC_BDD1C.indexOf('create or replace function public.check_interactions_v2');
const rpcAvant = RPC_BDD1C.slice(debut, RPC_BDD1C.indexOf('$function$;', debut) + '$function$;'.length);

// ── Contrôles de la source ──────────────────────────────────────────────────
const NIVEAUX = { 'contre-indique': 'contre_indiquee', deconseille: 'deconseillee' };
const vus = new Set();
for (const l of lignes) {
  if (vus.has(l.ligne)) throw new Error(`ligne staging en double : ${l.ligne}`);
  vus.add(l.ligne);
  if (!NIVEAUX[l.niveau]) throw new Error(`niveau hors périmètre : ${l.ligne} ${l.niveau}`);
  if (!['ajout', 'relevement'].includes(l.action)) throw new Error(`action inconnue : ${l.ligne}`);
  if (!['relu', 'auto'].includes(l.statut)) throw new Error(`ligne non relue : ${l.ligne}`);
  if (l.molecule_cids.length === 0) throw new Error(`molécule sans ingrédient : ${l.ligne}`);
  if (l.partenaire_cids.length === 0 && !l.partenaire_classe) throw new Error(`partenaire vide : ${l.ligne}`);
  if (l.partenaire_cids.some(c => l.molecule_cids.includes(c))) throw new Error(`partenaire = molécule : ${l.ligne}`);
}

const md5 = s => createHash('md5').update(s, 'utf8').digest('hex');
// Garde : état des lignes staging lues (empreinte de la citation, statut, niveau).
const gardeStaging = md5(lignes.map(l => `${l.ligne}|${l.empreinte}|${l.statut}|${l.niveau}`).join('\n'));
// Base = source : contenu moteur attendu de interactions_rcp.
const cle = l => `${l.ligne}|${NIVEAUX[l.niveau]}|${l.action}|${[...l.molecule_cids].sort().join(',')}|${[...l.partenaire_cids].sort().join(',')}|${l.partenaire_classe ?? ''}`;
const empreinte = md5([...lignes].sort((a, b) => a.ligne - b.ligne).map(cle).join('\n'));

// ── Blocs ajoutés à check_interactions_v2 ───────────────────────────────────
const CTE_RCP = `  ),
  -- BDPM-1 G2 — interactions lues dans les RCP (interactions_rcp), à relire par un pharmacien.
  med_cids AS MATERIALIZED (
    SELECT mc.medicament_id, mc.nom, array_agg(DISTINCT mc.cid) AS cids FROM med_can mc GROUP BY mc.medicament_id, mc.nom
  ),
  rcp_hits AS (
    SELECT r.id, m.medicament_id AS mm, p.medicament_id AS mp, m.nom AS nom_m, p.nom AS nom_p,
      r.molecule_libelle, r.partenaire_libelle, r.niveau, r.description_carte,
      CASE r.niveau WHEN 'contre_indiquee' THEN 5 ELSE 4 END AS rang
    FROM interactions_rcp r
    JOIN med_cids m ON m.cids @> r.molecule_cids
    JOIN med_cids p ON p.medicament_id <> m.medicament_id
    WHERE r.exclue_motif IS NULL
      AND ((cardinality(r.partenaire_cids) > 0 AND p.cids && r.partenaire_cids)
        OR (r.partenaire_classe IS NOT NULL AND EXISTS (
              SELECT 1 FROM med_x bx JOIN v_ingredient_entites e ON e.ingredient_id = bx.ingredient_id
              WHERE bx.medicament_id = p.medicament_id AND e.entite = r.partenaire_classe)))
  ),
  rcp AS (
    SELECT DISTINCT ON (LEAST(h.mm, h.mp), GREATEST(h.mm, h.mp))
      CASE WHEN h.mm < h.mp THEN h.nom_m ELSE h.nom_p END AS nom_a,
      CASE WHEN h.mm < h.mp THEN h.nom_p ELSE h.nom_m END AS nom_b,
      CASE WHEN h.mm < h.mp THEN h.molecule_libelle ELSE h.partenaire_libelle END AS ing_a,
      CASE WHEN h.mm < h.mp THEN h.partenaire_libelle ELSE h.molecule_libelle END AS ing_b,
      CASE h.niveau WHEN 'contre_indiquee' THEN 'contre_indication' ELSE 'majeure' END AS severite,
      NULL::text AS niveau_ansm, h.description_carte AS description, 'RCP'::text AS source,
      LEAST(h.mm, h.mp) AS ma, GREATEST(h.mm, h.mp) AS mb, h.rang
    FROM rcp_hits h
    ORDER BY LEAST(h.mm, h.mp), GREATEST(h.mm, h.mp), h.rang DESC, h.id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(`;
const UNION_RCP = `UNION ALL SELECT nom_a,nom_b,ing_a,ing_b,severite,niveau_ansm,description,source FROM cumul
        -- BDPM-1 G2 — carte RCP seulement si aucune carte ANSM / DDInter de la paire n'est au moins aussi sévère.
        UNION ALL SELECT r.nom_a,r.nom_b,r.ing_a,r.ing_b,r.severite,r.niveau_ansm,r.description,r.source FROM rcp r
          WHERE NOT EXISTS (SELECT 1 FROM ansm x WHERE x.ma = r.ma AND x.mb = r.mb
                              AND CASE x.niveau_ansm WHEN 'contre_indiquee' THEN 5 WHEN 'deconseillee' THEN 4
                                                     WHEN 'precaution' THEN 3 ELSE 2 END >= r.rang)
            AND NOT EXISTS (SELECT 1 FROM ddi_c d WHERE d.ma = r.ma AND d.mb = r.mb AND d.rang >= r.rang)) t;`;

const remplace = (s, a, b) => {
  if (s.split(a).length !== 2) throw new Error(`fragment introuvable ou multiple : ${a.slice(0, 60)}`);
  return s.replace(a, b);
};
let rpc = remplace(rpcAvant, '  )\n  SELECT COALESCE(jsonb_agg(jsonb_build_object(', CTE_RCP);
rpc = remplace(rpc, 'UNION ALL SELECT nom_a,nom_b,ing_a,ing_b,severite,niveau_ansm,description,source FROM cumul) t;', UNION_RCP);

writeFileSync(
  new URL('../src/lib/bdpm1_g2.data.json', import.meta.url),
  JSON.stringify({
    empreinte, garde_staging: gardeStaging, rpc_avant_md5: md5(rpcAvant),
    blocs: { cte: CTE_RCP, union: UNION_RCP },
    lignes: lignes.map(l => ({ ligne: l.ligne, action: l.action, niveau: l.niveau, composition: l.composition, partenaire: l.partenaire,
      molecule_cids: l.molecule_cids, partenaire_cids: l.partenaire_cids, partenaire_classe: l.partenaire_classe, statut: l.statut })),
  }, null, 1) + '\n',
);

// ── Migration ───────────────────────────────────────────────────────────────
const valeurs = lignes.map(l => `(${l.ligne},'${l.action}')`);
const paquets = [];
for (let i = 0; i < valeurs.length; i += 12) paquets.push('  ' + valeurs.slice(i, i + 12).join(','));

const sql = `-- Sprint BDPM-1, lot G2 — interactions lues dans les RCP ajoutées au moteur (table interactions_rcp).
-- GÉNÉRÉ par scripts/gen_bdpm1_g2.mjs — ne pas modifier à la main.
-- Empreinte de la source : ${empreinte}
--
-- ${lignes.length} interactions : ${lignes.filter(l => l.action === 'ajout').length} ajouts (aucune carte dans le moteur),
-- ${lignes.filter(l => l.action === 'relevement').length} relèvements (carte existante moins sévère que le RCP).
-- Aucune ligne de ansm_regles ni de interactions_ingredients n'est modifiée : check_interactions_v2 ajoute
-- une carte « RCP » à une paire seulement si aucune carte existante n'est au moins aussi sévère.
-- Données copiées de bdpm_interactions_staging (citation exacte, CIS, URL, date du RCP).

-- 1. Garde : les lignes staging sont dans l'état relu (sinon tout est annulé).
do $$
declare v_n int; v_md5 text;
begin
  select count(*), md5(string_agg(s.ligne || '|' || s.empreinte || '|' || s.statut || '|' || s.niveau, E'\\n' order by s.ligne))
    into v_n, v_md5
  from bdpm_interactions_staging s
  where s.ligne in (select v.ligne from (values
${paquets.join(',\n')}
  ) as v(ligne, action));
  if v_n <> ${lignes.length} or v_md5 <> '${gardeStaging}' then
    raise exception 'BDPM-1 G2 : lignes staging inattendues (% lignes, empreinte %)', v_n, v_md5;
  end if;
end $$;

-- 2. Table des interactions lues dans les RCP
create table public.interactions_rcp (
  id bigserial primary key,
  molecule_cids uuid[] not null check (cardinality(molecule_cids) > 0),   -- canoniques de la composition (toutes requises)
  molecule_libelle text not null,
  partenaire_cids uuid[] not null default '{}',                             -- canoniques du partenaire (l'un suffit)
  partenaire_classe text,                                                   -- ou classe ANSM (v_ingredient_entites.entite)
  partenaire_libelle text not null,
  niveau text not null check (niveau in ('contre_indiquee', 'deconseillee')),
  condition text,                                                           -- dose, voie, terrain lus dans le RCP
  citation text not null,                                                   -- texte exact du RCP
  description_carte text not null,
  source_origine text not null check (source_origine in ('RCP BDPM', 'RCP EMA')),
  source_cis bigint not null,
  source_url text not null,
  source_date date,
  statut_relecture text not null default 'a_relire_pharmacien' check (statut_relecture in ('a_relire_pharmacien', 'relu_pharmacien')),
  action text not null check (action in ('ajout', 'relevement')),
  bdpm_ligne integer not null unique,                                       -- bdpm_interactions_staging.ligne
  exclue_motif text,                                                        -- NULL = active ; sinon neutralisée (réversible)
  created_at timestamptz not null default now(),
  check (cardinality(partenaire_cids) > 0 or partenaire_classe is not null)
);
comment on table public.interactions_rcp is 'BDPM-1 G2 : interactions contre-indiquées / déconseillées lues dans les RCP (BDPM, EMA), source et date sur chaque ligne, à relire par un pharmacien. Lue par check_interactions_v2.';
create index interactions_rcp_molecule on public.interactions_rcp using gin (molecule_cids);
alter table public.interactions_rcp enable row level security;
create policy interactions_rcp_lecture on public.interactions_rcp for select to authenticated using (true);
revoke all on public.interactions_rcp from anon;
revoke insert, update, delete on public.interactions_rcp from authenticated;

-- 3. Données (copiées de la ligne staging de preuve)
insert into public.interactions_rcp (molecule_cids, molecule_libelle, partenaire_cids, partenaire_classe, partenaire_libelle, niveau,
  condition, citation, description_carte, source_origine, source_cis, source_url, source_date, action, bdpm_ligne)
select s.canonical_ids, lower(s.composition), s.partenaire_canonical_ids, s.partenaire_classe,
  coalesce(s.partenaire_classe, (select string_agg(i.name_en, ' / ' order by i.name_en) from ingredients i where i.id = any(s.partenaire_canonical_ids))),
  case s.niveau when 'contre-indique' then 'contre_indiquee' else 'deconseillee' end,
  s.condition, s.citation,
  'Source : RCP ' || s.source || ', CIS ' || s.cis || coalesce(' (RCP du ' || to_char(s.date_maj_rcp, 'DD/MM/YYYY') || ')', '')
    || ' — à relire par un pharmacien. ' || case s.niveau when 'contre-indique' then 'Association contre-indiquée' else 'Association déconseillée' end
    || coalesce(' (' || s.condition || ')', '') || ' : « ' || coalesce(s.phrase, s.citation) || ' » ' || s.url,
  'RCP ' || s.source, s.cis, s.url, s.date_maj_rcp, v.action, s.ligne
from bdpm_interactions_staging s
join (values
${paquets.join(',\n')}
) as v(ligne, action) on v.ligne = s.ligne;

-- 4. check_interactions_v2 : blocs RCP ajoutés, le reste à l'identique de BDD-1c
${rpc}

-- Contrôle « base = source » (doit renvoyer l'empreinte ci-dessus) :
--   select md5(string_agg(bdpm_ligne || '|' || niveau || '|' || action || '|' ||
--     (select string_agg(x::text, ',' order by x::text collate "C") from unnest(molecule_cids) x) || '|' ||
--     coalesce((select string_agg(x::text, ',' order by x::text collate "C") from unnest(partenaire_cids) x), '') || '|' ||
--     coalesce(partenaire_classe, ''), E'\\n' order by bdpm_ligne)) from interactions_rcp;
`;

writeNewMigration(new URL('../supabase/migrations/20261031130000_bdpm1_g2_interactions.sql', import.meta.url), sql);
console.log(`${lignes.length} interactions · empreinte ${empreinte} · garde staging ${gardeStaging} · migration ${(sql.length / 1024).toFixed(0)} Ko`);

// ── Relecture après chargement (scripts/data/bdpm1_g2.corrections.json, bdpm/scripts/corrections_g2.py) ─────
// Neutralisation réversible (exclue_motif) ou partenaire corrigé ; aucune ligne n'est supprimée.
const corrections = JSON.parse(readFileSync(new URL('./data/bdpm1_g2.corrections.json', import.meta.url), 'utf8'));
const parLigne = new Map(lignes.map(l => [l.ligne, l]));
for (const k of Object.keys(corrections)) if (!parLigne.has(Number(k))) throw new Error(`correction hors G2 : ${k}`);
const apresRelecture = [...lignes].sort((a, b) => a.ligne - b.ligne).map(l => {
  const c = corrections[l.ligne] ?? {};
  return { ...l, partenaire_cids: c.partenaire_cids ?? l.partenaire_cids, active: !c.neutraliser };
});
const empreinteRelecture = md5(apresRelecture.map(l => `${cle(l)}|${l.active ? 'active' : 'neutralisee'}`).join('\n'));
const q = s => `'${String(s).replace(/'/g, "''")}'`;
const neutres = Object.entries(corrections).filter(([, c]) => c.neutraliser);
const remaps = Object.entries(corrections).filter(([, c]) => c.partenaire_cids);
const sqlRelecture = `-- Sprint BDPM-1, lot G2 — relecture des interactions RCP après chargement (réversible).
-- GÉNÉRÉ par scripts/gen_bdpm1_g2.mjs — ne pas modifier à la main.
-- Empreinte attendue après relecture : ${empreinteRelecture}
--
-- ${neutres.length} lignes neutralisées (exclue_motif : la carte RCP n'apparaît plus, la ligne reste) ;
-- ${remaps.length} partenaires corrigés (IEC × « valsartan » → sacubitril/valsartan).

do $$
begin
  if (select count(*) from interactions_rcp where exclue_motif is null and bdpm_ligne in (${Object.keys(corrections).join(', ')})) <> ${Object.keys(corrections).length} then
    raise exception 'BDPM-1 G2 relecture : état de départ inattendu';
  end if;
end $$;

update interactions_rcp r set exclue_motif = 'BDPM-1 G2 relecture — ' || v.motif
from (values
${neutres.map(([k, c]) => `  (${k}, ${q(c.neutraliser)})`).join(',\n')}
) as v(ligne, motif)
where r.bdpm_ligne = v.ligne;

update interactions_rcp r set partenaire_cids = v.cids::uuid[], partenaire_libelle = v.libelle,
  condition = coalesce(r.condition || ' ; ', '') || v.motif
from (values
${remaps.map(([k, c]) => `  (${k}, '{${c.partenaire_cids.join(',')}}', ${q(c.partenaire_libelle)}, ${q(c.motif)})`).join(',\n')}
) as v(ligne, cids, libelle, motif)
where r.bdpm_ligne = v.ligne;

-- Contrôle « base = source » :
--   select md5(string_agg(bdpm_ligne || '|' || niveau || '|' || action || '|' ||
--     (select string_agg(x::text, ',' order by x::text collate "C") from unnest(molecule_cids) x) || '|' ||
--     coalesce((select string_agg(x::text, ',' order by x::text collate "C") from unnest(partenaire_cids) x), '') || '|' ||
--     coalesce(partenaire_classe, '') || '|' || case when exclue_motif is null then 'active' else 'neutralisee' end,
--     E'\\n' order by bdpm_ligne)) from interactions_rcp;
`;
writeNewMigration(new URL('../supabase/migrations/20261031131000_bdpm1_g2_relecture.sql', import.meta.url), sqlRelecture);
const fixture = JSON.parse(readFileSync(new URL('../src/lib/bdpm1_g2.data.json', import.meta.url), 'utf8'));
fixture.empreinte_relecture = empreinteRelecture;
fixture.corrections = corrections;
writeFileSync(new URL('../src/lib/bdpm1_g2.data.json', import.meta.url), JSON.stringify(fixture, null, 1) + '\n');
console.log(`relecture : ${neutres.length} neutralisées · ${remaps.length} partenaires corrigés · empreinte ${empreinteRelecture}`);
