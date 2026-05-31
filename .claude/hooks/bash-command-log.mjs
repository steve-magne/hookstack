#!/usr/bin/env node
// Journalise toutes les commandes Bash exécutées (PostToolUse Bash)
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
  cmd: command.slice(0, 1000),
  exit: input.tool_response?.exit_code ?? null,
  cwd: process.cwd(),
};

appendFileSync(join(logDir, 'bash-log.jsonl'), JSON.stringify(entry) + '\n');
