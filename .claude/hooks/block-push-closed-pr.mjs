import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const defaultExec = (cmd) => execSync(cmd, { encoding: 'utf8', timeout: 5000 });

export function run(input, { exec = defaultExec } = {}) {
  const command = input?.tool_input?.command ?? '';
  if (!/\bgit\s+push\b/.test(command)) return null;

  let branch;
  try {
    branch = exec('git rev-parse --abbrev-ref HEAD').trim();
  } catch {
    return null;
  }

  if (!branch || branch === 'HEAD' || branch === 'main' || branch === 'master') return null;

  let state;
  try {
    state = exec(`gh pr view "${branch}" --json state --jq '.state'`).trim();
  } catch {
    return null;
  }

  if (state === 'CLOSED' || state === 'MERGED') {
    const label = state === 'MERGED' ? 'mergée' : 'fermée';
    return {
      decision: 'block',
      reason: `La PR de la branche '${branch}' est ${label}. Créez une nouvelle branche depuis main : git checkout -b fix/... origin/main`,
    };
  }

  return null;
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
