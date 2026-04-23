/**
 * scrape-medicament-ma-complet.mjs — v3 COMPLET
 * ================================================
 * 1. Scrape ALL pages of medicament.ma (by letter A→Z + pagination)
 * 2. Merge with cnops_meds.json for DCI data
 * 3. Check which meds are already in Supabase
 * 4. UPDATE laboratoire + nom_commercial for existing records
 * 5. INSERT new meds not yet in DB
 * 6. Final count report
 *
 * Usage: node scripts/scrape-medicament-ma-complet.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ─────────────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://yxzvukryngvlzjgaydqj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4enZ1a3J5bmd2bHpqZ2F5ZHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTAzMTQsImV4cCI6MjA4NDA2NjMxNH0.w0empkUZmdeva1cmwDVDog_g5qyMdyBoamgEIFkjJwM';
const BASE    = 'https://medicament.ma';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const DELAY   = 350; // ms entre requêtes
const BATCH   = 200;
const OUT_JSON = join(__dirname, 'nouveaux_meds_ma.json');
const RETRY_MAX = 3;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalize(s) {
  return (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim();
}

async function fetchWithRetry(url, attempt = 0) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OrdoSur-research/1.0)' },
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) {
      if (r.status === 429 && attempt < RETRY_MAX) {
        await sleep(2000 * (attempt + 1));
        return fetchWithRetry(url, attempt + 1);
      }
      return null;
    }
    return r.text();
  } catch (e) {
    if (attempt < RETRY_MAX) {
      await sleep(1000 * (attempt + 1));
      return fetchWithRetry(url, attempt + 1);
    }
    return null;
  }
}

// ── Parser HTML ─────────────────────────────────────────────────────────────

function parsePage(html) {
  const meds = [];

  // Pattern principal : <a href="/medicament/..."><p class="primary">NOM, Forme [P/G]</p><span class="secondary">Présentation - PPV: X.XX dhs - LABO</span>
  const blockRe = /<a\s+[^>]*href="(https?:\/\/medicament\.ma\/medicament\/[^"]+)"[^>]*>[\s\S]*?<p[^>]*class="[^"]*primary[^"]*"[^>]*>([\s\S]*?)<\/p>[\s\S]*?<span[^>]*class="[^"]*secondary[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;

  let m;
  while ((m = blockRe.exec(html)) !== null) {
    const href  = m[1];
    const pRaw  = m[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
    const sRaw  = m[3].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();

    if (!pRaw || pRaw.length < 2) continue;

    // Parser p.primary: "NOM DOSAGE, Forme [P/G]" ou "NOM, Forme [P/G]"
    const commaIdx = pRaw.indexOf(',');
    const beforeComma = commaIdx > 0 ? pRaw.slice(0, commaIdx).trim() : pRaw.replace(/\[.*?\]/g, '').trim();
    const afterComma  = commaIdx > 0 ? pRaw.slice(commaIdx + 1).trim() : '';
    const pgMatch = afterComma.match(/\[(P|G)\]/i) || pRaw.match(/\[(P|G)\]/i);
    const pg      = pgMatch ? pgMatch[1].toUpperCase() : null;
    const forme   = afterComma.replace(/\[.*?\]/g, '').trim() || null;

    // Extraire nom_commercial (avant dosage numérique) et dosage
    const dosageMatch = beforeComma.match(/^(.+?)\s+(\d[\d\s.,]*(?:MG|MCG|G|ML|UI|%|IU|MG\/ML|MG\/G|MM|MEQ|MMOL|MG\/MCG|MICROGRAMME|MICROG)[^\s,]*)/i);
    const nom_commercial = dosageMatch ? dosageMatch[1].trim() : beforeComma;
    const dosage         = dosageMatch ? dosageMatch[2].trim() : null;

    // Parser span.secondary: "Boite de 30 - PPV: 372.00 dhs - LABORATOIRE X"
    const ppvMatch = sRaw.match(/PPV\s*:\s*([\d\s.,]+)\s*dhs/i);
    const ppv_ma   = ppvMatch ? parseFloat(ppvMatch[1].replace(/\s/g, '').replace(',', '.')) : null;

    // Laboratoire = dernier segment après le dernier " - "
    const parts = sRaw.split(/\s*-\s*/);
    let laboratoire = null;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i].trim();
      if (p && !p.match(/^PPV/i) && !p.match(/^\d/) && !p.match(/^PH/i) && !p.match(/^Boite/i)) {
        laboratoire = p;
        break;
      }
    }

    const presentation = parts[0]?.trim() || null;

    meds.push({
      nom: pRaw.replace(/\[.*?\]/g, '').trim(),
      nom_commercial: nom_commercial || beforeComma,
      forme:          forme,
      dosage:         dosage,
      presentation:   presentation,
      ppv_ma:         ppv_ma,
      laboratoire:    laboratoire,
      princeps_generique: pg === 'P' ? 'princeps' : pg === 'G' ? 'generique' : null,
      url:            href,
      pays:           'MA',
    });
  }

  // Fallback : essayer un pattern simplifié si le premier n'a rien donné
  if (meds.length === 0) {
    // Chercher les liens /medicament/ et tenter de parser
    const linkRe = /<a[^>]+href="(\/medicament\/[^"]+)"[^>]*>([^<]{3,})<\/a>/gi;
    while ((m = linkRe.exec(html)) !== null) {
      const name = m[2].replace(/&amp;/g, '&').trim();
      if (name.length > 2) {
        meds.push({
          nom: name,
          nom_commercial: name.split(',')[0].trim(),
          forme: null, dosage: null, presentation: null,
          ppv_ma: null, laboratoire: null, princeps_generique: null,
          url: BASE + m[1], pays: 'MA',
        });
      }
    }
  }

  // Pagination : on ne fait plus confiance aux numéros dans le HTML
  // → on utilise uniquement l'early-exit dans scrapeAll() (meds.length === 0)
  // hasMore = true si on a trouvé des meds (il peut y en avoir d'autres)
  const hasMore = meds.length > 0;

  return { meds, hasMore };
}

// ── Scraping ────────────────────────────────────────────────────────────────

async function scrapeAll() {
  console.log('\n=== SCRAPING medicament.ma (complet) ===\n');
  const all = [];
  let totalPages_global = 0;

  for (const letter of LETTERS) {
    // Page 1
    const url1 = `${BASE}/listing-des-medicaments/?lettre=${letter}`;
    const html1 = await fetchWithRetry(url1);
    if (!html1) {
      console.log(`  ${letter}: ❌ inaccessible`);
      await sleep(DELAY);
      continue;
    }

    const { meds: m1, hasMore } = parsePage(html1);
    all.push(...m1);

    process.stdout.write(`  ${letter}: p1:${m1.length}`);

    // Pages suivantes — loop jusqu'à 0 résultats (early exit, max 200 pages)
    if (hasMore) {
      for (let p = 2; p <= 200; p++) {
        await sleep(DELAY);
        const urlP = `${BASE}/listing-des-medicaments/page/${p}/?lettre=${letter}`;
        const htmlP = await fetchWithRetry(urlP);
        if (!htmlP) { process.stdout.write(` p${p}:❌`); break; }
        const { meds: mp } = parsePage(htmlP);
        if (mp.length === 0) {
          process.stdout.write(` | stop@p${p}`);
          totalPages_global += p - 1;
          break;
        }
        all.push(...mp);
        process.stdout.write(` p${p}:${mp.length}`);
        if (p === 200) totalPages_global += 200;
      }
    } else {
      totalPages_global += 1;
    }

    console.log('');
    await sleep(DELAY);
  }

  console.log(`\n  → ${all.length} médicaments scrappés au total (${totalPages_global} pages)`);
  return all;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();

  // ── 0. Compter avant ───────────────────────────────────────────────────
  const { count: countBefore } = await supabase
    .from('medicaments').select('*', { count: 'exact', head: true })
    .eq('pays', 'MA');
  console.log(`\n📊 Avant import: ${countBefore} médicaments marocains en base`);

  // ── 1. Scraping fresh de medicament.ma ─────────────────────────────────
  const freshMeds = await scrapeAll();

  // ── 2. Charger les JSON existants (CNOPS) ──────────────────────────────
  let cnopsMeds = [];
  const cnopsPath = join(__dirname, 'cnops_meds.json');
  if (existsSync(cnopsPath)) {
    cnopsMeds = JSON.parse(readFileSync(cnopsPath, 'utf8'));
    console.log(`\n📂 CNOPS: ${cnopsMeds.length} entrées chargées`);
  }

  // ── 3. Construire un index pour déduplication ───────────────────────────
  // Clé: normalize(nom_commercial)|normalize(forme)
  const makeKey = (nomCommercial, forme) =>
    `${normalize(nomCommercial)}|${normalize(forme || '')}`;

  // Index depuis le scraping
  const scraped = new Map();
  for (const m of freshMeds) {
    const key = makeKey(m.nom_commercial, m.forme);
    if (!scraped.has(key)) scraped.set(key, m);
  }

  // Ajouter CNOPS (enrichir les existants avec DCI)
  const cnopsMap = new Map();
  for (const c of cnopsMeds) {
    const key = makeKey(c.nom_commercial, c.forme);
    cnopsMap.set(key, c);
  }

  // Fusionner : pour chaque méd scrapé, enrichir avec DCI si CNOPS l'a
  const merged = new Map();
  for (const [key, m] of scraped) {
    const cnops = cnopsMap.get(key);
    merged.set(key, {
      nom:            m.nom || m.nom_commercial,
      nom_commercial: m.nom_commercial,
      dci:            cnops?.dci || null,
      forme:          m.forme || null,
      dosage:         m.dosage || cnops?.dosage || null,
      ppv_ma:         m.ppv_ma || cnops?.ppv_ma || null,
      laboratoire:    m.laboratoire || null,
      pays:           'MA',
    });
  }

  // Ajouter les CNOPS pas dans le scraping
  for (const [key, c] of cnopsMap) {
    if (!merged.has(key)) {
      merged.set(key, {
        nom:            c.nom || c.nom_commercial,
        nom_commercial: c.nom_commercial,
        dci:            c.dci || null,
        forme:          c.forme || null,
        dosage:         c.dosage || null,
        ppv_ma:         c.ppv_ma || null,
        laboratoire:    null,
        pays:           'MA',
      });
    }
  }

  console.log(`\n📦 Total sources fusionnées: ${merged.size} médicaments uniques`);

  // ── 4. Charger tous les noms existants en DB ────────────────────────────
  console.log('\n🔍 Chargement des médicaments MA existants en base...');
  let existingMeds = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('medicaments')
      .select('id, nom, nom_commercial, laboratoire, dci, forme')
      .eq('pays', 'MA')
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (error || !data || data.length === 0) break;
    existingMeds.push(...data);
    if (data.length < 1000) break;
    page++;
  }
  console.log(`  → ${existingMeds.length} enregistrements récupérés`);

  // Index DB par nom normalisé
  const dbByNom = new Map();
  for (const r of existingMeds) {
    dbByNom.set(normalize(r.nom), r);
    if (r.nom_commercial) dbByNom.set(normalize(r.nom_commercial), r);
  }

  // ── 5. Déterminer nouvelles entrées vs existantes ───────────────────────
  const toInsert = [];
  const toUpdate = []; // { id, nom_commercial, laboratoire, dci }

  for (const [key, m] of merged) {
    // Chercher en DB par nom ou nom_commercial
    const normNom = normalize(m.nom);
    const normNomComm = normalize(m.nom_commercial);
    const existing = dbByNom.get(normNom) || dbByNom.get(normNomComm);

    if (existing) {
      // Mettre à jour laboratoire + nom_commercial si on a de meilleures données
      const needsUpdate = (
        (!existing.laboratoire && m.laboratoire) ||
        (!existing.dci && m.dci) ||
        (existing.nom_commercial && existing.nom_commercial === existing.nom && m.nom_commercial !== m.nom)
      );
      if (needsUpdate) {
        toUpdate.push({
          id:             existing.id,
          nom_commercial: m.nom_commercial || existing.nom_commercial,
          laboratoire:    m.laboratoire || existing.laboratoire,
          dci:            m.dci || existing.dci,
        });
      }
    } else {
      toInsert.push({
        nom:            m.nom,
        nom_commercial: m.nom_commercial,
        dci:            m.dci,
        forme:          m.forme,
        dosage:         m.dosage,
        ppv_ma:         m.ppv_ma,
        laboratoire:    m.laboratoire,
        pays:           'MA',
      });
    }
  }

  console.log(`\n📋 Résumé:`);
  console.log(`  → ${toInsert.length} nouveaux médicaments à importer`);
  console.log(`  → ${toUpdate.length} enregistrements à enrichir (laboratoire/dci)`);

  // Sauvegarder les nouveaux dans un fichier JSON
  writeFileSync(OUT_JSON, JSON.stringify(toInsert, null, 2));
  console.log(`  → Sauvegardé: ${OUT_JSON}`);

  // ── 6. Créer policy INSERT temporaire ──────────────────────────────────
  if (toInsert.length > 0) {
    console.log('\n🔒 Création policy INSERT temporaire...');
    // Utiliser le client directement — la policy est créée via execute_sql dans le MCP
    // Ici on tente avec le service_role si disponible, sinon on skip
    console.log('  → Note: policy temp_import_ma_v3 doit être créée via SQL Editor');
  }

  // ── 7. UPDATE des enregistrements existants ─────────────────────────────
  if (toUpdate.length > 0) {
    console.log(`\n✏️  Update ${toUpdate.length} enregistrements (laboratoire + dci)...`);
    let updOk = 0;
    const UPDATE_BATCH = 50;
    for (let i = 0; i < toUpdate.length; i += UPDATE_BATCH) {
      const batch = toUpdate.slice(i, i + UPDATE_BATCH);
      await Promise.all(batch.map(async u => {
        const { error } = await supabase
          .from('medicaments')
          .update({
            nom_commercial: u.nom_commercial,
            laboratoire:    u.laboratoire,
            dci:            u.dci,
          })
          .eq('id', u.id);
        if (!error) updOk++;
      }));
      if (i % 500 === 0) process.stdout.write(`\r  → ${updOk}/${toUpdate.length} mis à jour`);
      await sleep(100);
    }
    console.log(`\r  → ${updOk} mis à jour ✅`);
  }

  // ── 8. INSERT des nouveaux médicaments ─────────────────────────────────
  if (toInsert.length > 0) {
    console.log(`\n🚀 Insertion de ${toInsert.length} nouveaux médicaments...`);
    let inserted = 0;
    let errors   = 0;
    const batches = Math.ceil(toInsert.length / BATCH);

    for (let i = 0; i < batches; i++) {
      const batch = toInsert.slice(i * BATCH, (i + 1) * BATCH);
      const { error } = await supabase.from('medicaments').insert(batch);
      if (error) {
        // Si RLS bloque, c'est attendu — afficher l'erreur
        if (error.message.includes('policy') || error.message.includes('violates')) {
          console.log(`\n  ⚠️  RLS bloque l'insertion. Utilise le script SQL ci-dessous.`);
          console.log(`  Policy: CREATE POLICY "temp_import_ma_v3" ON medicaments FOR INSERT TO anon WITH CHECK (true);`);
          break;
        }
        console.error(`  Batch ${i+1}/${batches} ERR:`, error.message);
        errors++;
      } else {
        inserted += batch.length;
        process.stdout.write(`\r  → Inséré: ${inserted}/${toInsert.length}`);
      }
      await sleep(150);
    }
    console.log(`\r  → ${inserted} insérés, ${errors} erreurs de batch`);
  }

  // ── 9. Compter après ───────────────────────────────────────────────────
  const { count: countAfter } = await supabase
    .from('medicaments').select('*', { count: 'exact', head: true })
    .eq('pays', 'MA');

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ RAPPORT FINAL (${elapsed}s)`);
  console.log(`   Avant:  ${countBefore} médicaments MA`);
  console.log(`   Après:  ${countAfter} médicaments MA`);
  console.log(`   Ajout:  ${(countAfter || 0) - (countBefore || 0)} nouveaux`);
  console.log(`${'='.repeat(50)}\n`);
}

main().catch(e => { console.error('\n❌ Erreur fatale:', e); process.exit(1); });
