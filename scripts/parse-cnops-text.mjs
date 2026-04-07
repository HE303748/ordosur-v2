/**
 * parse-cnops-text.mjs
 * Parse le texte extrait du PDF CNOPS via pdftotext -layout
 * et produit cnops_meds.json
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TXT = join(__dirname, 'cnops_guide.txt');
const OUT = join(__dirname, 'cnops_meds.json');

// Positions approximatives dans la ligne (après pdftotext -layout)
// EAN: 0-14, Nom: 15-39, DCI: 40-63, Forme: 64-113, Pres: 114-138, PPV: 139-155
const COL_NOM   = 14;   // 13-digit EAN + min 1 space
const COL_DCI   = 40;
const COL_FORME = 64;
const COL_PRES  = 114;
const COL_PPV   = 139;

function extract(line, start, end) {
  return (line.slice(start, end) || '').trim();
}

// Nettoie les caractères mal encodés (pdftotext avec PDF non-UTF8)
function clean(s) {
  return s
    .replace(/\uFFFD/g, 'e')  // replacement char → e
    .replace(/[\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePPV(s) {
  // "41,70" → 41.70, "1 290,00" → 1290.00
  const m = s.match(/([\d\s]+,\d{2})/);
  if (!m) return null;
  return parseFloat(m[1].replace(/\s/g, '').replace(',', '.'));
}

function main() {
  const lines = readFileSync(TXT, 'latin1').split('\n');
  const meds = [];
  const seen = new Set(); // déduplication par nom+DCI+forme

  let currentNom = '';
  let currentDCI = '';

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    if (line.length < 30) continue;

    // Détecter si la ligne a un EAN (13 chiffres en début)
    const eanMatch = line.match(/^(\d{13})\s/);
    const hasEAN = !!eanMatch;

    // Extraire chaque champ par position
    const nomRaw   = clean(extract(line, COL_NOM,   COL_DCI));
    const dciRaw   = clean(extract(line, COL_DCI,   COL_FORME));
    const formeRaw = clean(extract(line, COL_FORME, COL_PRES));
    const presRaw  = clean(extract(line, COL_PRES,  COL_PPV));
    const ppvStr   = line.length > COL_PPV ? line.slice(COL_PPV, COL_PPV + 20) : '';
    const ppv      = parsePPV(ppvStr);

    // Maj du contexte courant (certaines lignes portent le nom sans la DCI)
    if (nomRaw && nomRaw.length > 1 && /[A-Z]/.test(nomRaw)) {
      currentNom = nomRaw;
    }
    if (dciRaw && dciRaw.length > 2 && /[A-Z]/.test(dciRaw)) {
      currentDCI = dciRaw;
    }

    // On ne garde que les lignes avec PPV ET (nom OU DCI) valides
    if (!ppv || ppv < 1 || ppv > 50000) continue;
    if (!currentNom || currentNom.length < 2) continue;

    const nom = currentNom;
    const dci = currentDCI;
    const forme = formeRaw;
    const presentation = presRaw;

    const key = `${nom}|${dci}|${forme}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Extraire classe thérapeutique (après la colonne PPV+remb+PH)
    const classePart = line.length > 220 ? clean(line.slice(220, 265)) : '';

    // Extraire P/G (tout à la fin)
    const pgMatch = line.match(/\b(P|G)\s*$/);
    const pg = pgMatch ? pgMatch[1] : null;

    // Construire le nom complet : "DOLIPRANE PARACETAMOL COMPRIME 500MG"
    const nomComplet = [nom, forme].filter(Boolean).join(' ');

    meds.push({
      ean: eanMatch ? eanMatch[1] : null,
      nom: nomComplet,
      nom_commercial: nom,
      dci: dci.toUpperCase() || null,
      forme: forme || null,
      dosage: null,
      presentation: presentation || null,
      ppv_ma: ppv,
      classe_therapeutique: classePart || null,
      princeps_generique: pg === 'P' ? 'princeps' : pg === 'G' ? 'generique' : null,
      pays: 'MA',
    });
  }

  console.log(`Médicaments parsés : ${meds.length}`);
  console.log('Exemples :');
  [0, 10, 50, 100].forEach(i => meds[i] && console.log(`  [${i}]`, meds[i].nom_commercial, '|', meds[i].dci, '| PPV:', meds[i].ppv_ma));

  writeFileSync(OUT, JSON.stringify(meds, null, 2));
  console.log(`→ Sauvegardé : ${OUT}`);
}

main();
