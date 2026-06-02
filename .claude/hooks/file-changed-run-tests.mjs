#!/usr/bin/env node
// Relance les tests quand un fichier change (FileChanged)
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

function defaultExec(cmd) {
  return execSync(cmd, { timeout: 90_000 });
}

export function run(input, { exec = defaultExec } = {}) {
  if (input.event === 'unlink') return null;

  try {
    const out = exec('npm test --if-present 2>&1').toString();
    return {
      hookSpecificOutput: {
        hookEventName: 'FileChanged',
        additionalContext: `Tests passed after ${input.file_path} changed.\n${out.slice(-500)}`,
      },
    };
  } catch (e) {
    const out = (e.stdout ?? e.stderr ?? e.message).toString().slice(0, 1000);
    return {
      hookSpecificOutput: {
        hookEventName: 'FileChanged',
        additionalContext: `Tests FAILED after ${input.file_path} changed:\n${out}`,
      },
    };
  }
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
