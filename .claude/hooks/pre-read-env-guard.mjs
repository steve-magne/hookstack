#!/usr/bin/env node
// @hookstack pre-read-env-guard
// Bloque la lecture des fichiers .env — les secrets ne doivent pas entrer dans le contexte (PreToolUse Read)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { basename } from 'path';

const SAFE_SUFFIXES = ['.example', '.sample', '.template', '.dist'];

export function run(input) {
  if (input.tool_name !== 'Read') return null;

  const filePath = input.tool_input?.file_path ?? '';
  if (!filePath) return null;

  const name = basename(filePath);
  if (!/^\.env(\..+)?$/.test(name)) return null;
  if (SAFE_SUFFIXES.some((s) => name.endsWith(s))) return null;

  return {
    decision: 'block',
    reason: `[env-guard] \`${name}\` likely contains secrets — they must not enter the model context (risk of leaking into logs, transcripts or generated code). Read \`.env.example\` for the variable names, or check a key exists without its value: \`grep -c '^MY_VAR=' ${name}\`.`,
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
