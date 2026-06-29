#!/usr/bin/env node
// @hookstack user-prompt-llm-agent-name
// Attribue un nom à l'agent pour la session courante (UserPromptSubmit)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const NAMES = ['Phoenix', 'Sage', 'Nova', 'Echo', 'Atlas', 'Cipher', 'Nexus', 'Oracle', 'Aurora', 'Vortex'];

export function run(
  input,
  {
    exists = existsSync,
    readFile = readFileSync,
    writeFile = writeFileSync,
    mkdir = mkdirSync,
    home = homedir(),
    pickName = () => NAMES[Math.floor(Math.random() * NAMES.length)],
  } = {},
) {
  const sessionId = input.session_id ?? 'unknown';
  const dir = join(home, '.claude', 'data', 'sessions');
  mkdir(dir, { recursive: true });

  const file = join(dir, `${sessionId}.json`);
  let data = { session_id: sessionId };
  if (exists(file)) {
    try { data = JSON.parse(readFile(file, 'utf8')); } catch {}
  }

  if (data.agent_name) return null;

  data.agent_name = pickName();
  writeFile(file, JSON.stringify(data, null, 2));
  return `Tu t'appelles **${data.agent_name}** pour cette session.\n`;
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(result);
}
