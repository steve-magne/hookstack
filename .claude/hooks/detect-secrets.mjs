#!/usr/bin/env node
// @hookstack pre-bash-secret-detection
// Bloc les commandes Bash contenant des secrets potentiels (PreToolUse)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const SECRET_PATTERNS = [
  /(?:ANTHROPIC|OPENAI|CLAUDE|GEMINI|GROQ)_API_KEY\s*=\s*['"]?\S{20,}/i,
  /sk-(?:ant-|proj-)?[a-zA-Z0-9_-]{32,}/,
  /ghp_[a-zA-Z0-9]{36}/,
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY/,
  /(?:password|passwd|secret|token)\s*=\s*['"][^'"]{6,}/i,
];

export function run(input) {
  const command = input.tool_input?.command ?? '';
  const match = SECRET_PATTERNS.find((p) => p.test(command));
  return match
    ? { decision: 'block', reason: 'Secret potentiel détecté dans la commande. Vérifiez avant de continuer.' }
    : null;
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
