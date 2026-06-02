#!/usr/bin/env node
// Caviarde les secrets dans le contenu affiché (MessageDisplay)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

export function run(input) {
  const delta = input.delta ?? '';

  const redacted = delta
    .replace(/sk-(?:ant-api03-|proj-)[A-Za-z0-9_-]{20,}/g, '[REDACTED-ANTHROPIC-KEY]')
    .replace(/sk-[A-Za-z0-9]{20,}/g, '[REDACTED-API-KEY]')
    .replace(/ghp_[A-Za-z0-9]{36}/g, '[REDACTED-GH-TOKEN]')
    .replace(/ghs_[A-Za-z0-9]{36}/g, '[REDACTED-GH-TOKEN]')
    .replace(/Bearer [A-Za-z0-9_\-.]{20,}/g, 'Bearer [REDACTED]');

  if (redacted === delta) return null;
  return {
    hookSpecificOutput: {
      hookEventName: 'MessageDisplay',
      displayContent: redacted,
    },
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
