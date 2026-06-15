#!/usr/bin/env node
// @hookstack post-write-eslint
// Vérifie le fichier avec ESLint après écriture (PostToolUse Write|Edit)
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

function defaultExec(cmd) {
  return execSync(cmd, { stdio: 'pipe', timeout: 15_000 });
}

export function run(input, { exec = defaultExec } = {}) {
  const filePath = input.tool_input?.file_path ?? '';
  if (!filePath || !/\.[cm]?[jt]sx?$/.test(filePath)) return null;

  try {
    exec(`npx --no-install eslint --max-warnings=0 "${filePath}"`);
    return null;
  } catch (err) {
    const output = err.stdout?.toString() ?? '';
    return output ? { message: `ESLint: ${output.trim()}\n` } : null;
  }
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result?.message) process.stderr.write(result.message);
}
