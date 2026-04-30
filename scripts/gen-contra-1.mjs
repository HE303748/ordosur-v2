// gen-contra-1.mjs — 1 000 nouvelles contre-indications (Étape 1)
// Classes : Antibiotiques, Cardiovasculaires, SNC, Endocrinologie, AINS
import { writeFileSync } from 'fs';

const esc = s => s.replace(/'/g, "''");

const rows = [];

// ─── ANTIBIOTIQUES ────────────────────────────────────────────────────────────
const penicilines = 'amoxicilline|ampicilline|amoxicilline-clavulanate|pipéracilline|oxacilline|cloxacilline|ticarcilline|benzylpénicilline|phénoxyméthylpénicilline';
const cephalos    = 'céfazoline|céfuroxime|céfotaxime|ceftriaxone|céfépime|ceftazidime|cefpodoxime|céfalexine|cefadroxil|cefoxitine|cefprozil';
const macrolides  = 'azithromycine|clarithromycine|érythromycine|spiramycine|roxithromycine|josamycine|télithromycine';
const quinolones  = 'ciprofloxacine|lévofloxacine|moxifloxacine|ofloxacine|norfloxacine|péfloxacine|énoxacine';
const tetracycl   = 'doxycycline|tétracycline|minocycline|tigécycline|déméclocycline';
const aminoglyc   = 'gentamicine|tobramycine|amikacine|nétilmicine|streptomycine|kanamycine';
const sulfamides  = 'sulfaméthoxazole|triméthoprime|co-trimoxazole|sulfadiazine';
const imidazoles  = 'métronidazole|tinidazole|ornidazole|secnidazole';
const glycopept   = 'vancomycine|téicoplanine|dalbavancine';
const antifong    = 'fluconazole|itraconazole|voriconazole|kétoconazole|posaconazole';

const antibioCombos = [
  // Pénicillines × allergies et pathologies
  [penicilines,'allergie_med','Allergie aux pénicillines','absolue','CI absolue : allergie aux pénicillines — risque de choc anaphylactique fatal','Hypersensibilité IgE-médiée aux bêta-lactamines','Utiliser macrolide, clindamycine ou vancomycine. Désensibilisation possible en milieu hospitalier pour infections graves.'],
  [penicilines,'pathologie','Mononucléose infectieuse','absolue','CI absolue : ampicilline/amoxicilline → rash cutané sévère dans >90% des cas de mononucléose','Mécanisme immunologique non-IgE lié à l\'EBV activé','Substituer par un autre antibiotique. Éviter toutes les aminopénicillines.'],
  [penicilines,'pathologie','Insuffisance rénale chronique stade 4-5','relative','Accumulation des pénicillines ; risque de neurotoxicité (convulsions) aux fortes doses','Élimination rénale exclusive ; accumulation si DFG < 30 mL/min','Réduire les doses selon le DFG. Surveillance neurologique.'],
  [penicilines,'pathologie','Épilepsie','relative','Les pénicillines à forte dose peuvent abaisser le seuil épileptogène','Inhibition compétitive des récepteurs GABA-A','Utiliser avec précaution aux fortes doses IV. Surveiller les convulsions.'],
  [penicilines,'allergie_med','Allergie aux céphalosporines','relative','Réactivité croisée partielle entre pénicillines et céphalosporines (~2–10 %)','Similitude structurale du noyau bêta-lactame','Utiliser avec précaution si allergie mineure aux céphalosporines. CI si allergie sévère.'],

  // Céphalosporines
  [cephalos,'allergie_med','Allergie aux céphalosporines','absolue','CI absolue : allergie documentée aux céphalosporines — risque anaphylactique','Hypersensibilité aux bêta-lactamines (chaîne latérale R1)','Utiliser macrolide, clindamycine ou glycopeptide selon l\'indication.'],
  [cephalos,'allergie_med','Allergie aux pénicillines','relative','Réactivité croisée possible pénicillines–céphalosporines (2–10 %)','Similitude du noyau bêta-lactame','Éviter si allergie sévère aux pénicillines. Si allergie mineure, utiliser céphalosporine de structure différente avec surveillance.'],
  [cephalos,'pathologie','Insuffisance rénale chronique stade 4-5','relative','Accumulation des céphalosporines à élimination rénale ; risque de neurotoxicité','Élimination rénale prédominante','Adapter la posologie au DFG. Préférer céfopérazone (élimination biliaire).'],
  [cephalos,'pathologie','Épilepsie','relative','Encéphalopathie épileptique documentée sous céphalosporines (surtout céfépime) en cas d\'IR','Inhibition des récepteurs GABA-A, aggravée par accumulation rénale','Surveiller signes neurologiques. Réduire dose si DFG diminué.'],
  [cephalos,'pathologie','Grossesse (1er trimestre)','relative','Passage placentaire des céphalosporines ; données insuffisantes pour certaines molécules','Diffusion placentaire variable selon la génération','Utiliser uniquement si bénéfice > risque. Préférer pénicillines si pas d\'allergie.'],

  // Macrolides
  [macrolides,'pathologie','Allongement du QT (QTc > 450 ms)','absolue','CI absolue : macrolides → allongement du QT et risque de torsades de pointes','Bloc des canaux potassiques IKr (hERG)','Utiliser un antibiotique sans effet sur le QT (amoxicilline, doxycycline).'],
  [macrolides,'pathologie','Insuffisance hépatique sévère (Child-Pugh C)','absolue','Accumulation hépatotoxique des macrolides en cas d\'IHC sévère','Métabolisme hépatique extensif (CYP3A4)','CI absolue pour érythromycine et clarithromycine. Azithromycine avec grande précaution.'],
  [macrolides,'pathologie','Myasthénie grave','relative','Les macrolides peuvent aggraver la myasthénie en bloquant la jonction neuromusculaire','Interférence avec la transmission neuromusculaire','Éviter. Si nécessaire, surveiller force musculaire et fonction respiratoire.'],
  [macrolides,'pathologie','Hypokaliémie','relative','L\'hypokaliémie potentialise l\'allongement du QT induit par les macrolides','Synergie sur le canal IKr','Corriger l\'hypokaliémie avant tout traitement par macrolide.'],
  [macrolides,'allergie_med','Allergie aux macrolides','absolue','CI absolue : hypersensibilité documentée aux macrolides','Réaction IgE-médiée ou non au noyau macrolide','Utiliser une alternative structurellement différente (tétracyclines, quinolones selon l\'indication).'],

  // Fluoroquinolones
  [quinolones,'pathologie','Épilepsie','relative','Les fluoroquinolones abaissent le seuil épileptogène et peuvent déclencher des convulsions','Inhibition des récepteurs GABA-A + antagonisme adénosine','Éviter impérativement. Si indispensable : surveillance neurologique étroite et antiépileptiques renforcés.'],
  [quinolones,'pathologie','Allongement du QT (QTc > 450 ms)','absolue','CI absolue : fluoroquinolones → torsades de pointes en cas de QT allongé','Bloc des canaux potassiques IKr','Utiliser une bêta-lactamine ou un autre antibiotique sans effet QT.'],
  [quinolones,'pathologie','Tendinopathie / Rupture tendineuse','absolue','CI absolue chez patients avec antécédents de tendinopathie sous fluoroquinolones','Chélation du magnésium tendineux ; apoptose des ténocytes','Ne jamais réutiliser une fluoroquinolone après tendinopathie. Utiliser une autre classe.'],
  [quinolones,'pathologie','Myasthénie grave','absolue','Les fluoroquinolones peuvent provoquer une crise myasthénique grave voire fatale','Blocage de la jonction neuromusculaire','CI absolue. Choisir une alternative sans effet neuromusculaire.'],
  [quinolones,'pathologie','Grossesse (1er trimestre)','absolue','Arthropathie des cartilages de croissance démontrée chez l\'animal ; données insuffisantes humain','Toxicité directe sur les chondrocytes et cartilages en croissance','CI absolue pendant la grossesse. Utiliser bêta-lactamine ou macrolide.'],
  [quinolones,'pathologie','Grossesse (2e trimestre)','absolue','Risque tératogène et toxicité articulaire fœtale','Toxicité chondrocytaire','CI absolue. Substituer systématiquement.'],
  [quinolones,'pathologie','Grossesse (3e trimestre)','absolue','Toxicité sur le cartilage fœtal ; pas de données de sécurité','Toxicité des chondrocytes fœtaux','CI absolue. Alternatives : amoxicilline-clavulanate, ceftriaxone.'],
  [quinolones,'pathologie','Déficit en G6PD','relative','Risque d\'anémie hémolytique sous quinolones chez patients G6PD déficients','Stress oxydatif érythrocytaire sans protection enzymatique','Surveiller NFS. Préférer une autre classe antibiotique.'],
  [quinolones,'pathologie','Insuffisance rénale chronique stade 4-5','relative','Accumulation des métabolites actifs ; risque de neurotoxicité et tendinopathie accru','Élimination rénale prédominante (ciprofloxacine, lévofloxacine)','Adapter la dose au DFG. Ciprofloxacine : dose divisée par 2 si DFG < 30.'],

  // Tétracyclines
  [tetracycl,'pathologie','Grossesse (1er trimestre)','absolue','CI absolue : tétracyclines → troubles de l\'ossification fœtale et coloration des dents','Chélation du calcium dans les dents et os en formation','Substituer par pénicilline ou macrolide.'],
  [tetracycl,'pathologie','Grossesse (2e trimestre)','absolue','Coloration permanente des dents de lait et troubles osseux fœtaux','Incorporation dans les structures calcifiées en formation','CI absolue. Alternatives : amoxicilline, érythromycine.'],
  [tetracycl,'pathologie','Grossesse (3e trimestre)','absolue','Hépatotoxicité maternelle sévère possible + toxicité fœtale osseuse','Accumulation hépatique + dépôt osseux','CI absolue.'],
  [tetracycl,'pathologie','Enfant < 8 ans','absolue','Coloration permanente et irréversible des dents définitives + retard de croissance osseuse','Chélation du calcium dans les dents et os en développement','CI absolue avant 8 ans. Utiliser amoxicilline ou azithromycine.'],
  [tetracycl,'pathologie','Insuffisance hépatique sévère (Child-Pugh C)','absolue','Hépatotoxicité sévère des tétracyclines en cas d\'IHC préexistante','Accumulation hépatique et effet toxique direct','Utiliser une alternative : macrolide, bêta-lactamine.'],
  [tetracycl,'pathologie','Insuffisance rénale chronique stade 4-5','relative','Accumulation des tétracyclines (sauf doxycycline) ; azotémie aggravée','Effet anti-anabolique protéique + accumulation rénale','Utiliser uniquement doxycycline (élimination biliaire). CI pour les autres.'],
  [tetracycl,'allergie_med','Allergie aux tétracyclines','absolue','CI absolue : hypersensibilité documentée aux tétracyclines','Réaction immunologique au noyau tétracyclique','Utiliser macrolide ou bêta-lactamine selon l\'indication.'],

  // Aminoglycosides
  [aminoglyc,'pathologie','Insuffisance rénale chronique stade 3-5','absolue','Néphrotoxicité sévère des aminosides ; peut précipiter une dialyse','Toxicité tubulaire directe par accumulation dans les cellules tubulaires proximales','CI sauf infection grave sans alternative. Si utilisé : monitoring des taux sériques, créatinine quotidienne.'],
  [aminoglyc,'pathologie','Surdité / Hypoacousie préexistante','absolue','Ototoxicité irréversible aggravée par accumulation cochléaire','Destruction des cellules ciliées de la cochlée et du vestibule','CI absolue. Utiliser alternative bactéricide (carbapénème, glycopeptide).'],
  [aminoglyc,'pathologie','Myasthénie grave','absolue','Les aminosides bloquent la jonction neuromusculaire et peuvent déclencher une crise myasthénique','Inhibition de la libération présynaptique d\'acétylcholine','CI absolue. Utiliser une alternative sans effet neuromusculaire.'],
  [aminoglyc,'pathologie','Grossesse (1er trimestre)','absolue','Ototoxicité fœtale irréversible (surdité néonatale documentée)','Passage placentaire et accumulation dans l\'oreille interne fœtale','CI absolue. Utiliser bêta-lactamine ou glycopeptide.'],
  [aminoglyc,'pathologie','Grossesse (2e trimestre)','absolue','Ototoxicité fœtale irréversible','Accumulation dans les cellules ciliées fœtales en développement','CI absolue pendant toute la grossesse.'],
  [aminoglyc,'pathologie','Grossesse (3e trimestre)','absolue','Surdité néonatale documentée','Accumulation cochléaire fœtale','CI absolue.'],

  // Sulfamides
  [sulfamides,'allergie_med','Allergie aux sulfamides','absolue','CI absolue : allergie documentée aux sulfamides — risque de syndrome de Stevens-Johnson','Hypersensibilité au noyau sulfonamide (réaction immune T-cell médiée)','Utiliser une alternative : triméthoprime seul, tétracycline, ou autre classe.'],
  [sulfamides,'pathologie','Déficit en G6PD','absolue','Hémolyse sévère et potentiellement fatale chez les patients G6PD déficients','Stress oxydatif érythrocytaire sans glutathion protecteur','CI absolue. Utiliser triméthoprime seul ou autre classe antibiotique.'],
  [sulfamides,'pathologie','Insuffisance rénale chronique stade 4-5','relative','Accumulation et cristallurie rénale ; néphrotoxicité aggravée','Précipitation des métabolites acétylés dans les tubules rénaux','Adapter les doses. Hydratation abondante. Préférer une alternative si DFG < 30.'],
  [sulfamides,'pathologie','Grossesse (3e trimestre)','absolue','Ictère nucléaire néonatal par déplacement de la bilirubine','Compétition avec la bilirubine pour la liaison à l\'albumine','CI absolue au 3e trimestre. Substituer par amoxicilline ou nitrofurantoïne (si pas de terme proche).'],
  [sulfamides,'pathologie','Porphyrie','absolue','Les sulfamides sont porphyrinogènes et peuvent déclencher une crise aiguë de porphyrie','Induction des enzymes de la chaîne de synthèse de l\'hème','CI absolue. Consulter la liste des médicaments sûrs en porphyrie.'],

  // Imidazolés
  [imidazoles,'allergie_med','Allergie aux imidazolés','absolue','CI absolue : hypersensibilité documentée aux imidazolés/nitroimidazolés','Réaction immunologique au noyau imidazole','Utiliser un antibiotique à spectre anaérobie alternatif (clindamycine, amoxicilline-clavulanate).'],
  [imidazoles,'pathologie','Prise d\'alcool / Alcoolisme actif','absolue','Réaction antabuse sévère (flush, tachycardie, hypotension, vomissements)','Inhibition de l\'aldéhyde déshydrogénase → accumulation d\'acétaldéhyde','CI absolue avec consommation d\'alcool. Abstinence 48h après la dernière dose.'],
  [imidazoles,'pathologie','Grossesse (1er trimestre)','absolue','Mutagénèse et tératogénicité potentielle du métronidazole au 1er trimestre','Lésion de l\'ADN par les métabolites réducteurs','CI au 1er trimestre. Utiliser clindamycine ou amoxicilline-clavulanate.'],
  [imidazoles,'pathologie','Épilepsie','relative','Le métronidazole peut réduire le seuil épileptogène à fortes doses','Inhibition du GABA et neurotoxicité directe','Surveiller les convulsions. Réduire la dose ou utiliser une alternative.'],
  [imidazoles,'pathologie','Insuffisance hépatique sévère (Child-Pugh C)','relative','Accumulation importante du métronidazole et de ses métabolites actifs','Métabolisme hépatique extensif, élimination biliaire','Réduire la dose de 50%. Surveiller les signes de neurotoxicité.'],

  // Glycopeptides
  [glycopept,'pathologie','Insuffisance rénale chronique stade 4-5','relative','Accumulation de la vancomycine avec néphrotoxicité et ototoxicité potentielles','Élimination exclusivement rénale par filtration glomérulaire','Adapter la dose au DFG. Monitoring des taux résiduels (cible 10-20 mg/L). Surveillance auditive.'],
  [glycopept,'pathologie','Surdité / Hypoacousie préexistante','relative','Ototoxicité cochléaire et vestibulaire aggravée par accumulation','Toxicité directe des cellules ciliées de la strie vasculaire','Monitoring strict des taux résiduels. Si possible, utiliser une alternative (linézolide, daptomycine).'],
  [glycopept,'allergie_med','Allergie aux glycopeptides','absolue','CI absolue : réaction allergique documentée à la vancomycine ou téicoplanine','Hypersensibilité immunologique au glycopeptide','Utiliser linézolide, daptomycine ou tedizolide selon le germe et le site infectieux.'],
  [glycopept,'pathologie','Myasthénie grave','relative','Bloc neuromusculaire potentiel sous glycopeptides ; aggravation possible','Interférence au niveau de la plaque motrice','Surveillance de la force musculaire. Préférer linézolide si possible.'],

  // Antifongiques
  [antifong,'pathologie','Insuffisance hépatique sévère (Child-Pugh C)','absolue','Hépatotoxicité sévère des azolés en cas d\'IHC préexistante','Métabolisme hépatique extensif + toxicité directe mitochondriale','CI pour kétoconazole. Fluconazole/voriconazole : réduction dose et surveillance ALAT.'],
  [antifong,'pathologie','Allongement du QT (QTc > 450 ms)','relative','Voriconazole et kétoconazole allongent le QT → risque de torsades de pointes','Inhibition du canal IKr (hERG)','Éviter les azolés. Si indispensable : ECG quotidien, corriger kaliémie et magnésémie.'],
  [antifong,'pathologie','Porphyrie','absolue','Le kétoconazole est porphyrinogène — risque de crise aiguë','Induction des enzymes de synthèse de l\'hème','CI absolue. Utiliser fluconazole ou échinocandine si tolérée.'],
  [antifong,'pathologie','Insuffisance rénale chronique stade 4-5','relative','Accumulation des métabolites ; risque de néphrotoxicité (amphotéricine B)','Toxicité tubulaire directe de l\'amphotéricine B déoxycholate','Utiliser amphotéricine B liposomale. Surveiller créatinine et ionogramme quotidiennement.'],
  [antifong,'allergie_med','Allergie aux azolés','absolue','CI absolue : hypersensibilité documentée aux antifongiques azolés','Réaction immunologique au noyau imidazole ou triazole','Utiliser une échinocandine (caspofongine, micafongine) ou amphotéricine B liposomale.'],

  // Extra antibio to reach ~50 entries for antibiotics section
  [quinolones,'pathologie','Hypokaliémie','relative','L\'hypokaliémie potentialise l\'allongement du QT par les fluoroquinolones','Synergie hypokaliémie + bloc IKr','Corriger la kaliémie avant de débuter le traitement.'],
  [macrolides,'pathologie','Insuffisance rénale chronique stade 4-5','relative','Accumulation des macrolides (surtout érythromycine) en cas d\'IR sévère','Métabolisme hépatique mais excrétion biliaire et rénale selon la molécule','Azithromycine : pas d\'ajustement. Clarithromycine : dose divisée par 2 si DFG < 30.'],
  [sulfamides,'pathologie','Hyperkaliémie','relative','Le triméthoprime bloque les canaux ENaC rénaux et diminue l\'excrétion du potassium','Effet épargneur potassique du triméthoprime similaire à l\'amiloride','Surveiller la kaliémie. CI si K+ > 5,5 mmol/L.'],
  [aminoglyc,'pathologie','Insuffisance hépatique sévère (Child-Pugh C)','relative','Risque accru de syndrome hépatorénal si aminoside administré en cas d\'IHC','Hypovolémie relative et néphrotoxicité cumulée','Éviter. Si indispensable : monitoring quotidien de la créatinine et des taux résiduels.'],
  [penicilines,'pathologie','Grossesse (1er trimestre)','relative','Les pénicillines sont globalement sûres mais des données manquent pour certaines associations','Passage placentaire, taux fœtaux détectables','Pénicillines de référence en grossesse. Utiliser selon l\'indication sans restriction majeure.'],
  [cephalos,'pathologie','Insuffisance hépatique sévère (Child-Pugh C)','relative','Accumulation de certaines céphalosporines à métabolisme hépatique (ceftriaxone)','Élimination biliaire prédominante pour la ceftriaxone','Ceftriaxone CI en cas d\'ictère néonatal ou IHC sévère. Préférer céfotaxime.'],
  [tetracycl,'pathologie','Myasthénie grave','relative','Les tétracyclines peuvent aggraver la faiblesse musculaire myasthénique','Inhibition partielle de la jonction neuromusculaire','Surveiller la force musculaire. Préférer une bêta-lactamine si possible.'],
  [glycopept,'pathologie','Grossesse (1er trimestre)','relative','Données limitées ; passage placentaire ; ototoxicité fœtale possible','Diffusion placentaire avec accumulation possible dans l\'oreille interne fœtale','Utiliser uniquement si infection grave à SARM sans alternative. Monitoring taux résiduels.'],
  [imidazoles,'pathologie','Insuffisance rénale chronique stade 4-5','relative','Accumulation des métabolites du métronidazole en cas d\'IR sévère','Excrétion rénale des métabolites conjugués actifs','Réduire la dose de 50%. Surveiller les signes de neurotoxicité (confusion, ataxie).'],
  [antifong,'pathologie','Grossesse (1er trimestre)','relative','Tératogénicité documentée du fluconazole systémique à forte dose','Perturbation de la synthèse de l\'ergostérol fœtal','Utiliser uniquement traitement local. Si systémique indispensable : dose unique 150 mg max avec surveillance.'],
];

// ─── CARDIOVASCULAIRES ────────────────────────────────────────────────────────
const iec        = 'énalapril|captopril|ramipril|lisinopril|périndopril|fosinopril|quinapril|trandolapril|bénazépril|cilazapril';
const arb        = 'losartan|valsartan|irbesartan|candésartan|olmésartan|telmisartan|éprosartan|azilsartan';
const betabloc   = 'propranolol|aténolol|métoprolol|bisoprolol|carvédilol|nébivolol|labétalol|acébutolol|pindolol|céliprolol|sotalol';
const calcantag  = 'amlodipine|nifédipine|vérapamil|diltiazem|félodipine|nicardipine|nimodipine|lacidipine|manidipine';
const diurThiaz  = 'hydrochlorothiazide|chlorthalidone|indapamide|bendrofluméthiazide|méthyclothiazide';
const diurAnse   = 'furosémide|bumétanide|torsémi|acide éthacrynique|pirétanide';
const diurEparg  = 'spironolactone|éplérénone|amiloride|triamtérène';
const aod        = 'rivaroxaban|apixaban|dabigatran|édoxaban|bétrixaban';
const avk        = 'warfarine|fluindione|acénocoumarol|phénprocoumone';
const statines   = 'atorvastatine|simvastatine|rosuvastatine|pravastatine|fluvastatine|pitavastatine|lovastatine|cérivastatine';
const antiarryt  = 'amiodarone|flécaïnide|propafénone|lidocaïne|mexilétine|dronédarone|disopyramide|quinidine';
const nitres     = 'nitroglycérine|isosorbide mononitrate|isosorbide dinitrate|molsidomine|trinitrine';
const antiplaq   = 'clopidogrel|ticagrélor|prasugrel|dipyridamole|ticlopidine';

const cardioCombos = [
  // IEC
  [iec,'pathologie','Grossesse (2e trimestre)','absolue','CI absolue : IEC → oligoamnios, malformations rénales, MFIU au 2e et 3e trimestre','Blocage du SRA fœtal → insuffisance rénale fœtale et oligoamnios','Arrêter immédiatement et remplacer par alpha-méthyldopa, labétalol ou nifédipine.'],
  [iec,'pathologie','Grossesse (3e trimestre)','absolue','CI absolue : IEC → insuffisance rénale néonatale irréversible, MFIU, oligoamnios','Blocage du SRA fœtal essentiel au développement rénal','Arrêter immédiatement. Antihypertenseur compatible : labétalol, nifédipine, alpha-méthyldopa.'],
  [iec,'pathologie','Hyperkaliémie (K+ > 5,5 mmol/L)','absolue','CI absolue : IEC bloquent l\'excrétion rénale du potassium → arrêt cardiaque possible','Inhibition de l\'aldostérone → rétention potassique','Corriger l\'hyperkaliémie avant d\'initier le traitement. Utiliser amlodipine ou diurétique thiazidique.'],
  [iec,'pathologie','Sténose bilatérale des artères rénales','absolue','CI absolue : IEC → insuffisance rénale aiguë par chute de la pression de perfusion glomérulaire','Dépendance angiotensine II pour maintenir la pression efférente en sténose bilatérale','CI absolue. Utiliser un inhibiteur calcique ou un diurétique.'],
  [iec,'pathologie','Angio-œdème héréditaire (déficit en C1-inhibiteur)','absolue','CI absolue : IEC peuvent déclencher des crises d\'angio-œdème potentiellement fatales','Accumulation de bradykinine (non dégradée par l\'ECA)','CI absolue. Utiliser un sartan (avec grande précaution) ou un autre antihypertenseur.'],
  [iec,'allergie_med','Allergie aux IEC (toux/angio-œdème)','absolue','CI absolue : antécédent d\'angio-œdème sous IEC — risque d\'asphyxie fatale','Accumulation de bradykinine et substance P','Utiliser un sartan à la place.'],
  [iec,'pathologie','Insuffisance rénale chronique stade 5 (DFG < 15)','relative','Risque d\'hyperkaliémie sévère et dégradation de la fonction rénale','Réduction de la filtration glomérulaire et rétention potassique','Utiliser à faibles doses avec surveillance rapprochée de la kaliémie et de la créatinine.'],
  [iec,'pathologie','Rétrécissement aortique serré','relative','Risque de collapsus hémodynamique par chute brutale des résistances périphériques','Vasodilatation artériolaire sans possibilité d\'augmentation du débit cardiaque','Utiliser avec grande précaution. Préférer l\'amlodipine en cas d\'HTA associée.'],

  // Sartans/ARA2
  [arb,'pathologie','Grossesse (2e trimestre)','absolue','CI absolue : sartans → mêmes effets tératogènes que les IEC sur le SRA fœtal','Blocage des récepteurs AT1 du SRA fœtal','Remplacer par labétalol, nifédipine, ou alpha-méthyldopa.'],
  [arb,'pathologie','Grossesse (3e trimestre)','absolue','CI absolue : néphrotoxicité fœtale, oligoamnios, MFIU','Blocage du SRA fœtal au moment critique du développement rénal','Arrêter immédiatement.'],
  [arb,'pathologie','Hyperkaliémie (K+ > 5,5 mmol/L)','absolue','CI absolue : sartans bloquent l\'aldostérone et aggravent l\'hyperkaliémie','Inhibition des récepteurs AT1 → réduction de la sécrétion d\'aldostérone','Corriger d\'abord. Utiliser amlodipine ou diurétique thiazidique.'],
  [arb,'pathologie','Sténose bilatérale des artères rénales','absolue','CI absolue identique aux IEC : insuffisance rénale aiguë','Même mécanisme de dépendance angiotensine II pour la perfusion glomérulaire','CI absolue. Utiliser un inhibiteur calcique.'],
  [arb,'allergie_med','Allergie aux sartans (angio-œdème)','absolue','CI absolue : angio-œdème documenté sous sartan (moins fréquent que sous IEC mais possible)','Accumulation possible de bradykinine','Utiliser un inhibiteur calcique ou un diurétique.'],
  [arb,'pathologie','Insuffisance rénale chronique stade 5 (DFG < 15)','relative','Risque d\'hyperkaliémie sévère similaire aux IEC','Réduction de l\'aldostérone et diminution de la filtration glomérulaire','Surveillance renforcée. Éviter l\'association IEC + sartan.'],

  // Bêtabloquants
  [betabloc,'pathologie','Asthme sévère','absolue','CI absolue : bêtabloquants non sélectifs → bronchospasme fatal','Blocage des récepteurs bêta-2 pulmonaires → bronchoconstriction','Utiliser un inhibiteur calcique (amlodipine, diltiazem) ou un IEC.'],
  [betabloc,'pathologie','BPCO sévère (VEMS < 30%)','absolue','CI absolue des bêtabloquants non sélectifs en BPCO sévère','Bronchoconstriction par blocage bêta-2 pulmonaire','Utiliser bisoprolol ou métoprolol (cardiosélectifs) avec surveillance spirométrique. Éviter propranolol.'],
  [betabloc,'pathologie','Bloc auriculo-ventriculaire du 2e ou 3e degré','absolue','CI absolue : bêtabloquants → asystole ou bloc complet en cas de BAV préexistant','Dépression de la conduction nodale AV via blocage bêta-1','Utiliser un inhibiteur calcique DHP (amlodipine) ou un vasodilatateur.'],
  [betabloc,'pathologie','Bradycardie (FC < 50/min)','absolue','CI absolue : bêtabloquants aggravent la bradycardie → arrêt sinusal','Réduction du nœud sinusal par blocage bêta-1','CI absolue. Rechercher et traiter la cause de la bradycardie.'],
  [betabloc,'pathologie','Phéochromocytome non traité','absolue','CI absolue : bêtabloquants seuls provoquent une crise hypertensive paradoxale','Blocage bêta → vasoconstriction alpha-médiée non antagonisée dominante','Utiliser un alpha-bloquant en premier (phentolamine). Jamais de bêtabloquant seul.'],
  [betabloc,'pathologie','Raynaud sévère / AOMI stade 3-4','relative','Aggravation de l\'ischémie périphérique par vasoconstriction alpha-médiée','Blocage bêta-2 → vasoconstriction artériolaire périphérique non contrebalancée','Utiliser inhibiteur calcique (nifédipine). Si bêtabloquant indispensable : métoprolol ou bisoprolol à faible dose.'],
  [betabloc,'pathologie','Diabète insulino-dépendant avec hypoglycémies fréquentes','relative','Masque les signes adrénergiques d\'hypoglycémie (tremblements, tachycardie) ; prolonge l\'hypoglycémie','Blocage bêta-2 → inhibition de la glycogénolyse musculaire et des symptômes sympathiques','Utiliser bisoprolol ou métoprolol (cardiosélectifs). Surveillance glycémique renforcée.'],
  [betabloc,'pathologie','Décompensation cardiaque aiguë','absolue','CI absolue en phase aiguë de décompensation cardiaque','Réduction de l\'inotropisme positif nécessaire à la compensation aiguë','Stabiliser d\'abord (diurétiques, vasodilatateurs). Introduire bêtabloquant à distance à faible dose.'],
  [betabloc,'pathologie','Grossesse (1er trimestre)','relative','Retard de croissance intra-utérin (RCIU) signalé avec certains bêtabloquants','Réduction du débit utérin et bradycardie fœtale','Préférer labétalol ou alpha-méthyldopa. Bisoprolol avec surveillance fœtale.'],

  // Inhibiteurs calciques
  [calcantag,'pathologie','Insuffisance cardiaque systolique sévère (FEVG < 35%)','absolue','CI absolue du vérapamil et diltiazem en IC systolique : effet inotrope négatif','Blocage des canaux calciques cardiaques → réduction de la contractilité myocardique','Utiliser IEC + bêtabloquant + diurétique. Si HTA associée : amlodipine ou félodipine (seuls DHP tolérés).'],
  [calcantag,'pathologie','Bloc auriculo-ventriculaire du 2e ou 3e degré','absolue','CI absolue du vérapamil et diltiazem : dépression supplémentaire de la conduction AV','Bloc des canaux Ca2+ du nœud AV','Utiliser un DHP (amlodipine) si IC non sévère. Exclure formellement vérapamil/diltiazem.'],
  [calcantag,'pathologie','Bradycardie (FC < 50/min)','absolue','CI absolue du vérapamil et diltiazem en cas de bradycardie sévère','Effet chronotrope négatif du vérapamil/diltiazem sur le nœud sinusal','Utiliser amlodipine. Rechercher la cause de la bradycardie.'],
  [calcantag,'pathologie','Syndrome de Wolff-Parkinson-White avec fibrillation auriculaire','absolue','CI absolue du vérapamil et diltiazem : accélération de la conduction accessoire → fibrillation ventriculaire','Blocage du nœud AV → conduction préférentielle via faisceau accessoire rapide','CI absolue et urgence cardiologique. Utiliser procaïnamide ou cardioversion électrique.'],
  [calcantag,'pathologie','Grossesse (1er trimestre)','relative','Données de tératogénicité limitées pour certains ICa ; risque potentiel','Inhibition des canaux calciques essentiels au développement fœtal précoce','Préférer alpha-méthyldopa ou labétalol au 1er trimestre. Nifédipine à partir du 2e trimestre.'],
  [calcantag,'allergie_med','Allergie aux dihydropyridines','absolue','CI absolue : hypersensibilité documentée aux DHP (flush, angio-œdème sévère)','Réaction immunologique aux dihydropyridines','Utiliser vérapamil ou diltiazem si pas de CI cardiaque.'],

  // Diurétiques thiazidiques
  [diurThiaz,'pathologie','Hypokaliémie sévère (K+ < 3,0 mmol/L)','absolue','CI absolue : thiazidiques aggravent l\'hypokaliémie → arythmies ventriculaires','Augmentation de l\'excrétion rénale de potassium','Corriger la kaliémie avant d\'utiliser. Associer un épargneurs potassique.'],
  [diurThiaz,'pathologie','Insuffisance rénale chronique stade 4-5 (DFG < 30)','absolue','Inefficacité clinique et risque d\'acidose hyperchlorémique','Mécanisme d\'action dépendant du débit tubulaire distal (absent si DFG < 30)','Substituer par furosémide ou torsémide (diurétiques de l\'anse actifs jusqu\'au stade 5).'],
  [diurThiaz,'pathologie','Goutte active','relative','Les thiazidiques augmentent l\'uricémie et peuvent déclencher une crise de goutte','Compétition avec l\'élimination tubulaire de l\'acide urique','Utiliser une alternative (IEC, sartan). Si maintenu : traitement prophylactique par allopurinol.'],
  [diurThiaz,'pathologie','Hypercalcémie','relative','Les thiazidiques diminuent l\'excrétion urinaire du calcium et aggravent l\'hypercalcémie','Augmentation de la réabsorption tubulaire du calcium','CI si hypercalcémie ≥ 2,75 mmol/L. Utiliser diurétique de l\'anse.'],
  [diurThiaz,'pathologie','Diabète décompensé','relative','Les thiazidiques aggravent la résistance à l\'insuline et l\'hyperglycémie','Hypokaliémie → inhibition de la sécrétion d\'insuline pancréatique','Surveiller la glycémie. Adapter le traitement antidiabétique. Préférer IEC/sartan.'],
  [diurThiaz,'pathologie','Grossesse (3e trimestre)','relative','Réduction du volume intravasculaire maternel et perfusion placentaire','Diurèse forcée réduisant le volume circulant utérin','Éviter. Préférer labétalol, nifédipine ou alpha-méthyldopa.'],

  // Diurétiques de l'anse
  [diurAnse,'pathologie','Hypokaliémie sévère (K+ < 3,0 mmol/L)','absolue','CI absolue : furosémide aggrave l\'hypokaliémie → torsades de pointes','Perte majeure potassique dans le tube collecteur','Corriger la kaliémie en urgence avant toute administration.'],
  [diurAnse,'pathologie','Hypovolémie sévère','absolue','CI absolue : aggrave l\'hypovolémie et peut provoquer un collapsus circulatoire','Diurèse forcée sur un patient déjà hypovolémique','CI absolue jusqu\'à correction volémique.'],
  [diurAnse,'pathologie','Insuffisance rénale aiguë oligurique (sans hypervolémie)','relative','Aggravation de l\'IRA sans corriger la cause si anurie par nécrose tubulaire','Mécanisme tubulaire absent en NTA avec oligurie fonctionnelle','N\'utiliser que pour mobiliser un œdème. Ne pas forcer la diurèse en IRA tubulopénique.'],
  [diurAnse,'pathologie','Surdité / Hypoacousie préexistante','relative','Ototoxicité irréversible du furosémide, surtout en perfusion IV rapide','Altération de la composition ionique de l\'endolymphe cochléaire','Perfusion IV lente (max 4 mg/min). Préférer la voie orale si possible. Éviter avec aminosides.'],
  [diurAnse,'allergie_med','Allergie aux sulfamides','relative','Réactivité croisée possible entre furosémide (sulfonamide) et sulfamides antibiotiques','Structure sulfonamide commune','Utiliser acide éthacrynique (seul diurétique de l\'anse sans sulfonamide).'],
  [diurAnse,'pathologie','Goutte active','relative','Le furosémide augmente l\'uricémie par compétition tubulaire avec l\'acide urique','Réabsorption compétitive de l\'acide urique dans le TCP','Traitement prophylactique par allopurinol si utilisation prolongée.'],

  // Diurétiques épargneurs
  [diurEparg,'pathologie','Hyperkaliémie (K+ > 5,0 mmol/L)','absolue','CI absolue : épargneurs potassiques aggravent l\'hyperkaliémie → arrêt cardiaque','Inhibition de l\'aldostérone → rétention potassique sévère','Arrêt immédiat. Traiter l\'hyperkaliémie (gluconate de calcium IV, kayexalate).'],
  [diurEparg,'pathologie','Insuffisance rénale chronique stade 4-5 (DFG < 30)','absolue','CI absolue : hyperkaliémie sévère et potentiellement fatale','Accumulation de potassium par perte de l\'excrétion tubulaire résiduelle','CI absolue. Si diurétique épargneur nécessaire : discussion spécialisée avec monitoring bi-hebdomadaire K+.'],
  [diurEparg,'pathologie','Grossesse (toute période)','relative','Risque de féminisation du fœtus masculin (spironolactone antiandrogénique)','Antagonisme des récepteurs androgéniques par la spironolactone','Utiliser amiloride ou triamtérène si épargneurs nécessaires en grossesse.'],
  [diurEparg,'allergie_med','Allergie à la spironolactone','absolue','CI absolue : hypersensibilité documentée à la spironolactone','Réaction immunologique au stéroïde antialdostérone','Utiliser éplérénone (structure différente, allergie croisée rare).'],

  // AOD
  [aod,'pathologie','Hémorragie active','absolue','CI absolue : les AOD aggravent toute hémorragie en cours et peuvent être fataux','Inhibition irréversible de Xa ou IIa → impossible de coaguler normalement','Arrêt immédiat. Utiliser l\'antidote spécifique (andexanet alfa pour anti-Xa, idarucizumab pour dabigatran).'],
  [aod,'pathologie','Insuffisance rénale chronique stade 5 (dialyse)','absolue','CI absolue : accumulation majeure et risque hémorragique imprévisible','Élimination rénale prédominante pour dabigatran (80%) et partiellement pour rivaroxaban/apixaban','Utiliser AVK (INR maintenu 2-3) ou héparine sous-cutanée selon l\'indication.'],
  [aod,'pathologie','Insuffisance hépatique sévère (Child-Pugh C)','absolue','CI absolue : coagulopathie préexistante + accumulation des AOD','Métabolisme hépatique des AOD aggravé par l\'IHC','CI absolue. Les AVK sont aussi CI en IHC sévère. Héparine seule possible.'],
  [aod,'pathologie','Grossesse (toute période)','absolue','CI absolue : passage placentaire des AOD ; risque hémorragique fœtal/néonatal + tératogénicité possible','Passage transplacentaire démontré','Utiliser héparine de bas poids moléculaire (HBPM) pendant toute la grossesse.'],
  [aod,'pathologie','Thrombopénie sévère (plaquettes < 50 G/L)','absolue','CI absolue : risque hémorragique majeur','Synergie thrombopénie + anticoagulation','CI absolue. Discussion spécialisée selon l\'indication (héparine à dose réduite).'],
  [aod,'allergie_med','Allergie aux AOD (rivaroxaban, apixaban, dabigatran)','absolue','CI absolue : hypersensibilité documentée à la molécule','Réaction immunologique','Utiliser AVK ou HBPM.'],

  // AVK
  [avk,'pathologie','Grossesse (1er trimestre)','absolue','CI absolue : embryopathie warfarinique (hypoplasie nasale, chondrodysplasie)','Inhibition de la carboxylation des protéines de la coagulation → perturbation morphogenèse osseuse','Substituer par HBPM dès le désir de grossesse.'],
  [avk,'pathologie','Grossesse (3e trimestre)','absolue','CI absolue : risque hémorragique néonatal (vitamine K non traversante) + hémorragie cérébrale fœtale','AVK traversent le placenta ; fœtus ne peut pas synthétiser facteurs de coagulation','HBPM ou héparine non fractionnée à l\'approche du terme.'],
  [avk,'pathologie','Hémorragie intracrânienne récente (< 3 mois)','absolue','CI absolue : aggravation de l\'hématome et risque d\'expansion fatale','Anticoagulation sur site hémorragique actif','Discussion pluridisciplinaire. HBPM en pont si anticoagulation indispensable après 3 mois.'],
  [avk,'pathologie','Insuffisance hépatique sévère (Child-Pugh C)','absolue','CI absolue : l\'IHC perturbe déjà la synthèse des facteurs de coagulation ; INR instable et dangereux','Déficit constitutif de synthèse hépatique des facteurs K-dépendants','CI absolue. Discuter HBPM prophylactique.'],
  [avk,'allergie_med','Allergie aux coumarines (warfarine, acénocoumarol)','absolue','CI absolue : hypersensibilité documentée aux AVK coumariniques','Réaction immunologique au noyau coumarine','Utiliser la fluindione (AVK non coumarinique) ou HBPM.'],

  // Antiplaquettaires
  [antiplaq,'pathologie','Hémorragie active','absolue','CI absolue : les antiplaquettaires aggravent toute hémorragie active','Inhibition irréversible des plaquettes','Arrêt immédiat. Transfusion plaquettaire en cas d\'hémorragie menaçante.'],
  [antiplaq,'pathologie','Thrombopénie sévère (plaquettes < 50 G/L)','absolue','CI absolue : risque hémorragique majeur avec thrombopénie profonde','Synergie entre thrombopénie et inhibition fonctionnelle des plaquettes restantes','CI absolue. Traitement de la thrombopénie avant toute antiplaquettaire.'],
  [antiplaq,'pathologie','Ulcère gastroduodénal actif (non traité)','relative','Risque de saignement digestif sévère','Inhibition des prostaglandines protectrices de la muqueuse + anti-agrégation','Traitement préalable par IPP (oméprazole). Utiliser avec couverture gastroprotectrice.'],
  [antiplaq,'pathologie','AVC hémorragique récent (< 6 mois)','absolue','CI absolue : risque de récidive hémorragique intracrânienne fatale','Inhibition plaquettaire sur zone cérébrale fragilisée','Délai minimum 6 mois avant réintroduction. Discussion neurologique spécialisée.'],

  // Statines
  [statines,'pathologie','Myopathie / Rhabdomyolyse préexistante','absolue','CI absolue : les statines aggravent la myopathie et peuvent déclencher une rhabdomyolyse fatale','Inhibition de la synthèse du coenzyme Q10 mitochondrial dans les myocytes','CI absolue si CPK > 5N. Utiliser une alternative (fibrates, ézétimibe, bempédoïque).'],
  [statines,'pathologie','Insuffisance hépatique sévère (Child-Pugh C)','absolue','CI absolue : hépatotoxicité des statines en cas d\'IHC préexistante','Accumulation hépatique + toxicité mitochondriale directe','CI absolue. Si hypercholestérolémie à traiter : ézétimibe ou bempédoïque.'],
  [statines,'pathologie','Grossesse (toute période)','absolue','CI absolue : inhibition de la synthèse du cholestérol essentiel au développement fœtal','Blocage de la voie du mévalonate nécessaire à la synthèse des stéroïdes et membranes fœtaux','Arrêter la statine avant la conception ou dès confirmation de grossesse.'],
  [statines,'allergie_med','Allergie aux statines','absolue','CI absolue : hypersensibilité documentée aux statines (éruption, myosite allergique)','Réaction immunologique aux statines','Utiliser ézétimibe, résines ou bempédoïque selon le profil.'],
  [statines,'pathologie','Allaitement','absolue','Les statines passent dans le lait maternel et inhibent la synthèse lipidique chez le nourrisson','Passage dans le lait maternel avec inhibition des enzymes HMG-CoA','Arrêter pendant l\'allaitement. Reprendre après sevrage.'],

  // Antiarythmiques
  [antiarryt,'pathologie','Allongement du QT (QTc > 450 ms)','absolue','CI absolue : antiarythmiques de classe I et III allongent le QT → torsades de pointes','Blocage IKr (hERG) → prolongation de la repolarisation ventriculaire','Utiliser des antiarythmiques sans effet sur le QT ou traitement non pharmacologique (ablation).'],
  [antiarryt,'pathologie','Dysfonction sinusale / Maladie du sinus','absolue','CI absolue : antiarythmiques dépriment le nœud sinusal → asystolie','Inhibition de l\'automatisme sinusal par blocage des canaux sodiques/calciques','CI absolue sans pace-maker. Implanter un pace-maker avant toute antiarythmique.'],
  [antiarryt,'pathologie','Bloc auriculo-ventriculaire du 2e ou 3e degré','absolue','CI absolue : aggravation du bloc et risque d\'asystole ventriculaire','Dépression de la conduction AV par les antiarythmiques de classe I, II, III, IV','CI absolue sans stimulateur cardiaque.'],
  [antiarryt,'pathologie','Insuffisance cardiaque systolique sévère (FEVG < 35%)','relative','Les antiarythmiques de classe I et III ont un effet inotrope négatif','Blocage des canaux sodiques et calciques → réduction de la contractilité','Seuls l\'amiodarone et la dofétilide sont tolérés en IC systolique sévère.'],
  [antiarryt,'pathologie','Hypothyroïdie sévère / Hyperthyroïdie','relative','L\'amiodarone contient 37% d\'iode et peut précipiter ou aggraver les dysfonctions thyroïdiennes','Surcharge iodée → hypothyroïdie ou thyrotoxicose amiodarone-induite','Bilan thyroïdien avant traitement puis tous les 6 mois. CI si thyroïdite active.'],

  // Dérivés nitrés
  [nitres,'pathologie','Hypotension artérielle (TAS < 90 mmHg)','absolue','CI absolue : les dérivés nitrés aggravent l\'hypotension → collapsus circulatoire','Vasodilatation veinoartérielle sur fond d\'hypovolémie/hypotension','Remplissage vasculaire d\'abord. Utiliser dobutamine si besoin vasopresseur.'],
  [nitres,'pathologie','Infarctus du ventricule droit','absolue','CI absolue : les dérivés nitrés provoquent un effondrement du débit cardiaque droit','Réduction de la précharge VD déjà insuffisante en cas d\'IDM VD','Traitement : remplissage + dobutamine. CI absolue aux dérivés nitrés.'],
  [nitres,'pathologie','Cardiomyopathie obstructive (CMHO)','absolue','CI absolue : la vasodilatation aggrave l\'obstruction dynamique sous-aortique','Réduction de la précharge et des résistances vasculaires → augmentation du gradient CMHO','CI absolue. Utiliser bêtabloquant ou vérapamil (inhibiteur calcique non DHP).'],
  [nitres,'pathologie','Rétrécissement aortique serré','relative','Risque de collapsus hémodynamique par vasodilatation en contexte de débit fixe','Impossibilité d\'augmenter le débit face à la chute des résistances','Utiliser avec grande précaution et en milieu surveillé.'],
  [nitres,'allergie_med','Prise d\'inhibiteurs de la PDE5 (sildénafil, tadalafil)','absolue','CI absolue : potentialisation catastrophique de l\'effet hypotenseur → choc cardiogénique','Synergie des deux voies de vasodilatation NO-dépendante (GMPc)','CI absolue dans les 24-48h suivant la prise de sildénafil/vardénafil (72h pour tadalafil).'],
];

// ─── SYSTÈME NERVEUX CENTRAL ─────────────────────────────────────────────────
const isrs        = 'fluoxétine|sertraline|paroxétine|citalopram|escitalopram|fluvoxamine';
const irsn        = 'venlafaxine|duloxétine|milnacipran|désvenlafaxine|lévomilnacipran';
const tricycliq   = 'amitriptyline|imipramine|clomipramine|nortriptyline|désipramine|trimipramine|doxépine';
const imao        = 'phénelzine|tranylcypromine|moclobémide|sélégiline|rasagiline|isocarboxazide';
const antipsycho  = 'halopéridol|chlorpromazine|rispéridone|olanzapine|quétiapine|aripiprazole|clozapine|ziprasidone|amisulpride|palipéridone|lurasidone';
const benzo       = 'diazépam|lorazépam|alprazolam|clonazépam|midazolam|témazépam|oxazépam|triazolam|flunitrazépam|nitrazépam';
const antiepilept = 'phénytoïne|carbamazépine|valproate|lamotrigine|lévétiracétam|topiramate|gabapentine|prégabaline|oxcarbazépine|phénobarbital|zonisamide';
const opioides    = 'morphine|codéine|tramadol|oxycodone|fentanyl|buprénorphine|méthadone|hydromorphone|tapentadol|oxymorphone';

const sncCombos = [
  // ISRS
  [isrs,'pathologie','Prise d\'IMAO (dans les 14 jours)','absolue','CI absolue : syndrome sérotoninergique potentiellement fatal (hyperthermie, rigidité, convulsions)','Accumulation massive de sérotonine synaptique par double blocage de la recapture et de la dégradation','Délai obligatoire de 14 jours entre IMAO et ISRS (21 jours pour fluoxétine en raison de sa longue demi-vie).'],
  [isrs,'pathologie','Allongement du QT (QTc > 450 ms)','absolue','CI absolue du citalopram et escitalopram : allongement QT dose-dépendant et torsades de pointes','Blocage des canaux IKr par le citalopram/escitalopram','Utiliser sertraline ou mirtazapine en cas de QT long.'],
  [isrs,'pathologie','Trouble bipolaire non traité','relative','Les ISRS peuvent précipiter un virage maniaque ou induire un état mixte','Augmentation dopaminergique et sérotoninergique désinhibée sans protection thymorégulante','Toujours associer à un thymorégulateur (lithium, valproate). Surveillance clinique rapprochée.'],
  [isrs,'pathologie','Grossesse (3e trimestre)','relative','Syndrome de sevrage néonatal (irritabilité, tremblements, troubles respiratoires) — pas tératogène','Exposition du nouveau-né aux ISRS in utero avec syndrome de retrait à la naissance','Décision individualisée. Si maintenu : préférer sertraline. Informer maternité.'],
  [isrs,'pathologie','Ulcère gastroduodénal actif (non traité)','relative','Les ISRS augmentent le risque de saignement gastroduodénal par inhibition de la sérotonine plaquettaire','Déplétion sérotoninergique plaquettaire → altération de l\'agrégation plaquettaire','Associer un IPP (oméprazole). Éviter association avec AINS.'],
  [isrs,'pathologie','Épilepsie non contrôlée','relative','Risque de diminution du seuil épileptogène aux fortes doses d\'ISRS','Modification des neurotransmetteurs impliqués dans le contrôle épileptique','Utiliser avec précaution. Sertraline ou citalopram moins épileptogènes que clomipramine.'],
  [isrs,'pathologie','Insuffisance hépatique sévère (Child-Pugh C)','relative','Accumulation importante des ISRS (métabolisme hépatique CYP2D6/3A4)','Réduction du métabolisme hépatique de premier passage','Réduire la dose de 50%. Préférer sertraline (moins d\'interactions CYP).'],
  [isrs,'pathologie','Glaucome à angle fermé','absolue','CI absolue de la paroxétine en glaucome à angle fermé : crise aiguë de glaucome','Effet anticholinergique de la paroxétine → mydriase et blocage de l\'humeur aqueuse','Utiliser sertraline ou citalopram (moins anticholinergiques). Ophtalmologiste obligatoire.'],

  // IRSN
  [irsn,'pathologie','Prise d\'IMAO (dans les 14 jours)','absolue','CI absolue : syndrome sérotoninergique sévère ou fatal','Inhibition double de la recapture 5-HT et NA + IMAO = accumulation massive','Délai obligatoire de 14 jours. 5 demi-vies après arrêt de l\'IRSN avant introduction d\'IMAO.'],
  [irsn,'pathologie','Hypertension artérielle non contrôlée','relative','La venlafaxine à forte dose augmente la PA systolique par effet noradrénergique','Activation du tonus sympathique par augmentation de la noradrénaline synaptique','Surveiller PA hebdomadairement à l\'initiation. Réduire la dose si PA augmente.'],
  [irsn,'pathologie','Glaucome à angle fermé','relative','Risque de crise aiguë de glaucome par mydriase sympathomimétique (venlafaxine)','Activation adrénergique → mydriase et augmentation de la pression intraoculaire','Bilan ophtalmologique préalable. Utiliser ISRS si glaucome connu.'],
  [irsn,'pathologie','Insuffisance rénale chronique stade 4-5','relative','Accumulation des métabolites actifs (désvenlafaxine surtout à élimination rénale)','Réduction de l\'excrétion rénale des métabolites actifs','Réduire la dose. Duloxétine CI si DFG < 30 mL/min.'],
  [irsn,'pathologie','Trouble bipolaire non traité','relative','Risque de virage maniaque identique aux ISRS','Stimulation sérotoninergique et noradrénergique','Associer obligatoirement à un thymorégulateur.'],
  [irsn,'pathologie','Grossesse (3e trimestre)','relative','Syndrome de sevrage néonatal (irritabilité, cri aigu, hypertonicité)','Imprégnation sérotoninergique et noradrénergique du nouveau-né','Information pédiatrique en amont de l\'accouchement. Si arrêt envisagé : sevrage progressif dès 36 SA.'],

  // Tricycliques
  [tricycliq,'pathologie','Infarctus du myocarde récent (< 3 mois)','absolue','CI absolue : les ATC sont arythmogènes et peuvent déclencher des arythmies ventriculaires mortelles en post-IDM','Blocage des canaux sodiques cardiaques (effet quinidine-like)','Utiliser ISRS ou mirtazapine. Délai de 3 mois minimum post-IDM avant toute ATC.'],
  [tricycliq,'pathologie','Allongement du QT (QTc > 450 ms)','absolue','CI absolue : les ATC allongent le QT et causent des torsades de pointes','Blocage des canaux IKr + sodiques + calciques cardiaques','Utiliser ISRS ou mirtazapine.'],
  [tricycliq,'pathologie','Glaucome à angle fermé','absolue','CI absolue : effet anticholinergique puissant → crise aiguë de glaucome par bloc pupillaire','Blocage des récepteurs muscariniques → mydriase + blocage de l\'humeur aqueuse','CI absolue. ISRS ou IRSN.'],
  [tricycliq,'pathologie','Rétention urinaire / HBP symptomatique','absolue','CI absolue : blocage anticholinergique → rétention urinaire aiguë en cas d\'HBP sous-vésicale','Inhibition du tonus du détrusor et augmentation du tonus sphinctérien','CI absolue. Utiliser ISRS.'],
  [tricycliq,'pathologie','Épilepsie non contrôlée','relative','Les ATC abaissent significativement le seuil épileptogène (surtout clomipramine, maprotiline)','Blocage des canaux sodiques + anticholinergique + sérotoninergique → excitabilité neuronale','Utiliser ISRS ou IRSN avec surveillance EEG. Renforcer le traitement antiépileptique.'],
  [tricycliq,'pathologie','Prise d\'IMAO (dans les 14 jours)','absolue','CI absolue : syndrome sérotoninergique + effets adrénergiques → crise hypertensive mortelle','Inhibition de la dégradation des neurotransmetteurs + blocage de la recapture','Délai obligatoire de 14 jours.'],
  [tricycliq,'pathologie','Insuffisance hépatique sévère (Child-Pugh C)','relative','Accumulation importante des ATC (métabolisme hépatique extensif)','Hydroxylation hépatique très réduite en IHC','Contre-indication relative. Si indispensable : doses réduites et monitoring des taux plasmatiques.'],
  [tricycliq,'pathologie','Sujet âgé > 75 ans','relative','Risque anticholinergique majeur : confusion, chutes, rétention urinaire, arythmies','Sensibilité accrue aux effets anticholinergiques avec l\'âge','CI relative selon liste de Beers. Utiliser ISRS ou mirtazapine.'],

  // IMAO
  [imao,'pathologie','Phéochromocytome','absolue','CI absolue : crise hypertensive catécholaminergique fulminante','Accumulation de catécholamines par inhibition de la MAO','CI absolue et urgence chirurgicale.'],
  [imao,'pathologie','Alcoolisme actif','absolue','CI absolue : interaction alcool-IMAO → crise hypertensive, hyperpyrexie','Inhibition de la MAO impliquée dans le métabolisme de l\'alcool et tyramine','CI absolue. Régime tyramine strict obligatoire.'],
  [imao,'pathologie','Prise de médicaments sérotoninergiques','absolue','CI absolue : syndrome sérotoninergique si association avec tout médicament sérotoninergique','Inhibition de la dégradation de la sérotonine + tout autre source de sérotonine','Délai de 14 jours minimum avant et après arrêt IMAO.'],
  [imao,'pathologie','AVC récent (< 6 mois)','absolue','CI absolue : les IMAO déstabilisent la pression artérielle (crises hypertensives tyramine-dépendantes)','Inhibition de la MAO intestinale et hépatique → absorption tyramine alimentaire','CI absolue. Utiliser sertraline ou mirtazapine.'],
  [imao,'pathologie','Hyperthyroïdie','absolue','CI absolue : les IMAO augmentent la sensibilité aux catécholamines déjà augmentée par l\'hyperthyroïdie','Potentialisation des effets sympathomimétiques','Traiter l\'hyperthyroïdie en priorité.'],

  // Antipsychotiques
  [antipsycho,'pathologie','Allongement du QT (QTc > 450 ms)','absolue','CI absolue : halopéridol, quétiapine, ziprasidone → torsades de pointes','Blocage IKr → prolongation QT','Utiliser aripiprazole (risque QT minime) ou clozapine si résistant.'],
  [antipsycho,'pathologie','Maladie de Parkinson','absolue','CI absolue de la majorité des antipsychotiques : aggravation dramatique du syndrome parkinsonien','Blocage dopaminergique D2 nigrostrié','Utiliser uniquement clozapine ou quétiapine à faible dose en cas de psychose parkinsonienne.'],
  [antipsycho,'pathologie','Démence à corps de Lewy','absolue','CI absolue : neuroleptiques → aggravation irréversible et mortalité multipliée par 2','Hypersensibilité dopaminergique extrême dans la démence à corps de Lewy','CI absolue de tous les neuroleptiques sauf clozapine à très faible dose.'],
  [antipsycho,'pathologie','Épilepsie non contrôlée','relative','Abaissement du seuil épileptogène, particulièrement avec la clozapine et la chlorpromazine','Blocage des canaux GABAergiques et dopaminergiques','Utiliser aripiprazole ou halopéridol (moins épileptogènes). Renforcer antiépileptiques.'],
  [antipsycho,'pathologie','Grossesse (1er trimestre)','relative','Risque malformatif faible mais documenté pour certains antipsychotiques (phénothiazines)','Passage placentaire avec effets tératogènes potentiels','Décision en concertation psychiatrique. Si maintenu : éviter phénothiazines. Surveiller glycémie néonatale.'],
  [antipsycho,'pathologie','Diabète décompensé','relative','Les antipsychotiques (clozapine, olanzapine) aggravent la résistance à l\'insuline','Blocage histaminergique H1 et muscarinoïde + stimulation de la prise alimentaire','Surveiller glycémie HbA1c. Préférer aripiprazole ou ziprasidone (moins métaboliques).'],
  [antipsycho,'pathologie','Obésité morbide (IMC > 40)','relative','Aggravation de l\'obésité et du syndrome métabolique sous olanzapine et clozapine','Antagonisme H1 → hyperphagie + perturbations métaboliques','Préférer aripiprazole, lurasidone ou ziprasidone (profil métabolique favorable).'],
  [antipsycho,'pathologie','Insuffisance hépatique sévère (Child-Pugh C)','relative','Accumulation importante (métabolisme hépatique extensif des antipsychotiques)','Réduction du CYP1A2 et CYP3A4 hépatiques','Réduire les doses de 50%. Éviter clozapine en IHC.'],

  // Benzodiazépines
  [benzo,'pathologie','Insuffisance respiratoire sévère (SpO2 < 90%)','absolue','CI absolue : les BZD dépressent le centre respiratoire → arrêt respiratoire','Potentialisation du GABA sur les neurones respiratoires du tronc cérébral','CI absolue. Anxiolyse possible par hydroxyzine ou neuroleptique à faible dose.'],
  [benzo,'pathologie','Syndrome d\'apnées du sommeil non traité','absolue','CI absolue : les BZD aggravent les apnées obstructives et centrales → hypoxémie nocturne','Relaxation musculaire et dépression des centres respiratoires','CI absolue. Traitement SAOS (PPC) obligatoire avant tout hypnotique.'],
  [benzo,'pathologie','Myasthénie grave','absolue','CI absolue : les BZD provoquent une paralysie respiratoire en myasthénie','Relaxation musculaire centrale + inhibition de la jonction neuromusculaire','CI absolue. Utiliser un antihistaminique (diphénhydramine) ou hydroxyzine à très faible dose.'],
  [benzo,'pathologie','Insuffisance hépatique sévère (Child-Pugh C)','relative','Accumulation des BZD hépatométabolisées (diazépam) → encéphalopathie hépatique','Réduction du métabolisme hépatique CYP2C19 et CYP3A4','Utiliser oxazépam, lorazépam ou témazépam (glucuroconjugaison directe sans CYP).'],
  [benzo,'pathologie','Alcoolisme actif / Dépendance aux sédatifs','relative','Risque de dépendance croisée et de syndrome de sevrage sévère','Effets sur les mêmes récepteurs GABA-A que l\'alcool','Utiliser uniquement pour sevrage alcoolique supervisé. Arrêt progressif obligatoire.'],
  [benzo,'pathologie','Grossesse (1er trimestre)','relative','Fente palatine décrite en cas d\'exposition prolongée au diazépam au 1er trimestre (controverse)','Passage placentaire important dès les premières semaines','Décision individualisée. Si indispensable : lorazépam à la dose minimale efficace.'],
  [benzo,'pathologie','Grossesse (3e trimestre)','relative','Syndrome du bébé flasque (hypotonie, hypothermie, apnées) si BZD proche du terme','Accumulation néonatale par métabolisme immature','Arrêt progressif dès 36 SA. Informer le pédiatre.'],
  [benzo,'pathologie','Sujet âgé > 75 ans','relative','Risque élevé de chutes, confusion, accident de voiture chez le sujet âgé','Demi-vie prolongée + sensibilité accrue des récepteurs + accumulation','CI relative (liste Beers). Utiliser hydroxyzine ou mélatonine. Si indispensable : lorazépam à dose réduite.'],

  // Antiépileptiques
  [antiepilept,'pathologie','Grossesse (1er trimestre)','absolue','CI absolue du valproate : tératogène majeur (spina bifida, malformations cardiaques, autisme)','Inhibition de la histone désacétylase → perturbation de l\'expression génique fœtale','CI absolue du valproate en femme en âge de procréer sans contraception efficace documentée. Substituer par lamotrigine ou lévétiracétam.'],
  [antiepilept,'pathologie','Insuffisance hépatique sévère (Child-Pugh C)','absolue','CI absolue du valproate et de la carbamazépine en IHC sévère : hépatotoxicité fatale','Métabolisme hépatique + toxicité mitochondriale directe','Utiliser lévétiracétam (élimination rénale) ou gabapentine.'],
  [antiepilept,'pathologie','Porphyrie','absolue','Carbamazépine, phénytoïne, phénobarbital et valproate sont porphyrinogènes','Induction des enzymes de synthèse de l\'hème','Utiliser lévétiracétam, lacosamide ou gabapentine (non porphyrinogènes).'],
  [antiepilept,'pathologie','Bloc auriculo-ventriculaire du 2e ou 3e degré','absolue','CI absolue de la carbamazépine : décompensation du BAV et asystole','Blocage des canaux sodiques cardiaques (effet stabilisant de membrane)','Utiliser lévétiracétam ou lamotrigine. ECG obligatoire avant carbamazépine.'],
  [antiepilept,'pathologie','Insuffisance rénale chronique stade 4-5','relative','Accumulation de la gabapentine, prégabaline et lévétiracétam (élimination rénale)','Excrétion rénale exclusive pour certains antiépileptiques','Adapter la dose au DFG. Gabapentine : dose divisée selon le DFG.'],
  [antiepilept,'pathologie','Thrombopénie sévère (plaquettes < 50 G/L)','relative','Le valproate inhibe l\'agrégation plaquettaire et peut causer une thrombopénie dose-dépendante','Inhibition de la phospholipase et de l\'activité plaquettaire + myélosuppression','Surveiller NFS mensuelle. Réduire ou substituer si thrombopénie aggravée.'],
  [antiepilept,'pathologie','Allaitement','relative','Passage variable dans le lait maternel ; phénobarbital sédatif néonatal','Excrétion dans le lait (variable selon la molécule)','Éviter phénobarbital et éthosuximide en allaitement. Lévétiracétam et lamotrigine acceptables avec surveillance.'],

  // Opioïdes
  [opioides,'pathologie','Insuffisance respiratoire sévère (SpO2 < 90%)','absolue','CI absolue : les opioïdes dépriment irrémédiablement le centre respiratoire','Agonisme sur les récepteurs mu médullaires → réduction de la sensibilité au CO2','CI absolue. Traiter la douleur par AINS, paracétamol, anesthésiques locaux.'],
  [opioides,'pathologie','Syndrome d\'apnées du sommeil non traité','absolue','CI absolue : aggravation des apnées centrales et obstructives → décès nocturne','Dépression respiratoire centrale et relaxation des VAS","Traitement SAOS (PPC) obligatoire. Utiliser analgésiques non opioïdes.'],
  [opioides,'pathologie','Iléus paralytique','absolue','CI absolue : les opioïdes aggravent l\'iléus par inhibition de la motilité intestinale','Agonisme mu entéral → réduction du péristaltisme et augmentation du tonus sphinctérien','CI absolue. Utiliser paracétamol IV et AINS si toléré.'],
  [opioides,'pathologie','Traumatisme crânien grave (HTIC)','relative','Les opioïdes augmentent la PaCO2 (dépression respiratoire) → vasodilatation cérébrale et HTIC','Hypoventilation → hypercapnie → vasodilatation cérébrale → HTIC','Utiliser uniquement sous ventilation mécanique contrôlée avec capnométrie.'],
  [opioides,'pathologie','Insuffisance hépatique sévère (Child-Pugh C)','relative','Accumulation des opioïdes et de leurs métabolites actifs (morphine-6-glucuronide)','Réduction du métabolisme hépatique de premier passage + accumulation des métabolites','Réduire les doses de 50%. Espacer les administrations. Buprénorphine : hépatotoxicité propre en IHC.'],
  [opioides,'pathologie','Allaitement','relative','Passage dans le lait maternel → sédation et dépression respiratoire néonatale','Transfert lacté des opioïdes et métabolites','Utiliser paracétamol ou ibuprofène à faible dose. Si opioïde indispensable : morphine à dose minimale avec surveillance nourrisson.'],
  [opioides,'pathologie','Dépendance aux opioïdes (en sevrage)','relative','Risque de réactivation de la dépendance et de rechute','Agonisme mu renforçant les circuits de récompense','Préférer prégabaline, AINS, paracétamol. Si opioïde indispensable : accords spécialisés (CSAPA).'],
  [opioides,'pathologie','Insuffisance rénale chronique stade 4-5','relative','Accumulation des métabolites actifs (morphine-6-glucuronide) → toxicité prolongée','Élimination rénale des métabolites glucuronidés','Préférer fentanyl (métabolites inactifs) ou hydromorphone. Réduire la dose. Espacer les prises.'],
];

// ─── ENDOCRINOLOGIE ──────────────────────────────────────────────────────────
const metformine  = 'metformine';
const sulfonylu   = 'glibenclamide|gliclazide|glipizide|glimépiride|gliquidone';
const glinides    = 'répaglinide|natéglinide';
const glitazones  = 'pioglitazone|rosiglitazone';
const idpp4       = 'sitagliptine|linagliptine|saxagliptine|alogliptine|vildagliptine';
const isglt2      = 'empagliflozine|dapagliflozine|canagliflozine|ertugliflozine';
const insulines   = 'insuline|insuline glargine|insuline dégludec|insuline lispro|insuline asparte|insuline NPH';
const corticoides = 'prednisolone|prednisone|méthylprednisolone|dexaméthasone|bétaméthasone|hydrocortisone|fludrocortisone|triamcinolone';
const levothyrox  = 'lévothyroxine|liothyronine';
const contracepti = 'éthinylestradiol|lévonorgestrel|désogestrel|gestodène|norgestimate|drospirénone|ulipristal';

const endoCombos = [
  // Metformine
  [metformine,'pathologie','Insuffisance rénale chronique stade 3b-5 (DFG < 45)','absolue','CI absolue : accumulation de metformine → acidose lactique potentiellement mortelle','Accumulation de metformine par élimination rénale réduite → acidose lactique par inhibition de la chaîne respiratoire mitochondriale','Arrêter si DFG < 30 mL/min (CI absolue). Réduire dose si DFG 30-45. Substituer par iDPP4 ou insuline.'],
  [metformine,'pathologie','Insuffisance hépatique sévère (Child-Pugh C)','absolue','CI absolue : IHC prédispose à l\'acidose lactique (réduction de la clairance hépatique du lactate)','Altération du métabolisme hépatique du lactate','CI absolue. Utiliser répaglinide, iDPP4 ou insuline.'],
  [metformine,'pathologie','Insuffisance cardiaque décompensée (NYHA III-IV)','absolue','CI absolue : hypoperfusion rénale → accumulation metformine → acidose lactique','Réduction du débit rénal et hépatique en IC décompensée','Arrêter en décompensation. Substituer par insuline.'],
  [metformine,'pathologie','Alcoolisme actif','absolue','CI absolue : l\'alcool augmente le risque d\'acidose lactique sous metformine','Inhibition du métabolisme mitochondrial du lactate par l\'alcool + metformine','CI absolue pendant consommation régulière d\'alcool.'],
  [metformine,'pathologie','Injection de produit de contraste iodé','absolue','CI absolue avant injection IV de PC iodé : risque d\'IRA contrastée → accumulation metformine → acidose lactique','Néphrotoxicité des PC iodés → accumulation aiguë de metformine','Arrêter 48h avant l\'injection et reprendre 48h après si créatinine normale.'],
  [metformine,'pathologie','Grossesse (toute période)','relative','La metformine traverse le placenta (taux fœtaux = taux maternels)','Passage placentaire complet avec effets métaboliques fœtaux','Acceptée en grossesse selon certaines recommandations mais insuline reste le standard. Concertation diabétologique.'],

  // Sulfonylurées
  [sulfonylu,'pathologie','Insuffisance rénale chronique stade 4-5','absolue','CI absolue : accumulation des métabolites actifs → hypoglycémies prolongées et sévères','Élimination rénale des molécules et métabolites actifs (surtout glibenclamide)','Utiliser gliclazide (métabolites inactifs) avec précaution si DFG 30-45. CI absolue si DFG < 30. Substituer par répaglinide ou insuline.'],
  [sulfonylu,'pathologie','Insuffisance hépatique sévère (Child-Pugh C)','absolue','CI absolue : accumulation des sulfonylurées → hypoglycémies sévères et prolongées','Métabolisme hépatique réduit + réduction de la néoglucogenèse hépatique','CI absolue. Utiliser insuline.'],
  [sulfonylu,'pathologie','Alcoolisme actif','relative','Potentialisation de l\'effet hypoglycémiant + effet antabuse possible (surtout glibenclamide)','Alcool inhibe la néoglucogenèse hépatique + interaction avec les sulfamides','Contre-indication relative. Surveiller glycémie et arrêt de l\'alcool requis.'],
  [sulfonylu,'pathologie','Déficit en G6PD','relative','Risque d\'anémie hémolytique avec certaines sulfonylurées (glibenclamide)','Stress oxydatif érythrocytaire chez les patients G6PD déficients','Utiliser gliclazide ou glipizide (moins oxidants).'],
  [sulfonylu,'allergie_med','Allergie aux sulfamides','relative','Réactivité croisée possible sulfonylurées-sulfamides antibiotiques','Structure sulfamide commune au noyau sulfonylurée','Utiliser un antidiabétique d\'une autre classe si allergie documentée.'],

  // iSGLT2
  [isglt2,'pathologie','Insuffisance rénale chronique stade 4-5 (DFG < 30)','absolue','CI absolue : perte d\'efficacité (mécanisme glucosurique dépendant de la filtration) + risque d\'IRA','Mécanisme d\'action SGLT2 dépendant du DFG : inefficace si DFG < 30 + déshydratation toxique','CI absolue si DFG < 30 (dapagliflozine et empagliflozine). Utiliser iDPP4 ou insuline.'],
  [isglt2,'pathologie','Diabète de type 1','absolue','CI absolue : risque d\'acidocétose diabétique euglycémique (normoglycémique) parfois mortelle','Augmentation des corps cétoniques indépendamment de la glycémie','CI absolue en DT1. Utiliser insuline exclusivement.'],
  [isglt2,'pathologie','Insuffisance cardiaque décompensée (NYHA IV)','relative','Risque de déshydratation sévère et de chute du débit cardiaque','Effet natriurétique et diurétique osmotique','Initier uniquement en IC stable. CI en décompensation aiguë.'],
  [isglt2,'pathologie','Infections urinaires récurrentes (> 3/an)','relative','Les iSGLT2 favorisent la glucosurie et prédisposent aux infections urinaires et génitales','Glycosurie → milieu favorable à la prolifération bactérienne et fongique','Surveiller. Traiter les infections. Réévaluer si infections récurrentes malgré traitement.'],
  [isglt2,'pathologie','Grossesse (toute période)','absolue','CI absolue : effets néphrotoxiques fœtaux et toxicité rénale néonatale','Passage placentaire avec effet sur les reins fœtaux en développement','CI absolue. Utiliser insuline.'],
  [isglt2,'pathologie','Amputation des membres (ATCD)','relative','La canagliflozine a été associée à une augmentation du risque d\'amputation des membres','Mécanisme vasculaire complexe (réduction du volume intravasculaire + effets vasculaires directs)','Utiliser empagliflozine ou dapagliflozine plutôt que canagliflozine. Surveillance vasculaire rigoureuse.'],

  // Corticoïdes
  [corticoides,'pathologie','Diabète décompensé','relative','Les corticoïdes aggravent l\'hyperglycémie de façon dose-dépendante','Inhibition de l\'insulinosécrétion + augmentation de la résistance à l\'insuline + néoglucogenèse accrue','Surveillance glycémique renforcée. Adapter le traitement antidiabétique. Éviter si DT1 déséquilibré.'],
  [corticoides,'pathologie','Hypertension artérielle non contrôlée','relative','Les corticoïdes augmentent la pression artérielle (rétention hydrosodée)','Activation des récepteurs minéralocorticoïdes → rétention Na+ et eau','Surveiller PA. Réduire le sel alimentaire. Adapter les antihypertenseurs.'],
  [corticoides,'pathologie','Infection active non traitée (tuberculose, sepsis fongique)','absolue','CI absolue : les corticoïdes suppriment l\'immunité et favorisent la dissémination','Immunosuppression cellulaire et humorale','Traiter l\'infection 2 semaines avant la corticothérapie.'],
  [corticoides,'pathologie','Ostéoporose sévère (T-score < -3)','relative','CI relative : les corticoïdes aggravent l\'ostéoporose et le risque fracturaire','Inhibition des ostéoblastes + augmentation des ostéoclastes + réduction de l\'absorption intestinale du Ca2+','Biphosphonate prophylactique obligatoire. Calcium + vitamine D. Durée minimale de traitement.'],
  [corticoides,'pathologie','Ulcère gastroduodénal actif (non traité)','relative','Risque d\'hémorragie digestive par diminution du mucus gastrique','Inhibition des prostaglandines protectrices de la muqueuse','Associer IPP systématiquement. Éradiquer H. pylori avant si présent.'],
  [corticoides,'pathologie','Glaucome','relative','Les corticoïdes augmentent la pression intraoculaire et peuvent aggraver un glaucome','Réduction de l\'évacuation de l\'humeur aqueuse par modification du trabéculum','Bilan ophtalmologique avant corticothérapie prolongée. Surveillance PIO mensuelle.'],
  [corticoides,'pathologie','Psychose / Trouble bipolaire','relative','Les corticoïdes peuvent déclencher des états psychotiques ou maniaques','Effets sur le système limbique et les récepteurs aux glucocorticoïdes cérébraux','Surveillance psychiatrique. Éviter si ATCD de psychose cortico-induite.'],
  [corticoides,'pathologie','Grossesse (1er trimestre)','relative','Légère augmentation du risque de fente palatine avec les corticoïdes systémiques','Passage placentaire partiel (prednisone/prednisolone principalement sous forme inactive)','Si indispensable : prednisolone (peu métabolisée dans le placenta). Éviter triamcinolone et dexaméthasone.'],
  [corticoides,'pathologie','Insuffisance surrénale (arrêt brusque)','absolue','CI absolue de l\'arrêt brutal : crise addisonnienne potentiellement mortelle','Suppression de l\'axe hypothalamo-hypophyso-surrénalien','Décroissance progressive obligatoire. Jamais d\'arrêt brutal après > 3 semaines de traitement.'],
  [corticoides,'pathologie','Varicelle / Herpès actif','absolue','CI absolue : dissémination virale sous immunosuppression corticoïde','Immunosuppression avec perte du contrôle viral par les lymphocytes T cytotoxiques','Traitement antiviral (aciclovir) obligatoire avant ou simultanément. Vaccin varicelle CI si cortico > 10mg/j.'],

  // Lévothyroxine
  [levothyrox,'pathologie','Infarctus du myocarde récent (< 3 mois)','absolue','CI absolue : la lévothyroxine augmente la demande en oxygène du myocarde ischémié','Effet inotrope et chronotrope positif thyroïdien sur myocarde déjà ischémié','CI absolue en phase aiguë. Initier à très faible dose après stabilisation coronarienne.'],
  [levothyrox,'pathologie','Thyrotoxicose non traitée','absolue','CI absolue : aggravation de la thyrotoxicose et risque de crise thyréotoxique','Addition des effets thyroïdiens','Traiter d\'abord la thyrotoxicose (antithyroïdiens de synthèse).'],
  [levothyrox,'pathologie','Insuffisance surrénale non substituée','absolue','CI absolue : la lévothyroxine accélère le catabolisme des glucocorticoïdes et peut précipiter une crise addisonnienne','Augmentation du catabolisme des corticoïdes endogènes par la T3/T4','Traiter l\'insuffisance surrénale avant d\'initier la lévothyroxine.'],
  [levothyrox,'pathologie','Trouble du rythme non contrôlé (FA, flutter)','relative','La lévothyroxine aggrave les arythmies supraventriculaires','Effet chronotrope positif de la T3 sur le nœud sinusal et l\'oreillette','Contrôler le rythme avant et pendant le traitement.'],

  // Contraceptifs hormonaux
  [contracepti,'pathologie','Antécédent de thrombose veineuse profonde','absolue','CI absolue : les estroprogestatifs multiplient le risque de TVP/EP par 3–4 fois','Augmentation des facteurs de coagulation II, VII, X + résistance à la protéine C activée','Utiliser microprogestatif seul (désogestrel 75µg) ou DIU hormonal. Anticoagulation si récidive.'],
  [contracepti,'pathologie','Migraine avec aura','absolue','CI absolue : les estroprogestatifs multiplient par 4 le risque d\'AVC chez les migraineuses avec aura','Vasoconstriction et hypercoagulabilité en présence d\'une vulnérabilité vasculaire cérébrale','Utiliser microprogestatif seul ou DIU.'],
  [contracepti,'pathologie','Hypertension artérielle non contrôlée','absolue','CI absolue : les estrogènes aggravent l\'HTA et le risque cardiovasculaire','Activation du SRA par les estrogènes → rétention sodée','Utiliser microprogestatif seul (pas d\'effet tensionnel).'],
  [contracepti,'pathologie','Hépatite virale active (B ou C)','absolue','CI absolue : les estroprogestatifs sont hépatotoxiques en cas d\'hépatite active','Métabolisme hépatique des estrogènes aggravé par l\'hépatite active','Utiliser DIU au cuivre ou microprogestatif.'],
  [contracepti,'pathologie','Tabagisme actif > 15 cigarettes/j chez femme > 35 ans','absolue','CI absolue : risque cardiovasculaire et thrombo-embolique multiplié par 5 avec estroprogestatifs','Synergie tabac + estrogènes sur la coagulation et l\'endothélium vasculaire','Sevrage tabagique ou substitution par microprogestatif/DIU.'],
  [contracepti,'pathologie','Cancer du sein diagnostiqué ou suspecté','absolue','CI absolue : les estrogènes et progestatifs peuvent stimuler la croissance des cellules mammaires hormonodépendantes','Activation des récepteurs ER-alpha sur les cellules mammaires tumorales','CI absolue. DIU au cuivre ou méthodes barrières.'],
  [contracepti,'pathologie','Allaitement (6 premières semaines)','absolue','CI absolue des estroprogestatifs : risque de réduction de la lactation','Inhibition de la prolactine par les estrogènes','Utiliser microprogestatif seul (désogestrel) compatible avec l\'allaitement.'],
];

// ─── AINS ET ANALGÉSIQUES ─────────────────────────────────────────────────────
const ains       = 'ibuprofène|naproxène|diclofénac|kétoprofène|indométacine|piroxicam|méloxicam|ténoxicam|flurbiprofène|acide tiaprofénique';
const cox2       = 'célécoxib|étoricoxib|parécoxib|lumiracoxib';
const aspirine   = 'aspirine|acide acétylsalicylique';
const paracetam  = 'paracétamol|acétaminophène';

const ainsCombos = [
  // AINS non sélectifs
  [ains,'allergie_med','Allergie aux AINS (urticaire, angio-œdème, asthme)','absolue','CI absolue : réaction d\'hypersensibilité aux AINS → choc anaphylactique ou bronchospasme fatal','Inhibition de la COX-1 → accumulation de leucotriènes LTC4/D4 → bronchoconstriction et anaphylaxie','Utiliser paracétamol (toléré dans 90% des cas). Éviter tous les AINS. Test de tolérance possible en milieu spécialisé.'],
  [ains,'pathologie','Ulcère gastroduodénal actif (non traité)','absolue','CI absolue : les AINS aggravent l\'ulcère et peuvent déclencher une hémorragie digestive fatale','Inhibition COX-1 → réduction prostaglandines gastroprotectrices (PGE2) → érosion muqueuse','Traiter l\'ulcère en premier (IPP + éradication H. pylori). Substituer par paracétamol.'],
  [ains,'pathologie','Insuffisance rénale chronique stade 3b-5 (DFG < 45)','absolue','CI absolue : les AINS provoquent une vasoconstriction rénale et une IRA en cas de DFG réduit','Inhibition des prostaglandines rénales vasodilatatrices (PGI2/PGE2) nécessaires à la perfusion glomérulaire','CI absolue. Utiliser paracétamol. Tramadol avec précaution.'],
  [ains,'pathologie','Insuffisance cardiaque décompensée (NYHA III-IV)','absolue','CI absolue : rétention hydrosodée → décompensation cardiaque aiguë','Inhibition des prostaglandines rénales → rétention Na+ et eau → augmentation de la précharge et postcharge','CI absolue. Paracétamol exclusivement.'],
  [ains,'pathologie','Grossesse (3e trimestre)','absolue','CI absolue : fermeture prématurée du canal artériel fœtal et insuffisance rénale fœtale','Inhibition des prostaglandines fœtales (PGE2) qui maintiennent l\'ouverture du canal artériel','CI absolue à partir de 24 SA. Paracétamol uniquement.'],
  [ains,'pathologie','Grossesse (1er trimestre)','relative','Risque de fausse couche précoce (possible) et fermeture du tube neural discuté','Inhibition des prostaglandines impliquées dans l\'implantation embryonnaire','Éviter au 1er trimestre. Utiliser paracétamol.'],
  [ains,'pathologie','Asthme aggravé par l\'aspirine / AINS','absolue','CI absolue : bronchospasme sévère chez 10% des asthmatiques (syndrome de Widal)','Déviation du métabolisme de l\'acide arachidonique vers la voie 5-lipoxygénase → leucotriènes bronchoconstricteurs','CI absolue. Utiliser paracétamol (COX-2 à haute dose avec précaution).'],
  [ains,'pathologie','Hémorragie active / Coagulopathie sévère','absolue','CI absolue : potentialisation du saignement par inhibition plaquettaire et gastrique','Inhibition COX-1 plaquettaire + érosion muqueuse digestive','CI absolue. Paracétamol IV si nécessaire.'],
  [ains,'pathologie','Hypertension artérielle non contrôlée','relative','Les AINS augmentent la pression artérielle de 3-5 mmHg en moyenne et réduisent l\'efficacité des antihypertenseurs','Rétention sodée + vasoconstriction rénale','Surveiller PA. Limiter la durée. Paracétamol préférable.'],
  [ains,'pathologie','Insuffisance hépatique sévère (Child-Pugh C)','absolue','CI absolue : hépatotoxicité des AINS + risque de syndrome hépatorénal','Métabolisme hépatique + toxicité COX hépatique','CI absolue. Paracétamol à dose réduite (2g/j max en IHC sévère).'],
  [ains,'pathologie','Thrombopénie sévère (plaquettes < 50 G/L)','absolue','CI absolue : inhibition plaquettaire sur fond de thrombopénie → hémorragie incontrôlable','Synergie inhibition fonctionnelle + thrombopénie quantitative','CI absolue. Paracétamol IV.'],
  [ains,'pathologie','Chirurgie récente avec risque hémorragique','relative','Risque hémorragique postopératoire accru','Inhibition COX-1 → altération de l\'agrégation plaquettaire pour 5-7 jours','Arrêter 5-7 jours avant chirurgie. Reprendre 24-48h après si pas de saignement.'],

  // COX-2
  [cox2,'pathologie','Antécédent cardiovasculaire (IDM, AVC, AOMI)','absolue','CI absolue : les COX-2 augmentent le risque d\'IDM et d\'AVC','Inhibition de la prostacycline (PGI2) vasculoprotectrice sans inhiber le thromboxane A2 plaquettaire → déséquilibre pro-thrombotique','CI absolue. Utiliser paracétamol ou opioïde à faible dose.'],
  [cox2,'pathologie','Insuffisance cardiaque (toute sévérité)','absolue','CI absolue : les COX-2 aggravent l\'insuffisance cardiaque par rétention hydrosodée et baisse du DFG','Inhibition PGI2/PGE2 rénales → rétention Na+ et eau','CI absolue. Utiliser paracétamol.'],
  [cox2,'pathologie','Allergie aux sulfamides','relative','Célécoxib contient un groupe sulfonamide → réactivité croisée possible avec les sulfamides antibiotiques','Structure sulfonamide du célécoxib','Utiliser étoricoxib (sans sulfonamide).'],
  [cox2,'pathologie','Grossesse (2e trimestre)','absolue','CI absolue : fermeture prématurée du canal artériel (comme tous les AINS)','Inhibition COX-2 placentaire et fœtale','CI absolue. Paracétamol.'],
  [cox2,'pathologie','Ulcère gastroduodénal actif (non traité)','relative','Les COX-2 sont moins gastrotoxiques que les AINS mais pas sans risque en cas d\'ulcère actif','Inhibition COX-2 gastrique (moins d\'effet que COX-1 mais toujours présent)','Traiter l\'ulcère avant. Ajouter un IPP si COX-2 indispensable.'],

  // Aspirine
  [aspirine,'pathologie','Enfant < 16 ans (fièvre virale)','absolue','CI absolue : syndrome de Reye (encéphalopathie hépatique aiguë potentiellement mortelle)','Mitochondriopathie aspirin-induite dans un contexte d\'infection virale (grippe, varicelle)','Utiliser paracétamol ou ibuprofène en pédiatrie.'],
  [aspirine,'pathologie','Hémophilie / Coagulopathie héréditaire','absolue','CI absolue : hémorragie massive par synergie coagulopathie + inhibition plaquettaire','Double défaut de coagulation (déficit facteurs + inhibition plaquettaire COX-1)','CI absolue. Utiliser paracétamol.'],
  [aspirine,'pathologie','Goutte active','relative','L\'aspirine à faible dose augmente l\'uricémie en bloquant la sécrétion tubulaire de l\'acide urique','Compétition avec l\'acide urique pour la sécrétion tubulaire proximale','Ne pas utiliser l\'aspirine à visée antalgique en cas de goutte. Utiliser AINS spécifiques (à forte dose).'],
  [aspirine,'pathologie','Ulcère gastroduodénal actif (non traité)','absolue','CI absolue même à faible dose : ulcère hémorragique','Inhibition COX-1 gastrique + toxicité directe de l\'aspirine sur la muqueuse','Traiter l\'ulcère. IPP obligatoire si aspirine maintenue (cardiologique).'],
  [aspirine,'pathologie','Allergie aux AINS / Aspirine','absolue','CI absolue : intolérance documentée à l\'aspirine (bronchospasme, urticaire, choc)','Hypersensibilité aux salicylates','Éviter tous les salicylates. Paracétamol uniquement.'],
  [aspirine,'allergie_med','Allergie aux AINS (syndrome de Widal)','absolue','CI absolue : l\'aspirine est souvent le premier AINS impliqué dans le syndrome de Widal','Inhibition COX-1 → accumulation leucotriènes → bronchospasme sévère','CI absolue. Paracétamol (toléré dans 90% des cas après test).'],
  [aspirine,'pathologie','Grossesse (3e trimestre)','absolue','CI absolue : fermeture prématurée du canal artériel fœtal','Inhibition prostaglandines fœtales','CI absolue. Paracétamol.'],
  [aspirine,'pathologie','Allaitement','relative','Métabolisme chez le nourrisson immature ; accumulation et risque de syndrome de Reye','Passage dans le lait maternel et métabolisme hépatique neonatal immature','Éviter. Si antalgique nécessaire : paracétamol.'],

  // Paracétamol
  [paracetam,'pathologie','Insuffisance hépatique sévère (Child-Pugh C)','absolue','CI absolue à dose normale : accumulation du métabolite toxique NAPQI → nécrose hépatique','Saturation de la glucuroconjugaison → augmentation de la voie CYP2E1 → NAPQI toxique','Dose maximale : 2g/j (voire 1g/j en IHC sévère). CI absolue si nécrose hépatique en cours.'],
  [paracetam,'pathologie','Alcoolisme chronique actif','relative','L\'alcool induit le CYP2E1 → augmentation de la production de NAPQI hépatotoxique','Induction enzymatique + réduction des réserves de glutathion hépatique','Réduire la dose à 2g/j maximum. Éviter l\'association alcool + paracétamol.'],
  [paracetam,'allergie_med','Allergie au paracétamol','absolue','CI absolue : hypersensibilité documentée au paracétamol (rare mais possible)','Réaction immunologique ou non aux métabolites du paracétamol','Utiliser AINS (si toléré) ou opioïde.'],
  [paracetam,'pathologie','Déficit en G6PD','relative','Risque d\'anémie hémolytique à fortes doses de paracétamol chez patients G6PD déficients','Formation de métabolites oxydants en cas de déficit G6PD','Utiliser à doses habituelles (< 2g/j). Surveiller NFS.'],
  [paracetam,'pathologie','Anorexie / Malnutrition sévère','relative','Réduction des réserves de glutathion hépatique → toxicité hépatique aux doses thérapeutiques','Carence en glutathion = perte de la protection contre le NAPQI','Réduire la dose à 2g/j. Correction nutritionnelle prioritaire.'],
];

// ─── ASSEMBLY ─────────────────────────────────────────────────────────────────
const allCombos = [
  ...antibioCombos,
  ...cardioCombos,
  ...sncCombos,
  ...endoCombos,
  ...ainsCombos,
];

for (const [dci, ct, cv, sev, desc, mec, cond] of allCombos) {
  rows.push({ dci_pattern: dci, condition_type: ct, condition_valeur: cv, severite: sev, description: desc, mecanisme_fr: mec, conduite_fr: cond });
}

// ─── GENERATE SQL ─────────────────────────────────────────────────────────────
// De-duplicate by (dci_pattern, condition_valeur)
// Filter out any rows with undefined/null fields
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

console.log(`Total complete rows: ${complete.length}, unique: ${unique.length}`);

const batchSize = 40;
let fileIdx = 1;
for (let i = 0; i < unique.length; i += batchSize) {
  const batch = unique.slice(i, i + batchSize);
  const vals = batch.map(r =>
    `('${esc(String(r.dci_pattern))}','${esc(String(r.condition_type))}','${esc(String(r.condition_valeur))}','${esc(String(r.severite))}','${esc(String(r.description))}','${esc(String(r.mecanisme_fr))}','${esc(String(r.conduite_fr))}')`
  ).join(',\n');
  const sql = `INSERT INTO contraindications (dci_pattern,condition_type,condition_valeur,severite,description,mecanisme_fr,conduite_fr)\nVALUES\n${vals}\nON CONFLICT DO NOTHING;\n`;
  writeFileSync(`scripts/contra_batch_${String(fileIdx).padStart(2,'0')}.sql`, sql, 'utf8');
  console.log(`Batch ${fileIdx}: rows ${i+1}-${Math.min(i+batchSize, unique.length)} written`);
  fileIdx++;
}
console.log(`Done: ${unique.length} rows in ${fileIdx-1} files`);
