#!/usr/bin/env node
// @hookstack pre-write-secret-detection
// Bloque les écritures de fichiers contenant des secrets potentiels (PreToolUse Write|Edit)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SECRET_PATTERNS = [
  /(?:ANTHROPIC|OPENAI|CLAUDE|GEMINI|GROQ)_API_KEY\s*=\s*['"]?\S{20,}/i,
  /sk-(?:ant-|proj-)?[a-zA-Z0-9_-]{32,}/,
  /ghp_[a-zA-Z0-9]{36}/,
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY/,
  /(?:password|passwd|secret|token)\s*=\s*['"][^'"]{6,}/i,
];

export function run(input) {
  const content =
    input.tool_input?.content ?? input.tool_input?.new_string ?? '';
  if (!content) return null;

  const match = SECRET_PATTERNS.find((p) => p.test(content));
  if (!match) return null;

  return {
    decision: 'block',
    reason:
      '[secret-detection] Potential secret in the content being written. Reference it via an environment variable or .env (gitignored) instead of hardcoding it.',
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
