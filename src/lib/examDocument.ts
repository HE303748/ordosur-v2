// Sprint 5 — Contenu du document « Examens à réaliser » (fonction pure, testée).
//
// Une page BIOLOGIE regroupe tous les examens biologiques (le patient va au laboratoire).
// Chaque imagerie ou exploration a SA page (centres différents), sauf option « Regrouper
// les imageries sur une page ». Le rendu (PDF, aperçu écran) consomme ces pages telles quelles.

import type { ExamType } from './examSearch';
import {
  echeancePhrase, fastingInfo, formatFr, fullPrecision, injectionNotes, isInjected,
  type DemandeExamens, type ExamRequestDraft,
} from './examRequest';
import { formatAge } from './ageUtils';
import { formatNomPropre, civilite } from './formatName';

export interface ExamDocLine {
  libelle: string;
  type: ExamType;
  categorie?: string | null;
  /** Précision déjà complète (injection comprise). */
  precision?: string | null;
  question?: string | null;
  a_jeun: boolean;
  delai_jeun_h?: number | null;
  /** Sprint 5c — examen demandé avec injection (produit iodé ou gadolinium). */
  injecte?: boolean;
}

export interface ExamDocInput {
  numero: string;
  dateIso: string;
  echeance: { date: string; libelle: string };
  urgent: boolean;
  ald: boolean;
  regrouperImageries: boolean;
  renseignements?: string | null;
  /** Sprint 5c — patient sous metformine (mention sur les imageries injectées). */
  sousMetformine?: boolean;
  patient: { prenom: string; nom: string; sexe?: string | null; date_naissance?: string | null };
  lines: ExamDocLine[];
}

export interface ExamPageItem { libelle: string; precision: string | null; question: string | null }
export interface ExamPageGroup { label: string | null; items: ExamPageItem[] }

export interface ExamPage {
  kind: 'biologie' | 'imagerie' | 'exploration' | 'imagerie_groupee';
  /** Intitulé de la page : « BIOLOGIE MÉDICALE », nom de l'imagerie… */
  heading: string;
  /** Destinataire indicatif, imprimé en petit sous l'intitulé. */
  destination: string;
  subtitle: string;
  urgent: boolean;
  patientLine: string;
  renseignements: string | null;
  groups: ExamPageGroup[];
  fasting: { hours: number | null } | null;
  /** Sprint 5c — mentions de la page (« Créatininémie récente (< 3 mois) à apporter »…). */
  notes: string[];
  ald: boolean;
  numero: string;
  dateIso: string;
  echeanceDate: string;
  /** « 2/3 » ; null si le document n'a qu'une page. */
  pageLabel: string | null;
}

/** « Mme Fatima Zahra El Idrissi — 54 ans » */
export function patientLine(p: ExamDocInput['patient']): string {
  const name = `${formatNomPropre(p.prenom)} ${formatNomPropre(p.nom)}`.trim() || '—';
  const civ = civilite(p.sexe);
  const age = formatAge(p.date_naissance);
  return `${civ} ${name}${age ? ` — ${age}` : ''}`;
}

const item = (l: ExamDocLine): ExamPageItem => ({
  libelle: l.libelle.trim(),
  precision: l.precision?.trim() || null,
  question: l.type === 'biologie' ? null : (l.question?.trim() || null),
});

/** Pages du document, dans l'ordre d'impression : biologie, puis imageries, puis explorations. */
export function buildExamPages(input: ExamDocInput): ExamPage[] {
  const subtitle = echeancePhrase({ ...input.echeance, urgent: input.urgent });
  const base = {
    subtitle,
    urgent: input.urgent,
    patientLine: patientLine(input.patient),
    renseignements: input.renseignements?.trim() || null,
    ald: input.ald,
    numero: input.numero,
    dateIso: input.dateIso,
    echeanceDate: input.echeance.date,
  };
  const fast = (ls: ExamDocLine[]) => {
    const f = fastingInfo(ls.map(l => ({ a_jeun: l.a_jeun, delai_jeun_h: l.delai_jeun_h ?? null })));
    return f.required ? { hours: f.hours } : null;
  };

  const pages: Omit<ExamPage, 'pageLabel'>[] = [];
  const bio = input.lines.filter(l => l.type === 'biologie');
  const img = input.lines.filter(l => l.type === 'imagerie');
  const exp = input.lines.filter(l => l.type === 'exploration');

  if (bio.length > 0) {
    // Groupes par catégorie, dans l'ordre d'apparition ; saisie libre → « Autres examens ».
    const groups: ExamPageGroup[] = [];
    for (const l of bio) {
      const label = l.categorie?.trim() || 'Autres examens';
      let g = groups.find(x => x.label === label);
      if (!g) { g = { label, items: [] }; groups.push(g); }
      g.items.push(item(l));
    }
    const autres = groups.findIndex(g => g.label === 'Autres examens');
    if (autres >= 0 && autres !== groups.length - 1) groups.push(groups.splice(autres, 1)[0]);
    pages.push({
      ...base, kind: 'biologie', heading: 'BIOLOGIE MÉDICALE', destination: 'À remettre au laboratoire d’analyses médicales',
      groups, fasting: fast(bio), notes: [],
    });
  }

  const others = [...img, ...exp];
  if (input.regrouperImageries && others.length > 1) {
    const groups: ExamPageGroup[] = [];
    if (img.length > 0) groups.push({ label: 'Imagerie', items: img.map(item) });
    if (exp.length > 0) groups.push({ label: 'Explorations', items: exp.map(item) });
    pages.push({
      ...base, kind: 'imagerie_groupee',
      heading: exp.length === 0 ? 'IMAGERIE MÉDICALE' : img.length === 0 ? 'EXPLORATIONS' : 'IMAGERIE ET EXPLORATIONS',
      destination: 'À remettre au centre d’imagerie ou au médecin réalisant l’examen',
      groups, fasting: fast(others), notes: injectionNotes(others.some(l => !!l.injecte), !!input.sousMetformine),
    });
  } else {
    for (const l of others) {
      pages.push({
        ...base,
        kind: l.type === 'imagerie' ? 'imagerie' : 'exploration',
        heading: l.libelle.trim().toLocaleUpperCase('fr-FR'),
        destination: l.type === 'imagerie'
          ? 'À remettre au centre d’imagerie médicale'
          : 'À remettre au médecin réalisant l’exploration',
        groups: [{ label: null, items: [item(l)] }],
        fasting: fast([l]),
        notes: injectionNotes(!!l.injecte, !!input.sousMetformine),
      });
    }
  }

  const n = pages.length;
  return pages.map((p, i) => ({ ...p, pageLabel: n > 1 ? `${i + 1}/${n}` : null }));
}

/** « À JEUN (12 h) » / « À JEUN » */
export function fastingLabel(f: { hours: number | null }): string {
  return f.hours ? `À JEUN (${f.hours} h)` : 'À JEUN';
}

/** Consigne patient en arabe (bilingue), ou null si rien à préciser sur cette page. */
export function arabicInstructions(p: Pick<ExamPage, 'fasting' | 'urgent' | 'echeanceDate'>): string[] {
  const out: string[] = [];
  // Accord arabe : de 3 à 10 → « ساعات », au-delà → « ساعة ».
  if (p.fasting) {
    const h = p.fasting.hours;
    out.push(h ? `على الريق (${h} ${h >= 3 && h <= 10 ? 'ساعات' : 'ساعة'})` : 'على الريق');
  }
  if (!p.urgent && p.echeanceDate) out.push(`يُنجز قبل ${formatFr(p.echeanceDate)}`);
  return out;
}

export function examFileName(patient: { nom: string; prenom: string }, numero: string): string {
  return `examens_${patient.nom}_${patient.prenom}_${numero}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

// ─── Du brouillon / de la demande vers le document ───────────────────────────

type DocPatient = ExamDocInput['patient'];

export function docInputFromDraft(
  draft: ExamRequestDraft,
  o: { numero: string; dateIso: string; echeance: { date: string; libelle: string }; patient: DocPatient; sousMetformine?: boolean },
): ExamDocInput {
  const lines: ExamDocLine[] = draft.lines.map(l => ({
    libelle: l.libelle, type: l.type, categorie: l.categorie, precision: fullPrecision(l), question: l.question,
    a_jeun: l.a_jeun, delai_jeun_h: l.a_jeun ? l.delai_jeun_h : null, injecte: l.type !== 'biologie' && isInjected(l),
  }));
  return {
    numero: o.numero, dateIso: o.dateIso, echeance: o.echeance, urgent: draft.urgent, ald: draft.ald,
    regrouperImageries: draft.regrouperImageries, renseignements: draft.renseignements, sousMetformine: !!o.sousMetformine,
    patient: o.patient, lines,
  };
}

/** Réimpression : les examens annulés ne figurent plus sur le document. */
export function docInputFromDemande(d: DemandeExamens, patient: DocPatient): ExamDocInput {
  const lines: ExamDocLine[] = d.lignes.filter(l => l.statut !== 'annule').map(l => ({
    libelle: l.libelle, type: l.type, categorie: l.categorie,
    precision: fullPrecision({ precision: l.precision ?? '', injection: l.injection }),
    question: l.question_clinique, a_jeun: l.a_jeun, delai_jeun_h: l.delai_jeun_h,
    injecte: l.type !== 'biologie' && isInjected({ injection: l.injection, precision: l.precision ?? '', libelle: l.libelle }),
  }));
  return {
    numero: d.numero, dateIso: d.date_demande, echeance: { date: d.echeance_date, libelle: d.echeance_libelle },
    urgent: d.urgent, ald: d.ald, regrouperImageries: d.regrouper_imageries,
    renseignements: d.renseignements_cliniques, sousMetformine: !!d.sous_metformine, patient, lines,
  };
}

export function pagesFromDemande(d: DemandeExamens, patient: DocPatient): ExamPage[] {
  return buildExamPages(docInputFromDemande(d, patient));
}
