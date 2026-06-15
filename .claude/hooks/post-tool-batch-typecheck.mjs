#!/usr/bin/env node
// @hookstack post-tool-batch-typecheck
// Vérifie les types TypeScript après un lot d'écritures (PostToolBatch)
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

function defaultExec(cmd) {
  return execSync(cmd, { stdio: 'pipe', timeout: 30_000 });
}

export function run(input, { exec = defaultExec } = {}) {
  const calls = input.tool_calls ?? [];
  const hasTs = calls.some(
    (c) => ['Write', 'Edit'].includes(c.tool_name) && /\.tsx?$/.test(c.tool_input?.file_path ?? ''),
  );
  if (!hasTs) return null;

  try {
    exec('npx --no-install tsc --noEmit --pretty false 2>&1');
    return null;
  } catch (e) {
    const out = (e.stdout ?? e.stderr ?? '').toString().slice(0, 2000);
    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolBatch',
        additionalContext: `TypeScript errors after batch edit:\n${out}`,
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
