/**
 * import-ddinter.mjs
 * Importe les interactions DDInter 2.0 dans Supabase drug_interactions.
 *
 * Usage :
 *   ANTHROPIC_API_KEY=sk-ant-xxx node scripts/import-ddinter.mjs
 *
 * Sans ANTHROPIC_API_KEY : descriptions template en français (rapide).
 * Avec ANTHROPIC_API_KEY  : descriptions Claude Haiku pour les interactions Major.
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ────────────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://yxzvukryngvlzjgaydqj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4enZ1a3J5bmd2bHpqZ2F5ZHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTAzMTQsImV4cCI6MjA4NDA2NjMxNH0.w0empkUZmdeva1cmwDVDog_g5qyMdyBoamgEIFkjJwM';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const BATCH_INSERT  = 500;   // lignes par INSERT batch
const BATCH_CLAUDE  = 60;    // paires par appel Claude

const CSV_FILES = ['A','B','D','H','L','P','R','V'].map(
  c => join(__dirname, `ddinter_${c}.csv`)
);

// ─── Normalisation du nom de médicament → pattern de matching ──────────────
function normalize(name) {
  return name
    .toLowerCase()
    // Accents anglais → sans accent (pour matcher les noms BDPM accentués via .includes)
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9 -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Mapping sévérité DDInter → colonnes Supabase ─────────────────────────
function mapSeverite(level) {
  switch (level.toLowerCase()) {
    case 'major':    return 'majeure';
    case 'moderate': return 'moderee';
    case 'minor':    return 'mineure';
    default:         return 'mineure';
  }
}

// ─── Descriptions template (sans Claude API) ──────────────────────────────
function templateDescription(drugA, drugB, level) {
  switch (level.toLowerCase()) {
    case 'major':
      return `Interaction majeure : l'association ${drugA} + ${drugB} est contre-indiquée ou à éviter. Risque clinique significatif pouvant être grave ou engager le pronostic vital. Consulter un professionnel de santé avant toute co-prescription.`;
    case 'moderate':
      return `Interaction modérée entre ${drugA} et ${drugB}. Précaution d'emploi requise : surveillance clinique et biologique recommandée. Adapter la posologie si nécessaire.`;
    case 'minor':
      return `Interaction mineure entre ${drugA} et ${drugB}. Risque clinique faible ; aucune action particulière généralement nécessaire. Signaler tout effet indésirable inhabituel.`;
    default:
      return `Interaction entre ${drugA} et ${drugB} (niveau ${level}).`;
  }
}

// ─── Génération Claude Haiku (batch) ──────────────────────────────────────
let anthropic = null;
async function initAnthropic() {
  if (!ANTHROPIC_KEY) return false;
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
  return true;
}

async function generateDescriptionsBatch(pairs) {
  // pairs : [{drugA, drugB, level}]
  const list = pairs.map((p, i) => `${i+1}. ${p.drugA} + ${p.drugB} (${p.level})`).join('\n');
  const prompt = `Tu es un pharmacologue clinicien francophone expert. Pour chaque interaction médicamenteuse suivante, génère une description médicale concise EN FRANÇAIS (2 phrases max, ~80-120 mots). Inclus : le mécanisme si connu, le risque clinique, et une recommandation.

Format STRICT — réponds uniquement avec un JSON array de strings, dans le même ordre que la liste :
["description 1", "description 2", ...]

Liste des interactions :
${list}`;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });
    const raw = msg.content[0].text.trim();
    // Extraire le JSON array
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array in response');
    const descriptions = JSON.parse(match[0]);
    if (!Array.isArray(descriptions) || descriptions.length !== pairs.length) {
      throw new Error(`Expected ${pairs.length} descriptions, got ${descriptions.length}`);
    }
    return descriptions;
  } catch (err) {
    console.warn(`  ⚠ Claude batch échoué: ${err.message} — fallback template`);
    return pairs.map(p => templateDescription(p.drugA, p.drugB, p.level));
  }
}

// ─── Parser CSV DDInter ────────────────────────────────────────────────────
function parseCSV(filePath) {
  const lines = readFileSync(filePath, 'utf8').split('\n');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length < 5) continue;
    // Format: DDInterID_A,Drug_A,DDInterID_B,Drug_B,Level
    const drugA = parts[1].trim();
    const drugB = parts[3].trim();
    const level = parts[4].trim();
    if (!drugA || !drugB || !level) continue;
    rows.push({ drugA, drugB, level });
  }
  return rows;
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Import DDInter 2.0 → Supabase drug_interactions ===\n');

  // Init Supabase (avec anon key — policy temporaire autorise INSERT)
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

  // Init Claude si clé dispo
  const hasAI = await initAnthropic();
  console.log(`Claude API : ${hasAI ? '✓ Haiku activé pour les interactions Major' : '✗ non configuré — descriptions template'}`);

  // ── Lire les interactions existantes pour éviter les doublons ──
  console.log('\nChargement des interactions existantes...');
  const { data: existing } = await supabase
    .from('drug_interactions')
    .select('dci_1_pattern,dci_2_pattern');
  const existingSet = new Set(
    (existing || []).map(r => `${r.dci_1_pattern}|||${r.dci_2_pattern}`)
  );
  console.log(`${existingSet.size} interactions déjà en base.`);

  // ── Parser tous les CSV ──
  console.log('\nParsing des CSV DDInter 2.0...');
  let allRows = [];
  for (const f of CSV_FILES) {
    const rows = parseCSV(f);
    allRows.push(...rows);
    console.log(`  ${f.split('/').pop()} → ${rows.length} lignes`);
  }
  console.log(`Total brut : ${allRows.length} interactions`);

  // ── Déduplication + normalisation ──
  const seen = new Set();
  const toInsert = [];
  let skippedDupe = 0;

  for (const row of allRows) {
    const p1 = normalize(row.drugA);
    const p2 = normalize(row.drugB);
    if (!p1 || !p2) continue;

    // Clé canonique (ordre alphabétique pour éviter A+B et B+A)
    const key = p1 < p2 ? `${p1}|||${p2}` : `${p2}|||${p1}`;
    if (seen.has(key)) { skippedDupe++; continue; }
    if (existingSet.has(`${p1}|||${p2}`) || existingSet.has(`${p2}|||${p1}`)) {
      skippedDupe++; continue;
    }
    seen.add(key);
    toInsert.push({ drugA: row.drugA, drugB: row.drugB, p1, p2, level: row.level });
  }
  console.log(`Après déduplication : ${toInsert.length} nouvelles interactions (${skippedDupe} doublons ignorés)`);

  // ── Séparer Major (enrichissement Claude) et autres (template) ──
  const majorRows = toInsert.filter(r => r.level.toLowerCase() === 'major');
  const otherRows = toInsert.filter(r => r.level.toLowerCase() !== 'major');
  console.log(`  Major: ${majorRows.length} | Modérée: ${otherRows.filter(r=>r.level.toLowerCase()==='moderate').length} | Mineure: ${otherRows.filter(r=>r.level.toLowerCase()==='minor').length}`);

  // ── Générer descriptions pour Major (Claude ou template) ──
  const descriptions = new Map(); // index → description

  if (hasAI && majorRows.length > 0) {
    console.log(`\nGénération Claude Haiku pour ${majorRows.length} interactions Major (batches de ${BATCH_CLAUDE})...`);
    let done = 0;
    for (let i = 0; i < majorRows.length; i += BATCH_CLAUDE) {
      const batch = majorRows.slice(i, i + BATCH_CLAUDE);
      const descs = await generateDescriptionsBatch(batch);
      batch.forEach((r, j) => {
        const globalIdx = toInsert.indexOf(r);
        descriptions.set(globalIdx, descs[j]);
      });
      done += batch.length;
      process.stdout.write(`\r  ${done}/${majorRows.length} Major traités`);
      // Pause courte pour respecter rate limits
      if (i + BATCH_CLAUDE < majorRows.length) await sleep(1200);
    }
    console.log('');
  }

  // ── Template pour tout le reste ──
  toInsert.forEach((r, i) => {
    if (!descriptions.has(i)) {
      descriptions.set(i, templateDescription(r.drugA, r.drugB, r.level));
    }
  });

  // ── Construire les rows à insérer ──
  const rows = toInsert.map((r, i) => ({
    dci_1_pattern: r.p1,
    dci_2_pattern: r.p2,
    severite: mapSeverite(r.level),
    description: descriptions.get(i),
  }));

  // ── Insérer par batches ──
  console.log(`\nInsertion en base (batches de ${BATCH_INSERT})...`);
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_INSERT) {
    const batch = rows.slice(i, i + BATCH_INSERT);
    const { error } = await supabase.from('drug_interactions').insert(batch);
    if (error) {
      console.error(`\n  ✗ Erreur batch ${i}-${i+BATCH_INSERT}: ${error.message}`);
      errors++;
    } else {
      inserted += batch.length;
    }
    process.stdout.write(`\r  ${inserted}/${rows.length} insérées`);
  }

  console.log(`\n\n✅ Import terminé !`);
  console.log(`   Insérées    : ${inserted}`);
  console.log(`   Erreurs     : ${errors}`);
  console.log(`   Descriptions: ${hasAI ? 'Claude Haiku (Major) + template (autres)' : 'template FR'}`);
  console.log(`\n⚠  N'oublie pas de restaurer la policy INSERT (super_admin) dans Supabase !`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
