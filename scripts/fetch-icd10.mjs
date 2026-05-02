// scripts/fetch-icd10.mjs — Partie A : ICD-10-CM complet
// Source 1 : CDC FTP (fichier texte ~70 000 codes)
// Source 2 : NLM API (fallback lettre par lettre)
// Usage: node scripts/fetch-icd10.mjs

import { writeFileSync, mkdirSync, existsSync } from 'fs';

const BATCH_SIZE = 80;
const DELAY_MS   = 320;
const SOURCES_DIR = 'scripts/sources';

if (!existsSync(SOURCES_DIR)) mkdirSync(SOURCES_DIR, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc   = s  => String(s ?? '').replace(/'/g, "''");

// ── ICD-10 chapter → French category name ────────────────────────────────────
function getCategory(code) {
  const letter = code[0].toUpperCase();
  const num    = parseInt(code.slice(1, 3), 10);
  if (letter === 'A' || letter === 'B') return 'Maladies infectieuses et parasitaires';
  if (letter === 'C') return 'Tumeurs malignes';
  if (letter === 'D') return num <= 49 ? 'Tumeurs bénignes et in situ' : 'Maladies du sang et troubles immunitaires';
  if (letter === 'E') return 'Maladies endocriniennes, nutritionnelles et métaboliques';
  if (letter === 'F') return 'Troubles mentaux et du comportement';
  if (letter === 'G') return 'Maladies du système nerveux';
  if (letter === 'H') return num <= 59 ? "Maladies de l'œil et de ses annexes" : "Maladies de l'oreille et de l'apophyse mastoïde";
  if (letter === 'I') return "Maladies de l'appareil circulatoire";
  if (letter === 'J') return "Maladies de l'appareil respiratoire";
  if (letter === 'K') return "Maladies de l'appareil digestif";
  if (letter === 'L') return 'Maladies de la peau et du tissu cellulaire sous-cutané';
  if (letter === 'M') return "Maladies de l'appareil locomoteur";
  if (letter === 'N') return "Maladies de l'appareil génito-urinaire";
  if (letter === 'O') return 'Grossesse, accouchement et puerpéralité';
  if (letter === 'P') return 'Affections dont l\'origine se situe dans la période périnatale';
  if (letter === 'Q') return 'Malformations congénitales et anomalies chromosomiques';
  if (letter === 'R') return 'Symptômes, signes et résultats anormaux';
  if (letter === 'S' || letter === 'T') return 'Traumatismes, empoisonnements et autres causes externes';
  if (letter >= 'V' && letter <= 'Y') return 'Causes externes de morbidité et de mortalité';
  if (letter === 'Z') return 'Facteurs influant sur l\'état de santé';
  return 'Non classifié';
}

// ── Basic EN→FR medical term translation ─────────────────────────────────────
const FR_RULES = [
  // Specific disease patterns first (order matters)
  [/^Type 2 diabetes mellitus/i, 'Diabète sucré de type 2'],
  [/^Type 1 diabetes mellitus/i, 'Diabète sucré de type 1'],
  [/^Other specified diabetes mellitus/i, 'Autre diabète sucré spécifié'],
  [/^Drug or chemical induced diabetes mellitus/i, 'Diabète sucré induit par médicament ou substance chimique'],
  [/^Diabetes mellitus/i, 'Diabète sucré'],
  [/^Essential \(primary\) hypertension/i, 'Hypertension essentielle (primaire)'],
  [/^Hypertensive heart disease/i, 'Cardiopathie hypertensive'],
  [/^Hypertensive chronic kidney disease/i, 'Néphropathie hypertensive chronique'],
  [/^Hypertension/i, 'Hypertension'],
  [/^Acute myocardial infarction/i, 'Infarctus aigu du myocarde'],
  [/^Other acute ischemic heart diseases/i, 'Autres cardiopathies ischémiques aiguës'],
  [/^Chronic ischemic heart disease/i, 'Cardiopathie ischémique chronique'],
  [/^Heart failure/i, 'Insuffisance cardiaque'],
  [/^Atrial fibrillation/i, 'Fibrillation auriculaire'],
  [/^Stroke/i, 'Accident vasculaire cérébral'],
  [/^Cerebral infarction/i, 'Infarctus cérébral'],
  [/^Intracerebral hemorrhage/i, 'Hémorragie intracérébrale'],
  [/^Asthma/i, 'Asthme'],
  [/^Chronic obstructive pulmonary disease/i, 'Bronchopneumopathie chronique obstructive'],
  [/^Pneumonia/i, 'Pneumonie'],
  [/^Influenza/i, 'Grippe'],
  [/^COVID-19/i, 'COVID-19'],
  [/^Anxiety disorder/i, "Trouble anxieux"],
  [/^Major depressive disorder/i, 'Trouble dépressif majeur'],
  [/^Depression/i, 'Dépression'],
  [/^Bipolar disorder/i, 'Trouble bipolaire'],
  [/^Schizophrenia/i, 'Schizophrénie'],
  [/^Alzheimer.s disease/i, "Maladie d'Alzheimer"],
  [/^Parkinson.s disease/i, 'Maladie de Parkinson'],
  [/^Epilepsy/i, 'Épilepsie'],
  [/^Multiple sclerosis/i, 'Sclérose en plaques'],
  [/^Rheumatoid arthritis/i, 'Polyarthrite rhumatoïde'],
  [/^Osteoarthritis/i, 'Arthrose'],
  [/^Osteoporosis/i, 'Ostéoporose'],
  [/^Chronic kidney disease/i, 'Maladie rénale chronique'],
  [/^Acute kidney failure/i, 'Insuffisance rénale aiguë'],
  [/^Kidney failure/i, 'Insuffisance rénale'],
  [/^Liver failure/i, 'Insuffisance hépatique'],
  [/^Liver disease/i, 'Maladie hépatique'],
  [/^Cirrhosis/i, 'Cirrhose'],
  [/^Hepatitis/i, 'Hépatite'],
  [/^Gastroesophageal reflux/i, 'Reflux gastro-œsophagien'],
  [/^Gastric ulcer/i, 'Ulcère gastrique'],
  [/^Crohn.s disease/i, 'Maladie de Crohn'],
  [/^Ulcerative colitis/i, 'Colite ulcéreuse'],
  [/^Hypothyroidism/i, 'Hypothyroïdie'],
  [/^Hyperthyroidism/i, 'Hyperthyroïdie'],
  [/^Thyroid disorder/i, 'Trouble thyroïdien'],
  [/^Anemia/i, 'Anémie'],
  [/^Leukemia/i, 'Leucémie'],
  [/^Lymphoma/i, 'Lymphome'],
  [/^Malignant neoplasm/i, 'Tumeur maligne'],
  [/^Benign neoplasm/i, 'Tumeur bénigne'],
  [/^Carcinoma/i, 'Carcinome'],
  [/^Sepsis/i, 'Sepsis'],
  [/^Tuberculosis/i, 'Tuberculose'],
  [/^Malaria/i, 'Paludisme'],
  [/^HIV/i, 'VIH'],
  [/^AIDS/i, 'SIDA'],
  [/^Syphilis/i, 'Syphilis'],
  [/^Gonorrhea/i, 'Gonorrhée'],
  [/^Cellulitis/i, 'Cellulite infectieuse'],
  [/^Dermatitis/i, 'Dermatite'],
  [/^Psoriasis/i, 'Psoriasis'],
  [/^Fracture of/i, 'Fracture de'],
  [/^Dislocation of/i, 'Luxation de'],
  [/^Sprain of/i, 'Entorse de'],
  [/^Wound/i, 'Plaie'],
  [/^Burn/i, 'Brûlure'],
  [/^Poisoning by/i, 'Intoxication par'],
  [/^Adverse effect of/i, 'Effet indésirable de'],
  [/^Pregnancy/i, 'Grossesse'],
  [/^Miscarriage/i, 'Fausse couche'],
  [/^Preeclampsia/i, 'Prééclampsie'],
  // Word-level substitutions (applied last)
];

const WORD_MAP = {
  'acute': 'aigu',
  'chronic': 'chronique',
  'unspecified': 'non spécifié',
  'other': 'autre',
  'primary': 'primitif',
  'secondary': 'secondaire',
  'congenital': 'congénital',
  'benign': 'bénin',
  'malignant': 'malin',
  'disorder': 'trouble',
  'disease': 'maladie',
  'syndrome': 'syndrome',
  'infection': 'infection',
  'inflammation': 'inflammation',
  'failure': 'insuffisance',
  'hemorrhage': 'hémorragie',
  'hypertension': 'hypertension',
  'hypotension': 'hypotension',
  'carcinoma': 'carcinome',
  'neoplasm': 'néoplasme',
  'tumor': 'tumeur',
  'fracture': 'fracture',
  'poisoning': 'intoxication',
  'deficiency': 'carence',
  'absence': 'absence',
  'degeneration': 'dégénérescence',
  'obstruction': 'obstruction',
  'stenosis': 'sténose',
  'rupture': 'rupture',
};

function translateEN(en) {
  // Try specific rules first
  for (const [pattern, fr] of FR_RULES) {
    if (pattern.test(en)) {
      // Apply the replacement and keep the rest of the string
      const rest = en.replace(pattern, '').trim();
      const result = fr + (rest ? `, ${rest.toLowerCase()}` : '');
      return result;
    }
  }
  // Apply word-level substitutions
  let fr = en;
  for (const [enWord, frWord] of Object.entries(WORD_MAP)) {
    const re = new RegExp(`\\b${enWord}\\b`, 'gi');
    fr = fr.replace(re, frWord);
  }
  return fr;
}

// ── Fetch ICD-10-CM from CDC ──────────────────────────────────────────────────
async function fetchFromCDC() {
  const urls = [
    'https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2024/icd10cm-codes-2024.txt',
    'https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2023/icd10cm-codes-2023.txt',
  ];

  for (const url of urls) {
    try {
      console.log(`  Trying CDC: ${url}`);
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) { console.log(`  HTTP ${res.status}`); continue; }
      const text = await res.text();
      if (text.length < 1000) { console.log('  Response too small, skipping'); continue; }
      console.log(`  CDC OK — ${text.length.toLocaleString()} bytes`);
      return text;
    } catch (e) {
      console.log(`  CDC error: ${e.message}`);
    }
  }
  return null;
}

function parseCDCText(text) {
  const entries = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Format: CODE\tDESCRIPTION  or  CODE  DESCRIPTION (fixed-width, code is first 7 chars)
    let code, name;
    if (trimmed.includes('\t')) {
      [code, ...rest] = trimmed.split('\t');
      name = rest.join('\t').trim();
    } else {
      // Fixed-width: code is 3-7 chars before spaces
      const match = trimmed.match(/^([A-Z][0-9A-Z]{2,6})\s+(.+)$/);
      if (!match) continue;
      [, code, name] = match;
    }
    code = code.trim().toUpperCase();
    name = (name || '').trim();
    if (code && name && /^[A-Z][0-9]/.test(code)) {
      entries.push({ code, name });
    }
  }
  return entries;
}

// ── Fallback: NLM API ─────────────────────────────────────────────────────────
async function fetchFromNLM() {
  const entries = [];
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  console.log('[NLM] Fetching ICD-10-CM via NLM Clinical Tables API (A→Z pagination)...');

  for (const letter of LETTERS) {
    let offset = 0;
    let total  = Infinity;
    let page   = 0;

    while (offset < total) {
      const url = `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?terms=${letter}&sf=code,name&maxList=500&offset=${offset}`;
      try {
        const res  = await fetch(url, { signal: AbortSignal.timeout(15000) });
        const json = await res.json();
        // Response: [total, [codes], null, [[code, name], ...]]
        total = json[0] ?? 0;
        const items = json[3] ?? [];
        for (const [code, name] of items) {
          if (code && name && code.startsWith(letter)) {
            entries.push({ code: code.trim(), name: name.trim() });
          }
        }
        page++;
        if (page % 5 === 0) process.stdout.write(`    ${letter}: ${offset}/${total} (${entries.length} total)\r`);
        offset += 500;
      } catch (e) {
        console.warn(`\n  NLM error for ${letter} offset=${offset}: ${e.message}`);
        await sleep(1000);
        break;
      }
      await sleep(DELAY_MS);
    }
    console.log(`  Letter ${letter}: done (${total.toLocaleString()} codes fetched)`);
  }
  return entries;
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('[ICD-10] Starting comprehensive import...\n');

// Step 1: Try CDC FTP
console.log('[ICD-10] Step 1/3: Attempting CDC FTP download...');
let rawEntries = [];
const cdcText = await fetchFromCDC();

if (cdcText) {
  rawEntries = parseCDCText(cdcText);
  console.log(`[ICD-10] Parsed ${rawEntries.length.toLocaleString()} entries from CDC file`);
  writeFileSync(`${SOURCES_DIR}/icd10_cdc_raw.json`, JSON.stringify(rawEntries.slice(0, 100), null, 2), 'utf8');
}

if (rawEntries.length < 10000) {
  // Step 2: Fallback to NLM API
  console.log('\n[ICD-10] Step 2/3: Falling back to NLM Clinical Tables API...');
  rawEntries = await fetchFromNLM();
  console.log(`[ICD-10] Total from NLM: ${rawEntries.length.toLocaleString()} entries`);
}

// Step 3: Deduplicate by code
console.log('\n[ICD-10] Step 3/3: Deduplicating and preparing SQL batches...');
const byCode = new Map();
for (const e of rawEntries) {
  if (!byCode.has(e.code)) byCode.set(e.code, e.name);
}

// Save full JSON source
writeFileSync(`${SOURCES_DIR}/icd10_all.json`, JSON.stringify([...byCode.entries()].map(([c,n])=>({code:c,name:n})), null, 2), 'utf8');
console.log(`[ICD-10] Unique codes: ${byCode.size.toLocaleString()}`);

// Build rows
const rows = [];
for (const [code, nameEN] of byCode) {
  const nameFR  = translateEN(nameEN);
  const categorie = getCategory(code);
  rows.push({ code, nameEN, nameFR, categorie });
}

// Write SQL batches
let batchNum = 1;
const files = [];

for (let i = 0; i < rows.length; i += BATCH_SIZE) {
  const chunk = rows.slice(i, i + BATCH_SIZE);
  const label = String(batchNum).padStart(3, '0');
  const fname = `scripts/sources/icd10_batch_${label}.sql`;

  const vals = chunk.map(r =>
    `('${esc(r.nameFR)}','${esc(r.nameEN)}','${esc(r.categorie)}','${esc(r.code)}')`
  ).join(',\n');

  const sql = `-- icd10_batch_${label}.sql (${chunk.length} rows)
INSERT INTO pathologies (nom_fr, nom_en, categorie, icd10_code)
VALUES
${vals}
ON CONFLICT (nom_fr) DO NOTHING;
`;

  writeFileSync(fname, sql, 'utf8');
  files.push(fname);
  batchNum++;
}

const lastLabel = String(batchNum - 1).padStart(3, '0');
console.log(`\n[ICD-10] ${files.length} SQL batches written (icd10_batch_001.sql → icd10_batch_${lastLabel}.sql)`);
console.log(`[ICD-10] Total pathologies to import: ${rows.length.toLocaleString()}`);
console.log('[ICD-10] Next: execute SQL batches via Supabase MCP.\n');
