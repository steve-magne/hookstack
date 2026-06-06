#!/usr/bin/env node
// Installe les dépendances au démarrage si node_modules est absent (SessionStart/WorktreeCreate).
// Dans un worktree distinct, update-deps.mjs gère l'install en mode détaché — ce hook
// s'abstient pour éviter la race condition (deux pnpm install concurrents → ENOTEMPTY).
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

export function run(input, { exec, exists = existsSync } = {}) {
  const cwd = input.cwd;
  const has = (f) => exists(`${cwd}/${f}`);

  // Skip in a distinct worktree: update-deps.mjs already spawned pnpm there.
  try {
    const list = execSync('git worktree list', { cwd, encoding: 'utf8', timeout: 5_000 }).trim();
    const mainDir = list.split('\n')[0]?.split(/\s+/)[0] ?? '';
    if (mainDir && mainDir !== cwd) return null;
  } catch { /* not a git repo — fall through */ }

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
