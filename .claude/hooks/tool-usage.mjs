#!/usr/bin/env node
// Journalise les commandes Bash avec leur durée (PostToolUse Bash)
import { readFileSync, appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

export function run(
  input,
  {
    append = appendFileSync,
    mkdir = mkdirSync,
    projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
    now = () => new Date().toISOString(),
  } = {},
) {
  const command = input.tool_input?.command ?? '';
  if (!command) return null;

  const logDir = join(projectDir, '.claude', 'data');
  mkdir(logDir, { recursive: true });

  const entry = {
    ts: now(),
    cmd: command.slice(0, 500),
    exit: input.tool_response?.exit_code ?? null,
  };

  append(join(logDir, 'bash-history.jsonl'), JSON.stringify(entry) + '\n');
  return entry;
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  run(input);
}
