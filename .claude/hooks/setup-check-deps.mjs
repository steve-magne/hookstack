#!/usr/bin/env node
// Vérifie que les dépendances du projet sont à jour au démarrage de session (SessionStart)
import { existsSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const SPECS = [
  ['pnpm-lock.yaml', 'node_modules', 'pnpm install'],
  ['package-lock.json', 'node_modules', 'npm ci'],
  ['yarn.lock', 'node_modules', 'yarn install --frozen-lockfile'],
  ['requirements.txt', '.venv', 'pip install -r requirements.txt'],
];

export function run({
  exists = existsSync,
  stat = statSync,
  projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
} = {}) {
  const warnings = [];

  for (const [lockfile, modulesDir, installCmd] of SPECS) {
    const lock = join(projectDir, lockfile);
    const mods = join(projectDir, modulesDir);
    if (!exists(lock)) continue;
    if (!exists(mods)) {
      warnings.push(`[setup-check-deps] ⚠ ${modulesDir} absent — lancez : ${installCmd}\n`);
      continue;
    }
    if (stat(lock).mtimeMs > stat(mods).mtimeMs) {
      warnings.push(`[setup-check-deps] ⚠ ${lockfile} plus récent que ${modulesDir} — lancez : ${installCmd}\n`);
    }
  }

  return { warnings, message: warnings.join('') };
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = run();
  if (result.message) process.stderr.write(result.message);
}
