/**
 * import-pathologies.mjs
 *
 * Ce script génère un fichier SQL avec les INSERT pour la table `pathologies`.
 * La table a RLS activé avec uniquement une politique SELECT pour les anonymes,
 * donc l'insertion directe via le client Supabase avec la anon key échouerait.
 *
 * Usage: node scripts/import-pathologies.mjs
 * Le fichier SQL généré peut ensuite être exécuté via MCP execute_sql.
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── DONNÉES ────────────────────────────────────────────────────────────────

const pathologies = [
  // CARDIOVASCULAIRES
  { nom_fr: "Hypertension artérielle", nom_en: "Arterial hypertension", categorie: "Cardiovasculaire", icd10_code: "I10", description_fr: "Élévation chronique de la pression artérielle > 140/90 mmHg" },
  { nom_fr: "Insuffisance cardiaque", nom_en: "Heart failure", categorie: "Cardiovasculaire", icd10_code: "I50", description_fr: "Incapacité du cœur à assurer un débit sanguin suffisant aux besoins de l'organisme" },
  { nom_fr: "Infarctus du myocarde", nom_en: "Myocardial infarction", categorie: "Cardiovasculaire", icd10_code: "I21", description_fr: "Nécrose d'une zone du muscle cardiaque par obstruction coronarienne" },
  { nom_fr: "Angine de poitrine", nom_en: "Angina pectoris", categorie: "Cardiovasculaire", icd10_code: "I20", description_fr: "Douleur thoracique ischémique par insuffisance coronarienne" },
  { nom_fr: "Fibrillation auriculaire", nom_en: "Atrial fibrillation", categorie: "Cardiovasculaire", icd10_code: "I48", description_fr: "Arythmie cardiaque avec activité électrique auriculaire chaotique" },
  { nom_fr: "Tachycardie supraventriculaire", nom_en: "Supraventricular tachycardia", categorie: "Cardiovasculaire", icd10_code: "I47.1", description_fr: "Accélération du rythme cardiaque d'origine supraventriculaire" },
  { nom_fr: "Bradycardie sinusale", nom_en: "Sinus bradycardia", categorie: "Cardiovasculaire", icd10_code: "R00.1", description_fr: "Ralentissement du rythme cardiaque < 60 bpm" },
  { nom_fr: "Bloc auriculo-ventriculaire", nom_en: "Atrioventricular block", categorie: "Cardiovasculaire", icd10_code: "I44", description_fr: "Trouble de la conduction entre oreillettes et ventricules" },
  { nom_fr: "Cardiomyopathie dilatée", nom_en: "Dilated cardiomyopathy", categorie: "Cardiovasculaire", icd10_code: "I42.0", description_fr: "Dilatation et dysfonction du ventricule gauche" },
  { nom_fr: "Péricardite", nom_en: "Pericarditis", categorie: "Cardiovasculaire", icd10_code: "I30", description_fr: "Inflammation du péricarde entourant le cœur" },
  { nom_fr: "Endocardite infectieuse", nom_en: "Infective endocarditis", categorie: "Cardiovasculaire", icd10_code: "I33", description_fr: "Infection bactérienne des valves cardiaques" },
  { nom_fr: "Valvulopathie mitrale", nom_en: "Mitral valve disease", categorie: "Cardiovasculaire", icd10_code: "I05", description_fr: "Atteinte de la valve mitrale (sténose ou insuffisance)" },
  { nom_fr: "Valvulopathie aortique", nom_en: "Aortic valve disease", categorie: "Cardiovasculaire", icd10_code: "I06", description_fr: "Atteinte de la valve aortique (sténose ou insuffisance)" },
  { nom_fr: "Artériopathie oblitérante des membres inférieurs", nom_en: "Peripheral arterial disease", categorie: "Cardiovasculaire", icd10_code: "I70.2", description_fr: "Obstruction artérielle des membres inférieurs par athérosclérose" },
  { nom_fr: "Thrombose veineuse profonde", nom_en: "Deep vein thrombosis", categorie: "Cardiovasculaire", icd10_code: "I80", description_fr: "Formation d'un caillot dans les veines profondes" },
  { nom_fr: "Embolie pulmonaire", nom_en: "Pulmonary embolism", categorie: "Cardiovasculaire", icd10_code: "I26", description_fr: "Obstruction d'une artère pulmonaire par un embole" },
  { nom_fr: "Anévrisme aortique", nom_en: "Aortic aneurysm", categorie: "Cardiovasculaire", icd10_code: "I71", description_fr: "Dilatation localisée pathologique de l'aorte" },
  { nom_fr: "Hypertension pulmonaire", nom_en: "Pulmonary hypertension", categorie: "Cardiovasculaire", icd10_code: "I27.0", description_fr: "Élévation de la pression dans la circulation pulmonaire" },
  { nom_fr: "Insuffisance veineuse chronique", nom_en: "Chronic venous insufficiency", categorie: "Cardiovasculaire", icd10_code: "I87.2", description_fr: "Dysfonction des valves veineuses avec reflux chronique" },
  { nom_fr: "Choc cardiogénique", nom_en: "Cardiogenic shock", categorie: "Cardiovasculaire", icd10_code: "R57.0", description_fr: "Défaillance circulatoire aiguë d'origine cardiaque" },

  // ENDOCRINIENS ET MÉTABOLIQUES
  { nom_fr: "Diabète type 1", nom_en: "Type 1 diabetes mellitus", categorie: "Endocrinien et métabolique", icd10_code: "E10", description_fr: "Destruction auto-immune des cellules bêta pancréatiques avec carence absolue en insuline" },
  { nom_fr: "Diabète type 2", nom_en: "Type 2 diabetes mellitus", categorie: "Endocrinien et métabolique", icd10_code: "E11", description_fr: "Résistance à l'insuline et déficit relatif de sécrétion insulinique" },
  { nom_fr: "Diabète gestationnel", nom_en: "Gestational diabetes mellitus", categorie: "Endocrinien et métabolique", icd10_code: "O24", description_fr: "Intolérance au glucose apparue ou diagnostiquée pendant la grossesse" },
  { nom_fr: "Hypothyroïdie", nom_en: "Hypothyroidism", categorie: "Endocrinien et métabolique", icd10_code: "E03", description_fr: "Insuffisance de production des hormones thyroïdiennes" },
  { nom_fr: "Hyperthyroïdie", nom_en: "Hyperthyroidism", categorie: "Endocrinien et métabolique", icd10_code: "E05", description_fr: "Excès de production des hormones thyroïdiennes" },
  { nom_fr: "Thyroïdite de Hashimoto", nom_en: "Hashimoto thyroiditis", categorie: "Endocrinien et métabolique", icd10_code: "E06.3", description_fr: "Thyroïdite auto-immune avec destruction progressive du tissu thyroïdien" },
  { nom_fr: "Maladie de Basedow", nom_en: "Graves disease", categorie: "Endocrinien et métabolique", icd10_code: "E05.0", description_fr: "Hyperthyroïdie auto-immune avec anticorps anti-récepteur TSH" },
  { nom_fr: "Syndrome de Cushing", nom_en: "Cushing syndrome", categorie: "Endocrinien et métabolique", icd10_code: "E24", description_fr: "Hypercorticisme chronique par excès de cortisol endogène ou exogène" },
  { nom_fr: "Maladie d'Addison", nom_en: "Addison disease", categorie: "Endocrinien et métabolique", icd10_code: "E27.1", description_fr: "Insuffisance surrénalienne primaire par destruction des glandes surrénales" },
  { nom_fr: "Hyperaldostéronisme primaire", nom_en: "Primary hyperaldosteronism", categorie: "Endocrinien et métabolique", icd10_code: "E26.0", description_fr: "Hypersécrétion autonome d'aldostérone avec hypertension et hypokaliémie" },
  { nom_fr: "Phéochromocytome", nom_en: "Pheochromocytoma", categorie: "Endocrinien et métabolique", icd10_code: "D35.0", description_fr: "Tumeur des glandes surrénales sécrétant des catécholamines" },
  { nom_fr: "Acromégalie", nom_en: "Acromegaly", categorie: "Endocrinien et métabolique", icd10_code: "E22.0", description_fr: "Hypersécrétion d'hormone de croissance après fusion des cartilages" },
  { nom_fr: "Hyperprolactinémie", nom_en: "Hyperprolactinemia", categorie: "Endocrinien et métabolique", icd10_code: "E22.1", description_fr: "Élévation du taux de prolactine avec troubles menstruels et galactorrhée" },
  { nom_fr: "Obésité", nom_en: "Obesity", categorie: "Endocrinien et métabolique", icd10_code: "E66", description_fr: "Excès de masse grasse corporelle avec IMC > 30 kg/m²" },
  { nom_fr: "Dyslipidémie", nom_en: "Dyslipidemia", categorie: "Endocrinien et métabolique", icd10_code: "E78", description_fr: "Anomalie des taux de lipides sanguins (cholestérol, triglycérides)" },
  { nom_fr: "Hyperuricémie", nom_en: "Hyperuricemia", categorie: "Endocrinien et métabolique", icd10_code: "E79.0", description_fr: "Élévation du taux d'acide urique sérique > 420 µmol/L" },
  { nom_fr: "Goutte", nom_en: "Gout", categorie: "Endocrinien et métabolique", icd10_code: "M10", description_fr: "Arthropathie microcristalline par dépôts d'urate monosodique" },
  { nom_fr: "Syndrome métabolique", nom_en: "Metabolic syndrome", categorie: "Endocrinien et métabolique", icd10_code: "E88.81", description_fr: "Association obésité abdominale, dyslipidémie, hyperglycémie et HTA" },
  { nom_fr: "Ostéoporose", nom_en: "Osteoporosis", categorie: "Endocrinien et métabolique", icd10_code: "M81", description_fr: "Réduction de la densité osseuse avec risque fracturaire élevé" },
  { nom_fr: "Ostéomalacie", nom_en: "Osteomalacia", categorie: "Endocrinien et métabolique", icd10_code: "M83", description_fr: "Défaut de minéralisation osseuse par carence en vitamine D ou phosphore" },
  { nom_fr: "Insuffisance surrénalienne secondaire", nom_en: "Secondary adrenal insufficiency", categorie: "Endocrinien et métabolique", icd10_code: "E27.4", description_fr: "Insuffisance surrénalienne par déficit en ACTH hypophysaire" },
  { nom_fr: "Diabète insipide", nom_en: "Diabetes insipidus", categorie: "Endocrinien et métabolique", icd10_code: "E23.2", description_fr: "Déficit en ADH ou résistance rénale avec polyurie et polydipsie" },
  { nom_fr: "Hypoparathyroïdie", nom_en: "Hypoparathyroidism", categorie: "Endocrinien et métabolique", icd10_code: "E20", description_fr: "Insuffisance de production de PTH avec hypocalcémie" },

  // RESPIRATOIRES
  { nom_fr: "Asthme", nom_en: "Asthma", categorie: "Respiratoire", icd10_code: "J45", description_fr: "Maladie inflammatoire chronique des voies aériennes avec hyperréactivité bronchique" },
  { nom_fr: "BPCO", nom_en: "Chronic obstructive pulmonary disease", categorie: "Respiratoire", icd10_code: "J44", description_fr: "Obstruction bronchique chronique progressive principalement due au tabac" },
  { nom_fr: "Pneumonie", nom_en: "Pneumonia", categorie: "Respiratoire", icd10_code: "J18", description_fr: "Infection du parenchyme pulmonaire avec syndrome infectieux et condensation alvéolaire" },
  { nom_fr: "Bronchite chronique", nom_en: "Chronic bronchitis", categorie: "Respiratoire", icd10_code: "J42", description_fr: "Toux productive quotidienne pendant plus de 3 mois sur 2 années consécutives" },
  { nom_fr: "Emphysème", nom_en: "Emphysema", categorie: "Respiratoire", icd10_code: "J43", description_fr: "Destruction des parois alvéolaires avec distension pulmonaire permanente" },
  { nom_fr: "Fibrose pulmonaire idiopathique", nom_en: "Idiopathic pulmonary fibrosis", categorie: "Respiratoire", icd10_code: "J84.1", description_fr: "Fibrose progressive du parenchyme pulmonaire de cause inconnue" },
  { nom_fr: "Sarcoïdose pulmonaire", nom_en: "Pulmonary sarcoidosis", categorie: "Respiratoire", icd10_code: "D86.0", description_fr: "Granulomatose systémique touchant préférentiellement le poumon" },
  { nom_fr: "Tuberculose pulmonaire", nom_en: "Pulmonary tuberculosis", categorie: "Respiratoire", icd10_code: "A15", description_fr: "Infection pulmonaire à Mycobacterium tuberculosis" },
  { nom_fr: "Pleurésie", nom_en: "Pleuritis", categorie: "Respiratoire", icd10_code: "J90", description_fr: "Épanchement liquidien dans la cavité pleurale" },
  { nom_fr: "Pneumothorax", nom_en: "Pneumothorax", categorie: "Respiratoire", icd10_code: "J93", description_fr: "Présence d'air dans l'espace pleural" },
  { nom_fr: "Apnée obstructive du sommeil", nom_en: "Obstructive sleep apnea", categorie: "Respiratoire", icd10_code: "G47.3", description_fr: "Obstruction répétée des voies aériennes supérieures pendant le sommeil" },
  { nom_fr: "Rhinite allergique", nom_en: "Allergic rhinitis", categorie: "Respiratoire", icd10_code: "J30", description_fr: "Inflammation nasale IgE-médiée par aéroallergènes" },
  { nom_fr: "Sinusite chronique", nom_en: "Chronic sinusitis", categorie: "Respiratoire", icd10_code: "J32", description_fr: "Inflammation persistante des sinus paranasaux" },
  { nom_fr: "Bronchectasie", nom_en: "Bronchiectasis", categorie: "Respiratoire", icd10_code: "J47", description_fr: "Dilatation permanente et irréversible des bronches" },
  { nom_fr: "Mucoviscidose", nom_en: "Cystic fibrosis", categorie: "Respiratoire", icd10_code: "E84", description_fr: "Maladie génétique avec sécrétion de mucus épais affectant poumons et pancréas" },
  { nom_fr: "Cancer broncho-pulmonaire", nom_en: "Lung cancer", categorie: "Respiratoire", icd10_code: "C34", description_fr: "Tumeur maligne primitive du parenchyme pulmonaire" },

  // GASTRO-INTESTINAUX
  { nom_fr: "Ulcère gastrique", nom_en: "Gastric ulcer", categorie: "Gastro-intestinal", icd10_code: "K25", description_fr: "Perte de substance de la muqueuse gastrique" },
  { nom_fr: "Ulcère duodénal", nom_en: "Duodenal ulcer", categorie: "Gastro-intestinal", icd10_code: "K26", description_fr: "Perte de substance de la muqueuse duodénale" },
  { nom_fr: "Gastrite chronique", nom_en: "Chronic gastritis", categorie: "Gastro-intestinal", icd10_code: "K29", description_fr: "Inflammation chronique de la muqueuse gastrique" },
  { nom_fr: "Reflux gastro-œsophagien", nom_en: "Gastroesophageal reflux disease", categorie: "Gastro-intestinal", icd10_code: "K21", description_fr: "Remontée du contenu gastrique acide dans l'œsophage" },
  { nom_fr: "Maladie de Crohn", nom_en: "Crohn disease", categorie: "Gastro-intestinal", icd10_code: "K50", description_fr: "Maladie inflammatoire chronique transmurale pouvant toucher tout le tube digestif" },
  { nom_fr: "Rectocolite hémorragique", nom_en: "Ulcerative colitis", categorie: "Gastro-intestinal", icd10_code: "K51", description_fr: "Maladie inflammatoire chronique limitée au côlon et rectum" },
  { nom_fr: "Syndrome de l'intestin irritable", nom_en: "Irritable bowel syndrome", categorie: "Gastro-intestinal", icd10_code: "K58", description_fr: "Troubles fonctionnels digestifs chroniques sans lésion organique" },
  { nom_fr: "Hépatite B chronique", nom_en: "Chronic hepatitis B", categorie: "Gastro-intestinal", icd10_code: "B18.1", description_fr: "Infection chronique par le virus de l'hépatite B avec atteinte hépatique" },
  { nom_fr: "Hépatite C chronique", nom_en: "Chronic hepatitis C", categorie: "Gastro-intestinal", icd10_code: "B18.2", description_fr: "Infection chronique par le virus de l'hépatite C" },
  { nom_fr: "Cirrhose hépatique", nom_en: "Hepatic cirrhosis", categorie: "Gastro-intestinal", icd10_code: "K74", description_fr: "Fibrose diffuse du foie avec nodules de régénération" },
  { nom_fr: "Insuffisance hépatique", nom_en: "Hepatic insufficiency", categorie: "Gastro-intestinal", icd10_code: "K72", description_fr: "Défaillance des fonctions de synthèse et d'épuration hépatiques" },
  { nom_fr: "Stéatose hépatique non alcoolique", nom_en: "Non-alcoholic fatty liver disease", categorie: "Gastro-intestinal", icd10_code: "K76.0", description_fr: "Accumulation de graisse dans le foie sans alcool" },
  { nom_fr: "Cholécystite chronique", nom_en: "Chronic cholecystitis", categorie: "Gastro-intestinal", icd10_code: "K81.1", description_fr: "Inflammation chronique de la vésicule biliaire" },
  { nom_fr: "Lithiase biliaire", nom_en: "Cholelithiasis", categorie: "Gastro-intestinal", icd10_code: "K80", description_fr: "Présence de calculs dans la vésicule ou les voies biliaires" },
  { nom_fr: "Pancréatite chronique", nom_en: "Chronic pancreatitis", categorie: "Gastro-intestinal", icd10_code: "K86.1", description_fr: "Inflammation chronique du pancréas avec fibrose progressive" },
  { nom_fr: "Cancer colorectal", nom_en: "Colorectal cancer", categorie: "Gastro-intestinal", icd10_code: "C18", description_fr: "Tumeur maligne du côlon ou du rectum" },
  { nom_fr: "Cancer gastrique", nom_en: "Gastric cancer", categorie: "Gastro-intestinal", icd10_code: "C16", description_fr: "Adénocarcinome de l'estomac" },

  // RÉNAUX ET UROLOGIQUES
  { nom_fr: "Insuffisance rénale aiguë", nom_en: "Acute kidney injury", categorie: "Rénal et urologique", icd10_code: "N17", description_fr: "Réduction brutale et rapide du débit de filtration glomérulaire" },
  { nom_fr: "Insuffisance rénale chronique stade 3", nom_en: "Chronic kidney disease stage 3", categorie: "Rénal et urologique", icd10_code: "N18.3", description_fr: "DFG entre 30 et 59 mL/min/1.73m² depuis plus de 3 mois" },
  { nom_fr: "Insuffisance rénale chronique stade 4", nom_en: "Chronic kidney disease stage 4", categorie: "Rénal et urologique", icd10_code: "N18.4", description_fr: "DFG entre 15 et 29 mL/min/1.73m² avec atteinte structurale rénale" },
  { nom_fr: "Insuffisance rénale chronique stade 5", nom_en: "Chronic kidney disease stage 5", categorie: "Rénal et urologique", icd10_code: "N18.5", description_fr: "DFG < 15 mL/min/1.73m² nécessitant suppléance rénale" },
  { nom_fr: "Néphropathie diabétique", nom_en: "Diabetic nephropathy", categorie: "Rénal et urologique", icd10_code: "N08", description_fr: "Atteinte rénale spécifique du diabète avec protéinurie et déclin du DFG" },
  { nom_fr: "Glomérulonéphrite", nom_en: "Glomerulonephritis", categorie: "Rénal et urologique", icd10_code: "N03", description_fr: "Inflammation des glomérules rénaux avec hématurie et protéinurie" },
  { nom_fr: "Syndrome néphrotique", nom_en: "Nephrotic syndrome", categorie: "Rénal et urologique", icd10_code: "N04", description_fr: "Protéinurie massive avec hypoalbuminémie, œdèmes et hyperlipidémie" },
  { nom_fr: "Lithiase rénale", nom_en: "Nephrolithiasis", categorie: "Rénal et urologique", icd10_code: "N20", description_fr: "Présence de calculs dans les voies urinaires" },
  { nom_fr: "Pyélonéphrite chronique", nom_en: "Chronic pyelonephritis", categorie: "Rénal et urologique", icd10_code: "N11", description_fr: "Infection rénale chronique avec cicatrices parenchymateuses" },
  { nom_fr: "Incontinence urinaire", nom_en: "Urinary incontinence", categorie: "Rénal et urologique", icd10_code: "N39.3", description_fr: "Perte involontaire d'urine socialement gênante" },
  { nom_fr: "Hypertrophie bénigne de la prostate", nom_en: "Benign prostatic hyperplasia", categorie: "Rénal et urologique", icd10_code: "N40", description_fr: "Augmentation bénigne du volume prostatique avec troubles mictionnels" },
  { nom_fr: "Cancer de la prostate", nom_en: "Prostate cancer", categorie: "Rénal et urologique", icd10_code: "C61", description_fr: "Adénocarcinome de la prostate" },
  { nom_fr: "Cancer du rein", nom_en: "Renal cancer", categorie: "Rénal et urologique", icd10_code: "C64", description_fr: "Tumeur maligne du parenchyme rénal" },

  // NEUROLOGIQUES
  { nom_fr: "Épilepsie", nom_en: "Epilepsy", categorie: "Neurologique", icd10_code: "G40", description_fr: "Affection cérébrale chronique caractérisée par des crises épileptiques récurrentes" },
  { nom_fr: "Migraine", nom_en: "Migraine", categorie: "Neurologique", icd10_code: "G43", description_fr: "Céphalées récurrentes unilatérales pulsatiles avec nausées et phonophobie" },
  { nom_fr: "Maladie de Parkinson", nom_en: "Parkinson disease", categorie: "Neurologique", icd10_code: "G20", description_fr: "Dégénérescence des neurones dopaminergiques avec tremblements et akinésie" },
  { nom_fr: "Maladie d'Alzheimer", nom_en: "Alzheimer disease", categorie: "Neurologique", icd10_code: "G30", description_fr: "Démence neurodégénérative progressive avec atteinte mémorielle et cognitive" },
  { nom_fr: "Sclérose en plaques", nom_en: "Multiple sclerosis", categorie: "Neurologique", icd10_code: "G35", description_fr: "Maladie démyélinisante auto-immune du système nerveux central" },
  { nom_fr: "AVC ischémique", nom_en: "Ischemic stroke", categorie: "Neurologique", icd10_code: "I63", description_fr: "Infarctus cérébral par obstruction artérielle" },
  { nom_fr: "AVC hémorragique", nom_en: "Hemorrhagic stroke", categorie: "Neurologique", icd10_code: "I61", description_fr: "Saignement intraparenchymateux cérébral" },
  { nom_fr: "Neuropathie périphérique", nom_en: "Peripheral neuropathy", categorie: "Neurologique", icd10_code: "G62", description_fr: "Atteinte des nerfs périphériques avec troubles sensitifs et moteurs" },
  { nom_fr: "Myasthénie grave", nom_en: "Myasthenia gravis", categorie: "Neurologique", icd10_code: "G70.0", description_fr: "Maladie auto-immune de la jonction neuromusculaire" },
  { nom_fr: "Sclérose latérale amyotrophique", nom_en: "Amyotrophic lateral sclerosis", categorie: "Neurologique", icd10_code: "G12.2", description_fr: "Dégénérescence progressive des motoneurones centraux et périphériques" },
  { nom_fr: "Méningite bactérienne", nom_en: "Bacterial meningitis", categorie: "Neurologique", icd10_code: "G00", description_fr: "Infection bactérienne des méninges avec syndrome méningé" },
  { nom_fr: "Névralgie du trijumeau", nom_en: "Trigeminal neuralgia", categorie: "Neurologique", icd10_code: "G50.0", description_fr: "Douleurs faciales paroxystiques intenses dans le territoire du nerf trijumeau" },
  { nom_fr: "Syndrome de Guillain-Barré", nom_en: "Guillain-Barre syndrome", categorie: "Neurologique", icd10_code: "G61.0", description_fr: "Polyradiculonévrite aiguë inflammatoire post-infectieuse" },
  { nom_fr: "Narcolepsie", nom_en: "Narcolepsy", categorie: "Neurologique", icd10_code: "G47.4", description_fr: "Trouble du sommeil avec accès irrésistibles de sommeil diurne" },
  { nom_fr: "Tremblement essentiel", nom_en: "Essential tremor", categorie: "Neurologique", icd10_code: "G25.0", description_fr: "Tremblement postural et cinétique chronique sans autre cause identifiée" },
  { nom_fr: "Hydrocéphalie", nom_en: "Hydrocephalus", categorie: "Neurologique", icd10_code: "G91", description_fr: "Accumulation excessive de LCR avec dilatation des ventricules cérébraux" },

  // PSYCHIATRIQUES
  { nom_fr: "Dépression majeure", nom_en: "Major depressive disorder", categorie: "Psychiatrique", icd10_code: "F32", description_fr: "Episode dépressif caractérisé avec humeur dépressive et anhédonie persistantes" },
  { nom_fr: "Trouble bipolaire", nom_en: "Bipolar disorder", categorie: "Psychiatrique", icd10_code: "F31", description_fr: "Alternance d'épisodes maniaques et dépressifs" },
  { nom_fr: "Schizophrénie", nom_en: "Schizophrenia", categorie: "Psychiatrique", icd10_code: "F20", description_fr: "Psychose chronique avec hallucinations, délires et désorganisation de la pensée" },
  { nom_fr: "Trouble anxieux généralisé", nom_en: "Generalized anxiety disorder", categorie: "Psychiatrique", icd10_code: "F41.1", description_fr: "Anxiété excessive et incontrôlable concernant différents domaines" },
  { nom_fr: "Trouble panique", nom_en: "Panic disorder", categorie: "Psychiatrique", icd10_code: "F41.0", description_fr: "Crises d'angoisse aiguë récurrentes imprévisibles" },
  { nom_fr: "Phobie sociale", nom_en: "Social phobia", categorie: "Psychiatrique", icd10_code: "F40.1", description_fr: "Peur persistante des situations sociales avec comportement d'évitement" },
  { nom_fr: "Trouble obsessionnel compulsif", nom_en: "Obsessive-compulsive disorder", categorie: "Psychiatrique", icd10_code: "F42", description_fr: "Pensées intrusives récurrentes avec comportements compulsifs" },
  { nom_fr: "État de stress post-traumatique", nom_en: "Post-traumatic stress disorder", categorie: "Psychiatrique", icd10_code: "F43.1", description_fr: "Réaction différée à un événement traumatique avec reviviscences" },
  { nom_fr: "TDAH", nom_en: "Attention deficit hyperactivity disorder", categorie: "Psychiatrique", icd10_code: "F90", description_fr: "Trouble neurodéveloppemental avec inattention et hyperactivité" },
  { nom_fr: "Anorexie mentale", nom_en: "Anorexia nervosa", categorie: "Psychiatrique", icd10_code: "F50.0", description_fr: "Restriction alimentaire sévère avec dysmorphophobie corporelle" },
  { nom_fr: "Boulimie", nom_en: "Bulimia nervosa", categorie: "Psychiatrique", icd10_code: "F50.2", description_fr: "Crises alimentaires compulsives suivies de comportements compensatoires" },
  { nom_fr: "Insomnie chronique", nom_en: "Chronic insomnia", categorie: "Psychiatrique", icd10_code: "G47.0", description_fr: "Difficultés persistantes d'endormissement ou de maintien du sommeil" },
  { nom_fr: "Addiction à l'alcool", nom_en: "Alcohol use disorder", categorie: "Psychiatrique", icd10_code: "F10", description_fr: "Dépendance à l'alcool avec tolérance et syndrome de sevrage" },
  { nom_fr: "Addiction aux opioïdes", nom_en: "Opioid use disorder", categorie: "Psychiatrique", icd10_code: "F11", description_fr: "Dépendance aux opioïdes avec craving et syndrome de manque" },
  { nom_fr: "Psychose aiguë", nom_en: "Acute psychosis", categorie: "Psychiatrique", icd10_code: "F23", description_fr: "Episode psychotique aigu avec délires et hallucinations" },

  // RHUMATOLOGIQUES
  { nom_fr: "Polyarthrite rhumatoïde", nom_en: "Rheumatoid arthritis", categorie: "Rhumatologique", icd10_code: "M05", description_fr: "Rhumatisme inflammatoire chronique auto-immune touchant les articulations" },
  { nom_fr: "Lupus érythémateux systémique", nom_en: "Systemic lupus erythematosus", categorie: "Rhumatologique", icd10_code: "M32", description_fr: "Connectivite auto-immune systémique avec atteintes multiviscérales" },
  { nom_fr: "Sclérodermie systémique", nom_en: "Systemic sclerosis", categorie: "Rhumatologique", icd10_code: "M34", description_fr: "Maladie auto-immune avec fibrose cutanée et viscérale" },
  { nom_fr: "Spondylarthrite ankylosante", nom_en: "Ankylosing spondylitis", categorie: "Rhumatologique", icd10_code: "M45", description_fr: "Rhumatisme inflammatoire touchant le rachis et les sacro-iliaques" },
  { nom_fr: "Arthrose", nom_en: "Osteoarthritis", categorie: "Rhumatologique", icd10_code: "M15", description_fr: "Dégénérescence progressive du cartilage articulaire" },
  { nom_fr: "Fibromyalgie", nom_en: "Fibromyalgia", categorie: "Rhumatologique", icd10_code: "M79.7", description_fr: "Syndrome douloureux chronique diffus avec fatigue et troubles du sommeil" },
  { nom_fr: "Pseudogoutte", nom_en: "Calcium pyrophosphate deposition", categorie: "Rhumatologique", icd10_code: "M11", description_fr: "Arthropathie microcristalline par dépôts de pyrophosphate de calcium" },
  { nom_fr: "Polymyosite", nom_en: "Polymyositis", categorie: "Rhumatologique", icd10_code: "M33", description_fr: "Myopathie inflammatoire idiopathique avec faiblesse musculaire proximale" },
  { nom_fr: "Vascularite systémique", nom_en: "Systemic vasculitis", categorie: "Rhumatologique", icd10_code: "M30", description_fr: "Inflammation des parois vasculaires avec atteinte multisystémique" },
  { nom_fr: "Syndrome de Sjögren", nom_en: "Sjogren syndrome", categorie: "Rhumatologique", icd10_code: "M35.0", description_fr: "Exocrinopathie auto-immune avec sécheresse oculaire et buccale" },

  // INFECTIEUSES
  { nom_fr: "VIH/SIDA", nom_en: "HIV/AIDS", categorie: "Infectieuse", icd10_code: "B20", description_fr: "Infection par le virus de l'immunodéficience humaine avec immunodépression" },
  { nom_fr: "Tuberculose active", nom_en: "Active tuberculosis", categorie: "Infectieuse", icd10_code: "A15", description_fr: "Infection active à Mycobacterium tuberculosis" },
  { nom_fr: "Paludisme", nom_en: "Malaria", categorie: "Infectieuse", icd10_code: "B50", description_fr: "Infection à Plasmodium transmise par moustique Anophèle" },
  { nom_fr: "Infections fongiques systémiques", nom_en: "Systemic fungal infections", categorie: "Infectieuse", icd10_code: "B44", description_fr: "Infections disséminées à champignons pathogènes" },
  { nom_fr: "COVID-19", nom_en: "COVID-19", categorie: "Infectieuse", icd10_code: "U07.1", description_fr: "Infection respiratoire aiguë au SARS-CoV-2" },

  // HÉMATOLOGIQUES
  { nom_fr: "Anémie ferriprive", nom_en: "Iron deficiency anemia", categorie: "Hématologique", icd10_code: "D50", description_fr: "Anémie par carence martiale avec microcytose et hypochromie" },
  { nom_fr: "Anémie mégaloblastique", nom_en: "Megaloblastic anemia", categorie: "Hématologique", icd10_code: "D51", description_fr: "Anémie par carence en vitamine B12 ou folates" },
  { nom_fr: "Drépanocytose", nom_en: "Sickle cell disease", categorie: "Hématologique", icd10_code: "D57", description_fr: "Hémoglobinopathie héréditaire avec érythrocytes falciformes" },
  { nom_fr: "Thalassémie", nom_en: "Thalassemia", categorie: "Hématologique", icd10_code: "D56", description_fr: "Hémoglobinopathie héréditaire avec réduction de synthèse des chaînes de globine" },
  { nom_fr: "Leucémie lymphoïde chronique", nom_en: "Chronic lymphocytic leukemia", categorie: "Hématologique", icd10_code: "C91.1", description_fr: "Prolifération maligne de lymphocytes B matures" },
  { nom_fr: "Lymphome non hodgkinien", nom_en: "Non-Hodgkin lymphoma", categorie: "Hématologique", icd10_code: "C85", description_fr: "Prolifération maligne des lymphocytes en dehors de la moelle" },
  { nom_fr: "Myélome multiple", nom_en: "Multiple myeloma", categorie: "Hématologique", icd10_code: "C90", description_fr: "Prolifération maligne des plasmocytes médullaires" },
  { nom_fr: "Thrombopénie immunologique", nom_en: "Immune thrombocytopenia", categorie: "Hématologique", icd10_code: "D69.3", description_fr: "Réduction des plaquettes par mécanisme auto-immun" },
  { nom_fr: "Hémophilie A", nom_en: "Hemophilia A", categorie: "Hématologique", icd10_code: "D66", description_fr: "Déficit en facteur VIII de coagulation héréditaire lié à l'X" },
  { nom_fr: "Polycythémie vraie", nom_en: "Polycythemia vera", categorie: "Hématologique", icd10_code: "D45", description_fr: "Prolifération clonale érythroïde avec augmentation de la masse érythrocytaire" },

  // DERMATOLOGIQUES
  { nom_fr: "Psoriasis", nom_en: "Psoriasis", categorie: "Dermatologique", icd10_code: "L40", description_fr: "Dermatose inflammatoire chronique avec plaques érythémato-squameuses" },
  { nom_fr: "Eczéma atopique", nom_en: "Atopic dermatitis", categorie: "Dermatologique", icd10_code: "L20", description_fr: "Dermatite inflammatoire chronique prurigineuse à terrain atopique" },
  { nom_fr: "Urticaire chronique", nom_en: "Chronic urticaria", categorie: "Dermatologique", icd10_code: "L50", description_fr: "Éruption urticarienne récurrente persistant plus de 6 semaines" },
  { nom_fr: "Acné sévère", nom_en: "Severe acne", categorie: "Dermatologique", icd10_code: "L70", description_fr: "Dermatose inflammatoire du follicule pilo-sébacé" },
  { nom_fr: "Rosacée", nom_en: "Rosacea", categorie: "Dermatologique", icd10_code: "L71", description_fr: "Dermatose chronique du visage avec érythème, papules et pustules" },
  { nom_fr: "Vitiligo", nom_en: "Vitiligo", categorie: "Dermatologique", icd10_code: "L80", description_fr: "Dépigmentation cutanée par destruction des mélanocytes" },
  { nom_fr: "Pemphigus vulgaire", nom_en: "Pemphigus vulgaris", categorie: "Dermatologique", icd10_code: "L10", description_fr: "Dermatose bulleuse auto-immune intraépidermique grave" },

  // GYNÉCOLOGIQUES ET OBSTÉTRICAUX
  { nom_fr: "Grossesse", nom_en: "Pregnancy", categorie: "Gynécologique et obstétrical", icd10_code: "Z34", description_fr: "État physiologique de gestation nécessitant une adaptation thérapeutique" },
  { nom_fr: "Allaitement maternel", nom_en: "Breastfeeding", categorie: "Gynécologique et obstétrical", icd10_code: "Z39.1", description_fr: "Lactation nécessitant précautions pour médicaments excrétés dans le lait" },
  { nom_fr: "Endométriose", nom_en: "Endometriosis", categorie: "Gynécologique et obstétrical", icd10_code: "N80", description_fr: "Présence de tissu endométrial en dehors de la cavité utérine" },
  { nom_fr: "Syndrome des ovaires polykystiques", nom_en: "Polycystic ovary syndrome", categorie: "Gynécologique et obstétrical", icd10_code: "E28.2", description_fr: "Dysfonction ovarienne avec hyperandrogénisme et kystes multiples" },
  { nom_fr: "Ménopause", nom_en: "Menopause", categorie: "Gynécologique et obstétrical", icd10_code: "N95.1", description_fr: "Arrêt définitif des cycles menstruels avec carence oestrogénique" },
  { nom_fr: "Fibrome utérin", nom_en: "Uterine fibroid", categorie: "Gynécologique et obstétrical", icd10_code: "D25", description_fr: "Tumeur bénigne du muscle utérin (léiomyome)" },
  { nom_fr: "Cancer du sein", nom_en: "Breast cancer", categorie: "Gynécologique et obstétrical", icd10_code: "C50", description_fr: "Tumeur maligne du tissu mammaire" },
  { nom_fr: "Prééclampsie", nom_en: "Preeclampsia", categorie: "Gynécologique et obstétrical", icd10_code: "O14", description_fr: "HTA gestationnelle avec protéinurie après 20 semaines de grossesse" },

  // OCULAIRES
  { nom_fr: "Glaucome à angle ouvert", nom_en: "Open-angle glaucoma", categorie: "Ophtalmologique", icd10_code: "H40.1", description_fr: "Neuropathie optique progressive par hypertonie oculaire chronique" },
  { nom_fr: "Cataracte", nom_en: "Cataract", categorie: "Ophtalmologique", icd10_code: "H26", description_fr: "Opacification du cristallin avec baisse progressive de l'acuité visuelle" },
  { nom_fr: "Dégénérescence maculaire liée à l'âge", nom_en: "Age-related macular degeneration", categorie: "Ophtalmologique", icd10_code: "H35.3", description_fr: "Atteinte dégénérative de la macula avec perte centrale de vision" },
  { nom_fr: "Rétinopathie diabétique", nom_en: "Diabetic retinopathy", categorie: "Ophtalmologique", icd10_code: "H36", description_fr: "Complication microvasculaire du diabète touchant la rétine" },
  { nom_fr: "Uvéite", nom_en: "Uveitis", categorie: "Ophtalmologique", icd10_code: "H20", description_fr: "Inflammation de l'uvée (iris, corps ciliaire, choroïde)" },

  // ORL
  { nom_fr: "Otite moyenne chronique", nom_en: "Chronic otitis media", categorie: "ORL", icd10_code: "H66", description_fr: "Infection chronique de l'oreille moyenne avec perforation tympanique" },
  { nom_fr: "Surdité de perception", nom_en: "Sensorineural hearing loss", categorie: "ORL", icd10_code: "H90.3", description_fr: "Perte auditive par atteinte cochléaire ou du nerf auditif" },
  { nom_fr: "Vertiges de Ménière", nom_en: "Meniere disease", categorie: "ORL", icd10_code: "H81.0", description_fr: "Hydrops endolymphatique avec crises vertigineuses et hypoacousie" },
];

// ─── GÉNÉRATION DU SQL ───────────────────────────────────────────────────────

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

function generateSql(pathologies) {
  const lines = [
    '-- sql_pathologies.sql',
    '-- Généré automatiquement par import-pathologies.mjs',
    `-- Date: ${new Date().toISOString()}`,
    `-- Total: ${pathologies.length} pathologies`,
    '',
    '-- Désactiver temporairement RLS pour cet insert (nécessite service_role)',
    '-- Ce script doit être exécuté via MCP execute_sql (service_role implicite)',
    '',
    'INSERT INTO pathologies (nom_fr, nom_en, categorie, icd10_code, description_fr)',
    'VALUES',
  ];

  const valueRows = pathologies.map((p, i) => {
    const isLast = i === pathologies.length - 1;
    const row = `  (${escapeSql(p.nom_fr)}, ${escapeSql(p.nom_en)}, ${escapeSql(p.categorie)}, ${escapeSql(p.icd10_code)}, ${escapeSql(p.description_fr)})`;
    return isLast ? row : row + ',';
  });

  lines.push(...valueRows);
  lines.push('ON CONFLICT (nom_fr) DO UPDATE SET');
  lines.push('  nom_en = EXCLUDED.nom_en,');
  lines.push('  categorie = EXCLUDED.categorie,');
  lines.push('  icd10_code = EXCLUDED.icd10_code,');
  lines.push('  description_fr = EXCLUDED.description_fr;');
  lines.push('');
  lines.push(`-- Fin du script (${pathologies.length} lignes insérées/mises à jour)`);

  return lines.join('\n');
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

const sqlContent = generateSql(pathologies);
const sqlPath = join(__dirname, 'sql_pathologies.sql');

writeFileSync(sqlPath, sqlContent, 'utf8');

console.log(`✓ Fichier SQL généré: ${sqlPath}`);
console.log(`✓ Nombre de pathologies: ${pathologies.length}`);
console.log('');
console.log('Pour importer les données, exécutez le SQL via MCP execute_sql.');
console.log('Le script utilise ON CONFLICT (nom_fr) DO UPDATE pour éviter les doublons.');
