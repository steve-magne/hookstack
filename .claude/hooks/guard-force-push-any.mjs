#!/usr/bin/env node
// @hookstack pre-bash-guard-force-push-any
// Bloque git push --force / -f sur toute branche, recommande --force-with-lease (PreToolUse Bash)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

function stripQuotedArgs(cmd) {
  return cmd.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^'\\]|\\.)*'/g, "''");
}

export function run(input) {
  if (input.tool_name && input.tool_name !== 'Bash') return null;
  const command = stripQuotedArgs(input.tool_input?.command ?? '');
  if (!/\bgit\s+push\b/.test(command)) return null;

  // --force-with-lease est le force-push SÛR : on le laisse passer.
  const hasLease = /--force-with-lease\b/.test(command);
  // --force « nu » ou un flag court combiné contenant f (ex. -fu, -f).
  const hasBareForce = /--force\b(?!-with-lease)/.test(command) || /(?:^|\s)-[a-eg-zA-Z]*f[a-zA-Z]*\b/.test(command);

  if (hasBareForce && !hasLease) {
    return {
      decision: 'block',
      reason:
        'git push --force écrase aveuglément le travail distant. ' +
        'Utilisez --force-with-lease : il refuse de clobberer les commits poussés par quelqu\'un d\'autre. ' +
        'Si le force-push nu est réellement voulu, lancez-le manuellement.',
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
