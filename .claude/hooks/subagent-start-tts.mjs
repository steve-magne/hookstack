#!/usr/bin/env node
// @hookstack subagent-start-tts-announce
// Annonce le démarrage d'un sous-agent par TTS (SubagentStart)
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function defaultExec(cmd) {
  execSync(cmd, { timeout: 10_000, stdio: 'ignore', shell: true });
}

export function run({ exec = defaultExec, platform = process.platform } = {}) {
  const text = 'Sous-agent démarré';
  try {
    if (platform === 'darwin') exec(`say "${text}"`);
    else exec(`espeak "${text}" 2>/dev/null || spd-say "${text}"`);
  } catch {}
  return text;
}

/* v8 ignore next 3 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
