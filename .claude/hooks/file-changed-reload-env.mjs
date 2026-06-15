#!/usr/bin/env node
// @hookstack file-changed-reload-env
// Recharge les variables d'env d'un fichier modifié dans CLAUDE_ENV_FILE (FileChanged)
import { readFileSync, appendFileSync } from 'fs';
import { fileURLToPath } from 'url';

export function run(
  input,
  {
    readFile = readFileSync,
    append = appendFileSync,
    envFile = process.env.CLAUDE_ENV_FILE,
  } = {},
) {
  if (!envFile || input.event === 'unlink') return null;

  try {
    const content = readFile(input.file_path, 'utf8');
    const lines = content
      .split('\n')
      .filter((l) => /^[A-Z_a-z][A-Z_a-z0-9]*=/.test(l) && !l.startsWith('#'));
    for (const line of lines) {
      append(envFile, `export ${line.trim()}\n`);
    }
    return { count: lines.length, message: `[file-changed-reload-env] reloaded ${lines.length} vars from ${input.file_path}\n` };
  } catch (e) {
    return { error: e.message, message: `[file-changed-reload-env] ${e.message}\n` };
  }
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result?.message) process.stderr.write(result.message);
}
