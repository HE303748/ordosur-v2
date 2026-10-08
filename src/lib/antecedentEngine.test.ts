import { describe, it, expect } from 'vitest';
import {
  evaluateAntecedents, classifyAntecedent, mergeWithExisting, needsPrecision,
  type EngineAntecedent, type EngineMed, type RegleAntecedent, type RegleClasse,
} from './antecedentEngine';
// Mêmes règles que celles insérées en base (générées par scripts/gen_regles_antecedents.mjs).
import data from './regles_antecedents.data.json';

const regles: RegleAntecedent[] = data.regles.map((r, i) => ({
  ...r, id: `r${i}`, actif: true,
  severite: r.severite as RegleAntecedent['severite'],
  criteres: r.criteres as RegleAntecedent['criteres'],
}));
const classes: RegleClasse[] = data.classes;

// Spécialités marocaines (DCI / dci_canonique tels qu'en base).
const BRUFEN:     EngineMed = { id: 'brufen',     nom: 'BRUFEN 400 MG',   dci: 'IBUPROFÈNE' };
const CELEBREX:   EngineMed = { id: 'celebrex',   nom: 'CELEBREX',        dci: 'CELECOXIB' };
const KARDEGIC:   EngineMed = { id: 'kardegic',   nom: 'KARDEGIC 300 MG', dci: 'DL-LYSINE (ACÉTYLSALICYLATE DE)', dci_canonique: 'aspirine acide acetylsalicylique acetylsalicylate' };
const SINTROM:    EngineMed = { id: 'sintrom',    nom: 'SINTROM 4 MG',    dci: 'ACÉNOCOUMAROL' };
const PLAVIX:     EngineMed = { id: 'plavix',     nom: 'PLAVIX',          dci: 'CLOPIDOGREL' };
const DOLIPRANE:  EngineMed = { id: 'doliprane',  nom: 'DOLIPRANE',       dci: 'PARACETAMOL' };
const GLUCOPHAGE: EngineMed = { id: 'glucophage', nom: 'GLUCOPHAGE 850',  dci: 'METFORMINE' };
const MOPRAL:     EngineMed = { id: 'mopral',     nom: 'MOPRAL 20 MG',    dci: 'OMÉPRAZOLE' };

let seq = 0;
function ant(partial: Partial<EngineAntecedent>): EngineAntecedent {
  seq += 1;
  return {
    id: `a${seq}`, categorie: 'medical', libelle: 'Antécédent', archive: false,
    en_cours: null, date_debut_annee: null, details: {}, pathologie: null, ...partial,
  };
}
const hemo = (details: Record<string, unknown> = {}, extra: Partial<EngineAntecedent> = {}) =>
  ant({ libelle: 'Hémorragie digestive', details: { type: 'hemorragie_digestive', ...details }, ...extra });
const ulcere = (details: Record<string, unknown> = {}, extra: Partial<EngineAntecedent> = {}) =>
  ant({ libelle: 'Ulcère gastro-duodénal', details: { type: 'ulcere_gd', ...details }, ...extra });

const run = (meds: EngineMed[], ants: EngineAntecedent[]) => evaluateAntecedents(meds, ants, regles, classes);

describe('evaluateAntecedents — cas cliniques', () => {
  it('1. Brufen + hémorragie survenue sous AINS → ABSOLUE (R2)', () => {
    const r = run([BRUFEN], [hemo({ en_cours: false, sous_ains: 'oui', episodes: '1' })]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ severite: 'absolue', regleCode: 'R2', medId: 'brufen' });
  });

  it('2. Brufen + hémorragie au contexte inconnu → À ÉVALUER (R4)', () => {
    const r = run([BRUFEN], [hemo({ en_cours: false })]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ severite: 'a_evaluer', regleCode: 'R4' });
  });

  it('3. Brufen + ulcère cicatrisé, 1 épisode, non lié aux AINS → PRÉCAUTION (R5)', () => {
    const r = run([BRUFEN], [ulcere({ statut: 'cicatrise', sous_ains: 'non', episodes: '1' })]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ severite: 'precaution', regleCode: 'R5' });
  });

  it('4. Brufen + ulcère cicatrisé, 2 épisodes ou plus → ABSOLUE (R3)', () => {
    const r = run([BRUFEN], [ulcere({ statut: 'cicatrise', episodes: '2+' })]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ severite: 'absolue', regleCode: 'R3' });
  });

  it('5. Celebrex + hémorragie en cours → ABSOLUE (R1)', () => {
    const r = run([CELEBREX], [hemo({ en_cours: true, sous_ains: 'non', episodes: '1' })]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ severite: 'absolue', regleCode: 'R1' });
  });

  it('6. Kardegic + hémorragie passée → PRÉCAUTION (R6)', () => {
    const r = run([KARDEGIC], [hemo({ en_cours: false, sous_ains: 'inconnu' })]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ severite: 'precaution', regleCode: 'R6', classe: 'aspirine' });
  });

  it('7. Sintrom + ulcère évolutif → ABSOLUE (R1)', () => {
    const r = run([SINTROM], [ulcere({ statut: 'evolutif' })]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ severite: 'absolue', regleCode: 'R1', classe: 'anticoagulant' });
  });

  it('8. Plavix + hémorragie passée → PRÉCAUTION (R6)', () => {
    const r = run([PLAVIX], [hemo({ en_cours: false, sous_ains: 'non', episodes: '1' })]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ severite: 'precaution', regleCode: 'R6', classe: 'antiagregant' });
  });

  it('9. Doliprane, Glucophage, Mopral + tous les antécédents → aucune alerte', () => {
    const all = [
      hemo({ en_cours: true, sous_ains: 'oui', episodes: '2+' }),
      hemo({ nature: 'perforation' }),
      ulcere({ statut: 'evolutif' }),
      ulcere({}),
      ant({ libelle: 'Ulcère gastro-duodénal', details: {}, en_cours: true }),
    ];
    expect(run([DOLIPRANE, GLUCOPHAGE, MOPRAL], all)).toEqual([]);
  });

  it('10. Antécédent archivé → ignoré', () => {
    const r = run([BRUFEN], [hemo({ en_cours: true, sous_ains: 'oui' }, { archive: true })]);
    expect(r).toEqual([]);
  });

  it('11. Hémorragie en cours ET sous AINS → une seule alerte ABSOLUE', () => {
    const r = run([BRUFEN], [hemo({ en_cours: true, sous_ains: 'oui', episodes: '2+' })]);
    expect(r).toHaveLength(1);
    expect(r[0].severite).toBe('absolue');
  });

  it('12. Tabagisme ou phytothérapie seuls → aucune alerte', () => {
    const ants = [
      ant({ categorie: 'toxique', libelle: 'Tabagisme', details: { type: 'tabac', statut: 'actif' } }),
      ant({ categorie: 'toxique', libelle: 'Phytothérapie', details: { type: 'phyto', plantes: 'Nigelle' } }),
    ];
    expect(run([BRUFEN, KARDEGIC, SINTROM, PLAVIX], ants)).toEqual([]);
  });
});

describe('evaluateAntecedents — garde-fous', () => {
  it('chaque combinaison classe × état produit une alerte (jamais de silence)', () => {
    const states = ['oui', 'non', 'inconnu'];
    const eps = ['1', '2+', 'inconnu'];
    for (const med of [BRUFEN, KARDEGIC, PLAVIX, SINTROM]) {
      for (const en_cours of [true, false]) for (const s of states) for (const e of eps) {
        expect(run([med], [hemo({ en_cours, sous_ains: s, episodes: e })])).toHaveLength(1);
      }
      for (const statut of ['evolutif', 'cicatrise', 'inconnu']) for (const s of states) for (const e of eps) {
        expect(run([med], [ulcere({ statut, sous_ains: s, episodes: e })])).toHaveLength(1);
      }
    }
  });

  it('antécédent saisi avant ce sprint (sans détails) → reconnu, traité comme « inconnu »', () => {
    const legacy = ant({ libelle: 'Hémorragie digestive', details: {}, en_cours: null, date_debut_annee: 2019 });
    const r = run([BRUFEN], [legacy]);
    expect(r[0]).toMatchObject({ severite: 'a_evaluer', conditionLabel: 'hémorragie digestive (2019)' });
    expect(needsPrecision(legacy)).toBe(true);
  });

  it('ulcère au statut inconnu → À ÉVALUER (peut être évolutif)', () => {
    expect(run([BRUFEN], [ulcere({})])[0].severite).toBe('a_evaluer');
    expect(run([SINTROM], [ulcere({})])[0].severite).toBe('a_evaluer');
  });

  it('antécédent familial d’ulcère → non analysé', () => {
    expect(classifyAntecedent({ categorie: 'familial', libelle: 'Ulcère gastro-duodénal', details: {} })).toBeNull();
  });

  it('règle inactive ignorée', () => {
    const off = regles.map(r => ({ ...r, actif: false }));
    expect(evaluateAntecedents([BRUFEN], [hemo({ en_cours: true })], off, classes)).toEqual([]);
  });

  it('chaque motif de classe ≥ 3 caractères et normalisé', () => {
    for (const c of classes) expect(c.dci_motif).toMatch(/^[a-z ]{3,}$/);
  });
});

describe('mergeWithExisting', () => {
  const alert = run([BRUFEN], [hemo({ en_cours: false, sous_ains: 'oui' })]);

  it('CI existante de même thème, sévérité ≥ → fusion « Également »', () => {
    const existing = [{ type: 'contraindication', severite: 'contre_indication', involved: ['BRUFEN 400 MG'], condition: 'Ulcère gastroduodénal actif (non traité)' }];
    const m = mergeWithExisting(existing, alert);
    expect(m.standalone).toEqual([]);
    expect(m.alsoByIndex.get(0)).toEqual(['antécédent de hémorragie digestive']);
  });

  it('CI existante de sévérité inférieure → alerte antécédent conservée', () => {
    const existing = [{ type: 'contraindication', severite: 'majeure', involved: ['BRUFEN 400 MG'], condition: 'Ulcère gastro-duodénal' }];
    const m = mergeWithExisting(existing, alert);
    expect(m.standalone).toHaveLength(1);
    expect(m.alsoByIndex.size).toBe(0);
  });

  it('thème différent (hémorragie intracrânienne) → pas de fusion', () => {
    const existing = [{ type: 'contraindication', severite: 'contre_indication', involved: ['BRUFEN 400 MG'], condition: 'Hémorragie intracrânienne récente' }];
    expect(mergeWithExisting(existing, alert).standalone).toHaveLength(1);
  });
});

// ─── Audit des motifs (Sprint 4e-B) — fiches réelles 🇲🇦 ──────────────────────
describe('molécules composées et variantes d’orthographe (canal antécédents)', () => {
  const ACIGAM:     EngineMed = { id: 'acigam', nom: 'ACIGAM 100 MG', dci: 'ACIDE TIAPROFENIQUE' };
  const PONSTYL:    EngineMed = { id: 'ponstyl', nom: 'PONSTYL 500 MG', dci: 'ACIDE MÉFÉNAMIQUE' };
  const CARDIOFLEX: EngineMed = { id: 'cardioflex', nom: 'CARDIOFLEX 100 MG', dci: 'ACIDE ACETILSALICYLIQUE' };
  const ARIXTRA:    EngineMed = { id: 'arixtra', nom: 'ARIXTRA', dci: 'FONDAPARINUX SODIQUE' };
  const ACFOL:      EngineMed = { id: 'acfol', nom: 'ACFOL 5 MG', dci: 'ACIDE FOLIQUE' };

  it('antécédent d’hémorragie sous AINS → Acigam (et Ponstyl) en CI absolue', () => {
    const r = run([ACIGAM, PONSTYL], [hemo({ en_cours: false, sous_ains: 'oui', episodes: '1' })]);
    expect(Object.fromEntries(r.map(a => [a.medId, a.severite]))).toEqual({ acigam: 'absolue', ponstyl: 'absolue' });
    expect(r.every(a => a.regleCode === 'R2')).toBe(true);
  });

  it('forme inversée « TIAPROFÉNIQUE (ACIDE) » reconnue', () => {
    const r = run([{ id: 'inv', nom: 'SURGAM', dci: 'TIAPROFÉNIQUE (ACIDE)' }], [hemo({ en_cours: false, sous_ains: 'oui' })]);
    expect(r[0]).toMatchObject({ severite: 'absolue', classe: 'ains' });
  });

  it('« acide acétilsalicylique » (orthographe de la base) et fondaparinux reconnus', () => {
    const r = run([CARDIOFLEX, ARIXTRA], [hemo({ en_cours: false, sous_ains: 'non', episodes: '1' })]);
    expect(Object.fromEntries(r.map(a => [a.medId, a.classe]))).toEqual({ cardioflex: 'aspirine', arixtra: 'anticoagulant' });
  });

  it('non-régression : l’acide folique n’est pas un AINS', () => {
    expect(run([ACFOL], [hemo({ en_cours: true, sous_ains: 'oui' })])).toEqual([]);
  });
});
