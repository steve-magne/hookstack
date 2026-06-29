#!/usr/bin/env node
// @hookstack pre-bash-warn-sudo
// Avertit (sans bloquer) quand une commande Bash utilise sudo (PreToolUse Bash)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function stripQuotedArgs(cmd) {
  return cmd.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^'\\]|\\.)*'/g, "''");
}

export function run(input) {
  if (input.tool_name && input.tool_name !== 'Bash') return null;
  const command = stripQuotedArgs(input.tool_input?.command ?? '');
  // sudo en début de commande ou après un opérateur shell (; && || |).
  if (!/(?:^|[;&|]|&&|\|\|)\s*sudo\s+/.test(command)) return null;
  return {
    message:
      '[warn-sudo] Cette commande utilise sudo. Une élévation de privilèges est rarement nécessaire ' +
      'dans une boucle de dev et peut bloquer sur une invite de mot de passe non interactive. ' +
      'Vérifiez si une version sans sudo (venv, --user, conteneur) suffit.\n',
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result?.message) process.stderr.write(result.message);
}
