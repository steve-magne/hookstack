#!/usr/bin/env node
// Injecte les règles d'agent dans chaque prompt (UserPromptSubmit)
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

// Priorité : .claude/agent-rules.md > CONVENTIONS.md > absent (no-op)
const candidates = [
  join(projectDir, '.claude', 'agent-rules.md'),
  join(projectDir, 'CONVENTIONS.md'),
];

const target = candidates.find(existsSync);
if (!target) process.exit(0);

const content = readFileSync(target, 'utf8').trim();
if (!content) process.exit(0);

process.stdout.write(`### Conventions du projet (injectées automatiquement)\n\n${content}\n`);
