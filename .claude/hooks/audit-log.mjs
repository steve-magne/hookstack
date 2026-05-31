#!/usr/bin/env node
// Enregistre un résumé de session dans ~/.claude/audit-log.jsonl (SessionEnd)
import { readFileSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

const input = JSON.parse(readFileSync(0, 'utf8'));

const logDir = join(homedir(), '.claude');
mkdirSync(logDir, { recursive: true });
const logFile = join(logDir, 'audit-log.jsonl');

const entry = {
  timestamp: new Date().toISOString(),
  project: process.env.CLAUDE_PROJECT_DIR?.split('/').pop() ?? 'unknown',
  session_id: input.session_id ?? null,
  total_cost_usd: input.total_cost_usd ?? null,
  num_turns: input.num_turns ?? null,
};

appendFileSync(logFile, JSON.stringify(entry) + '\n');
