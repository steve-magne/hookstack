#!/usr/bin/env node
// Journalise chaque prompt utilisateur dans .claude/data/sessions/ (UserPromptSubmit)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const sessionId = input.session_id ?? 'unknown';
const prompt    = input.prompt ?? '';

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const dir = join(projectDir, '.claude', 'data', 'sessions');
mkdirSync(dir, { recursive: true });

const file = join(dir, `${sessionId}.json`);
let data = { session_id: sessionId, prompts: [] };
if (existsSync(file)) {
  try { data = JSON.parse(readFileSync(file, 'utf8')); } catch {}
}
data.prompts ??= [];
data.prompts.push({ prompt, timestamp: new Date().toISOString() });
writeFileSync(file, JSON.stringify(data, null, 2));
