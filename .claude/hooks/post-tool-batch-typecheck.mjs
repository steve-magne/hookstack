#!/usr/bin/env node
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const input = JSON.parse(readFileSync(0, 'utf8'));
const calls = input.tool_calls ?? [];

const hasTs = calls.some(c =>
  ['Write', 'Edit'].includes(c.tool_name) &&
  /\.tsx?$/.test(c.tool_input?.file_path ?? '')
);
if (!hasTs) process.exit(0);

try {
  execSync('npx --no-install tsc --noEmit --pretty false 2>&1', { stdio: 'pipe', timeout: 30000 });
} catch (e) {
  const out = (e.stdout ?? e.stderr ?? '').toString().slice(0, 2000);
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolBatch',
      additionalContext: `TypeScript errors after batch edit:\n${out}`,
    },
  }));
}
