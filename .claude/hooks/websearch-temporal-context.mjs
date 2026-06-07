#!/usr/bin/env node
// Injecte l'année courante dans les requêtes WebSearch sans contexte temporel (PreToolUse)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const TEMPORAL_WORDS = ['latest', 'recent', 'current', 'new', 'now', 'today', 'this year', 'last year'];
const YEAR_PATTERN = /\b20\d{2}\b/;

export function run(input, { currentYear = new Date().getFullYear() } = {}) {
  const query = input.tool_input?.query ?? '';
  if (!query) return null;

  const hasYear = YEAR_PATTERN.test(query);
  const hasTemporal = TEMPORAL_WORDS.some((w) => query.toLowerCase().includes(w));

  if (hasYear || hasTemporal) return null;

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      modifiedToolInput: { query: `${query} ${currentYear}` },
    },
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
