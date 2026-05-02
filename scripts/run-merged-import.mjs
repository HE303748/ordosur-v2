// scripts/run-merged-import.mjs
// Import autonome des fichiers merged via Supabase RPC (pas de service role key requise)
// Usage: node scripts/run-merged-import.mjs
// Prérequis : migration create_exec_sql_batch_helper appliquée

import { readFileSync, readdirSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://yxzvukryngvlzjgaydqj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4enZ1a3J5bmd2bHpqZ2F5ZHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTAzMTQsImV4cCI6MjA4NDA2NjMxNH0.w0empkUZmdeva1cmwDVDog_g5qyMdyBoamgEIFkjJwM';
const MERGED_DIR    = 'scripts/merged';
const DELAY_MS      = 200; // délai entre appels RPC

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
const sleep    = ms => new Promise(r => setTimeout(r, ms));

// Ordre d'import : pathologies d'abord, puis médicaments
const ORDER = [
  'pathologies_merged_',
  'ndc_merged_',
  'rxnorm_merged_',
  'chembl_merged_',
];

async function main() {
  // Compter avant
  const { data: before } = await supabase
    .from('pathologies').select('id', { count: 'exact', head: true });

  console.log('[Import] Démarrage de l\'import via exec_sql_batch RPC\n');

  const allFiles = readdirSync(MERGED_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort((a, b) => {
      const ai = ORDER.findIndex(p => a.startsWith(p));
      const bi = ORDER.findIndex(p => b.startsWith(p));
      if (ai !== bi) return ai - bi;
      return a.localeCompare(b);
    });

  console.log(`[Import] ${allFiles.length} fichiers merged à traiter\n`);

  let ok = 0, failed = 0;

  for (const fname of allFiles) {
    const sql = readFileSync(`${MERGED_DIR}/${fname}`, 'utf8');

    process.stdout.write(`  ${fname} (${(sql.length/1024).toFixed(0)}KB) … `);

    const { error } = await supabase.rpc('exec_sql_batch', { query: sql });

    if (error) {
      console.log(`ERREUR: ${error.message}`);
      failed++;

      // Si le fichier est trop grand, couper en 2 et réessayer
      if (error.message?.includes('too large') || error.message?.includes('statement too long')) {
        console.log(`  → Splitting ${fname} en 2 demi-fichiers…`);
        const lines  = sql.split('\n');
        const mid    = Math.floor(lines.length / 2);
        // Trouver une ligne VALUES pour couper proprement
        let cutPoint = mid;
        while (cutPoint > 0 && !lines[cutPoint].trim().startsWith('(')) cutPoint--;

        const header = lines.slice(0, 2).join('\n'); // INSERT + VALUES header
        const tail   = lines.slice(-2).join('\n');    // ON CONFLICT ou WHERE NOT EXISTS

        const half1 = header + '\n' + lines.slice(2, cutPoint).join('\n') + '\n' + tail;
        const half2 = header + '\n' + lines.slice(cutPoint).join('\n');

        for (const part of [half1, half2]) {
          const { error: e2 } = await supabase.rpc('exec_sql_batch', { query: part });
          if (e2) {
            console.log(`    ERREUR split: ${e2.message}`);
          } else {
            console.log(`    ✓ split ok`);
            ok++;
            if (failed > 0) failed--;
          }
          await sleep(DELAY_MS);
        }
      }
    } else {
      console.log('✓');
      ok++;
    }

    await sleep(DELAY_MS);
  }

  // Compter après
  const { count: pathCount }  = await supabase.from('pathologies').select('id', { count: 'exact', head: true });
  const { count: medCount }   = await supabase.from('medicaments').select('id', { count: 'exact', head: true });

  console.log(`\n=== RAPPORT FINAL ===`);
  console.log(`Fichiers OK     : ${ok}/${allFiles.length}`);
  console.log(`Fichiers ÉCHEC  : ${failed}`);
  console.log(`pathologies     : ${pathCount?.toLocaleString()}`);
  console.log(`medicaments     : ${medCount?.toLocaleString()}`);
}

main().catch(console.error);
