// Sprint 2d — clic sûr, corticoïdes et antécédents digestifs, libellés.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  CLICK_STABLE_MS, anchorCompensation, createPositionGuard, decideClick, listSignature, pickById,
} from './stableSearch';
import {
  DRAFT_OFFER_MAX_AGE_MS, draftOfferDecision, draftOfferKey, type OrdonnanceDraft,
} from './ordonnanceDraft';
import {
  evaluateAntecedents, isLocalForm, medClasses, mergeWithExisting,
  type EngineAntecedent, type EngineMed, type RegleAntecedent, type RegleClasse,
} from './antecedentEngine';
import data from './regles_antecedents.data.json';
import { descriptionConditionnelle } from './safetyGuards';
import { texteAnsmLisible, texteEntremele } from './interactionText';

// ═══ 1. Clic sûr ═════════════════════════════════════════════════════════════

describe('Clic sûr : la liste ne doit pas avoir bougé dans les 300 ms qui précèdent', () => {
  const meds = [
    { id: 'g500', nom: 'GLUCOPHAGE 500 MG, Comprimé pelliculé' },
    { id: 'g850', nom: 'GLUCOPHAGE 850 MG, Comprimé pelliculé' },
    { id: 'g1000', nom: 'GLUCOPHAGE 1000 MG, Comprimé pelliculé' },
  ];
  const ids = meds.map(m => m.id);
  const LIGNE = 56; // hauteur d'une ligne de la liste (px)

  /**
   * Simulation de l'écran : la liste commence à `top`, le pointeur est à `y`. La ligne sous le
   * pointeur est celle que le navigateur désigne au clic (data-med-id).
   */
  const ligneSous = (top: number, y: number) => meds[Math.floor((y - top) / LIGNE)]?.id;
  /** Le clic tel que le traite le Vérificateur : identifiant de la ligne + garde-fou de position. */
  const clic = (guard: ReturnType<typeof createPositionGuard>, top: number, y: number, now: number): string | null => {
    const id = ligneSous(top, y);
    const picked = pickById(meds, id);
    if (!picked) return null;
    return decideClick(guard, listSignature(top, 0, ids), now) === 'accept' ? picked.id : null;
  };

  it('liste immobile : le clic ajoute la ligne visée', () => {
    const g = createPositionGuard();
    g.observe(listSignature(400, 0, ids), 0);
    // Le pointeur vise « Glucophage 850 » (2e ligne), la liste n'a pas bougé depuis 1 s.
    expect(clic(g, 400, 400 + LIGNE + 20, 1000)).toBe('g850');
  });

  it('DÉCALAGE PENDANT LE CLIC (bandeau qui disparaît au-dessus) : aucun ajout erroné', () => {
    const g = createPositionGuard();
    let top = 400;
    g.observe(listSignature(top, 0, ids), 0);
    const y = top + LIGNE + 20; // le pointeur vise le 850
    expect(ligneSous(top, y)).toBe('g850');
    // À t = 1000 ms un bandeau de 60 px disparaît au-dessus : la liste remonte d'une ligne environ.
    top -= 60;
    // Sous le pointeur, immobile, se trouve maintenant une AUTRE ligne.
    expect(ligneSous(top, y)).toBe('g1000');
    // Le clic part 80 ms plus tard, sans qu'aucune image n'ait encore observé le décalage.
    expect(clic(g, top, y, 1080)).toBeNull();
    // Même si le décalage a été observé entre-temps par la boucle d'images.
    g.observe(listSignature(top, 0, ids), 1016);
    expect(clic(g, top, y, 1100)).toBeNull();
    expect(clic(g, top, y, 1016 + CLICK_STABLE_MS - 1)).toBeNull();
  });

  it('après le décalage, la ligne est surlignée ; le second clic, liste immobile, ajoute la ligne visée', () => {
    const g = createPositionGuard();
    g.observe(listSignature(400, 0, ids), 0);
    const top = 340;
    expect(decideClick(g, listSignature(top, 0, ids), 1000)).toBe('hold');
    // Le médecin replace son pointeur sur le 850 et reclique 400 ms plus tard.
    expect(clic(g, top, top + LIGNE + 20, 1400)).toBe('g850');
  });

  it('liste dont le CONTENU change sous le pointeur (résultats remplacés) : clic ignoré', () => {
    const g = createPositionGuard();
    g.observe(listSignature(400, 0, ids), 0);
    expect(decideClick(g, listSignature(400, 0, ['g850', 'g500', 'g1000']), 2000)).toBe('hold');
    expect(decideClick(g, listSignature(400, 0, ['g850', 'g500', 'g1000']), 2000 + CLICK_STABLE_MS)).toBe('accept');
  });

  it('liste qui vient d’apparaître : pas cliquable avant 300 ms', () => {
    const g = createPositionGuard();
    expect(g.isStable(0)).toBe(false);
    expect(decideClick(g, listSignature(400, 0, ids), 50)).toBe('hold');
    expect(decideClick(g, listSignature(400, 0, ids), 50 + CLICK_STABLE_MS)).toBe('accept');
    g.reset();
    expect(g.isStable(10_000)).toBe(false);
  });

  it('un décalage inférieur au pixel n’est pas un mouvement', () => {
    expect(listSignature(400.2, 0, ids)).toBe(listSignature(400.4, 0, ids));
    expect(listSignature(400, 0, ids)).not.toBe(listSignature(401, 0, ids));
  });

  it('ancre de défilement : un bloc qui grandit au-dessus du champ est compensé au pixel près', () => {
    expect(anchorCompensation(300, 364, false)).toBe(64);   // bloc de 64 px chargé au-dessus → défilement +64
    expect(anchorCompensation(300, 240, false)).toBe(-60);  // bandeau de 60 px disparu → défilement −60
    expect(anchorCompensation(300, 300.3, false)).toBe(0);
    expect(anchorCompensation(null, 364, false)).toBe(0);   // première mesure : rien à compenser
    expect(anchorCompensation(300, 364, true)).toBe(0);     // l'utilisateur a fait défiler lui-même
  });

  it('les bandeaux du brouillon sont en superposition : ils ne poussent plus la page', () => {
    const src = readFileSync('src/pages/DoctorDashboard.tsx', 'utf8');
    const i = src.indexOf('bandeaux du brouillon EN SUPERPOSITION');
    expect(i).toBeGreaterThan(0);
    const bloc = src.slice(i, src.indexOf('<ErrorBoundary', i));
    expect(bloc).toContain('className="fixed z-40');
    expect(bloc).toContain('Brouillon restauré');
    // Plus aucun bandeau en flux (marges de page) au-dessus du contenu.
    expect(bloc).not.toContain('mx-4 mt-4 lg:mx-6 lg:mt-6');
    // La confirmation de l'ajout occupe une ligne de hauteur fixe.
    expect(src).toContain('<div className="h-9 mb-2 flex items-center gap-2 min-w-0" role="status" aria-live="polite">');
  });
});

describe('Brouillon : proposé une seule fois par visite', () => {
  const now = Date.UTC(2026, 9, 12, 10);
  const draft = (over: Partial<OrdonnanceDraft> = {}): OrdonnanceDraft => ({
    v: 1, savedAt: now - 60_000, doctorId: 'd1', patientId: 'p1',
    selectedMeds: [{ id: 'g850', nom: 'GLUCOPHAGE 850 MG' }], form: null, formOpen: false, ...over,
  });

  it('jamais proposé → proposé', () => {
    expect(draftOfferDecision(draft(), new Set(), now)).toBe('offer');
  });

  it('déjà proposé, repris ou supprimé pendant la visite → plus de bandeau', () => {
    const vus = new Set([draftOfferKey(draft())]);
    expect(draftOfferDecision(draft(), vus, now)).toBe('skip');
  });

  it('un travail ré-enregistré depuis (nouvelle version) peut être proposé', () => {
    const vus = new Set([draftOfferKey(draft())]);
    expect(draftOfferDecision(draft({ savedAt: now - 1000 }), vus, now)).toBe('offer');
  });

  it('plus de 7 jours, ou vide → supprimé, jamais proposé', () => {
    expect(draftOfferDecision(draft({ savedAt: now - DRAFT_OFFER_MAX_AGE_MS - 1 }), new Set(), now)).toBe('discard');
    expect(draftOfferDecision(draft({ savedAt: now - DRAFT_OFFER_MAX_AGE_MS + 1000 }), new Set(), now)).toBe('offer');
    expect(draftOfferDecision(draft({ selectedMeds: [] }), new Set(), now)).toBe('discard');
    expect(draftOfferDecision(null, new Set(), now)).toBe('discard');
  });

  it('la clé distingue le patient et la version', () => {
    expect(draftOfferKey(draft())).not.toBe(draftOfferKey(draft({ patientId: 'p2' })));
    expect(draftOfferKey(draft())).not.toBe(draftOfferKey(draft({ savedAt: now })));
  });
});

// ═══ 2. Corticoïdes et antécédents digestifs ═════════════════════════════════

const regles: RegleAntecedent[] = data.regles.map((r, i) => ({
  ...r, id: `r${i}`, actif: true,
  severite: r.severite as RegleAntecedent['severite'],
  criteres: r.criteres as RegleAntecedent['criteres'],
}));
const classes: RegleClasse[] = data.classes;

// Spécialités marocaines (DCI et formes telles qu'en base).
const SOLUPRED: EngineMed = { id: 'solupred', nom: 'SOLUPRED 20 MG', dci: 'PREDNISOLONE', forme: 'Comprimé effervescent' };
const CORTANCYL: EngineMed = { id: 'cortancyl', nom: 'CORTANCYL', dci: 'PREDNISONE', forme: 'COMPRIME' };
const MEDROL: EngineMed = { id: 'medrol', nom: 'SOLU MEDROL', dci: 'MÉTHYLPREDNISOLONE', forme: 'Poudre pour solution injectable(IM-IV)' };
const DECADRON: EngineMed = { id: 'decadron', nom: 'DECADRON 0.5 MG', dci: 'DEXAMÉTHASONE', forme: 'Comprimé sécable' };
const CELESTENE: EngineMed = { id: 'celestene', nom: 'CELESTENE 4 MG / ML', dci: 'BÉTAMÉTHASONE', forme: 'Solution injectable' };
const HYDROCORTISONE: EngineMed = { id: 'hc', nom: 'HYDROCORTISONE BIOCODEX', dci: 'HYDROCORTISONE', forme: 'Lyophilisat pour usage parenteral' };
const BETNEVAL: EngineMed = { id: 'betneval', nom: 'BETNEVAL 0.1 %', dci: 'BÉTAMÉTHASONE', forme: 'Crème' };
const DIPROSONE: EngineMed = { id: 'diprosone', nom: 'DIPROSONE CREME à 0.05 % 1 TUBE 30 G', dci: 'BÉTAMÉTHASONE', forme: null };
const TOBRADEX: EngineMed = { id: 'tobradex', nom: 'TOBRADEX 0.3 % / 1 %', dci: 'TOBRAMYCINE + DEXAMÉTHASONE', forme: 'Pommade ophtalmique' };
const POLYDEXA: EngineMed = { id: 'polydexa', nom: 'POLYDEXA', dci: 'DEXAMÉTHASONE', forme: 'Solution auriculaire' };
const BRUFEN: EngineMed = { id: 'brufen', nom: 'BRUFEN 400 MG', dci: 'IBUPROFÈNE', forme: 'Comprimé enrobé' };
const DOLIPRANE: EngineMed = { id: 'doliprane', nom: 'DOLIPRANE', dci: 'PARACETAMOL', forme: 'Comprimé' };

let seq = 0;
const ant = (partial: Partial<EngineAntecedent>): EngineAntecedent => ({
  id: `a${++seq}`, categorie: 'medical', libelle: 'Antécédent', archive: false,
  en_cours: null, date_debut_annee: null, details: {}, pathologie: null, ...partial,
});
const hemo = (details: Record<string, unknown> = {}) => ant({ libelle: 'Hémorragie digestive', details: { type: 'hemorragie_digestive', ...details } });
const ulcere = (details: Record<string, unknown> = {}) => ant({ libelle: 'Ulcère gastro-duodénal', details: { type: 'ulcere_gd', ...details } });
const run = (meds: EngineMed[], ants: EngineAntecedent[]) => evaluateAntecedents(meds, ants, regles, classes);

describe('Corticoïdes par voie générale et antécédents digestifs', () => {
  it('classe « corticoide » : six molécules, toutes limitées à la voie générale', () => {
    const c = classes.filter(x => x.classe === 'corticoide');
    expect(c.map(x => x.dci_motif).sort()).toEqual(['betamethasone', 'dexamethasone', 'hydrocortisone', 'methylprednisolone', 'prednisolone', 'prednisone']);
    expect(c.every(x => x.voie === 'generale')).toBe(true);
    for (const m of [SOLUPRED, CORTANCYL, MEDROL, DECADRON, CELESTENE, HYDROCORTISONE]) expect(medClasses(m, classes).has('corticoide'), m.nom).toBe(true);
    expect(medClasses(DOLIPRANE, classes).has('corticoide')).toBe(false);
  });

  it('formes locales (crème, pommade ophtalmique, gouttes auriculaires) : hors de la classe', () => {
    for (const m of [BETNEVAL, DIPROSONE, TOBRADEX, POLYDEXA]) {
      expect(medClasses(m, classes).has('corticoide'), m.nom).toBe(false);
      expect(run([m], [ulcere({ statut: 'evolutif' })]), m.nom).toEqual([]);
    }
    expect(isLocalForm('Collyre')).toBe(true);
    expect(isLocalForm('Gel dermique')).toBe(true);
    expect(isLocalForm('Gélule')).toBe(false);
    expect(isLocalForm('Comprimé effervescent')).toBe(false);
    expect(isLocalForm('Solution injectable')).toBe(false);
  });

  it('forme inconnue : voie générale supposée (zéro fausse réassurance)', () => {
    const sansForme: EngineMed = { id: 'x', nom: 'HOSTACORTIN H', dci: 'PREDNISOLONE' };
    expect(run([sansForme], [ulcere({ statut: 'evolutif' })])).toHaveLength(1);
  });

  it('ulcère évolutif ou hémorragie en cours → À ÉVALUER', () => {
    const [a] = run([SOLUPRED], [ulcere({ statut: 'evolutif' })]);
    expect(a.severite).toBe('a_evaluer');
    expect(a.regleCode).toBe('C1');
    expect(a.conduite).toBe('Corticothérapie : risque digestif majoré, protection gastrique à discuter.');
    expect(a.source).toBe("Proposition Ordosur d'après RCP — à valider");
    expect(run([CORTANCYL], [hemo({ en_cours: true })])[0].severite).toBe('a_evaluer');
  });

  it('antécédent d’ulcère (cicatrisé) ou d’hémorragie (ancienne) → PRÉCAUTION', () => {
    const [u] = run([SOLUPRED], [ulcere({ statut: 'cicatrise' })]);
    expect(u.severite).toBe('precaution');
    expect(u.regleCode).toBe('C2');
    expect(run([DECADRON], [hemo({ en_cours: false, sous_ains: 'oui', episodes: '2+' })])[0].severite).toBe('precaution');
  });

  it('ulcère de statut non renseigné → À ÉVALUER (il peut être évolutif)', () => {
    const [a] = run([SOLUPRED], [ulcere()]);
    expect(a.severite).toBe('a_evaluer');
    expect(a.regleCode).toBe('C1b');
  });

  it('JAMAIS de contre-indication absolue pour un corticoïde, quels que soient les critères', () => {
    expect(regles.filter(r => r.classe === 'corticoide')).toHaveLength(5);
    expect(regles.filter(r => r.classe === 'corticoide' && r.severite === 'absolue')).toEqual([]);
    const pires = [ulcere({ statut: 'evolutif', sous_ains: 'oui', episodes: '2+' }), hemo({ en_cours: true, sous_ains: 'oui', episodes: '2+', nature: 'perforation' })];
    for (const m of [SOLUPRED, CORTANCYL, MEDROL, DECADRON, CELESTENE, HYDROCORTISONE]) {
      for (const a of run([m], pires)) expect(a.severite, m.nom).not.toBe('absolue');
    }
  });

  it('AINS + corticoïde chez ce patient : chaque carte mentionne l’association', () => {
    const alerts = run([SOLUPRED, BRUFEN], [ulcere({ statut: 'cicatrise', sous_ains: 'non', episodes: '1' })]);
    const cortico = alerts.find(a => a.medId === 'solupred')!;
    const ains = alerts.find(a => a.medId === 'brufen')!;
    expect(cortico.also).toEqual(['association avec un AINS (BRUFEN 400 MG) : risque digestif majoré']);
    expect(ains.also).toEqual(['association avec un corticoïde (SOLUPRED 20 MG) : risque digestif majoré']);
    // La sévérité de l'AINS reste celle de ses propres règles.
    expect(ains.severite).toBe('precaution');
  });

  it('corticoïde seul, ou associé à un médicament sans rapport : pas de mention', () => {
    expect(run([SOLUPRED], [ulcere({ statut: 'cicatrise' })])[0].also).toBeUndefined();
    expect(run([SOLUPRED, DOLIPRANE], [ulcere({ statut: 'cicatrise' })])[0].also).toBeUndefined();
    // Un corticoïde LOCAL ne compte pas comme association.
    expect(run([BRUFEN, BETNEVAL], [ulcere({ statut: 'cicatrise', sous_ains: 'non', episodes: '1' })])[0].also).toBeUndefined();
  });

  it('sans antécédent digestif : aucune alerte', () => {
    expect(run([SOLUPRED, BRUFEN], [])).toEqual([]);
    expect(run([SOLUPRED], [ant({ libelle: 'Appendicectomie', categorie: 'chirurgical' })])).toEqual([]);
  });

  it('alerte absorbée par une CI existante : l’association reste dite sur la carte', () => {
    const alerts = run([SOLUPRED, BRUFEN], [ulcere({ statut: 'cicatrise', sous_ains: 'non', episodes: '1' })]);
    const existing = [{ type: 'contraindication', severite: 'majeure', involved: ['SOLUPRED 20 MG'], condition: 'Ulcère gastro-duodénal' }];
    const { standalone, alsoByIndex } = mergeWithExisting(existing, alerts.filter(a => a.medId === 'solupred'));
    expect(standalone).toEqual([]);
    expect(alsoByIndex.get(0)).toEqual(['antécédent de ulcère gastro-duodénal', 'association avec un AINS (BRUFEN 400 MG) : risque digestif majoré']);
  });

  it('les règles AINS / aspirine / anticoagulants existantes ne changent pas', () => {
    expect(regles.filter(r => r.classe !== 'corticoide')).toHaveLength(24);
    expect(run([BRUFEN], [ulcere({ statut: 'evolutif' })])[0]).toMatchObject({ severite: 'absolue', regleCode: 'R1' });
    expect(run([BRUFEN], [hemo({ sous_ains: 'oui' })])[0]).toMatchObject({ severite: 'absolue', regleCode: 'R2' });
  });

  it('empreinte de la source présente (comparée à la base à la livraison)', () => {
    expect(data.empreinte.regles).toMatch(/^[0-9a-f]{32}$/);
    expect(data.empreinte.classes).toMatch(/^[0-9a-f]{32}$/);
    const sql = readFileSync('supabase/migrations/20261024120000_regles_antecedents_corticoides.sql', 'utf8');
    expect(sql).toContain(`règles ${data.empreinte.regles} · classes ${data.empreinte.classes}`);
    expect(sql).not.toMatch(/'corticoide', '[a-z_]+', '\{[^\n]*'absolue'/);
  });
});

// ═══ 3. Libellés ═════════════════════════════════════════════════════════════

describe('Carte rétrogradée : « CI absolue SI [qualificatif] »', () => {
  it('ne dit plus « CI absolue » comme si elle s’appliquait', () => {
    const t = descriptionConditionnelle('Si infection évolutive ou sévère (patient : « Infection urinaire »)', 'absolue',
      "CI absolue : les corticoïdes suppriment l'immunité et favorisent la dissémination");
    expect(t).toBe("Contre-indication absolue si infection évolutive ou sévère (patient : « Infection urinaire »). Les corticoïdes suppriment l'immunité et favorisent la dissémination");
    expect(t).not.toMatch(/CI absolue\s*:/);
  });

  it('sévérité conservée « à préciser »', () => {
    expect(descriptionConditionnelle('Si sévère — préciser (patient : « Insuffisance hépatique »)', 'absolue', 'Contre-indication formelle — accumulation du médicament.'))
      .toBe('Contre-indication absolue si sévère — préciser (patient : « Insuffisance hépatique »). Accumulation du médicament.');
  });

  it('CI relative, description sans affirmation en tête : texte conservé', () => {
    expect(descriptionConditionnelle('Si non contrôlée (patient : « Épilepsie »)', 'relative', 'Abaissement du seuil épileptogène.'))
      .toBe('Contre-indication relative si non contrôlée (patient : « Épilepsie »). Abaissement du seuil épileptogène.');
  });

  it('titre qui n’est pas une condition (stade rénal à préciser)', () => {
    expect(descriptionConditionnelle('Préciser le stade ou saisir une créatinine (patient : « IRC »)', 'absolue', 'CI absolue : accumulation.'))
      .toBe('Préciser le stade ou saisir une créatinine (patient : « IRC »). Contre-indication absolue si la condition est confirmée. Accumulation.');
  });

  it('description vide', () => {
    expect(descriptionConditionnelle('Si évolutive', 'absolue', '')).toBe('Contre-indication absolue si évolutive.');
  });
});

describe('Texte d’interaction ANSM : niveau inséré au milieu de la phrase', () => {
  it('prednisolone × ciprofloxacine : « rupture A prendre en compte tendineuse » → phrase recousue', () => {
    const r = texteAnsmLisible('Possible majoration du risque de tendinopathie, voire de rupture A prendre en compte tendineuse (exceptionnelle), particulièrement chez les patients recevant une corticothérapie prolongée.');
    expect(r.corrige).toBe(true);
    expect(r.niveau).toBe('à prendre en compte');
    expect(r.texte).toBe('Possible majoration du risque de tendinopathie, voire de rupture tendineuse (exceptionnelle), particulièrement chez les patients recevant une corticothérapie prolongée. — Niveau ANSM : à prendre en compte.');
    expect(r.texte).not.toContain('rupture A prendre');
  });

  it('niveau suivi de la conduite à tenir : deux phrases distinctes', () => {
    const r = texteAnsmLisible("Diminution de l'absorption digestive des cyclines et du fer Précaution d'emploi Prendre les sels de fer à distance des cyclines (plus de 2 heures, si possible).");
    expect(r.texte).toBe("Diminution de l'absorption digestive des cyclines et du fer. Prendre les sels de fer à distance des cyclines (plus de 2 heures, si possible). — Niveau ANSM : précaution d’emploi.");
  });

  it('niveau suivi d’un sigle (CYP2D6) : la phrase continue', () => {
    const r = texteAnsmLisible("Chez les patients ayant un génotype de métaboliseurs lents du CONTRE-INDICATION CYP2D6, risque de majoration des effets indésirables de l'éliglustat.");
    expect(r.texte).toBe("Chez les patients ayant un génotype de métaboliseurs lents du CYP2D6, risque de majoration des effets indésirables de l'éliglustat. — Niveau ANSM : contre-indication.");
  });

  it('niveau combiné « CI - ASDEC - APEC »', () => {
    const r = texteAnsmLisible("Majoration du risque hémorragique, notamment en cas CI - ASDEC - APEC d'antécédent d'ulcère gastro-duodénal.");
    expect(r.texte).toBe("Majoration du risque hémorragique, notamment en cas d'antécédent d'ulcère gastro-duodénal. — Niveau ANSM : contre-indication, association déconseillée, à prendre en compte selon les cas.");
  });

  it('niveau déjà placé après une phrase terminée : texte inchangé', () => {
    for (const d of ["Majoration de l'immunodépression. Association DECONSEILLEE", "Risque de maladie vaccinale généralisée, éventuellement mortelle. Association DECONSEILLEE ainsi que pendant les 3 mois suivant l'arrêt du traitement."]) {
      const r = texteAnsmLisible(d);
      expect(r.texte).toBe(d);
      expect(r.corrige).toBe(false);
      expect(r.niveau).toBe('association déconseillée');
    }
  });

  it('texte sans niveau (DDInter, cumul de classe) : inchangé', () => {
    const d = "Association de deux medicaments de la meme classe a risque (morphiniques). Cumul d'effets : risque majore.";
    expect(texteAnsmLisible(d)).toEqual({ texte: d, niveau: null, corrige: false });
    expect(texteAnsmLisible(null).texte).toBe('');
    // « Il convient de prendre en compte… » n'est pas le marqueur de niveau.
    expect(texteAnsmLisible("Il convient de prendre en compte le risque lié à l'association.").corrige).toBe(false);
  });

  it('limite connue : colonnes de plusieurs lignes encore entremêlées (signalé, non corrigeable à l’affichage)', () => {
    const r = texteAnsmLisible("Chez l'insuffisant cardiaque, risque d'augmentation des effets Précaution d'emploi indésirables du métoprolol, par diminution de son métabolisme Surveillance clinique. Si besoin, adaptation de la posologie du hépatique par l'abiratérone. métoprolol pendant le traitement.");
    expect(r.texte).not.toContain("effets Précaution d'emploi indésirables");
    expect(texteEntremele(r.texte)).toBe(true);
    expect(texteEntremele(texteAnsmLisible('Possible majoration du risque de tendinopathie, voire de rupture A prendre en compte tendineuse (exceptionnelle).').texte)).toBe(false);
  });
});
