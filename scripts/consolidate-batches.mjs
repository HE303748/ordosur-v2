// scripts/consolidate-batches.mjs
// Fusionne tous les batches SQL en gros chunks de MAX_ROWS lignes
// pour réduire le nombre d'appels execute_sql nécessaires.
// Usage: node scripts/consolidate-batches.mjs

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const SOURCES_DIR = 'scripts/sources';
const OUT_DIR     = 'scripts/merged';
const MAX_ROWS    = 5000;  // lignes par chunk

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// ── Pathologies (icd10v2_batch_*.sql + icd10_batch_*.sql) ────────────────────
function mergePathologies() {
  const files = readdirSync(SOURCES_DIR)
    .filter(f => (f.startsWith('icd10v2_batch_') || f.startsWith('icd10_batch_')) && f.endsWith('.sql'))
    .sort();

  console.log(`[pathologies] ${files.length} fichiers sources`);

  // Extraire les lignes VALUES de chaque fichier
  const allRows = [];
  for (const f of files) {
    const content = readFileSync(`${SOURCES_DIR}/${f}`, 'utf8');
    // Chercher les lignes entre VALUES\n et \nON CONFLICT
    const match = content.match(/VALUES\n([\s\S]+?)\nON CONFLICT/);
    if (!match) continue;
    const rowLines = match[1].trim().split('\n').filter(l => l.trim().startsWith('('));
    for (const row of rowLines) {
      allRows.push(row.replace(/,\s*$/, '')); // enlever virgule trailing si présente
    }
  }

  console.log(`[pathologies] ${allRows.length} lignes VALUES extraites`);

  // Déduplication locale (par icd10_code = 4e élément)
  const seen = new Set();
  const dedupRows = allRows.filter(row => {
    // Extraire le code ICD-10 (4e valeur entre quotes)
    const parts = row.match(/'([^']*)'/g);
    if (!parts || parts.length < 4) return true;
    const code = parts[3];
    if (seen.has(code)) return false;
    seen.add(code);
    return true;
  });

  console.log(`[pathologies] ${dedupRows.length} lignes uniques après dédup locale`);

  // Écrire les chunks
  let chunkNum = 1;
  const chunkFiles = [];
  for (let i = 0; i < dedupRows.length; i += MAX_ROWS) {
    const chunk = dedupRows.slice(i, i + MAX_ROWS);
    const label = String(chunkNum).padStart(3, '0');
    const fname = `${OUT_DIR}/pathologies_merged_${label}.sql`;
    const sql = `-- pathologies_merged_${label}.sql (${chunk.length} rows)\n` +
      `INSERT INTO pathologies (nom_fr, nom_en, categorie, icd10_code)\nVALUES\n` +
      chunk.join(',\n') +
      `\nON CONFLICT (nom_fr) DO NOTHING;\n`;
    writeFileSync(fname, sql, 'utf8');
    chunkFiles.push(fname);
    chunkNum++;
  }
  console.log(`[pathologies] → ${chunkFiles.length} fichiers merged (pathologies_merged_001..${String(chunkNum-1).padStart(3,'0')})\n`);
  return chunkFiles.length;
}

// ── Médicaments (pattern WHERE NOT EXISTS) ────────────────────────────────────
function mergeMedicaments(prefix, table, columns, vColumns) {
  const files = readdirSync(SOURCES_DIR)
    .filter(f => f.startsWith(prefix) && f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log(`[${prefix}] Aucun fichier trouvé`);
    return 0;
  }

  console.log(`[${prefix}] ${files.length} fichiers sources`);

  const allRows = [];
  for (const f of files) {
    const content = readFileSync(`${SOURCES_DIR}/${f}`, 'utf8');
    // Pattern: FROM (VALUES\n...\n) AS v(...)
    const match = content.match(/FROM \(VALUES\n([\s\S]+?)\n\) AS v/);
    if (!match) {
      // Try alternate VALUES pattern for icd10
      const match2 = content.match(/VALUES\n([\s\S]+?)\nON CONFLICT/);
      if (match2) {
        const rows = match2[1].trim().split('\n').filter(l => l.trim().startsWith('('));
        allRows.push(...rows.map(r => r.replace(/,\s*$/, '')));
      }
      continue;
    }
    const rowLines = match[1].trim().split('\n').filter(l => l.trim().startsWith('('));
    allRows.push(...rowLines.map(r => r.replace(/,\s*$/, '')));
  }

  console.log(`[${prefix}] ${allRows.length} lignes VALUES extraites`);

  // Déduplication locale (par 1er élément = nom)
  const seen = new Set();
  const dedupRows = allRows.filter(row => {
    const m = row.match(/'([^']*)'/);
    if (!m) return true;
    const key = m[1].toUpperCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[${prefix}] ${dedupRows.length} lignes uniques après dédup locale`);

  let chunkNum = 1;
  const chunkFiles = [];
  for (let i = 0; i < dedupRows.length; i += MAX_ROWS) {
    const chunk = dedupRows.slice(i, i + MAX_ROWS);
    const label = String(chunkNum).padStart(3, '0');
    const outPrefix = prefix.replace(/_batch_$/, '').replace(/_$/, '');
    const fname = `${OUT_DIR}/${outPrefix}_merged_${label}.sql`;
    const sql = `-- ${outPrefix}_merged_${label}.sql (${chunk.length} rows)\n` +
      `INSERT INTO ${table} (${columns})\n` +
      `SELECT ${vColumns} FROM (VALUES\n` +
      chunk.join(',\n') +
      `\n) AS v(${vColumns})\n` +
      `WHERE NOT EXISTS (\n  SELECT 1 FROM ${table} m WHERE LOWER(m.nom) = LOWER(v.nom)\n);\n`;
    writeFileSync(fname, sql, 'utf8');
    chunkFiles.push(fname);
    chunkNum++;
  }
  console.log(`[${prefix}] → ${chunkFiles.length} fichiers merged\n`);
  return chunkFiles.length;
}

// ── Run ───────────────────────────────────────────────────────────────────────
const pCount  = mergePathologies();
const ndcCount = mergeMedicaments(
  'ndc_batch_',
  'medicaments',
  'nom, dci, forme, dosage, voie_administration, laboratoire, pays, classe_therapeutique, nom_commercial',
  'nom, dci, forme, dosage, voie, labo, pays, classe, nomcom'
);
const rxCount  = mergeMedicaments(
  'rxnorm_batch_',
  'medicaments',
  'nom, dci, pays',
  'nom, dci, pays'
);
const chemblCount = mergeMedicaments(
  'chembl_batch_',
  'medicaments',
  'nom, dci, forme, voie_administration, pays, classe_therapeutique',
  'nom, dci, forme, voie, pays, classe'
);

console.log('=== RÉSUMÉ ===');
console.log(`Pathologies chunks : ${pCount}  (${pCount} × execute_sql)`);
console.log(`NDC chunks         : ${ndcCount}`);
console.log(`RxNorm chunks      : ${rxCount}`);
console.log(`ChEMBL chunks      : ${chemblCount}`);
console.log(`TOTAL execute_sql  : ${pCount + ndcCount + rxCount + chemblCount}`);
