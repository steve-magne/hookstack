#!/usr/bin/env node
// Vérifie que l'URL est dans la liste des domaines autorisés (PreToolUse WebFetch)
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const url = input.tool_input?.url ?? '';
if (!url) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const allowlistFile = join(projectDir, '.claude', 'webfetch-allowlist.json');

const DEFAULT_DOMAINS = [
  'github.com', 'raw.githubusercontent.com', 'npmjs.com',
  'docs.anthropic.com', 'developer.mozilla.org', 'nodejs.org',
  'www.typescriptlang.org', 'nextjs.org', 'tailwindcss.com',
  'supabase.com', 'vercel.com',
];

const allowed = existsSync(allowlistFile)
  ? JSON.parse(readFileSync(allowlistFile, 'utf8'))
  : DEFAULT_DOMAINS;

try {
  const hostname = new URL(url).hostname;
  const ok = allowed.some(d => hostname === d || hostname.endsWith('.' + d));
  if (!ok) {
    process.stdout.write(JSON.stringify({
      decision: 'block',
      reason: `Domaine non autorisé : ${hostname}. Ajoutez-le à .claude/webfetch-allowlist.json si nécessaire.`,
    }));
  }
} catch {
  // URL invalide — laisser passer
}
