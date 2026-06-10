#!/usr/bin/env node
// Valide registry.json contre son schéma dès qu'il change (FileChanged registry.json)
// Feedback dans la session au lieu d'attendre l'échec de la CI.
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

function defaultExec(projectDir) {
  return execSync('node registry/validate-registry.mjs', {
    timeout: 30_000,
    cwd: projectDir,
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

export function run(input, { exec = defaultExec, projectDir = process.env.CLAUDE_PROJECT_DIR } = {}) {
  const filePath = input.file_path ?? '';
  if (!filePath.endsWith('registry/registry.json') || !projectDir) return null;

  try {
    exec(projectDir);
    return null; // valide → silencieux
  } catch (e) {
    const out = `${e.stdout ?? ''}${e.stderr ?? ''}`.toString().trim().slice(0, 1500);
    return {
      hookSpecificOutput: {
        hookEventName: 'FileChanged',
        additionalContext: `registry.json is INVALID against registry.schema.json:\n${out}\nFix the entries above before continuing.`,
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
