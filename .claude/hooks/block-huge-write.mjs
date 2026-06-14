#!/usr/bin/env node
// Bloque l'écriture d'un fichier anormalement volumineux (PreToolUse Write)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// 500 Ko : au-delà, c'est presque toujours un dump, un blob généré ou un collage accidentel.
const MAX_BYTES = 500_000;

export function run(input, { maxBytes = MAX_BYTES } = {}) {
  // Seul Write fournit le contenu complet ; Edit est un patch ciblé, on l'ignore.
  if (input.tool_name && input.tool_name !== 'Write') return null;
  const content = input.tool_input?.content;
  if (typeof content !== 'string') return null;

  const bytes = Buffer.byteLength(content, 'utf8');
  if (bytes <= maxBytes) return null;

  const filePath = input.tool_input?.file_path ?? 'le fichier';
  const kb = Math.round(bytes / 1024);
  return {
    decision: 'block',
    reason:
      `Écriture de ${filePath} bloquée : ${kb} Ko (> ${Math.round(maxBytes / 1024)} Ko). ` +
      'Un fichier de cette taille est généralement un dump ou un blob généré qui gonfle le repo et le diff. ' +
      'Vérifiez l\'intention : générez-le à la volée, gitignorez-le, ou découpez-le.',
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
