#!/usr/bin/env node
// Injecte l'état GitHub (PRs ouvertes, checks de la branche) au démarrage de session (SessionStart)
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

function defaultExec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 10_000, stdio: 'pipe' }).trim();
  } catch {
    return '';
  }
}

export function run(_input, { exec = defaultExec } = {}) {
  // Silencieux si gh absent, non authentifié ou dépôt sans remote GitHub
  const prs = exec('gh pr list --state open --limit 5');
  const checks = exec('gh pr checks 2>/dev/null');

  if (!prs && !checks) return null;

  const lines = ['## GitHub Context'];
  if (prs) lines.push('### Open PRs', '```', prs, '```');
  if (checks) lines.push('### Checks on current branch PR', '```', checks, '```');

  return {
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: lines.join('\n'),
    },
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
