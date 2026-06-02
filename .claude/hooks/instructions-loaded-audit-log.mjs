#!/usr/bin/env node
// Journalise le chargement d'instructions / mémoire (InstructionsLoaded)
import { readFileSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export function run(
  input,
  {
    append = appendFileSync,
    mkdir = mkdirSync,
    projectDir = process.env.CLAUDE_PROJECT_DIR ?? '.',
    now = () => new Date().toISOString(),
  } = {},
) {
  const logPath = join(projectDir, '.claude', 'instructions-audit.log');
  try { mkdir(dirname(logPath), { recursive: true }); } catch { /* exists */ }

  const line = `${now()} | ${input.memory_type} | ${input.load_reason} | ${input.file_path}\n`;
  append(logPath, line);
  return line;
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  run(input);
}
