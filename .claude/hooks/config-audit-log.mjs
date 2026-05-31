#!/usr/bin/env node
// Journalise les changements de configuration Claude Code (ConfigChange)
import { readFileSync, appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const input = JSON.parse(readFileSync(0, 'utf8'));

const logDir = join(homedir(), '.claude');
mkdirSync(logDir, { recursive: true });

const entry = {
  ts: new Date().toISOString(),
  project: process.env.CLAUDE_PROJECT_DIR?.split('/').pop() ?? 'unknown',
  change: input.change ?? input,
};

appendFileSync(join(logDir, 'config-changes.jsonl'), JSON.stringify(entry) + '\n');
process.stderr.write(`[config-audit] Changement journalise.\n`);
