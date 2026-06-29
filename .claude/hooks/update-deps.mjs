#!/usr/bin/env node
// @hookstack worktree-create-update-deps
// SessionStart : si la session démarre dans un worktree fraîchement créé (node_modules
// absent), lance l'install des dépendances en process DÉTACHÉ pour ne pas bloquer le
// démarrage de session, puis rend la main immédiatement.
// NB : ce hook NE s'enregistre PAS sur WorktreeCreate — ce dernier remplace la création
// du worktree, exige un chemin absolu sur stdout et ne supporte pas l'exécution async.
import { execSync, spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/* v8 ignore next 3 */
function defaultExec(cmd, opts = {}) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 10_000, ...opts }).trim(); } catch { return ''; }
}

/* v8 ignore next 8 */
function defaultDetach(cmd, args, cwd) {
  const child = spawn(cmd, args, {
    cwd,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

export function run({
  exec = defaultExec,
  exists = existsSync,
  detach = defaultDetach,
} = {}) {
  const worktreeDir = exec('git rev-parse --show-toplevel');
  if (!worktreeDir) return;

  // Uniquement dans un worktree distinct du dépôt principal.
  const mainDir = exec('git worktree list').split('\n')[0]?.split(/\s+/)[0] ?? '';
  if (!mainDir || mainDir === worktreeDir) return;

  // Rien à faire sans package.json, ou si les deps sont déjà installées.
  if (!exists(`${worktreeDir}/package.json`)) return;
  if (exists(`${worktreeDir}/node_modules`)) return;

  const hasPnpm = exec('which pnpm');
  if (hasPnpm) {
    detach('pnpm', ['install', '--frozen-lockfile', '--ignore-scripts'], worktreeDir);
  } else {
    detach('npm', ['ci', '--ignore-scripts'], worktreeDir);
  }
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  readFileSync(0, 'utf8');
  run();
  // SessionStart : pas de stdout obligatoire (install lancé en détaché).
}
