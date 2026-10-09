// Sprint 6A-bis — Garde-fou des générateurs : une migration déjà écrite n'est JAMAIS réécrite.
//
// Une migration appliquée en base est un fait historique : la régénérer la ferait mentir sur ce
// qui a réellement été exécuté. Les générateurs n'écrivent donc un fichier de migration que
// s'il n'existe pas encore. Toute évolution des données passe par une NOUVELLE migration.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename } from 'node:path';

/**
 * Écrit `sql` dans `url` uniquement si le fichier n'existe pas. Renvoie
 * 'created' | 'unchanged' (existe, contenu identique) | 'kept' (existe, contenu différent : non réécrit).
 */
export function writeNewMigration(url, sql) {
  const name = basename(fileURLToPath(url));
  if (!existsSync(url)) {
    writeFileSync(url, sql);
    console.log(`migration créée : ${name}`);
    return 'created';
  }
  const same = readFileSync(url, 'utf8').replace(/\r\n/g, '\n') === sql.replace(/\r\n/g, '\n');
  if (same) return 'unchanged';
  console.warn(`⛔ ${name} existe déjà et N'A PAS été réécrite (la source a changé depuis).\n   Portez le changement dans une NOUVELLE migration.`);
  return 'kept';
}
