#!/usr/bin/env node
// Vérifie que l'URL est dans la liste des domaines autorisés (PreToolUse WebFetch)
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const DEFAULT_DOMAINS = [
  'github.com', 'raw.githubusercontent.com', 'npmjs.com',
  'docs.anthropic.com', 'developer.mozilla.org', 'nodejs.org',
  'www.typescriptlang.org', 'nextjs.org', 'tailwindcss.com',
  'supabase.com', 'vercel.com',
];

export function run(
  input,
  {
    exists = existsSync,
    readFile = readFileSync,
    projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
  } = {},
) {
  const url = input.tool_input?.url ?? '';
  if (!url) return null;

  const allowlistFile = join(projectDir, '.claude', 'webfetch-allowlist.json');
  const allowed = exists(allowlistFile)
    ? JSON.parse(readFile(allowlistFile, 'utf8'))
    : DEFAULT_DOMAINS;

  try {
    const hostname = new URL(url).hostname;
    const ok = allowed.some((d) => hostname === d || hostname.endsWith('.' + d));
    if (!ok) {
      return {
        decision: 'block',
        reason: `Domaine non autorisé : ${hostname}. Ajoutez-le à .claude/webfetch-allowlist.json si nécessaire.`,
      };
    }
  } catch {
    // URL invalide — laisser passer
  }
  return null;
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
