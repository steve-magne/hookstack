#!/usr/bin/env node
// @hookstack post-tool-failure-log
// Journalise les échecs d'outils pour le débogage (PostToolUseFailure)
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function run(
  input,
  {
    append = appendFileSync,
    mkdir = mkdirSync,
    projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
    now = () => new Date().toISOString(),
  } = {},
) {
  const logDir = join(projectDir, '.claude', 'data');
  mkdir(logDir, { recursive: true });

  const entry = {
    ts: now(),
    tool: input.tool_name ?? 'unknown',
    input: input.tool_input ?? {},
    error: input.error ?? input.tool_response ?? null,
  };

  append(join(logDir, 'tool-failures.jsonl'), `${JSON.stringify(entry)}\n`);
  return { entry, message: `[post-tool-failure] Échec journalisé : ${entry.tool}\n` };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  process.stderr.write(result.message);
}
