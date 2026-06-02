#!/usr/bin/env node
// Lit les notifications Claude à voix haute via le TTS système (Notification)
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

function defaultExec(cmd) {
  execSync(cmd, { timeout: 15_000, stdio: 'ignore', shell: true });
}

export function run(input, { exec = defaultExec, platform = process.platform } = {}) {
  const message = input.message ?? input.notification ?? '';
  if (!message) return null;

  const text = message.replace(/[`*_#]/g, '').slice(0, 200);
  const safe = text.replace(/"/g, '\\"');

  try {
    // macOS: say, Linux: espeak / spd-say
    if (platform === 'darwin') exec(`say "${safe}"`);
    else exec(`espeak "${safe}" 2>/dev/null || spd-say "${safe}"`);
  } catch {
    // TTS absent ou erreur — non bloquant
  }
  return text;
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  run(input);
}
