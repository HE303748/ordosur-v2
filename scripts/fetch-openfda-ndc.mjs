// scripts/fetch-openfda-ndc.mjs — Partie B : Médicaments OpenFDA NDC
// Source: https://api.fda.gov/drug/ndc.json
// Target: ajouter le maximum de médicaments à la table medicaments
// Usage: node scripts/fetch-openfda-ndc.mjs

import { writeFileSync, mkdirSync, existsSync } from 'fs';

const PAGES      = 250;   // 250 × 100 = 25 000 produits (max skip OpenFDA)
const LIMIT      = 100;
const BATCH_SIZE = 80;
const DELAY_MS   = 320;
const SOURCES_DIR = 'scripts/sources';

if (!existsSync(SOURCES_DIR)) mkdirSync(SOURCES_DIR, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc   = s  => String(s ?? '').replace(/'/g, "''");

// ── ATC / classe thérapeutique from route + product_type + pharm_class ───────
function deriveClasse(item) {
  const classes = item.pharm_class ?? [];
  // Pick first EPC (Established Pharmacologic Class)
  const epc = classes.find(c => c.includes('[EPC]'));
  if (epc) return epc.replace(/\[EPC\].*/, '').trim().slice(0, 80);
  if (classes.length > 0) return classes[0].replace(/\[.*?\]/g, '').trim().slice(0, 80);
  // Fallback: route-based
  const route = (item.route ?? [])[0] ?? '';
  const form  = (item.dosage_form ?? '').toLowerCase();
  if (form.includes('inhaler') || route === 'INHALATION') return 'Médicaments respiratoires';
  if (form.includes('ophthalmic') || route === 'OPHTHALMIC') return 'Ophtalmologie';
  if (form.includes('topical') || route === 'TOPICAL') return 'Médicaments topiques';
  if (route === 'INTRAVENOUS') return 'Médicaments IV / Hospitaliers';
  return null;
}

// ── Normalize pays ────────────────────────────────────────────────────────────
function derivePays(item) {
  const mkt = (item.marketing_category ?? '').toUpperCase();
  if (mkt.includes('NDA') || mkt.includes('ANDA') || mkt.includes('BLA')) return 'US';
  return 'INT';
}

// ── Normalize form ────────────────────────────────────────────────────────────
const FORM_MAP = {
  'TABLET': 'Comprimé',
  'CAPSULE': 'Gélule',
  'SOLUTION': 'Solution',
  'SUSPENSION': 'Suspension',
  'INJECTION': 'Solution injectable',
  'CREAM': 'Crème',
  'OINTMENT': 'Pommade',
  'GEL': 'Gel',
  'LOTION': 'Lotion',
  'PATCH': 'Patch transdermique',
  'INHALER': 'Inhalateur',
  'SPRAY': 'Spray',
  'DROPS': 'Gouttes',
  'POWDER': 'Poudre',
  'GRANULES': 'Granules',
  'SYRUP': 'Sirop',
  'SUPPOSITORY': 'Suppositoire',
  'ENEMA': 'Lavement',
  'IMPLANT': 'Implant',
  'FILM': 'Film',
  'LOZENGE': 'Pastille',
  'KIT': 'Kit',
};

function normalizeForm(raw) {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  for (const [en, fr] of Object.entries(FORM_MAP)) {
    if (upper.includes(en)) return fr;
  }
  return raw.trim().slice(0, 60) || null;
}

// ── Normalize route ───────────────────────────────────────────────────────────
const ROUTE_MAP = {
  'ORAL': 'Orale',
  'INTRAVENOUS': 'Intraveineuse',
  'SUBCUTANEOUS': 'Sous-cutanée',
  'INTRAMUSCULAR': 'Intramusculaire',
  'TOPICAL': 'Topique',
  'OPHTHALMIC': 'Ophtalmique',
  'INHALATION': 'Inhalation',
  'NASAL': 'Nasale',
  'RECTAL': 'Rectale',
  'VAGINAL': 'Vaginale',
  'TRANSDERMAL': 'Transdermique',
  'INTRATHECAL': 'Intrathécale',
  'EPIDURAL': 'Épidurale',
  'SUBLINGUAL': 'Sublinguale',
  'BUCCAL': 'Buccale',
};

function normalizeRoute(raw) {
  if (!raw) return null;
  const upper = (raw ?? '').toUpperCase();
  for (const [en, fr] of Object.entries(ROUTE_MAP)) {
    if (upper.includes(en)) return fr;
  }
  return raw.trim().slice(0, 60) || null;
}

// ── Fetch with retry ──────────────────────────────────────────────────────────
async function fetchJSON(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(18000) });
      if (res.status === 429) { await sleep(3000 * (i + 1)); continue; }
      if (!res.ok) { if (i === retries - 1) throw new Error(`HTTP ${res.status}`); await sleep(600 * (i + 1)); continue; }
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(600 * (i + 1));
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`[NDC] Starting: ${PAGES} pages × ${LIMIT} = ${PAGES * LIMIT} products max\n`);

const seen    = new Set();
const results = [];
let   totalFetched = 0;
let   pagesOk = 0;

for (let page = 0; page < PAGES; page++) {
  const skip = page * LIMIT;
  const url  = `https://api.fda.gov/drug/ndc.json?limit=${LIMIT}&skip=${skip}`;

  process.stdout.write(`  Page ${String(page + 1).padStart(3, '0')}/${PAGES} … `);

  let data;
  try {
    data = await fetchJSON(url);
  } catch (e) {
    console.log(`FAILED (${e.message})`);
    await sleep(1500);
    continue;
  }

  const items = data?.results ?? [];
  totalFetched += items.length;
  pagesOk++;
  let newThis = 0;

  for (const item of items) {
    const genericRaw = item.generic_name ?? item.substance_name ?? '';
    const brandRaw   = item.brand_name ?? item.proprietary_name ?? '';

    if (!genericRaw && !brandRaw) continue;

    const dci  = genericRaw.trim().toLowerCase() || null;
    const nom  = brandRaw.trim() || genericRaw.trim();
    const norm = nom.toUpperCase().trim();

    if (!norm || norm.length < 2) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);

    const forme = normalizeForm(item.dosage_form);
    const route = normalizeRoute((item.route ?? [])[0]);
    const labo  = (item.labeler_name ?? '').trim().slice(0, 150) || null;
    const pays  = derivePays(item);
    const classe = deriveClasse(item);

    // Dosage from active_ingredients
    const dosages = (item.active_ingredients ?? []).map(a => `${a.name ?? ''} ${a.strength ?? ''}`.trim()).filter(Boolean);
    const dosage  = dosages[0]?.slice(0, 100) || null;

    results.push({ nom, dci, forme, dosage, route, labo, pays, classe, nom_commercial: brandRaw.trim() || null });
    newThis++;
  }

  console.log(`${items.length} items → +${newThis} new (total: ${results.length})`);

  if (data?.meta?.results?.total && skip + LIMIT >= data.meta.results.total) {
    console.log(`[NDC] Reached end of dataset at skip=${skip} (total available: ${data.meta.results.total})`);
    break;
  }

  await sleep(DELAY_MS);
}

console.log(`\n[NDC] Pages OK: ${pagesOk}/${PAGES} | Products fetched: ${totalFetched} | Unique new: ${results.length}\n`);

// Save JSON source
writeFileSync(`${SOURCES_DIR}/openfda_ndc_sample.json`, JSON.stringify(results.slice(0, 200), null, 2), 'utf8');

// Write SQL batches
const files = [];
let batchNum = 1;

for (let i = 0; i < results.length; i += BATCH_SIZE) {
  const chunk = results.slice(i, i + BATCH_SIZE);
  const label = String(batchNum).padStart(3, '0');
  const fname = `scripts/sources/ndc_batch_${label}.sql`;

  const vals = chunk.map(r => {
    const dciVal  = r.dci  ? `'${esc(r.dci)}'`   : 'NULL';
    const formeVal = r.forme ? `'${esc(r.forme)}'` : 'NULL';
    const dosVal  = r.dosage ? `'${esc(r.dosage)}'` : 'NULL';
    const routeVal = r.route ? `'${esc(r.route)}'` : 'NULL';
    const laboVal = r.labo  ? `'${esc(r.labo)}'`  : 'NULL';
    const classVal = r.classe ? `'${esc(r.classe)}'` : 'NULL';
    const nomcomVal = r.nom_commercial ? `'${esc(r.nom_commercial)}'` : 'NULL';
    return `('${esc(r.nom)}',${dciVal},${formeVal},${dosVal},${routeVal},${laboVal},'${r.pays}',${classVal},${nomcomVal})`;
  }).join(',\n');

  const sql = `-- ndc_batch_${label}.sql (${chunk.length} rows)
INSERT INTO medicaments (nom, dci, forme, dosage, voie_administration, laboratoire, pays, classe_therapeutique, nom_commercial)
SELECT v.nom, v.dci, v.forme, v.dosage, v.voie, v.labo, v.pays, v.classe, v.nomcom
FROM (VALUES
${vals}
) AS v(nom, dci, forme, dosage, voie, labo, pays, classe, nomcom)
WHERE NOT EXISTS (
  SELECT 1 FROM medicaments m WHERE UPPER(m.nom) = UPPER(v.nom)
);
`;

  writeFileSync(fname, sql, 'utf8');
  files.push(fname);
  batchNum++;
}

const lastLabel = String(batchNum - 1).padStart(3, '0');
console.log(`[NDC] ${files.length} SQL batches written (ndc_batch_001.sql → ndc_batch_${lastLabel}.sql)`);
console.log(`[NDC] Total new medications to import: ${results.length.toLocaleString()}`);
console.log('[NDC] Next: execute batches via Supabase MCP.\n');
