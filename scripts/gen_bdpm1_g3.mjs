// Sprint BDPM-1, lot G3 — Source unique des contre-indications lues dans les RCP (BDPM / EMA) ajoutées au moteur.
// Génère :
//   • src/lib/bdpm1_g3.data.json                                        (fixture des tests Vitest)
//   • supabase/migrations/20261031140000_bdpm1_g3a_ci.sql               (colonnes, formulations, CI)
//   • supabase/migrations/20261031141000_bdpm1_g3b_grossesse.sql        (grossesse, allaitement)
//   • supabase/migrations/20261031142000_bdpm1_g3c_releves.sql          (relative → absolue, neutralisations)
//   • supabase/migrations/20261031143000_bdpm1_g3d_copies_complement.sql (recréation complémentaire, tout le catalogue)
//   • supabase/migrations/20261031144000_bdpm1_g3e_copie_amoxicilline.sql (copie G3c trop large neutralisée et recréée)
// Usage : node scripts/gen_bdpm1_g3.mjs
//
// Entrée : scripts/data/bdpm1_g3.json (bdpm/scripts/construire_g3.py) :
//   • motif (dci_pattern) = molécule exacte de la composition, vérifié sur les fiches MA (une fiche atteinte qui ne
//     contient pas la molécule = rejet) ; jamais un motif de classe ;
//   • condition_valeur = formulation de ci_condition_concepts (les formulations qualifiées manquantes sont ajoutées :
//     même liste que gen_ci_condition_concepts.mjs, qui les lit dans le même fichier) ;
//   • grossesse / allaitement : sexe_applicable = 'F' (canal du statut déclaré : jamais une CI ferme pour toutes les
//     patientes ; ferme si « enceinte » / « allaitante » est déclaré) ;
//   • neutralisation : contraindications.exclue_motif (réversible, ignorée par le Vérificateur), la ligne de classe
//     étant recréée molécule par molécule pour les fiches que le RCP ne contredit pas ;
//   • copies_complement (bdpm/scripts/copies_complement_g3.py) : les copies de G3c ne visaient que les fiches MA ; le banc
//     médicament (tout le catalogue) a montré des fiches FR / INT / US de molécules NON contredites privées de leur CI
//     (warfarine, phénytoïne, zonisamide…). Motif = la molécule seule, contrôlé sur tout le catalogue : n'atteint que des
//     fiches de la ligne d'origine et aucune fiche d'une molécule contredite.
// Chaque ligne ajoutée porte sa source (CIS, URL, date du RCP) et « à relire par un pharmacien ».

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { writeNewMigration } from './lib/migrationGuard.mjs';

const D = JSON.parse(readFileSync(new URL('./data/bdpm1_g3.json', import.meta.url), 'utf8'));
const md5 = s => createHash('md5').update(s, 'utf8').digest('hex');
const q = v => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const norm = s => s.replace(/œ/gi, 'oe').replace(/æ/gi, 'ae').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// ── Contrôles de la source ──────────────────────────────────────────────────
const GROSS = new Set(['grossesse', 'allaitement']);
for (const a of D.ajouts) {
  if (!D.motifs[a.composition]) throw new Error(`motif manquant : ${a.composition}`);
  if (!['absolue', 'relative'].includes(a.severite)) throw new Error(`sévérité : ${a.composition}`);
  if (GROSS.has(a.cle) !== (a.sexe === 'F')) throw new Error(`grossesse / allaitement sans sexe_applicable F : ${a.composition}`);
  if (GROSS.has(a.cle) && !/^(Grossesse|Allaitement)/.test(a.condition_valeur)) throw new Error(`formulation grossesse : ${a.condition_valeur}`);
}
for (const [c, m] of Object.entries(D.motifs)) if (!m || m.split('|').some(p => norm(p).length <= 3)) throw new Error(`motif vide ou trop court : ${c}`);
const refOf = a => `G3:${a.origine}:${a.ligne}:${md5(a.condition_valeur).slice(0, 6)}`;
const refs = new Set(D.ajouts.map(refOf));
if (refs.size !== D.ajouts.length) throw new Error('référence G3 en double');
const copieRef = c => `G3:copie:${c.source_ci_id.slice(0, 8)}:${md5(c.dci_pattern).slice(0, 8)}`;
const COPIES = [...D.copies, ...D.copies_complement];
if (new Set(COPIES.map(copieRef)).size !== COPIES.length) throw new Error('copie en double');
for (const c of D.copies_complement) if (!D.neutralisations.some(n => n.ci_id === c.source_ci_id)) throw new Error(`copie complémentaire sans neutralisation : ${c.dci_pattern}`);

// ── Empreinte « base = source » ─────────────────────────────────────────────
const ligneAjout = a => `${refOf(a)}|${D.motifs[a.composition]}|${a.condition_type}|${a.condition_valeur}|${a.severite}|${a.sexe ?? ''}`;
const lignesSource = copies => [
  ...D.ajouts.map(ligneAjout),
  ...D.releves.map(r => `releve|${r.ci_id}|absolue`),
  ...D.neutralisations.map(n => `neutralise|${n.ci_id}`),
  ...copies.map(c => `${copieRef(c)}|${c.dci_pattern}`),
].sort().join('\n');
const empreinte = md5(lignesSource(D.copies));          // état après G3a-c (migrations appliquées, inchangées)
const empreinteFinale = md5(lignesSource(COPIES));      // état après G3d
// G3e : une copie de G3c atteignait la molécule contredite elle-même (amoxicilline seule) → neutralisée (exclue_motif) et
// recréée sans l'alternative fautive. Empreinte : + ligne « copie_neutralisee|ref ».
const TOUTES = [...COPIES, ...D.remplacements];
if (new Set(TOUTES.map(copieRef)).size !== TOUTES.length) throw new Error('copie en double (G3e)');
for (const r of D.remplacements) if (!D.copies.some(c => copieRef(c) === r.copie_ref && c.source_ci_id === r.source_ci_id)) throw new Error(`remplacement sans copie G3c : ${r.copie_ref}`);
const empreinteG3e = md5([lignesSource(TOUTES), ...D.remplacements.map(r => `copie_neutralisee|${r.copie_ref}`)].join('\n').split('\n').sort().join('\n'));

// ── Formulations nouvelles (ci_condition_concepts) ──────────────────────────
const formRows = D.formulations_nouvelles.map(f => `  (${[norm(f.condition_valeur), f.condition_valeur, f.concept,
  f.famille ?? null, f.qualificatif ?? null, f.qualificatif_type ?? null].map(q).join(',')})`);

// ── Lots ────────────────────────────────────────────────────────────────────
const comps = Object.keys(D.motifs).sort();
const cIdx = new Map(comps.map((c, i) => [c, i + 1]));
const forms = [...new Set(D.ajouts.map(a => `${a.condition_type}\u0001${a.condition_valeur}`))].sort();
const fIdx = new Map(forms.map((f, i) => [f, i + 1]));
const paquets = (vals, n = 10) => { const o = []; for (let i = 0; i < vals.length; i += n) o.push('  ' + vals.slice(i, i + n).join(',')); return o.join(',\n'); };

function lotAjouts(liste, titre) {
  const cs = [...new Set(liste.map(a => a.composition))].sort();
  const fs = [...new Set(liste.map(a => `${a.condition_type}\u0001${a.condition_valeur}`))].sort();
  const m = paquets(cs.map(c => `(${cIdx.get(c)},${q(D.motifs[c])})`), 4);
  const f = paquets(fs.map(x => { const [t, v] = x.split('\u0001'); return `(${fIdx.get(x)},${q(t)},${q(v)})`; }), 3);
  const parSrc = s => liste.filter(x => x.origine === s);
  const aDe = s => paquets(parSrc(s).map(x => `(${x.ligne},${cIdx.get(x.composition)},${fIdx.get(`${x.condition_type}\u0001${x.condition_valeur}`)},'${x.severite[0]}')`), 10);
  const sexes = new Set(liste.map(x => x.sexe ?? null));
  if (sexes.size !== 1) throw new Error(`${titre} : sexe_applicable hétérogène`);
  const sexe = q([...sexes][0]);
  const garde = s => {
    const l = parSrc(s).map(x => [x.ligne, x.empreinte]).filter((v, i, t) => t.findIndex(w => w[0] === v[0]) === i).sort((u, v) => u[0] - v[0]);
    if (l.length === 0) return '';
    const table = s === 'ci' ? 'bdpm_ci_staging' : 'bdpm_grossesse_staging';
    return `  select count(*), md5(string_agg(s.ligne || '|' || s.empreinte || '|' || s.statut, E'\\n' order by s.ligne)) into v_n, v_md5
    from ${table} s where s.ligne in (${l.map(x => x[0]).join(',')});
  if v_n <> ${l.length} or v_md5 <> '${md5(l.map(x => `${x[0]}|${x[1]}|relu`).join('\n'))}' then
    raise exception 'BDPM-1 G3 (${titre}) : lignes de ${table} inattendues (%, %)', v_n, v_md5;
  end if;
`;
  };
  // Le suffixe de bdpm_ref (6 premiers caractères du md5 de la formulation) est recalculé en SQL, comme refOf().
  const insertion = s => parSrc(s).length === 0 ? '' : `with m(c, motif) as (values
${m}
), f(i, t, v) as (values
${f}
), a(ligne, c, f, sev) as (values
${aDe(s)}
)
insert into public.contraindications
  (dci_pattern, condition_type, condition_valeur, severite, description, sources, sexe_applicable, bdpm_ref)
select m.motif, f.t, f.v, case a.sev when 'a' then 'absolue' else 'relative' end,
  'Source : RCP ' || s.source || ', CIS ' || s.cis || coalesce(' (RCP du ' || to_char(s.date_maj_rcp, 'DD/MM/YYYY') || ')', '')
    || ' — à relire par un pharmacien. « ' || s.citation || ' »',
  array['RCP ' || s.source || ' CIS ' || s.cis || ' — ' || s.url, 'BDPM-1 G3 — à relire par un pharmacien'],
  ${sexe}, 'G3:${s}:' || a.ligne || ':' || substr(md5(f.v), 1, 6)
from a join m on m.c = a.c join f on f.i = a.f join ${s === 'ci' ? 'bdpm_ci_staging' : 'bdpm_grossesse_staging'} s on s.ligne = a.ligne;
`;
  return { garde: garde('ci') + garde('gr'), insertion, n: liste.length };
}

const ciAjouts = D.ajouts.filter(a => !GROSS.has(a.cle));
const grAjouts = D.ajouts.filter(a => GROSS.has(a.cle));
const LA = lotAjouts(ciAjouts, 'CI');
const LB = lotAjouts(grAjouts, 'grossesse / allaitement');
const blocInsert = L => [L.insertion('ci'), L.insertion('gr')].filter(Boolean).join('\n');

const entete = (titre, n) => `-- Sprint BDPM-1, lot G3 — ${titre}.
-- GÉNÉRÉ par scripts/gen_bdpm1_g3.mjs — ne pas modifier à la main.
-- Empreinte de la source (G3 complet) : ${empreinte}
-- ${n}
`;

const sqlA = `${entete('contre-indications lues dans les RCP (concept déjà au référentiel)', `${ciAjouts.length} CI ajoutées, ${D.formulations_nouvelles.length} formulations ajoutées à ci_condition_concepts.`)}
-- Motif = molécule exacte de la composition (vérifié sur les fiches MA) ; source CIS / URL / date sur chaque ligne.

do $$
declare v_n int; v_md5 text;
begin
${LA.garde}  if exists (select 1 from public.ci_condition_concepts where condition_norm in (${D.formulations_nouvelles.map(f => q(norm(f.condition_valeur))).join(', ')})) then
    raise exception 'BDPM-1 G3 : formulation déjà présente dans ci_condition_concepts';
  end if;
end $$;

-- 1. Traçabilité et neutralisation réversible
alter table public.contraindications add column if not exists exclue_motif text;
alter table public.contraindications add column if not exists bdpm_ref text;
create unique index if not exists contraindications_bdpm_ref on public.contraindications (bdpm_ref) where bdpm_ref is not null;
comment on column public.contraindications.exclue_motif is 'NULL = active ; sinon ligne NEUTRALISÉE (ignorée par le Vérificateur), jamais supprimée (réversible).';
comment on column public.contraindications.bdpm_ref is 'BDPM-1 G3 : ligne staging de preuve (G3:ci|gr:ligne:…) ou recréation d''une ligne de classe neutralisée (G3:copie:…).';

-- 2. Formulations qualifiées (même liste que scripts/gen_ci_condition_concepts.mjs)
insert into public.ci_condition_concepts
  (condition_norm, condition_valeur, ordre, libelle, traitement, concept, famille, qualificatif, qualificatif_type, stade, note)
select x.n, x.v, 1, x.v, 'concept', x.c, x.fam, x.q, x.qt, null, 'BDPM-1 G3 : formulation lue dans un RCP'
from (values
${formRows.join(',\n')}
) as x(n, v, c, fam, q, qt);

-- 3. Contre-indications
${blocInsert(LA)}`;

const sqlB = `${entete('grossesse et allaitement lus dans les RCP', `${grAjouts.length} lignes (sexe_applicable F : canal du statut déclaré).`)}
do $$
declare v_n int; v_md5 text;
begin
${LB.garde}end $$;

${blocInsert(LB)}`;

const sqlC = `${entete('relative → absolue et neutralisation des contradictions', `${D.releves.length} relèvements, ${D.neutralisations.length} neutralisations, ${D.copies.length} recréations molécule par molécule.`)}
-- Garde : chaque ligne touchée est dans l'état lu au diagnostic.
do $$
declare v_ecarts text;
begin
  select string_agg(v.id, ' ; ') into v_ecarts
  from (values
${paquets([...D.releves, ...D.neutralisations].map(r => `(${q(r.ci_id)},${q(r.etat_avant.dci_pattern)},${q(r.etat_avant.condition_valeur)},${q(r.etat_avant.severite)},${q(r.etat_avant.sexe_applicable)})`), 1)}
  ) as v(id, motif, cv, sev, sexe)
  left join public.contraindications c on c.id = v.id::uuid
  where c.id is null or c.dci_pattern is distinct from v.motif or c.condition_valeur is distinct from v.cv
     or c.severite is distinct from v.sev or c.sexe_applicable::text is distinct from v.sexe or c.exclue_motif is not null;
  if v_ecarts is not null then raise exception 'BDPM-1 G3 : état de départ inattendu : %', v_ecarts; end if;
end $$;

-- 1. Relative → absolue (lignes propres à la molécule ; les lignes de classe ne sont pas modifiées)
update public.contraindications c set severite = 'absolue',
  sources = coalesce(c.sources, '{}') || array['BDPM-1 G3 — relative → absolue d''après le RCP CIS ' || v.cis || ' (à relire par un pharmacien)']
from (values
${paquets(D.releves.map(r => `(${q(r.ci_id)},${q(r.cis)})`), 3)}
) as v(id, cis)
where c.id = v.id::uuid and c.severite = 'relative';

-- 2. Recréation molécule par molécule des lignes de classe neutralisées (fiches que le RCP ne contredit pas)
insert into public.contraindications (dci_pattern, condition_type, condition_valeur, severite, description, mecanisme_fr, conduite_fr,
  sources, atc_code, age_min_mois, age_max_mois, sexe_applicable, bdpm_ref)
select v.motif, c.condition_type, c.condition_valeur, c.severite, c.description, c.mecanisme_fr, c.conduite_fr,
  coalesce(c.sources, '{}') || array['BDPM-1 G3 — recréée pour cette molécule depuis la ligne ' || c.id || ' (neutralisée)'],
  c.atc_code, c.age_min_mois, c.age_max_mois, c.sexe_applicable, v.ref
from public.contraindications c
join (values
${paquets(D.copies.map(c => `(${q(c.source_ci_id)},${q(c.dci_pattern)},${q(copieRef(c))})`), 1)}
) as v(source, motif, ref) on c.id = v.source::uuid;

-- 3. Neutralisation réversible (exclue_motif) des lignes contredites par le RCP
update public.contraindications c set exclue_motif = v.motif
from (values
${paquets(D.neutralisations.map(n => `(${q(n.ci_id)},${q(n.motif)})`), 1)}
) as v(id, motif)
where c.id = v.id::uuid;

-- Contrôle « base = source » (doit renvoyer l'empreinte ci-dessus) :
--   select md5(string_agg(x, E'\\n' order by x collate "C")) from (
--     select bdpm_ref || '|' || dci_pattern || '|' || condition_type || '|' || condition_valeur || '|' || severite || '|' || coalesce(sexe_applicable::text, '') x
--       from contraindications where bdpm_ref like 'G3:ci:%' or bdpm_ref like 'G3:gr:%'
--     union all select 'releve|' || id || '|' || severite from contraindications where id in (${D.releves.map(r => q(r.ci_id)).join(', ')})
--     union all select 'neutralise|' || id from contraindications where exclue_motif like 'Contredit par le RCP — BDPM-1%'
--     union all select bdpm_ref || '|' || dci_pattern from contraindications where bdpm_ref like 'G3:copie:%') t;
`;

const sqlD = `-- Sprint BDPM-1, lot G3 — recréation complémentaire des lignes de classe neutralisées (tout le catalogue).
-- GÉNÉRÉ par scripts/gen_bdpm1_g3.mjs — ne pas modifier à la main.
-- Empreinte de la source (G3 complet, après G3d) : ${empreinteFinale}
-- ${D.copies_complement.length} recréations : molécules NON contredites par le RCP dont les fiches hors MA avaient perdu la CI.

do $$
begin
  if exists (select 1 from public.contraindications where bdpm_ref like 'G3:copie:%' and bdpm_ref in (${D.copies_complement.map(c => q(copieRef(c))).join(', ')})) then
    raise exception 'BDPM-1 G3d : copie complémentaire déjà présente';
  end if;
  if (select count(*) from public.contraindications where bdpm_ref like 'G3:copie:%') <> ${D.copies.length}
     or (select count(*) from public.contraindications where id in (${[...new Set(D.copies_complement.map(c => c.source_ci_id))].map(q).join(', ')}) and exclue_motif like 'Contredit par le RCP — BDPM-1%') <> ${new Set(D.copies_complement.map(c => c.source_ci_id)).size} then
    raise exception 'BDPM-1 G3d : état de départ inattendu (G3c non appliquée ?)';
  end if;
end $$;

insert into public.contraindications (dci_pattern, condition_type, condition_valeur, severite, description, mecanisme_fr, conduite_fr,
  sources, atc_code, age_min_mois, age_max_mois, sexe_applicable, bdpm_ref)
select v.motif, c.condition_type, c.condition_valeur, c.severite, c.description, c.mecanisme_fr, c.conduite_fr,
  coalesce(c.sources, '{}') || array['BDPM-1 G3 — recréée pour cette molécule depuis la ligne ' || c.id || ' (neutralisée)'],
  c.atc_code, c.age_min_mois, c.age_max_mois, c.sexe_applicable, v.ref
from public.contraindications c
join (values
${paquets(D.copies_complement.map(c => `(${q(c.source_ci_id)},${q(c.dci_pattern)},${q(copieRef(c))})`), 1)}
) as v(source, motif, ref) on c.id = v.source::uuid;

-- Contrôle « base = source » : même requête que dans 20261031142000_bdpm1_g3c_releves.sql → ${empreinteFinale}
`;

const sqlE = `-- Sprint BDPM-1, lot G3 — correction d'une recréation trop large (G3c).
-- GÉNÉRÉ par scripts/gen_bdpm1_g3.mjs — ne pas modifier à la main.
-- Empreinte de la source (G3 complet, après G3e) : ${empreinteG3e}
-- ${D.remplacements.length} copie(s) neutralisée(s) (exclue_motif, réversible) et recréée(s) sans l'alternative qui atteignait
-- la molécule que le RCP ne contre-indique pas (contrôle sur tout le catalogue : bdpm/scripts/verif_copies_g3.py).

do $$
begin
  if (select count(*) from public.contraindications where bdpm_ref in (${D.remplacements.map(r => q(r.copie_ref)).join(', ')}) and exclue_motif is null) <> ${D.remplacements.length}
     or exists (select 1 from public.contraindications where bdpm_ref in (${D.remplacements.map(r => q(copieRef(r))).join(', ')})) then
    raise exception 'BDPM-1 G3e : état de départ inattendu';
  end if;
end $$;

insert into public.contraindications (dci_pattern, condition_type, condition_valeur, severite, description, mecanisme_fr, conduite_fr,
  sources, atc_code, age_min_mois, age_max_mois, sexe_applicable, bdpm_ref)
select v.motif, c.condition_type, c.condition_valeur, c.severite, c.description, c.mecanisme_fr, c.conduite_fr,
  coalesce(c.sources, '{}') || array['BDPM-1 G3 — recréée pour cette molécule depuis la ligne ' || c.id || ' (neutralisée)'],
  c.atc_code, c.age_min_mois, c.age_max_mois, c.sexe_applicable, v.ref
from public.contraindications c
join (values
${paquets(D.remplacements.map(r => `(${q(r.source_ci_id)},${q(r.dci_pattern)},${q(copieRef(r))})`), 1)}
) as v(source, motif, ref) on c.id = v.source::uuid;

update public.contraindications c set exclue_motif = v.motif
from (values
${paquets(D.remplacements.map(r => `(${q(r.copie_ref)},${q(r.motif)})`), 1)}
) as v(ref, motif)
where c.bdpm_ref = v.ref;

-- Contrôle « base = source » : requête de 20261031142000_bdpm1_g3c_releves.sql
--   + union all select 'copie_neutralisee|' || bdpm_ref from contraindications where bdpm_ref like 'G3:copie:%' and exclue_motif is not null
--   → ${empreinteG3e}
`;

writeFileSync(new URL('../src/lib/bdpm1_g3.data.json', import.meta.url), JSON.stringify({
  empreinte: empreinteG3e, compte: { ci: ciAjouts.length, grossesse_allaitement: grAjouts.length, releves: D.releves.length,
    neutralisations: D.neutralisations.length, copies: TOUTES.length, formulations: D.formulations_nouvelles.length },
  motifs: D.motifs, formulations_nouvelles: D.formulations_nouvelles,
  ajouts: D.ajouts.map(a => ({ ref: refOf(a), composition: a.composition, cle: a.cle, condition_type: a.condition_type,
    condition_valeur: a.condition_valeur, severite: a.severite, sexe: a.sexe })),
  releves: D.releves.map(r => ({ ci_id: r.ci_id, composition: r.composition, condition_valeur: r.condition_valeur })),
  neutralisations: D.neutralisations.map(n => ({ ci_id: n.ci_id, condition_valeur: n.condition_valeur, dci_pattern: n.dci_pattern, motif: n.motif })),
  copies: TOUTES.map(c => ({ ref: copieRef(c), source_ci_id: c.source_ci_id, composition: c.composition, dci_pattern: c.dci_pattern })),
  copies_neutralisees: D.remplacements.map(r => ({ ref: r.copie_ref, remplacee_par: copieRef(r), motif: r.motif })),
  bloquees: D.bloquees,
}, null, 1) + '\n');

writeNewMigration(new URL('../supabase/migrations/20261031140000_bdpm1_g3a_ci.sql', import.meta.url), sqlA);
writeNewMigration(new URL('../supabase/migrations/20261031141000_bdpm1_g3b_grossesse.sql', import.meta.url), sqlB);
writeNewMigration(new URL('../supabase/migrations/20261031142000_bdpm1_g3c_releves.sql', import.meta.url), sqlC);
writeNewMigration(new URL('../supabase/migrations/20261031143000_bdpm1_g3d_copies_complement.sql', import.meta.url), sqlD);
writeNewMigration(new URL('../supabase/migrations/20261031144000_bdpm1_g3e_copie_amoxicilline.sql', import.meta.url), sqlE);
console.log(`G3 : ${ciAjouts.length} CI · ${grAjouts.length} grossesse/allaitement · ${D.releves.length} relèvements · ${D.neutralisations.length} neutralisations · ${D.copies.length} + ${D.copies_complement.length} copies · ${D.formulations_nouvelles.length} formulations · empreinte G3a-c ${empreinte} · G3d ${empreinteFinale} · finale (G3e) ${empreinteG3e}`);
console.log(`tailles : A ${(sqlA.length / 1024).toFixed(0)} Ko · B ${(sqlB.length / 1024).toFixed(0)} Ko · C ${(sqlC.length / 1024).toFixed(0)} Ko`);
