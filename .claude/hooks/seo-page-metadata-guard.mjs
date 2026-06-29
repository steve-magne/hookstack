#!/usr/bin/env node
// @hookstack seo-page-metadata-guard
// Vérifie qu'une page Next.js App Router expose ses métadonnées SEO après écriture
// (PostToolUse Write|Edit). Cible : src/app/**/page.tsx.
// Règle : la page doit exporter `metadata` OU `generateMetadata`, et l'objet doit
// porter un `title` ET une `description` (les deux leviers SEO de base).
// Non bloquant : signale précisément ce qui manque.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Cible un fichier page.tsx sous un dossier app/ (App Router), racine incluse.
const PAGE_RE = /\/app\/(?:.*\/)?page\.tsx$/;

export function run(input, { readFile = readFileSync } = {}) {
  const filePath = input.tool_input?.file_path ?? '';
  if (!PAGE_RE.test(filePath)) return null;

  let content;
  try {
    content = readFile(filePath, 'utf8');
  } catch {
    return null; // fichier illisible/supprimé → rien à vérifier
  }

  const hasMetadata =
    /export\s+(?:const|let)\s+metadata\b/.test(content) ||
    /export\s+(?:async\s+)?function\s+generateMetadata\b/.test(content) ||
    /export\s*\{[^}]*\bmetadata\b[^}]*\}/.test(content);

  if (!hasMetadata) {
    return {
      message:
        `[seo-metadata] ${filePath} exports no metadata.\n` +
        `  → Add 'export const metadata = { title, description }' (or generateMetadata) ` +
        `so this page is indexable.\n`,
    };
  }

  const missing = [];
  if (!/\btitle\s*:/.test(content)) missing.push('title');
  if (!/\bdescription\s*:/.test(content)) missing.push('description');
  if (!missing.length) return null;

  return {
    message:
      `[seo-metadata] ${filePath} metadata is missing: ${missing.join(', ')}.\n` +
      `  → A page needs both a title and a description to rank.\n`,
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result?.message) process.stderr.write(result.message);
}
