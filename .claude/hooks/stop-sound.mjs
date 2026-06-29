#!/usr/bin/env node
// @hookstack stop-sound
// Joue un son de completion quand Claude termine une tâche (Stop)
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function defaultExec(cmd) {
  execSync(cmd, { timeout: 5_000, stdio: 'ignore', shell: true });
}

export function run({ exec = defaultExec, platform = process.platform } = {}) {
  try {
    if (platform === 'darwin') {
      exec('afplay /System/Library/Sounds/Hero.aiff');
      exec('osascript -e \'display notification "Claude has finished working" with title "Claude Code"\'');
    } else if (platform === 'linux') {
      exec('paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null || aplay /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null || true');
    } else if (platform === 'win32') {
      exec('powershell -c "[console]::beep(880, 400)"');
    }
  } catch {
    // Son absent ou erreur — non bloquant
  }
  return null;
}

/* v8 ignore next 3 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
