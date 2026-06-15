#!/usr/bin/env node
// @hookstack stop-session-dedup-autodisable
// Auto-désactive les hooks Stop qui ont échoué ≥ N fois de suite (Stop)
//
// Contrat partagé : un hook Stop qui veut bénéficier du watchdog incrémente
// /tmp/claude-hook-counters/<slug>.counter à chaque échec (et le supprime en cas
// de succès), puis vérifie l'absence de <slug>.disabled avant de s'exécuter.
// Ce hook pose le marqueur .disabled dès que le compteur atteint MAX_FAILURES.
import { readFileSync, existsSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const MAX_FAILURES = 3;

export function run({
  exists = existsSync,
  readdir = readdirSync,
  readFile = readFileSync,
  writeFile = writeFileSync,
  counterDir = '/tmp/claude-hook-counters',
} = {}) {
  if (!exists(counterDir)) return null;

  try {
    const counters = readdir(counterDir).filter((f) => f.endsWith('.counter'));
    const disabled = [];
    for (const f of counters) {
      let count = 0;
      try {
        count = parseInt(readFile(join(counterDir, f), 'utf8').trim(), 10) || 0;
      } catch {
        continue;
      }
      if (count < MAX_FAILURES) continue;
      const slug = f.replace('.counter', '');
      const marker = join(counterDir, `${slug}.disabled`);
      if (!exists(marker)) writeFile(marker, '');
      disabled.push(slug);
    }

    if (!disabled.length) return null;

    const message =
      `[session-dedup] Hooks désactivés (${MAX_FAILURES}+ échecs) : ${disabled.join(', ')}\n` +
      `[session-dedup] Supprimez ${counterDir}/<slug>.disabled (et .counter) pour réactiver.\n`;
    return { disabled, message };
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
