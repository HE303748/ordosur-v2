// Sprint 2b-1 — Source unique de la table de correspondance « formulation de CI → concept ».
// Génère :
//   • src/lib/ci_condition_concepts.data.json                       (fixture Vitest + repli embarqué)
//   • supabase/migrations/20261020120000_ci_condition_concepts.sql  (schéma + données en base)
// Usage : node scripts/gen_ci_condition_concepts.mjs
//
// Chaque formulation de contraindications.condition_valeur (types « pathologie » et « autre »)
// est rattachée ICI, à la main, à un concept de pathologies_curees — ou déclarée sans concept.
// Le moteur (src/lib/conditionMatcher.ts) ne cherche JAMAIS un concept dans le texte d'une
// contre-indication : il lit cette table.
//
// Une formulation « A / B » donne une ligne par alternative (colonne `libelle`).
//   traitement  concept      → comparaison de concepts (colonne concept et/ou famille)
//               renal        → comparaison de STADES (colonne stade : 3 · 3.5 = 3b · 4 · 5)
//               grossesse / allaitement → la pathologie du patient doit elle-même en parler
//               procreation / age      → jamais déclenchée par une pathologie (blocs dédiés)
//               allergie     → comparaison par famille ou molécule (canal allergies)
//               contexte     → co-prescription, acte, circonstance : libellé identique seulement
//               sans_concept → aucun concept dans pathologies_curees : libellé identique seulement
//   qualificatif_type  etat    → précision d'état de contrôle absente chez le patient : « À évaluer »
//                      gravite → précision de gravité / de forme absente : sévérité CONSERVÉE, « à préciser »

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { writeNewMigration } from './lib/migrationGuard.mjs';

const curees = JSON.parse(readFileSync(new URL('./data/pathologies_curees.snapshot.json', import.meta.url), 'utf8'));
const NOMS = new Set(curees.map(c => c.nom_fr));

const norm = s => s.replace(/œ/gi, 'oe').replace(/æ/gi, 'ae').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// ── Constructeurs ────────────────────────────────────────────────────────────
const C = (concept, ...o) => Object.assign({ traitement: 'concept', concept }, ...o);
const F = (famille, ...o) => Object.assign({ traitement: 'concept', concept: null, famille }, ...o);
const etat = q => ({ qualificatif: q, qualificatif_type: 'etat' });
const grav = q => ({ qualificatif: q, qualificatif_type: 'gravite' });
const fam = famille => ({ famille });
const lib = libelle => ({ libelle });
const REN = stade => ({ traitement: 'renal', concept: 'Insuffisance rénale chronique', stade });
const G = { traitement: 'grossesse' };
const AL = { traitement: 'allaitement' };
const PRO = { traitement: 'procreation' };
const AGE = { traitement: 'age' };
const ALG = { traitement: 'allergie' };
const CTX = (note, o = {}) => ({ traitement: 'contexte', note, ...o });
const SANS = (note, o = {}) => ({ traitement: 'sans_concept', note, ...o });

const AVC = 'Accident vasculaire cérébral', ALCOOL = "Addiction à l'alcool", IC = 'Insuffisance cardiaque';
const IH = 'Insuffisance hépatique', HTA = 'Hypertension artérielle', UGD = 'Ulcère gastro-duodénal';
const BAV = 'Bloc auriculo-ventriculaire', TB = 'Tuberculose pulmonaire', IDM = 'Infarctus du myocarde';
const AOMI = 'Artériopathie oblitérante des membres inférieurs', COAG = 'Trouble de la coagulation';
const BIO = 'anomalie biologique : aucun concept dans pathologies_curees';

// ── Table relue ligne par ligne (formulation → alternative(s)) ───────────────
const T = [
  ['Accident vasculaire cérébral hémorragique', C(AVC, grav('hémorragique'))],
  ['AVC hémorragique récent (< 3 mois)', C(AVC, grav('hémorragique récent (< 3 mois)'))],
  ['AVC hémorragique récent (< 6 mois)', C(AVC, grav('hémorragique récent (< 6 mois)'))],
  ['AVC récent (< 6 mois)', C(AVC, grav('récent (< 6 mois)'))],
  ['Alcoolisme actif', C(ALCOOL, etat('actif'))],
  ['Alcoolisme actif / Dépendance aux sédatifs',
    C(ALCOOL, etat('actif'), lib('Alcoolisme actif')), SANS('dépendance aux sédatifs : aucun concept', lib('Dépendance aux sédatifs'))],
  ['Alcoolisme chronique actif', C(ALCOOL, etat('actif'))],
  ['Allaitement', AL],
  ['Allaitement (6 premières semaines)', AL],
  ['Allergie aux AINS / Aspirine', ALG],
  ['Allergie aux sulfamides', ALG],
  ['Allongement du QT (QTc > 450 ms)', SANS('donnée ECG : aucun concept')],
  ['Amputation des membres (ATCD)', SANS('antécédent chirurgical : aucun concept')],
  // Corrigé : était rattaché à « Œdème ». L'angio-œdème est l'œdème de Quincke ; la forme héréditaire reste à préciser.
  ['Angio-œdème héréditaire (déficit en C1-inhibiteur)', C('Œdème de Quincke', grav('héréditaire (déficit en C1-inhibiteur)'))],
  // Ambigu (Anorexie mentale | Perte d'appétit | Dénutrition) : le symptôme « perte d'appétit » est écarté.
  ['Anorexie / Malnutrition sévère', C('Anorexie mentale', lib('Anorexie')), C('Dénutrition', grav('sévère'), lib('Malnutrition sévère'))],
  ['Antécédent cardiovasculaire (IDM, AVC, AOMI)', C(IDM, lib('IDM')), C(AVC, lib('AVC')), C(AOMI, lib('AOMI'))],
  ['Antécédent de thrombose veineuse profonde', C('Thrombose veineuse profonde', fam('mtev'))],
  ['Aplasie médullaire sévère préexistante', SANS('aucun concept')],
  ['Asthme', C('Asthme', fam('asthme'))],
  // Ambigu (« / » interne) : UNE seule alternative. Syndrome de Widal : sévérité conservée, à préciser.
  ["Asthme aggravé par l'aspirine / AINS", C('Asthme', fam('asthme'), grav("aggravé par l'aspirine ou les AINS (syndrome de Widal)"))],
  ['Asthme sévère', C('Asthme', fam('asthme'), grav('sévère'))],
  // Ambigu (« 2e ou 3e ») : une seule alternative, le degré est à préciser.
  ['Bloc auriculo-ventriculaire du 2e ou 3e degré', C(BAV, grav('2e ou 3e degré'))],
  ['Bloc auriculo-ventriculaire du 2ème degré', C(BAV, grav('2e degré'))],
  ['Bloc auriculo-ventriculaire du 3ème degré', C(BAV, grav('3e degré'))],
  ['BPCO', C('Bronchopneumopathie chronique obstructive')],
  ['BPCO sévère (VEMS < 30%)', C('Bronchopneumopathie chronique obstructive', grav('sévère (VEMS < 30 %)'))],
  ['Bradycardie (FC < 50/min)', C('Bradycardie')],
  ['Bradycardie sinusale', C('Bradycardie')],
  ['Cancer de la prostate', C('Cancer de la prostate')],
  ['Cancer du sein', C('Cancer du sein')],
  // Ambigu (« ou ») : une seule alternative.
  ['Cancer du sein diagnostiqué ou suspecté', C('Cancer du sein')],
  ['Carcinome médullaire thyroïde', C('Cancer de la thyroïde', grav('médullaire'))],
  ['Cardiomyopathie hypertrophique obstructive', C('Cardiomyopathie hypertrophique')],
  ['Cardiomyopathie obstructive (CMHO)', C('Cardiomyopathie hypertrophique')],
  ['Cardiopathie décompensée (FEVG < 30%)', C(IC, etat('décompensée (FEVG < 30 %)'))],
  ['Chirurgie récente à haut risque hémorragique', CTX('acte chirurgical')],
  ['Chirurgie récente avec risque hémorragique', CTX('acte chirurgical')],
  ['Cirrhose hépatique', C('Cirrhose du foie')],
  ['Colite infectieuse', SANS('aucun concept')],
  ['Coronaropathie', C('Cardiopathie ischémique', fam('coronaropathie'))],
  ['Décompensation cardiaque aiguë', C(IC, etat('décompensée (aiguë)'))],
  // Sprint 2b-2 — PROJET de grossesse : relève de la procréation, sans objet chez une patiente déjà enceinte.
  ['Déficit en acide folique (grossesse planifiée)', PRO],
  ['Déficit en G6PD', C('Déficit en G6PD')],
  ['Démence à corps de Lewy', C('Démence', grav('à corps de Lewy'))],
  ['Dépendance aux opioïdes (en sevrage)', SANS('aucun concept')],
  ['Dépression', C('Trouble dépressif', fam('depression'))],
  ['Déshydratation', C('Déshydratation')],
  ['Diabète', F('diabete')],
  // Un « Diabète » saisi sans type : à préciser. Un type 2 ne correspond jamais (numéro différent).
  ['Diabète de type 1', C('Diabète de type 1', fam('diabete'), grav('de type 1'))],
  ['Diabète décompensé', C('Diabète décompensé', fam('diabete'), etat('décompensé'))],
  ['Diabète décompensé (glycémie > 3 g/L)', C('Diabète décompensé', fam('diabete'), etat('décompensé (glycémie > 3 g/L)'))],
  ['Diabète insulino-dépendant avec hypoglycémies fréquentes', F('diabete', etat('insulino-dépendant avec hypoglycémies fréquentes'))],
  // Sprint 2b-2 — patient dialysé (pathologie ou antécédent) ou DFG < 15 : jamais « À évaluer ».
  ['Dialyse', { traitement: 'dialyse' }],
  ['Dysfonction sinusale / Maladie du sinus', C('Dysfonction sinusale')],
  ['Endocardite bactérienne', C('Endocardite')],
  ['Enfant < 16 ans (fièvre virale)', AGE],
  ['Enfant < 8 ans', AGE],
  ['Épilepsie', C('Épilepsie')],
  ['Épilepsie non contrôlée', C('Épilepsie', etat('non contrôlée'))],
  ['Femme en âge de procréer (HTA chronique)', PRO],
  // Corrigé : était rattaché à « Contraception » (un suivi contraceptif n'est pas une absence de contraception).
  ['Femme en âge de procréer sans contraception', PRO],
  ['Femme en âge de procréer sans contraception efficace', PRO],
  ['Femme ou homme en âge de procréer sans contraception', PRO],
  ['Fibrillation atriale', C('Fibrillation auriculaire')],
  ['Fibrose pulmonaire préexistante', C('Fibrose pulmonaire')],
  ['Glaucome', C('Glaucome')],
  ['Glaucome à angle fermé', C('Glaucome', grav('à angle fermé'))],
  ['Glaucome à angle ouvert non contrôlé', C('Glaucome', etat('à angle ouvert non contrôlé'))],
  ['Goutte', C('Goutte')],
  ['Goutte active', C('Goutte', etat('active'))],
  ['Grossesse', G],
  ['Grossesse — 1er trimestre', G],
  ['Grossesse — 2ème et 3ème trimestre', G],
  ['Grossesse — 3ème trimestre', G],
  ['Grossesse — 3ème trimestre (après 24 SA)', G],
  // Corrigés : étaient rattachés à « Hypertension artérielle » et « Insuffisance rénale chronique » (risque FŒTAL / gravidique).
  ['Grossesse — hypertension artérielle gravidique', G],
  ['Grossesse — hypertension pulmonaire néonatale persistante', G],
  ['Grossesse — insuffisance rénale fœtale (> 20 SA)', G],
  ['Grossesse — syndrome de floppy infant (terme)', G],
  ['Grossesse (1er trimestre)', G],
  ['Grossesse (2e trimestre)', G],
  ['Grossesse (3e trimestre)', G],
  ['Grossesse (toute période)', G],
  ["Grossesse dans le mois suivant l'arrêt (isotrétinoïne)", G],
  ['Grand âge (plus de 75 ans)', AGE],
  ['Hémochromatose', C('Hémochromatose')],
  ['Hémophilie / Coagulopathie héréditaire', C('Hémophilie', lib('Hémophilie')), C(COAG, grav('héréditaire'), lib('Coagulopathie héréditaire'))],
  ['Hémorragie active', SANS('saignement en cours : aucun concept')],
  ['Hémorragie active / Coagulopathie sévère',
    SANS('saignement en cours : aucun concept', lib('Hémorragie active')), C(COAG, grav('sévère'), lib('Coagulopathie sévère'))],
  ['Hémorragie active cliniquement significative', SANS('saignement en cours : aucun concept')],
  ['Hémorragie intracrânienne récente (< 3 mois)', SANS('aucun concept (≠ AVC ischémique)')],
  ['Hépatite virale active (B ou C)', F('hepatite_virale', etat('active'))],
  ['HTA sévère non contrôlée (PA > 180/110 mmHg)', C(HTA, fam('hta'), etat('sévère non contrôlée (PA > 180/110 mmHg)'))],
  ['Hypercalcémie', SANS(BIO)],
  ['Hyperkaliémie', C('Hyperkaliémie')],
  ['Hyperkaliémie (K+ > 5,0 mmol/L)', C('Hyperkaliémie')],
  ['Hyperkaliémie (K+ > 5,5 mmol/L)', C('Hyperkaliémie')],
  ['Hyperkaliémie sévère (> 6 mEq/L)', C('Hyperkaliémie', grav('sévère (> 6 mEq/L)'))],
  ['Hyperlipidémie', C('Dyslipidémie', fam('dyslipidemie'))],
  ['Hypertension artérielle', C(HTA, fam('hta'))],
  ['Hypertension artérielle non contrôlée', C(HTA, fam('hta'), etat('non contrôlée'))],
  ['Hyperthyroïdie', C('Hyperthyroïdie', fam('hyperthyroidie'))],
  ['Hypertrophie bénigne de la prostate', C('Hypertrophie bénigne de la prostate')],
  ['Hypocalcémie', SANS(BIO)],
  ['Hypokaliémie', SANS(BIO)],
  ['Hypokaliémie sévère (K+ < 3,0 mmol/L)', SANS(BIO)],
  ['Hyponatrémie', C('Hyponatrémie')],
  ['Hypotension', C('Hypotension artérielle')],
  ['Hypotension artérielle (TAS < 90 mmHg)', C('Hypotension artérielle')],
  ['Hypothyroïdie', C('Hypothyroïdie')],
  ['Hypothyroïdie sévère / Hyperthyroïdie',
    C('Hypothyroïdie', grav('sévère'), lib('Hypothyroïdie sévère')), C('Hyperthyroïdie', fam('hyperthyroidie'), lib('Hyperthyroïdie'))],
  ['Hypovolémie sévère', SANS('aucun concept (≠ déshydratation)')],
  ['Iléus paralytique', C('Occlusion intestinale')],
  ['Immunodépression sévère préexistante', SANS('aucun concept')],
  ['Infarctus du myocarde', C(IDM)],
  ['Infarctus du myocarde récent (< 3 mois)', C(IDM, grav('récent (< 3 mois)'))],
  ['Infarctus du ventricule droit', SANS('forme particulière : non rattaché à « Infarctus du myocarde » (dérivés nitrés indiqués par ailleurs)')],
  // Sprint 2b-2 — CI génériques « Infection » : famille « infection » (toute infection précisée).
  ['Infection', F('infection')],
  ['Infection active non traitée (tuberculose, sepsis fongique)',
    F('infection', etat('active non traitée'), lib('Infection active non traitée')),
    C(TB, etat('active non traitée'), lib('tuberculose')), C('Septicémie', etat('active non traitée'), lib('sepsis fongique'))],
  ['Infection active sévère non contrôlée', F('infection', etat('active sévère non contrôlée'))],
  ['Infections actives sévères', F('infection', grav('actives sévères'))],
  ['Infections fongiques systémiques', SANS('aucun concept')],
  ['Infections urinaires récurrentes (> 3/an)', C('Infection urinaire', fam('infection_urinaire'), grav('récurrentes (> 3/an)'))],
  ['Injection de produit de contraste iodé', CTX('acte')],
  ['Insuffisance cardiaque', C(IC)],
  ['Insuffisance cardiaque (toute sévérité)', C(IC)],
  ['Insuffisance cardiaque décompensée', C(IC, etat('décompensée'))],
  ['Insuffisance cardiaque décompensée (NYHA III-IV)', C(IC, etat('décompensée (NYHA III-IV)'))],
  ['Insuffisance cardiaque décompensée (NYHA IV)', C(IC, etat('décompensée (NYHA IV)'))],
  ['Insuffisance cardiaque systolique sévère (FEVG < 35%)', C(IC, grav('systolique sévère (FEVG < 35 %)'))],
  ['Insuffisance hépatique', C(IH)],
  ['Insuffisance hépatique sévère (Child-Pugh C)', C(IH, grav('sévère (Child-Pugh C)'))],
  ['Insuffisance hépatique sévère avec coagulopathie', C(IH, grav('sévère avec coagulopathie'))],
  ['Insuffisance rénale aiguë oligurique (sans hypervolémie)', C('Insuffisance rénale aiguë')],
  ['Insuffisance rénale chronique stade 3', REN(3)],
  ['Insuffisance rénale chronique stade 3-5', REN(3)],
  ['Insuffisance rénale chronique stade 3b-5 (DFG < 45)', REN(3.5)],
  ['Insuffisance rénale chronique stade 4', REN(4)],
  ['Insuffisance rénale chronique stade 4-5', REN(4)],
  ['Insuffisance rénale chronique stade 4-5 (DFG < 30)', REN(4)],
  ['Insuffisance rénale chronique stade 5', REN(5)],
  ['Insuffisance rénale chronique stade 5 (DFG < 15)', REN(5)],
  ['Insuffisance rénale chronique stade 5 (dialyse)', REN(5)],
  ['Insuffisance rénale sévère (DFG < 30 mL/min)', REN(4)],
  ['Insuffisance respiratoire', C('Insuffisance respiratoire chronique')],
  ['Insuffisance respiratoire sévère (SpO2 < 90%)', C('Insuffisance respiratoire chronique', grav('sévère (SpO2 < 90 %)'))],
  ['Insuffisance surrénale (arrêt brusque)', CTX('risque lié à l’arrêt du traitement, pas une pathologie du patient')],
  ['Insuffisance surrénale non substituée', C('Insuffisance surrénalienne', etat('non substituée'))],
  ['Insuffisance surrénalienne', C('Insuffisance surrénalienne')],
  ['Malabsorption', C('Malabsorption')],
  ['Maladie de Parkinson', C('Maladie de Parkinson')],
  ['Migraine avec aura', C('Migraine avec aura', fam('migraine'), grav('avec aura'))],
  ['Mononucléose infectieuse', C('Mononucléose infectieuse')],
  ['Myasthénie', C('Myasthénie')],
  ['Myasthénie grave', C('Myasthénie')],
  ['Myopathie / Rhabdomyolyse préexistante', C('Myopathie')],
  ['Néoplasie endocrinienne multiple type 2', SANS('aucun concept')],
  ['Néoplasie évolutive non contrôlée', C('Néoplasie évolutive', etat('non contrôlée'))],
  ['Neuropathie périphérique', C('Neuropathie périphérique', fam('neuropathie'))],
  ['Neuropathie périphérique sévère préexistante', C('Neuropathie périphérique', fam('neuropathie'), grav('sévère'))],
  ['Neutropénie sévère (PNN < 500/mm³)', SANS(BIO)],
  ['Nourrisson (moins de 3 mois)', AGE],
  ['Obésité', C('Obésité')],
  ['Obésité morbide (IMC > 40)', C('Obésité', grav('morbide (IMC > 40)'))],
  ['Ostéoporose', C('Ostéoporose')],
  ['Ostéoporose sévère (T-score < -3)', C('Ostéoporose', grav('sévère (T-score < -3)'))],
  ['Pancréatite chronique', C('Pancréatite chronique')],
  ...[10, 12, 15, 16, 18, 2, 3, 6, 8].map(n => [`Pédiatrie (moins de ${n} ans)`, AGE]),
  ['Phéochromocytome', C('Phéochromocytome')],
  ['Phéochromocytome non traité', C('Phéochromocytome', etat('non traité'))],
  // Corrigé : était rattaché à « Pneumonie » (infection). Une pneumopathie interstitielle est une fibrose / PID.
  ['Pneumopathie interstitielle', C('Fibrose pulmonaire')],
  ['Porphyrie', C('Porphyrie')],
  ["Prise d'alcool / Alcoolisme actif", CTX('consommation ponctuelle', lib("Prise d'alcool")), C(ALCOOL, etat('actif'), lib('Alcoolisme actif'))],
  ["Prise d'IMAO (dans les 14 jours)", CTX('co-prescription')],
  ['Prise de médicaments sérotoninergiques', CTX('co-prescription')],
  ['Psoriasis', C('Psoriasis')],
  ['Psychose', C('Psychose', fam('psychose'))],
  ['Psychose / Trouble bipolaire', C('Psychose', fam('psychose'), lib('Psychose')), C('Trouble bipolaire', lib('Trouble bipolaire'))],
  ['Psychose aiguë ou antécédent de psychose cortisonique', C('Psychose', fam('psychose'), etat('aiguë, ou antécédent de psychose cortisonique'))],
  ['QT long / Syndrome du QT long', SANS('aucun concept')],
  // Ambigu : le syndrome de Raynaud n'a pas de concept ; l'AOMI est rattachée, stade à préciser.
  ['Raynaud sévère / AOMI stade 3-4', SANS('aucun concept', lib('Raynaud sévère')), C(AOMI, grav('stade 3-4'), lib('AOMI stade 3-4'))],
  ['Rétention urinaire / HBP symptomatique',
    C('Rétention urinaire', lib('Rétention urinaire')), C('Hypertrophie bénigne de la prostate', grav('symptomatique'), lib('HBP symptomatique'))],
  ['Rétinopathie', C('Rétinopathie diabétique')],
  ['Rétrécissement aortique serré', C('Rétrécissement aortique serré', fam('retrecissement_aortique'), grav('serré'))],
  ['Sclérose en plaques', C('Sclérose en plaques')],
  ['Sténose bilatérale des artères rénales', C("Sténose de l'artère rénale", grav('bilatérale'))],
  ["Sténose de l'artère rénale", C("Sténose de l'artère rénale")],
  ['Sujet âgé > 75 ans', AGE],
  ['Sujet âgé (plus de 75 ans)', AGE],
  ['Sujet âgé (plus de 80 ans)', AGE],
  ['Surdité / Hypoacousie préexistante', C('Surdité')],
  ["Syndrome d'apnées du sommeil non traité", C('Apnée du sommeil', etat('non traité'))],
  // Vérifié : rattaché à WPW — jamais à « Maladie de Parkinson » ni à la fibrillation auriculaire seule.
  ['Syndrome de Wolff-Parkinson-White avec fibrillation auriculaire', C('Syndrome de Wolff-Parkinson-White', grav('avec fibrillation auriculaire'))],
  ['Syndrome des jambes sans repos', SANS('aucun concept')],
  ['Syndrome parkinsonien', C('Maladie de Parkinson')],
  // Ambigu : la précision porte sur la quantité, le sexe et l'âge — sévérité conservée, à préciser.
  ['Tabagisme actif > 15 cigarettes/j chez femme > 35 ans', C('Addiction au tabac', grav('plus de 15 cigarettes par jour chez une femme de plus de 35 ans'))],
  // Ambigu : la rupture tendineuse n'a pas de concept.
  ['Tendinopathie / Rupture tendineuse', C('Tendinite', lib('Tendinopathie')), SANS('aucun concept', lib('Rupture tendineuse'))],
  ['Thrombopénie', C('Thrombopénie')],
  ['Thrombopénie induite par héparine (TIH)', C('Thrombopénie', grav("induite par l'héparine"))],
  ["Thrombopénie induite par l'héparine", C('Thrombopénie', grav("induite par l'héparine"))],
  ['Thrombopénie sévère (plaquettes < 50 G/L)', C('Thrombopénie', grav('sévère (plaquettes < 50 G/L)'))],
  ['Thrombopénie sévère (PLQ < 50 000/mm³)', C('Thrombopénie', grav('sévère (plaquettes < 50 000/mm³)'))],
  ['Thrombose veineuse profonde', C('Thrombose veineuse profonde', fam('mtev'))],
  ['Thyrotoxicose non traitée', C('Hyperthyroïdie', fam('hyperthyroidie'), etat('non traitée'))],
  ['Traitement par statine', CTX('co-prescription')],
  ['Traumatisme crânien grave (HTIC)', SANS('aucun concept')],
  ['Trouble bipolaire', C('Trouble bipolaire')],
  ['Trouble bipolaire non traité', C('Trouble bipolaire', etat('non traité'))],
  ['Trouble du rythme non contrôlé (FA, flutter)', C('Trouble du rythme cardiaque', fam('trouble_rythme'), etat('non contrôlé'))],
  ['Tuberculose', C(TB)],
  ['Tuberculose active non traitée', C(TB, etat('active non traitée'))],
  ['Tuberculose latente non traitée', C(TB, etat('latente non traitée'))],
  ['Ulcère gastro-duodénal', C(UGD, fam('ulcere_gastroduodenal'))],
  ['Ulcère gastroduodénal actif', C(UGD, fam('ulcere_gastroduodenal'), etat('actif'))],
  ['Ulcère gastroduodénal actif (non traité)', C(UGD, fam('ulcere_gastroduodenal'), etat('actif (non traité)'))],
  ['Ulcère peptique actif', C(UGD, fam('ulcere_gastroduodenal'), etat('actif'))],
  ['Vaccination par vaccin vivant atténué', CTX('acte')],
  ['Vaccination récente par vaccin vivant atténué', CTX('acte')],
  // Corrigé : était rattaché à « Valvulopathie » (une prothèse mécanique n'est pas une valvulopathie native).
  ['Valve cardiaque prothétique mécanique', SANS('prothèse : aucun concept')],
  ['Varicelle', C('Varicelle', fam('varicelle'))],
  ['Varicelle / Herpès actif', C('Varicelle', fam('varicelle'), lib('Varicelle')), C('Herpès', etat('actif'), lib('Herpès actif'))],
  ['Varicelle ou zona actif (patient non immunisé)', C('Varicelle', fam('varicelle'), lib('Varicelle')), C('Zona', etat('actif'), lib('zona actif'))],
];

// Sprint BDPM-1 G3 — formulations lues dans les RCP (concept existant, qualificatif lu à côté du concept). Même liste que
// la migration 20261031140000_bdpm1_g3a_ci.sql (source : scripts/data/bdpm1_g3.json, bdpm/scripts/construire_g3.py).
const G3 = JSON.parse(readFileSync(new URL('./data/bdpm1_g3.json', import.meta.url), 'utf8')).formulations_nouvelles;
for (const f of G3) {
  const o = [];
  if (f.famille) o.push(fam(f.famille));
  if (f.qualificatif) o.push(f.qualificatif_type === 'etat' ? etat(f.qualificatif) : grav(f.qualificatif));
  T.push([f.condition_valeur, C(f.concept, ...o, { note: 'BDPM-1 G3 : formulation lue dans un RCP' })]);
}

// Familles reconnues par le moteur (membres déclarés dans conditionMatcher.ts, vérifiés par ses tests).
const FAMILLES = ['diabete', 'ulcere_gastroduodenal', 'hta', 'hepatite_virale', 'migraine', 'depression', 'asthme', 'varicelle',
  'infection_urinaire', 'trouble_rythme', 'coronaropathie', 'dyslipidemie', 'hyperthyroidie', 'psychose', 'neuropathie',
  'retrecissement_aortique', 'mtev', 'infection'];
const TRAITEMENTS = ['concept', 'renal', 'dialyse', 'grossesse', 'allaitement', 'procreation', 'age', 'allergie', 'contexte', 'sans_concept'];

// ── Lignes + contrôles ───────────────────────────────────────────────────────
const rows = [];
const vus = new Map();
for (const [condition, ...alts] of T) {
  const cn = norm(condition);
  // Deux écritures de même forme normalisée (« Grossesse — 1er trimestre » / « Grossesse (1er trimestre) ») : une seule ligne.
  if (vus.has(cn)) {
    if (vus.get(cn) !== JSON.stringify(alts)) throw new Error(`formulation en double, traitements différents : ${condition}`);
    continue;
  }
  vus.set(cn, JSON.stringify(alts));
  alts.forEach((a, i) => {
    const r = {
      condition_norm: cn, condition_valeur: condition, ordre: i + 1, libelle: a.libelle ?? condition, traitement: a.traitement,
      concept: a.concept ?? null, famille: a.famille ?? null, qualificatif: a.qualificatif ?? null,
      qualificatif_type: a.qualificatif_type ?? null, stade: a.stade ?? null, note: a.note ?? null,
    };
    if (!TRAITEMENTS.includes(r.traitement)) throw new Error(`traitement inconnu : ${condition}`);
    if (r.concept && !NOMS.has(r.concept)) throw new Error(`concept absent de pathologies_curees : « ${r.concept} » (${condition})`);
    if (r.famille && !FAMILLES.includes(r.famille)) throw new Error(`famille inconnue : ${r.famille} (${condition})`);
    if (r.traitement === 'concept' && !r.concept && !r.famille) throw new Error(`ni concept ni famille : ${condition}`);
    if (r.traitement !== 'concept' && r.traitement !== 'renal' && (r.concept || r.famille || r.qualificatif)) throw new Error(`concept inattendu : ${condition}`);
    if ((r.traitement === 'renal') !== (r.stade !== null)) throw new Error(`stade incohérent : ${condition}`);
    if ((r.qualificatif === null) !== (r.qualificatif_type === null)) throw new Error(`qualificatif incohérent : ${condition}`);
    rows.push(r);
  });
}

const md5 = s => createHash('md5').update(s, 'utf8').digest('hex');
const ligne = r => [r.condition_norm, r.ordre, r.libelle, r.traitement, r.concept ?? '', r.famille ?? '', r.qualificatif ?? '',
  r.qualificatif_type ?? '', r.stade ?? '', r.note ?? ''].join('|');
const empreinte = md5(rows.map(ligne).sort().join('\n'));
const empreinteCurees = md5(curees.map(c => `${c.nom_fr}|${c.synonymes}`).sort().join('\n'));

writeFileSync(
  new URL('../src/lib/ci_condition_concepts.data.json', import.meta.url),
  JSON.stringify({ empreinte: { concepts: empreinte, curees: empreinteCurees }, familles: FAMILLES, concepts: rows, curees }, null, 1) + '\n',
);

const q = v => (v === null || v === undefined ? 'null' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const liste = a => a.map(x => `'${x}'`).join(',');
const sql = `-- Sprint 2b-1 — Matching des conditions par concepts, stades et qualificatifs.
-- FICHIER GÉNÉRÉ par scripts/gen_ci_condition_concepts.mjs — ne pas modifier à la main.
-- Table de correspondance : formulation de contraindications.condition_valeur → concept de
-- pathologies_curees (avec qualificatif, stade rénal et famille). La table contraindications ne change pas.
-- Empreinte de la source : ${empreinte}

create table if not exists public.ci_condition_concepts (
  id uuid primary key default gen_random_uuid(),
  -- condition_valeur normalisée (minuscules, sans accents ni ponctuation) : clé de correspondance.
  condition_norm text not null check (condition_norm = lower(condition_norm) and length(condition_norm) >= 3),
  condition_valeur text not null,
  -- Une formulation « A / B » porte une ligne par alternative.
  ordre smallint not null default 1 check (ordre between 1 and 9),
  libelle text not null,
  traitement text not null check (traitement in (${liste(TRAITEMENTS)})),
  -- pathologies_curees.nom_fr
  concept text null,
  famille text null check (famille is null or famille in (${liste(FAMILLES)})),
  qualificatif text null,
  -- etat : « À évaluer » si la précision manque chez le patient · gravite : sévérité conservée, « à préciser ».
  qualificatif_type text null check (qualificatif_type is null or qualificatif_type in ('etat','gravite')),
  -- Stade rénal minimal déclenchant la CI : 3 · 3.5 (= 3b) · 4 · 5.
  stade numeric(2,1) null check (stade is null or stade in (3, 3.5, 4, 5)),
  note text null,
  created_at timestamptz not null default now(),
  unique (condition_norm, ordre),
  check ((qualificatif is null) = (qualificatif_type is null)),
  check ((traitement = 'renal') = (stade is not null)),
  check (traitement <> 'concept' or concept is not null or famille is not null)
);

-- RLS : lecture pour tout utilisateur authentifié, aucune écriture client.
alter table public.ci_condition_concepts enable row level security;
drop policy if exists ci_condition_concepts_read on public.ci_condition_concepts;
create policy ci_condition_concepts_read on public.ci_condition_concepts
  for select to authenticated using (true);
revoke all on public.ci_condition_concepts from anon;
revoke insert, update, delete on public.ci_condition_concepts from authenticated;

insert into public.ci_condition_concepts
  (condition_norm, condition_valeur, ordre, libelle, traitement, concept, famille, qualificatif, qualificatif_type, stade, note) values
${rows.map(r => `  (${[r.condition_norm, r.condition_valeur, r.ordre, r.libelle, r.traitement, r.concept, r.famille, r.qualificatif, r.qualificatif_type, r.stade, r.note].map(q).join(', ')})`).join(',\n')}
on conflict (condition_norm, ordre) do nothing;
`;

// La migration du Sprint 2b-1 est un fait historique : elle n'est écrite que si elle n'existe pas (dépôt neuf).
const M1 = new URL('../supabase/migrations/20261020120000_ci_condition_concepts.sql', import.meta.url);
if (!existsSync(M1)) writeNewMigration(M1, sql);

// Sprint 2b-2 — les évolutions de la table passent par une migration DÉDIÉE, écrite à la main
// (supabase/migrations/20261021120000_ci_condition_concepts_2b2.sql) ; l'empreinte ci-dessous est
// comparée à celle de la base après application.
const par = k => rows.filter(r => r.traitement === k).length;
console.log(`${vus.size} formulations, ${rows.length} lignes — ${TRAITEMENTS.map(k => `${k} ${par(k)}`).join(' · ')}`);
console.log(`empreinte concepts ${empreinte} · curees ${empreinteCurees}`);
