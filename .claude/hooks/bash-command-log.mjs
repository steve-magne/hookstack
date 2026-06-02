#!/usr/bin/env node
// Journalise toutes les commandes Bash exécutées (PostToolUse Bash)
import { readFileSync, appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

export function run(
  input,
  {
    append = appendFileSync,
    mkdir = mkdirSync,
    projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
    cwd = process.cwd(),
    now = () => new Date().toISOString(),
  } = {},
) {
  const command = input.tool_input?.command ?? '';
  if (!command) return null;

  const logDir = join(projectDir, '.claude', 'data');
  mkdir(logDir, { recursive: true });

  const entry = {
    ts: now(),
    cmd: command.slice(0, 1000),
    exit: input.tool_response?.exit_code ?? null,
    cwd,
  };

  append(join(logDir, 'bash-log.jsonl'), JSON.stringify(entry) + '\n');
  return entry;
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  run(input);
}
