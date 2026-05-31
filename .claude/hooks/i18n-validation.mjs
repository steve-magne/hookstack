#!/usr/bin/env node
// Valide la cohérence des fichiers de traduction (Stop)
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

function exec(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 5_000, cwd: projectDir }).trim(); } catch { return ''; }
}

// Cherche les fichiers de traduction JSON (ex: locales/fr.json, messages/en.json)
const i18nFiles = exec('find . -path ./node_modules -prune -o -name "*.json" -print')
  .split('\n')
  .filter(f => /\/(locales?|messages?|i18n)\//i.test(f) && f.endsWith('.json'));

if (i18nFiles.length < 2) process.exit(0);

// Groupe par répertoire et vérifie la cohérence des clés
const byDir = {};
for (const f of i18nFiles) {
  const dir = f.split('/').slice(0, -1).join('/');
  byDir[dir] ??= [];
  byDir[dir].push(f);
}

const issues = [];
for (const [dir, files] of Object.entries(byDir)) {
  if (files.length < 2) continue;
  const parsed = files.map(f => {
    try { return { f, keys: new Set(Object.keys(JSON.parse(readFileSync(join(projectDir, f), 'utf8')))) }; } catch { return null; }
  }).filter(Boolean);

  const allKeys = new Set(parsed.flatMap(p => [...p.keys]));
  for (const { f, keys } of parsed) {
    const missing = [...allKeys].filter(k => !keys.has(k));
    if (missing.length > 0)
      issues.push(`${f} manque ${missing.length} clé(s) : ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`);
  }
}

if (issues.length > 0)
  process.stderr.write(`[i18n-validation] Incohérences détectées :\n${issues.map(i => `  - ${i}`).join('\n')}\n`);
else
  process.stderr.write('[i18n-validation] ✓ Fichiers de traduction cohérents.\n');
