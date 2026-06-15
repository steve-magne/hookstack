#!/usr/bin/env node
// @hookstack stop-tts-completion
// Annonce la fin de session Claude par TTS (Stop)
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

function defaultExec(cmd) {
  execSync(cmd, { timeout: 10_000, stdio: 'ignore', shell: true });
}

export function run({
  exec = defaultExec,
  platform = process.platform,
  projectDir = process.env.CLAUDE_PROJECT_DIR,
} = {}) {
  const project = projectDir?.split('/').pop() ?? 'Claude';
  const text = `Tâche terminée sur ${project}`;

  try {
    if (platform === 'darwin') exec(`say "${text}"`);
    else exec(`espeak "${text}" 2>/dev/null || spd-say "${text}"`);
  } catch {
    // TTS absent — non bloquant
  }
  return text;
}

/* v8 ignore next 3 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
