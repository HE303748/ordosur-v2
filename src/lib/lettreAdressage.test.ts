import { describe, it, expect } from 'vitest';
import {
  SPECIALITES_ADRESSAGE, accepterRegeneration, ageLettre, antecedentTexte, badgeSansReponse, classesTraitement, dateLimiteSansReponse,
  destinataireLigne, dureeDepuis, estModifie, formuleOuverture, garderTexte, genererLettre, grossesseTexte, htmlToMarkup,
  joursSansReponse, markupToHtml, markupToPlain, mentionUrgence, minuscule, normaliserMarkup, objetLettre, parseMarkup, patientLigne,
  peutPasser, propositionEnAttente, resumerParClasse, surRegeneration, surSaisie, texteInitial, transitionsPossibles, trierLettres,
  validerLettre, FORMULE_CLOTURE, FORMULE_REMERCIEMENT, adressageDraftBelongsTo, adressageDraftHasContent, destinataireCourt, emptyAdressageParams,
  type AdressageDraft, type LettreInput, type LettreTraitement,
} from './lettreAdressage';

const today = new Date(2026, 9, 12); // 12/10/2026

// Médicaments marocains du traitement de fond (fiche de la base : DCI).
const glucophage: LettreTraitement = { nom: 'Glucophage 850 mg', posologie: '1 comprimé matin et soir', dci: 'metformine' };
const diamicron: LettreTraitement = { nom: 'Diamicron 30 mg', posologie: '1 comprimé le matin', dci: 'gliclazide' };
const triatec: LettreTraitement = { nom: 'Triatec 5 mg', posologie: '1 comprimé le matin', dci: 'ramipril' };
const amlor: LettreTraitement = { nom: 'Amlor 5 mg', posologie: '1 gélule le soir', dci: 'amlodipine' };
const tahor: LettreTraitement = { nom: 'Tahor 20 mg', posologie: '1 comprimé le soir', dci: 'atorvastatine' };
const kardegic: LettreTraitement = { nom: 'Kardegic 75 mg', posologie: '1 sachet par jour', dci: 'acétylsalicylate de lysine' };
const lantus: LettreTraitement = { nom: 'Lantus', posologie: '20 UI le soir', dci: 'insuline glargine' };
const avlocardyl: LettreTraitement = { nom: 'Avlocardyl 40 mg', posologie: '1 comprimé matin et soir', dci: 'propranolol' };
const levothyrox: LettreTraitement = { nom: 'Levothyrox 75 µg', posologie: '1 comprimé le matin à jeun', dci: 'lévothyroxine sodique' };
const horsBase: LettreTraitement = { nom: 'Tisane du soir' };

const base = (over: Partial<LettreInput> = {}): LettreInput => ({
  today,
  patient: { prenom: 'karim', nom: 'ALAOUI', sexe: 'M', date_naissance: '1999-03-10' },
  pathologies: [{ nom: 'Diabète de type 2', depuisAnnee: 2024 }, { nom: 'Hypertension artérielle', depuisAnnee: 2019 }],
  traitements: [glucophage, triatec],
  modeTraitements: 'classes',
  contexteSuivi: 'Suivi dans notre formation pour prise en charge d’une stéatose hépatique.',
  motif: 'Complément de prise en charge',
  ...over,
});
const paragraphes = (i: LettreInput) => genererLettre(i).split('\n\n');
const identite = (i: LettreInput) => paragraphes(i)[1];

describe('Lettre d’adressage — exemple de référence (patient diabétique et hypertendu)', () => {
  it('reproduit la lettre attendue par la gastro-entérologue', () => {
    expect(markupToPlain(genererLettre(base()))).toBe([
      'Chers collègues,',
      'Permettez-moi de vous adresser M. Karim Alaoui, âgé de 27 ans, diabétique de type 2 depuis 2 ans sous antidiabétiques oraux, hypertendu depuis 7 ans sous monothérapie antihypertensive, suivi dans notre formation pour prise en charge d’une stéatose hépatique.',
      'Je vous l\'adresse pour complément de prise en charge.',
      FORMULE_REMERCIEMENT,
      FORMULE_CLOTURE,
    ].join('\n\n'));
  });

  it('est déterministe : même entrée, même texte', () => {
    expect(genererLettre(base())).toBe(genererLettre(base()));
  });

  it('le nom du patient est en gras et toujours présent', () => {
    expect(genererLettre(base())).toContain('**M. Karim Alaoui**');
    expect(genererLettre(base({ pathologies: [], traitements: [], contexteSuivi: '', patient: { prenom: 'Karim', nom: 'Alaoui' } })))
      .toContain('Permettez-moi de vous adresser **M./Mme Karim Alaoui**.');
  });
});

describe('Accords M. / Mme / sexe inconnu', () => {
  it('homme', () => {
    expect(identite(base())).toContain('**M. Karim Alaoui**, âgé de 27 ans, diabétique de type 2');
    expect(identite(base())).toContain('hypertendu depuis');
  });

  it('femme : âgée, hypertendue, suivie, insuffisante rénale chronique, coronarienne', () => {
    const t = identite(base({
      patient: { prenom: 'Fatima Zahra', nom: 'el idrissi', sexe: 'F', date_naissance: '1972-03-10' },
      pathologies: [{ nom: 'HTA' }, { nom: 'Insuffisance rénale chronique' }, { nom: 'Cardiopathie ischémique' }, { nom: 'Hypothyroïdie', depuisAnnee: 2018 }],
      traitements: [], contexteSuivi: '',
    }));
    expect(t).toBe('Permettez-moi de vous adresser **Mme Fatima Zahra El Idrissi**, âgée de 54 ans, hypertendue, insuffisante rénale chronique, coronarienne, suivie pour hypothyroïdie depuis 2018.');
  });

  it('sexe inconnu : « M./Mme » et formes « (e) », jamais de sexe supposé', () => {
    const t = identite(base({ patient: { prenom: 'Camille', nom: 'Bennis', sexe: null, date_naissance: '1990-01-01' }, pathologies: [{ nom: 'HTA' }, { nom: 'Stéatose hépatique' }], traitements: [], contexteSuivi: '' }));
    expect(t).toBe('Permettez-moi de vous adresser **M./Mme Camille Bennis**, âgé(e) de 36 ans, hypertendu(e), suivi(e) pour stéatose hépatique.');
  });

  it('âge : années, mois pour un nourrisson, omis si la date de naissance est inconnue', () => {
    expect(ageLettre('1999-10-12', today)).toBe('27 ans');
    expect(ageLettre('1999-10-13', today)).toBe('26 ans');
    expect(ageLettre('2026-02-01', today)).toBe('8 mois');
    expect(ageLettre(null, today)).toBeNull();
    expect(ageLettre('2030-01-01', today)).toBeNull();
    expect(identite(base({ patient: { prenom: 'Karim', nom: 'Alaoui', sexe: 'M' }, pathologies: [], traitements: [], contexteSuivi: '' })))
      .toBe('Permettez-moi de vous adresser **M. Karim Alaoui**.');
  });

  it('ligne patient imprimée', () => {
    expect(patientLigne({ prenom: 'karim', nom: 'ALAOUI', sexe: 'M', date_naissance: '1999-03-10' }, today)).toBe('M. Karim Alaoui — 27 ans');
    expect(patientLigne({ prenom: 'Karim', nom: 'Alaoui' }, today)).toBe('M./Mme Karim Alaoui');
  });
});

describe('Pathologies : adjectifs, durées, pathologie sans date', () => {
  it('adjectifs des pathologies courantes', () => {
    const t = identite(base({ pathologies: [{ nom: 'Diabète' }, { nom: 'Asthme' }, { nom: 'Épilepsie' }, { nom: 'Angor' }, { nom: 'IRC' }], traitements: [], contexteSuivi: '' }));
    expect(t).toContain('diabétique, asthmatique, épileptique, coronarien, insuffisant rénal chronique.');
  });

  it('durée calculée depuis l’année de diagnostic', () => {
    expect(dureeDepuis(2024, today)).toBe('depuis 2 ans');
    expect(dureeDepuis(2025, today)).toBe('depuis 1 an');
    expect(dureeDepuis(2026, today)).toBe('depuis cette année');
    expect(dureeDepuis(null, today)).toBe('');
    expect(dureeDepuis(2031, today)).toBe('');
  });

  it('pathologie sans date : la durée est omise, jamais inventée', () => {
    const t = identite(base({ pathologies: [{ nom: 'Diabète de type 2' }, { nom: 'Hypertension artérielle', depuisAnnee: null }], traitements: [], contexteSuivi: '' }));
    expect(t).toBe('Permettez-moi de vous adresser **M. Karim Alaoui**, âgé de 27 ans, diabétique de type 2, hypertendu.');
    expect(t).not.toContain('depuis');
  });

  it('pathologie sans adjectif : « suivi pour [pathologie] depuis [année] »', () => {
    const t = identite(base({ pathologies: [{ nom: 'Stéatose hépatique', depuisAnnee: 2021 }, { nom: 'BPCO' }, { nom: 'Maladie de Crohn', depuisAnnee: 2015 }], traitements: [], contexteSuivi: '' }));
    expect(t).toContain('suivi pour stéatose hépatique depuis 2021, BPCO et maladie de Crohn depuis 2015.');
  });

  it('un libellé proche mais différent garde son libellé (aucune perte d’information)', () => {
    const t = identite(base({ pathologies: [{ nom: 'Diabète insipide' }, { nom: 'Hypertension portale' }, { nom: 'Asthme sévère' }, { nom: 'Insuffisance rénale chronique stade 4' }, { nom: 'Diabète gestationnel' }], traitements: [], contexteSuivi: '' }));
    expect(t).not.toMatch(/diabétique|hypertendu|asthmatique|insuffisant rénal/);
    expect(t).toContain('suivi pour diabète insipide, hypertension portale, asthme sévère, insuffisance rénale chronique stade 4 et diabète gestationnel.');
  });

  it('minuscule : les sigles sont conservés', () => {
    expect(minuscule('Stéatose hépatique')).toBe('stéatose hépatique');
    expect(minuscule('BPCO')).toBe('BPCO');
    expect(minuscule('HTA sévère')).toBe('HTA sévère');
  });
});

describe('Traitements : mode détaillé et résumé par classe', () => {
  it('mode détaillé : noms et posologies, sans résumé', () => {
    const p = paragraphes(base({ modeTraitements: 'detaille', traitements: [glucophage, triatec, horsBase] }));
    expect(p[1]).not.toContain('sous ');
    expect(p[2]).toBe('Traitement en cours : Glucophage 850 mg (1 comprimé matin et soir), Triatec 5 mg (1 comprimé le matin), Tisane du soir.');
  });

  it('résumé par classe : rattaché à la pathologie, pas de paragraphe traitement s’il ne reste rien', () => {
    const p = paragraphes(base());
    expect(p[1]).toContain('diabétique de type 2 depuis 2 ans sous antidiabétiques oraux');
    expect(p[1]).toContain('hypertendu depuis 7 ans sous monothérapie antihypertensive');
    expect(p.some(x => x.startsWith('Traitement en cours'))).toBe(false);
  });

  it('insuline, insuline + antidiabétiques oraux', () => {
    expect(identite(base({ traitements: [lantus] }))).toContain('sous insuline,');
    expect(identite(base({ traitements: [lantus, glucophage, diamicron] }))).toContain('sous insuline et antidiabétiques oraux');
  });

  it('bithérapie, trithérapie (une association fixe compte ses deux classes)', () => {
    expect(identite(base({ traitements: [triatec, amlor] }))).toContain('sous bithérapie antihypertensive');
    expect(identite(base({ traitements: [triatec, amlor, avlocardyl] }))).toContain('sous trithérapie antihypertensive');
    const coveram: LettreTraitement = { nom: 'Coveram 5 mg/5 mg', dci: 'périndopril arginine + amlodipine' };
    expect(classesTraitement(coveram).map(c => c.id).sort()).toEqual(['iec', 'inhibiteurs_calciques']);
    expect(identite(base({ traitements: [coveram] }))).toContain('sous bithérapie antihypertensive');
  });

  it('classe inconnue : nom du médicament, et le décompte n’est plus affirmé', () => {
    const p = paragraphes(base({ traitements: [triatec, levothyrox, horsBase] }));
    expect(p[1]).toContain('hypertendu depuis 7 ans sous traitement antihypertenseur');
    expect(p[1]).not.toContain('monothérapie');
    expect(p[2]).toBe('Traitement en cours par ailleurs : Levothyrox 75 µg, Tisane du soir.');
  });

  it('autres classes connues listées par leur nom de classe', () => {
    const p = paragraphes(base({ traitements: [glucophage, triatec, tahor, kardegic] }));
    expect(p[2]).toBe('Traitement en cours par ailleurs : statine, aspirine.');
  });

  it('bêtabloquant chez un patient NON hypertendu (cirrhose) : jamais « antihypertenseur »', () => {
    const p = paragraphes(base({ pathologies: [{ nom: 'Cirrhose', depuisAnnee: 2019 }], traitements: [avlocardyl], contexteSuivi: '' }));
    expect(p.join(' ')).not.toMatch(/antihypertens/);
    expect(p[2]).toBe('Traitement en cours : bêtabloquant.');
  });

  it('antidiabétique oral chez un patient non diabétique : cité, non rattaché', () => {
    const r = resumerParClasse([glucophage], { diabete: false, hta: false });
    expect(r).toEqual({ diabete: '', hta: '', autres: ['antidiabétiques oraux'] });
  });

  it('les classes viennent des référentiels existants (ANSM / regles_*)', () => {
    expect(classesTraitement(glucophage).map(c => c.id)).toEqual(['metformine']);
    expect(classesTraitement(diamicron).map(c => c.id)).toEqual(['sulfamides_hypoglycemiants']);
    expect(classesTraitement(tahor).map(c => c.id)).toEqual(['statines']);
    expect(classesTraitement({ nom: 'Lasilix 40 mg', dci: 'furosémide' }).map(c => c.id)).toEqual(['diuretiques']);
    expect(classesTraitement({ nom: 'Brufen 400 mg', dci: 'ibuprofène' }).map(c => c.id)).toEqual(['ains']);
    expect(classesTraitement(horsBase)).toEqual([]);
    // Début de mot uniquement : « apomorphine » n'est pas un opioïde.
    expect(classesTraitement({ nom: 'Apokinon', dci: 'apomorphine' })).toEqual([]);
  });

  it('aucun traitement : aucune mention', () => {
    expect(genererLettre(base({ traitements: [] }))).not.toMatch(/Traitement|sous /);
  });
});

describe('Sections facultatives : omises si vides, aucune donnée inventée', () => {
  it('sans donnée, aucune section n’apparaît (ni « aucune allergie », ni « néant »)', () => {
    const t = genererLettre(base({ antecedents: [], allergiesMedicaments: [], allergiesAlimentaires: [], bilans: [], dfg: null, examensEnAttente: [], grossesse: '' }));
    expect(t).not.toMatch(/Antécédents|Habitudes|Allergies|bilans|DFG|Examens|enceinte|Allaitement/i);
    expect(t).not.toMatch(/aucun|néant|non renseigné|inconnu/i);
    expect(t.split('\n\n')).toHaveLength(5);
  });

  it('toutes les sections, dans l’ordre', () => {
    const p = paragraphes(base({
      antecedents: [
        { libelle: 'Cholécystectomie', categorie: 'chirurgical', debutAnnee: 2015 },
        { libelle: 'Ulcère gastro-duodénal', categorie: 'medical', debutAnnee: 2019, details: 'Cicatrisé · Hors AINS' },
        { libelle: 'Tabagisme', categorie: 'toxique', debutAnnee: 2010, enCours: true, details: 'Actif · 10 PA' },
        { libelle: 'Phytothérapie', categorie: 'toxique', details: 'Fenugrec' },
      ],
      allergiesMedicaments: ['Pénicilline', 'Augmentin'], allergiesAlimentaires: ['Arachide'],
      bilans: [{ label: 'HbA1c', valeur: '7,2 %', date: '2026-09-12' }, { label: 'Créatinine', valeur: '9 mg/L', date: '2026-09-12' }],
      dfg: 'DFG estimé à 98 mL/min/1,73 m² (CKD-EPI, créatinine du 12/09/2026)',
      examensEnAttente: [{ libelle: 'Échographie hépatique', dateDemande: '2026-10-01' }, { libelle: 'NFS (hémogramme)', dateDemande: '2026-10-01' }, { libelle: 'Fibroscan', dateDemande: '2026-10-08' }],
      question: 'Une ponction-biopsie hépatique est-elle indiquée ?',
    }));
    expect(p[2]).toBe('Antécédents : cholécystectomie (en 2015), ulcère gastro-duodénal (en 2019, cicatrisé, hors AINS). Habitudes et toxiques : tabagisme (depuis 2010, actif, 10 PA), phytothérapie (fenugrec).');
    expect(p[3]).toBe('Allergies médicamenteuses : Pénicilline, Augmentin. Allergies alimentaires : Arachide.');
    expect(p[4]).toBe('Derniers bilans : HbA1c 7,2 % (12/09/2026), Créatinine 9 mg/L (12/09/2026). DFG estimé à 98 mL/min/1,73 m² (CKD-EPI, créatinine du 12/09/2026).');
    expect(p[5]).toBe('Examens en attente de résultat : échographie hépatique, NFS (hémogramme) (demande du 01/10/2026) ; fibroscan (demande du 08/10/2026).');
    expect(p[6]).toBe('Je vous l\'adresse pour complément de prise en charge. Une ponction-biopsie hépatique est-elle indiquée ?');
    expect(p).toHaveLength(9);
  });

  it('antécédent : période d’après les années connues seulement', () => {
    expect(antecedentTexte({ libelle: 'Appendicectomie' }, today)).toBe('appendicectomie');
    expect(antecedentTexte({ libelle: 'Hépatite virale B', debutAnnee: 2012, finAnnee: 2014 }, today)).toBe('hépatite virale B (2012-2014)');
    expect(antecedentTexte({ libelle: 'Tabagisme', finAnnee: 2020, details: 'Sevré en 2020' }, today)).toBe('tabagisme (sevré en 2020)');
    expect(antecedentTexte({ libelle: 'Tabagisme', finAnnee: 2020, details: '15 PA' }, today)).toBe('tabagisme (jusqu\'en 2020, 15 PA)');
    expect(antecedentTexte({ libelle: 'Asthme', debutAnnee: 2099 }, today)).toBe('asthme');
  });

  it('grossesse : seulement si pertinente', () => {
    expect(grossesseTexte({ statut: 'enceinte', sa: 24, allaitement: null })).toBe('Patiente enceinte, terme de 24 SA.');
    expect(grossesseTexte({ statut: 'enceinte', sa: null, allaitement: null })).toBe('Patiente enceinte.');
    expect(grossesseTexte({ statut: 'non_enceinte', sa: null, allaitement: true })).toBe('Allaitement en cours.');
    expect(grossesseTexte({ statut: 'non_enceinte', sa: null, allaitement: false })).toBe('');
    expect(grossesseTexte({ statut: 'inconnu', sa: null, allaitement: null })).toBe('');
    expect(genererLettre(base({ grossesse: 'Patiente enceinte, terme de 24 SA.' }))).toContain('\n\nPatiente enceinte, terme de 24 SA.\n\n');
  });

  it('motif libre et question', () => {
    expect(genererLettre(base({ motif: 'Avis spécialisé.' }))).toContain('Je vous l\'adresse pour avis spécialisé.\n\n');
    expect(genererLettre(base({ motif: 'Bilan d’une dysphagie', question: 'faut-il une fibroscopie' })))
      .toContain('Je vous l\'adresse pour bilan d’une dysphagie. Faut-il une fibroscopie.');
  });

  it('la lettre ne contient que des données fournies (aucun mot clinique en trop)', () => {
    const t = markupToPlain(genererLettre(base({ pathologies: [], traitements: [], contexteSuivi: '' })));
    expect(t).toBe(['Chers collègues,', 'Permettez-moi de vous adresser M. Karim Alaoui, âgé de 27 ans.', 'Je vous l\'adresse pour complément de prise en charge.', FORMULE_REMERCIEMENT, FORMULE_CLOTURE].join('\n\n'));
  });
});

describe('Formule d’ouverture et destinataire', () => {
  it('selon le destinataire', () => {
    expect(formuleOuverture(null)).toBe('Chers collègues,');
    expect(formuleOuverture({ nom: 'Bennani', civilite: 'M' })).toBe('Cher confrère,');
    expect(formuleOuverture({ nom: 'Bennani', civilite: 'Mme' })).toBe('Chère consœur,');
    // Civilité non saisie : jamais déduite du prénom.
    expect(formuleOuverture({ nom: 'Bennani', prenom: 'Salma', civilite: null })).toBe('Chère consœur, cher confrère,');
    expect(formuleOuverture({ nom: '  ' })).toBe('Chers collègues,');
    expect(genererLettre(base({ confrere: { nom: 'Bennani', civilite: 'Mme' } })).startsWith('Chère consœur,\n\n')).toBe(true);
  });

  it('ligne « À l’attention de »', () => {
    expect(destinataireLigne({ confrere: { titre: 'Dr', civilite: 'Mme', nom: 'BENNANI', prenom: 'salma', specialite: 'Cardiologie' }, specialite: 'Cardiologie' }))
      .toBe('À l\'attention du Dr Salma Bennani, cardiologie');
    expect(destinataireLigne({ confrere: { titre: 'Pr', nom: 'Alami', specialite: 'ORL' }, specialite: 'ORL' })).toBe('À l\'attention du Pr Alami, ORL');
    expect(destinataireLigne({ specialite: 'Cardiologie' })).toBe('À l\'attention de Monsieur ou Madame le cardiologue');
    expect(destinataireLigne({ specialite: 'Autre' })).toBe('À l\'attention de Monsieur ou Madame le médecin spécialiste');
    expect(destinataireLigne({ specialite: 'Cardiologie', libre: 'Service de cardiologie, CHU Ibn Rochd' })).toBe('À l\'attention de : Service de cardiologie, CHU Ibn Rochd');
  });

  it('objet, urgence, spécialités', () => {
    expect(objetLettre('Complément de prise en charge.')).toBe('Objet : Adressage — Complément de prise en charge');
    expect(mentionUrgence('urgent')).toBe('URGENT');
    expect(mentionUrgence('programme')).toBeNull();
    expect(SPECIALITES_ADRESSAGE).toHaveLength(23);
    expect(SPECIALITES_ADRESSAGE[22].label).toBe('Autre');
  });

  it('spécialité et motif obligatoires', () => {
    expect(validerLettre({ specialite: 'Cardiologie', motif: 'Avis spécialisé', texte: 'Chers collègues,' })).toEqual([]);
    expect(validerLettre({ specialite: '', motif: ' ', texte: '' })).toHaveLength(3);
    expect(validerLettre({ specialite: 'Cardiologie', motif: '', texte: 'x' })).toEqual(['Le motif de l’adressage est obligatoire.']);
  });
});

describe('Texte riche simple : paragraphes et gras', () => {
  const texte = 'Chers collègues,\n\nPermettez-moi de vous adresser **M. Karim Alaoui**, âgé de 27 ans.\n\nLigne 1\nLigne 2';

  it('aller-retour sans perte', () => {
    expect(htmlToMarkup(markupToHtml(texte))).toBe(texte);
    expect(markupToHtml(texte)).toBe('<p>Chers collègues,</p><p>Permettez-moi de vous adresser <strong>M. Karim Alaoui</strong>, âgé de 27 ans.</p><p>Ligne 1<br>Ligne 2</p>');
    expect(markupToPlain(texte)).toContain('adresser M. Karim Alaoui, âgé');
  });

  it('HTML des navigateurs : <div>, <b>, <span style>, &nbsp;, lignes vides', () => {
    expect(htmlToMarkup('<div>Chers collègues,</div><div><br></div><div>Je vous adresse <b>M.&nbsp;Alaoui</b> &amp; sa famille.</div>'))
      .toBe('Chers collègues,\n\nJe vous adresse **M. Alaoui** & sa famille.');
    expect(htmlToMarkup('<p>Texte <span style="font-weight: 700;">important </span>ici</p>')).toBe('Texte **important** ici');
    expect(htmlToMarkup('Sans balise<div>Deuxième</div>')).toBe('Sans balise\n\nDeuxième');
    expect(htmlToMarkup('<p><strong>Gras<br>sur deux lignes</strong></p>')).toBe('**Gras**\n**sur deux lignes**');
  });

  it('le texte est toujours échappé (aucune balise injectée)', () => {
    expect(markupToHtml('a < b & <script>x</script>')).toBe('<p>a &lt; b &amp; &lt;script&gt;x&lt;/script&gt;</p>');
    expect(htmlToMarkup(markupToHtml('a < b & c'))).toBe('a < b & c');
    expect(markupToHtml('')).toBe('<p><br></p>');
  });

  it('segments pour le PDF', () => {
    expect(parseMarkup('a **b** c\n\nd')).toEqual([[{ text: 'a ', bold: false }, { text: 'b', bold: true }, { text: ' c', bold: false }], [{ text: 'd', bold: false }]]);
    expect(normaliserMarkup('  a  b \n\n\n\n c \n')).toBe('a b\n\nc');
  });
});

describe('Modification manuelle protégée', () => {
  const g1 = genererLettre(base());
  const g2 = genererLettre(base({ motif: 'Avis spécialisé' }));
  const g3 = genererLettre(base({ motif: 'Avis spécialisé', question: 'Faut-il une biopsie ?' }));

  it('texte intact : il suit les paramètres, sans confirmation', () => {
    const s = surRegeneration(texteInitial(g1), g2);
    expect(s.texte).toBe(g2);
    expect(estModifie(s)).toBe(false);
    expect(propositionEnAttente(s)).toBe(false);
  });

  it('texte modifié à la main : un changement de paramètre ne l’écrase JAMAIS', () => {
    const manuel = g1.replace('Confraternellement.', 'Bien confraternellement.');
    let s = surSaisie(texteInitial(g1), manuel);
    expect(estModifie(s)).toBe(true);
    s = surRegeneration(s, g2);
    expect(s.texte).toBe(manuel);
    expect(propositionEnAttente(s)).toBe(true);
  });

  it('« Régénérer » (confirmation explicite) remplace le texte', () => {
    let s = surRegeneration(surSaisie(texteInitial(g1), `${g1}\n\nPS : merci.`), g2);
    s = accepterRegeneration(s);
    expect(s.texte).toBe(g2);
    expect(estModifie(s)).toBe(false);
    expect(propositionEnAttente(s)).toBe(false);
  });

  it('« Garder mon texte » : la proposition disparaît, puis revient au changement suivant', () => {
    const manuel = `${g1}\n\nPS : merci.`;
    let s = garderTexte(surRegeneration(surSaisie(texteInitial(g1), manuel), g2));
    expect(s.texte).toBe(manuel);
    expect(propositionEnAttente(s)).toBe(false);
    s = surRegeneration(s, g3);
    expect(s.texte).toBe(manuel);
    expect(propositionEnAttente(s)).toBe(true);
  });

  it('une différence d’espaces ou de lignes vides n’est pas une modification', () => {
    expect(estModifie(surSaisie(texteInitial(g1), `${g1.replace(/\n\n/g, '\n\n\n')}  `))).toBe(false);
  });

  it('retour au texte généré après saisie : plus rien à protéger', () => {
    let s = surSaisie(texteInitial(g1), `${g1} x`);
    s = surSaisie(s, g1);
    expect(surRegeneration(s, g2).texte).toBe(g2);
  });
});

describe('Suivi : statuts et badge de retard', () => {
  it('transitions permises (mêmes règles que le trigger)', () => {
    expect(transitionsPossibles('brouillon')).toEqual(['envoyee', 'reponse_recue', 'annulee']);
    expect(transitionsPossibles('envoyee')).toEqual(['reponse_recue', 'annulee', 'brouillon']);
    expect(transitionsPossibles('reponse_recue')).toEqual([]);
    expect(transitionsPossibles('annulee')).toEqual([]);
    expect(peutPasser('annulee', 'envoyee')).toBe(false);
    expect(peutPasser('brouillon', 'envoyee')).toBe(true);
  });

  it('« Sans réponse depuis N jours » au-delà de 30 jours, pour une lettre envoyée seulement', () => {
    expect(joursSansReponse({ statut: 'envoyee', date_envoi: '2026-09-12' }, today)).toBe(30);
    expect(badgeSansReponse({ statut: 'envoyee', date_envoi: '2026-09-12' }, today)).toBeNull();
    expect(badgeSansReponse({ statut: 'envoyee', date_envoi: '2026-09-11' }, today)).toBe('Sans réponse depuis 31 jours');
    expect(badgeSansReponse({ statut: 'envoyee', date_envoi: '2026-08-01' }, today)).toBe('Sans réponse depuis 72 jours');
    expect(badgeSansReponse({ statut: 'reponse_recue', date_envoi: '2026-01-01' }, today)).toBeNull();
    expect(badgeSansReponse({ statut: 'annulee', date_envoi: '2026-01-01' }, today)).toBeNull();
    expect(badgeSansReponse({ statut: 'brouillon', date_envoi: null }, today)).toBeNull();
    expect(badgeSansReponse({ statut: 'envoyee', date_envoi: null }, today)).toBeNull();
  });

  it('la borne du compteur de l’Accueil correspond au badge', () => {
    const limite = dateLimiteSansReponse(today);
    expect(limite).toBe('2026-09-12');
    // Compteur : date_envoi < limite  ⇔  badge affiché.
    expect('2026-09-11' < limite).toBe(true);
    expect('2026-09-12' < limite).toBe(false);
  });

  it('tri : envoyées (les plus en retard d’abord), non envoyées, puis closes', () => {
    const l = trierLettres([
      { id: 'close', statut: 'reponse_recue' as const, date_envoi: '2026-01-01', created_at: '2026-01-01' },
      { id: 'recente', statut: 'envoyee' as const, date_envoi: '2026-10-01', created_at: '2026-10-01' },
      { id: 'brouillon', statut: 'brouillon' as const, date_envoi: null, created_at: '2026-10-10' },
      { id: 'retard', statut: 'envoyee' as const, date_envoi: '2026-08-01', created_at: '2026-08-01' },
    ], today);
    expect(l.map(x => x.id)).toEqual(['retard', 'recente', 'brouillon', 'close']);
  });
});

describe('Brouillon protégé : lié au patient, jamais repris à vide', () => {
  const g = genererLettre(base());
  const vide: AdressageDraft = { params: emptyAdressageParams(), texte: { texte: g, base: g } };

  it('aucune saisie : rien à proposer ni à confirmer à la fermeture', () => {
    expect(adressageDraftHasContent(vide)).toBe(false);
    expect(adressageDraftHasContent(null)).toBe(false);
  });

  it('un paramètre saisi ou un texte modifié à la main : brouillon à protéger', () => {
    expect(adressageDraftHasContent({ ...vide, params: { ...vide.params, motif: 'Avis spécialisé' } })).toBe(true);
    expect(adressageDraftHasContent({ ...vide, params: { ...vide.params, confrereId: 'c1' } })).toBe(true);
    expect(adressageDraftHasContent({ ...vide, texte: { texte: `${g}\n\nPS.`, base: g } })).toBe(true);
    // Cocher ou décocher une section seule ne crée pas de brouillon.
    expect(adressageDraftHasContent({ ...vide, params: { ...vide.params, allergies: false, mode: 'detaille' } })).toBe(false);
  });

  it('un brouillon n’appartient qu’à SON patient et à SON médecin', () => {
    const s = { doctorId: 'd1', patientId: 'p1' };
    expect(adressageDraftBelongsTo(s, 'd1', 'p1')).toBe(true);
    expect(adressageDraftBelongsTo(s, 'd1', 'p2')).toBe(false);
    expect(adressageDraftBelongsTo(s, 'd2', 'p1')).toBe(false);
    expect(adressageDraftBelongsTo(s, 'd1', null)).toBe(false);
    expect(adressageDraftBelongsTo(null, 'd1', 'p1')).toBe(false);
    expect(adressageDraftBelongsTo({}, undefined, undefined)).toBe(false);
  });

  it('destinataire court des listes', () => {
    expect(destinataireCourt({ destinataire_ligne: 'À l\'attention du Dr Salma Bennani, cardiologie' })).toBe('Dr Salma Bennani, cardiologie');
    expect(destinataireCourt({ destinataire_ligne: 'À l\'attention de Monsieur ou Madame le cardiologue' })).toBe('Cardiologue');
    expect(destinataireCourt({ destinataire_ligne: 'À l\'attention de : Service de cardiologie, CHU Ibn Rochd' })).toBe('Service de cardiologie, CHU Ibn Rochd');
  });
});
