#!/usr/bin/env node
// SessionStart: si on est sur main/master et qu'il y a des commits distants, lance git pull
import { execSync } from 'child_process';

function exec(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 10_000 }).trim(); } catch { return ''; }
}

const branch = exec('git branch --show-current') || exec('git rev-parse --abbrev-ref HEAD');
if (!branch || !/^(main|master)$/.test(branch)) process.exit(0);

// Vérifier qu'un remote existe
const remote = exec('git remote');
if (!remote) process.exit(0);

// Fetch silencieux pour connaître l'état du remote
exec('git fetch --quiet 2>/dev/null');

const localHash  = exec('git rev-parse HEAD');
const remoteHash = exec(`git rev-parse @{u} 2>/dev/null`);

if (!remoteHash || localHash === remoteHash) process.exit(0);

// Vérifier qu'on n'est pas en avance sur le remote (merge sûr)
const behind = exec('git rev-list HEAD..@{u} --count');
const ahead  = exec('git rev-list @{u}..HEAD --count');

if (parseInt(behind, 10) === 0) process.exit(0);

if (parseInt(ahead, 10) > 0) {
  // Divergence — ne pas pull automatiquement
  process.stdout.write([
    `## ⚠️  Branche \`${branch}\` diverge du remote`,
    `- ${behind} commit(s) en retard, ${ahead} commit(s) en avance.`,
    `- Résolvez la divergence avant de continuer (\`git pull --rebase\` ou merge manuel).`,
  ].join('\n') + '\n');
  process.exit(0);
}

// Pull sans divergence
try {
  execSync('git pull --ff-only --quiet', { encoding: 'utf8', timeout: 30_000 });
} catch {
  process.stdout.write(`## ⚠️  \`git pull\` a échoué sur \`${branch}\` — synchronisez manuellement.\n`);
  process.exit(0);
}

process.stdout.write([
  `## Dépôt synchronisé`,
  `- \`${behind}\` commit(s) récupéré(s) depuis le remote sur \`${branch}\`.`,
].join('\n') + '\n');
