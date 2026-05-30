#!/usr/bin/env node
// Bloque npm et yarn, impose pnpm pour ce projet Node.js (PreToolUse Bash)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const FORBIDDEN = [
  { pattern: /(^|[;&|\s])npm(\s|$)/, replacement: 'pnpm' },
  { pattern: /(^|[;&|\s])yarn(\s|$)/, replacement: 'pnpm' },
];

export function run(input) {
  if (input.tool_name !== 'Bash') return null;
  const cmd = input.tool_input?.command ?? '';
  const hit = FORBIDDEN.find(({ pattern }) => pattern.test(cmd));
  return hit
    ? { decision: 'block', reason: `Utiliser '${hit.replacement}' à la place. Ce projet impose pnpm (pas npm ni yarn).` }
    : null;
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
