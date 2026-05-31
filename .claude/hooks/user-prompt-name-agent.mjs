#!/usr/bin/env node
// Attribue un nom à l'agent pour la session courante (UserPromptSubmit)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const sessionId = input.session_id ?? 'unknown';

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const dir = join(projectDir, '.claude', 'data', 'sessions');
mkdirSync(dir, { recursive: true });

const file = join(dir, `${sessionId}.json`);
let data = { session_id: sessionId };
if (existsSync(file)) {
  try { data = JSON.parse(readFileSync(file, 'utf8')); } catch {}
}

if (!data.agent_name) {
  const NAMES = ['Phoenix', 'Sage', 'Nova', 'Echo', 'Atlas', 'Cipher', 'Nexus', 'Oracle', 'Aurora', 'Vortex'];
  data.agent_name = NAMES[Math.floor(Math.random() * NAMES.length)];
  writeFileSync(file, JSON.stringify(data, null, 2));
  process.stdout.write(`Tu t'appelles **${data.agent_name}** pour cette session.\n`);
}
