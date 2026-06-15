#!/usr/bin/env node
// @hookstack pre-bash-block-destructive
// Bloc les commandes Bash destructives irréversibles (PreToolUse)
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const BLOCKED = [
  [/rm\s+-rf?\s+\/(?:\s|$)/, 'rm -rf / interdit'],
  [/rm\s+-rf?\s+[~*]/, 'rm -rf ~ / rm -rf * interdit (suppression de masse)'],
  [/rm\s+-rf?\s+\$HOME\b/, 'rm -rf $HOME interdit'],
  [/git\s+push\s+.*--force(?:-with-lease)?\s+.*(?:main|master)/, 'force-push sur main/master interdit'],
  // git reset --hard : traité à part dans run() — autorisé si l'arbre de travail est propre.
  [/DROP\s+(?:TABLE|DATABASE)\s+\w+/i, 'DROP TABLE/DATABASE interdit sans confirmation explicite'],
  [/TRUNCATE\s+(?:TABLE\s+)?\w+/i, 'TRUNCATE interdit sans confirmation explicite'],
  [/>\s*\/dev\/(?:sda|nvme|disk)\d*/i, 'Écriture directe sur disque bloquée'],
  [/\bmkfs\b/i, 'Formatage de système de fichiers interdit'],
  [/\bdd\s+if=/i, 'Opération dd sur disque interdite'],
  [/chmod\s+-R\s+777\s+\//i, 'chmod 777 récursif sur / interdit'],
];

// Retire les chaînes entre guillemets (arguments -m "...", --body "...", etc.)
// pour éviter les faux positifs sur des mentions documentaires de patterns dangereux.
function stripQuotedArgs(cmd) {
  return cmd.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^'\\]|\\.)*'/g, "''");
}

function defaultGitStatus() {
  try {
    return execSync('git status --porcelain', { encoding: 'utf8', stdio: 'pipe', timeout: 5_000 });
  } catch {
    return 'unknown'; // hors repo / erreur git → considérer sale, donc bloquer
  }
}

export function run(input, { gitStatus = defaultGitStatus } = {}) {
  const command = input.tool_input?.command ?? '';
  const stripped = stripQuotedArgs(command);
  const blocked = BLOCKED.find(([pattern]) => pattern.test(stripped));
  if (blocked) return { decision: 'block', reason: `Commande destructive bloquée : ${blocked[1]}` };

  // git reset --hard : nuance selon la cible et l'état de l'arbre de travail.
  //   - vers une autre cible que HEAD (HEAD~1, sha, branche) → toujours bloqué (réécrit la branche)
  //   - vers HEAD (ou sans cible) avec arbre sale → bloqué (modifs non commitées perdues)
  //   - vers HEAD avec arbre propre → inoffensif, autorisé
  const reset = stripped.match(/git\s+reset\s+--hard\b\s*(\S*)/);
  if (reset) {
    const target = reset[1];
    if (target && target !== 'HEAD') {
      return {
        decision: 'block',
        reason: `git reset --hard ${target} interdit — réécrit l'historique de la branche ; faites-le manuellement si intentionnel.`,
      };
    }
    if (gitStatus().trim() !== '') {
      return {
        decision: 'block',
        reason:
          'git reset --hard bloqué : des modifications non commitées seraient perdues. ' +
          "Commitez ou stashez-les d'abord (git stash), ou faites le reset manuellement si intentionnel.",
      };
    }
  }
  return null;
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
