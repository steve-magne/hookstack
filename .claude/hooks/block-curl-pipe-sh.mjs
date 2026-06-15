#!/usr/bin/env node
// @hookstack pre-bash-block-curl-pipe-sh
// Bloque l'exécution de scripts distants non audités : curl|wget … | sh (PreToolUse Bash)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// Tuyau d'un téléchargeur vers un shell — le vecteur supply-chain n°1.
// Testés sur la commande NETTOYÉE (le contenu entre guillemets est neutralisé)
// pour éviter les faux positifs (ex. git commit -m "how to curl | sh").
const PIPED = [
  // curl/wget/fetch … | (sudo) sh|bash|zsh|dash|fish
  /\b(?:curl|wget|fetch)\b[^|]*\|\s*(?:sudo\s+)?(?:ba|z|da|fi)?sh\b/i,
  // PowerShell : iwr|curl|Invoke-WebRequest … | iex|Invoke-Expression
  /\b(?:iwr|curl|invoke-webrequest)\b[^|]*\|\s*(?:iex|invoke-expression)\b/i,
];

// Substitutions exécutées par le shell même à l'intérieur de guillemets doubles
// (sh -c "$(curl …)") : testées sur la commande BRUTE.
const SUBSTITUTION = [
  /\b(?:ba|z|da|fi)?sh\b[^\n]*<\(\s*(?:curl|wget|fetch)\b/i, // bash <(curl …)
  /\b(?:ba|z|da|fi)?sh\b[^\n]*\$\(\s*(?:curl|wget|fetch)\b/i, // sh -c "$(curl …)"
];

// Retire les chaînes entre guillemets pour éviter les faux positifs.
function stripQuotedArgs(cmd) {
  return cmd.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^'\\]|\\.)*'/g, "''");
}

export function run(input) {
  if (input.tool_name && input.tool_name !== 'Bash') return null;
  const command = input.tool_input?.command ?? '';
  const stripped = stripQuotedArgs(command);
  const piped = PIPED.some((p) => p.test(stripped));
  const substituted = SUBSTITUTION.some((p) => p.test(command));
  if (!piped && !substituted) return null;
  return {
    decision: 'block',
    reason:
      "Exécution d'un script distant via pipe bloquée (curl|wget … | sh). " +
      'Téléchargez le script dans un fichier, inspectez-le, puis lancez-le : ' +
      'curl -fsSL <url> -o /tmp/install.sh && less /tmp/install.sh && sh /tmp/install.sh',
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
