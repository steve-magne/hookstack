#!/usr/bin/env node
// Annonce la fin de session Claude par TTS (Stop)
import { execSync } from 'child_process';

const project = process.env.CLAUDE_PROJECT_DIR?.split('/').pop() ?? 'Claude';
const text = `Tâche terminée sur ${project}`;

try {
  if (process.platform === 'darwin') {
    execSync(`say "${text}"`, { timeout: 10_000, stdio: 'ignore' });
  } else {
    execSync(`espeak "${text}" 2>/dev/null || spd-say "${text}"`, {
      timeout: 10_000, stdio: 'ignore', shell: true,
    });
  }
} catch {
  // TTS absent — non bloquant
}
