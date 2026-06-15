#!/usr/bin/env node
// @hookstack session-end-audit-log
// Enregistre un résumé de session dans ~/.claude/audit-log.jsonl (SessionEnd)
import { readFileSync, appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

export function run(
  input,
  {
    append = appendFileSync,
    mkdir = mkdirSync,
    home = homedir(),
    projectDir = process.env.CLAUDE_PROJECT_DIR,
    now = () => new Date().toISOString(),
  } = {},
) {
  const logDir = join(home, '.claude');
  mkdir(logDir, { recursive: true });

  const entry = {
    timestamp: now(),
    project: projectDir?.split('/').pop() ?? 'unknown',
    session_id: input.session_id ?? null,
    total_cost_usd: input.total_cost_usd ?? null,
    num_turns: input.num_turns ?? null,
  };

  append(join(logDir, 'audit-log.jsonl'), JSON.stringify(entry) + '\n');
  return entry;
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  run(input);
}
