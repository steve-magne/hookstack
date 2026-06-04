#!/usr/bin/env node
// Joue un son système quand Claude attend l'utilisateur (Notification)
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

function defaultExec(cmd) {
  execSync(cmd, { timeout: 5_000, stdio: 'ignore', shell: true });
}

export function run(_input, { exec = defaultExec, platform = process.platform } = {}) {
  try {
    if (platform === 'darwin') {
      exec('afplay /System/Library/Sounds/Glass.aiff');
    } else if (platform === 'linux') {
      exec('paplay /usr/share/sounds/freedesktop/stereo/message.oga 2>/dev/null || aplay /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null || true');
    } else if (platform === 'win32') {
      exec('powershell -c "[console]::beep(660, 300)"');
    }
  } catch {
    // Son absent ou erreur — non bloquant
  }
  return null;
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  run(input);
}
