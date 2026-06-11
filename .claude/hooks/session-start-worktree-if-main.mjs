#!/usr/bin/env node
// SessionStart: crée un worktree isolé si la session démarre sur main/master.
// Nettoie automatiquement les worktrees dont la branche a été mergée dans main.
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

function defaultRemoveWorktree(mainRoot, wtPath, branchName) {
  try { execSync(`git -C "${mainRoot}" worktree remove --force "${wtPath}"`, { timeout: 10_000 }); } catch { /* ignore */ }
  try { execSync(`git -C "${mainRoot}" branch -D "${branchName}"`, { timeout: 5_000 }); } catch { /* ignore */ }
}

export function run({
  exec = defaultExec,
  addWorktree = defaultAddWorktree,
  removeWorktree = defaultRemoveWorktree,
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

  // Nettoyer uniquement les worktrees créés par ce hook (work/session-*) dont la
  // branche est fusionnée dans origin/main. Les worktrees gérés par d'autres outils
  // (ex. branches claude/* de l'app Claude Code) ont leur propre cycle de vie.
  const mergedBranches = new Set(
    exec('git branch --merged origin/main')
      .split('\n')
      .map((b) => b.trim().replace(/^\*\s*/, ''))
      .filter(Boolean),
  );

  const secondaryLines = exec('git worktree list').split('\n').slice(1);
  for (const line of secondaryLines) {
    if (!line.trim()) continue;
    const parts = line.split(/\s+/);
    const wtPath = parts[0];
    const wtBranch = (parts[2] ?? '').replace(/^\[|\]$/g, '');
    if (wtBranch && wtBranch.startsWith('work/session-') && mergedBranches.has(wtBranch)) {
      removeWorktree(mainRoot, wtPath, wtBranch);
    }
  }

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
