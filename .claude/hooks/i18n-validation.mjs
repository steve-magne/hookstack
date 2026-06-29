#!/usr/bin/env node
// @hookstack stop-i18n-validation
// Valide la cohérence des fichiers de traduction (Stop)
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function run({
  exec,
  readFile = readFileSync,
  projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
} = {}) {
  const doExec =
    exec ?? ((cmd) => execSync(cmd, { encoding: 'utf8', timeout: 5_000, cwd: projectDir }).trim());

  // Cherche les fichiers de traduction JSON (ex: locales/fr.json, messages/en.json)
  const i18nFiles = doExec('find . -path ./node_modules -prune -o -name "*.json" -print')
    .split('\n')
    .filter((f) => /\/(locales?|messages?|i18n)\//i.test(f) && f.endsWith('.json'));

  if (i18nFiles.length < 2) return null;

  // Groupe par répertoire et vérifie la cohérence des clés
  const byDir = {};
  for (const f of i18nFiles) {
    const dir = f.split('/').slice(0, -1).join('/');
    byDir[dir] ??= [];
    byDir[dir].push(f);
  }

  const issues = [];
  for (const [, files] of Object.entries(byDir)) {
    if (files.length < 2) continue;
    const parsed = files
      .map((f) => {
        try { return { f, keys: new Set(Object.keys(JSON.parse(readFile(join(projectDir, f), 'utf8')))) }; } catch { return null; }
      })
      .filter(Boolean);

    const allKeys = new Set(parsed.flatMap((p) => [...p.keys]));
    for (const { f, keys } of parsed) {
      const missing = [...allKeys].filter((k) => !keys.has(k));
      if (missing.length > 0)
        issues.push(`${f} manque ${missing.length} clé(s) : ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`);
    }
  }

  const message =
    issues.length > 0
      ? `[i18n-validation] Incohérences détectées :\n${issues.map((i) => `  - ${i}`).join('\n')}\n`
      : '[i18n-validation] ✓ Fichiers de traduction cohérents.\n';

  return { issues, message };
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = run();
  if (result) process.stderr.write(result.message);
}
