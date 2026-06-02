#!/usr/bin/env node
// Nettoie un worktree supprimé : docker compose down + node_modules (WorktreeRemove)
import { readFileSync, existsSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';

function defaultExec(cmd) {
  execSync(cmd, { timeout: 30_000 });
}

export function run(input, { exec = defaultExec, exists = existsSync, rm = rmSync } = {}) {
  const p = input.worktree_path;
  if (!p) return null;

  const actions = [];

  try {
    if (exists(join(p, 'docker-compose.yml')) || exists(join(p, 'docker-compose.yaml'))) {
      exec(`docker compose -f ${p}/docker-compose.yml down --remove-orphans 2>&1`);
      actions.push('docker-down');
    }
  } catch { /* ignore */ }

  try {
    const nm = join(p, 'node_modules');
    if (exists(nm)) {
      rm(nm, { recursive: true, force: true });
      actions.push('rm-node-modules');
    }
  } catch { /* ignore */ }

  return { actions };
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  run(input);
}
