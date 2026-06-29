#!/usr/bin/env node
// @hookstack permission-request-auto-allow-readonly
// Auto-autorise les outils lecture seule et les commandes Bash sûres (PermissionRequest)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SAFE_BASH = [
  /^ls/, /^pwd/, /^echo/, /^cat(?!.*>)/, /^head/, /^tail/, /^wc/,
  /^which/, /^whereis/, /^file/, /^stat/,
  /^git\s+(status|log|diff|show|branch|tag)/,
  /^npm\s+(list|ls|outdated|view)/,
];

const READ_ONLY_TOOLS = ['Read', 'Glob', 'Grep'];

export function run(input) {
  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};

  let allow = READ_ONLY_TOOLS.includes(toolName);
  if (!allow && toolName === 'Bash') {
    const cmd = (toolInput.command || '').trim();
    allow = SAFE_BASH.some((p) => p.test(cmd));
  }

  return allow
    ? {
        hookSpecificOutput: {
          hookEventName: 'PermissionRequest',
          decision: { behavior: 'allow' },
        },
      }
    : null;
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
