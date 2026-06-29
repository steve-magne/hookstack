#!/usr/bin/env node
// @hookstack notification-sound
// Joue un son système quand Claude attend l'utilisateur (Notification)
// Sur macOS, clic sur la notif ramène le bon contexte (terminal ou Claude app)
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Bundle IDs des terminaux courants — clic ramène le bon contexte
const TERMINAL_BUNDLE_IDS = {
  'iTerm.app':       'com.googlecode.iterm2',
  'Apple_Terminal':  'com.apple.Terminal',
  'WezTerm':         'com.github.wez.wezterm',
  'ghostty':         'com.mitchellh.ghostty',
  'vscode':          'com.microsoft.VSCode',
  'cursor':          'com.todesktop.230313mzl4w4u92',
};
const CLAUDE_APP_BUNDLE_ID = 'com.anthropic.claudefordesktop';

export function resolveActivateBundle(termProgram) {
  return TERMINAL_BUNDLE_IDS[termProgram] ?? CLAUDE_APP_BUNDLE_ID;
}

function defaultExec(cmd) {
  execSync(cmd, { timeout: 5_000, stdio: 'ignore', shell: true });
}

function defaultHasTerminalNotifier() {
  try { execSync('which terminal-notifier', { timeout: 2_000, stdio: 'pipe', shell: true }); return true; }
  catch { return false; }
}

export function run(_input, {
  exec = defaultExec,
  hasTerminalNotifier = defaultHasTerminalNotifier,
  platform = process.platform,
  termProgram = process.env.TERM_PROGRAM,
} = {}) {
  try {
    if (platform === 'darwin') {
      const bundleId = resolveActivateBundle(termProgram);

      if (hasTerminalNotifier()) {
        // Clic sur la notif → ramène automatiquement le bon contexte
        exec(
          `terminal-notifier -title "Claude Code" -message "Claude needs your input" -activate ${bundleId} -sound Glass`
        );
      } else {
        // Fallback : son + notification sans action de clic (brew install terminal-notifier pour activer)
        exec('afplay /System/Library/Sounds/Glass.aiff');
        exec('osascript -e \'display notification "Claude needs your input" with title "Claude Code"\'');
      }
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
