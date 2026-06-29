#!/usr/bin/env node
// @hookstack post-write-biome
// Vérifie le fichier avec Biome après écriture (PostToolUse Write|Edit)
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function defaultExec(cmd) {
  return execSync(cmd, { stdio: 'pipe', timeout: 15_000 });
}

export function run(input, { exec = defaultExec } = {}) {
  const filePath = input.tool_input?.file_path ?? '';
  if (!filePath || !/\.[cm]?[jt]sx?$/.test(filePath)) return null;

  try {
    exec(`npx --no-install biome lint --error-on-warnings "${filePath}"`);
    return null;
  } catch (err) {
    const output = err.stdout?.toString() ?? '';
    return output ? { message: `Biome: ${output.trim()}\n` } : null;
  }
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result?.message) process.stderr.write(result.message);
}
