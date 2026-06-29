#!/usr/bin/env node
// @hookstack user-prompt-inject-datetime
// Injecte la date et l'heure courantes dans chaque prompt (UserPromptSubmit)
import { fileURLToPath } from 'node:url';

export function run({ now = new Date() } = {}) {
  const formatted = now.toLocaleString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  return `Date et heure courantes : ${formatted}\n`;
}

/* v8 ignore next 3 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(run());
}
