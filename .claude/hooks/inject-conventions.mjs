#!/usr/bin/env node
// Injecte les règles d'agent dans chaque prompt (UserPromptSubmit)
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

export function run({
  exists = existsSync,
  readFile = readFileSync,
  projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
} = {}) {
  // Priorité : .claude/agent-rules.md > CONVENTIONS.md > absent (no-op)
  const candidates = [
    join(projectDir, '.claude', 'agent-rules.md'),
    join(projectDir, 'CONVENTIONS.md'),
  ];

  const target = candidates.find(exists);
  if (!target) return null;

  const content = readFile(target, 'utf8').trim();
  if (!content) return null;

  return `### Conventions du projet (injectées automatiquement)\n\n${content}\n`;
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = run();
  if (result) process.stdout.write(result);
}
