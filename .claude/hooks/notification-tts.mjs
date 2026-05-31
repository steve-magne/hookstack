#!/usr/bin/env node
// Lit les notifications Claude à voix haute via le TTS système (Notification)
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const input = JSON.parse(readFileSync(0, 'utf8'));
const message = input.message ?? input.notification ?? '';
if (!message) process.exit(0);

const text = message.replace(/[`*_#]/g, '').slice(0, 200);

try {
  // macOS: say, Linux: espeak / spd-say
  if (process.platform === 'darwin') {
    execSync(`say "${text.replace(/"/g, '\\"')}"`, { timeout: 15_000, stdio: 'ignore' });
  } else {
    execSync(`espeak "${text.replace(/"/g, '\\"')}" 2>/dev/null || spd-say "${text.replace(/"/g, '\\"')}"`, {
      timeout: 15_000, stdio: 'ignore', shell: true,
    });
  }
} catch {
  // TTS absent ou erreur — non bloquant
}
