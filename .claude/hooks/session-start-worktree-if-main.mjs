#!/usr/bin/env node
// SessionStart: crée un worktree isolé unique si la session démarre sur main/master.
// Chaque session obtient un worktree frais avec un suffixe aléatoire — jamais de
// réutilisation d'un worktree existant (un worktree désynchronisé provoquerait des conflits).
// Le nettoyage reste manuel (`git worktree prune`).
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';

function defaultExec(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 10_000 }).trim(); } catch { return ''; }
}

function defaultAddWorktree(path, branchName) {
  execSync(`git worktree add "${path}" -b "${branchName}"`, {
    encoding: 'utf8',
    timeout: 15_000,
    stdio: ['ignore', 'ignore', 'ignore'],
  });
}

function defaultRandom(len = 6) {
  return randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
}

export function run({
  exec = defaultExec,
  addWorktree = defaultAddWorktree,
  exists = existsSync,
  now = () => new Date(),
  random = defaultRandom,
} = {}) {
  const branch = exec('git branch --show-current') || exec('git rev-parse --abbrev-ref HEAD');
  if (!branch || !/^(main|master)$/.test(branch)) return null;

  const currentRoot = exec('git rev-parse --show-toplevel');
  if (!currentRoot) return null;

  // Ne pas agir si on est déjà dans un worktree secondaire
  const worktreeList = exec('git worktree list');
  const mainRoot = worktreeList.split('\n')[0]?.split(/\s+/)[0] ?? '';
  if (mainRoot !== currentRoot) return null;

  // Synchroniser main avec le remote avant de créer le worktree
  exec('git fetch --quiet origin main');
  exec('git merge --ff-only origin/main');

  // Nom unique par session : date + suffixe hex aléatoire (même format que Claude Code App)
  const date = now().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = random(6);
  const branchName = `claude/session-${date}-${suffix}`;
  const worktreePath = `${currentRoot}/.claude/worktrees/session-${date}-${suffix}`;

  try {
    addWorktree(worktreePath, branchName);
  } catch {
    return [
      `## ⚠️  Session démarrée sur \`main\``,
      `- Impossible de créer un worktree automatiquement.`,
      `- Créez manuellement un worktree ou une branche avant de modifier des fichiers.`,
    ].join('\n') + '\n';
  }

  if (!exists(worktreePath)) return null;

  return [
    `## Worktree isolé créé automatiquement`,
    `- Session démarrée sur \`main\` : un worktree unique a été créé pour cette session.`,
    `- **Chemin** : \`${worktreePath}\``,
    `- **Branche** : \`${branchName}\``,
    `- Travaillez dans ce worktree — évitez de modifier des fichiers dans le dépôt principal.`,
  ].join('\n') + '\n';
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = run();
  if (result) process.stdout.write(result);
}
