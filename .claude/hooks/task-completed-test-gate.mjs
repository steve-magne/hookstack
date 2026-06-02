#!/usr/bin/env node
// Bloque la complétion d'une tâche si les tests échouent (TaskCompleted)
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

function defaultExec(cmd) {
  return execSync(cmd, { stdio: 'pipe', timeout: 120_000 });
}

export function run(input, { exec = defaultExec } = {}) {
  try {
    exec('npm test --if-present 2>&1');
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
