#!/usr/bin/env node
// @hookstack pre-write-env-gitignore-guard
// Avertit si un fichier .env créé n'est pas couvert par .gitignore (PreToolUse Write|Edit)
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, basename, join } from 'node:path';

// .env, .env.local, .env.production… mais PAS les modèles partagés (.env.example/.sample/.template).
const ENV_FILE = /^\.env(?:\.[A-Za-z0-9_-]+)?$/;
const TEMPLATE = /\.(?:example|sample|template|dist)$/i;

// Une ligne de .gitignore qui couvre les fichiers .env.
const COVERS_ENV = /^\s*\.env(?:\*|\.\*)?\s*$|^\s*\*\.env\s*$/m;

function findGitignore(dir, fileExists, depth = 0) {
  if (depth > 6 || !dir) return null;
  const candidate = join(dir, '.gitignore');
  if (fileExists(candidate)) return candidate;
  const parent = dirname(dir);
  return parent === dir ? null : findGitignore(parent, fileExists, depth + 1);
}

export function run(input, { readFile = readFileSync, fileExists = existsSync } = {}) {
  const filePath = input.tool_input?.file_path ?? '';
  const base = basename(filePath);
  if (!ENV_FILE.test(base) || TEMPLATE.test(base)) return null;

  const gitignore = findGitignore(dirname(filePath), fileExists);
  let covered = false;
  if (gitignore) {
    try { covered = COVERS_ENV.test(readFile(gitignore, 'utf8')); } catch { covered = false; }
  }
  if (covered) return null;

  return {
    message:
      `[env-gitignore] ${base} n'est pas couvert par .gitignore — un secret pourrait être commité. ` +
      'Ajoutez une ligne `.env*` à votre .gitignore avant d\'y mettre des valeurs.\n',
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result?.message) process.stderr.write(result.message);
}
