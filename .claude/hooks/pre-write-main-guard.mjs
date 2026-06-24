#!/usr/bin/env node
// @hookstack pre-write-main-guard
// PreToolUse Write|Edit: bloque la première écriture sur main si aucun worktree n'est actif
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

function defaultExec(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 5_000 }).trim(); } catch { return ''; }
}

export function run(input, { exec = defaultExec } = {}) {
  const branch = exec('git branch --show-current') || exec('git rev-parse --abbrev-ref HEAD');
  if (!branch || !/^(main|master)$/.test(branch)) return null;

  const worktreeList = exec('git worktree list');
  const currentRoot = exec('git rev-parse --show-toplevel');
  const mainRoot = worktreeList.split('\n')[0]?.split(/\s+/)[0] ?? '';
  if (mainRoot !== currentRoot) return null;

  const filePath = input.tool_input?.file_path ?? '(fichier inconnu)';

  // Autoriser les écritures vers des fichiers hors du repo principal
  if (filePath !== '(fichier inconnu)' && !filePath.startsWith(`${mainRoot}/`)) return null;

  // Autoriser les écritures dans un worktree secondaire (ex: .claude/worktrees/session-xxx/…)
  const secondaryWorktrees = worktreeList.split('\n')
    .slice(1)
    .map(line => line.split(/\s+/)[0])
    .filter(Boolean);
  if (secondaryWorktrees.some(wt => filePath.startsWith(`${wt}/`))) return null;

  return {
    decision: 'block',
    reason: `Écriture sur \`${branch}\` bloquée : vous êtes sur la branche principale.\nCréez un worktree (\`git worktree add ../mon-fix -b feat/mon-fix\`) ou changez de branche avant de modifier \`${filePath}\`.`,
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
