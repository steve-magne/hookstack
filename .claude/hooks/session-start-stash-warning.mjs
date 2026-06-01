#!/usr/bin/env node
// SessionStart: avertit si des stashs Git non récupérés traînent depuis plusieurs jours
import { execSync } from 'child_process';

function exec(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 5_000 }).trim(); } catch { return ''; }
}

const stashList = exec('git stash list --format="%gd|%ci|%gs"');
if (!stashList) process.exit(0);

const now = Date.now();
const DAYS = 3;
const threshold = DAYS * 24 * 60 * 60 * 1000;

const stale = stashList.split('\n')
  .map(line => {
    const [ref, date, ...msgParts] = line.split('|');
    const age = now - new Date(date).getTime();
    return { ref, date: date?.trim(), msg: msgParts.join('|').trim(), age };
  })
  .filter(s => s.age > threshold);

if (stale.length === 0) process.exit(0);

const lines = [
  `## ⚠️  Stashs Git oubliés (${stale.length})`,
  `- ${stale.length} stash(s) de plus de ${DAYS} jours détecté(s) :`,
];

for (const s of stale.slice(0, 5)) {
  const days = Math.floor(s.age / (24 * 60 * 60 * 1000));
  lines.push(`  - \`${s.ref}\` (${days}j) — ${s.msg}`);
}

lines.push(`- Utilisez \`git stash list\` pour les voir, \`git stash pop\` ou \`git stash drop\` pour les gérer.`);

process.stdout.write(lines.join('\n') + '\n');
