#!/usr/bin/env node
// Bloque pip/poetry install et suggère l'équivalent uv (PreToolUse Bash)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const BLOCKED = [
  { re: /(^|[;&|\s`])pip\s+install\b/,    fix: 'uv add' },
  { re: /(^|[;&|\s`])pip3\s+install\b/,   fix: 'uv add' },
  { re: /(^|[;&|\s`])poetry\s+add\b/,     fix: 'uv add' },
  { re: /(^|[;&|\s`])poetry\s+install\b/, fix: 'uv sync' },
];

export function run(input) {
  if (input.tool_name !== 'Bash') return null;
  const cmd = input.tool_input?.command ?? '';

  const hit = BLOCKED.find(({ re }) => re.test(cmd));
  if (!hit) return null;

  return {
    decision: 'block',
    reason: `Use '${hit.fix}' instead — this project manages dependencies with uv.`,
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
