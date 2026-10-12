// Sprint BDD-1 — Source unique du référentiel de substances (jumeaux FR/EN, sels, promédicaments).
// Génère :
//   • src/lib/bdd1_equivalences.data.json                          (fixture des tests Vitest)
//   • supabase/migrations/20261026120000_bdd1_equivalences.sql     (colonne, données, RPC, vue)
// Usage : node scripts/gen_bdd1_equivalences.mjs
//
// Principe (non destructif) : `ingredients.canonical_id` relie chaque membre d'un groupe d'équivalence à UNE
// entité canonique (qui pointe vers elle-même). Aucun ingrédient n'est supprimé, aucune ligne de
// `medicament_ingredients` n'est modifiée : `check_interactions_v2` élargit chaque ingrédient d'une
// spécialité à tout son groupe avant de chercher dans ANSM, DDInter et le cumul de classe.
//
// Règles de constitution d'un groupe :
//   • même molécule active, sans aucun doute : écriture FR/EN, DCI/USAN, « acide X »/« X acid », sel, hydrate,
//     ester ou promédicament qui est la seule forme administrée ;
//   • canonique = de préférence l'entité qui porte le lien ANSM ;
//   • JAMAIS : énantiomères, molécules voisines, HBPM avec l'héparine, anticorps nu avec son conjugué,
//     associations, formes « topical / nasal / ophthalmic » de DDInter, identifiants techniques ddinterNNNN
//     (liste INTERDITS, vérifiée par les tests).
// Les noms sont ceux de `ingredients.name_en` (clé unique en base).
// Candidats non appliqués (voies locales, anticorps conjugués, vaccins, insulines, dénominations
// incomplètes, douteux, fiches « sel » aux lignes DDInter à relire) : ../sprint2b/revue/bdd1_groupes.csv.

import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { writeNewMigration } from './lib/migrationGuard.mjs';

// [canonique, [autres membres], confiance au diagnostic, type, justification]
const GROUPES = [
  ["diclofenac", ["diclofénac"], "certain", "accent", "Même nom, accent"],
  ["omeprazole", ["oméprazole"], "certain", "accent", "Même nom, accent"],
  ["metronidazole", ["métronidazole"], "certain", "accent", "Même nom, accent"],
  ["paroxetine", ["paroxétine"], "certain", "accent", "Même nom, accent"],
  ["furosemide", ["furosémide"], "certain", "accent", "Même nom, accent"],
  ["fluoxetine", ["fluoxétine"], "certain", "accent", "Même nom, accent"],
  ["carbamazepine", ["carbamazépine"], "certain", "accent", "Même nom, accent"],
  ["codeine", ["codéine"], "certain", "accent", "Même nom, accent"],
  ["enalapril", ["énalapril"], "certain", "accent", "Même nom, accent"],
  ["fenofibrate", ["fénofibrate"], "certain", "accent", "Même nom, accent (acide fénofibrique exclu : autre spécialité)"],
  ["methotrexate", ["méthotrexate"], "certain", "accent", "Même nom, accent"],
  ["diazepam", ["diazépam"], "certain", "accent", "Même nom, accent"],
  ["lorazepam", ["lorazépam"], "certain", "accent", "Même nom, accent"],
  ["verapamil", ["vérapamil"], "certain", "accent", "Même nom, accent"],
  ["metoprolol", ["métoprolol"], "certain", "accent", "Même nom, accent"],
  ["amoxicilline", ["amoxicillin"], "certain", "suffixe", "-ine/-in"],
  ["ciprofloxacine", ["ciprofloxacin"], "certain", "suffixe", "-ine/-in"],
  ["metformine", ["metformin"], "certain", "suffixe", "-ine/-in"],
  ["atorvastatine", ["atorvastatin"], "certain", "suffixe", "-ine/-in"],
  ["clarithromycine", ["clarithromycin"], "certain", "suffixe", "-ine/-in"],
  ["simvastatine", ["simvastatin"], "certain", "suffixe", "-ine/-in"],
  ["digoxine", ["digoxin"], "certain", "suffixe", "-ine/-in"],
  ["warfarine", ["warfarin"], "certain", "suffixe", "-ine/-in"],
  ["amphotericine b", ["amphotericin b"], "certain", "suffixe", "-ine/-in (formes lipidiques exclues)"],
  ["polymyxine b", ["polymyxin b"], "certain", "suffixe", "-ine/-in"],
  ["erythromycin", ["érythromycine"], "certain", "suffixe", "-ine/-in + accent"],
  ["phenytoin", ["phénytoïne"], "certain", "suffixe", "-ïne/-in + accent (fosphénytoïne exclue)"],
  ["insuline", ["insulin"], "certain", "suffixe", "Terme générique des deux côtés"],
  ["insuline glargine", ["insulin glargine"], "certain", "suffixe", "Même analogue"],
  ["insuline lispro", ["insulin lispro"], "certain", "suffixe", "Même analogue (lispro protamine exclue)"],
  ["insuline degludec", ["insulin degludec"], "certain", "suffixe", "Même analogue"],
  ["insuline asparte", ["insulin aspart"], "certain", "suffixe", "Même analogue"],
  ["ibuprofen", ["ibuprofène"], "certain", "suffixe", "-ène/-en"],
  ["trimethoprim", ["triméthoprime"], "certain", "suffixe", "-ime/-im"],
  ["isoniazide", ["isoniazid"], "certain", "suffixe", "-ide/-id"],
  ["sulfamethizol", ["sulfamethizole"], "certain", "suffixe", "-ol/-ole"],
  ["vitamine a", ["vitamin a"], "certain", "suffixe", "vitamine/vitamin"],
  ["cafeine", ["caffeine"], "certain", "orthographe", "caféine/caffeine"],
  ["aciclovir", ["acyclovir"], "certain", "orthographe", "i/y (acyclovir topical exclu)"],
  ["valaciclovir", ["valacyclovir"], "certain", "orthographe", "i/y"],
  ["indometacine", ["indomethacin"], "certain", "orthographe", "t/th + -ine/-in"],
  ["chlortalidone", ["chlorthalidone"], "certain", "orthographe", "t/th"],
  ["tiabendazole", ["thiabendazole"], "certain", "orthographe", "t/th"],
  ["aspirin", ["aspirine", "acetylsalicylic acid"], "certain", "synonyme", "Aspirine = acide acétylsalicylique (3 entités)"],
  ["rifampicine", ["rifampicin", "rifampin"], "certain", "synonyme", "rifampin = nom USAN de la rifampicine (3 entités)"],
  ["acide fusidique", ["fusidic acid"], "certain", "acide", "acide X / X acid"],
  ["acide ascorbique", ["ascorbic acid"], "certain", "acide", "acide X / X acid"],
  ["acide zoledronique", ["zoledronic acid"], "certain", "acide", "acide X / X acid"],
  ["acide folique", ["folic acid"], "certain", "acide", "acide X / X acid (acide lévoméfolique exclu)"],
  ["acide alendronique", ["alendronic acid", "alendronate"], "certain", "acide", "acide X / X acid ; alendronate = son sel"],
  ["acide mefenamique", ["mefenamic acid"], "certain", "acide", "acide X / X acid"],
  ["acide acetohydroxamique", ["acetohydroxamic acid"], "certain", "acide", "acide X / X acid"],
  ["acide cholique", ["cholic acid"], "certain", "acide", "acide X / X acid"],
  ["acide etidronique", ["etidronic acid"], "certain", "acide", "acide X / X acid"],
  ["acide pamidronique", ["pamidronic acid"], "certain", "acide", "acide X / X acid"],
  ["acide risedronique", ["risedronic acid"], "certain", "acide", "acide X / X acid"],
  ["acide tiludronique", ["tiludronic acid"], "certain", "acide", "acide X / X acid"],
  ["acide ibandronique", ["ibandronate"], "certain", "acide", "acide ibandronique / ibandronate (son sel)"],
  ["acide ursodesoxycholique", ["ursodeoxycholic acid", "ursodiol"], "certain", "acide", "acide X / X acid ; ursodiol = nom USAN"],
  ["acide amidotrizoique", ["diatrizoate"], "certain", "synonyme", "amidotrizoate = diatrizoate (DCI / USAN)"],
  ["acide folinique", ["leucovorin"], "certain", "synonyme", "acide folinique = leucovorin (lévoleucovorine exclue : énantiomère)"],
  ["acide nicotinique", ["niacin"], "certain", "synonyme", "acide nicotinique = niacine (nicotinamide exclu)"],
  ["valproic acid", ["valproate"], "certain", "acide", "acide valproïque / valproate (valpromide exclu : entrée ANSM propre)"],
  ["clorazepate", ["clorazepic acid"], "certain", "acide", "clorazépate / acide clorazépique"],
  ["sodium (picosulfate de)", ["picosulfuric acid"], "certain", "acide", "picosulfate de sodium / acide picosulfurique"],
  ["hydroxycarbamide", ["hydroxyurea"], "certain", "synonyme", "DCI / USAN"],
  ["salbutamol", ["albuterol"], "certain", "synonyme", "DCI / USAN (lévosalbutamol exclu)"],
  ["chlorphenamine", ["chlorpheniramine"], "certain", "synonyme", "DCI / USAN (dexchlorphéniramine exclue : énantiomère)"],
  ["colestyramine", ["cholestyramine"], "certain", "synonyme", "DCI / USAN"],
  ["ethinylestradiol", ["ethinyl estradiol"], "certain", "orthographe", "Même nom, espace"],
  ["norethisterone", ["norethindrone"], "certain", "synonyme", "DCI / USAN"],
  ["isoprenaline", ["isoproterenol"], "certain", "synonyme", "DCI / USAN"],
  ["methylergometrine", ["methylergonovine"], "certain", "synonyme", "DCI / USAN"],
  ["mesalazine", ["mesalamine"], "certain", "synonyme", "DCI / USAN"],
  ["glycopyrronium", ["glycopyrrolate"], "certain", "synonyme", "DCI / USAN (forme topique exclue)"],
  ["benzatropine", ["benztropine"], "certain", "synonyme", "DCI / USAN"],
  ["levomepromazine", ["methotrimeprazine"], "certain", "synonyme", "DCI / USAN (Nozinan)"],
  ["leuproreline", ["leuprolide"], "certain", "synonyme", "DCI / USAN"],
  ["suxamethonium", ["succinylcholine"], "certain", "synonyme", "DCI / USAN"],
  ["torasemide", ["torsemide"], "certain", "synonyme", "DCI / USAN"],
  ["trometamol", ["tromethamine"], "certain", "synonyme", "DCI / USAN"],
  ["tetracosactide", ["cosyntropin"], "certain", "synonyme", "DCI / USAN"],
  ["fampridine", ["dalfampridine"], "certain", "synonyme", "DCI / USAN (amifampridine exclue : autre molécule)"],
  ["sulfafurazol", ["sulfisoxazole"], "certain", "synonyme", "DCI / USAN (acétylsulfafurazol exclu)"],
  ["diprophylline", ["dyphylline"], "certain", "synonyme", "DCI / USAN"],
  ["trientine", ["triethylenetetramine"], "certain", "synonyme", "Même molécule"],
  ["somatropin", ["somatotropin"], "certain", "synonyme", "Somatropine (somatrem / somatrogon / somapacitan exclus)"],
  ["phylloquinone", ["phytonadione"], "certain", "synonyme", "Vitamine K1, DCI / USAN"],
  ["chenodeoxycholic acid", ["chenodiol"], "certain", "synonyme", "DCI / USAN"],
  ["glycerol", ["glycerin"], "certain", "synonyme", "Même molécule"],
  ["alcool", ["alcohol", "ethanol"], "certain", "synonyme", "Éthanol (3 entités)"],
  ["mitomycine c", ["mitomycin"], "certain", "synonyme", "Mitomycine C"],
  ["charbon active", ["activated charcoal"], "certain", "traduction", "Traduction (charbon végétal officinal laissé à part : entrée ANSM propre)"],
  ["bleu de methylene", ["methylene blue"], "certain", "traduction", "Traduction"],
  ["millepertuis", ["st john s wort", "st. john's wort"], "certain", "traduction", "Traduction (2 écritures EN)"],
  ["reglisse", ["licorice"], "certain", "traduction", "Traduction"],
  ["fer", ["iron"], "certain", "traduction", "Traduction (sels ferreux et fers injectables exclus)"],
  ["estrogenes conjugues", ["conjugated estrogens"], "certain", "traduction", "Traduction (forme topique exclue)"],
  ["ginkgo", ["ginkgo biloba"], "certain", "traduction", "Même plante"],
  ["peg-interferon alfa-2a", ["peginterferon alfa-2a"], "certain", "orthographe", "Même nom, tiret"],
  ["salmon calcitonin", ["calcitonin salmon"], "certain", "orthographe", "Même nom, ordre des mots"],
  ["dinitrate d'isosorbide", ["isosorbide dinitrate"], "certain", "traduction", "Même sel (mononitrate exclu)"],
  ["sodium (bicarbonate de)", ["sodium bicarbonate"], "certain", "traduction", "Même sel"],
  ["sodium (citrate de)", ["sodium citrate"], "certain", "traduction", "Même sel"],
  ["sodium (chlorure de)", ["sodium chloride"], "certain", "traduction", "Même sel"],
  ["sodium (docusate de)", ["docusate"], "certain", "traduction", "Docusate sodique"],
  ["sodium (nitroprussiate de)", ["nitroprusside"], "certain", "traduction", "Nitroprussiate de sodium"],
  ["potassium (citrate de)", ["potassium citrate"], "certain", "traduction", "Même sel"],
  ["magnesium (hydroxyde de)", ["magnesium hydroxide"], "certain", "traduction", "Même sel"],
  ["polystyrene sulfonate de sodium", ["sodium polystyrene sulfonate"], "certain", "traduction", "Même sel (sel de calcium exclu)"],
  ["oxybate de sodium", ["sodium oxybate"], "certain", "traduction", "Même sel"],
  ["dimethyle ( fumarate de)", ["dimethyl fumarate"], "certain", "traduction", "Même molécule (diroximel / monométhyl fumarate exclus)"],
  ["liothyronine sodique", ["liothyronine"], "certain", "sel", "Même substance, sel sodique"],
  ["dalteparine sodique", ["dalteparin"], "certain", "sel", "Même HBPM, sel sodique"],
  ["danaparoide sodique", ["danaparoid"], "certain", "sel", "Même substance, sel sodique"],
  ["heparine sodique", ["heparine calcique", "heparin"], "certain", "sel", "Héparine non fractionnée, sels sodique et calcique (HBPM et « heparin flush » exclus)"],
  ["perindopril", ["perindopril tert-butylamine"], "certain", "sel", "Même molécule, sel de tert-butylamine (2 entrées ANSM)"],
  ["abciximab (c 7e3b fab)", ["abciximab"], "certain", "synonyme", "Même anticorps"],
  ["alteplase recombinante", ["alteplase"], "certain", "synonyme", "Même protéine"],
  ["lanthane", ["lanthanum carbonate"], "certain", "sel", "Seule forme existante du lanthane médicament"],
  ["atorvastatine", ["atorvastatin trihydrate", "atorvastatin propylene glycol solvate"], "probable", "sel", "Hydrate / solvate de la même molécule"],
  ["azithromycin", ["azithromycin dihydrate"], "probable", "sel", "Hydrate de la même molécule"],
  ["ampicillin", ["ampicillin trihydrate"], "probable", "sel", "Hydrate de la même molécule"],
  ["doxycycline", ["doxycycline hyclate"], "probable", "sel", "Sel de la même molécule"],
  ["dextromethorphan", ["dextromethorphan hydrobromide"], "probable", "sel", "Sel de la même molécule"],
  ["eltrombopag", ["eltrombopag olamine"], "probable", "sel", "Sel de la même molécule"],
  ["erythromycin", ["erythromycin ethylsuccinate"], "probable", "sel", "Ester de la même molécule"],
  ["fluticasone", ["fluticasone propionate"], "probable", "sel", "Ester de la même molécule"],
  ["ketorolac", ["ketorolac tromethamine"], "probable", "sel", "Sel de la même molécule"],
  ["lisdexamfetamine", ["lisdexamfetamine dimesylate"], "probable", "sel", "Sel de la même molécule"],
  ["lithium", ["lithium carbonate"], "probable", "sel", "Carbonate de lithium"],
  ["medroxyprogesterone", ["medroxyprogesterone acetate"], "probable", "sel", "Acétate (forme utilisée)"],
  ["megestrol", ["megestrol acetate"], "probable", "sel", "Acétate (forme utilisée)"],
  ["mometasone", ["mometasone furoate"], "probable", "sel", "Furoate (forme utilisée)"],
  ["neostigmine", ["neostigmine methylsulfate"], "probable", "sel", "Sel de la même molécule"],
  ["norepinephrine", ["norepinephrine bitartrate"], "probable", "sel", "Sel de la même molécule"],
  ["pemetrexed", ["pemetrexed disodium hemipentahydrate"], "probable", "sel", "Sel de la même molécule"],
  ["pramipexole", ["pramipexole dihydrochloride"], "probable", "sel", "Sel de la même molécule"],
  ["rizatriptan", ["rizatriptan benzoate"], "probable", "sel", "Sel de la même molécule"],
  ["rucaparib", ["rucaparib camsylate"], "probable", "sel", "Sel de la même molécule"],
  ["salmeterol", ["salmeterol xinafoate"], "probable", "sel", "Sel de la même molécule"],
  ["sapropterin", ["sapropterin dihydrochloride"], "probable", "sel", "Sel de la même molécule"],
  ["sevelamer", ["sevelamer carbonate"], "probable", "sel", "Sel de la même molécule"],
  ["triamcinolone", ["triamcinolone acetonide"], "probable", "sel", "Acétonide (forme utilisée)"],
  ["benzylpenicillin", ["benzylpenicillin potassium", "benzylpenicillin sodium"], "probable", "sel", "Sels de la même molécule (benzathine exclue)"],
  ["dapagliflozin", ["dapagliflozin propanediol"], "probable", "sel", "Solvate de la même molécule"],
  ["carbidopa", ["carbidopa hydrate"], "probable", "sel", "Hydrate de la même molécule"],
  ["testosterone", ["testosterone cypionate"], "probable", "sel", "Ester de la même hormone"],
  ["balsalazide", ["balsalazide disodium"], "probable", "sel", "Sel de la même molécule"],
  ["valproic acid", ["divalproex"], "probable", "sel", "Divalproate de sodium = valproate + acide valproïque"],
  ["magnesium sulfate", ["magnesium heptahydrate"], "probable", "sel", "Nom tronqué : sulfate de magnésium heptahydraté"],
  ["dicitrate trimagnesien", ["magnesium citrate"], "probable", "sel", "Citrate de magnésium"],
  ["p a s sodique", ["aminosalicylic acid"], "probable", "sel", "Para-aminosalicylate de sodium"],
  ["piroxicam", ["piroxicam-betadex"], "probable", "sel", "Complexe bêta-cyclodextrine du piroxicam (2 entrées ANSM)"],
  ["dabigatran", ["dabigatran etexilate"], "probable", "promedicament", "Pradaxa : seule forme orale du dabigatran"],
  ["candesartan cilexetil", ["candesartan"], "probable", "promedicament", "Seule forme administrée"],
  ["azilsartan", ["azilsartan medoxomil", "azilsartan kamedoxomil"], "probable", "promedicament", "Seules formes administrées"],
  ["olmesartan", ["olmesartan medoxomil"], "probable", "promedicament", "Seule forme administrée"],
  ["adefovir", ["adefovir dipivoxil"], "probable", "promedicament", "Seule forme administrée"],
  ["isavuconazole", ["isavuconazonium"], "probable", "promedicament", "Seule forme administrée"],
  ["cefuroxime", ["cefuroxime axetil"], "probable", "promedicament", "Forme orale du céfuroxime"],
  ["colistin", ["colistimethate"], "probable", "promedicament", "Colistiméthate = forme injectable de la colistine"],
];

// Paires à ne JAMAIS réunir dans un même groupe.
const INTERDITS = [
  ["omeprazole", "esomeprazole"],
  ["cetirizine", "levocetirizine"],
  ["citalopram", "escitalopram"],
  ["ketoprofen", "dexketoprofene trometamol"],
  ["ibuprofen", "dexibuprofen"],
  ["lansoprazole", "dexlansoprazole"],
  ["ofloxacin", "levofloxacin"],
  ["salbutamol", "levosalbutamol"],
  ["amlodipine", "levamlodipine"],
  ["leucovorin", "levoleucovorin"],
  ["acide folique", "levomefolic acid"],
  ["bupivacaine", "levobupivacaine"],
  ["ketamine", "esketamine"],
  ["milnacipran", "levomilnacipran"],
  ["methylphenidate", "dexmethylphenidate"],
  ["chlorphenamine", "dexchlorpheniramine"],
  ["brompheniramine", "dexbrompheniramine"],
  ["modafinil", "armodafinil"],
  ["zopiclone", "eszopiclone"],
  ["formoterol", "arformoterol"],
  ["epinephrine", "racepinephrine"],
  ["levothyroxine", "dextrothyroxine"],
  ["amphetamine", "dextroamphetamine"],
  ["betaxolol", "levobetaxolol ophthalmic"],
  ["oxcarbazepine", "eslicarbazepine"],
  ["carbamazepine", "oxcarbazepine"],
  ["heparin", "enoxaparin"],
  ["heparin", "dalteparin"],
  ["heparin", "tinzaparin"],
  ["trastuzumab", "trastuzumab emtansine"],
  ["trastuzumab", "trastuzumab deruxtecan"],
  ["phenytoin", "fosphenytoin"],
  ["valproic acid", "valpromide"],
  ["fenofibrate", "fenofibric acid"],
  ["hydralazine", "dihydralazine"],
  ["quinidine", "hydroquinidine"],
  ["acide nicotinique", "nicotinamide"],
  ["insuline glargine", "insuline lispro"],
  ["insuline", "insuline glargine"],
];

// Lignes de interactions_ingredients rédigées à la main (hors import DDInter) : marquées revue_requise,
// elles restent comparées sur les ids BRUTS (aucune propagation au groupe tant qu'elles ne sont pas relues).
const LIGNES_REVUE_ATTENDUES = 53;

// ── Contrôles de la source ──────────────────────────────────────────────────
const parCanon = new Map();
for (const [canon, membres] of GROUPES) {
  if (!parCanon.has(canon)) parCanon.set(canon, new Set());
  membres.forEach(m => parCanon.get(canon).add(m));
}
const groupes = [...parCanon].map(([canonique, set]) => ({ canonique, membres: [...set] }));
const groupeDe = new Map();
for (const g of groupes) {
  if (g.membres.length === 0) throw new Error(`groupe vide : ${g.canonique}`);
  for (const n of [g.canonique, ...g.membres]) {
    if (/^ddinter\d+$/i.test(n)) throw new Error(`identifiant technique : ${n}`);
    if (/[~^]/.test(n)) throw new Error(`caractère réservé dans : ${n}`);
    if (groupeDe.has(n)) throw new Error(`« ${n} » figure dans deux groupes (${groupeDe.get(n)} et ${g.canonique})`);
    groupeDe.set(n, g.canonique);
  }
}
for (const [a, b] of INTERDITS) {
  if (groupeDe.has(a) && groupeDe.get(a) === groupeDe.get(b)) throw new Error(`paire interdite réunie : ${a} / ${b}`);
}

// Empreinte « base = source » : une ligne « membre|canonique » par substance groupée (canonique compris),
// triée par nom de substance, en octets (collation "C" côté base).
const md5 = s => createHash('md5').update(s, 'utf8').digest('hex');
const octets = (a, b) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
const lignes = [...groupeDe].sort((x, y) => octets(x[0], y[0])).map(([n, c]) => `${n}|${c}`);
const empreinte = md5(lignes.join('\n'));

writeFileSync(
  new URL('../src/lib/bdd1_equivalences.data.json', import.meta.url),
  JSON.stringify({
    empreinte,
    lignes_revue_attendues: LIGNES_REVUE_ATTENDUES,
    groupes: groupes.map(g => ({
      ...g,
      origines: GROUPES.filter(x => x[0] === g.canonique).map(([, membres, confiance, type, justification]) => ({ membres, confiance, type, justification })),
    })),
    interdits: INTERDITS,
  }, null, 2) + '\n',
);

// ── Migration ───────────────────────────────────────────────────────────────
const source = groupes.map(g => [g.canonique, ...g.membres].join('~')).join('^');
if (source.includes('$bdd1$')) throw new Error('délimiteur présent dans la source');

const sql = `-- Sprint BDD-1 — référentiel de substances unique : équivalences FR/EN, sels, promédicaments.
-- GÉNÉRÉ par scripts/gen_bdd1_equivalences.mjs — ne pas modifier à la main.
-- Empreinte de la source : ${empreinte}
--
-- ${groupes.length} groupes, ${groupeDe.size} substances. Non destructif : aucun ingrédient réel supprimé, aucune ligne de
-- medicament_ingredients modifiée. check_interactions_v2 garde sa signature et son format de sortie.

-- 0. Source (canonique en premier dans chaque groupe)
create temp table _bdd1 as
select g.ord::int as grp, m.nom, (m.k = 1) as canon
from unnest(string_to_array($bdd1$${source}$bdd1$, '^')) with ordinality as g(s, ord)
cross join lateral unnest(string_to_array(g.s, '~')) with ordinality as m(nom, k);

-- 1. Gardes : état de départ attendu (sinon tout est annulé).
do $$
declare v_manquants text;
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'ingredients' and column_name = 'canonical_id') then
    raise exception 'BDD-1 : ingredients.canonical_id existe déjà';
  end if;
  select string_agg(b.nom, ' ; ') into v_manquants
  from _bdd1 b left join ingredients i on i.name_en = b.nom where i.id is null;
  if v_manquants is not null then
    raise exception 'BDD-1 : substances absentes de ingredients : %', v_manquants;
  end if;
  if exists (select 1 from _bdd1 group by nom having count(*) > 1) then
    raise exception 'BDD-1 : une substance figure dans deux groupes';
  end if;
  if exists (select 1 from ingredients i
             where i.name_en in ('__test_a__', '__test_b__')
               and (exists (select 1 from medicament_ingredients mi where mi.ingredient_id = i.id)
                 or exists (select 1 from ansm_substance_ingredient a where a.ingredient_id = i.id))) then
    raise exception 'BDD-1 : une entité de test est reliée à une spécialité ou à l''ANSM — STOP';
  end if;
end $$;

-- 2. Hygiène : entités de test (aucune spécialité reliée) et leur ligne DDInter.
delete from interactions_ingredients ii
using ingredients t
where t.name_en in ('__test_a__', '__test_b__') and t.id in (ii.ingredient_1, ii.ingredient_2);
delete from ingredients where name_en in ('__test_a__', '__test_b__');

-- 3. Colonnes. revue_requise : ajout de métadonnées uniquement (valeur par défaut constante, PostgreSQL ≥ 11) ;
--    si la table était réécrite, la migration s'annule.
alter table ingredients add column canonical_id uuid references ingredients(id);
comment on column ingredients.canonical_id is
  'BDD-1 — entité canonique du groupe d''équivalence (même molécule). Le canonique pointe vers lui-même ; NULL = substance hors groupe.';
create index idx_ingredients_canonical on ingredients (canonical_id) where canonical_id is not null;

do $$
declare v_avant oid; v_apres oid;
begin
  v_avant := pg_relation_filenode('public.interactions_ingredients');
  alter table interactions_ingredients add column revue_requise boolean not null default false;
  v_apres := pg_relation_filenode('public.interactions_ingredients');
  if v_avant is distinct from v_apres then
    raise exception 'BDD-1 : interactions_ingredients a été réécrite par l''ajout de revue_requise — STOP';
  end if;
end $$;
comment on column interactions_ingredients.revue_requise is
  'BDD-1 — ligne rédigée à la main, à relire : comparée sur les ids bruts, jamais propagée au groupe d''équivalence.';

-- 4. Garde-fou permanent : pas de chaîne (la cible d'un canonical_id est toujours un canonique).
create or replace function public.ingredients_canonical_guard()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.canonical_id is not null and new.canonical_id <> new.id
     and not exists (select 1 from ingredients c where c.id = new.canonical_id and c.canonical_id = c.id) then
    raise exception 'ingredients.canonical_id : la cible n''est pas un canonique (elle doit pointer vers elle-même)';
  end if;
  if tg_op = 'UPDATE' and old.canonical_id = old.id and new.canonical_id is distinct from new.id
     and exists (select 1 from ingredients m where m.canonical_id = old.id and m.id <> old.id) then
    raise exception 'ingredients.canonical_id : « % » est le canonique d''autres substances', old.name_en;
  end if;
  return new;
end $$;

create trigger trg_ingredients_canonical_guard
before insert or update of canonical_id on ingredients
for each row execute function public.ingredients_canonical_guard();

-- 5. Remplissage : les canoniques d'abord, puis leurs membres.
update ingredients i set canonical_id = i.id
from _bdd1 b where b.canon and i.name_en = b.nom;

update ingredients i set canonical_id = c.id
from _bdd1 b
join _bdd1 bc on bc.grp = b.grp and bc.canon
join ingredients c on c.name_en = bc.nom
where not b.canon and i.name_en = b.nom;

-- 6. Lignes DDInter rédigées à la main (ni « Interaction … » ni « A × B — … ») : à relire, non propagées.
update interactions_ingredients set revue_requise = true
where description !~ ' × '
  and description !~ '^Interaction (majeure|modérée|mineure) '
  and description !~ '^Interaction entre ';

-- 7. RPC : même signature, même format de sortie.
--    • med_can : une ligne par (spécialité, substance canonique) ; med_x : la substance dépliée en tout son groupe.
--    • Deux jumeaux ne sont jamais comparés entre eux : on compare les canoniques (cid), pas les ids bruts.
--    • DDInter : UNE carte par paire de substances canoniques, la plus sévère.
--    • Priorité ANSM > DDInter > cumul de classe ; une carte DDInter STRICTEMENT plus sévère que la carte ANSM
--      de la même paire de spécialités est conservée (jamais de baisse de sévérité).
--    • Ligne revue_requise : comparée sur les liens DIRECTS des deux spécialités (aucune propagation).
create or replace function public.check_interactions_v2(p_med_ids uuid[])
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
DECLARE v_i jsonb; v_nv jsonb; v_ok jsonb;
BEGIN
  WITH med_can AS MATERIALIZED (
    SELECT DISTINCT mi.medicament_id, m.nom, COALESCE(i.canonical_id, i.id) AS cid
    FROM medicament_ingredients mi
    JOIN medicaments m ON m.id = mi.medicament_id
    JOIN ingredients i ON i.id = mi.ingredient_id
    WHERE mi.medicament_id = ANY(p_med_ids)
  ),
  med_x AS MATERIALIZED (
    SELECT mc.medicament_id, mc.nom, mc.cid, c.name_en, g.id AS ingredient_id,
      EXISTS (SELECT 1 FROM medicament_ingredients d
              WHERE d.medicament_id = mc.medicament_id AND d.ingredient_id = g.id) AS direct
    FROM med_can mc
    JOIN ingredients c ON c.id = mc.cid
    CROSS JOIN LATERAL (
      SELECT mc.cid AS id
      UNION
      SELECT x.id FROM ingredients x WHERE x.canonical_id = mc.cid
    ) g
  ),
  ansm AS (
    SELECT DISTINCT ON (a.medicament_id, b.medicament_id)
      a.nom AS nom_a, b.nom AS nom_b, a.name_en AS ing_a, b.name_en AS ing_b,
      CASE r.niveau WHEN 'contre_indiquee' THEN 'majeure'
                    WHEN 'deconseillee' THEN 'majeure'
                    WHEN 'precaution' THEN 'moderee'
                    ELSE 'mineure' END AS severite,
      r.niveau AS niveau_ansm, r.description, 'ANSM'::text AS source,
      a.medicament_id AS ma, b.medicament_id AS mb,
      CASE r.niveau WHEN 'contre_indiquee' THEN 4 WHEN 'deconseillee' THEN 4
                    WHEN 'precaution' THEN 3 ELSE 2 END AS rang
    FROM med_x a
    JOIN med_x b ON a.medicament_id < b.medicament_id AND a.cid <> b.cid
    JOIN v_ingredient_entites ea ON ea.ingredient_id = a.ingredient_id
    JOIN v_ingredient_entites eb ON eb.ingredient_id = b.ingredient_id
    JOIN ansm_regles r
      ON r.entite_a = LEAST(ea.entite, eb.entite) AND r.entite_b = GREATEST(ea.entite, eb.entite)
    ORDER BY a.medicament_id, b.medicament_id,
      CASE r.niveau WHEN 'contre_indiquee' THEN 4 WHEN 'deconseillee' THEN 3
                    WHEN 'precaution' THEN 2 ELSE 1 END DESC,
      r.entite_a, r.entite_b
  ),
  ddi_c AS (
    SELECT DISTINCT ON (a.medicament_id, b.medicament_id, LEAST(a.cid, b.cid), GREATEST(a.cid, b.cid))
      a.nom AS nom_a, b.nom AS nom_b, a.name_en AS ing_a, b.name_en AS ing_b,
      ii.severite, ii.description, a.medicament_id AS ma, b.medicament_id AS mb,
      CASE ii.severite WHEN 'contre_indication' THEN 5 WHEN 'majeure' THEN 4
                       WHEN 'moderee' THEN 3 WHEN 'mineure' THEN 2 ELSE 1 END AS rang
    FROM med_x a
    JOIN med_x b ON a.medicament_id < b.medicament_id AND a.cid <> b.cid
    JOIN interactions_ingredients ii
      ON ii.ingredient_1 = LEAST(a.ingredient_id, b.ingredient_id)
     AND ii.ingredient_2 = GREATEST(a.ingredient_id, b.ingredient_id)
    WHERE NOT ii.revue_requise OR (a.direct AND b.direct)
    ORDER BY a.medicament_id, b.medicament_id, LEAST(a.cid, b.cid), GREATEST(a.cid, b.cid),
      CASE ii.severite WHEN 'contre_indication' THEN 5 WHEN 'majeure' THEN 4
                       WHEN 'moderee' THEN 3 WHEN 'mineure' THEN 2 ELSE 1 END DESC,
      ii.revue_requise, ii.description
  ),
  ddi AS (
    SELECT d.nom_a, d.nom_b, d.ing_a, d.ing_b, d.severite, NULL::text AS niveau_ansm, d.description,
      'DDInter'::text AS source
    FROM ddi_c d
    WHERE NOT EXISTS (SELECT 1 FROM ansm x WHERE x.ma = d.ma AND x.mb = d.mb AND x.rang >= d.rang)
  ),
  cumul AS (
    SELECT DISTINCT a.nom AS nom_a, b.nom AS nom_b, a.name_en AS ing_a, b.name_en AS ing_b,
      'majeure'::text AS severite, 'cumul_classe'::text AS niveau_ansm,
      ('Association de deux medicaments de la meme classe a risque (' || ea.entite ||
       '). Cumul d''effets : risque majore. Conduite : verifier l''indication de cette association.')::text AS description,
      'Cumul'::text AS source
    FROM med_x a
    JOIN med_x b ON a.medicament_id < b.medicament_id AND a.cid <> b.cid
    JOIN v_ingredient_entites ea ON ea.ingredient_id = a.ingredient_id
    JOIN v_ingredient_entites eb ON eb.ingredient_id = b.ingredient_id AND eb.entite = ea.entite
    WHERE ea.entite IN ('anticoagulants oraux','antivitamines k','antiagregants plaquettaires',
                        'substances susceptibles de donner des torsades de pointes',
                        'anti-inflammatoires non steroidiens',
                        'inhibiteurs de l''enzyme de conversion',
                        'antagonistes des recepteurs de l''angiotensine ii',
                        'medicaments a l''origine d''un syndrome serotoninergique',
                        'benzodiazepines et apparentes','morphiniques')
      AND NOT EXISTS (SELECT 1 FROM ansm x WHERE x.ma=a.medicament_id AND x.mb=b.medicament_id)
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'medicament_a',nom_a,'medicament_b',nom_b,'ingredient_a',ing_a,'ingredient_b',ing_b,
    'severite',severite,'niveau_ansm',niveau_ansm,'description',description,'source',source)),'[]'::jsonb)
  INTO v_i
  FROM (SELECT nom_a,nom_b,ing_a,ing_b,severite,niveau_ansm,description,source FROM ansm
        UNION ALL SELECT nom_a,nom_b,ing_a,ing_b,severite,niveau_ansm,description,source FROM ddi
        UNION ALL SELECT nom_a,nom_b,ing_a,ing_b,severite,niveau_ansm,description,source FROM cumul) t;

  SELECT COALESCE(jsonb_agg(m.nom),'[]'::jsonb) INTO v_nv FROM medicaments m
  WHERE m.id = ANY(p_med_ids)
    AND NOT EXISTS (SELECT 1 FROM medicament_ingredients mi WHERE mi.medicament_id=m.id);

  SELECT COALESCE(jsonb_agg(m.nom),'[]'::jsonb) INTO v_ok FROM medicaments m
  WHERE m.id = ANY(p_med_ids)
    AND EXISTS (SELECT 1 FROM medicament_ingredients mi WHERE mi.medicament_id=m.id);

  RETURN jsonb_build_object('interactions',v_i,'medicaments_verifies',v_ok,'medicaments_non_verifiables',v_nv);
END;
$function$;

-- 8. Vue : un ingrédient est « parlant » si UN membre de son groupe l'est (v_medicament_verifiable en hérite).
create or replace view v_ingredient_parlant as
select i.id as ingredient_id, i.name_en
from ingredients i
where exists (
  select 1 from ingredients g
  where (g.id = i.id or g.canonical_id = i.canonical_id)
    and (g.sans_interaction_documentee
      or exists (select 1 from interactions_ingredients ii where ii.ingredient_1 = g.id or ii.ingredient_2 = g.id)
      or exists (select 1 from v_ingredient_entites v
                 join ansm_regles r on r.entite_a = v.entite or r.entite_b = v.entite
                 where v.ingredient_id = g.id)
      or exists (select 1 from contraindications c
                 where unaccent(lower(g.name_en)) ~ unaccent(lower(c.dci_pattern))))
);

-- 9. Contrôles finaux « base = source » (sinon tout est annulé).
do $$
declare v_empreinte text; v_revue int;
begin
  select md5(string_agg(i.name_en || '|' || c.name_en, E'\\n' order by i.name_en collate "C")) into v_empreinte
  from ingredients i join ingredients c on c.id = i.canonical_id;
  if v_empreinte is distinct from '${empreinte}' then
    raise exception 'BDD-1 : empreinte base (%) ≠ source (${empreinte})', v_empreinte;
  end if;
  select count(*) into v_revue from interactions_ingredients where revue_requise;
  if v_revue <> ${LIGNES_REVUE_ATTENDUES} then
    raise exception 'BDD-1 : % lignes revue_requise au lieu de ${LIGNES_REVUE_ATTENDUES}', v_revue;
  end if;
end $$;

drop table _bdd1;

-- Contrôle « base = source » (doit renvoyer l'empreinte ci-dessus) :
--   select md5(string_agg(i.name_en || '|' || c.name_en, E'\\n' order by i.name_en collate "C"))
--   from ingredients i join ingredients c on c.id = i.canonical_id;
`;

writeNewMigration(new URL('../supabase/migrations/20261026120000_bdd1_equivalences.sql', import.meta.url), sql);
console.log(`${groupes.length} groupes · ${groupeDe.size} substances · empreinte ${empreinte}`);
