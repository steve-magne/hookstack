#!/usr/bin/env node
// Charge les instructions agent depuis .claude/instructions.md au démarrage (SessionStart)
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

export function run({
  exists = existsSync,
  readFile = readFileSync,
  writeFile = writeFileSync,
  projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
  tmpFile = join(tmpdir(), `claude-instructions-${process.pid}.md`),
} = {}) {
  const instructionsPath = join(projectDir, '.claude', 'instructions.md');
  if (!exists(instructionsPath)) return null;

  const content = readFile(instructionsPath, 'utf8').trim();
  if (!content) return null;

  // Sauvegarde dans /tmp pour que d'autres hooks puissent le lire
  writeFile(tmpFile, content);
  return { message: '[load-instructions] Instructions chargées depuis .claude/instructions.md\n' };
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = run();
  if (result?.message) process.stderr.write(result.message);
}
