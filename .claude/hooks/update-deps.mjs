#!/usr/bin/env node
// Installe les dépendances Node dans le worktree nouvellement créé (WorktreeCreate)
import { execSync } from 'child_process';
import { existsSync } from 'fs';
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
  if (!worktreeDir || !exists(`${worktreeDir}/package.json`)) return;

  const hasPnpm = exec('which pnpm');
  const out = hasPnpm
    ? exec('pnpm install --frozen-lockfile', { cwd: worktreeDir })
    : exec('npm ci', { cwd: worktreeDir });

  const tail = out.split('\n').slice(-5).join('\n');
  if (tail) process.stderr.write(tail + '\n');
}

/* v8 ignore next 3 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
