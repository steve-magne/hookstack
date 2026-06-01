#!/usr/bin/env node
import { readFileSync, appendFileSync, existsSync } from 'fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const envFile = process.env.CLAUDE_ENV_FILE;
if (!envFile || input.event === 'unlink') process.exit(0);

try {
  const content = readFileSync(input.file_path, 'utf8');
  const lines = content.split('\n').filter(l => /^[A-Z_a-z][A-Z_a-z0-9]*=/.test(l) && !l.startsWith('#'));
  for (const line of lines) {
    appendFileSync(envFile, `export ${line.trim()}\n`);
  }
  process.stderr.write(`[file-changed-reload-env] reloaded ${lines.length} vars from ${input.file_path}\n`);
} catch (e) {
  process.stderr.write(`[file-changed-reload-env] ${e.message}\n`);
}
