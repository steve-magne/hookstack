#!/usr/bin/env node
// @hookstack seo-next-image-guard
// Interdit les balises <img> brutes dans les composants (PostToolUse Write|Edit).
// Cible : src/**/*.tsx. Next.js fournit next/image (<Image>) qui optimise le LCP,
// évite le CLS et sert des formats modernes — un <img> brut est une régression
// perf/SEO. Non bloquant : signale chaque occurrence avec la correction.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// <img …> mais pas <Image …> (next/image) ni un nom commençant par Img…
const RAW_IMG_RE = /<img(?=[\s/>])/;

export function run(input, { readFile = readFileSync } = {}) {
  const filePath = input.tool_input?.file_path ?? '';
  if (!/\/src\/.*\.tsx$/.test(filePath)) return null;

  let content;
  try {
    content = readFile(filePath, 'utf8');
  } catch {
    return null;
  }

  if (!RAW_IMG_RE.test(content)) return null;

  return {
    message:
      `[seo-next-image] ${filePath} uses a raw <img> tag.\n` +
      `  → Use next/image (<Image>) instead: it optimizes LCP, prevents layout ` +
      `shift (CLS) and serves modern formats.\n`,
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result?.message) process.stderr.write(result.message);
}
