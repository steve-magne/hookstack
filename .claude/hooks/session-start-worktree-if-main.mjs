#!/usr/bin/env node
// SessionStart: crée un worktree isolé si la session démarre sur main/master.
// Ne supprime JAMAIS de worktree : un worktree mergé peut encore héberger une session
// active/référencée — le supprimer ferait « disparaître » cette session. Le nettoyage
// des worktrees mergés reste une opération manuelle (`git worktree prune`).
import { execSync } from 'child_process';
import { existsSync } from 'fs';
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

export function run({
  exec = defaultExec,
  addWorktree = defaultAddWorktree,
  exists = existsSync,
  now = () => new Date(),
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

  const date = now().toISOString().slice(0, 10).replace(/-/g, '');
  const branchName = `work/session-${date}`;
  const worktreePath = `${currentRoot}/.claude/worktrees/session-${date}`;

  // Vérifier si un worktree pour aujourd'hui existe encore (non mergé)
  const freshList = exec('git worktree list');
  const todayLine = freshList.split('\n').slice(1).find((l) => l.includes(branchName));
  if (todayLine) {
    const wtPath = todayLine.split(/\s+/)[0];
    return [
      `## Worktree session existant`,
      `- Session démarrée sur \`main\`. Le worktree du jour est déjà actif.`,
      `- **Chemin** : \`${wtPath}\``,
      `- **Branche** : \`${branchName}\``,
      `- Effectuez vos modifications dans ce worktree, pas dans le dépôt principal.`,
    ].join('\n') + '\n';
  }

  // Créer un worktree frais depuis main
  try {
    addWorktree(worktreePath, branchName);
  } catch {
    return [
      `## ⚠️  Session démarrée sur \`main\``,
      `- Impossible de créer un worktree automatiquement (branche \`${branchName}\` peut-être déjà existante).`,
      `- Créez manuellement un worktree ou une branche avant de modifier des fichiers.`,
    ].join('\n') + '\n';
  }

  if (!exists(worktreePath)) return null;

  return [
    `## Worktree isolé créé automatiquement`,
    `- Session démarrée sur \`main\` : un worktree a été créé pour isoler les modifications.`,
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
