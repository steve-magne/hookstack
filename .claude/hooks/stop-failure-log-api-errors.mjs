#!/usr/bin/env node
// @hookstack stop-failure-log-api-errors
// Journalise les erreurs d'API à l'arrêt en échec (StopFailure)
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function run(
  input,
  {
    append = appendFileSync,
    mkdir = mkdirSync,
    projectDir = process.env.CLAUDE_PROJECT_DIR ?? '.',
    now = () => new Date().toISOString(),
  } = {},
) {
  const logPath = join(projectDir, '.claude', 'api-errors.log');
  try { mkdir(dirname(logPath), { recursive: true }); } catch { /* exists */ }

  const line = `${now()} | ${input.error} | ${input.error_details ?? ''} | session:${input.session_id}\n`;
  append(logPath, line);
  return line;
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  run(input);
}
