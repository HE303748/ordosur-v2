import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import jsPDF from 'jspdf';
import { buildExamPdf, appendExamPages, renderArabicLine } from './examPdf';
import { buildExamPages, type ExamDocInput } from './examDocument';
import { drawPageChrome, drawDocumentHeader, stampPageNumbers, type PdfChromeAssets } from './pdfService';
import type { ExamRef } from './examSearch';
import data from './examens_reference.data.json';

const refs = data.examens as ExamRef[];
const line = (c: string, over: Partial<ExamDocInput['lines'][number]> = {}) => {
  const r = refs.find(x => x.code === c)!;
  return { libelle: r.libelle, type: r.type, categorie: r.categorie, a_jeun: r.a_jeun, delai_jeun_h: r.delai_jeun_h, ...over };
};
const input = (lines: ExamDocInput['lines']): ExamDocInput => ({
  numero: 'DEM-20261008-AAAA', dateIso: '2026-10-08', echeance: { date: '2026-11-08', libelle: '1_mois' },
  urgent: false, ald: true, regrouperImageries: false,
  renseignements: 'Cirrhose virale B (depuis 2019), diabète de type 2. Traitement en cours : Glucophage 850 mg, Avlocardyl 40 mg.',
  patient: { prenom: 'Fatima Zahra', nom: 'El Idrissi', sexe: 'F', date_naissance: '1972-03-10' }, lines,
});
const header = {
  doctor: { prenom: 'Karim', nom: 'El Amrani', specialite: 'Hépato-gastro-entérologie', rpps: '123456789', ordre_number: '4521' },
  org: { name: 'Cabinet Dr Karim El Amrani', adresse: '12, boulevard Zerktouni, Casablanca', telephone: '05 22 00 00 00' },
};
// Filigrane d'origine (non réduit) : cas le plus lourd possible. En production il est réduit à 800 px.
const watermark = `data:image/png;base64,${readFileSync('public/pdf-assets/watermark.png').toString('base64')}`;
const assets: PdfChromeAssets = { logo: null, watermark: { data: watermark, format: 'PNG' } };
// Contrôle visuel facultatif : EXAM_PDF_OUT=<dossier> écrit les PDF générés.
const dump = async (name: string, blob: Blob) => {
  if (process.env.EXAM_PDF_OUT) writeFileSync(`${process.env.EXAM_PDF_OUT}/${name}.pdf`, Buffer.from(await blob.arrayBuffer()));
};
const pageCount = async (blob: Blob) => (Buffer.from(await blob.arrayBuffer()).toString('latin1').match(/\/Type\s*\/Page\b(?!s)/g) ?? []).length;

describe('PDF « Examens à réaliser »', () => {
  it('1 page biologie : PDF léger (< 500 Ko)', async () => {
    const pages = buildExamPages(input(data.packs.find(p => p.code === 'HEPATOPATHIE_CHRONIQUE')!.lignes.filter(l => l.type === 'biologie').map(l => line(l.examen_code))));
    const f = await buildExamPdf(pages, header, { fileName: 'x.pdf', assets });
    await dump('biologie', f.blob);
    expect(await pageCount(f.blob)).toBe(1);
    expect(f.blob.size).toBeLessThan(500 * 1024);
    console.log(`[poids] 1 page biologie : ${(f.blob.size / 1024).toFixed(0)} Ko`);
  });

  it('biologie fournie (24 examens) : deux colonnes, une seule page', async () => {
    const bio = refs.filter(r => r.type === 'biologie').slice(0, 24).map(r => line(r.code));
    const f = await buildExamPdf(buildExamPages(input(bio)), header, { fileName: 'x.pdf', assets });
    await dump('biologie_24', f.blob);
    expect(await pageCount(f.blob)).toBe(1);
  });

  it('biologie exceptionnelle (74 examens) : la suite passe sur une page supplémentaire, rien n’est tronqué', async () => {
    const bio = refs.filter(r => r.type === 'biologie').map(r => line(r.code));
    const f = await buildExamPdf(buildExamPages(input(bio)), header, { fileName: 'x.pdf', assets });
    expect(await pageCount(f.blob)).toBeGreaterThanOrEqual(2);
    expect(f.blob.size).toBeLessThan(500 * 1024);
  });

  it('ordonnance + 3 pages d’examens dans le même PDF : < 500 Ko', async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    // Page d'ordonnance représentative (même habillage et même en-tête que pdfService).
    drawPageChrome(doc, assets.watermark);
    drawDocumentHeader(doc, { ...header, title: 'ORDONNANCE', dateIso: '2026-10-08', numero: 'ORD-20261008-AAAA' }, null);
    ['Glucophage 850 mg comprimé', 'Avlocardyl 40 mg comprimé', 'Kardegic 75 mg sachet'].forEach((m, i) => doc.text(`${i + 1}.  ${m}`, 18, 80 + i * 14));
    const pages = buildExamPages(input([
      line('NFS'), line('TP_INR'), line('ALBUMINE'), line('ASAT'), line('ALAT'), line('AFP'), line('LDL'),
      line('ECHO_HEPATIQUE_DOPPLER', { question: 'Nodule hépatique ? Signes d’hypertension portale ?' }),
      line('FOGD', { precision: 'Sous sédation', question: 'Varices œsophagiennes ?' }),
    ]));
    expect(pages).toHaveLength(3);
    appendExamPages(doc, pages, header, assets, { startOnNewPage: true });
    const blob = doc.output('blob');
    await dump('ordonnance_examens', blob);
    expect(await pageCount(blob)).toBe(4);
    expect(blob.size).toBeLessThan(500 * 1024);
    console.log(`[poids] ordonnance + 3 pages d'examens : ${(blob.size / 1024).toFixed(0)} Ko`);
  });

  it('numérotation « Page x/N » sur TOUT le document (ordonnance + examens)', () => {
    // Document non compressé : le texte des pages est lisible dans le fichier.
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: false });
    drawDocumentHeader(doc, { ...header, title: 'ORDONNANCE', dateIso: '2026-10-08', numero: 'ORD-20261008-AAAA' }, null);
    const pages = buildExamPages(input([line('NFS'), line('ECHO_HEPATIQUE_DOPPLER'), line('FOGD')]));
    appendExamPages(doc, pages, header, { logo: null, watermark: null }, { startOnNewPage: true });
    expect(stampPageNumbers(doc)).toBe(4);
    const raw = Buffer.from(doc.output('arraybuffer')).toString('latin1');
    for (const n of [1, 2, 3, 4]) expect(raw).toContain(`(Page ${n}/4)`);
    // Plus aucune numérotation partielle propre aux pages d'examens.
    expect(raw).not.toContain('Page 1/3');
    expect(raw).not.toContain('Page 3/3');
  });

  it('document d’une seule page : pas de numéro de page', () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: false });
    appendExamPages(doc, buildExamPages(input([line('NFS')])), header, { logo: null, watermark: null }, { startOnNewPage: false });
    expect(stampPageNumbers(doc)).toBe(1);
    expect(Buffer.from(doc.output('arraybuffer')).toString('latin1')).not.toContain('(Page 1/1)');
  });

  it('imagerie injectée : mentions imprimées sur sa page uniquement', async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: false });
    const pages = buildExamPages({
      ...input([line('NFS'), line('TDM_ABDOMINO_PELVIENNE', { precision: 'avec injection', injecte: true }), line('ECHO_ABDOMINALE')]),
      sousMetformine: true,
    });
    appendExamPages(doc, pages, header, { logo: null, watermark: null }, { startOnNewPage: false });
    const raw = Buffer.from(doc.output('arraybuffer')).toString('latin1');
    expect(raw.split('(< 3 mois\\)').length - 1).toBe(1);
    expect(raw.split('Patient sous metformine').length - 1).toBe(1);
    await dump('imagerie_injectee', new Blob([doc.output('arraybuffer')]));
  });

  it('hors navigateur, la consigne en arabe est omise sans erreur', () => {
    expect(renderArabicLine('على الريق')).toBeNull();
  });
});
