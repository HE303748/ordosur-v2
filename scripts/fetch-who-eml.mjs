// scripts/fetch-who-eml.mjs — WHO Essential Medicines List
// Source: https://list.essentialmeds.org (public API)
// Target: add ~500 WHO essential drugs to medicaments table
// Usage: node scripts/fetch-who-eml.mjs

import { writeFileSync, mkdirSync, existsSync } from 'fs';

const SOURCES_DIR = 'scripts/sources';
if (!existsSync(SOURCES_DIR)) mkdirSync(SOURCES_DIR, { recursive: true });

const esc   = s  => String(s ?? '').replace(/'/g, "''");
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ATC class → French therapeutic class
function atcToClasse(atcCode) {
  if (!atcCode) return null;
  const c = atcCode[0]?.toUpperCase();
  const map = {
    'A': 'Médicaments gastro-intestinaux et métaboliques',
    'B': 'Médicaments hématologiques',
    'C': 'Médicaments cardiovasculaires',
    'D': 'Médicaments dermatologiques',
    'G': 'Médicaments génito-urinaires',
    'H': 'Hormones systémiques',
    'J': 'Anti-infectieux systémiques',
    'K': 'Médicaments hospitaliers',
    'L': 'Antinéoplasiques et immunomodulateurs',
    'M': 'Médicaments musculo-squelettiques',
    'N': 'Médicaments du système nerveux',
    'P': 'Antiparasitaires',
    'R': 'Médicaments respiratoires',
    'S': 'Médicaments sensoriels',
    'V': 'Divers',
  };
  return map[c] ?? null;
}

async function fetchJSON(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) {
        if (i === retries - 1) throw new Error(`HTTP ${res.status}`);
        await sleep(800 * (i + 1)); continue;
      }
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(800 * (i + 1));
    }
  }
}

console.log('[WHO-EML] Fetching WHO Essential Medicines List…\n');

// Try multiple endpoints
const ENDPOINTS = [
  'https://list.essentialmeds.org/api/medicines?fields=name,atcCode,atcDescription,forms&page_size=500&page=1',
  'https://list.essentialmeds.org/api/medicines?page_size=1000',
];

let items = [];

for (const url of ENDPOINTS) {
  try {
    console.log(`  Trying: ${url}`);
    const data = await fetchJSON(url);
    if (Array.isArray(data)) { items = data; break; }
    if (Array.isArray(data?.results)) { items = data.results; break; }
    if (Array.isArray(data?.data)) { items = data.data; break; }
    if (Array.isArray(data?.medicines)) { items = data.medicines; break; }
    // If we got an object, try to extract array
    const keys = Object.keys(data ?? {});
    for (const k of keys) {
      if (Array.isArray(data[k]) && data[k].length > 10) {
        items = data[k];
        break;
      }
    }
    if (items.length > 0) break;
  } catch (e) {
    console.log(`  Failed: ${e.message}`);
  }
}

if (items.length === 0) {
  // Fallback: hardcode the WHO EML core list (23rd edition, 2023)
  console.log('[WHO-EML] API unavailable — using hardcoded 23rd edition core list\n');
  items = [
    // Anaesthetics
    { name: 'Halothane', atcCode: 'N01AB01', form: 'Inhalation' },
    { name: 'Isoflurane', atcCode: 'N01AB06', form: 'Inhalation' },
    { name: 'Ketamine', atcCode: 'N01AX03', form: 'Solution injectable' },
    { name: 'Nitrous oxide', atcCode: 'N01AX13', form: 'Gaz médicinal' },
    { name: 'Propofol', atcCode: 'N01AX10', form: 'Solution injectable' },
    { name: 'Sevoflurane', atcCode: 'N01AB08', form: 'Inhalation' },
    { name: 'Thiopental', atcCode: 'N01AF03', form: 'Poudre injectable' },
    // Analgesics
    { name: 'Acetylsalicylic acid', atcCode: 'N02BA01', form: 'Comprimé' },
    { name: 'Ibuprofen', atcCode: 'M01AE01', form: 'Comprimé' },
    { name: 'Paracetamol', atcCode: 'N02BE01', form: 'Comprimé' },
    { name: 'Codeine', atcCode: 'N02AA59', form: 'Comprimé' },
    { name: 'Morphine', atcCode: 'N02AA01', form: 'Solution injectable' },
    { name: 'Tramadol', atcCode: 'N02AX02', form: 'Comprimé' },
    { name: 'Fentanyl', atcCode: 'N01AH01', form: 'Patch transdermique' },
    { name: 'Oxycodone', atcCode: 'N02AA05', form: 'Comprimé' },
    // Antiallergics
    { name: 'Dexamethasone', atcCode: 'H02AB02', form: 'Solution injectable' },
    { name: 'Epinephrine', atcCode: 'C01CA24', form: 'Solution injectable' },
    { name: 'Loratadine', atcCode: 'R06AX13', form: 'Comprimé' },
    { name: 'Cetirizine', atcCode: 'R06AE07', form: 'Comprimé' },
    { name: 'Prednisolone', atcCode: 'H02AB06', form: 'Comprimé' },
    // Antidotes
    { name: 'Activated charcoal', atcCode: 'A07BA01', form: 'Poudre orale' },
    { name: 'Atropine', atcCode: 'A03BA01', form: 'Solution injectable' },
    { name: 'Naloxone', atcCode: 'V03AB15', form: 'Solution injectable' },
    { name: 'Acetylcysteine', atcCode: 'V03AB23', form: 'Solution injectable' },
    // Anticonvulsants
    { name: 'Carbamazepine', atcCode: 'N03AF01', form: 'Comprimé' },
    { name: 'Diazepam', atcCode: 'N05BA01', form: 'Solution injectable' },
    { name: 'Lamotrigine', atcCode: 'N03AX09', form: 'Comprimé' },
    { name: 'Levetiracetam', atcCode: 'N03AX14', form: 'Comprimé' },
    { name: 'Lorazepam', atcCode: 'N05BA06', form: 'Solution injectable' },
    { name: 'Midazolam', atcCode: 'N05CD08', form: 'Solution injectable' },
    { name: 'Phenobarbital', atcCode: 'N03AA02', form: 'Comprimé' },
    { name: 'Phenytoin', atcCode: 'N03AB02', form: 'Comprimé' },
    { name: 'Sodium valproate', atcCode: 'N03AG01', form: 'Comprimé' },
    // Anti-infective — antibacterials
    { name: 'Amikacin', atcCode: 'J01GB06', form: 'Solution injectable' },
    { name: 'Amoxicillin', atcCode: 'J01CA04', form: 'Gélule' },
    { name: 'Amoxicillin/clavulanic acid', atcCode: 'J01CR02', form: 'Comprimé' },
    { name: 'Ampicillin', atcCode: 'J01CA01', form: 'Poudre injectable' },
    { name: 'Azithromycin', atcCode: 'J01FA10', form: 'Comprimé' },
    { name: 'Benzathine benzylpenicillin', atcCode: 'J01CE08', form: 'Poudre injectable' },
    { name: 'Benzylpenicillin', atcCode: 'J01CE01', form: 'Poudre injectable' },
    { name: 'Cefazolin', atcCode: 'J01DB04', form: 'Poudre injectable' },
    { name: 'Cefixime', atcCode: 'J01DD08', form: 'Comprimé' },
    { name: 'Cefotaxime', atcCode: 'J01DD01', form: 'Poudre injectable' },
    { name: 'Ceftriaxone', atcCode: 'J01DD04', form: 'Poudre injectable' },
    { name: 'Chloramphenicol', atcCode: 'J01BA01', form: 'Gélule' },
    { name: 'Ciprofloxacin', atcCode: 'J01MA02', form: 'Comprimé' },
    { name: 'Clarithromycin', atcCode: 'J01FA09', form: 'Comprimé' },
    { name: 'Clindamycin', atcCode: 'J01FF01', form: 'Gélule' },
    { name: 'Cloxacillin', atcCode: 'J01CF02', form: 'Gélule' },
    { name: 'Co-trimoxazole', atcCode: 'J01EE01', form: 'Comprimé' },
    { name: 'Doxycycline', atcCode: 'J01AA02', form: 'Gélule' },
    { name: 'Erythromycin', atcCode: 'J01FA01', form: 'Comprimé' },
    { name: 'Gentamicin', atcCode: 'J01GB03', form: 'Solution injectable' },
    { name: 'Levofloxacin', atcCode: 'J01MA12', form: 'Comprimé' },
    { name: 'Linezolid', atcCode: 'J01XX08', form: 'Comprimé' },
    { name: 'Meropenem', atcCode: 'J01DH02', form: 'Poudre injectable' },
    { name: 'Metronidazole', atcCode: 'J01XD01', form: 'Comprimé' },
    { name: 'Nitrofurantoin', atcCode: 'J01XE01', form: 'Gélule' },
    { name: 'Oxacillin', atcCode: 'J01CF04', form: 'Poudre injectable' },
    { name: 'Piperacillin/tazobactam', atcCode: 'J01CR05', form: 'Poudre injectable' },
    { name: 'Procaine benzylpenicillin', atcCode: 'J01CE09', form: 'Poudre injectable' },
    { name: 'Rifampicin', atcCode: 'J04AB02', form: 'Gélule' },
    { name: 'Spectinomycin', atcCode: 'J01XX04', form: 'Poudre injectable' },
    { name: 'Streptomycin', atcCode: 'J01GA01', form: 'Poudre injectable' },
    { name: 'Tetracycline', atcCode: 'J01AA07', form: 'Gélule' },
    { name: 'Trimethoprim', atcCode: 'J01EA01', form: 'Comprimé' },
    { name: 'Vancomycin', atcCode: 'J01XA01', form: 'Poudre injectable' },
    // Anti-infective — antifungals
    { name: 'Amphotericin B', atcCode: 'J02AA01', form: 'Poudre injectable' },
    { name: 'Clotrimazole', atcCode: 'D01AC01', form: 'Crème' },
    { name: 'Fluconazole', atcCode: 'J02AC01', form: 'Gélule' },
    { name: 'Griseofulvin', atcCode: 'D01BA01', form: 'Comprimé' },
    { name: 'Itraconazole', atcCode: 'J02AC02', form: 'Gélule' },
    { name: 'Nystatin', atcCode: 'A07AA02', form: 'Suspension' },
    { name: 'Voriconazole', atcCode: 'J02AC03', form: 'Comprimé' },
    // Antivirals — HIV
    { name: 'Abacavir', atcCode: 'J05AF06', form: 'Comprimé' },
    { name: 'Atazanavir', atcCode: 'J05AE08', form: 'Gélule' },
    { name: 'Darunavir', atcCode: 'J05AE10', form: 'Comprimé' },
    { name: 'Dolutegravir', atcCode: 'J05AJ03', form: 'Comprimé' },
    { name: 'Efavirenz', atcCode: 'J05AG03', form: 'Comprimé' },
    { name: 'Emtricitabine', atcCode: 'J05AF09', form: 'Gélule' },
    { name: 'Lamivudine', atcCode: 'J05AF05', form: 'Comprimé' },
    { name: 'Lopinavir/ritonavir', atcCode: 'J05AR10', form: 'Comprimé' },
    { name: 'Nevirapine', atcCode: 'J05AG01', form: 'Comprimé' },
    { name: 'Raltegravir', atcCode: 'J05AJ01', form: 'Comprimé' },
    { name: 'Ritonavir', atcCode: 'J05AE03', form: 'Comprimé' },
    { name: 'Stavudine', atcCode: 'J05AF04', form: 'Gélule' },
    { name: 'Tenofovir disoproxil fumarate', atcCode: 'J05AF07', form: 'Comprimé' },
    { name: 'Zidovudine', atcCode: 'J05AF01', form: 'Comprimé' },
    // Antivirals — other
    { name: 'Aciclovir', atcCode: 'J05AB01', form: 'Comprimé' },
    { name: 'Oseltamivir', atcCode: 'J05AH02', form: 'Gélule' },
    { name: 'Ribavirin', atcCode: 'J05AB04', form: 'Gélule' },
    { name: 'Sofosbuvir', atcCode: 'J05AJ04', form: 'Comprimé' },
    { name: 'Daclatasvir', atcCode: 'J05AX14', form: 'Comprimé' },
    { name: 'Valganciclovir', atcCode: 'J05AB14', form: 'Comprimé' },
    // Antituberculosis
    { name: 'Ethambutol', atcCode: 'J04AK02', form: 'Comprimé' },
    { name: 'Isoniazid', atcCode: 'J04AC01', form: 'Comprimé' },
    { name: 'Pyrazinamide', atcCode: 'J04AK01', form: 'Comprimé' },
    { name: 'Bedaquiline', atcCode: 'J04AK05', form: 'Comprimé' },
    { name: 'Delamanid', atcCode: 'J04AK06', form: 'Comprimé' },
    { name: 'Pretomanid', atcCode: 'J04AK08', form: 'Comprimé' },
    // Antimalarials
    { name: 'Artesunate', atcCode: 'P01BE03', form: 'Poudre injectable' },
    { name: 'Artemether', atcCode: 'P01BE02', form: 'Solution injectable' },
    { name: 'Artemether/lumefantrine', atcCode: 'P01BF01', form: 'Comprimé' },
    { name: 'Chloroquine', atcCode: 'P01BA01', form: 'Comprimé' },
    { name: 'Doxycycline', atcCode: 'J01AA02', form: 'Gélule' },
    { name: 'Mefloquine', atcCode: 'P01BC02', form: 'Comprimé' },
    { name: 'Primaquine', atcCode: 'P01BA03', form: 'Comprimé' },
    { name: 'Quinine', atcCode: 'P01BC01', form: 'Solution injectable' },
    { name: 'Sulfadoxine/pyrimethamine', atcCode: 'P01BD51', form: 'Comprimé' },
    // Anthelmintics
    { name: 'Albendazole', atcCode: 'P02CA03', form: 'Comprimé' },
    { name: 'Ivermectin', atcCode: 'P02CF01', form: 'Comprimé' },
    { name: 'Mebendazole', atcCode: 'P02CA01', form: 'Comprimé' },
    { name: 'Niclosamide', atcCode: 'P02DA01', form: 'Comprimé' },
    { name: 'Praziquantel', atcCode: 'P02BA01', form: 'Comprimé' },
    { name: 'Pyrantel', atcCode: 'P02CC01', form: 'Suspension' },
    // Cardiovascular
    { name: 'Amlodipine', atcCode: 'C08CA01', form: 'Comprimé' },
    { name: 'Atenolol', atcCode: 'C07AB03', form: 'Comprimé' },
    { name: 'Bisoprolol', atcCode: 'C07AB07', form: 'Comprimé' },
    { name: 'Captopril', atcCode: 'C09AA01', form: 'Comprimé' },
    { name: 'Carvedilol', atcCode: 'C07AG02', form: 'Comprimé' },
    { name: 'Digoxin', atcCode: 'C01AA05', form: 'Comprimé' },
    { name: 'Enalapril', atcCode: 'C09AA02', form: 'Comprimé' },
    { name: 'Furosemide', atcCode: 'C03CA01', form: 'Comprimé' },
    { name: 'Glyceryl trinitrate', atcCode: 'C01DA02', form: 'Comprimé sublingual' },
    { name: 'Hydrochlorothiazide', atcCode: 'C03AA03', form: 'Comprimé' },
    { name: 'Isosorbide dinitrate', atcCode: 'C01DA08', form: 'Comprimé' },
    { name: 'Lisinopril', atcCode: 'C09AA03', form: 'Comprimé' },
    { name: 'Losartan', atcCode: 'C09CA01', form: 'Comprimé' },
    { name: 'Metoprolol', atcCode: 'C07AB02', form: 'Comprimé' },
    { name: 'Nifedipine', atcCode: 'C08CA05', form: 'Comprimé' },
    { name: 'Ramipril', atcCode: 'C09AA05', form: 'Gélule' },
    { name: 'Simvastatin', atcCode: 'C10AA01', form: 'Comprimé' },
    { name: 'Spironolactone', atcCode: 'C03DA01', form: 'Comprimé' },
    { name: 'Streptokinase', atcCode: 'B01AD01', form: 'Poudre injectable' },
    { name: 'Warfarin', atcCode: 'B01AA03', form: 'Comprimé' },
    // Endocrine
    { name: 'Glibenclamide', atcCode: 'A10BB01', form: 'Comprimé' },
    { name: 'Glimepiride', atcCode: 'A10BB12', form: 'Comprimé' },
    { name: 'Insulin injection (soluble)', atcCode: 'A10AB01', form: 'Solution injectable' },
    { name: 'Metformin', atcCode: 'A10BA02', form: 'Comprimé' },
    { name: 'Levothyroxine', atcCode: 'H03AA01', form: 'Comprimé' },
    { name: 'Propylthiouracil', atcCode: 'H03BA02', form: 'Comprimé' },
    // Gastrointestinal
    { name: 'Antacids', atcCode: 'A02A', form: 'Comprimé' },
    { name: 'Lactulose', atcCode: 'A06AD11', form: 'Solution orale' },
    { name: 'Loperamide', atcCode: 'A07DA03', form: 'Gélule' },
    { name: 'Mesalazine', atcCode: 'A07EC02', form: 'Comprimé' },
    { name: 'Omeprazole', atcCode: 'A02BC01', form: 'Gélule' },
    { name: 'Ondansetron', atcCode: 'A04AA01', form: 'Comprimé' },
    { name: 'Ranitidine', atcCode: 'A02BA02', form: 'Comprimé' },
    { name: 'Senna', atcCode: 'A06AB06', form: 'Comprimé' },
    // Respiratory
    { name: 'Beclometasone', atcCode: 'R03BA01', form: 'Inhalateur' },
    { name: 'Budesonide', atcCode: 'R03BA02', form: 'Inhalateur' },
    { name: 'Ipratropium bromide', atcCode: 'R03BB01', form: 'Inhalateur' },
    { name: 'Salbutamol', atcCode: 'R03AC02', form: 'Inhalateur' },
    { name: 'Theophylline', atcCode: 'R03DA04', form: 'Comprimé' },
    // Psychiatric
    { name: 'Amitriptyline', atcCode: 'N06AA09', form: 'Comprimé' },
    { name: 'Chlorpromazine', atcCode: 'N05AA01', form: 'Comprimé' },
    { name: 'Clomipramine', atcCode: 'N06AA04', form: 'Gélule' },
    { name: 'Fluoxetine', atcCode: 'N06AB03', form: 'Gélule' },
    { name: 'Fluphenazine', atcCode: 'N05AB02', form: 'Solution injectable' },
    { name: 'Haloperidol', atcCode: 'N05AD01', form: 'Comprimé' },
    { name: 'Lithium carbonate', atcCode: 'N05AN01', form: 'Comprimé' },
    { name: 'Olanzapine', atcCode: 'N05AH03', form: 'Comprimé' },
    { name: 'Risperidone', atcCode: 'N05AX08', form: 'Comprimé' },
    { name: 'Sertraline', atcCode: 'N06AB06', form: 'Comprimé' },
    // Oncology
    { name: 'Bleomycin', atcCode: 'L01DC01', form: 'Poudre injectable' },
    { name: 'Calcium folinate', atcCode: 'V03AF03', form: 'Solution injectable' },
    { name: 'Capecitabine', atcCode: 'L01BC06', form: 'Comprimé' },
    { name: 'Carboplatin', atcCode: 'L01XA02', form: 'Concentré injectable' },
    { name: 'Cisplatin', atcCode: 'L01XA01', form: 'Concentré injectable' },
    { name: 'Cyclophosphamide', atcCode: 'L01AA01', form: 'Comprimé' },
    { name: 'Cytarabine', atcCode: 'L01BC01', form: 'Solution injectable' },
    { name: 'Doxorubicin', atcCode: 'L01DB01', form: 'Poudre injectable' },
    { name: 'Etoposide', atcCode: 'L01CB01', form: 'Concentré injectable' },
    { name: 'Fluorouracil', atcCode: 'L01BC02', form: 'Solution injectable' },
    { name: 'Ifosfamide', atcCode: 'L01AA06', form: 'Poudre injectable' },
    { name: 'Imatinib', atcCode: 'L01XE01', form: 'Comprimé' },
    { name: 'Mercaptopurine', atcCode: 'L01BB02', form: 'Comprimé' },
    { name: 'Methotrexate', atcCode: 'L01BA01', form: 'Comprimé' },
    { name: 'Oxaliplatin', atcCode: 'L01XA03', form: 'Concentré injectable' },
    { name: 'Paclitaxel', atcCode: 'L01CD01', form: 'Concentré injectable' },
    { name: 'Rituximab', atcCode: 'L01XC02', form: 'Concentré injectable' },
    { name: 'Trastuzumab', atcCode: 'L01XC03', form: 'Poudre injectable' },
    { name: 'Vincristine', atcCode: 'L01CA01', form: 'Solution injectable' },
    // Vitamins / minerals
    { name: 'Ascorbic acid', atcCode: 'A11GA01', form: 'Comprimé' },
    { name: 'Calcium gluconate', atcCode: 'A12AA03', form: 'Solution injectable' },
    { name: 'Colecalciferol', atcCode: 'A11CC05', form: 'Gélule' },
    { name: 'Ergocalciferol', atcCode: 'A11CC01', form: 'Gélule' },
    { name: 'Folic acid', atcCode: 'B03BB01', form: 'Comprimé' },
    { name: 'Iron', atcCode: 'B03AB', form: 'Comprimé' },
    { name: 'Magnesium sulfate', atcCode: 'A12CC02', form: 'Solution injectable' },
    { name: 'Potassium chloride', atcCode: 'A12BA01', form: 'Comprimé' },
    { name: 'Pyridoxine', atcCode: 'A11HA02', form: 'Comprimé' },
    { name: 'Retinol', atcCode: 'A11CA01', form: 'Gélule' },
    { name: 'Thiamine', atcCode: 'A11DA01', form: 'Comprimé' },
    { name: 'Zinc sulfate', atcCode: 'A12CB01', form: 'Comprimé' },
    // Ophthalmology
    { name: 'Betaxolol (eye drops)', atcCode: 'S01ED02', form: 'Gouttes ophtalmiques' },
    { name: 'Pilocarpine', atcCode: 'S01EB01', form: 'Gouttes ophtalmiques' },
    { name: 'Timolol (eye drops)', atcCode: 'S01ED01', form: 'Gouttes ophtalmiques' },
    { name: 'Tetracycline (eye ointment)', atcCode: 'S01AA09', form: 'Pommade ophtalmique' },
    // Reproductive health
    { name: 'Clomifene', atcCode: 'G03GB02', form: 'Comprimé' },
    { name: 'Levonorgestrel', atcCode: 'G03AC03', form: 'Comprimé' },
    { name: 'Medroxyprogesterone acetate', atcCode: 'G03AC06', form: 'Solution injectable' },
    { name: 'Mifepristone', atcCode: 'G03XB01', form: 'Comprimé' },
    { name: 'Misoprostol', atcCode: 'A02BB01', form: 'Comprimé' },
    { name: 'Oxytocin', atcCode: 'H01BB02', form: 'Solution injectable' },
    { name: 'Progesterone', atcCode: 'G03DA04', form: 'Gélule' },
    // Immunosuppressants
    { name: 'Azathioprine', atcCode: 'L04AX01', form: 'Comprimé' },
    { name: 'Ciclosporin', atcCode: 'L04AD01', form: 'Gélule' },
    { name: 'Tacrolimus', atcCode: 'L04AD02', form: 'Gélule' },
    { name: 'Mycophenolate mofetil', atcCode: 'L04AA06', form: 'Gélule' },
    // Palliative care
    { name: 'Haloperidol (oral)', atcCode: 'N05AD01', form: 'Solution orale' },
    { name: 'Hyoscine butylbromide', atcCode: 'A03BB01', form: 'Solution injectable' },
  ].map(x => ({ name: x.name, atcCode: x.atcCode, form: x.form }));
}

console.log(`[WHO-EML] Processing ${items.length} items…\n`);

const seen = new Set();
const results = [];

for (const item of items) {
  const name = (item.name ?? item.pref_name ?? '').trim();
  if (!name || name.length < 2) continue;
  const norm = name.toUpperCase();
  if (seen.has(norm)) continue;
  seen.add(norm);

  const atcCode = item.atcCode ?? item.atc_code ?? '';
  const classe  = atcToClasse(atcCode);
  const forme   = item.form ?? null;

  results.push({ nom: name, dci: name.toLowerCase(), forme, pays: 'INT', classe });
}

console.log(`[WHO-EML] ${results.length} unique medicines\n`);

// Write all as one SQL file (small list)
const BATCH_SIZE = 80;
const files = [];
let batchNum = 1;

for (let i = 0; i < results.length; i += BATCH_SIZE) {
  const chunk = results.slice(i, i + BATCH_SIZE);
  const label = String(batchNum).padStart(3, '0');
  const fname = `${SOURCES_DIR}/whoeml_batch_${label}.sql`;

  const vals = chunk.map(r => {
    const dciVal   = r.dci    ? `'${esc(r.dci)}'`    : 'NULL';
    const formeVal = r.forme  ? `'${esc(r.forme)}'`  : 'NULL';
    const classeVal= r.classe ? `'${esc(r.classe)}'` : 'NULL';
    return `('${esc(r.nom)}',${dciVal},${formeVal},'${r.pays}',${classeVal})`;
  }).join(',\n');

  writeFileSync(fname,
    `-- whoeml_batch_${label}.sql (${chunk.length} rows)\n` +
    `INSERT INTO medicaments (nom, dci, forme, pays, classe_therapeutique)\n` +
    `SELECT v.nom, v.dci, v.forme, v.pays, v.classe\n` +
    `FROM (VALUES\n${vals}\n) AS v(nom, dci, forme, pays, classe)\n` +
    `WHERE NOT EXISTS (\n  SELECT 1 FROM medicaments m WHERE LOWER(m.nom) = LOWER(v.nom)\n);\n`,
    'utf8');
  files.push(fname);
  batchNum++;
}

const lastLabel = String(batchNum - 1).padStart(3, '0');
console.log(`[WHO-EML] ${files.length} SQL batch(es) written (whoeml_batch_001 → whoeml_batch_${lastLabel})`);
console.log(`[WHO-EML] Total: ${results.length} WHO essential medicines`);
