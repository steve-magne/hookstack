#!/usr/bin/env node
// Bloque l'écriture dans un dossier généré (node_modules, dist, .next…) (PreToolUse Write|Edit)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// Segments de chemin qui ne contiennent que des artefacts générés : éditer ici = travail perdu.
const GENERATED = /(?:^|\/)(node_modules|\.next|\.nuxt|\.svelte-kit|dist|build|out|coverage|\.turbo|\.cache|__pycache__|\.venv|\.pytest_cache|\.mypy_cache)(?:\/|$)/;

export function run(input) {
  const filePath = input.tool_input?.file_path ?? '';
  if (!filePath) return null;
  const hit = filePath.match(GENERATED);
  if (!hit) return null;
  return {
    decision: 'block',
    reason:
      `Écriture bloquée dans un répertoire généré ('${hit[1]}') : ${filePath}. ` +
      'Modifiez la source, pas l\'artefact de build — il sera écrasé au prochain build. ' +
      'Si c\'est intentionnel, faites-le manuellement.',
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
