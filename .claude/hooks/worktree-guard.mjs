#!/usr/bin/env node
// @hookstack pre-edit-worktree-guard
// Empêche l'édition de fichiers hors du worktree courant (PreToolUse Write|Edit)
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

// Répertoires internes des agents — légitimes hors worktree
const AGENT_DIRS = ['.claude', '.codex'];

function defaultExec(cmd) {
  return execSync(cmd, { encoding: 'utf8', timeout: 5_000 }).trim();
}

export function run(input, { exec = defaultExec, home = homedir() } = {}) {
  const filePath = input.tool_input?.file_path ?? '';
  if (!filePath) return null;

  try {
    const worktreeRoot = exec('git rev-parse --show-toplevel');
    const worktreeLines = exec('git worktree list').split('\n');
    const mainRoot = worktreeLines[0]?.split(/\s+/)[0] ?? '';

    // N'applique le garde que dans un worktree non principal
    if (!mainRoot || worktreeRoot === mainRoot) return null;

    const absFile = resolve(filePath);

    // Autoriser les répertoires internes des agents (plans, mémoire, config…)
    if (AGENT_DIRS.some((d) => absFile.startsWith(resolve(home, d) + '/'))) return null;

    if (!absFile.startsWith(worktreeRoot + '/')) {
      return {
        decision: 'block',
        reason: `Écriture hors du worktree courant (${worktreeRoot}). Vérifiez le chemin cible.`,
      };
    }
  } catch {
    // git absent ou pas dans un repo — laisser passer
  }
  return null;
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
