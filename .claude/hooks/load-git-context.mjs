#!/usr/bin/env node
// Injecte le contexte git (branche, statut) dans chaque prompt (UserPromptSubmit)
import { execSync } from 'child_process';

function exec(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 5_000 }).trim(); } catch { return ''; }
}

const branch  = exec('git branch --show-current') || exec('git rev-parse --abbrev-ref HEAD');
const commit  = exec('git log -1 --pretty="%h %s"');
const status  = exec('git status --short');

if (!branch) process.exit(0);

const lines = [`## Contexte Git`, `- Branche : \`${branch}\``];
if (commit)  lines.push(`- Dernier commit : ${commit}`);
if (status)  lines.push(`- Fichiers modifiés :\n${status.split('\n').map(l => `  ${l}`).join('\n')}`);
else         lines.push('- Répertoire de travail propre');

process.stdout.write(lines.join('\n') + '\n');
