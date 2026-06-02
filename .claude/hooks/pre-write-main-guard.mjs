#!/usr/bin/env node
// PreToolUse Write|Edit: bloque la première écriture sur main si aucun worktree n'est actif
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

function exec(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 5_000 }).trim(); } catch { return ''; }
}

const branch = exec('git branch --show-current') || exec('git rev-parse --abbrev-ref HEAD');
if (!branch || !/^(main|master)$/.test(branch)) process.exit(0);

const worktreeList = exec('git worktree list');
const currentRoot  = exec('git rev-parse --show-toplevel');
const mainRoot     = worktreeList.split('\n')[0]?.split(/\s+/)[0] ?? '';
if (mainRoot !== currentRoot) process.exit(0);

const input    = JSON.parse(readFileSync(0, 'utf8'));
const filePath = input.tool_input?.file_path ?? '(fichier inconnu)';

// Autoriser les écritures vers des fichiers dans un worktree (hors du repo principal)
if (filePath !== '(fichier inconnu)' && !filePath.startsWith(mainRoot + '/')) process.exit(0);

process.stdout.write(JSON.stringify({
  decision: 'block',
  reason: `Écriture sur \`${branch}\` bloquée : vous êtes sur la branche principale.\nCréez un worktree (\`git worktree add ../mon-fix -b feat/mon-fix\`) ou changez de branche avant de modifier \`${filePath}\`.`,
}));
