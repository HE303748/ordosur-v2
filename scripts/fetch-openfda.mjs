// scripts/fetch-openfda.mjs — Étape 3
// Fetch 50 pages from OpenFDA drug/label, parse drug interactions, write SQL batches
// Usage: node scripts/fetch-openfda.mjs

import { writeFileSync } from 'fs';

const PAGES      = 50;
const LIMIT      = 100;
const BATCH_SIZE = 40;
const DELAY_MS   = 150;  // ms between requests — OpenFDA allows 240 req/min without key
const BASE_URL   = 'https://api.fda.gov/drug/label.json';

// ── Drug dictionary: term to search in interaction text → normalized DCI ──────
// Covers ~165 high-priority drugs across 8 therapeutic classes
const DRUG_MAP = {
  // ── Anticoagulants / Antiplatelets ──────────────────────────────────────────
  'warfarin':              'warfarin',
  'heparin':               'heparin',
  'enoxaparin':            'enoxaparin',
  'rivaroxaban':           'rivaroxaban',
  'apixaban':              'apixaban',
  'dabigatran':            'dabigatran',
  'edoxaban':              'edoxaban',
  'clopidogrel':           'clopidogrel',
  'ticagrelor':            'ticagrelor',
  'prasugrel':             'prasugrel',
  'fondaparinux':          'fondaparinux',
  'aspirin':               'aspirin',
  'acetylsalicylic acid':  'aspirin',
  'dipyridamole':          'dipyridamole',
  'ticlopidine':           'ticlopidine',

  // ── NSAIDs ───────────────────────────────────────────────────────────────────
  'ibuprofen':             'ibuprofen',
  'naproxen':              'naproxen',
  'diclofenac':            'diclofenac',
  'celecoxib':             'celecoxib',
  'indomethacin':          'indomethacin',
  'ketorolac':             'ketorolac',
  'meloxicam':             'meloxicam',
  'piroxicam':             'piroxicam',
  'etoricoxib':            'etoricoxib',
  'ketoprofen':            'ketoprofen',

  // ── Cardiovasculaires ────────────────────────────────────────────────────────
  'metoprolol':            'metoprolol',
  'atenolol':              'atenolol',
  'bisoprolol':            'bisoprolol',
  'carvedilol':            'carvedilol',
  'propranolol':           'propranolol',
  'labetalol':             'labetalol',
  'nebivolol':             'nebivolol',
  'amlodipine':            'amlodipine',
  'nifedipine':            'nifedipine',
  'diltiazem':             'diltiazem',
  'verapamil':             'verapamil',
  'felodipine':            'felodipine',
  'lisinopril':            'lisinopril',
  'enalapril':             'enalapril',
  'ramipril':              'ramipril',
  'captopril':             'captopril',
  'perindopril':           'perindopril',
  'losartan':              'losartan',
  'valsartan':             'valsartan',
  'irbesartan':            'irbesartan',
  'candesartan':           'candesartan',
  'telmisartan':           'telmisartan',
  'furosemide':            'furosemide',
  'hydrochlorothiazide':   'hydrochlorothiazide',
  'chlorthalidone':        'chlorthalidone',
  'spironolactone':        'spironolactone',
  'eplerenone':            'eplerenone',
  'digoxin':               'digoxin',
  'amiodarone':            'amiodarone',
  'flecainide':            'flecainide',
  'sotalol':               'sotalol',
  'dronedarone':           'dronedarone',
  'atorvastatin':          'atorvastatin',
  'simvastatin':           'simvastatin',
  'rosuvastatin':          'rosuvastatin',
  'pravastatin':           'pravastatin',
  'lovastatin':            'lovastatin',
  'nitroglycerin':         'nitroglycerin',
  'isosorbide mononitrate':'isosorbide mononitrate',
  'ivabradine':            'ivabradine',
  'sacubitril':            'sacubitril',
  'hydralazine':           'hydralazine',
  'clonidine':             'clonidine',
  'doxazosin':             'doxazosin',

  // ── Antibiotiques ────────────────────────────────────────────────────────────
  'amoxicillin':           'amoxicillin',
  'ampicillin':            'ampicillin',
  'piperacillin':          'piperacillin',
  'ciprofloxacin':         'ciprofloxacin',
  'levofloxacin':          'levofloxacin',
  'moxifloxacin':          'moxifloxacin',
  'ofloxacin':             'ofloxacin',
  'azithromycin':          'azithromycin',
  'clarithromycin':        'clarithromycin',
  'erythromycin':          'erythromycin',
  'doxycycline':           'doxycycline',
  'tetracycline':          'tetracycline',
  'minocycline':           'minocycline',
  'metronidazole':         'metronidazole',
  'vancomycin':            'vancomycin',
  'gentamicin':            'gentamicin',
  'tobramycin':            'tobramycin',
  'amikacin':              'amikacin',
  'fluconazole':           'fluconazole',
  'itraconazole':          'itraconazole',
  'ketoconazole':          'ketoconazole',
  'voriconazole':          'voriconazole',
  'posaconazole':          'posaconazole',
  'isavuconazole':         'isavuconazole',
  'rifampin':              'rifampin',
  'rifampicin':            'rifampin',
  'trimethoprim':          'trimethoprim',
  'sulfamethoxazole':      'sulfamethoxazole',
  'nitrofurantoin':        'nitrofurantoin',
  'linezolid':             'linezolid',
  'daptomycin':            'daptomycin',
  'colistin':              'colistin',
  'cefazolin':             'cefazolin',
  'ceftriaxone':           'ceftriaxone',
  'cefepime':              'cefepime',

  // ── SNC / Psychiatrie ────────────────────────────────────────────────────────
  'lithium':               'lithium',
  'phenytoin':             'phenytoin',
  'carbamazepine':         'carbamazepine',
  'valproic acid':         'valproic acid',
  'valproate':             'valproate',
  'phenobarbital':         'phenobarbital',
  'levetiracetam':         'levetiracetam',
  'gabapentin':            'gabapentin',
  'pregabalin':            'pregabalin',
  'lamotrigine':           'lamotrigine',
  'topiramate':            'topiramate',
  'oxcarbazepine':         'oxcarbazepine',
  'diazepam':              'diazepam',
  'alprazolam':            'alprazolam',
  'lorazepam':             'lorazepam',
  'clonazepam':            'clonazepam',
  'zolpidem':              'zolpidem',
  'midazolam':             'midazolam',
  'haloperidol':           'haloperidol',
  'risperidone':           'risperidone',
  'olanzapine':            'olanzapine',
  'quetiapine':            'quetiapine',
  'clozapine':             'clozapine',
  'aripiprazole':          'aripiprazole',
  'ziprasidone':           'ziprasidone',
  'fluoxetine':            'fluoxetine',
  'sertraline':            'sertraline',
  'citalopram':            'citalopram',
  'escitalopram':          'escitalopram',
  'paroxetine':            'paroxetine',
  'fluvoxamine':           'fluvoxamine',
  'venlafaxine':           'venlafaxine',
  'duloxetine':            'duloxetine',
  'amitriptyline':         'amitriptyline',
  'nortriptyline':         'nortriptyline',
  'clomipramine':          'clomipramine',
  'bupropion':             'bupropion',
  'mirtazapine':           'mirtazapine',
  'trazodone':             'trazodone',
  'tramadol':              'tramadol',
  'morphine':              'morphine',
  'oxycodone':             'oxycodone',
  'fentanyl':              'fentanyl',
  'codeine':               'codeine',
  'hydrocodone':           'hydrocodone',
  'buprenorphine':         'buprenorphine',
  'naloxone':              'naloxone',
  'naltrexone':            'naltrexone',
  'methylphenidate':       'methylphenidate',
  'amphetamine':           'amphetamine',
  'donepezil':             'donepezil',
  'memantine':             'memantine',
  'melatonin':             'melatonin',

  // ── Endocrinologie / Métabolisme ─────────────────────────────────────────────
  'metformin':             'metformin',
  'glibenclamide':         'glibenclamide',
  'glipizide':             'glipizide',
  'gliclazide':            'gliclazide',
  'glimepiride':           'glimepiride',
  'sitagliptin':           'sitagliptin',
  'saxagliptin':           'saxagliptin',
  'empagliflozin':         'empagliflozin',
  'dapagliflozin':         'dapagliflozin',
  'canagliflozin':         'canagliflozin',
  'liraglutide':           'liraglutide',
  'semaglutide':           'semaglutide',
  'exenatide':             'exenatide',
  'insulin':               'insulin',
  'levothyroxine':         'levothyroxine',
  'propylthiouracil':      'propylthiouracil',
  'methimazole':           'methimazole',
  'prednisone':            'prednisone',
  'prednisolone':          'prednisolone',
  'dexamethasone':         'dexamethasone',
  'hydrocortisone':        'hydrocortisone',
  'methylprednisolone':    'methylprednisolone',
  'fludrocortisone':       'fludrocortisone',
  'allopurinol':           'allopurinol',
  'febuxostat':            'febuxostat',
  'colchicine':            'colchicine',
  'probenecid':            'probenecid',

  // ── Immunosuppresseurs / Biothérapies ────────────────────────────────────────
  'cyclosporine':          'cyclosporine',
  'tacrolimus':            'tacrolimus',
  'methotrexate':          'methotrexate',
  'azathioprine':          'azathioprine',
  'mycophenolate':         'mycophenolate',
  'sirolimus':             'sirolimus',
  'everolimus':            'everolimus',
  'leflunomide':           'leflunomide',
  'adalimumab':            'adalimumab',
  'infliximab':            'infliximab',
  'etanercept':            'etanercept',
  'rituximab':             'rituximab',
  'belimumab':             'belimumab',
  'abatacept':             'abatacept',

  // ── Anti-infectieux VIH/VHC ──────────────────────────────────────────────────
  'acyclovir':             'acyclovir',
  'valacyclovir':          'valacyclovir',
  'ganciclovir':           'ganciclovir',
  'oseltamivir':           'oseltamivir',
  'lopinavir':             'lopinavir',
  'ritonavir':             'ritonavir',
  'atazanavir':            'atazanavir',
  'efavirenz':             'efavirenz',
  'tenofovir':             'tenofovir',
  'lamivudine':            'lamivudine',
  'abacavir':              'abacavir',
  'emtricitabine':         'emtricitabine',
  'chloroquine':           'chloroquine',
  'hydroxychloroquine':    'hydroxychloroquine',
  'sofosbuvir':            'sofosbuvir',
  'ledipasvir':            'ledipasvir',

  // ── Gastro-entérologie ───────────────────────────────────────────────────────
  'omeprazole':            'omeprazole',
  'pantoprazole':          'pantoprazole',
  'esomeprazole':          'esomeprazole',
  'lansoprazole':          'lansoprazole',
  'rabeprazole':           'rabeprazole',
  'ranitidine':            'ranitidine',
  'cimetidine':            'cimetidine',
  'ondansetron':           'ondansetron',
  'metoclopramide':        'metoclopramide',
  'domperidone':           'domperidone',
  'sucralfate':            'sucralfate',
  'cholestyramine':        'cholestyramine',

  // ── Divers ───────────────────────────────────────────────────────────────────
  'theophylline':          'theophylline',
  'aminophylline':         'aminophylline',
  'caffeine':              'caffeine',
  'sildenafil':            'sildenafil',
  'tadalafil':             'tadalafil',
  'tamsulosin':            'tamsulosin',
  'finasteride':           'finasteride',
  'calcium':               'calcium',
  'iron':                  'iron',
  'magnesium':             'magnesium',
  'zinc':                  'zinc',
  'folic acid':            'folic acid',
  'vitamin k':             'vitamin k',
  "st. john's wort":       "st. john's wort",
  'st john':               "st. john's wort",
  'hypericum':             "st. john's wort",
  'grapefruit':            'grapefruit juice',
  'alcohol':               'alcohol',
  'ethanol':               'alcohol',
  'antacid':               'antacids',
  'antacids':              'antacids',
};

// ── Severity detection from surrounding sentence ───────────────────────────────
function detectSeverite(ctx) {
  const c = ctx.toLowerCase();
  if (/contraindicated|must not (be used|take|administer|co-administer)|do not (use|administer|take|combine)|should not be.*combined|avoid.*concomitant.*use|not.*recommended.*together|concurrent.*prohibited/.test(c)) {
    return 'contre_indication';
  }
  if (/serious(ly)?|severe(ly)?|life.?threat|fatal|deaths?|major|significantly.*increas|dangerous|cardiac arrest|serotonin syndrome|neuroleptic malignant|bleeding|hemorrhage|seizure|agranulocytosis|anaphylaxis|torsade|QT.*prolong/.test(c)) {
    return 'majeure';
  }
  if (/moderate(ly)?|caution|careful(ly)?|monitor|adjust.*dose|dose.*adjust|reduce.*dose|increas.*risk|may.*affect|can.*alter|clinical(ly).*signif|close.*supervis/.test(c)) {
    return 'moderee';
  }
  return 'mineure';
}

// ── French description template ───────────────────────────────────────────────
// Note: severite values must match existing DB data — 'moderee' (no accent) is the canonical form
const SEV_LABEL = {
  contre_indication: 'Contre-indication : association déconseillée (risque grave documenté).',
  majeure:           'Interaction majeure : surveillance étroite requise, adapter posologie si nécessaire.',
  moderee:           "Interaction modérée : précaution d'emploi, surveillance clinique recommandée.",
  mineure:           'Interaction mineure : association généralement possible, surveillance habituelle.',
};
function genDescription(d1, d2, sev) {
  return `${d1} × ${d2} — ${SEV_LABEL[sev]}`;
}

// ── Normalize OpenFDA substance name ─────────────────────────────────────────
const SALT_RE = /\s+(?:hydrochloride|hcl|sodium|potassium|calcium|sulfate|mesylate|maleate|tartrate|acetate|phosphate|nitrate|citrate|gluconate|succinate|malate|bromide|chloride|oxalate|fumarate|besylate|tosylate|pamoate|stearate|monohydrate|anhydrous)\b/gi;
function normalizeName(raw) {
  if (!raw) return null;
  const name = raw.toLowerCase().replace(SALT_RE, '').replace(/\s+/g, ' ').trim();
  return name.length >= 3 ? name : null;
}

// ── Extract nearest sentence around the matched term ─────────────────────────
function extractContext(text, term) {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(term.toLowerCase());
  if (idx === -1) return text.slice(0, 200);
  const start = Math.max(0, text.lastIndexOf('.', idx) + 1);
  const dotAfter = text.indexOf('.', idx + term.length);
  const end = dotAfter === -1 ? Math.min(text.length, idx + 350) : dotAfter + 1;
  return text.slice(start, end).trim();
}

// ── Fetch with retry ──────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function fetchJSON(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(18000) });
      if (res.status === 429) { await sleep(3000 * (i + 1)); continue; }
      if (!res.ok) {
        if (i === retries - 1) throw new Error(`HTTP ${res.status}`);
        await sleep(600 * (i + 1)); continue;
      }
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(600 * (i + 1));
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
const esc = s => String(s).replace(/'/g, "''");
const seen = new Set();
const interactions = [];
let totalLabels = 0;
let pagesOk = 0;

const drugEntries = Object.entries(DRUG_MAP);
console.log(`[OpenFDA] Starting: ${PAGES} pages × ${LIMIT} = ${PAGES * LIMIT} labels max`);
console.log(`[OpenFDA] Drug dictionary: ${drugEntries.length} search terms, ${new Set(Object.values(DRUG_MAP)).size} unique DCIs\n`);

for (let page = 0; page < PAGES; page++) {
  const skip = page * LIMIT;
  const url  = `${BASE_URL}?search=_exists_:drug_interactions&limit=${LIMIT}&skip=${skip}`;

  process.stdout.write(`  Page ${String(page + 1).padStart(2, '0')}/${PAGES} (skip=${String(skip).padStart(4, '0')}) … `);

  let data;
  try {
    data = await fetchJSON(url);
  } catch (e) {
    console.log(`FAILED — ${e.message}`);
    await sleep(1500);
    continue;
  }

  const labels = data?.results ?? [];
  totalLabels += labels.length;
  pagesOk++;
  let newThisPage = 0;

  for (const label of labels) {
    const rawSubstance =
      label.openfda?.substance_name?.[0] ??
      label.openfda?.generic_name?.[0] ??
      label.openfda?.brand_name?.[0];

    const primary = normalizeName(rawSubstance);
    if (!primary) continue;

    const interactionRaw = label.drug_interactions;
    const interactionText = Array.isArray(interactionRaw)
      ? interactionRaw.join(' ')
      : typeof interactionRaw === 'string' ? interactionRaw : '';
    if (interactionText.length < 30) continue;

    const textLower = interactionText.toLowerCase();

    for (const [searchTerm, dciNorm] of drugEntries) {
      // Skip self
      if (primary === dciNorm || primary.includes(dciNorm) || dciNorm.includes(primary)) continue;

      if (!textLower.includes(searchTerm.toLowerCase())) continue;

      const context  = extractContext(interactionText, searchTerm);
      const severite = detectSeverite(context);

      // Alphabetical sort to create canonical pair
      const [d1, d2] = primary < dciNorm ? [primary, dciNorm] : [dciNorm, primary];
      const key = `${d1}\x00${d2}`;
      if (seen.has(key)) continue;
      seen.add(key);

      interactions.push({ d1, d2, severite, desc: genDescription(d1, d2, severite) });
      newThisPage++;
    }
  }

  console.log(`${labels.length} labels → +${newThisPage} new (running total: ${interactions.length})`);
  await sleep(DELAY_MS);
}

console.log(`\n[OpenFDA] Pages OK: ${pagesOk}/${PAGES} | Labels processed: ${totalLabels} | Unique new pairs: ${interactions.length}\n`);

if (interactions.length === 0) {
  console.log('[OpenFDA] No new interactions found. The 160k existing entries may already cover these 50 pages.');
  process.exit(0);
}

// ── Write SQL batch files ─────────────────────────────────────────────────────
const batchFiles = [];
let bNum = 1;

for (let i = 0; i < interactions.length; i += BATCH_SIZE) {
  const chunk  = interactions.slice(i, i + BATCH_SIZE);
  const bLabel = String(bNum).padStart(2, '0');
  const fname  = `scripts/drug_int_batch_${bLabel}.sql`;

  const rows = chunk
    .map(r => `('${esc(r.d1)}','${esc(r.d2)}','${esc(r.severite)}','${esc(r.desc)}')`)
    .join(',\n');

  const sql =
`-- drug_int_batch_${bLabel}.sql — OpenFDA Étape 3 (${chunk.length} rows)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT v.d1, v.d2, v.sev, v.descr
FROM (VALUES
${rows}
) AS v(d1, d2, sev, descr)
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions di
  WHERE di.dci_1_pattern = v.d1 AND di.dci_2_pattern = v.d2
);
`;

  writeFileSync(fname, sql, 'utf8');
  batchFiles.push(fname);
  bNum++;
}

const lastLabel = String(bNum - 1).padStart(2, '0');
console.log(`[OpenFDA] ${batchFiles.length} SQL batch files written:`);
console.log(`          drug_int_batch_01.sql → drug_int_batch_${lastLabel}.sql`);
console.log('\n[OpenFDA] Next step: execute each batch via Supabase MCP, then check COUNT(*).\n');
