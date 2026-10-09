// Mise en page de l'ordonnance imprimée / PDF : identité patient selon la préférence du
// cabinet, date unique, aucun numéro, ligne sans posologie imprimée sans posologie.
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import jsPDF from 'jspdf';
import { buildOrdonnancePdf, ordonnancePatientLine, drawDocumentHeader, drawSignatureBlock, type PdfOrdonnanceData } from './pdfService';
import { appendExamPages } from './examPdf';
import { buildExamPages, type ExamDocInput } from './examDocument';
import type { ExamRef } from './examSearch';
import examData from './examens_reference.data.json';

// Hors navigateur, le filigrane (/pdf-assets/watermark.png) ne se charge pas : le PDF est
// généré sans lui, et l'avertissement attendu de pdfService est rendu muet.
beforeAll(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterAll(() => { vi.restoreAllMocks(); });

const DATE = '09/10/2026';
const NUMERO = 'ORD-20261009-AB12';

const data = (over: Partial<PdfOrdonnanceData> = {}): PdfOrdonnanceData => ({
  ordreNumber: NUMERO,
  doctor: { prenom: 'Karim', nom: 'El Amrani', specialite: 'Cardiologie', rpps: '123456', ordre_number: '7890' },
  org: { name: 'Cabinet Atlas', adresse: '12 rue des Orangers, Casablanca', telephone: '0522000000' },
  patient: { prenom: 'salma', nom: 'BENALI', sexe: 'F', date_naissance: '1985-03-12' },
  medications: [
    { nom: 'KARDEGIC 75 MG, sachet', posologie: '1 sachet par jour', duree: '30 jours', quantite: '' },
    { nom: 'GLUCOPHAGE 850 MG, comprime', posologie: '', duree: '', quantite: '' },
  ],
  date: '2026-10-09',
  ...over,
});

// Document non compressé : le texte des pages est lisible dans le fichier.
const raw = async (d: PdfOrdonnanceData) => {
  const { doc } = await buildOrdonnancePdf(d, { compress: false });
  return Buffer.from(doc.output('arraybuffer')).toString('latin1');
};
const count = (hay: string, needle: string) => hay.split(needle).length - 1;

describe('ordonnance — identité du patient selon la préférence du cabinet', () => {
  it('option désactivée (défaut) : aucune ligne patient', () => {
    expect(ordonnancePatientLine(data().patient, false)).toBeNull();
    expect(ordonnancePatientLine(data().patient, undefined)).toBeNull();
  });
  it('option activée : civilité, nom propre et âge', () => {
    const line = ordonnancePatientLine(data().patient, true)!;
    expect(line.startsWith('Patient : Mme Salma Benali')).toBe(true);
    expect(line).toMatch(/ans$/);
  });
  it('PDF : ni nom ni âge par défaut ; présents si l’option est activée', async () => {
    const off = await raw(data());
    expect(off).not.toContain('Benali');
    expect(off).not.toContain('Patient :');
    expect(off).not.toMatch(/\d+ ans\b/);
    const on = await raw(data({ showPatientName: true }));
    expect(on).toContain('Benali');
    expect(on).toContain('Patient :');
  });
});

describe('ordonnance — date unique, aucun numéro', () => {
  it('la date apparaît une seule fois (en-tête)', async () => {
    const r = await raw(data());
    expect(count(r, DATE)).toBe(1);
    expect(r).toContain(`(Le ${DATE})`);
  });
  it('idem avec le patient affiché et un prochain rendez-vous à une autre date', async () => {
    const r = await raw(data({ showPatientName: true, nextAppointment: '2026-11-20' }));
    expect(count(r, DATE)).toBe(1);
    expect(r).toContain('20/11/2026');
  });
  it('le numéro d’ordonnance n’est imprimé nulle part (en-tête, pied de page)', async () => {
    const r = await raw(data());
    expect(r).not.toContain(NUMERO);
    expect(r).not.toContain('ORD-');
  });
  it('le nom de fichier ne porte pas le numéro', async () => {
    const { fileName } = await buildOrdonnancePdf(data());
    expect(fileName).not.toContain('ORD-');
  });
});

describe('ordonnance — posologie non bloquante à l’impression', () => {
  it('ligne sans posologie : imprimée sans posologie, aucun texte inventé', async () => {
    const r = await raw(data());
    expect(r).toContain('KARDEGIC 75 MG');
    expect(r).toContain('GLUCOPHAGE 850 MG');
    // Une seule ligne « Posologie : » : celle de Kardegic, saisie par le médecin.
    expect(count(r, 'Posologie :')).toBe(1);
    expect(r).toContain('Posologie : 1 sachet par jour');
    expect(r).not.toMatch(/fois par jour|comprim[ée] \d|selon prescription|non pr[ée]cis/i);
  });
  it('toutes les lignes sans posologie : le PDF se génère, sans aucune posologie', async () => {
    const r = await raw(data({ medications: [{ nom: 'SINTROM 4 MG', posologie: '   ', duree: '', quantite: '' }] }));
    expect(r).toContain('SINTROM 4 MG');
    expect(count(r, 'Posologie')).toBe(0);
  });
});

describe('pages d’examens — patient toujours imprimé, date unique, aucun numéro de demande', () => {
  const nfs = (examData.examens as ExamRef[]).find(x => x.code === 'NFS')!;
  const input: ExamDocInput = {
    numero: 'DEM-20261009-ZZ99', dateIso: '2026-10-09', echeance: { date: '2026-11-09', libelle: '1_mois' },
    urgent: false, ald: false, regrouperImageries: false, renseignements: '',
    patient: { prenom: 'salma', nom: 'BENALI', sexe: 'F', date_naissance: '1985-03-12' },
    lines: [{ libelle: nfs.libelle, type: nfs.type, categorie: nfs.categorie, a_jeun: nfs.a_jeun, delai_jeun_h: nfs.delai_jeun_h }],
  };
  const header = {
    doctor: { prenom: 'Karim', nom: 'El Amrani' },
    org: { name: 'Cabinet Atlas' },
  };

  it('une page de biologie', () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: false });
    const pages = buildExamPages(input);
    appendExamPages(doc, pages, header, { logo: null, watermark: null }, { startOnNewPage: false });
    const r = Buffer.from(doc.output('arraybuffer')).toString('latin1');
    expect(r).toContain('Patient :');
    expect(r).toContain('Benali');
    expect(r).not.toContain('DEM-');
    // Une seule fois la date de la demande ; l'échéance (autre date) reste imprimée.
    expect(count(r, DATE)).toBe(1);
  });
});

describe('certificats — en-tête et bloc signature partagés', () => {
  it('date une seule fois (en-tête) ; le numéro du certificat reste imprimé', () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: false });
    drawDocumentHeader(doc, {
      doctor: { prenom: 'Karim', nom: 'El Amrani' }, org: { name: 'Cabinet Atlas' },
      title: 'CERTIFICAT', dateIso: '2026-10-09', numero: 'CG-2026-1234',
    }, null);
    drawSignatureBlock(doc, 232);
    const r = Buffer.from(doc.output('arraybuffer')).toString('latin1');
    expect(count(r, DATE)).toBe(1);
    expect(r).toContain('CG-2026-1234');
    expect(r).toContain('Signature et cachet');
  });
});
