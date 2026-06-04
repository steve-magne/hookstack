#!/usr/bin/env node
// Bloc les commandes Bash destructives irréversibles (PreToolUse)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const BLOCKED = [
  [/rm\s+-rf?\s+\/(?:\s|$)/, 'rm -rf / interdit'],
  [/rm\s+-rf?\s+[~*]/, 'rm -rf ~ / rm -rf * interdit (suppression de masse)'],
  [/rm\s+-rf?\s+\$HOME\b/, 'rm -rf $HOME interdit'],
  [/git\s+push\s+.*--force(?:-with-lease)?\s+.*(?:main|master)/, 'force-push sur main/master interdit'],
  [/git\s+reset\s+--hard/, 'git reset --hard interdit — pertes de modifications non commitées ; faites-le manuellement si intentionnel'],
  [/DROP\s+(?:TABLE|DATABASE)\s+\w+/i, 'DROP TABLE/DATABASE interdit sans confirmation explicite'],
  [/TRUNCATE\s+(?:TABLE\s+)?\w+/i, 'TRUNCATE interdit sans confirmation explicite'],
  [/>\s*\/dev\/(?:sda|nvme|disk)\d*/i, 'Écriture directe sur disque bloquée'],
  [/\bmkfs\b/i, 'Formatage de système de fichiers interdit'],
  [/\bdd\s+if=/i, 'Opération dd sur disque interdite'],
  [/chmod\s+-R\s+777\s+\//i, 'chmod 777 récursif sur / interdit'],
];

export function run(input) {
  const command = input.tool_input?.command ?? '';
  const blocked = BLOCKED.find(([pattern]) => pattern.test(command));
  return blocked
    ? { decision: 'block', reason: `Commande destructive bloquée : ${blocked[1]}` }
    : null;
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
