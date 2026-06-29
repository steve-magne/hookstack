#!/usr/bin/env node
// @hookstack session-start-stash-warning
// SessionStart: avertit si des stashs Git non récupérés traînent depuis plusieurs jours
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DAYS = 3;

function defaultExec(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 5_000 }).trim(); } catch { return ''; }
}

export function run({ exec = defaultExec, now = () => Date.now() } = {}) {
  const stashList = exec('git stash list --format="%gd|%ci|%gs"');
  if (!stashList) return null;

  const currentTime = now();
  const threshold = DAYS * 24 * 60 * 60 * 1000;

  const stale = stashList
    .split('\n')
    .map((line) => {
      const [ref, date, ...msgParts] = line.split('|');
      const age = currentTime - new Date(date).getTime();
      return { ref, date: date?.trim(), msg: msgParts.join('|').trim(), age };
    })
    .filter((s) => s.age > threshold);

  if (stale.length === 0) return null;

  const lines = [
    `## ⚠️  Stashs Git oubliés (${stale.length})`,
    `- ${stale.length} stash(s) de plus de ${DAYS} jours détecté(s) :`,
  ];

  for (const s of stale.slice(0, 5)) {
    const days = Math.floor(s.age / (24 * 60 * 60 * 1000));
    lines.push(`  - \`${s.ref}\` (${days}j) — ${s.msg}`);
  }

  lines.push(`- Utilisez \`git stash list\` pour les voir, \`git stash pop\` ou \`git stash drop\` pour les gérer.`);

  return `${lines.join('\n')}\n`;
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = run();
  if (result) process.stdout.write(result);
}
