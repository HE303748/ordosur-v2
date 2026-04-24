/**
 * enrich-medicaments-ma.mjs — Enrichissement maximal des médicaments MA
 * =====================================================================
 * 1. CNOPS → EAN + remboursement_cnops + DCI manquantes
 * 2. Cross-référence FR → DCI pour les MA sans DCI
 * 3. Extraction dosage depuis nom_commercial / nom
 * 4. Classe thérapeutique depuis DCI (mapping prédéfini)
 * 5. Rapport final
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL  = 'https://yxzvukryngvlzjgaydqj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4enZ1a3J5bmd2bHpqZ2F5ZHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTAzMTQsImV4cCI6MjA4NDA2NjMxNH0.w0empkUZmdeva1cmwDVDog_g5qyMdyBoamgEIFkjJwM';
const BATCH = 50;

const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function normalize(s) {
  return (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

// ── Classe thérapeutique depuis DCI ──────────────────────────────────────────
const DCI_TO_CLASSE = {
  // Antibiotiques
  amoxicilline:'Antibiotique', amoxicilline_clavulanate:'Antibiotique',
  erythromycine:'Antibiotique', azithromycine:'Antibiotique',
  clarithromycine:'Antibiotique', ciprofloxacine:'Antibiotique',
  levofloxacine:'Antibiotique', doxycycline:'Antibiotique',
  cefixime:'Antibiotique', cefalexine:'Antibiotique', ceftriaxone:'Antibiotique',
  metronidazole:'Antibiotique', trimethoprime:'Antibiotique',
  cotrimoxazole:'Antibiotique', penicilline:'Antibiotique',
  ampicilline:'Antibiotique', oxacilline:'Antibiotique',
  clindamycine:'Antibiotique', vancomycine:'Antibiotique',
  // Antidiabétiques
  metformine:'Antidiabétique', glibenclamide:'Antidiabétique',
  glimepiride:'Antidiabétique', gliclazide:'Antidiabétique',
  sitagliptine:'Antidiabétique', vildagliptine:'Antidiabétique',
  dapagliflozine:'Antidiabétique', empagliflozine:'Antidiabétique',
  insuline:'Antidiabétique', acarbose:'Antidiabétique',
  pioglitazone:'Antidiabétique', repaglinide:'Antidiabétique',
  // Antihypertenseurs / CV
  amlodipine:'Antihypertenseur', ramipril:'Antihypertenseur',
  perindopril:'Antihypertenseur', enalapril:'Antihypertenseur',
  lisinopril:'Antihypertenseur', captopril:'Antihypertenseur',
  losartan:'Antihypertenseur', valsartan:'Antihypertenseur',
  irbesartan:'Antihypertenseur', telmisartan:'Antihypertenseur',
  bisoprolol:'Antihypertenseur', metoprolol:'Antihypertenseur',
  atenolol:'Antihypertenseur', carvedilol:'Antihypertenseur',
  nifedipine:'Antihypertenseur', diltiazem:'Antihypertenseur',
  verapamil:'Antihypertenseur', hydrochlorothiazide:'Antihypertenseur',
  furosemide:'Diurétique', spironolactone:'Diurétique',
  indapamide:'Antihypertenseur', olmesartan:'Antihypertenseur',
  // Statines / Lipides
  atorvastatine:'Hypolipémiant', simvastatine:'Hypolipémiant',
  rosuvastatine:'Hypolipémiant', pravastatine:'Hypolipémiant',
  fluvastatine:'Hypolipémiant', ezetimibe:'Hypolipémiant',
  fenofibrate:'Hypolipémiant', gemfibrozil:'Hypolipémiant',
  // Analgésiques / Anti-inflammatoires
  paracetamol:'Analgésique', ibuprofen:'Anti-inflammatoire',
  diclofenac:'Anti-inflammatoire', ketoprofene:'Anti-inflammatoire',
  naproxene:'Anti-inflammatoire', piroxicam:'Anti-inflammatoire',
  meloxicam:'Anti-inflammatoire', celecoxib:'Anti-inflammatoire',
  indometacine:'Anti-inflammatoire', acide_acetylsalicylique:'Analgésique',
  tramadol:'Analgésique (opioïde)', codeine:'Analgésique (opioïde)',
  morphine:'Analgésique (opioïde)', buprenorphine:'Analgésique (opioïde)',
  // Antiacides / Digestifs
  omeprazole:'Antiulcéreux', esomeprazole:'Antiulcéreux',
  lansoprazole:'Antiulcéreux', pantoprazole:'Antiulcéreux',
  ranitidine:'Antiulcéreux', famotidine:'Antiulcéreux',
  domperidone:'Antiémétique', metoclopramide:'Antiémétique',
  ondansetron:'Antiémétique', loperamide:'Antidiarrhéique',
  // Antihistaminiques / Allergie
  cetirizine:'Antihistaminique', loratadine:'Antihistaminique',
  desloratadine:'Antihistaminique', fexofenadine:'Antihistaminique',
  hydroxyzine:'Antihistaminique', dexchlorpheniramine:'Antihistaminique',
  // Antifongiques
  fluconazole:'Antifongique', itraconazole:'Antifongique',
  ketoconazole:'Antifongique', voriconazole:'Antifongique',
  clotrimazole:'Antifongique', miconazole:'Antifongique',
  terbinafine:'Antifongique', nystatin:'Antifongique',
  // Antiviraux
  aciclovir:'Antiviral', valaciclovir:'Antiviral',
  oseltamivir:'Antiviral', ribavirine:'Antiviral',
  // Antiparasitaires
  albendazole:'Antiparasitaire', mebendazole:'Antiparasitaire',
  metronidazole_p:'Antiparasitaire', chloroquine:'Antipaludéen',
  quinine:'Antipaludéen', artemether:'Antipaludéen',
  // Psychotropes
  diazepam:'Anxiolytique', alprazolam:'Anxiolytique',
  lorazepam:'Anxiolytique', clonazepam:'Antiépileptique',
  bromazepam:'Anxiolytique', zolpidem:'Hypnotique',
  zopiclone:'Hypnotique', phenobarbital:'Antiépileptique',
  valproate:'Antiépileptique', carbamazepine:'Antiépileptique',
  lamotrigine:'Antiépileptique', levetiracetam:'Antiépileptique',
  sertraline:'Antidépresseur', fluoxetine:'Antidépresseur',
  paroxetine:'Antidépresseur', escitalopram:'Antidépresseur',
  citalopram:'Antidépresseur', venlafaxine:'Antidépresseur',
  amitriptyline:'Antidépresseur', clomipramine:'Antidépresseur',
  risperidone:'Antipsychotique', olanzapine:'Antipsychotique',
  quetiapine:'Antipsychotique', haloperidol:'Antipsychotique',
  aripiprazole:'Antipsychotique', clozapine:'Antipsychotique',
  // Hormones / Endocrinologie
  levothyroxine:'Hormone thyroïdienne', thyroxine:'Hormone thyroïdienne',
  prednisolone:'Corticoïde', prednisone:'Corticoïde',
  dexamethasone:'Corticoïde', betamethasone:'Corticoïde',
  hydrocortisone:'Corticoïde', methylprednisolone:'Corticoïde',
  estradiol:'Hormone sexuelle', progesterone:'Hormone sexuelle',
  testosterone:'Hormone sexuelle', ethinylestradiol:'Contraceptif',
  levonorgestrel:'Contraceptif', desogestrel:'Contraceptif',
  // Vitamines / Suppléments
  vitamine_d:'Vitamine', vitamine_b12:'Vitamine',
  acide_folique:'Vitamine', fer:'Minéral', calcium:'Minéral',
  magnesium:'Minéral', zinc:'Minéral', potassium:'Minéral',
  // Respiratoire
  salbutamol:'Bronchodilatateur', terbutaline:'Bronchodilatateur',
  salmeterol:'Bronchodilatateur', formoterol:'Bronchodilatateur',
  ipratropium:'Bronchodilatateur', tiotropium:'Bronchodilatateur',
  beclometasone:'Corticoïde inhalé', budesonide:'Corticoïde inhalé',
  fluticasone:'Corticoïde inhalé', montelukast:'Antiasthmatique',
  // Ophtalmologie
  timolol:'Antiglaucomateux', latanoprost:'Antiglaucomateux',
  bimatoprost:'Antiglaucomateux', brimonidine:'Antiglaucomateux',
  // Urologie
  tamsulosine:'Alpha-bloquant', alfuzosine:'Alpha-bloquant',
  finasteride:'Inhibiteur 5-alpha réductase', dutasteride:'Inhibiteur 5-alpha réductase',
  solifenacine:'Anticholinergique', oxybutynine:'Anticholinergique',
  // Anticoagulants
  warfarine:'Anticoagulant', acenocoumarol:'Anticoagulant',
  heparine:'Anticoagulant', enoxaparine:'Anticoagulant',
  rivaroxaban:'Anticoagulant', apixaban:'Anticoagulant',
  dabigatran:'Anticoagulant', clopidogrel:'Antiagrégant plaquettaire',
  // Oncologie
  tamoxifene:'Antiestrogène', letrozole:'Anti-aromatase',
  imatinib:'Antinéoplasique', capecitabine:'Antinéoplasique',
};

function dciToClasse(dci) {
  if (!dci) return null;
  const n = normalize(dci)
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/, '_');
  for (const [key, val] of Object.entries(DCI_TO_CLASSE)) {
    if (n.includes(key.replace(/_p$/, ''))) return val;
  }
  return null;
}

// ── Extraction dosage depuis nom ──────────────────────────────────────────────
function extractDosage(nom) {
  if (!nom) return null;
  // Pattern: "AMOXIL 500 MG" ou "GLUCOPHAGE 1000" ou "PARACETAMOL 500MG/5ML"
  const match = nom.match(/(\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|ui|iu|mci|µg|mg\/ml|mg\/g|mg\/5ml|microg|mmol|meq|%)(?:\s*\/\s*\d+\s*(?:mg|ml|g))?)/i);
  return match ? match[1].trim().toUpperCase() : null;
}

// ── Chargement par pages ────────────────────────────────────────────────────
async function loadAllMA() {
  console.log('📥 Chargement des médicaments MA...');
  const all = [];
  let page = 0;
  while (true) {
    const { data, error } = await sb
      .from('medicaments')
      .select('id, nom, nom_commercial, dci, forme, dosage, ean, classe_therapeutique, remboursement_cnops')
      .eq('pays', 'MA')
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (error) { console.error('Erreur chargement:', error.message); break; }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    page++;
    await sleep(100);
  }
  console.log(`  → ${all.length} médicaments MA chargés`);
  return all;
}

async function loadFRDci() {
  console.log('📥 Chargement DCI des médicaments FR...');
  const all = [];
  let page = 0;
  while (true) {
    const { data, error } = await sb
      .from('medicaments')
      .select('nom_commercial, dci')
      .neq('pays', 'MA')
      .not('dci', 'is', null)
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (error) { console.error('Erreur FR:', error.message); break; }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    page++;
    await sleep(100);
  }
  console.log(`  → ${all.length} médicaments FR avec DCI`);
  return all;
}

// ── Update batches ─────────────────────────────────────────────────────────
async function batchUpdate(updates, label) {
  if (updates.length === 0) { console.log(`  ${label}: aucune mise à jour`); return 0; }
  console.log(`\n✏️  ${label}: ${updates.length} enregistrements...`);
  let done = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const chunk = updates.slice(i, i + BATCH);
    await Promise.all(chunk.map(async u => {
      const { id, ...patch } = u;
      const { error } = await sb.from('medicaments').update(patch).eq('id', id);
      if (!error) done++;
    }));
    if (i % 500 === 0 || i + BATCH >= updates.length) {
      process.stdout.write(`\r  → ${Math.min(done + chunk.length - 1, updates.length)}/${updates.length}`);
    }
    await sleep(60);
  }
  console.log(`\r  → ${done}/${updates.length} ✅`);
  return done;
}

// ── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 ENRICHISSEMENT MAXIMAL — médicaments MA\n' + '='.repeat(50));

  // ── Snapshot initial ───────────────────────────────────────────────────
  const snap = async () => {
    const { data } = await sb.from('medicaments').select(
      'id, dci, dosage, ean, classe_therapeutique, remboursement_cnops'
    ).eq('pays', 'MA');
    return {
      total: data?.length || 0,
      dci: data?.filter(m => m.dci).length || 0,
      dosage: data?.filter(m => m.dosage).length || 0,
      ean: data?.filter(m => m.ean).length || 0,
      classe: data?.filter(m => m.classe_therapeutique).length || 0,
      cnops: data?.filter(m => m.remboursement_cnops).length || 0,
    };
  };

  const before = await snap();
  console.log('\n📊 Avant enrichissement:');
  console.log(`   Total MA: ${before.total} | DCI: ${before.dci} | Dosage: ${before.dosage}`);
  console.log(`   EAN: ${before.ean} | Classe: ${before.classe} | CNOPS: ${before.cnops}`);

  // ── Charger les données ────────────────────────────────────────────────
  const [maMeds, frMeds] = await Promise.all([loadAllMA(), loadFRDci()]);
  const cnops = JSON.parse(readFileSync(join(__dirname, 'cnops_meds.json'), 'utf8'));

  // ── Index FR pour cross-DCI ────────────────────────────────────────────
  // Par nom_commercial exact
  const frByExact = new Map();
  // Par premier mot du nom_commercial
  const frByFirstWord = new Map();

  for (const fr of frMeds) {
    if (!fr.nom_commercial || !fr.dci) continue;
    const exact = normalize(fr.nom_commercial);
    if (!frByExact.has(exact)) frByExact.set(exact, fr.dci);

    const firstWord = normalize(fr.nom_commercial).split(' ')[0];
    if (firstWord.length >= 4) {
      if (!frByFirstWord.has(firstWord)) frByFirstWord.set(firstWord, new Map());
      const dciCount = frByFirstWord.get(firstWord);
      dciCount.set(fr.dci, (dciCount.get(fr.dci) || 0) + 1);
    }
  }

  // ── Index CNOPS ────────────────────────────────────────────────────────
  // Par nom_commercial + forme normalisé
  const cnopsByKey = new Map();
  const cnopsByNom = new Map();
  for (const c of cnops) {
    const k1 = `${normalize(c.nom_commercial)}|${normalize(c.forme || '')}`;
    const k2 = normalize(c.nom_commercial);
    cnopsByKey.set(k1, c);
    if (!cnopsByNom.has(k2)) cnopsByNom.set(k2, c);
  }

  // ── Phase 1 : Enrichissement CNOPS ─────────────────────────────────────
  console.log('\n── Phase 1 : CNOPS → EAN + DCI + remboursement_cnops ──');
  const cnopsUpdates = [];

  for (const ma of maMeds) {
    const k1 = `${normalize(ma.nom_commercial)}|${normalize(ma.forme || '')}`;
    const k2 = normalize(ma.nom_commercial);
    const c = cnopsByKey.get(k1) || cnopsByNom.get(k2);
    if (!c) continue;

    const patch = { id: ma.id };
    let needsUpdate = false;

    if (!ma.remboursement_cnops) { patch.remboursement_cnops = true; needsUpdate = true; }
    if (!ma.ean && c.ean)         { patch.ean = c.ean; needsUpdate = true; }
    if (!ma.dci && c.dci)         { patch.dci = c.dci; needsUpdate = true; }

    if (needsUpdate) cnopsUpdates.push(patch);
  }
  await batchUpdate(cnopsUpdates, 'CNOPS enrichissement');

  // ── Phase 2 : Cross DCI FR→MA ──────────────────────────────────────────
  console.log('\n── Phase 2 : DCI cross-référence FR→MA ──');
  const dciUpdates = [];

  // Recharger après phase 1
  const maAfterP1 = await loadAllMA();

  for (const ma of maAfterP1) {
    if (ma.dci) continue; // déjà enrichi

    // 1. Match exact
    const dciExact = frByExact.get(normalize(ma.nom_commercial));
    if (dciExact) {
      dciUpdates.push({ id: ma.id, dci: dciExact });
      continue;
    }

    // 2. Match premier mot (consensus : DCI majoritaire)
    const firstWord = normalize(ma.nom_commercial).split(' ')[0];
    if (firstWord.length >= 4) {
      const dciMap = frByFirstWord.get(firstWord);
      if (dciMap && dciMap.size > 0) {
        // Prendre la DCI la plus fréquente (consensus)
        let bestDci = null, bestCount = 0;
        for (const [dci, count] of dciMap) {
          if (count > bestCount) { bestCount = count; bestDci = dci; }
        }
        if (bestDci && bestCount >= 2) { // Minimum 2 occurrences pour fiabilité
          dciUpdates.push({ id: ma.id, dci: bestDci });
        }
      }
    }
  }

  await batchUpdate(dciUpdates, 'DCI depuis FR');

  // ── Phase 3 : Extraction dosage ────────────────────────────────────────
  console.log('\n── Phase 3 : Extraction dosage depuis nom ──');
  const dosageUpdates = [];

  const maAfterP2 = await loadAllMA();
  for (const ma of maAfterP2) {
    if (ma.dosage) continue;
    const dosage = extractDosage(ma.nom) || extractDosage(ma.nom_commercial);
    if (dosage) dosageUpdates.push({ id: ma.id, dosage });
  }
  await batchUpdate(dosageUpdates, 'Dosage extraction');

  // ── Phase 4 : Classe thérapeutique depuis DCI ──────────────────────────
  console.log('\n── Phase 4 : Classe thérapeutique depuis DCI ──');
  const classeUpdates = [];

  const maAfterP3 = await loadAllMA();
  for (const ma of maAfterP3) {
    if (ma.classe_therapeutique) continue;
    const classe = dciToClasse(ma.dci);
    if (classe) classeUpdates.push({ id: ma.id, classe_therapeutique: classe });
  }
  await batchUpdate(classeUpdates, 'Classe thérapeutique');

  // ── Rapport final ──────────────────────────────────────────────────────
  const after = await snap();

  console.log('\n' + '='.repeat(50));
  console.log('📊 RAPPORT FINAL ENRICHISSEMENT');
  console.log('='.repeat(50));
  console.log(`Total MA:         ${after.total}`);
  console.log(`DCI:              ${before.dci} → ${after.dci}  (+${after.dci - before.dci})`);
  console.log(`Dosage:           ${before.dosage} → ${after.dosage}  (+${after.dosage - before.dosage})`);
  console.log(`EAN:              ${before.ean} → ${after.ean}  (+${after.ean - before.ean})`);
  console.log(`Classe thérap.:   ${before.classe} → ${after.classe}  (+${after.classe - before.classe})`);
  console.log(`Remboursé CNOPS:  ${before.cnops} → ${after.cnops}  (+${after.cnops - before.cnops})`);
  console.log('='.repeat(50));
}

main().catch(e => { console.error('\n❌ Erreur:', e); process.exit(1); });
