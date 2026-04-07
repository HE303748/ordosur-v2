/**
 * import-moroccan-meds.mjs
 * Merge CNOPS (cnops_meds.json) + medicament.ma (medicament_ma.json)
 * and import into Supabase medicaments table with pays='MA'
 *
 * Requires: migration 20260407000001 already executed (pays + ppv_ma columns)
 * Requires: temporary INSERT policy for anon on medicaments
 *
 * Run:
 *   node scripts/import-moroccan-meds.mjs
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL  = 'https://yxzvukryngvlzjgaydqj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4enZ1a3J5bmd2bHpqZ2F5ZHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTAzMTQsImV4cCI6MjA4NDA2NjMxNH0.w0empkUZmdeva1cmwDVDog_g5qyMdyBoamgEIFkjJwM';
const BATCH = 200;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

function normalize(s) {
  return (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  // 1. Load both datasets
  const cnops = JSON.parse(readFileSync(join(__dirname, 'cnops_meds.json'), 'utf8'));
  const maMeds = JSON.parse(readFileSync(join(__dirname, 'medicament_ma.json'), 'utf8'));

  console.log(`CNOPS: ${cnops.length} meds`);
  console.log(`medicament.ma: ${maMeds.length} meds`);

  // 2. Build a map from medicament.ma by normalized nom_commercial for enrichment
  const maMap = new Map();
  for (const m of maMeds) {
    const key = normalize(m.nom_commercial);
    if (!maMap.has(key)) maMap.set(key, m);
  }

  // 3. Enrich CNOPS entries with medicament.ma data where available
  const merged = new Map(); // key = normalize(nom_commercial)|normalize(forme)

  for (const c of cnops) {
    const key = `${normalize(c.nom_commercial)}|${normalize(c.forme || '')}`;
    if (merged.has(key)) continue;

    const maMatch = maMap.get(normalize(c.nom_commercial));
    const ppv = c.ppv_ma || (maMatch && maMatch.ppv_ma) || null;

    merged.set(key, {
      nom: c.nom || c.nom_commercial,
      dci: c.dci || null,
      forme: c.forme || null,
      dosage: c.dosage || null,
      ppv_ma: ppv,
      pays: 'MA',
    });
  }

  // 4. Add medicament.ma entries not in CNOPS
  for (const m of maMeds) {
    const key = `${normalize(m.nom_commercial)}|${normalize(m.forme || '')}`;
    if (merged.has(key)) continue;

    merged.set(key, {
      nom: m.nom || m.nom_commercial,
      dci: null,
      forme: m.forme || null,
      dosage: null,
      ppv_ma: m.ppv_ma || null,
      pays: 'MA',
    });
  }

  const all = [...merged.values()];
  console.log(`\nTotal unique MA meds to import: ${all.length}`);

  // 5. Check if pays column exists (migration ran)
  const { data: testRow, error: testErr } = await supabase
    .from('medicaments')
    .select('id, pays')
    .limit(1);

  if (testErr && testErr.message.includes('pays')) {
    console.error('\n❌ Column "pays" not found. Run migration 20260407000001 in Supabase SQL editor first.');
    console.error('   SQL file: supabase/migrations/20260407000001_add_pays_ppv_to_medicaments.sql');
    process.exit(1);
  }

  // 6. Insert in batches
  let inserted = 0;
  let errors = 0;
  const batches = Math.ceil(all.length / BATCH);

  for (let i = 0; i < batches; i++) {
    const batch = all.slice(i * BATCH, (i + 1) * BATCH);
    const { error } = await supabase.from('medicaments').insert(batch);

    if (error) {
      console.error(`  Batch ${i + 1}/${batches} ERROR:`, error.message);
      errors++;
    } else {
      inserted += batch.length;
      process.stdout.write(`\r  Inserted: ${inserted}/${all.length}`);
    }

    if (i < batches - 1) await sleep(150);
  }

  console.log(`\n\n✅ Done: ${inserted} inserted, ${errors} batch errors`);
}

main().catch(e => { console.error(e); process.exit(1); });
