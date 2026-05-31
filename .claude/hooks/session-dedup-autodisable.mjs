#!/usr/bin/env node
// Auto-désactive les hooks Stop qui ont échoué ≥ N fois de suite (Stop)
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const MAX_FAILURES = 3;
const COUNTER_DIR = '/tmp/claude-hook-counters';
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const settingsPath = join(projectDir, '.claude', 'settings.json');

if (!existsSync(COUNTER_DIR)) process.exit(0);

try {
  const counters = readdirSync(COUNTER_DIR).filter(f => f.endsWith('.counter'));
  const toDisable = counters
    .map(f => {
      try {
        const count = parseInt(readFileSync(join(COUNTER_DIR, f), 'utf8').trim(), 10);
        return count >= MAX_FAILURES ? f.replace('.counter', '') : null;
      } catch { return null; }
    })
    .filter(Boolean);

  if (!toDisable.length) process.exit(0);

  process.stderr.write(`[session-dedup] Hooks à désactiver (${MAX_FAILURES}+ échecs) : ${toDisable.join(', ')}\n`);
  process.stderr.write('[session-dedup] Supprimez les fichiers /tmp/claude-hook-counters/*.counter pour réactiver.\n');
} catch {
  // Erreur de lecture — ignorer silencieusement
}
