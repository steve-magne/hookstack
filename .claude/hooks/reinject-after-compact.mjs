#!/usr/bin/env node
// @hookstack session-start-reinject-after-compact
// Réinjecte le contexte sauvegardé avant la dernière compaction (SessionStart)
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

export function run(
  input,
  {
    exists = existsSync,
    readFile = readFileSync,
    readdir = readdirSync,
    backupDir = '/tmp/claude-compact-backups',
  } = {},
) {
  const sessionId = input.session_id ?? '';
  if (!exists(backupDir)) return null;

  // Cherche le backup de la session courante en priorité, sinon le plus récent
  let backupFile = sessionId ? join(backupDir, `${sessionId}.json`) : null;

  if (!backupFile || !exists(backupFile)) {
    const files = readdir(backupDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({
        f,
        mtime: new Date(readFile(join(backupDir, f), 'utf8').split('"saved_at":"')[1]?.split('"')[0] ?? 0),
      }))
      .sort((a, b) => b.mtime - a.mtime);
    backupFile = files[0] ? join(backupDir, files[0].f) : null;
  }

  if (!backupFile || !exists(backupFile)) return null;

  try {
    const { summary, saved_at } = JSON.parse(readFile(backupFile, 'utf8'));
    if (summary) {
      return `## Contexte de la session précédente (avant compaction du ${saved_at})\n\n${summary}\n`;
    }
  } catch {
    // Fichier corrompu — ignorer silencieusement
  }
  return null;
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(result);
}
