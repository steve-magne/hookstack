#!/usr/bin/env node
// Signale les marqueurs de conflit git oubliés après une écriture (PostToolUse Write|Edit)
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const OPEN_MARKER = /^<{7} /m;
const CLOSE_MARKER = /^>{7} /m;

export function run(input, { readFile = readFileSync, fileExists = existsSync } = {}) {
  const filePath = input.tool_input?.file_path ?? '';
  if (!filePath || !fileExists(filePath)) return null;

  let content;
  try {
    content = readFile(filePath, 'utf8');
  } catch {
    return null;
  }

  // Les deux bornes sont requises : évite les faux positifs (ex. soulignés markdown)
  if (!OPEN_MARKER.test(content) || !CLOSE_MARKER.test(content)) return null;

  return {
    message: `[conflict-marker] ${filePath} contains git conflict markers (<<<<<<< / >>>>>>>). Resolve the conflict and remove the markers before moving on.\n`,
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result?.message) process.stderr.write(result.message);
}
