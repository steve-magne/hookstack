#!/usr/bin/env node
// Vérifie les liens relatifs cassés dans tous les fichiers Markdown du repo (Stop).
// Scan complet — couvre la dette existante, pas seulement les fichiers de la session.
// Purement Node.js (fs + path), sans réseau ni dépendance externe.
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', '.claude']);
// Capture [text](href) — exclut les images ![alt](src) incluses dans la même syntaxe
const LINK_RE = /(?<!!)\[([^\]]*)\]\(([^)]+)\)/g;

function isRelative(href) {
  return !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:');
}

function stripAnchor(href) {
  return href.split('#')[0].trim();
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

    for (const [, , href] of content.matchAll(LINK_RE)) {
      if (!isRelative(href)) continue;
      const target = stripAnchor(href);
      if (!target) continue; // lien ancre pure (#section)
      const abs = resolve(dirname(file), target);
      if (!exists(abs)) {
        broken.push(`${file.replace(projectDir + '/', '')}  →  ${href}`);
      }
    }
  }

  if (!broken.length) return null;

  return {
    message:
      `[dead-link-checker] ${broken.length} broken relative link(s) across docs:\n` +
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
