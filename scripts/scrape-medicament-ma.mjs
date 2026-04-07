/**
 * scrape-medicament-ma.mjs — v2
 * Scrape medicament.ma avec la vraie structure HTML :
 *   <p class="primary">NOM, Forme [P]</p>
 *   <span class="secondary">Boite de N - PPV: XX.XX dhs - LAB</span>
 * Résultat : medicament_ma.json
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'medicament_ma.json');
const BASE = 'https://medicament.ma';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const DELAY = 250;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function get(url) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research)' },
      signal: AbortSignal.timeout(20000),
    });
    return r.ok ? r.text() : null;
  } catch { return null; }
}

function parsePage(html) {
  const meds = [];

  // Extraire chaque bloc <a href="/medicament/...">...<p class="primary">...</p><span class="secondary">...</span>
  const blockRe = /<a\s+href="(https?:\/\/medicament\.ma\/medicament\/[^"]+)"[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<span[^>]*>([\s\S]*?)<\/span>/gi;
  let m;
  while ((m = blockRe.exec(html)) !== null) {
    const href = m[1];
    const pText = m[2].replace(/<[^>]+>/g, '').trim();   // "ABIP 15 MG, Comprimé pelliculé [P]"
    const sText = m[3].replace(/<[^>]+>/g, '').trim();   // "Boite de 30 - PPV: 372.00 dhs - LAB"

    // Parser p (primary) : "NOM DOSAGE, FORME [P/G]"
    const commaIdx = pText.indexOf(',');
    const nomDosage = commaIdx > 0 ? pText.slice(0, commaIdx).trim() : pText.trim();
    const formeRest = commaIdx > 0 ? pText.slice(commaIdx + 1).trim() : '';
    const pgMatch = formeRest.match(/\[(P|G)\]/);
    const pg = pgMatch ? pgMatch[1] : null;
    const forme = formeRest.replace(/\[.*?\]/g, '').trim();

    // Parser span (secondary) : "Boite de 30 - PPV: XX.XX dhs - LAB" ou "Boite - PPV: XX - PH: XX - LAB"
    const ppvMatch = sText.match(/PPV:\s*([\d,.]+)\s*dhs/i);
    const ppv_ma = ppvMatch ? parseFloat(ppvMatch[1].replace(/\s/g, '').replace(',', '.')) : null;

    const labMatch = sText.match(/dhs\s*-\s*(.+)$/i);
    const laboratoire = labMatch ? labMatch[1].trim() : '';

    const presMatch = sText.match(/^([^-]+)/);
    const presentation = presMatch ? presMatch[1].trim() : '';

    if (!nomDosage || nomDosage.length < 2) continue;

    meds.push({
      nom: pText.replace(/\[.*?\]/g, '').trim(),
      nom_commercial: nomDosage,
      forme: forme || null,
      presentation: presentation || null,
      ppv_ma: ppv_ma,
      laboratoire: laboratoire || null,
      princeps_generique: pg === 'P' ? 'princeps' : pg === 'G' ? 'generique' : null,
      url: href,
      pays: 'MA',
    });
  }

  // Extraire le nombre de pages (dernier lien de pagination avec ≫)
  let totalPages = 1;
  const lastRe = /href="[^"]*\/page\/(\d+)\/[^"]*"[^>]*>(?:[^<]*(?:&raquo;|»|›|>>)[^<]*|<span>[^<]*<\/span>)<\/a>/i;
  const lm = lastRe.exec(html);
  if (lm) totalPages = parseInt(lm[1]);
  // Fallback : chercher tous les numéros de page et prendre le max
  const allNums = [...html.matchAll(/\/page\/(\d+)\//g)].map(x => parseInt(x[1]));
  if (allNums.length) totalPages = Math.max(totalPages, ...allNums);

  return { meds, totalPages };
}

async function main() {
  console.log('=== Scraping medicament.ma v2 ===\n');
  const all = [];
  let grand = 0;

  for (const letter of LETTERS) {
    const url1 = `${BASE}/listing-des-medicaments/?lettre=${letter}`;
    const html1 = await get(url1);
    if (!html1) { console.log(`  ${letter}: inaccessible`); continue; }

    const { meds: m1, totalPages } = parsePage(html1);
    all.push(...m1);
    grand += m1.length;
    process.stdout.write(`  ${letter}: p1/${totalPages} (${m1.length})`);

    for (let p = 2; p <= Math.min(totalPages, 60); p++) {
      await sleep(DELAY);
      const htmlN = await get(`${BASE}/listing-des-medicaments/page/${p}/?lettre=${letter}`);
      if (!htmlN) break;
      const { meds: mN } = parsePage(htmlN);
      if (mN.length === 0) break;
      all.push(...mN);
      grand += mN.length;
      process.stdout.write(` p${p}(${mN.length})`);
    }
    console.log(` → ${grand} total`);
    await sleep(DELAY);
  }

  console.log(`\nTotal scraped: ${all.length}`);
  writeFileSync(OUT, JSON.stringify(all, null, 2));
  console.log(`→ ${OUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
