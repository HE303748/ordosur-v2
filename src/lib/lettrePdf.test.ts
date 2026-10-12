import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { buildLettrePdf, lettreSafe, motsDuParagraphe, type LettreDocument } from './lettrePdf';
import { destinataireLigne, genererLettre, parseMarkup, patientLigne } from './lettreAdressage';
import type { PdfChromeAssets } from './pdfService';
import type { RecapGroup } from './resultatsLogic';

const today = new Date(2026, 9, 12);
const patient = { prenom: 'karim', nom: 'ALAOUI', sexe: 'M', date_naissance: '1999-03-10' };
const contenu = genererLettre({
  today, patient, confrere: { nom: 'Bennani', civilite: 'Mme' },
  pathologies: [{ nom: 'Diabète de type 2', depuisAnnee: 2024 }, { nom: 'Hypertension artérielle', depuisAnnee: 2019 }],
  traitements: [{ nom: 'Glucophage 850 mg', dci: 'metformine' }, { nom: 'Triatec 5 mg', dci: 'ramipril' }],
  modeTraitements: 'classes',
  contexteSuivi: 'suivi dans notre formation pour prise en charge d’une stéatose hépatique',
  bilans: [{ label: 'HbA1c', valeur: '7,2 %', date: '2026-09-12' }],
  motif: 'Complément de prise en charge',
});
const lettre = (over: Partial<LettreDocument> = {}): LettreDocument => ({
  entete: {
    doctor: { prenom: 'Karim', nom: 'El Amrani', specialite: 'Hépato-gastro-entérologie', rpps: '123456789', ordre_number: '4521' },
    org: { name: 'Cabinet Dr Karim El Amrani', adresse: '12, boulevard Zerktouni, Casablanca', telephone: '05 22 00 00 00' },
  },
  dateIso: '2026-10-12',
  destinataireLigne: destinataireLigne({ confrere: { titre: 'Dr', civilite: 'Mme', nom: 'Bennani', prenom: 'Salma', specialite: 'Cardiologie' }, specialite: 'Cardiologie' }),
  patientLigne: patientLigne(patient, today),
  motif: 'Complément de prise en charge',
  urgence: 'programme',
  contenu,
  ...over,
});
const sans: PdfChromeAssets = { logo: null, watermark: null };
// Filigrane d'origine (non réduit) : cas le plus lourd possible. En production il est réduit à 800 px.
const lourd: PdfChromeAssets = { logo: null, watermark: { data: `data:image/png;base64,${readFileSync('public/pdf-assets/watermark.png').toString('base64')}`, format: 'PNG' } };
const brut = async (d: LettreDocument) => Buffer.from(await (await buildLettrePdf(d, { fileName: 'x.pdf', assets: sans, compress: false })).blob.arrayBuffer()).toString('latin1');
const occurrences = (raw: string, s: string) => raw.split(s).length - 1;
const pages = (raw: string) => (raw.match(/\/Type\s*\/Page\b(?!s)/g) ?? []).length;
// Contrôle visuel facultatif : LETTRE_PDF_OUT=<dossier> écrit les PDF générés.
const dump = async (name: string, blob: Blob) => {
  if (process.env.LETTRE_PDF_OUT) writeFileSync(`${process.env.LETTRE_PDF_OUT}/${name}.pdf`, Buffer.from(await blob.arrayBuffer()));
};

const annexe: RecapGroup[] = [
  { categorie: 'Biochimie', rows: [
    { examen: 'HbA1c', valeur: '7,2 %', bornes: '4 – 6', interpretation: 'Haut', date: '2026-09-12', precedent: '7,8 % (10/06)' },
    { examen: 'Créatinine', valeur: '9 mg/L', bornes: '6 – 12', interpretation: 'Normal', date: '2026-09-12', precedent: '' },
  ] },
];

describe('PDF « Lettre d’adressage »', () => {
  it('nom du médecin UNE seule fois (en-tête : ni signature, ni pied de page)', async () => {
    const raw = await brut(lettre());
    expect(occurrences(raw, 'Karim El Amrani')).toBe(1);
    expect(raw).toContain('(Dr Karim El Amrani)');
    expect(raw).toContain('Signature et cachet du m');
  });

  it('date UNE seule fois, sans « Fait à »', async () => {
    const raw = await brut(lettre());
    expect(occurrences(raw, '12/10/2026')).toBe(1);
    expect(raw).toContain('(Le 12/10/2026)');
    expect(raw).not.toMatch(/Fait \S+ /);
  });

  it('patient TOUJOURS présent, même si le médecin l’a retiré du texte', async () => {
    expect(await brut(lettre())).toContain('(Patient : M. Karim Alaoui');
    const raw = await brut(lettre({ contenu: 'Chers collègues,\n\nJe vous adresse ce patient pour avis.\n\nConfraternellement.' }));
    expect(raw).toContain('(Patient : M. Karim Alaoui');
  });

  it('destinataire, objet, corps avec gras, signature', async () => {
    const raw = await brut(lettre());
    expect(raw).toContain('l\'attention du Dr Salma Bennani, cardiologie)');
    expect(raw).toContain('(Objet : Adressage ');
    expect(raw).toContain("(LETTRE D'ADRESSAGE)");
    // Le nom du patient est tracé en gras, la virgule qui suit reste collée (pas d'espace).
    expect(raw).toContain('(M. Karim Alaoui) Tj');
    expect(pages(raw)).toBe(1);
  });

  it('mention « URGENT » seulement si l’adressage est urgent', async () => {
    expect(await brut(lettre())).not.toContain('(URGENT)');
    expect(await brut(lettre({ urgence: 'urgent' }))).toContain('(URGENT)');
    expect(await brut(lettre({ urgence: 'rapide' }))).toContain('(Avis souhait');
  });

  it('PDF léger (< 500 Ko), même avec le filigrane non réduit et l’annexe des bilans', async () => {
    const f = await buildLettrePdf(lettre({ annexeBilans: annexe, urgence: 'urgent' }), { fileName: 'x.pdf', assets: lourd });
    await dump('lettre_bilans', f.blob);
    expect(f.blob.size).toBeLessThan(500 * 1024);
    console.log(`[poids] lettre + récapitulatif des bilans : ${(f.blob.size / 1024).toFixed(0)} Ko`);
    const seule = await buildLettrePdf(lettre(), { fileName: 'x.pdf', assets: lourd });
    await dump('lettre', seule.blob);
    expect(seule.blob.size).toBeLessThan(500 * 1024);
  });

  it('« Joindre le récapitulatif des bilans » : ajouté à la suite, pages numérotées', async () => {
    const raw = await brut(lettre({ annexeBilans: annexe }));
    expect(pages(raw)).toBe(2);
    expect(raw).toContain('(BILANS)');
    expect(raw).toContain('(Page 1/2)');
    expect(raw).toContain('(Page 2/2)');
    expect(pages(await brut(lettre({ annexeBilans: [] })))).toBe(1);
  });

  it('lettre longue : la suite passe sur une page supplémentaire, rien n’est tronqué', async () => {
    const long = Array.from({ length: 40 }, (_, i) => `Paragraphe ${i + 1} : compte rendu détaillé du suivi, des examens réalisés et de leur évolution au fil des consultations.`).join('\n\n');
    const raw = await brut(lettre({ contenu: long }));
    expect(pages(raw)).toBeGreaterThanOrEqual(2);
    expect(raw).toContain('(Paragraphe 40 : compte rendu');
    expect(occurrences(raw, 'Signature et cachet')).toBe(1);
  });

  it('réimpression à l’identique : même document figé, même PDF', async () => {
    const strip = (r: string) => r.replace(/\/CreationDate \([^)]*\)/g, '').replace(/\/ID \[[^\]]*\]/g, '');
    expect(strip(await brut(lettre()))).toBe(strip(await brut(lettre())));
  });

  it('mots : gras et ponctuation collés, retours à la ligne conservés', () => {
    const [p] = parseMarkup('adresser **M. Karim Alaoui**, âgé\nde 27 ans');
    expect(motsDuParagraphe(p)).toEqual([
      [{ text: 'adresser', bold: false }], [{ text: 'M.', bold: true }], [{ text: 'Karim', bold: true }],
      [{ text: 'Alaoui', bold: true }, { text: ',', bold: false }], [{ text: 'âgé', bold: false }], null,
      [{ text: 'de', bold: false }], [{ text: '27', bold: false }], [{ text: 'ans', bold: false }],
    ]);
  });

  it('caractères hors police remplacés par un équivalent sûr', () => {
    expect(lettreSafe('DFG ≥ 60 → normal')).toBe('DFG >= 60 -> normal');
    expect(lettreSafe('Chère consœur — d’accord…')).toBe('Chère consœur — d’accord…');
    expect(lettreSafe(`75${String.fromCharCode(0xa0)}${String.fromCharCode(0x3bc)}g`)).toBe(`75 ${String.fromCharCode(0xb5)}g`);
  });
});
