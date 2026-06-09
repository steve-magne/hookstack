#!/usr/bin/env node
// Ouvre un nouvel onglet Ghostty sur le chemin du worktree créé (WorktreeCreate)
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, basename } from 'path';

function defaultExec(cmd) {
  execSync(cmd, { timeout: 10_000, stdio: 'ignore', shell: true });
}

export function run(input, { exec = defaultExec, platform = process.platform } = {}) {
  const worktreePath = input?.worktree_path;
  if (!worktreePath || platform !== 'darwin') return null;

  // WorktreeRemove n'a pas de champ branch — on n'ouvre rien dans ce cas
  const isCreate = Boolean(input?.branch);
  if (!isCreate) return null;

  try {
    exec(`ghostty --working-directory="${worktreePath}" &`);
  } catch {
    // Ghostty absent ou erreur — non bloquant
  }
  return null;
}

/* v8 ignore next 9 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const worktreePath = input?.worktree_path ?? `${dirname(projectDir)}/${basename(projectDir)}-work-${date}`;
  run({ ...input, worktree_path: worktreePath });
  process.stdout.write(worktreePath);
}
