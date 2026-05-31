#!/usr/bin/env node
// Empêche l'édition de fichiers hors du worktree courant (PreToolUse Write|Edit)
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const filePath = input.tool_input?.file_path ?? '';
if (!filePath) process.exit(0);

try {
  const worktreeRoot = execSync('git rev-parse --show-toplevel', {
    encoding: 'utf8', timeout: 5_000,
  }).trim();

  const worktreeLines = execSync('git worktree list', {
    encoding: 'utf8', timeout: 5_000,
  }).trim().split('\n');

  const mainRoot = worktreeLines[0]?.split(/\s+/)[0] ?? '';

  // Only enforce guard when we're in a non-main worktree
  if (!mainRoot || worktreeRoot === mainRoot) process.exit(0);

  const absFile = resolve(filePath);
  if (!absFile.startsWith(worktreeRoot + '/')) {
    process.stdout.write(JSON.stringify({
      decision: 'block',
      reason: `Écriture hors du worktree courant (${worktreeRoot}). Vérifiez le chemin cible.`,
    }));
  }
} catch {
  // git absent ou pas dans un repo — laisser passer
}
