#!/usr/bin/env node
// Annonce la fin d'un sous-agent par TTS (SubagentStop)
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

let summary = '';
try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  summary = input.summary ?? '';
} catch {}

const text = summary
  ? `Sous-agent terminé : ${summary.slice(0, 100).replace(/[`*_#]/g, '')}`
  : 'Sous-agent terminé';

try {
  if (process.platform === 'darwin') {
    execSync(`say "${text.replace(/"/g, '\\"')}"`, { timeout: 10_000, stdio: 'ignore' });
  } else {
    execSync(`espeak "${text.replace(/"/g, '\\"')}" 2>/dev/null`, {
      timeout: 10_000, stdio: 'ignore', shell: true,
    });
  }
} catch {}
