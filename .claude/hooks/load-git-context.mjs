#!/usr/bin/env node
// @hookstack session-start-load-git-context
// Injecte le contexte git (branche, statut) dans chaque prompt (UserPromptSubmit)
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

function defaultExec(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 5_000 }).trim(); } catch { return ''; }
}

export function run({ exec = defaultExec } = {}) {
  const branch = exec('git branch --show-current') || exec('git rev-parse --abbrev-ref HEAD');
  const commit = exec('git log -1 --pretty="%h %s"');
  const status = exec('git status --short');

  if (!branch) return null;

  const lines = ['## Contexte Git', `- Branche : \`${branch}\``];
  if (commit) lines.push(`- Dernier commit : ${commit}`);
  if (status) lines.push(`- Fichiers modifiés :\n${status.split('\n').map((l) => `  ${l}`).join('\n')}`);
  else lines.push('- Répertoire de travail propre');

  return lines.join('\n') + '\n';
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = run();
  if (result) process.stdout.write(result);
}
