#!/usr/bin/env node
// Journalise chaque prompt utilisateur dans .claude/data/sessions/ (UserPromptSubmit)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

export function run(
  input,
  {
    exists = existsSync,
    readFile = readFileSync,
    writeFile = writeFileSync,
    mkdir = mkdirSync,
    projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
    now = () => new Date().toISOString(),
  } = {},
) {
  const sessionId = input.session_id ?? 'unknown';
  const prompt = input.prompt ?? '';

  const dir = join(projectDir, '.claude', 'data', 'sessions');
  mkdir(dir, { recursive: true });

  const file = join(dir, `${sessionId}.json`);
  let data = { session_id: sessionId, prompts: [] };
  if (exists(file)) {
    try { data = JSON.parse(readFile(file, 'utf8')); } catch {}
  }
  data.prompts ??= [];
  data.prompts.push({ prompt, timestamp: now() });
  writeFile(file, JSON.stringify(data, null, 2));
  return data;
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  run(input);
}
