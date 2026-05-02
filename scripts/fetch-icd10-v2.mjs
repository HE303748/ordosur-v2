// scripts/fetch-icd10-v2.mjs — ICD-10-CM complet avec préfixes 2 caractères
// Contourne la limite offset=7500 de NLM en recherchant par "A0".."Z9"
// Objectif : ~70 000 codes
// Usage: node scripts/fetch-icd10-v2.mjs

import { writeFileSync, mkdirSync, existsSync } from 'fs';

const BATCH_SIZE  = 80;
const DELAY_MS    = 310;
const MAX_OFFSET  = 7000;   // NLM API hard limit before "Bad request"
const PAGE_SIZE   = 500;
const SOURCES_DIR = 'scripts/sources';

if (!existsSync(SOURCES_DIR)) mkdirSync(SOURCES_DIR, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc   = s  => String(s ?? '').replace(/'/g, "''");

// ── ICD-10 chapter → French category ─────────────────────────────────────────
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
  if (letter === 'P') return "Affections dont l'origine se situe dans la période périnatale";
  if (letter === 'Q') return 'Malformations congénitales et anomalies chromosomiques';
  if (letter === 'R') return 'Symptômes, signes et résultats anormaux';
  if (letter === 'S' || letter === 'T') return 'Traumatismes, empoisonnements et autres causes externes';
  if (letter >= 'V' && letter <= 'Y') return 'Causes externes de morbidité et de mortalité';
  if (letter === 'Z') return "Facteurs influant sur l'état de santé";
  return 'Non classifié';
}

// ── Basic EN→FR translation rules ────────────────────────────────────────────
const FR_RULES = [
  [/^Type 2 diabetes mellitus(,?)/i, 'Diabète sucré de type 2$1'],
  [/^Type 1 diabetes mellitus(,?)/i, 'Diabète sucré de type 1$1'],
  [/^Other specified diabetes mellitus/i, 'Autre diabète sucré spécifié'],
  [/^Diabetes mellitus/i, 'Diabète sucré'],
  [/^Essential \(primary\) hypertension/i, 'Hypertension essentielle (primaire)'],
  [/^Hypertensive heart/i, 'Cardiopathie hypertensive'],
  [/^Hypertensive chronic kidney/i, 'Néphropathie hypertensive chronique'],
  [/^Acute myocardial infarction/i, 'Infarctus aigu du myocarde'],
  [/^Heart failure/i, 'Insuffisance cardiaque'],
  [/^Atrial fibrillation/i, 'Fibrillation auriculaire'],
  [/^Cerebral infarction/i, 'Infarctus cérébral'],
  [/^Intracerebral hemorrhage/i, 'Hémorragie intracérébrale'],
  [/^Asthma/i, 'Asthme'],
  [/^Chronic obstructive pulmonary disease/i, 'Bronchopneumopathie chronique obstructive'],
  [/^Pneumonia/i, 'Pneumonie'],
  [/^Influenza/i, 'Grippe'],
  [/^COVID-19/i, 'COVID-19'],
  [/^Major depressive disorder/i, 'Trouble dépressif majeur'],
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
  [/^Liver failure/i, 'Insuffisance hépatique'],
  [/^Cirrhosis/i, 'Cirrhose'],
  [/^Hepatitis/i, 'Hépatite'],
  [/^Gastroesophageal reflux/i, 'Reflux gastro-œsophagien'],
  [/^Crohn.s disease/i, 'Maladie de Crohn'],
  [/^Ulcerative colitis/i, 'Colite ulcéreuse'],
  [/^Hypothyroidism/i, 'Hypothyroïdie'],
  [/^Hyperthyroidism/i, 'Hyperthyroïdie'],
  [/^Malignant neoplasm of/i, 'Tumeur maligne de'],
  [/^Benign neoplasm of/i, 'Tumeur bénigne de'],
  [/^Carcinoma/i, 'Carcinome'],
  [/^Sepsis/i, 'Sepsis'],
  [/^Tuberculosis/i, 'Tuberculose'],
  [/^Malaria/i, 'Paludisme'],
  [/^HIV disease/i, 'Maladie à VIH'],
  [/^Fracture of/i, 'Fracture de'],
  [/^Sprain of/i, 'Entorse de'],
  [/^Dislocation of/i, 'Luxation de'],
  [/^Poisoning by/i, 'Intoxication par'],
  [/^Adverse effect of/i, 'Effet indésirable de'],
  [/^Pregnancy/i, 'Grossesse'],
  [/^Preeclampsia/i, 'Prééclampsie'],
  [/^Anemia/i, 'Anémie'],
  [/^Leukemia/i, 'Leucémie'],
  [/^Lymphoma/i, 'Lymphome'],
  [/^Psoriasis/i, 'Psoriasis'],
  [/^Dermatitis/i, 'Dermatite'],
];

const WORD_MAP = {
  'acute': 'aigu', 'chronic': 'chronique', 'unspecified': 'non spécifié',
  'other': 'autre', 'primary': 'primitif', 'secondary': 'secondaire',
  'congenital': 'congénital', 'benign': 'bénin', 'malignant': 'malin',
  'disorder': 'trouble', 'disease': 'maladie', 'syndrome': 'syndrome',
  'infection': 'infection', 'failure': 'insuffisance', 'hemorrhage': 'hémorragie',
  'carcinoma': 'carcinome', 'neoplasm': 'néoplasme', 'tumor': 'tumeur',
  'fracture': 'fracture', 'deficiency': 'carence', 'obstruction': 'obstruction',
  'stenosis': 'sténose', 'rupture': 'rupture', 'inflammation': 'inflammation',
};

function translateEN(en) {
  for (const [pat, rep] of FR_RULES) {
    if (pat.test(en)) {
      return en.replace(pat, rep);
    }
  }
  let fr = en;
  for (const [enW, frW] of Object.entries(WORD_MAP)) {
    fr = fr.replace(new RegExp(`\\b${enW}\\b`, 'gi'), frW);
  }
  return fr;
}

// ── Fetch one prefix with pagination ─────────────────────────────────────────
async function fetchPrefix(prefix, allCodes) {
  let offset = 0;
  let total  = Infinity;
  let added  = 0;

  while (offset < total && offset <= MAX_OFFSET) {
    const url = `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?terms=${encodeURIComponent(prefix)}&sf=code,name&maxList=${PAGE_SIZE}&offset=${offset}`;
    let json;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) break;
      json = await res.json();
    } catch {
      break;
    }

    total = json[0] ?? 0;
    const items = json[3] ?? [];

    for (const [code, name] of items) {
      if (!code || !name) continue;
      const c = code.trim().toUpperCase().replace(/\s/g, '');
      if (!allCodes.has(c)) {
        allCodes.set(c, name.trim());
        added++;
      }
    }

    if (items.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    await sleep(DELAY_MS);
  }
  return added;
}

// ── Build prefix list ─────────────────────────────────────────────────────────
function buildPrefixes() {
  const prefixes = [];
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const DIGITS  = '0123456789';
  // 2-char prefixes: letter + digit (A0..Z9)
  for (const L of LETTERS) {
    for (const D of DIGITS) {
      prefixes.push(L + D);
    }
  }
  // Also add letter+letter for codes like Z00-Z99 and W/X/Y
  // Add specific 3-char prefixes for high-volume letters (S, T)
  for (const L of ['S', 'T']) {
    for (const D of DIGITS) {
      for (const D2 of DIGITS) {
        prefixes.push(L + D + D2);  // S00..S99, T00..T99
      }
    }
  }
  return prefixes;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const allCodes = new Map(); // code → nameEN
const prefixes = buildPrefixes();

console.log(`[ICD-10 v2] Starting with ${prefixes.length} prefixes (A0..Z9 + S00..T99)`);
console.log(`[ICD-10 v2] Estimated time: ~${Math.ceil(prefixes.length * DELAY_MS / 60000)} minutes\n`);

let done = 0;
for (const prefix of prefixes) {
  const added = await fetchPrefix(prefix, allCodes);
  done++;
  if (done % 50 === 0 || added > 500) {
    process.stdout.write(`  [${done}/${prefixes.length}] prefix="${prefix}" +${added} → total ${allCodes.size.toLocaleString()}\n`);
  } else {
    process.stdout.write(`  [${String(done).padStart(3,'0')}/${prefixes.length}] "${prefix}" +${added} (${allCodes.size.toLocaleString()})\r`);
  }
}

console.log(`\n[ICD-10 v2] Fetch complete — ${allCodes.size.toLocaleString()} unique codes\n`);

// Save JSON source
writeFileSync(`${SOURCES_DIR}/icd10_v2_all.json`,
  JSON.stringify([...allCodes.entries()].map(([c,n])=>({code:c,name:n})).slice(0,500), null, 2),
  'utf8');

// Build SQL batches
const rows = [...allCodes.entries()].map(([code, nameEN]) => ({
  code, nameEN,
  nameFR: translateEN(nameEN),
  categorie: getCategory(code),
}));

const files = [];
let batchNum = 1;

for (let i = 0; i < rows.length; i += BATCH_SIZE) {
  const chunk = rows.slice(i, i + BATCH_SIZE);
  const label = String(batchNum).padStart(3, '0');
  const fname = `${SOURCES_DIR}/icd10v2_batch_${label}.sql`;

  const vals = chunk.map(r =>
    `('${esc(r.nameFR)}','${esc(r.nameEN)}','${esc(r.categorie)}','${esc(r.code)}')`
  ).join(',\n');

  writeFileSync(fname,
    `-- icd10v2_batch_${label}.sql (${chunk.length} rows)\nINSERT INTO pathologies (nom_fr, nom_en, categorie, icd10_code)\nVALUES\n${vals}\nON CONFLICT (nom_fr) DO NOTHING;\n`,
    'utf8');
  files.push(fname);
  batchNum++;
}

const lastLabel = String(batchNum - 1).padStart(3, '0');
console.log(`[ICD-10 v2] ${files.length} SQL batches written (icd10v2_batch_001 → icd10v2_batch_${lastLabel})`);
console.log(`[ICD-10 v2] Total: ${rows.length.toLocaleString()} pathologies to import`);
