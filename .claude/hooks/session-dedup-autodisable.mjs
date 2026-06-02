#!/usr/bin/env node
// Auto-désactive les hooks Stop qui ont échoué ≥ N fois de suite (Stop)
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const MAX_FAILURES = 3;

export function run({
  exists = existsSync,
  readdir = readdirSync,
  readFile = readFileSync,
  counterDir = '/tmp/claude-hook-counters',
} = {}) {
  if (!exists(counterDir)) return null;

  try {
    const counters = readdir(counterDir).filter((f) => f.endsWith('.counter'));
    const toDisable = counters
      .map((f) => {
        try {
          const count = parseInt(readFile(join(counterDir, f), 'utf8').trim(), 10);
          return count >= MAX_FAILURES ? f.replace('.counter', '') : null;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (!toDisable.length) return null;

    const message =
      `[session-dedup] Hooks à désactiver (${MAX_FAILURES}+ échecs) : ${toDisable.join(', ')}\n` +
      '[session-dedup] Supprimez les fichiers /tmp/claude-hook-counters/*.counter pour réactiver.\n';
    return { toDisable, message };
  } catch {
    // Erreur de lecture — ignorer silencieusement
    return null;
  }
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = run();
  if (result?.message) process.stderr.write(result.message);
}
