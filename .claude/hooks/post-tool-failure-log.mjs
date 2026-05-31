#!/usr/bin/env node
// Journalise les échecs d'outils pour le débogage (PostToolUseFailure)
import { readFileSync, appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const input = JSON.parse(readFileSync(0, 'utf8'));

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const logDir = join(projectDir, '.claude', 'data');
mkdirSync(logDir, { recursive: true });

const entry = {
  ts: new Date().toISOString(),
  tool: input.tool_name ?? 'unknown',
  input: input.tool_input ?? {},
  error: input.error ?? input.tool_response ?? null,
};

appendFileSync(join(logDir, 'tool-failures.jsonl'), JSON.stringify(entry) + '\n');
process.stderr.write(`[post-tool-failure] Échec journalisé : ${entry.tool}\n`);
