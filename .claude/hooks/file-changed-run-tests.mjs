#!/usr/bin/env node
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const input = JSON.parse(readFileSync(0, 'utf8'));
if (input.event === 'unlink') process.exit(0);

try {
  const out = execSync('npm test --if-present 2>&1', { timeout: 90000 }).toString();
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'FileChanged',
      additionalContext: `Tests passed after ${input.file_path} changed.\n${out.slice(-500)}`,
    },
  }));
} catch (e) {
  const out = (e.stdout ?? e.stderr ?? e.message).toString().slice(0, 1000);
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'FileChanged',
      additionalContext: `Tests FAILED after ${input.file_path} changed:\n${out}`,
    },
  }));
}
