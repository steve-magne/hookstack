#!/usr/bin/env node
// @hookstack pre-edit-protect-paths
// Protège les fichiers sensibles contre l'écriture (PreToolUse Write|Edit)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PROTECTED = [
  /\/\.env$/,
  /\/\.env\.local$/,
  /\/\.env\.production/,
  /\/secrets\//,
  /\/(id_rsa|id_ed25519|.*\.pem)$/,
];

export function run(input) {
  const filePath = input.tool_input?.file_path ?? '';
  const blocked = PROTECTED.find((p) => p.test(filePath));
  return blocked
    ? { decision: 'block', reason: `Fichier protégé : ${filePath}. Modifiez manuellement si intentionnel.` }
    : null;
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
