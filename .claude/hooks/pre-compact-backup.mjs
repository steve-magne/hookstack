#!/usr/bin/env node
// @hookstack pre-compact-transcript-backup
// Sauvegarde le résumé de compaction dans un fichier temporaire (PreCompact)
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

export function run(
  input,
  {
    writeFile = writeFileSync,
    mkdir = mkdirSync,
    backupDir = '/tmp/claude-compact-backups',
    now = () => new Date().toISOString(),
  } = {},
) {
  const summary = input.summary ?? '';
  const sessionId = input.session_id ?? `session-${Date.now()}`;
  if (!summary) return null;

  mkdir(backupDir, { recursive: true });
  const file = join(backupDir, `${sessionId}.json`);
  writeFile(file, JSON.stringify({ session_id: sessionId, saved_at: now(), summary }, null, 2));

  return { file, message: `[pre-compact-backup] Contexte sauvegardé → ${file}\n` };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result?.message) process.stderr.write(result.message);
}
