#!/usr/bin/env node
// Installe les dépendances Node dans le worktree nouvellement créé (WorktreeCreate)
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';

/* v8 ignore next 3 */
function defaultExec(cmd, opts = {}) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 300_000, ...opts }).trim(); } catch { return ''; }
}

export function run({
  exec = defaultExec,
  exists = existsSync,
} = {}) {
  const worktreeDir = exec('git rev-parse --show-toplevel');
  if (worktreeDir && exists(`${worktreeDir}/package.json`)) {
    const hasPnpm = exec('which pnpm');
    if (hasPnpm) {
      exec('pnpm install --frozen-lockfile --ignore-scripts', { cwd: worktreeDir });
    } else {
      exec('npm ci --ignore-scripts', { cwd: worktreeDir });
    }
  }

}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  readFileSync(0, 'utf8'); // consume stdin (WorktreeCreate payload)
  run();
}
