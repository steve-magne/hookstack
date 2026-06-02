#!/usr/bin/env node
// Copie les fichiers .env du dépôt principal vers le worktree (WorktreeCreate)
import { execSync } from 'child_process';
import { existsSync, copyFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

function defaultExec(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 10_000 }).trim(); } catch { return ''; }
}

export function run({
  exec = defaultExec,
  exists = existsSync,
  copy = copyFileSync,
} = {}) {
  const worktreeList = exec('git worktree list');
  const mainDir = worktreeList.split('\n')[0]?.split(/\s+/)[0] ?? '';
  const worktreeDir = exec('git rev-parse --show-toplevel');

  if (mainDir && worktreeDir && mainDir !== worktreeDir) {
    for (const envFile of ['.env', '.env.local', '.env.development.local']) {
      const src = join(mainDir, envFile);
      const dst = join(worktreeDir, envFile);
      if (exists(src) && !exists(dst)) {
        copy(src, dst);
        process.stderr.write(`Copié : ${envFile} → ${worktreeDir}\n`);
      }
    }
  }
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  readFileSync(0, 'utf8'); // consume stdin (WorktreeCreate payload)
  run();
  process.stdout.write('{}'); // WorktreeCreate exige une sortie JSON, sinon « hook failed: no output »
}
