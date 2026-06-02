#!/usr/bin/env node
// SessionStart : si la session démarre dans un worktree (distinct du dépôt principal),
// copie les fichiers .env du dépôt principal vers le worktree.
// NB : ce hook NE s'enregistre PAS sur WorktreeCreate — ce dernier remplace la création
// du worktree et exige un chemin absolu sur stdout. Le post-setup va sur SessionStart.
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
  readFileSync(0, 'utf8');
  run();
  // SessionStart : pas de stdout obligatoire (stdout vide = aucun contexte ajouté).
}
