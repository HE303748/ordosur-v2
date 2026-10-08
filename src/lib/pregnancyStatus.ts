// Sprint 4e-C — Statut grossesse / allaitement : requalification des CI « grossesse ».
//
// Module PUR (ni React ni Supabase) : testé par pregnancyStatus.test.ts.
// Il ne détecte AUCUNE contre-indication : le matching existant (conditionTerms, bloc
// conditionnel « grossesse, allaitement, procréation » du Sprint 2) reste inchangé. Il
// requalifie, après coup, les alertes que ce matching a déjà marquées « conditionnelles »,
// selon le statut déclaré par le médecin :
//   • enceinte            → CI grossesse FERMES (selon le terme quand la CI en dépend) ;
//   • non enceinte (< 3 mois) → CI grossesse « rassurées » : restent visibles repliées, ne
//                            bloquent plus le vert — SAUF tératogènes majeurs ;
//   • inconnu, expiré, à confirmer → comportement d'origine (conditionnelles) ;
//   • allaitement oui     → CI allaitement FERMES.
// Les CI « en âge de procréer » restent toujours conditionnelles.

export type GrossesseStatut = 'enceinte' | 'non_enceinte' | 'inconnu';

export interface PregnancyFields {
  grossesse_statut?: GrossesseStatut | null;
  /** Date des dernières règles (ISO AAAA-MM-JJ). */
  grossesse_ddr?: string | null;
  /** true / false / null = non renseigné. */
  allaitement?: boolean | null;
  /** Date de la dernière déclaration du statut (ISO). */
  grossesse_maj_le?: string | null;
}

/** « Non enceinte » (et « n'allaite pas ») : valable 3 mois après la déclaration. */
export const NON_ENCEINTE_VALIDITE_JOURS = 92;
/** « Enceinte » non mis à jour depuis plus de 10 mois : à confirmer. */
export const ENCEINTE_VALIDITE_JOURS = 305;
/** Terme au-delà duquel une DDR n'est plus plausible. */
const TERME_MAX_SA = 43;

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
function parseDate(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const t = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  return Number.isFinite(t) ? t : null;
}
const iso = (t: number) => {
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Terme en semaines d'aménorrhée révolues à la date `today`, ou null (DDR absente ou future). */
export function ddrToSa(ddr: string | null | undefined, today: Date = new Date()): number | null {
  const t = parseDate(ddr);
  if (t === null) return null;
  const days = Math.floor((startOfDay(today) - t) / DAY);
  return days < 0 ? null : Math.floor(days / 7);
}

/** Terme saisi en SA → DDR (ISO). Le terme se met ensuite à jour tout seul. */
export function saToDdr(sa: number, today: Date = new Date()): string {
  return iso(startOfDay(today) - Math.round(sa) * 7 * DAY);
}

export interface PregnancyContext {
  /** Statut effectivement appliqué par le moteur. */
  statut: GrossesseStatut;
  /** Statut déclaré mais plus valable : « enceinte » trop ancien ou terme dépassé. */
  aConfirmer: boolean;
  /** « Non enceinte » déclaré mais expiré (> 3 mois). */
  expire: boolean;
  /** Terme actuel en SA (enceinte + DDR plausible), sinon null. */
  sa: number | null;
  /** true = allaite ; false = n'allaite pas (déclaration encore valable) ; null = inconnu. */
  allaitement: boolean | null;
  /** Date de déclaration (ISO), pour « Déclarée non enceinte le JJ/MM ». */
  declareLe: string | null;
}

/** Statut effectif à la date `today` (validité des déclarations, plausibilité du terme). */
export function pregnancyContext(p: PregnancyFields | null | undefined, today: Date = new Date()): PregnancyContext {
  const declared: GrossesseStatut = p?.grossesse_statut === 'enceinte' || p?.grossesse_statut === 'non_enceinte' ? p.grossesse_statut : 'inconnu';
  const maj = parseDate(p?.grossesse_maj_le);
  const age = maj === null ? null : Math.floor((startOfDay(today) - maj) / DAY);
  const declareLe = p?.grossesse_maj_le ? p.grossesse_maj_le.slice(0, 10) : null;
  // Sans date de déclaration, une déclaration ne peut pas être considérée comme récente.
  const recent = (max: number) => age !== null && age >= 0 && age <= max;

  let statut: GrossesseStatut = 'inconnu';
  let aConfirmer = false;
  let expire = false;
  let sa: number | null = null;
  if (declared === 'enceinte') {
    const s = ddrToSa(p?.grossesse_ddr, today);
    if (!recent(ENCEINTE_VALIDITE_JOURS) || (s !== null && s > TERME_MAX_SA)) aConfirmer = true;
    else { statut = 'enceinte'; sa = s; }
  } else if (declared === 'non_enceinte') {
    if (recent(NON_ENCEINTE_VALIDITE_JOURS)) statut = 'non_enceinte';
    else expire = true;
  }

  let allaitement: boolean | null = null;
  if (p?.allaitement === true) allaitement = recent(ENCEINTE_VALIDITE_JOURS) || age === null ? true : null;
  else if (p?.allaitement === false) allaitement = recent(NON_ENCEINTE_VALIDITE_JOURS) ? false : null;

  return { statut, aConfirmer, expire, sa, allaitement, declareLe };
}

// ─── Lecture du terme dans le libellé de la CI ───────────────────────────────

const norm = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9<>= ]/g, ' ').replace(/\s+/g, ' ').trim();

export interface TermWindow { fromSa: number; toSa: number | null; label: string }

/**
 * Fenêtre de terme d'une CI, lue dans son libellé. null = toute la grossesse (ou libellé
 * non reconnu : traité comme « toute la grossesse », le choix le plus sûr).
 *   « 1er trimestre » → 0–13 SA ; « 2e trimestre » → 14–27 ; « 3e trimestre » → ≥ 28 ;
 *   « 2ème et 3ème trimestre » → ≥ 14 ; « après 24 SA », « > 20 SA » → ≥ N (prioritaire).
 */
export function parseTermWindow(condition: string | null | undefined): TermWindow | null {
  const c = norm(condition);
  const sa = c.match(/(?:apres|>=?|a partir de|des|au dela de)\s*(\d{1,2})\s*sa\b/);
  if (sa) return { fromSa: Number(sa[1]), toSa: null, label: `à partir de ${Number(sa[1])} SA` };
  const t1 = /\b1er? trimestre|premier trimestre|\b1e trimestre/.test(c);
  const t2 = /\b2e? ?(?:eme|nd)? trimestre|deuxieme trimestre|\b2eme\b/.test(c);
  const t3 = /\b3e? ?(?:eme)? trimestre|troisieme trimestre|\b3eme\b/.test(c);
  if (!t1 && !t2 && !t3) return null;
  const fromSa = t1 ? 0 : t2 ? 14 : 28;
  const toSa = t3 ? null : t2 ? 28 : 14;
  const label = fromSa === 0
    ? `jusqu'à ${toSa! - 1} SA`
    : toSa === null ? `à partir de ${fromSa} SA` : `de ${fromSa} à ${toSa - 1} SA`;
  return { fromSa, toSa, label };
}

// ─── Tératogènes majeurs ─────────────────────────────────────────────────────

export interface TeratogenMed {
  nom: string;
  dci?: string | null;
  dci_canonique?: string | null;
  ingredients?: string[];
}

/**
 * Tératogène majeur (valproate, isotrétinoïne, acitrétine, méthotrexate, mycophénolate,
 * thalidomide, AVK) : sa CI grossesse reste TOUJOURS conditionnelle, même si la patiente
 * est déclarée non enceinte. Motifs en table (teratogenes_majeurs), reconnus en début de mot.
 */
export function isMajorTeratogen(med: TeratogenMed | null | undefined, motifs: string[]): boolean {
  if (!med) return false;
  const hay = [med.dci, med.nom, med.dci_canonique, ...(med.ingredients ?? [])]
    .map(x => norm(x).replace(/[<>=]/g, ' ')).filter(Boolean).join(' | ');
  return motifs.some(m => m.length >= 3 && new RegExp(`(^| )${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(hay));
}

// ─── Requalification d'une alerte ────────────────────────────────────────────

export type PregnancyMode =
  | 'ferme'          // alerte ferme, dépliée, compte dans le verdict
  | 'a_evaluer'      // enceinte, terme de la CI pas encore atteint
  | 'conditionnelle' // comportement d'origine : bloc replié, verdict « sous réserve »
  | 'rassuree';      // bloc replié, ne bloque plus le vert

export interface PregnancyDecision { mode: PregnancyMode; note: string | null }

export type PregnancyKind = 'grossesse' | 'allaitement' | 'procreation';

/** Nature de la CI d'après son libellé. « En âge de procréer » prime (toujours conditionnelle). */
export function pregnancyKinds(condition: string | null | undefined): PregnancyKind[] {
  const c = norm(condition);
  // Projet de grossesse (« grossesse planifiée », « dans le mois suivant l'arrêt ») : même
  // logique que « en âge de procréer » — le statut du jour ne suffit pas à l'écarter.
  if (/procre|planifi|projet de grossesse|suivant l arret/.test(c)) return ['procreation'];
  const out: PregnancyKind[] = [];
  if (/grossesse|enceinte/.test(c)) out.push('grossesse');
  if (/allait/.test(c)) out.push('allaitement');
  return out;
}

const RANK: Record<PregnancyMode, number> = { ferme: 4, a_evaluer: 3, conditionnelle: 2, rassuree: 1 };

const jjmm = (isoDate: string | null) => {
  const m = (isoDate ?? '').match(/^\d{4}-(\d{2})-(\d{2})/);
  return m ? `${m[2]}/${m[1]}` : '';
};

/**
 * Décision pour une alerte du bloc conditionnel grossesse / allaitement / procréation.
 * `teratogene` : le médicament est un tératogène majeur (ou la liste n'a pas pu être
 * chargée : dans le doute, rien n'est rassuré).
 */
export function classifyPregnancyAlert(
  condition: string | null | undefined,
  ctx: PregnancyContext,
  teratogene: boolean,
): PregnancyDecision {
  const kinds = pregnancyKinds(condition);
  if (kinds.length === 0 || kinds[0] === 'procreation') return { mode: 'conditionnelle', note: null };

  const decisions: PregnancyDecision[] = [];
  if (kinds.includes('grossesse')) {
    if (ctx.statut === 'enceinte') {
      const w = parseTermWindow(condition);
      if (!w || ctx.sa === null) {
        decisions.push({ mode: 'ferme', note: ctx.sa === null ? 'Patiente enceinte — terme non renseigné' : `Patiente enceinte — terme actuel ${ctx.sa} SA` });
      } else if (ctx.sa < w.fromSa) {
        decisions.push({ mode: 'a_evaluer', note: `${w.label} — terme actuel ${ctx.sa} SA` });
      } else if (w.toSa !== null && ctx.sa >= w.toSa) {
        decisions.push({ mode: 'conditionnelle', note: `concerne la période ${w.label} — terme actuel ${ctx.sa} SA` });
      } else {
        decisions.push({ mode: 'ferme', note: `Patiente enceinte — terme actuel ${ctx.sa} SA (${w.label})` });
      }
    } else if (ctx.statut === 'non_enceinte') {
      decisions.push(teratogene
        ? { mode: 'conditionnelle', note: 'Tératogène majeur : à vérifier quel que soit le statut déclaré' }
        : { mode: 'rassuree', note: `Déclarée non enceinte le ${jjmm(ctx.declareLe)}` });
    } else {
      decisions.push({
        mode: 'conditionnelle',
        note: ctx.aConfirmer ? 'Statut « enceinte » à confirmer' : ctx.expire ? 'Statut « non enceinte » expiré (plus de 3 mois)' : null,
      });
    }
  }
  if (kinds.includes('allaitement')) {
    if (ctx.allaitement === true) decisions.push({ mode: 'ferme', note: 'Patiente allaitante' });
    else if (ctx.allaitement === false) decisions.push({ mode: 'rassuree', note: `Déclarée non allaitante le ${jjmm(ctx.declareLe)}` });
    else decisions.push({ mode: 'conditionnelle', note: null });
  }
  // Libellé mixte (grossesse ET allaitement) : la décision la plus contraignante l'emporte.
  return decisions.reduce((best, d) => (RANK[d.mode] > RANK[best.mode] ? d : best));
}

/** Résumé lisible du statut (profil et Vérificateur). */
export function pregnancySummary(ctx: PregnancyContext): string {
  const parts: string[] = [];
  if (ctx.statut === 'enceinte') parts.push(ctx.sa !== null ? `Enceinte — ${ctx.sa} SA` : 'Enceinte — terme non renseigné');
  else if (ctx.statut === 'non_enceinte') parts.push(`Non enceinte (déclaré le ${jjmm(ctx.declareLe)})`);
  else if (ctx.aConfirmer) parts.push('Statut « enceinte » à confirmer');
  else if (ctx.expire) parts.push('« Non enceinte » déclaré il y a plus de 3 mois — à confirmer');
  else parts.push('Grossesse : non renseigné');
  if (ctx.allaitement === true) parts.push('Allaitement en cours');
  else if (ctx.allaitement === false) parts.push('N’allaite pas');
  return parts.join(' · ');
}
