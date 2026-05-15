// gen-contra-2.mjs — ~1 000 nouvelles contre-indications (Étape 2)
// Classes : Immunosuppresseurs, Anticoagulants, Corticoïdes, Oncologie, Grossesse/Allaitement
import { writeFileSync } from 'fs';

const esc = s => String(s).replace(/'/g, "''");
const rows = [];
const add = (dci, ct, cv, sev, desc, mec, cond) =>
  rows.push({ dci_pattern: dci, condition_type: ct, condition_valeur: cv, severite: sev, description: desc, mecanisme_fr: mec, conduite_fr: cond });

// ─── IMMUNOSUPPRESSEURS ───────────────────────────────────────────────────────
const immuno = [
  ['méthotrexate', 'L04AX03', 'antimétabolite folique'],
  ['azathioprine', 'L04AX01', 'antimétabolite purinique'],
  ['ciclosporine', 'L04AD01', 'inhibiteur calcineurine'],
  ['tacrolimus', 'L04AD02', 'inhibiteur calcineurine'],
  ['mycophénolate', 'L04AA06', 'antimétabolite purinique'],
  ['rituximab', 'L01FA01', 'anti-CD20'],
  ['adalimumab', 'L04AB04', 'anti-TNF'],
  ['infliximab', 'L04AB02', 'anti-TNF'],
  ['étanercept', 'L04AB01', 'anti-TNF'],
  ['léflunomide', 'L04AA13', 'inhibiteur DHODH'],
];

for (const [dci,, cls] of immuno) {
  const D = dci[0].toUpperCase() + dci.slice(1);
  add(dci,'pathologie','Infections actives sévères','absolue',
    `${D} contre-indiqué en cas d'infection active sévère : risque de dissémination fatale`,
    `Immunosuppression par ${dci} (${cls}) altère la défense immunitaire anti-infectieuse`,
    `Traiter l'infection avant d'initier ${dci}. Suspendre si infection intercurrente grave`);
  add(dci,'pathologie','Grossesse','absolue',
    `${D} tératogène et embryotoxique, contre-indiqué pendant toute la grossesse`,
    `${D} interfère avec la division cellulaire embryonnaire (${cls})`,
    `Contraception efficace obligatoire. Arrêt min. 3 mois avant conception`);
  add(dci,'pathologie','Allaitement','absolue',
    `${D} passe dans le lait maternel : risque d'immunosuppression du nourrisson`,
    `Passage lacté avec risque de toxicité et immunosuppression chez le nourrisson`,
    `Contre-indiqué pendant l'allaitement. Sevrage si traitement indispensable`);
  add(dci,'pathologie','Insuffisance rénale sévère (DFG < 30 mL/min)','relative',
    `${D} s'accumule en insuffisance rénale sévère avec risque de toxicité majorée`,
    `Réduction de la clairance rénale de ${dci} et/ou ses métabolites actifs`,
    `Adapter la dose au DFG. Surveillance créatinine rapprochée. Alternative si possible`);
  add(dci,'pathologie','Insuffisance hépatique sévère (Child-Pugh C)','absolue',
    `${D} contre-indiqué en IHC sévère par défaut de métabolisation et toxicité cumulée`,
    `Métabolisme hépatique altéré de ${dci} avec accumulation et hépatotoxicité`,
    `Bilan hépatique obligatoire avant traitement. CI si Child-Pugh C`);
  const sevTB = ['adalimumab','infliximab','étanercept','rituximab'].includes(dci) ? 'absolue' : 'relative';
  add(dci,'pathologie','Tuberculose latente non traitée',sevTB,
    `Risque de réactivation de tuberculose latente sous ${dci}, potentiellement fatale`,
    `${D} (${cls}) supprime la réponse T cellulaire contrôlant M. tuberculosis latent`,
    `Dépistage obligatoire (IDR/IGRA + radio thorax) avant initiation. Prophylaxie si positif`);
  add(dci,'pathologie','Néoplasie évolutive non contrôlée','absolue',
    `${D} peut favoriser la progression tumorale par immunosuppression`,
    `Suppression de la surveillance immunitaire anti-tumorale par ${dci} (${cls})`,
    `CI relative à absolue selon cancer. Décision multidisciplinaire obligatoire`);
  add(dci,'pathologie','Immunodépression sévère préexistante','relative',
    `Cumul immunosuppresseur sous ${dci} avec immunodépression préexistante : risque infectieux majeur`,
    `Double immunosuppression → déficience immunitaire profonde et infections opportunistes`,
    `Évaluation soigneuse. Bilan immunitaire. Prophylaxie anti-infectieuse. Surveillance intensive`);
  add(dci,'pathologie','Vaccination par vaccin vivant atténué','absolue',
    `${D} contre-indique les vaccins vivants (risque d'infection vaccinale disséminée)`,
    `Immunosuppression empêche le contrôle du virus vaccinal atténué`,
    `Vaccinations à jour AVANT traitement. Éviter vaccins vivants sous ${dci} et 6 mois après`);
  add(dci,'pathologie','Neutropénie sévère (PNN < 500/mm³)','absolue',
    `${D} aggrave la neutropénie sévère, exposant à un risque infectieux vital`,
    `Myélosuppression additionnelle de ${dci} sur une moelle déjà défaillante`,
    `CI jusqu'à récupération (PNN > 1000/mm³). G-CSF si nécessaire`);
}

// ─── ANTICOAGULANTS ──────────────────────────────────────────────────────────
const anticoag = [
  ['héparine non fractionnée','B01AB01','héparine'],
  ['énoxaparine','B01AB05','HBPM'],
  ['warfarine','B01AA03','AVK'],
  ['rivaroxaban','B01AF01','AOD anti-Xa'],
  ['apixaban','B01AF02','AOD anti-Xa'],
  ['dabigatran','B01AE07','AOD anti-IIa'],
  ['fondaparinux','B01AX05','anti-Xa indirect'],
  ['acénocoumarol','B01AA07','AVK'],
];

for (const [dci,, grp] of anticoag) {
  const D = dci[0].toUpperCase() + dci.slice(1);
  add(dci,'pathologie','Hémorragie active cliniquement significative','absolue',
    `${D} (${grp}) formellement contre-indiqué en hémorragie active`,
    `Tout anticoagulant aggrave le saignement en cours par inhibition de la coagulation`,
    `Arrêt immédiat. Antagonisation si disponible. Prise en charge hémorragique urgente`);
  if (['héparine non fractionnée','énoxaparine'].includes(dci))
    add(dci,'pathologie','Thrombopénie induite par héparine (TIH)','absolue',
      `${D} formellement contre-indiqué en cas de TIH confirmée ou suspectée`,
      `Anticorps anti-FP4/héparine activent les plaquettes → thrombose paradoxale`,
      `Arrêt immédiat. Anticoagulant non-héparinique (argatroban, danaparoïde)`);
  const sevIR = ['dabigatran','rivaroxaban','fondaparinux'].includes(dci) ? 'absolue' : 'relative';
  add(dci,'pathologie','Insuffisance rénale sévère (DFG < 30 mL/min)',sevIR,
    `${D} accumulé en insuffisance rénale sévère avec risque hémorragique majeur`,
    `${dci === 'dabigatran' ? 'Dabigatran éliminé à 85% par voie rénale' : `Accumulation de ${dci}`} en cas d'insuffisance rénale`,
    `CI absolue pour AODs (DFG < 30). Préférer HNF si anticoagulation requise`);
  const sevGross = ['warfarine','acénocoumarol'].includes(dci) ? 'absolue' : 'relative';
  add(dci,'pathologie','Grossesse',sevGross,
    `${D} (${grp}) ${['warfarine','acénocoumarol'].includes(dci) ? 'tératogène T1, hémorragique T2-T3' : 'déconseillé — données insuffisantes'}`,
    `${['warfarine','acénocoumarol'].includes(dci) ? 'AVK traversent le placenta : embryopathie T1, hémorragie cérébrale fœtale T2-T3' : `Passage placentaire de ${dci} insuffisamment étudié`}`,
    `HBPM recommandée pendant toute la grossesse comme alternative anticoagulante de référence`);
  add(dci,'pathologie','Chirurgie récente à haut risque hémorragique','absolue',
    `${D} contre-indiqué dans les suites immédiates d'une chirurgie à risque hémorragique élevé`,
    `Inhibition de la coagulation par ${dci} compromet l'hémostase chirurgicale`,
    `Respecter les délais post-opératoires selon le type de chirurgie et ${grp}`);
  add(dci,'pathologie','HTA sévère non contrôlée (PA > 180/110 mmHg)','relative',
    `${D} déconseillé en HTA sévère non contrôlée par risque d'AVC hémorragique`,
    `HTA sévère fragilise les vaisseaux. Anticoagulation par ${dci} augmente le risque cérébral`,
    `Contrôler la PA avant anticoagulation. Évaluation neurologique si nécessaire`);
  add(dci,'pathologie','Ulcère gastroduodénal actif','absolue',
    `${D} contre-indiqué en ulcère actif : risque d'hémorragie digestive grave`,
    `Anticoagulation par ${dci} (${grp}) aggrave tout saignement sur lésion ulcéreuse`,
    `Traiter l'ulcère avant. IPP systématiques si anticoagulation indispensable`);
  add(dci,'pathologie','AVC hémorragique récent (< 3 mois)','absolue',
    `${D} formellement contre-indiqué après un AVC hémorragique récent`,
    `Risque majeur de récidive ou extension hémorragique cérébrale sous ${dci}`,
    `CI absolue minimum 3 mois. Réévaluation neurologique après ce délai`);
  add(dci,'pathologie','Endocardite bactérienne','relative',
    `${D} expose à des emboles septiques hémorragiques en contexte d'endocardite`,
    `Végétations fragilisent l'endothélium. Anticoagulation augmente le risque d'AVC hémorragique`,
    `CI sauf valve mécanique. Héparine à objectif strict si indispensable`);
  add(dci,'pathologie','Insuffisance hépatique sévère avec coagulopathie','absolue',
    `${D} contre-indiqué en IHC sévère avec coagulopathie préexistante`,
    `Déficit de synthèse des facteurs coagulation hépatiques + ${dci} → risque hémorragique extrême`,
    `CI absolue. Corriger coagulopathie. Avis hématologique obligatoire`);
}

// ─── CORTICOÏDES ─────────────────────────────────────────────────────────────
const cortis = ['prednisone','méthylprednisolone','dexaméthasone','hydrocortisone','bétaméthasone','triamcinolone'];

const cortiConditions = [
  ['pathologie','Infections fongiques systémiques','absolue',
    'Corticoïde contre-indiqué en infection fongique systémique active : dissémination fatale',
    'Immunosuppression cortisonique favorise la dissémination des champignons',
    'Antifongique systémique urgent. Arrêt ou réduction rapide du corticoïde'],
  ['pathologie','Tuberculose active non traitée','absolue',
    'Corticoïde contre-indiqué en tuberculose active sans couverture antituberculeuse',
    'Levée du contrôle immunitaire sur M. tuberculosis → dissémination miliaire possible',
    'Antituberculeux au moins 2 semaines avant corticothérapie si indispensable'],
  ['pathologie','Ulcère peptique actif','relative',
    'Corticoïde aggrave l\'ulcère par réduction des prostaglandines et augmentation de l\'acidité',
    'Réduction des prostaglandines cytoprotectrices gastriques + hypersécrétion acide',
    'IPP double dose systématique. Évaluer rapport bénéfice/risque. Traiter l\'ulcère'],
  ['pathologie','Diabète décompensé (glycémie > 3 g/L)','relative',
    'Corticoïde aggrave l\'hyperglycémie par néoglucogenèse et résistance à l\'insuline',
    'Action anti-insulinique : néoglucogenèse hépatique ↑, captation périphérique glucose ↓',
    'Contrôle glycémique strict avec adaptation insulinique. Glycémie quotidienne'],
  ['pathologie','Ostéoporose sévère (T-score < -3)','relative',
    'Corticoïde aggrave l\'ostéoporose par inhibition des ostéoblastes',
    'Inhibition formation osseuse (ostéoblastes) + augmentation résorption (ostéoclastes)',
    'Biphosphonate + vitamine D + calcium systématiques. DMO de suivi. Dose minimale'],
  ['pathologie','Psychose aiguë ou antécédent de psychose cortisonique','relative',
    'Corticoïde peut déclencher ou aggraver une psychose cortisonique',
    'Modification de la neurotransmission dopaminergique et sérotoninergique centrale',
    'Évaluation psychiatrique préalable. Surveillance étroite. Dose minimale'],
  ['pathologie','Glaucome à angle ouvert non contrôlé','relative',
    'Corticoïde élève la pression intraoculaire et aggrave le glaucome',
    'Augmentation de la résistance à l\'écoulement de l\'humeur aqueuse dans le trabéculum',
    'Surveillance ophtalmologique avec tonométrie régulière. Traitement antiglaucomateux'],
  ['pathologie','Insuffisance cardiaque décompensée','relative',
    'Corticoïde provoque rétention hydrosodée aggravant l\'insuffisance cardiaque',
    'Action minéralocorticoïde : rétention sodium et eau → surcharge volémique',
    'Restriction sodée stricte. Pesée quotidienne. Adapter les diurétiques'],
  ['pathologie','Vaccination par vaccin vivant atténué','absolue',
    'Corticoïde contre-indique les vaccins vivants si dose immunosuppressive (≥ 10 mg/j > 2 sem)',
    'Immunosuppression empêche le contrôle du virus vaccinal atténué → infection vaccinale',
    'Vaccinations à jour avant corticothérapie prolongée. Éviter vaccins vivants sous corticoïdes'],
  ['pathologie','Varicelle ou zona actif (patient non immunisé)','absolue',
    'Corticoïde contre-indiqué en varicelle chez adulte non immunisé : varicelle maligne',
    'Immunosuppression empêche le contrôle du VZV → varicelle disséminée viscérale',
    'Aciclovir IV en urgence. Immunoglobulines anti-VZV si exposé. Arrêt si possible'],
];

for (const dci of cortis) {
  const D = dci[0].toUpperCase() + dci.slice(1);
  for (const [ct, cv, sev, desc, mec, cond] of cortiConditions)
    add(dci, ct, cv, sev,
      desc.replace('Corticoïde', D),
      mec,
      cond);
}

// ─── ONCOLOGIE ────────────────────────────────────────────────────────────────
const onco = [
  ['tamoxifène','L02BA01','modulateur SERM'],
  ['cyclophosphamide','L01AA01','agent alkylant'],
  ['cisplatine','L01XA01','platine néphrotoxique'],
  ['carboplatine','L01XA02','platine myélotoxique'],
  ['fluorouracile','L01BC02','antimétabolite'],
  ['capécitabine','L01BC06','prodrogue 5-FU'],
  ['imatinib','L01EA01','inhibiteur tyrosine kinase'],
  ['méthotrexate haute dose','L01BA01','antifollique cytotoxique'],
  ['bléomycine','L01DC01','pneumotoxique'],
  ['doxorubicine','L01DB01','anthracycline cardiotoxique'],
];

for (const [dci,, tox] of onco) {
  const D = dci[0].toUpperCase() + dci.slice(1);
  add(dci,'pathologie','Grossesse','absolue',
    `${D} formellement contre-indiqué en grossesse : tératogénicité et embryotoxicité`,
    `Agents cytotoxiques (${tox}) interfèrent avec division cellulaire embryonnaire`,
    `Contraception efficace obligatoire. Avis oncofertilité si désir de grossesse`);
  add(dci,'pathologie','Allaitement','absolue',
    `${D} passe dans le lait maternel avec risque de toxicité néonatale grave`,
    `Passage des cytotoxiques dans le lait maternel avec risque de myélosuppression néonatale`,
    `Allaitement contre-indiqué pendant et après traitement par ${dci}`);
  add(dci,'pathologie','Aplasie médullaire sévère préexistante','absolue',
    `${D} aggrave l'aplasie médullaire existante : risque infectieux et hémorragique vital`,
    `Myélosuppression supplémentaire de ${dci} (${tox}) sur moelle déjà défaillante`,
    `CI jusqu'à récupération hématologique. NFS avant chaque cycle. G-CSF si nécessaire`);
  const sevIR = ['cisplatine','méthotrexate haute dose','capécitabine'].includes(dci) ? 'absolue' : 'relative';
  add(dci,'pathologie','Insuffisance rénale sévère (DFG < 30 mL/min)',sevIR,
    `${D} nécessite adaptation posologique majeure voire CI en insuffisance rénale sévère`,
    `Accumulation de ${dci} et métabolites néphrotoxiques par réduction de la clairance rénale`,
    `Adapter dose selon DFG. Hyperhydratation si maintenu. CI si DFG < seuil critique`);
  add(dci,'pathologie','Insuffisance hépatique sévère (Child-Pugh C)','absolue',
    `${D} contre-indiqué en IHC sévère par défaut de métabolisation et toxicité cumulée`,
    `Métabolisme hépatique réduit de ${dci} avec accumulation et toxicité potentialisée`,
    `Bilan hépatique avant chaque cycle. Adapter selon bilirubine. CI si Child C`);
  const sevCard = dci === 'doxorubicine' ? 'absolue' : 'relative';
  add(dci,'pathologie','Cardiopathie décompensée (FEVG < 30%)',sevCard,
    `${D} ${dci === 'doxorubicine' ? 'formellement CI' : 'à éviter'} en cardiopathie décompensée`,
    `${dci === 'doxorubicine' ? 'Cardiotoxicité dose-cumulative des anthracyclines : cardiomyopathie dilatée irréversible' : `${D} peut altérer la fonction cardiaque compromise`}`,
    `Échocardiographie avant et pendant traitement. ${dci === 'doxorubicine' ? 'CI si FEVG < 50%' : 'Cardiologue si FEVG borderline'}`);
  add(dci,'pathologie','Neuropathie périphérique sévère préexistante','relative',
    `${D} peut aggraver une neuropathie périphérique préexistante de façon irréversible`,
    `Neurotoxicité cumulative de ${dci} (${tox}) sur fibres nerveuses sensorielles et motrices`,
    `Évaluation neurologique avant traitement. Surveillance clinique. Réduction dose si aggravation`);
  const sevPulm = dci === 'bléomycine' ? 'absolue' : 'relative';
  add(dci,'pathologie','Fibrose pulmonaire préexistante',sevPulm,
    `${D} ${dci === 'bléomycine' ? 'formellement CI' : 'à éviter'} en cas de fibrose pulmonaire préexistante`,
    `${dci === 'bléomycine' ? 'Pneumotoxicité dose-dépendante de la bléomycine → fibrose irréversible' : `${D} peut aggraver une atteinte pulmonaire préexistante`}`,
    `${dci === 'bléomycine' ? 'EFR + TDM avant chaque cycle. CI si DLCO < 40%' : 'Évaluation pneumologique. Alternative si possible'}`);
  add(dci,'pathologie','Infection active sévère non contrôlée','absolue',
    `${D} contre-indiqué en infection sévère active : risque d'aggravation par immunosuppression`,
    `Myélosuppression de ${dci} aggrave la capacité de défense immunitaire`,
    `Reporter le cycle jusqu'à résolution. Antibiothérapie adaptée. Facteurs de croissance`);
  add(dci,'pathologie','Thrombopénie sévère (PLQ < 50 000/mm³)','absolue',
    `${D} aggrave la thrombopénie sévère avec risque hémorragique vital`,
    `Myélosuppression de ${dci} aggrave la déficience mégacaryocytaire`,
    `CI jusqu'à PLQ > 100 000/mm³. Transfusions plaquettaires si nécessaire`);
}

// ─── GROSSESSE ET ALLAITEMENT — EXHAUSTIF ────────────────────────────────────

// Antiépileptiques tératogènes (10 molécules)
const antiEpil = [
  ['valproate|acide valproïque|valpromide','L03AX','antiépileptique tératogène majeur','absolue'],
  ['phénytoïne|fosphénytoïne','N03AB','antiépileptique tératogène','absolue'],
  ['carbamazépine','N03AF01','antiépileptique tératogène','absolue'],
  ['topiramate','N03AX11','tératogène (fentes labiales, hypospadias)','absolue'],
  ['phénobarbital|primidone','N03AA','inducteur enzymatique tératogène','absolue'],
  ['oxcarbazépine','N03AF02','antiépileptique tératogène','relative'],
  ['zonisamide','N03AX15','tératogène animal, données humaines limitées','relative'],
  ['vigabatrine','N03AG04','CI grossesse (toxicité rétinienne)','absolue'],
  ['lamotrigine','N03AX09','tératogène dose-dépendant (fentes)','relative'],
  ['rufinamide','N03AF03','données insuffisantes, CI grossesse','absolue'],
];

for (const [dci,, tox, sev] of antiEpil) {
  const D = (dci.split('|')[0]);
  const Dc = D[0].toUpperCase() + D.slice(1);
  add(dci,'pathologie','Grossesse',sev,
    `${Dc} contre-indiqué en grossesse : ${tox}`,
    `Passage placentaire et toxicité sur développement neural/cardiaque fœtal`,
    `Avis neurologique spécialisé. Si maintenu : acide folique 5mg/j. Échographies renforcées`);
  add(dci,'pathologie','Grossesse — 1er trimestre',sev,
    `${Dc} tératogène au 1er trimestre : malformations du tube neural, cardiaques et faciales`,
    `Perturbation de la neurulation et organogenèse par ${D} (${tox})`,
    `Planifier grossesse. Basculer sur antiépileptique plus sûr avant conception si possible`);
  add(dci,'pathologie','Grossesse — 3ème trimestre','relative',
    `${Dc} au 3ème trimestre : risque de syndrome de sevrage et hémorragie néonatale`,
    `Passage placentaire avec dépendance fœtale et déficit en facteurs vitamine K-dépendants`,
    `Vitamine K néonatale systématique. Surveillance néonatale 48–72h. Pédiatrie en salle`);
  add(dci,'pathologie','Allaitement','relative',
    `${Dc} passe dans le lait maternel avec risque de sédation et toxicité du nourrisson`,
    `Passage lacté variable selon molécule. Risque de sédation et d'interactions métaboliques`,
    `Évaluer bénéfice/risque. Surveiller le nourrisson. Certains AE compatibles (lamotrigine)`);
  add(dci,'pathologie','Femme en âge de procréer sans contraception efficace',sev,
    `${Dc} exige une contraception efficace chez la femme en âge de procréer (tératogène)`,
    `Risque tératogène documenté : prescription sous contraception obligatoire`,
    `Contraception double méthode obligatoire. Bilan pré-grossesse si désir de maternité`);
  add(dci,'pathologie','Déficit en acide folique (grossesse planifiée)','relative',
    `${Dc} antagonise ou augmente les besoins en acide folique, aggravant le risque de spina bifida`,
    `Induction du métabolisme folique ou antagonisme direct → déficit en folates fœtaux`,
    `Acide folique 5 mg/j au minimum 3 mois avant et pendant le 1er trimestre`);
}

// Tératogènes catégorie X (6 molécules)
const terX = [
  ['isotrétinoïne','D10BA01','rétinoïde systémique : embryopathie sévère','absolue'],
  ['thalidomide','L04AX02','embryopathie des membres : phocomélie','absolue'],
  ['acitréitne','D05BB02','rétinoïde : tératogène 3 ans après arrêt','absolue'],
  ['bosentan','C02KX01','antagoniste endothéline : tératogène animal','absolue'],
  ['danazol','G03XA01','androgène : virilisation fœtus féminin','absolue'],
  ['finastéride','G04CB01','antiandrogène : féminisation fœtus masculin','absolue'],
];

for (const [dci,, tox, sev] of terX) {
  const D = dci[0].toUpperCase() + dci.slice(1);
  add(dci,'pathologie','Grossesse',sev,
    `${D} tératogène majeur (${tox}) — contre-indication absolue`,
    `Embryotoxicité ou organotoxicité documentée avec malformations sévères`,
    `Programme de prévention grossesse (PPG) obligatoire. Double contraception`);
  add(dci,'pathologie','Grossesse — 1er trimestre',sev,
    `${D} au 1er trimestre : risque maximal de malformations congénitales graves`,
    `Organogenèse perturbée par ${dci} (${tox})`,
    `Grossesse exclue avant et pendant traitement. Test de grossesse mensuel`);
  add(dci,'pathologie','Allaitement','absolue',
    `${D} contre-indiqué pendant l'allaitement : risque de toxicité grave du nourrisson`,
    `Passage lacté avec risque de toxicité grave chez le nourrisson`,
    `Ne pas allaiter sous ${dci}. Arrêter l'allaitement si traitement indispensable`);
  add(dci,'pathologie','Femme en âge de procréer sans contraception efficace','absolue',
    `${D} exige une contraception double méthode (PPG obligatoire)`,
    `Risque tératogène majeur documenté exigeant une prévention stricte`,
    `Contraception double méthode. Test grossesse mensuel. Formulaire de consentement`);
  if (dci === 'isotrétinoïne' || dci === 'acitréitne')
    add(dci,'pathologie','Grossesse dans le mois suivant l\'arrêt (isotrétinoïne)','absolue',
      `${D} contre-indiqué : persistance dans l\'organisme 1 à 3 mois après arrêt`,
      `Demi-vie longue et métabolites actifs → tératogénicité persistante après arrêt`,
      `Délai de 1 mois (isotrétinoïne) à 3 ans (acitréitne) après arrêt avant grossesse`);
  if (dci === 'bosentan')
    add(dci,'pathologie','Grossesse — 2ème et 3ème trimestre','absolue',
      `Bosentan fœtotoxique aux 2ème et 3ème trimestres (hypertension pulmonaire néonatale)`,
      `Antagonisme des récepteurs à l'endothéline fœtaux → atteinte vasculaire pulmonaire`,
      `CI absolue pendant toute la grossesse. Alternative : sildénafil si HTAP grave`);
}

// AINS en grossesse (6 molécules)
const ains = [
  ['ibuprofène','M01AE01'],['kétoprofène','M01AE03'],['naproxène','M01AE02'],
  ['diclofénac','M01AB05'],['célécoxib','M01AH01'],['indométacine','M01AB01'],
];

for (const [dci] of ains) {
  const D = dci[0].toUpperCase() + dci.slice(1);
  add(dci,'pathologie','Grossesse — 3ème trimestre (après 24 SA)','absolue',
    `${D} contre-indiqué à partir de 24 SA : fermeture prématurée du canal artériel`,
    `Inhibition des prostaglandines → vasoconstriction ductale et oligoamnios fœtal`,
    `CI absolue après 24 SA. Paracétamol seul antalgique autorisé. Urgence obstétricale si exposé`);
  add(dci,'pathologie','Grossesse — insuffisance rénale fœtale (> 20 SA)','absolue',
    `${D} réduit la perfusion rénale fœtale : oligoamnios et insuffisance rénale fœtale`,
    `Réduction des prostaglandines rénales fœtales → vasoconstriction et réduction diurèse`,
    `Surveillance échographique liquide amniotique si exposé. Arrêt immédiat`);
  add(dci,'pathologie','Allaitement','relative',
    `${D} déconseillé pendant l'allaitement : passage lacté et prostaglandines néonatales`,
    `Passage lacté des AINS avec inhibition des prostaglandines chez le nourrisson`,
    `Ibuprofène/diclofénac acceptable à dose minimale courte. Paracétamol préféré`);
  add(dci,'pathologie','Grossesse — hypertension artérielle gravidique','relative',
    `${D} aggrave l'HTA gravidique par rétention hydrosodée et vasoconstriction`,
    `Inhibition prostaglandines rénales → rétention Na/eau + vasoconstriction`,
    `CI chez les femmes avec HTA gravidique ou pré-éclampsie. Paracétamol uniquement`);
}

// IEC en grossesse
const iec = ['ramipril','énalapril','lisinopril','périndopril','captopril'];
for (const dci of iec) {
  const D = dci[0].toUpperCase() + dci.slice(1);
  add(dci,'pathologie','Grossesse — 2ème et 3ème trimestre','absolue',
    `${D} fœtotoxique aux 2ème et 3ème trimestres : anurie, oligoamnios, malformations rénales`,
    `Inhibition du SRA fœtal → hypotension, anurie, oligoamnios, malformations des voies urinaires`,
    `Substituer par méthyldopa, labétalol ou nifédipine LP avant 20 SA`);
  add(dci,'pathologie','Grossesse — 1er trimestre','relative',
    `${D} au 1er trimestre : risque possible de malformations cardiovasculaires (données contradictoires)`,
    `Rôle du SRA dans le développement cardiovasculaire embryonnaire`,
    `Arrêter dès connaissance de la grossesse. Alternative antihypertensive si nécessaire`);
  add(dci,'pathologie','Allaitement','relative',
    `${D} déconseillé pendant l'allaitement (données limitées, passage lacté possible)`,
    `Passage lacté potentiel avec risque d'hypotension et d'insuffisance rénale néonatale`,
    `Préférer méthyldopa ou labétalol si HTA pendant l'allaitement`);
  add(dci,'pathologie','Femme en âge de procréer (HTA chronique)','relative',
    `${D} doit être remplacé avant grossesse planifiée chez femme en âge de procréer`,
    `Fœtotoxicité avérée des IEC aux 2ème-3ème trimestres`,
    `Informer dès la prescription. Changer d'antihypertenseur si grossesse envisagée`);
}

// ARA2 en grossesse
const ara2 = ['losartan','valsartan','irbésartan','candésartan','olmésartan'];
for (const dci of ara2) {
  const D = dci[0].toUpperCase() + dci.slice(1);
  add(dci,'pathologie','Grossesse — 2ème et 3ème trimestre','absolue',
    `${D} fœtotoxique : même toxicité que les IEC sur le rein fœtal (anurie, oligoamnios)`,
    `Blocage du SRA fœtal par ${dci} → hypotension, anurie, malformations rénales`,
    `CI absolue après 14 SA. Substituer avant grossesse ou dès 1er trimestre si découverte`);
  add(dci,'pathologie','Grossesse — 1er trimestre','relative',
    `${D} au 1er trimestre : éviter (données limitées, possible toxicité cardiovasculaire)`,
    `SRA impliqué dans développement cardiovasculaire embryonnaire`,
    `Arrêter dès connaissance de la grossesse. Méthyldopa, labétalol, nifédipine LP en alternative`);
  add(dci,'pathologie','Allaitement','relative',
    `${D} déconseillé en allaitement : passage lacté et risque hypotension néonatale`,
    `Données lacunaires sur passage lacté des ARA2. Prudence requise`,
    `Préférer méthyldopa ou labétalol. Éviter ARA2 pendant l'allaitement`);
  add(dci,'pathologie','Hyperkaliémie sévère (> 6 mEq/L)','absolue',
    `${D} aggrave l'hyperkaliémie par blocage de l'angiotensine II → rétention potassique`,
    `Réduction de l'aldostérone → rétention potassique rénale sous ${dci}`,
    `CI si K+ > 6 mEq/L. Corriger hyperkaliémie avant. Kaliémie hebdomadaire initiale`);
}

// Psychotropes en grossesse
const psycho = [
  ['lithium','N05AN01','sel de lithium','Ebstein, 1er T'],
  ['diazépam','N05BA01','benzodiazépine','terme/T3'],
  ['lorazépam','N05BA06','benzodiazépine','terme/T3'],
  ['alprazolam','N05BA12','benzodiazépine','terme/T3'],
  ['clonazépam','N03AE01','benzodiazépine antiépileptique','terme/T3'],
  ['paroxétine','N06AB05','ISRS','T1 cardiopathies, T3 HTAP'],
  ['fluoxétine','N06AB03','ISRS','T3 HTAP néonatale'],
  ['sertraline','N06AB06','ISRS','T3 sevrage'],
  ['venlafaxine','N06AX16','ISRSNA','T3 sevrage'],
  ['halopéridol','N05AD01','antipsychotique typique','terme'],
  ['clozapine','N05AH02','antipsychotique atypique','grossesse'],
  ['olanzapine','N05AH03','antipsychotique atypique','terme/T3'],
];

for (const [dci,, cls, risque] of psycho) {
  const D = dci[0].toUpperCase() + dci.slice(1);
  add(dci,'pathologie','Grossesse',['lithium','clozapine'].includes(dci) ? 'relative' : 'relative',
    `${D} (${cls}) déconseillé en grossesse : risque ${risque}`,
    `Passage placentaire de ${dci} avec risque de toxicité fœtale (${risque})`,
    `Avis psychiatrique spécialisé. Si maintenu : surveillance échographique renforcée`);
  add(dci,'pathologie','Grossesse — 3ème trimestre','relative',
    `${D} au 3ème trimestre : risque de syndrome de sevrage et complications néonatales`,
    `Passage placentaire et imprégnation fœtale → syndrome de sevrage en néonatal`,
    `Réduction progressive si possible. Surveillance néonatale 48–72h en unité spécialisée`);
  add(dci,'pathologie','Allaitement','relative',
    `${D} passe dans le lait maternel avec risque de sédation du nourrisson`,
    `Passage lacté de ${dci} (${cls}) avec risque de sédation et effets sur SNC néonatal`,
    `Évaluer bénéfice/risque allaitement. Surveiller nourrisson (sédation, tonus, alimentation)`);
  if (dci === 'lithium')
    add(dci,'pathologie','Grossesse — 1er trimestre','relative',
      `Lithium au 1er trimestre : risque d'anomalie cardiaque d'Ebstein (risque faible mais réel)`,
      `Lithium interfère avec le développement valvulaire cardiaque (valve tricuspide)`,
      `Échocardiographie fœtale à 20-22 SA. Discuter alternative (lamotrigine, rispéridone)`);
  if (['paroxétine','fluoxétine','sertraline','venlafaxine'].includes(dci))
    add(dci,'pathologie','Grossesse — hypertension pulmonaire néonatale persistante','relative',
      `${D} au 3ème trimestre associé à HTAP néonatale persistante (risque faible mais documenté)`,
      `ISRS/ISRSNA → modification des récepteurs sérotoninergiques vasculaires pulmonaires fœtaux`,
      `Informer de ce risque faible mais réel. Décision partagée avec gynécologue obstétricien`);
  if (['diazépam','lorazépam','alprazolam','clonazépam'].includes(dci))
    add(dci,'pathologie','Grossesse — syndrome de floppy infant (terme)','relative',
      `${D} au terme : syndrome de floppy infant (hypotonie, hypothermie, détresse respiratoire)`,
      `Accumulation placentaire des benzodiazépines en fin de grossesse → sédation néonatale`,
      `Réduire ou arrêter progressivement avant le terme. Surveillance néonatale intensive`);
}

// Antibiotiques CI en grossesse
const antibioGross = [
  ['doxycycline','J01AA02','tétracycline','coloration dents et os T2-T3'],
  ['minocycline','J01AA08','tétracycline','coloration dents et os T2-T3'],
  ['tétracycline','J01AA07','tétracycline','coloration dents et os T2-T3'],
  ['ciprofloxacine','J01MA02','fluoroquinolone','arthropathie cartilages fœtaux'],
  ['lévofloxacine','J01MA12','fluoroquinolone','arthropathie cartilages fœtaux'],
  ['norfloxacine','J01MA06','fluoroquinolone','arthropathie cartilages fœtaux'],
  ['gentamicine','J01GB03','aminoside','ototoxicité fœtale irréversible'],
  ['amikacine','J01GB06','aminoside','ototoxicité fœtale irréversible'],
  ['chloramphénicol','J01BA01','phénicolé','syndrome gris néonatal'],
  ['nitrofurantoïne','J01XE01','nitrofuranne','hémolyse T3 et méthémoglobinémie'],
];

for (const [dci,, cls, risque] of antibioGross) {
  const D = dci[0].toUpperCase() + dci.slice(1);
  add(dci,'pathologie','Grossesse','absolue',
    `${D} (${cls}) contre-indiqué en grossesse : ${risque}`,
    `Passage placentaire de ${dci} avec toxicité spécifique fœtale (${risque})`,
    `Substituer par pénicilline, céphalosporine ou érythromycine selon l'indication`);
  add(dci,'pathologie','Allaitement','relative',
    `${D} passe dans le lait maternel avec risque de toxicité chez le nourrisson`,
    `Passage lacté de ${dci} (${cls}) avec risque de ${risque.split(' ')[0]} néonatal`,
    `Éviter pendant l'allaitement. Alternative antibiotique compatible si possible`);
  if (['doxycycline','minocycline','tétracycline'].includes(dci))
    add(dci,'pathologie','Grossesse — 2ème et 3ème trimestre','absolue',
      `${D} aux 2ème-3ème trimestres : coloration permanente des dents de lait et troubles osseux`,
      `Chélation du calcium dans les structures calcifiées en développement fœtal`,
      `CI absolue dès T2. Érythromycine ou amoxicilline en alternative`);
  if (['ciprofloxacine','lévofloxacine','norfloxacine'].includes(dci))
    add(dci,'pathologie','Grossesse — 1er trimestre','absolue',
      `${D} au 1er trimestre : toxicité sur cartilages articulaires fœtaux (modèle animal)`,
      `Chélation du magnésium chondrocytaire et apoptose des chondrocytes en croissance`,
      `CI pendant toute la grossesse. Bêta-lactamine en première intention`);
}

// Cardiovasculaires en grossesse
const cardioGross = [
  ['amiodarone','C01BD01','antiarythmique iodé','hypothyroïdie fœtale, goitre'],
  ['flécaïnide','C01BC04','antiarythmique IC','données limitées'],
  ['aténolol','C07AB03','bêta-bloquant cardiosélectif','retard de croissance intra-utérin'],
  ['furosémide','C03CA01','diurétique de l\'anse','hémoconcentration, diminution perfusion utéro-placentaire'],
  ['hydrochlorothiazide','C03AA03','diurétique thiazidique','hyponatrémie et thrombopénie néonatale'],
  ['spironolactone','C03DA01','anti-aldostérone','antiandrogène : féminisation fœtus masculin'],
  ['ergotamine','N02CA01','dérivé ergot de seigle','vasospasme utérin, avortement'],
  ['méthylergométrine','G02AB01','oxytocique ergotaminique','contractions utérines, avortement'],
];

for (const [dci,, cls, risque] of cardioGross) {
  const D = dci[0].toUpperCase() + dci.slice(1);
  add(dci,'pathologie','Grossesse','absolue',
    `${D} (${cls}) contre-indiqué en grossesse : ${risque}`,
    `Passage placentaire de ${dci} avec risque de ${risque}`,
    `Substituer avant grossesse ou dès découverte. Avis cardiologique/obstétrical`);
  add(dci,'pathologie','Allaitement','absolue',
    `${D} contre-indiqué pendant l'allaitement : passage lacté et toxicité nourrisson`,
    `Passage lacté de ${dci} avec risque de toxicité cardiovasculaire ou hormonale`,
    `Ne pas allaiter sous ${dci}. Alternative thérapeutique pendant l'allaitement`);
  add(dci,'pathologie','Grossesse — 1er trimestre','relative',
    `${D} au 1er trimestre : risque organogénique documenté ou suspecté`,
    `${risque} pouvant survenir dès les premières semaines de grossesse`,
    `Arrêt immédiat dès connaissance de la grossesse. Alternative moins risquée`);
}

// Endocrinologie et hormones
const endoGross = [
  ['misoprostol','G02AD06','analogue prostaglandine','contractions utérines et avortement'],
  ['léuproreline','L02AE02','agoniste GnRH','déprivation estrogénique fœtale'],
  ['propylthiouracile','H03BA02','antithyroïdien','hépatotoxicité maternelle T2-T3'],
  ['cabergoline','G02CB03','agoniste dopaminergique','données insuffisantes'],
  ['bromocriptine','G02CB01','agoniste dopaminergique','données limitées, CI allaitement'],
  ['méthylprednisolone','H02AB04','corticoïde systémique','insuffisance surrénalienne néonatale'],
];

for (const [dci,, cls, risque] of endoGross) {
  const D = dci[0].toUpperCase() + dci.slice(1);
  add(dci,'pathologie','Grossesse',dci === 'misoprostol' ? 'absolue' : 'relative',
    `${D} (${cls}) contre-indiqué ou déconseillé en grossesse : ${risque}`,
    `${risque} lié à l'action pharmacologique de ${dci}`,
    `${dci === 'misoprostol' ? 'CI absolue sauf indication obstétricale contrôlée' : 'Avis spécialisé. Substituer si possible pendant la grossesse'}`);
  add(dci,'pathologie','Allaitement','relative',
    `${D} déconseillé pendant l'allaitement : ${risque} possible chez nourrisson`,
    `Passage lacté potentiel avec risque de toxicité sur nourrisson`,
    `Éviter pendant l'allaitement. Alternative si besoin thérapeutique`);
}

// Antiparasitaires et antifongiques
const antiparGross = [
  ['primaquine','P01BA03','antipaludéen 8-aminoquinoléine','hémolyse néonatale G6PD'],
  ['méfloquine','P01BC02','antipaludéen','CI T1, prudence T2-T3'],
  ['itraconazole','J02AC02','antifongique triazolé','tératogène animal'],
  ['griseofulvine','D01BA01','antifongique oral','tératogène animal, CI grossesse'],
  ['fluconazole','J02AC01','antifongique triazolé','doses élevées tératogènes'],
  ['kétoconazole','J02AB02','antifongique azolé','tératogène animal, CI oral grossesse'],
];

for (const [dci,, cls, risque] of antiparGross) {
  const D = dci[0].toUpperCase() + dci.slice(1);
  add(dci,'pathologie','Grossesse',['griseofulvine','kétoconazole'].includes(dci) ? 'absolue' : 'relative',
    `${D} (${cls}) contre-indiqué ou déconseillé en grossesse : ${risque}`,
    `Tératogénicité documentée chez l'animal ou données humaines insuffisantes (${risque})`,
    `Substituer par alternative plus sûre. ${dci === 'fluconazole' ? 'Dose unique 150 mg acceptable' : 'Avis infectiologie'}`);
  add(dci,'pathologie','Allaitement','relative',
    `${D} déconseillé pendant l'allaitement : passage lacté et risque de toxicité`,
    `Passage lacté de ${dci} (${cls}) avec risque de toxicité hépatique ou hémolytique`,
    `Éviter pendant l'allaitement. Alternative antifongique topique si possible`);
  add(dci,'pathologie','Femme en âge de procréer sans contraception','relative',
    `${D} exige une contraception pendant et après le traitement (délai selon molécule)`,
    `Tératogénicité potentielle nécessitant une prévention contraceptive`,
    `Contraception efficace pendant et 1 mois après ${dci}. Test grossesse si doute`);
}

// Antiviraux en grossesse
const antivirGross = [
  ['ribavirine','J05AB04','analogue nucléosidique','tératogène majeur : CI absolue'],
  ['interféron alfa','L03AB04','immunomodulateur','avortement spontané, RCIU'],
  ['efavirenz','J05AG03','antirétroviral INNTI','tératogène T1 (malformations SNC)'],
  ['interféron bêta','L03AB08','immunomodulateur','avortement spontané possible'],
  ['ribavirine — partenaire masculin','J05AB04','tératogène via sperme du partenaire','malformations'],
];

for (const [dci,, cls, risque] of antivirGross) {
  const D = dci.split('—')[0].trim();
  const Dc = D[0].toUpperCase() + D.slice(1);
  add(dci,'pathologie','Grossesse','absolue',
    `${Dc} (${cls}) formellement CI en grossesse : ${risque}`,
    `Tératogénicité ou embryotoxicité documentée (${risque})`,
    `Double contraception obligatoire pendant et 6 mois après arrêt. Test grossesse mensuel`);
  add(dci,'pathologie','Allaitement','absolue',
    `${Dc} contre-indiqué pendant l'allaitement : risque de toxicité grave du nourrisson`,
    `Passage lacté avec risque de toxicité hématologique ou immunologique`,
    `Ne pas allaiter sous ${Dc}. Alternative ou arrêt d'allaitement`);
}

// Statines en grossesse
const statines = ['atorvastatine','rosuvastatine','simvastatine','pravastatine','fluvastatine'];
for (const dci of statines) {
  const D = dci[0].toUpperCase() + dci.slice(1);
  add(dci,'pathologie','Grossesse','absolue',
    `${D} contre-indiqué en grossesse : risque de malformations fœtales (inhibition mévalonate)`,
    `Inhibition de la biosynthèse du mévalonate perturbe la différenciation cellulaire embryonnaire`,
    `Arrêter immédiatement à la découverte de la grossesse. Pas d'alternative statine`);
  add(dci,'pathologie','Allaitement','absolue',
    `${D} contre-indiqué pendant l'allaitement : passage lacté et perturbation métabolisme lipidique`,
    `Passage lacté avec inhibition de la synthèse de cholestérol nécessaire au développement`,
    `Ne pas allaiter sous ${dci}. Reprendre après sevrage`);
  add(dci,'pathologie','Femme en âge de procréer sans contraception efficace','relative',
    `${D} déconseillé sans contraception efficace chez femme en âge de procréer`,
    `Fœtotoxicité potentielle exigeant une prévention contraceptive`,
    `Informer du risque. Contraception recommandée. Arrêt si grossesse découverte`);
}

// Aspirine haute dose, codéine, colchicine
const divers2 = [
  ['aspirine','B01AC06','antiagrégant / AINS','T3 : fermeture prématurée canal artériel'],
  ['codéine','R05DA04','opioïde dérivé morphine','allaitement : métaboliseur rapide CYP2D6'],
  ['colchicine','M04AC01','alcaloïde antimitotique','données limitées, déconseillée'],
  ['trétinoïne topique','D10AD01','rétinoïde topique','tératogène T1 (exposition systémique faible)'],
];

for (const [dci,, cls, risque] of divers2) {
  const D = dci[0].toUpperCase() + dci.slice(1);
  add(dci,'pathologie','Grossesse — 3ème trimestre','absolue',
    `${D} (${cls}) contre-indiqué au 3ème trimestre : ${risque}`,
    `Mécanisme lié à ${dci} : ${risque}`,
    `${dci === 'aspirine' ? 'Paracétamol seul autorisé. CI absolue > 24 SA' : 'Avis médical. Alternative si possible'}`);
  add(dci,'pathologie','Allaitement',dci === 'codéine' ? 'absolue' : 'relative',
    `${D} ${dci === 'codéine' ? 'formellement CI' : 'déconseillé'} pendant l'allaitement : ${risque}`,
    `${dci === 'codéine' ? 'Métabolisme en morphine chez métaboliseurs rapides → morphine en excès dans lait maternel → sédation/mort néonatale' : `Passage lacté et risque de ${risque}`}`,
    `${dci === 'codéine' ? 'CI absolue allaitement. Paracétamol ou ibuprofène à la place' : 'Paracétamol recommandé. Courte durée si nécessaire'}`);
}

// Biologiques / JAK inhibiteurs en grossesse
const bioJAK = [
  ['tofacitinib','L04AA29','inhibiteur JAK'],
  ['baricitinib','L04AA37','inhibiteur JAK'],
  ['abatacept','L04AA24','inhibiteur CTLA-4'],
  ['bélimumab','L04AA26','anti-BLyS'],
  ['sécukinumab','L04AC10','anti-IL-17'],
  ['dupilumab','D11AH05','anti-IL-4/IL-13'],
];

for (const [dci,, cls] of bioJAK) {
  const D = dci[0].toUpperCase() + dci.slice(1);
  add(dci,'pathologie','Grossesse','relative',
    `${D} (${cls}) déconseillé en grossesse : données insuffisantes sur tératogénicité`,
    `Passage placentaire potentiel avec modulation immunitaire fœtale (${cls})`,
    `Arrêter avant conception si possible. Avis rhumato/immunologie. Registre de grossesse`);
  add(dci,'pathologie','Allaitement','relative',
    `${D} déconseillé pendant l'allaitement : passage lacté et immunosuppression néonatale`,
    `Passage lacté potentiel de ${dci} (${cls}) avec risque d'immunosuppression du nourrisson`,
    `Évaluer bénéfice/risque. Surveillance infections nourrisson si maintenu`);
}

// ─── DEDUPLICATION ET GÉNÉRATION SQL ─────────────────────────────────────────
const complete = rows.filter(r =>
  r.dci_pattern && r.condition_type && r.condition_valeur &&
  r.severite && r.description && r.mecanisme_fr && r.conduite_fr
);

const seen = new Set();
const unique = [];
for (const r of complete) {
  const key = `${r.dci_pattern}|||${r.condition_valeur}`;
  if (!seen.has(key)) { seen.add(key); unique.push(r); }
}

console.log(`Total complet: ${complete.length}, unique: ${unique.length}`);

const batchSize = 40;
let fileIdx = 8; // Suite de l'étape 1 qui avait 7 batches
for (let i = 0; i < unique.length; i += batchSize) {
  const batch = unique.slice(i, i + batchSize);
  const vals = batch.map(r =>
    `('${esc(r.dci_pattern)}','${esc(r.condition_type)}','${esc(r.condition_valeur)}','${esc(r.severite)}','${esc(r.description)}','${esc(r.mecanisme_fr)}','${esc(r.conduite_fr)}')`
  ).join(',\n');
  const sql = `INSERT INTO contraindications (dci_pattern,condition_type,condition_valeur,severite,description,mecanisme_fr,conduite_fr)\nVALUES\n${vals}\nON CONFLICT DO NOTHING;\n`;
  writeFileSync(`scripts/contra_batch_${String(fileIdx).padStart(2,'0')}.sql`, sql, 'utf8');
  console.log(`Batch ${fileIdx}: lignes ${i+1}–${Math.min(i+batchSize, unique.length)}`);
  fileIdx++;
}
console.log(`Terminé : ${unique.length} lignes en ${fileIdx-8} fichiers`);
