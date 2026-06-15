#!/usr/bin/env node
// @hookstack cwd-changed-reload-direnv
// Recharge direnv quand le répertoire de travail change (CwdChanged)
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

function defaultExec(cmd, cwd) {
  execSync(cmd, { cwd, stdio: 'ignore', timeout: 5_000 });
}

export function run(input, { exec = defaultExec, exists = existsSync } = {}) {
  const newCwd = input.cwd ?? input.new_cwd ?? process.cwd();
  const envrc = `${newCwd}/.envrc`;
  if (!exists(envrc)) return null;

  try {
    exec('direnv allow .', newCwd);
    return { message: `[reload-direnv] direnv rechargé dans ${newCwd}\n` };
  } catch {
    // direnv absent — non bloquant
    return null;
  }
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result?.message) process.stderr.write(result.message);
}
