// Sprint 7 — Lettre d'adressage : génération DÉTERMINISTE du texte (aucune IA).
// Module PUR (ni React ni Supabase) : testé par lettreAdressage.test.ts.
//
// Règle d'or : AUCUNE donnée inventée. Une section sans donnée est omise ; une durée inconnue
// n'est pas écrite ; une classe thérapeutique inconnue laisse la place au nom du médicament.
// Ce module ne fait que rédiger : il ne lit ni n'alimente le moteur de sécurité.
// Le reste (accords, destinataire, texte riche, suivi) est dans lib/lettreTexte, réexporté ici.

import doublonsData from './regles_doublons.data.json';
import allergiesData from './regles_allergies.data.json';
import renalesData from './regles_renales.data.json';
import {
  accord, adjectifDe, ageLettre, anneeValide, antecedentTexte, dateFr, dureeDepuis, enumerer, formuleOuverture, majuscule, minuscule,
  nomPatient, norm, phrase, propre, sansPointFinal, sexeLettre,
  type ConfrereLettre, type LettreAntecedent, type LettreBilan, type LettreExamenAttente, type LettrePathologie, type LettreTraitement,
  type ModeTraitements,
} from './lettreTexte';

export * from './lettreTexte';

// ─── Classes thérapeutiques ──────────────────────────────────────────────────

type GroupeClasse = 'insuline' | 'ado' | 'antihta' | 'autre';
interface ClasseLettre { id: string; groupe: GroupeClasse; label: string; motifs: string[] }

const motifsDoublons = (classe: string) => (doublonsData.classes as Array<{ classe: string; motif: string }>).filter(c => c.classe === classe).map(c => c.motif);
const motifsAllergies = (famille: string) => (allergiesData.familles as Array<{ famille: string; type: string; motif: string }>)
  .filter(f => f.famille === famille && f.type === 'molecule' && !f.motif.includes('*')).map(f => f.motif);
const motifsRenales = (classe: string) => (renalesData.classes as Array<{ classe: string; dci_motif: string }>).filter(c => c.classe === classe).map(c => c.dci_motif);

/**
 * Classes thérapeutiques connues. Source : les référentiels déjà en base (regles_doublons,
 * regles_allergies, regles_renales), lus tels quels. Les lignes « complément » couvrent des classes
 * courantes absentes de ces référentiels (insulines, inhibiteurs calciques, autres antidiabétiques
 * oraux) : elles ne servent QU'À la rédaction de la lettre, jamais au moteur de sécurité.
 */
const CLASSES: ClasseLettre[] = [
  { id: 'insuline', groupe: 'insuline', label: 'insuline', motifs: ['insulin'] }, // complément
  { id: 'metformine', groupe: 'ado', label: 'metformine', motifs: motifsRenales('metformine') },
  { id: 'sulfamides_hypoglycemiants', groupe: 'ado', label: 'sulfamide hypoglycémiant', motifs: motifsDoublons('sulfamides_hypoglycemiants') },
  { id: 'gliptines', groupe: 'ado', label: 'gliptine', motifs: ['sitagliptin', 'vildagliptin', 'saxagliptin', 'linagliptin', 'alogliptin'] }, // complément
  { id: 'gliflozines', groupe: 'ado', label: 'gliflozine', motifs: ['dapagliflozin', 'empagliflozin', 'canagliflozin'] }, // complément
  { id: 'glinides', groupe: 'ado', label: 'glinide', motifs: ['repaglinid'] }, // complément
  { id: 'acarbose', groupe: 'ado', label: 'acarbose', motifs: ['acarbos'] }, // complément
  { id: 'iec', groupe: 'antihta', label: 'IEC', motifs: motifsDoublons('iec') },
  { id: 'ara2', groupe: 'antihta', label: 'ARA2', motifs: motifsDoublons('ara2') },
  { id: 'betabloquants', groupe: 'antihta', label: 'bêtabloquant', motifs: motifsDoublons('betabloquants') },
  { id: 'diuretiques', groupe: 'antihta', label: 'diurétique', motifs: [...motifsAllergies('diuretiques_sulfamides'), ...motifsRenales('spironolactone')] },
  { id: 'inhibiteurs_calciques', groupe: 'antihta', label: 'inhibiteur calcique', motifs: ['amlodipin', 'lercanidipin', 'nicardipin', 'nifedipin', 'felodipin', 'manidipin', 'lacidipin', 'nitrendipin'] }, // complément
  { id: 'statines', groupe: 'autre', label: 'statine', motifs: motifsDoublons('statines') },
  { id: 'ipp', groupe: 'autre', label: 'inhibiteur de la pompe à protons', motifs: motifsDoublons('ipp') },
  { id: 'benzodiazepines', groupe: 'autre', label: 'benzodiazépine ou apparenté', motifs: motifsDoublons('benzodiazepines') },
  { id: 'opioides', groupe: 'autre', label: 'opioïde', motifs: motifsDoublons('opioides') },
  { id: 'isrs_irsna', groupe: 'autre', label: 'antidépresseur (ISRS / IRSNA)', motifs: motifsDoublons('isrs_irsna') },
  { id: 'antihistaminiques', groupe: 'autre', label: 'antihistaminique H1', motifs: motifsDoublons('antihistaminiques_h1_sedatifs') },
  { id: 'ains', groupe: 'autre', label: 'AINS', motifs: motifsAllergies('ains') },
  { id: 'aspirine', groupe: 'autre', label: 'aspirine', motifs: motifsAllergies('aspirine') },
  { id: 'aod', groupe: 'autre', label: 'anticoagulant oral direct', motifs: ['dabigatran', 'rivaroxaban', 'apixaban', 'edoxaban'].flatMap(motifsRenales) },
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Motif en début de mot (« morphin » ne reconnaît pas « apomorphine ») — même règle que le canal doublons. */
const debutDeMot = (motif: string, texte: string): boolean => motif.length >= 3 && new RegExp(`(^| )${escapeRe(norm(motif))}`).test(texte);

/** Classes thérapeutiques reconnues d'un traitement (plusieurs pour une association fixe) ; [] si inconnue. */
export function classesTraitement(t: LettreTraitement): Array<{ id: string; groupe: GroupeClasse; label: string }> {
  const texte = [t.dci, t.dci_canonique, t.nomBase, t.nom].map(norm).filter(Boolean).join(' | ');
  if (!texte) return [];
  return CLASSES.filter(c => c.motifs.some(m => debutDeMot(m, texte))).map(({ id, groupe, label }) => ({ id, groupe, label }));
}

const NIEME_THERAPIE = ['', 'monothérapie', 'bithérapie', 'trithérapie', 'quadrithérapie'];

interface ResumeClasses {
  /** « sous insuline et antidiabétiques oraux » — rattaché au diabète du patient ; '' sinon. */
  diabete: string;
  /** « sous monothérapie antihypertensive » — rattaché à l'hypertension du patient ; '' sinon. */
  hta: string;
  /** Le reste : classes non rattachées à une pathologie, puis noms des médicaments de classe inconnue. */
  autres: string[];
}

/**
 * Résumé par classe. Un traitement n'est rattaché à une pathologie que si le patient la PORTE :
 * un bêtabloquant ou un diurétique chez un patient non hypertendu (cirrhose, insuffisance cardiaque…)
 * n'est jamais présenté comme un antihypertenseur. Le décompte (mono-, bi-, trithérapie) n'est écrit
 * que si TOUS les traitements ont une classe reconnue : sinon un antihypertenseur pourrait manquer.
 */
export function resumerParClasse(traitements: LettreTraitement[], pathologies: { diabete: boolean; hta: boolean }): ResumeClasses {
  const lus = traitements.filter(t => propre(t.nom)).map(t => ({ t, classes: classesTraitement(t) }));
  const inconnus = lus.filter(x => x.classes.length === 0).map(x => propre(x.t.nom));
  const toutes = new Map<string, { groupe: GroupeClasse; label: string }>();
  for (const x of lus) for (const c of x.classes) if (!toutes.has(c.id)) toutes.set(c.id, c);
  const duGroupe = (g: GroupeClasse) => [...toutes.values()].filter(c => c.groupe === g);

  const insuline = duGroupe('insuline').length > 0;
  const ado = duGroupe('ado').length > 0;
  const antihta = duGroupe('antihta');
  const autres: string[] = [];

  let diabete = '';
  const texteDiabete = enumerer([insuline ? 'insuline' : '', ado ? 'antidiabétiques oraux' : '']);
  if (texteDiabete) {
    if (pathologies.diabete) diabete = `sous ${texteDiabete}`;
    else autres.push(...[insuline ? 'insuline' : '', ado ? 'antidiabétiques oraux' : ''].filter(Boolean));
  }

  let hta = '';
  if (antihta.length > 0) {
    if (pathologies.hta) {
      const decompte = inconnus.length === 0 ? NIEME_THERAPIE[antihta.length] : '';
      hta = decompte ? `sous ${decompte} antihypertensive` : 'sous traitement antihypertenseur';
    } else autres.push(...antihta.map(c => c.label));
  }

  autres.push(...duGroupe('autre').map(c => c.label));
  return { diabete, hta, autres: [...new Set([...autres, ...inconnus])] };
}

// ─── Génération ──────────────────────────────────────────────────────────────

export interface LettreInput {
  today: Date;
  /** Confrère du carnet (accord de la formule d'ouverture) ; null → « Chers collègues, ». */
  confrere?: ConfrereLettre | null;
  patient: { prenom: string; nom: string; sexe?: string | null; date_naissance?: string | null };
  pathologies?: LettrePathologie[];
  /** Traitement de fond ACTIF. */
  traitements?: LettreTraitement[];
  modeTraitements?: ModeTraitements;
  contexteSuivi?: string | null;
  // Sections facultatives : l'appelant ne transmet que ce qui est coché. Vide → section omise.
  antecedents?: LettreAntecedent[];
  allergiesMedicaments?: string[];
  allergiesAlimentaires?: string[];
  bilans?: LettreBilan[];
  /** « DFG estimé à 72 mL/min/1,73 m² (CKD-EPI, créatinine du 12/09/2026) ». */
  dfg?: string | null;
  examensEnAttente?: LettreExamenAttente[];
  grossesse?: string | null;
  motif: string;
  question?: string | null;
}

export const FORMULE_REMERCIEMENT = 'Je vous remercie de votre collaboration et reste à votre disposition pour tout renseignement complémentaire.';
export const FORMULE_CLOTURE = 'Confraternellement.';

/**
 * Texte de la lettre : paragraphes séparés par une ligne vide, gras entre « ** ».
 * Même entrée → même texte, toujours.
 */
export function genererLettre(input: LettreInput): string {
  const { today } = input;
  const sexe = sexeLettre(input.patient.sexe);
  const paragraphes: string[] = [formuleOuverture(input.confrere)];

  // ── Identité, pathologies, contexte ────────────────────────────────────────
  const pathologies = (input.pathologies ?? []).filter(p => propre(p.nom));
  const reconnues = pathologies.map(p => ({ p, adj: adjectifDe(p.nom) }));
  const traitements = (input.traitements ?? []).filter(t => propre(t.nom));
  const mode: ModeTraitements = input.modeTraitements ?? 'detaille';
  const resume = mode === 'classes'
    ? resumerParClasse(traitements, {
      diabete: reconnues.some(r => r.adj?.groupe === 'diabete'),
      hta: reconnues.some(r => r.adj?.groupe === 'hta'),
    })
    : null;

  const clauses: string[] = [];
  const age = ageLettre(input.patient.date_naissance, today);
  if (age) clauses.push(`${accord(sexe, 'âgé', 'âgée', 'âgé(e)')} de ${age}`);

  const rattache = { diabete: false, hta: false };
  for (const { p, adj } of reconnues) {
    if (!adj) continue;
    let c = accord(sexe, adj.m, adj.f, adj.inconnu);
    const duree = dureeDepuis(p.depuisAnnee, today);
    if (duree) c += ` ${duree}`;
    // Le traitement résumé est rattaché à la PREMIÈRE pathologie du groupe, une seule fois.
    if (resume && adj.groupe && !rattache[adj.groupe] && resume[adj.groupe]) {
      c += ` ${resume[adj.groupe]}`;
      rattache[adj.groupe] = true;
    }
    clauses.push(c);
  }
  const autresPathologies = reconnues.filter(r => !r.adj).map(({ p }) =>
    `${minuscule(p.nom)}${anneeValide(p.depuisAnnee, today) ? ` depuis ${p.depuisAnnee}` : ''}`);
  if (autresPathologies.length > 0) clauses.push(`${accord(sexe, 'suivi', 'suivie', 'suivi(e)')} pour ${enumerer(autresPathologies)}`);

  const contexte = sansPointFinal(input.contexteSuivi ?? '');
  if (contexte) clauses.push(minuscule(contexte));

  paragraphes.push(`Permettez-moi de vous adresser **${nomPatient(input.patient)}**${clauses.length ? `, ${clauses.join(', ')}` : ''}.`);

  // ── Traitements ────────────────────────────────────────────────────────────
  if (traitements.length > 0) {
    if (resume) {
      const reste = [
        // Résumé non rattaché (défensif : ne se produit que si la pathologie n'a pas pu porter la mention).
        ...(resume.diabete && !rattache.diabete ? [resume.diabete.replace(/^sous /, '')] : []),
        ...(resume.hta && !rattache.hta ? [resume.hta.replace(/^sous /, '')] : []),
        ...resume.autres,
      ];
      if (reste.length > 0) {
        const intro = rattache.diabete || rattache.hta ? 'Traitement en cours par ailleurs' : 'Traitement en cours';
        paragraphes.push(`${intro} : ${reste.join(', ')}.`);
      }
    } else {
      const lignes = traitements.map(t => {
        const poso = sansPointFinal(t.posologie ?? '');
        return `${propre(t.nom)}${poso ? ` (${poso})` : ''}`;
      });
      paragraphes.push(`Traitement en cours : ${lignes.join(', ')}.`);
    }
  }

  // ── Sections facultatives : omises si vides ────────────────────────────────
  const antecedents = (input.antecedents ?? []).filter(a => propre(a.libelle));
  const medicaux = antecedents.filter(a => a.categorie !== 'toxique').map(a => antecedentTexte(a, today));
  const toxiques = antecedents.filter(a => a.categorie === 'toxique').map(a => antecedentTexte(a, today));
  const blocAntecedents = [
    medicaux.length ? `Antécédents : ${medicaux.join(', ')}.` : '',
    toxiques.length ? `Habitudes et toxiques : ${toxiques.join(', ')}.` : '',
  ].filter(Boolean).join(' ');
  if (blocAntecedents) paragraphes.push(blocAntecedents);

  const allMed = (input.allergiesMedicaments ?? []).map(propre).filter(Boolean);
  const allAlim = (input.allergiesAlimentaires ?? []).map(propre).filter(Boolean);
  const blocAllergies = [
    allMed.length ? `Allergies médicamenteuses : ${allMed.join(', ')}.` : '',
    allAlim.length ? `Allergies alimentaires : ${allAlim.join(', ')}.` : '',
  ].filter(Boolean).join(' ');
  if (blocAllergies) paragraphes.push(blocAllergies);

  const bilans = (input.bilans ?? []).filter(b => propre(b.label) && propre(b.valeur))
    .map(b => `${propre(b.label)} ${propre(b.valeur)}${dateFr(b.date) ? ` (${dateFr(b.date)})` : ''}`);
  const dfg = sansPointFinal(input.dfg ?? '');
  const blocBilans = [bilans.length ? `Derniers bilans : ${bilans.join(', ')}.` : '', dfg ? `${majuscule(dfg)}.` : ''].filter(Boolean).join(' ');
  if (blocBilans) paragraphes.push(blocBilans);

  const attente = (input.examensEnAttente ?? []).filter(e => propre(e.libelle));
  if (attente.length > 0) {
    const parDate = new Map<string, string[]>();
    for (const e of attente) parDate.set(e.dateDemande, [...(parDate.get(e.dateDemande) ?? []), minuscule(e.libelle)]);
    const groupes = [...parDate.entries()].map(([d, l]) => `${l.join(', ')}${dateFr(d) ? ` (demande du ${dateFr(d)})` : ''}`);
    paragraphes.push(`Examens en attente de résultat : ${groupes.join(' ; ')}.`);
  }

  const grossesse = propre(input.grossesse);
  if (grossesse) paragraphes.push(phrase(grossesse));

  // ── Motif, question, clôture ───────────────────────────────────────────────
  const motif = sansPointFinal(input.motif);
  const question = phrase(input.question ?? '');
  if (motif) paragraphes.push(`Je vous l'adresse pour ${minuscule(motif)}.${question ? ` ${majuscule(question)}` : ''}`);
  else if (question) paragraphes.push(majuscule(question));

  paragraphes.push(FORMULE_REMERCIEMENT, FORMULE_CLOTURE);
  return paragraphes.join('\n\n');
}
