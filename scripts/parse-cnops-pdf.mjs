/**
 * parse-cnops-pdf.mjs
 * Parse le PDF CNOPS (Guide médicaments remboursés) et extrait les médicaments marocains.
 * Résultat : cnops_meds.json
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __dirname = dirname(fileURLToPath(import.meta.url));
const PDF_PATH = join(__dirname, 'cnops_guide.pdf');
const OUT_PATH = join(__dirname, 'cnops_meds.json');

async function main() {
  console.log('Parsing CNOPS PDF...');
  const buf = readFileSync(PDF_PATH);
  const data = await pdfParse(buf);
  const text = data.text;

  // Le PDF est tabulaire. Chaque ligne de données ressemble à :
  // 6118000170143  GLUCOR  ACARBOSE  COMPRIME à 50 MG  1 BOITE 30 COMPRIME  49,70  49,70  31,10  31,10  ANTIDIABETIQUES  P
  // On utilise une regex pour capturer les lignes qui commencent par un EAN-13 (13 chiffres)
  const lines = text.split('\n');
  const meds = [];
  const EAN_RE = /^(\d{13})\s+(.+)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!EAN_RE.test(line)) continue;

    // On a une ligne de médicament. Tokeniser par espaces multiples / colonnes.
    // La structure est : EAN  NOM_COMMERCIAL  DCI  FORME_DOSAGE  PRESENTATION  PPV  ...
    // On sépare les tokens en splitant sur 2+ espaces
    const tokens = line.split(/\s{2,}/).map(t => t.trim()).filter(Boolean);
    if (tokens.length < 5) continue;

    const ean = tokens[0];
    const nom_commercial = tokens[1] || '';
    const dci = tokens[2] || '';
    const forme_dosage = tokens[3] || '';
    const presentation = tokens[4] || '';
    const ppv_str = tokens[5] || '';
    const classe = tokens[9] || tokens[8] || '';
    const pg = tokens[10] || tokens[9] || '';

    // Parser le PPV (format marocain : "49,70" → 49.70)
    const ppv = parseFloat(ppv_str.replace(',', '.')) || null;

    // Extraire forme et dosage séparément
    // Ex: "COMPRIME à 50 MG" → forme: "COMPRIME", dosage: "50 MG"
    const formeMatch = forme_dosage.match(/^([A-ZÀÂÄ\s]+?)(?:\s+[AÀ]\s+|\s+)(\d.*)$/i);
    const forme = formeMatch ? formeMatch[1].trim() : forme_dosage;
    const dosage = formeMatch ? formeMatch[2].trim() : '';

    if (!nom_commercial || !dci) continue;

    meds.push({
      ean,
      nom: nom_commercial + (forme ? ' ' + forme_dosage : ''),
      nom_commercial,
      dci: dci.toUpperCase(),
      forme: forme.toUpperCase(),
      dosage,
      presentation,
      ppv_ma: ppv,
      classe_therapeutique: classe,
      princeps_generique: pg === 'P' ? 'princeps' : pg === 'G' ? 'generique' : null,
      pays: 'MA',
    });
  }

  console.log(`Médicaments extraits : ${meds.length}`);
  if (meds.length > 0) {
    console.log('Exemple :', JSON.stringify(meds[0], null, 2));
  }

  writeFileSync(OUT_PATH, JSON.stringify(meds, null, 2));
  console.log(`Sauvegardé dans ${OUT_PATH}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
