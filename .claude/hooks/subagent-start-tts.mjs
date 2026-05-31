#!/usr/bin/env node
// Annonce le démarrage d'un sous-agent par TTS (SubagentStart)
import { execSync } from 'child_process';

const text = 'Sous-agent démarré';

try {
  if (process.platform === 'darwin') {
    execSync(`say "${text}"`, { timeout: 10_000, stdio: 'ignore' });
  } else {
    execSync(`espeak "${text}" 2>/dev/null || spd-say "${text}"`, {
      timeout: 10_000, stdio: 'ignore', shell: true,
    });
  }
} catch {}
