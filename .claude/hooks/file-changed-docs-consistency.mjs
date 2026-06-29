#!/usr/bin/env node
// @hookstack file-changed-docs-consistency
// Rappelle de propager les changements d'un README vers les surfaces sœurs
// (FileChanged README.md). Quand un README change, liste les autres README du
// repo (racine + packages/*) qui portent la même promesse produit et doivent
// rester cohérents (exemples CLI, slugs, wording).
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Trouve les README "surfaces produit" : racine + packages/*/README.md.
export function findSiblingReadmes({
  exists = existsSync,
  readdir = readdirSync,
  projectDir,
} = {}) {
  const surfaces = [];
  if (exists(join(projectDir, 'README.md'))) surfaces.push('README.md');
  const pkgsDir = join(projectDir, 'packages');
  if (exists(pkgsDir)) {
    try {
      for (const pkg of readdir(pkgsDir)) {
        if (exists(join(pkgsDir, pkg, 'README.md'))) surfaces.push(`packages/${pkg}/README.md`);
      }
    } catch {}
  }
  return surfaces;
}

export function run(input, {
  exists = existsSync,
  readdir = readdirSync,
  projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
} = {}) {
  const filePath = input.file_path ?? '';
  if (!filePath.endsWith('README.md') || input.event === 'unlink') return null;

  const changed = filePath.startsWith(`${projectDir}/`)
    ? filePath.slice(projectDir.length + 1)
    : filePath;
  const siblings = findSiblingReadmes({ exists, readdir, projectDir }).filter((s) => s !== changed);
  if (!siblings.length) return null;

  return {
    hookSpecificOutput: {
      hookEventName: 'FileChanged',
      additionalContext:
        `${changed} changed. These sibling docs share the same product promise and must stay consistent ` +
        `(CLI examples, slugs, wording): ${siblings.join(', ')}. ` +
        'Check whether the change needs to be mirrored there (and on the website copy if user-facing).',
    },
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
