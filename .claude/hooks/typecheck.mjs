#!/usr/bin/env node
// Vérifie les types TypeScript après écriture (PostToolUse Write|Edit)
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

function makeDefaultExec(projectDir) {
  return (cmd) => execSync(cmd, { cwd: projectDir, stdio: 'pipe', timeout: 30_000 });
}

export function run(input, { exec, projectDir = process.env.CLAUDE_PROJECT_DIR } = {}) {
  const filePath = input.tool_input?.file_path ?? '';
  if (!filePath || !/\.tsx?$/.test(filePath)) return null;

  const cwd = projectDir ?? dirname(filePath);
  const doExec = exec ?? makeDefaultExec(cwd);

  try {
    doExec('npx --no-install tsc --noEmit');
    return null;
  } catch (err) {
    const output = err.stdout?.toString() ?? '';
    return output ? { message: `TypeScript: ${output.trim()}\n` } : null;
  }
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result?.message) process.stderr.write(result.message);
}
