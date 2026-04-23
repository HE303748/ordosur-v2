/**
 * update-laboratoire.mjs
 * Met à jour le champ laboratoire pour les médicaments MA déjà en base
 * en utilisant medicament_ma.json comme source
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL  = 'https://yxzvukryngvlzjgaydqj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4enZ1a3J5bmd2bHpqZ2F5ZHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTAzMTQsImV4cCI6MjA4NDA2NjMxNH0.w0empkUZmdeva1cmwDVDog_g5qyMdyBoamgEIFkjJwM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

function normalize(s) {
  return (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const maMeds = JSON.parse(readFileSync(join(__dirname, 'medicament_ma.json'), 'utf8'));

  // Charger tous les meds MA de la DB
  console.log('Chargement DB...');
  let dbMeds = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('medicaments')
      .select('id, nom, nom_commercial, laboratoire')
      .eq('pays', 'MA')
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    dbMeds.push(...data);
    if (data.length < 1000) break;
    page++;
  }
  console.log(`${dbMeds.length} en base, ${maMeds.length} dans JSON`);

  // Index DB par nom normalisé et par nom_commercial normalisé
  const byNom = new Map();
  for (const r of dbMeds) {
    if (!r.laboratoire) { // seulement ceux sans labo
      byNom.set(normalize(r.nom), r.id);
    }
  }

  // Construire la liste des updates
  const updates = [];
  for (const m of maMeds) {
    if (!m.laboratoire) continue;
    // Chercher par nom exact
    const id = byNom.get(normalize(m.nom));
    if (id) {
      updates.push({ id, laboratoire: m.laboratoire, nom_commercial: m.nom_commercial });
    }
  }

  console.log(`${updates.length} mises à jour laboratoire à faire`);

  // UPDATE en batches de 50 (requêtes individuelles parallèles)
  let done = 0;
  const CHUNK = 30;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const chunk = updates.slice(i, i + CHUNK);
    await Promise.all(chunk.map(async u => {
      const patch = { laboratoire: u.laboratoire };
      // Améliorer nom_commercial si c'est plus court/propre
      if (u.nom_commercial && u.nom_commercial.length < 50) {
        patch.nom_commercial = u.nom_commercial;
      }
      const { error } = await supabase
        .from('medicaments')
        .update(patch)
        .eq('id', u.id);
      if (!error) done++;
    }));
    if (i % 300 === 0) process.stdout.write(`\r  ${done}/${updates.length} mis à jour`);
    await sleep(80);
  }

  console.log(`\r✅ ${done}/${updates.length} laboratoires mis à jour`);

  // Vérification finale
  const { count } = await supabase
    .from('medicaments')
    .select('*', { count: 'exact', head: true })
    .eq('pays', 'MA')
    .not('laboratoire', 'is', null);
  console.log(`\nMédicaments MA avec laboratoire: ${count}`);
}

main().catch(e => { console.error(e); process.exit(1); });
