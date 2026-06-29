#!/usr/bin/env node
// @hookstack stop-dead-image-checker
// Vérifie les images relatives cassées dans tous les fichiers Markdown du repo (Stop).
// Scan complet — couvre la dette existante, pas seulement les fichiers de la session.
// Gère les chemins relatifs ET les chemins absolus (résolus depuis public/).
// Purement Node.js (fs + path), sans réseau ni dépendance externe.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', '.claude']);
// Capture ![alt](src) — uniquement les images (le ! est obligatoire)
const IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

function stripCode(content) {
  // Supprime les blocs de code clôturés (``` ou ~~~) — multiline
  content = content.replace(/^```[\s\S]*?^```\s*$/gm, '');
  content = content.replace(/^~~~[\s\S]*?^~~~\s*$/gm, '');
  // Supprime les spans de code inline
  content = content.replace(/`[^`\n]+`/g, '``');
  return content;
}

function isExternal(src) {
  return src.startsWith('http') || src.startsWith('data:') || src.startsWith('//');
}

function walkMd(dir, { readdir = readdirSync, exists = existsSync } = {}) {
  if (!exists(dir)) return [];
  const results = [];
  for (const entry of readdir(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkMd(full, { readdir, exists }));
    else if (/\.mdx?$/.test(entry.name)) results.push(full);
  }
  return results;
}

export function run(_input, {
  projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
  readFile = readFileSync,
  exists = existsSync,
  readdir = readdirSync,
} = {}) {
  const mdFiles = walkMd(projectDir, { readdir, exists });
  if (!mdFiles.length) return null;

  const broken = [];
  for (const file of mdFiles) {
    let content;
    try { content = readFile(file, 'utf8'); } catch { continue; }

    for (const [, , src] of stripCode(content).matchAll(IMAGE_RE)) {
      if (isExternal(src)) continue;

      let abs;
      if (src.startsWith('/')) {
        // Chemin absolu → résolu depuis public/ (convention Next.js et sites statiques)
        abs = join(projectDir, 'public', src);
      } else {
        abs = resolve(dirname(file), src);
      }

      if (!exists(abs)) {
        broken.push(`${file.replace(`${projectDir}/`, '')}  →  ${src}`);
      }
    }
  }

  if (!broken.length) return null;

  return {
    message:
      `[dead-image-checker] ${broken.length} broken image reference(s) across docs:\n` +
      broken.map((b) => `  - ${b}`).join('\n') +
      '\n',
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stderr.write(JSON.stringify(result));
}
