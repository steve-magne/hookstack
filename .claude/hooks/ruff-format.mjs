#!/usr/bin/env node
// Formate le fichier Python avec ruff après écriture (PostToolUse Write|Edit)
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

function defaultExec(cmd) {
  execSync(cmd, { stdio: 'ignore', timeout: 15_000 });
}

export function run(input, { exec = defaultExec } = {}) {
  const filePath = input.tool_input?.file_path ?? input.tool_input?.path ?? '';
  if (!filePath.endsWith('.py')) return null;

  try {
    exec(`uv run ruff format "${filePath}"`);
    return null;
  } catch {
    // uv/ruff absent — non bloquant
    return null;
  }
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  run(input);
}
