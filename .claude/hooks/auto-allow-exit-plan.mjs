#!/usr/bin/env node
// @hookstack permission-request-auto-allow-exit-plan
// Auto-autorise la sortie du mode plan (PermissionRequest)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

export function run(input) {
  const toolName = input.tool_name ?? input.tool ?? '';
  if (toolName !== 'exit_plan_mode') return null;
  return {
    hookSpecificOutput: {
      hookEventName: 'PermissionRequest',
      decision: { behavior: 'allow' },
    },
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
