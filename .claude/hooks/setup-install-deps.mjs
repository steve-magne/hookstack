#!/usr/bin/env node
// Installe les dépendances au démarrage si node_modules est absent (SessionStart/WorktreeCreate)
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

export function run(input, { exec, exists = existsSync } = {}) {
  const cwd = input.cwd;
  const has = (f) => exists(`${cwd}/${f}`);
  if (has('node_modules')) return null; // already installed

  let cmd = null;
  if (has('pnpm-lock.yaml')) cmd = 'pnpm install --frozen-lockfile';
  else if (has('yarn.lock')) cmd = 'yarn install --frozen-lockfile';
  else if (has('package-lock.json')) cmd = 'npm ci';
  else if (has('package.json')) cmd = 'npm install';

  if (!cmd) return null;

  const doExec = exec ?? ((c) => execSync(c, { cwd, stdio: 'inherit', timeout: 180_000 }));
  try {
    doExec(cmd);
    return { cmd, message: `[setup-install-deps] Running: ${cmd}\n` };
  } catch (e) {
    return { cmd, error: e.message, message: `[setup-install-deps] Failed: ${e.message}\n` };
  }
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result?.message) process.stderr.write(result.message);
}
