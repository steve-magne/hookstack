#!/usr/bin/env node
// Injecte la date et l'heure courantes dans chaque prompt (UserPromptSubmit)
const now = new Date();
const formatted = now.toLocaleString('fr-FR', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
});
process.stdout.write(`Date et heure courantes : ${formatted}\n`);
