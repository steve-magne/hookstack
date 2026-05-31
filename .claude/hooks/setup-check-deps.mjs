#!/usr/bin/env node
// Vérifie que les dépendances du projet sont à jour au démarrage de session (SessionStart)
import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { join } from 'path';

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

function check(lockfile, modulesDir, installCmd) {
  const lock = join(projectDir, lockfile);
  const mods = join(projectDir, modulesDir);
  if (!existsSync(lock)) return;
  if (!existsSync(mods)) {
    process.stderr.write(`[setup-check-deps] ⚠ ${modulesDir} absent — lancez : ${installCmd}\n`);
    return;
  }
  const lockMtime = statSync(lock).mtimeMs;
  const modsMtime = statSync(mods).mtimeMs;
  if (lockMtime > modsMtime) {
    process.stderr.write(`[setup-check-deps] ⚠ ${lockfile} plus récent que ${modulesDir} — lancez : ${installCmd}\n`);
  }
}

check('pnpm-lock.yaml', 'node_modules', 'pnpm install');
check('package-lock.json', 'node_modules', 'npm ci');
check('yarn.lock', 'node_modules', 'yarn install --frozen-lockfile');
check('requirements.txt', '.venv', 'pip install -r requirements.txt');
