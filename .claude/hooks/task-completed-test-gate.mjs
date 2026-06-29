#!/usr/bin/env node
// @hookstack task-completed-test-gate
// Bloque la complétion d'une tâche si les tests échouent (TaskCompleted)
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';

function defaultExec(cmd) {
  return execSync(cmd, { stdio: 'pipe', timeout: 120_000 });
}

// Détecte le gestionnaire de paquets depuis le lockfile (cohérent avec enforce-package-managers).
function detectManager({ exists = existsSync, projectDir = process.cwd() } = {}) {
  if (exists(join(projectDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (exists(join(projectDir, 'bun.lockb')) || exists(join(projectDir, 'bun.lock'))) return 'bun';
  if (exists(join(projectDir, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

export function run(input, {
  exec = defaultExec,
  exists = existsSync,
  projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
} = {}) {
  try {
    exec(`${detectManager({ exists, projectDir })} test --if-present 2>&1`);
    return null;
  } catch (e) {
    const out = (e.stdout ?? e.stderr ?? e.message).toString().slice(0, 800);
    return {
      exitCode: 2,
      message: `Tests must pass before completing "${input.task_subject}".\n${out}`,
    };
  }
}

/* v8 ignore next 6 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) {
    process.stderr.write(result.message);
    process.exit(result.exitCode);
  }
}
