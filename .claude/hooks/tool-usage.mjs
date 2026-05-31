#!/usr/bin/env node
// Journalise les commandes Bash avec leur durée (PostToolUse Bash)
import { readFileSync, appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const command = input.tool_input?.command ?? '';
if (!command) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const logDir = join(projectDir, '.claude', 'data');
mkdirSync(logDir, { recursive: true });

const entry = {
  ts: new Date().toISOString(),
  cmd: command.slice(0, 500),
  exit: input.tool_response?.exit_code ?? null,
};

appendFileSync(join(logDir, 'bash-history.jsonl'), JSON.stringify(entry) + '\n');
