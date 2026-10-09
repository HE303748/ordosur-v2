// Sprint 5 — Source unique du référentiel d'examens et des packs système.
// Génère :
//   • src/lib/examens_reference.data.json                    (fixture des tests Vitest)
//   • supabase/migrations/20261015120000_examens_demandes.sql (schéma + données en base)
// Usage : node scripts/gen_examens.mjs
// L'application lit ces données EN BASE (examens_reference / packs_examens).
//
// AUCUNE valeur normale : elles dépendent du laboratoire.
// Libellés : vocabulaire français standard des laboratoires et centres de radiologie marocains.

import { writeFileSync } from 'node:fs';
import { writeNewMigration } from './lib/migrationGuard.mjs';
import { createHash } from 'node:crypto';

// ── Unités et conversions standard (Sprint 6). valeur_autre = valeur_defaut × facteur,
//    ou ÷ diviseur, ou formule nommée. ──
const U = {
  // Sprint 6B — mg/dL ajouté : glycémie g/L × 100 ; créatinine mg/L ÷ 10 (soit µmol/L ÷ 88,4).
  glycemie:    { d: 'g/L',  alt: [{ unite: 'mmol/L', facteur: 5.551 }, { unite: 'mg/dL', facteur: 100 }] },
  creatinine:  { d: 'mg/L', alt: [{ unite: 'µmol/L', facteur: 8.84 }, { unite: 'mg/dL', diviseur: 10 }] },
  uree:        { d: 'g/L',  alt: [{ unite: 'mmol/L', facteur: 16.65 }] },
  cholesterol: { d: 'g/L',  alt: [{ unite: 'mmol/L', facteur: 2.586 }] },
  triglyc:     { d: 'g/L',  alt: [{ unite: 'mmol/L', facteur: 1.129 }] },
  hba1c:       { d: '%',    alt: [{ unite: 'mmol/mol', formule: 'ifcc', a: 10.929, b: -2.15 }] },
  bilirubine:  { d: 'mg/L', alt: [{ unite: 'µmol/L', facteur: 1.71 }] },
  urique:      { d: 'mg/L', alt: [{ unite: 'µmol/L', facteur: 5.95 }] },
  calcium:     { d: 'mg/L', alt: [{ unite: 'mmol/L', diviseur: 40.08 }] },
};

// e(code, libelle, categorie, abreviations, options)
const exams = [];
let ordre = 0;
function add(type, categorie, code, libelle, abreviations = [], o = {}) {
  ordre += 10;
  const u = o.u ?? null;
  exams.push({
    code, libelle, type, categorie,
    abreviations,
    synonymes: o.syn ?? [],
    a_jeun: !!o.jeun,
    delai_jeun_h: o.jeun ?? null,
    irradiant: !!o.irr,
    injection_possible: !!o.inj,
    produit_contraste: o.inj ?? null,
    consentement_requis: !!o.consent,
    precisions_suggerees: o.prec ?? [],
    question_exemple: o.q ?? null,
    unite_defaut: u ? u.d : (o.unite ?? null),
    unites: u ? u.alt : (o.unites ?? []),
    code_loinc: null,
    ordre,
    actif: true,
  });
}
const bio = (cat, ...a) => add('biologie', cat, ...a);
const img = (cat, ...a) => add('imagerie', cat, ...a);
const exp = (cat, ...a) => add('exploration', cat, ...a);

// ── Biologie ────────────────────────────────────────────────────────────────
bio('Hématologie', 'NFS', 'NFS (hémogramme)', ['nfs', 'hb', 'hemogramme', 'fns', 'numeration'], {
  syn: ['numération formule sanguine', 'hémoglobine', 'globules blancs', 'leucocytes', 'hématocrite', 'vgm'],
  unites: [{ parametre: 'hémoglobine', unite_defaut: 'g/dL', unite: 'g/L', facteur: 10 }],
});
bio('Hématologie', 'PLAQUETTES', 'Plaquettes', ['plq', 'plaquettes'], { syn: ['numération plaquettaire', 'thrombocytes'], unite: 'G/L' });
bio('Hématologie', 'VS', 'Vitesse de sédimentation (VS)', ['vs'], { syn: ['vitesse de sédimentation'], unite: 'mm/h' });
bio('Hématologie', 'RETICULOCYTES', 'Réticulocytes', ['retic', 'reticulocytes'], { unite: 'G/L' });
bio('Hématologie', 'GROUPE_ABO_RH', 'Groupe sanguin ABO-Rhésus', ['groupe', 'gs', 'abo', 'groupage'], { syn: ['groupe sanguin', 'rhésus', 'groupage sanguin'] });
bio('Hématologie', 'RAI', 'RAI (recherche d\'agglutinines irrégulières)', ['rai'], { syn: ['agglutinines irrégulières'] });

bio('Hémostase', 'TP_INR', 'TP / INR', ['tp', 'inr', 'tp inr'], { syn: ['taux de prothrombine', 'temps de quick'] });
bio('Hémostase', 'TCA', 'TCA', ['tca', 'tck'], { syn: ['temps de céphaline activée'] });
bio('Hémostase', 'FIBRINOGENE', 'Fibrinogène', ['fib', 'fibrinogene'], { unite: 'g/L' });
bio('Hémostase', 'D_DIMERES', 'D-dimères', ['ddi', 'd dimeres', 'ddimeres'], { unite: 'ng/mL' });

bio('Glycémie', 'GLYCEMIE_JEUN', 'Glycémie à jeun', ['gaj', 'gly', 'glycemie'], { syn: ['glucose', 'sucre'], jeun: 8, u: U.glycemie });
bio('Glycémie', 'GLYCEMIE_PP', 'Glycémie post-prandiale', ['gpp', 'gly pp', 'glycemie pp'], { syn: ['glycémie 2 h après le repas'], u: U.glycemie });
bio('Glycémie', 'HBA1C', 'HbA1c (hémoglobine glyquée)', ['hba1c', 'hb a1c', 'hb', 'a1c', 'glyquee'], { syn: ['hémoglobine glyquée', 'hémoglobine glycosylée', 'hémoglobine glyquee'], u: U.hba1c });
bio('Glycémie', 'HGPO', 'HGPO 75 g (hyperglycémie provoquée par voie orale)', ['hgpo'], { syn: ['hyperglycémie provoquée', 'test o\'sullivan'], jeun: 8, u: U.glycemie });

bio('Bilan rénal', 'UREE', 'Urée', ['uree'], { syn: ['urée sanguine', 'azotémie'], u: U.uree });
bio('Bilan rénal', 'CREATININE', 'Créatinine', ['creat', 'creatinine'], { syn: ['créatininémie', 'fonction rénale'], u: U.creatinine });
bio('Bilan rénal', 'DFG', 'DFG estimé (CKD-EPI)', ['dfg', 'clairance', 'ckd', 'mdrd'], { syn: ['débit de filtration glomérulaire', 'clairance de la créatinine'], unite: 'mL/min/1,73 m²' });
bio('Bilan rénal', 'IONOGRAMME', 'Ionogramme sanguin (Na, K, Cl)', ['iono', 'ionogramme', 'nak', 'na k', 'kaliemie', 'natremie'], { syn: ['sodium', 'potassium', 'chlore', 'kaliémie', 'natrémie'], unite: 'mmol/L' });
bio('Bilan rénal', 'PROTEINURIE_24H', 'Protéinurie des 24 heures', ['pu 24', 'proteinurie', 'pu24'], { syn: ['protéines urinaires'], prec: ['Recueil des urines de 24 h'], unite: 'g/24 h' });
bio('Bilan rénal', 'ALBU_CREAT_U', 'Rapport albuminurie / créatininurie', ['rac', 'microalb', 'microalbuminurie', 'albuminurie'], { syn: ['micro-albuminurie', 'rapport albumine créatinine urinaire'], prec: ['Sur échantillon d\'urines du matin'], unite: 'mg/g' });
bio('Bilan rénal', 'ECBU', 'ECBU', ['ecbu'], { syn: ['examen cytobactériologique des urines', 'analyse d\'urines', 'infection urinaire'], prec: ['Avec antibiogramme'] });

bio('Bilan hépatique', 'ASAT', 'ASAT (TGO)', ['asat', 'tgo', 'sgot', 'transaminases'], { syn: ['aspartate aminotransférase'], unite: 'UI/L' });
bio('Bilan hépatique', 'ALAT', 'ALAT (TGP)', ['alat', 'tgp', 'sgpt', 'transaminases'], { syn: ['alanine aminotransférase'], unite: 'UI/L' });
bio('Bilan hépatique', 'GGT', 'Gamma-GT (GGT)', ['ggt', 'gamma gt'], { syn: ['gamma glutamyl transférase'], unite: 'UI/L' });
bio('Bilan hépatique', 'PAL', 'Phosphatases alcalines (PAL)', ['pal'], { syn: ['phosphatases alcalines'], unite: 'UI/L' });
bio('Bilan hépatique', 'BILIRUBINE', 'Bilirubine totale et conjuguée', ['bili', 'bilirubine', 'bt', 'bc'], { syn: ['bilirubine directe', 'bilirubine libre'], u: U.bilirubine });
bio('Bilan hépatique', 'ALBUMINE', 'Albumine', ['alb', 'albumine', 'albuminemie'], { syn: ['albuminémie'], unite: 'g/L' });
bio('Bilan hépatique', 'EPP', 'Électrophorèse des protéines sériques', ['epp', 'eps', 'electrophorese'], { syn: ['protidogramme', 'protides totaux'] });

bio('Bilan lipidique', 'CHOLESTEROL_TOTAL', 'Cholestérol total', ['ct', 'chol', 'cholesterol'], { jeun: 12, u: U.cholesterol });
bio('Bilan lipidique', 'HDL', 'HDL-cholestérol', ['hdl'], { syn: ['bon cholestérol'], jeun: 12, u: U.cholesterol });
bio('Bilan lipidique', 'LDL', 'LDL-cholestérol', ['ldl'], { syn: ['mauvais cholestérol'], jeun: 12, u: U.cholesterol });
bio('Bilan lipidique', 'TRIGLYCERIDES', 'Triglycérides', ['tg', 'trigly', 'triglycerides'], { jeun: 12, u: U.triglyc });

bio('Inflammation', 'CRP', 'CRP', ['crp'], { syn: ['protéine c réactive'], unite: 'mg/L' });
bio('Inflammation', 'PROCALCITONINE', 'Procalcitonine', ['pct', 'procalcitonine'], { unite: 'ng/mL' });

bio('Bilan martial', 'FERRITINE', 'Ferritine', ['ferritine', 'ferr'], { syn: ['ferritinémie', 'réserves en fer'], unite: 'ng/mL' });
bio('Bilan martial', 'FER_SERIQUE', 'Fer sérique', ['fer', 'fer serique'], { syn: ['sidérémie'], jeun: 8, unite: 'µg/dL' });
bio('Bilan martial', 'CST', 'Coefficient de saturation de la transferrine (CST)', ['cst', 'transferrine'], { syn: ['saturation de la transferrine', 'capacité totale de fixation'], jeun: 8, unite: '%' });

bio('Thyroïde', 'TSH', 'TSH ultrasensible', ['tsh', 'tshus'], { syn: ['thyréostimuline', 'thyroïde'], unite: 'mUI/L' });
bio('Thyroïde', 'T4L', 'T4 libre', ['t4', 't4l', 'ft4'], { syn: ['thyroxine libre'], unite: 'pmol/L' });
bio('Thyroïde', 'T3L', 'T3 libre', ['t3', 't3l', 'ft3'], { syn: ['triiodothyronine libre'], unite: 'pmol/L' });

bio('Pancréas', 'LIPASE', 'Lipase', ['lipase', 'lipasemie'], { syn: ['lipasémie'], unite: 'UI/L' });
bio('Pancréas', 'AMYLASE', 'Amylase', ['amylase', 'amylasemie'], { syn: ['amylasémie'], unite: 'UI/L' });

bio('Vitamines et minéraux', 'VITAMINE_D', 'Vitamine D (25-OH)', ['vit d', 'vitd', '25oh', 'vitamine d'], { syn: ['25 hydroxy vitamine d', 'calcidiol'], unite: 'ng/mL' });
bio('Vitamines et minéraux', 'VITAMINE_B12', 'Vitamine B12', ['b12', 'vit b12', 'vitamine b12'], { syn: ['cobalamine'], unite: 'pg/mL' });
bio('Vitamines et minéraux', 'FOLATES', 'Folates (vitamine B9)', ['b9', 'folates', 'vit b9'], { syn: ['acide folique'], unite: 'ng/mL' });
bio('Vitamines et minéraux', 'CALCIUM', 'Calcium', ['ca', 'calcemie', 'calcium'], { syn: ['calcémie'], u: U.calcium });
bio('Vitamines et minéraux', 'PHOSPHORE', 'Phosphore', ['phos', 'phosphore', 'phosphoremie'], { syn: ['phosphorémie', 'phosphates'], unite: 'mg/L' });
bio('Vitamines et minéraux', 'MAGNESIUM', 'Magnésium', ['mg', 'magnesium', 'magnesemie'], { syn: ['magnésémie'], unite: 'mg/L' });
bio('Vitamines et minéraux', 'ACIDE_URIQUE', 'Acide urique', ['au', 'uricemie', 'acide urique'], { syn: ['uricémie', 'goutte'], u: U.urique });
bio('Vitamines et minéraux', 'CPK', 'CPK', ['cpk', 'ck'], { syn: ['créatine phosphokinase', 'créatine kinase'], unite: 'UI/L' });

bio('Hormonologie', 'BETA_HCG', 'Bêta-hCG plasmatique', ['bhcg', 'hcg', 'beta hcg', 'b hcg'], { syn: ['test de grossesse sanguin', 'grossesse'], unite: 'mUI/mL' });
bio('Hormonologie', 'PSA', 'PSA total et libre', ['psa'], { syn: ['antigène prostatique spécifique', 'prostate'], unite: 'ng/mL' });

bio('Sérologies', 'AG_HBS', 'Antigène HBs', ['aghbs', 'ag hbs', 'hbs', 'hepatite b', 'vhb'], { syn: ['hépatite b'] });
bio('Sérologies', 'AC_ANTI_HBS', 'Anticorps anti-HBs', ['ac hbs', 'anti hbs', 'achbs', 'hepatite b', 'vhb'], { syn: ['hépatite b', 'immunité vaccinale'] });
bio('Sérologies', 'AC_ANTI_HBC', 'Anticorps anti-HBc', ['ac hbc', 'anti hbc', 'achbc', 'hepatite b', 'vhb'], { syn: ['hépatite b'] });
bio('Sérologies', 'CHARGE_VIRALE_VHB', 'Charge virale VHB (ADN VHB)', ['adn vhb', 'cv vhb', 'pcr vhb', 'vhb'], { syn: ['hépatite b', 'adn viral b'], unite: 'UI/mL' });
bio('Sérologies', 'AC_ANTI_VHC', 'Anticorps anti-VHC', ['ac vhc', 'anti vhc', 'vhc', 'hcv', 'hepatite c'], { syn: ['hépatite c', 'sérologie hépatite c'] });
bio('Sérologies', 'ARN_VHC', 'ARN VHC (charge virale)', ['arn vhc', 'cv vhc', 'pcr vhc', 'vhc'], { syn: ['hépatite c', 'arn viral c'], unite: 'UI/mL' });
bio('Sérologies', 'VIH', 'Sérologie VIH 1 et 2', ['vih', 'hiv', 'sida'], { syn: ['sérologie hiv'], consent: true });
bio('Sérologies', 'SYPHILIS', 'Sérologie syphilis (TPHA-VDRL)', ['tpha', 'vdrl', 'syphilis', 'bw'], { syn: ['tréponème'] });
bio('Sérologies', 'TOXOPLASMOSE', 'Sérologie toxoplasmose (IgG, IgM)', ['toxo', 'toxoplasmose'], {});
bio('Sérologies', 'RUBEOLE', 'Sérologie rubéole (IgG)', ['rubeole', 'rub'], {});

bio('Marqueurs tumoraux', 'AFP', 'Alpha-fœtoprotéine (AFP)', ['afp', 'alpha foeto'], { syn: ['alpha foetoprotéine', 'alphafoetoprotéine'], unite: 'ng/mL' });
bio('Marqueurs tumoraux', 'ACE', 'ACE', ['ace'], { syn: ['antigène carcino-embryonnaire'], unite: 'ng/mL' });
bio('Marqueurs tumoraux', 'CA_19_9', 'CA 19-9', ['ca199', 'ca 19 9', 'ca19'], { unite: 'U/mL' });
bio('Marqueurs tumoraux', 'CA_125', 'CA 125', ['ca125', 'ca 125'], { unite: 'U/mL' });
bio('Marqueurs tumoraux', 'CA_15_3', 'CA 15-3', ['ca153', 'ca 15 3', 'ca15'], { unite: 'U/mL' });

bio('Examens digestifs', 'CALPROTECTINE', 'Calprotectine fécale', ['calpro', 'calprotectine'], { syn: ['mici', 'inflammation intestinale'], unite: 'µg/g' });
bio('Examens digestifs', 'HP_TEST_RESPIRATOIRE', 'Helicobacter pylori — test respiratoire à l\'urée marquée', ['pyl', 'h pylori', 'hp', 'tru', 'helicobacter'], { syn: ['breath test', 'test à l\'urée'], jeun: 6, prec: ['Arrêt des IPP depuis 2 semaines', 'Arrêt des antibiotiques depuis 4 semaines'] });
bio('Examens digestifs', 'HP_SEROLOGIE', 'Helicobacter pylori — sérologie', ['pyl', 'h pylori', 'hp', 'helicobacter'], {});
bio('Examens digestifs', 'HP_ANTIGENE_FECAL', 'Helicobacter pylori — antigène fécal', ['pyl', 'h pylori', 'hp', 'helicobacter'], { syn: ['antigène dans les selles'] });
bio('Examens digestifs', 'COPROCULTURE', 'Coproculture', ['copro', 'coproculture'], { syn: ['culture des selles', 'diarrhée'] });
bio('Examens digestifs', 'EPS', 'Examen parasitologique des selles', ['kop', 'parasito', 'eps selles', 'kaop'], { syn: ['parasitologie des selles', 'kystes œufs parasites'], prec: ['3 prélèvements à quelques jours d\'intervalle'] });
bio('Examens digestifs', 'SANG_OCCULTE', 'Recherche de sang occulte dans les selles', ['hemoccult', 'fit', 'sang occulte', 'rso'], { syn: ['test immunologique fécal', 'dépistage colorectal'] });

// ── Imagerie ────────────────────────────────────────────────────────────────
const ECHO = ['echo', 'echographie', 'us'];
img('Échographie', 'ECHO_ABDOMINALE', 'Échographie abdominale', ECHO, { jeun: 6, q: 'Recherche de lithiase vésiculaire ?' });
img('Échographie', 'ECHO_ABDOMINO_PELVIENNE', 'Échographie abdomino-pelvienne', ECHO, { jeun: 6, prec: ['Vessie pleine'], q: 'Recherche d\'une cause à des douleurs abdominales ?' });
img('Échographie', 'ECHO_HEPATIQUE_DOPPLER', 'Échographie hépatique avec doppler', [...ECHO, 'doppler'], { syn: ['écho-doppler hépatique', 'foie', 'tronc porte'], jeun: 6, q: 'Signes d\'hypertension portale ? Nodule hépatique ?' });
img('Échographie', 'ECHO_RENALE_VESICALE', 'Échographie rénale et vésicale', ECHO, { syn: ['arbre urinaire', 'reins', 'vessie', 'prostate'], prec: ['Vessie pleine', 'Avec mesure du résidu post-mictionnel'], q: 'Dilatation des cavités ? Lithiase ?' });
img('Échographie', 'ECHO_THYROIDIENNE', 'Échographie thyroïdienne', ECHO, { syn: ['cervicale', 'thyroïde'], q: 'Nodule thyroïdien : classification EU-TIRADS ?' });
img('Échographie', 'ECHO_PELVIENNE', 'Échographie pelvienne', ECHO, { syn: ['utérus', 'ovaires'], prec: ['Voie sus-pubienne', 'Voie endovaginale', 'Vessie pleine'], q: 'Recherche d\'une pathologie utéro-annexielle ?' });
img('Échographie', 'ECHO_OBSTETRICALE', 'Échographie obstétricale', ECHO, { syn: ['grossesse', 'datation', 'morphologique'], prec: ['1er trimestre (datation)', '2e trimestre (morphologie)', '3e trimestre (croissance)'], q: 'Datation et vitalité ?' });
img('Échographie', 'ECHO_MAMMAIRE', 'Échographie mammaire', ECHO, { syn: ['sein'], prec: ['Bilatérale', 'Sein droit', 'Sein gauche'], q: 'Caractérisation d\'un nodule ?' });
img('Échographie', 'ECHO_PARTIES_MOLLES', 'Échographie des parties molles', ECHO, { syn: ['tuméfaction', 'paroi'], prec: ['Localisation à préciser'], q: 'Nature d\'une tuméfaction ?' });

const RX = ['rx', 'radio', 'radiographie'];
img('Radiographie', 'RX_THORAX', 'Radiographie thoracique (face)', [...RX, 'rp', 'thorax'], { syn: ['radio pulmonaire', 'radiographie pulmonaire', 'poumons'], irr: true, prec: ['Face', 'Face et profil'], q: 'Foyer infectieux ? Épanchement ?' });
img('Radiographie', 'RX_ASP', 'ASP (abdomen sans préparation)', [...RX, 'asp'], { syn: ['abdomen sans préparation'], irr: true, q: 'Niveaux hydro-aériques ? Pneumopéritoine ?' });
img('Radiographie', 'RX_RACHIS', 'Radiographie du rachis', [...RX, 'rachis'], { syn: ['colonne vertébrale', 'lombaire', 'cervical', 'dorsal'], irr: true, prec: ['Cervical', 'Dorsal', 'Lombaire', 'Face et profil'], q: 'Lésion osseuse ? Trouble de la statique ?' });
img('Radiographie', 'RX_MEMBRES', 'Radiographie d\'un membre', [...RX, 'membre'], { syn: ['os', 'articulation', 'genou', 'épaule', 'main', 'pied', 'cheville', 'hanche', 'bassin', 'poignet'], irr: true, prec: ['Côté droit', 'Côté gauche', 'Face et profil', 'Segment à préciser'], q: 'Fracture ? Arthrose ?' });

const TDM = ['tdm', 'scanner', 'scan', 'ct'];
img('TDM (scanner)', 'TDM_CEREBRALE', 'TDM cérébrale', TDM, { syn: ['scanner cérébral', 'crâne'], irr: true, inj: 'iode', q: 'Lésion ischémique ou hémorragique ?' });
img('TDM (scanner)', 'TDM_THORACIQUE', 'TDM thoracique', TDM, { syn: ['scanner thoracique', 'angioscanner'], irr: true, inj: 'iode', q: 'Embolie pulmonaire ? Nodule ?' });
img('TDM (scanner)', 'TDM_ABDOMINO_PELVIENNE', 'TDM abdomino-pelvienne', [...TDM, 'tap'], { syn: ['scanner abdominal', 'scanner abdomino-pelvien', 'uroscanner'], irr: true, inj: 'iode', q: 'Bilan d\'extension ? Caractérisation d\'une lésion ?' });

const IRM = ['irm', 'mri'];
img('IRM', 'IRM_CEREBRALE', 'IRM cérébrale', IRM, { inj: 'gadolinium', q: 'Lésion démyélinisante ? Processus expansif ?' });
img('IRM', 'IRM_HEPATIQUE', 'IRM hépatique', IRM, { syn: ['foie'], jeun: 4, inj: 'gadolinium', q: 'Caractérisation d\'un nodule hépatique ?' });
img('IRM', 'BILI_IRM', 'Bili-IRM (cholangio-IRM)', [...IRM, 'bili irm', 'cholangio'], { syn: ['cholangio-irm', 'cprm', 'voies biliaires'], jeun: 6, q: 'Obstacle sur la voie biliaire principale ?' });
img('IRM', 'ENTERO_IRM', 'Entéro-IRM', [...IRM, 'entero irm'], { syn: ['grêle', 'crohn'], jeun: 6, inj: 'gadolinium', q: 'Activité et étendue d\'une maladie de Crohn ?' });
img('IRM', 'IRM_RACHIS', 'IRM du rachis', [...IRM, 'rachis'], { syn: ['hernie discale', 'médullaire', 'lombaire', 'cervical'], prec: ['Cervical', 'Dorsal', 'Lombaire'], inj: 'gadolinium', q: 'Conflit disco-radiculaire ?' });

img('Autres imageries', 'MAMMOGRAPHIE', 'Mammographie', ['mammo', 'mammographie'], { syn: ['sein', 'dépistage'], irr: true, prec: ['Bilatérale', 'Avec échographie complémentaire'], q: 'Dépistage ? Caractérisation d\'une anomalie ?' });
img('Autres imageries', 'OSTEODENSITOMETRIE', 'Ostéodensitométrie (DMO)', ['dmo', 'osteo', 'dexa', 'osteodensitometrie'], { syn: ['densité minérale osseuse', 'ostéoporose'], irr: true, q: 'Ostéoporose ?' });
img('Autres imageries', 'FIBROSCAN', 'Fibroscan (élastométrie hépatique)', ['fibroscan', 'elasto', 'elastometrie'], { syn: ['élastographie', 'fibrose hépatique'], jeun: 3, q: 'Évaluation de la fibrose hépatique ?' });

// ── Explorations ────────────────────────────────────────────────────────────
exp('Cardiologie', 'ECG', 'ECG', ['ecg'], { syn: ['électrocardiogramme'], q: 'Trouble du rythme ou de la conduction ?' });
exp('Cardiologie', 'ECHOCARDIOGRAPHIE', 'Échocardiographie transthoracique', ['ett', 'echo coeur', 'echocardio', 'echo'], { syn: ['échographie cardiaque', 'écho-doppler cardiaque'], q: 'Fonction ventriculaire gauche ? Valvulopathie ?' });
exp('Cardiologie', 'HOLTER_ECG', 'Holter ECG des 24 heures', ['holter', 'holter ecg'], { syn: ['holter rythmique'], q: 'Trouble du rythme paroxystique ?' });
exp('Cardiologie', 'MAPA', 'MAPA (mesure ambulatoire de la pression artérielle)', ['mapa', 'holter tensionnel'], { syn: ['holter tensionnel'], q: 'Confirmation d\'une HTA ? Contrôle tensionnel ?' });
exp('Cardiologie', 'EPREUVE_EFFORT', 'Épreuve d\'effort', ['ee', 'epreuve effort', 'test effort'], { syn: ['test d\'effort'], q: 'Ischémie myocardique d\'effort ?' });
exp('Endoscopie digestive', 'FOGD', 'FOGD (fibroscopie œso-gastro-duodénale)', ['fogd', 'gastroscopie', 'fibro', 'endoscopie haute', 'fibroscopie'], { syn: ['endoscopie digestive haute', 'fibroscopie gastrique'], jeun: 6, prec: ['Avec biopsies', 'Sous sédation'], q: 'Recherche d\'une lésion ulcéreuse ? Helicobacter pylori ?' });
exp('Endoscopie digestive', 'COLOSCOPIE', 'Coloscopie totale', ['colo', 'coloscopie'], { syn: ['endoscopie digestive basse'], jeun: 6, prec: ['Après préparation colique', 'Sous sédation', 'Avec biopsies'], q: 'Dépistage ? Bilan de rectorragies ?' });
exp('Endoscopie digestive', 'RECTOSIGMOIDOSCOPIE', 'Rectosigmoïdoscopie', ['rss', 'recto', 'rectosigmoidoscopie'], { prec: ['Après lavement évacuateur'], q: 'Bilan de rectorragies ?' });
exp('Endoscopie digestive', 'ECHO_ENDOSCOPIE', 'Écho-endoscopie', ['ee digestive', 'echoendoscopie', 'echo endoscopie', 'echo'], { jeun: 6, prec: ['Haute (bilio-pancréatique)', 'Basse (rectale)', 'Sous sédation'], q: 'Lithiase de la voie biliaire ? Lésion pancréatique ?' });
exp('Pneumologie', 'EFR', 'EFR (exploration fonctionnelle respiratoire)', ['efr', 'spiro', 'spirometrie'], { syn: ['spirométrie', 'souffle'], prec: ['Avec test de réversibilité'], q: 'Trouble ventilatoire obstructif ?' });
exp('Gynécologie', 'FCV', 'Frottis cervico-vaginal', ['fcv', 'frottis'], { syn: ['frottis du col', 'dépistage col utérin', 'test hpv'], q: 'Dépistage ?' });

// ── Packs système ───────────────────────────────────────────────────────────
const BILAN_HEPATIQUE = ['ASAT', 'ALAT', 'GGT', 'PAL', 'BILIRUBINE'];
const BILAN_LIPIDIQUE = ['CHOLESTEROL_TOTAL', 'HDL', 'LDL', 'TRIGLYCERIDES'];
const packs = [
  { code: 'BILAN_HEPATIQUE', nom: 'Bilan hépatique', mots: ['hepatique', 'foie', 'bh', 'transaminases'], examens: [...BILAN_HEPATIQUE, 'ALBUMINE', 'TP_INR'] },
  { code: 'BILAN_RENAL', nom: 'Bilan rénal', mots: ['renal', 'rein', 'fonction renale'], examens: ['UREE', 'CREATININE', 'DFG', 'IONOGRAMME'] },
  { code: 'BILAN_GLYCEMIQUE', nom: 'Bilan glycémique', mots: ['glycemique', 'diabete', 'sucre'], examens: ['GLYCEMIE_JEUN', 'HBA1C'] },
  { code: 'BILAN_LIPIDIQUE', nom: 'Bilan lipidique', mots: ['lipidique', 'eal', 'cholesterol', 'lipides'], examens: BILAN_LIPIDIQUE },
  { code: 'BILAN_MARTIAL', nom: 'Bilan martial', mots: ['martial', 'fer', 'anemie', 'carence'], examens: ['NFS', 'FERRITINE', 'FER_SERIQUE', 'CST'] },
  { code: 'BILAN_THYROIDIEN', nom: 'Bilan thyroïdien', mots: ['thyroidien', 'thyroide'], examens: ['TSH', 'T4L', 'T3L'] },
  { code: 'SEROLOGIES_HEPATITES', nom: 'Sérologies hépatites B et C', mots: ['hepatite', 'vhb', 'vhc', 'serologies'], examens: ['AG_HBS', 'AC_ANTI_HBS', 'AC_ANTI_HBC', 'AC_ANTI_VHC'] },
  { code: 'HEPATOPATHIE_CHRONIQUE', nom: 'Bilan d\'hépatopathie chronique', mots: ['hepatopathie', 'cirrhose', 'foie', 'fibrose'], examens: ['NFS', 'TP_INR', 'ALBUMINE', ...BILAN_HEPATIQUE, 'AFP', 'ECHO_HEPATIQUE_DOPPLER', 'FIBROSCAN'] },
  { code: 'SUIVI_DIABETE', nom: 'Suivi du diabète', mots: ['diabete', 'suivi', 'dt2', 'dt1'], examens: ['GLYCEMIE_JEUN', 'HBA1C', 'CREATININE', 'DFG', 'ALBU_CREAT_U', ...BILAN_LIPIDIQUE] },
  { code: 'SUIVI_HTA', nom: 'Suivi HTA', mots: ['hta', 'hypertension', 'tension', 'suivi'], examens: ['CREATININE', 'DFG', 'IONOGRAMME', ...BILAN_LIPIDIQUE, 'GLYCEMIE_JEUN', 'ECG'] },
  { code: 'PRE_OPERATOIRE', nom: 'Bilan pré-opératoire', mots: ['preoperatoire', 'pre operatoire', 'preop', 'chirurgie', 'anesthesie'], examens: ['NFS', 'TP_INR', 'TCA', 'GROUPE_ABO_RH', 'RAI', 'IONOGRAMME', 'CREATININE', 'GLYCEMIE_JEUN'] },
  { code: 'BILAN_INFLAMMATOIRE', nom: 'Bilan inflammatoire', mots: ['inflammatoire', 'inflammation', 'infection'], examens: ['NFS', 'VS', 'CRP'] },
  { code: 'PRENATAL_T1', nom: 'Bilan prénatal du 1er trimestre', mots: ['prenatal', 'grossesse', 'enceinte', 'trimestre', 'obstetrique'], examens: ['GROUPE_ABO_RH', 'RAI', 'NFS', 'GLYCEMIE_JEUN', 'TOXOPLASMOSE', 'RUBEOLE', 'SYPHILIS', 'VIH', 'AG_HBS', 'ECBU', 'ECHO_OBSTETRICALE'] },
];

// ── Contrôles de cohérence de la source ─────────────────────────────────────
const byCode = new Map();
for (const e of exams) {
  if (byCode.has(e.code)) throw new Error(`Code d'examen en double : ${e.code}`);
  byCode.set(e.code, e);
}
for (const p of packs) for (const c of p.examens) {
  if (!byCode.has(c)) throw new Error(`Pack ${p.code} : examen inconnu ${c}`);
}
const packRows = packs.map((p, i) => ({
  code: p.code,
  nom: p.nom,
  mots_cles: p.mots,
  ordre: (i + 1) * 10,
  lignes: p.examens.map(c => ({ examen_code: c, libelle: byCode.get(c).libelle, type: byCode.get(c).type })),
}));

// Empreinte : même calcul rejouable en base (voir requête en fin de migration).
const md5 = s => createHash('md5').update(s, 'utf8').digest('hex');
const uniteKey = u => [u.parametre ?? '', u.unite_defaut ?? '', u.unite ?? '', u.facteur ?? '', u.diviseur ?? '', u.formule ?? '', u.a ?? '', u.b ?? ''].join(':');
const empreinteExamens = md5(exams.map(e => e.code).sort().map(c => {
  const e = byCode.get(c);
  return [
    e.code, e.libelle, e.type, e.categorie, e.a_jeun, e.delai_jeun_h ?? '', e.irradiant, e.injection_possible,
    e.produit_contraste ?? '', e.consentement_requis, e.abreviations.join(','), e.synonymes.join(','),
    e.precisions_suggerees.join(','), e.question_exemple ?? '', e.unite_defaut ?? '', e.unites.map(uniteKey).join(','), e.ordre,
  ].join('|');
}).join('\n'));
const empreintePacks = md5(packRows.map(p => p.code).sort().map(c => {
  const p = packRows.find(x => x.code === c);
  return [p.code, p.nom, p.lignes.map(l => l.examen_code).join(',')].join('|');
}).join('\n'));

writeFileSync(
  new URL('../src/lib/examens_reference.data.json', import.meta.url),
  JSON.stringify({ empreinte: { examens: empreinteExamens, packs: empreintePacks }, examens: exams, packs: packRows }, null, 2) + '\n',
);

// ── Migration SQL ───────────────────────────────────────────────────────────
const q = s => (s === null || s === undefined ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const arr = a => (a.length ? `array[${a.map(q).join(',')}]::text[]` : `'{}'::text[]`);
const jb = v => `${q(JSON.stringify(v))}::jsonb`;
const b = v => (v ? 'true' : 'false');
const n = v => (v === null || v === undefined ? 'null' : String(v));

const examRow = e => `  (${q(e.code)}, ${q(e.libelle)}, ${q(e.type)}, ${q(e.categorie)}, ${arr(e.abreviations)}, ${arr(e.synonymes)}, ${b(e.a_jeun)}, ${n(e.delai_jeun_h)}, ${b(e.irradiant)}, ${b(e.injection_possible)}, ${q(e.produit_contraste)}, ${b(e.consentement_requis)}, ${arr(e.precisions_suggerees)}, ${q(e.question_exemple)}, ${q(e.unite_defaut)}, ${jb(e.unites)}, ${e.ordre})`;
const EXAM_COLS = '(code, libelle, type, categorie, abreviations, synonymes, a_jeun, delai_jeun_h, irradiant, injection_possible, produit_contraste, consentement_requis, precisions_suggerees, question_exemple, unite_defaut, unites, ordre)';
// INSERT par lots (instance nano) : 60 lignes par instruction.
const chunks = [];
for (let i = 0; i < exams.length; i += 60) chunks.push(exams.slice(i, i + 60));
const examInserts = chunks.map(c => `insert into public.examens_reference ${EXAM_COLS} values
${c.map(examRow).join(',\n')}
on conflict (code) do update set
  libelle = excluded.libelle, type = excluded.type, categorie = excluded.categorie,
  abreviations = excluded.abreviations, synonymes = excluded.synonymes, a_jeun = excluded.a_jeun,
  delai_jeun_h = excluded.delai_jeun_h, irradiant = excluded.irradiant,
  injection_possible = excluded.injection_possible, produit_contraste = excluded.produit_contraste,
  consentement_requis = excluded.consentement_requis, precisions_suggerees = excluded.precisions_suggerees,
  question_exemple = excluded.question_exemple, unite_defaut = excluded.unite_defaut,
  unites = excluded.unites, ordre = excluded.ordre;`).join('\n\n');

const sql = `-- Sprint 5 — Demande d'examens (biologie, imagerie, explorations) en boucle fermée.
-- FICHIER GÉNÉRÉ par scripts/gen_examens.mjs — ne pas modifier à la main.
--
--   examens_reference       référentiel (lecture seule) — ${exams.length} examens
--   packs_examens           packs système (${packRows.length}) + packs personnels du médecin
--   demandes_examens        une demande = un patient, une échéance, un statut dérivé des lignes
--   demande_examen_lignes   un examen prescrit = un emplacement « en attente de résultat »
--
-- Jamais de suppression physique (aucune policy DELETE) : annulation = statut 'annule'.
-- RLS identique à traitements_chroniques : lecture par l'org (secrétaire comprise),
-- écriture réservée aux médecins de l'org, doctor_id = doctors.id.
-- Empreinte de la source : examens ${empreinteExamens} · packs ${empreintePacks}

-- ═══ 1. Référentiel ═════════════════════════════════════════════════════════
create table if not exists public.examens_reference (
  code                 text primary key check (code = upper(code) and length(code) >= 2),
  libelle              text not null check (length(trim(libelle)) > 0),
  type                 text not null check (type in ('biologie','imagerie','exploration')),
  categorie            text not null,
  abreviations         text[] not null default '{}',
  synonymes            text[] not null default '{}',
  a_jeun               boolean not null default false,
  delai_jeun_h         smallint null check (delai_jeun_h between 1 and 24),
  irradiant            boolean not null default false,
  injection_possible   boolean not null default false,
  produit_contraste    text null check (produit_contraste in ('iode','gadolinium')),
  consentement_requis  boolean not null default false,
  precisions_suggerees text[] not null default '{}',
  question_exemple     text null,
  unite_defaut         text null,
  unites               jsonb not null default '[]'::jsonb,
  code_loinc           text null,
  ordre                integer not null default 0,
  actif                boolean not null default true,
  created_at           timestamptz not null default now()
);

alter table public.examens_reference enable row level security;
drop policy if exists examens_reference_read on public.examens_reference;
create policy examens_reference_read on public.examens_reference for select to authenticated using (true);
revoke insert, update, delete on public.examens_reference from anon, authenticated;

-- ═══ 2. Packs ═══════════════════════════════════════════════════════════════
create table if not exists public.packs_examens (
  id          uuid primary key default gen_random_uuid(),
  systeme     boolean not null default false,
  code        text null,
  org_id      uuid null references public.organizations(id),
  doctor_id   uuid null references public.doctors(id),
  nom         text not null check (length(trim(nom)) > 0 and length(nom) <= 80),
  mots_cles   text[] not null default '{}',
  -- [{ examen_code | null, libelle, type, precision? }]
  lignes      jsonb not null default '[]'::jsonb check (jsonb_typeof(lignes) = 'array'),
  archive     boolean not null default false,
  ordre       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint packs_examens_proprietaire check (
    (systeme and org_id is null and doctor_id is null and code is not null)
    or (not systeme and org_id is not null and doctor_id is not null)
  )
);
create unique index if not exists packs_examens_code_systeme_uidx on public.packs_examens (code) where systeme;
create index if not exists packs_examens_doctor_idx on public.packs_examens (doctor_id) where not systeme;

alter table public.packs_examens enable row level security;
drop policy if exists packs_examens_select on public.packs_examens;
create policy packs_examens_select on public.packs_examens
  for select to authenticated
  using (systeme or get_my_role() = 'super_admin' or org_id = get_my_org_id());

drop policy if exists packs_examens_insert on public.packs_examens;
create policy packs_examens_insert on public.packs_examens
  for insert to authenticated
  with check (
    not systeme
    and org_id = get_my_org_id()
    and coalesce(get_my_role(), '') <> 'secretaire'
    and doctor_id in (
      select d.id from public.doctors d
      where d.user_id = (select auth.uid()) and d.org_id = packs_examens.org_id
    )
  );

-- Renommer / archiver : uniquement SES packs personnels.
drop policy if exists packs_examens_update on public.packs_examens;
create policy packs_examens_update on public.packs_examens
  for update to authenticated
  using (
    not systeme
    and org_id = get_my_org_id()
    and coalesce(get_my_role(), '') <> 'secretaire'
    and doctor_id in (select d.id from public.doctors d where d.user_id = (select auth.uid()))
  )
  with check (
    not systeme
    and org_id = get_my_org_id()
    and doctor_id in (select d.id from public.doctors d where d.user_id = (select auth.uid()))
  );
-- Aucune policy DELETE : un pack personnel s'archive.

create or replace function public.packs_examens_guard_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.systeme <> old.systeme or new.doctor_id is distinct from old.doctor_id
     or new.org_id is distinct from old.org_id or new.code is distinct from old.code then
    raise exception 'packs_examens : propriétaire et nature du pack non modifiables';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists packs_examens_guard on public.packs_examens;
create trigger packs_examens_guard before update on public.packs_examens
  for each row execute function public.packs_examens_guard_update();

-- ═══ 3. Demandes ════════════════════════════════════════════════════════════
create table if not exists public.demandes_examens (
  id                        uuid primary key default gen_random_uuid(),
  numero                    text not null unique check (numero ~ '^DEM-[0-9]{8}-[A-Z0-9]{4}$'),
  patient_id                uuid not null references public.patients(id) on delete cascade,
  org_id                    uuid not null references public.organizations(id),
  doctor_id                 uuid not null references public.doctors(id),
  ordonnance_id             uuid null references public.ordonnances(id) on delete set null,
  date_demande              date not null default current_date,
  echeance_date             date not null,
  echeance_libelle          text not null default 'date_precise' check (echeance_libelle in
    ('avant_prochain_rdv','1_semaine','15_jours','1_mois','3_mois','6_mois','1_an','date_precise')),
  renseignements_cliniques  text null,
  urgent                    boolean not null default false,
  ald                       boolean not null default false,
  regrouper_imageries       boolean not null default false,
  packs_utilises            text[] not null default '{}',
  statut                    text not null default 'en_attente' check (statut in ('en_attente','partiel','realise','annule')),
  motif_annulation          text null,
  notes                     text null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint demandes_examens_echeance_coherente check (echeance_date >= date_demande)
);

create index if not exists demandes_examens_patient_idx on public.demandes_examens (patient_id, echeance_date);
create index if not exists demandes_examens_doctor_idx on public.demandes_examens (doctor_id, created_at desc);
create index if not exists demandes_examens_suivi_idx on public.demandes_examens (org_id, echeance_date)
  where statut in ('en_attente','partiel');
create index if not exists demandes_examens_ordonnance_idx on public.demandes_examens (ordonnance_id)
  where ordonnance_id is not null;

create table if not exists public.demande_examen_lignes (
  id                uuid primary key default gen_random_uuid(),
  demande_id        uuid not null references public.demandes_examens(id) on delete cascade,
  examen_code       text null references public.examens_reference(code) on update cascade,
  libelle           text not null check (length(trim(libelle)) > 0),
  type              text not null check (type in ('biologie','imagerie','exploration')),
  categorie         text null,
  precision         text null,
  question_clinique text null,
  a_jeun            boolean not null default false,
  delai_jeun_h      smallint null check (delai_jeun_h between 1 and 24),
  injection         boolean null,
  statut            text not null default 'en_attente' check (statut in ('en_attente','realise','annule')),
  date_realisation  date null,
  -- Emplacement « en attente de résultat » : renseigné au Sprint 6.
  resultat_id       uuid null,
  ordre             integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists demande_examen_lignes_demande_idx on public.demande_examen_lignes (demande_id, ordre);

alter table public.demandes_examens enable row level security;
alter table public.demande_examen_lignes enable row level security;

drop policy if exists demandes_examens_select on public.demandes_examens;
create policy demandes_examens_select on public.demandes_examens
  for select to authenticated
  using (get_my_role() = 'super_admin' or org_id = get_my_org_id());

drop policy if exists demandes_examens_insert on public.demandes_examens;
create policy demandes_examens_insert on public.demandes_examens
  for insert to authenticated
  with check (
    org_id = get_my_org_id()
    and coalesce(get_my_role(), '') <> 'secretaire'
    and doctor_id in (
      select d.id from public.doctors d
      where d.user_id = (select auth.uid()) and d.org_id = demandes_examens.org_id
    )
    and statut = 'en_attente'
  );

drop policy if exists demandes_examens_update on public.demandes_examens;
create policy demandes_examens_update on public.demandes_examens
  for update to authenticated
  using (
    org_id = get_my_org_id()
    and coalesce(get_my_role(), '') <> 'secretaire'
    and exists (
      select 1 from public.doctors d
      where d.user_id = (select auth.uid()) and d.org_id = demandes_examens.org_id
    )
  )
  with check (
    org_id = get_my_org_id()
    and coalesce(get_my_role(), '') <> 'secretaire'
    and exists (
      select 1 from public.doctors d
      where d.user_id = (select auth.uid()) and d.org_id = demandes_examens.org_id
    )
  );

drop policy if exists demande_examen_lignes_select on public.demande_examen_lignes;
create policy demande_examen_lignes_select on public.demande_examen_lignes
  for select to authenticated
  using (exists (
    select 1 from public.demandes_examens de
    where de.id = demande_examen_lignes.demande_id
      and (get_my_role() = 'super_admin' or de.org_id = get_my_org_id())
  ));

drop policy if exists demande_examen_lignes_insert on public.demande_examen_lignes;
create policy demande_examen_lignes_insert on public.demande_examen_lignes
  for insert to authenticated
  with check (
    coalesce(get_my_role(), '') <> 'secretaire'
    and statut = 'en_attente'
    and exists (
      select 1 from public.demandes_examens de
      join public.doctors d on d.id = de.doctor_id
      where de.id = demande_examen_lignes.demande_id
        and de.org_id = get_my_org_id()
        and d.user_id = (select auth.uid())
    )
  );

drop policy if exists demande_examen_lignes_update on public.demande_examen_lignes;
create policy demande_examen_lignes_update on public.demande_examen_lignes
  for update to authenticated
  using (
    coalesce(get_my_role(), '') <> 'secretaire'
    and exists (
      select 1 from public.demandes_examens de
      where de.id = demande_examen_lignes.demande_id
        and de.org_id = get_my_org_id()
        and exists (select 1 from public.doctors d where d.user_id = (select auth.uid()) and d.org_id = de.org_id)
    )
  )
  with check (
    coalesce(get_my_role(), '') <> 'secretaire'
    and exists (
      select 1 from public.demandes_examens de
      where de.id = demande_examen_lignes.demande_id and de.org_id = get_my_org_id()
    )
  );
-- Aucune policy DELETE sur les deux tables.

-- ── Garde-fous ──────────────────────────────────────────────────────────────
-- Demande : auteur, patient, org, numéro et date figés ; le statut est DÉRIVÉ des lignes
-- (jamais modifié directement) ; l'ordonnance ne se rattache qu'une fois.
create or replace function public.demandes_examens_guard_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.doctor_id <> old.doctor_id or new.patient_id <> old.patient_id or new.org_id <> old.org_id
     or new.numero <> old.numero or new.date_demande <> old.date_demande then
    raise exception 'demandes_examens : auteur, patient, organisation, numéro et date non modifiables';
  end if;
  if new.statut <> old.statut and pg_trigger_depth() < 2 then
    raise exception 'demandes_examens : le statut découle des examens de la demande';
  end if;
  if old.ordonnance_id is not null and new.ordonnance_id is distinct from old.ordonnance_id then
    raise exception 'demandes_examens : ordonnance déjà rattachée';
  end if;
  if new.echeance_date < new.date_demande then
    raise exception 'demandes_examens : échéance antérieure à la demande';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists demandes_examens_guard on public.demandes_examens;
create trigger demandes_examens_guard before update on public.demandes_examens
  for each row execute function public.demandes_examens_guard_update();

-- Ligne : rattachement et nature figés ; une ligne annulée ne revient jamais en attente ;
-- la date de réalisation suit le statut.
create or replace function public.demande_examen_lignes_guard_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.demande_id <> old.demande_id or new.libelle <> old.libelle or new.type <> old.type
     or new.examen_code is distinct from old.examen_code then
    raise exception 'demande_examen_lignes : examen et demande non modifiables';
  end if;
  if old.statut = 'annule' and new.statut <> 'annule' then
    raise exception 'demande_examen_lignes : un examen annulé ne peut pas être rétabli';
  end if;
  if new.statut = 'realise' then
    new.date_realisation := coalesce(new.date_realisation, current_date);
  else
    new.date_realisation := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists demande_examen_lignes_guard on public.demande_examen_lignes;
create trigger demande_examen_lignes_guard before update on public.demande_examen_lignes
  for each row execute function public.demande_examen_lignes_guard_update();

-- Statut de la demande, dérivé des lignes :
--   toutes annulées → annule ; aucune réalisée → en_attente ;
--   reste au moins une ligne en attente et au moins une réalisée → partiel ; sinon → realise.
create or replace function public.demande_examen_lignes_sync_statut()
returns trigger language plpgsql set search_path = public as $$
declare
  v_attente int; v_realise int; v_total int; v_statut text;
begin
  select count(*) filter (where statut = 'en_attente'),
         count(*) filter (where statut = 'realise'),
         count(*)
    into v_attente, v_realise, v_total
    from demande_examen_lignes where demande_id = new.demande_id;
  v_statut := case
    when v_total = 0 then 'en_attente'
    when v_attente = 0 and v_realise = 0 then 'annule'
    when v_realise = 0 then 'en_attente'
    when v_attente > 0 then 'partiel'
    else 'realise'
  end;
  update demandes_examens set statut = v_statut where id = new.demande_id and statut <> v_statut;
  return null;
end;
$$;
drop trigger if exists demande_examen_lignes_sync on public.demande_examen_lignes;
create trigger demande_examen_lignes_sync after insert or update of statut on public.demande_examen_lignes
  for each row execute function public.demande_examen_lignes_sync_statut();

-- ── Création atomique (demande + lignes dans la même transaction) ───────────
-- SECURITY INVOKER : la RLS s'applique à chaque INSERT. Une erreur annule tout.
create or replace function public.creer_demande_examens(p_demande jsonb, p_lignes jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
begin
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' or jsonb_array_length(p_lignes) = 0 then
    raise exception 'Demande d''examens vide : ajoutez au moins un examen';
  end if;
  if jsonb_array_length(p_lignes) > 80 then
    raise exception 'Demande d''examens trop longue (80 examens au maximum)';
  end if;

  insert into demandes_examens (
    numero, patient_id, org_id, doctor_id, ordonnance_id, date_demande, echeance_date,
    echeance_libelle, renseignements_cliniques, urgent, ald, regrouper_imageries, packs_utilises, notes
  ) values (
    p_demande->>'numero',
    (p_demande->>'patient_id')::uuid,
    (p_demande->>'org_id')::uuid,
    (p_demande->>'doctor_id')::uuid,
    nullif(p_demande->>'ordonnance_id', '')::uuid,
    coalesce(nullif(p_demande->>'date_demande', '')::date, current_date),
    (p_demande->>'echeance_date')::date,
    coalesce(nullif(p_demande->>'echeance_libelle', ''), 'date_precise'),
    nullif(trim(coalesce(p_demande->>'renseignements_cliniques', '')), ''),
    coalesce((p_demande->>'urgent')::boolean, false),
    coalesce((p_demande->>'ald')::boolean, false),
    coalesce((p_demande->>'regrouper_imageries')::boolean, false),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_demande->'packs_utilises', '[]'::jsonb)) x), '{}'),
    nullif(trim(coalesce(p_demande->>'notes', '')), '')
  ) returning id into v_id;

  insert into demande_examen_lignes (
    demande_id, examen_code, libelle, type, categorie, precision, question_clinique,
    a_jeun, delai_jeun_h, injection, ordre
  )
  select v_id,
         nullif(l->>'examen_code', ''),
         l->>'libelle',
         l->>'type',
         nullif(l->>'categorie', ''),
         nullif(trim(coalesce(l->>'precision', '')), ''),
         nullif(trim(coalesce(l->>'question_clinique', '')), ''),
         coalesce((l->>'a_jeun')::boolean, false),
         nullif(l->>'delai_jeun_h', '')::smallint,
         nullif(l->>'injection', '')::boolean,
         (ord - 1)::int
  from jsonb_array_elements(p_lignes) with ordinality as t(l, ord);

  return v_id;
end;
$$;

-- Annulation d'une demande : motif obligatoire, les examens encore en attente sont annulés
-- (les examens déjà réalisés restent réalisés). Le statut de la demande en découle.
create or replace function public.annuler_demande_examens(p_demande_id uuid, p_motif text)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if p_motif is null or length(trim(p_motif)) < 3 then
    raise exception 'Motif d''annulation obligatoire';
  end if;
  update demandes_examens set motif_annulation = trim(p_motif) where id = p_demande_id;
  if not found then
    raise exception 'Demande introuvable ou non modifiable';
  end if;
  update demande_examen_lignes set statut = 'annule'
    where demande_id = p_demande_id and statut = 'en_attente';
end;
$$;

revoke all on function public.creer_demande_examens(jsonb, jsonb) from public, anon;
revoke all on function public.annuler_demande_examens(uuid, text) from public, anon;
grant execute on function public.creer_demande_examens(jsonb, jsonb) to authenticated;
grant execute on function public.annuler_demande_examens(uuid, text) to authenticated;

-- ═══ 4. Données ═════════════════════════════════════════════════════════════
${examInserts}

insert into public.packs_examens (systeme, code, nom, mots_cles, lignes, ordre) values
${packRows.map(p => `  (true, ${q(p.code)}, ${q(p.nom)}, ${arr(p.mots_cles)}, ${jb(p.lignes)}, ${p.ordre})`).join(',\n')}
on conflict (code) where systeme do update set
  nom = excluded.nom, mots_cles = excluded.mots_cles, lignes = excluded.lignes, ordre = excluded.ordre;

-- Empreinte base = source (à comparer aux valeurs de l'en-tête) :
--   select md5(string_agg(concat_ws('|', code, libelle, type, categorie, a_jeun::text, coalesce(delai_jeun_h::text, ''),
--     irradiant::text, injection_possible::text, coalesce(produit_contraste, ''), consentement_requis::text,
--     array_to_string(abreviations, ','), array_to_string(synonymes, ','), array_to_string(precisions_suggerees, ','),
--     coalesce(question_exemple, ''), coalesce(unite_defaut, ''),
--     coalesce((select string_agg(concat(u->>'parametre', ':', u->>'unite_defaut', ':', u->>'unite', ':', u->>'facteur', ':',
--       u->>'diviseur', ':', u->>'formule', ':', u->>'a', ':', u->>'b'), ',' order by o)
--       from jsonb_array_elements(unites) with ordinality t(u, o)), ''),
--     ordre::text), E'\\n' order by code collate "C")) from examens_reference;
--   select md5(string_agg(concat_ws('|', code, nom,
--     (select string_agg(l->>'examen_code', ',' order by o) from jsonb_array_elements(lignes) with ordinality t(l, o))),
--     E'\\n' order by code collate "C")) from packs_examens where systeme;
`;

// Garde-fou : une migration existante n'est jamais réécrite (scripts/lib/migrationGuard.mjs).
writeNewMigration(new URL('../supabase/migrations/20261015120000_examens_demandes.sql', import.meta.url), sql);
console.log(`${exams.length} examens (${exams.filter(e => e.type === 'biologie').length} biologie, ${exams.filter(e => e.type === 'imagerie').length} imagerie, ${exams.filter(e => e.type === 'exploration').length} explorations), ${packRows.length} packs`);
console.log(`empreinte examens ${empreinteExamens} · packs ${empreintePacks}`);

// Forme compacte des mêmes données, pour l'application via l'outil de migration (même contenu,
// vérifié ensuite par l'empreinte). Écrite seulement si GEN_EXAMENS_TRANSPORT est défini.
if (process.env.GEN_EXAMENS_TRANSPORT) {
  const rows = exams.map(e => [e.code, e.libelle, e.type[0], e.categorie, e.abreviations, e.synonymes, e.delai_jeun_h, e.irradiant ? 1 : 0, e.produit_contraste, e.consentement_requis ? 1 : 0, e.precisions_suggerees, e.question_exemple, e.unite_defaut, e.unites, e.ordre]);
  const t = (i) => `array(select jsonb_array_elements_text(r->${i}))`;
  const transport = `insert into public.examens_reference ${EXAM_COLS}
select r->>0, r->>1, case r->>2 when 'b' then 'biologie' when 'i' then 'imagerie' else 'exploration' end, r->>3, ${t(4)}, ${t(5)},
  (r->>6) is not null, (r->>6)::smallint, (r->>7) = '1', (r->>8) is not null, r->>8, (r->>9) = '1', ${t(10)}, r->>11, r->>12, r->13, (r->>14)::int
from jsonb_array_elements(${q(JSON.stringify(rows))}::jsonb) r
on conflict (code) do nothing;

insert into public.packs_examens (systeme, code, nom, mots_cles, lignes, ordre)
select true, p->>0, p->>1, array(select jsonb_array_elements_text(p->2)),
  (select jsonb_agg(jsonb_build_object('examen_code', e.code, 'libelle', e.libelle, 'type', e.type) order by o)
     from jsonb_array_elements_text(p->3) with ordinality c(code, o) join public.examens_reference e on e.code = c.code),
  (p->>4)::int
from jsonb_array_elements(${q(JSON.stringify(packRows.map(p => [p.code, p.nom, p.mots_cles, p.lignes.map(l => l.examen_code), p.ordre])))}::jsonb) p
on conflict (code) where systeme do nothing;
`;
  writeFileSync(process.env.GEN_EXAMENS_TRANSPORT, transport);
}
