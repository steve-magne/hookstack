#!/usr/bin/env node
// @hookstack config-change-audit-log
// Journalise les changements de configuration Claude Code (ConfigChange)
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

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
    ts: now(),
    project: projectDir?.split('/').pop() ?? 'unknown',
    change: input.change ?? input,
  };

  append(join(logDir, 'config-changes.jsonl'), `${JSON.stringify(entry)}\n`);
  return { entry, message: '[config-audit] Changement journalise.\n' };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  process.stderr.write(result.message);
}
