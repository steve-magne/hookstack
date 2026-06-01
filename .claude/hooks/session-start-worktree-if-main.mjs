#!/usr/bin/env node
// SessionStart: crée un worktree isolé si la session démarre sur main/master
import { execSync } from 'child_process';
import { existsSync } from 'fs';

function exec(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 10_000 }).trim(); } catch { return ''; }
}

const branch = exec('git branch --show-current') || exec('git rev-parse --abbrev-ref HEAD');
if (!branch || !/^(main|master)$/.test(branch)) process.exit(0);

const currentRoot = exec('git rev-parse --show-toplevel');
if (!currentRoot) process.exit(0);

// Ne pas agir si on est déjà dans un worktree secondaire
const worktreeList = exec('git worktree list');
const mainRoot = worktreeList.split('\n')[0]?.split(/\s+/)[0] ?? '';
if (mainRoot !== currentRoot) process.exit(0);

const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const projectName = currentRoot.split('/').pop() ?? 'project';
const branchName = `work/session-${date}`;
const worktreePath = `${currentRoot}/../${projectName}-work-${date}`;

// Réutiliser un worktree de session déjà créé aujourd'hui
const todayLine = worktreeList.split('\n').slice(1).find(l => l.includes(branchName));
if (todayLine) {
  const wtPath = todayLine.split(/\s+/)[0];
  process.stdout.write([
    `## Worktree session existant`,
    `- Session démarrée sur \`main\`. Le worktree du jour est déjà actif.`,
    `- **Chemin** : \`${wtPath}\``,
    `- **Branche** : \`${branchName}\``,
    `- Effectuez vos modifications dans ce worktree, pas dans le dépôt principal.`,
  ].join('\n') + '\n');
  process.exit(0);
}

// Créer le worktree
try {
  execSync(`git worktree add "${worktreePath}" -b "${branchName}"`, {
    encoding: 'utf8',
    timeout: 15_000,
    stdio: ['ignore', 'ignore', 'ignore'],
  });
} catch {
  process.stdout.write([
    `## ⚠️  Session démarrée sur \`main\``,
    `- Impossible de créer un worktree automatiquement (branche \`${branchName}\` peut-être déjà existante).`,
    `- Créez manuellement un worktree ou une branche avant de modifier des fichiers.`,
  ].join('\n') + '\n');
  process.exit(0);
}

if (!existsSync(worktreePath)) process.exit(0);

process.stdout.write([
  `## Worktree isolé créé automatiquement`,
  `- Session démarrée sur \`main\` : un worktree a été créé pour isoler les modifications.`,
  `- **Chemin** : \`${worktreePath}\``,
  `- **Branche** : \`${branchName}\``,
  `- Travaillez dans ce worktree — évitez de modifier des fichiers dans le dépôt principal.`,
].join('\n') + '\n');
