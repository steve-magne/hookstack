#!/usr/bin/env node
// Auto-autorise la sortie du mode plan (PermissionRequest)
import { readFileSync } from 'fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const toolName = input.tool_name ?? input.tool ?? '';

if (toolName === 'exit_plan_mode') {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PermissionRequest',
      decision: { behavior: 'allow' },
    },
  }));
}
