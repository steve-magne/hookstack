#!/usr/bin/env node
// @hookstack pre-bash-guard-git-push-main
// Bloque git push --force vers main/master (PreToolUse Bash)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function run(input) {
  const command = input.tool_input?.command ?? '';
  const isForce =
    /git\s+push\b.*--force(?:-with-lease)?/.test(command) ||
    /git\s+push\b.*-f\b/.test(command);
  const isMain = /\b(main|master)\b/.test(command);

  return isForce && isMain
    ? {
        decision: 'block',
        reason: 'Force-push vers main/master interdit. Créez une PR ou demandez confirmation explicite.',
      }
    : null;
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
