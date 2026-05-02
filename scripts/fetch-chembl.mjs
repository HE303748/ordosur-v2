// scripts/fetch-chembl.mjs — ChEMBL approved drugs (max_phase=4)
// Source: https://www.ebi.ac.uk/chembl/api/data/molecule
// Target: add approved clinical drugs to medicaments table
// Usage: node scripts/fetch-chembl.mjs

import { writeFileSync, mkdirSync, existsSync } from 'fs';

const PAGE_SIZE   = 1000;
const MAX_PAGES   = 20;    // 20 × 1000 = 20,000 molecules max
const BATCH_SIZE  = 80;
const DELAY_MS    = 400;
const SOURCES_DIR = 'scripts/sources';

if (!existsSync(SOURCES_DIR)) mkdirSync(SOURCES_DIR, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc   = s  => String(s ?? '').replace(/'/g, "''");

// ── Map ChEMBL molecule_type → French class ───────────────────────────────────
const TYPE_MAP = {
  'Small molecule': null,           // will use therapeutic flag
  'Antibody':       'Anticorps monoclonal',
  'Protein':        'Protéine thérapeutique',
  'Oligosaccharide':'Oligosaccharide',
  'Oligonucleotide':'Oligonucléotide',
  'Enzyme':         'Enzyme',
  'Cell':           'Thérapie cellulaire',
  'Unknown':        null,
};

// ── Derive forme/voie from molecule_type ──────────────────────────────────────
function deriveFormeRoute(item) {
  const type = item.molecule_type ?? '';
  if (type === 'Antibody' || type === 'Protein' || type === 'Enzyme') {
    return { forme: 'Solution injectable', voie: 'Intraveineuse' };
  }
  if (type === 'Oligonucleotide') {
    return { forme: 'Solution injectable', voie: 'Sous-cutanée' };
  }
  return { forme: null, voie: null };
}

// ── Fetch with retry ──────────────────────────────────────────────────────────
async function fetchJSON(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(20000),
        headers: { 'Accept': 'application/json' },
      });
      if (res.status === 429) { await sleep(4000 * (i + 1)); continue; }
      if (!res.ok) {
        if (i === retries - 1) throw new Error(`HTTP ${res.status}`);
        await sleep(1000 * (i + 1)); continue;
      }
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(1000 * (i + 1));
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('[ChEMBL] Fetching approved drugs (max_phase=4)…\n');

const seen    = new Set();
const results = [];
let totalFetched = 0;
let offset = 0;
let totalAvail = Infinity;

for (let page = 0; page < MAX_PAGES && offset < totalAvail; page++) {
  const url = `https://www.ebi.ac.uk/chembl/api/data/molecule.json?max_phase=4&limit=${PAGE_SIZE}&offset=${offset}&format=json`;

  process.stdout.write(`  Page ${String(page + 1).padStart(2,'0')} (offset=${offset}) … `);

  let data;
  try {
    data = await fetchJSON(url);
  } catch (e) {
    console.log(`FAILED: ${e.message}`);
    await sleep(2000);
    continue;
  }

  if (page === 0) {
    totalAvail = data?.page_meta?.total_count ?? Infinity;
    console.log(`[ChEMBL] Total approved molecules available: ${totalAvail.toLocaleString()}`);
  }

  const items = data?.molecules ?? [];
  totalFetched += items.length;
  let newThis = 0;

  for (const item of items) {
    const name = (item.pref_name ?? '').trim();
    if (!name || name.length < 2 || name.length > 100) continue;

    const norm = name.toUpperCase();
    if (seen.has(norm)) continue;
    seen.add(norm);

    const type   = item.molecule_type ?? '';
    const classe = TYPE_MAP[type] ?? null;
    const { forme, voie } = deriveFormeRoute(item);

    // synonyms: pick first INN synonym if available
    const syns = item.molecule_synonyms ?? [];
    const inn  = syns.find(s => (s.syn_type ?? '').toUpperCase() === 'INN');
    const dci  = (inn?.molecule_synonym ?? name).toLowerCase().slice(0, 100);

    results.push({ nom: name, dci, forme, voie, classe, pays: 'INT' });
    newThis++;
  }

  console.log(`${items.length} fetched → +${newThis} new (total: ${results.length})`);

  if (items.length < PAGE_SIZE) {
    console.log('[ChEMBL] End of dataset reached.');
    break;
  }

  offset += PAGE_SIZE;
  await sleep(DELAY_MS);
}

console.log(`\n[ChEMBL] Done — ${results.length.toLocaleString()} unique approved molecules\n`);

// Save sample JSON
writeFileSync(`${SOURCES_DIR}/chembl_sample.json`,
  JSON.stringify(results.slice(0, 100), null, 2), 'utf8');

// Write SQL batches
const files = [];
let batchNum = 1;

for (let i = 0; i < results.length; i += BATCH_SIZE) {
  const chunk = results.slice(i, i + BATCH_SIZE);
  const label = String(batchNum).padStart(3, '0');
  const fname = `${SOURCES_DIR}/chembl_batch_${label}.sql`;

  const vals = chunk.map(r => {
    const dciVal   = r.dci    ? `'${esc(r.dci)}'`    : 'NULL';
    const formeVal = r.forme  ? `'${esc(r.forme)}'`  : 'NULL';
    const voieVal  = r.voie   ? `'${esc(r.voie)}'`   : 'NULL';
    const classeVal= r.classe ? `'${esc(r.classe)}'` : 'NULL';
    return `('${esc(r.nom)}',${dciVal},${formeVal},${voieVal},'${r.pays}',${classeVal})`;
  }).join(',\n');

  writeFileSync(fname,
    `-- chembl_batch_${label}.sql (${chunk.length} rows)\n` +
    `INSERT INTO medicaments (nom, dci, forme, voie_administration, pays, classe_therapeutique)\n` +
    `SELECT v.nom, v.dci, v.forme, v.voie, v.pays, v.classe\n` +
    `FROM (VALUES\n${vals}\n) AS v(nom, dci, forme, voie, pays, classe)\n` +
    `WHERE NOT EXISTS (\n  SELECT 1 FROM medicaments m WHERE LOWER(m.nom) = LOWER(v.nom)\n);\n`,
    'utf8');
  files.push(fname);
  batchNum++;
}

const lastLabel = String(batchNum - 1).padStart(3, '0');
console.log(`[ChEMBL] ${files.length} SQL batches written (chembl_batch_001 → chembl_batch_${lastLabel})`);
console.log(`[ChEMBL] Total molecules to import: ${results.length.toLocaleString()}`);
console.log('[ChEMBL] Next: import via Supabase MCP.\n');
