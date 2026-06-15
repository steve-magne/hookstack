#!/usr/bin/env node
// @hookstack post-write-nextjs-quality
// Vérifie les patterns Next.js App Router après écriture (PostToolUse Write|Edit)
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const INTERACTIVE_PATTERNS = [
  /\buseState\b/,
  /\buseEffect\b/,
  /\buseReducer\b/,
  /\buseRef\b/,
  /\bonClick\b/,
  /\bonChange\b/,
  /\bonSubmit\b/,
  /\bonKeyDown\b/,
];

const PAGES_ROUTER_PATTERNS = [/\bgetServerSideProps\b/, /\bgetStaticProps\b/, /\bgetStaticPaths\b/];

export function run(input, { readFile = readFileSync, fileExists = existsSync } = {}) {
  const filePath = input.tool_input?.file_path ?? '';
  if (!filePath || !/\.[jt]sx?$/.test(filePath)) return null;
  if (!fileExists(filePath)) return null;

  const content = readFile(filePath, 'utf8');
  const isInAppDir = /[/\\]app[/\\]/.test(filePath);
  const hasUseClient = /['"]use client['"]/.test(content);
  const hasInteractive = INTERACTIVE_PATTERNS.some((p) => p.test(content));
  const hasPagesRouter = PAGES_ROUTER_PATTERNS.some((p) => p.test(content));

  const warnings = [];
  const errors = [];

  // Server Component with interactive hooks → must add 'use client'
  if (isInAppDir && !hasUseClient && hasInteractive) {
    errors.push(
      `'use client' directive missing — file uses React hooks or event handlers (useState/useEffect/onClick…).`,
    );
  }

  // Pages Router data fetching in app/ → migration signal
  if (isInAppDir && hasPagesRouter) {
    warnings.push(
      `Pages Router API (getServerSideProps/getStaticProps) detected in app/ — use Server Components or Route Handlers instead.`,
    );
  }

  // <img> tag when next/image is imported or could be used
  if (/<img\s/i.test(content) && !content.includes('next/image')) {
    warnings.push(`<img> tag detected — consider next/image for automatic optimization and lazy loading.`);
  }

  // <a href> for internal paths (not http/mailto/tel)
  const internalAnchor = /<a\s[^>]*href=["'][^"'#]/.test(content) && !/href=["']https?:/.test(content);
  if (internalAnchor && !content.includes('next/link')) {
    warnings.push(`Internal <a href> detected — use next/link for prefetching and client-side navigation.`);
  }

  if (errors.length === 0 && warnings.length === 0) return null;

  const lines = [...errors.map((e) => `❌ ${e}`), ...warnings.map((w) => `⚠️  ${w}`)].join('\n');
  const message = `Next.js quality check — ${filePath}\n${lines}\n`;

  if (errors.length > 0) {
    return { message };
  }

  // Warnings only: write to stderr (non-blocking)
  process.stderr.write(message);
  return null;
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result?.message) process.stderr.write(result.message);
}
